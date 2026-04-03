import { Metadata } from "next";
import Link from "next/link";
import { BlogPost } from "@/types";
import { getBlogPosts } from "@/lib/api";

export const metadata: Metadata = {
  title: "Терминал Знаний | Блог",
  description: "Экспертные статьи про разработку сайтов, системное администрирование корпоративной IT инфраструктуры и интеграцию ИИ агентов.",
};

export default async function BlogIndex({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // Запрашиваем все посты с бэкенда
  const posts: BlogPost[] = await getBlogPosts(lang);

  // Форматер даты в терминальном стиле (YYYY.MM.DD)
  const formatTStamp = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto relative min-h-screen font-mono pb-32">
      {/* Шапка директории и навигация назад */}
      <header className="mb-16 mt-20 border-b border-terminal-green/30 pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4">
          <div>
            <div className="text-terminal-green/50 text-[10px] uppercase tracking-widest mb-2">
              // DIRECTORY LISTING
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-glitch text-terminal-green"
              data-text="/VAR/LOG/KNOWLEDGE_BASE"
            >
              /VAR/LOG/KNOWLEDGE_BASE
            </h1>
          </div>

          {/* Кнопка "Назад" в стиле терминала */}
          <Link
            href={`/${lang}`}
            className="text-sm border border-terminal-green/50 text-terminal-green px-4 py-2 hover:bg-terminal-green hover:text-terminal-bg transition-colors shrink-0 text-center"
          >
            [ cd .. ] RETURN TO ROOT
          </Link>
        </div>
        <div className="text-xs text-white/50 uppercase flex gap-4">
          <span>TOTAL_RECORDS: {posts.length}</span>
          <span>ACCESS_LEVEL: PUBLIC</span>
        </div>
      </header>

      {/* Список статей (Логов) */}
      <div className="flex flex-col gap-10">
        {posts.length > 0 ? (
          posts.map((post) => (
            <article
              key={post.id}
              className="group relative pl-6 md:pl-8 border-l border-terminal-green/20 hover:border-terminal-green transition-colors duration-300"
            >
              {/* Узел на линии (Декоративный квадрат) */}
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-terminal-bg border border-terminal-green group-hover:bg-terminal-green transition-colors duration-300 group-hover:shadow-[0_0_8px_rgba(74,246,38,0.8)]" />

              {/* Мета-информация (Дата, ID, Теги) */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-terminal-green/50 mb-3 uppercase tracking-wider">
                <span>T-STAMP: {formatTStamp(post.created_at)}</span>
                <span>
                  ID: 0x{post.id.toString(16).toUpperCase().padStart(4, "0")}
                </span>
                <div className="flex gap-2 text-terminal-green/70">
                  {post.tags.map((tag) => (
                    <span key={tag}>[{tag}]</span>
                  ))}
                </div>
              </div>

              {/* Заголовок и ссылка */}
              <Link href={`/${lang}/blog/${post.slug}`} className="block">
                <h2 className="text-lg md:text-xl font-bold mb-3 uppercase tracking-tight text-terminal-green group-hover:text-white transition-colors duration-300">
                  <span className="opacity-50 mr-2">{">"}</span>
                  {post.title}
                </h2>

                {/* Описание */}
                <p className="text-white/60 text-sm leading-relaxed line-clamp-3 group-hover:text-white/80 transition-colors duration-300 mb-4">
                  {post.excerpt}
                </p>
              </Link>

              {/* Кнопка чтения */}
              <div>
                <Link
                  href={`/${lang}/blog/${post.slug}`}
                  className="inline-block text-[10px] uppercase border border-terminal-green/30 text-terminal-green px-3 py-1.5 hover:bg-terminal-green hover:text-terminal-bg transition-colors font-bold tracking-widest"
                >
                  [ EXECUTE READ_LOG ]
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="py-20 text-center opacity-40 italic text-sm text-terminal-green border border-dashed border-terminal-green/30">
            [ DIRECTORY IS EMPTY // AWAITING DATA INJECTION ]
          </div>
        )}
      </div>

      {/* Сканлайн-оверлей (чтобы страница не выбивалась из стиля) */}
      <div className="fixed inset-0 bg-[linear-gradient(transparent_50%,rgba(74,246,38,0.02)_50%)] bg-[length:100%_4px] pointer-events-none z-50 opacity-20" />
    </main>
  );
}
