export type PiketShift = '06.30' | '12.00' | '16.00';

export type ShiftStatus = 'active' | 'locked' | 'passed';

export type UnitLocation =
  | 'Kandang Puyuh'
  | 'Kandang Itik'
  | 'Penelitian';

// Divisi piket sengaja TIDAK punya union type: mahasiswa mengetiknya bebas
// sebagai teks, supaya divisi baru bisa muncul tanpa mengubah kode.

export interface AttendanceRecord {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // "05/10/2026"
  formattedTime: string; // "06:42:15 WIB"
  studentName: string;
  studentNim: string;
  division: string; // Divisi piket, diisi bebas oleh mahasiswa
  shift: PiketShift;
  location: UnitLocation;
  photoUrl: string; // Data URL or Drive link
  notes?: string; // Deskripsi kegiatan piket lapangan
  status: 'Tepat Waktu' | 'Terlambat' | 'Toleransi';
  verified: boolean;
  syncedToDrive?: boolean;
}

export interface ShiftInfo {
  shift: PiketShift;
  name: string;
  timeRange: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  description: string;
}