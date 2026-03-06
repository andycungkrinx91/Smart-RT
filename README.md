# Smart-RT

![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-10.11-003545?logo=mariadb&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4+-06B6D4?logo=tailwindcss&logoColor=white)

Platform manajemen RT/RW dengan **frontend publik** dan **dashboard admin** berbasis Next.js + backend FastAPI.

## Komponen Utama

| Komponen | Teknologi | Port Default |
|----------|-----------|--------------|
| `frontend-public/` | Next.js 16 (App Router) | 3001 |
| `frontend-admin/` | Next.js 16 (App Router) | 3000 |
| `backend/` | FastAPI + MySQL/MariaDB/PostgreSQL | 8000 |

## Struktur Folder

```
Smart-RT/
├── backend/            # FastAPI REST API + SSE
├── frontend-admin/    # Dashboard admin Next.js
└── frontend-public/   # Website publik Next.js
```

---

## Arsitektur & Flow Aplikasi

### Flow Publik (frontend-public)

```
Browser → frontend-public → /api/public/* → Backend/EQuran API → UI
```

**Detail Flow:**

| Request | Route | Proxies To |
|---------|-------|------------|
| Blog list | `/api/public/blogs` | Backend `/blogs` (service bearer token) |
| Blog detail | `/api/public/blogs/{id}` | Backend `/blogs/{id}` |
| Settings publik | `/api/public/settings/{key}` | Backend `/public/settings/{key}` |
| Al Quran - list | `/api/public/quran/surat` | EQuran API |
| Al Quran - detail | `/api/public/quran/surat/{nomor}` | EQuran API |
| Al Quran - tafsir | `/api/public/quran/tafsir/{nomor}` | EQuran API |
| Hadist - kategori | `/api/public/hadith/kategori` | HadeethEnc API |
| Hadist - kategori utama | `/api/public/hadith/kategori/utama` | HadeethEnc API |
| Hadist - list | `/api/public/hadith/hadist` | HadeethEnc API |
| Hadist - detail | `/api/public/hadith/hadist/{id}` | HadeethEnc API |
| Jadwal Shahat - provinsi | `/api/public/shalat/provinsi` | EQuran API |
| Jadwal Shalat - kabkota | `/api/public/shalat/kabkota` | EQuran API |
| Jadwal Shalat - jadwal | `/api/public/shalat` | EQuran API |
| Asset storage | `/storage/*` | Backend (FastAPI StaticFiles) |

### Flow Admin (frontend-admin)

```
Browser → frontend-admin → /api/* → Backend → UI
```

**Detail Flow:**

| Request | Route | Proxies To |
|---------|-------|------------|
| Login | `/api/auth/login` | Backend `/login` |
| Logout | `/api/auth/logout` | Backend `/logout` |
| Profile | `/api/profile` | Backend `/me` |
| Users CRUD | `/api/users` | Backend `/users` |
| Stats snapshot | `/api/stats` | Backend `/stats` |
| Stats SSE stream | `/api/stats/stream` | Backend `/stats/stream` |
| Penduduk CRUD | `/api/penduduk` | Backend `/penduduk` |
| KK CRUD | `/api/kk` | Backend `/kartukeluarga` |
| Keuangan CRUD | `/api/keuangan` | Backend `/keuangan` |
| Iuran CRUD | `/api/iuran` | Backend `/iuran` |
| Kegiatan CRUD | `/api/kegatan` | Backend `/kegatan` |
| Blog CRUD | `/api/blogs` | Backend `/blogs`, `/addblog`, `/updateblog`, `/deleteblog` |
| Blog upload | `/api/blogs/upload` | Backend `/upload` |
| Settings | `/api/settings` | Backend `/settings` |

---

## Fitur Aplikasi

### Fitur Publik (frontend-public)

- **Blog publik** - List dan detail artikel dari admin
- **Al Quran digital** - Surah, ayat, tafsir per ayat, audio
- **Koleksi Hadist** - Kitab hadist Shahih Bukhari, Muslim, dll (sumber HadeethEnc.com)
- **Jadwal Shahat bulanan** - Provinsi/kabupaten (sumber EQuran.id)
- **Theme color** - Pengaturan warna tema (localStorage)
- **Settings publik** - Konten homepage, about, layout dari admin
- **Proxy storage** - Asset `/storage/*` ke backend

### Fitur Admin (frontend-admin)

- **CRUD Penduduk** - Data warga
- **CRUD KK** - Data Kartu Keluarga
- **CRUD Keuangan** - Buku kas ledger
- **CRUD Iuran** - Pembayaran iuran warga
- **CRUD Kegiatan** - Agenda dan kegiatan RT
- **CRUD Blog** - Publikasi informasi dan berita
- **Stats real-time** - SSE update setiap 5 detik
- **Auth cookieless** - JWT di Redux store (in-memory)
- **Upload media** - Manajemen konten gambar

---

## Teknologi

| Layer | Tech Stack |
|-------|------------|
| Backend | FastAPI, SQLAlchemy (async), PostgreSQL/MySQL |
| Frontend | Next.js 16, Tailwind CSS v4, Redux Toolkit |
| Animations | Framer Motion 12 |
| Auth | JWT (HS256), cookieless, in-memory |

---

## Persiapan Environment

### Backend (FastAPI)

- **Python:** 3.11+
- **Database:** PostgreSQL (recommended) atau MySQL
- **Tools:** uv (recommended) atau pip

### Frontend

- **Node.js:** 24+
- **pnpm:** 10+

---

## Cara Menjalankan

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env - sesuaikan DATABASE_URL dan API_KEY
uv venv
source .venv/bin/activate  # Linux/Mac
# atau .venv\Scripts\activate  # Windows
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend tersedia di `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 2. Frontend Public

```bash
cd frontend-public
cp .env.example .env
pnpm install
pnpm dev
```

### 3. Frontend Admin

```bash
cd frontend-admin
cp .env.example .env
pnpm install
pnpm dev
```

### Cara Menjalankan (Docker)

#### Docker Saja (Backend)

```bash
cd backend
docker build -t smart-rt-backend .
docker run -p 8000:8000 --env-file .env smart-rt-backend
```

#### Docker Compose (Full Stack + Database)

```bash
# Pastikan .env sudah dikonfigurasi
docker-compose up -d
```

Untuk menggunakan MySQL, MariaDB, atau PostgreSQL, edit `docker-compose.yml` sesuai kebutuhan.

---

## Environment Variables

Detail lengkap ada di masing-masing README:

| File | Keterangan |
|------|-------------|
| `backend/.env.example` | Database, JWT, API Key |
| `frontend-public/.env.example` | Backend URL, EQuran config |
| `frontend-admin/.env.example` | Backend URL, API Key |

---

## Lisensi

© Andy Setiyawan 2026 – All Rights Reserved. Made with ❤️

LinkedIn: https://www.linkedin.com/in/andy-setiyawan-452396170/
