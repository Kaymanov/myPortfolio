"use client";

import dynamic from "next/dynamic";

/**
 * Клиентская обёртка для ленивой загрузки 3D-головы.
 *
 * `ssr: false` (WebGL не работает на сервере) допустим только в Client
 * Component, поэтому dynamic-импорт вынесен сюда из серверного HeroSection.
 * three.js подтягивается отдельным чанком и только на клиенте.
 */
const DigitalHead = dynamic(
  () => import("./DigitalHead").then((m) => m.DigitalHead),
  { ssr: false },
);

export const DigitalHeadLoader = () => <DigitalHead />;
