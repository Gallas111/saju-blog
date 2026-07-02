import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CTABanner from "@/components/CTABanner";
import Disclaimer from "@/components/Disclaimer";
import IljuCalculator from "@/components/IljuCalculator";
import { GAPJA_LIST } from "@/lib/ilju";
import { generateBreadcrumbSchema, generateFaqSchema } from "@/lib/seo";

const BASE_URL = "https://www.sajubokastory.com";
const PAGE_URL = `${BASE_URL}/tools/ilju-calculator`;

export const metadata: Metadata = {
  title: "일주 계산기 — 생년월일로 내 일주(60갑자) 무료 확인",
  description:
    "생년월일만 입력하면 내 일주(日柱)를 바로 계산해 드립니다. 1920~2026년 지원, 60갑자 일주별 성격·오행 특성 풀이까지 무료로 확인하세요.",
  keywords: [
    "일주 계산기",
    "일주 찾기",
    "60갑자 계산",
    "일간 확인",
    "사주 일주",
    "만세력 일주",
  ],
  alternates: {
    canonical: "/tools/ilju-calculator",
  },
  openGraph: {
    title: "일주 계산기 — 생년월일로 내 일주(60갑자) 무료 확인",
    description:
      "생년월일만 입력하면 내 일주(日柱)를 바로 계산. 60갑자 일주별 성격·오행 특성 풀이 무료 제공.",
    url: PAGE_URL,
    type: "website",
  },
};

const FAQS = [
  {
    question: "일주(日柱)가 정확히 무엇인가요?",
    answer:
      "일주는 사주팔자 네 기둥(연주·월주·일주·시주) 중 태어난 날의 기둥으로, 천간(일간)과 지지(일지) 두 글자로 이루어집니다. 일간은 사주에서 나 자신을 상징하는 글자라서, 명리학에서는 일주를 성격과 기질을 읽는 핵심 열쇠로 봅니다.",
  },
  {
    question: "태어난 시간을 몰라도 일주를 알 수 있나요?",
    answer:
      "네, 알 수 있습니다. 일주는 태어난 날짜만으로 결정되기 때문에 출생 시간을 몰라도 확인이 가능합니다. 다만 밤 11시(23시) 이후 출생은 다음 날 일주로 보는 관법(야자시·조자시 논쟁)이 있어, 이 시간대 출생이라면 두 날짜 모두 확인해 보는 것이 좋습니다.",
  },
  {
    question: "일주 계산은 어떤 원리로 하나요?",
    answer:
      "60갑자는 갑자일부터 계해일까지 60일 주기로 하루도 빠짐없이 순환합니다. 기준일의 간지를 알면 날짜 차이를 60으로 나눈 나머지로 어떤 날의 일진이든 계산할 수 있으며, 이 계산기는 만세력과 동일한 결과가 나오도록 실제 만세력 날짜들과 대조 검증했습니다.",
  },
  {
    question: "음력 생일로 입력해도 되나요?",
    answer:
      "아니요, 이 계산기는 양력(그레고리력) 생년월일 기준입니다. 음력 생일만 알고 있다면 먼저 양력으로 변환한 뒤 입력해 주세요. 주민등록상 생일이 실제 출생일과 다른 경우에는 실제로 태어난 양력 날짜를 기준으로 해야 정확합니다.",
  },
  {
    question: "일주만으로 사주 전체를 알 수 있나요?",
    answer:
      "아닙니다. 일주는 사주팔자 여덟 글자 중 두 글자로, 타고난 기질의 뼈대를 보여줄 뿐입니다. 전체 운의 흐름은 연주·월주·시주와의 관계, 대운과 세운까지 함께 봐야 하므로, 일주 풀이는 나를 이해하는 재미있는 출발점 정도로 참고하시는 것이 좋습니다.",
  },
];

