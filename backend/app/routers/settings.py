from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import json
from pydantic import BaseModel

from app.core.database import get_db
from app.deps import require_role
from app.models import UserRole
from app.crud import get_setting, update_setting

router = APIRouter(tags=["settings"])

class SettingUpdate(BaseModel):
    key: str
    value: dict
    description: str | None = None

@router.get(
    "/settings/{key}",
    dependencies=[
        Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT)),
    ],
)
async def get_setting_ep(key: str, db: AsyncSession = Depends(get_db)):
    obj = await get_setting(db, key)
    if not obj:
        return {"key": key, "value": {}}
    return {"key": obj.key, "value": json.loads(obj.value)}

@router.post(
    "/settings",
    dependencies=[
        Depends(require_role(UserRole.ADMINISTRATOR, UserRole.MANAGEMENT)),
    ],
)
async def update_setting_ep(payload: SettingUpdate, db: AsyncSession = Depends(get_db)):
    await update_setting(db, key=payload.key, value=json.dumps(payload.value), description=payload.description)
    return {"message": f"Setting {payload.key} updated successfully"}

# Public endpoint for frontend-public
@router.get("/public/settings/{key}")
async def get_public_setting_ep(key: str, db: AsyncSession = Depends(get_db)):
    # Only allow specific public keys to be read without auth
    allowed_keys = [
        "page_home",
        "page_about",
        "layout_global",
        "layout_navigation",
        "layout_footer",
    ]
    if key not in allowed_keys:
        raise HTTPException(status_code=403, detail="Access denied")
        
    obj = await get_setting(db, key)
    if not obj:
        return {"key": key, "value": {}}
    return {"key": obj.key, "value": json.loads(obj.value)}
