// Harness: menjalankan Code.gs dengan stub API Google Apps Script.
// Tidak ada stub DriveApp karena Code.gs sudah tidak memakai Drive sama sekali.
global.SpreadsheetApp = {
  _ss: null,
  // Apps Script sungguhan mengembalikan null untuk script yang tidak bound,
  // bukan melempar error. Stub harus meniru itu supaya getSpreadsheet_()
  // bisa menguji jalur error-nya sendiri.
  getActiveSpreadsheet() {
    return this._ss;
  },
  // ID yang diterima diuji. Dipakai untuk memastikan resolution-nya benar:
  // Script Property harus menang atas variabel di kode.
  _knownIds: [],
  openById(id) {
    if (this._knownIds.indexOf(id) !== -1) return this._ss;
    throw new Error('Spreadsheet tidak ditemukan: ' + id);
  },
  getUi() {
    return {
      alert(m) {
        console.log('=== POPUP testSetup ===');
        console.log(m);
        console.log('=== /POPUP ===');
      },
    };
  },
};
global.Utilities = {
  formatDate(d, tz, f) {
    // stub sederhana: cukup menghasilkan 6 digit
    return '001122';
  },
};
global.ContentService = {
  createTextOutput(s) {
    return { s, setMimeType() { return this; } };
  },
  MimeType: { JSON: 'application/json' },
};
global.PropertiesService = {
  _p: {},
  getScriptProperties() {
    const p = this._p;
    return {
      getProperty(k) { return Object.prototype.hasOwnProperty.call(p, k) ? p[k] : null; },
    };
  },
};
global.Logger = { log(m) { console.log('LOG: ' + m); } };

const fs = require('fs');
const src = fs.readFileSync('Code.gs', 'utf8');
eval(src);

// Daftarkan ID dari kode sebagai spreadsheet yang "ada", supaya openById
// berhasil di semua tes. Tanpa ini setiap tes yang memanggil doPost akan
// gagal dengan "Spreadsheet tidak ditemukan" sebelum masuk ke logika yang
// sebenarnya diuji.
SpreadsheetApp._knownIds.push(String(SPREADSHEET_ID).trim());

function makeSheet(name, row1) {
  const self = {
    _name: name,
    _v: [row1 || []],
    getName() { return this._name; },
    getId() { return 'SPREADSHEET_PALS'; },
    getLastRow() { return this._v.length; },
    getDataRange() { return this.getRange(1, 1, this._v.length, HEADERS.length); },
    getRange(r, c, nr, nc) {
      const s = self;
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) row.push(s._v[r - 1 + i] ?.[c - 1 + j] ?? '');
            out.push(row);
          }
          return out;
        },
        setValues(v) {
          for (let i = 0; i < nr; i++) {
            if (!s._v[r - 1 + i]) s._v[r - 1 + i] = [];
            for (let j = 0; j < nc; j++) s._v[r - 1 + i][c - 1 + j] = v[i][j];
          }
        },
      };
    },
    setFrozenRows() {},
    appendRow(row) { this._v.push(row.slice()); },
    deleteRow(i) { this._v.splice(i - 1, 1); },
  };
  return self;
}

SpreadsheetApp._ss = {
  getName() { return 'Data Absensi 61'; },
  getId() { return 'SPREADSHEET_PALS'; },
  getSheetByName(n) { return this._sheets?.[n] || null; },
  insertSheet(n) {
    this._sheets = this._sheets || {};
    this._sheets[n] = makeSheet(n, null);
    return this._sheets[n];
  },
  _sheets: {},
};

