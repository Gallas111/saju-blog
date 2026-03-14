import type { Metadata } from "next";
import { searchPosts } from "@/lib/posts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import SearchInput from "@/components/SearchInput";

export const metadata: Metadata = {
  title: "검색",
  description: "사주보까 블로그에서 원하는 운세 정보를 검색하세요.",
  robots: { index: false, follow: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? searchPosts(query) : [];

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold text-gold-light mb-6">검색</h1>

        <SearchInput defaultValue={query} />

        {query && (
          <p className="text-sm text-muted mb-6">
            &quot;{query}&quot; 검색 결과: {results.length}건
          </p>
        )}

        <div className="grid gap-4">
          {results.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {query && results.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">🔍</p>
            <p>검색 결과가 없습니다.</p>
            <p className="text-sm mt-2">다른 키워드로 검색해 보세요.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
