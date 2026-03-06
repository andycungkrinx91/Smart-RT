import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.crud import (
    count_blogs,
    count_eligible_kk,
    count_iuran_warga,
    count_iuran_warga_status_period,
    count_iuran_warga_status_year,
    count_jadwal_kegiatan,
    count_keuangan_rt,
    count_kk,
    count_penduduk,
    sum_iuran_warga_total_period,
    sum_iuran_warga_total_year,
    sum_iuran_warga_tunggakan,
    sum_iuran_warga_tunggakan_period,
    sum_iuran_warga_tunggakan_year,
    sum_keuangan_rt_pemasukan,
    sum_keuangan_rt_pemasukan_period,
    sum_keuangan_rt_pemasukan_year,
    sum_keuangan_rt_pengeluaran,
    sum_keuangan_rt_pengeluaran_period,
    sum_keuangan_rt_pengeluaran_year,
)
from app.deps import get_current_user
from app.models import IuranStatus

logger = logging.getLogger(__name__)

router = APIRouter(tags=["stats"])

_STATS_CHANNEL = "stats_updates"


async def notify_stats_changed() -> None:
    """Publish a lightweight notification on the stats_updates Redis channel.

    Called by any router that mutates penduduk / kartu-keluarga / blog /
    keuangan / iuran / jadwal data so
    that all connected EventSource clients receive an updated snapshot
    immediately instead of waiting for the next polling interval.

    Failures are silently swallowed – the polling fallback ensures clients
    always converge even without Redis.
    """
    if not settings.REDIS_ENABLED:
        return
    try:
        from redis.asyncio import Redis  # type: ignore[import-untyped]  # noqa: PLC0415

        client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        try:
            await client.publish(_STATS_CHANNEL, "changed")
        finally:
            await client.aclose()
    except Exception:  # noqa: BLE001
        logger.debug("notify_stats_changed: publish failed (Redis unavailable?)", exc_info=True)


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    now = datetime.now()
    month, year = now.month, now.year
    return {
        "penduduk": await count_penduduk(db),
        "kk": await count_kk(db),
        "blogs": await count_blogs(db),
        "keuangan_rt": await count_keuangan_rt(db),
        "iuran_warga": await count_iuran_warga(db),
        "jadwal_kegiatan": await count_jadwal_kegiatan(db),
        "total_pemasukan": await sum_keuangan_rt_pemasukan(db),
        "total_pengeluaran": await sum_keuangan_rt_pengeluaran(db),
        "total_tunggakan": await sum_iuran_warga_tunggakan(db),
        "pemasukan_bulan_ini": await sum_keuangan_rt_pemasukan_period(db, month, year),
        "pengeluaran_bulan_ini": await sum_keuangan_rt_pengeluaran_period(db, month, year),
        "tunggakan_bulan_ini": await sum_iuran_warga_tunggakan_period(db, month, year),
        "pemasukan_tahun_ini": await sum_keuangan_rt_pemasukan_year(db, year),
        "pengeluaran_tahun_ini": await sum_keuangan_rt_pengeluaran_year(db, year),
        "tunggakan_tahun_ini": await sum_iuran_warga_tunggakan_year(db, year),
        "iuran_lunas_bulan_ini": await count_iuran_warga_status_period(db, IuranStatus.LUNAS, month, year),
        "iuran_belum_lunas_bulan_ini": await count_iuran_warga_status_period(db, IuranStatus.BELUM_LUNAS, month, year),
        "iuran_total_bulan_ini": await sum_iuran_warga_total_period(db, month, year),
        "iuran_lunas_tahun_ini": await count_iuran_warga_status_year(db, IuranStatus.LUNAS, year),
        "iuran_belum_lunas_tahun_ini": await count_iuran_warga_status_year(db, IuranStatus.BELUM_LUNAS, year),
        "iuran_total_tahun_ini": await sum_iuran_warga_total_year(db, year),
    }


