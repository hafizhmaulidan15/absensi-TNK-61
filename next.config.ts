import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Sengaja TIDAK memakai `output: 'standalone'`.
  //
  // Standalone membuat `next start` menolak jalan ("should not be used with
  // output: standalone"), jadi `npm start` lokal selalu gagal padahal build
  // sukses. Vercel juga tidak memerlukannya — Vercel punya server sendiri.
  // Karena aplikasi ini statis, mode default sudah cukup.
};

export default nextConfig;