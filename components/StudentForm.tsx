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
  Clock,
  Lock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  MapPin,
  FileText,
  User,
  Hash,
  ShieldCheck,
  Send,
  VideoOff,
  RefreshCw,
} from 'lucide-react';

interface StudentFormProps {
  currentTime: Date;
  selectedShift: PiketShift;
  setSelectedShift: (shift: PiketShift) => void;
  onAttendanceSubmitted: (record: AttendanceRecord) => void;
  gasWebhookUrl: string;
}

const UNIT_LOCATIONS: UnitLocation[] = [
  'Kandang Itik',
  'Kandang Puyuh',
  'Penelitian',
];

export const StudentForm: React.FC<StudentFormProps> = ({
  currentTime,
  selectedShift,
  setSelectedShift,
  onAttendanceSubmitted,
  gasWebhookUrl,
}) => {
  // Form State
  const [studentName, setStudentName] = useState('');
  const [studentNim, setStudentNim] = useState('');
  const [location, setLocation] = useState<UnitLocation>(UNIT_LOCATIONS[0]);
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

// Photo Capture State (kamera wajib, tanpa upload galeri)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AttendanceRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

// Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Check current shift status based on 15 minutes window
  const shiftAvailability = getShiftAvailability(selectedShift, currentTime);

// Stop camera stream
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Handle Camera stream start
  const startCamera = useCallback(
    async (facing: 'user' | 'environment') => {
      stopCamera();
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Fitur kamera tidak didukung pada browser ini.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
      } catch (err) {
        console.warn('Camera error:', err);
        setCameraError(
          'Kamera tidak dapat diakses. Aktifkan izin kamera di browser, lalu tekan Coba Lagi.'
        );
        setIsCameraActive(false);
      }
    },
    [stopCamera]
  );

  // Toggle camera mode
  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  // Capture snapshot from video with watermark
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark banner
    const barHeight = Math.max(50, Math.round(canvas.height * 0.12));
    ctx.fillStyle = 'rgba(2, 40, 115, 0.88)';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    // Accent line
    ctx.fillStyle = '#EA580C';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, 3);

    // Watermark text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`TNK 61 IPB · PIKET ${selectedShift} WIB`, 16, canvas.height - barHeight + barHeight * 0.45);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px sans-serif';
    const timestampStr = `${formatIndonesianDate(currentTime)} ${formatWIBTime(currentTime)}`;
    ctx.fillText(`${studentName || 'Mahasiswa'} | ${timestampStr}`, 16, canvas.height - barHeight * 0.25);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoDataUrl(dataUrl);
    stopCamera();
  };

