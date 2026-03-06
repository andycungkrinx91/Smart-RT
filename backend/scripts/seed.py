"""
Seed script: ensures each Smart-RT core table has at least 20 records.

Tables covered:
  - data_penduduk
  - data_kartu_keluarga
  - blogs
  - keuangan_rt
  - iuran_warga
  - jadwal_kegiatan

Run from backend/ directory:
    python scripts/seed.py
"""

import asyncio
import os
import sys
from datetime import date, datetime, timedelta

# ── make sure the parent package (app.*) is importable ──────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

import asyncmy  # noqa: F401  (register dialect)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings

# ── Realistic Indonesian seed data ───────────────────────────────────────────
#
# NIK format (16 digits):
#   PPKKCCDDMMYYSSSS
#   PP   = province code  (33 = Jawa Tengah)
#   KK   = kab/kota code
#   CC   = kecamatan code
#   DDMMYY = tanggal lahir (perempuan: DD+40)
#   SSSS = sequence
#
# no_kk: same first 10 digits as NIK of KK-head, different last 6 (family seq).

PENDUDUK_DATA = [
    # (nik, nama_lengkap ≤32, alamat, pekerjaan ≤32, status)
    ("3301010101800001", "Budi Santoso",        "Jl. Merdeka No. 12, RT 001 RW 002, Purwokerto",  "Pegawai Negeri",    "Aktif"),
    ("3301010203750002", "Siti Rahayu",         "Jl. Diponegoro No. 5, Purwokerto Utara",          "Ibu Rumah Tangga",  "Aktif"),
    ("3301010304820003", "Ahmad Fauzi",         "Perum Griya Asri Blok B No. 7, Purwokerto",       "Wiraswasta",        "Aktif"),
    ("3301010405900004", "Dewi Kurniawati",     "Jl. Sudirman No. 88, Purwokerto Selatan",         "Guru",              "Aktif"),
    ("3301010506780005", "Eko Prasetyo",        "Jl. Ahmad Yani No. 3, Purwokerto Barat",          "Buruh Pabrik",      "Aktif"),
    ("3301010607850006", "Fitri Handayani",     "Jl. Jend. Soedirman No. 15, Purwokerto",          "Karyawan Swasta",   "Aktif"),
    ("3301010708910007", "Gunawan Wibowo",      "Jl. Raya Banyumas KM 5, Purwokerto",              "Pedagang",          "Aktif"),
    ("3301010809880008", "Heni Lestari",        "Jl. Pemuda No. 22, Purwokerto Timur",             "Perawat",           "Aktif"),
    ("3301010910760009", "Irwan Susanto",       "Jl. Gatot Subroto No. 9, Purwokerto",             "Petani",            "Aktif"),
    ("3301011011830010", "Juliana Safitri",     "Jl. Soekarno-Hatta No. 77, Purwokerto",           "Bidan",             "Aktif"),
    ("3301011112920011", "Kurniawan Adi",       "Gang Anggrek No. 4, Purwokerto Utara",             "Supir Angkutan",    "Nonaktif"),
    ("3301011213870012", "Lina Wahyuni",        "Jl. Veteran No. 33, Purwokerto Barat",            "Penjahit",          "Aktif"),
    ("3301011314810013", "Muhammad Rizky",      "Jl. Kalimanah No. 11, Purwokerto",                "Teknisi",           "Aktif"),
    ("3301011415940014", "Nurul Aini",          "Jl. Pramuka No. 6, Purwokerto Selatan",           "Mahasiswi",         "Aktif"),
    ("3301011516800015", "Oki Firmansyah",      "Jl. Kenangan No. 18, Purwokerto Timur",           "Montir",            "Nonaktif"),
    ("3301011617730016", "Putri Anggraini",     "Jl. Raya Sokaraja No. 25, Purwokerto",            "Dokter",            "Aktif"),
    ("3301011718860017", "Rahmat Hidayat",      "Jl. Pahlawan No. 7, Purwokerto Utara",            "Polisi",            "Aktif"),
    ("3301011819790018", "Sri Mulyani",         "Jl. Imam Bonjol No. 14, Purwokerto",              "Akuntan",           "Aktif"),
    ("3301011920840019", "Tommy Wijaya",        "Jl. Cendana No. 30, Purwokerto Barat",            "Arsitek",           "Aktif"),
    ("3301012021970020", "Umi Kalsum",          "Jl. Mawar No. 2, Purwokerto Selatan",             "Apoteker",          "Aktif"),
]

