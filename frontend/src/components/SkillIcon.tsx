"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";

/**
 * Динамический резолвер иконок react-icons.
 *
 * В админке (поле icon_name) указываешь ПОЛНОЕ имя компонента из react-icons,
 * например: "AiOutlineWindows", "SiDocker", "FaLinux", "TbBrandUbuntu",
 * "IoLogoJavascript". Каталог имён: https://react-icons.github.io/react-icons/
 *
 * Как это работает:
 * 1. По префиксу имени (первые 2-3 буквы: Si/Fa/Ai/Tb/…) определяем набор.
 * 2. Лениво импортируем этот набор (отдельный чанк — не раздуваем бандл).
 * 3. Находим в наборе иконку по точному имени.
 *
 * Если имя не найдено или набор неизвестен — иконка не рендерится
 * (graceful fallback, ничего не ломается).
 */

// Модуль набора: объект с именованными экспортами (иконками) + default.
type IconModule = Record<string, unknown>;

// Загрузчики наборов react-icons по префиксу имени компонента.
const SET_LOADERS: Record<string, () => Promise<IconModule>> = {
  Ai: () => import("react-icons/ai"),
  Bi: () => import("react-icons/bi"),
  Bs: () => import("react-icons/bs"),
  Di: () => import("react-icons/di"),
  Fa6: () => import("react-icons/fa6"),
  Fa: () => import("react-icons/fa"),
  Fi: () => import("react-icons/fi"),
  Gi: () => import("react-icons/gi"),
  Go: () => import("react-icons/go"),
  Gr: () => import("react-icons/gr"),
  Hi2: () => import("react-icons/hi2"),
  Hi: () => import("react-icons/hi"),
  Im: () => import("react-icons/im"),
  Io5: () => import("react-icons/io5"),
  Io: () => import("react-icons/io5"),
  Lu: () => import("react-icons/lu"),
  Md: () => import("react-icons/md"),
  Pi: () => import("react-icons/pi"),
  Ri: () => import("react-icons/ri"),
  Si: () => import("react-icons/si"),
  Tb: () => import("react-icons/tb"),
  Tfi: () => import("react-icons/tfi"),
  Vsc: () => import("react-icons/vsc"),
};

// Префиксы проверяем от длинных к коротким (Fa6 раньше Fa, Io5 раньше Io, Hi2 раньше Hi).
const PREFIXES = Object.keys(SET_LOADERS).sort((a, b) => b.length - a.length);

// Кэш уже загруженных наборов, чтобы не импортировать повторно.
const setCache = new Map<string, IconModule>();

function matchPrefix(name: string): string | null {
  for (const prefix of PREFIXES) {
    if (name.startsWith(prefix)) return prefix;
  }
  return null;
}

interface SkillIconProps {
  name?: string;
  className?: string;
}

export const SkillIcon = ({ name, className = "" }: SkillIconProps) => {
  const [Icon, setIcon] = useState<IconType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trimmed = name?.trim();

    if (!trimmed) {
      setIcon(null);
      return;
    }

    const prefix = matchPrefix(trimmed);
    if (!prefix) {
      setIcon(null);
      return;
    }

    const resolve = (mod: IconModule) => {
      const found = mod[trimmed];
      setIcon(() => (typeof found === "function" ? (found as IconType) : null));
    };

    // Набор уже в кэше — берём сразу.
    const cached = setCache.get(prefix);
    if (cached) {
      resolve(cached);
      return;
    }

    // Иначе лениво импортируем набор.
    SET_LOADERS[prefix]()
      .then((mod) => {
        if (cancelled) return;
        setCache.set(prefix, mod);
        resolve(mod);
      })
      .catch(() => {
        if (!cancelled) setIcon(null);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!Icon) return null;

  return <Icon className={`inline-block ${className}`} aria-hidden="true" />;
};
