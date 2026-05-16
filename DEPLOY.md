# Deploy minigames.allin1site.com (independent Docker)

## 1. On the VPS — first-time setup

```bash
# Clone the repo and go to subapp/games
git clone https://github.com/manhdauvn09-manhds/allin1site.git
cd allin1site/subapp/games

# Create the env file (NEVER commit this)
cat > .env <<'EOF'
DATABASE_URL=mysql://USER:PASS@HOST:3306/minigame
MYSQL_SSL=true
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
CORS_ORIGIN=https://minigames.allin1site.com
EOF
chmod 600 .env

# Initialize the MySQL schema once (creates `users`, `presence`, `scores_*`)
mysql -h <host> -u <user> -p minigame < api/schema.sql

# Build & start
docker compose up -d --build

# Verify
curl -s http://127.0.0.1:3333/healthz   # → {"ok":true,...}
curl -s http://127.0.0.1:3333/          # → hub HTML
```

## 2. Reverse proxy (nginx on the host)

`/etc/nginx/sites-available/minigames.conf`:
```nginx
server {
  listen 80;
  server_name minigames.allin1site.com;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl http2;
  server_name minigames.allin1site.com;

  ssl_certificate     /etc/letsencrypt/live/minigames.allin1site.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/minigames.allin1site.com/privkey.pem;

  # Security headers (CF will pass these through)
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "no-referrer-when-downgrade" always;
  add_header Permissions-Policy "fullscreen=(self), geolocation=(), microphone=(), camera=()" always;

  client_max_body_size 64k;

  location / {
    proxy_pass         http://127.0.0.1:3333;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
  }
}
```

Then:
```bash
sudo ln -s /etc/nginx/sites-available/minigames.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d minigames.allin1site.com   # if no cert yet
```

## 3. Cloudflare DNS

- Add A or CNAME record `minigames` → your VPS IP (or origin)
- Proxy: orange cloud ON
- SSL/TLS mode: **Full (strict)**
- Caching → Purge → "Purge Everything" after each deploy

## 4. Update flow (subsequent deploys)

```bash
cd ~/allin1site
git pull
cd subapp/games
docker compose up -d --build      # rebuilds & swaps the container with zero-ish downtime
docker image prune -f             # cleanup old images
```

CF cache: Purge Everything OR add `?v=N` query strings on assets.

## 5. Verify online

| URL | Expected |
|---|---|
| `https://minigames.allin1site.com/` | New hub (8 game cards, status bar, footer) |
| `https://minigames.allin1site.com/api/stats?all=1` | JSON `{games:[...]}` |
| `https://minigames.allin1site.com/healthz` | `{"ok":true,...}` |
| `https://minigames.allin1site.com/sitemap.xml` | XML sitemap |
| `https://minigames.allin1site.com/robots.txt` | text |

## 6. Common issues

- **`api/stats` returns 500** → schema not initialized. Re-run `api/schema.sql`.
- **Google login button does nothing** → `GOOGLE_CLIENT_ID` empty, or domain not added to Authorized JavaScript origins on Google Cloud Console.
- **Old hub still showing** → CF cache. Purge Everything.
- **`ECONNREFUSED` on DB** → wrong `DATABASE_URL` or DB not reachable from the container. Try `docker compose exec minigames sh` then test connectivity.