# KK_DATA mirrors the same 20 people as KK-heads.
# no_kk is derived by taking first 10 digits of NIK + family-sequence suffix.
# nama_kepala_keluarga MUST be ≤ 16 chars.
KK_DATA = [
    # (no_kk, nik_ref, nama_kk≤16, rt, rw, kelurahan≤16, kecamatan≤16, kabupaten≤16, kodepos(6), status_warga≤16, asal_kota≤16)
    ("3301010101800101", "3301010101800001", "Budi Santoso",    "001", "002", "Purwokerto Lor",  "Pwt Utara",     "Banyumas",      "053111", "Permanen",  "Banyumas"),
    ("3301010203750102", "3301010203750002", "Siti Rahayu",     "002", "001", "Purwokerto Lor",  "Pwt Utara",     "Banyumas",      "053111", "Permanen",  "Banyumas"),
    ("3301010304820103", "3301010304820003", "Ahmad Fauzi",     "003", "002", "Sokanegara",      "Pwt Timur",     "Banyumas",      "053116", "Permanen",  "Cilacap"),
    ("3301010405900104", "3301010405900004", "Dewi Kurniawati", "004", "003", "Sokanegara",      "Pwt Timur",     "Banyumas",      "053116", "Permanen",  "Purbalingga"),
    ("3301010506780105", "3301010506780005", "Eko Prasetyo",    "005", "001", "Karanglewas",     "Pwt Barat",     "Banyumas",      "053161", "Permanen",  "Banyumas"),
    ("3301010607850106", "3301010607850006", "Fitri Handayani", "001", "004", "Karanglewas",     "Pwt Barat",     "Banyumas",      "053161", "Permanen",  "Banjarnegara"),
    ("3301010708910107", "3301010708910007", "Gunawan Wibowo",  "002", "002", "Arcawinangun",    "Pwt Timur",     "Banyumas",      "053117", "Pendatang", "Kebumen"),
    ("3301010809880108", "3301010809880008", "Heni Lestari",    "003", "001", "Arcawinangun",    "Pwt Timur",     "Banyumas",      "053117", "Permanen",  "Banyumas"),
    ("3301010910760109", "3301010910760009", "Irwan Susanto",   "006", "003", "Bobosan",         "Pwt Utara",     "Banyumas",      "053115", "Permanen",  "Brebes"),
    ("3301011011830110", "3301011011830010", "Juliana Safitri", "007", "002", "Bobosan",         "Pwt Utara",     "Banyumas",      "053115", "Permanen",  "Tegal"),
    ("3301011112920111", "3301011112920011", "Kurniawan Adi",   "001", "001", "Karangklesem",    "Pwt Selatan",   "Banyumas",      "053144", "Nonaktif",  "Pemalang"),
    ("3301011213870112", "3301011213870012", "Lina Wahyuni",    "002", "003", "Karangklesem",    "Pwt Selatan",   "Banyumas",      "053144", "Permanen",  "Banyumas"),
    ("3301011314810113", "3301011314810013", "Muhammad Rizky",  "003", "004", "Tanjung",         "Pwt Utara",     "Banyumas",      "053112", "Permanen",  "Banyumas"),
    ("3301011415940114", "3301011415940014", "Nurul Aini",      "004", "001", "Tanjung",         "Pwt Utara",     "Banyumas",      "053112", "Pendatang", "Purwokerto"),
    ("3301011516800115", "3301011516800015", "Oki Firmansyah",  "005", "002", "Kranji",          "Pwt Timur",     "Banyumas",      "053119", "Nonaktif",  "Cilacap"),
    ("3301011617730116", "3301011617730016", "Putri Anggraini", "006", "001", "Kranji",          "Pwt Timur",     "Banyumas",      "053119", "Permanen",  "Semarang"),
    ("3301011718860117", "3301011718860017", "Rahmat Hidayat",  "007", "003", "Sumampir",        "Pwt Utara",     "Banyumas",      "053127", "Permanen",  "Banyumas"),
    ("3301011819790118", "3301011819790018", "Sri Mulyani",     "001", "002", "Sumampir",        "Pwt Utara",     "Banyumas",      "053127", "Permanen",  "Yogyakarta"),
    ("3301011920840119", "3301011920840019", "Tommy Wijaya",    "002", "004", "Pasirmuncang",    "Pwt Barat",     "Banyumas",      "053132", "Pendatang", "Bandung"),
    ("3301012021970120", "3301012021970020", "Umi Kalsum",      "003", "002", "Pasirmuncang",    "Pwt Barat",     "Banyumas",      "053132", "Permanen",  "Banyumas"),
]

