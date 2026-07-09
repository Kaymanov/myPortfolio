"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const currentLang = pathname.split("/")[1] === "en" ? "en" : "ru";

  // Проверяем, находимся ли мы на главной странице
  const isHome = pathname === "/" || pathname === `/${currentLang}`;

  // Массив нашей навигации
  const navLinks = [
    { name: "SKILLS", path: isHome ? "#skills" : `/${currentLang}#skills` },
    {
      name: "EXPERIENCE",
      path: isHome ? "#experience" : `/${currentLang}#experience`,
    },
    {
      name: "PROJECTS",
      path: isHome ? "#projects" : `/${currentLang}#projects`,
    },
    { name: "KNOWLEDGE_BASE", path: `/${currentLang}/blog` },
    { name: "CONTACT", path: isHome ? "#contact" : `/${currentLang}#contact` },
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
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* ЛОГОТИП / ДОМАШНЯЯ ДИРЕКТОРИЯ */}
        <Link
          href="/"
          className="text-terminal-green font-bold flex items-center gap-2 hover:text-white transition-colors shrink-0"
          onClick={() => setIsOpen(false)}
        >
          <span className="animate-pulse w-2 h-4 bg-terminal-green inline-block" />
          {/* Полный prompt только на широких экранах (lg+), где навигация
              переключается на десктоп. На средних — короткий вид, чтобы
              длинные пункты меню не выдавливали шапку за границы. */}
          <span className="hidden lg:inline">admin@iamroot.pro:~#</span>
          <span className="lg:hidden">~/admin</span>
        </Link>

        {/* НАВИГАЦИЯ ДЛЯ ДЕСКТОПА — включается с lg (1024px), т.к. 5 длинных
            пунктов + логотип + переключатель языка не помещаются раньше. */}
        <nav
          className="hidden lg:flex gap-5 xl:gap-6"
          aria-label="Основная навигация"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              className="text-white/70 hover:text-terminal-green transition-colors uppercase tracking-wide xl:tracking-widest relative group whitespace-nowrap"
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

        <div className="flex items-center shrink-0">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          {/* КНОПКА МЕНЮ ДЛЯ МОБИЛОК/ПЛАНШЕТОВ (до lg) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
            className="lg:hidden text-terminal-green border border-terminal-green/50 px-3 py-1.5 uppercase hover:bg-terminal-green hover:text-terminal-bg transition-colors"
          >
            {isOpen ? "[ CLOSE ]" : "[ MENU ]"}
          </button>
        </div>
      </div>

      {/* ВЫПАДАЮЩЕЕ МЕНЮ ДЛЯ МОБИЛОК */}
      {isOpen && (
        <nav
          id="mobile-nav"
          className="lg:hidden border-t border-terminal-green/30 bg-black flex flex-col"
          aria-label="Мобильная навигация"
        >
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
          <div className="p-4 border-b border-terminal-green/10 flex items-center justify-between">
            <span className="text-white/80 uppercase tracking-widest text-xs">
              Language:
            </span>
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
};
