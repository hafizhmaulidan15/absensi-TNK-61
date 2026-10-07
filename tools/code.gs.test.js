// ================= KONFIGURASI =================
//
// GANTI `FOLDER_ID` dengan ID folder Google Drive milik angkatan 61.
// Ambil dari URL folder: https://drive.google.com/drive/folders/<FOLDER_ID>
// Isi HANYA ID-nya, tanpa ?usp=sharing atau parameter lain.
//
// Kalau folder foto tidak dipakai, biarkan string kosong (' ') —
// upload ke Drive akan dilewati, dan kolom Referensi Foto tetap terisi
// referensi nama file. Lihat ensureFolder_() di bawah.
var FOLDER_ID = ' ';

// Nama tab di spreadsheet.
//
// PENTING: Apps Script TIDAK bisa membuat spreadsheet. Sheet harus lu buat
// sendiri lebih dulu di Google Sheets, lalu tab-nya di-rename persis seperti
// nilai di bawah. ensureSheet_() hanya akan membuat tab kosong dengan header
// kalau tab dengan nama ini memang belum ada di dalam spreadsheet.
//
// Cara cek nama tabnya: klik kanan tab di bawah spreadsheet > Rename.
var SHEET_NAME = 'data_absen61';

// ID spreadsheet, HANYA perlu diisi kalau script-nya berdiri sendiri
// (standalone) dan tidak dibuka dari Extensions > Apps Script milik sheet itu.
//
// Kalau script-nya BOUND (dibuka lewat Extensions > Apps Script dari
// spreadsheet lu), biarkan kosong — getSpreadsheet_() akan otomatis memakai
// spreadsheet tempat script itu terpasang.
//
// Ambil ID dari URL: https://docs.google.com/spreadsheets/d/<ID>/edit
var SPREADSHEET_ID = '';

// Zona waktu untuk format tanggal/jam di respons doGet.
// 'Asia/Jakarta' = WIB. Jangan diubah kalau mau jam lokal kampus.
var TIMEZONE = 'Asia/Jakarta';

// ================= HEADER SPREADSHEET =================
//
// 9 kolom, urutannya HARUS sama dengan baris ini.
// ensureSheet_() akan membuat header otomatis kalau sheet baru.
var HEADERS = [
  'Timestamp',
  'Nama Mahasiswa',
  'NIM',
  'Divisi Piket',
  'Waktu Piket',
  'Lokasi',
  'Status',
  'Catatan',
  'Referensi Foto'
];

// Penanda data manual. Dipakai dua kali:
//  1. akhiran '[INPUT MANUAL]' di kolom Catatan
//  2. awalan 'MANUAL_' di kolom Referensi Foto
var TAG_MANUAL_NOTE = '[INPUT MANUAL]';
var TAG_MANUAL_FILE = 'MANUAL_';

// Status yang boleh diisi manual. Sisanya dihitung otomatis oleh form.
var STATUS_MANUAL = ['Tepat Waktu', 'Terlambat', 'Toleransi', 'Izin', 'Tidak Hadir'];

var SHIFT_VALID = ['06.30', '12.00', '16.00'];
var LOKASI_VALID = ['Kandang Puyuh', 'Kandang Itik', 'Penelitian'];


// ================= ENTRY POINT =================

