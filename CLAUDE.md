# 사주보까 블로그 (saju-blog) — Claude 프로젝트 지침

## 서비스
- **목적:** 사주보까(sajuboka.com) 트래픽 유입을 위한 독립 SEO 블로그
- **배포:** Cloudflare Pages (GitHub push → 자동 배포, static export)
- **도메인:** sajubokastory.com (Cloudflare)

## 기술 스택
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- 콘텐츠: MDX 파일 (`content/posts/` 디렉토리)
- AI: Gemini API (`GEMINI_API_KEY`)
- 트렌드: Google Trends RSS + Naver DataLab API
- 빌드: webpack (한글 경로 Turbopack 버그 때문에 `--webpack` 플래그 사용)

## 핵심 파일 위치
- MDX 포스트: `content/posts/*.mdx`
- 포스트 파싱: `lib/posts.ts`
- 카테고리 정의: `lib/categories.ts`
- SEO 스키마: `lib/seo.ts`
- CTA 배너: `components/CTABanner.tsx`
- 자동화 스크립트: `.github/scripts/generate-posts.js`
- 키워드 리서치: `.github/scripts/keyword-research.js`

## 중요 규칙
- MDX 슬러그는 반드시 **영문**으로 작성
- 모든 포스트 하단에 CTABanner 자동 삽입 (sajuboka.com 유입 핵심)
- `.env.local`은 절대 커밋하지 않음
- 빌드 시 `npm run build` (webpack 모드, Turbopack 아님)

## 카테고리
일주론, 꿈 해몽, 운세, 사주, 타로, 명리학, 궁합, 오행, 절기, 작명

## 자동화 파이프라인
- `generate-content.yml`: 매일 01:00 KST → 키워드봇 + 글쓰기봇 → 3개 포스트 생성
- `scheduled-publish.yml`: 매일 09:00 KST → Vercel 재배포

## GitHub Secrets 필수
- `GEMINI_API_KEY` — 콘텐츠 생성
- `NAVER_CLIENT_ID` — Naver DataLab (선택)
- `NAVER_CLIENT_SECRET` — Naver DataLab (선택)

## 개발 명령어
```bash
npm run dev    # 개발 서버 (Turbopack)
npm run build  # 프로덕션 빌드 (webpack)
npm run lint   # ESLint 검사
```

## Writing Guide
See WRITING_GUIDE.md for 글 구조, 한국어 문체, 금지 패턴 가이드. 모든 포스트 작성 시 반드시 참고.