# Blog data – 20 posts in Indonesian with created_by="System"
# title ≤ 255 chars, content is long-form text, created_by ≤ 32 chars
BLOG_DATA = [
    (
        "Selamat Datang di Portal Smart-RT",
        (
            "Selamat datang di Smart-RT, sistem informasi manajemen warga berbasis digital yang dirancang "
            "khusus untuk mempermudah administrasi RT/RW di lingkungan Anda. Melalui portal ini, warga "
            "dapat mengakses berbagai layanan administrasi secara online, mulai dari pengurusan surat "
            "keterangan, pendataan penduduk, hingga informasi kegiatan lingkungan. Kami berkomitmen untuk "
            "menciptakan lingkungan yang lebih tertib, transparan, dan efisien bagi seluruh warga."
        ),
    ),
    (
        "Tata Cara Pengajuan Surat Keterangan Domisili",
        (
            "Surat Keterangan Domisili (SKD) adalah dokumen resmi yang menyatakan bahwa seseorang bertempat "
            "tinggal di suatu wilayah. Untuk mengajukan SKD melalui Smart-RT, warga cukup mengikuti langkah "
            "berikut: (1) Login ke portal menggunakan NIK dan kata sandi; (2) Pilih menu 'Surat Keterangan'; "
            "(3) Isi formulir online dengan data diri yang benar; (4) Unggah dokumen pendukung seperti foto "
            "KTP dan KK; (5) Kirim pengajuan dan tunggu persetujuan dari Ketua RT dalam 1x24 jam. Dokumen "
            "dapat diunduh langsung setelah disetujui tanpa perlu datang ke sekretariat RT."
        ),
    ),
    (
        "Jadwal Ronda Malam Bulan Ini",
        (
            "Demi menjaga keamanan dan ketertiban lingkungan, panitia keamanan RT telah menyusun jadwal "
            "ronda malam untuk bulan ini. Setiap kepala keluarga diharapkan berpartisipasi aktif dalam "
            "kegiatan ronda sesuai jadwal yang telah ditetapkan. Jadwal dapat dilihat di papan pengumuman "
            "pos ronda dan juga di portal Smart-RT pada menu 'Jadwal Kegiatan'. Bagi warga yang berhalangan "
            "hadir, diharap segera menghubungi koordinator keamanan untuk penjadwalan ulang. Keamanan "
            "lingkungan adalah tanggung jawab kita bersama."
        ),
    ),
    (
        "Pengumuman: Kerja Bakti Bersih Lingkungan",
        (
            "Dalam rangka menjaga kebersihan dan keindahan lingkungan RT, akan diadakan kerja bakti bersama "
            "pada hari Minggu mendatang pukul 07.00 WIB. Seluruh warga diharapkan hadir membawa peralatan "
            "kebersihan masing-masing seperti sapu, sekop, dan kantong sampah. Kegiatan ini meliputi "
            "pembersihan selokan, pemotongan rumput, pengecatan pagar, dan penanaman tanaman hias di "
            "sepanjang jalan lingkungan. Konsumsi akan disediakan oleh panitia. Mari bersatu untuk "
            "lingkungan yang bersih, sehat, dan nyaman bagi semua warga."
        ),
    ),
    (
        "Pentingnya Memiliki Kartu Keluarga yang Update",
        (
            "Kartu Keluarga (KK) merupakan dokumen kependudukan yang sangat penting dan wajib dimiliki oleh "
            "setiap keluarga. Data dalam KK harus selalu diperbarui setiap kali terjadi perubahan anggota "
            "keluarga seperti kelahiran, kematian, pernikahan, atau perpindahan domisili. KK yang up-to-date "
            "akan memudahkan pengurusan berbagai dokumen administrasi seperti KTP, akta lahir, ijazah, dan "
            "dokumen resmi lainnya. Warga yang belum memperbarui data KK dapat menghubungi sekretariat RT "
            "atau mengajukan permohonan pembaruan data melalui portal Smart-RT."
        ),
    ),
    (
        "Informasi Posyandu Balita dan Ibu Hamil",
        (
            "Posyandu adalah salah satu bentuk upaya kesehatan bersumber daya masyarakat yang sangat penting "
            "bagi kesehatan ibu dan anak. Kegiatan Posyandu di wilayah RT kami dilaksanakan setiap bulan "
            "pada minggu pertama. Layanan yang tersedia antara lain: penimbangan berat badan balita, "
            "pengukuran tinggi badan, imunisasi, pemberian vitamin A, konsultasi gizi, dan pemeriksaan "
            "kesehatan ibu hamil. Semua layanan ini diberikan secara gratis. Ibu-ibu diharap membawa Buku "
            "KIA (Kesehatan Ibu dan Anak) setiap menghadiri Posyandu."
        ),
    ),
    (
        "Tips Hemat Energi untuk Warga RT",
        (
            "Menghemat energi bukan hanya menguntungkan bagi keuangan keluarga, tetapi juga berkontribusi "
            "pada pelestarian lingkungan. Berikut adalah beberapa tips hemat energi yang dapat diterapkan "
            "di rumah: (1) Matikan lampu dan peralatan elektronik saat tidak digunakan; (2) Gunakan lampu "
            "LED yang lebih hemat energi; (3) Manfaatkan cahaya matahari di siang hari; (4) Atur suhu AC "
            "pada 24-26 derajat Celsius; (5) Cuci pakaian dengan air dingin; (6) Cabut charger yang tidak "
            "digunakan dari stopkontak. Bersama-sama kita bisa menciptakan lingkungan yang lebih hemat "
            "energi dan ramah lingkungan."
        ),
    ),
    (
        "Program Beasiswa untuk Anak Berprestasi di Lingkungan RT",
        (
            "Pengurus RT dengan bangga mengumumkan program beasiswa tahunan bagi anak-anak berprestasi di "
            "lingkungan kita. Program ini bertujuan untuk mendukung pendidikan generasi muda yang memiliki "
            "prestasi akademik maupun non-akademik yang membanggakan. Kriteria penerima beasiswa antara lain: "
            "warga RT yang aktif, memiliki nilai rapor rata-rata minimal 8.0, aktif dalam kegiatan ekstra "
            "kurikuler, dan berasal dari keluarga yang membutuhkan dukungan finansial. Pendaftaran dibuka "
            "mulai tanggal 1 hingga 28 bulan ini. Formulir pendaftaran dapat diunduh di portal Smart-RT "
            "atau diambil di sekretariat RT."
        ),
    ),
    (
        "Cara Memilah Sampah dengan Benar di Rumah",
        (
            "Pemilahan sampah adalah langkah awal yang penting dalam pengelolaan sampah yang baik. Sampah "
            "harus dipisahkan menjadi tiga kategori: sampah organik (sisa makanan, daun), sampah anorganik "
            "(plastik, kertas, logam, kaca), dan sampah B3 atau berbahaya (baterai, cat, obat-obatan "
            "kadaluwarsa). Dengan memilah sampah sejak dari rumah, kita membantu petugas kebersihan bekerja "
            "lebih efisien dan berkontribusi pada program daur ulang yang menguntungkan lingkungan. Tempat "
            "sampah berwarna sudah tersedia di setiap sudut lingkungan RT: hijau untuk organik, kuning untuk "
            "anorganik, dan merah untuk B3."
        ),
    ),
    (
        "Informasi Bantuan Sosial Warga Kurang Mampu",
        (
            "Pemerintah dan pengurus RT berkomitmen untuk memastikan tidak ada warga yang tertinggal dalam "
            "hal kesejahteraan sosial. Berbagai program bantuan sosial tersedia bagi warga yang memenuhi "
            "kriteria, antara lain: Program Keluarga Harapan (PKH), Bantuan Pangan Non Tunai (BPNT), "
            "subsidi listrik, dan bantuan pendidikan. Warga yang merasa memenuhi kriteria dapat mendaftarkan "
            "diri melalui sekretariat RT dengan membawa dokumen: KTP, KK, dan surat keterangan tidak mampu "
            "dari RT. Data akan diverifikasi dan dilaporkan ke kelurahan untuk proses selanjutnya. "
            "Informasi lebih lanjut dapat diakses melalui portal Smart-RT."
        ),
    ),
    (
        "Kegiatan Peringatan HUT Kemerdekaan RI",
        (
            "Dalam rangka memperingati Hari Ulang Tahun Kemerdekaan Republik Indonesia, panitia RT telah "
            "menyiapkan serangkaian kegiatan yang meriah dan penuh semangat nasionalisme. Kegiatan yang "
            "direncanakan antara lain: upacara bendera di lapangan RT, lomba-lomba tradisional seperti "
            "balap karung, makan kerupuk, dan tarik tambang, serta pentas seni budaya dari warga. Acara "
            "puncak akan dilaksanakan pada tanggal 17 Agustus dengan pemutaran film kemerdekaan dan "
            "penyerahan hadiah pemenang lomba. Seluruh warga diundang untuk hadir dan berpartisipasi "
            "dalam semangat kebersamaan dan cinta tanah air."
        ),
    ),
    (
        "Panduan Penggunaan Aplikasi Smart-RT untuk Pemula",
        (
            "Bagi warga yang baru pertama kali menggunakan aplikasi Smart-RT, berikut adalah panduan singkat "
            "untuk memulai: Pertama, unduh aplikasi Smart-RT dari App Store atau Google Play Store, atau "
            "akses melalui browser di alamat portal yang tertera. Kedua, daftarkan akun menggunakan NIK "
            "dan nomor telepon yang terdaftar. Ketiga, verifikasi akun melalui OTP yang dikirim ke nomor "
            "telepon. Keempat, lengkapi profil Anda dengan data yang akurat. Setelah masuk, Anda dapat "
            "mengakses berbagai fitur seperti pengajuan surat, informasi kegiatan RT, pembayaran iuran "
            "warga, dan forum diskusi lingkungan. Tim dukungan teknis siap membantu setiap hari kerja."
        ),
    ),
    (
        "Sosialisasi Protokol Kesehatan di Lingkungan RT",
        (
            "Menjaga kesehatan bersama adalah tanggung jawab seluruh warga. Pengurus RT mengingatkan seluruh "
            "warga untuk tetap mematuhi protokol kesehatan yang berlaku, terutama di tempat-tempat umum "
            "dalam lingkungan RT seperti pos ronda, warung, dan fasilitas bersama. Protokol yang harus "
            "dipatuhi meliputi: mencuci tangan dengan sabun secara rutin, menjaga jarak aman antar warga "
            "di ruang publik, memastikan ventilasi udara yang baik di dalam ruangan, serta segera melapor "
            "ke pengurus RT jika ada anggota keluarga yang mengalami gejala penyakit menular. Fasilitas "
            "cuci tangan portabel tersedia di beberapa titik strategis lingkungan."
        ),
    ),
    (
        "Iuran Warga: Transparansi Keuangan RT",
        (
            "Demi menjaga kepercayaan dan transparansi, pengurus RT secara rutin melaporkan penggunaan dana "
            "iuran warga setiap bulan. Laporan keuangan dapat diakses oleh seluruh warga melalui menu "
            "'Keuangan RT' di portal Smart-RT. Dana iuran digunakan untuk: operasional sekretariat RT, "
            "pemeliharaan fasilitas umum, kegiatan sosial kemasyarakatan, dana darurat lingkungan, dan "
            "kegiatan rutin RT lainnya. Besaran iuran bulanan telah disepakati dalam musyawarah warga dan "
            "dapat dibayarkan secara tunai di sekretariat atau melalui transfer bank. Bukti pembayaran "
            "digital tersedia di portal setelah konfirmasi pembayaran dilakukan."
        ),
    ),
    (
        "Pentingnya Akta Kelahiran bagi Anak",
        (
            "Akta kelahiran adalah dokumen vital pertama yang harus dimiliki setiap anak sejak lahir. "
            "Dokumen ini berfungsi sebagai bukti identitas resmi dan dasar untuk mendapatkan dokumen "
            "kependudukan lainnya di masa depan. Anak yang tidak memiliki akta kelahiran akan mengalami "
            "kesulitan saat mendaftar sekolah, mengurus beasiswa, membuat paspor, dan berbagai keperluan "
            "administratif lainnya. Pengajuan akta kelahiran dapat dilakukan di kantor Dinas Kependudukan "
            "dan Catatan Sipil dengan membawa persyaratan: surat keterangan lahir dari bidan/rumah sakit, "
            "KK, dan KTP kedua orang tua. Pengurus RT siap membantu proses pengurusan akta bagi warga "
            "yang membutuhkan panduan."
        ),
    ),
    (
        "Kegiatan Pengajian Rutin Warga RT",
        (
            "Kegiatan pengajian rutin merupakan salah satu kegiatan keagamaan yang diselenggarakan secara "
            "berkala di lingkungan RT sebagai sarana silaturahmi dan peningkatan keimanan warga. Pengajian "
            "dilaksanakan setiap malam Jumat di masjid/musala lingkungan dengan menghadirkan ustaz tamu "
            "dari berbagai daerah secara bergantian. Selain ceramah agama, kegiatan ini juga diisi dengan "
            "sesi tanya jawab dan doa bersama. Warga dari berbagai latar belakang dipersilakan hadir untuk "
            "mempererat tali persaudaraan antar sesama warga RT. Jadwal pengajian dan nama penceramah "
            "dapat dilihat di portal Smart-RT setiap minggunya."
        ),
    ),
    (
        "Tips Berkebun di Lahan Sempit untuk Ketahanan Pangan",
        (
            "Memiliki lahan terbatas bukan halangan untuk berkebun dan memenuhi kebutuhan pangan keluarga "
            "sendiri. Teknik berkebun urban atau urban farming semakin populer di kalangan warga perkotaan. "
            "Beberapa teknik yang dapat diterapkan di lahan sempit antara lain: berkebun vertikal dengan "
            "rak bertingkat, menggunakan pot atau polybag untuk tanaman sayuran, teknik hidroponik yang "
            "tidak memerlukan tanah, dan pemanfaatan pekarangan rumah secara optimal. Tanaman yang cocok "
            "untuk kebun lahan sempit antara lain: cabai, tomat, kangkung, bayam, dan berbagai jenis "
            "tanaman rempah. Program pelatihan berkebun urban tersedia melalui PKK RT."
        ),
    ),
    (
        "Prosedur Pelaporan Masalah Infrastruktur Lingkungan",
        (
            "Infrastruktur yang baik adalah fondasi kualitas hidup warga yang nyaman. Jika Anda menemukan "
            "kerusakan atau masalah infrastruktur di lingkungan RT seperti jalan berlubang, lampu jalan "
            "mati, selokan tersumbat, atau fasilitas umum rusak, segera laporkan melalui fitur 'Laporan "
            "Masalah' di portal Smart-RT. Cara melaporkan: pilih kategori masalah, unggah foto kondisi "
            "terkini, tambahkan deskripsi lokasi yang jelas, dan kirimkan laporan. Pengurus RT akan "
            "menindaklanjuti laporan dalam waktu 3x24 jam. Status penanganan laporan dapat dipantau "
            "secara real-time melalui portal. Partisipasi aktif warga sangat dibutuhkan untuk lingkungan "
            "yang lebih baik."
        ),
    ),
    (
        "Mengenal Hak dan Kewajiban sebagai Warga RT",
        (
            "Sebagai warga RT yang baik, penting bagi kita untuk memahami hak dan kewajiban yang melekat "
            "pada diri kita. Hak warga antara lain: mendapatkan pelayanan administrasi yang baik, "
            "berpartisipasi dalam musyawarah warga, mendapatkan informasi terkait kegiatan dan keuangan "
            "RT, serta menggunakan fasilitas umum yang tersedia. Kewajiban warga meliputi: membayar iuran "
            "tepat waktu, berpartisipasi dalam kegiatan lingkungan, menjaga ketertiban dan kebersihan, "
            "melaporkan perubahan data kependudukan, dan menghormati hak sesama warga. Dengan memahami "
            "dan menjalankan hak dan kewajiban dengan seimbang, kita bersama-sama membangun RT yang "
            "harmonis dan sejahtera."
        ),
    ),
    (
        "Acara Syukuran Warga Baru di RT Kita",
        (
            "RT kami dengan hangat menyambut keluarga baru yang baru saja pindah ke lingkungan kita. "
            "Sebagai bentuk sambutan dan perkenalan, pengurus RT bersama seluruh warga akan mengadakan "
            "acara syukuran dan perkenalan yang dilaksanakan di balai RT pada Sabtu sore mendatang. "
            "Warga baru dipersilakan memperkenalkan diri kepada tetangga-tetangga sekitar dan mengisi "
            "formulir data penduduk yang akan diproses oleh sekretariat RT. Acara ini juga menjadi "
            "kesempatan bagi seluruh warga untuk saling mengenal dan mempererat hubungan bertetangga. "
            "Konsumsi ringan akan disediakan. Kehadiran seluruh warga sangat diharapkan untuk menciptakan "
            "suasana penyambutan yang hangat dan bersahabat."
        ),
    ),
]


