import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import RedisLike, get_redis
from app.core.security import create_access_token, decode_token, verify_password
from app.crud import get_user_by_email, set_user_login
from app.schemas import LoginIn, TokenOut


router = APIRouter(tags=["auth"])


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db), rds: RedisLike = Depends(get_redis)):
    user = await get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email atau password salah")

    jti = secrets.token_urlsafe(16)
    token = create_access_token(subject=str(user.userid), role=user.role.value, jti=jti)
    await rds.setex(f"session:{jti}", settings.SESSION_TTL_SECONDS, str(user.userid))
    await set_user_login(db, user.userid, True)

    return TokenOut(access_token=token)


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db), rds: RedisLike = Depends(get_redis)):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if token:
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            sub = payload.get("sub")
            if jti:
                await rds.delete(f"session:{jti}")
            if sub:
                await set_user_login(db, int(sub), False)
        except Exception:
            # Logout harus best-effort
            pass

    response.delete_cookie("access_token")
    return {"message": "Logout berhasil"}
