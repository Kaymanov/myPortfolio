"use client";

import { useEffect, useRef, useState } from "react";

interface ProgressBarProps {
  label: string;
  value: number;
}

const TOTAL_BARS = 20;
// Длительность заполнения в мс (по STANDARDS — это "explanatory" анимация
// при первом появлении секции, поэтому можно чуть длиннее UI-бюджета).
const FILL_DURATION = 900;
// Сильный ease-out: быстрый старт, мягкое приземление к итоговому значению.
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

export const ProgressBar = ({ label, value }: ProgressBarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Reduced-motion: показываем финальное значение сразу, без анимации.
    if (reduce) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let started = false;

    const animate = () => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / FILL_DURATION, 1);
        setDisplay(value * easeOutQuint(t));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    // Запускаем заполнение, когда бар впервые попадает в вьюпорт.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            animate();
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const rounded = Math.round(display);
  const filledBars = Math.round((display / 100) * TOTAL_BARS);
  const barDisplay = "#".repeat(filledBars).padEnd(TOTAL_BARS, "-");
  const isFilling = rounded < value;

  return (
    <div ref={ref} className="font-mono text-xs md:text-sm mb-4 group">
      {/* Верхняя строка: Название и Проценты */}
      <div className="flex justify-between mb-1">
        <span className="opacity-80 group-hover:text-terminal-green transition-colors">
          {label.toUpperCase()}
        </span>
        <span className="text-terminal-green tabular-nums">{rounded}%</span>
      </div>

      {/* Нижняя строка: Шкала [#####-----] */}
      <div className="flex items-center gap-2">
        <span className="text-terminal-green opacity-40">[</span>
        <span className="text-terminal-green tracking-[0.2em]">
          {barDisplay}
        </span>
        <span className="text-terminal-green opacity-40">]</span>
        {/* Мигающий курсор у фронта заполнения — пока шкала "набирается" */}
        {isFilling && (
          <span
            className="w-1.5 h-3.5 bg-terminal-green inline-block animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
