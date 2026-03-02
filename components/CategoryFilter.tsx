"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

interface CategoryFilterProps {
  activeCategory?: string;
}

export default function CategoryFilter({ activeCategory }: CategoryFilterProps) {
  const categories = Object.entries(CATEGORIES);

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <Link
        href="/"
        className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm transition-colors ${
          !activeCategory
            ? "bg-gold text-background font-semibold"
            : "bg-card-bg border border-card-border text-muted hover:text-gold hover:border-gold"
        }`}
      >
        전체
      </Link>
      {categories.map(([, cat]) => (
        <Link
          key={cat.name}
          href={`/category/${encodeURIComponent(cat.name)}`}
          className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm transition-colors ${
            activeCategory === cat.name
              ? "bg-gold text-background font-semibold"
              : "bg-card-bg border border-card-border text-muted hover:text-gold hover:border-gold"
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
