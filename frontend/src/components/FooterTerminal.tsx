"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// Тип для строк в истории терминала
interface TerminalLine {
  id: string;
  type: "input" | "output" | "system" | "error";
  content: string;
}

export const FooterTerminal = () => {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [time, setTime] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);

  // Функция для сворачивания/разворачивания терминала
  const toggleTerminal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    // Устанавливаем время только после загрузки страницы в браузере (чтобы избежать ошибки Hydration)
    setTime(new Date().toLocaleTimeString());
    // Запускаем тиканье часов каждую секунду
    const interval = setInterval(
      () => setTime(new Date().toLocaleTimeString()),
      1000,
    );
    return () => clearInterval(interval);
  }, []);
  // Начальное сообщение терминала
  const [history, setHistory] = useState<TerminalLine[]>([
    { id: "1", type: "system", content: "IAMROOT.PRO Interactive Shell v2.0" },
    {
      id: "2",
      type: "system",
      content: 'Type "help" to see available commands.',
    },
  ]);

  // Ссылка на конец списка для автоскролла
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ссылка на инпут, чтобы всегда держать фокус (опционально)
  const inputRef = useRef<HTMLInputElement>(null);

  // Автоскролл вниз при добавлении новых строк
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // УМНЫЙ СКРОЛЛ: Плавно крутим, если на главной, иначе — переходим
  const smartNavigate = (sectionId: string) => {
    if (window.location.pathname === "/") {
      const element = document.getElementById(sectionId);
      if (element) {
        // block: 'start' гарантирует, что элемент прижмется к верхнему краю экрана
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      router.push(`/#${sectionId}`);
    }
  };

  // Обработчик команд
  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    let output: TerminalLine[] = [];

    // Генерация уникального ID для строк
    const getId = () => Math.random().toString(36).substring(2, 9);

    // Логика маршрутизации и команд
    switch (trimmedCmd) {
      case "help":
        output.push(
          { id: getId(), type: "output", content: "AVAILABLE COMMANDS:" },
          {
            id: getId(),
            type: "output",
            content: "  whoami    - Display system user info",
          },
          {
            id: getId(),
            type: "output",
            content: "  skills    - Navigate to SKILLS matrix",
          },
          {
            id: getId(),
            type: "output",
            content: "  exp       - Navigate to EXPERIENCE log",
          },
          {
            id: getId(),
            type: "output",
            content: "  projects  - Navigate to PROJECTS directory",
          },
          {
            id: getId(),
            type: "output",
            content: "  blog      - Access KNOWLEDGE_BASE",
          },
          {
            id: getId(),
            type: "output",
            content: "  contact   - Open secure connection channel",
          },
          {
            id: getId(),
            type: "output",
            content: "  clear     - Clear terminal output",
          },
        );
        break;
      case "whoami":
        output.push({
          id: getId(),
          type: "output",
          content: "root : Deputy Director of IT / Infrastructure Architect",
        });
        break;
      case "skills":
        smartNavigate("skills");
        output.push({
          id: getId(),
          type: "system",
          content: "[ OK ] Redirecting to SKILLS...",
        });
        break;
      case "exp":
      case "experience":
        smartNavigate("experience");
        output.push({
          id: getId(),
          type: "system",
          content: "[ OK ] Redirecting to EXPERIENCE_LOG...",
        });
        break;
      case "projects":
        smartNavigate("projects");
        output.push({
          id: getId(),
          type: "system",
          content: "[ OK ] Redirecting to PROJECTS...",
        });
        break;
      case "blog":
        router.push("/blog"); // Или router.push('/blog') если хочешь сразу на отдельную страницу
        output.push({
          id: getId(),
          type: "system",
          content: "[ OK ] Accessing KNOWLEDGE_BASE...",
        });
        break;
      case "contact":
        smartNavigate("contact");
        output.push({
          id: getId(),
          type: "system",
          content: "[ OK ] Initializing CONTACT protocol...",
        });
        break;
      case "clear":
        setHistory([]);
        return; // Выходим, чтобы не добавлять ввод в очищенную историю
      case "":
        break; // Пустой Enter
      default:
        output.push({
          id: getId(),
          type: "error",
          content: `Command not found: ${trimmedCmd}`,
        });
        break;
    }

    // Добавляем команду пользователя и ответ системы в историю
    setHistory((prev) => [
      ...prev,
      { id: getId(), type: "input", content: cmd },
      ...output,
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input) {
      handleCommand(input);
      setInput("");
    }
  };

  // Фокус на инпут при клике на всю область терминала
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  return (
    <>
      <footer
        onClick={isOpen ? handleTerminalClick : undefined}
        className={`bg-black/95 backdrop-blur-md border-t border-terminal-green/40 h-56 md:h-64 p-4 font-mono text-xs md:text-sm overflow-hidden flex flex-col cursor-text fixed bottom-0 left-0 w-full z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-6xl mx-auto w-full flex flex-col h-full relative">
          {/* Декоративная шапка терминала */}
          <div className="text-terminal-green/50 flex justify-between items-center border-b border-terminal-green/30 pb-2 mb-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex space-x-1.5 opacity-80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              </span>
              <span className="font-bold text-terminal-green">root@iamroot.pro:~# /bin/bash</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="hidden md:inline text-terminal-green/40">
                SYSTEM UPTIME: [ {time || "CALCULATING..."} ]
              </span>
              <button
                onClick={toggleTerminal}
                className="text-terminal-green/70 hover:text-terminal-green hover:bg-terminal-green/20 px-2 py-1 rounded transition-all flex items-center gap-1 group border border-transparent hover:border-terminal-green/30"
                title="Скрыть терминал"
              >
                <span className="group-hover:animate-pulse font-bold">_</span> MINIMIZE
              </button>
            </div>
          </div>

        {/* Область вывода (история) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col gap-1 pb-2">
          {history.map((line) => (
            <div key={line.id} className="whitespace-pre-wrap break-words">
              {line.type === "input" && (
                <div>
                  <span className="text-terminal-green mr-2">
                    root@iamroot:~$
                  </span>
                  <span className="text-white/80">{line.content}</span>
                </div>
              )}
              {line.type === "system" && (
                <div className="text-terminal-green/70">{line.content}</div>
              )}
              {line.type === "output" && (
                <div className="text-white/60 ml-4">{line.content}</div>
              )}
              {line.type === "error" && (
                <div className="text-red-400">bash: {line.content}</div>
              )}
            </div>
          ))}
          {/* Пустой div для автоскролла в самый низ */}
          <div ref={bottomRef} />
        </div>

        {/* Строка ввода */}
        <form onSubmit={handleSubmit} className="flex shrink-0 mt-1">
          <span className="text-terminal-green mr-2">root@iamroot:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white/80 focus:ring-0 p-0"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
          {/* Каретка терминала (моргающий квадрат) */}
          <span className="w-2 h-4 bg-terminal-green animate-pulse ml-1 inline-block translate-y-0.5" />
        </form>

        {/* Сканлайн поверх терминала */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(74,246,38,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />
      </div>
    </footer>

    {/* Кнопка открытия терминала, когда он скрыт */}
    <button
      onClick={() => setIsOpen(true)}
      className={`fixed bottom-0 right-4 sm:right-12 bg-black/90 backdrop-blur-sm border-t border-l border-r border-terminal-green/50 text-terminal-green px-5 py-2 font-mono text-xs sm:text-sm z-50 rounded-t-lg hover:bg-terminal-green/10 transition-all duration-500 ease-in-out flex items-center gap-2 group shadow-[0_0_15px_rgba(74,246,38,0.15)] hover:shadow-[0_0_20px_rgba(74,246,38,0.3)] ${
        isOpen ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
    >
      <span className="w-2 h-2 bg-terminal-green rounded-full group-hover:animate-ping absolute left-3"></span>
      <span className="pl-3 tracking-wider font-bold">&gt;_ SYS_CONSOLE</span>
    </button>
    </>
  );
};
