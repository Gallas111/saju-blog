"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-card-border bg-card-bg/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🔮</span>
          <span className="text-lg font-bold text-gold group-hover:text-gold-light transition-colors">
            사주보까 블로그
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted hover:text-gold transition-colors">
            홈
          </Link>
          <Link href="/category/일주론" className="text-muted hover:text-gold transition-colors">
            일주론
          </Link>
          <Link href="/category/꿈 해몽" className="text-muted hover:text-gold transition-colors">
            꿈 해몽
          </Link>
          <Link href="/category/운세" className="text-muted hover:text-gold transition-colors">
            운세
          </Link>
          <Link href="/category/타로" className="text-muted hover:text-gold transition-colors">
            타로
          </Link>
          <Link
            href="https://www.sajuboka.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold text-background px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-gold-light transition-colors"
          >
            사주보까 →
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-muted hover:text-gold p-2"
          aria-label="메뉴"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-card-border bg-card-bg px-4 py-3 space-y-2">
          <Link href="/" onClick={() => setMenuOpen(false)} className="block py-2 text-muted hover:text-gold">홈</Link>
          <Link href="/category/일주론" onClick={() => setMenuOpen(false)} className="block py-2 text-muted hover:text-gold">일주론</Link>
          <Link href="/category/꿈 해몽" onClick={() => setMenuOpen(false)} className="block py-2 text-muted hover:text-gold">꿈 해몽</Link>
          <Link href="/category/운세" onClick={() => setMenuOpen(false)} className="block py-2 text-muted hover:text-gold">운세</Link>
          <Link href="/category/타로" onClick={() => setMenuOpen(false)} className="block py-2 text-muted hover:text-gold">타로</Link>
          <Link
            href="https://www.sajuboka.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-gold font-semibold"
          >
            사주보까 바로가기 →
          </Link>
        </nav>
      )}
    </header>
  );
}
