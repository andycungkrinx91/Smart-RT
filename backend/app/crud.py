import logging

from sqlalchemy import delete, extract, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import (
    Blog,
    DataKartuKeluarga,
    DataPenduduk,
    IuranStatus,
    IuranWarga,
    JadwalKegiatan,
    KeuanganJenis,
    KeuanganRT,
    PendudukStatus,
    Setting,
    User,
    UserRole,
)

logger = logging.getLogger(__name__)

_STATS_CHANNEL = "stats_updates"


async def publish_stats_update() -> None:
    """Publish a notification to the Redis stats_updates pub/sub channel.

    Imported lazily so the redis client singleton is always the live one.
    Errors are swallowed so a Redis outage never breaks a write operation.
    """
    try:
        from app.core.redis_client import get_redis  # noqa: PLC0415

        rds = get_redis()
        # Only real redis.asyncio clients expose `publish`.
        if hasattr(rds, "publish"):
            await rds.publish(_STATS_CHANNEL, "update")  # type: ignore[attr-defined]
        elif hasattr(rds, "_primary") and hasattr(rds._primary, "publish"):  # _ResilientRedis wrapper
            await rds._primary.publish(_STATS_CHANNEL, "update")  # type: ignore[attr-defined]
    except Exception:  # noqa: BLE001
        logger.debug("publish_stats_update: skipped (Redis unavailable or no publish support)")


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    res = await db.execute(select(User).where(User.email == email))
    return res.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, userid: int) -> User | None:
    res = await db.execute(select(User).where(User.userid == userid))
    return res.scalar_one_or_none()


async def list_users(db: AsyncSession) -> list[User]:
    res = await db.execute(select(User).order_by(User.userid.asc()))
    return list(res.scalars().all())


async def count_users(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(User)) or 0)


async def create_user(db: AsyncSession, *, name: str, email: str, password: str, role: UserRole) -> User:
    u = User(name=name, email=email, password_hash=hash_password(password), role=role, isLogin=False)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def update_user(
    db: AsyncSession,
    *,
    userid: int,
    name: str | None,
    email: str | None,
    password: str | None,
    role: UserRole | None,
) -> User | None:
    values: dict = {}
    if name is not None:
        values["name"] = name
    if email is not None:
        values["email"] = email
    if password is not None:
        values["password_hash"] = hash_password(password)
    if role is not None:
        values["role"] = role
    if not values:
        return await get_user_by_id(db, userid)

    await db.execute(update(User).where(User.userid == userid).values(**values))
    await db.commit()
    return await get_user_by_id(db, userid)


async def delete_user(db: AsyncSession, userid: int) -> bool:
    res = await db.execute(delete(User).where(User.userid == userid))
    await db.commit()
    return int(getattr(res, "rowcount", 0) or 0) > 0


async def set_user_login(db: AsyncSession, userid: int, is_login: bool) -> None:
    await db.execute(update(User).where(User.userid == userid).values(isLogin=is_login))
    await db.commit()


async def list_penduduk(
    db: AsyncSession,
    *,
    sort_by: str | None = None,
    order: str | None = None,
) -> list[DataPenduduk]:
    """Return all penduduk rows with optional dynamic sorting.

    *sort_by* must be one of the whitelisted column names; unknown values fall
    back to the default ``id`` sort.  *order* is ``"asc"`` or ``"desc"``
    (case-insensitive); anything else defaults to ``"desc"``.
    """
    _PENDUDUK_SORT_COLUMNS: dict[str, object] = {
        "id": DataPenduduk.id,
        "nik": DataPenduduk.nik,
        "nama_lengkap": DataPenduduk.nama_lengkap,
        "alamat": DataPenduduk.alamat,
        "pekerjaan": DataPenduduk.pekerjaan,
        "status": DataPenduduk.status,
        "created_at": DataPenduduk.created_at,
    }
    col = _PENDUDUK_SORT_COLUMNS.get(sort_by or "", DataPenduduk.id)
    order_clause = col.asc() if (order or "").lower() == "asc" else col.desc()  # type: ignore[union-attr]
    res = await db.execute(select(DataPenduduk).order_by(order_clause))
    return list(res.scalars().all())


async def list_penduduk_page(db: AsyncSession, *, limit: int, offset: int) -> list[DataPenduduk]:
    res = await db.execute(select(DataPenduduk).order_by(DataPenduduk.id.desc()).limit(limit).offset(offset))
    return list(res.scalars().all())


async def count_penduduk(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(DataPenduduk)) or 0)


