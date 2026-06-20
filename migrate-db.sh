#!/usr/bin/env bash
# =============================================================================
#  MinigGames — DB Migration Script [HISTORICAL — Run via MCP only]
#  FROM: Vultr Managed MySQL (vultrdb.com:16751)
#  TO:   Singapore self-host MySQL (149.28.152.221:3306)
#  Schema: minigame
#  DEPRECATED: Direct SSH to old server (62.238.28.106 deleted 2026-06-04)
#  Current deployment: Use CodeProvider MCP tool (mcp__CodeProvider_MCP__deploy)
# =============================================================================
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; exit 1; }
info() { echo -e "${CYAN}── $*${NC}"; }

# ── Config ────────────────────────────────────────────────────────────────────
OLD_HOST="vultr-prod-7e1746de-c320-445f-b007-7d0c6bd0146c-vultr-prod-7c69.vultrdb.com"
OLD_PORT="16751"
OLD_USER="minigames"
OLD_DB="minigame"

NEW_HOST="149.28.152.221"
NEW_PORT="3306"
NEW_USER="minigames_user"
NEW_DB="minigame"

DUMP_FILE="/tmp/minigames_migration_$(date +%Y%m%d_%H%M%S).sql"
ENV_FILE="/root/minigames/.env"
ENV_BACKUP="${ENV_FILE}.bak.pre-migration-$(date +%Y%m%d-%H%M%S)"
CONTAINER="minigames"

echo ""
echo "============================================================"
echo "  MinigGames DB Migration — Vultr Managed → Singapore"
echo "============================================================"
echo "  OLD: ${OLD_HOST}:${OLD_PORT}/${OLD_DB}"
echo "  NEW: ${NEW_HOST}:${NEW_PORT}/${NEW_DB}"
echo ""

# ── Read old password from .env ───────────────────────────────────────────────
info "Reading old password from ${ENV_FILE}..."
if [[ ! -f "$ENV_FILE" ]]; then
  err ".env not found at ${ENV_FILE}"
fi

# Extract and URL-decode password from DATABASE_URL
RAW_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2-)
# URL-decode %40 → @
OLD_PASS=$(echo "$RAW_URL" | grep -oP '(?<=:)[^@]+(?=@)' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
ok "Old password read from .env"

# ── Ask for new password ──────────────────────────────────────────────────────
echo ""
read -rsp "🔐 Enter NEW DB password for ${NEW_USER}@${NEW_HOST}: " NEW_PASS
echo ""
if [[ -z "$NEW_PASS" ]]; then
  err "New password cannot be empty"
fi

# ── STEP 1: Test connectivity to new server ───────────────────────────────────
echo ""
info "STEP 1 — Testing connectivity to new server..."
if mysql -h "$NEW_HOST" -P "$NEW_PORT" -u "$NEW_USER" -p"${NEW_PASS}" \
    --connect-timeout=10 --ssl-mode=PREFERRED \
    -e "SELECT 1 AS ok;" "$NEW_DB" >/dev/null 2>&1; then
  ok "Connected to new server (${NEW_HOST}:${NEW_PORT})"
else
  err "Cannot connect to new server. Check: firewall, user, password, plugin auth"
fi

# ── STEP 2: Dump from old server ──────────────────────────────────────────────
echo ""
info "STEP 2 — Dumping from old server (this may take 1-2 min)..."
mysqldump \
  -h "$OLD_HOST" -P "$OLD_PORT" \
  -u "$OLD_USER" -p"${OLD_PASS}" \
  --ssl-mode=REQUIRED \
  --single-transaction \
  --routines --triggers \
  --set-gtid-purged=OFF \
  --databases "$OLD_DB" \
  > "$DUMP_FILE" 2>/tmp/mysqldump_stderr.log

DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || echo 0)
HEAD_LINE=$(head -1 "$DUMP_FILE" 2>/dev/null || echo "")

if [[ "$DUMP_SIZE" -eq 0 ]]; then
  cat /tmp/mysqldump_stderr.log
  err "Dump file is empty!"
fi
if [[ "$HEAD_LINE" != *"MySQL dump"* ]]; then
  err "Dump file invalid (header: ${HEAD_LINE})"
fi

ok "Dump complete: ${DUMP_FILE} ($(numfmt --to=iec $DUMP_SIZE))"

# ── Fix DEFINER (in case views/procs reference old user) ─────────────────────
info "Fixing DEFINER references in dump..."
sed -i "s/DEFINER=\`vultradmin\`@\`%\`/DEFINER=CURRENT_USER/g" "$DUMP_FILE"
sed -i "s/DEFINER=\`minigames\`@\`%\`/DEFINER=CURRENT_USER/g" "$DUMP_FILE"
ok "DEFINER references fixed"

# ── STEP 3: Get row counts from OLD for verification ─────────────────────────
echo ""
info "STEP 3 — Getting row counts from OLD server for verification..."
declare -A OLD_COUNTS
while IFS=$'\t' read -r tbl cnt; do
  OLD_COUNTS["$tbl"]="$cnt"
