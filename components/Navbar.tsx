'use client';

import React from 'react';

interface NavbarProps {
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAdmin }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center h-15 sm:h-18">
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
        </div>
      </div>
    </header>
  );
};

export default Navbar;