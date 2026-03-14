import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

interface FeaturedPostsProps {
  posts: PostMeta[];
}

const FEATURED_SLUGS = [
  "gichuk-ilju",
  "snake-dream-meaning",
  "2026-samjaetti-fortune-analysis",
];

export default function FeaturedPosts({ posts }: FeaturedPostsProps) {
  const featured = FEATURED_SLUGS.map((slug) =>
    posts.find((p) => p.slug === slug)
  ).filter(Boolean) as PostMeta[];

  if (featured.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gold-light mb-4">
        인기 글
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featured.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block"
          >
            <article className="border border-gold/30 rounded-xl bg-card-bg p-5 hover:border-gold/60 transition-all hover:shadow-lg hover:shadow-gold/10 h-full flex flex-col">
              <span className="text-4xl mb-3">{post.icon}</span>
              <span className="text-xs bg-purple/20 text-purple px-2 py-0.5 rounded-full self-start mb-2">
                {post.category}
              </span>
              <h3 className="font-bold text-foreground group-hover:text-gold transition-colors line-clamp-2 mb-2 text-sm">
                {post.title}
              </h3>
              <p className="text-xs text-muted line-clamp-2 mt-auto">
                {post.description}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
