# Absensi-TNK-61

Sistem presensi piket harian mahasiswa Teknologi dan Manajemen Ternak SV IPB Angkatan 61.

```bash
npm install
npm run dev
```

Dokumen acuan: `SPESIFIKASI_FUNGSI.md` (aturan main + daftar fitur) dan
`RIWAYAT_PERUBAHAN.md` (riwayat per commit).

## Yang perlu diisi lu (3 nilai)

Aplikasi **sudah berfungsi penuh di sisi browser** — kamera, watermark, validasi, kunci jam, panel admin. Yang belum ada hanya backend Google, karena butuh akun Google lu.

| # | Nilai | Ditaruh di | Status sekarang |
| :-- | :--- | :--- | :--- |
| 1 | ID folder Google Drive | `Code.gs` baris 10, `FOLDER_ID` | `GANTI_DENGAN_ID_FOLDER_DRIVE_TNK_61` |
| 2 | URL `/exec` deployment Apps Script | `app/page.tsx` baris 19, `GAS_WEBHOOK_URL` | `''` (kosong) |
| 3 | PIN admin (opsional) | `.env.local`, `NEXT_PUBLIC_ADMIN_PIN` | `TNK61SVIPB` (sudah jalan) |

Tidak ada API key lain. Tidak ada layanan pihak ketiga. Tidak ada telemetry.

Kontrak payload sudah diverifikasi cocok dua arah: `StudentForm.tsx:245-254` mengirim 9 kunci, `Code.gs:24-33` membaca 9 kunci yang sama.

### Yang terjadi selama backend kosong

Sistem sengaja **tidak berpura-pura**. Selama `GAS_WEBHOOK_URL` kosong:

- **Submit mahasiswa** tetap berhasil, data tersimpan di `localStorage` browser itu saja, dan kartu hasil menulis "Tersimpan di perangkat ini".
- **Input manual admin ditolak** dengan pesan error, supaya admin tidak mengira datanya sudah masuk spreadsheet.
- **Tombol Segarkan** di panel admin menampilkan banner bahwa backend belum terhubung, tanpa memanggil API.

### Setup backend

1. Buat folder Google Drive baru untuk foto bukti piket, lalu salin ID-nya dari URL
   `https://drive.google.com/drive/folders/<FOLDER_ID>` — ambil **hanya** bagian ID, tanpa `?usp=sharing`.
2. Buat Google Spreadsheet, ganti nama tab pertama jadi `DataAbsen`, lalu isi **9 kolom** di baris 1 persis:

   | A | B | C | D | E | F | G | H | I |
   | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
   | Timestamp | Nama Mahasiswa | NIM | Divisi Piket | Waktu Piket | Lokasi | Status | Catatan | URL Foto |

   Baris 1 wajib header — `doGet` melewatinya, jadi kalau bukan header, baris data pertamanya akan hilang.
3. Dari spreadsheet itu: **Extensions > Apps Script**, hapus isi `Code.gs` bawaan, tempel `Code.gs` project ini.
4. Ganti `FOLDER_ID` di baris 10 dengan ID dari langkah 1, lalu **Save**.
5. Pilih fungsi `testDriveAuth()` di dropdown atas, klik **Run**, dan setujui permintaan izin. Ini wajib — tanpa itu upload foto akan gagal diam-diam.
6. **Deploy > New deployment > Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Salin URL yang berakhiran `/exec`, tempel ke `GAS_WEBHOOK_URL` di `app/page.tsx` baris 19.

Kalau nanti diubah kode `Code.gs`: **Deploy > Manage deployments > ikon pensil > New version > Deploy**. URL `/exec` sendiri tidak berubah.

### Kalau mau ganti PIN

`NEXT_PUBLIC_ADMIN_PIN` di `.env.local`. Tapi PIN dicek di sisi klien, jadi nilainya ikut terbaca di bundle JS — siapa pun yang Inspect Element bisa membacanya. Untuk data sensitif, autentikasi harus pindah ke server (route handler + session).

## Verifikasi

```bash
npm run lint
npm run build
```

Tes kamera butuh HTTPS atau `localhost`. Dari HP lewat IP lokal (`npm run dev -- -H 0.0.0.0`)
`getUserMedia` tidak akan aktif — deploy ke Vercel untuk tes kamera.