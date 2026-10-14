export type PiketShift = '06.30' | '12.00' | '15.30';

// Kode shift Sore lama (16.00). Sudah tidak dipakai untuk presensi baru, tetapi
// masih muncul di data historis (localStorage & Google Sheets) supaya rekaman
// lama tetap terhitung sebagai Sore.
export const LEGACY_SORE_SHIFT = '16.00';

// Shift yang boleh tersimpan di sebuah record: kode kanonik sekarang + kode Sore
// lama. Dipakai agar data historis tetap terbaca tanpa memalsukan tipe.
export type StoredShift = PiketShift | typeof LEGACY_SORE_SHIFT;

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
  shift: StoredShift;
  location: UnitLocation;
  photoUrl: string; // Data URL or Drive link
  notes?: string; // Deskripsi kegiatan piket lapangan
  // Tiga status pertama dipakai form mahasiswa (dihitung otomatis).
  // "Izin" dan "Tidak Hadir" hanya diisi admin lewat input manual.
  status: 'Tepat Waktu' | 'Terlambat' | 'Toleransi' | 'Izin' | 'Tidak Hadir';
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