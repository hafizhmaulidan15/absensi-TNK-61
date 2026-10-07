// Harness: menjalankan Code.gs dengan stub API Google Apps Script.
global.SpreadsheetApp = {
  _ss: null,
  getActiveSpreadsheet(){ if(!this._ss) throw new Error('getActiveSpreadsheet() mengembalikan null'); return this._ss; },
  openById(id){ if(id==='TEST_ID') return this._ss; throw new Error('Spreadsheet tidak ditemukan: '+id); },
};
global.DriveApp = {
  _folder: null,
  getFolderById(id){
    if(id!=='FOLDER_OK') throw new Error('Folder tidak ditemukan: '+id);
    return { getName:()=>'Folder Lab TNK 61',
      createFile(blob){ return { setSharing(){}, getUrl:()=>'https://drive.google.com/file/d/'+blob.n }; } };
  },
  Access:{ANYONE_WITH_LINK:'ANYONE_WITH_LINK'}, Permission:{VIEW:'VIEW'},
};
global.Utilities = {
  newBlob(b,m,n){ return {b,m,n}; },
  base64Decode(s){ return s; },
  formatDate(d,tz,f){ return 'WIB'; },
};
global.ContentService = {
  createTextOutput(s){ return { s, setMimeType(){ return this; } }; },
  MimeType:{JSON:'application/json'},
};
global.Logger = { log(m){ console.log('LOG: '+m); } };
global.SpreadsheetApp_getUi = ()=>({ alert(m){ console.log('=== POPUP ===\n'+m); } });
SpreadsheetApp.getUi = ()=>({ alert(m){ console.log('=== POPUP ===\n'+m); } });

// require Code.gs
const fs=require('fs');
const src=fs.readFileSync('Code.gs','utf8');
eval(src);

// ---- Setup spreadsheet palsu ----
function makeSheet(name, row1){
  return {
    _name:name, _v:[row1||[]],
    getName(){return this._name;}, getId(){return 'SPREADSHEET_PALS';},
    getLastRow(){return this._v.length;},
    getRange(r,c,nr,nc){ const self=this; return {
      getValues(){ const out=[]; for(let i=0;i<nr;i++){ const row=[]; for(let j=0;j<nc;j++) row.push(self._v[r-1+i]?.[c-1+j] ?? ''); out.push(row);} return out; },
      setValues(v){ for(let i=0;i<nr;i++){ if(!self._v[r-1+i]) self._v[r-1+i]=[]; for(let j=0;j<nc;j++) self._v[r-1+i][c-1+j]=v[i][j]; } },
    };},
getDataRange(){ return this.getRange(1,1,this._v.length,HEADERS.length); },
    setFrozenRows(){},
    appendRow(row){ this._v.push(row.slice()); },
    deleteRow(i){ this._v.splice(i-1,1); },
  };
}
SpreadsheetApp._ss = {
  getName(){return 'Data Absensi 61';}, getId(){return 'SPREADSHEET_PALS';},
  getSheetByName(n){ return this._sheets?.[n] || null; },
  insertSheet(n){ this._sheets=this._sheets||{}; this._sheets[n]=makeSheet(n,null); return this._sheets[n]; },
  _sheets:{},
};

const tests=[];
function t(name, fn){ try{ fn(); tests.push('OK   '+name); }catch(e){ tests.push('FAIL '+name+' -> '+e.message); } }

// --- 1. testSetup dengan tab belum ada (harus buat otomatis) ---
t('testSetup membuat tab + header otomatis', ()=>{
  SpreadsheetApp._ss._sheets={};
  testSetup();
  const sh=SpreadsheetApp._ss._sheets['data_absen61'];
  if(!sh) throw new Error('tab tidak dibuat');
  const h=sh._v[0].join('|');
  const want=HEADERS.join('|');
  if(h!==want) throw new Error('header salah: '+h);
});

// --- 2. doPost mahasiswa ---
t('doPost mahasiswa -> 9 kolom + referensi file', ()=>{
  SpreadsheetApp._ss._sheets={};
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({
    action:'submitAttendance', namaMahasiswa:'Budi Santoso', nim:'J0301211099',
    divisi:'Divisi Unggas', waktuPiket:'06.30', lokasi:'Kandang Puyuh',
    status:'Tepat Waktu', catatan:'Pakan 12kg', fotoBase64:'data:image/jpeg;base64,AAAA'})}}).s);
  if(out.status!=='success') throw new Error(out.message);
  const sh=SpreadsheetApp._ss._sheets['data_absen61'];
  const row=sh._v[1];
  if(row.length!==9) throw new Error('kolom='+row.length);
  if(!/^\[FILE\] Budi_Santoso_/.test(row[8])) throw new Error('ref: '+row[8]);
  if(/MANUAL_/.test(row[8])) throw new Error('mahasiswa tidak boleh MANUAL_');
  if(/INPUT MANUAL/.test(row[7])) throw new Error('mahasiswa tidak boleh tag manual');
});

