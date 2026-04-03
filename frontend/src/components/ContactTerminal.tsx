"use client";

import { useState, useEffect } from "react";

export const ContactTerminal = ({ dictionary }: { dictionary: { description: string, notice: string } }) => {
  const [formData, setFormData] = useState({
    alias: "",
    email: "",
    payload: "",
    website: "", // Honeypot
  });
  const [startTime, setStartTime] = useState<number>(0);
  const [status, setStatus] = useState<"IDLE" | "TRANSMITTING" | "SUCCESS">(
    "IDLE",
  );

  useEffect(() => {
    // Инициализируем таймер при загрузке компонента
    setStartTime(Date.now());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.alias || !formData.email || !formData.payload) return;

    setStatus("TRANSMITTING");
    const timeElapsed = Date.now() - startTime;

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
        },
      );

      if (response.ok) {
        setStatus("SUCCESS");
        setFormData({ alias: "", email: "", payload: "", website: "" });
      } else {
        // Если сработал Throttle (лимит запросов) или ошибка валидации
        console.error("Transmission failed");
        setStatus("IDLE");
        alert(
          "[ ERROR ] Передача прервана. Сервер отклонил пакет (возможно, сработал лимит запросов).",
        );
      }
    } catch (error) {
      console.error("Network error:", error);
      setStatus("IDLE");
      alert(
        "[ ERROR ] Ошибка сети. Невозможно установить соединение с сервером.",
      );
    } finally {
      // Возвращаем кнопку в исходное состояние через 3 секунды (если успех)
      if (status !== "IDLE") {
        setTimeout(() => setStatus("IDLE"), 3000);
      }
    }
  };

  return (
    <div className="border border-terminal-green/30 bg-terminal-bg p-6 relative overflow-hidden font-mono mx-auto shadow-[0_0_15px_rgba(74,246,38,0.05)]">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-1 bg-terminal-green/20" />
      <div className="absolute top-0 right-0 w-16 h-1 bg-terminal-green" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ЛЕВАЯ КОЛОНКА: ИНФО И КОНТАКТЫ */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-terminal-green/50 text-[10px] uppercase tracking-widest mb-2">
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
          <div className="text-[10px] text-white/40 mb-6 flex justify-between items-end">
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
              style={{ display: "none", position: "absolute", opacity: 0, width: 0, height: 0 }}
              tabIndex={-1}
              autoComplete="off"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
            {/* Поля в один столбик для аккуратности справа */}
            <div className="group">
              <label className="block text-terminal-green/70 text-[10px] uppercase tracking-widest mb-1 group-focus-within:text-terminal-green transition-colors">
                SENDER_ALIAS //
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-terminal-green/50">
                  {">"}
                </span>
                <input
                  type="text"
                  required
                  disabled={status !== "IDLE"}
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
              <label className="block text-terminal-green/70 text-[10px] uppercase tracking-widest mb-1 group-focus-within:text-terminal-green transition-colors">
                RETURN_NODE_IP (EMAIL) //
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2 text-terminal-green/50">
                  {">"}
                </span>
                <input
                  type="email"
                  required
                  disabled={status !== "IDLE"}
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
              <label className="block text-terminal-green/70 text-[10px] uppercase tracking-widest mb-1 group-focus-within:text-terminal-green transition-colors">
                ENCRYPTED_PAYLOAD //
              </label>
              <div className="relative">
                <span className="absolute top-2 left-2 text-terminal-green/50">
                  {">"}
                </span>
                <textarea
                  required
                  disabled={status !== "IDLE"}
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

            <div className="mt-2 flex items-center justify-between border-t border-terminal-green/20 pt-4">
              <div className="text-[10px] text-white/40">RSA-4096 ENABLED</div>
              <button
                type="submit"
                disabled={status !== "IDLE"}
                className="border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg px-6 py-2 uppercase font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {status === "IDLE" && <span>[ TRANSMIT ]</span>}
                {status === "TRANSMITTING" && (
                  <span className="animate-pulse">UPLOADING...</span>
                )}
                {status === "SUCCESS" && <span>[ DELIVERED ]</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
