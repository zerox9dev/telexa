# telexa

Self-hosted Telegram channel parser with AI rewriting and bot publishing.

Parse public Telegram channels → rewrite posts with AI → publish to your own channels via Bot API. Runs in Docker, no cloud required.

**Stack:** FastAPI · SQLAlchemy async · React 18 · Vite · TypeScript · Tailwind v4 · PostgreSQL · Telethon · Docker

![Dashboard](./preview.png)

---

## Features

- **MTProto parsing** — reads any public Telegram channel via your userbot (QR or phone login)
- **AI rewriting** — OpenRouter (GPT-4o, Claude, Gemini, …) or local LLM via LM Studio / Ollama
- **Per-channel prompts** — custom rewrite instructions per source channel
- **Bot publishing** — sends text, photos, videos, and media albums to your channels
- **Single-user, self-hosted** — no multi-tenancy, no SaaS, your data stays with you

---

## Quick Start

### 1. Get Telegram credentials

| What | Where |
|---|---|
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | [my.telegram.org](https://my.telegram.org) → API development tools |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/botfather) — add the bot as **admin** to all target channels |
| `ALLOWED_USER_ID` | Your numeric Telegram user ID — [@userinfobot](https://t.me/userinfobot) |

### 2. Configure

```bash
cp .env.example .env
# Fill in TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN, ALLOWED_USER_ID
```

### 3. Run

```bash
docker compose up -d
```

Open [http://localhost:8000](http://localhost:8000), log in with QR code or phone number.

That's it. Database migrations run automatically on first start.

---

## Configuration

All values in `.env`:

| Variable | Description |
|---|---|
| `TELEGRAM_API_ID` | API ID from my.telegram.org |
| `TELEGRAM_API_HASH` | API hash from my.telegram.org |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `ALLOWED_USER_ID` | Your Telegram user ID. Only this account can log in |
| `DATABASE_URL` | PostgreSQL DSN. Auto-set by Docker Compose, change only if running without Docker |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins. Default: `http://localhost:8000` |

**AI provider** (OpenRouter key, model, parse mode) is configured at runtime in the Admin panel — no restart needed.

---

## AI Provider

Go to `/admin` after logging in:

- Set **OpenRouter API key** ([openrouter.ai/keys](https://openrouter.ai/keys)) and pick a model from the dropdown
- Leave the key empty to fall back to a local server at `http://localhost:1234/v1` (LM Studio, Ollama, etc.)

---

## Usage

1. Log in with QR code or phone number
2. **My Channels** — add your target Telegram channels (bot must be admin there)
3. **Source Channels** — add public channels to parse, link them to a target
4. Select a source channel → **Fetch Posts**
5. Click a post → **Rewrite with AI** → edit if needed → **Publish**

---

## Development

Requirements: Python 3.12+, Node.js 20+, PostgreSQL 14+

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

The frontend dev server proxies `/api` and `/media` to `localhost:8000`.

---

## Project Structure

```
Dockerfile              # Multi-stage: Node builds frontend, Python serves everything
docker-compose.yml      # App + PostgreSQL

backend/
  main.py               # FastAPI app, lifespan, static file serving
  models.py             # SQLAlchemy models
  database.py           # Async engine & session factory
  telegram_client.py    # Telethon singleton (MTProto parsing & media download)
  bot_publisher.py      # Bot API calls (sendMessage / sendPhoto / sendMediaGroup)
  ai_rewriter.py        # OpenRouter / local LLM client
  settings_store.py     # Runtime config from DB (API keys, model, etc.)
  routers/
    auth.py             # QR login, phone login, session management
    channels.py         # My channels & source channels CRUD
    posts.py            # Fetch, rewrite, publish, discard
    admin.py            # Settings, publish logs, stats
    setup.py            # First-run setup

frontend/
  src/
    pages/              # Login, Dashboard, Admin, Stats, Setup
    components/         # AppShell, PostCard, PostEditor, shadcn/ui
    contexts/           # ChannelsContext
    api/client.ts       # Axios instance
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache 2.0](LICENSE)