async def add_penduduk(db: AsyncSession, *, nik: str, nama_lengkap: str, alamat: str, pekerjaan: str, status: PendudukStatus) -> DataPenduduk:
    p = DataPenduduk(nik=nik, nama_lengkap=nama_lengkap, alamat=alamat, pekerjaan=pekerjaan, status=status)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    await publish_stats_update()
    return p


async def update_penduduk(db: AsyncSession, *, id: int, **values) -> DataPenduduk | None:
    values = {k: v for k, v in values.items() if v is not None}
    if not values:
        res = await db.execute(select(DataPenduduk).where(DataPenduduk.id == id))
        return res.scalar_one_or_none()
    await db.execute(update(DataPenduduk).where(DataPenduduk.id == id).values(**values))
    await db.commit()
    await publish_stats_update()
    res = await db.execute(select(DataPenduduk).where(DataPenduduk.id == id))
    return res.scalar_one_or_none()


async def delete_penduduk(db: AsyncSession, id: int) -> bool:
    res = await db.execute(delete(DataPenduduk).where(DataPenduduk.id == id))
    await db.commit()
    ok = int(getattr(res, "rowcount", 0) or 0) > 0
    if ok:
        await publish_stats_update()
    return ok


async def list_kk(
    db: AsyncSession,
    *,
    sort_by: str | None = None,
    order: str | None = None,
) -> list[DataKartuKeluarga]:
    """Return all kartu keluarga rows with optional dynamic sorting.

    *sort_by* must be one of the whitelisted column names; unknown values fall
    back to the default ``id`` sort.  *order* is ``"asc"`` or ``"desc"``
    (case-insensitive); anything else defaults to ``"desc"``.
    """
    _KK_SORT_COLUMNS: dict[str, object] = {
        "id": DataKartuKeluarga.id,
        "no_kk": DataKartuKeluarga.no_kk,
        "nik": DataKartuKeluarga.nik,
        "nama_kepala_keluarga": DataKartuKeluarga.nama_kepala_keluarga,
        "alamat": DataKartuKeluarga.alamat,
        "rt": DataKartuKeluarga.rt,
        "rw": DataKartuKeluarga.rw,
        "kelurahan": DataKartuKeluarga.kelurahan,
        "kecamatan": DataKartuKeluarga.kecamatan,
        "kabupaten": DataKartuKeluarga.kabupaten,
        "kodepos": DataKartuKeluarga.kodepos,
        "status_warga": DataKartuKeluarga.status_warga,
        "asal_kota": DataKartuKeluarga.asal_kota,
        "created_at": DataKartuKeluarga.created_at,
    }
    col = _KK_SORT_COLUMNS.get(sort_by or "", DataKartuKeluarga.id)
    order_clause = col.asc() if (order or "").lower() == "asc" else col.desc()  # type: ignore[union-attr]
    res = await db.execute(select(DataKartuKeluarga).order_by(order_clause))
    return list(res.scalars().all())


async def list_kk_page(db: AsyncSession, *, limit: int, offset: int) -> list[DataKartuKeluarga]:
    res = await db.execute(select(DataKartuKeluarga).order_by(DataKartuKeluarga.id.desc()).limit(limit).offset(offset))
    return list(res.scalars().all())


async def count_kk(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(DataKartuKeluarga)) or 0)


async def add_kk(db: AsyncSession, **data) -> DataKartuKeluarga:
    kk = DataKartuKeluarga(**data)
    db.add(kk)
    await db.commit()
    await db.refresh(kk)
    await publish_stats_update()
    return kk


async def update_kk(db: AsyncSession, *, id: int, **values) -> DataKartuKeluarga | None:
    values = {k: v for k, v in values.items() if v is not None}
    if not values:
        res = await db.execute(select(DataKartuKeluarga).where(DataKartuKeluarga.id == id))
        return res.scalar_one_or_none()
    await db.execute(update(DataKartuKeluarga).where(DataKartuKeluarga.id == id).values(**values))
    await db.commit()
    await publish_stats_update()
    res = await db.execute(select(DataKartuKeluarga).where(DataKartuKeluarga.id == id))
    return res.scalar_one_or_none()


async def delete_kk(db: AsyncSession, id: int) -> bool:
    res = await db.execute(delete(DataKartuKeluarga).where(DataKartuKeluarga.id == id))
    await db.commit()
    ok = int(getattr(res, "rowcount", 0) or 0) > 0
    if ok:
        await publish_stats_update()
    return ok