// Dipanggil form mahasiswa dan form input manual admin.
// Keduanya memakai kunci payload yang sama, jadi satu fungsi ini cukup.
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ status: 'error', message: 'Tidak ada payload.' });
    }

    var data = JSON.parse(e.postData.contents);
    var isManual = String(data.action || '') === 'submitManualAttendance';

    var nama = str(data.namaMahasiswa);
    var nim = str(data.nim);
    var divisi = str(data.divisi);
    var waktu = str(data.waktuPiket);
    var lokasi = str(data.lokasi);
    var status = str(data.status);
    var catatan = str(data.catatan);
    var fotoBase64 = String(data.fotoBase64 || '');

    // --- Validasi ---
    if (!nama) return jsonResponse_({ status: 'error', message: 'Nama wajib diisi.' });
    if (waktu && SHIFT_VALID.indexOf(waktu) === -1) {
      return jsonResponse_({
        status: 'error',
        message: 'Waktu piket tidak dikenal: ' + waktu
      });
    }
    if (lokasi && LOKASI_VALID.indexOf(lokasi) === -1) {
      return jsonResponse_({
        status: 'error',
        message: 'Lokasi tidak dikenal: ' + lokasi
      });
    }

    // --- Data manual ---
    if (isManual) {
      catatan = catatan ? catatan + ' ' + TAG_MANUAL_NOTE : TAG_MANUAL_NOTE;
      if (!status) status = 'Tepat Waktu';
      if (STATUS_MANUAL.indexOf(status) === -1) {
        return jsonResponse_({
          status: 'error',
          message: 'Status tidak dikenal: ' + status
        });
      }
    } else if (!status) {
      // Absensi mahasiswa tidak boleh mengarang status.
      status = 'Tepat Waktu';
    }

    // --- Foto ---
    // driveUrl     : link Drive kalau upload berhasil (bisa kosong)
    // refFoto      : referensi nama file, SELALU terisi kalau ada foto
    var foto = processFoto(fotoBase64, nama, waktu, isManual);

    // --- Tulis baris ---
    var sheet = ensureSheet_();
    sheet.appendRow([
      new Date(),
      nama,
      nim,
      divisi,
      waktu,
      lokasi,
      status,
      catatan,
      foto.ref
    ]);

    return jsonResponse_({
      status: 'success',
      // Link Drive hanya dipakai kalau upload-nya benar-benar berhasil.
      driveUrl: foto.url,
      refFoto: foto.ref,
      uploaded: foto.uploaded
    });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: String(err && err.message || err) });
  }
}

// Dipanggil panel admin untuk menarik semua baris.
function doGet() {
  try {
    var sheet = ensureSheet_();
    var values = sheet.getDataRange().getValues();
    var rows = [];

    // Baris 1 adalah header, jadi mulai dari indeks 1.
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      // Lewati baris kosong
      if (!r || !r[0] && !r[1]) continue;

      var d = r[0] ? new Date(r[0]) : null;
      rows.push({
        timestamp: d ? d.toISOString() : '',
        tanggal: d ? Utilities.formatDate(d, TIMEZONE, 'dd/MM/yyyy') : '',
        waktu: d ? Utilities.formatDate(d, TIMEZONE, 'HH:mm:ss') : '',
        nama: String(r[1] || ''),
        nim: String(r[2] || ''),
        divisi: String(r[3] || ''),
        shift: String(r[4] || ''),
        lokasi: String(r[5] || ''),
        status: String(r[6] || ''),
        catatan: String(r[7] || ''),
        refFoto: String(r[8] || ''),
        // Mirror ke urlFoto supaya frontend yang sudah ada tidak perlu diubah.
        urlFoto: String(r[8] || ''),
        manual: isManualRow(r)
      });
    }

    // Terbaru di atas
    rows.reverse();

    return jsonResponse_({
      status: 'success',
      total: rows.length,
      data: rows
    });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: String(err && err.message || err) });
  }
}


// ================= FOTO =================

/**
 * Proses foto base64 dari form.
 *
 * Mengembalikan:
 *   ref      - referensi nama file, selalu terisi kalau ada foto.
 *              Ini yang ditulis ke kolom Referensi Foto.
 *   uploaded - true kalau file benar-benar masuk ke Drive.
 *   url      - link Drive, hanya kalau upload berhasil.
 *
 * Kalau upload Drive gagal (misalnya karena FOLDER_ID kosong atau izin
 * belum diberikan), yang penting Referensi Foto tetap terisi supaya
 * admin punya jejak filename untuk dicocokkan.
 */
