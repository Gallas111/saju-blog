"use client";

import { useState } from "react";
import BlogCard from "./BlogCard";
import type { PostMeta } from "@/lib/posts";

const POSTS_PER_PAGE = 10;

interface ClientPaginationProps {
  posts: PostMeta[];
}

export default function ClientPagination({ posts }: ClientPaginationProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const currentPosts = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <>
      <div className="grid gap-4">
        {currentPosts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      {currentPosts.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-4xl mb-4">📭</p>
          <p>아직 포스트가 없습니다.</p>
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="flex justify-center items-center gap-2 sm:gap-2 mt-10"
          aria-label="페이지 네비게이션"
        >
          {page > 1 && (
            <button
              onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
              className="px-3.5 py-2.5 sm:px-3 sm:py-2 text-sm text-muted hover:text-gold border border-card-border rounded-lg hover:border-gold transition-colors"
            >
              ← 이전
            </button>
          )}

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => { setPage(p); window.scrollTo(0, 0); }}
              className={`px-3.5 py-2.5 sm:px-3 sm:py-2 text-sm rounded-lg transition-colors ${
                p === page
                  ? "bg-gold text-background font-semibold"
                  : "text-muted hover:text-gold border border-card-border hover:border-gold"
              }`}
            >
              {p}
            </button>
          ))}

          {page < totalPages && (
            <button
              onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
              className="px-3.5 py-2.5 sm:px-3 sm:py-2 text-sm text-muted hover:text-gold border border-card-border rounded-lg hover:border-gold transition-colors"
            >
              다음 →
            </button>
          )}
        </nav>
      )}
    </>
  );
}
