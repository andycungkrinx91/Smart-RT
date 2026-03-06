import asyncio
import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, get_db
from app.core.redis_client import get_redis
from app.core.security import hash_password
from app.deps import verify_api_key
from app.models import Base, User, UserRole
from app.routers import auth, blogs, iuran, kegiatan, kartukeluarga, keuangan, me, penduduk, stats, users, settings as settings_router


def _build_saas_origin_regex(domain: str) -> re.Pattern[str]:
    """Build a CORS origin regex that matches http(s)://<domain> and http(s)://*.<domain>."""
    escaped = re.escape(domain)
    pattern = rf"^https?://({escaped}|[a-zA-Z0-9-]+\.{escaped})(:\d{{1,5}})?$"
    return re.compile(pattern, re.IGNORECASE)


_SAAS_ORIGIN_REGEX: re.Pattern[str] = re.compile(
    os.getenv("SAAS_ORIGIN_REGEX", ""),
    re.IGNORECASE,
) if os.getenv("SAAS_ORIGIN_REGEX") else _build_saas_origin_regex(settings.SAAS_DOMAIN)
logger = logging.getLogger(__name__)


def _allowed_cors_origin(origin: str | None) -> str | None:
    if not origin:
        return None

    normalized_origin = origin.strip().rstrip("/")
    try:
        parsed = urlparse(normalized_origin)
    except ValueError:
        return None

    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None

    if parsed.hostname in {"localhost", "127.0.0.1"}:
        return normalized_origin

    if _SAAS_ORIGIN_REGEX.fullmatch(normalized_origin):
        return normalized_origin

    return None


def _apply_cors_headers(response: Response, origin: str) -> None:
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With"

    vary = response.headers.get("Vary")
    if not vary:
        response.headers["Vary"] = "Origin"
        return

    vary_values = {value.strip() for value in vary.split(",") if value.strip()}
    if "Origin" not in vary_values:
        response.headers["Vary"] = f"{vary}, Origin"


def _normalize_storage_mount(path: str) -> str:
    cleaned = path.strip()
    if not cleaned:
        return "/storage"
    return "/" + cleaned.strip("/")


def _ensure_storage_root() -> Path:
    root = Path(settings.IMAGE_STORAGE_ROOT).resolve()
    root.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(root, 0o777)
    except OSError:
        logger.warning(
            "[startup] Gagal mengatur izin direktori storage: %s. "
            "Pastikan proses memiliki hak akses yang cukup.",
            root,
        )
    return root


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _ensure_storage_root()
    except Exception:  # noqa: BLE001
        logger.critical(
            "[startup] Gagal menyiapkan direktori storage gambar.",
            exc_info=True,
        )

    # Tunggu DB siap (khususnya saat koneksi remote / jaringan lambat)
    last_exc: Exception | None = None
    for attempt in range(1, 6):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            last_exc = None
            break
        except Exception as e:  # noqa: BLE001
            last_exc = e
            logger.warning(
                "[startup] Gagal konek DB (percobaan %s/5): %s: %s",
                attempt,
                type(e).__name__,
                e,
            )
            await asyncio.sleep(min(2 * attempt, 8))
    if last_exc is not None:
        logger.critical(
            "[startup] Tidak dapat terhubung ke DB setelah 5 percobaan. "
            "Aplikasi tetap dijalankan untuk debugging konektivitas.",
            exc_info=last_exc,
        )

    try:
        from app.core.database import SessionLocal

        async with SessionLocal() as db:
            await _convert_enums_to_varchar(db)
            await _migrate_user_roles(db)
            await _migrate_penduduk_status(db)
            await _migrate_kartukeluarga_status(db)
            await _migrate_keuangan_jenis(db)
            await _migrate_iuran_status(db)
            await _migrate_kegiatan_status(db)
            await _ensure_default_admin(db)

            await _ensure_blog_columns(db)
            await _ensure_iuran_columns(db)
            if settings.SEED_DATA:
                await _seed_if_empty(db)
    except Exception:  # noqa: BLE001
        logger.critical(
            "[startup] Inisialisasi startup DB gagal. "
            "Aplikasi tetap dijalankan untuk debugging konektivitas.",
            exc_info=True,
        )

    yield


