import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1d4ed8',
};

export const metadata: Metadata = {
  title: 'Presensi Piket TNK 61 - Teknologi dan Manajemen Ternak IPB University',
  icons: {
    icon: '/icon.svg',
  },
  description: 'Portal Presensi Piket Mahasiswa Program Studi Teknologi dan Manajemen Ternak (TNK 61) Sekolah Vokasi IPB University',
  openGraph: {
    title: 'Presensi Piket TNK 61 - Teknologi dan Manajemen Ternak IPB University',
    description: 'Portal Presensi Piket Mahasiswa Program Studi Teknologi dan Manajemen Ternak (TNK 61) Sekolah Vokasi IPB University',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Presensi Piket TNK 61 - Teknologi dan Manajemen Ternak IPB University',
    description: 'Portal Presensi Piket Mahasiswa Program Studi Teknologi dan Manajemen Ternak (TNK 61) Sekolah Vokasi IPB University',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
