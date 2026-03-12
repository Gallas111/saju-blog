/**
 * 키워드 리서치 스크립트
 * Google Trends + Naver DataLab + Gemini 분석
 */

const fs = require("fs");
const path = require("path");
const { getGoogleTrends } = require("./utils/google-trends");
const { getNaverTrends } = require("./utils/naver-datalab");
const { callGemini } = require("./utils/gemini");

// 운세/사주 관련 기본 키워드 풀
const BASE_KEYWORDS = [
  // 일주론 (60갑자)
  "갑자일주", "을축일주", "병인일주", "정묘일주", "무진일주", "기사일주",
  "경오일주", "신미일주", "임신일주", "계유일주", "갑술일주", "을해일주",
  "병자일주", "정축일주", "무인일주", "기묘일주", "경진일주", "신사일주",
  "임오일주", "계미일주", "갑신일주", "을유일주", "병술일주", "정해일주",
  "무자일주", "기축일주", "경인일주", "신묘일주", "임진일주", "계사일주",
  "갑오일주", "을미일주", "병신일주", "정유일주", "무술일주", "기해일주",
  "경자일주", "신축일주", "임인일주", "계묘일주", "갑진일주", "을사일주",
  "경신일주", "신유일주", "임술일주", "계해일주",
  // 꿈 해몽
  "뱀꿈", "용꿈", "돼지꿈", "호랑이꿈", "개꿈", "고양이꿈",
  "물고기꿈", "거북이꿈", "쥐꿈", "소꿈", "말꿈", "양꿈",
  "이빨 빠지는 꿈", "불꿈", "물꿈", "하늘꿈", "죽은사람 꿈",
  // 운세
  "오늘의 운세", "띠별 운세", "별자리 운세", "토정비결",
  "삼재", "삼재띠",
  // 사주/명리
  "사주팔자", "오행", "천간", "지지", "용신", "격국",
  // 타로
  "타로 운세", "연애 타로", "직업 타로",
  // 궁합
  "띠 궁합", "사주 궁합", "혈액형 궁합",
];

async function getExistingSlugs() {
  const postsDir = path.join(process.cwd(), "content", "posts");
  if (!fs.existsSync(postsDir)) return [];

  return fs.readdirSync(postsDir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => {
      const content = fs.readFileSync(path.join(postsDir, f), "utf-8");
      const slugMatch = content.match(/slug:\s*"(.+?)"/);
      return slugMatch ? slugMatch[1] : f.replace(/\.mdx?$/, "");
    });
}

async function selectKeywords(count = 3) {
  console.log("📊 키워드 리서치 시작...\n");

  // 1. Google Trends
  console.log("🔍 Google Trends 수집 중...");
  const googleTrends = await getGoogleTrends();
  console.log(`  → ${googleTrends.length}개 트렌드 수집\n`);

  // 2. Naver DataLab (optional)
  console.log("🔍 Naver DataLab 확인 중...");
  const sampleKeywords = BASE_KEYWORDS.sort(() => Math.random() - 0.5).slice(0, 5);
  const naverTrends = await getNaverTrends(sampleKeywords);
  console.log(`  → ${naverTrends.length}개 트렌드 확인\n`);

  // 3. Get existing slugs to avoid duplicates
  const existingSlugs = await getExistingSlugs();
  console.log(`  → 기존 포스트 ${existingSlugs.length}개 확인\n`);

  // 4. Gemini keyword analysis
  console.log("🤖 Gemini 키워드 분석 중...");

  const prompt = `당신은 한국 운세/사주 블로그의 SEO 키워드 분석 전문가입니다.

아래 데이터를 바탕으로 SEO 블로그 포스트 ${count}개의 주제를 선정해주세요.

## 실시간 트렌드 (Google)
${googleTrends.length > 0 ? googleTrends.join(", ") : "데이터 없음"}

## 사용 가능한 키워드 풀
${BASE_KEYWORDS.slice(0, 30).join(", ")} 등

## 이미 작성된 슬러그 (중복 방지)
${existingSlugs.join(", ") || "없음"}

## 카테고리 옵션
일주론, 꿈 해몽, 운세, 사주, 타로, 명리학, 궁합, 오행, 절기, 작명

## 현재 날짜
${new Date().toISOString().split("T")[0]} (이 연도 기준으로 작성할 것)

## 규칙
1. 기존 슬러그와 겹치지 않는 새로운 주제
2. 검색량이 높을 것으로 예상되는 롱테일 키워드 포함
3. 카테고리를 다양하게 (같은 카테고리 2개 이하)
4. 트렌드와 연관된 운세 주제면 가산점
5. 연도가 포함되는 주제는 반드시 현재 연도(${new Date().getFullYear()}년) 기준으로 작성
6. 절대 과거 연도(2024년, 2025년 등)를 제목이나 키워드에 사용하지 말 것

## 출력 형식 (JSON만, 설명 없이)
\`\`\`json
[
  {
    "title": "글 제목 (한글, SEO 최적화)",
    "slug": "english-slug-format",
    "category": "카테고리명",
    "tags": ["태그1", "태그2", "태그3", "태그4"],
    "icon": "이모지",
    "keywords": {
      "primary": "주요 키워드",
      "secondary": ["보조1", "보조2"],
      "longTail": ["롱테일 키워드1"]
    },
    "relatedService": {
      "label": "CTA 버튼 텍스트",
      "href": "https://www.sajuboka.com/적절한서비스"
    }
  }
]
\`\`\``;

  const result = await callGemini(prompt, { temperature: 0.9 });

  // Parse JSON from response
  const jsonMatch = result.match(/```json\s*([\s\S]*?)```/) || result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse keyword analysis result");
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const keywords = JSON.parse(jsonStr);

  // 과거 연도 키워드 필터링
  const currentYear = new Date().getFullYear();
  const outdatedYears = [2024, 2025].filter((y) => y < currentYear);
  const filtered = keywords.filter((kw) => {
    for (const year of outdatedYears) {
      if (kw.title.includes(`${year}`) || kw.slug.includes(`${year}`)) {
        console.warn(`  ⚠️ 과거 연도(${year}) 포함 키워드 제외: ${kw.title}`);
        return false;
      }
    }
    return true;
  });

  console.log(`  → ${filtered.length}개 주제 선정 완료\n`);
  filtered.forEach((kw, i) => {
    console.log(`  ${i + 1}. [${kw.category}] ${kw.title}`);
  });

  return filtered;
}

module.exports = { selectKeywords, BASE_KEYWORDS };

// Direct execution
if (require.main === module) {
  selectKeywords(3)
    .then((keywords) => {
      console.log("\n✅ 키워드 리서치 완료");
      console.log(JSON.stringify(keywords, null, 2));
    })
    .catch((error) => {
      console.error("❌ 키워드 리서치 실패:", error.message);
      process.exit(1);
    });
}