// --- 3. doPost manual ---
t('doPost manual -> [INPUT MANUAL] + MANUAL_ di ref', ()=>{
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({
    action:'submitManualAttendance', namaMahasiswa:'Siti Nurhaliza', nim:'',
    divisi:'Divisi Sanitasi', waktuPiket:'12.00', lokasi:'Penelitian',
    status:'Izin', catatan:'Dispensasi', fotoBase64:'data:image/png;base64,BBBB'})}}).s);
  if(out.status!=='success') throw new Error(out.message);
  const sh=SpreadsheetApp._ss._sheets['data_absen61'];
  const row=sh._v[sh._v.length-1];
  if(!/\[INPUT MANUAL\]/.test(row[7])) throw new Error('catatan: '+row[7]);
  if(!/^\[FILE\] MANUAL_Siti_Nurhaliza_/.test(row[8])) throw new Error('ref: '+row[8]);
  if(!/\.png$/.test(row[8])) throw new Error('ext harus png: '+row[8]);
});

// --- 4. validasi ---
t('doPost tolak nama kosong', ()=>{
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({waktuPiket:'06.30',namaMahasiswa:''})}}).s);
  if(out.status!=='error') throw new Error('harusnya error');
});
t('doPost tolak shift ngawur', ()=>{
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({namaMahasiswa:'X',waktuPiket:'99.99'})}}).s);
  if(out.status!=='error') throw new Error('harusnya error');
});
t('doPost tolak lokasi ngawur', ()=>{
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({namaMahasiswa:'X',waktuPiket:'06.30',lokasi:'Kandang Ayam'})}}).s);
  if(out.status!=='error') throw new Error('harusnya error');
});
t('doPost tolak status manual ngawur', ()=>{
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({action:'submitManualAttendance',namaMahasiswa:'X',waktuPiket:'06.30',status:'Ngawur'})}}).s);
  if(out.status!=='error') throw new Error('harusnya error');
});
t('doPost tolak JSON rusak', ()=>{
  const out=JSON.parse(doPost({postData:{contents:'{bukan json'}}).s);
  if(out.status!=='error') throw new Error('harusnya error');
});

// --- 5. header existing tidak ditimpa ---
t('header lama tidak ditimpa', ()=>{
  SpreadsheetApp._ss._sheets={ 'data_absen61': makeSheet('data_absen61',['Data Lama','Budi','x','y','z']) };
  const sh=ensureSheet_();
  if(sh._v[0][0]!=='Data Lama') throw new Error('header ditimpa: '+sh._v[0][0]);
});

// --- 6. doGet ---
t('doGet: terbaru di atas + kolom refFoto', ()=>{
  SpreadsheetApp._ss._sheets={};
  doPost({postData:{contents:JSON.stringify({namaMahasiswa:'Pertama',waktuPiket:'06.30',fotoBase64:''})}});
  doPost({postData:{contents:JSON.stringify({action:'submitManualAttendance',namaMahasiswa:'Kedua',waktuPiket:'16.00',status:'Izin'})}});
  const out=JSON.parse(doGet().s);
  if(out.status!=='success') throw new Error(out.message);
  if(out.data.length!==2) throw new Error('jumlah='+out.data.length);
  if(out.data[0].nama!=='Kedua') throw new Error('urutan salah: '+out.data[0].nama);
  if(out.data[0].manual!==true) throw new Error('flag manual salah');
  if(out.data[1].manual!==false) throw new Error('flag manual salah (mahasiswa)');
  if(typeof out.data[0].refFoto!=='string') throw new Error('refFoto hilang');
});

// --- 7. Drive ---
t('FOLDER_ID kosong -> upload dilewati, ref tetap ada', ()=>{
  SpreadsheetApp._ss._sheets={};
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({namaMahasiswa:'TanpaDrive',waktuPiket:'06.30',fotoBase64:'data:image/jpeg;base64,AA'})}}).s);
  if(out.uploaded!==false) throw new Error('uploaded harus false');
  if(!out.refFoto) throw new Error('ref kosong padahal ada foto');
});
t('FOLDER_ID benar -> uploaded true', ()=>{
  SpreadsheetApp._ss._sheets={};
  const old=FOLDER_ID; FOLDER_ID='FOLDER_OK';
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({namaMahasiswa:'DenganDrive',waktuPiket:'06.30',fotoBase64:'data:image/jpeg;base64,AA'})}}).s);
  FOLDER_ID=old;
  if(out.uploaded!==true) throw new Error('uploaded='+out.uploaded);
});
t('FOLDER_ID salah -> tidak fatal, ref tetap ada', ()=>{
  SpreadsheetApp._ss._sheets={};
  const old=FOLDER_ID; FOLDER_ID='FOLDER_SALAH';
  const out=JSON.parse(doPost({postData:{contents:JSON.stringify({namaMahasiswa:'DriveError',waktuPiket:'06.30',fotoBase64:'data:image/jpeg;base64,AA'})}}).s);
  FOLDER_ID=old;
  if(out.status!=='success') throw new Error('gagal total: '+out.message);
  if(!out.refFoto) throw new Error('ref kosong');
});

console.log(tests.join('\n'));
console.log('\n=== '+tests.length+' tes, '+tests.filter(x=>x.startsWith('FAIL')).length+' gagal ===');
