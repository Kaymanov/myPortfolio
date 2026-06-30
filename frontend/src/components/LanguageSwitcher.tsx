"use client";

import { usePathname, useRouter } from "next/navigation";

export const LanguageSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname) return null;

  const currentLang = pathname.split("/")[1] || "ru";

  const switchLanguage = (lang: string) => {
    // pathname like /ru/something -> replace /ru with /en
    // Check if the current language prefix is valid, just in case
    const pathParts = pathname.split("/");
    if (pathParts[1] === "ru" || pathParts[1] === "en") {
      pathParts[1] = lang;
    } else {
      // Missing locale, prepend it
      pathParts.splice(1, 0, lang);
    }
    const newPathname = pathParts.join("/") || "/";
    router.push(newPathname, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2 font-mono text-2xs md:text-xs font-bold uppercase relative z-50 ml-4 mr-0 md:mr-4">
      <button
        type="button"
        onClick={() => switchLanguage("ru")}
        aria-label="Переключить на русский язык"
        aria-pressed={currentLang === "ru"}
        className={`transition-colors px-1 select-none py-0.5 cursor-pointer ${
          currentLang === "ru"
            ? "text-terminal-bg bg-terminal-green"
            : "text-terminal-green hover:text-white"
        }`}
      >
        RU
      </button>
      <span className="text-terminal-green/30 select-none" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        onClick={() => switchLanguage("en")}
        aria-label="Switch to English language"
        aria-pressed={currentLang === "en"}
        className={`transition-colors px-1 select-none py-0.5 cursor-pointer ${
          currentLang === "en"
            ? "text-terminal-bg bg-terminal-green"
            : "text-terminal-green hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
};