async def list_blogs(db: AsyncSession) -> list[Blog]:
    res = await db.execute(select(Blog).order_by(Blog.id.desc()))
    return list(res.scalars().all())


async def get_blog(db: AsyncSession, blog_id: int) -> Blog | None:
    res = await db.execute(select(Blog).where(Blog.id == blog_id))
    return res.scalar_one_or_none()


async def list_blogs_meta(db: AsyncSession, *, limit: int, offset: int) -> list[tuple[int, str, str, object]]:
    res = await db.execute(
        select(Blog.id, Blog.title, Blog.created_by, Blog.created_at).order_by(Blog.id.desc()).limit(limit).offset(offset)
    )
    return [tuple(r) for r in res.all()]


async def count_blogs(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(Blog)) or 0)


async def add_blog(
    db: AsyncSession,
    *,
    title: str,
    content_html: str,
    content_css: str | None,
    content_json: str | None,
    image_url: str | None,
    created_by: str,
) -> Blog:
    b = Blog(
        title=title,
        content=content_html,
        content_html=content_html,
        content_css=content_css,
        content_json=content_json,
        image_url=image_url,
        created_by=created_by,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    await publish_stats_update()
    return b


async def update_blog(db: AsyncSession, *, id: int, **values) -> Blog | None:
    values = {k: v for k, v in values.items() if v is not None}
    if not values:
        res = await db.execute(select(Blog).where(Blog.id == id))
        return res.scalar_one_or_none()
    # Jika update HTML, juga sync ke kolom legacy content
    if "content_html" in values and "content" not in values:
        values["content"] = values["content_html"]
    await db.execute(update(Blog).where(Blog.id == id).values(**values))
    await db.commit()
    await publish_stats_update()
    res = await db.execute(select(Blog).where(Blog.id == id))
    return res.scalar_one_or_none()


async def delete_blog(db: AsyncSession, id: int) -> bool:
    res = await db.execute(delete(Blog).where(Blog.id == id))
    await db.commit()
    ok = int(getattr(res, "rowcount", 0) or 0) > 0
    if ok:
        await publish_stats_update()
    return ok


async def list_keuangan_rt(
    db: AsyncSession,
    *,
    month: int | None = None,
    year: int | None = None,
    sort_by: str | None = None,
    order: str | None = None,
) -> list[KeuanganRT]:
    """Return keuangan RT rows, optionally filtered by year and/or month.

    ``tanggal`` is a ``Date`` column.  When only *year* is supplied every
    transaction in that year is returned.  When both *year* and *month* are
    supplied only transactions in that specific month are returned.  A *month*
    without a *year* is ignored.

    *sort_by* must be one of the whitelisted column names; unknown values fall
    back to the default ``id`` sort.  *order* is ``"asc"`` or ``"desc"``
    (case-insensitive); anything else defaults to ``"desc"``.
    """
    _KEUANGAN_SORT_COLUMNS: dict[str, object] = {
        "id": KeuanganRT.id,
        "tanggal": KeuanganRT.tanggal,
        "jenis": KeuanganRT.jenis,
        "kategori": KeuanganRT.kategori,
        "jumlah": KeuanganRT.jumlah,
        "created_at": KeuanganRT.created_at,
    }
    stmt = select(KeuanganRT)
    if year is not None:
        stmt = stmt.where(extract("year", KeuanganRT.tanggal) == year)
        if month is not None:
            stmt = stmt.where(extract("month", KeuanganRT.tanggal) == month)
    col = _KEUANGAN_SORT_COLUMNS.get(sort_by or "", KeuanganRT.id)
    order_clause = col.asc() if (order or "").lower() == "asc" else col.desc()  # type: ignore[union-attr]
    stmt = stmt.order_by(order_clause)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def count_keuangan_rt(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(KeuanganRT)) or 0)


async def sum_keuangan_rt_pemasukan(db: AsyncSession) -> int:
    return int(
        await db.scalar(
            select(func.sum(KeuanganRT.jumlah)).where(KeuanganRT.jenis == KeuanganJenis.PEMASUKAN)
        )
        or 0
    )


async def sum_keuangan_rt_pengeluaran(db: AsyncSession) -> int:
    return int(
        await db.scalar(
            select(func.sum(KeuanganRT.jumlah)).where(KeuanganRT.jenis == KeuanganJenis.PENGELUARAN)
        )
        or 0
    )


