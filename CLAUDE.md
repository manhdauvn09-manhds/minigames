# ShadowLing — Claude Code Project Context

## Dự án là gì

**ShadowLing** là nền tảng web luyện shadowing đa ngôn ngữ (Tiếng Anh / Tiếng Việt / Tiếng Nhật).  
Người dùng nghe audio và nhại theo. Text trên màn hình đổi màu từng từ/câu kiểu karaoke khi đọc (Web Speech API).

## Thư mục làm việc local

```
E:\SourceCode\Shadowing
```

## Branch đang phát triển

```
claude/shadowing-practice-platform-cKWmO
```

## Tài liệu quan trọng trong repo

| File | Nội dung |
|---|---|
| `srs.html` | SRS v1.2 — Đặc tả kỹ thuật đầy đủ (18 sections), mở bằng browser |
| `prototype.html` | Interactive prototype — 9 màn hình navigable, karaoke thật bằng Web Speech API |

## Tech Stack (kế hoạch)

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| TTS / Karaoke | **Web Speech API** (browser built-in, miễn phí) |
| Database + Auth | **Supabase** free tier — PostgreSQL + Google OAuth |
| Dictionary | Jisho API (JA), Free Dictionary API (EN), MyMemory (dịch) |
| Crawler | GitHub Actions (cron hàng ngày), Cheerio/Playwright |
| Hosting | Vercel free tier |
| **Chi phí** | **$0 / tháng** |

## 3 ngôn ngữ & đối tượng

| Ngôn ngữ | Đối tượng | Ghi chú |
|---|---|---|
| 🇺🇸 Tiếng Anh | Trẻ em 6–12 tuổi | Theme vui nhộn, gamification, mascot |
| 🇻🇳 Tiếng Việt | Trẻ em 6–12 tuổi | Chương trình tiểu học VN |
| 🇯🇵 Tiếng Nhật | Người IT 18–40 tuổi | IT business, crawl hàng ngày từ Zenn/Qiita/NHK Easy |

## Tính năng cốt lõi đã được spec

1. **Karaoke** — `SpeechSynthesisUtterance.onboundary` highlight từng từ theo `charIndex`
2. **Speed control** — 0.5x → 2.0x via `utterance.rate`
3. **Repeat modes** — Loop cùng tốc độ / Progressive tăng dần (0.75→1.0→1.25→1.5)
4. **Voice selection** — Nam/nữ đúng ngôn ngữ qua `speechSynthesis.getVoices()`
5. **Furigana** — `<ruby>` tags cho tiếng Nhật
6. **Dictionary popup** — Select text → tra từ (Jisho / FreeDictionary / MyMemory)
7. **Hán Việt** — JSON map client-side (kanji → âm Hán Việt)
8. **Favorites** — Lưu keyword, tra lại on-demand (không lưu dictionary data)
9. **Google OAuth** — Supabase Auth, zero config
10. **Daily IT crawler** — GitHub Actions cron 6AM UTC, 6+ nguồn JA IT

## Database (Supabase PostgreSQL)

Bảng chính: `users`, `user_profiles`, `languages`, `categories`, `lessons`,
`study_sessions`, `user_favorites`, `crawl_sources`, `crawl_raw_items`

Bảng mới nhất: `user_favorites (id, user_id, keyword, language_code, lesson_id, notes, created_at)`

## API Routes (Next.js)

```
/api/auth/*              — Supabase Auth + Google OAuth callback
/api/languages           — Danh sách ngôn ngữ
/api/categories/:lang    — Danh mục theo ngôn ngữ
/api/lessons/:id         — Transcript + furigana_json
/api/dict/ja/:word       — Proxy → Jisho API
/api/dict/en/:word       — Proxy → Free Dictionary API
/api/dict/translate      — Proxy → MyMemory
/api/favorites           — CRUD favorites
/api/progress/sessions   — Lưu phiên học
/api/admin/crawl/*       — Quản lý crawl sources + raw items
```

## Crawler GitHub Actions

```yaml
# Hàng ngày 6AM UTC (13:00 JST)
crawl-it-daily.yml → NHK Easy, Gigazine, ITmedia, Zenn, Qiita, Hatena Tech

# Hàng tuần
crawl-weekly.yml → British Council Kids, VOA

# Mỗi 5 ngày — giữ Supabase free tier không bị ngắt
keep-alive.yml
```

## Conventions

- Language: Trả lời và comment bằng **tiếng Việt** (theo yêu cầu người dùng)
- Commit message: Tiếng Anh, ngắn gọn
- Branch: luôn làm việc trên `claude/shadowing-practice-platform-cKWmO`
- Files hiện có (chưa phải Next.js app): repo đang ở giai đoạn spec/prototype
- Khi bắt đầu code Next.js app: tạo thư mục `shadowing-app/` trong repo này

## Trạng thái hiện tại (Phase 0 — Done)

- [x] SRS v1.2 hoàn chỉnh (`srs.html`)
- [x] Interactive prototype 9 màn hình (`prototype.html`)
- [ ] Phase 1: Khởi tạo Next.js 14 + Supabase + Auth
- [ ] Phase 2: Karaoke engine + Practice screen
- [ ] Phase 3: Dictionary popup + Favorites
- [ ] Phase 4: Admin + Crawler GitHub Actions
