import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/api";
import { Metadata, ResolvingMetadata } from "next";

// В Next.js 15+ params — это Promise, поэтому типизируем и разворачиваем его через await
interface BlogPostPageProps {
  params: Promise<{ slug: string; lang: string }>;
}

export async function generateMetadata(
  { params }: BlogPostPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug, lang } = await params;
  const post = await getBlogPost(slug, lang);

  if (!post) {
    return {
      title: "File Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.created_at,
      tags: post.tags,
      url: `https://iamroot.pro/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug, lang } = await params;

  // Запрашиваем статью
  const post = await getBlogPost(slug, lang);

  // Если статья не найдена (вернулся null), показываем встроенную страницу 404
  if (!post) {
    notFound();
  }

  // Форматер даты
  const formatTStamp = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto relative min-h-screen font-mono pb-32 overflow-x-hidden w-full">
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ (Шапка) */}
      <header className="mb-10 mt-20 border-b border-terminal-green/30 pb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        <div>
          <div className="text-terminal-green/50 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-terminal-green animate-pulse inline-block" />
            READING LOG_FILE: {slug}.log
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-terminal-green text-glitch"
            data-text={post.title}
          >
            {post.title}
          </h1>
        </div>

        {/* Кнопка "Назад" */}
        <Link
          href={`/${lang}/blog`}
          className="text-sm border border-terminal-green/50 text-terminal-green px-4 py-2 hover:bg-terminal-green hover:text-terminal-bg transition-colors shrink-0 text-center"
        >
          [ cd .. ] BACK TO LOGS
        </Link>
      </header>

      {/* МЕТА-ДАННЫЕ ФАЙЛА */}
      <div className="bg-terminal-green/5 border border-terminal-green/20 p-4 mb-10 text-[10px] md:text-xs text-terminal-green/70 uppercase flex flex-col gap-2">
        <div className="flex justify-between">
          <span>
            FILE_ID: 0x{post.id.toString(16).toUpperCase().padStart(4, "0")}
          </span>
          <span>AUTHOR: ROOT</span>
        </div>
        <div className="flex justify-between">
          <span>T-STAMP: {formatTStamp(post.created_at)}</span>
          <span>STATUS: VERIFIED</span>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 pt-2 border-t border-terminal-green/20 flex gap-2 flex-wrap">
            <span className="text-terminal-green/40">TAGS:</span>
            {post.tags.map((tag) => (
              <span key={tag} className="text-terminal-green/90">
                [{tag}]
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ТЕЛО СТАТЬИ (Контент) */}
      <article className="prose prose-sm md:prose-base prose-invert prose-p:text-white/80 prose-headings:text-terminal-green prose-a:text-terminal-green hover:prose-a:text-white prose-a:underline prose-a:underline-offset-4 prose-code:text-terminal-green prose-code:bg-terminal-green/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-none prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-terminal-green/20 max-w-none ">
        {/* Рендерим HTML, который пришел из Django */}
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </article>

      {/* КОНЕЦ ФАЙЛА */}
      <div className="mt-20 pt-6 border-t border-dashed border-terminal-green/30 text-center text-terminal-green/40 text-sm tracking-widest">
        [ EOF - END OF FILE ]
      </div>
    </main>
  );
}
