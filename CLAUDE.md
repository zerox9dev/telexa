# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**telexa** — single-user, self-hosted web service: parse public Telegram channels, AI-rewrite posts, publish to your own channels via Bot API.

## Dev Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head                          # run migrations
uvicorn main:app --reload --port 8000         # dev server
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

**Backend** — FastAPI + asyncpg (SQLAlchemy async). All routes under `/api`, all responses `{ "data": ..., "error": null }`.

Three external integrations live in dedicated modules:
- `telegram_client.py` — singleton Telethon client (MTProto, StringSession stored in DB). Used for parsing source channels and downloading media.
- `bot_publisher.py` — raw httpx calls to Bot API (no library). Handles sendMessage / sendPhoto / sendVideo / sendMediaGroup depending on media count.
- `ai_rewriter.py` — OpenRouter (OpenAI-compatible client, base_url `https://openrouter.ai/api/v1`), default model `openai/gpt-4o-mini`, async, max_tokens 1000. Falls back to local LM Studio (`http://localhost:1234/v1`) when no API key. The API key and model are stored in the `settings` table (key/value), edited from the Admin panel — `posts.rewrite_post` reads them per-call via `settings_store.get_setting`.

Auth is session-based: phone → code → StringSession saved to `telegram_sessions` table. Every non-auth endpoint checks that a session exists with `user_id == ALLOWED_USER_ID` (from `.env`), returns 401 otherwise.

Media files are downloaded to `backend/media/{source_channel_id}/{message_id}/` and served via FastAPI StaticFiles at `/media/...`.

**Routers:** `auth.py`, `channels.py` (my channels + source channels), `posts.py`, `admin.py`.

**Frontend** — React 18 + Vite + TypeScript + Tailwind v4 + shadcn/ui (Radix-Nova preset). Path alias `@/* → src/*`. Single axios client in `api/client.ts`. Three pages: `Login`, `Dashboard`, `Admin` (`/admin`). `Dashboard` is built on shadcn `SidebarProvider` + `AppSidebar` (collapsible icon sidebar based on the `sidebar-07` block) + `SidebarInset` main area. `PostEditor` is a shadcn `Dialog`. Toasts via `sonner`.

**Database models:** `TelegramSession`, `MyChannel` (target), `SourceChannel` (→ MyChannel FK), `Post` (status: new→ready→sent|discarded), `PublishLog`, `Setting` (key/value store for runtime config like OpenRouter API key & model).

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

- `bot_publisher.py`: channel IDs use `-100` prefix (e.g. `-1001234567890`)
- Media download: `asyncio.sleep(0.3)` between files to avoid flood
- `sendMediaGroup`: caption only on the first item
- CORS: allow `http://localhost:5173`
- Alembic config in `backend/alembic.ini`
- Path alias `@/*` works in both Vite (alias in `vite.config.ts`) and TypeScript (paths in `tsconfig.json`). Don't introduce a separate `tsconfig.app.json` — the project uses a single root `tsconfig.json` with `noEmit: true`.
- Adding shadcn components: `npx shadcn@latest add <name>` from `frontend/`. The CLI sometimes drops files into a literal `@/` directory at the repo root — if that happens, `rsync`/move them into `src/components/`, `src/lib/`, `src/hooks/` and delete the `@` folder.
