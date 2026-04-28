"use client";

interface InlineToolCTAProps {
  category?: string;
}

const TOOL_MAP: Record<
  string,
  { label: string; description: string; href: string; icon: string }
> = {
  일주론: {
    label: "내 일주 무료 분석",
    description: "생년월일시 입력하면 AI가 본인 일주의 성격·적성·재물운 즉시 분석해줍니다.",
    href: "https://www.sajuboka.com/saju",
    icon: "📊",
  },
  꿈해몽: {
    label: "AI 꿈 해몽 받기",
    description: "본인이 꾼 꿈을 자유롭게 입력하면 AI가 길흉·방향까지 풀어드려요.",
    href: "https://www.sajuboka.com/dream",
    icon: "🌙",
  },
  "꿈 해몽": {
    label: "AI 꿈 해몽 받기",
    description: "본인이 꾼 꿈을 자유롭게 입력하면 AI가 길흉·방향까지 풀어드려요.",
    href: "https://www.sajuboka.com/dream",
    icon: "🌙",
  },
  운세: {
    label: "오늘의 운세 보기",
    description: "본인 사주 기반 오늘의 종합운·재물운·연애운 무료 확인.",
    href: "https://www.sajuboka.com/today",
    icon: "🔮",
  },
  사주: {
    label: "내 사주 무료 분석",
    description: "생년월일시 입력 → AI 사주 풀이 + 십성·용신 즉시 확인.",
    href: "https://www.sajuboka.com/saju",
    icon: "📊",
  },
  타로: {
    label: "AI 타로점 보기",
    description: "오늘의 한 장 또는 3장 스프레드, 본인 질문에 맞는 카드 즉시 뽑아드려요.",
    href: "https://www.sajuboka.com/tarot",
    icon: "🃏",
  },
  명리학: {
    label: "내 사주 무료 분석",
    description: "생년월일시 → 일간·십성·용신·격국까지 본격 명리학 풀이.",
    href: "https://www.sajuboka.com/saju",
    icon: "📊",
  },
  궁합: {
    label: "두 사람 궁합 보기",
    description: "본인 + 상대 생년월일 입력 → 사주 궁합·오행·점수까지 무료 확인.",
    href: "https://www.sajuboka.com/compatibility",
    icon: "💕",
  },
  오행: {
    label: "내 오행 균형 확인",
    description: "본인 사주의 강한 오행·약한 오행·용신 즉시 분석.",
    href: "https://www.sajuboka.com/saju",
    icon: "📊",
  },
  절기: {
    label: "오늘 절기 운세 보기",
    description: "현재 절기에 따른 본인 사주의 운 흐름 + 보양·주의사항 안내.",
    href: "https://www.sajuboka.com/today",
    icon: "🔮",
  },
  관상: {
    label: "AI 관상 분석",
    description: "본인 사주 + 관상 종합 분석으로 평생 운 방향 확인.",
    href: "https://www.sajuboka.com/saju",
    icon: "👁️",
  },
  손금: {
    label: "AI 사주 분석",
    description: "손금과 함께 보면 좋은 사주 분석. 평생 운 흐름 종합 확인.",
    href: "https://www.sajuboka.com/saju",
    icon: "✋",
  },
  작명: {
    label: "AI 작명 받기",
    description: "출생일 + 성씨 입력 → 사주 오행 보충하는 이름 후보 5개 제시.",
    href: "https://www.sajuboka.com/name",
    icon: "✍️",
  },
};

const DEFAULT_TOOL = {
  label: "내 사주 무료 분석",
  description: "생년월일시 입력 → AI 사주 풀이 즉시 확인.",
  href: "https://www.sajuboka.com/saju",
  icon: "📊",
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackInlineCTA(label: string, href: string, category?: string) {
  window.gtag?.("event", "inline_cta_click", {
    event_category: "InlineCTA",
    event_label: label,
    service_url: href,
    post_category: category ?? "unknown",
  });
}

export default function InlineToolCTA({ category }: InlineToolCTAProps) {
  const tool = (category && TOOL_MAP[category]) || DEFAULT_TOOL;

  return (
    <div className="my-10 not-prose">
      <a
        href={tool.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackInlineCTA(tool.label, tool.href, category)}
        className="block group rounded-xl border-2 border-purple-200 dark:border-purple-700/40 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-5 hover:border-purple-400 hover:shadow-lg transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl">
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase tracking-wide">
                무료 도구
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                · sajuboka.com
              </span>
            </div>
            <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 transition-colors">
              {tool.label} →
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {tool.description}
            </p>
          </div>
        </div>
      </a>
    </div>
  );
}
