"""Self-service profile endpoint — accessible by *any* authenticated user.

Deliberately separate from the admin-only ``/userlist`` / ``/updateuser``
endpoints so that MANAGEMENT users can read and update their own profile
without requiring ADMINISTRATOR privileges.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import update_user
from app.deps import get_current_user
from app.models import User
from app.schemas import MeUpdate, UserOut


router = APIRouter(tags=["me"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Return the profile of the currently authenticated user."""
    return UserOut(
        userid=current_user.userid,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        isLogin=current_user.isLogin,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: MeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Update the currently authenticated user's name and/or password.

    Role and email cannot be changed through this endpoint — those require
    admin access via ``/updateuser``.
    """
    if not payload.name and not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada perubahan yang dikirim",
        )

    updated = await update_user(
        db,
        userid=current_user.userid,
        name=payload.name,
        email=None,
        password=payload.password,
        role=None,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan",
        )

    return UserOut(
        userid=updated.userid,
        name=updated.name,
        email=updated.email,
        role=updated.role,
        isLogin=updated.isLogin,
        created_at=updated.created_at,
    )
