import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByCategory } from "@/lib/posts";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import CategoryFilter from "@/components/CategoryFilter";
import Pagination from "@/components/Pagination";

const POSTS_PER_PAGE = 10;

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const sp = await searchParams;
  const categoryName = decodeURIComponent(category);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const posts = getPostsByCategory(categoryName);
  const catEntry = Object.values(CATEGORIES).find(
    (c) => c.name === categoryName
  );

  if (posts.length === 0 && !catEntry) notFound();

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const currentPosts = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        <section className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-2">
            {catEntry?.icon} {categoryName}
          </h1>
          {catEntry && (
            <p className="text-muted">{catEntry.description}</p>
          )}
          <p className="text-sm text-muted mt-1">
            총 {posts.length}개의 글
          </p>
        </section>

        <CategoryFilter activeCategory={categoryName} />

        <div className="grid gap-4">
          {currentPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {currentPosts.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">📭</p>
            <p>이 카테고리에는 아직 포스트가 없습니다.</p>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath={`/category/${encodeURIComponent(categoryName)}`}
        />
      </main>
      <Footer />
    </>
  );
}
