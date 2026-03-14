"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchInputProps {
  defaultValue?: string;
}

export default function SearchInput({ defaultValue = "" }: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="사주, 꿈 해몽, 타로 등 검색..."
          className="flex-1 bg-card-bg border border-card-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-gold transition-colors"
        />
        <button
          type="submit"
          className="bg-gold hover:bg-gold-dark text-background font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          검색
        </button>
      </div>
    </form>
  );
}
