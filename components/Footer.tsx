import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-card-border bg-card-bg mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔮</span>
              <span className="font-bold text-gold">사주보까 블로그</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              사주, 운세, 꿈 해몽, 타로 등 운세 정보를 매일 업데이트합니다.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-gold-light mb-3">카테고리</h3>
            <ul className="space-y-1.5 text-sm text-muted">
              <li><Link href="/category/일주론" className="hover:text-gold transition-colors">일주론</Link></li>
              <li><Link href="/category/꿈 해몽" className="hover:text-gold transition-colors">꿈 해몽</Link></li>
              <li><Link href="/category/운세" className="hover:text-gold transition-colors">운세</Link></li>
              <li><Link href="/category/타로" className="hover:text-gold transition-colors">타로</Link></li>
              <li><Link href="/category/사주" className="hover:text-gold transition-colors">사주</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-gold-light mb-3">사주보까 서비스</h3>
            <ul className="space-y-1.5 text-sm text-muted">
              <li><a href="https://www.sajuboka.com/saju" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">사주 분석</a></li>
              <li><a href="https://www.sajuboka.com/today" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">오늘의 운세</a></li>
              <li><a href="https://www.sajuboka.com/compatibility" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">궁합 보기</a></li>
              <li><a href="https://www.sajuboka.com/tarot" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">타로 점</a></li>
              <li><a href="https://www.sajuboka.com/dream" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">꿈 해몽</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-card-border mt-8 pt-6 text-center text-xs text-muted">
          <p>&copy; {new Date().getFullYear()} 사주보까. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Link href="/terms" className="hover:text-gold transition-colors">이용약관</Link>
            <span className="text-card-border">|</span>
            <Link href="/privacy" className="hover:text-gold transition-colors">개인정보처리방침</Link>
            <span className="text-card-border">|</span>
            <a href="https://www.sajuboka.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors">
              sajuboka.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
