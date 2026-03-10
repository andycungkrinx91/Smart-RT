from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models import IuranStatus, KegiatanStatus, KeuanganJenis, PendudukStatus, UserRole


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    email: str = Field(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.MANAGEMENT


class UserUpdate(BaseModel):
    userid: int
    name: str | None = Field(default=None, min_length=1, max_length=64)
    email: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None


class MeUpdate(BaseModel):
    """Self-service profile update — name and/or password only; role cannot be changed."""

    name: str | None = Field(default=None, min_length=1, max_length=64)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserOut(BaseModel):
    userid: int
    name: str
    email: str = Field(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    role: UserRole
    isLogin: bool
    created_at: datetime


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PendudukCreate(BaseModel):
    nik: str = Field(min_length=16, max_length=16, pattern=r"^\d{16}$")
    nama_lengkap: str = Field(min_length=1, max_length=32)
    alamat: str = Field(min_length=1, max_length=2000)
    pekerjaan: str = Field(min_length=1, max_length=32)
    status: PendudukStatus = PendudukStatus.AKTIF


class PendudukUpdate(BaseModel):
    id: int
    nik: str | None = Field(default=None, min_length=16, max_length=16, pattern=r"^\d{16}$")
    nama_lengkap: str | None = Field(default=None, min_length=1, max_length=32)
    alamat: str | None = Field(default=None, min_length=1, max_length=2000)
    pekerjaan: str | None = Field(default=None, min_length=1, max_length=32)
    status: PendudukStatus | None = None


class PendudukOut(BaseModel):
    id: int
    nik: str
    nama_lengkap: str
    alamat: str
    pekerjaan: str
    status: PendudukStatus
    created_at: datetime


class KKCreate(BaseModel):
    no_kk: str = Field(min_length=16, max_length=16, pattern=r"^\d{16}$")
    nik: str = Field(min_length=16, max_length=16, pattern=r"^\d{16}$")
    nama_kepala_keluarga: str = Field(min_length=1, max_length=64)
    alamat: str = Field(min_length=1, max_length=2000)
    rt: str = Field(min_length=1, max_length=3, pattern=r"^\d{1,3}$")
    rw: str = Field(min_length=1, max_length=3, pattern=r"^\d{1,3}$")
    kelurahan: str = Field(min_length=1, max_length=64)
    kecamatan: str = Field(min_length=1, max_length=64)
    kabupaten: str = Field(min_length=1, max_length=64)
    kodepos: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    status_warga: str = Field(min_length=1, max_length=16)
    asal_kota: str = Field(min_length=1, max_length=64)


class KKUpdate(BaseModel):
    id: int
    no_kk: str | None = Field(default=None, min_length=16, max_length=16, pattern=r"^\d{16}$")
    nik: str | None = Field(default=None, min_length=16, max_length=16, pattern=r"^\d{16}$")
    nama_kepala_keluarga: str | None = Field(default=None, min_length=1, max_length=64)
    alamat: str | None = Field(default=None, min_length=1, max_length=2000)
    rt: str | None = Field(default=None, min_length=1, max_length=3, pattern=r"^\d{1,3}$")
    rw: str | None = Field(default=None, min_length=1, max_length=3, pattern=r"^\d{1,3}$")
    kelurahan: str | None = Field(default=None, min_length=1, max_length=64)
    kecamatan: str | None = Field(default=None, min_length=1, max_length=64)
    kabupaten: str | None = Field(default=None, min_length=1, max_length=64)
    kodepos: str | None = Field(default=None, min_length=6, max_length=6, pattern=r"^\d{6}$")
    status_warga: str | None = Field(default=None, min_length=1, max_length=16)
    asal_kota: str | None = Field(default=None, min_length=1, max_length=64)


class KKOut(BaseModel):
    id: int
    no_kk: str
    nik: str
    nama_kepala_keluarga: str
    alamat: str
    rt: str
    rw: str
    kelurahan: str
    kecamatan: str
    kabupaten: str
    kodepos: str
    status_warga: str
    asal_kota: str
    created_at: datetime


class BlogCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    # Untuk page builder, frontend akan kirim HTML/CSS/JSON.
    content_html: str = Field(min_length=1, max_length=500000)
    content_css: str | None = Field(default=None, max_length=500000)
    content_json: str | None = Field(default=None, max_length=2000000)
    image_url: str | None = Field(default=None, max_length=255)


class BlogUpdate(BaseModel):
    id: int
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content_html: str | None = Field(default=None, min_length=1, max_length=500000)
    content_css: str | None = Field(default=None, max_length=500000)
    content_json: str | None = Field(default=None, max_length=2000000)
    image_url: str | None = Field(default=None, max_length=255)


class BlogOut(BaseModel):
    id: int
    title: str
    image_url: str | None
    content_html: str | None
    content_css: str | None
    created_by: str
    created_at: datetime


class KeuanganRTCreate(BaseModel):
    tanggal: date
    jenis: KeuanganJenis = KeuanganJenis.PEMASUKAN
    kategori: str = Field(min_length=1, max_length=64)
    keterangan: str | None = Field(default=None, max_length=2000)
    jumlah: int = Field(gt=0)


class KeuanganRTUpdate(BaseModel):
    id: int
    tanggal: date | None = None
    jenis: KeuanganJenis | None = None
    kategori: str | None = Field(default=None, min_length=1, max_length=64)
    keterangan: str | None = Field(default=None, max_length=2000)
    jumlah: int | None = Field(default=None, gt=0)


class KeuanganRTOut(BaseModel):
    id: int
    tanggal: date
    jenis: KeuanganJenis
    kategori: str
    keterangan: str | None
    jumlah: int
    created_at: datetime


class IuranWargaCreate(BaseModel):
    no_kk: str = Field(min_length=16, max_length=16, pattern=r"^\d{16}$")
    bulan: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    jumlah: int = Field(gt=0)
    status_pembayaran: IuranStatus = IuranStatus.BELUM_LUNAS
    tanggal_bayar: date | None = None
    metode_pembayaran: str | None = Field(default=None, max_length=32)
    alamat: str | None = Field(default=None, max_length=2000)
    keterangan: str | None = Field(default=None, max_length=2000)


class IuranWargaUpdate(BaseModel):
    id: int
    no_kk: str | None = Field(default=None, min_length=16, max_length=16, pattern=r"^\d{16}$")
    bulan: str | None = Field(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    jumlah: int | None = Field(default=None, gt=0)
    status_pembayaran: IuranStatus | None = None
    tanggal_bayar: date | None = None
    metode_pembayaran: str | None = Field(default=None, max_length=32)
    alamat: str | None = Field(default=None, max_length=2000)
    keterangan: str | None = Field(default=None, max_length=2000)


class IuranWargaOut(BaseModel):
    id: int
    no_kk: str
    nama_kepala_keluarga: str
    bulan: str
    jumlah: int
    status_pembayaran: IuranStatus
    tanggal_bayar: date | None
    metode_pembayaran: str | None
    alamat: str | None
    keterangan: str | None
    created_at: datetime


class JadwalKegiatanCreate(BaseModel):
    nama_kegiatan: str = Field(min_length=1, max_length=128)
    tanggal_kegiatan: datetime
    lokasi: str = Field(min_length=1, max_length=128)
    penanggung_jawab: str = Field(min_length=1, max_length=64)
    keterangan: str | None = Field(default=None, max_length=2000)
    status: KegiatanStatus = KegiatanStatus.TERJADWAL


class JadwalKegiatanUpdate(BaseModel):
    id: int
    nama_kegiatan: str | None = Field(default=None, min_length=1, max_length=128)
    tanggal_kegiatan: datetime | None = None
    lokasi: str | None = Field(default=None, min_length=1, max_length=128)
    penanggung_jawab: str | None = Field(default=None, min_length=1, max_length=64)
    keterangan: str | None = Field(default=None, max_length=2000)
    status: KegiatanStatus | None = None


class JadwalKegiatanOut(BaseModel):
    id: int
    nama_kegiatan: str
    tanggal_kegiatan: datetime
    lokasi: str
    penanggung_jawab: str
    keterangan: str | None
    status: KegiatanStatus
    created_at: datetime
