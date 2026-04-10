export const CATEGORIES = {
  ilju: {
    name: "일주론",
    icon: "📜",
    description: "60갑자 일주별 성격과 운세 분석",
    longDescription: "일주론은 사주팔자에서 '나'를 대표하는 일주(日柱)를 중심으로 성격, 적성, 연애·직업운을 분석하는 명리학의 핵심 분야입니다. 60갑자 각 일주의 고유한 특성을 이해하면 자신의 강점과 약점을 파악할 수 있습니다.",
  },
  dream: {
    name: "꿈해몽",
    icon: "🌙",
    description: "꿈 속 상징과 의미를 풀어드립니다",
    longDescription: "꿈은 무의식이 보내는 메시지입니다. 뱀꿈, 돼지꿈, 용꿈, 이빨 빠지는 꿈 등 꿈에 등장하는 상징의 의미를 정확히 해석하여 길몽과 흉몽을 구분하고, 삶의 방향을 잡는 데 도움을 드립니다.",
  },
  fortune: {
    name: "운세",
    icon: "🔮",
    description: "오늘의 운세, 띠별 운세, 월간 운세",
    longDescription: "2026년 띠별 운세, 삼재띠, 직업운, 재물운 등 다양한 운세 정보를 제공합니다. 사주를 기반으로 한 정확한 운세 분석으로 한 해의 흐름을 미리 파악하고 대비하세요.",
  },
  saju: {
    name: "사주",
    icon: "📊",
    description: "사주팔자의 기초와 심화 해설",
    longDescription: "사주팔자는 태어난 년·월·일·시를 기반으로 운명을 분석하는 동양 철학입니다. 격국, 용신, 대운 등 사주의 기초부터 심화까지, 누구나 쉽게 이해할 수 있도록 풀어드립니다.",
  },
  tarot: {
    name: "타로",
    icon: "🃏",
    description: "타로 카드 의미와 해석 가이드",
    longDescription: "메이저 아르카나 22장, 마이너 아르카나 56장의 타로 카드 의미와 해석법을 다룹니다. 연애 타로, 직업 타로 등 실전 리딩 가이드로 당신의 질문에 답을 찾아보세요.",
  },
  myungri: {
    name: "명리학",
    icon: "📖",
    description: "명리학 이론과 실전 해석",
    longDescription: "명리학은 음양오행과 천간·지지를 바탕으로 인간의 운명을 체계적으로 분석하는 학문입니다. 천간의 상생상극, 십신론, 합충형파 등 명리학의 핵심 이론을 실전 예시와 함께 설명합니다.",
  },
  compatibility: {
    name: "궁합",
    icon: "💕",
    description: "연애·결혼 궁합 분석",
    longDescription: "사주 궁합, 띠 궁합, 별자리 궁합, 혈액형 궁합까지! 나와 상대방의 궁합을 다양한 관점에서 분석하여 연애와 결혼에 실질적인 도움을 드립니다.",
  },
  oheng: {
    name: "오행",
    icon: "🌊",
    description: "목화토금수 오행의 원리",
    longDescription: "오행(목·화·토·금·수)은 사주의 근본 원리입니다. 내 사주에 어떤 오행이 강하고 부족한지 파악하고, 부족한 오행을 보완하는 실천적인 방법까지 상세히 안내합니다.",
  },
  seasonal: {
    name: "절기",
    icon: "🌸",
    description: "24절기와 운세의 관계",
    longDescription: "입춘, 경칩, 하지, 동지 등 24절기는 사주에서 월(月)을 구분하는 기준입니다. 각 절기의 의미와 절기가 운세에 미치는 영향, 절기별 개운법을 알아보세요.",
  },
  naming: {
    name: "작명",
    icon: "✍️",
    description: "이름과 운명의 관계",
    longDescription: "이름은 평생 불리는 소리의 기운입니다. 성명학의 원리를 바탕으로 좋은 이름의 조건, 오행과 획수의 조화, 작명 시 주의할 점 등을 상세히 다룹니다.",
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function getCategoryByKey(key: string) {
  return CATEGORIES[key as CategoryKey] ?? null;
}

export function getAllCategories() {
  return Object.entries(CATEGORIES).map(([key, value]) => ({
    key: key as CategoryKey,
    ...value,
  }));
}
