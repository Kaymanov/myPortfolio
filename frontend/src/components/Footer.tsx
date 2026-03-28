'use client';

import { useEffect, useState } from 'react';

export const Footer = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // Обновляем часы каждую секунду
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-terminal-green text-terminal-bg px-4 py-1 flex justify-between items-center font-mono text-[10px] md:text-xs z-50">
      {/* Левая часть: Статус */}
      <div className="flex gap-4">
        <span className="font-bold">STATUS: ONLINE</span>
        <span className="hidden md:inline">BRANCH: main*</span>
        <span className="hidden sm:inline">LOC: Astrakhan, RU</span>
      </div>

      {/* Центральная часть: Хоткеи */}
      <div className="flex gap-3 opacity-90">
        <span><kbd className="border border-terminal-bg px-1">F1</kbd> HELP</span>
        <span><kbd className="border border-terminal-bg px-1">F2</kbd> PROJ</span>
        <span className="hidden lg:inline"><kbd className="border border-terminal-bg px-1">F3</kbd> CV_DL</span>
      </div>

      {/* Правая часть: Системная инфа */}
      <div className="flex gap-4">
        <span className="hidden md:inline">UTF-8</span>
        <span className="font-bold">{time}</span>
      </div>
    </footer>
  );
};