export type PiketShift = '06.30' | '12.00' | '16.00';

export type ShiftStatus = 'active' | 'locked' | 'passed';

export type UnitLocation =
  | 'Kandang Puyuh'
  | 'Kandang Itik'
  | 'Penelitian';

export type PiketDivision =
  | 'Divisi Unggas (Puyuh & Itik)'
  | 'Divisi Pakan & Nutrisi Ternak'
  | 'Divisi Kesehatan & Biosekuriti'
  | 'Divisi Penelitian & Data Lapangan'
  | 'Divisi Sanitasi & Kebersihan'
  | 'Divisi Sarana & Prasarana';

export interface AttendanceRecord {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // "05/10/2026"
  formattedTime: string; // "06:42:15 WIB"
  studentName: string;
  studentNim: string;
  division: PiketDivision; // Divisi piket yang dipilih
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