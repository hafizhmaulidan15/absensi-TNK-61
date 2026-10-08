# Absensi-TNK-61

Sistem presensi piket harian mahasiswa Teknologi dan Manajemen Ternak SV IPB Angkatan 61.

```bash
npm install
npm run dev
```

Dokumen acuan: `SPESIFIKASI_FUNGSI.md` (aturan main + daftar fitur) dan
`RIWAYAT_PERUBAHAN.md` (riwayat per commit).

## Yang perlu diisi lu (2 nilai)

Aplikasi **sudah berfungsi penuh di sisi browser** — kamera, watermark, validasi, kunci jam, panel admin. Yang belum ada hanya backend Google, karena butuh akun Google lu.

| # | Nilai | Ditaruh di | Status sekarang |
| :-- | :--- | :--- | :--- |
| 1 | URL `/exec` deployment Apps Script | env `NEXT_PUBLIC_GAS_WEBHOOK_URL` | kosong |
| 2 | PIN admin (opsional) | env `NEXT_PUBLIC_ADMIN_PIN` | `TNK61SVIPB` (sudah jalan) |

**Tidak ada lagi yang perlu diganti di dalam kode.** Nama tab spreadsheet sudah
disetel ke `data_absen61` di `Code.gs`. `SPREADSHEET_ID` biarkan kosong kalau
script-nya dibuka dari Extensions > Apps Script milik spreadsheet lu.

Tidak ada API key lain. Tidak ada layanan pihak ketiga. Tidak ada telemetry.

### Yang terjadi selama backend kosong

Sistem sengaja **tidak berpura-pura**. Selama `NEXT_PUBLIC_GAS_WEBHOOK_URL` kosong:

- **Submit mahasiswa** tetap berhasil, data tersimpan di `localStorage` browser itu saja, dan kartu hasil menulis "Tersimpan di perangkat ini".
- **Input manual admin ditolak** dengan pesan error, supaya admin tidak mengira datanya sudah masuk spreadsheet.
- **Tombol Segarkan** di panel admin menampilkan banner bahwa backend belum terhubung, tanpa memanggil API.

### Setup backend

**Langkah 1 — siapkan spreadsheet**

Buat Google Spreadsheet baru, lalu klik kanan tab di bawah > **Rename** dan ketik
persis `data_absen61`.

Baris 1 akan diisi otomatis oleh script saat `testSetup()` dijalankan. Kalau lu
lebih suka mengisinya manual, urutannya harus seperti ini:

| A | B | C | D | E | F | G | H | I |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Timestamp | Nama Mahasiswa | NIM | Divisi Piket | Waktu Piket | Lokasi | Status | Catatan | Referensi Foto |

Baris 1 adalah header — `doGet` melewatinya, jadi kalau isinya bukan header,
baris data pertamanya akan hilang saat dashboard membaca.

**Langkah 2 — pasang Code.gs**

Dari spreadsheet itu: **Extensions > Apps Script**, hapus isi `Code.gs` bawaan,
tempel isi `Code.gs` milik lu, lalu **Save**.

> `Code.gs` **tidak ikut ter-push ke repo** — file itu berisi `SPREADSHEET_ID`
> angkatan lu, jadi disimpan lokal saja (lihat `.gitignore`). Ambil dari salinan
> lokal/lu punya, bukan dari GitHub.

**Langkah 3 — tes dulu sebelum deploy**

Pilih fungsi **`testSetup`** di dropdown fungsi atas, klik **Run**. Muncul pop-up
yang mengecek satu per satu:

- Spreadsheet ketemu atau tidak
- Tab `data_absen61` ada atau tidak
- Header 9 kolom sudah sesuai atau belum
- Mode bound atau standalone

Kalau ada yang salah, perbaiki dulu sebelum lanjut. Jangan sampai data masuk ke
tempat yang keliru.

Tidak ada cek folder Drive lagi, karena script ini tidak menyentuh Drive sama
sekali. Bukti foto disimpan sebagai referensi nama file saja.

**Langkah 4 — (tidak ada langkah Drive)**

Dulu ada langkah membuat folder Drive. Sekarang tidak berlaku: `Code.gs` tidak
punya `DriveApp` maupun `FOLDER_ID`, jadi tidak ada yang perlu disiapkan di
Drive.

Konsekuensinya, deployment ini hanya butuh **satu** izin: akses spreadsheet.
Kolom Referensi Foto berisi nama file seperti
`[FILE] Siti_Nurhaliza_06.30_063012.jpg`, bukan tautan. Kalau butuh bukti
gambarnya, foto asli ada di perangkat masing-masing mahasiswa.

