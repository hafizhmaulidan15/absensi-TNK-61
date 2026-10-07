'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AttendanceRecord,
  PiketShift,
  UnitLocation,
  PiketDivision,
} from '@/types/attendance';
import { formatWIBDate, formatWIBTime } from '@/lib/timeUtils';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Search,
  Calendar,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Filter,
  Camera,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';

const DIVISIONS: PiketDivision[] = [
  'Divisi Unggas (Puyuh & Itik)',
  'Divisi Pakan & Nutrisi Ternak',
  'Divisi Kesehatan & Biosekuriti',
  'Divisi Penelitian & Data Lapangan',
  'Divisi Sanitasi & Kebersihan',
  'Divisi Sarana & Prasarana',
];

const LOCATIONS: UnitLocation[] = ['Kandang Puyuh', 'Kandang Itik', 'Penelitian'];

interface AdminDashboardProps {
  records: AttendanceRecord[];
  onDeleteRecord: (id: string) => void;
  onVerifyRecord: (id: string) => void;
  onAddManualRecord: (record: AttendanceRecord) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  gasWebhookUrl: string;
}

const CORRECT_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? 'TNK61SVIPB';

// Hanya data URL foto (kamera) dan link http(s) yang bisa ditampilkan.
// Nilai referensi "[FILE] nama_timestamp" bukan URL, jadi tidak di-render sebagai gambar.
const isViewablePhoto = (url: string) =>
  !!url && (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://'));

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  records,
  onDeleteRecord,
  onVerifyRecord,
  onAddManualRecord,
  isAuthenticated,
  setIsAuthenticated,
  gasWebhookUrl,
}) => {
  // Login / Password state
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Data dari spreadsheet
  const [sheetRecords, setSheetRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Sumber data: spreadsheet (utama), localStorage sebagai cadangan
  const rows = sheetRecords.length > 0 ? sheetRecords : records;

  const loadFromSheet = useCallback(async () => {
    if (!gasWebhookUrl) {
      setSheetRecords([]);
      setSheetError(
        'GAS_WEBHOOK_URL di app/page.tsx masih kosong. Isi URL /exec dari deployment Apps Script TNK 61 untuk bisa menarik data spreadsheet.'
      );
      return;
    }
    setIsLoadingSheet(true);
    setSheetError(null);
    try {
      const res = await fetch(gasWebhookUrl, { cache: 'no-store' });
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        const mapped: AttendanceRecord[] = json.data.map(
          (row: Record<string, string>, i: number) => ({
            id: `SHEET-${i}-${row.timestamp || i}`,
            timestamp: row.timestamp || new Date().toISOString(),
            formattedDate: row.tanggal || '',
            formattedTime: `${row.waktu || ''} WIB`,
            studentName: row.nama || '',
            studentNim: row.nim || '',
            division: (row.divisi || DIVISIONS[0]) as PiketDivision,
            shift: (row.shift || '06.30') as PiketShift,
            location: (row.lokasi || 'Kandang Puyuh') as UnitLocation,
            photoUrl: row.urlFoto || '',
            notes: row.catatan || '',
            status: (row.status || 'Tepat Waktu') as AttendanceRecord['status'],
            verified: /manual/i.test(row.catatan || ''),
            syncedToDrive: true,
          })
        );
        setSheetRecords(mapped);
      } else {
        setSheetError(json.message || 'Gagal memuat data dari spreadsheet.');
      }
    } catch {
      setSheetError('Tidak dapat menghubungi spreadsheet. Data lokal ditampilkan.');
    } finally {
      setIsLoadingSheet(false);
    }
  }, [gasWebhookUrl]);

  // Muat data spreadsheet begitu admin berhasil login
  useEffect(() => {
    if (!isAuthenticated) return;
    // Ditunda satu tick agar setState di dalam effect tidak memicu render berantai
    const t = window.setTimeout(() => {
      loadFromSheet();
    }, 0);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, loadFromSheet]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | PiketShift>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Tepat Waktu' | 'Toleransi' | 'Terlambat'>('all');

  // Preview Modal state
  const [previewRecord, setPreviewRecord] = useState<AttendanceRecord | null>(null);

  // Add Manual Record Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState('');
const [manualNim, setManualNim] = useState('');
  const [manualDivision, setManualDivision] = useState<PiketDivision>(DIVISIONS[0]);
  const [manualShift, setManualShift] = useState<PiketShift>('06.30');
  const [manualLocation, setManualLocation] = useState<UnitLocation>('Kandang Puyuh');
  const [manualNotes, setManualNotes] = useState('');
  const [manualStatus, setManualStatus] = useState<AttendanceRecord['status']>('Tepat Waktu');
  const [manualPhoto, setManualPhoto] = useState('');
  const [manualPhotoPreview, setManualPhotoPreview] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Handle Password Login
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === CORRECT_PIN) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

// Filtered records
  const filteredRecords = useMemo(() => {
    const today = new Date();
    const todayStr = formatWIBDate(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatWIBDate(yesterday);

    return rows.filter((rec) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.studentName.toLowerCase().includes(q);
        const matchNim = rec.studentNim.toLowerCase().includes(q);
        const matchLoc = rec.location.toLowerCase().includes(q);
        if (!matchName && !matchNim && !matchLoc) return false;
      }

      // Date Filter
      if (dateFilterType === 'today') {
        if (rec.formattedDate !== todayStr) return false;
      } else if (dateFilterType === 'yesterday') {
        if (rec.formattedDate !== yesterdayStr) return false;
      } else if (dateFilterType === 'week') {
        const recDate = new Date(rec.timestamp);
        const todayJakarta = new Date(
          new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(today)
        );
        const recJakarta = new Date(
          new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(recDate)
        );
        const diffDays = (todayJakarta.getTime() - recJakarta.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (dateFilterType === 'custom' && customDate) {
        const parts = customDate.split('-'); // YYYY-MM-DD
        if (parts.length === 3) {
          const expected = `${parts[2]}/${parts[1]}/${parts[0]}`;
          if (rec.formattedDate !== expected) return false;
        }
      }

      // Shift Filter
      if (shiftFilter !== 'all' && rec.shift !== shiftFilter) return false;

      // Status Filter
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;

      return true;
    });
}, [rows, searchQuery, dateFilterType, customDate, shiftFilter, statusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = rows.length;
    const todayCount = rows.filter((r) => r.formattedDate === formatWIBDate(new Date())).length;
    const tepatWaktuCount = rows.filter((r) => r.status === 'Tepat Waktu').length;
    const tepatWaktuPct = total > 0 ? Math.round((tepatWaktuCount / total) * 100) : 100;

const pagi = rows.filter((r) => r.shift === '06.30').length;
    const siang = rows.filter((r) => r.shift === '12.00').length;
    const sore = rows.filter((r) => r.shift === '16.00').length;

    return { total, todayCount, tepatWaktuPct, pagi, siang, sore };
  }, [rows]);

  // Export to CSV
  const handleExportCSV = () => {
    if (rows.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'ID Presensi',
      'Tanggal',
      'Waktu WIB',
'Nama Mahasiswa',
      'NIM',
      'Divisi Piket',
      'Shift Piket',
      'Lokasi Unit/Kandang',
      'Status Kehadiran',
      'Catatan Kegiatan',
      'Terverifikasi',
    ];

const cell = (v: string | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csvRows = rows.map((r) => [
      cell(r.id),
      cell(r.formattedDate),
      cell(r.formattedTime),
      cell(r.studentName),
cell(r.studentNim),
      cell(r.division),
      cell(r.shift),
      cell(r.location),
      cell(r.status),
      cell(r.notes),
      cell(r.verified ? 'Ya' : 'Belum'),
    ]);

const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Presensi_Piket_TNK61_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

// Submit Manual Record
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || isSavingManual) return;
    setIsSavingManual(true);
    setManualError(null);

    const now = new Date();
    const status = manualStatus;
    const catatan = manualNotes.trim() || 'Presensi susulan diinput manual oleh Admin / Dosen.';

    if (!gasWebhookUrl) {
      setIsSavingManual(false);
      setManualError(
        'GAS_WEBHOOK_URL di app/page.tsx masih kosong, jadi data manual tidak bisa masuk spreadsheet.'
      );
      return;
    }

    try {
      // Kirim ke spreadsheet via Apps Script (termasuk foto bila ada)
      await fetch(gasWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitManualAttendance',
          timestamp: now.toISOString(),
          namaMahasiswa: manualName.trim(),
          nim: manualNim.trim(),
          divisi: manualDivision,
          waktuPiket: manualShift,
          lokasi: manualLocation,
          status,
          catatan,
          fotoBase64: manualPhoto || '',
        }),
      });

      const newRec: AttendanceRecord = {
        id: `TNK61-ADM-${Date.now().toString(36).toUpperCase()}`,
        timestamp: now.toISOString(),
        formattedDate: formatWIBDate(now),
        formattedTime: formatWIBTime(now),
        studentName: manualName.trim(),
        studentNim: manualNim.trim(),
        division: manualDivision,
        shift: manualShift,
        location: manualLocation,
        photoUrl: manualPhoto || '',
        notes: catatan,
        status,
        verified: true,
        syncedToDrive: Boolean(gasWebhookUrl),
      };

      onAddManualRecord(newRec);
      setShowAddModal(false);
      setManualName('');
      setManualNim('');
      setManualNotes('');
      setManualPhoto('');
      setManualPhotoPreview('');
    } catch {
      setManualError('Gagal menyimpan data manual. Coba lagi.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleManualPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setManualError('Berkas harus berupa gambar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setManualPhoto(dataUrl);
      setManualPhotoPreview(dataUrl);
      setManualError(null);
    };
    reader.readAsDataURL(file);
  };

  // IF NOT AUTHENTICATED: Show Password Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          
          <div className="bg-blue-800 p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/90 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Autentikasi Panel Admin</h2>
            <p className="text-xs text-blue-100 mt-1">
              Portal Khusus Dosen &amp; Koordinator Piket TNK 61 IPB
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6 sm:p-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Masukkan Password Admin
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Password Admin..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm tracking-wider font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>

              {passwordError && (
                <div className="mt-2 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Password salah. Silakan periksa kembali.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-sm cursor-pointer min-h-[44px]"
            >
              <Unlock className="w-4 h-4" />
              <span>Masuk ke Panel Admin</span>
            </button>
          </form>

        </div>
      </div>
    );
  }

  // AUTHENTICATED: Display Full Dashboard
  return (
    <div className="max-w-7xl mx-auto my-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Header & Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800">
              Panel Pengawas & Rekapitulasi
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500">
              Teknologi dan Manajemen Ternak SV IPB Angkatan 61
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dashboard Rekap Presensi Piket
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring data kehadiran real-time dan verifikasi foto dokumentasi kandang mahasiswa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Data Manual</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>


          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Kunci Panel / Keluar"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Presensi Tercatat</span>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
            {stats.total}
          </div>
          <div className="mt-1 text-slate-500 text-[11px]">
            Akumulasi seluruh riwayat piket
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Presensi Hari Ini</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-orange-600 font-mono tabular-nums">
            {stats.todayCount}
          </div>
          <div className="mt-1 text-slate-500 text-[11px]">
            Masuk hari ini (WIB)
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tingkat Ketepatan Waktu</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 font-mono tabular-nums">
            {stats.tepatWaktuPct}%
          </div>
          <div className="mt-1 text-slate-500 text-[11px]">
            Tepat dalam toleransi shift
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between gap-2 text-slate-500 text-xs font-semibold">
            <span className="truncate">Distribusi Sesi</span>
            <Filter className="w-4 h-4 text-purple-600 shrink-0" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold">
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Pagi: {stats.pagi}
            </span>
            <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              Siang: {stats.siang}
            </span>
            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Sore: {stats.sore}
            </span>
          </div>
          <div className="mt-1 text-slate-500 text-[11px]">
            Jumlah per waktu piket
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
<div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span
              className={`w-2 h-2 rounded-full ${
                isLoadingSheet
                  ? 'bg-amber-500 animate-pulse'
                  : sheetError
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
              }`}
            />
            <span>
              {isLoadingSheet
                ? 'Memuat data dari spreadsheet...'
                : sheetError
                  ? sheetError
                  : `Sumber data: Google Spreadsheet (${sheetRecords.length} baris)`}
            </span>
          </div>
          <button
            type="button"
            onClick={loadFromSheet}
            disabled={isLoadingSheet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer min-h-[36px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama mahasiswa, NIM, lokasi..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
            />
          </div>

          {/* Quick Date Segmented Controls */}
          <div className="md:col-span-5 flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setDateFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'today'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'yesterday'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'custom'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilih Tanggal
            </button>
          </div>

          {/* Shift Filter Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
            >
              <option value="all">Semua Shift (Pagi/Siang/Sore)</option>
              <option value="06.30">Shift 06.30 (Pagi)</option>
              <option value="12.00">Shift 12.00 (Siang)</option>
              <option value="16.00">Shift 16.00 (Sore)</option>
            </select>
          </div>

        </div>

        {/* Custom Date Input if selected */}
        {dateFilterType === 'custom' && (
          <div className="pt-2 flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">Pilih Tanggal Spesifik:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
            />
          </div>
        )}
      </div>

      {/* Main Records Table (DiSekolahKu style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Daftar Rekapitulasi Presensi Piket
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredRecords.length} dari total {rows.length} data absensi
            </p>
          </div>

          <span className="text-xs text-slate-500">
            Data tersimpan lokal di perangkat ini
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Tidak Ada Data Presensi Yang Sesuai
            </div>
<p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba ubah filter tanggal atau kata kunci pencarian nama mahasiswa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Waktu (WIB)</th>
                  <th className="py-3 px-4">Nama Mahasiswa & NIM</th>
<th className="py-3 px-4">Divisi Piket</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Lokasi Piket</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Foto Bukti</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-800">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-slate-900">
                        {rec.formattedDate}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {rec.formattedTime}
                      </div>
                    </td>

                    {/* Student Name & NIM */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {rec.studentName}
                      </div>
                      <div className="text-[11px] font-mono text-blue-700 font-medium">
                        {rec.studentNim}
                      </div>
                    </td>

{/* Division */}
                    <td className="py-3.5 px-4 max-w-[180px]">
                      <span
                        className="text-[11px] text-slate-600 font-medium leading-tight"
                        title={rec.division}
                      >
                        {rec.division}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {rec.shift} WIB
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 max-w-xs truncate" title={rec.location}>
                      <span className="text-xs text-slate-700 font-medium">
                        {rec.location}
                      </span>
                      {rec.notes && (
                        <p className="text-[11px] text-slate-500 truncate italic">
                          &quot;{rec.notes}&quot;
                        </p>
                      )}
                    </td>

{/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            rec.status === 'Tepat Waktu'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'Toleransi'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                        {/manual/i.test(rec.notes || '') && (
                          <span
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700"
                            title={rec.notes}
                          >
                            Manual
                          </span>
                        )}
                      </div>
                    </td>

{/* Photo Thumbnail */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isViewablePhoto(rec.photoUrl) ? (
                        <button
                          type="button"
                          onClick={() => setPreviewRecord(rec)}
                          className="group relative inline-block rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-all shadow-2xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rec.photoUrl}
                            alt="Thumbnail Foto"
                            className="w-12 h-10 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-12 h-10 rounded-lg border border-dashed border-slate-300 text-slate-400"
                          title={rec.photoUrl || 'Foto tidak tersimpan'}
                        >
                          <Camera className="w-4 h-4" />
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewRecord(rec)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Lihat Detail & Foto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Data Presensi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL 1: PREVIEW FOTO DETAIL (Full Resolution) */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Dokumentasi Foto Presensi</span>
                <span className="font-mono text-xs text-orange-400">
                  {previewRecord.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

<div className="p-4 bg-black flex items-center justify-center max-h-96 overflow-hidden">
              {isViewablePhoto(previewRecord.photoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewRecord.photoUrl}
                  alt="Foto Dokumentasi Piket"
                  className="max-h-96 w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-slate-300 px-4 py-8 space-y-2">
                  <Camera className="w-8 h-8 mx-auto" />
                  <p className="text-xs">Foto tidak tersimpan di penyimpanan online.</p>
                  <p className="text-[11px] text-slate-400 break-all">
                    Referensi: {previewRecord.photoUrl || 'tidak ada'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 space-y-3 bg-white text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block text-xs">Mahasiswa:</span>
                  <span className="font-bold text-slate-900">{previewRecord.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">NIM:</span>
                  <span className="font-mono text-slate-800">{previewRecord.studentNim}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Waktu Submit:</span>
                  <span className="font-medium text-slate-800">
                    {previewRecord.formattedDate} · {previewRecord.formattedTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Shift Piket:</span>
                  <span className="font-bold text-blue-700">{previewRecord.shift} WIB</span>
                </div>
              </div>

<div>
                  <span className="text-slate-500 block text-xs">Divisi Piket:</span>
                  <span className="font-medium text-slate-900">{previewRecord.division}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs">Lokasi Kandang:</span>
                  <span className="font-medium text-slate-900">{previewRecord.location}</span>
                </div>

              {previewRecord.notes && (
                <div>
                  <span className="text-slate-500 block text-xs">Catatan Kegiatan:</span>
                  <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                    {previewRecord.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
                >
                  Tutup Tampilan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH DATA MANUAL OLEH ADMIN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            
            <div className="p-5 bg-blue-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Tambah Presensi Manual</h3>
                <p className="text-xs text-blue-100">Untuk data susulan atau dispensasi piket</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nama Mahasiswa
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nama Lengkap..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  NIM Mahasiswa
                </label>
                <input
                  type="text"
                  value={manualNim}
                  onChange={(e) => setManualNim(e.target.value)}
                  placeholder="Contoh: J0301221001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white font-mono"
                />
              </div>

<div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Divisi Piket
                </label>
                <select
                  value={manualDivision}
                  onChange={(e) => setManualDivision(e.target.value as PiketDivision)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Shift Piket
                  </label>
                  <select
                    value={manualShift}
                    onChange={(e) => setManualShift(e.target.value as PiketShift)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="06.30">06.30 (Pagi)</option>
                    <option value="12.00">12.00 (Siang)</option>
                    <option value="16.00">16.00 (Sore)</option>
                  </select>
                </div>

<div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Status Kehadiran
                  </label>
                  <select
                    value={manualStatus}
                    onChange={(e) =>
                      setManualStatus(e.target.value as AttendanceRecord['status'])
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white"
                  >
                    <option value="Tepat Waktu">Tepat Waktu</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Toleransi">Toleransi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Lokasi Unit Kandang
                </label>
                <select
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value as UnitLocation)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white"
                >
{LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

<div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Foto Bukti (Opsional)
                </label>
                {manualPhotoPreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={manualPhotoPreview}
                      alt="Pratinjau foto bukti"
                      className="max-h-40 rounded-xl border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setManualPhoto('');
                        setManualPhotoPreview('');
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-white transition-colors"
                      title="Hapus foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 py-5 px-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors text-center">
                    <Camera className="w-6 h-6 text-slate-400" />
                    <span className="text-[11px] text-slate-500">
                      Ketuk untuk pilih foto
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleManualPhoto}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Catatan Keterangan
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Alasan input manual oleh koordinator..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              {manualError && (
                <p className="text-xs text-rose-600 font-medium">{manualError}</p>
              )}

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
<button
                  type="submit"
                  disabled={isSavingManual}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingManual ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};



