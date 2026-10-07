# Spesifikasi Teknis & Fungsional — Absensi Piket TNK 61

Dokumen ini adalah acuan resmi project. Berisi **ketentuan** (aturan main) dan **fungsi** (apa saja yang bisa dilakukan).

Project ini adalah kem independen dari TNK 62 — backend Google Sheets, Drive folder, dan PIN-nya terpisah.

---

## 1. Identitas Proyek

| Item | Nilai |
| :--- | :--- |
| Nama Aplikasi | Presensi Piket TNK 61 |
| Institusional | Program Studi Teknologi dan Manajemen Ternak (TNK), Sekolah Vokasi IPB University |
| Angkatan | 61 |
| Zona waktu | Asia/Jakarta (WIB) — seluruh perhitungan waktu memakai zona ini, bukan zona perangkat |
| Hosting | Belum ditentukan (target: Vercel) |
| Akses admin | Klik logo TNK 61 di navbar, atau `/#admin` |
| Palet warna | Biru IPB `#003882` / `#0047BA`, aksen oranye `#F58220`, latar `#F8FAFC` |
| Toleransi shift | 10 menit setelah jam shift, seragam di ketiga shift (`TOLERANCE_MINUTES`) |
| Status backend | **Belum disambung** — `GAS_WEBHOOK_URL` kosong, sheet & Drive belum dibuat |

### 1.1 Token Warna (`app/globals.css`)

Didefinisikan di blok `@theme` Tailwind v4, dipakai sebagai kelas `bg-ipb-blue`, `text-ipb-orange`, `bg-ipb-slate`, dan|border-2 border-ipb-orange`.

| Token | Nilai | Dipakai untuk |
| :--- | :--- | :--- |
| `--color-ipb-blue` | `#003882` | Header top bar, navbar logo, header formulir, tombol kirim sekunder |
| `--color-ipb-blue-light` | `#0047BA` | Hover header formulir |
| `--color-ipb-orange` | `#F58220` | Garis aksen, tombol kirim utama, tombol SOP |
| `--color-ipb-slate` | `#F8FAFC` | Latar halaman |

---

## 2. Arsitektur

```
[ Browser HP / Laptop ]
        |
| (1) Isi form + ambil foto (kamera atau unggah file)
        v
[ Next.js 15 (app/page.tsx) ]  -- React 19, Tailwind CSS 4
        |
        |  (2) POST JSON (mode: no-cors) ke Google Apps Script
        v
[ Google Apps Script : Code.gs ]
        |
        +--> (3) Simpan foto ke Google Drive (folder wajib) / fallback nama referensi
        +--> (4) Tambah baris ke Google Sheets (sheet wajib)
        |
        v
[ Panel Admin ]
        |
        |  (5) GET /exec -> JSON semua baris sheet
        +--> tabel rekap, filter, statistik, ekspor CSV
```

**Prinsip penting:** seluruh aturan waktu dihitung di server/browser dengan `Intl` timezone `Asia/Jakarta`. Jangan pernah memakai `new Date().getHours()` langsung untuk aturan bisnis.

---

## 3. Pilihan Teknis (dan alasannya)

| Keputusan | Alasan |
| :--- | :--- |
| Next.js App Router + React 19 | Satu aplikasi, satu URL; halaman admin cukup lewat `#admin` tanpa routing tambahan |
| Tailwind CSS v4 | Token konsisten, `globals.css` hanya 1 baris import + definisi `@theme` |
| TypeScript strict (`ignoreBuildErrors: false`) | Build gagal kalau ada tipe salah — termasuk galat yang lolos review |
| Tanpa database eksternal | Google Sheets cukup untuk skala satu angkatan; nol biaya hosting |
| `mode: 'no-cors'` saat POST | Google Apps Script tidak mengirim header CORS; `no-cors` + `Content-Type: text/plain` adalah satu-satunya cara POST lintas origin yang lolos preflight |

---

## 4. KETENTENTAN (Aturan Main)

### 4.1 Shift Piket

| Shift | Jam | Nama | Toleransi (tepat waktu sampai) |
| :--- | :--- | :--- | :--- |
| `06.30` | 06.30 WIB | Piket Pagi | 06.40 WIB |
| `12.00` | 12.00 WIB | Piket Siang | 12.10 WIB |
| `16.00` | 16.00 WIB | Piket Sore | 16.10 WIB |