function processFoto(fotoBase64, nama, waktu, isManual) {
  if (!fotoBase64) return { ref: '', uploaded: false, url: '' };

  var mime = 'image/jpeg';
  var ext = 'jpg';
  var m = String(fotoBase64).match(/^data:(image\/\w+);base64,/);
  if (m) {
    mime = m[1];
    ext = mime.split('/')[1] || 'jpg';
  }
  if (ext === 'jpeg') ext = 'jpg';

  var stamp = Utilities.formatDate(
    new Date(),
    TIMEZONE,
    (waktu ? 'HHmmss' : 'HHmmss')
  );

  var base = String(nama).replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) base = 'TanpaNama';
  if (waktu) base = base + '_' + String(waktu).replace('.', '');
  if (isManual) base = TAG_MANUAL_FILE + base;

  var filename = base + '_' + stamp + '.' + ext;
  var ref = '[FILE] ' + filename;

  // Upload ke Drive bersifat opsional.
  var folderId = String(FOLDER_ID || '').trim();
  if (!folderId) {
    return { ref: ref, uploaded: false, url: '' };
  }

  try {
    var cleaned = String(fotoBase64).replace(/^data:image\/\w+;base64,/, '');
    var bytes = Utilities.base64Decode(cleaned);
    var blob = Utilities.newBlob(bytes, mime, filename);
    var file = ensureFolder_().createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ref: ref, uploaded: true, url: file.getUrl() };
  } catch (err) {
    // Upload gagal tidak boleh menggagalkan pencatatan presensi.
    console.log('Upload foto gagal: ' + err.message);
    return { ref: ref, uploaded: false, url: '' };
  }
}


// ================= HELPER =================

function str(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}

function isManualRow(row) {
  return (
    String(row[7] || '').indexOf(TAG_MANUAL_NOTE) !== -1 ||
    String(row[8] || '').indexOf(TAG_MANUAL_FILE) !== -1
  );
}

/**
 * Spreadsheet tempat data ditulis.
 *
 * Dua sumber, diurutkan dari yang paling benar:
 *  1. SPREADSHEET_ID  — isi kalau script ini berdiri sendiri (standalone),
 *                       terpisah dari spreadsheet-nya. Ambil ID dari URL:
 *                       https://docs.google.com/spreadsheets/d/<ID>/edit
 *  2. getActiveSpreadsheet() — dipakai kalau script ini terikat ke spreadsheet
 *                       (bound), yaitu dibuka lewat Extensions > Apps Script
 *                       dari spreadsheet tersebut.
 */
function getSpreadsheet_() {
  var id = String(SPREADSHEET_ID || '').trim();
  if (id) {
    return SpreadsheetApp.openById(id);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Spreadsheet tidak ditemukan. Script ini harus salah satu: ' +
      '(a) dibuka dari Extensions > Apps Script milik spreadsheet, atau ' +
      '(b) SPREADSHEET_ID diisi di bagian KONFIGURASI atas.'
    );
  }
  return ss;
}

/**
 * Sheet + header.
 *
 * Tab dibuat otomatis kalau belum ada. Header hanya ditulis kalau baris 1
 * masih kosong seluruhnya — jadi data yang sudah ada tidak pernah ditimpa.
 */
function ensureSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var row1 = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var isEmpty = row1.every(function (cell) {
    return String(cell || '').trim() === '';
  });

  if (isEmpty) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else if (String(row1[0] || '').trim() !== HEADERS[0]) {
    // Baris 1 sudah berisi sesuatu yang lain. Jangan menimpa; cukup ingatkan.
    console.log(
      'Perhatian: baris 1 tab "' + SHEET_NAME + '" sudah berisi data, ' +
      'header tidak ditulis. Pastikan urutannya: ' + HEADERS.join(' | ')
    );
  }

  return sheet;
}

/** Folder Drive tempat foto bukti disimpan. */
function ensureFolder_() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  return folder;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ================= UTILITAS (untuk admin) =================

