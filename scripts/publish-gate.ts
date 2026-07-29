/**
 * publish-gate.ts (포터블판)
 *
 * 발행 게이트 — 글이 커밋(발행)되기 전에 통과해야 하는 마지막 방어선.
 * 검사: (1) 깨진 내부링크/이미지 (2) 한글 자수 (3) 리서치 근거 없는 구체 사실(적대적 팩트체크, 옵션).
 * 실패 글은 quarantine/ 으로 격리하고, 격리 슬러그를 가리키는 링크를 전체 content/ 에서 언랩한다.
 *
 * Usage:
 *   GATE_SLUGS=slug1,slug2 npx tsx scripts/publish-gate.ts   # 대상 지정
 *   npx tsx scripts/publish-gate.ts                          # 폴백: git 미추적(신규) mdx만 검사
 *   GATE_DRY_RUN=1 ...                                       # 판정만 하고 파일은 건드리지 않음
 *   GATE_ALLOW_COMMITTED=1 ...                               # 커밋된 슬러그 검사 허용(위험·명시 필요)
 *   GATE_MIN_KOREAN=2500                                     # 자수 컷 오버라이드(기본은 gate.config.json)
 *
 * 레포별 설정은 scripts/gate.config.json 이 권위다.
 *
 * Exit: 0 = 게이트 완료(격리가 있어도 생존 글은 발행), 1 = 인프라 오류·설정 오류(fail-closed)
 *
 * ── ai-blog 원본 대비 추가된 안전장치 4개 ──
 *  (a) GATE_DRY_RUN — 원본에는 드라이런 경로가 없어 첫 실행이 곧 실전이었다.
 *  (b) 커밋된 슬러그 차단 — "커밋된 글을 GATE_SLUGS 에 넣지 말 것"이 문서 규칙일 뿐 코드 강제가 없었다.
 *  (c) 더티 트리 차단 — 롤백 보증이 `git checkout` 으로 되돌릴 수 있다는 전제에 걸려 있는데, 그 전제를 검사하지 않았다.
 *  (d) 코퍼스 프리플라이트 — 슬러그 해석이 깨진 상태로 돌면 전편이 오격리된다. 검사 전에 멈춘다.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';
import { loadGateConfig, resolveSlug, GateConfig } from './gate-config';
import { getAllSlugs, getMdxFiles, checkInternalLinksInFiles, checkImagesInFiles, checkEncodingInFiles, IMG_SRC_RE, BLOG_LINK_RE } from './validate-links';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const QUARANTINE_DIR = path.join(process.cwd(), 'quarantine');
const RESEARCH_DIR = path.join(process.cwd(), '.research-cache');
const KEYWORDS_DB_PATH = path.join(process.cwd(), 'scripts', 'keywords.json');

const DRY_RUN = process.env.GATE_DRY_RUN === '1';
const ALLOW_COMMITTED = process.env.GATE_ALLOW_COMMITTED === '1';

interface FactClaim {
  claim: string;
  verdict: 'supported' | 'unsupported';
  severity: 'critical' | 'minor';
  reason: string;
}

function koreanCharCount(body: string): number {
  return (body.match(/[가-힣]/g) || []).length;
}

function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function gitLines(cmd: string): string[] {
  return execSync(cmd, { encoding: 'utf-8' })
    .split('\n')
    .map(l => l.replace(/\r$/, ''))
    .filter(Boolean);
}

/* ─────────────────────────── 안전장치 ─────────────────────────── */

/**
 * (c) 더티 트리 차단.
 * 오격리 복구는 `git checkout -- content public scripts && rm -rf quarantine` 으로 원복하는 것이 전제인데,
 * 추적 파일에 미커밋 변경이 있으면 그 명령이 남의 작업까지 날린다. 미추적(??)은 정상이므로 통과시킨다.
 */
