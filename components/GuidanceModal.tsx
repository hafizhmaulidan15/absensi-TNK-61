'use client';

import React from 'react';
import { X, BookOpen, Clock, ShieldCheck, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SHIFT_CONFIGS } from '@/lib/timeUtils';

interface GuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidanceModal: React.FC<GuidanceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
        
{/* Header biru resmi IPB dengan aksen oranye */}
        <div className="p-5 sm:p-6 bg-ipb-blue text-white flex items-center justify-between border-b-2 border-ipb-orange">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ipb-orange text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">SOP & Panduan Piket Mahasiswa</h3>
              <p className="text-xs text-blue-100">
                Teknologi dan Manajemen Ternak SV IPB Angkatan 61
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Aturan Jam Piket */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>1. Jadwal Sesi Piket & Toleransi Waktu</span>
            </h4>
<p className="text-slate-600 text-xs leading-relaxed">
              Presensi tiap shift hanya bisa diisi pada jamnya: Pagi 06.00&ndash;11.59, Siang
              12.00&ndash;15.59, Sore 16.00&ndash;21.00 WIB. Toleransi keterlambatan maksimal{' '}
              <strong>15 menit</strong> setelah jam shift; lewat itu masih boleh diisi tetapi
              dicatat Terlambat.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {SHIFT_CONFIGS.map((s) => (
                <div key={s.shift} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="font-mono font-bold text-ipb-blue text-sm">
                    {s.shift} WIB
                  </div>
                  <div className="font-semibold text-xs text-slate-900">{s.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Toleransi tepat waktu: {s.timeRange.split(' - ')[1]?.split(' WIB')[0]} WIB
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Standar APD & Keselamatan */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>2. SOP Pakaian & APD</span>
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Harus menggunakan <strong>Wearpack Praktikum (WP)</strong> beridentitas resmi SV IPB.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Harus menggunakan <strong>sepatu boots</strong> di area kandang.</span>
                </div>
              </div>
            </div>

            {/* Section 3: Tata Cara Dokumentasi Foto */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-500" />
                <span>3. SOP Dokumentasi Foto</span>
              </h4>
              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 text-orange-950 text-xs space-y-1.5 leading-relaxed">
                <p className="font-semibold">Foto dokumentasi harus:</p>
                <ul className="list-disc list-inside space-y-1 text-orange-900/90 pl-1">
                  <li>
                    Diambil <strong>langsung saat piket</strong> lewat kamera perangkat (paling
                    disarankan) atau diunggah dari galeri.
                  </li>
                  <li>Watermark <code>SEKOLAH VOKASI IPB · TNK 61 · [LOKASI] · [NAMA] · [WAKTU]</code> ditambahkan otomatis.</li>
                  <li>Mahasiswa sedang melaksanakan tugas piket, bukan foto lama.</li>
                  <li>Pencahayaan cukup terang, tidak buram, dan bukan foto objek sembarangan.</li>
                </ul>
              </div>
            </div>

          {/* Section 4: Kontak Bantuan */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
<span className="font-bold text-slate-800 block">
              Butuh Bantuan Teknis atau Izin Piket?
            </span>
            <p className="text-slate-600">
              Hubungi <strong>PC Riswidaressi</strong> untuk kendala dan konfirmasi.
            </p>
            <p className="text-slate-500">
              Rujukan identitas resmi: sv.ipb.ac.id &middot; Program Studi Teknologi dan
              Manajemen Ternak.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
className="px-5 py-3 rounded-xl bg-ipb-orange hover:bg-orange-600 text-white font-bold text-xs transition-colors min-h-[44px] cursor-pointer"
          >
            Saya Mengerti
          </button>
        </div>

      </div>
    </div>
  );
};

