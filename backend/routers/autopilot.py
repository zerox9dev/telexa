from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_auth
from services.settings import get_setting, set_setting
from services import autopilot

router = APIRouter(prefix="/autopilot", tags=["autopilot"])


class AutopilotSettings(BaseModel):
    enabled: bool
    interval_minutes: int
    rewrite: bool
    publish: bool


@router.get("")
async def get_autopilot(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    enabled = await get_setting(db, "autopilot_enabled") == "true"
    interval = int(await get_setting(db, "autopilot_interval_minutes") or "30")
    rewrite = await get_setting(db, "autopilot_rewrite") != "false"
    publish = await get_setting(db, "autopilot_publish") != "false"
    return {"data": {
        "enabled": enabled,
        "interval_minutes": interval,
        "rewrite": rewrite,
        "publish": publish,
    }, "error": None}


@router.put("")
async def update_autopilot(
    body: AutopilotSettings,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    interval = max(1, min(1440, body.interval_minutes))
    await set_setting(db, "autopilot_enabled", "true" if body.enabled else "false")
    await set_setting(db, "autopilot_interval_minutes", str(interval))
    await set_setting(db, "autopilot_rewrite", "true" if body.rewrite else "false")
    await set_setting(db, "autopilot_publish", "true" if body.publish else "false")
    await db.commit()

    if body.enabled:
        autopilot.start(interval)
    else:
        autopilot.stop()

    return {"data": {"ok": True}, "error": None}


@router.post("/run")
async def run_now(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    """Trigger one cycle immediately."""
    autopilot.run_once()
    return {"data": {"ok": True}, "error": None}