def _build_keuangan_data() -> list[tuple[date, str, str, str, int]]:
    rows: list[tuple[date, str, str, str, int]] = []
    base_date = date(2026, 1, 3)
    income_categories = ["Iuran Bulanan", "Donasi Warga", "Kas Sosial", "Sumbangan Acara"]
    expense_categories = ["Kebersihan", "Keamanan", "Perawatan Fasilitas", "Kegiatan Warga"]

    for idx in range(20):
        jenis = "pemasukan" if idx % 3 != 2 else "pengeluaran"
        kategori = income_categories[idx % len(income_categories)] if jenis == "pemasukan" else expense_categories[idx % len(expense_categories)]
        keterangan = f"Seed keuangan Smart-RT #{idx + 1:02d}"
        jumlah = 150000 + (idx * 25000)
        rows.append((base_date + timedelta(days=idx * 2), jenis, kategori, keterangan, jumlah))

    return rows


def _build_iuran_data() -> list[tuple[str, str, int, str, date | None, str | None, str]]:
    rows: list[tuple[str, str, int, str, date | None, str | None, str]] = []

    for idx in range(40):
        kk_idx = idx % len(KK_DATA)
        no_kk = KK_DATA[kk_idx][0]
        
        # Spread across 2026 and 2027
        year = 2026 if idx < 20 else 2027
        bulan = f"{year}-{(idx % 12) + 1:02d}"
        
        jumlah = 50000 + ((idx % 4) * 10000)
        status = "lunas" if idx % 3 != 0 else "belum_lunas"
        tanggal_bayar = date(year, (idx % 12) + 1, min(27, 10 + (idx % 10))) if status == "lunas" else None
        metode = "transfer" if status == "lunas" and idx % 2 == 0 else ("tunai" if status == "lunas" else None)
        keterangan = f"Seed iuran Smart-RT #{idx + 1:02d}"
        rows.append((no_kk, bulan, jumlah, status, tanggal_bayar, metode, keterangan))

    return rows


