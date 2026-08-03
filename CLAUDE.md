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
- **포스트 frontmatter에 `published: true` 반드시 포함** (없으면 사이트에 안 보임)
- FAQ의 `a:` 값에 따옴표(`"`) 시작 금지 → YAML 파싱 에러 발생

## 카테고리
일주론, 꿈해몽, 운세, 사주, 타로, 명리학, 궁합, 오행, 절기, 관상/손금, 작명

## 자동화 파이프라인
- `generate-content.yml`: 매일 01:00 KST → 키워드봇 + 글쓰기봇 → 3개 포스트 생성
- Cloudflare Pages: GitHub push 시 자동 빌드/배포

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

## 한글 자수 룰 (필수, 2026-05-11 추가)

- **최소 자수**: 한글 2500자+ (이 블로그 정책 컷)
- **검증 명령** (포스팅·보강 후 보고 직전 필수):
  ```
  bash ~/scripts/check-post-length.sh saju-blog --today
  bash ~/scripts/check-post-length.sh saju-blog "<slug1,slug2,...>"
  bash ~/scripts/check-post-length.sh saju-blog --date YYYY-MM-DD
  ```
  exit 0 받을 때까지 보강 반복.
- ⚠️ **파일 KB ≠ 한글 자수**. KB는 영문·이모지·MDX 마크업 포함. KB로 보고 금지 (5/9·5/11 ai-blog/coinday/easy/baby/health KB 혼동 thin 누적 사고 학습)
- 사용자 보고 시 이 명령 출력값 그대로 사용

## 🛡 발행 전·후 게이트 (2026-08-03 정리)

### 집필 전 — 중복 3종
```bash
export PATH="/c/Users/owner/AppData/Local/Programs/Python/Python312:$PATH"
python ~/scripts/check-duplicate-post.py saju-blog "<제목>"        # 제목 토큰 유사도
python ~/scripts/check-keyword-overlap.py saju-blog "<kw1>" "<kw2>" # 같은 사이트 키워드
python ~/scripts/check-crosssite-overlap.py saju-blog "<제목>" "<kw1>" "<kw2>"  # 사이트 간
```
exit 0 통과 · 1 주의(각도 분리 명시) · **2 작성 금지**.
🔑 **판정 문구를 눈으로 읽어라** — `| tail` 같은 파이프 뒤에서 `$?` 를 읽으면 파이프의 종료코드가 잡힌다.
🔑 **게이트만 믿지 마라.** 제목이 조금만 달라도 near-dup 을 통과시킨다. `ls content/*/` 와 `grep -ril "<핵심어>" content/` 로 실파일을 직접 대조하라.

### 발행 후 — 상시 감사 게이트 (매 회차 필수)
```bash
python ~/scripts/blog-audit.py            # 9레포 전수 · exit 0 통과 / 1 위반 / 2 검사불가
python ~/scripts/blog-audit.py saju-blog     # 이 레포만
python ~/scripts/blog-audit.py --fix-orphans   # 고아 이미지를 git rm 까지(커밋은 사람이)
python ~/scripts/blog-audit.py --canary        # 게이트 자체 자가검증
```
권위본은 `saju-blog/scripts/blog-audit.py`(버전관리됨). 검사 10종 = 고아 이미지 · 깨진 이미지 참조 · 라이브 픽셀중복 · 썸네일 누락 · U+FFFD · 사이트 내 자기잠식 · 플레이스홀더 · 초안 흔적 · og 크기 하드코딩 · 스팸 제목(경고).

- 🔴 **`exit 2`(NOT_CHECKED)는 통과가 아니다.** 분모가 0이면 "검사를 안 한 것"이다.
- 🔴 **게이트를 고쳤으면 `--canary` 를 반드시 다시 돌려라.** 2026-08-03 첫 실행에서 오탐 97건이 났고(경로 해석 누락·고정 자산·독자 안내문), 좁히는 과정에서 카나리가 회귀를 막았다.

## 🔴 하지 말 것 (전 블로그 공통)

