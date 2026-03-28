import { Education } from "@/types";

interface EducationMemoryProps {
  records: Education[];
}

export const EducationMemory = ({ records }: EducationMemoryProps) => {
  if (!records || records.length === 0) {
    return (
      <div className="py-10 border border-dashed border-terminal-green/20 text-center opacity-40 italic text-sm font-mono">
        [ MEMORY SECTORS EMPTY // NO FIRMWARE FOUND ]
      </div>
    );
  }

  // Генератор фейкового шестнадцатеричного адреса для красоты (на основе ID)
  const generateHexAddress = (id: number) => {
    return `0x${(id * 1459).toString(16).toUpperCase().padStart(4, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
      {records.map((record) => {
        const hexAddr = generateHexAddress(record.id);
        const isKernel = record.record_type.toUpperCase() === "BASE_KERNEL";

        return (
          <div
            key={record.id}
            className="border border-terminal-green/30 bg-terminal-bg p-4 relative overflow-hidden group hover:border-terminal-green transition-colors"
          >
            {/* Декоративный сканлайн поверх карточки */}
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(74,246,38,0.05)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />

            {/* Верхняя панель карточки (Адрес памяти и Статус) */}
            <div className="flex justify-between items-start mb-4 border-b border-terminal-green/20 pb-2 text-[10px] md:text-xs">
              <div className="flex gap-2 items-center">
                <span className="text-terminal-green/50">ADDR:</span>
                <span className="text-terminal-green font-bold tracking-widest">
                  {hexAddr}
                </span>
              </div>
              <div
                className={`px-1 py-0.5 border ${record.status === "VERIFIED" ? "border-terminal-green/50 text-terminal-green" : "border-yellow-500/50 text-yellow-500"}`}
              >
                [{record.status}]
              </div>
            </div>

            {/* Тип записи (Ядро или Патч) */}
            <div className="text-[10px] text-terminal-green/40 uppercase mb-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-terminal-green/40 animate-pulse" />
              TYPE: {record.record_type}
            </div>

            {/* Специальность (С глитчем) */}
            <h4
              className="text-terminal-green text-sm mb-2 uppercase font-bold tracking-tight text-glitch line-clamp-2"
              data-text={record.degree}
            >
              {record.degree}
            </h4>

            {/* Учебное заведение */}
            <div className="text-white/70 text-[11px] mb-4 uppercase">
              // {record.institution}
            </div>

            {/* Нижняя панель (Даты и декоративный хэш) */}
            <div className="mt-auto pt-3 flex justify-between items-end opacity-60">
              <div className="text-[10px]">
                <span className="text-terminal-green/50 mr-1">T-STAMP:</span>
                {record.date_range}
              </div>

              {/* Декоративный индикатор загрузки ядра/патча */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 ${isKernel ? "bg-terminal-green" : "bg-terminal-green/60"}`}
                    style={{ opacity: i < 4 ? 1 : 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
