'use client';

import React from 'react';
import { SHIFT_CONFIGS, getShiftAvailability, formatWIBTime } from '@/lib/timeUtils';
import { Clock, CheckCircle2, AlertTriangle, Lock, Building2, Shield, Camera } from 'lucide-react';
import { PiketShift } from '@/types/attendance';

interface HeroBannerProps {
  currentTime: Date;
  onSelectShift: (shift: PiketShift) => void;
  selectedShift: PiketShift;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  currentTime,
  onSelectShift,
  selectedShift,
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 border-b border-slate-200 py-6 sm:py-8 lg:py-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Heading and info */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            
            {/* Institution Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100/90 border border-blue-200 text-blue-900 text-[11px] sm:text-xs font-semibold tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="truncate">Teknologi dan Manajemen Ternak (TNK 61) · SV IPB</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Presensi Piket Harian <br />
              <span className="text-blue-700">
                Mahasiswa TNK 61
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-xs sm:text-sm lg:text-base max-w-xl leading-relaxed">
              Pencatatan kehadiran piket kandang dan laboratorium mahasiswa Program Studi Teknologi dan Manajemen Ternak (TNK) IPB University dengan verifikasi foto kamera langsung dan pengunci waktu presensi.
            </p>

            {/* Feature highlights - Responsive 3-col on sm, 1 or 3 on mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 max-w-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800 text-[11px] sm:text-xs">Maks 10 Mnt</div>
                  <div className="text-slate-500 text-[10px] sm:text-[11px]">Toleransi shift</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <Camera className="w-4 h-4 text-orange-500 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
<div className="font-bold text-slate-800 text-[11px] sm:text-xs">Foto Asli</div>
                  <div className="text-slate-500 text-[10px] sm:text-[11px]">Langsung dari Kamera</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
<div className="font-bold text-slate-800 text-[11px] sm:text-xs">Lokal Dulu</div>
                  <div className="text-slate-500 text-[10px] sm:text-[11px]">Tersimpan di Perangkat</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Shift Selection & Status Cards */}
          <div className="lg:col-span-6 w-full">
            <div className="rounded-2xl border border-slate-200 shadow-sm bg-white p-4 sm:p-5 space-y-3 sm:space-y-4">
              
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Jadwal Shift & Batas Waktu Piket
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Toleransi maksimal 10 menit setelah jam masuk
                  </p>
                </div>
                <div className="text-right" suppressHydrationWarning>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 sm:px-2.5 py-1 rounded-lg border border-blue-200 whitespace-nowrap" suppressHydrationWarning>
                    {formatWIBTime(currentTime)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-2.5">
                {SHIFT_CONFIGS.map((config) => {
                  const status = getShiftAvailability(config.shift, currentTime);
                  const isSelected = selectedShift === config.shift;

                  return (
                    <button
                      key={config.shift}
                      type="button"
                      onClick={() => onSelectShift(config.shift)}
                      className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-blue-700 border border-slate-200'
                          }`}
                        >
                          {config.shift}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm truncate">
                            {config.name}
                          </div>
                          <div
                            className={`text-[10px] sm:text-[11px] truncate ${
                              isSelected ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            Batas: {config.openHour.toString().padStart(2, '0')}.{config.openMinute.toString().padStart(2, '0')} - {config.closeHour.toString().padStart(2, '0')}.{config.closeMinute.toString().padStart(2, '0')} WIB
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <span
                          suppressHydrationWarning
                          className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${
                            isSelected
                              ? 'bg-white text-blue-800'
                              : status.statusLabel === 'Terkunci'
                              ? 'bg-slate-200 text-slate-600'
                              : status.statusLabel === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {status.statusLabel === 'Terkunci' ? (
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          ) : status.statusLabel === 'Terlambat' ? (
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          )}
                          <span>{status.statusLabel}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-950 text-[11px] sm:text-xs flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Ketentuan Resmi TNK: Toleransi keterlambatan maksimal <strong>10 menit</strong> setelah jam masuk. Lewat dari itu, absen tetap diterima tapi dicatat Terlambat.
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

