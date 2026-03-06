from secrets import compare_digest

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import RedisLike, get_redis
from app.core.security import decode_token
from app.crud import get_user_by_id
from app.models import User, UserRole


bearer = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key")


async def verify_api_key(api_key: str = Depends(api_key_header)) -> str:
    expected_api_key = settings.API_KEY
    if not expected_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key belum dikonfigurasi",
        )

    if not compare_digest(api_key, expected_api_key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="API key tidak valid")

    return api_key


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
    rds: RedisLike = Depends(get_redis),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Belum login")
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid")

    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid")

    session_key = f"session:{jti}"
    session_userid = await rds.get(session_key)
    if session_userid is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesi berakhir")

    user = await get_user_by_id(db, int(session_userid))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User tidak ditemukan")
    return user


def require_role(*roles: UserRole):
    async def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")
        return user

    return _dep


"""Dependencies untuk API-only backend."""
