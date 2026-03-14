/**
 * 메인 자동화 스크립트
 * 키워드 리서치 → 글 생성 → MDX 파일 생성 → Git commit
 */

const fs = require("fs");
const path = require("path");
const { selectKeywords } = require("./keyword-research");
const { callGemini } = require("./utils/gemini");
const { writeMdxFile } = require("./utils/mdx-writer");

const POST_COUNT = 1;

/**
 * 기존 포스트들의 슬러그 매핑을 빌드합니다.
 * - 실제 slug (frontmatter 기준)
 * - 파일명 기반 slug → 실제 slug 매핑 (불일치 교정용)
 */
function buildSlugMap() {
  const postsDir = path.join(process.cwd(), "content", "posts");
  if (!fs.existsSync(postsDir)) return { validSlugs: new Set(), filenameToSlug: new Map() };

  const validSlugs = new Set();
  const filenameToSlug = new Map();

  for (const f of fs.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"))) {
    const raw = fs.readFileSync(path.join(postsDir, f), "utf-8");
    const slugMatch = raw.match(/slug:\s*"(.+?)"/);
    const filenameSlug = f.replace(/\.mdx$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const actualSlug = slugMatch ? slugMatch[1] : filenameSlug;
    validSlugs.add(actualSlug);
    if (filenameSlug !== actualSlug) {
      filenameToSlug.set(filenameSlug, actualSlug);
    }
  }

  return { validSlugs, filenameToSlug };
}

/**
 * 생성된 콘텐츠 내 /blog/ 링크를 검증하고 교정합니다.
 * - 파일명 기반 슬러그 → 실제 슬러그로 자동 교정
 * - 존재하지 않는 슬러그 링크는 제거
 */
function validateInternalLinks(content) {
  const { validSlugs, filenameToSlug } = buildSlugMap();
  const linkRegex = /\[([^\]]*)\]\(\/blog\/([^)#\s]+)\)/g;

  return content.replace(linkRegex, (match, text, slug) => {
    // 이미 유효한 슬러그
    if (validSlugs.has(slug)) return match;

    // 파일명→슬러그 매핑으로 교정 가능
    const corrected = filenameToSlug.get(slug);
    if (corrected) {
      console.warn(`  ⚠️ 내부 링크 교정: /blog/${slug} → /blog/${corrected}`);
      return match.replace(`/blog/${slug}`, `/blog/${corrected}`);
    }

    // 교정 불가 — 링크를 일반 텍스트로 변환
    console.warn(`  ⚠️ 존재하지 않는 내부 링크 제거: /blog/${slug}`);
    return text;
  });
}

async function generatePost(keyword) {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `당신은 한국 최고의 운세/사주 블로그 작가입니다. 아래 주제로 SEO 최적화된 블로그 글을 작성해주세요.

## 주제 정보
- 제목: ${keyword.title}
- 카테고리: ${keyword.category}
- 주요 키워드: ${keyword.keywords.primary}
- 보조 키워드: ${keyword.keywords.secondary.join(", ")}
- 롱테일 키워드: ${keyword.keywords.longTail.join(", ")}

## 작성 규칙
1. 마크다운 형식 (H2, H3 제목 사용)
2. 2000~3000자 분량
3. 주요 키워드를 자연스럽게 H2 제목에 2~3회 배치
4. 롱테일 키워드를 본문에 2~3회 자연스럽게 배치
5. 읽기 쉬운 문체 (존댓말)
6. 리스트와 볼드 활용
7. 마지막에 "## 자주 묻는 질문" 섹션 (3개 Q&A, ### 형식)
8. frontmatter 없이 본문만 작성
9. 글 시작에 도입부, 끝에 맺음말
10. 전문적이면서도 친근한 톤

## 현재 날짜
${today} (이 연도 기준으로 작성할 것)

## 주의사항
- 의학적 조언이나 금전 투자 조언 금지
- "점술은 참고 사항" 정도의 균형잡힌 시각
- 한자 병기는 처음 등장시에만
- 코드블록 사용 금지
- 연도가 포함되는 내용은 반드시 현재 연도(${new Date().getFullYear()}년) 기준으로 작성
- 절대 과거 연도(2024년, 2025년 등)의 정보를 사용하지 말 것
- "[블로그 이름]" 같은 플레이스홀더 대신 "사주보까 스토리"를 사용할 것

본문만 작성해주세요 (frontmatter 제외):`;

  let content = await callGemini(prompt, { temperature: 0.8, maxTokens: 8192 });

  // 생성된 콘텐츠 검증 및 보정
  const currentYear = new Date().getFullYear();
  const outdatedYears = [2024, 2025].filter((y) => y < currentYear);
  for (const year of outdatedYears) {
    if (content.includes(`${year}년`)) {
      console.warn(`  ⚠️ 과거 연도(${year}년) 감지 → ${currentYear}년으로 교체`);
      content = content.replace(new RegExp(`${year}년`, "g"), `${currentYear}년`);
    }
  }
  content = content.replace(/\[블로그 이름\]/g, "사주보까 스토리");

  // 이중 헤딩 마크다운 수정 (### ### → ###)
  content = content.replace(/^(#{1,6})\s+#{1,6}\s+/gm, "$1 ");

  // 내부 링크 슬러그 검증 및 교정
  content = validateInternalLinks(content);

  return {
    title: keyword.title,
    slug: keyword.slug,
    description: `${keyword.keywords.primary}에 대해 상세히 알아봅니다. ${keyword.keywords.secondary[0] || ""}${keyword.keywords.secondary[1] ? ", " + keyword.keywords.secondary[1] : ""} 등 핵심 정보를 총정리합니다.`,
    category: keyword.category,
    tags: keyword.tags,
    date: today,
    icon: keyword.icon,
    relatedService: keyword.relatedService,
    keywords: keyword.keywords,
    content: content.trim(),
  };
}

async function main() {
  console.log("🚀 사주보까 블로그 자동 생성 시작\n");
  console.log(`📅 ${new Date().toISOString().split("T")[0]}\n`);

  try {
    // Step 1: Keyword research
    const keywords = await selectKeywords(POST_COUNT);

    // Step 2: Generate posts
    console.log("\n✍️ 글 생성 중...\n");
    const createdFiles = [];

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      console.log(`  [${i + 1}/${keywords.length}] "${kw.title}" 생성 중...`);

      try {
        const post = await generatePost(kw);
        const filePath = writeMdxFile(post);

        if (filePath) {
          createdFiles.push(filePath);
          console.log(`  ✅ 생성 완료\n`);
        }
      } catch (error) {
        console.error(`  ❌ 생성 실패: ${error.message}\n`);
      }

      // Rate limit: wait between API calls
      if (i < keywords.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    console.log(`\n🎉 총 ${createdFiles.length}개 포스트 생성 완료`);

    if (createdFiles.length > 0) {
      console.log("\n생성된 파일:");
      createdFiles.forEach((f) => console.log(`  - ${f}`));
    }

    return createdFiles;
  } catch (error) {
    console.error("❌ 자동 생성 실패:", error.message);
    process.exit(1);
  }
}

main();
