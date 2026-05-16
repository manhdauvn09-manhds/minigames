# Sodoku game subapp — multi-stage build.
#
# Stage 1 (builder): npm ci + vite build → /app/dist
# Stage 2 (runtime): nginx:alpine serving the built bundle.
#
# Phase 5 ship: bundle is ~220KB raw / 70KB gzipped. PWA precache
# covers js + css + html + svg + woff2 so the daily challenge stays
# playable offline once cached.
#
# Phase 6 cutover note: this REPLACES the earlier Phase 0 Dockerfile
# which copied Design/{Sudoku.html, src, components, styles, assets}
# directly. Design/ stays in the repo as historical reference but is
# excluded from the build context via .dockerignore.

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps from lockfile only — deterministic, ignores
# package.json drift. Copying just the manifests first keeps this
# layer cached when only src/ changes.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest and build. tsc -b runs first (strict typecheck);
# vite build produces dist/ + service worker + manifest.
COPY . .
RUN npm run build

# ── Runtime ─────────────────────────────────────────────────
FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/  /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