function assertCleanTree(): void {
  // 🔴 파이프라인(GHA) 안에서는 검사하지 않는다.
  // 이 가드의 목적은 "오격리가 나면 git checkout 으로 되돌릴 수 있게" 트리를 깨끗이 두는 것인데,
  // 워크플로는 매 회차 추적 파일을 정상적으로 고친다: 3·4단계가 scripts/keywords.json 을 기록하고
  // 7단계 internal-linker 가 기존 mdx 를 다시 쓴다. 그래서 CI 에서 이 검사를 켜 두면
  // **글이 한 편이라도 생성된 회차는 게이트가 무조건 exit 1** 이 되어 발행이 통째로 막힌다.
  // CI 는 매번 새 클론이라 되돌릴 로컬 작업물도 없으므로 보호 대상 자체가 없다.
  // (2026-07-29 이식 중 도입한 가드의 부작용. 적대적 문서 검증에서 발견.)
  if (process.env.GITHUB_ACTIONS === 'true' || process.env.GATE_ALLOW_DIRTY === '1') return;

  let lines: string[];
  try {
    lines = gitLines('git -c core.quotepath=false status --porcelain');
  } catch (err: any) {
    throw new Error(`git status 실패 — 게이트는 git 저장소 안에서만 돌아야 한다: ${err.message}`);
  }
  const dirty = lines.filter(l => /^( ?[MDRAU]|[MDRAU] )/.test(l.slice(0, 2)));
  if (dirty.length > 0) {
    throw new Error(
      `추적 파일에 미커밋 변경이 ${dirty.length}건 있다 — 격리가 나도 안전하게 되돌릴 수 없다.\n` +
      dirty.slice(0, 10).map(l => `    ${l}`).join('\n') +
      (dirty.length > 10 ? `\n    ... 외 ${dirty.length - 10}건` : '') +
      `\n  커밋하거나 stash 한 뒤 다시 실행할 것. (미추적 ?? 파일은 무관하다.)`
    );
  }
}

/**
 * (b) 커밋된 슬러그 차단.
 * 커밋된 글은 리서치 캐시가 없어 엄격모드 팩트체크로 오격리되고, 그러면 라이브 글이 사라진다.
 * 원본은 이 금지가 주석과 CLAUDE.md 에만 있었다.
 */
function assertNotCommitted(targets: { file: string; slug: string }[]): void {
  if (ALLOW_COMMITTED) {
    console.warn('⚠️ GATE_ALLOW_COMMITTED=1 — 커밋된 글 검사를 허용했다. 오격리 시 라이브 글이 사라진다.');
    return;
  }
  let tracked: Set<string>;
  try {
    tracked = new Set(
      gitLines('git -c core.quotepath=false ls-files -- content')
        .map(p => path.resolve(process.cwd(), p.replace(/^"|"$/g, '')))
    );
  } catch (err: any) {
    throw new Error(`git ls-files 실패: ${err.message}`);
  }
  const committed = targets.filter(t => tracked.has(path.resolve(t.file)));
  if (committed.length > 0) {
    throw new Error(
      `이미 커밋된 글 ${committed.length}편이 검사 대상에 들어 있다: ${committed.map(c => c.slug).join(', ')}\n` +
      `  커밋된 글은 리서치 캐시가 없어 엄격모드로 오격리되고, 격리는 라이브 글 삭제로 이어진다.\n` +
      `  정말 의도한 것이라면 GATE_ALLOW_COMMITTED=1 을 명시할 것.`
    );
  }
}

/**
 * (d) 코퍼스 프리플라이트.
 * 슬러그 해석이 깨지면(빈 Set) 모든 내부링크가 broken-link 가 되어 검사 대상이 전량 격리된다.
 * easy-zetec·tokennara 가 정확히 이 시나리오였다. 사람이 config 를 잘못 넣어도 코드가 먼저 멈춘다.
 */