Satu hal yang perlu disetel: **Script Property**. Kalau `Code.gs` lu dibuka dari
Extensions > Apps Script milik spreadsheet itu, tidak perlu apa pun — script
otomatis tahu spreadsheet mana. Tapi kalau script-nya berdiri sendiri:

`Project Settings > Script Properties > Add script property`
- nama: `SPREADSHEET_ID`
- nilai: ID dari URL `https://docs.google.com/spreadsheets/d/<ID>/edit`

**ID-nya sudah terisi di `Code.gs` lokal.** Kalau spreadsheet lu diganti, edit
`var SPREADSHEET_ID` di bagian KONFIGURASI atas, atau isi Script Property dengan
nama yang sama — Script Property dibaca lebih dulu, jadi tidak perlu edit kode.

> Catatan: `Code.gs` sengaja **tidak** ada di repo publik, jadi ID spreadsheet lu
> tidak ikut terpublikasi di GitHub. ID spreadsheet sendiri bukan rahasia seperti
> password, tapi mendingan memang tidak dibagikan.

**Langkah 5 — deploy**

**Deploy > New deployment > Web app**:
- Execute as: **Me**
- Who has access: **Anyone**

Salin URL yang berakhiran `/exec`.

**Langkah 6 — sambungkan ke aplikasi**

Set `NEXT_PUBLIC_GAS_WEBHOOK_URL` ke URL `/exec` tadi. Lokalnya di `.env.local`,
untuk hosting di panel environment variable.

Kalau nanti diubah kode `Code.gs`: **Deploy > Manage deployments > ikon pensil >
New version > Deploy**. URL `/exec` sendiri tidak berubah.

> **Penting soal Vercel.** Prefix `NEXT_PUBLIC_` berarti Next.js menyalin nilainya
> ke dalam JS yang dikirim ke browser **saat build**, bukan saat runtime. Jadi kalau
> env baru ditambahkan lalu halamannya di-refresh saja, tidak akan berubah — harus
> **build ulang / redeploy**. Panel admin akan tetap nulis
> "Sumber data: local (spreadsheet belum terhubung)" kalau build-nya dilakukan
> tanpa env tersebut.

### Kalau mau ganti PIN

`NEXT_PUBLIC_ADMIN_PIN` di env. Tapi PIN dicek di sisi klien, jadi nilainya ikut
terbaca di bundle JS — siapa pun yang Inspect Element bisa membacanya. Untuk data
sensitif, autentikasi harus pindah ke server (route handler + session).

## Tes tanpa Google

Untuk developing frontend tanpa menunggu backend:

```bash
node tools/mock-gas.js     # server lokal yang meniru kontrak Code.gs
```

Lalu set `.env.local`:

```
NEXT_PUBLIC_GAS_WEBHOOK_URL=http://localhost:8787/exec
```

Endpoint bantu: `POST /seed` isi 3 data contoh, `POST /reset` kosongkan.

Logika `Code.gs` sendiri bisa diuji tanpa Google sama sekali, selama file
`Code.gs` ada di folder root (file lokal, tidak ikut repo):

```bash
npm run test:gas           # 30 tes dengan stub API Apps Script
```

Kalau `Code.gs` tidak ada, tes ini gagal baca file — itu memang disengaja,
bukan bug.

### Verifikasi

```bash
npm run lint
npm run build
npm run test:gas      # 30 tes logika Code.gs (butuh Code.gs lokal)
```

## Deploy online

Aplikasi ini statis dan bisa di-host di mana saja (Vercel, Netlify, hosting
coba-gratis). Yang perlu:

1. Push repo ini ke GitHub.
2. Import di Vercel (repo terdeteksi otomatis, framework Next.js).
3. **Set environment variable** di Settings > Environment Variables:

   | Nama | Nilai |
   | :--- | :--- |
   | `NEXT_PUBLIC_GAS_WEBHOOK_URL` | URL `/exec` dari Code.gs |
   | `NEXT_PUBLIC_ADMIN_PIN` | PIN admin (boleh dikosongkan) |

4. Deploy.

Tidak perlu `npm run build` manual — Vercel yang handle. Tapi env **harus** sudah
terpasang sebelum deploy, karena `NEXT_PUBLIC_*` di-inline saat build.

**Menjalankan build produksi di lokal:**

```bash
npm run build
npm start          # http://localhost:3000
```

`npm start` memakai `next start` biasa, bukan mode standalone, supaya tidak
melempar warning dan tidak gagal start.

**Soal kamera:** `getUserMedia` hanya aktif di HTTPS atau `localhost`. Di
localhost_select `npm run dev`, dari HP lewat IP lokal (`npm run dev -- -H 0.0.0.0`)
kamera **tidak akan hidup** karena HTTP bukan secure context. Setelah online di
domain HTTPS, kamera otomatis nyala.