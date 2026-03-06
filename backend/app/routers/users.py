from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import create_user, delete_user, get_user_by_email, list_users, update_user
from app.deps import require_role
from app.models import UserRole
from app.schemas import UserCreate, UserOut, UserUpdate


router = APIRouter(tags=["users"])


@router.post("/adduser", response_model=UserOut, dependencies=[Depends(require_role(UserRole.ADMINISTRATOR))])
async def add_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    exists = await get_user_by_email(db, payload.email)
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terdaftar")
    u = await create_user(db, name=payload.name, email=str(payload.email), password=payload.password, role=payload.role)
    return UserOut(userid=u.userid, name=u.name, email=u.email, role=UserRole(u.role), isLogin=u.isLogin, created_at=u.created_at)


@router.get("/userlist", response_model=list[UserOut], dependencies=[Depends(require_role(UserRole.ADMINISTRATOR))])
async def user_list(db: AsyncSession = Depends(get_db)):
    items = await list_users(db)
    out: list[UserOut] = []
    for u in items:
        out.append(UserOut(userid=u.userid, name=u.name, email=u.email, role=UserRole(u.role), isLogin=u.isLogin, created_at=u.created_at))
    return out


@router.put("/updateuser", response_model=UserOut, dependencies=[Depends(require_role(UserRole.ADMINISTRATOR))])
async def update_user_ep(payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    if payload.email is not None:
        existing = await get_user_by_email(db, str(payload.email))
        if existing is not None and existing.userid != payload.userid:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email sudah terpakai")

    u = await update_user(
        db,
        userid=payload.userid,
        name=payload.name,
        email=str(payload.email) if payload.email is not None else None,
        password=payload.password,
        role=payload.role,
    )
    if u is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    return UserOut(userid=u.userid, name=u.name, email=u.email, role=UserRole(u.role), isLogin=u.isLogin, created_at=u.created_at)


@router.delete("/deleteuser", dependencies=[Depends(require_role(UserRole.ADMINISTRATOR))])
async def delete_user_ep(userid: int, db: AsyncSession = Depends(get_db)):
    ok = await delete_user(db, userid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    return {"message": "User berhasil dihapus"}
