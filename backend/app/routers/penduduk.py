from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import add_penduduk, delete_penduduk, list_penduduk, update_penduduk
from app.deps import get_current_user
from app.models import PendudukStatus
from app.routers.stats import notify_stats_changed
from app.schemas import PendudukCreate, PendudukOut, PendudukUpdate


router = APIRouter(tags=["penduduk"])


@router.get("/datapenduduk", response_model=list[PendudukOut])
async def data_penduduk(
    sort_by: str | None = Query(default=None, description="Column to sort by (e.g. nama_lengkap, nik, status, created_at)."),
    order: str | None = Query(default=None, description="Sort direction: 'asc' or 'desc' (default: desc)."),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    items = await list_penduduk(db, sort_by=sort_by, order=order)
    return [
        PendudukOut(
            id=i.id,
            nik=i.nik,
            nama_lengkap=i.nama_lengkap,
            alamat=i.alamat,
            pekerjaan=i.pekerjaan,
            status=PendudukStatus(i.status),
            created_at=i.created_at,
        )
        for i in items
    ]


@router.post("/adddatapenduduk", response_model=PendudukOut)
async def add_data_penduduk(payload: PendudukCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await add_penduduk(
        db,
        nik=payload.nik,
        nama_lengkap=payload.nama_lengkap,
        alamat=payload.alamat,
        pekerjaan=payload.pekerjaan,
        status=payload.status,
    )
    await notify_stats_changed()
    return PendudukOut(
        id=obj.id,
        nik=obj.nik,
        nama_lengkap=obj.nama_lengkap,
        alamat=obj.alamat,
        pekerjaan=obj.pekerjaan,
        status=PendudukStatus(obj.status),
        created_at=obj.created_at,
    )


@router.put("/updatedatapenduduk", response_model=PendudukOut)
async def update_data_penduduk(payload: PendudukUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await update_penduduk(
        db,
        id=payload.id,
        nik=payload.nik,
        nama_lengkap=payload.nama_lengkap,
        alamat=payload.alamat,
        pekerjaan=payload.pekerjaan,
        status=payload.status,
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data penduduk tidak ditemukan")
    await notify_stats_changed()
    return PendudukOut(
        id=obj.id,
        nik=obj.nik,
        nama_lengkap=obj.nama_lengkap,
        alamat=obj.alamat,
        pekerjaan=obj.pekerjaan,
        status=PendudukStatus(obj.status),
        created_at=obj.created_at,
    )


@router.delete("/deletedatapenduduk")
async def delete_data_penduduk(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    ok = await delete_penduduk(db, id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data penduduk tidak ditemukan")
    await notify_stats_changed()
    return {"message": "Data penduduk berhasil dihapus"}
