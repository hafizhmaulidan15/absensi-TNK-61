import { PiketShift, ShiftInfo } from '@/types/attendance';

export const SHIFT_CONFIGS: ShiftInfo[] = [
  {
    shift: '06.30',
    name: 'Piket Pagi',
    timeRange: '06.30 - 06.45 WIB (Maks 15 Menit)',
    openHour: 6,
    openMinute: 30,
    closeHour: 6,
    closeMinute: 45,
    description: 'Pemberian pakan pagi, sanitasi kandang, dan recording ternak.',
  },
  {
    shift: '12.00',
    name: 'Piket Siang',
    timeRange: '12.00 - 12.15 WIB (Maks 15 Menit)',
    openHour: 12,
    openMinute: 0,
    closeHour: 12,
    closeMinute: 15,
    description: 'Pengecekan air minum ternak, ventilasi kandang, dan pakan hijauan.',
  },
  {
    shift: '16.00',
    name: 'Piket Sore',
    timeRange: '16.00 - 16.15 WIB (Maks 15 Menit)',
    openHour: 16,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 15,
    description: 'Pemberian pakan sore, kontrol brooding/kandang, dan penutupan tirai.',
  },
];

/**
 * Jendela pengisian per shift (WIB). Di luar rentang ini form terkunci total.
 */
const SHIFT_WINDOWS: Record<PiketShift, [number, number]> = {
  '06.30': [6 * 60, 11 * 60 + 59],
  '12.00': [12 * 60, 15 * 60 + 59],
  '16.00': [16 * 60, 21 * 60],
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Format menit ke "HH.MM"
 */
const fmtMinutes = (total: number) =>
  `${pad2(Math.floor(total / 60))}.${pad2(total % 60)}`;

/**
 * Mendapatkan jam, menit, detik dalam Waktu Indonesia Barat (WIB, Asia/Jakarta)
 */
export function getWIBTimeParts(date: Date): { hours: number; minutes: number; seconds: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date);

    const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const seconds = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

    return { hours, minutes, seconds };
  } catch {
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    };
  }
}

export type ShiftAvailabilityLabel = 'Buka' | 'Terkunci' | 'Sisa Waktu' | 'Terlambat';

/**
 * Status ketersediaan shift.
 *
 * - `Terkunci`   : di luar jendela pengisian shift tersebut
 * - `Sisa Waktu` : masih dalam jendela, tapi belum sampai jam shift
 * - `Buka`       : sudah jam shift, masih dalam toleransi 15 menit
 * - `Terlambat`  : lewat toleransi 15 menit, masih dalam jendela (boleh kirim)
 */
export function getShiftAvailability(
  shift: PiketShift,
  currentTime: Date
): {
  isAvailable: boolean;
  reason: string;
  statusLabel: ShiftAvailabilityLabel;
  minutesRemaining?: number;
} {
  const config = SHIFT_CONFIGS.find((s) => s.shift === shift);
  if (!config) {
    return { isAvailable: false, reason: 'Shift tidak valid', statusLabel: 'Terkunci' };
  }

  const { hours, minutes } = getWIBTimeParts(currentTime);
  const currentTotalMinutes = hours * 60 + minutes;

  const openTotalMinutes = config.openHour * 60 + config.openMinute;
  const closeTotalMinutes = config.closeHour * 60 + config.closeMinute;

  const [winStart, winEnd] = SHIFT_WINDOWS[config.shift];

  if (currentTotalMinutes < winStart || currentTotalMinutes > winEnd) {
    return {
      isAvailable: false,
      reason: `Presensi shift ${config.name} hanya dibuka pukul ${fmtMinutes(
        winStart
      )} - ${fmtMinutes(winEnd)} WIB. Di luar jam tersebut form terkunci.`,
      statusLabel: 'Terkunci',
    };
  }

  // Masih dalam jendela, tapi belum masuk jam shift
  if (currentTotalMinutes < openTotalMinutes) {
    const diff = openTotalMinutes - currentTotalMinutes;
    const hoursLeft = Math.floor(diff / 60);
    const minsLeft = diff % 60;
    const timeUntil = hoursLeft > 0 ? `${hoursLeft} jam ${minsLeft} menit` : `${minsLeft} menit`;
    return {
      isAvailable: true,
      reason: `Belum masuk jam piket. Presensi dibuka pukul ${fmtMinutes(
        openTotalMinutes
      )} WIB (${timeUntil} lagi).`,
      statusLabel: 'Sisa Waktu',
      minutesRemaining: diff,
    };
  }

  // Sudah lewat batas toleransi, masih dalam jendela: boleh kirim, dicatat Terlambat
  if (currentTotalMinutes > closeTotalMinutes) {
    const overdue = currentTotalMinutes - closeTotalMinutes;
    return {
      isAvailable: true,
      reason: `Sudah lewat batas ${fmtMinutes(
        closeTotalMinutes
      )} WIB (${overdue} menit). Presensi tetap bisa diisi, tetapi dicatat Terlambat.`,
      statusLabel: 'Terlambat',
    };
  }

  const remaining = closeTotalMinutes - currentTotalMinutes;
  return {
    isAvailable: true,
    reason: `Presensi dibuka. Batas tepat waktu ${fmtMinutes(
      closeTotalMinutes
    )} WIB (15 menit setelah ${fmtMinutes(openTotalMinutes)}).`,
    statusLabel: 'Buka',
    minutesRemaining: remaining,
  };
}

/**
 * Format tanggal dalam Bahasa Indonesia (Zona Waktu Asia/Jakarta - WIB)
 */
export function formatIndonesianDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

/**
 * Format jam dalam WIB (HH:mm:ss WIB, zona waktu Asia/Jakarta)
 */
export function formatWIBTime(date: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
    return `${formatted.replace(/\./g, ':')} WIB`;
  } catch {
    const { hours, minutes, seconds } = getWIBTimeParts(date);
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)} WIB`;
  }
}

/**
 * Format tanggal DD/MM/YYYY dalam zona Asia/Jakarta (WIB)
 */
export function formatWIBDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    const d = new Date(date.getTime() + 7 * 3600 * 1000);
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  }
}

/**
 * Hitung status kehadiran (Tepat Waktu / Terlambat), toleransi 15 menit
 */
export function calculateAttendanceStatus(
  shift: PiketShift,
  time: Date
): 'Tepat Waktu' | 'Terlambat' | 'Toleransi' {
  const config = SHIFT_CONFIGS.find((s) => s.shift === shift);
  if (!config) return 'Tepat Waktu';

  const { hours, minutes } = getWIBTimeParts(time);
  const totalMin = hours * 60 + minutes;
  const closeMin = config.closeHour * 60 + config.closeMinute;

  return totalMin <= closeMin ? 'Tepat Waktu' : 'Terlambat';
}