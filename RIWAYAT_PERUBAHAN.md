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
- Aset gambar dari ekspor AI Studio **dipertahankan**: `public/images/hero_disekolahku_presensi.jpg` dan `src/assets/images/hero_disekolahku_presensi_1791185353193.jpg` (duplikat ~1,8 MB, belum dirujuk kode — dipakai sebagai referensi visual layout AI Studio)
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

## Commit 4 — "Rombak layout ke portal 2 kolom dengan identitas visual resmi SV IPB"

Antarmuka dirombak total mengikuti rujukan visual `sv.ipb.ac.id/teknologi-dan-manajemen-ternak-2025/`.

### Palet & token warna

- `app/globals.css` — token `--color-ipb-blue: #003882`, `--color-ipb-blue-light: #0047BA`, `--color-ipb-orange: #F58220`, `--color-ipb-slate: #F8FAFC` di blok `@theme`
- `body` memakai `#F8FAFC`; kelas utilitas `.tabular-nums-clock` supaya angka jam tidak bergeser tiap detik
- Header, tombol, dan badge berganti dari biru Tailwind generik ke token IPB

### Komponen baru

- `components/CampusTopBar.tsx` — top bar resmi: `IPB UNIVERSITY │ SEKOLAH VOKASI · KAMPUS BOGOR`, lencana **Akreditasi A BAN-PT** dan **Sarjana Terapan D4**, garis aksen oranye di bawah
- `components/ShiftPicker.tsx` — widget waktu realtime WIB + tanggal Indonesia, dan pemilih shift interaktif dengan badge status `Buka` / `Sisa Waktu` / `Terlambat` / `Terkunci` plus sisa menit. Mengandung tombol cepat SOP oranye
- `components/AcademicProfileCard.tsx` — kartu profil SV IPB (akreditasi A, D4, bar 70% praktik lapangan, gelar S.Tr.Pt.) dan ringkasan 3 unit lokasi yang menyorot unit terpilih di form

### `components/HeroBanner.tsx` ditulis ulang

Hero akademis: kurikulum 70% praktik lapangan, gelar S.Tr.Pt., tiga unit commodity (Kandang Puyuh, Kandang Itik, Unit Penelitian), dan catatan rujukan sv.ipb.ac.id.

### `app/page.tsx` — layout 2 kolom

`grid lg:grid-cols-12`; kolom kiri `lg:col-span-5 xl:col-span-4` dengan `lg:sticky lg:top-24` (HeroBanner + ShiftPicker + AcademicProfileCard), kolom kanan `lg:col-span-7 xl:col-span-8` berisi StudentForm. Di mobile kedua kolom menyusun ke bawah.

State baru `selectedLocation` diteruskan ke form lewat prop `onLocationChange` supaya kartu ringkasan lokasi di kolom kiri menyorot unit yang sedang dipilih mahasiswa.

### `components/StudentForm.tsx` — 5 langkah bernomor

1. Identitas mahasiswa (nama + saran cepat nama, NIM)
2. Pilihan divisi piket (dropdown 6 divisi)
3. Kartu pilihan lokasi (tiga unit, tombol kartu)
4. Foto dokumentasi — **kamera langsung (disarankan) atau unggah file**
5. Deskripsi kegiatan piket lapangan

Header formulir biru resmi IPB dengan garis aksen oranye dan lencana shift aktif.

### Jalur unggah file dibuka kembali

`handleFileUpload` dipulihkan. Bedanya dari versi lama: berkas tidak disimpan mentah — gambar dimuat ke `Image`, lalu **dilewatkan `applyWatermark()` yang sama dengan kamera**. Fungsi watermark diekstrak supaya kamera dan unggahan menghasilkan keluaran identik.

Watermark sekarang dua baris sesuai format resmi:

```
SEKOLAH VOKASI IPB · TNK 61 · [LOKASI]
[nama] · [tanggal Indonesia] [HH:MM] WIB
```

dengan garis oranye `#F58220` di atas baris watermark.

### Toleransi seragam 10 menit

`lib/timeUtils.ts` — konstanta `TOLERANCE_MINUTES = 10` jadi satu sumber kebenaran; `closeMinute` tiap shift = jam shift + 10 menit (`06.40`, `12.10`, `16.10`). Label status: `Buka`, `Sisa Waktu`, `Terlambat`, `Terkunci`, dengan `ShiftAvailabilityLabel` sebagai union type.

### `components/Navbar.tsx` dan `components/GuidanceModal.tsx`

- Logo memakai `bg-ipb-blue` dengan garis bawah oranye; teks hover ke token IPB
- Jam navbar memakai `tabular-nums`
- Modal SOP: header biru IPB + aksen oranye, toleransi dari `TOLERANCE_MINUTES`, section foto hanya kamera

---

## Commit 5 — "Tambah kolom Divisi Piket di spreadsheet dan panel admin"

### `types/attendance.ts`

Tipe baru `PiketDivision` berisi 6 nilai, dan field `division: PiketDivision` masuk ke `AttendanceRecord`.

### `Code.gs`

Sheet jadi **9 kolom** (dari 8). `doPost` membaca `data.divisi` dan `appendRow` menulisnya di kolom D; `doGet` memetakan `divisi: values[i][3]` dengan pergeseran indeks seluruh kolom setelahnya.

### `components/AdminDashboard.tsx`

- Konstanta `DIVISIONS` dan `LOCATIONS` dipindah ke atas file supaya dipakai bersama form manual
- Mapping baris sheet membaca `row.divisi`
- Tabel rekap tambah kolom **Divisi Piket**
- Modal preview tambah baris Divisi Piket
- Form input manual tambah dropdown Divisi Piket dan mengirim `divisi` di payload
- Ekspor CSV tambah kolom `Divisi Piket`
- Default lokasi manual diubah ke `Kandang Puyuh` supaya konsisten dengan form

