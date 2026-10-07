// mock-gas.js — Server lokal yang meniru kontrak Code.gs (doPost + doGet).
//
// Dipakai untuk menguji frontend tanpa Google Apps Script.
// Jalankan: node tools/mock-gas.js  (default port 8787)
//
// Perilaku sengaja dibuat MIRIP Code.gs:
//  - doPost: validasi nama/waktu, tag [INPUT MANUAL], referensi [FILE] MANUAL_
//  - doGet : 9 kolom, terbaru di atas, header dilewati
//
// Tidak ada Google Drive sama sekali, sama seperti Code.gs production.

const http = require('http');

const PORT = Number(process.env.PORT || 8787);
// Nama tab harus sama dengan SHEET_NAME di Code.gs
const SHEET_NAME = 'data_absen61';
const HEADERS = [
  'Timestamp',
  'Nama Mahasiswa',
  'NIM',
  'Divisi Piket',
  'Waktu Piket',
  'Lokasi',
  'Status',
  'Catatan',
  'Referensi Foto',
];
const TAG_MANUAL_NOTE = '[INPUT MANUAL]';
const TAG_MANUAL_FILE = 'MANUAL_';
const STATUS_MANUAL = ['Tepat Waktu', 'Terlambat', 'Toleransi', 'Izin', 'Tidak Hadir'];
const SHIFT_VALID = ['06.30', '12.00', '16.00'];
const LOKASI_VALID = ['Kandang Puyuh', 'Kandang Itik', 'Penelitian'];

// Baris pretending-seperti spreadsheet, header dulu
let sheet = [HEADERS.slice()];

const str = (v) => String(v === null || v === undefined ? '' : v).trim();

function processFoto(fotoBase64, nama, waktu, isManual) {
  if (!fotoBase64) return { ref: '' };

  let ext = 'jpg';
  const m = String(fotoBase64).match(/^data:image\/(png|jpe?g|webp|heic)/);
  if (m) {
    ext = m[1];
    if (ext === 'jpeg') ext = 'jpg';
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    pad(now.getUTCHours() + 7) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds());

  let base = String(nama).replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) base = 'TanpaNama';
  if (waktu) base = base + '_' + String(waktu).replace('.', '');
  if (isManual) base = TAG_MANUAL_FILE + base;

  return { ref: '[FILE] ' + base + '_' + stamp + '.' + ext };
}