/**
 * PENTING — JALANKAN INI DULUAN sebelum deploy.
 *
 * Pilih `testSetup` di dropdown fungsi atas editor Apps Script, lalu klik Run.
 * Hasilnya muncul sebagai pop-up. Fungsi ini mengecek satu per satu:
 *   1. Spreadsheet-nya ketemu atau tidak
 *   2. Tab `data_absen61` ada atau tidak
 *   3. Header 9 kolom sudah sesuai atau belum
 *   4. Folder Drive bisa diakses atau tidak (opsional)
 *
 * Kalau testSetup bilang "Sheet GAGAL" atau header belum sesuai, perbaiki dulu
 * sebelum deploy — jangan sampai data masuk ke tempat yang salah.
 */
function testSetup() {
  var lines = [];

  lines.push('Tab yang dicari : ' + SHEET_NAME);
  lines.push('');

  // --- Spreadsheet ---
  try {
    var ss = getSpreadsheet_();
    lines.push('Spreadsheet    : ' + ss.getName());
    lines.push('ID             : ' + ss.getId());
    lines.push('Mode           : ' +
      (String(SPREADSHEET_ID || '').trim()
        ? 'standalone (SPREADSHEET_ID diisi)'
        : 'bound (dari spreadsheet tempat script ini)'));
  } catch (e) {
    lines.push('SPREADSHEET GAGAL: ' + e.message);
    lines.push('');
    lines.push('Perbaiki dulu di bagian KONFIGURASI atas:');
    lines.push('  - pastikan script dibuka dari Extensions > Apps Script milik spreadsheet, ATAU');
    lines.push('  - isi SPREADSHEET_ID dengan ID dari URL docs.google.com/spreadsheets/d/<ID>/edit');
    SpreadsheetApp.getUi().alert('Hasil testSetup\n\n' + lines.join('\n'));
    return;
  }

  // --- Tab + header ---
  try {
    var sheet = ensureSheet_();
    var row1 = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    lines.push('Tab            : OK, ada');
    lines.push('Baris terakhir : ' + sheet.getLastRow());
    lines.push('');
    lines.push('Header baris 1 :');
    for (var i = 0; i < HEADERS.length; i++) {
      var isi = String(row1[i] || '(kosong)');
      var cocok = isi === HEADERS[i];
      lines.push('  ' + (i + 1) + '. ' + HEADERS[i] +
        (isEmptyCell(row1[i]) ? '  <- kosong, akan diisi otomatis' :
          (cocok ? '  <- OK' : '  <- PERIKSA: ketemu "' + isi + '"')));
    }
  } catch (e) {
    lines.push('Tab GAGAL: ' + e.message);
  }

  // --- Drive (opsional) ---
  lines.push('');
  var folderId = String(FOLDER_ID || '').trim();
  if (!folderId) {
    lines.push('Drive          : dilewati (FOLDER_ID kosong)');
    lines.push('                Referensi Foto tetap terisi, tanpa link Drive.');
  } else {
    try {
      var f = DriveApp.getFolderById(folderId);
      lines.push('Drive          : OK, folder "' + f.getName() + '"');
    } catch (e) {
      lines.push('Drive GAGAL    : ' + e.message);
      lines.push('                Upload foto akan dilewati, referensi tetap terisi.');
    }
  }

  SpreadsheetApp.getUi().alert('Hasil testSetup\n\n' + lines.join('\n'));
}

function isEmptyCell(v) {
  return String(v || '').trim() === '';
}

/** Membersihkan baris kosong di tengah sheet. Jalankan manual bila perlu. */
function bersihkanBarisKosong() {
  var sheet = ensureSheet_();
  var last = sheet.getLastRow();
  var hapus = [];
  for (var i = last; i >= 2; i--) {
    var row = sheet.getRange(i, 1, 1, HEADERS.length).getValues()[0];
    if (!row[0] && !row[1]) hapus.push(i);
  }
  for (var j = 0; j < hapus.length; j++) {
    sheet.deleteRow(hapus[j]);
  }
  SpreadsheetApp.getUi().alert(hapus.length + ' baris kosong dihapus.');
}