function assertCorpusSane(slugs: Set<string>): void {
  const fileCount = getMdxFiles().length;
  if (fileCount === 0) {
    throw new Error(`content/ 아래 mdx 가 0개다 — 경로가 맞는지 확인할 것 (cwd: ${process.cwd()})`);
  }
  if (slugs.size === 0) {
    throw new Error(`슬러그 집합이 비었다(파일 ${fileCount}개) — 슬러그 해석 실패. 이대로 돌면 전편 오격리다.`);
  }
  const ratio = slugs.size / fileCount;
  if (ratio < 0.9) {
    throw new Error(
      `슬러그 ${slugs.size}개 / 파일 ${fileCount}개 (${Math.round(ratio * 100)}%) — 중복 슬러그이거나 해석 오류다.\n` +
      `  이대로 돌면 유효한 내부링크가 broken-link 로 잡혀 오격리된다.`
    );
  }
}

/**
 * 🔴 팩트체커 모듈을 **동적** import 로 바꾸면서 잃어버린 부작용을 여기서 되살린다.
 *
 * 원본은 `import { callGemini } from './utils/ai-utils'` 가 모듈 최상단에 있었고,
 * 그 파일이 로드되는 순간 `dotenv.config()` 가 돌아 `.env`·`.env.local` 이 실렸다.
 * 동적 import 로 바꾸니 그 로딩이 첫 팩트체크 호출 시점까지 미뤄지고, 그 앞에서 도는
 * 키 존재 검사가 "키가 있는데도 없다"고 판정해 발행을 통째로 막는다.
 * (2026-07-29 ai-blog 이식 중 실측. 이 레포만 factCheck: 'strict' 라 여기서만 드러났다.)
 *
 * dotenv 가 없는 레포도 있으므로 실패해도 조용히 넘어간다 — 그 경우 키 검사가 정상적으로
 * "없다"고 판정하는 것이 맞다.
 */
function loadEnvForFactCheck(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    dotenv.config();
    dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  } catch {
    /* dotenv 미설치 레포 — 키 검사가 그대로 진행된다 */
  }
}

/** factCheck: 'strict' 인데 전제가 없으면 글 검사 전에 멈춘다. 대량 격리를 설정 오류로 전환한다. */
function assertFactCheckReady(cfg: GateConfig): void {
  if (cfg.factCheck !== 'strict') return;
  loadEnvForFactCheck();
  if (!fs.existsSync(RESEARCH_DIR)) {
    throw new Error(
      `factCheck: 'strict' 인데 .research-cache/ 가 없다.\n` +
      `  캐시가 없으면 팩트체커가 엄격 모드로 들어가 모든 구체 수치를 unsupported 로 판정한다(= 전량 격리).\n` +
      `  캐시 생산자를 먼저 세우거나 gate.config.json 의 factCheck 를 'off' 로 둘 것.` +
      (cfg.researchProducer ? `\n  이 레포의 캐시 생산자: ${cfg.researchProducer}` : `\n  이 레포에는 캐시 생산자가 없다.`)
    );
  }
  if (!fs.existsSync(path.join(process.cwd(), 'scripts', 'utils', 'ai-utils.ts'))) {
    throw new Error(
      `factCheck: 'strict' 인데 scripts/utils/ai-utils.ts 가 없다.\n` +
      `  팩트체커 호출부가 이 모듈을 런타임에 로드한다. ai-blog 최신본을 함께 이식할 것` +
      `(dotenv 의존성도 같이 확인 — 이 레포에 없으면 설치해야 한다).`
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      `factCheck: 'strict' 인데 GEMINI_API_KEY 가 없다.\n` +
      `  이대로 돌면 첫 글에서 fail-closed 로 멈춰 절반만 처리된 상태가 남는다.`
    );
  }
}

/* ─────────────────────────── 팩트체크 ─────────────────────────── */

