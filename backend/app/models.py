from __future__ import annotations

from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


class UserRole(str, PyEnum):
    ADMINISTRATOR = "Administrator"
    MANAGEMENT = "Management"


class User(Base):
    __tablename__ = "users"

    userid: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, native_enum=False, length=32, values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserRole.MANAGEMENT)
    isLogin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PendudukStatus(str, PyEnum):
    AKTIF = "Aktif"
    NONAKTIF = "Nonaktif"


class KartuKeluargaStatus(str, PyEnum):
    PERMANEN = "Permanen"
    PENDATANG = "Pendatang"
    NONAKTIF = "Nonaktif"


class DataPenduduk(Base):
    __tablename__ = "data_penduduk"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nik: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    nama_lengkap: Mapped[str] = mapped_column(String(32), nullable=False)
    alamat: Mapped[str] = mapped_column(Text, nullable=False)
    pekerjaan: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[PendudukStatus] = mapped_column(SAEnum(PendudukStatus, native_enum=False, length=32, values_callable=lambda x: [e.value for e in x]), nullable=False, default=PendudukStatus.AKTIF)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DataKartuKeluarga(Base):
    __tablename__ = "data_kartu_keluarga"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    no_kk: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    nik: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    nama_kepala_keluarga: Mapped[str] = mapped_column(String(16), nullable=False)
    alamat: Mapped[str] = mapped_column(Text, nullable=False)
    rt: Mapped[str] = mapped_column(String(3), nullable=False)
    rw: Mapped[str] = mapped_column(String(3), nullable=False)
    kelurahan: Mapped[str] = mapped_column(String(16), nullable=False)
    kecamatan: Mapped[str] = mapped_column(String(16), nullable=False)
    kabupaten: Mapped[str] = mapped_column(String(16), nullable=False)
    kodepos: Mapped[str] = mapped_column(String(6), nullable=False)
    status_warga: Mapped[KartuKeluargaStatus] = mapped_column(SAEnum(KartuKeluargaStatus, native_enum=False, length=32, values_callable=lambda x: [e.value for e in x]), nullable=False, default=KartuKeluargaStatus.PERMANEN)
    asal_kota: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Blog(Base):
    __tablename__ = "blogs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Backward compatible: content masih ada, tapi untuk editor baru gunakan content_html/css/json.
    content: Mapped[str] = mapped_column(LONGTEXT().with_variant(Text, "postgresql"), nullable=False)
    image_url: Mapped[str] = mapped_column(String(255), nullable=True)
    content_html: Mapped[str | None] = mapped_column(LONGTEXT().with_variant(Text, "postgresql"), nullable=True)
    content_css: Mapped[str | None] = mapped_column(LONGTEXT().with_variant(Text, "postgresql"), nullable=True)
    content_json: Mapped[str | None] = mapped_column(LONGTEXT().with_variant(Text, "postgresql"), nullable=True)
    created_by: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class KeuanganJenis(str, PyEnum):
    PEMASUKAN = "pemasukan"
    PENGELUARAN = "pengeluaran"


def _normalize_keuangan_jenis(value: str) -> KeuanganJenis:
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    normalized = "_".join(part for part in normalized.split("_") if part)
    return KeuanganJenis(normalized)


class NormalizedKeuanganJenisType(TypeDecorator):
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(String(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, KeuanganJenis):
            return value.value
        if isinstance(value, str):
            return _normalize_keuangan_jenis(value).value
        raise ValueError(f"Invalid keuangan jenis type: {type(value).__name__}")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, KeuanganJenis):
            return value
        return _normalize_keuangan_jenis(str(value))


class KeuanganRT(Base):
    __tablename__ = "keuangan_rt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tanggal: Mapped[date] = mapped_column(Date, nullable=False)
    jenis: Mapped[KeuanganJenis] = mapped_column(NormalizedKeuanganJenisType(), nullable=False)
    kategori: Mapped[str] = mapped_column(String(64), nullable=False)
    keterangan: Mapped[str | None] = mapped_column(Text, nullable=True)
    jumlah: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class IuranStatus(str, PyEnum):
    LUNAS = "lunas"
    BELUM_LUNAS = "belum_lunas"


def _normalize_iuran_status(value: str) -> IuranStatus:
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    normalized = "_".join(part for part in normalized.split("_") if part)
    if normalized == "belumlunas":
        normalized = "belum_lunas"
    return IuranStatus(normalized)


class NormalizedIuranStatusType(TypeDecorator):
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(String(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, IuranStatus):
            return value.value
        if isinstance(value, str):
            return _normalize_iuran_status(value).value
        raise ValueError(f"Invalid iuran status type: {type(value).__name__}")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, IuranStatus):
            return value
        return _normalize_iuran_status(str(value))


class IuranWarga(Base):
    __tablename__ = "iuran_warga"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    no_kk: Mapped[str] = mapped_column(String(16), ForeignKey("data_kartu_keluarga.no_kk"), index=True, nullable=False)
    bulan: Mapped[str] = mapped_column(String(7), nullable=False)
    jumlah: Mapped[int] = mapped_column(Integer, nullable=False)
    status_pembayaran: Mapped[IuranStatus] = mapped_column(NormalizedIuranStatusType(), nullable=False, default=IuranStatus.BELUM_LUNAS)
    tanggal_bayar: Mapped[date | None] = mapped_column(Date, nullable=True)
    metode_pembayaran: Mapped[str | None] = mapped_column(String(32), nullable=True)
    alamat: Mapped[str | None] = mapped_column(Text, nullable=True)
    keterangan: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    kartu_keluarga: Mapped["DataKartuKeluarga"] = relationship("DataKartuKeluarga")


class KegiatanStatus(str, PyEnum):
    TERJADWAL = "terjadwal"
    BERLANGSUNG = "berlangsung"
    SELESAI = "selesai"
    DIBATALKAN = "dibatalkan"


def _normalize_kegiatan_status(value: str) -> KegiatanStatus:
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    normalized = "_".join(part for part in normalized.split("_") if part)
    return KegiatanStatus(normalized)


class NormalizedKegiatanStatusType(TypeDecorator):
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(String(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, KegiatanStatus):
            return value.value
        if isinstance(value, str):
            return _normalize_kegiatan_status(value).value
        raise ValueError(f"Invalid kegiatan status type: {type(value).__name__}")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, KegiatanStatus):
            return value
        return _normalize_kegiatan_status(str(value))


class JadwalKegiatan(Base):
    __tablename__ = "jadwal_kegiatan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nama_kegiatan: Mapped[str] = mapped_column(String(128), nullable=False)
    tanggal_kegiatan: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    lokasi: Mapped[str] = mapped_column(String(128), nullable=False)
    penanggung_jawab: Mapped[str] = mapped_column(String(64), nullable=False)
    keterangan: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[KegiatanStatus] = mapped_column(NormalizedKegiatanStatusType(), nullable=False, default=KegiatanStatus.TERJADWAL)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    value: Mapped[str] = mapped_column(LONGTEXT().with_variant(Text, "postgresql"), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
