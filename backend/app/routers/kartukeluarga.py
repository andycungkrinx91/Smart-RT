from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import add_kk, delete_kk, list_kk, update_kk
from app.deps import get_current_user
from app.routers.stats import notify_stats_changed
from app.schemas import KKCreate, KKOut, KKUpdate


router = APIRouter(tags=["kartu_keluarga"])


@router.get("/datakartukeluarga", response_model=list[KKOut])
async def data_kk(
    sort_by: str | None = Query(default=None, description="Column to sort by (e.g. nama_kepala_keluarga, no_kk, kelurahan, created_at)."),
    order: str | None = Query(default=None, description="Sort direction: 'asc' or 'desc' (default: desc)."),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    items = await list_kk(db, sort_by=sort_by, order=order)
    return [
        KKOut(
            id=i.id,
            no_kk=i.no_kk,
            nik=i.nik,
            nama_kepala_keluarga=i.nama_kepala_keluarga,
            alamat=i.alamat,
            rt=i.rt,
            rw=i.rw,
            kelurahan=i.kelurahan,
            kecamatan=i.kecamatan,
            kabupaten=i.kabupaten,
            kodepos=i.kodepos,
            status_warga=i.status_warga,
            asal_kota=i.asal_kota,
            created_at=i.created_at,
        )
        for i in items
    ]


@router.post("/adddatakartukeluarga", response_model=KKOut)
async def add_data_kk(payload: KKCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await add_kk(
        db,
        no_kk=payload.no_kk,
        nik=payload.nik,
        nama_kepala_keluarga=payload.nama_kepala_keluarga,
        alamat=payload.alamat,
        rt=payload.rt,
        rw=payload.rw,
        kelurahan=payload.kelurahan,
        kecamatan=payload.kecamatan,
        kabupaten=payload.kabupaten,
        kodepos=payload.kodepos,
        status_warga=payload.status_warga,
        asal_kota=payload.asal_kota,
    )
    await notify_stats_changed()
    return KKOut(
        id=obj.id,
        no_kk=obj.no_kk,
        nik=obj.nik,
        nama_kepala_keluarga=obj.nama_kepala_keluarga,
        alamat=obj.alamat,
        rt=obj.rt,
        rw=obj.rw,
        kelurahan=obj.kelurahan,
        kecamatan=obj.kecamatan,
        kabupaten=obj.kabupaten,
        kodepos=obj.kodepos,
        status_warga=obj.status_warga,
        asal_kota=obj.asal_kota,
        created_at=obj.created_at,
    )


@router.put("/updatedatakartukeluarga", response_model=KKOut)
async def update_data_kk(payload: KKUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await update_kk(
        db,
        id=payload.id,
        no_kk=payload.no_kk,
        nik=payload.nik,
        nama_kepala_keluarga=payload.nama_kepala_keluarga,
        alamat=payload.alamat,
        rt=payload.rt,
        rw=payload.rw,
        kelurahan=payload.kelurahan,
        kecamatan=payload.kecamatan,
        kabupaten=payload.kabupaten,
        kodepos=payload.kodepos,
        status_warga=payload.status_warga,
        asal_kota=payload.asal_kota,
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data kartu keluarga tidak ditemukan")
    await notify_stats_changed()
    return KKOut(
        id=obj.id,
        no_kk=obj.no_kk,
        nik=obj.nik,
        nama_kepala_keluarga=obj.nama_kepala_keluarga,
        alamat=obj.alamat,
        rt=obj.rt,
        rw=obj.rw,
        kelurahan=obj.kelurahan,
        kecamatan=obj.kecamatan,
        kabupaten=obj.kabupaten,
        kodepos=obj.kodepos,
        status_warga=obj.status_warga,
        asal_kota=obj.asal_kota,
        created_at=obj.created_at,
    )


@router.delete("/deletedatakartukeluarga")
async def delete_data_kk(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    ok = await delete_kk(db, id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data kartu keluarga tidak ditemukan")
    await notify_stats_changed()
    return {"message": "Data kartu keluarga berhasil dihapus"}
