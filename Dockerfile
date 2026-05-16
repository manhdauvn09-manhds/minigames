# =====================================================================
# allin1site Mini Games — independent Docker image
# Single-stage Node 20 alpine. Express serves static + /api/* + MySQL.
# Build:   docker build -t minigames:latest .
# Run:     docker run -d -p 3333:3333 --env-file .env --name minigames minigames:latest
# Compose: docker compose up -d
# =====================================================================
FROM node:20-alpine AS runtime

# Run as non-root for security
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install dependencies (cache-friendly: only re-runs when package.json changes)
COPY --chown=app:app package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy app code
COPY --chown=app:app . .

# Drop unnecessary files at runtime (reduce attack surface)
RUN rm -rf .git .github .claude scripts state research engine daily \
    && rm -f Dockerfile docker-compose.yml .dockerignore .gitignore \
              api/schema.sql .env.example GameCheckList.md Skill.md

USER app
EXPOSE 3333

ENV NODE_ENV=production \
    PORT=3333

# Health check (used by docker / orchestrators)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3333/healthz || exit 1

CMD ["node", "server.js"]