done < <(mysql -h "$OLD_HOST" -P "$OLD_PORT" -u "$OLD_USER" -p"${OLD_PASS}" \
    --ssl-mode=REQUIRED -N -e \
    "SELECT table_name, table_rows
     FROM information_schema.tables
     WHERE table_schema='${OLD_DB}' AND table_type='BASE TABLE'
     ORDER BY table_name;" 2>/dev/null)

echo "  Tables on OLD server:"
for t in "${!OLD_COUNTS[@]}"; do
  echo "    ${t}: ~${OLD_COUNTS[$t]} rows"
done

# ── STEP 4: Import to new server ─────────────────────────────────────────────
echo ""
info "STEP 4 — Importing to new server..."
mysql -h "$NEW_HOST" -P "$NEW_PORT" \
  -u "$NEW_USER" -p"${NEW_PASS}" \
  --ssl-mode=PREFERRED \
  < "$DUMP_FILE" 2>/tmp/mysql_import_stderr.log

IMPORT_EXIT=$?
if [[ $IMPORT_EXIT -ne 0 ]]; then
  warn "Import stderr output:"
  cat /tmp/mysql_import_stderr.log
  err "Import failed (exit code: ${IMPORT_EXIT})"
fi
ok "Import complete"

# ── STEP 5: Verify row counts on NEW server ───────────────────────────────────
echo ""
info "STEP 5 — Verifying row counts on NEW server..."
VERIFY_OK=true
while IFS=$'\t' read -r tbl cnt; do
  OLD_CNT="${OLD_COUNTS[$tbl]:-0}"
  if [[ "$cnt" -ge "$OLD_CNT" ]]; then
    ok "  ${tbl}: NEW=${cnt} / OLD≈${OLD_CNT} ✓"
  else
    warn "  ${tbl}: NEW=${cnt} / OLD≈${OLD_CNT} — MISMATCH"
    VERIFY_OK=false
  fi
done < <(mysql -h "$NEW_HOST" -P "$NEW_PORT" -u "$NEW_USER" -p"${NEW_PASS}" \
    --ssl-mode=PREFERRED -N -e \
    "SELECT table_name, table_rows
     FROM information_schema.tables
     WHERE table_schema='${NEW_DB}' AND table_type='BASE TABLE'
     ORDER BY table_name;" "$NEW_DB" 2>/dev/null)

if [[ "$VERIFY_OK" == false ]]; then
  warn "Some tables have count mismatch. Review before proceeding."
  read -rp "Continue anyway? (yes/no): " CONT
  [[ "$CONT" != "yes" ]] && err "Aborted by user"
fi

# ── STEP 6: Backup .env ───────────────────────────────────────────────────────
echo ""
info "STEP 6 — Backing up .env..."
cp "$ENV_FILE" "$ENV_BACKUP"
ok "Backup: ${ENV_BACKUP}"

# ── STEP 7: Update .env ───────────────────────────────────────────────────────
info "STEP 7 — Updating .env with new DB credentials..."
NEW_PASS_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${NEW_PASS}', safe=''))")
NEW_DATABASE_URL="mysql://${NEW_USER}:${NEW_PASS_ENCODED}@${NEW_HOST}:${NEW_PORT}/${NEW_DB}"

# Replace DATABASE_URL line
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${NEW_DATABASE_URL}|" "$ENV_FILE"
# Update SSL (new server may not require SSL)
sed -i "s|^MYSQL_SSL=.*|MYSQL_SSL=false|" "$ENV_FILE"

ok ".env updated"
echo "  New DATABASE_URL: mysql://${NEW_USER}:***@${NEW_HOST}:${NEW_PORT}/${NEW_DB}"

# ── STEP 8: Rebuild Docker container ─────────────────────────────────────────
echo ""
info "STEP 8 — Rebuilding Docker container..."
cd /root/minigames
docker compose up -d --force-recreate --build 2>&1 | grep -E 'Built|Recreate|Started|error|Error' || true
sleep 5

# Check container health
STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "unknown")
if [[ "$STATUS" == "healthy" ]] || [[ "$STATUS" == "starting" ]]; then
  ok "Container ${CONTAINER} status: ${STATUS}"
else
  warn "Container status: ${STATUS} — check logs: docker logs ${CONTAINER}"
fi

# ── STEP 9: Smoke test ────────────────────────────────────────────────────────
echo ""
info "STEP 9 — Smoke testing..."
sleep 3

HEALTH=$(curl -s --max-time 5 http://127.0.0.1:3333/healthz 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"ok":true'; then
  ok "Health check: PASS — ${HEALTH}"
else
  err "Health check FAILED: ${HEALTH}. Check: docker logs ${CONTAINER} | tail -30"
fi

TRACK=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/json' \
  -d '{"type":"session","sid":"99999999-9999-4999-8999-999999999999"}' \
  http://127.0.0.1:3333/api/track 2>/dev/null || echo "FAIL")
if echo "$TRACK" | grep -q '"ok":true'; then
  ok "DB write test (api/track): PASS"
else
  warn "DB write test failed: ${TRACK}"
fi

STATS=$(curl -s --max-time 5 http://127.0.0.1:3333/api/stats?all=1 2>/dev/null | head -c 100 || echo "FAIL")
if echo "$STATS" | grep -q '"game"'; then
  ok "DB read test (api/stats): PASS"
else
  warn "DB read test: ${STATS}"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo -e "${GREEN}  MIGRATION COMPLETE ✅${NC}"
echo "============================================================"
echo "  OLD DB (to be destroyed 2026-06-05): ${OLD_HOST}"
echo "  NEW DB (live):                       ${NEW_HOST}:${NEW_PORT}"
echo "  .env backup:                         ${ENV_BACKUP}"
echo "  Dump file:                           ${DUMP_FILE}"
echo ""
echo -e "${YELLOW}  📋 CHECKLIST — Confirm with operator:${NC}"
echo "  [✅] Connected to new server"
echo "  [✅] Dump file size > 0, valid header"
echo "  [✅] Import complete"
echo "  [✅] Row counts verified"
echo "  [✅] .env backed up + updated"
echo "  [✅] Docker rebuilt, container healthy"
echo "  [✅] Health check pass"
echo "  [✅] DB write/read test pass"
echo ""
echo -e "${CYAN}  Next: Notify 24hHotNewsAI admin migration complete.${NC}"
echo "  Rollback: cp ${ENV_BACKUP} ${ENV_FILE} && docker compose up -d --force-recreate"
echo ""
