import { Experience } from "@/types";

interface ExperienceTimelineProps {
  experiences: Experience[];
}

export const ExperienceTimeline = ({
  experiences,
}: ExperienceTimelineProps) => {
  if (!experiences || experiences.length === 0) {
    return (
      <div className="py-10 border border-dashed border-terminal-green/20 text-center opacity-40 italic text-sm font-mono">
        [ No experience logs found in database ]
      </div>
    );
  }

  // Функция для красивого форматирования дат из YYYY-MM-DD в YYYY.MM
  const formatTerminalDate = (dateString: string | null) => {
    if (!dateString) return "PRESENT";
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <div className="relative font-mono text-xs md:text-sm">
      {/* Вертикальная линия шкалы */}
      <div className="absolute left-1 top-0 h-full w-px bg-terminal-green/20 md:left-[9.1rem]" />

      {experiences.map((log) => {
        // Формируем период работы
        const period = `${formatTerminalDate(log.date_range)} - ${formatTerminalDate(log.end_date)}`;
        const statusClean = log.status.toUpperCase();

        return (
          <div
            key={log.id}
            className="relative pl-6 pb-12 group md:flex md:pl-0"
          >
            {/* Дата и статус (Слева на десктопе) */}
            <div className="mb-4 md:mb-0 md:w-36 md:text-right md:pr-10 md:pt-1 shrink-0">
              <div className="text-terminal-green/50 text-[10px] tracking-widest mb-1">
                {period}
              </div>
              <div
                className={`text-[9px] px-1.5 py-0.5 inline-block border uppercase ${statusClean === "ACTIVE" ? "border-terminal-green bg-terminal-green/10 text-terminal-green" : "border-terminal-green/30 text-terminal-green/40"}`}
              >
                [{statusClean}]
              </div>
            </div>

            {/* Узел-квадрат на линии */}
            <div className="absolute left-0 top-1.5 w-2.5 h-2.5 border border-terminal-green bg-terminal-bg group-hover:bg-terminal-green group-hover:shadow-[0_0_10px_rgba(74,246,38,0.5)] transition-all duration-300 md:left-36 md:-translate-x-[5px]" />

            {/* Контент (Справа) */}
            <div className="md:pl-10 flex-1">
              {/* Должность */}
              <h4
                className="text-terminal-green text-sm mb-1 uppercase font-bold tracking-tight text-glitch"
                data-text={log.stage}
              >
                <span className="opacity-50 mr-2">{">"}</span>
                {log.stage}
              </h4>

              {/* Компания */}
              <div className="text-terminal-green/70 text-[11px] uppercase tracking-wider mb-4 border-b border-terminal-green/10 pb-2">
                @ {log.company}
              </div>

              {/* Описание задач */}
              <p className="text-white/70 mb-4 text-[11px] leading-relaxed whitespace-pre-wrap">
                {log.objective}
              </p>

              {/* Стек технологий (из details) */}
              {log.details && log.details.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-4">
                  <span className="text-terminal-green/40 text-[9px] uppercase pt-0.5 mr-1">
                    STACK:
                  </span>
                  {log.details.map((tech, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 border border-terminal-green/20 text-terminal-green/60 uppercase hover:text-terminal-green hover:border-terminal-green/50 transition-colors"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