async def _ensure_default_admin(db: AsyncSession) -> None:
    res = await db.execute(select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL))
    existing = res.scalar_one_or_none()
    if existing is not None:
        return
    u = User(
        name=settings.DEFAULT_ADMIN_NAME,
        email=settings.DEFAULT_ADMIN_EMAIL,
        password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
        role=UserRole.ADMINISTRATOR,
        isLogin=False,
    )
    db.add(u)
    await db.commit()


async def _convert_enums_to_varchar(db: AsyncSession) -> None:
    """One-time migration: convert native ENUM columns to VARCHAR(32)."""
    from sqlalchemy import text

    dialect = db.bind.dialect.name if db.bind is not None else ""
    if dialect not in ("mysql", "mariadb"):
        return

    ddl_statements = (
        "ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL",
        "ALTER TABLE data_penduduk MODIFY COLUMN status VARCHAR(32) NOT NULL",
        "ALTER TABLE data_kartu_keluarga MODIFY COLUMN status_warga VARCHAR(32) NOT NULL",
        "ALTER TABLE keuangan_rt MODIFY COLUMN jenis VARCHAR(32) NOT NULL",
        "ALTER TABLE iuran_warga MODIFY COLUMN status_pembayaran VARCHAR(32) NOT NULL",
        "ALTER TABLE jadwal_kegiatan MODIFY COLUMN status VARCHAR(32) NOT NULL",
    )

    for ddl in ddl_statements:
        await db.execute(text(ddl))
    await db.commit()


async def _ensure_blog_columns(db: AsyncSession) -> None:
    # Tanpa Alembic: tambah kolom baru untuk page builder jika belum ada.
    # Target: MariaDB/MySQL + Postgres.
    from sqlalchemy import text

    dialect = db.bind.dialect.name if db.bind is not None else ""

    if dialect in ("mysql", "mariadb"):
        q = text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blogs' AND COLUMN_NAME = :col"
        )
        for col, ddl in (
            ("image_url", "ALTER TABLE blogs ADD COLUMN image_url VARCHAR(255) NULL"),
            ("content_html", "ALTER TABLE blogs ADD COLUMN content_html LONGTEXT NULL"),
            ("content_css", "ALTER TABLE blogs ADD COLUMN content_css LONGTEXT NULL"),
            ("content_json", "ALTER TABLE blogs ADD COLUMN content_json LONGTEXT NULL"),
        ):
            exists = await db.scalar(q, {"col": col})
            if not exists:
                await db.execute(text(ddl))
        await db.commit()
        return

    if dialect == "postgresql":
        q = text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='blogs' AND column_name=:col"
        )
        for col, ddl in (
            ("image_url", 'ALTER TABLE blogs ADD COLUMN image_url VARCHAR(255) NULL'),
            ("content_html", 'ALTER TABLE blogs ADD COLUMN content_html TEXT NULL'),
            ("content_css", 'ALTER TABLE blogs ADD COLUMN content_css TEXT NULL'),
            ("content_json", 'ALTER TABLE blogs ADD COLUMN content_json TEXT NULL'),
        ):
            exists = await db.scalar(q, {"col": col})
            if not exists:
                await db.execute(text(ddl))
        await db.commit()
        return


