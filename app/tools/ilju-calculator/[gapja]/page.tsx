import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CTABanner from "@/components/CTABanner";
import Disclaimer from "@/components/Disclaimer";
import ToolShare from "@/components/ToolShare";
import {
  GAPJA_LIST,
  getGapjaBySlug,
  getBranchRelations,
  SIPSEONG_DESC,
  ELEMENT_TIPS,
} from "@/lib/ilju";
import { getPostBySlug } from "@/lib/posts";
import { generateBreadcrumbSchema } from "@/lib/seo";

const BASE_URL = "https://www.sajubokastory.com";

interface Props {
  params: Promise<{ gapja: string }>;
}

export async function generateStaticParams() {
  return GAPJA_LIST.map((g) => ({ gapja: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gapja: slug } = await params;
  const g = getGapjaBySlug(slug);
  if (!g) return {};

  const title = `${g.name}일주(${g.hanja}) 특징 — 일간 ${g.stem.ko}${g.stem.element} 성격과 오행 풀이`;
  const description = `${g.name}일주는 ‘${g.image}’의 모습입니다. 일간 ${g.stem.ko}${g.stem.element}(${g.stem.yinYang})의 성향, 일지 ${g.branch.ko}(${g.branch.animal})의 기운, 조합 해석과 주의점까지 일주 계산기 상세 풀이로 확인하세요.`;

  return {
    title,
    description,
    keywords: [
      `${g.name}일주`,
      `${g.name}일주 특징`,
      `${g.name}일주 성격`,
      "일주 계산기",
      "60갑자",
    ],
    alternates: {
      canonical: `/tools/ilju-calculator/${g.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/tools/ilju-calculator/${g.slug}`,
      type: "website",
    },
  };
}

export default async function GapjaResultPage({ params }: Props) {
  const { gapja: slug } = await params;
  const g = getGapjaBySlug(slug);
  if (!g) notFound();

  const pageUrl = `${BASE_URL}/tools/ilju-calculator/${g.slug}`;
  const relatedPost = getPostBySlug(g.postSlug);
  const prev = GAPJA_LIST[(g.index + 59) % 60];
  const next = GAPJA_LIST[(g.index + 1) % 60];
  const rel = getBranchRelations(g.index % 12);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "홈", url: BASE_URL },
    { name: "일주 계산기", url: `${BASE_URL}/tools/ilju-calculator` },
    { name: `${g.name}일주`, url: pageUrl },
  ]);

  return (
    <>
      <Header />
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
          <Link
            href="/tools/ilju-calculator"
            className="hover:text-gold transition-colors"
          >
            일주 계산기
          </Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{g.name}일주</span>
        </nav>

        {/* 결과 히어로 */}
        <header className="rounded-2xl border border-gold/40 bg-card-bg p-6 sm:p-8 text-center mb-8">
          <p className="text-sm text-muted mb-2">
            60갑자 중 {g.index + 1}번째 일주
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gold-light mb-2">
            {g.name}일주 <span className="text-gold">({g.hanja})</span>
          </h1>
          <p className="text-muted mb-4">“{g.image}”</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-xs bg-purple/20 text-purple px-3 py-1 rounded-full">
              일간 {g.stem.ko}
              {g.stem.element}({g.stem.hanja}) · {g.stem.yinYang}
            </span>
            <span className="text-xs bg-purple/20 text-purple px-3 py-1 rounded-full">
              일지 {g.branch.ko}({g.branch.hanja}) · {g.branch.animal} ·{" "}
              {g.branch.element}
            </span>
            <span className="text-xs bg-purple/20 text-purple px-3 py-1 rounded-full">
              일지 십성 · {g.sipseong}
            </span>
          </div>
        </header>

        {/* 한눈에 보기 */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gold-light mb-4">
            {g.name}일주 한눈에 보기
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-card-border">
                  <th className="text-left py-2.5 pr-4 text-gold-light font-semibold w-32">
                    일간(나)
                  </th>
                  <td className="py-2.5 text-foreground">
                    {g.stem.ko}{g.stem.element}({g.stem.hanja}) — {g.stem.nature}
                  </td>
                </tr>
                <tr className="border-b border-card-border">
                  <th className="text-left py-2.5 pr-4 text-gold-light font-semibold">
                    일지(기반)
                  </th>
                  <td className="py-2.5 text-foreground">
                    {g.branch.ko}({g.branch.hanja}) — {g.branch.animal}의
                    자리, {g.branch.element} 기운
                  </td>
                </tr>
                <tr className="border-b border-card-border">
                  <th className="text-left py-2.5 pr-4 text-gold-light font-semibold">
                    키워드
                  </th>
                  <td className="py-2.5 text-foreground">
                    {g.stem.keywords.join(" · ")}
                  </td>
                </tr>
                <tr>
                  <th className="text-left py-2.5 pr-4 text-gold-light font-semibold">
                    일지 십성
                  </th>
                  <td className="py-2.5 text-foreground">{g.sipseong}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="prose">
          <h2>일간 {g.stem.ko}{g.stem.element} — {g.stem.nature}</h2>
          <p>{g.stem.desc}</p>

          <h2>일지 {g.branch.ko}({g.branch.animal})의 기운</h2>
          <p>{g.branch.desc}</p>
          <p>
            일간과 일지의 관계로 보면, {g.name}일주의 일지에는{" "}
            <strong>{g.sipseong}</strong>이 자리합니다.{" "}
            {SIPSEONG_DESC[g.sipseong]}
          </p>

          <h2>{g.name}일주 조합 풀이</h2>
          <p>{g.story}</p>

          <h2>일지 {g.branch.ko}의 합(合)·충(沖) 관계</h2>
          <p>
            전통 명리학에서 일지 <strong>{g.branch.ko}({g.branch.hanja})</strong>
            는 <strong>{rel.chung.ko}({rel.chung.animal})</strong>와 마주 보며
            부딪히는 충(沖) 관계이고,{" "}
            <strong>
              {rel.samhap[0].ko}({rel.samhap[0].animal})·{rel.samhap[1].ko}(
              {rel.samhap[1].animal})
            </strong>
            와 만나면 {rel.samhapElement} 기운의 삼합(三合)을 이룹니다. 육합
            짝은 <strong>{rel.yukhap.ko}({rel.yukhap.animal})</strong>입니다.
            그래서 배우자나 가까운 동료의 일지가 삼합·육합이면 자연스럽게
            합이 잘 맞고, 충이면 자극과 긴장이 오가기 쉽다고 풀이하곤
            합니다. 다만 실제 궁합은 여덟 글자 전체의 조화를 봐야 하므로,
            일지 하나의 합·충만으로 관계를 단정하지 않는 것이 좋습니다.
          </p>

          <h2>{g.stem.element} 일간의 오행 밸런스 팁</h2>
          <p>{ELEMENT_TIPS[g.stem.element]}</p>

          <h2>이런 점은 가볍게 참고하세요</h2>
          <p>{g.stem.caution}</p>
        </div>

        <Disclaimer />

        {/* 공유 */}
        <div className="border-t border-card-border pt-6 mt-8 mb-8">
          <ToolShare
            url={pageUrl}
            title={`${g.name}일주(${g.hanja}) — 나의 일주 풀이`}
            description={`내 일주는 ${g.name}일주! ‘${g.image}’ — 일주 계산기에서 확인했어요.`}
          />
        </div>

        {/* 관련 글 내부링크 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gold-light mb-4">
            📖 {g.name}일주 더 깊게 읽기
          </h2>
          <ul className="space-y-2 text-sm">
            {relatedPost && (
              <li>
                <Link
                  href={`/blog/${relatedPost.slug}`}
                  className="text-link hover:text-gold underline underline-offset-2 transition-colors"
                >
                  {relatedPost.title}
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/category/일주론"
                className="text-link hover:text-gold underline underline-offset-2 transition-colors"
              >
                일주론 카테고리 — 60갑자 일주 풀이 모음
              </Link>
            </li>
          </ul>
        </section>

        {/* 이전/다음 + 계산기 */}
        <nav
          className="flex items-center justify-between gap-2 text-sm mb-4"
          aria-label="다른 일주 보기"
        >
          <Link
            href={`/tools/ilju-calculator/${prev.slug}`}
            className="bg-card-bg border border-card-border rounded-full px-4 py-2 text-muted hover:text-gold hover:border-gold transition-colors"
          >
            ← {prev.name}일주
          </Link>
          <Link
            href="/tools/ilju-calculator"
            className="bg-gold text-background font-semibold rounded-full px-4 py-2 hover:bg-gold-light transition-colors text-center"
          >
            내 일주 계산하기
          </Link>
          <Link
            href={`/tools/ilju-calculator/${next.slug}`}
            className="bg-card-bg border border-card-border rounded-full px-4 py-2 text-muted hover:text-gold hover:border-gold transition-colors"
          >
            {next.name}일주 →
          </Link>
        </nav>

        <CTABanner category="일주론" />
      </main>
      <Footer />
    </>
  );
}
