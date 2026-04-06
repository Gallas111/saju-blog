"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import SearchInput from "@/components/SearchInput";

interface SearchEntry {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  date: string;
}

export default function SearchClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [posts, setPosts] = useState<SearchEntry[]>([]);

  useEffect(() => {
    fetch("/search-index.json")
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => {});
  }, []);

  const results = query
    ? posts.filter((post) => {
        const q = query.toLowerCase();
        return (
          post.title.toLowerCase().includes(q) ||
          post.description.toLowerCase().includes(q) ||
          post.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      })
    : [];

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
            <BlogCard key={post.slug} post={post as never} />
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
