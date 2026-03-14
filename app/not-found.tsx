import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-20 flex-1 text-center">
        <p className="text-6xl mb-6">🔮</p>
        <h1 className="text-3xl font-bold text-gold-light mb-4">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-muted mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-background font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 border border-card-border hover:border-gold text-muted hover:text-gold px-6 py-2.5 rounded-full transition-colors text-sm"
          >
            검색하기
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
