# MiniGames — Project Knowledge

> ⚠️ **GROUND TRUTH (2026-06-09)** — single source of truth. Mọi file `.md`, `.html`,
> `.ps1`, `deploy-safe.ps1` còn nhắc `62.238.28.106`/`77.42.35.9`/`prod-106`/`aetheria-9`
> là phế liệu (server đã xoá ngày 2026-06-04).

## Where things live

| | |
|---|---|
| Server | **mcp-80** = `65.108.62.80` |
| workDir | `/opt/minigames` |
| Branch | `main` (registry `gitPull: false` — push code rồi nhờ owner copy/build) |
| Container | `minigames` |
| Port | `9210` → container 3000 (hoặc theo Dockerfile) |
| Health | `http://127.0.0.1:9210/healthz` |
| Public | `https://minigames.allin1site.com` |
| Reverse proxy | Host nginx systemd (KHÔNG container nginx) |
| DB | MySQL `149.28.152.221:3306`, user `minigames_user@65.108.62.80` (grant đã siết, KHÔNG còn `'%'`) |

## Deploy (qua MCP)

```
1. Sửa code local
2. write_file qua MCP đẩy file lên `/opt/minigames/...` HOẶC owner copy thủ công
3. MCP `deploy` { server_id: "mcp-80", app_id: "minigames" }
4. Verify `server_health` server_id="mcp-80" → MiniGames HEALTHY
```

## TUYỆT ĐỐI KHÔNG

- ❌ Chạy `deploy-safe.ps1` — trỏ server cũ.
- ❌ Start container nginx riêng (host nginx đang giữ port 80/443 cho 12 app).
- ❌ Thêm DB user mới mà không update grant `@65.108.62.80` trên 149.28.152.221.

## Hàng xóm trên mcp-80 — verify trước & sau deploy

`ai1s`, `shadowing-app`, `dbmanager`, `jlpt-study`, `jlpt-app`, `codeprovider-fe`,
`codeprovider-admin`, `xiangqi-api`, `xiangqi-frontend`, `videoservice`, `ghostllm`
phải HEALTHY (Aetheria + PLD đang STOP có chủ ý nhường RAM — không phải bug).

## Phế liệu — ignore
```
deploy-safe.ps1
PROJECT_GUIDE.html  (phần "Server Infrastructure")
Skill.md
.claude/settings.local.json  (perms cho server cũ)
```
