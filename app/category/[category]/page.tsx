import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByCategory } from "@/lib/posts";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import CategoryFilter from "@/components/CategoryFilter";

interface Props {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return Object.values(CATEGORIES).map((cat) => ({
    category: cat.name,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const categoryName = decodeURIComponent(category);

  const catEntry = Object.values(CATEGORIES).find(
    (c) => c.name === categoryName
  );

  return {
    title: catEntry
      ? `${catEntry.icon} ${catEntry.name} — ${catEntry.description}`
      : `${categoryName} 글 모음`,
    description: catEntry?.description ?? `${categoryName} 관련 블로그 글 모음`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const categoryName = decodeURIComponent(category);

  const posts = getPostsByCategory(categoryName);
  const catEntry = Object.values(CATEGORIES).find(
    (c) => c.name === categoryName
  );

  if (posts.length === 0 && !catEntry) notFound();

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        <section className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-2">
            {catEntry?.icon} {categoryName}
          </h1>
          {catEntry && (
            <p className="text-base text-muted-foreground leading-relaxed mt-2">
              {catEntry.longDescription}
            </p>
          )}
          <p className="text-sm text-muted mt-2">
            총 {posts.length}개의 글
          </p>
        </section>

        <CategoryFilter activeCategory={categoryName} />

        <div className="grid gap-4">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">📭</p>
            <p>이 카테고리에는 아직 포스트가 없습니다.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
