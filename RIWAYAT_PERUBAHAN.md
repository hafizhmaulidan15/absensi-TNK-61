# Riwayat Perubahan Project — Absensi Piket TNK 61

Semua perubahan dari commit pertama sampai commit terakhir, dikelompokkan per tujuan.

Project TNK 61 dibangun dengan cara yang sama seperti TNK 62: mulai dari ekspor AI Studio, lalu dibersihkan. Yang **tidak** ikut adalah backend Google Sheets/Drive — TNK 61 punya sheet, folder Drive, dan PIN sendiri.

Repo lokal sudah `git init`; belum ada remote.

---

## Commit 1 — "first commit"

Inisialisasi repo dengan `README.md` saja.

---

## Commit 2 — "Add full project source, exclude secrets via .gitignore"

Memasukkan seluruh source Next.js beserta konfigurasi build.

### Hygiene project

- `package.json` — nama `ai-studio-applet` → `presensi-piket-tnk61`
- Dep tidak terpakai dibuang: `@google/genai`, `@hookform/resolvers`, `class-variance-authority`, `clsx`, `motion`, `firebase-tools`, `@tailwindcss/typography`, `tailwind-merge`
- `next.config.ts` — buang `remotePatterns` picsum.photos & logika HMR AI Studio
- `next.config.ts` — hapus `eslint.ignoreDuringBuilds: true` agar lint ikut berjalan saat build
- File yang tidak dipakai dibuang: `hooks/use-mobile.ts`, `lib/utils.ts`, `metadata.json`, `components/GasConfigModal.tsx`
- Aset gambar yang tidak dirujuk kode dibuang: `public/images/hero_disekolahku_presensi.jpg` dan `src/assets/images/hero_disekolahku_presensi_1791185353193.jpg` (duplikat, ~1,8 MB, nol referensi di seluruh `.tsx`)
- `.gitignore` — tambahkan `tsconfig.tsbuildinfo`
- `app/icon.svg` — favicon baru, menghilangkan 404 `favicon.ico`; `app/layout.tsx` mendaftarkannya lewat `icons`

### Bug & keamanan

- `app/layout.tsx` — `lang="en"` → `lang="id"`
- `components/AdminDashboard.tsx` — PIN `TNK61SVIPB` dipindah ke `process.env.NEXT_PUBLIC_ADMIN_PIN`, fallback `'TNK61SVIPB'`
- `components/Navbar.tsx` — logo dari `<div onClick>` jadi `<button>` (bisa diakses keyboard)

### Anti-slop (kriteria tidak boleh generik / palsu)

- Gradien `bg-gradient-to-r from-[#003882] to-[#0047BA]` diganti solid `bg-blue-800` di 6 file komponen
- `components/Navbar.tsx` — hapus gradien logo
- `components/HeroBanner.tsx` — hapus headline gradien; "Kamera & Galeri" → "Langsung dari Kamera"; "Bisa sinkron ke Drive" → "Tersimpan di Perangkat" (sampai backend disambung, klaim sinkron Drive belum benar)
- `components/GuidanceModal.tsx` — "Jaminan Privasi & Integritas Data" → "Catatan Keamanan Data" yang jujur; dot hijau "online" jadi abu saat offline
- `components/StudentForm.tsx` — "terverifikasi di sistem" → "terimpan di sistem"
- Placeholder nama/NIM diganti generik (`Nama lengkap sesuai Kartu Tanda Mahasiswa`, `J0301xxxxxxxx`) supaya tidak ada data mahasiswa karangan di kode
- `lib/sampleData.ts` — `INITIAL_RECORDS` jadi array kosong, `INITIAL_STUDENT_NAMES` dihapus; status `Toleransi` fiktif → `Terlambat`; timestamp UTC diselaraskan ke jam WIB

### Perbaikan logika

- `lib/timeUtils.ts` — tambah `formatWIBDate()` (sebelumnya tanggal pakai zona perangkat)
- `app/page.tsx` — auto pilih shift pakai WIB, bukan jam lokal; `GAS_URL` dari `localStorage` jadi konstanta; localStorage terima array kosong (sebelumnya data yang dihapus muncul lagi setelah reload)
- `components/StudentForm.tsx` — hapus NIM palsu random; `verified` default `false`; `syncedToDrive` hanya `true` setelah fetch berhasil; tambah `AbortController` timeout 15 detik; hapus header `Content-Type: application/json` (di-strip oleh `no-cors`)
- `components/AdminDashboard.tsx` — `loadFromSheet()` baca GAS `doGet` begitu admin login, `records` (localStorage) jadi cadangan; `isViewablePhoto()` hanya render `<img>` untuk `data:image/` atau `http(s)`, nilai `[FILE] ...` ditampilkan sebagai ikon kamera; filter 7 hari pakai zona Jakarta & tolak tanggal masa depan; input manual pakai WIB; escape CSV semua kolom; label "Excel" → "CSV"; "Terakhir diperbarui: Realtime" → teks jujur