function doPost(contents) {
  let data;
  try {
    data = JSON.parse(contents);
  } catch {
    return { status: 'error', message: 'Payload bukan JSON valid.' };
  }

  const isManual = String(data.action || '') === 'submitManualAttendance';
  const nama = str(data.namaMahasiswa);
  const nim = str(data.nim);
  const divisi = str(data.divisi);
  const waktu = str(data.waktuPiket);
  const lokasi = str(data.lokasi);
  let status = str(data.status);
  let catatan = str(data.catatan);
  const fotoBase64 = String(data.fotoBase64 || '');

  if (!nama) return { status: 'error', message: 'Nama wajib diisi.' };
  if (!nim) return { status: 'error', message: 'NIM wajib diisi.' };
  if (!fotoBase64) return { status: 'error', message: 'Foto dokumentasi wajib diisi.' };
  if (waktu && !SHIFT_VALID.includes(waktu))
    return { status: 'error', message: 'Waktu piket tidak dikenal: ' + waktu };
  if (lokasi && !LOKASI_VALID.includes(lokasi))
    return { status: 'error', message: 'Lokasi tidak dikenal: ' + lokasi };

  if (isManual) {
    catatan = catatan ? catatan + ' ' + TAG_MANUAL_NOTE : TAG_MANUAL_NOTE;
    if (!status) status = 'Tepat Waktu';
    if (!STATUS_MANUAL.includes(status))
      return { status: 'error', message: 'Status tidak dikenal: ' + status };
  } else if (!status) {
    status = 'Tepat Waktu';
  }

  const foto = processFoto(fotoBase64, nama, waktu, isManual);

  sheet.push([
    new Date(),
    nama,
    nim,
    divisi,
    waktu,
    lokasi,
    status,
    catatan,
    foto.ref,
  ]);

  return { status: 'success', refFoto: foto.ref };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function doGet() {
  const rows = [];
  for (let i = 1; i < sheet.length; i++) {
    const r = sheet[i];
    if (!r[0] && !r[1]) continue;
    const d = r[0] ? new Date(r[0]) : null;
    // WIB = UTC+7
    const wib = d ? new Date(d.getTime() + 7 * 3600 * 1000) : null;
    rows.push({
      timestamp: d ? d.toISOString() : '',
      tanggal: wib ? pad2(wib.getUTCDate()) + '/' + pad2(wib.getUTCMonth() + 1) + '/' + wib.getUTCFullYear() : '',
      waktu: wib ? pad2(wib.getUTCHours()) + ':' + pad2(wib.getUTCMinutes()) + ':' + pad2(wib.getUTCSeconds()) : '',
      nama: String(r[1] || ''),
      nim: String(r[2] || ''),
      divisi: String(r[3] || ''),
      shift: String(r[4] || ''),
      lokasi: String(r[5] || ''),
      status: String(r[6] || ''),
      catatan: String(r[7] || ''),
      refFoto: String(r[8] || ''),
      urlFoto: String(r[8] || ''),
      manual: String(r[7] || '').includes(TAG_MANUAL_NOTE) || String(r[8] || '').includes(TAG_MANUAL_FILE),
    });
  }
  rows.reverse();
  return { status: 'success', total: rows.length, data: rows };
}

const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  if (req.method === 'GET' && req.url.startsWith('/exec')) {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(doGet()));
  }

  if (req.method === 'POST' && req.url.startsWith('/exec')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let out;
      try {
        out = doPost(body);
      } catch (e) {
        out = { status: 'error', message: String(e.message || e) };
      }
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
    return;
  }

  // Endpoint bantu: isi data contoh
  if (req.method === 'POST' && req.url.startsWith('/seed')) {
    const samples = [
      { action: 'submitAttendance', namaMahasiswa: 'Ahmad Fauzi Rahman', nim: 'J0301211015', divisi: 'Divisi Unggas (Puyuh & Itik)', waktuPiket: '06.30', lokasi: 'Kandang Puyuh', status: 'Tepat Waktu', catatan: 'Pemberian pakan 12kg.', fotoBase64: 'data:image/jpeg;base64,SEED' },
      { action: 'submitAttendance', namaMahasiswa: 'Siti Nurhaliza Azzahra', nim: 'J0301211042', divisi: 'Divisi Sanitasi & Kebersihan', waktuPiket: '12.00', lokasi: 'Kandang Itik', status: 'Terlambat', catatan: 'Sanasi kolam genangan.', fotoBase64: 'data:image/jpeg;base64,SEED' },
      { action: 'submitManualAttendance', namaMahasiswa: 'Dewi Sartika Lestari', nim: 'J0301211102', divisi: 'Divisi Pakan & Nutrisi Ternak', waktuPiket: '16.00', lokasi: 'Penelitian', status: 'Izin', catatan: 'Dispensasi koordinator.', fotoBase64: 'data:image/jpeg;base64,SEED' },
    ];
    const results = samples.map((s) => doPost(JSON.stringify(s)));
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ seeded: results.length, results }));
  }

  if (req.method === 'POST' && req.url.startsWith('/reset')) {
    sheet = [HEADERS.slice()];
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'success', message: 'sheet dikosongkan' }));
  }

  res.writeHead(404, { ...cors, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'error', message: 'not found' }));
});

server.listen(PORT, () => {
  console.log('mock Code.gs jalan di http://localhost:' + PORT + '/exec');
  console.log('  GET  /exec    -> doGet (daftar baris)');
  console.log('  POST /exec    -> doPost (tambah presensi)');
  console.log('  POST /seed    -> isi 3 data contoh');
  console.log('  POST /reset   -> kosongkan sheet');
});