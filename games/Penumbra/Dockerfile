# Penumbra game subapp — multi-stage Next.js standalone build.
#
# Different shape from the FE-only subapps (Sodoku/Kaya/etc.):
# Penumbra is Next.js 14 SSR — needs Node runtime, not nginx static.
# next.config.mjs sets `output: "standalone"` which produces
# .next/standalone/server.js (a self-contained Node server with only the
# deps it actually uses).
#
# Stage 1 (builder): npm ci + next build → .next/standalone + .next/static
# Stage 2 (runtime): node:20-alpine + minimal /app, runs server.js on :3000
#
# The host nginx (penumbra.allin1site.com) reverse-proxies → 127.0.0.1:8698
# which docker-compose maps to this container's :3000.

FROM node:20-alpine AS builder
WORKDIR /app

# Deps — Linux, no & in path, postinstalls run normally.
COPY package.json package-lock.json ./
RUN npm ci

# Source + build.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runtime ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# standalone bundle has its own minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# server.js binds HOSTNAME:PORT — defaults above expose on all interfaces.
CMD ["node", "server.js"]
