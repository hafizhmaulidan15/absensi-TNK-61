'use client';

import React from 'react';
import { Building2, Sprout, ShieldCheck } from 'lucide-react';

interface HeroBannerProps {
  currentTime: Date;
  onOpenGuidance?: () => void;
}

const COMMODITY_UNITS = [
  { label: 'Kandang Puyuh' },
  { label: 'Kandang Itik' },
  { label: 'Unit Penelitian' },
];

/**
 * Hero Banner Akademik — identitas resmi SV IPB untuk angkatan 61.
 * Menyorot kurikulum 70% praktik lapangan, gelar S.Tr.Pt., dan
 * penugasan komoditas ruminan pada tiga unit kerja.
 */
export const HeroBanner: React.FC<HeroBannerProps> = ({ currentTime }) => {
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

        {/* Kurikulum 70% + gelar */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
            <div className="text-xl font-black text-ipb-blue leading-none">70%</div>
            <div className="text-[10px] text-slate-600 mt-1 leading-tight">
              praktik lapangan dalam kurikulum
            </div>
          </div>
          <div className="rounded-lg bg-orange-50 border border-orange-100 p-2.5">
            <div className="text-sm font-black text-orange-900 leading-none">S.Tr.Pt.</div>
            <div className="text-[10px] text-slate-600 mt-1 leading-tight">
              gelar Sarjana Terapan Peternakan
            </div>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-snug">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Rujukan identitas visual: sv.ipb.ac.id &middot; Program Studi TNK. Akses panel
            admin: <code className="text-slate-600">/#admin</code>
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;