import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByTag, findTagName, getAllTags } from "@/lib/tags";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";

interface Props {
  params: Promise<{ tag: string }>;
}

export function generateStaticParams() {
  return getAllTags().map((tag) => ({
    tag: tag.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const tagSlug = decodeURIComponent(tag);
  const tagName = findTagName(tagSlug);

  return {
    title: tagName ? `#${tagName} 관련 글` : `#${tagSlug} 관련 글`,
    description: `${tagName ?? tagSlug} 태그가 포함된 블로그 글 모음`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const tagSlug = decodeURIComponent(tag);

  const tagName = findTagName(tagSlug);
  const posts = getPostsByTag(tagSlug);

  if (posts.length === 0) notFound();

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        <section className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-2">
            🏷️ #{tagName ?? tagSlug}
          </h1>
          <p className="text-sm text-muted">
            총 {posts.length}개의 글
          </p>
        </section>

        <div className="grid gap-4">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