Nilai toleransi diatur satu konstanta `TOLERANCE_MINUTES = 10` di `lib/timeUtils.ts`, dipakai bersama oleh tiga shift, teks modal SOP, dan widget shift picker.

### 4.2 Jendela Pengisian (Kunci Jam)

Setiap shift hanya bisa diisi di rentang jamnya. Di luar itu, kartu shift menampilkan **Terkunci** dan tombol kirim nonaktif.

| Shift | Bisa diisi |
| :--- | :--- |
| Pagi | 06.00 – 11.59 WIB |
| Siang | 12.00 – 15.59 WIB |
| Sore | 16.00 – 21.00 WIB |

Di luar semua jendela (21.00 – 06.00), **tidak ada** shift yang bisa diisi.

### 4.3 Toleransi dan Status

| Kondisi | Status | Bisa kirim? |
| :--- | :--- | :--- |
| Sebelum jam shift (masih dalam jendela) | `Sisa Waktu` | Ya |
| Tepat pada jam shift sampai +10 menit | `Buka` | Ya |
| Setelah lewat +10 menit (tapi masih dalam jendela) | `Terlambat` | **Ya** — sengaja boleh, supaya tetap tercatat |
| Di luar jendela | `Terkunci` | **Tidak** |

**Rumus status** (`calculateAttendanceStatus`):
`totalMenitWIB <= (jamShift + TOLERANCE_MINUTES)` → `Tepat Waktu`, selain itu → `Terlambat`.

### 4.4 Form Mahasiswa

| Field | Aturan |
| :--- | :--- |
| Nama Lengkap | Wajib |
| NIM | Wajib; placeholder "NIM sesuai Kartu Tanda Mahasiswa", contoh format `J030121...` |
| Divisi Piket | **Ketik bebas**, opsional. Tidak ada daftar tertutup — divisi baru bisa muncul tanpa ubah kode |
| Shift | Wajib; terkunci di luar jendela (§4.2) |
| Lokasi | Kandang Puyuh / Kandang Itik / Penelitian (tombol kartu) |
| Foto | **Wajib, hanya dari kamera** — tidak ada upload galeri |
| Deskripsi Kegiatan | Opsional; default: `Piket kandang/laboratorium terlaksana tepat waktu.` |

### 4.5 Foto — Ketentuan Wajib

1. Foto hanya boleh diambil lewat kamera bawaan (`getUserMedia`). **Tidak ada jalur unggah file** — `input[type=file]` tidak ada di form.
2. Kamera otomatis menyala saat form dibuka; `facingMode: 'environment'` (belakang) sebagai default, dengan tombol ganti kamera depan/belakang dan tombol "Coba Lagi Kamera" kalau izin ditolak.
3. Tombol **"Ambil Foto Sekarang"** mengambil frame ke canvas.
4. Watermark dua baris otomatis ditambahkan ke setiap foto: baris identitas resmi SV IPB dengan `[LOKASI]`, lalu `[nama] · [tanggal Indonesia] [HH:MM] WIB`, dengan garis oranye `#F58220` di atasnya.
5. Format keluaran: `data:image/jpeg;base64,...` kualitas 0.85.

**Alasan kenapa galeri ditutup:** aturan tiap shift melarang bukti piket memakai foto lama. Karena tidak ada jalur lain, bukti baru bisa diambil hanya saat piket berlangsung.

**Catatan teknis:** pemasangan stream ke `<video>` dilakukan di `useEffect`, bukan langsung di `startCamera`. Kalau/langsung di sana, `videoRef.current` masih `null` karena elemennya belum dirender, dan stream menggantung tanpa menempel — kamera terlihat mati tanpa error.

### 4.6 Data Manual (Panel Admin)

| Field | Aturan |
| :--- | :--- |
| Nama | Wajib |
| NIM | Opsional |
| Divisi Piket | Ketik bebas, opsional |
| Shift | Pagi / Siang / Sore |
| Status | Bisa dipilih: `Tepat Waktu` / `Terlambat` / `Toleransi` |
| Lokasi | Kandang Puyuh / Kandang Itik / Penelitian |
| Foto | Opsional (boleh upload dari perangkat) |
| Catatan | Opsional; default: `Presensi susulan diinput manual oleh Admin / Dosen.` |

Data manual otomatis diberi akhiran `[INPUT MANUAL]` pada kolom Catatan di spreadsheet, dan di dashboard muncul badge abu **Manual**.