const tests = [];
function t(name, fn) {
  try { fn(); tests.push('OK   ' + name); }
  catch (e) { tests.push('FAIL ' + name + ' -> ' + e.message); }
}
// Helper POST. `lokasi` dan `waktuPiket` di-default supaya setiap tes boleh
// fokus pada satu hal tanpa mengulang boilerplate. Tes yang memang menguji
// field wajib menimpanya secara eksplisit dengan '' atau menghilangkannya.
const post = (obj) => {
  const payload = Object.assign({ lokasi: 'Kandang Puyuh', waktuPiket: '06.30' }, obj);
  if (payload.lokasi === undefined) delete payload.lokasi;
  if (payload.waktuPiket === undefined) delete payload.waktuPiket;
  return JSON.parse(doPost({ postData: { contents: JSON.stringify(payload) } }).s);
};
const reset = () => { SpreadsheetApp._ss._sheets = {}; };
const rows = () => SpreadsheetApp._ss._sheets['data_absen61']._v;

// ============ WAJIB: nama, NIM, foto ============
t('doPost TOLAK nama kosong', () => {
  reset();
  const r = post({ nim: 'J1', waktuPiket: '06.30', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error' || !/Nama/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK NIM kosong', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', waktuPiket: '06.30', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error' || !/NIM/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK foto kosong', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', waktuPiket: '06.30', fotoBase64: '' });
  if (r.status !== 'error' || !/Foto/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK shift kosong', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', waktuPiket: '', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error' || !/Shift/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK lokasi kosong', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', lokasi: '', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error' || !/Lokasi/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK nama kepanjangan', () => {
  reset();
  const r = post({ namaMahasiswa: 'A'.repeat(101), nim: 'J1', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error' || !/terlalu panjang/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK catatan kepanjangan', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', catatan: 'x'.repeat(501), fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error' || !/terlalu panjang/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('doPost TOLAK foto kepanjangan', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', fotoBase64: 'data:image/jpeg;base64,' + 'A'.repeat(9 * 1024 * 1024) });
  if (r.status !== 'error' || !/terlalu besar/.test(r.message)) throw new Error(JSON.stringify(r));
});
t('nama 100 karakter masih diterima (batas tidak off-by-one)', () => {
  reset();
  const r = post({ namaMahasiswa: 'A'.repeat(100), nim: 'J1', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'success') throw new Error(JSON.stringify(r));
});
t('doPost TOLAK tanpa payload', () => {
  const r = JSON.parse(doPost(null).s);
  if (r.status !== 'error') throw new Error(JSON.stringify(r));
});
t('doPost TOLAK JSON rusak', () => {
  const r = JSON.parse(doPost({ postData: { contents: '{rusak' } }).s);
  if (r.status !== 'error') throw new Error(JSON.stringify(r));
});

// ============ validasi isi ============
t('doPost TOLAK shift ngawur', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', waktuPiket: '99.99', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error') throw new Error(JSON.stringify(r));
});
t('doPost TOLAK lokasi ngawur', () => {
  reset();
  const r = post({ namaMahasiswa: 'A', nim: 'J1', waktuPiket: '06.30', lokasi: 'Kandang Ayam', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error') throw new Error(JSON.stringify(r));
});
t('doPost TOLAK status manual ngawur', () => {
  reset();
  const r = post({ action: 'submitManualAttendance', namaMahasiswa: 'A', nim: 'J1', waktuPiket: '06.30', status: 'Ngawur', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error') throw new Error(JSON.stringify(r));
});
t('doPost TOLAK lokasi manual ngawur', () => {
  reset();
  const r = post({ action: 'submitManualAttendance', namaMahasiswa: 'A', nim: 'J1', waktuPiket: '06.30', lokasi: 'Kandang Ayam', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'error') throw new Error(JSON.stringify(r));
});

// ============ referensi foto (TANPA Drive) ============
t('mahasiswa: 9 kolom + ref tanpa awalan MANUAL_', () => {
  reset();
  const r = post({ namaMahasiswa: 'Budi Santoso', nim: 'J0301211099', waktuPiket: '06.30', lokasi: 'Kandang Puyuh', status: 'Tepat Waktu', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (r.status !== 'success') throw new Error(JSON.stringify(r));
  const row = rows()[1];
  if (row.length !== HEADERS.length) throw new Error('kolom=' + row.length);
  if (!/^\[FILE\] Budi_Santoso_0630_\d{6}\.jpg$/.test(row[8])) throw new Error('ref: ' + row[8]);
  if (/MANUAL_/.test(row[8])) throw new Error('mahasiswa tidak boleh MANUAL_');
  if (!r.refFoto) throw new Error('respons tidak punya refFoto');
});
t('manual: [INPUT MANUAL] + awalan MANUAL_', () => {
  reset();
  const r = post({ action: 'submitManualAttendance', namaMahasiswa: 'Siti Nurhaliza', nim: 'J1', waktuPiket: '12.00', status: 'Izin', catatan: 'Dispensasi', fotoBase64: 'data:image/png;base64,BB' });
  if (r.status !== 'success') throw new Error(JSON.stringify(r));
  const row = rows()[1];
  if (!/\[INPUT MANUAL\]/.test(row[7])) throw new Error('catatan: ' + row[7]);
  if (!/^\[FILE\] MANUAL_Siti_Nurhaliza_1200_\d{6}\.png$/.test(row[8])) throw new Error('ref: ' + row[8]);
});
t('ext jpeg dinormalkan jadi jpg', () => {
  reset();
  post({ namaMahasiswa: 'X Y', nim: 'J1', waktuPiket: '16.00', fotoBase64: 'data:image/jpeg;base64,AA' });
  if (!/\.jpg$/.test(rows()[1][8])) throw new Error('ext: ' + rows()[1][8]);
});
t('ext webp dipertahankan', () => {
  reset();
  post({ namaMahasiswa: 'X Y', nim: 'J1', waktuPiket: '16.00', fotoBase64: 'data:image/webp;base64,AA' });
  if (!/\.webp$/.test(rows()[1][8])) throw new Error('ext: ' + rows()[1][8]);
});
t('nama dengan spasi jadi underscore, tanpa karakter aneh', () => {
  reset();
  post({ namaMahasiswa: "Ahmad '/' Fauzi#Rahman", nim: 'J1', waktuPiket: '06.30', fotoBase64: 'data:image/jpeg;base64,AA' });
  const ref = rows()[1][8];
  if (!/^\[FILE\] Ahmad_Fauzi_Rahman_/.test(ref)) throw new Error('ref: ' + ref);
  if (/[^A-Za-z0-9_\[\]\. ]/.test(ref)) throw new Error('karakter terlarang: ' + ref);
});
t('nama kosong tidak bikin referensi rusak', () => {
  reset();
  post({ namaMahasiswa: '', nim: 'J1', waktuPiket: '06.30', fotoBase64: 'data:image/jpeg;base64,AA' });
  // nama kosong sudah ditolak, tapi pastikan tidak melempar error
});

// ============ header & tab ============
t('testSetup membuat tab + header otomatis', () => {
  reset();
  testSetup();
  const sh = SpreadsheetApp._ss._sheets['data_absen61'];
  if (!sh) throw new Error('tab tidak dibuat');
  if (sh._v[0].join('|') !== HEADERS.join('|')) throw new Error('header salah');
});
t('header lama tidak ditimpa', () => {
  reset();
  SpreadsheetApp._ss._sheets['data_absen61'] = makeSheet('data_absen61', ['Data Lama', 'Budi', 'x', 'y', 'z']);
  const sh = ensureSheet_();
  if (sh._v[0][0] !== 'Data Lama') throw new Error('header ditimpa: ' + sh._v[0][0]);
});

// ============ doGet ============
t('doGet: terbaru di atas, refFoto + manual flag', () => {
  reset();
  post({ namaMahasiswa: 'Pertama', nim: 'J1', waktuPiket: '06.30', fotoBase64: 'data:image/jpeg;base64,AA' });
  post({ action: 'submitManualAttendance', namaMahasiswa: 'Kedua', nim: 'J2', waktuPiket: '16.00', status: 'Tidak Hadir', fotoBase64: 'data:image/jpeg;base64,BB' });
  const r = JSON.parse(doGet().s);
  if (r.status !== 'success') throw new Error(JSON.stringify(r));
  if (r.total !== 2) throw new Error('total=' + r.total);
  if (r.data[0].nama !== 'Kedua') throw new Error('urutan: ' + r.data[0].nama);
  if (r.data[0].manual !== true) throw new Error('manual flag salah');
  if (r.data[1].manual !== false) throw new Error('manual flag salah (mahasiswa)');
  if (!r.data[0].refFoto) throw new Error('refFoto hilang');
  if (!/^\[FILE\] MANUAL_/.test(r.data[0].refFoto)) throw new Error('ref: ' + r.data[0].refFoto);
});
t('doGet: baris kosong dilewati', () => {
  reset();
  post({ namaMahasiswa: 'Satu', nim: 'J1', waktuPiket: '06.30', fotoBase64: 'data:image/jpeg;base64,AA' });
  const sh = SpreadsheetApp._ss._sheets['data_absen61'];
  sh._v.push([]); // baris kosong di tengah
  const r = JSON.parse(doGet().s);
  if (r.total !== 1) throw new Error('total=' + r.total);
});

// ============ tidak ada Drive sama sekali ============
t('Code.gs tidak menyentuh Drive sama sekali', () => {
  const src = fs.readFileSync('Code.gs', 'utf8');
  const pCode = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ['DriveApp', 'FOLDER_ID', 'createFile', 'newBlob', 'base64Decode', 'setSharing'].forEach((token) => {
    if (pCode.includes(token)) throw new Error('masih ada: ' + token);
  });
});

// ============ resolution spreadsheet ============
//
// Urutan di getSpreadsheet_(): Script Property > SPREADSHEET_ID di kode >
// bound. Tes ini mengunci urutan itu, karena salah urutan berarti script
// diam-diam menulis ke spreadsheet yang salah.
t('SPREADSHEET_ID di kode terisi', () => {
  const isi = String(SPREADSHEET_ID).trim();
  if (isi === '') throw new Error('SPREADSHEET_ID kosong di kode');
  if (!/^[A-Za-z0-9_-]{20,}$/.test(isi)) throw new Error('format ID aneh: ' + isi);
});

t('Script Property menang atas variabel di kode', () => {
  PropertiesService._p.SPREADSHEET_ID = 'ID-DARI-PROPERTY';
  SpreadsheetApp._knownIds.push('ID-DARI-PROPERTY');
  // Kalau urutan terbalik, openById akan dapat ID kode dan gagal.
  const ss = getSpreadsheet_();
  if (ss !== SpreadsheetApp._ss) throw new Error('tidak mengambil dari Script Property');
  delete PropertiesService._p.SPREADSHEET_ID;
});

t('tanpa Property, pakai SPREADSHEET_ID di kode', () => {
  delete PropertiesService._p.SPREADSHEET_ID;
  const ss = getSpreadsheet_();
  if (ss !== SpreadsheetApp._ss) throw new Error('tidak memakai SPREADSHEET_ID di kode');
});

t('kalau ID salah, errornya menyebut cara memperbaikinya', () => {
  delete PropertiesService._p.SPREADSHEET_ID;
  const known = SpreadsheetApp._knownIds.slice();
  SpreadsheetApp._knownIds.length = 0;
  try {
    getSpreadsheet_();
    throw new Error('harusnya throw, tapi tidak');
  } catch (e) {
    if (!/SPREADSHEET_ID/.test(e.message)) throw new Error('pesan kurang jelas: ' + e.message);
  } finally {
    SpreadsheetApp._knownIds.push(...known);
  }
});

console.log(tests.join('\n'));
console.log('\n=== ' + tests.length + ' tes, ' + tests.filter(x => x.startsWith('FAIL')).length + ' gagal ===');