### `components/GuidanceModal.tsx`

Kartu toleransi tidak lagi menulis "maks 10 menit" hardcode, tapi membaca dari `SHIFT_CONFIGS[].timeRange`.

---

## Commit 6 — "Dokumentasi TNK 61: spesifikasi fungsi & riwayat perubahan"

- `SPESIFIKASI_FUNGSI.md` — dokumen resmi TNK 61 (identitas + token warna, arsitektur, ketentuan, fungsi per layout, struktur data 9 kolom, setup backend, batasan)
- `RIWAYAT_PERUBAHAN.md` — dokumen ini

Keduanya menandai dengan jelas bahwa backend **belum disambung**, dan mencatat bahwa jalur unggah file reopened sehingga foto lama secara teknis masih mungkin dipakai.

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
| Jam widget bergeser tiap detik | Font proporsional, lebar karakter tidak konstan | Kelas `.tabular-nums-clock` |
| Warna terasa biru generik, bukan identitas kampus | Token Tailwind bawaan, bukan palet IPB | Token `--color-ipb-*` di `@theme` |

---

## Yang Belum Dikerjakan

Backend TNK 61 belum ada. Supaya aplikasi benar-benar berfungsi:

1. Buat Google Spreadsheet dengan tab `DataAbsen`, **9 kolom** (header persis seperti §6.1 di `SPESIFIKASI_FUNGSI.md`)
2. Tempel `Code.gs` ke Apps Script spreadsheet tersebut
3. Ganti `FOLDER_ID` di `Code.gs` dengan ID folder Drive angkatan 61
4. Jalankan `testDriveAuth()` sekali dari editor
5. Deploy web app (Execute as: Saya, Who has access: Siapa saja)
6. Tempel URL `/exec` ke `GAS_WEBHOOK_URL` di `app/page.tsx`
7. Deploy ke hosting HTTPS, lalu tes kamera dan submit end-to-end

## Commit 8 — "Perbaiki pemasangan stream kamera; KPI 100% tanpa data jadi tanda hubung"

### Bug: stream kamera tidak pernah menempel ke `<video>`

Gejala: elemen `<video>` ada di DOM, tapi `srcObject` null, `readyState` 0, `videoWidth` 0 — kamera terlihat mati padahal `getUserMedia` berhasil dan tidak ada pesan error.

Penyebabnya urutan render:

1. `isCameraActive` masih `false`, jadi `<video>` **belum dirender** (yang tampil placeholder).
2. `startCamera()` dapat stream, lalu langsung mencoba `videoRef.current.srcObject = stream` — tapi `videoRef.current` masih `null` karena elemennya belum ada.
3. `setIsCameraActive(true)` baru subsequently merender `<video>`, yang sekarang **tidak pernah menerima stream** — `srcObject` tetap null selamanya.

Perbaikan: pemasangan stream dipindah ke `useEffect` yang bergantung pada `[isCameraActive]`, jadi dijamin berjalan setelah `<video>` benar-benar ada di DOM. `play()` dipanggil di sana juga, dengan `.catch()` untuk autoplay yang ditolak browser.

### KPI ketepatan waktu

`tepatWaktuPct` sebelumnya `100` saat `total === 0`, jadi dashboard kosong memamerkan "100%" hijau seolah prestasi. Sekarang `null` dan dirender sebagai "—" dengan keterangan "Belum ada data untuk dihitung".

---

## Verifikasi yang Sudah Dijalankan

| Perintah | Hasil |
| :--- | :--- |
| `npm run lint` | Lolos, tanpa error |
| `npm run build` | Lolos, 5/5 halaman static, TypeScript strict aktif |

### Tes browser (Playwright + Chromium headless, kamera sintetis)

Dijalankan terhadap dev server `localhost:3000`.

**Layout 1440×900**

| Uji | Hasil |
| :--- | :--- |
| Grid 12 kolom aktif | 12 × 72px |
| Kolom kiri sticky | `position: sticky`, `top: 96px`, lebar 384px |
| Horizontal overflow | 0 px |
| Kamera live | `srcObject` ada, `readyState` 4, 1280×720, `paused: false` |
| Snapshot | preview data URL 34 KB |

**Alur form (390×844)**

| Uji | Hasil |
| :--- | :--- |
| Saran nama | Mengisi nama + NIM sekaligus |
| Ganti lokasi | Kartu di kolom kiri menyorot (`border-ipb-orange`) |
| Ganti divisi | Dropdown berubah |
| Ambil foto kamera | Preview data:image/jpeg 31–35 KB |
| Unggah file | Preview data:image/jpeg 4 KB, jadi JPEG bukan PNG mentah — watermark terpasang |
| Ambil ulang | Kembali ke live preview, `readyState` 4 |
| Submit di luar jam shift | Tombol nonaktif |
| Modal SOP | "10 menit" dan "PC Riswidaressi" muncul; tidak ada rujukan sv.ipb.ac.id |

**Panel admin**

| Uji | Hasil |
| :--- | :--- |
| PIN salah | Ditolak |
| PIN benar (`TNK61SVIPB`) | Dashboard terbuka |
| Banner `GAS_WEBHOOK_URL` kosong | Tampil, jujur |
| KPI tanpa data | "—" bukan 100% |

**Lintas halaman**: 0 console error, 0 request ≥ 400, di kedua viewport.

### Yang belum terverifikasi

- Submit end-to-end ke spreadsheet (butuh backend aktif)
- Kamera di perangkat asli (hanya kamera sintetis Chromium di sini)
- Tampilan di iOS Safari dan Android Chrome langsung (hanya Chromium)