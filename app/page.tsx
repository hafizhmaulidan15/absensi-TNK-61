'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { StudentForm } from '@/components/StudentForm';
import { AdminDashboard } from '@/components/AdminDashboard';
import { GuidanceModal } from '@/components/GuidanceModal';
import { AttendanceRecord, PiketShift } from '@/types/attendance';
import { INITIAL_RECORDS } from '@/lib/sampleData';
import { getWIBTimeParts } from '@/lib/timeUtils';

const STORAGE_KEY = 'tnk61_attendance_records_v1';

// TODO(ganti): tempel URL /exec dari deployment Apps Script milik angkatan 61.
// Sheet dan Drive TNK 61 belum dibuat, jadi selama string ini kosong
// setiap submit akan gagal dan hanya tersimpan di localStorage browser.
const GAS_WEBHOOK_URL = '';

const emptySubscribe = () => () => {};

export default function Home() {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [currentTab, setCurrentTab] = useState<'student' | 'admin'>('student');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedShift, setSelectedShift] = useState<PiketShift>('06.30');

  // Persistence
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const gasWebhookUrl = GAS_WEBHOOK_URL;

  // Modals
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);

  // Initialize clock and storage
  useEffect(() => {
    // 1. Clock interval
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 2. Load records asynchronously
    const frameId = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setRecords(parsed);
          }
        }

        // Auto pick closest shift based on current hour in WIB
        const { hours: h } = getWIBTimeParts(new Date());
        if (h >= 6 && h < 12) {
          setSelectedShift('06.30');
        } else if (h >= 12 && h < 16) {
          setSelectedShift('12.00');
        } else if (h >= 16 && h < 21) {
          setSelectedShift('16.00');
        }

        // Check if URL hash is #admin
        if (window.location.hash === '#admin') {
          setCurrentTab('admin');
        }
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
    });

    // Hash change listener for admin access
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentTab('admin');
      } else {
        setCurrentTab('student');
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frameId);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Save records whenever changed
  const saveRecords = (newRecords: AttendanceRecord[]) => {
    setRecords(newRecords);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
      } catch (err) {
        console.warn('Failed to save records to localStorage:', err);
      }
    }
  };

  // Add submitted record
  const handleAttendanceSubmitted = (newRecord: AttendanceRecord) => {
    const updated = [newRecord, ...records];
    saveRecords(updated);
  };

  // Delete record (Admin only)
  const handleDeleteRecord = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data presensi ini?')) {
      const updated = records.filter((r) => r.id !== id);
      saveRecords(updated);
    }
  };

  // Verify record (Admin only)
  const handleVerifyRecord = (id: string) => {
    const updated = records.map((r) => (r.id === id ? { ...r, verified: true } : r));
    saveRecords(updated);
  };

  // Add manual record (Admin only)
  const handleAddManualRecord = (record: AttendanceRecord) => {
    const updated = [record, ...records];
    saveRecords(updated);
  };

  // Prevent hydration mismatch between server and client
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-100/60 text-slate-900 font-sans">
        <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200 h-16" />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 text-slate-900 font-sans selection:bg-blue-600 selection:text-white pb-10">
      {/* Navigation */}
      <Navbar
        currentTime={currentTime}
        onOpenGuidance={() => setIsGuidanceOpen(true)}
        onOpenAdmin={() => {
          setCurrentTab('admin');
          window.location.hash = 'admin';
        }}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'student' ? (
          <div>
            <HeroBanner
              currentTime={currentTime}
              selectedShift={selectedShift}
              onSelectShift={setSelectedShift}
            />

            <StudentForm
              currentTime={currentTime}
              selectedShift={selectedShift}
              setSelectedShift={setSelectedShift}
              onAttendanceSubmitted={handleAttendanceSubmitted}
              gasWebhookUrl={gasWebhookUrl}
            />
          </div>
        ) : (
          <div className="py-4">
            <div className="max-w-7xl mx-auto px-4 mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '';
                  setCurrentTab('student');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>&larr;</span>
                <span>Kembali ke Form Presensi Mahasiswa</span>
              </button>
              <span className="text-xs text-slate-400 font-mono">Panel Khusus Pengawas/Admin (#admin)</span>
            </div>
            <AdminDashboard
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onVerifyRecord={handleVerifyRecord}
              onAddManualRecord={handleAddManualRecord}
              isAuthenticated={isAdminAuthenticated}
              gasWebhookUrl={gasWebhookUrl}
              setIsAuthenticated={setIsAdminAuthenticated}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <GuidanceModal
        isOpen={isGuidanceOpen}
        onClose={() => setIsGuidanceOpen(false)}
      />
    </div>
  );
}
