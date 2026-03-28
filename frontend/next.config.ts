import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Разрешаем Next.js показывать картинки с нашего Django бэкенда
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
