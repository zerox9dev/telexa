# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**telexa** — single-user, self-hosted web service: parse public Telegram channels, AI-rewrite posts, publish to your own channels via Bot API.

## Dev Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000         # dev server (auto-creates tables on startup)
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build
npm run lint
```

### Database
```sql
CREATE DATABASE telexa;
```

## Architecture

**Backend** — FastAPI + asyncpg (SQLAlchemy async). All routes under `/api`, all responses `{ "data": ..., "error": null }`. The entrypoint is `backend/main.py` (`uvicorn main:app`); on startup the lifespan calls `create_all_tables()` (`Base.metadata.create_all`) to create any missing tables — there is no migration tool. `models.py` stays at the backend root. Everything else is grouped into packages:

- `core/` — foundation: `config.py` (pydantic Settings + `get_async_database_url`, which strips libpq-only `sslmode`/`channel_binding` params via SQLAlchemy `make_url`), `database.py` (engine / `Base` / `get_db`), `security.py` (`require_auth` dependency).
- `integrations/` — the three external clients:
  - `telegram.py` — singleton Telethon client (MTProto, StringSession stored in DB). Parses source channels and downloads media.
  - `bot_api.py` — publishes via **aiogram** (`Bot.send_message/photo/video/media_group`). Each call is wrapped by **tenacity** (`_send`) to retry transient failures: aiogram raises `TelegramRetryAfter` on 429 (honored up to 300s) and `TelegramNetworkError`/`TelegramServerError` on network/5xx. Parse mode maps `none`→plain, `html`→HTML, `markdown`→MarkdownV2, with text escaped via aiogram's `html_decoration`/`markdown_decoration`.
  - `ai.py` — OpenRouter (OpenAI-compatible client, base_url `https://openrouter.ai/api/v1`), default model `openai/gpt-4o-mini`, async, max_tokens 1000. Falls back to local LM Studio (`http://localhost:1234/v1`) when no API key.
- `services/` — business logic shared by routers and the worker:
  - `settings.py` — key/value `Setting` store + `TelegramConfig` (DB source-of-truth, `.env` fallback).
  - `posts.py` — the post pipeline (`fetch_new_posts` / `rewrite_post` / `publish_post`); both `routers/posts.py` and `services/autopilot.py` call it so the logic isn't duplicated. The OpenRouter key & model live in the `settings` table and are read per-call here via `settings.get_setting`.
  - `autopilot.py` — drives the pipeline on a schedule via **APScheduler** (`AsyncIOScheduler`, single interval job `autopilot-cycle`, `max_instances=1`). `start(interval_minutes)` runs once immediately then every N min (re-call to change interval); `stop()` removes the job; `run_once()` fires a manual cycle; `shutdown()` is called from the app lifespan.
- `routers/` — thin HTTP layer: `auth.py`, `channels.py` (my channels + source channels), `posts.py`, `admin.py`, `autopilot.py`, `media.py` (serves `/media/{id}` blobs), `setup.py`.

Auth is session-based: phone → code → StringSession saved to `telegram_sessions` table. Every non-auth endpoint checks that a session exists with `user_id == ALLOWED_USER_ID` (from `.env`), returns 401 otherwise.

Media is stored **in the database** (no filesystem): Telethon downloads each photo/video into memory and it's persisted as a `Media` row (`content` = `BYTEA`, deferred so list/serialize never loads bytes). The browser fetches each item from `GET /media/{id}` (`routers/media.py`, no `/api` prefix), which un-defers `content` and returns it with the stored mime type. Posts are serialized via `services.posts.serialize_post`, exposing media as `{id, type, url}`.

**Frontend** — React 18 + Vite + TypeScript + Tailwind v4 + shadcn/ui (Radix-Nova preset). Path alias `@/* → src/*`. Single axios client in `api/client.ts`. Three pages: `Login`, `Dashboard`, `Admin` (`/admin`). `Dashboard` is built on shadcn `SidebarProvider` + `AppSidebar` (collapsible icon sidebar based on the `sidebar-07` block) + `SidebarInset` main area. `PostEditor` is a shadcn `Dialog`. Toasts via `sonner`.

**Database models:** `TelegramSession`, `MyChannel` (target), `SourceChannel` (→ MyChannel FK), `Post` (status: new→ready→sent|discarded), `Media` (→ Post FK, `content` BYTEA blob), `PublishLog`, `Setting` (key/value store for runtime config like OpenRouter API key & model).

## Environment Variables

Copy `.env.example` to `.env`:
- `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` — from https://my.telegram.org
- `TELEGRAM_BOT_TOKEN` — bot must be admin in all target channels
- `DATABASE_URL` — `postgresql+asyncpg://...`
- `ALLOWED_USER_ID` — numeric Telegram user ID allowed to log in

## Frontend Style

Fragment.com aesthetic — dark by default, monospace tone, tight radii (`--radius: 2px`), yellow accent (oklch ≈ `#e8ff57`) mapped to shadcn `--primary`. Tailwind v4 with shadcn theme tokens in `src/styles/globals.css`. Fonts: JetBrains Mono (`.label`, `.font-mono` utility, mono code) + DM Sans (body, default `font-sans`).

Use shadcn primitives from `@/components/ui/*` rather than writing bespoke components. Lucide icons. For new screens, prefer `Card` / `Button` / `Input` / `Label` / `Select` / `Dialog` etc. Status colors live as Tailwind classes in `PostCard.tsx` / `PostEditor.tsx` (`STATUS_CLASS` map): NEW=primary, READY=blue-400, SENT=emerald-400, DISCARDED=muted.

## Key Implementation Notes

- Channel IDs use the `-100` prefix (e.g. `-1001234567890`), built in `services/posts.py` and passed to `bot_api` as `chat_id`
- Media download: `asyncio.sleep(0.3)` between files to avoid flood
- `send_media_group`: caption only on the first item of the album
- CORS: allow `http://localhost:5173`
- Schema is created by `create_all_tables()` on startup (no Alembic). `create_all` only adds *missing* tables — it does not alter existing ones, so a breaking model change needs manual SQL or a fresh DB
- Path alias `@/*` works in both Vite (alias in `vite.config.ts`) and TypeScript (paths in `tsconfig.json`). Don't introduce a separate `tsconfig.app.json` — the project uses a single root `tsconfig.json` with `noEmit: true`.
- Adding shadcn components: `npx shadcn@latest add <name>` from `frontend/`. The CLI sometimes drops files into a literal `@/` directory at the repo root — if that happens, `rsync`/move them into `src/components/`, `src/lib/`, `src/hooks/` and delete the `@` folder.
