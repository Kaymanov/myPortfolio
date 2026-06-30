"use client";

import { useState, useEffect, useRef } from "react";
import {
  classifyContactResponse,
  type ContactStatus,
  type ContactOutcome,
} from "@/lib/contact";

interface ContactStatusMessages {
  transmitting: string;
  success: string;
  errorValidation: string;
  errorThrottle: string;
  errorNetwork: string;
}

interface ContactDictionary {
  description: string;
  notice: string;
  status?: ContactStatusMessages;
}

// Запасные сообщения на случай отсутствия локализованных строк (обратная
// совместимость со старой структурой словаря).
const FALLBACK_STATUS: ContactStatusMessages = {
  transmitting: "[ ... ] Transmitting packet...",
  success: "[ OK ] Packet delivered.",
  errorValidation: "[ ERROR ] Packet rejected by server.",
  errorThrottle: "[ LIMIT ] Submission limit reached.",
  errorNetwork: "[ NETWORK ] Connection failed.",
};

// 10-секундный тайм-аут запроса (R2.7).
const REQUEST_TIMEOUT_MS = 10_000;
// Авто-возврат в IDLE после успешной отправки (R2.2).
const SUCCESS_RESET_MS = 3_000;

/**
 * Сопоставляет состояние машины с локализованным inline-сообщением.
 * Возвращает `null` для состояний без видимого сообщения (IDLE).
 */
function statusMessage(
  status: ContactStatus,
  messages: ContactStatusMessages,
): string | null {
  switch (status) {
    case "TRANSMITTING":
      return messages.transmitting;
    case "SUCCESS":
      return messages.success;
    case "ERROR_VALIDATION":
      return messages.errorValidation;
    case "ERROR_THROTTLE":
      return messages.errorThrottle;
    case "ERROR_NETWORK":
      return messages.errorNetwork;
    case "IDLE":
    default:
      return null;
  }
}

const isErrorStatus = (status: ContactStatus): boolean =>
  status === "ERROR_VALIDATION" ||
  status === "ERROR_THROTTLE" ||
  status === "ERROR_NETWORK";

