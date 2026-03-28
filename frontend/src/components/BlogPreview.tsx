import Link from "next/link";
import { BlogPost } from "@/types";

interface BlogPreviewProps {
  posts: BlogPost[];
}

export const BlogPreview = ({ posts }: BlogPreviewProps) => {
  // Заглушка, если статей нет
  if (!posts || posts.length === 0) {
    return (
      <div className="py-10 border border-dashed border-terminal-green/20 text-center opacity-40 italic text-sm font-mono">
        [ /var/log/knowledge_base IS EMPTY ]
      </div>
    );
  }

  // Форматер даты (из 2026-03-18T... -> 2026.03.18)
  const formatTStamp = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="font-mono">
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <Link
            href={`/blog/${post.slug}`}
            key={post.id}
            className="block border border-terminal-green/30 bg-terminal-bg p-5 hover:border-terminal-green transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-terminal-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="text-[10px] text-terminal-green/50 mb-3 flex justify-between border-b border-terminal-green/20 pb-2">
              <span>SYS_LOG: {post.id.toString().padStart(4, "0")}</span>
              <span>T-STAMP: {formatTStamp(post.created_at)}</span>
            </div>

            <h3 className="text-terminal-green text-base font-bold mb-3 uppercase tracking-tight group-hover:text-white transition-colors">
              <span className="opacity-50 mr-2">{">"}</span>
              {post.title}
            </h3>

            <p className="text-white/60 text-xs leading-relaxed mb-4 line-clamp-3">
              {post.excerpt}
            </p>

            <div className="flex gap-2 flex-wrap">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1 border border-terminal-green/20 text-terminal-green/60 uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/blog"
          className="inline-block border-b border-dashed border-terminal-green/50 text-terminal-green hover:text-white hover:border-white transition-colors text-sm uppercase tracking-widest pb-1"
        >
          cd /var/log/knowledge_base [VIEW ALL]
        </Link>
      </div>
    </div>
  );
};
