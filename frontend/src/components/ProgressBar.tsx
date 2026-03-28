interface ProgressBarProps {
  label: string;
  value: number;
}

export const ProgressBar = ({ label, value }: ProgressBarProps) => {
  const totalBars = 20;
  const filledBars = Math.round((value / 100) * totalBars);
  const barDisplay = "#".repeat(filledBars).padEnd(totalBars, "-");

  return (
    <div className="font-mono text-xs md:text-sm mb-4 group">
      {/* Верхняя строка: Название и Проценты */}
      <div className="flex justify-between mb-1">
        <span className="opacity-80 group-hover:text-terminal-green transition-colors">
          {label.toUpperCase()}
        </span>
        <span className="text-terminal-green">{value}%</span>
      </div>

      {/* Нижняя строка: Шкала [#####-----] */}
      <div className="flex items-center gap-2">
        <span className="text-terminal-green opacity-40">[</span>
        <span className="text-terminal-green tracking-[0.2em]">{barDisplay}</span>
        <span className="text-terminal-green opacity-40">]</span>
      </div>
    </div>
  );
};