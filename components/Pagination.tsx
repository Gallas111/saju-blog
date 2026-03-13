import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
}

export default function Pagination({ currentPage, totalPages, basePath = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  function getHref(page: number) {
    if (page === 1) return basePath || "/";
    return `${basePath}?page=${page}`;
  }

  return (
    <nav className="flex justify-center items-center gap-2 sm:gap-2 mt-10" aria-label="페이지 네비게이션">
      {currentPage > 1 && (
        <Link
          href={getHref(currentPage - 1)}
          className="px-3.5 py-2.5 sm:px-3 sm:py-2 text-sm text-muted hover:text-gold border border-card-border rounded-lg hover:border-gold transition-colors"
        >
          ← 이전
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={getHref(page)}
          className={`px-3.5 py-2.5 sm:px-3 sm:py-2 text-sm rounded-lg transition-colors ${
            page === currentPage
              ? "bg-gold text-background font-semibold"
              : "text-muted hover:text-gold border border-card-border hover:border-gold"
          }`}
        >
          {page}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link
          href={getHref(currentPage + 1)}
          className="px-3.5 py-2.5 sm:px-3 sm:py-2 text-sm text-muted hover:text-gold border border-card-border rounded-lg hover:border-gold transition-colors"
        >
          다음 →
        </Link>
      )}
    </nav>
  );
}