// Clean up camera on unmount + auto-start kamera saat form dibuka
  useEffect(() => {
    const kick = window.setTimeout(() => {
      startCamera('environment');
    }, 0);
    return () => {
      window.clearTimeout(kick);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation
    if (!studentName.trim()) {
      setSubmitError('Harap masukkan nama lengkap Anda.');
      return;
    }

if (!photoDataUrl) {
      setSubmitError('Foto dokumentasi wajib diambil langsung dari kamera.');
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
      const recordId = `TNK61-${Date.now().toString(36).toUpperCase()}`;

      const newRecord: AttendanceRecord = {
        id: recordId,
        timestamp: now.toISOString(),
        formattedDate: formatWIBDate(now),
        formattedTime: formatWIBTime(now),
        studentName: studentName.trim(),
        studentNim: studentNim.trim(),
        shift: selectedShift,
        location,
        photoUrl: photoDataUrl,
        notes: notes.trim() || 'Piket kandang/laboratorium terlaksana tepat waktu.',
        status,
        verified: false,
        syncedToDrive: false,
      };

      // Call Google Apps Script Web App if configured
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

      // Save locally
      onAttendanceSubmitted(newRecord);
      setSubmittedRecord(newRecord);

      // Reset form
      setStudentName('');
      setStudentNim('');
      setNotes('');
      setPhotoDataUrl(null);
    } catch (err: any) {
      setSubmitError('Terjadi kesalahan saat menyimpan presensi. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully submitted, show clean Receipt Card
  if (submittedRecord) {
    return (
      <div className="max-w-2xl mx-auto my-6 sm:my-8 px-3 sm:px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          <div className="bg-blue-800 p-5 sm:p-6 text-white text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/40">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Presensi Berhasil Dikirim!</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              Data kehadiran piket Anda telah tersimpan di sistem Presensi TNK 61
            </p>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            {/* Summary Receipt */}
            <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="text-[11px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Bukti Presensi Piket
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {submittedRecord.id}
                </span>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-[11px] sm:text-xs">Nama Mahasiswa</span>
                  <span className="font-bold text-slate-900 break-words">{submittedRecord.studentName}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] sm:text-xs">NIM</span>
                  <span className="font-mono text-slate-800 font-medium">{submittedRecord.studentNim}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] sm:text-xs">Waktu Submit</span>
                  <span className="font-medium text-slate-800">
                    {submittedRecord.formattedDate} · {submittedRecord.formattedTime}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] sm:text-xs">Shift Piket</span>
                  <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                    <Clock className="w-3.5 h-3.5" />
                    {submittedRecord.shift} WIB
                  </span>
                </div>

                <div className="xs:col-span-2">
                  <span className="text-slate-500 block text-[11px] sm:text-xs">Lokasi Kandang / Laboratorium</span>
                  <span className="font-medium text-slate-800 break-words">{submittedRecord.location}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] sm:text-xs">Status Kehadiran</span>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-800">
                    {submittedRecord.status}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] sm:text-xs">Penyimpanan</span>
                  <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                    {submittedRecord.syncedToDrive ? 'Tersinkron ke Google Sheets & Drive' : 'Tersimpan di Sistem Presensi'}
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] sm:text-xs leading-relaxed">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">Catatan Keamanan Data</p>
                <p className="text-blue-800/90 mt-0.5">
                  Data presensi Anda tercatat di sistem ini dan, jika admin sudah mengatur URL Google Apps Script, juga dikirim ke Google Sheets & Drive admin. Data tidak dibagikan ke pihak lain.
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSubmittedRecord(null)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm cursor-pointer min-h-[46px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Isi Presensi Piket Baru</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-5 sm:my-8 px-3 sm:px-6">
      {/* Main Card Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        
        {/* Card Header */}
        <div className="bg-blue-800 text-white p-4 sm:p-6 lg:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-orange-300 text-[11px] sm:text-xs font-semibold mb-1.5 sm:mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Formulir Presensi Mahasiswa</span>
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight">
              Pencatatan Kehadiran Piket Harian
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Program Studi Teknologi dan Manajemen Ternak (TNK 61) · SV IPB
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 border border-white/20 text-left sm:text-center self-start sm:self-center" suppressHydrationWarning>
            <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider text-blue-200 font-semibold">
              Shift Dipilih
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono">
              {selectedShift} WIB
            </span>
          </div>
        </div>

        {/* Notice if past tolerance window */}
        {shiftAvailability.statusLabel === 'Terlambat' && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-5 sm:mt-6 p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5 sm:gap-3">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <p className="font-bold text-amber-950">
                Anda Mengisi di Luar Batas Toleransi
              </p>
              <p className="text-amber-800 text-[11px] sm:text-xs">
                {shiftAvailability.reason}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 p-3 sm:p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          
          {/* SECTION 1: WAKTU PIKET */}
          <div className="space-y-2">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Pilih Sesi Waktu Piket <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Batas pengisian: Maks 10 Menit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {SHIFT_CONFIGS.map((cfg) => {
                const avail = getShiftAvailability(cfg.shift, currentTime);
                const isSelected = selectedShift === cfg.shift;

                return (
                  <button
                    key={cfg.shift}
                    type="button"
                    onClick={() => avail.isAvailable && setSelectedShift(cfg.shift)}
                    className={`relative p-3 sm:p-3.5 rounded-xl border text-left transition-all min-h-[56px] ${
                      !avail.isAvailable
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-2xs cursor-pointer'
                          : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sm sm:text-base text-slate-900">
                        {cfg.shift} WIB
                      </span>
                      <span
                        suppressHydrationWarning
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          !avail.isAvailable
                            ? 'bg-slate-200 text-slate-600'
                            : avail.statusLabel === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {avail.statusLabel}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-slate-800">
                      {cfg.name}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                      {cfg.openHour.toString().padStart(2, '0')}.{cfg.openMinute.toString().padStart(2, '0')} - {cfg.closeHour.toString().padStart(2, '0')}.{cfg.closeMinute.toString().padStart(2, '0')} WIB
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: IDENTITAS MAHASISWA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nama Mahasiswa */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Nama Lengkap Mahasiswa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nama lengkap sesuai Kartu Tanda Mahasiswa"
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 min-h-[44px]"
                />
              </div>

            </div>

            {/* NIM Mahasiswa */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                NIM / Nomor Induk Mahasiswa
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={studentNim}
                  onChange={(e) => setStudentNim(e.target.value)}
placeholder="J0301xxxxxxxx"
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 font-mono min-h-[44px]"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Format NIM SVN IPB angkatan 61 (J0301...)
              </p>
            </div>

          </div>

          {/* SECTION 3: LOKASI UNIT KANDANG */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Lokasi Unit / Kandang Piket <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as UnitLocation)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 min-h-[44px]"
              >
                {UNIT_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

{/* SECTION 4: FOTO DOKUMENTASI PIKET */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              4. Foto Bukti Dokumentasi Piket <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Foto wajib diambil langsung dari kamera. Upload dari galeri tidak tersedia agar foto lama tidak terpakai.
            </p>

            {/* Photo Container */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3 sm:p-4 bg-slate-50/60 transition-colors">
              
              {photoDataUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-80 flex items-center justify-center bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoDataUrl}
                      alt="Bukti Dokumentasi Piket"
                      className="max-h-80 w-auto object-contain"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[11px] sm:text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Terverifikasi</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] sm:text-xs text-slate-500">
                      Foto dokumentasi siap dikirim bersama data absensi
                    </span>
                    <button
                      type="button"
onClick={() => {
                        setPhotoDataUrl(null);
                        startCamera('environment');
                      }}
                      className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ambil Ulang Foto</span>
                    </button>
                  </div>
                </div>
) : (
                /* LIVE CAMERA VIEW */
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-2">
                      <VideoOff className="w-8 h-8 text-rose-500 mx-auto" />
                      <p className="text-xs text-rose-700">{cameraError}</p>
                      <button
                        type="button"
onClick={() => startCamera(cameraFacing)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer min-h-[36px]"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-4/3 max-h-72 mx-auto flex items-center justify-center w-full">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Camera Overlay Guide */}
                      <div className="absolute inset-0 pointer-events-none border-2 border-white/20 rounded-xl m-3 flex flex-col justify-between p-2.5 sm:p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            LIVE CAM
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-white/80 font-mono">
                            TNK 61
                          </span>
                        </div>
                        <div className="text-center text-white/90 text-[11px] sm:text-xs font-medium bg-black/50 backdrop-blur-xs py-1 px-2.5 rounded-lg mx-auto max-w-xs">
                          Arahkan kamera ke aktivitas piket / kandang
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Camera Controls */}
                  {isCameraActive && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={switchCameraFacing}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Balik Kamera (Depan / Belakang)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={takeSnapshot}
                        className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer min-h-[44px]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ambil Foto Sekarang</span>
                      </button>
                    </div>
                  )}
</div>
              )}
            </div>
          </div>

          {/* SECTION 5: CATATAN KEGIATAN */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              5. Catatan Kegiatan & Observasi Ternak
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pemberian pakan konsentrat pagi 25kg, sanitasi kandang, kondisi ternak sehat..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !shiftAvailability.isAvailable}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-all shadow-md min-h-[48px] cursor-pointer ${
                !shiftAvailability.isAvailable
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                  <span>Mengirim & Menyimpan Data Presensi...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 shrink-0" />
                  <span>Kirim Presensi Piket ({selectedShift} WIB)</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] sm:text-xs text-slate-500 mt-2 sm:mt-2.5">
              Shift terkunci di luar jamnya. Pagi 06.00–11.59, Siang 12.00–15.59, Sore 16.00–21.00. Lewat toleransi 10 menit dicatat Terlambat.
            </p>
          </div>

        </form>

      </div>
    </div>
  );
};


