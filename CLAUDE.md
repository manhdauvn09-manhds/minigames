# MinigGames — Deployment & Infrastructure (2026-06-09)

## ⚠️ CRITICAL: Server Migration Complete (2026-06-04)

**OLD servers DELETED**: 62.238.28.106, 77.42.35.9, prod-106, aetheria-9 ❌  
**ALL references to these IPs are INVALID** — use new info below only.

---

## 1. Current Deployment

| Item | Value |
|------|-------|
| **Server** | `mcp-80` (65.108.62.80) — CodeProvider consolidated |
| **Container** | `minigames` |
| **Internal Port** | 3333 (Express.js) |
| **External Port** | 9210 → 3333 (nginx reverse proxy on host) |
| **Domain** | minigames.allin1site.com (Cloudflare proxied) |
| **Status** | ✅ Up & healthy |

## 2. Database (Migrated 2026-06-02)

| Param | Value |
|-------|-------|
| **Host** | 149.28.152.221:3306 (Vultr Singapore self-host) |
| **Database** | minigame |
| **User** | minigames_user |
| **SSL** | false (same VPC) |
| **Connection String** | `mysql://minigames_user:PASSWORD@149.28.152.221:3306/minigame` |

**Old values (DELETED):**
- ~~vultr-prod-*.vultrdb.com:16751~~
- ~~User: minigames~~
- ~~SSL: true~~

## 3. Deploy Method (New: MCP Tool Only)

**❌ DO NOT USE**: deploy.ps1 or deploy-safe.ps1 (PowerShell, old method)

**✅ USE**: CodeProvider MCP tool on mcp-80

```bash
# Via MCP (remote SSH to mcp-80):
mcp__CodeProvider_MCP__deploy \
  --server-id=mcp-80 \
  --app-id=minigames
```

This performs:
1. `cd /opt/minigames && git pull` (via SSH deploy key)
2. `docker compose up -d --build minigames`
3. Health check: `curl 127.0.0.1:9210/healthz`

## 4. Environment Variables (.env on mcp-80)

Located at: `/opt/minigames/.env` (NOT in repo, only on server)

```bash
DATABASE_URL=mysql://minigames_user:PASSWORD@149.28.152.221:3306/minigame
MYSQL_SSL=false
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID (optional)
CORS_ORIGIN=https://minigames.allin1site.com
PORT=3333
NODE_ENV=production
```

## 5. Health Check

```bash
# From host (mcp-80):
curl http://127.0.0.1:9210/healthz
# Expected: {"ok":true,"ts":1718...}

# From outside (Cloudflare):
curl https://minigames.allin1site.com/healthz
```

## 6. Docker Operations on mcp-80

```bash
# View logs
docker logs -f minigames

# Restart container
docker restart minigames

# Shell into container
docker exec -it minigames sh
```

## 7. Files on Server

- **WorkDir**: `/opt/minigames`
- **Nginx vhost**: `/etc/nginx/sites-enabled/minigames.allin1site.com.conf`
- **.env file**: `/opt/minigames/.env` (secret, not in git)
- **Docker compose**: `/opt/minigames/docker-compose.yml`

## 8. Troubleshooting

| Issue | Check |
|-------|-------|
| Port 9210 not responding | `docker ps \| grep minigames`, check container logs |
| DB connection refused | Verify .env DATABASE_URL, test from container: `mysql -h 149.28.152.221 -u minigames_user -p minigame` |
| Old server IP in code | Search for 62.238.28.106, 77.42.35.9 — INVALID, remove |
| Nginx SSL error | Check cert at `/etc/letsencrypt/live/minigames.allin1site.com/` |

---

**Last Updated**: 2026-06-09  
**Deployment Method**: CodeProvider MCP  
**Status**: ✅ Live on mcp-80
