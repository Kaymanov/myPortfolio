"use client";

import { useState, useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Блок кода с кнопкой копирования.
 * Извлекает текст из дочернего <code> и кладёт в буфер обмена.
 */
const CodeBlock = ({ children }: { children?: ReactNode }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Если буфер недоступен (нет https/прав) — тихо игнорируем.
    }
  };

  return (
    <div className="relative group/code my-6">
      {/* Шапка блока кода в терминальном стиле */}
      <div className="flex items-center justify-between bg-terminal-green/5 border border-terminal-green/20 border-b-0 px-3 py-1.5">
        <span className="text-2xs uppercase tracking-widest text-terminal-green/50 font-mono">
          // code
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Скопировано" : "Скопировать код"}
          className="text-2xs uppercase tracking-widest font-mono px-2 py-0.5 border border-terminal-green/30 text-terminal-green/70 hover:bg-terminal-green hover:text-terminal-bg transition-colors"
        >
          {copied ? "[ COPIED ]" : "[ COPY ]"}
        </button>
      </div>
      <pre
        ref={preRef}
        className="!mt-0 !rounded-none bg-[#0a0a0a] border border-terminal-green/20 overflow-x-auto"
      >
        {children}
      </pre>
    </div>
  );
};

export const MarkdownContent = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      components={{
        // Заменяем стандартный <pre> на блок с кнопкой копирования.
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