### Kunci jam shift

`lib/timeUtils.ts` — tiap shift punya jendela pengisian sendiri. Di luar jendela, kartu shift menampilkan **Terkunci** dan tombol kirim nonaktif.

| Shift | Jendela Pengisian |
| :--- | :--- |
| Pagi | 06.00 – 11.59 |
| Siang | 12.00 – 15.59 |
| Sore | 16.00 – 21.00 |

Toleransi tepat waktu 10 menit (`06.30` → `06.40`, `12.00` → `12.10`, `16.00` → `16.10`). Lewat toleransi tapi masih dalam jendela tetap boleh kirim, statusnya `Terlambat`. Di luar semua jendela (21.00 – 06.00) tidak ada shift yang bisa diisi.

Tidak ada flag `NEXT_PUBLIC_UNLOCK_ALL` — mode testing dari proses TNK 62 tidak dibawa.

### Foto wajib dari kamera

- `components/StudentForm.tsx` — hapus seluruh `handleFileUpload`, input `<input type="file">`, tampilan "Unggah File", dan switcher mode Galeri vs Kamera
- Kamera auto-start saat form dibuka; `startCamera` / `stopCamera` dibungkus `useCallback` agar cleanup stabil
- `components/HeroBanner.tsx` — badge `Terkunci` pakai ikon Lock + abu; `Terlambat` pakai AlertTriangle amber

**Alasan:** tiap sesi wajib punya bukti foto saat piket, jadi bukti lama dari galeri tidak bisa dipakai.

### Lokasi

`types/attendance.ts` — `UnitLocation` = `Kandang Itik` / `Kandang Puyuh` / `Penelitian`. Dropdown di `StudentForm.tsx` dan `AdminDashboard.tsx` disesuaikan.

### Badge status `Terkunci` / `Terlambat`

`components/HeroBanner.tsx` dan `components/StudentForm.tsx` — kartu shift menampilkan label status yang jujur (`Belum Masuk Jam` / `Tepat Waktu` / `Terlambat` / `Terkunci`) dengan warna yang sesuai, bukan selalu hijau.

### Bug animasi/responsive

- `app/globals.css` — definisikan `--breakpoint-xs: 30rem` dan `--animate-fade-in` (sebelumnya kelas `xs:` dan `animate-fade-in` tidak generates apa-apa)
- `components/HeroBanner.tsx` — chip Distribusi Sesi diberi `flex-wrap` (sebelumnya melenceng di layar sempit)

### SOP studentship written ulang

`components/GuidanceModal.tsx` ditulis ulang jadi 4 section:

1. **Jadwal Sesi Piket & Toleransi Waktu** — jendela per shift + "Toleransi tepat waktu: maks 10 menit"
2. **SOP Pakaian & APD** — WP Praktikum + sepatu boots
3. **SOP Dokumentasi Foto** — timestamp/map cam
4. **Kontak bantuan** — PC Riswidaressi untuk kendala dan konfirmasi

### Watermark foto

`components/StudentForm.tsx` — baris biru tua berisi `TNK 61 IPB · PIKET <shift> WIB` dan baris kedua `nama | tanggal jam WIB`. Keluaran `data:image/jpeg;base64,...` kualitas 0.85.

---

## Commit 3 — "Tambah backend Apps Script (Code.gs) dan template env"

- `Code.gs` — `doPost` (termasuk `action: 'submitManualAttendance'` yang menambah akhiran `[INPUT MANUAL]` ke kolom Catatan), `doGet`, `testDriveAuth()`, `jsonResponse_()`
- `Code.gs` — `FOLDER_ID` masih placeholder `GANTI_DENGAN_ID_FOLDER_DRIVE_TNK_61`; `SHEET_NAME = 'DataAbsen'`
- `Code.gs` — nama file foto dihitung sekali di luar blok `try` agar fallback `[FILE] ...` memakai nama yang sama dengan file yang akan diunggah
- `.env.example` — dokumentasi `NEXT_PUBLIC_ADMIN_PIN`

