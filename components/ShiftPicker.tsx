'use client';

import React from 'react';
import { SHIFT_CONFIGS, getShiftAvailability, formatWIBTime, formatIndonesianDate } from '@/lib/timeUtils';
import { Clock, CheckCircle2, AlertTriangle, Lock, Hourglass, BookOpen } from 'lucide-react';
import { PiketShift } from '@/types/attendance';

interface ShiftPickerProps {
  currentTime: Date;
  selectedShift: PiketShift;
  onSelectShift: (shift: PiketShift) => void;
  onOpenGuidance: () => void;
}

const STATUS_STYLE: Record<
  string,
  { badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Buka: { badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  'Sisa Waktu': { badge: 'bg-blue-100 text-blue-800', icon: Hourglass },
  Terlambat: { badge: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  Terkunci: { badge: 'bg-slate-200 text-slate-600', icon: Lock },
};

/**
 * Widget waktu realtime + pemilih shift interaktif.
 * Status ketersediaan: Buka / Sisa Waktu / Terlambat / Terkunci.
 */
export const ShiftPicker: React.FC<ShiftPickerProps> = ({
  currentTime,
  selectedShift,
  onSelectShift,
  onOpenGuidance,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Widget waktu realtime */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Waktu Indonesia Barat
            </div>
            <div
              className="text-2xl font-black text-ipb-blue tabular-nums-clock leading-tight"
              suppressHydrationWarning
            >
              {formatWIBTime(currentTime).replace(' WIB', '')}
            </div>
            <div
              className="text-[11px] text-slate-500 truncate"
              suppressHydrationWarning
            >
              {formatIndonesianDate(currentTime)}
            </div>
          </div>
          <Clock className="w-8 h-8 text-slate-300 shrink-0" />
        </div>
      </div>

      {/* Pemilih shift */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Pilih Shift Piket
          </h3>
          <span className="text-[10px] text-slate-500">Toleransi 15 menit</span>
        </div>

        {SHIFT_CONFIGS.map((config) => {
          const status = getShiftAvailability(config.shift, currentTime);
          const isSelected = selectedShift === config.shift;
          const style = STATUS_STYLE[status.statusLabel] ?? STATUS_STYLE.Terkunci;
          const StatusIcon = style.icon;

          return (
            <button
              key={config.shift}
              type="button"
              onClick={() => onSelectShift(config.shift)}
              aria-pressed={isSelected}
              className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all min-h-[56px] cursor-pointer ${
                isSelected
                  ? 'bg-ipb-blue text-white border-ipb-blue shadow-sm ring-2 ring-ipb-blue/20'
                  : status.isAvailable
                    ? 'bg-white border-slate-200 hover:border-ipb-blue/40 hover:bg-blue-50/40'
                    : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : status.isAvailable
                        ? 'bg-blue-50 text-ipb-blue border border-blue-100'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {config.shift}
                </div>
                <div className="min-w-0">
                  <div
                    className={`font-bold text-xs leading-tight truncate ${
                      isSelected ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {config.name}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {config.description}
                  </div>
                  {status.minutesRemaining !== undefined && (
                    <div
                      className={`text-[10px] font-semibold mt-0.5 ${
                        isSelected ? 'text-blue-100' : 'text-slate-600'
                      }`}
                    >
                      {status.statusLabel === 'Buka'
                        ? `Sisa ${status.minutesRemaining} menit`
                        : `${status.minutesRemaining} menit lagi`}
                    </div>
                  )}
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                  isSelected ? 'bg-white text-ipb-blue' : style.badge
                }`}
              >
                <StatusIcon className="w-3 h-3 shrink-0" />
                {status.statusLabel}
              </span>
            </button>
          );
        })}

        {/* Tombol cepat panduan SOP */}
        <button
          type="button"
          onClick={onOpenGuidance}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ipb-orange text-white font-bold text-xs hover:bg-orange-600 active:bg-orange-700 transition-colors cursor-pointer min-h-[46px] mt-1"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Pelajari SOP Piket</span>
        </button>
      </div>
    </div>
  );
};

export default ShiftPicker;