function warnIfCacheUnsourced(slug: string, research: string): void {
  const urls = research.match(/https?:\/\/\S+/g) || [];
  if (urls.length > 0) return;
  console.warn(
    `⚠️ ${slug}: 리서치 캐시에 출처 URL이 0개다 — 팩트체크의 근거가 검증 흔적 없는 주장뿐이다.\n` +
    `   캐시의 '확인된 사실' 줄마다 그 줄을 뒷받침하는 URL을 남길 것. 판정에는 반영하지 않는 경고다.`
  );
}

/**
 * 팩트체커는 factCheck: 'strict' 일 때만 쓰이는 선택적 의존성이다.
 * 🔴 특정자를 리터럴로 쓰면 `scripts/utils/ai-utils.ts` 가 없는 레포에서 **타입체크가 실패**하고,
 *    Next.js 빌드가 통째로 죽는다(8개 중 5개 레포에 이 파일이 없다). 변수로 넘겨 정적 해석을 피한다.
 *    전제 부재는 assertFactCheckReady() 가 검사 시작 전에 잡는다.
 */
const AI_UTILS_MODULE = './utils/ai-utils';

async function factCheckChunk(text: string, research: string | null): Promise<FactClaim[]> {
  const { callGemini } = (await import(AI_UTILS_MODULE)) as { callGemini: (p: string, s: string) => Promise<string> };
  const researchSection = research
    ? `## 리서치 자료 (이 글을 쓸 때 확보된 유일한 근거)\n${research}`
    : `## 리서치 자료\n(없음 — 이 글은 근거 자료 없이 작성됨. 모든 구체 수치·스펙 주장을 unsupported로 판정할 것)`;

  const prompt = `당신은 적대적 팩트체커입니다. 아래 리서치 자료 밖에서 온 구체 사실은 전부 창작 의심 대상입니다.

${researchSection}

## 검사 대상 텍스트 (제목·메타 설명·본문·FAQ 포함)
${text}

## 임무
검사 대상 텍스트에서 다음 유형의 "구체적 사실 주장"을 모두 추출하고, 각각 리서치 자료에서 근거를 찾을 수 있는지 판정하세요:
- 가격·요금·플랜명·무료 한도
- 정확도·성공률·절감률 등 % 통계
- 수치로 표현된 규격·한도·기간
- 제품명·버전·출시일·시행일
- 벤치마크 수치(속도·처리 시간·점수)
- 개인 실적(구체 수치가 있는 경험담)

판정 기준:
- verdict "supported": 리서치 자료에 같은 취지의 근거가 있음
- verdict "unsupported": 리서치 자료에 근거가 없음 (창작 의심)
severity (unsupported에만 의미 있음):
- "critical": 독자의 구매·사용·건강·금전 결정에 영향을 주는 수치
- "minor": 부차적 수치

제외 대상 (추출하지 말 것):
- 널리 알려진 안정적 일반 상식
- 정성 표현 ("빠른 편이다", "유료 플랜이 있다")
- 글의 논리·문체·의견
- 제목·슬러그 관행으로 붙는 연도 표기(예: "… 2026")는 사실 주장이 아니다

JSON만 출력:
{"claims":[{"claim":"...","verdict":"supported|unsupported","severity":"critical|minor","reason":"..."}]}`;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callGemini(prompt, '적대적 팩트체커. 구체 사실 주장만 검증. JSON only.');
    try {
      const parsed = JSON.parse(extractJson(raw)) as { claims: FactClaim[] };
      if (!Array.isArray(parsed.claims)) throw new Error('claims 배열 없음');
      return parsed.claims;
    } catch (err: any) {
      lastErr = err;
      console.warn(`⚠️ 팩트체크 JSON 파싱 실패 (시도 ${attempt}/2): ${err.message}`);
    }
  }
  throw new Error(`팩트체크 응답 파싱 불가: ${lastErr?.message}`);
}