async def _ensure_iuran_columns(db: AsyncSession) -> None:
    from sqlalchemy import text

    dialect = db.bind.dialect.name if db.bind is not None else ""

    if dialect in ("mysql", "mariadb"):
        q_col = text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'iuran_warga' AND COLUMN_NAME = :col"
        )

        # 1. Add alamat if missing (legacy migration)
        if not await db.scalar(q_col, {"col": "alamat"}):
            await db.execute(text("ALTER TABLE iuran_warga ADD COLUMN alamat TEXT NULL"))

        # 2. Add no_kk column (nullable first to allow data migration) if missing
        if not await db.scalar(q_col, {"col": "no_kk"}):
            await db.execute(text("ALTER TABLE iuran_warga ADD COLUMN no_kk VARCHAR(16) NULL"))
            # Copy nik -> no_kk if old nik column still exists
            if await db.scalar(q_col, {"col": "nik"}):
                await db.execute(text("UPDATE iuran_warga SET no_kk = nik"))
            # Make no_kk NOT NULL and add FK if data_kartu_keluarga exists
            await db.execute(text(
                "ALTER TABLE iuran_warga MODIFY COLUMN no_kk VARCHAR(16) NOT NULL, "
                "ADD INDEX idx_iuran_warga_no_kk (no_kk)"
            ))

        # 3. Drop old nik column if it still exists
        if await db.scalar(q_col, {"col": "nik"}):
            await db.execute(text("ALTER TABLE iuran_warga DROP COLUMN nik"))

        # 4. Drop nama_warga column if it still exists
        if await db.scalar(q_col, {"col": "nama_warga"}):
            await db.execute(text("ALTER TABLE iuran_warga DROP COLUMN nama_warga"))

        await db.commit()
        return

    if dialect == "postgresql":
        q_col = text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='iuran_warga' AND column_name=:col"
        )

        # 1. Add alamat if missing (legacy migration)
        if not await db.scalar(q_col, {"col": "alamat"}):
            await db.execute(text("ALTER TABLE iuran_warga ADD COLUMN alamat TEXT NULL"))

        # 2. Add no_kk column if missing
        if not await db.scalar(q_col, {"col": "no_kk"}):
            await db.execute(text("ALTER TABLE iuran_warga ADD COLUMN no_kk VARCHAR(16) NULL"))
            # Copy nik -> no_kk if old nik column still exists
            if await db.scalar(q_col, {"col": "nik"}):
                await db.execute(text("UPDATE iuran_warga SET no_kk = nik"))
            await db.execute(text("ALTER TABLE iuran_warga ALTER COLUMN no_kk SET NOT NULL"))
            await db.execute(text("CREATE INDEX IF NOT EXISTS idx_iuran_warga_no_kk ON iuran_warga (no_kk)"))

        # 3. Drop old nik column if it still exists
        if await db.scalar(q_col, {"col": "nik"}):
            await db.execute(text("ALTER TABLE iuran_warga DROP COLUMN nik"))

        # 4. Drop nama_warga column if it still exists
        if await db.scalar(q_col, {"col": "nama_warga"}):
            await db.execute(text("ALTER TABLE iuran_warga DROP COLUMN nama_warga"))

        await db.commit()
        return


async def _migrate_kartukeluarga_status(db: AsyncSession) -> None:
    """One-time migration: rename legacy enum value 'Tetap' -> 'Permanen'.

    The old schema stored status_warga as 'Tetap', but the current
    KartuKeluargaStatus enum no longer includes that value.  Reading any
    such row causes a LookupError at the SQLAlchemy layer.  This function
    patches existing rows at startup before any ORM query is issued.
    It is safe to run repeatedly because it only touches rows that still
    carry the obsolete value.
    """
    from sqlalchemy import text

    logger.info("[startup] Memulai migrasi data_kartu_keluarga.status_warga.")

    # Normalize obsolete and case-mismatched values to canonical enum values.
    res1 = await db.execute(
        text(
            "UPDATE data_kartu_keluarga "
            "SET status_warga = 'Permanen' "
            "WHERE LOWER(TRIM(status_warga)) IN ('tetap', 'permanen')"
        )
    )
    res2 = await db.execute(
        text(
            "UPDATE data_kartu_keluarga "
            "SET status_warga = 'Pendatang' "
            "WHERE LOWER(TRIM(status_warga)) IN ('pendatang', 'kontrak')"
        )
    )
    res3 = await db.execute(
        text(
            "UPDATE data_kartu_keluarga "
            "SET status_warga = 'Nonaktif' "
            "WHERE LOWER(TRIM(status_warga)) = 'nonaktif'"
        )
    )
    rows_updated = (
        int(getattr(res1, "rowcount", 0) or 0)
        + int(getattr(res2, "rowcount", 0) or 0)
        + int(getattr(res3, "rowcount", 0) or 0)
    )
    if rows_updated:
        await db.commit()
        logger.info(
            "[startup] Migrasi status_warga: %s baris dinormalisasi ke nilai canonical.",
            rows_updated,
        )
    else:
        logger.debug("[startup] Tidak ada baris status_warga yang perlu dinormalisasi.")
    logger.info("[startup] Selesai migrasi data_kartu_keluarga.status_warga.")


