# Absensi-TNK-61

Sistem presensi piket harian mahasiswa Teknologi dan Manajemen Ternak SV IPB Angkatan 61.

```bash
npm install
npm run dev
```

Dokumen acuan: `SPESIFIKASI_FUNGSI.md` (aturan main + daftar fitur) dan
`RIWAYAT_PERUBAHAN.md` (riwayat per commit).

## Setup backend (belum disambung)

Aplikasi ini mengirim data ke Google Apps Script. Sebelum dipakai sungguhan:

1. Buat Google Spreadsheet dengan tab `DataAbsen`, header baris 1 persis:
   `Timestamp | Nama Mahasiswa | NIM | Waktu Piket | Lokasi | Status | Catatan | URL Foto`
2. Buka `Extensions > Apps Script`, tempel `Code.gs`.
3. Ganti `FOLDER_ID` di `Code.gs` dengan ID folder Google Drive milik angkatan 61.
4. Jalankan fungsi `testDriveAuth()` sekali dari editor untuk memicu izin akses Drive.
5. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
6. Salin URL `/exec`, tempel ke `GAS_WEBHOOK_URL` di `app/page.tsx`.
7. Isi `NEXT_PUBLIC_ADMIN_PIN` di `.env.local`.

## Verifikasi

```bash
npm run lint
npm run build
```

Tes kamera butuh HTTPS atau `localhost`. Dari HP lewat IP lokal (`npm run dev -- -H 0.0.0.0`)
`getUserMedia` tidak akan aktif — deploy ke Vercel untuk tes kamera.