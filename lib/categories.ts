export const CATEGORIES = {
  ilju: { name: "일주론", icon: "📜", description: "60갑자 일주별 성격과 운세 분석" },
  dream: { name: "꿈 해몽", icon: "🌙", description: "꿈 속 상징과 의미를 풀어드립니다" },
  fortune: { name: "운세", icon: "🔮", description: "오늘의 운세, 띠별 운세, 월간 운세" },
  saju: { name: "사주", icon: "📊", description: "사주팔자의 기초와 심화 해설" },
  tarot: { name: "타로", icon: "🃏", description: "타로 카드 의미와 해석 가이드" },
  myungri: { name: "명리학", icon: "📖", description: "명리학 이론과 실전 해석" },
  compatibility: { name: "궁합", icon: "💕", description: "연애·결혼 궁합 분석" },
  oheng: { name: "오행", icon: "🌊", description: "목화토금수 오행의 원리" },
  seasonal: { name: "절기", icon: "🌸", description: "24절기와 운세의 관계" },
  naming: { name: "작명", icon: "✍️", description: "이름과 운명의 관계" },
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
