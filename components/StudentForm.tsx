'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PiketShift,
  UnitLocation,
  AttendanceRecord,
} from '@/types/attendance';
import {
  SHIFT_CONFIGS,
  getShiftAvailability,
  formatIndonesianDate,
  formatWIBTime,
  formatWIBDate,
  calculateAttendanceStatus,
} from '@/lib/timeUtils';
import {
  Camera,
  CheckCircle,
  RotateCcw,
  User,
  Hash,
  Users,
  MapPin,
  FileText,
  ShieldCheck,
Send,
  RefreshCw,
  Lock,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface StudentFormProps {
  currentTime: Date;
  selectedShift: PiketShift;
  onAttendanceSubmitted: (record: AttendanceRecord) => void;
  gasWebhookUrl: string;
  onOpenGuidance: () => void;
}

const UNIT_LOCATIONS: Array<{ value: UnitLocation; desc: string }> = [
  { value: 'Kandang Puyuh', desc: 'Unggas petelur & pedaging' },
  { value: 'Kandang Itik', desc: 'Unggas air & kolam' },
  { value: 'Penelitian', desc: 'Eksperimen & riset terapan' },
  { value: 'Penetasan', desc: 'Mesin tetas & manajemen DOC' },
];

export const StudentForm: React.FC<StudentFormProps> = ({
  currentTime,
  selectedShift,
  onAttendanceSubmitted,
  gasWebhookUrl,
onOpenGuidance,
}) => {
  // Form State
  const [studentName, setStudentName] = useState('');
  const [studentNim, setStudentNim] = useState('');
  const [division, setDivision] = useState('');
  const [location, setLocation] = useState<UnitLocation>('Kandang Puyuh');
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AttendanceRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const shiftAvailability = getShiftAvailability(selectedShift, currentTime);
  const shiftConfig = SHIFT_CONFIGS.find((s) => s.shift === selectedShift);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(
    async (facing: 'user' | 'environment') => {
      stopCamera();
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Fitur kamera tidak didukung pada browser ini.');
        }
const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        setIsCameraActive(true);
      } catch {
        setCameraError(
          'Kamera tidak dapat diakses. Aktifkan izin kamera di browser, atau gunakan tombol Unggah File sebagai gantinya.'
        );
        setIsCameraActive(false);
      }
    },
    [stopCamera]
  );

// Pasang stream ke elemen <video>.
  // Wajib lewat useEffect, bukan langsung di startCamera: pada frame pertama
  // isCameraActive masih false sehingga <video> belum ada di DOM, jadi
  // videoRef.current bernilai null dan stream tidak pernah menempel.
  useEffect(() => {
    if (!isCameraActive || !mediaStreamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== mediaStreamRef.current) {
      video.srcObject = mediaStreamRef.current;
    }
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Beberapa browser menolak autoplay; user tetap bisa tombol Ambil Foto.
      });
    }
  }, [isCameraActive]);

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) startCamera(nextFacing);
  };

  /**
   * Terapkan watermark resmi TNK 61 pada frame kamera.
   * Baris 1: SEKOLAH VOKASI IPB · TNK 61 · [LOKASI] · [NAMA] · [WAKTU WIB]
   */
  const applyWatermark = (source: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    const srcW = source.videoWidth;
    const srcH = source.videoHeight;
    canvas.width = srcW || 640;
    canvas.height = srcH || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const barHeight = Math.max(52, Math.round(canvas.height * 0.12));
    ctx.fillStyle = 'rgba(0, 56, 130, 0.9)';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
    ctx.fillStyle = '#F58220';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, 3);

    const wibTime = formatWIBTime(currentTime).replace(' WIB', '');

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(
      `SEKOLAH VOKASI IPB · TNK 61 · ${location.toUpperCase()}`,
      14,
      canvas.height - barHeight + barHeight * 0.4
    );

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px sans-serif';
    ctx.fillText(
      `${studentName || 'Mahasiswa'} · ${formatIndonesianDate(currentTime)} ${wibTime} WIB`,
      14,
      canvas.height - barHeight * 0.2
    );

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const dataUrl = applyWatermark(videoRef.current);
    if (dataUrl) {
      setPhotoDataUrl(dataUrl);
      stopCamera();
    }
  };

