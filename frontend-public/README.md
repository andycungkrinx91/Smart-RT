# Smart-RT Frontend Public (Next.js)

Website publik untuk platform Smart-RT SaaS, dibangun dengan **Next.js 16 (App Router)**, **Tailwind CSS v4**, dan **Framer Motion 12**.

Website ini menampilkan informasi publik seperti Berita (Blog), Tentang Kami, Al Quran digital, Koleksi Hadist, dan Jadwal Shalat. Konten internal (Homepage/Blog/About/Layout) dikelola dari dashboard admin, sedangkan konten ibadah diambil dari API eksternal.

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

## Fitur Utama

- **Aesthetic UI:** Desain modern dengan Tailwind CSS v4.
- **Rich Animations:** Animasi halus menggunakan Framer Motion 12.
- **Dynamic Content:** Konten Homepage, Blog, dan About Us dikelola dari Admin.
- **Al Quran Digital:** Daftar surah, detail ayat, audio, dan tafsir per ayat (modal popup).
- **Koleksi Hadist:** Kategori kitab, daftar hadist per kategori (dengan pagination), dan detail hadist dalam Bahasa Indonesia (sumber HadeethEnc.com).
- **Jadwal Shalat:** Pilih provinsi/kabupaten dan lihat jadwal bulanan (sumber EQuran.id).
- **Theme Color:** Pengaturan warna tema tersimpan di local storage.
- **Storage Proxy:** Asset gambar publik diproksikan ke backend `/storage/*`.
- **Responsive Design:** Optimal di perangkat mobile maupun desktop.

## Flow Aplikasi (Public)

```
Browser → frontend-public → /api/public/* → Backend/EQuran API → UI
```

### API Route Mapping

| Route | Target | Keterangan |
|-------|--------|------------|
| `/api/public/blogs` | Backend `/blogs` | List blog (service bearer token) |
| `/api/public/blogs/{id}` | Backend `/blogs/{id}` | Detail blog |
| `/api/public/settings/{key}` | Backend `/public/settings/{key}` | Settings publik |
| `/api/public/quran/surat` | EQuran API | List surah |
| `/api/public/quran/surat/{nomor}` | EQuran API | Detail ayat |
| `/api/public/quran/tafsir/{nomor}` | EQuran API | Tafsir ayat |
| `/api/public/hadith/kategori` | HadeethEnc API | List kategori kitab hadist |
| `/api/public/hadith/kategori/utama` | HadeethEnc API | Kategori utama hadist |
| `/api/public/hadith/hadist` | HadeethEnc API | List hadist per kategori |
| `/api/public/hadith/hadist/{id}` | HadeethEnc API | Detail hadist |
| `/api/public/shalat/provinsi` | EQuran API | List provinsi |
| `/api/public/shalat/kabkota` | EQuran API | List kabkota |
| `/api/public/shalat` | EQuran API | Jadwal Shalat bulanan |
| `/api/public/prayer-times` | Aladhan API | Jadwal shalat harian (berdasarkan city/country env) |
| `/storage/*` | Backend | Asset gambar |

### Service Account Pattern

Frontend publik menggunakan **service account** (akun service) untuk mengakses endpoint blog yang dilindungi:

- Service account login saat startup/scheduled
- Bearer token disimpan di server-side (tidak terekspos ke browser)
- Setiap request blog menggunakan token ini untuk otentikasi

## Struktur Folder Utama

```
src/
├── app/
│   ├── page.tsx          # Homepage
│   ├── blogs/            # Halaman List Blog & Detail
│   ├── about/            # Halaman Tentang Kami
│   ├── quran/            # Al Quran (list + detail)
│   ├── hadist/           # Koleksi Hadist (kategori + detail)
│   ├── shalat/           # Jadwal Shalat
│   ├── settings/theme/   # Pengaturan warna tema
│   ├── api/              # Route Handlers (BFF)
│   │   ├── public/quran/   # Proxy EQuran API
│   │   ├── public/hadith/   # Proxy HadeethEnc API
│   │   ├── public/shalat/  # Proxy EQuran Shalat API
│   │   ├── public/blogs/   # Proxy blog list/detail
│   │   ├── public/settings/ # Proxy settings publik
│   │   └── storage/        # Proxy storage
├── components/
│   ├── ui/               # Reusable components (Button, Card, etc.)
│   ├── layout/           # Navbar, Footer
│   ├── animations/       # Framer Motion wrappers
│   └── quran/           # Al Quran components
├── lib/
│   ├── api.ts            # API fetch helpers
│   ├── backend.ts        # Backend API client
│   ├── motion-variants.ts # Animation configurations
│   └── theme.ts          # Theme color management
```

## Environment Variables

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Nama aplikasi di UI |
| `API_BASE_URL` | URL internal backend (Server-side only) |
| `BACKEND_API_KEY` | API Key untuk backend (Server-side only) |
| `BACKEND_PUBLIC_EMAIL` | Email akun service untuk akses blog (Server-side only) |
| `BACKEND_PUBLIC_PASSWORD` | Password akun service (Server-side only) |
| `BACKEND_PUBLIC_BEARER_TOKEN` | Token JWT service (opsional, Server-side only) |
| `PRAYER_CITY` | Kota default jadwal shalat harian (opsional) |
| `PRAYER_COUNTRY` | Negara default jadwal shalat harian (opsional) |
| `PRAYER_METHOD` | Metode jadwal shalat harian (opsional) |
| `PRAYER_SCHOOL` | Mazhab (opsional) |

## Lisensi

© Andy Setiyawan 2026 – All Rights Reserved. Made with ❤️

LinkedIn: https://www.linkedin.com/in/andy-setiyawan-452396170/