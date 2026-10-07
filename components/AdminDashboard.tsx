'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AttendanceRecord,
  PiketShift,
  UnitLocation,
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

const LOCATIONS: UnitLocation[] = ['Kandang Puyuh', 'Kandang Itik', 'Penelitian'];

/** Kartu sebaran (bar proporsional) */
const BreakdownCard: React.FC<{
  title: string;
  items: Array<{ label: string; value: number; bar: string }>;
}> = ({ title, items }) => {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3">
        {title}
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[11px] text-slate-300 truncate">{item.label}</span>
              <span className="text-[11px] font-mono font-bold text-white tabular-nums shrink-0">
                {item.value}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${item.bar} transition-all`}
                style={{ width: `${Math.round((item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Kartu KPI console gelap */
const KpiCard: React.FC<{
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
  valueClass: string;
}> = ({ label, value, hint, icon, accent, valueClass }) => (
  <div className={`bg-slate-900 border border-slate-800 border-l-4 ${accent} rounded-xl p-4`}>
    <div className="flex items-center justify-between text-slate-400 text-[10px] font-semibold uppercase tracking-wider font-mono">
      <span className="truncate">{label}</span>
      {icon}
    </div>
    <div className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${valueClass}`}>
      {value}
    </div>
    <div className="mt-1 text-slate-500 text-[11px]">{hint}</div>
  </div>
);

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
            division: row.divisi || '',
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

  // Navigasi panel: layout memakai sidebar, bukan menumpuk semua di satu kolom
  const [view, setView] = useState<'ringkasan' | 'data'>('ringkasan');

  // Add Manual Record Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState('');
const [manualNim, setManualNim] = useState('');
  const [manualDivision, setManualDivision] = useState('');
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
    // Tanpa data, tampilkan "—" supaya tidak terlihat seperti accomplishments 100%
    const tepatWaktuPct = total > 0 ? Math.round((tepatWaktuCount / total) * 100) : null;

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
  // Panel admin memakai visual "console" gelap, sengaja berbeda dari portal
  // mahasiswa yang terang — supaya saat Intent galat, layar ini tidak tertukar
  // dengan form presensi.
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl shadow-slate-900/30">
          <div className="px-6 py-6 text-center border-b border-slate-800">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-ipb-orange" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ipb-orange mb-1.5">
              Restricted Access
            </div>
            <h2 className="text-lg font-mono font-bold tracking-tight text-white">
              panel_admin
            </h2>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Dosen &amp; Koordinator Piket &middot; TNK 61
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="••••••••"
                  className="w-full px-3 py-3 pr-20 rounded-lg bg-slate-800 border border-slate-700 text-sm tracking-widest font-mono text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1.5 rounded text-[10px] font-mono font-bold uppercase text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? 'sembunyi' : 'lihat'}
                </button>
              </div>

              {passwordError && (
                <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>access_denied &mdash; password salah</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-ipb-orange hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[46px]"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Panel</span>
            </button>

            <p className="text-[10px] text-slate-600 text-center font-mono leading-relaxed">
              Pin dicek di sisi klien. Siapa pun yang Inspect Element bisa
              membacanya dari bundle JS.
            </p>
          </form>
        </div>
      </div>
    );
  }

// AUTHENTICATED: sidebar kiri (kontrol + navigasi) + area konten kanan
  return (
    <div className="max-w-7xl mx-auto my-6 px-3 sm:px-5">
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* ============ SIDEBAR ============ */}
        <aside className="lg:col-span-3 xl:col-span-2 lg:sticky lg:top-24 space-y-4 mb-5 lg:mb-0">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="h-1 bg-ipb-orange" />
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ipb-orange">
                  admin_panel
                </span>
              </div>
              <h2 className="text-base font-bold text-white font-mono leading-tight break-all">
                rekap_presensi
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                TNK 61 &middot; SV IPB
              </p>
            </div>
          </div>

          {/* Navigasi */}
          <nav className="bg-slate-900 rounded-2xl border border-slate-800 p-1.5 space-y-1">
            {(
              [
                { key: 'ringkasan' as const, label: 'Ringkasan', icon: <ShieldCheck className="w-4 h-4" /> },
                { key: 'data' as const, label: 'Data Presensi', icon: <Calendar className="w-4 h-4" /> },
              ]
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                aria-current={view === item.key}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                  view === item.key
                    ? 'bg-ipb-blue text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Aksi */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-2 space-y-1.5">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ipb-orange hover:bg-orange-600 text-white text-xs font-bold transition-colors min-h-[42px] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Input Manual</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors min-h-[42px] cursor-pointer font-mono"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>export.csv</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAuthenticated(false)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 text-xs font-semibold transition-colors min-h-[42px] cursor-pointer font-mono"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>lock_panel</span>
            </button>
          </div>

          {/* Ringkasan angka ringkas di sidebar */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              ringkasan cepat
            </div>
            {[
              { label: 'Total', value: stats.total },
              { label: 'Hari ini', value: stats.todayCount },
              {
                label: 'Ketepatan',
                value:
                  stats.tepatWaktuPct === null ? '—' : `${stats.tepatWaktuPct}%`,
              },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-slate-400">{s.label}</span>
                <span className="text-sm font-bold text-white font-mono tabular-nums">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* ============ KONTEN ============ */}
        {/* bukan <main>: halaman sudah punya satu <main>, dan <main> tidak boleh bersarang */}
        <div className="lg:col-span-9 xl:col-span-10 space-y-5">
          {view === 'ringkasan' ? (
            <>
          {/* Summary KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Presensi Tercatat"
          value={String(stats.total)}
          hint="Akumulasi seluruh riwayat piket"
          icon={<CheckCircle className="w-4 h-4" />}
          accent="border-l-blue-500"
          valueClass="text-white"
        />

        <KpiCard
          label="Presensi Hari Ini"
          value={String(stats.todayCount)}
          hint="Masuk hari ini (WIB)"
          icon={<Clock className="w-4 h-4" />}
          accent="border-l-ipb-orange"
          valueClass="text-ipb-orange"
        />

        <KpiCard
          label="Tingkat Ketepatan Waktu"
          value={stats.tepatWaktuPct === null ? '—' : `${stats.tepatWaktuPct}%`}
          hint={
            stats.tepatWaktuPct === null
              ? 'Belum ada data untuk dihitung'
              : 'Tepat dalam toleransi shift'
          }
          icon={<ShieldCheck className="w-4 h-4" />}
          accent="border-l-emerald-500"
          valueClass="text-emerald-400"
        />

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-purple-500 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 text-slate-400 text-[10px] font-semibold uppercase tracking-wider font-mono">
            <span className="truncate">Distribusi Sesi</span>
            <Filter className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="mt-2.5 space-y-1">
            {[
              { label: 'Pagi', value: stats.pagi, bar: 'bg-blue-500' },
              { label: 'Siang', value: stats.siang, bar: 'bg-ipb-orange' },
              { label: 'Sore', value: stats.sore, bar: 'bg-purple-500' },
            ].map((s) => {
              const max = Math.max(stats.pagi, stats.siang, stats.sore, 1);
              return (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-10 font-mono shrink-0">
                    {s.label}
                  </span>
                  <span className="text-[11px] text-white font-mono font-bold w-5 shrink-0">
                    {s.value}
                  </span>
                  <span className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${s.bar}`}
                      style={{ width: `${Math.round((s.value / max) * 100)}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </div>
<div className="mt-2 text-slate-500 text-[10px] font-mono">jumlah per waktu piket</div>
        </div>
      </div>

      {/* Sebaran lokasi & divisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <BreakdownCard
                  title="Sebaran Lokasi"
                  items={LOCATIONS.map((l) => ({
                    label: l,
                    value: rows.filter((r) => r.location === l).length,
                    bar: 'bg-emerald-400',
                  }))}
                />
                <BreakdownCard
                  title="Sebaran Shift"
                  items={[
                    { label: 'Pagi 06.30', value: stats.pagi, bar: 'bg-blue-400' },
                    { label: 'Siang 12.00', value: stats.siang, bar: 'bg-ipb-orange' },
                    { label: 'Sore 16.00', value: stats.sore, bar: 'bg-purple-400' },
                  ]}
                />
              </div>
            </>
          ) : (
            <>
{/* Filter and Search Bar */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isLoadingSheet
                  ? 'bg-amber-400 animate-pulse'
                  : sheetError
                    ? 'bg-rose-500'
                    : 'bg-emerald-400'
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-60 cursor-pointer min-h-[36px] font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`} />
            <span>refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
{/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="cari nama / NIM / lokasi..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange text-white placeholder:text-slate-500 font-mono"
            />
          </div>

          {/* Quick Date Segmented Controls */}
          <div className="md:col-span-5 flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 overflow-x-auto">
            <button
              type="button"
              onClick={() => setDateFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'all'
                  ? 'bg-ipb-blue text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'today'
                  ? 'bg-ipb-blue text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'yesterday'
                  ? 'bg-ipb-blue text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'week'
                  ? 'bg-ipb-blue text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                dateFilterType === 'custom'
                  ? 'bg-ipb-blue text-white'
                  : 'text-slate-400 hover:text-white'
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
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange text-white font-mono"
            >
              <option value="all">semua_shift</option>
              <option value="06.30">06.30 (pagi)</option>
              <option value="12.00">12.00 (siang)</option>
              <option value="16.00">16.00 (sore)</option>
            </select>
          </div>

        </div>

{/* Custom Date Input if selected */}
        {dateFilterType === 'custom' && (
          <div className="pt-2 flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 font-mono">tanggal:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
            />
          </div>
        )}
      </div>

      {/* Main Records Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm font-mono">
              daftar_presensi
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {filteredRecords.length} / {rows.length} baris ditampilkan
            </p>
          </div>

          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            {sheetError ? 'sumber: local' : `sumber: sheet (${sheetRecords.length})`}
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-300 font-mono">
              0 baris cocok
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ubah filter tanggal atau kata kunci pencarian nama mahasiswa.
            </p>
          </div>
        ) : (
<div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-3 px-4">Waktu (WIB)</th>
                  <th className="py-3 px-4">Mahasiswa</th>
                  <th className="py-3 px-4">Divisi</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Lokasi</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Foto</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs sm:text-sm text-slate-300">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-white">
                        {rec.formattedDate}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {rec.formattedTime}
                      </div>
                    </td>

                    {/* Student Name & NIM */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{rec.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {rec.studentNim}
                      </div>
                    </td>

                    {/* Division */}
                    <td className="py-3 px-4 max-w-[180px]">
                      <span
                        className="text-[11px] text-slate-400 leading-tight"
                        title={rec.division}
                      >
                        {rec.division || '—'}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-300">
                        {rec.shift}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 max-w-xs truncate" title={rec.location}>
                      <span className="text-xs text-slate-300">{rec.location}</span>
                      {rec.notes && (
                        <p className="text-[11px] text-slate-500 truncate italic">
                          &quot;{rec.notes}&quot;
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            rec.status === 'Tepat Waktu'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : rec.status === 'Toleransi'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {rec.status}
                        </span>
                        {/manual/i.test(rec.notes || '') && (
                          <span
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded font-mono bg-slate-700 text-slate-300"
                            title={rec.notes}
                          >
                            manual
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isViewablePhoto(rec.photoUrl) ? (
                        <button
                          type="button"
                          onClick={() => setPreviewRecord(rec)}
                          className="group relative inline-block rounded-lg overflow-hidden border border-slate-700 hover:border-ipb-orange transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rec.photoUrl}
                            alt="Thumbnail Foto"
                            className="w-12 h-10 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-12 h-10 rounded-lg border border-dashed border-slate-700 text-slate-600"
                          title={rec.photoUrl || 'Foto tidak tersimpan'}
                        >
                          <Camera className="w-4 h-4" />
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewRecord(rec)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-ipb-orange hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Lihat Detail & Foto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: PREVIEW FOTO DETAIL (Full Resolution) */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
<div className="bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden border border-slate-700 animate-fade-in">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-ipb-orange shrink-0" />
                <span className="font-bold text-sm text-white font-mono truncate">
                  bukti_foto
                </span>
                <span className="font-mono text-[10px] text-slate-500 truncate">
                  {previewRecord.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="Tutup"
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
                <div className="text-center text-slate-400 px-4 py-8 space-y-2">
                  <Camera className="w-8 h-8 mx-auto" />
                  <p className="text-xs">
                    Foto tidak tersimpan di penyimpanan online.
                  </p>
                  <p className="text-[11px] text-slate-600 break-all font-mono">
                    referensi: {previewRecord.photoUrl || 'tidak ada'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 space-y-3 bg-slate-900 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">
                    mahasiswa
                  </span>
                  <span className="font-semibold text-white">{previewRecord.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">nim</span>
                  <span className="font-mono text-slate-300">{previewRecord.studentNim}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">
                    waktu_submit
                  </span>
                  <span className="font-mono text-slate-300">
                    {previewRecord.formattedDate} {previewRecord.formattedTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">
                    shift
                  </span>
                  <span className="font-mono font-bold text-blue-300">
                    {previewRecord.shift} WIB
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">
                  divisi_piket
                </span>
                <span className="text-slate-300">{previewRecord.division || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">
                  lokasi
                </span>
                <span className="text-slate-300">{previewRecord.location}</span>
              </div>

              {previewRecord.notes && (
                <div>
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">
                    catatan_kegiatan
                  </span>
                  <p className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs">
                    {previewRecord.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs font-mono transition-colors cursor-pointer"
                >
                  tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH DATA MANUAL OLEH ADMIN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden border border-slate-700 animate-fade-in">
            
            <div className="px-5 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white font-mono">input_presensi_manual</h3>
                <p className="text-[11px] text-slate-400 font-mono">Untuk data susulan atau dispensasi piket</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="p-6 space-y-4 text-xs sm:text-sm text-slate-200">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Nama Mahasiswa
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nama Lengkap..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  NIM Mahasiswa
                </label>
                <input
                  type="text"
                  value={manualNim}
                  onChange={(e) => setManualNim(e.target.value)}
                  placeholder="Contoh: J0301221001"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                />
              </div>

<div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Divisi Piket
                </label>
                <input
                  type="text"
                  value={manualDivision}
                  onChange={(e) => setManualDivision(e.target.value)}
                  placeholder="Tuliskan divisi piket"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                    Shift Piket
                  </label>
                  <select
                    value={manualShift}
                    onChange={(e) => setManualShift(e.target.value as PiketShift)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                  >
                    <option value="06.30">06.30 (Pagi)</option>
                    <option value="12.00">12.00 (Siang)</option>
                    <option value="16.00">16.00 (Sore)</option>
                  </select>
                </div>

<div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                    Status Kehadiran
                  </label>
                  <select
                    value={manualStatus}
                    onChange={(e) =>
                      setManualStatus(e.target.value as AttendanceRecord['status'])
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                  >
                    <option value="Tepat Waktu">Tepat Waktu</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Toleransi">Toleransi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Lokasi Unit Kandang
                </label>
                <select
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value as UnitLocation)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                >
{LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

<div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
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
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-slate-900/90 text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                      title="Hapus foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 py-5 px-3 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-ipb-orange transition-colors text-center">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Catatan Keterangan
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Alasan input manual oleh koordinator..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-ipb-orange focus:border-ipb-orange"
                />
              </div>

              {manualError && (
                <p className="text-xs text-rose-400 font-mono">{manualError}</p>
              )}

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 font-semibold font-mono transition-colors cursor-pointer"
                >
                  Batal
                </button>
<button
                  type="submit"
                  disabled={isSavingManual}
                  className="px-5 py-2.5 rounded-lg bg-ipb-orange hover:bg-orange-600 text-white font-bold font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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