export const ContactTerminal = ({
  dictionary,
}: {
  dictionary: ContactDictionary;
}) => {
  const messages = dictionary.status ?? FALLBACK_STATUS;

  const [formData, setFormData] = useState({
    alias: "",
    email: "",
    payload: "",
    website: "", // Honeypot
  });
  const [startTime, setStartTime] = useState<number>(0);
  const [status, setStatus] = useState<ContactStatus>("IDLE");

  // Таймеры/контроллеры, требующие очистки при размонтировании.
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Инициализируем таймер при загрузке компонента
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Во время передачи повторная отправка запрещена (R2.6).
    if (status === "TRANSMITTING") return;
    if (!formData.alias || !formData.email || !formData.payload) return;

    // Сбрасываем возможный отложенный авто-возврат из предыдущей попытки.
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    setStatus("TRANSMITTING");
    const timeElapsed = Date.now() - startTime;

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); // R2.7

    let outcome: ContactOutcome;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/contact/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender_alias: formData.alias,
            return_node_ip: formData.email,
            encrypted_payload: formData.payload,
            honeypot: formData.website,
            time_elapsed: timeElapsed,
          }),
          signal: controller.signal,
        },
      );

      outcome = response.ok
        ? { kind: "ok" }
        : { kind: "status", status: response.status };
    } catch {
      // Прерывание по тайм-ауту или сетевая ошибка → сетевой исход (R2.7).
      outcome = { kind: "network" };
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
    }

    const nextStatus = classifyContactResponse(outcome);
    setStatus(nextStatus);

    if (nextStatus === "SUCCESS") {
      // Очистка отправленных значений и авто-возврат в IDLE через 3 c (R2.2).
      setFormData({ alias: "", email: "", payload: "", website: "" });
      setStartTime(Date.now());
      resetTimerRef.current = setTimeout(() => {
        setStatus("IDLE");
        resetTimerRef.current = null;
      }, SUCCESS_RESET_MS);
    }
    // После любой ошибки форма остаётся редактируемой и повтор разрешён
    // (R2.3, R2.4, R2.7): поля сохранены, кнопка снова активна.
  };

  const transmitting = status === "TRANSMITTING";
  const fieldsDisabled = transmitting; // R2.6
  const currentMessage = statusMessage(status, messages);

  return (
    <div className="border border-terminal-green/30 bg-terminal-bg p-6 relative overflow-hidden font-mono mx-auto shadow-[0_0_15px_rgba(74,246,38,0.05)]">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-1 bg-terminal-green/20" />
      <div className="absolute top-0 right-0 w-16 h-1 bg-terminal-green" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ЛЕВАЯ КОЛОНКА: ИНФО И КОНТАКТЫ */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-terminal-green/50 text-2xs uppercase tracking-widest mb-2">
              // SYSTEM.NET.SOCKETS.TCPCLIENT
            </div>
            <h3 className="text-terminal-green text-xl font-bold tracking-tight uppercase flex items-center gap-2 mb-6">
              <span className="animate-pulse w-3 h-5 bg-terminal-green inline-block" />
              ESTABLISH CONNECTION
            </h3>

            {/* CTA Текст */}
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              {dictionary.description}
            </p>

            {/* Дисклеймер (B2B/B2C) */}
            <div className="border-l-2 border-terminal-green/50 pl-3 py-1 mb-8 bg-terminal-green/5">
              <p className="text-terminal-green/80 text-xs leading-relaxed">
                {dictionary.notice}
              </p>
            </div>
          </div>

          {/* Контактные линки */}
          <div className="flex flex-col gap-4">
            <a
              href="mailto:admin@iamroot.pro"
              className="group flex items-center gap-3 w-fit"
            >
              <span className="text-terminal-green/50 group-hover:text-terminal-green transition-colors">
                [ MAIL ]
              </span>
              <span className="text-white/70 group-hover:text-white transition-colors border-b border-transparent group-hover:border-terminal-green/50 pb-0.5">
                admin@iamroot.pro
              </span>
            </a>

            <a
              href="tel:+79054811133"
              className="group flex items-center gap-3 w-fit"
            >
              <span className="text-terminal-green/50 group-hover:text-terminal-green transition-colors">
                [ CELL ]
              </span>
              <span className="text-white/70 group-hover:text-white transition-colors border-b border-transparent group-hover:border-terminal-green/50 pb-0.5">
                +7 (905) 481-11-33
              </span>
            </a>

            <a
              href="https://t.me/Kaymanov_Andrey"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 w-fit"
            >
              <span className="text-terminal-green/50 group-hover:text-terminal-green transition-colors">
                [ TG_NODE ]
              </span>
              <span className="text-white/70 group-hover:text-white transition-colors border-b border-transparent group-hover:border-terminal-green/50 pb-0.5">
                @Kaymanov_Andrey
              </span>
            </a>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: ФОРМА */}
        <div className="lg:border-l lg:border-terminal-green/20 lg:pl-10">
          <div className="text-2xs text-white/55 mb-6 flex justify-between items-end">
            <span>DIRECT_PAYLOAD_UPLOAD</span>
            <span className="text-terminal-green/60 animate-pulse">
              PORT 443: LISTENING
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* HONEYPOT FIELD - скрытое поле, на которое ведутся спам-боты */}
            <input
              type="text"
              name="company_website"
              style={{
                display: "none",
                position: "absolute",
                opacity: 0,
                width: 0,
                height: 0,
              }}
              tabIndex={-1}
              autoComplete="off"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
            />
            {/* Поля в один столбик для аккуратности справа */}
            <div className="group">
              <label className="block text-terminal-green/70 text-2xs uppercase tracking-widest mb-1 group-focus-within:text-terminal-green transition-colors">
                SENDER_ALIAS //
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-terminal-green/50">
                  {">"}
                </span>
                <input
                  type="text"
                  required
                  disabled={fieldsDisabled}
                  value={formData.alias}
                  onChange={(e) =>
                    setFormData({ ...formData, alias: e.target.value })
                  }
                  className="w-full bg-terminal-bg border border-terminal-green/30 text-terminal-green p-2 pl-6 focus:border-terminal-green focus:outline-none transition-colors disabled:opacity-50 text-sm"
                  placeholder="Guest_User"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-terminal-green/70 text-2xs uppercase tracking-widest mb-1 group-focus-within:text-terminal-green transition-colors">
                RETURN_NODE_IP (EMAIL) //
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-terminal-green/50">
                  {">"}
                </span>
                <input
                  type="email"
                  required
                  disabled={fieldsDisabled}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-terminal-bg border border-terminal-green/30 text-terminal-green p-2 pl-6 focus:border-terminal-green focus:outline-none transition-colors disabled:opacity-50 text-sm"
                  placeholder="name@domain.com"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-terminal-green/70 text-2xs uppercase tracking-widest mb-1 group-focus-within:text-terminal-green transition-colors">
                ENCRYPTED_PAYLOAD //
              </label>
              <div className="relative">
                <span className="absolute top-2 left-2 text-terminal-green/50">
                  {">"}
                </span>
                <textarea
                  required
                  disabled={fieldsDisabled}
                  value={formData.payload}
                  onChange={(e) =>
                    setFormData({ ...formData, payload: e.target.value })
                  }
                  rows={4}
                  className="w-full bg-terminal-bg border border-terminal-green/30 text-terminal-green p-2 pl-6 focus:border-terminal-green focus:outline-none transition-colors resize-none disabled:opacity-50 text-sm"
                  placeholder="Enter your directives here..."
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Inline-область статуса для скринридеров и пользователей (R2.2–R2.7, R9.2) */}
            <div
              role="status"
              aria-live="polite"
              className="min-h-5 text-2xs leading-relaxed"
            >
              {currentMessage && (
                <span
                  className={
                    status === "SUCCESS"
                      ? "text-terminal-green"
                      : isErrorStatus(status)
                        ? "text-red-400"
                        : "text-terminal-green/70"
                  }
                >
                  {currentMessage}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-terminal-green/20 pt-4">
              <div className="text-2xs text-white/55">RSA-4096 ENABLED</div>
              <button
                type="submit"
                disabled={transmitting}
                className="border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg px-6 py-2 uppercase font-bold text-sm transition-[background-color,color,opacity] duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {status === "IDLE" && <span>[ TRANSMIT ]</span>}
                {status === "TRANSMITTING" && (
                  <span className="animate-pulse">UPLOADING...</span>
                )}
                {status === "SUCCESS" && <span>[ DELIVERED ]</span>}
                {isErrorStatus(status) && <span>[ RETRY ]</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
