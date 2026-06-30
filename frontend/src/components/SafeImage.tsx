"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = Omit<ImageProps, "onError" | "src"> & {
  /** Источник изображения. Если отсутствует — сразу рисуется плейсхолдер. */
  src?: ImageProps["src"] | null;
  /**
   * Aspect-ratio контейнера, резервирующего место в компоновке (нет CLS).
   * Принимает любое валидное значение CSS `aspect-ratio`, например "16 / 9".
   * По умолчанию 16:9 как у превью проектов.
   */
  aspectRatio?: string;
  /** Доп. классы для контейнера, резервирующего место. */
  containerClassName?: string;
};

/**
 * Обёртка над `next/image`, которая держит фиксированный aspect-ratio контейнер,
 * благодаря чему место под изображение зарезервировано заранее и сдвига
 * компоновки (CLS) не происходит. Если изображение не загрузилось (`onError`)
 * или `src` отсутствует, показывается терминальный плейсхолдер «[ NO SIGNAL ]»
 * вместо пустого пространства. (R15.7)
 */
export const SafeImage = ({
  src,
  alt,
  aspectRatio = "16 / 9",
  containerClassName = "",
  className = "",
  fill = true,
  ...imageProps
}: SafeImageProps) => {
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`relative overflow-hidden border border-terminal-border bg-black ${containerClassName}`}
      style={{ aspectRatio }}
    >
      {src && !errored ? (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          onError={() => setErrored(true)}
          className={`object-cover ${className}`}
          {...imageProps}
        />
      ) : (
        <div
          role="img"
          aria-label={typeof alt === "string" ? alt : "Изображение недоступно"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-terminal-green/40 select-none"
        >
          <span className="text-2xl leading-none opacity-30" aria-hidden="true">
            ▚
          </span>
          <span className="text-2xs uppercase tracking-widest">
            [ No Signal ]
          </span>
        </div>
      )}
      {/* Сетка/шум поверх для терминального стиля */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
    </div>
  );
};

export default SafeImage;