**PENTING:** `.env.local` (isi `NEXT_PUBLIC_ADMIN_PIN=TNK61SVIPB`) ada di disk tapi tidak masuk repo karena `.gitignore` meng-exclude `.env*`.

**Backend belum disambung.** `GAS_WEBHOOK_URL` di `app/page.tsx` bernilai `''` dengan komentar TODO. Officer sudah menambahkan penangan kosong di dua tempat supaya tidak ada klaim palsu:

| Lokasi | Perilaku saat URL kosong |
| :--- | :--- |
| `StudentForm` submit | Data tetap tersimpan di `localStorage` browser itu, kartu hasil menulis "Tersimpan di Sistem Presensi" |
| `AdminDashboard` tombol Segarkan | Tidak memanggil `fetch`, tampil pesan backend belum terhubung |
| `AdminDashboard` input manual | **Ditolak** dengan pesan error — sengaja tidak diam-diam disimpan lokal supaya admin tidak mengira data sudah masuk spreadsheet |

---

## Commit 4 — "Dokumentasi TNK 61: spesifikasi fungsi & riwayat perubahan"

- `SPESIFIKASI_FUNGSI.md` — dokumen resmi TNK 61 (identitas, arsitektur, ketentuan, fungsi, struktur data, setup backend, batasan)
- `RIWAYAT_PERUBAHAN.md` — dokumen ini

Keduanya menandai dengan jelas bahwa backend **belum disambung**.

---

## Ringkasan Masalah Besar yang Pernah Muncul

| Masalah | Penyebab | Solusi |
| :--- | :--- | :--- |
| Data tidak masuk spreadsheet | URL GAS tidak tersimpan di browser pengaju | URL di-hardcode di `app/page.tsx` |
| Data tidak muncul di admin | Admin hanya baca localStorage | Admin baca `doGet` dari Apps Script |
| `Akses ditolak: DriveApp` | Google blokir `DriveApp` untuk web app anonim | Fallback: tulis referensi `[FILE] Nama_Timestamp` |
| `ID file atau folder tidak valid: ...?hl` | `FOLDER_ID` ikut berisi `?hl` atau `?usp=sharing` | Isi hanya ID-nya |
| `Akses ditolak: DriveApp` setelah `FOLDER_ID` diperbaiki | Otorisasi Drive belum di-deploy dengan versi baru | Jalankan `testDriveAuth()` di editor, lalu deploy versi baru |
| Login PIN selalu gagal di hosting | `NEXT_PUBLIC_ADMIN_PIN` belum diset | PIN dapat fallback hardcoded |
| `animate-fade-in` & `xs:` tidak berfungsi | Token belum didefinisikan di Tailwind v4 | Definisi `@theme` di `globals.css` |
| 404 `favicon.ico` | Tidak ada favicon | `app/icon.svg` |
| Chip Distribusi Sesi melenceng | Flex container tanpa wrap | `flex-wrap` |
| Kelas `Upload` tak terpakai | Sisa upload galeri | Import dibersihkan |
| Teks "sinkron ke Drive" padahal belum ada backend | Klaim rodar sebelum backend disambung | Teks diganti jadi "Tersimpan di Perangkat" |
| Foto lama bisa dipakai sebagai bukti | Upload dari galeri masih dibolehkan | Alur galeri dihapus total |

---

## Yang Belum Dikerjakan

Backend TNK 61 belum ada. Supaya aplikasi benar-benar berfungsi:

1. Buat Google Spreadsheet dengan tab `DataAbsen` (header persis seperti §6.1 di `SPESIFIKASI_FUNGSI.md`)
2. Tempel `Code.gs` ke Apps Script spreadsheet tersebut
3. Ganti `FOLDER_ID` di `Code.gs` dengan ID folder Drive angkatan 61
4. Jalankan `testDriveAuth()` sekali dari editor
5. Deploy web app (Execute as: Saya, Who has access: Siapa saja)
6. Tempel URL `/exec` ke `GAS_WEBHOOK_URL` di `app/page.tsx`
7. Deploy ke hosting HTTPS, lalu tes kamera dan submit end-to-end

## Verifikasi yang Sudah Dijalankan

| Perintah | Hasil |
| :--- | :--- |
| `npm run lint` | Lolos, tanpa error |
| `npm run build` | Lolos, 5/5 halaman static, TypeScript strict aktif |

Tes kamera dan submit end-to-end **belum** bisa diverifikasi dari sini: butuh browser (Playwright/Chromium) dan backend aktif. `getUserMedia` juga butuh HTTPS atau `localhost`.