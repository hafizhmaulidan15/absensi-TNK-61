'use client';

import React from 'react';
import { Building2, Sprout } from 'lucide-react';

interface HeroBannerProps {
  currentTime: Date;
}

const COMMODITY_UNITS = [
  { label: 'Kandang Puyuh' },
  { label: 'Kandang Itik' },
  { label: 'Unit Penelitian' },
];

/**
 * Hero Banner — identitas resmi SV IPB untuk angkatan 61.
 * Menampilkan program studi dan tiga unit kerja piket.
 */
export const HeroBanner: React.FC<HeroBannerProps> = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header biru resmi IPB + garis aksen oranye */}
      <div className="bg-ipb-blue px-4 py-4 border-b-2 border-ipb-orange">
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 className="w-3.5 h-3.5 text-ipb-orange shrink-0" />
          <span className="text-blue-100 text-[10px] font-bold uppercase tracking-wider truncate">
            Program Studi Teknologi dan Manajemen Ternak
          </span>
        </div>
        <h1 className="text-white text-lg sm:text-xl font-black tracking-tight leading-tight">
          Presensi Piket <span className="text-ipb-orange">TNK 61</span>
        </h1>
        <p className="text-blue-100 text-[11px] mt-0.5 leading-snug">
          Sekolah Vokasi &middot; IPB University &middot; Angkatan 61
        </p>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-slate-700 leading-relaxed">
          Penugasan praktik lapangan mencakup tiga unit kerja di bawah, dikerjakan
          bergantian pada tiga sesi piket harian dengan bukti foto kamera.
        </p>

        {/* Tiga unit commodity */}
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
          {COMMODITY_UNITS.map((unit) => (
            <div
              key={unit.label}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200"
            >
              <Sprout className="w-3.5 h-3.5 text-ipb-blue shrink-0" />
              <span className="text-[10px] font-bold text-slate-700 leading-tight">
                {unit.label}
              </span>
            </div>
          ))}
        </div>

        </div>
    </section>
  );
};

export default HeroBanner;