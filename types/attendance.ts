export type PiketShift = '06.30' | '12.00' | '16.00';

export type ShiftStatus = 'active' | 'locked' | 'passed';

export type UnitLocation =
  | 'Kandang Itik'
  | 'Kandang Puyuh'
  | 'Penelitian';

export interface AttendanceRecord {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // "05/10/2026"
  formattedTime: string; // "06:42:15 WIB"
  studentName: string;
  studentNim: string;
  shift: PiketShift;
  location: UnitLocation;
  photoUrl: string; // Data URL or Drive link
  notes?: string;
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
