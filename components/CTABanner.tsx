"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface CTABannerProps {
  label?: string;
  href?: string;
  category?: string;
}

const SERVICE_MAP: Record<string, { label: string; href: string }> = {
  일주론: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  "꿈 해몽": { label: "내 꿈 AI 해몽하기", href: "https://www.sajuboka.com/dream" },
  운세: { label: "오늘의 운세 확인하기", href: "https://www.sajuboka.com/today" },
  사주: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  타로: { label: "AI 타로 점 보러가기", href: "https://www.sajuboka.com/tarot" },
  명리학: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  궁합: { label: "궁합 보러가기", href: "https://www.sajuboka.com/compatibility" },
  오행: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  절기: { label: "오늘의 운세 확인하기", href: "https://www.sajuboka.com/today" },
  작명: { label: "AI 작명하기", href: "https://www.sajuboka.com/name" },
};

const ALL_SERVICES = [
  { name: "사주 분석", href: "https://www.sajuboka.com/saju", icon: "📊" },
  { name: "오늘의 운세", href: "https://www.sajuboka.com/today", icon: "🔮" },
  { name: "궁합", href: "https://www.sajuboka.com/compatibility", icon: "💕" },
  { name: "타로", href: "https://www.sajuboka.com/tarot", icon: "🃏" },
  { name: "꿈 해몽", href: "https://www.sajuboka.com/dream", icon: "🌙" },
  { name: "작명", href: "https://www.sajuboka.com/name", icon: "✍️" },
  { name: "행운번호", href: "https://www.sajuboka.com/lucky", icon: "🍀" },
];

function trackCTAClick(serviceName: string, href: string, category?: string) {
  window.gtag?.("event", "cta_click", {
    event_category: "CTA",
    event_label: serviceName,
    service_url: href,
    post_category: category ?? "unknown",
  });
}

export default function CTABanner({ label, href, category }: CTABannerProps) {
  const service = category ? SERVICE_MAP[category] : null;
  const mainLabel = label ?? service?.label ?? "내 사주 분석하기";
  const mainHref = href ?? service?.href ?? "https://www.sajuboka.com/saju";

  return (
    <div className="my-12 rounded-2xl overflow-hidden" style={{
      background: "linear-gradient(135deg, #6d28d9 0%, #d4a853 50%, #8b5cf6 100%)",
    }}>
      <div className="p-8 text-center">
        <p className="text-3xl mb-3">🔮</p>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          사주보까에서 직접 확인해보세요
        </h3>
        <p className="text-white/80 text-sm mb-6">
          AI가 분석하는 정확한 운세, 지금 바로 무료로 체험하세요
        </p>

        {/* Main CTA */}
        <a
          href={mainHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackCTAClick(mainLabel, mainHref, category)}
          className="inline-block bg-white text-purple-dark font-bold px-8 py-3 rounded-full text-lg hover:bg-gold-light hover:text-background transition-all shadow-lg hover:shadow-xl hover:scale-105"
        >
          {mainLabel}
        </a>

        {/* All services */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {ALL_SERVICES.map((svc) => (
            <a
              key={svc.name}
              href={svc.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCTAClick(svc.name, svc.href, category)}
              className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-sm px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-full transition-colors"
            >
              <span>{svc.icon}</span>
              <span>{svc.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