async function adversarialFactCheck(text: string, research: string | null): Promise<FactClaim[]> {
  const CHUNK = 18000;
  const OVERLAP = 1000;
  const chunks: string[] = [];
  for (let i = 0; ; i += CHUNK - OVERLAP) {
    chunks.push(text.substring(i, i + CHUNK));
    if (i + CHUNK >= text.length) break;
  }
  if (chunks.length > 1) console.log(`  📄 검사 텍스트 ${text.length}자 → ${chunks.length}청크 분할 검사`);
  const all: FactClaim[] = [];
  for (const chunk of chunks) all.push(...await factCheckChunk(chunk, research));
  return all;
}

/* ─────────────────────────── 대상 선정 ─────────────────────────── */

function findUncommittedNewPosts(): Set<string> {
  try {
    const files = gitLines('git -c core.quotepath=false status --porcelain -- content')
      .filter(l => l.startsWith('??'))
      .map(l => l.slice(3).trim().replace(/^"|"$/g, ''))
      .filter(p => p.endsWith('.mdx'))
      .map(p => path.resolve(process.cwd(), p));
    return new Set(files);
  } catch (err: any) {
    console.warn(`⚠️ git 미추적 파일 조회 실패(${err.message}) — GATE_SLUGS를 명시하세요. 폴백 대상 0건 처리.`);
    return new Set();
  }
}

function findTargetFiles(): { file: string; slug: string }[] {
  const withSlug = getMdxFiles().map(f => {
    const { data } = matter(fs.readFileSync(f, 'utf-8'));
    return { file: f, slug: resolveSlug(f, data) };
  });

  const gateSlugs = (process.env.GATE_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (gateSlugs.length > 0) {
    const found = withSlug.filter(p => gateSlugs.includes(p.slug));
    const missing = gateSlugs.filter(s => !found.some(f => f.slug === s));
    if (missing.length > 0) {
      console.warn(`⚠️ GATE_SLUGS 중 찾지 못한 슬러그 ${missing.length}건: ${missing.join(', ')}`);
    }
    return found;
  }

  console.log('🚧 GATE_SLUGS 미지정 — git 미추적(신규) mdx만 폴백 검사');
  const newFiles = findUncommittedNewPosts();
  return withSlug.filter(p => newFiles.has(path.resolve(p.file)));
}

/* ─────────────────────────── 격리 ─────────────────────────── */

/**
 * 이 글 전용 이미지를 찾는다.
 * 🔴 원본은 `basename(img).startsWith(slug)` 만 봤는데, 날짜 프리픽스 레포에서는
 * 파일이 `<date>-<slug>-thumb.webp` 라 슬러그로 시작하지 않아 이미지가 남는다.
 * (데이터 손실 방향은 아니지만 고아 파일이 쌓이고, 복구 안내도 어긋난다.)
 */
function ownImages(file: string, slug: string, data: Record<string, any>, content: string, cfg: GateConfig): string[] {
  const fileBase = path.basename(file, '.mdx');
  const prefixes = Array.from(new Set([slug, fileBase]));
  const imgs = new Set<string>();

  if (cfg.thumbnailKey) {
    const thumb = data[cfg.thumbnailKey];
    if (typeof thumb === 'string' && thumb.startsWith('/images/')) imgs.add(thumb);
  }
  IMG_SRC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMG_SRC_RE.exec(content)) !== null) {
    if (m[1].startsWith('/images/')) imgs.add(m[1]);
  }

  return Array.from(imgs).filter(img => {
    const b = path.basename(img);
    return prefixes.some(p => b.startsWith(p));
  });
}

interface QuarantinePlan {
  file: string;
  destRel: string;
  images: { from: string; to: string }[];
  keywordsRecordRemoved: boolean;
}