async def sum_keuangan_rt_pemasukan_period(db: AsyncSession, month: int, year: int) -> int:
    """Sum pemasukan for a specific month and year."""
    return int(
        await db.scalar(
            select(func.sum(KeuanganRT.jumlah))
            .where(KeuanganRT.jenis == KeuanganJenis.PEMASUKAN)
            .where(extract("year", KeuanganRT.tanggal) == year)
            .where(extract("month", KeuanganRT.tanggal) == month)
        )
        or 0
    )


async def sum_keuangan_rt_pengeluaran_period(db: AsyncSession, month: int, year: int) -> int:
    """Sum pengeluaran for a specific month and year."""
    return int(
        await db.scalar(
            select(func.sum(KeuanganRT.jumlah))
            .where(KeuanganRT.jenis == KeuanganJenis.PENGELUARAN)
            .where(extract("year", KeuanganRT.tanggal) == year)
            .where(extract("month", KeuanganRT.tanggal) == month)
        )
        or 0
    )


async def sum_keuangan_rt_pemasukan_year(db: AsyncSession, year: int) -> int:
    """Sum pemasukan for a specific year."""
    return int(
        await db.scalar(
            select(func.sum(KeuanganRT.jumlah))
            .where(KeuanganRT.jenis == KeuanganJenis.PEMASUKAN)
            .where(extract("year", KeuanganRT.tanggal) == year)
        )
        or 0
    )


async def sum_keuangan_rt_pengeluaran_year(db: AsyncSession, year: int) -> int:
    """Sum pengeluaran for a specific year."""
    return int(
        await db.scalar(
            select(func.sum(KeuanganRT.jumlah))
            .where(KeuanganRT.jenis == KeuanganJenis.PENGELUARAN)
            .where(extract("year", KeuanganRT.tanggal) == year)
        )
        or 0
    )


async def sum_iuran_warga_tunggakan_period(db: AsyncSession, month: int, year: int) -> int:
    """Sum tunggakan (belum lunas) iuran warga for a specific month and year."""
    bulan_value = f"{year:04d}-{month:02d}"
    return int(
        await db.scalar(
            select(func.sum(IuranWarga.jumlah))
            .where(IuranWarga.status_pembayaran == IuranStatus.BELUM_LUNAS)
            .where(IuranWarga.bulan == bulan_value)
        )
        or 0
    )


async def sum_iuran_warga_tunggakan_year(db: AsyncSession, year: int) -> int:
    """Sum tunggakan (belum lunas) iuran warga for a specific year."""
    return int(
        await db.scalar(
            select(func.sum(IuranWarga.jumlah))
            .where(IuranWarga.status_pembayaran == IuranStatus.BELUM_LUNAS)
            .where(IuranWarga.bulan.like(f"{year:04d}-%"))
        )
        or 0
    )


_ELIGIBLE_STATUSES = ("Permanen", "Pendatang")


async def count_eligible_kk(db: AsyncSession) -> int:
    """Return the total number of KKs with status 'Permanen' or 'Pendatang'.

    These are the households obligated to pay iuran each month.
    """
    return int(
        await db.scalar(
            select(func.count())
            .select_from(DataKartuKeluarga)
            .where(DataKartuKeluarga.status_warga.in_(_ELIGIBLE_STATUSES))
        )
        or 0
    )


async def count_iuran_warga_status_period(db: AsyncSession, status: IuranStatus, month: int, year: int) -> int:
    """Count unique no_kk (eligible KKs only) by payment status for a specific month and year.

    'Lunas' = distinct no_kk that have a lunas record for the given period AND
    whose KK status_warga is 'Permanen' or 'Pendatang'.

    'Belum Lunas' = Total eligible KKs − Lunas KKs for that period (i.e. KKs
    that either have an explicit belum_lunas record or have no record at all for
    the period).
    """
    bulan_value = f"{year:04d}-{month:02d}"

    if status == IuranStatus.LUNAS:
        return int(
            await db.scalar(
                select(func.count(func.distinct(IuranWarga.no_kk)))
                .select_from(IuranWarga)
                .join(DataKartuKeluarga, IuranWarga.no_kk == DataKartuKeluarga.no_kk)
                .where(DataKartuKeluarga.status_warga.in_(_ELIGIBLE_STATUSES))
                .where(IuranWarga.status_pembayaran == IuranStatus.LUNAS)
                .where(IuranWarga.bulan == bulan_value)
            )
            or 0
        )
    else:
        # BELUM_LUNAS = Total eligible KKs − KKs that are lunas for this period
        total = await count_eligible_kk(db)
        lunas = await count_iuran_warga_status_period(db, IuranStatus.LUNAS, month, year)
        return max(0, total - lunas)