async def _migrate_iuran_status(db: AsyncSession) -> None:
    """One-time migration: normalize status_pembayaran values in iuran_warga.

    Ensures values like 'LUNAS', 'Lunas', 'Belum Lunas' are converted to the
    canonical lowercase enum values 'lunas' and 'belum_lunas'.
    """
    from sqlalchemy import text

    logger.info("[startup] Memulai migrasi iuran_warga.status_pembayaran.")

    normalized_expr = (
        "LOWER(REPLACE(REPLACE(REPLACE(TRIM(status_pembayaran), ' ', ''), '_', ''), '-', ''))"
    )

    # 1. Normalize all 'lunas' variants (LUNAS, Lunas, lunas, etc.)
    res1 = await db.execute(
        text(
            "UPDATE iuran_warga "
            "SET status_pembayaran = 'lunas' "
            "WHERE status_pembayaran != 'lunas' "
            f"AND {normalized_expr} = 'lunas'"
        )
    )

    # 2. Normalize all 'belum_lunas' variants ('BELUM LUNAS', 'Belum-Lunas', etc.)
    res2 = await db.execute(
        text(
            "UPDATE iuran_warga "
            "SET status_pembayaran = 'belum_lunas' "
            "WHERE status_pembayaran != 'belum_lunas' "
            f"AND {normalized_expr} = 'belumlunas'"
        )
    )

    updated = int(getattr(res1, "rowcount", 0) or 0) + int(getattr(res2, "rowcount", 0) or 0)
    if updated:
        await db.commit()
        logger.info(
            "[startup] Migrasi status_pembayaran: %s baris dinormalisasi ke nilai canonical.",
            updated,
        )
    else:
        logger.debug("[startup] Tidak ada baris status_pembayaran yang perlu dinormalisasi.")
    logger.info("[startup] Selesai migrasi iuran_warga.status_pembayaran.")


async def _migrate_keuangan_jenis(db: AsyncSession) -> None:
    """One-time migration: normalize keuangan_rt.jenis values.

    Ensures variants like 'PENGELUARAN', 'Pengeluaran', 'PEMASUKAN', etc.
    are converted to canonical lowercase enum values.
    """
    from sqlalchemy import text

    logger.info("[startup] Memulai migrasi keuangan_rt.jenis.")

    normalized_expr = (
        "LOWER(REPLACE(REPLACE(REPLACE(TRIM(jenis), ' ', ''), '_', ''), '-', ''))"
    )

    res1 = await db.execute(
        text(
            "UPDATE keuangan_rt "
            "SET jenis = 'pemasukan' "
            "WHERE jenis != 'pemasukan' "
            f"AND {normalized_expr} = 'pemasukan'"
        )
    )

    res2 = await db.execute(
        text(
            "UPDATE keuangan_rt "
            "SET jenis = 'pengeluaran' "
            "WHERE jenis != 'pengeluaran' "
            f"AND {normalized_expr} = 'pengeluaran'"
        )
    )

    updated = int(getattr(res1, "rowcount", 0) or 0) + int(getattr(res2, "rowcount", 0) or 0)
    if updated:
        await db.commit()
        logger.info(
            "[startup] Migrasi keuangan_rt.jenis: %s baris dinormalisasi ke nilai canonical.",
            updated,
        )
    else:
        logger.debug("[startup] Tidak ada baris keuangan_rt.jenis yang perlu dinormalisasi.")
    logger.info("[startup] Selesai migrasi keuangan_rt.jenis.")


