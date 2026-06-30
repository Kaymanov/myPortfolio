import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в standalone-режим: Next.js генерирует .next/standalone/server.js,
  // который запускает Docker-образ фронтенда (CMD ["node", "server.js"]).
  output: "standalone",
  reactCompiler: true,
  // Разрешаем Next.js показывать картинки с нашего Django бэкенда
  images: {
    // Современные форматы для растровых изображений (AVIF предпочтительнее, затем WebP)
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        // Продакшен: медиа отдаётся с публичного домена.
        protocol: "https",
        hostname: "iamroot.pro",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