@router.get("/stats/stream")
async def stream_stats(request: Request, _=Depends(get_current_user)):
    """Server-Sent Events endpoint that streams live stats counts.

    The client receives an initial snapshot immediately on connection, then
    subsequent updates whenever a DataPenduduk, DataKartuKeluarga, Blog,
    KeuanganRT, IuranWarga, or JadwalKegiatan record is
    created/updated/deleted (triggered via Redis pub/sub on the
    ``stats_updates`` channel). Falls back to 30-second polling when Redis is
    unavailable.
    """

    async def _get_counts() -> str:
        async with SessionLocal() as db:
            now = datetime.now()
            month, year = now.month, now.year
            payload = {
                "penduduk": await count_penduduk(db),
                "kk": await count_kk(db),
                "blogs": await count_blogs(db),
                "keuangan_rt": await count_keuangan_rt(db),
                "iuran_warga": await count_iuran_warga(db),
                "jadwal_kegiatan": await count_jadwal_kegiatan(db),
                "total_pemasukan": await sum_keuangan_rt_pemasukan(db),
                "total_pengeluaran": await sum_keuangan_rt_pengeluaran(db),
                "total_tunggakan": await sum_iuran_warga_tunggakan(db),
                "pemasukan_bulan_ini": await sum_keuangan_rt_pemasukan_period(db, month, year),
                "pengeluaran_bulan_ini": await sum_keuangan_rt_pengeluaran_period(db, month, year),
                "tunggakan_bulan_ini": await sum_iuran_warga_tunggakan_period(db, month, year),
                "pemasukan_tahun_ini": await sum_keuangan_rt_pemasukan_year(db, year),
                "pengeluaran_tahun_ini": await sum_keuangan_rt_pengeluaran_year(db, year),
                "tunggakan_tahun_ini": await sum_iuran_warga_tunggakan_year(db, year),
                "iuran_lunas_bulan_ini": await count_iuran_warga_status_period(db, IuranStatus.LUNAS, month, year),
                "iuran_belum_lunas_bulan_ini": await count_iuran_warga_status_period(db, IuranStatus.BELUM_LUNAS, month, year),
                "iuran_total_bulan_ini": await sum_iuran_warga_total_period(db, month, year),
                "iuran_lunas_tahun_ini": await count_iuran_warga_status_year(db, IuranStatus.LUNAS, year),
                "iuran_belum_lunas_tahun_ini": await count_iuran_warga_status_year(db, IuranStatus.BELUM_LUNAS, year),
                "iuran_total_tahun_ini": await sum_iuran_warga_total_year(db, year),
            }
        return json.dumps(payload, separators=(",", ":"))

    async def _event_generator() -> AsyncGenerator[dict, None]:
        # --- Initial snapshot so the client gets data immediately on connect ---
        try:
            yield {"data": await _get_counts()}
        except Exception:  # noqa: BLE001
            logger.warning("stats/stream: failed to fetch initial counts", exc_info=True)

        # --- Attempt Redis pub/sub subscription ---
        pubsub = None
        redis_client = None
        try:
            if settings.REDIS_ENABLED:
                from redis.asyncio import Redis  # type: ignore[import-untyped]  # noqa: PLC0415

                redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
                pubsub = redis_client.pubsub()
                await pubsub.subscribe(_STATS_CHANNEL)
        except Exception:  # noqa: BLE001
            logger.debug("stats/stream: Redis pub/sub unavailable, falling back to polling")
            pubsub = None
            redis_client = None

        if pubsub is not None:
            # Redis pub/sub path: yield a new snapshot for every "message" type event.
            try:
                async for message in pubsub.listen():
                    if await request.is_disconnected():
                        break
                    if message.get("type") == "message":
                        try:
                            yield {"data": await _get_counts()}
                        except Exception:  # noqa: BLE001
                            logger.warning(
                                "stats/stream: failed to fetch counts after pub/sub message",
                                exc_info=True,
                            )
            finally:
                try:
                    await pubsub.unsubscribe(_STATS_CHANNEL)
                    await pubsub.aclose()
                except Exception:  # noqa: BLE001
                    pass
                if redis_client is not None:
                    try:
                        await redis_client.aclose()
                    except Exception:  # noqa: BLE001
                        pass
        else:
            # Polling fallback when Redis is unavailable (30-second interval).
            while True:
                if await request.is_disconnected():
                    break
                try:
                    await asyncio.sleep(30)
                except asyncio.CancelledError:
                    return
                if await request.is_disconnected():
                    break
                try:
                    yield {"data": await _get_counts()}
                except Exception:  # noqa: BLE001
                    logger.warning("stats/stream: failed to fetch counts during polling", exc_info=True)

    return EventSourceResponse(_event_generator())