- **초안 흔적·편집 메모를 발행하지 마라.** 2026-08-03 실사례: easy-zetec 글에 `잠깐 — 보수 외 소득 산정 시…` 자문자답 문단 2개와 `보건복지부 고시 제2025-XXX호` 플레이스홀더가, coinday·tokennara 글에 `(확인 필요)` 가 라이브에 노출돼 있었다. **사실을 못 정했으면 확정하거나 그 문장을 빼라. 미확정 상태로 발행하지 마라.**
- **글을 지우거나 슬러그를 바꿨으면 그 이미지도 같이 정리하라.** 안 하면 고아가 쌓인다(8/3 기준 9레포에 434장·22.9MB 누적돼 있었다). `blog-audit.py --fix-orphans` 로 정리한다.
- **같은 사이트 안에서 두 글이 같은 `keywords.primary` 를 겨냥하지 마라**(정규화 후 완전일치 기준). 이미 있으면 노출 우위 쪽이 키워드를 지키고 진 쪽은 **축을 옮기거나**(primary 를 실제 각도로 좁힘) **noindex** 한다. 8/3 에 6쌍을 이렇게 처리했다.
- **og:image 의 width/height 를 하드코딩하지 마라.** 실제 썸네일은 800x533~1792x1024 로 제각각이다. `image-dims.json` 실측값을 쓰고, 모르면 **틀린 값을 주장하는 대신 생략**한다. (사이트 고정 `og-image.png` 는 실측 1200x630 이라 그 선언은 정상)
- **제목 규칙**: 이모지 · `0원`·`공짜` · `칼퇴`·`야근` · `폭발`·`박멸`·`지옥`·`치트키` · `완벽 가이드/마스터` · `생산성 10배` 류 배수 과장 · `월 100만원` 류 금액 약속 금지. **월 표기**(`(8월 기준)`)도 금지 — 매달 낡는다. 연도 `2026` 은 관행상 허용하되 본문이 실제로 그 해 기준일 때만.
- 🔴 **제목은 SERP 의 약속이자 발행 게이트의 팩트체크 대상이다.** 본문에 없는 것을 제목이 약속하면 격리된다. 제목을 바꿀 땐 그 글을 가리키는 **내부링크 앵커**도 함께 고쳐라(`grep -rn "/blog/<slug>" content/`).
- **깨진 글자(U+FFFD)를 만들지 마라.** 생긴 시점에 그 자리 한글은 소실이라 어떤 도구로도 되돌릴 수 없다. 전수 점검 `bash ~/scripts/scan-encoding.sh saju-blog`.
- **판례 없는 법적 경고**(`처벌된다`·`위법`) 금지. 확인되는 범위(반려·지연·재요청)까지만 쓴다.

## 🖼 이미지 규칙

- 로컬 ComfyUI(flux1-dev)로 생성한다: `cd ~/ComfyUI && ./venv/Scripts/python.exe main.py --listen 127.0.0.1 --port 8188`
- 🔴 **alt 는 이미지를 만든 뒤에 실물을 열어 보고 써라.** 생성 전에 미리 쓰면 어긋난다(프롬프트가 "여러 가닥"이어도 실물은 한 가닥일 수 있다).
- 🔴 **alt 에 수량·"굵기가 다른"·"높이가 다르고" 같은 재보면 확인되는 시각 주장을 쓰지 마라.**
- 🔴 **부정어를 나열해도 안 먹는다.** `no beer` 를 넣으면 오히려 맥주가 나온다. **그 물건을 부를 어휘를 프롬프트에서 지우고 다른 피사체·앵글로 갈아라**(측면 유리잔 → 오버헤드 플랫레이).
- 🔴 **썸네일은 "무엇으로 읽히는가"를 먼저 봐라.** og:image 로 그대로 나가고 alt 로는 못 고친다. 8/3 실사례: AI 면접 글 썸네일이 홀로코스트 추모비로, 여름 오존 글이 빈 방+온수 라디에이터로, 학습지 판매 글이 계란 한 판으로 렌더됐다.
- 글자 표면 금지: 프롬프트 말미에 `, no text, no letters, no numbers, no signage, no screens, no charts` + **씬에서 글자가 붙을 표면 자체를 제거**.
- 신규 이미지는 기존 라이브러리와 **픽셀 유일**해야 한다(`gen-post-images-finalize.py` 가 64x64 해시로 전수 대조).

## 🔴 이 레포의 특이사항

- **2026-07-16 알고리즘 강등으로 park 상태**이고 865편 중 **384편이 noindex** 다. 스팸 신호를 새로 만들지 마라.
- 🔴 **키워드 스터핑 금지 — 이 레포에서 실제로 붕괴한 적이 있다.** 5/21~25 생성분 25편이 `본인` 낱말 밀도 21.7~29.6%(최악 27.5%·`본인 본인` 연속 630회)로 한국어가 무너져 2026-08-01 에 전량 noindex 했다. 검출법: `본인\s+본인` · `자가\s+자가` 연속이 3회 이상이면 사실상 확정이다.
- 🔴 **되살리려 하지 마라.** 스터핑을 걷어내면 토막만 남는다(원문에 실제 정보가 거의 없다).
- 🔴 **3월 봇 시절 글과 5~7월 재작성분이 같은 주제로 겹쳐 있다.** 2026-08-03 에 4쌍(혈액형궁합·용꿈·돼지꿈·물고기꿈)을 노출 우위로 판정해 진 쪽을 noindex 했고, 조후용신 1쌍은 각도가 달라 **primary 축 분리**로 둘 다 살렸다. 새 글을 쓸 때 3월 글과 겹치는지 반드시 확인하라.
- 파일명은 `YYYY-MM-DD-<slug>.mdx` 날짜 프리픽스이고 **URL slug 는 프리픽스를 뺀 값**이다(라이브 검증 시 혼동 금지).
- frontmatter 에 `published: true` 가 필요하다. `lib/posts.ts` 의 module-level 캐시도 유지할 것.