export default function IljuCalculatorPage() {
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "일주 계산기",
    url: PAGE_URL,
    description:
      "생년월일을 입력하면 사주의 일주(60갑자)를 계산하고 일주별 특성 풀이를 제공하는 무료 웹 도구.",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: "ko",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    provider: {
      "@type": "Organization",
      name: "사주보까",
      url: BASE_URL,
    },
  };

  const faqSchema = generateFaqSchema(FAQS);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "홈", url: BASE_URL },
    { name: "일주 계산기", url: PAGE_URL },
  ]);

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-10 flex-1 w-full">
        <nav className="text-sm text-muted mb-6" aria-label="breadcrumb">
          <Link href="/" className="hover:text-gold transition-colors">
            홈
          </Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">일주 계산기</span>
        </nav>

        <header className="mb-8 text-center">
          <p className="text-4xl mb-3">📅</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-3">
            일주 계산기 — 생년월일로 내 일주 찾기
          </h1>
          <p className="text-muted leading-relaxed">
            양력 생년월일만 입력하면 내 일주(60갑자)를 바로 확인할 수 있어요.
            태어난 시간을 몰라도 괜찮습니다.
          </p>
        </header>

        <IljuCalculator />

        {/* 사용법 */}
        <section className="mt-12 prose">
          <h2>사용법 — 3초면 충분해요</h2>
          <ol>
            <li>
              <strong>양력 생년월일</strong>을 선택합니다 (1920~2026년 지원).
              음력 생일만 안다면 먼저 양력으로 변환해 주세요.
            </li>
            <li>
              <strong>‘내 일주 확인하기’</strong> 버튼을 누르면 60갑자 중 내
              일주가 바로 계산됩니다.
            </li>
            <li>
              결과 카드의 <strong>상세 풀이 보기</strong>를 누르면 일간
              특성·일지 기운·조합 해석을 담은 내 일주 전용 페이지로 이동하고,
              그 링크를 친구에게 공유할 수 있습니다.
            </li>
          </ol>

          <h2>일주(日柱)란 무엇인가요?</h2>
          <p>
            사주팔자는 태어난 <strong>연·월·일·시</strong>를 각각 천간과
            지지 두 글자로 나타낸 네 개의 기둥, 즉 여덟 글자입니다. 이 중{" "}
            <strong>태어난 날의 기둥이 바로 일주(日柱)</strong>입니다. 위
            글자인 천간을 <strong>일간(日干)</strong>, 아래 글자인 지지를{" "}
            <strong>일지(日支)</strong>라고 부르는데, 명리학에서 일간은 사주
            전체에서 <strong>‘나 자신’을 상징하는 기준점</strong>입니다.
            나머지 일곱 글자를 해석할 때도 모두 일간과의 관계를 따져 읽기
            때문에, 사주 공부는 사실상 내 일간이 무엇인지 아는 것에서
            시작한다고 해도 지나치지 않습니다.
          </p>
          <p>
            일간은 갑(甲)·을(乙)·병(丙)·정(丁)·무(戊)·기(己)·경(庚)·신(辛)
            ·임(壬)·계(癸)의 열 가지 천간 중 하나로, 각각 목·화·토·금·수
            오행과 음양의 속성을 지닙니다. 예를 들어 갑목은 하늘로 곧게 뻗는
            큰 나무, 정화는 어둠을 밝히는 촛불, 임수는 큰 강물에 비유되지요.
            같은 나무라도 거목(갑목)과 화초(을목)의 살아가는 방식이 다르듯,
            일간의 물상은 그 사람의 기본 기질을 직관적으로 보여줍니다.
            일지는 다시 열두 지지(자·축·인·묘·진·사·오·미·신·유·술·해) 중
            하나가 놓이는데, 전통 명리학에서 일지는 배우자궁이자 내가 발
            딛고 선 현실의 자리로 읽습니다. 이렇게 10개의 천간과 12개의
            지지가 조합되어 <strong>갑자부터 계해까지 총 60가지 일주</strong>,
            즉 60갑자가 만들어집니다.
          </p>

          <h2>일주는 어떻게 계산하나요?</h2>
          <p>
            연도나 달과 달리 날의 간지(일진)는 절기와 무관하게{" "}
            <strong>60일 주기로 하루도 빠짐없이 순환</strong>합니다. 갑자일
            다음은 을축일, 그다음은 병인일… 이렇게 60일이 지나면 다시
            갑자일로 돌아오지요. 그래서 기준이 되는 어느 하루의 간지만
            정확히 알면, 태어난 날까지의 날짜 수를 60으로 나눈 나머지로
            누구의 일주든 계산할 수 있습니다. 이 계산기는 천문 계산에 쓰이는
            율리우스적일(연속된 날짜 번호)을 이용해 이 순환을 계산하며,
            실제 만세력의 여러 날짜(예: 2024년 1월 1일 갑자일, 2026년 7월
            2일 정축일 등)와 대조해 결과가 일치하는 것을 확인했습니다.
            과거에는 만세력 책을 넘겨 가며 찾아야 했던 일주를 이제는 몇 초
            만에 확인할 수 있는 셈입니다.
          </p>
          <p>
            한 가지 주의할 점은 <strong>하루의 경계</strong>입니다. 명리학
            전통에서는 자시(밤 11시~새벽 1시)부터 하루가 시작된다고 보는데,
            밤 11시부터 자정까지 태어난 경우를 당일로 볼지 다음 날로 볼지에
            대해 <strong>야자시·조자시 논쟁</strong>이 오래 이어져 왔습니다.
            현대 명리가들 사이에서도 견해가 갈리는 부분이라, 23시 이후
            출생이라면 당일과 다음 날 두 가지 일주를 모두 확인해 보고 자신의
            기질과 더 맞는 쪽을 참고하는 것이 실용적입니다.
          </p>

          <h2>일주로 무엇을 알 수 있나요?</h2>
          <p>
            일주 하나만으로도 꽤 많은 이야기를 읽을 수 있습니다. 일간의
            오행과 물상에서는 <strong>타고난 기질과 성향의 뼈대</strong>를,
            일지에서는 <strong>배우자궁의 분위기와 내가 선 현실의 기반</strong>
            을 봅니다. 일간과 일지의 관계(십성)를 따지면 그 기반이 나를
            돕는 자리인지, 내가 다스리는 자리인지도 드러나지요. 그래서
            일주론은 사주 초심자가 가장 먼저 배우는 영역이면서, 두 글자만으로
            사람의 큰 그림을 그려 보는 재미가 있는 분야입니다. 다만 일주는
            여덟 글자 중 두 글자일 뿐이므로, 정확한 통변은 사주 전체와
            대운의 흐름을 함께 봐야 한다는 점은 꼭 기억해 주세요. 이
            계산기와 풀이는 재미와 참고용으로 가볍게 즐기시면 충분합니다.
          </p>
        </section>

        {/* 60갑자 전체 목록 */}
        <section className="mt-12" id="gapja-list">
          <h2 className="text-xl font-bold text-gold-light mb-2">
            60갑자 일주 전체 보기
          </h2>
          <p className="text-sm text-muted mb-5">
            내 일주를 이미 알고 있다면 바로 풀이 페이지로 이동하세요.
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {GAPJA_LIST.map((g) => (
              <Link
                key={g.slug}
                href={`/tools/ilju-calculator/${g.slug}`}
                className="text-center text-sm bg-card-bg border border-card-border rounded-lg py-2.5 text-muted hover:text-gold hover:border-gold transition-colors"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 prose">
          <h2>자주 묻는 질문</h2>
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </section>

        <Disclaimer />

        {/* 관련 글 내부링크 */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gold-light mb-4">
            📚 일주 공부 더 하기
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/category/일주론"
                className="text-link hover:text-gold underline underline-offset-2 transition-colors"
              >
                일주론 카테고리 — 60갑자 일주별 심층 풀이 모음
              </Link>
            </li>
            <li>
              <Link
                href="/blog/gapja-ilju-traits-fortune-love-compatibility"
                className="text-link hover:text-gold underline underline-offset-2 transition-colors"
              >
                갑자일주 특징 총정리 — 60갑자의 첫 번째 일주
              </Link>
            </li>
            <li>
              <Link
                href="/blog/myeongrihak-beginner-guide-saju-palja-composition-reading-destiny"
                className="text-link hover:text-gold underline underline-offset-2 transition-colors"
              >
                명리학 입문 가이드 — 사주팔자의 구성과 읽는 법
              </Link>
            </li>
          </ul>
        </section>

        <CTABanner category="일주론" />
      </main>
      <Footer />
    </>
  );
}
