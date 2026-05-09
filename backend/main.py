import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import select

from database import async_session_factory
from models import TelegramSession
from config import get_settings
from settings_store import get_telegram_config
import telegram_client as tc
import ai_rewriter
from routers import auth, channels, posts, admin, setup as setup_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    except Exception as e:
        print(f"[startup] Could not restore Telegram session: {e}")

    yield

    await tc.disconnect_client()
    await ai_rewriter.close_clients()


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


os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(setup_router.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(channels.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Serve built frontend if the dist directory exists (production Docker build)
_frontend_dist = os.path.join(os.path.dirname(__file__), "frontend_dist")
if os.path.isdir(_frontend_dist):
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(_frontend_dist, "index.html")
        return FileResponse(index)
