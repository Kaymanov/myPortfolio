export const HeroSection = () => {
  return (
    <section
      id="about"
      className="min-h-[70vh] flex flex-col justify-center relative mb-20 mt-20"
    >
      {/* Декоративный фоновый элемент (Абстрактная сетка/Лого) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none hidden lg:block text-[8px] leading-none font-mono text-terminal-green">
        {`
          01001001 01000001 01001101
          01010010 01001111 01001111 01010100
          ... SYSTEM BOOT SEQ INITIALIZED ...
          KERN_V: 5.15.0-generic
          ARCH: x86_64
        `}
      </div>

      <div className="relative z-10">
        <div className="text-terminal-green/50 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-terminal-green animate-pulse inline-block" />
          CONNECTION ESTABLISHED
        </div>

        {/* Имитация ввода команды */}
        <div className="text-white/60 font-mono text-sm md:text-base mb-6">
          <span className="text-terminal-green">root@iamroot.pro:~$</span>{" "}
          whoami
        </div>

        {/* Главный заголовок с глитчем */}
        <h1
          className="text-4xl md:text-6xl font-bold text-terminal-green mb-2 uppercase tracking-tighter text-glitch"
          data-text="ANDREY KAYMANOV"
        >
          ANDREY KAYMANOV
        </h1>

        {/* Подзаголовок / Должность */}
        <h2 className="text-white/80 text-lg md:text-xl font-mono mb-8 uppercase tracking-widest border-l-2 border-terminal-green pl-4">
          Deputy Director of IT{" "}
          <span className="text-terminal-green font-bold mx-2">||</span>{" "}
          Infrastructure Architect
        </h2>

        {/* Краткое био */}
        <p className="text-white/60 max-w-2xl font-mono text-sm leading-relaxed mb-10">
          Специализируюсь на проектировании отказоустойчивых систем,
          цифровизации бизнес-процессов и веб-разработке. Объединяю
          DevOps-практики с современной архитектурой на базе Linux, Django и
          React.
        </p>

        {/* Быстрые действия */}
        <div className="flex flex-wrap gap-4 font-mono text-sm">
          <a
            href="#contact"
            className="bg-terminal-green text-terminal-bg px-6 py-3 uppercase font-bold hover:bg-white transition-colors"
          >
            [ INITIALIZE_CONTACT ]
          </a>
          <a
            href="#projects"
            className="border border-terminal-green/50 text-terminal-green px-6 py-3 uppercase hover:border-terminal-green hover:bg-terminal-green/10 transition-colors"
          >
            cat /projects
          </a>
        </div>
      </div>
    </section>
  );
};
