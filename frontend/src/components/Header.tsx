"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Проверяем, находимся ли мы на главной странице
  const isHome = pathname === "/";

  // Массив нашей навигации
  const navLinks = [
    { name: "SKILLS", path: isHome ? "#skills" : "/#skills" },
    { name: "EXPERIENCE", path: isHome ? "#experience" : "/#experience" },
    { name: "PROJECTS", path: isHome ? "#projects" : "/#projects" },
    { name: "KNOWLEDGE_BASE", path: "/blog" },
    { name: "CONTACT", path: isHome ? "#contact" : "/#contact" },
  ];

  // Функция для плавного скролла (если мы уже на главной)
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    setIsOpen(false); // Закрываем мобильное меню при клике

    if (isHome && path.startsWith("#")) {
      e.preventDefault();
      const element = document.getElementById(path.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `/${path}`);
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-sm border-b border-terminal-green/30 font-mono text-xs md:text-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* ЛОГОТИП / ДОМАШНЯЯ ДИРЕКТОРИЯ */}
        <Link
          href="/"
          className="text-terminal-green font-bold flex items-center gap-2 hover:text-white transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <span className="animate-pulse w-2 h-4 bg-terminal-green inline-block" />
          <span className="hidden sm:inline">root@iamroot.pro:~#</span>
          <span className="sm:hidden">~/root</span>
        </Link>

        {/* НАВИГАЦИЯ ДЛЯ ДЕСКТОПА */}
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              className="text-white/70 hover:text-terminal-green transition-colors uppercase tracking-widest relative group"
            >
              <span className="text-terminal-green/30 group-hover:text-terminal-green transition-colors mr-1">
                [
              </span>
              {link.name}
              <span className="text-terminal-green/30 group-hover:text-terminal-green transition-colors ml-1">
                ]
              </span>
            </Link>
          ))}
        </nav>

        {/* КНОПКА МЕНЮ ДЛЯ МОБИЛОК (Твоя идея с кнопочкой) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-terminal-green border border-terminal-green/50 px-3 py-1.5 uppercase hover:bg-terminal-green hover:text-terminal-bg transition-colors"
        >
          {isOpen ? "[ CLOSE ]" : "[ MENU ]"}
        </button>
      </div>

      {/* ВЫПАДАЮЩЕЕ МЕНЮ ДЛЯ МОБИЛОК */}
      {isOpen && (
        <nav className="md:hidden border-t border-terminal-green/30 bg-black flex flex-col">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              className="text-white/80 hover:text-terminal-green border-b border-terminal-green/10 p-4 uppercase tracking-widest flex items-center gap-2"
            >
              <span className="text-terminal-green opacity-50">{">"}</span>
              ./{link.name.toLowerCase()}.sh
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};
