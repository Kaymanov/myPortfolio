import Image from "next/image";
import Link from "next/link";
import { Project } from "@/types";

export const ProjectCard = ({ project }: { project: Project }) => {
  // КАРТИНКИ ИЗ DJANGO (ПРОДАКШЕН ВЕРСИЯ):
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;

    // 1. Вычищаем все внутренние адреса Докера и локалхоста,
    // заменяя их на публичный домен.
    let cleanPath = imagePath
      .replace("http://backend:8000", "https://iamroot.pro")
      .replace("http://portfolio-backend:8000", "https://iamroot.pro")
      .replace("http://127.0.0.1:8000", "https://iamroot.pro")
      .replace("http://localhost:8000", "https://iamroot.pro");

    // 2. Если Django вернул просто относительный путь (/media/...),
    // подклеиваем к нему публичный домен.
    if (cleanPath.startsWith("/")) {
      cleanPath = `https://iamroot.pro${cleanPath}`;
    }

    return cleanPath;
  };

  const imageUrl = getImageUrl(project.image);

  return (
    <div className="border border-terminal-border bg-terminal-bg/50 group hover:border-terminal-green transition-all duration-300 p-2 relative overflow-hidden flex flex-col h-full">
      {/* Эффект свечения при наведении */}
      <div className="absolute inset-0 bg-terminal-green/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />

      {/* Превью проекта */}
      <div className="relative aspect-video mb-3 overflow-hidden border border-terminal-border bg-black shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={project.title}
            fill
            unoptimized // Временно отключаем оптимизацию Next.js для картинок из Django
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover opacity-50 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] opacity-20 uppercase">No Signal</span>
          </div>
        )}
        {/* Сетка поверх картинки для стиля */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      </div>

      {/* Информация */}
      <div className="p-2 relative z-10 flex flex-col flex-grow">
        <h4
          className="text-terminal-green text-sm mb-2 uppercase font-bold tracking-tight text-glitch"
          data-text={`${project.title.toUpperCase()}`} // Передаем текст для дублирования слоев
        >
          <span className="opacity-50 mr-2">{">"}</span>
          {project.title}
        </h4>
        <p className="text-[11px] text-white/60 leading-relaxed mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Стек технологий */}
        <div className="flex gap-2 flex-wrap mb-4">
          {project.technologies.map((tech, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 border border-terminal-green/20 text-terminal-green/60 uppercase"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* КНОПКА ССЫЛКИ: mt-auto прижимает этот блок к самому низу карточки */}
        <div className="mt-auto pt-3 border-t border-terminal-green/20">
          {project.link ? (
            <Link
              href={project.link}
              target="_blank" // Открываем в новой вкладке
              rel="noopener noreferrer" // Безопасность при внешних ссылках
              className="inline-flex items-center gap-2 text-[10px] uppercase font-bold bg-terminal-green text-terminal-bg px-2 py-1 hover:bg-white transition-colors"
            >
              <span>[ RUN ]</span>
              {/* Маленькая иконка внешней ссылки */}
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>
          ) : (
            <span className="text-[10px] opacity-30 italic text-terminal-green">
              // Offline mode only
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
