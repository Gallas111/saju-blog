import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

interface BlogCardProps {
  post: PostMeta;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="border border-card-border rounded-xl bg-card-bg p-5 hover:border-gold/50 transition-all hover:shadow-lg hover:shadow-gold/5">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0 mt-1">{post.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-purple/20 text-purple px-2 py-0.5 rounded-full">
                {post.category}
              </span>
              <span className="text-xs text-muted">{post.date}</span>
              <span className="text-xs text-muted">{post.readingTime}분</span>
            </div>
            <h2 className="font-bold text-foreground group-hover:text-gold transition-colors line-clamp-2 mb-1.5">
              {post.title}
            </h2>
            <p className="text-sm text-muted line-clamp-2">{post.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted bg-background px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