async def count_iuran_warga_status_year(db: AsyncSession, status: IuranStatus, year: int) -> int:
    """Count unique no_kk (eligible KKs only) by payment status for a specific year.

    'Lunas' = distinct no_kk that have paid for ALL months in the year up to
    the current month.

    'Belum Lunas' = Total eligible KKs − Lunas KKs for that year (i.e. KKs
    that have at least one unpaid month this year).
    """
    from datetime import datetime
    now = datetime.now()
    current_month = now.month if now.year == year else 12
    if now.year < year:
        current_month = 0

    if status == IuranStatus.LUNAS:
        if current_month == 0:
            return 0
            
        # Subquery to count months paid per KK
        subq = (
            select(IuranWarga.no_kk)
            .join(DataKartuKeluarga, IuranWarga.no_kk == DataKartuKeluarga.no_kk)
            .where(DataKartuKeluarga.status_warga.in_(_ELIGIBLE_STATUSES))
            .where(IuranWarga.status_pembayaran == IuranStatus.LUNAS)
            .where(IuranWarga.bulan.like(f"{year:04d}-%"))
            .group_by(IuranWarga.no_kk)
            .having(func.count(func.distinct(IuranWarga.bulan)) >= current_month)
        ).subquery()
        
        return int(await db.scalar(select(func.count()).select_from(subq)) or 0)
    else:
        total = await count_eligible_kk(db)
        lunas = await count_iuran_warga_status_year(db, IuranStatus.LUNAS, year)
        return max(0, total - lunas)


async def sum_iuran_warga_total_period(db: AsyncSession, month: int, year: int) -> int:
    """Sum all iuran warga jumlah for a specific month and year."""
    bulan_value = f"{year:04d}-{month:02d}"
    return int(
        await db.scalar(
            select(func.sum(IuranWarga.jumlah))
            .where(IuranWarga.bulan == bulan_value)
        )
        or 0
    )


async def sum_iuran_warga_total_year(db: AsyncSession, year: int) -> int:
    """Sum all iuran warga jumlah for a specific year."""
    return int(
        await db.scalar(
            select(func.sum(IuranWarga.jumlah))
            .where(IuranWarga.bulan.like(f"{year:04d}-%"))
        )
        or 0
    )


async def add_keuangan_rt(db: AsyncSession, **data) -> KeuanganRT:
    item = KeuanganRT(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await publish_stats_update()
    return item


async def update_keuangan_rt(db: AsyncSession, *, id: int, **values) -> KeuanganRT | None:
    values = {k: v for k, v in values.items() if v is not None}
    if not values:
        res = await db.execute(select(KeuanganRT).where(KeuanganRT.id == id))
        return res.scalar_one_or_none()
    await db.execute(update(KeuanganRT).where(KeuanganRT.id == id).values(**values))
    await db.commit()
    await publish_stats_update()
    res = await db.execute(select(KeuanganRT).where(KeuanganRT.id == id))
    return res.scalar_one_or_none()


async def delete_keuangan_rt(db: AsyncSession, id: int) -> bool:
    res = await db.execute(delete(KeuanganRT).where(KeuanganRT.id == id))
    await db.commit()
    ok = int(getattr(res, "rowcount", 0) or 0) > 0
    if ok:
        await publish_stats_update()
    return ok


async def list_iuran_warga(
    db: AsyncSession,
    *,
    month: int | None = None,
    year: int | None = None,
    sort_by: str | None = None,
    order: str | None = None,
) -> list[tuple[IuranWarga, str]]:
    """Return iuran warga rows, optionally filtered by year and/or month.

    ``bulan`` is stored as ``YYYY-MM``.  Filtering uses ``extract`` on the
    parsed date components for robustness:
    - *year* only → every record whose ``bulan`` year matches.
    - *year* + *month* → exact ``YYYY-MM`` match via both extracts.
    - *month* without *year* → ignored.

    *sort_by* must be one of the whitelisted column names; unknown values fall
    back to the default ``id`` sort.  *order* is ``"asc"`` or ``"desc"``
    (case-insensitive); anything else defaults to ``"desc"``.
    """
    _IURAN_SORT_COLUMNS: dict[str, object] = {
        "id": IuranWarga.id,
        "no_kk": IuranWarga.no_kk,
        "bulan": IuranWarga.bulan,
        "jumlah": IuranWarga.jumlah,
        "status_pembayaran": IuranWarga.status_pembayaran,
        "tanggal_bayar": IuranWarga.tanggal_bayar,
        "metode_pembayaran": IuranWarga.metode_pembayaran,
        "created_at": IuranWarga.created_at,
    }
    stmt = (
        select(IuranWarga, DataKartuKeluarga.nama_kepala_keluarga)
        .join(DataKartuKeluarga, IuranWarga.no_kk == DataKartuKeluarga.no_kk)
    )
    if year is not None and month is not None:
        # Robust exact YYYY-MM match using string comparison
        bulan_value = f"{year:04d}-{month:02d}"
        stmt = stmt.where(IuranWarga.bulan == bulan_value)
    elif year is not None:
        # Match any record whose bulan starts with the given year
        stmt = stmt.where(IuranWarga.bulan.like(f"{year:04d}-%"))
    col = _IURAN_SORT_COLUMNS.get(sort_by or "", IuranWarga.id)
    order_clause = col.asc() if (order or "").lower() == "asc" else col.desc()  # type: ignore[union-attr]
    stmt = stmt.order_by(order_clause)
    res = await db.execute(stmt)
    return [(row[0], row[1]) for row in res.all()]


async def count_iuran_warga(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(IuranWarga)) or 0)


