'use client';

import React from 'react';
import { CalendarClock, ChevronRight } from 'lucide-react';

/**
 * Top Bar resmi kampus.
 * Identitas: IPB UNIVERSITY | SEKOLAH VOKASI · KAMPUS BOGOR
 * Lencana: Akreditasi A BAN-PT + Sarjana Terapan (D4)
 */
export const CampusTopBar: React.FC = () => {
  return (
    <div className="bg-ipb-blue text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2">
          {/* Identitas kampus */}
          <div className="flex items-center gap-2 min-w-0">
            <CalendarClock className="w-4 h-4 shrink-0 text-ipb-orange" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 leading-tight">
                <span className="font-black text-[11px] sm:text-xs tracking-wide">
                  IPB UNIVERSITY
                </span>
                <ChevronRight className="w-2.5 h-2.5 shrink-0 text-blue-300" />
                <span className="text-[10px] sm:text-[11px] text-blue-100 truncate">
                  Sekolah Vokasi &middot; Kampus Bogor
                </span>
              </div>
            </div>
          </div>

          {/* Lencana resmi */}
          <div className="hidden xs:flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded border border-emerald-300/50 bg-emerald-400/15 text-emerald-100 text-[10px] font-bold uppercase tracking-wide">
              Akreditasi A BAN-PT
            </span>
            <span className="px-2 py-0.5 rounded border border-blue-300/40 bg-white/10 text-blue-50 text-[10px] font-bold uppercase tracking-wide">
              Sarjana Terapan D4
            </span>
          </div>
        </div>
      </div>
      {/* Garis aksen oranye IPB */}
      <div className="h-0.5 bg-ipb-orange" />
    </div>
  );
};

export default CampusTopBar;