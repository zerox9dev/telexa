from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import require_auth
from settings_store import get_setting, set_setting
import autopilot

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
        autopilot.start()
    else:
        autopilot.stop()

    return {"data": {"ok": True}, "error": None}


@router.post("/run")
async def run_now(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_auth),
):
    """Trigger one cycle immediately."""
    import asyncio
    asyncio.create_task(autopilot._run_cycle())
    return {"data": {"ok": True}, "error": None}
