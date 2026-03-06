from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.database import SessionLocal


async def _run() -> None:
    normalized_iuran = (
        "LOWER(REPLACE(REPLACE(REPLACE(TRIM(status_pembayaran), ' ', ''), '_', ''), '-', ''))"
    )
    normalized_jenis = "LOWER(REPLACE(REPLACE(REPLACE(TRIM(jenis), ' ', ''), '_', ''), '-', ''))"
    normalized_jadwal = (
        "LOWER(REPLACE(REPLACE(REPLACE(TRIM(status), ' ', ''), '_', ''), '-', ''))"
    )

    updates = [
        (
            "users.role -> Administrator",
            "UPDATE users SET role = 'Administrator' "
            "WHERE LOWER(TRIM(role)) IN ('administrator', 'admin') "
            "AND role != 'Administrator'",
        ),
        (
            "users.role -> Management",
            "UPDATE users SET role = 'Management' "
            "WHERE LOWER(TRIM(role)) IN ('management', 'pengurus') "
            "AND role != 'Management'",
        ),
        (
            "data_penduduk.status -> Aktif",
            "UPDATE data_penduduk SET status = 'Aktif' "
            "WHERE LOWER(TRIM(status)) = 'aktif' "
            "AND status != 'Aktif'",
        ),
        (
            "data_penduduk.status -> Nonaktif",
            "UPDATE data_penduduk SET status = 'Nonaktif' "
            "WHERE LOWER(TRIM(status)) = 'nonaktif' "
            "AND status != 'Nonaktif'",
        ),
        (
            "data_kartu_keluarga.status_warga -> Permanen",
            "UPDATE data_kartu_keluarga SET status_warga = 'Permanen' "
            "WHERE LOWER(TRIM(status_warga)) IN ('tetap', 'permanen') "
            "AND status_warga != 'Permanen'",
        ),
        (
            "data_kartu_keluarga.status_warga -> Pendatang",
            "UPDATE data_kartu_keluarga SET status_warga = 'Pendatang' "
            "WHERE LOWER(TRIM(status_warga)) IN ('pendatang', 'kontrak') "
            "AND status_warga != 'Pendatang'",
        ),
        (
            "data_kartu_keluarga.status_warga -> Nonaktif",
            "UPDATE data_kartu_keluarga SET status_warga = 'Nonaktif' "
            "WHERE LOWER(TRIM(status_warga)) = 'nonaktif' "
            "AND status_warga != 'Nonaktif'",
        ),
        (
            "keuangan_rt.jenis -> pemasukan",
            "UPDATE keuangan_rt SET jenis = 'pemasukan' "
            "WHERE jenis != 'pemasukan' "
            f"AND {normalized_jenis} = 'pemasukan'",
        ),
        (
            "keuangan_rt.jenis -> pengeluaran",
            "UPDATE keuangan_rt SET jenis = 'pengeluaran' "
            "WHERE jenis != 'pengeluaran' "
            f"AND {normalized_jenis} = 'pengeluaran'",
        ),
        (
            "iuran_warga.status_pembayaran -> lunas",
            "UPDATE iuran_warga SET status_pembayaran = 'lunas' "
            "WHERE status_pembayaran != 'lunas' "
            f"AND {normalized_iuran} = 'lunas'",
        ),
        (
            "iuran_warga.status_pembayaran -> belum_lunas",
            "UPDATE iuran_warga SET status_pembayaran = 'belum_lunas' "
            "WHERE status_pembayaran != 'belum_lunas' "
            f"AND {normalized_iuran} = 'belumlunas'",
        ),
        (
            "jadwal_kegiatan.status -> terjadwal",
            "UPDATE jadwal_kegiatan SET status = 'terjadwal' "
            "WHERE status != 'terjadwal' "
            f"AND {normalized_jadwal} = 'terjadwal'",
        ),
        (
            "jadwal_kegiatan.status -> berlangsung",
            "UPDATE jadwal_kegiatan SET status = 'berlangsung' "
            "WHERE status != 'berlangsung' "
            f"AND {normalized_jadwal} = 'berlangsung'",
        ),
        (
            "jadwal_kegiatan.status -> selesai",
            "UPDATE jadwal_kegiatan SET status = 'selesai' "
            "WHERE status != 'selesai' "
            f"AND {normalized_jadwal} = 'selesai'",
        ),
        (
            "jadwal_kegiatan.status -> dibatalkan",
            "UPDATE jadwal_kegiatan SET status = 'dibatalkan' "
            "WHERE status != 'dibatalkan' "
            f"AND {normalized_jadwal} = 'dibatalkan'",
        ),
    ]

    async with SessionLocal() as db:
        total = 0
        for label, sql in updates:
            res = await db.execute(text(sql))
            count = int(getattr(res, "rowcount", 0) or 0)
            total += count
            if count:
                print(f"[normalize-enum] {label}: {count} row(s) updated")

        await db.commit()
        print(f"[normalize-enum] done, total updated: {total} row(s)")


if __name__ == "__main__":
    asyncio.run(_run())