function planQuarantine(file: string, slug: string, cfg: GateConfig): QuarantinePlan {
  const rel = path.relative(CONTENT_DIR, file);
  const dest = path.join(QUARANTINE_DIR, rel);
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'));

  const images = ownImages(file, slug, data, content, cfg)
    .map(img => ({ from: path.join(PUBLIC_DIR, img), to: path.join(QUARANTINE_DIR, 'images', path.basename(img)) }))
    .filter(p => fs.existsSync(p.from));

  let removed = false;
  if (fs.existsSync(KEYWORDS_DB_PATH)) {
    try {
      const db = JSON.parse(fs.readFileSync(KEYWORDS_DB_PATH, 'utf-8')) as { slug?: string }[];
      removed = Array.isArray(db) && db.some(r => r.slug === slug);
    } catch { /* 파싱 실패는 아래 실행 단계에서 다시 걸린다 */ }
  }

  return { file, destRel: path.relative(process.cwd(), dest), images, keywordsRecordRemoved: removed };
}

function executeQuarantine(plan: QuarantinePlan, slug: string, reasons: string[]): void {
  const dest = path.resolve(process.cwd(), plan.destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (const img of plan.images) {
    fs.mkdirSync(path.dirname(img.to), { recursive: true });
    fs.renameSync(img.from, img.to);
  }
  fs.renameSync(plan.file, dest);
  fs.writeFileSync(`${dest}.reason.txt`, reasons.join('\n') + '\n');

  if (plan.keywordsRecordRemoved && fs.existsSync(KEYWORDS_DB_PATH)) {
    const db = JSON.parse(fs.readFileSync(KEYWORDS_DB_PATH, 'utf-8')) as { slug?: string }[];
    fs.writeFileSync(KEYWORDS_DB_PATH, JSON.stringify(db.filter(r => r.slug !== slug), null, 2));
  }
}

/** 🔴 복구 안내는 실제 경로로 출력한다. 원본은 `quarantine/<cat>/<slug>.mdx` 로 조립해서 날짜 프리픽스 레포에서 어긋났다. */
function recoveryCommand(plan: QuarantinePlan): string {
  const parts = [`mv ${plan.destRel} ${path.relative(process.cwd(), path.dirname(plan.file))}/`];
  for (const img of plan.images) {
    parts.push(`mv ${path.relative(process.cwd(), img.to)} ${path.relative(process.cwd(), path.dirname(img.from))}/`);
  }
  parts.push(`rm -f ${plan.destRel}.reason.txt`);
  if (plan.keywordsRecordRemoved) parts.push(`git checkout -- scripts/keywords.json`);
  return parts.join(' && ').replace(/\\/g, '/');
}

function removeLinksToQuarantined(quarantinedSlugs: string[], dryRun: boolean): string[] {
  if (quarantinedSlugs.length === 0) return [];
  const gone = new Set(quarantinedSlugs);
  const isGone = (slug: string) => {
    if (gone.has(slug)) return true;
    try { return gone.has(decodeURIComponent(slug)); } catch { return false; }
  };
  const touched: string[] = [];
  for (const f of getMdxFiles()) {
    const raw = fs.readFileSync(f, 'utf-8');
    // 검사와 언랩이 같은 패턴을 써야 한다. 다르면 "검사에서 걸린 링크를 언랩하지 못하는" 구멍이 생긴다.
    const fixed = raw.replace(new RegExp(BLOG_LINK_RE.source, 'g'), (whole, label, slug) => (isGone(slug) ? label : whole));
    if (fixed !== raw) {
      touched.push(path.relative(process.cwd(), f));
      if (!dryRun) fs.writeFileSync(f, fixed);
    }
  }
  return touched;
}

/* ─────────────────────────── main ─────────────────────────── */

const progress: { passed: string[]; quarantined: { slug: string; reasons: string[] }[]; remaining: string[] } = {
  passed: [], quarantined: [], remaining: [],
};

async function main() {
  const cfg = loadGateConfig();
  // 🔴 NaN 가드. 없으면 `GATE_MIN_KOREAN=2,500` 같은 오타가 NaN 이 되고,
  // `kr < NaN` 이 항상 false 라 **자수 검사가 조용히 통째로 꺼진다**(로그에는 "한글 NaN자"로만 찍힌다).
  // config 경로는 gate-config.ts 가 Number.isInteger 로 검증하는데 env 경로만 무검증이었다.
  // 🔴 `parseInt` 로 검증하면 안 된다. `parseInt("2,500", 10)` 은 NaN 이 아니라 **2** 다.
  //    즉 오타가 "검사 꺼짐"이 아니라 "컷이 2자로 떨어짐"이 되어 더 나쁘다(실측 확인).
  //    문자열 전체가 숫자인지를 먼저 본다.
  const rawMin = process.env.GATE_MIN_KOREAN;
  let minKorean = cfg.minKorean;
  if (rawMin !== undefined && rawMin.trim() !== '') {
    const s = rawMin.trim();
    if (!/^\d+$/.test(s) || parseInt(s, 10) <= 0) {
      throw new Error(
        `GATE_MIN_KOREAN 이 양의 정수가 아니다: "${rawMin}"\n` +
        `  쉼표·단위·공백이 섞이면 앞부분만 잘려 컷이 엉뚱한 값이 된다(예: "2,500" → 2).`
      );
    }
    minKorean = parseInt(s, 10);
  }

  assertFactCheckReady(cfg);

  const targets = findTargetFiles();
  if (targets.length === 0) {
    console.log('🚧 publish-gate: 검사 대상 글 없음 — 통과');
    return;
  }

  assertNotCommitted(targets);
  if (!DRY_RUN) assertCleanTree();

  const slugs = getAllSlugs();
  assertCorpusSane(slugs);

  console.log(
    `🚧 publish-gate${DRY_RUN ? ' [DRY RUN — 파일을 건드리지 않는다]' : ''}: ` +
    `${targets.length}편 검사 (한글 ${minKorean}자 · 팩트체크 ${cfg.factCheck.toUpperCase()} · 코퍼스 슬러그 ${slugs.size})`
  );

  progress.remaining = targets.map(t => t.slug);
  const { passed, quarantined, remaining } = progress;

  for (const { file, slug } of targets) {
    const reasons: string[] = [];
    const { data, content } = matter(fs.readFileSync(file, 'utf-8'));

    // broken-encoding 은 되돌릴 수 없는 손상이라(원본 바이트 소실) 발행 전에 막는 것이 유일한 방어다.
    for (const issue of [
      ...checkInternalLinksInFiles([file], slugs),
      ...checkImagesInFiles([file]),
      ...checkEncodingInFiles([file]),
    ]) {
      reasons.push(`${issue.type}: ${issue.detail}`);
    }

    const kr = koreanCharCount(content);
    if (kr < minKorean) reasons.push(`thin-content: 한글 ${kr}자 < ${minKorean}자`);

    if (reasons.length === 0 && cfg.factCheck === 'strict') {
      const researchPath = path.join(RESEARCH_DIR, `${slug}.md`);
      const research = fs.existsSync(researchPath) ? fs.readFileSync(researchPath, 'utf-8') : null;
      if (!research) console.warn(`⚠️ ${slug}: 리서치 캐시 없음 — 엄격 모드로 팩트체크`);
      else warnIfCacheUnsourced(slug, research);
      const faqText = Array.isArray(data.faq)
        ? data.faq.map((f: any) => `Q: ${f?.q ?? ''}\nA: ${f?.a ?? ''}`).join('\n')
        : '';
      const checkText = `제목: ${data.title ?? ''}\n메타 설명: ${data.description ?? ''}\n\n${content}${faqText ? `\n\n## FAQ\n${faqText}` : ''}`;
      const claims = await adversarialFactCheck(checkText, research);
      for (const c of claims.filter(c => c.verdict === 'unsupported' && c.severity === 'minor')) {
        console.warn(`  🟡 ${slug} minor(발행 허용): ${c.claim}`);
      }
      for (const c of claims.filter(c => c.verdict === 'unsupported' && c.severity === 'critical')) {
        reasons.push(`fact: ${c.claim} — ${c.reason}`);
      }
    }

    if (reasons.length > 0) {
      const plan = planQuarantine(file, slug, cfg);
      if (!DRY_RUN) executeQuarantine(plan, slug, reasons);
      quarantined.push({ slug, reasons });
      console.error(
        `${DRY_RUN ? '🔎 격리 예정' : '❌ 격리'}: ${slug}\n${reasons.map(r => `   - ${r}`).join('\n')}\n` +
        `   → ${plan.destRel}${plan.images.length ? ` (이미지 ${plan.images.length}장 동반)` : ''}` +
        `${plan.keywordsRecordRemoved ? ' + keywords.json 레코드 제거' : ''}\n` +
        `   ↩︎ 오탐이면 복구: ${recoveryCommand(plan)}\n` +
        `   ℹ️ "리서치 자료에 언급이 없습니다" 계열 사유는 조작이 아니라 캐시 공백일 수 있다.\n` +
        `   ℹ️ 제목 끝의 연도 표기를 사실 주장으로 읽은 것이라면 오탐이다(레포 명명 관행).`
      );
    } else {
      passed.push(slug);
      console.log(`✅ 통과: ${slug} (한글 ${kr}자)`);
    }
    remaining.splice(remaining.indexOf(slug), 1);
  }

  const touched = removeLinksToQuarantined(quarantined.map(q => q.slug), DRY_RUN);
  if (touched.length > 0) {
    console.log(`${DRY_RUN ? '🔎 언랩 예정' : '🧹 언랩'} ${touched.length}개 파일:`);
    for (const t of touched.slice(0, 20)) console.log(`   - ${t}`);
    if (touched.length > 20) console.log(`   ... 외 ${touched.length - 20}개`);
  }

  console.log(`\n🚧 publish-gate 결과${DRY_RUN ? ' [DRY RUN]' : ''}: 통과 ${passed.length} / 격리 ${quarantined.length}`);
  if (DRY_RUN) console.log('   파일은 하나도 변경되지 않았다. git status 로 확인할 것.');

  if (process.env.GITHUB_OUTPUT && !DRY_RUN) {
    const qSummary = quarantined
      .map(q => `${q.slug}(${q.reasons[0].replace(/[\r\n"'`$\\]/g, ' ').substring(0, 80)})`)
      .join(' | ');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `GATE_PASSED=${passed.join(',')}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `GATE_QUARANTINED=${qSummary}\n`);
  }
}

main().catch(err => {
  const { passed, quarantined, remaining } = progress;
  const lines = [`❌ publish-gate 중단 — fail-closed로 발행 중단: ${err.message}`];
  if (passed.length || quarantined.length || remaining.length) {
    lines.push(
      '',
      '── 중단 시점 진행 상황 ──',
      `  ✅ 검사 통과 ${passed.length}건: ${passed.join(',') || '(없음)'}`,
      `  ❌ 격리 ${quarantined.length}건: ${quarantined.map(q => q.slug).join(',') || '(없음)'}`,
      `  ⏸️  미검사 ${remaining.length}건: ${remaining.join(',') || '(없음)'}`,
    );
    if (remaining.length) {
      lines.push('', '  ↻ 미검사분만 재실행:', `     GATE_SLUGS="${remaining.join(',')}" npx tsx scripts/publish-gate.ts`);
    }
    lines.push('  ℹ️ 이미 통과한 글은 다시 넣지 말 것 — 커밋된 글은 리서치 캐시가 없어 엄격 모드로 오격리된다.');
  }
  process.stderr.write(lines.join('\n') + '\n');
  process.exitCode = 1;
});
