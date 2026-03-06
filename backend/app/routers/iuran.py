from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import add_iuran_warga, delete_iuran_warga, list_iuran_warga, update_iuran_warga
from app.deps import get_current_user
from app.models import IuranStatus
from app.routers.stats import notify_stats_changed
from app.schemas import IuranWargaCreate, IuranWargaOut, IuranWargaUpdate


router = APIRouter(tags=["iuran_warga"])


@router.get("/dataiuranwarga", response_model=list[IuranWargaOut])
async def data_iuran_warga(
    month: int | None = Query(default=None, ge=1, le=12, description="Filter bulan (1-12). Harus disertai year."),
    year: int | None = Query(default=None, ge=2000, description="Filter tahun (e.g. 2024)."),
    sort_by: str | None = Query(default=None, description="Column to sort by (e.g. bulan, jumlah, status_pembayaran, tanggal_bayar, created_at)."),
    order: str | None = Query(default=None, description="Sort direction: 'asc' or 'desc' (default: desc)."),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = await list_iuran_warga(db, month=month, year=year, sort_by=sort_by, order=order)
    return [
        IuranWargaOut(
            id=i.id,
            no_kk=i.no_kk,
            nama_kepala_keluarga=nama_kepala_keluarga,
            bulan=i.bulan,
            jumlah=i.jumlah,
            status_pembayaran=IuranStatus(i.status_pembayaran),
            tanggal_bayar=i.tanggal_bayar,
            metode_pembayaran=i.metode_pembayaran,
            alamat=i.alamat,
            keterangan=i.keterangan,
            created_at=i.created_at,
        )
        for i, nama_kepala_keluarga in rows
    ]


@router.post("/adddataiuranwarga", response_model=IuranWargaOut)
async def add_data_iuran_warga(payload: IuranWargaCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await add_iuran_warga(
        db,
        no_kk=payload.no_kk,
        bulan=payload.bulan,
        jumlah=payload.jumlah,
        status_pembayaran=payload.status_pembayaran,
        tanggal_bayar=payload.tanggal_bayar,
        metode_pembayaran=payload.metode_pembayaran,
        alamat=payload.alamat,
        keterangan=payload.keterangan,
    )
    await notify_stats_changed()
    # Reload with join to get nama_kepala_keluarga
    rows = await list_iuran_warga(db)
    for i, nama_kepala_keluarga in rows:
        if i.id == obj.id:
            return IuranWargaOut(
                id=i.id,
                no_kk=i.no_kk,
                nama_kepala_keluarga=nama_kepala_keluarga,
                bulan=i.bulan,
                jumlah=i.jumlah,
                status_pembayaran=IuranStatus(i.status_pembayaran),
                tanggal_bayar=i.tanggal_bayar,
                metode_pembayaran=i.metode_pembayaran,
                alamat=i.alamat,
                keterangan=i.keterangan,
                created_at=i.created_at,
            )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data iuran warga tidak ditemukan setelah dibuat")


@router.put("/updatedataiuranwarga", response_model=IuranWargaOut)
async def update_data_iuran_warga(payload: IuranWargaUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await update_iuran_warga(
        db,
        id=payload.id,
        no_kk=payload.no_kk,
        bulan=payload.bulan,
        jumlah=payload.jumlah,
        status_pembayaran=payload.status_pembayaran,
        tanggal_bayar=payload.tanggal_bayar,
        metode_pembayaran=payload.metode_pembayaran,
        alamat=payload.alamat,
        keterangan=payload.keterangan,
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data iuran warga tidak ditemukan")
    await notify_stats_changed()
    # Reload with join to get nama_kepala_keluarga
    rows = await list_iuran_warga(db)
    for i, nama_kepala_keluarga in rows:
        if i.id == obj.id:
            return IuranWargaOut(
                id=i.id,
                no_kk=i.no_kk,
                nama_kepala_keluarga=nama_kepala_keluarga,
                bulan=i.bulan,
                jumlah=i.jumlah,
                status_pembayaran=IuranStatus(i.status_pembayaran),
                tanggal_bayar=i.tanggal_bayar,
                metode_pembayaran=i.metode_pembayaran,
                alamat=i.alamat,
                keterangan=i.keterangan,
                created_at=i.created_at,
            )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data iuran warga tidak ditemukan setelah diperbarui")


@router.delete("/deletedataiuranwarga")
async def delete_data_iuran_warga(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    ok = await delete_iuran_warga(db, id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data iuran warga tidak ditemukan")
    await notify_stats_changed()
    return {"message": "Data iuran warga berhasil dihapus"}
