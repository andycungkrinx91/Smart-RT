# Smart-RT Backend (FastAPI)

Backend menyediakan **REST API + SSE** untuk aplikasi Smart-RT SaaS. Semua endpoint dilindungi oleh `X-API-Key` (divalidasi di level middleware), dan endpoint yang butuh login menggunakan Bearer Token JWT.

> **Catatan:** Fitur **Koleksi Hadist** ada di `frontend-public` melalui integrasi HadeethEnc API, sehingga backend ini tidak menyediakan endpoint hadist khusus.

> **Update:** Backend kini mendukung fitur **Auto-Migration**. Saat aplikasi dijalankan, SQLAlchemy akan secara otomatis membuat tabel-tabel yang diperlukan jika belum tersedia di database.

## Prasyarat

- **Python:** 3.11+
- **Database:** PostgreSQL, MySQL, atau MariaDB
- **Tools:** uv (recommended) atau pip

## Setup

### 1. Clone & Setup Environment

```bash
cd backend
cp .env.example .env
```

### 2. Konfigurasi Database

Edit file `.env` dan sesuaikan `DATABASE_URL`:

**PostgreSQL:**
```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/smartrt
```

**MySQL:**
```env
DATABASE_URL=asyncmy+mysql://username:password@localhost:3306/smartrt
```

**MariaDB:**
```env
DATABASE_URL=aiomysql+mariadb://username:password@localhost:3306/smartrt
```

Buat database kosong di PostgreSQL/MySQL/MariaDB:
```sql
CREATE DATABASE smartrt;
```

### 3. Install Dependencies

**Menggunakan uv (recommended):**
```bash
uv venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate    # Windows
uv pip install -r requirements.txt
```

**Atau menggunakan pip:**
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 4. Jalankan Backend

```bash
uvicorn app.main:app --reload
```

Backend akan tersedia di `http://localhost:8000`. API docs: `http://localhost:8000/docs`

## Konfigurasi (.env)

- **Auth:** JWT (HS256) + sesi JTI di Redis (atau in-memory). Token dikembalikan sebagai JSON — **tidak ada cookie auth**; klien (Next.js BFF) meneruskannya via `Authorization: Bearer`.
- **API Key Guard:** Semua endpoint wajib menyertakan header `X-API-Key`. Nilai dikonfigurasi via `API_KEY` di `.env`.
- **Auto-Migration:** Sinkronisasi skema database otomatis saat startup menggunakan `Base.metadata.create_all()`.
- **SSE (Server-Sent Events):** `GET /stats/stream` — mendorong statistik live (penduduk, KK, blog, dll) setiap 5 detik.
- **Manajemen user (role-based):** `Administrator` & `Management`.
- **Full CRUD Support:**
    - **Penduduk:** Pengelolaan data warga.
    - **Kartu Keluarga (KK):** Pengelolaan data keluarga.
    - **Keuangan:** Pencatatan buku kas ledger.
    - **Iuran:** Pelacakan pembayaran iuran warga.
    - **Kegiatan:** Manajemen agenda dan kegiatan RT.
    - **Blog:** Publikasi informasi dan berita RT.

## Struktur Folder

```
backend/
├── app/
│   ├── main.py             # Entry FastAPI + CORS middleware + lifespan seed & migration
│   ├── models.py           # SQLAlchemy models (source of truth schema)
│   ├── deps.py             # Bearer token & API key dependency injection
│   ├── crud.py             # DB queries
│   ├── schemas.py          # Pydantic schemas
│   ├── routers/
│   │   ├── auth.py         # POST /login, POST /logout
│   │   ├── me.py           # GET/PUT /me
│   │   ├── users.py        # /adduser, /userlist, /updateuser, /deleteuser
│   │   ├── penduduk.py     # /datapenduduk + add/update/delete
│   │   ├── kartukeluarga.py # /datakartukeluarga + add/update/delete
│   │   ├── keuangan.py     # /datakeuanganrt + add/update/delete
│   │   ├── iuran.py        # /dataiuranwarga + add/update/delete
│   │   ├── kegiatan.py     # /datajadwalkegiatan + add/update/delete
│   │   ├── blogs.py        # /blogs, /addblog, /updateblog, /deleteblog, /upload
│   │   ├── stats.py        # GET /stats, GET /stats/stream (SSE)
│   │   └── settings.py     # GET /settings/{key}, POST /settings, GET /public/settings/{key}
│   ├── core/
│   │   ├── config.py       # Pydantic Settings (env vars)
│   │   ├── database.py     # SQLAlchemy async engine
│   │   ├── redis_client.py
│   │   ├── security.py     # JWT create/decode, password hash
│   │   ├── storage.py      # Image upload & storage
│   │   └── sanitize.py     # HTML/CSS sanitization
│   └── __init__.py
├── .env.example
├── Dockerfile
└── requirements.txt
```