> Saat `GAS_WEBHOOK_URL` masih kosong, input manual **ditolak** dengan pesan error, karena tidak ada tujuan backend. Sengaja tidak diam-diam disimpan lokal saja supaya admin tidak mengira data sudah masuk spreadsheet.

### 4.7 Keamanan

| Item | Nilai | Catatan |
| :--- | :--- | :--- |
| PIN admin | `TNK61SVIPB` | Disimpan di `.env.local` sebagai `NEXT_PUBLIC_ADMIN_PIN`, tidak masuk repo |
| Fallback PIN | `TNK61SVIPB` | Hardcoded di `AdminDashboard.tsx` sebagai cadangan bila env belum diset |
| Akses spreadsheet | Publik (`Siapa saja`) | cukup untuk internal, **bukan untuk data sensitif** |

> Catatan jujur: PIN dicek di sisi klien, jadi siapa pun yang Inspect Element bisa melihatnya di bundle JS. Untuk produksi sungguhan, autentikasi harus pindah ke server (route handler + session).

---

## 5. FUNGSI (Fitur)

### 5.1 Halaman Mahasiswa (`/`)

Layout **2 kolom side-by-side** di desktop, susun ke bawah di mobile.

**Kolom kiri** (sticky di desktop, `lg:sticky lg:top-24`) — panel kontrol & informasi:

| Komponen | Detail |
| :--- | :--- |
| Hero banner | Identitas program studi + tiga unit kerja piket (Kandang Puyuh, Kandang Itik, Unit Penelitian) |
| Widget waktu | Jam WIB realtime + tanggal resmi Indonesia, format tabular agar tidak bergeser tiap detik |
| Pemilih shift | 3 sesi dengan badge status `Buka` / `Sisa Waktu` / `Terlambat` / `Terkunci`, plus sisa menit; langsung terhubung ke form |
| Tombol SOP | Tombol cepat oranye IPB membuka modal SOP |

**Kolom kanan** — form presensi, 5 langkah bernomor:

| Langkah | Isi |
| :--- | :--- |
| Header | Biru resmi IPB dengan garis aksen oranye + lencana shift aktif |
| 1 | Identitas mahasiswa: nama lengkap dan NIM (opsional, sesuai KTM) |
| 2 | Divisi piket — **field ketik bebas** |
| 3 | Kartu pilihan lokasi (Kandang Puyuh / Kandang Itik / Penelitian) |
| 4 | Foto dokumentasi: live preview kamera, "Ambil Foto Sekarang", ganti kamera, watermark otomatis |
| 5 | Deskripsi kegiatan piket lapangan |

| Fungsi lain | Detail |
| :--- | :--- |
| Jam live | Jam WIB di navbar, update tiap 1 detik |
| Auto pilih shift | Jam 06–12 → Pagi, 12–16 → Siang, 16–21 → Sore |
| Validasi | Nama wajib, NIM wajib, foto wajib, shift harus tidak terkunci |
| Submit | Kirim ke GAS, tampilkan kartu hasil lengkap |
| Reset form | Otomatis kosong setelah submit sukses |

### 5.2 Panel Admin (`/#admin`)

Tampilan **console gelap** dengan sidebar kiri — sengaja berbeda dari portal mahasiswa yang terang, supaya layar tidak tertukar saat dibuka salah. Fungsi dan perilakunya sama persis dengan yang di TNK 62.

Layout: `lg:grid lg:grid-cols-12`. Sidebar `lg:col-span-3 xl:col-span-2` dan **sticky** di desktop; konten `lg:col-span-9 xl:col-span-10`. Di mobile sidebar turun ke atas dan tidak sticky.

**Sidebar**

| Bagian | Isi |
| :--- | :--- |
| Identitas | Badge "Admin Panel" dengan titik status, judul, label TNK 61 · SV IPB |
| Navigasi | Dua view: **Ringkasan** dan **Data Presensi** |
| Aksi | Input Manual, Ekspor CSV, Kunci Panel |
| Ringkasan Cepat | Total, hari ini, ketepatan waktu |

**View Ringkasan**

| Fungsi | Detail |
| :--- | :--- |
| KPI | Total presensi, presensi hari ini, tingkat ketepatan waktu, distribusi sesi |
| Sebaran Lokasi | Bar proporsional per unit |
| Sebaran Shift | Bar proporsional per sesi |

> KPI ketepatan waktu menampilkan "—" kalau belum ada data, bukan 100% palsu.

**View Data Presensi**