// Auto-start kamera saat form dibuka
  useEffect(() => {
    const kick = window.setTimeout(() => startCamera('environment'), 0);
    return () => {
      window.clearTimeout(kick);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

if (!studentName.trim()) {
      setSubmitError('Harap masukkan nama lengkap Anda.');
      return;
    }
    if (!studentNim.trim()) {
      setSubmitError('NIM wajib diisi sesuai Kartu Tanda Mahasiswa.');
      return;
    }
    if (!division.trim()) {
      setSubmitError('Divisi piket wajib diisi.');
      return;
    }
    if (!notes.trim()) {
      setSubmitError('Deskripsi kegiatan piket wajib diisi.');
      return;
    }
    if (!photoDataUrl) {
      setSubmitError('Foto dokumentasi wajib: ambil langsung dari kamera.');
      return;
    }
    if (!shiftAvailability.isAvailable) {
      setSubmitError(shiftAvailability.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const status = calculateAttendanceStatus(selectedShift, now);

      const newRecord: AttendanceRecord = {
        id: `TNK61-${Date.now().toString(36).toUpperCase()}`,
        timestamp: now.toISOString(),
        formattedDate: formatWIBDate(now),
        formattedTime: formatWIBTime(now),
        studentName: studentName.trim(),
        studentNim: studentNim.trim(),
        division: division.trim(),
        shift: selectedShift,
        location,
        photoUrl: photoDataUrl,
        notes: notes.trim(),
        status,
        verified: false,
        syncedToDrive: false,
      };

      if (gasWebhookUrl) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          await fetch(gasWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            signal: controller.signal,
            body: JSON.stringify({
              action: 'submitAttendance',
              timestamp: newRecord.timestamp,
              namaMahasiswa: newRecord.studentName,
              nim: newRecord.studentNim,
              divisi: newRecord.division,
              waktuPiket: newRecord.shift,
              lokasi: newRecord.location,
              status: newRecord.status,
              catatan: newRecord.notes,
              fotoBase64: newRecord.photoUrl,
            }),
          });
          newRecord.syncedToDrive = true;
        } catch (gasErr) {
          console.warn('Google Apps Script call error (fallback to local):', gasErr);
        } finally {
          clearTimeout(timeout);
        }
      }

      onAttendanceSubmitted(newRecord);
      setSubmittedRecord(newRecord);

      setStudentName('');
      setStudentNim('');
      setNotes('');
      setPhotoDataUrl(null);
    } catch {
      setSubmitError('Terjadi kesalahan saat menyimpan presensi. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kartu hasil setelah submit sukses
  if (submittedRecord) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
        <div className="bg-ipb-blue text-white text-center px-5 py-5 border-b-2 border-ipb-orange">
          <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle className="w-8 h-8 text-emerald-300" />
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Presensi Berhasil Dikirim
          </h2>
          <p className="text-blue-100 text-xs mt-1">
            Bukti kehadiran piket Anda sudah tercatat
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ringkasan Presensi
              </span>
              <span className="text-[11px] font-bold text-ipb-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {submittedRecord.id}
              </span>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 text-xs">
              <Detail label="Nama Mahasiswa" value={submittedRecord.studentName} />
              <Detail label="NIM" value={submittedRecord.studentNim || '-'} />
              <Detail
                label="Waktu Submit"
                value={`${submittedRecord.formattedDate} · ${submittedRecord.formattedTime}`}
              />
              <Detail label="Shift Piket" value={`${submittedRecord.shift} WIB`} />
              <Detail label="Divisi Piket" value={submittedRecord.division} />
              <Detail label="Lokasi" value={submittedRecord.location} />
              <div>
                <span className="text-slate-500 block text-[11px]">Status</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {submittedRecord.status}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Penyimpanan</span>
                <span className="text-[11px] text-slate-600">
{submittedRecord.syncedToDrive
                    ? 'Tersimpan di Google Sheets angkatan'
                    : 'Tersimpan di perangkat ini'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-ipb-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-950">Catatan Penyimpanan Data</p>
              <p className="text-blue-800/90 mt-0.5">
{submittedRecord.syncedToDrive
                  ? 'Data Anda sudah dikirim ke spreadsheet angkatan. Foto tersimpan sebagai referensi nama file.'
                  : 'Backend spreadsheet belum terhubung, jadi data tersimpan di perangkat ini saja. Hubungi PC bila data tidak ditemukan admin.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSubmittedRecord(null)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-ipb-blue hover:bg-ipb-blue-light text-white font-semibold text-sm transition-colors cursor-pointer min-h-[46px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Isi Presensi Piket Baru</span>
          </button>
        </div>
      </div>
    );
  }

  const isLocked = !shiftAvailability.isAvailable;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
      {/* Header biru resmi IPB dengan lencana shift aktif */}
      <div className="bg-ipb-blue text-white px-5 sm:px-6 py-4 border-b-2 border-ipb-orange">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">
              Formulir Presensi Mahasiswa
            </div>
            <h2 className="text-white text-base sm:text-lg font-black tracking-tight">
              TNK 61 &middot; Sekolah Vokasi IPB
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 self-start xs:self-auto px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${
              isLocked ? 'bg-white/15 text-blue-100' : 'bg-ipb-orange text-white'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            Shift {selectedShift} WIB
            {shiftConfig ? ` · ${shiftConfig.name}` : ''}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5">
        {/* Status shift */}
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-[11px] leading-relaxed ${
            isLocked
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : shiftAvailability.statusLabel === 'Terlambat'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {isLocked ? (
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          ) : shiftAvailability.statusLabel === 'Terlambat' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{shiftAvailability.reason}</span>
        </div>

        {/* LANGKAH 1: Identitas Mahasiswa */}
        <StepBlock step={1} title="Identitas Mahasiswa">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nama lengkap sesuai Kartu Tanda Mahasiswa"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-ipb-blue focus:border-ipb-blue bg-white text-slate-900 min-h-[44px]"
                />
</div>
            </div>

            <div>
<label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  NIM <span className="text-rose-500">*</span>
                </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
value={studentNim}
                  onChange={(e) => setStudentNim(e.target.value)}
                  placeholder="NIM sesuai Kartu Tanda Mahasiswa"
                  inputMode="text"
                  autoComplete="off"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-ipb-blue focus:border-ipb-blue bg-white text-slate-900 placeholder:text-slate-500 placeholder:font-sans tabular-nums min-h-[44px]"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                <span className="text-rose-500">*</span> Wajib. Format resmi mahasiswa SV
                IPB (J030121...)
              </p>
            </div>
          </div>
        </StepBlock>

{/* LANGKAH 2: Divisi Piket */}
        <StepBlock step={2} title="Divisi Piket" icon={Users} required>
          <div className="relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type="text"
              required
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="Tuliskan nama divisi piket Anda"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-ipb-blue focus:border-ipb-blue bg-white text-slate-900 min-h-[44px]"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            <span className="text-rose-500">*</span> Wajib. Contoh: Divisi Pakan.
          </p>
        </StepBlock>

        {/* LANGKAH 3: Lokasi Piket */}
        <StepBlock step={3} title="Lokasi Piket" icon={MapPin}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {UNIT_LOCATIONS.map((loc) => {
              const isSelected = location === loc.value;
              return (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setLocation(loc.value)}
                  aria-pressed={isSelected}
                  className={`p-3 rounded-xl border text-left transition-all min-h-[76px] cursor-pointer ${
                    isSelected
                      ? 'border-ipb-blue bg-blue-50 ring-2 ring-ipb-blue/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-ipb-blue/40 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`text-xs font-bold leading-tight ${
                      isSelected ? 'text-ipb-blue' : 'text-slate-800'
                    }`}
                  >
                    {loc.value}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                    {loc.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </StepBlock>

        {/* LANGKAH 4: Foto Dokumentasi */}
        <StepBlock step={4} title="Foto Dokumentasi" icon={Camera}>
          {photoDataUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoDataUrl}
                alt="Pratinjau foto dokumentasi piket dengan watermark resmi TNK 61"
                className="w-full rounded-xl border border-slate-200"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl(null);
                    startCamera(cameraFacing);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Ambil Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus Foto</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Live preview kamera */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 text-center">
                    <span className="text-[11px] text-slate-400 leading-relaxed">
                      {cameraError || 'Kamera tidak aktif. Gunakan tombol Unggah File di bawah.'}
                    </span>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                  {cameraError}
                </p>
              )}

<button
                type="button"
                onClick={takeSnapshot}
                disabled={!isCameraActive}
                className="w-full flex items-center justify-center gap-2 px-3 py-3.5 rounded-xl bg-ipb-blue hover:bg-ipb-blue-light text-white font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[52px]"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>Ambil Foto Sekarang</span>
              </button>

              {!isCameraActive && !cameraError && (
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacing)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer min-h-[40px]"
                >
                  Coba Lagi Kamera
                </button>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={switchCameraFacing}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer min-h-[40px]"
                >
                  {cameraFacing === 'environment'
                    ? 'Ganti ke Kamera Depan'
                    : 'Ganti ke Kamera Belakang'}
                </button>
              )}

<p className="text-[10px] text-slate-500 leading-relaxed">
                Watermark resmi otomatis ditambahkan ke setiap foto. Ambil langsung
                saat piket berlangsung.
              </p>
            </div>
          )}
        </StepBlock>

        {/* LANGKAH 5: Deskripsi Kegiatan */}
        <StepBlock step={5} title="Deskripsi Kegiatan Piket" icon={FileText} required>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            rows={3}
            placeholder="Catat observasi dan pekerjaan yang Anda kerjakan, misalnya: pemberian pakan 12 kg, pengecekan nipple drinker, pengumpulan telur 40 butir."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-ipb-blue focus:border-ipb-blue bg-white text-slate-900 resize-y"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            <span className="text-rose-500">*</span> Wajib. Jelaskan pekerjaan yang
            dilakukan hari ini.
          </p>
        </StepBlock>

        {submitError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
            {submitError}
          </div>
        )}

        {/* Tombol kirim */}
        <div className="flex flex-col xs:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-ipb-orange hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[54px] shadow-sm"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>{isSubmitting ? 'Mengirim...' : 'Kirim Presensi'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenGuidance}
            className="xs:w-auto w-full px-4 py-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer min-h-[54px]"
          >
            Baca SOP
          </button>
        </div>
      </form>
    </div>
  );
};

/** Label + nilai ringkas untuk kartu hasil */
const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <span className="text-slate-500 block text-[11px]">{label}</span>
    <span
      className="font-semibold text-slate-900 break-words text-xs"
    >
      {value}
    </span>
  </div>
);

/** Pembungkus satu langkah formulir */
  const StepBlock: React.FC<{
    step: number;
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    required?: boolean;
    children: React.ReactNode;
  }> = ({ step, title, icon: Icon, required, children }) => (
    <section>
      <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-200">
        <span className="w-6 h-6 rounded-lg bg-ipb-blue text-white text-[11px] font-black flex items-center justify-center shrink-0">
          {step}
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          {Icon ? <Icon className="w-3.5 h-3.5 text-slate-400" /> : null}
          {title}
          {required ? <span className="text-rose-500">*</span> : null}
        </h3>
      </div>
      {children}
    </section>
  );

export default StudentForm;
