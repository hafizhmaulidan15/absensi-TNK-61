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
tempel seluruh isi `Code.gs` project ini, lalu **Save**.

**Langkah 3 — tes dulu sebelum deploy**

Pilih fungsi **`testSetup`** di dropdown fungsi atas, klik **Run**. Muncul pop-up
yang mengecek satu per satu:

- Spreadsheet ketemu atau tidak
- Tab `data_absen61` ada atau tidak
- Header 9 kolom sudah sesuai atau belum
- Folder Drive bisa diakses atau tidak

Kalau ada yang salah, perbaiki dulu sebelum lanjut. Jangan sampai data masuk ke
tempat yang keliru.

**Langkah 4 — folder Drive (opsional)**

Kalau mau foto bukti ikut tersimpan ke Drive, buat folder lalu salin ID-nya dari
URL `https://drive.google.com/drive/folders/<FOLDER_ID>` — ambil **hanya** bagian
ID, tanpa `?usp=sharing`. Tempel ke `FOLDER_ID` di `Code.gs`.

Kalau `FOLDER_ID` dibiarkan kosong, upload dilewati tapi **Referensi Foto tetap
terisi**. Ini pilihan yang wajar: kolom Referensi Foto sudah cukup untuk
mencocokkan bukti dengan foto di perangkat.

**Langkah 5 — deploy**

**Deploy > New deployment > Web app**:
- Execute as: **Me**
- Who has access: **Anyone**

Salin URL yang berakhiran `/exec`.

**Langkah 6 — sambungkan ke aplikasi**

Set `NEXT_PUBLIC_GAS_WEBHOOK_URL` ke URL `/exec` tadi, di `.env.local` untuk
lokal atau di panel environmentVariable untuk hosting.

Kalau nanti diubah kode `Code.gs`: **Deploy > Manage deployments > ikon pensil >
New version > Deploy**. URL `/exec` sendiri tidak berubah.

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

Logika `Code.gs` sendiri bisa diuji tanpa Google sama sekali:

```bash
npm run test:gas           # 13 tes dengan stub API Apps Script
```

### Verifikasi

```bash
npm run lint
npm run build
npm run test:gas      # 13 tes logika Code.gs tanpa perlu Google
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

Tidak perlu `npm run build` manual — Vercel yang handle.

**Soal kamera:** `getUserMedia` hanya aktif di HTTPS atau `localhost`. Di
localhost_select `npm run dev`, dari HP lewat IP lokal (`npm run dev -- -H 0.0.0.0`)
kamera **tidak akan hidup** karena HTTP bukan secure context. Setelah online di
domain HTTPS, kamera otomatis nyala.