## Variabel Environment

Salin contoh env lalu sesuaikan:

```bash
cp .env.example .env
```

Lihat semua variabel di [`backend/.env.example`](.env.example). Variabel kunci:

| Variabel | Keterangan |
|---|---|
| `SECRET_KEY` | Wajib diganti untuk production (random string panjang) |
| `API_KEY` | Wajib diset; harus sama dengan `BACKEND_API_KEY` di frontend-admin |
| `DATABASE_URL` | Koneksi DB async (PostgreSQL asyncpg / MySQL asyncmy) |
| `SEED_DATA` | `true` — seed data contoh jika tabel masih kosong |

## Endpoint API Utama

### Autentikasi
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/login` | Login user, returns JWT |
| `POST` | `/logout` | Logout user (invalidate JTI) |
| `GET` | `/me` | Get current user profile |
| `PUT` | `/me` | Update profile user aktif |

### User Management (Administrator)
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/userlist` | List user |
| `POST` | `/adduser` | Tambah user |
| `PUT` | `/updateuser` | Update user |
| `DELETE` | `/deleteuser?userid={id}` | Hapus user |

### Data Penduduk & KK
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/datapenduduk` | List data penduduk |
| `POST` | `/adddatapenduduk` | Tambah data penduduk |
| `PUT` | `/updatedatapenduduk` | Update data penduduk |
| `DELETE` | `/deletedatapenduduk?id={id}` | Hapus data penduduk |
| `GET` | `/datakartukeluarga` | List data KK |
| `POST` | `/adddatakartukeluarga` | Tambah data KK |
| `PUT` | `/updatedatakartukeluarga` | Update data KK |
| `DELETE` | `/deletedatakartukeluarga?id={id}` | Hapus data KK |

### Keuangan, Iuran, dan Kegiatan
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/datakeuanganrt` | List buku kas |
| `POST` | `/adddatakeuanganrt` | Tambah transaksi keuangan |
| `PUT` | `/updatedatakeuanganrt` | Update transaksi keuangan |
| `DELETE` | `/deletedatakeuanganrt?id={id}` | Hapus transaksi keuangan |
| `GET` | `/dataiuranwarga` | List data iuran |
| `POST` | `/adddataiuranwarga` | Tambah data iuran |
| `PUT` | `/updatedataiuranwarga` | Update data iuran |
| `DELETE` | `/deletedataiuranwarga?id={id}` | Hapus data iuran |
| `GET` | `/datajadwalkegiatan` | List kegiatan |
| `POST` | `/adddatajadwalkegiatan` | Tambah kegiatan |
| `PUT` | `/updatedatajadwalkegiatan` | Update kegiatan |
| `DELETE` | `/deletedatajadwalkegiatan?id={id}` | Hapus kegiatan |

### Blog & Media
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/blogs` | List semua blog (admin) |
| `GET` | `/blogs/{id}` | Get blog by ID |
| `POST` | `/addblog` | Create blog baru |
| `PUT` | `/updateblog` | Update blog |
| `DELETE` | `/deleteblog?id={id}` | Delete blog |
| `POST` | `/upload` | Upload gambar untuk blog |

### Stats & SSE
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/stats` | Snapshot statistik |
| `GET` | `/stats/stream` | **SSE** — push statistik live setiap 5 detik |

### Settings
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/settings/{key}` | Get settings by key (admin) |
| `POST` | `/settings` | Create/update settings (admin) |
| `GET` | `/public/settings/{key}` | Get public settings (no auth) |

## Storage (Static Files)

File statis (gambar upload) dilayani langsung oleh FastAPI melalui `StaticFiles` mounting:

```
/storage/* → app/static/uploads/*
```

**Catatan:** Storage dilayani langsung oleh backend FastAPI dan juga dapat diakses lewat proxy Next.js (`/storage/*`) pada frontend.

## Auto-Migration & Seeding

Saat startup, aplikasi secara otomatis:
1. Menjalankan `create_all()` untuk sinkronisasi tabel.
2. Membuat akun admin default jika belum ada.
3. Menseed data contoh jika `SEED_DATA=true` dan tabel masih kosong.

## Keamanan

- Header keamanan: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- CORS hanya mengizinkan origin yang terdaftar di `SAAS_DOMAIN`.
- Validasi `X-API-Key` di setiap request API.

## Lisensi

© Andy Setiyawan 2026 – All Rights Reserved. Made with ❤️

LinkedIn: https://www.linkedin.com/in/andy-setiyawan-452396170/