async def sum_iuran_warga_tunggakan(db: AsyncSession) -> int:
    return int(
        await db.scalar(
            select(func.sum(IuranWarga.jumlah)).where(IuranWarga.status_pembayaran == IuranStatus.BELUM_LUNAS)
        )
        or 0
    )


async def add_iuran_warga(db: AsyncSession, **data) -> IuranWarga:
    item = IuranWarga(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await publish_stats_update()
    return item


async def update_iuran_warga(db: AsyncSession, *, id: int, **values) -> IuranWarga | None:
    values = {k: v for k, v in values.items() if v is not None}
    if not values:
        res = await db.execute(select(IuranWarga).where(IuranWarga.id == id))
        return res.scalar_one_or_none()
    await db.execute(update(IuranWarga).where(IuranWarga.id == id).values(**values))
    await db.commit()
    await publish_stats_update()
    res = await db.execute(select(IuranWarga).where(IuranWarga.id == id))
    return res.scalar_one_or_none()


async def delete_iuran_warga(db: AsyncSession, id: int) -> bool:
    res = await db.execute(delete(IuranWarga).where(IuranWarga.id == id))
    await db.commit()
    ok = int(getattr(res, "rowcount", 0) or 0) > 0
    if ok:
        await publish_stats_update()
    return ok


async def list_jadwal_kegiatan(db: AsyncSession) -> list[JadwalKegiatan]:
    res = await db.execute(select(JadwalKegiatan).order_by(JadwalKegiatan.id.desc()))
    return list(res.scalars().all())


async def count_jadwal_kegiatan(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count()).select_from(JadwalKegiatan)) or 0)


async def add_jadwal_kegiatan(db: AsyncSession, **data) -> JadwalKegiatan:
    item = JadwalKegiatan(**data)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await publish_stats_update()
    return item


async def update_jadwal_kegiatan(db: AsyncSession, *, id: int, **values) -> JadwalKegiatan | None:
    values = {k: v for k, v in values.items() if v is not None}
    if not values:
        res = await db.execute(select(JadwalKegiatan).where(JadwalKegiatan.id == id))
        return res.scalar_one_or_none()
    await db.execute(update(JadwalKegiatan).where(JadwalKegiatan.id == id).values(**values))
    await db.commit()
    await publish_stats_update()
    res = await db.execute(select(JadwalKegiatan).where(JadwalKegiatan.id == id))
    return res.scalar_one_or_none()


async def delete_jadwal_kegiatan(db: AsyncSession, id: int) -> bool:
    res = await db.execute(delete(JadwalKegiatan).where(JadwalKegiatan.id == id))
    await db.commit()
    ok = int(getattr(res, "rowcount", 0) or 0) > 0
    if ok:
        await publish_stats_update()
    return ok


async def get_setting(db: AsyncSession, key: str) -> Setting | None:
    res = await db.execute(select(Setting).where(Setting.key == key))
    return res.scalar_one_or_none()


async def update_setting(db: AsyncSession, key: str, value: str, description: str | None = None) -> Setting:
    obj = await get_setting(db, key)
    if obj:
        obj.value = value
        if description is not None:
            obj.description = description
    else:
        obj = Setting(key=key, value=value, description=description)
        db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
