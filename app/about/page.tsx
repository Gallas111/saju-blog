import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "소개",
  description:
    "사주보까 스토리는 사주, 운세, 꿈 해몽, 타로 등 동양 철학 기반 운세 정보를 매일 업데이트하는 블로그입니다.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-8">
          사주보까 스토리 소개
        </h1>
        <div className="prose text-foreground space-y-6 leading-relaxed">
          <section>
            <h2>우리는 누구인가요?</h2>
            <p>
              <strong>사주보까 스토리</strong>는 AI 기반 사주 분석 서비스{" "}
              <a
                href="https://www.sajuboka.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                사주보까(sajuboka.com)
              </a>
              에서 운영하는 공식 블로그입니다.
            </p>
            <p>
              사주팔자, 운세, 꿈 해몽, 타로, 궁합, 명리학 등 동양 철학에
              기반한 다양한 운세 정보를 매일 업데이트하고 있습니다.
            </p>
          </section>

          <section>
            <h2>어떤 콘텐츠를 다루나요?</h2>
            <ul>
              <li>
                <strong>일주론</strong> — 60갑자 일주별 성격, 적성, 운세 분석
              </li>
              <li>
                <strong>꿈 해몽</strong> — 꿈에 등장하는 상징의 의미와 길흉 해석
              </li>
              <li>
                <strong>운세</strong> — 띠별 운세, 삼재, 직업운, 재물운 등
              </li>
              <li>
                <strong>타로</strong> — 메이저·마이너 아르카나 카드 의미와 리딩
                가이드
              </li>
              <li>
                <strong>궁합</strong> — 사주 궁합, 띠 궁합, 별자리·혈액형 궁합
              </li>
              <li>
                <strong>명리학·오행·절기·작명</strong> — 사주의 기초 이론과
                실생활 활용법
              </li>
            </ul>
          </section>

          <section>
            <h2>참고 사항</h2>
            <p>
              본 블로그의 모든 콘텐츠는 <strong>정보 제공 및 오락 목적</strong>
              으로 작성됩니다. 점술과 운세는 삶의 방향을 참고하는 도구일 뿐,
              전문적인 의료·법률·재정 자문을 대체하지 않습니다. 중요한 결정은
              반드시 전문가와 상담하시기 바랍니다.
            </p>
          </section>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-background font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
            >
              블로그 둘러보기 &rarr;
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
