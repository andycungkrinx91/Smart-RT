from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import add_jadwal_kegiatan, delete_jadwal_kegiatan, list_jadwal_kegiatan, update_jadwal_kegiatan
from app.deps import get_current_user
from app.models import KegiatanStatus
from app.routers.stats import notify_stats_changed
from app.schemas import JadwalKegiatanCreate, JadwalKegiatanOut, JadwalKegiatanUpdate


router = APIRouter(tags=["jadwal_kegiatan"])


@router.get("/datajadwalkegiatan", response_model=list[JadwalKegiatanOut])
async def data_jadwal_kegiatan(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    items = await list_jadwal_kegiatan(db)
    return [
        JadwalKegiatanOut(
            id=i.id,
            nama_kegiatan=i.nama_kegiatan,
            tanggal_kegiatan=i.tanggal_kegiatan,
            lokasi=i.lokasi,
            penanggung_jawab=i.penanggung_jawab,
            keterangan=i.keterangan,
            status=KegiatanStatus(i.status),
            created_at=i.created_at,
        )
        for i in items
    ]


@router.post("/adddatajadwalkegiatan", response_model=JadwalKegiatanOut)
async def add_data_jadwal_kegiatan(payload: JadwalKegiatanCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await add_jadwal_kegiatan(
        db,
        nama_kegiatan=payload.nama_kegiatan,
        tanggal_kegiatan=payload.tanggal_kegiatan,
        lokasi=payload.lokasi,
        penanggung_jawab=payload.penanggung_jawab,
        keterangan=payload.keterangan,
        status=payload.status,
    )
    await notify_stats_changed()
    return JadwalKegiatanOut(
        id=obj.id,
        nama_kegiatan=obj.nama_kegiatan,
        tanggal_kegiatan=obj.tanggal_kegiatan,
        lokasi=obj.lokasi,
        penanggung_jawab=obj.penanggung_jawab,
        keterangan=obj.keterangan,
        status=KegiatanStatus(obj.status),
        created_at=obj.created_at,
    )


@router.put("/updatedatajadwalkegiatan", response_model=JadwalKegiatanOut)
async def update_data_jadwal_kegiatan(payload: JadwalKegiatanUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await update_jadwal_kegiatan(
        db,
        id=payload.id,
        nama_kegiatan=payload.nama_kegiatan,
        tanggal_kegiatan=payload.tanggal_kegiatan,
        lokasi=payload.lokasi,
        penanggung_jawab=payload.penanggung_jawab,
        keterangan=payload.keterangan,
        status=payload.status,
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data jadwal kegiatan tidak ditemukan")
    await notify_stats_changed()
    return JadwalKegiatanOut(
        id=obj.id,
        nama_kegiatan=obj.nama_kegiatan,
        tanggal_kegiatan=obj.tanggal_kegiatan,
        lokasi=obj.lokasi,
        penanggung_jawab=obj.penanggung_jawab,
        keterangan=obj.keterangan,
        status=KegiatanStatus(obj.status),
        created_at=obj.created_at,
    )


@router.delete("/deletedatajadwalkegiatan")
async def delete_data_jadwal_kegiatan(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    ok = await delete_jadwal_kegiatan(db, id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data jadwal kegiatan tidak ditemukan")
    await notify_stats_changed()
    return {"message": "Data jadwal kegiatan berhasil dihapus"}