async def _migrate_kegiatan_status(db: AsyncSession) -> None:
    """One-time migration: normalize jadwal_kegiatan.status values.

    Ensures variants like 'DIBATALKAN', 'Terjadwal', 'BERLANGSUNG' are
    converted to canonical lowercase enum values.
    """
    from sqlalchemy import text

    logger.info("[startup] Memulai migrasi jadwal_kegiatan.status.")

    normalized_expr = (
        "LOWER(REPLACE(REPLACE(REPLACE(TRIM(status), ' ', ''), '_', ''), '-', ''))"
    )

    res1 = await db.execute(
        text(
            "UPDATE jadwal_kegiatan "
            "SET status = 'terjadwal' "
            "WHERE status != 'terjadwal' "
            f"AND {normalized_expr} = 'terjadwal'"
        )
    )
    res2 = await db.execute(
        text(
            "UPDATE jadwal_kegiatan "
            "SET status = 'berlangsung' "
            "WHERE status != 'berlangsung' "
            f"AND {normalized_expr} = 'berlangsung'"
        )
    )
    res3 = await db.execute(
        text(
            "UPDATE jadwal_kegiatan "
            "SET status = 'selesai' "
            "WHERE status != 'selesai' "
            f"AND {normalized_expr} = 'selesai'"
        )
    )
    res4 = await db.execute(
        text(
            "UPDATE jadwal_kegiatan "
            "SET status = 'dibatalkan' "
            "WHERE status != 'dibatalkan' "
            f"AND {normalized_expr} = 'dibatalkan'"
        )
    )

    updated = (
        int(getattr(res1, "rowcount", 0) or 0)
        + int(getattr(res2, "rowcount", 0) or 0)
        + int(getattr(res3, "rowcount", 0) or 0)
        + int(getattr(res4, "rowcount", 0) or 0)
    )
    if updated:
        await db.commit()
        logger.info(
            "[startup] Migrasi jadwal_kegiatan.status: %s baris dinormalisasi ke nilai canonical.",
            updated,
        )
    else:
        logger.debug("[startup] Tidak ada baris jadwal_kegiatan.status yang perlu dinormalisasi.")
    logger.info("[startup] Selesai migrasi jadwal_kegiatan.status.")


async def _migrate_penduduk_status(db: AsyncSession) -> None:
    """One-time migration: normalize data_penduduk.status to title case values."""
    from sqlalchemy import text

    logger.info("[startup] Memulai migrasi data_penduduk.status.")

    res1 = await db.execute(
        text(
            "UPDATE data_penduduk "
            "SET status = 'Aktif' "
            "WHERE status != 'Aktif' AND LOWER(TRIM(status)) = 'aktif'"
        )
    )
    res2 = await db.execute(
        text(
            "UPDATE data_penduduk "
            "SET status = 'Nonaktif' "
            "WHERE status != 'Nonaktif' AND LOWER(TRIM(status)) = 'nonaktif'"
        )
    )

    updated = int(getattr(res1, "rowcount", 0) or 0) + int(getattr(res2, "rowcount", 0) or 0)
    if updated:
        await db.commit()
        logger.info("[startup] Migrasi data_penduduk.status: %s baris dinormalisasi ke Title Case.", updated)
    else:
        logger.debug("[startup] Tidak ada baris data_penduduk.status yang perlu dinormalisasi.")
    logger.info("[startup] Selesai migrasi data_penduduk.status.")