| Fungsi | Detail |
| :--- | :--- |
| Sumber data | Ambil dari spreadsheet via `doGet`, fallback ke localStorage |
| Tombol Segarkan | Tarik ulang data sheet |
| Indikator status | Titik hijau (siap) / amber (memuat) / merah (gagal) |
| Filter tanggal | Semua / Hari Ini / Kemarin / 7 Hari / Pilih Tanggal |
| Filter shift | Semua / Pagi / Siang / Sore |
| Pencarian | Nama, NIM, atau lokasi |
| Tabel | Waktu, mahasiswa, divisi, shift, lokasi, status, foto, aksi |
| Badge Manual | Otomatis muncul bila Catatan memuat `[INPUT MANUAL]` |
| Pratinjau foto | Klik thumbnail → modal detail |
| Ekspor CSV | `Rekap_Presensi_Piket_TNK61_<tanggal>.csv` (dengan BOM UTF-8) |
| Tambah manual | Modal dengan upload foto + pilih status |
| Verifikasi | Tandai baris sudah diverifikasi |
| Hapus | Hapus baris (dengan konfirmasi) |

**Login**: PIN dengan tombol lihat/sembunyikan, pesan `Access denied` kalau salah.

### 5.3 Modal SOP (tombol "SOP" di navbar dan tombol oranye di kolom kiri)

1. Jadwal sesi piket & toleransi waktu (maks 10 menit)
2. SOP pakaian & APD — WP Praktikum + sepatu boots
3. SOP dokumentasi foto — hanya kamera saat piket, watermark otomatis
4. Kontak bantuan — **PC Riswidaressi** untuk kendala dan konfirmasi

---

## 6. Struktur Data

### 6.1 Google Sheets — sheet `DataAbsen`

Header baris 1 **wajib** ada:

| Kolom | Nama | Tipe |
| :--- | :--- | :--- |
| A | Timestamp | DateTime (otomatis) |
| B | Nama Mahasiswa | String |
| C | NIM | String |
| D | Divisi Piket | String bebas (diisi mahasiswa) |
| E | Waktu Piket | `06.30` / `12.00` / `16.00` |
| F | Lokasi | `Kandang Puyuh` / `Kandang Itik` / `Penelitian` |
| G | Status | `Tepat Waktu` / `Terlambat` / `Toleransi` |
| H | Catatan | String |
| I | URL Foto | String (URL Drive **atau** `[FILE] Nama_Timestamp.ext`) |

> ⚠️ Baris 1 dianggap header dan dilewati oleh `doGet`. Kalau baris 1 bukan header, baris pertama akan hilang saat dashboard membaca data.

### 6.2 Tipe TypeScript (`types/attendance.ts`)

```ts
PiketShift  = '06.30' | '12.00' | '16.00'
UnitLocation = 'Kandang Puyuh' | 'Kandang Itik' | 'Penelitian'
PiketDivision = 6 nilai tetap

AttendanceRecord {
  id, timestamp, formattedDate, formattedTime,
  studentName, studentNim, division, shift, location,
  photoUrl, notes?, status, verified, syncedToDrive?
}
```

### 6.3 Kontrak Payload API

**POST** — dipakai form mahasiswa *dan* input manual admin:

```json
{
  "action": "submitManualAttendance",
  "timestamp": "2026-10-07T09:05:00.000Z",
  "namaMahasiswa": "...",
  "nim": "J0301211045",
  "divisi": "Divisi Unggas (Puyuh & Itik)",
  "waktuPiket": "16.00",
  "lokasi": "Kandang Itik",
  "status": "Tepat Waktu",
  "catatan": "...",
  "fotoBase64": "data:image/jpeg;base64,..."
}
```

**GET** — respons `doGet`:

```json
{
  "status": "success",
  "data": [
    { "timestamp": "...", "tanggal": "07/10/2026", "waktu": "16:10:35",
      "nama": "...", "nim": "...", "divisi": "...", "shift": "16.00", "lokasi": "...",
      "status": "...", "catatan": "...", "urlFoto": "..." }
  ]
}
```

Baris diurutkan **terbaru di atas** (`rows.reverse()`).

---

## 7. Fungsi `Code.gs`

| Fungsi | Tugas |
| :--- | :--- |
| `doPost(e)` | Baca JSON → validasi → coba upload foto ke Drive → tulis 1 baris ke Sheets |
| `doGet()` | Baca semua baris, format tanggal/jam, kembalikan JSON (terbaru dulu) |
| `testDriveAuth()` | Dipakai sekali untuk memicu layar izin Drive dari editor |
| `jsonResponse_(obj)` | Helper output JSON |