def _build_jadwal_data() -> list[tuple[str, datetime, str, str, str, str]]:
    rows: list[tuple[str, datetime, str, str, str, str]] = []
    base_dt = datetime(2026, 3, 1, 19, 0, 0)
    kegiatan_names = [
        "Ronda Malam",
        "Kerja Bakti",
        "Rapat Pengurus",
        "Posyandu",
        "Pengajian Rutin",
        "Senam Warga",
    ]
    lokasi_list = ["Balai RT", "Pos Ronda", "Lapangan RT", "Mushola RT", "Area Taman"]
    status_cycle = ["terjadwal", "berlangsung", "selesai", "dibatalkan"]

    for idx, (_nik, nama, *_rest) in enumerate(PENDUDUK_DATA[:20]):
        nama_kegiatan = f"{kegiatan_names[idx % len(kegiatan_names)]} #{idx + 1:02d}"
        tanggal_kegiatan = base_dt + timedelta(days=idx * 2, hours=idx % 3)
        lokasi = lokasi_list[idx % len(lokasi_list)]
        penanggung_jawab = nama
        keterangan = f"Seed jadwal Smart-RT #{idx + 1:02d}"
        status = status_cycle[idx % len(status_cycle)]
        rows.append((nama_kegiatan, tanggal_kegiatan, lokasi, penanggung_jawab, keterangan, status))

    return rows


