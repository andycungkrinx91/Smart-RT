from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import add_keuangan_rt, delete_keuangan_rt, list_keuangan_rt, update_keuangan_rt
from app.deps import get_current_user
from app.models import KeuanganJenis
from app.routers.stats import notify_stats_changed
from app.schemas import KeuanganRTCreate, KeuanganRTOut, KeuanganRTUpdate


router = APIRouter(tags=["keuangan_rt"])


@router.get("/datakeuanganrt", response_model=list[KeuanganRTOut])
async def data_keuangan_rt(
    month: int | None = Query(default=None, ge=1, le=12, description="Filter bulan (1-12). Harus disertai year."),
    year: int | None = Query(default=None, ge=2000, description="Filter tahun (e.g. 2024)."),
    sort_by: str | None = Query(default=None, description="Column to sort by (e.g. tanggal, jenis, kategori, jumlah, created_at)."),
    order: str | None = Query(default=None, description="Sort direction: 'asc' or 'desc' (default: desc)."),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    items = await list_keuangan_rt(db, month=month, year=year, sort_by=sort_by, order=order)
    return [
        KeuanganRTOut(
            id=i.id,
            tanggal=i.tanggal,
            jenis=KeuanganJenis(i.jenis),
            kategori=i.kategori,
            keterangan=i.keterangan,
            jumlah=i.jumlah,
            created_at=i.created_at,
        )
        for i in items
    ]


@router.post("/adddatakeuanganrt", response_model=KeuanganRTOut)
async def add_data_keuangan_rt(payload: KeuanganRTCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await add_keuangan_rt(
        db,
        tanggal=payload.tanggal,
        jenis=payload.jenis,
        kategori=payload.kategori,
        keterangan=payload.keterangan,
        jumlah=payload.jumlah,
    )
    await notify_stats_changed()
    return KeuanganRTOut(
        id=obj.id,
        tanggal=obj.tanggal,
        jenis=KeuanganJenis(obj.jenis),
        kategori=obj.kategori,
        keterangan=obj.keterangan,
        jumlah=obj.jumlah,
        created_at=obj.created_at,
    )


@router.put("/updatedatakeuanganrt", response_model=KeuanganRTOut)
async def update_data_keuangan_rt(payload: KeuanganRTUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await update_keuangan_rt(
        db,
        id=payload.id,
        tanggal=payload.tanggal,
        jenis=payload.jenis,
        kategori=payload.kategori,
        keterangan=payload.keterangan,
        jumlah=payload.jumlah,
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data keuangan RT tidak ditemukan")
    await notify_stats_changed()
    return KeuanganRTOut(
        id=obj.id,
        tanggal=obj.tanggal,
        jenis=KeuanganJenis(obj.jenis),
        kategori=obj.kategori,
        keterangan=obj.keterangan,
        jumlah=obj.jumlah,
        created_at=obj.created_at,
    )


@router.delete("/deletedatakeuanganrt")
async def delete_data_keuangan_rt(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    ok = await delete_keuangan_rt(db, id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data keuangan RT tidak ditemukan")
    await notify_stats_changed()
    return {"message": "Data keuangan RT berhasil dihapus"}
