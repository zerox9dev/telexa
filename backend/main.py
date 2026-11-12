from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from core.database import async_session_factory, create_all_tables
from core.config import get_settings
from models import TelegramSession
from services.settings import get_telegram_config, get_setting
from services import autopilot
from integrations import telegram as tc
from integrations import ai
from routers import auth, channels, posts, admin, media, setup as setup_router
from routers import autopilot as autopilot_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the schema exists (replaces Alembic for this single-user app).
    await create_all_tables()

    # Try to restore Telethon session from DB on startup
    try:
        async with async_session_factory() as db:
            cfg = await get_telegram_config(db)
            if not (cfg.api_id and cfg.api_hash and cfg.allowed_user_id):
                print("[startup] Telegram not configured yet — skip session restore")
            else:
                result = await db.execute(
                    select(TelegramSession).where(
                        TelegramSession.user_id == cfg.allowed_user_id
                    )
                )
                session = result.scalar_one_or_none()
                if session:
                    await tc.init_client(
                        session.session_string,
                        cfg.api_id,
                        cfg.api_hash,
                    )

            # Start autopilot if enabled
            if await get_setting(db, "autopilot_enabled") == "true":
                interval = int(await get_setting(db, "autopilot_interval_minutes") or "30")
                autopilot.start(interval)
    except Exception as e:
        print(f"[startup] Could not restore Telegram session: {e}")

    yield

    await autopilot.shutdown()
    await tc.disconnect_client()
    await ai.close_clients()


app = FastAPI(title="telexa", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"data": None, "error": exc.detail},
        )
    return JSONResponse(
        status_code=500,
        content={"data": None, "error": str(exc)},
    )


# Media is stored in the DB and served from /media/{id} (no /api prefix).
app.include_router(media.router)

app.include_router(setup_router.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(channels.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(autopilot_router.router, prefix="/api")

