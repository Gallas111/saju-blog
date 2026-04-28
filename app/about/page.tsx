import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { generateOrganizationSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "소개 — 사주보까 스토리 편집팀",
  description:
    "사주보까 스토리 편집팀의 콘텐츠 작성·검수 프로세스, 참고 문헌, 정정 정책을 안내합니다. 동양철학·명리학 기반 사주·운세·꿈해몽·타로 정보를 매일 발행합니다.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  const orgSchema = generateOrganizationSchema();

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-6">
          사주보까 스토리 소개
        </h1>
        <p className="text-muted leading-relaxed mb-10">
          동양철학·명리학을 바탕으로 한 사주·운세·꿈해몽·타로 콘텐츠를
          매일 발행합니다. 전통 이론과 현대 생활 적용을 균형 있게 다룹니다.
        </p>

        <div className="prose text-foreground space-y-8 leading-relaxed">
          <section>
            <h2>편집 매체 소개</h2>
            <p>
              <strong>사주보까 스토리(sajubokastory.com)</strong>는 AI 사주 분석
              서비스{" "}
              <a
                href="https://www.sajuboka.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                사주보까(sajuboka.com)
              </a>
              가 운영하는 공식 콘텐츠 매체입니다. 2024년 개설 이후 사주·운세·
              꿈해몽·타로·궁합·관상·작명 등 동양철학 기반 정보를 누적 450편
              이상 발행하고 있습니다.
            </p>
            <p>
              개인 점술사가 운영하는 미디어가 아니라, 명리학 연구진과 콘텐츠
              에디터로 구성된 편집팀이 협업해 작성·검수합니다.
            </p>
          </section>

          <section>
            <h2>편집팀 구성</h2>
            <ul>
              <li>
                <strong>명리학 자문진</strong> — 자평진전·적천수 같은 고전
                명리학 텍스트와 한국명리학회 자료를 기반으로 콘텐츠 정확성을
                검수합니다.
              </li>
              <li>
                <strong>콘텐츠 에디터</strong> — 전통 이론을 현대 일상 언어로
                풀어내는 글쓰기와 가독성을 담당합니다.
              </li>
              <li>
                <strong>SEO·UX 담당</strong> — 검색 의도 분석, 본문 구조,
                사용자 경험 최적화를 담당합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2>콘텐츠 작성·검수 프로세스</h2>
            <ol>
              <li>
                <strong>주제 선정</strong> — 검색 트렌드(Google Trends·Naver
                DataLab)와 독자 질문 분석으로 주제 결정.
              </li>
              <li>
                <strong>리서치</strong> — 고전 명리학 텍스트(자평진전·적천수
                ·궁통보감)와 현대 해석 자료를 교차 참고.
              </li>
              <li>
                <strong>초안 작성</strong> — 전통 이론을 한국어 일상 표현으로
                옮기되, 핵심 한자·전문 용어는 원형 유지.
              </li>
              <li>
                <strong>전문 검수</strong> — 명리학 자문진이 이론적 정확성과
                일관성을 점검.
              </li>
              <li>
                <strong>발행·업데이트</strong> — 발행 후 독자 피드백·새로운
                자료를 반영해 주기적 업데이트(<code>dateModified</code>{" "}
                기록).
              </li>
            </ol>
          </section>

          <section>
            <h2>다루는 콘텐츠 분야</h2>
            <ul>
              <li>
                <strong>일주론·사주·명리학</strong> — 60갑자 일주, 십성·용신
                ·격국 분석
              </li>
              <li>
                <strong>꿈해몽</strong> — 동물·자연·상황별 꿈의 길흉 해석
              </li>
              <li>
                <strong>운세</strong> — 띠별·월별·절기별 운세, 삼재·길일
              </li>
              <li>
                <strong>타로</strong> — 메이저·마이너 아르카나 78장 의미와 리딩
              </li>
              <li>
                <strong>궁합</strong> — 사주 궁합, 띠 궁합, 오행 물상 궁합
              </li>
              <li>
                <strong>관상·손금·작명</strong> — 인상학과 한자 작명 가이드
              </li>
            </ul>
          </section>

          <section>
            <h2>주요 참고 문헌·출처</h2>
            <ul>
              <li>
                <strong>자평진전(子平眞詮)</strong> — 명대 심효첨, 자평 명리학
                핵심 텍스트
              </li>
              <li>
                <strong>적천수(滴天髓)</strong> — 명대 유백온, 명리학 고전
              </li>
              <li>
                <strong>궁통보감(窮通寶鑑)</strong> — 청대 여춘대, 절기·조후
                이론
              </li>
              <li>
                <strong>마의상법(麻衣相法)</strong> — 인상학 전통 텍스트
              </li>
              <li>
                <strong>Rider-Waite 타로 가이드북</strong> — A.E. Waite 저,
                타로 카드 표준 해석
              </li>
              <li>
                <strong>한국명리학회·한국타로협회</strong> 매뉴얼과 학술
                자료를 보조 참고
              </li>
            </ul>
          </section>

          <section>
            <h2>면책 안내</h2>
            <p>
              본 매체의 모든 콘텐츠는 <strong>전통 명리학·점술 이론에
              기반한 정보 제공 목적</strong>이며, 과학적으로 검증된 예측이
              아닙니다. 의료·법률·재정 등 전문적 의사결정을 대체하지 않으며,
              중요한 결정은 반드시 본인 판단과 해당 분야 전문가 상담을 통해
              이루어져야 합니다.
            </p>
          </section>

          <section>
            <h2>정정·업데이트 정책</h2>
            <p>
              발행된 콘텐츠에 사실 오류·번역 오류·해석 오류가 발견되면{" "}
              <strong>24시간 내 정정</strong>하고 본문 상단 또는 하단에
              정정 사실을 표기합니다. 새로운 자료·이론이 추가되면 본문
              업데이트와 함께 <code>dateModified</code>를 갱신합니다.
            </p>
            <p>
              제보·정정 요청은 아래 연락처로 보내주시면 검토 후 회신드립니다.
            </p>
          </section>

          <section>
            <h2>연락처</h2>
            <ul>
              <li>
                <strong>편집팀 이메일</strong> — kingyw17@gmail.com
              </li>
              <li>
                <strong>운영 도메인</strong> —{" "}
                <a
                  href="https://www.sajuboka.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  sajuboka.com
                </a>{" "}
                (사주 분석 서비스)
              </li>
              <li>
                <strong>광고·제휴</strong> — 동일 이메일로 문의
              </li>
            </ul>
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
