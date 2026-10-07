'use client';

import React from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { formatWIBTime } from '@/lib/timeUtils';

interface NavbarProps {
  currentTime: Date;
  onOpenGuidance: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTime,
  onOpenGuidance,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-18 gap-3">
          {/* Logo TNK 61 — klik membuka panel admin */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group bg-transparent border-0 p-0 text-left"
            title="Klik untuk akses Panel Admin"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-ipb-blue flex items-center justify-center text-white font-black text-xs sm:text-sm tracking-wider shrink-0 border-b-2 border-ipb-orange group-hover:scale-105 transition-transform">
              TNK
            </div>
            <div className="min-w-0">
              <div className="truncate">
                <span className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 group-hover:text-ipb-blue transition-colors">
                  Presensi Piket <span className="text-ipb-orange">TNK 61</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                Teknologi dan Manajemen Ternak &middot; SV IPB
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Jam live WIB */}
            <div
              className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-700 bg-slate-100/90 px-2.5 py-1.5 rounded-lg border border-slate-200"
              suppressHydrationWarning
            >
              <Clock className="w-3.5 h-3.5 text-ipb-blue shrink-0" />
              <span className="tabular-nums">{formatWIBTime(currentTime)}</span>
            </div>

            <button
              type="button"
              onClick={onOpenGuidance}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer min-h-[36px] sm:min-h-[40px]"
              title="Standar Operasional Prosedur Piket TNK IPB"
            >
              <BookOpen className="w-3.5 h-3.5 text-ipb-orange shrink-0" />
              <span className="hidden xs:inline">SOP Piket</span>
              <span className="xs:hidden">SOP</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;