KEUANGAN_DATA = _build_keuangan_data()
IURAN_DATA = _build_iuran_data()
JADWAL_DATA = _build_jadwal_data()


async def seed():
    print("=" * 60)
    print("Smart-RT Database Seeder")
    print(f"Database: {settings.DATABASE_URL.split('@')[-1]}")  # hide credentials
    print("=" * 60)

    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=False,
    )
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with Session() as session:
        async def table_count(table_name: str) -> int:
            result = await session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return int(result.scalar() or 0)

        # ── 1. Seed data_penduduk ──────────────────────────────────────────
        print("\n[1/6] Seeding data_penduduk ...")
        inserted_penduduk = 0
        skipped_penduduk = 0

        for nik, nama, alamat, pekerjaan, status in PENDUDUK_DATA:
            result = await session.execute(
                text("SELECT id FROM data_penduduk WHERE nik = :nik"),
                {"nik": nik},
            )
            if result.fetchone():
                skipped_penduduk += 1
                continue

            await session.execute(
                text(
                    "INSERT INTO data_penduduk (nik, nama_lengkap, alamat, pekerjaan, status) "
                    "VALUES (:nik, :nama, :alamat, :pekerjaan, :status)"
                ),
                {
                    "nik": nik,
                    "nama": nama,
                    "alamat": alamat,
                    "pekerjaan": pekerjaan,
                    "status": status,
                },
            )
            inserted_penduduk += 1

        await session.commit()
        print(f"  data_penduduk: {inserted_penduduk} inserted, {skipped_penduduk} skipped.")

        # ── 2. Seed data_kartu_keluarga ───────────────────────────────────
        print("\n[2/6] Seeding data_kartu_keluarga ...")
        inserted_kk = 0
        skipped_kk = 0

        for idx, (no_kk, nik_ref, nama_kk, rt, rw, kelurahan, kecamatan, kabupaten, kodepos, status_warga, asal_kota) in enumerate(KK_DATA):
            res_nik = await session.execute(
                text("SELECT id FROM data_penduduk WHERE nik = :nik"),
                {"nik": nik_ref},
            )
            if not res_nik.fetchone():
                skipped_kk += 1
                continue

            result = await session.execute(
                text("SELECT id FROM data_kartu_keluarga WHERE no_kk = :no_kk"),
                {"no_kk": no_kk},
            )
            if result.fetchone():
                skipped_kk += 1
                continue

            alamat = PENDUDUK_DATA[idx][2]

            await session.execute(
                text(
                    "INSERT INTO data_kartu_keluarga "
                    "(no_kk, nik, nama_kepala_keluarga, alamat, rt, rw, "
                    " kelurahan, kecamatan, kabupaten, kodepos, status_warga, asal_kota) "
                    "VALUES (:no_kk, :nik, :nama_kk, :alamat, :rt, :rw, "
                    "        :kelurahan, :kecamatan, :kabupaten, :kodepos, :status_warga, :asal_kota)"
                ),
                {
                    "no_kk": no_kk,
                    "nik": nik_ref,
                    "nama_kk": nama_kk,
                    "alamat": alamat,
                    "rt": rt,
                    "rw": rw,
                    "kelurahan": kelurahan,
                    "kecamatan": kecamatan,
                    "kabupaten": kabupaten,
                    "kodepos": kodepos,
                    "status_warga": status_warga,
                    "asal_kota": asal_kota,
                },
            )
            inserted_kk += 1

        await session.commit()
        print(f"  data_kartu_keluarga: {inserted_kk} inserted, {skipped_kk} skipped.")

        # ── 3. Seed blogs ─────────────────────────────────────────────────
        print("\n[3/6] Seeding blogs ...")
        inserted_blogs = 0
        skipped_blogs = 0

        for title, content in BLOG_DATA:
            result = await session.execute(
                text("SELECT id FROM blogs WHERE title = :title"),
                {"title": title},
            )
            if result.fetchone():
                skipped_blogs += 1
                continue

            await session.execute(
                text(
                    "INSERT INTO blogs (title, content, created_by) "
                    "VALUES (:title, :content, :created_by)"
                ),
                {
                    "title": title,
                    "content": content,
                    "created_by": "System",
                },
            )
            inserted_blogs += 1

        await session.commit()
        print(f"  blogs: {inserted_blogs} inserted, {skipped_blogs} skipped.")

        # ── 4. Top-up keuangan_rt to minimum 20 ───────────────────────────
        print("\n[4/6] Seeding keuangan_rt ...")
        current_keuangan = await table_count("keuangan_rt")
        needed_keuangan = max(0, 20 - current_keuangan)

        for tanggal, jenis, kategori, keterangan, jumlah in KEUANGAN_DATA[:needed_keuangan]:
            await session.execute(
                text(
                    "INSERT INTO keuangan_rt (tanggal, jenis, kategori, keterangan, jumlah) "
                    "VALUES (:tanggal, :jenis, :kategori, :keterangan, :jumlah)"
                ),
                {
                    "tanggal": tanggal,
                    "jenis": jenis,
                    "kategori": kategori,
                    "keterangan": keterangan,
                    "jumlah": jumlah,
                },
            )

        await session.commit()
        print(f"  keuangan_rt: {needed_keuangan} inserted, {max(0, len(KEUANGAN_DATA) - needed_keuangan)} prepared rows unused.")

        # ── 5. Top-up iuran_warga to minimum 40 ───────────────────────────
        print("\n[5/6] Seeding iuran_warga ...")
        inserted_iuran = 0
        skipped_iuran = 0

        for no_kk, bulan, jumlah, status_pembayaran, tanggal_bayar, metode_pembayaran, keterangan in IURAN_DATA:
            result = await session.execute(
                text("SELECT id FROM iuran_warga WHERE no_kk = :no_kk AND bulan = :bulan"),
                {"no_kk": no_kk, "bulan": bulan},
            )
            if result.fetchone():
                skipped_iuran += 1
                continue

            await session.execute(
                text(
                    "INSERT INTO iuran_warga "
                    "(no_kk, bulan, jumlah, status_pembayaran, tanggal_bayar, metode_pembayaran, keterangan) "
                    "VALUES (:no_kk, :bulan, :jumlah, :status_pembayaran, :tanggal_bayar, :metode_pembayaran, :keterangan)"
                ),
                {
                    "no_kk": no_kk,
                    "bulan": bulan,
                    "jumlah": jumlah,
                    "status_pembayaran": status_pembayaran,
                    "tanggal_bayar": tanggal_bayar,
                    "metode_pembayaran": metode_pembayaran,
                    "keterangan": keterangan,
                },
            )
            inserted_iuran += 1

        await session.commit()
        print(f"  iuran_warga: {inserted_iuran} inserted, {skipped_iuran} skipped.")

        # ── 6. Top-up jadwal_kegiatan to minimum 20 ───────────────────────
        print("\n[6/6] Seeding jadwal_kegiatan ...")
        current_jadwal = await table_count("jadwal_kegiatan")
        needed_jadwal = max(0, 20 - current_jadwal)

        for nama_kegiatan, tanggal_kegiatan, lokasi, penanggung_jawab, keterangan, status in JADWAL_DATA[:needed_jadwal]:
            await session.execute(
                text(
                    "INSERT INTO jadwal_kegiatan "
                    "(nama_kegiatan, tanggal_kegiatan, lokasi, penanggung_jawab, keterangan, status) "
                    "VALUES (:nama_kegiatan, :tanggal_kegiatan, :lokasi, :penanggung_jawab, :keterangan, :status)"
                ),
                {
                    "nama_kegiatan": nama_kegiatan,
                    "tanggal_kegiatan": tanggal_kegiatan,
                    "lokasi": lokasi,
                    "penanggung_jawab": penanggung_jawab,
                    "keterangan": keterangan,
                    "status": status,
                },
            )

        await session.commit()
        print(f"  jadwal_kegiatan: {needed_jadwal} inserted, {max(0, len(JADWAL_DATA) - needed_jadwal)} prepared rows unused.")

        # ── Verification counts ────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("VERIFICATION")
        print("=" * 60)

        count_penduduk = await table_count("data_penduduk")
        count_kk = await table_count("data_kartu_keluarga")
        count_blogs = await table_count("blogs")
        count_keuangan = await table_count("keuangan_rt")
        count_iuran = await table_count("iuran_warga")
        count_jadwal = await table_count("jadwal_kegiatan")

        print(f"  data_penduduk       : {count_penduduk:>4} records")
        print(f"  data_kartu_keluarga : {count_kk:>4} records")
        print(f"  blogs               : {count_blogs:>4} records")
        print(f"  keuangan_rt         : {count_keuangan:>4} records")
        print(f"  iuran_warga         : {count_iuran:>4} records")
        print(f"  jadwal_kegiatan     : {count_jadwal:>4} records")

        target_met = all(
            count >= (40 if table == "iuran_warga" else 20)
            for table, count in [
                ("data_penduduk", count_penduduk),
                ("data_kartu_keluarga", count_kk),
                ("blogs", count_blogs),
                ("keuangan_rt", count_keuangan),
                ("iuran_warga", count_iuran),
                ("jadwal_kegiatan", count_jadwal),
            ]
        )
        print(
            "\n  Status:",
            "✅ PASS — all six tables have >= 20 records."
            if target_met
            else "❌ FAIL — one or more tables have < 20 records.",
        )

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
