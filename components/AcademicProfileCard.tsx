'use client';

import React from 'react';
import { GraduationCap, Award, MapPin, FlaskConical } from 'lucide-react';
import { UnitLocation } from '@/types/attendance';

interface LocationSummaryProps {
  selectedLocation?: UnitLocation;
}

const AREA_DETAIL: Array<{ name: string; desc: string; icon: typeof MapPin }> = [
  {
    name: 'Kandang Puyuh',
    desc: 'Unggas petelur & pedaging, pemberian pakan, pengumpulan telur harian.',
    icon: MapPin,
  },
  {
    name: 'Kandang Itik',
    desc: 'Unggas air & kolam, sanitasi genangan, pemberian pakan hijauan segar.',
    icon: MapPin,
  },
  {
    name: 'Penelitian',
    desc: 'Eksperimen & riset terapan, sampling bobot badan, pencatatan mortalitas.',
    icon: FlaskConical,
  },
];

/**
 * Kartu Profil Akademik SV IPB + Ringkasan Area Lokasi Tugas.
 * Berada di kolom kiri layout 2 kolom (side-by-side portal).
 */
export const AcademicProfileCard: React.FC<LocationSummaryProps> = ({
  selectedLocation,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header biru resmi IPB dengan garis aksen oranye */}
      <div className="bg-ipb-blue px-4 py-3.5 border-b-2 border-ipb-orange">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-white shrink-0" />
          <div className="min-w-0">
            <div className="text-white font-black text-sm tracking-tight leading-tight">
              Program Studi TNK
            </div>
            <div className="text-blue-100 text-[11px] leading-tight">
              Sekolah Vokasi &middot; IPB University
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Badge akreditasi + gelar */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold uppercase tracking-wide">
            <Award className="w-3 h-3 text-emerald-600" />
            Akreditasi A &middot; BAN-PT
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-ipb-blue text-[10px] font-bold uppercase tracking-wide">
            Sarjana Terapan (D4)
          </span>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          Kurikulum berpadatan praktik lapangan: <strong>70% praktik lapangan</strong>,
          dengan gelar lulusan Sarjana Terapan Peternakan (S.Tr.Pt.). Penugasan pada
          komoditas ternak diselesaikan melalui kegiatan piket lapangan di tiga unit di bawah.
        </p>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Kurikulum
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-ipb-blue leading-none">70%</span>
            <span className="text-xs text-slate-600">praktik lapangan</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full w-[70%] bg-ipb-blue rounded-full" />
          </div>
        </div>

        {/* Ringkasan area lokasi tugas */}
        <div className="pt-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Area Lokasi Tugas Piket
          </div>
          <ul className="space-y-1.5">
            {AREA_DETAIL.map((area) => {
              const isSelected = selectedLocation === area.name;
              const Icon = area.icon;
              return (
                <li
                  key={area.name}
                  className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-ipb-orange bg-orange-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      isSelected ? 'text-ipb-orange' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-[11px] font-bold leading-tight ${
                        isSelected ? 'text-orange-900' : 'text-slate-800'
                      }`}
                    >
                      {area.name}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-snug">{area.desc}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AcademicProfileCard;