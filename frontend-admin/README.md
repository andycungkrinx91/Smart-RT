# Smart-RT Frontend Admin (Next.js)

Admin dashboard untuk platform Smart-RT SaaS, dibangun dengan **Next.js 16 (App Router)**, **Tailwind CSS v4**, dan **Redux Toolkit**.

Dashboard ini menggunakan backend FastAPI sebagai pure API. Seluruh UI admin dikelola di sini dengan fokus pada performa tinggi menggunakan **Turbopack** saat pengembangan.

> **Catatan:** Fitur **Koleksi Hadist** ada di `frontend-public` (integrasi API eksternal). Dashboard admin berfokus pada manajemen konten dan data internal aplikasi.

## Prasyarat

- Node.js 24+
- pnpm 10+

## Setup

```bash
cp .env.example .env
# Edit .env sesuai environment Anda
pnpm install
pnpm dev # Menjalankan dengan Turbopack
```

## Sistem UI/UX

Aplikasi ini mengimplementasikan sistem UI/UX yang konsisten dan modern:

- **JakartaClock (Neon Clock):** Komponen jam digital di bagian atas dashboard yang menampilkan waktu Jakarta secara real-time dengan efek visual neon yang modern.
- **Toast System:** Sistem notifikasi kustom (`components/ui/Toast.tsx`) untuk memberikan feedback instan (sukses, error, peringatan) pada setiap aksi pengguna.
- **ConfirmModal:** Dialog konfirmasi standar (`components/ui/ConfirmModal.tsx`) yang digunakan sebelum melakukan operasi penghapusan data untuk mencegah kesalahan fatal.
- **Framer Motion Animations:** Penggunaan sistem animasi yang terstandarisasi (`lib/motion-variants.ts`) untuk transisi halaman, modal, dan elemen UI lainnya agar terasa lebih halus dan responsif.
- **Tema & Branding:** Warna tema dinamis dan aset logo/favikon konsisten dengan frontend publik.

## Standarisasi Bahasa Indonesia

Seluruh antarmuka dan pesan sistem telah distandarisasi menggunakan Bahasa Indonesia. Melalui `lib/user-friendly-error.ts`, setiap error dari API diterjemahkan menjadi pesan yang mudah dipahami oleh pengguna akhir, memastikan pengalaman pengguna yang ramah dan profesional.

## Auth: Cookieless Bearer Token

Aplikasi ini menggunakan arsitektur **cookieless auth** — token JWT **tidak pernah** disimpan di cookie atau `localStorage`. Token disimpan di **Redux store** (in-memory) untuk keamanan maksimal terhadap serangan XSS dan Cookie Poisoning.

## SSE: Live Stats (Server-Sent Events)

Dashboard menampilkan statistik real-time melalui SSE. Next.js memproksi stream dari backend sehingga browser menerima update otomatis (penduduk, KK, keuangan, dll) setiap 5 detik tanpa perlu refresh halaman.

## Flow Aplikasi (Admin)

```
Browser → frontend-admin → /api/* → Backend → UI
```

### API Route Mapping

| Route | Target | Keterangan |
|-------|--------|------------|
| `/api/auth/login` | Backend `/login` | Login user |
| `/api/auth/logout` | Backend `/logout` | Logout user |
| `/api/profile` | Backend `/me` | Current user profile + update profile |
| `/api/users` | Backend `/userlist`, `/adduser`, `/updateuser`, `/deleteuser` | User CRUD |
| `/api/stats` | Backend `/stats` | Stats snapshot |
| `/api/stats/stream` | Backend `/stats/stream` | SSE stream |
| `/api/penduduk` | Backend `/datapenduduk`, `/adddatapenduduk`, `/updatedatapenduduk`, `/deletedatapenduduk` | Penduduk CRUD |
| `/api/kk` | Backend `/datakartukeluarga`, `/adddatakartukeluarga`, `/updatedatakartukeluarga`, `/deletedatakartukeluarga` | KK CRUD |
| `/api/iuran` | Backend `/dataiuranwarga`, `/adddataiuranwarga`, `/updatedataiuranwarga`, `/deletedataiuranwarga` | Iuran CRUD |
| `/api/keuangan` | Backend `/datakeuanganrt`, `/adddatakeuanganrt`, `/updatedatakeuanganrt`, `/deletedatakeuanganrt` | Keuangan CRUD |
| `/api/kegiatan` | Backend `/datajadwalkegiatan`, `/adddatajadwalkegiatan`, `/updatedatajadwalkegiatan`, `/deletedatajadwalkegiatan` | Kegiatan CRUD |
| `/api/blogs` | Backend `/blogs`, `/addblog`, `/updateblog`, `/deleteblog` | Blog CRUD |
| `/api/blogs/upload` | Backend `/upload` | Upload gambar |
| `/api/settings` | Backend `/settings/{key}`, `/settings` | Settings CRUD |
| `/storage/*` | Backend | Asset gambar |

## Struktur Folder Utama

```
src/
├── app/
│   ├── admin/            # Halaman dashboard & modul (penduduk, kk, keuangan, iuran, kegiatan, blog)
│   ├── api/              # Next.js Route Handlers (BFF)
│   │   ├── auth/         # Login/Logout proxy
│   │   ├── stats/        # SSE & Snapshot proxy
│   │   ├── penduduk/     # Proxy CRUD Penduduk
│   │   ├── kk/           # Proxy CRUD KK
│   │   ├── keuangan/     # Proxy CRUD Keuangan
│   │   ├── iuran/        # Proxy CRUD Iuran
│   │   ├── kegiatan/     # Proxy CRUD Kegiatan
│   │   ├── blogs/        # Proxy CRUD Blog & Upload
│   │   └── settings/     # Proxy Settings
│   └── storage/          # Storage proxy
├── components/
│   ├── ui/               # Toast, ConfirmModal, Button, Input
│   ├── dashboard/        # JakartaClock, MetricCard, Charts
│   ├── layout/           # Sidebar, BottomNav, TopBar
│   └── forms/            # Form components
├── hooks/                # useJakartaClock, useStatsStream, useThemeColor
├── lib/
│   ├── api.ts            # Server-side fetch helpers
│   ├── client-api.ts      # Client-side API helpers
│   ├── auth.ts           # Auth utilities
│   ├── user-friendly-error.ts # Indonesian error mapping
│   ├── motion-variants.ts     # Framer Motion configs
│   └── env.ts            # Environment variables
├── store/                # Redux store (auth, theme)
└── styles/               # Global styles
```

## Environment Variables

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Nama aplikasi di UI |
| `API_BASE_URL` | URL internal backend (Server-side only) |
| `BACKEND_API_KEY` | API Key untuk backend (Server-side only) |
| `NEXT_PUBLIC_SITE_URL` | URL publik untuk validasi CORS |

## Keamanan

- `BACKEND_API_KEY` tidak pernah terekspos ke browser (tidak ada prefix `NEXT_PUBLIC_`).
- Validasi origin pada setiap request login untuk proteksi CSRF.
- Token JWT hanya hidup selama sesi tab browser aktif.

## Lisensi

© Andy Setiyawan 2026 – All Rights Reserved. Made with ❤️

LinkedIn: https://www.linkedin.com/in/andy-setiyawan-452396170/