async def _migrate_user_roles(db: AsyncSession) -> None:
    """One-time migration: normalize users.role values to enum title case."""
    from sqlalchemy import text

    logger.info("[startup] Memulai migrasi users.role.")

    res1 = await db.execute(
        text(
            "UPDATE users "
            "SET role = 'Administrator' "
            "WHERE role = 'ADMINISTRATOR'"
        )
    )
    res2 = await db.execute(
        text(
            "UPDATE users "
            "SET role = 'Management' "
            "WHERE role = 'MANAGEMENT'"
        )
    )

    updated = int(getattr(res1, "rowcount", 0) or 0) + int(getattr(res2, "rowcount", 0) or 0)
    if updated:
        await db.commit()
        logger.info("[startup] Migrasi users.role: %s baris diperbarui ke Title Case.", updated)
    else:
        logger.debug("[startup] Tidak ada baris users.role yang perlu dinormalisasi.")
    logger.info("[startup] Selesai migrasi users.role.")


async def _seed_if_empty(db: AsyncSession) -> None:
    # Seed idempotent: hanya jalan jika tabel masih kosong.
    from app.models import Blog, DataKartuKeluarga, DataPenduduk, KartuKeluargaStatus, PendudukStatus

    penduduk_count = await db.scalar(select(func.count()).select_from(DataPenduduk))
    kk_count = await db.scalar(select(func.count()).select_from(DataKartuKeluarga))
    blog_count = await db.scalar(select(func.count()).select_from(Blog))

    changed = False

    if (penduduk_count or 0) == 0:
        db.add_all(
            [
                DataPenduduk(
                    nik="3201010101010001",
                    nama_lengkap="Budi Santoso",
                    alamat="Jl. Melati No. 1, RT 001/RW 001",
                    pekerjaan="Karyawan",
                    status=PendudukStatus.AKTIF,
                ),
                DataPenduduk(
                    nik="3201010101010002",
                    nama_lengkap="Siti Aisyah",
                    alamat="Jl. Mawar No. 2, RT 001/RW 001",
                    pekerjaan="Wiraswasta",
                    status=PendudukStatus.AKTIF,
                ),
            ]
        )
        changed = True

    if (kk_count or 0) == 0:
        db.add_all(
            [
                DataKartuKeluarga(
                    no_kk="3201010101011001",
                    nik="3201010101010001",
                    nama_kepala_keluarga="Budi",
                    alamat="Jl. Melati No. 1",
                    rt="001",
                    rw="001",
                    kelurahan="Sukamaju",
                    kecamatan="Cimahi",
                    kabupaten="Bandung",
                    kodepos="40123",
                    status_warga=KartuKeluargaStatus.PERMANEN,
                    asal_kota="Bandung",
                )
            ]
        )
        changed = True

    if settings.SEED_SAMPLE_BLOG and (blog_count or 0) == 0:
        db.add(
            Blog(
                title="Selamat Datang di Smart-RT",
                content="Ini adalah contoh posting blog untuk memastikan aplikasi berjalan di database kosong.",
                image_url=None,
                created_by="System",
            )
        )
        changed = True

    if changed:
        await db.commit()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    dependencies=[Depends(verify_api_key)],
)

app.mount(
    _normalize_storage_mount(settings.IMAGE_PUBLIC_BASE),
    StaticFiles(directory=settings.IMAGE_STORAGE_ROOT, check_dir=False),
    name="storage",
)


@app.middleware("http")
async def attach_state(request: Request, call_next):
    allowed_origin = _allowed_cors_origin(request.headers.get("origin"))

    if request.method == "OPTIONS" and allowed_origin:
        response = Response(status_code=204)
    else:
        request.state.redis = get_redis()
        # Untuk dashboard login POST yang memanggil handler API.
        from app.core.database import SessionLocal

        request.state.db = SessionLocal()
        try:
            response = await call_next(request)
        finally:
            await request.state.db.close()

    if allowed_origin:
        _apply_cors_headers(response, allowed_origin)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(users.router)
app.include_router(blogs.router)
app.include_router(penduduk.router)
app.include_router(kartukeluarga.router)
app.include_router(keuangan.router)
app.include_router(iuran.router)
app.include_router(kegiatan.router)
app.include_router(stats.router)
app.include_router(settings_router.router)



@app.get("/")
async def root():
    """Root endpoint - returns API info"""
    return {
        "message": "Welcome to Smart RT API",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