**Konfigurasi wajib di baris atas:**

```js
var FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_DRIVE_TNK_61';  // tanpa ?hl atau parameter lain
var SHEET_NAME = 'DataAbsen';
```

### 7.1 Kenapa kolom URL Foto bisa berisi `[FILE] ...`

Google memblokir `DriveApp` untuk web app yang bisa diakses anonim. `doPost` mencoba upload, dan bila gagal tetap menulis baris dengan referensi nama file:

```
[FILE] Nama_Mahasiswa_1791258229332.jpg
```

Mahasiswa bisa mencari referensi ini untuk mencocokkan dengan foto di perangkatnya.

---

## 8. Setup Backend

### 8.1 Kebutuhan
- Node.js 18+
- Akun Google (untuk Sheets + Apps Script + Drive)

### 8.2 Langkah

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
npm start
```

### 8.3 Yang WAJIB diganti sebelum dipakai

| Yang | Di mana | Ganti dengan |
| :--- | :--- | :--- |
| `FOLDER_ID` | `Code.gs` | ID folder Drive milik angkatan 61 |
| `GAS_WEBHOOK_URL` | `app/page.tsx` | URL `/exec` dari deployment terbaru lu (sekarang `''`) |
| `NEXT_PUBLIC_ADMIN_PIN` | `.env.local` | PIN pilihan lu (sekarang `TNK61SVIPB`) |

> 🔴 `GAS_WEBHOOK_URL` wajib memakai URL deployment **terakhir**. URL lama tetap hidup dan akan menulis ke sheet lama.
>
> 🔴 Selama `GAS_WEBHOOK_URL` kosong: submit mahasiswa hanya tersimpan di localStorage browser itu, input manual ditolak, dan panel admin menampilkan pesan bahwa backend belum terhubung.

### 8.4 Publish ulang Apps Script

Setelah mengganti kode: **Deploy → Kelola deployment → pensil → New version → Deploy**. URL `/exec` tidak berubah.

---

## 9. Testing

Pola tes browser yang dipakai saat pengembangan (Playwright, Chromium headless, viewport iPhone 14 390×844):

- Kamera menyala otomatis, `<video>` ada, tombol Ambil Foto ada
- Tombol Unggah File ada dan menghasilkan preview ber-watermark (jalur galeri aktif, bukan 0)
- Saran cepat nama mengisi nama + NIM sekali klik
- Pemilih shift menampilkan badge `Buka` / `Sisa Waktu` / `Terlambat` / `Terkunci` sesuai jam
- Isi form → foto → submit → kartu hasil memuat divisi
- Shift terkunci menonaktifkan tombol kirim
- Admin: password salah ditolak, password benar → tabel berisi data dari sheet, kolom Divisi tampil
- 0 error di console, 0 request 404

**Untuk tes lokal di HP:** jalankan `npm run dev -- -H 0.0.0.0`, lalu buka `http://<IP-LAPTOP>:3000`. Catatan: `getUserMedia` butuh HTTPS atau `localhost`, jadi dari HP dalam jaringan lokal kamera **tidak akan aktif**. Tes kamera lewat hosting HTTPS (Vercel).

---

## 10. Batasan yang Diketahui

1. **Backend belum disambung.** `GAS_WEBHOOK_URL` kosong sampai lu isi; sheet & Drive TNK 61 belum dibuat.
2. **PIN bisa dibaca dari source.** Autentikasi masih di sisi klien.
3. **Foto bisa berasal dari unggah file.** Karena jalur galeri dibuka, mahasiswa bisa memakai foto lama. Mitigasinya caption watermark + SOP, bukan pembatasan teknis. Ini berbeda dari TNK 62 yang menutup jalur galeri sepenuhnya.
4. **Tidak ada hapus baris di spreadsheet.** `doPost` hanya menambah; tombol Hapus hanya membersihkan localStorage browser.
5. **localStorage punya kuota ±5 MB.** Foto base64 di browser bisa memakka.
6. **Sheet memperlakukan baris 1 sebagai header.**
7. **Foto tidak tersimpan di Drive kalau otorisasi ditolak.** Google memblokir `DriveApp` untuk web app anonim, lalu sistem jatuh ke referensi `[FILE] Nama_Timestamp.ext` (§7.1).