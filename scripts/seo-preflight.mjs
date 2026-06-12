/**
 * SEO 발행 전 게이트 (on-page rank-readiness linter) — 블로그 무관 범용.
 * 신규 포스트가 "상위노출 준비됨" 상태인지 발행 전 자동 채점. 100점, 통과 기준 80.
 * 사용법:
 *   node scripts/seo-preflight.mjs <file.mdx> [--minlen 2500] [--kw "타깃 키워드"]
 *   node scripts/seo-preflight.mjs --today [--minlen N]   (오늘 date frontmatter 글 일괄)
 * targetKeyword frontmatter 있으면 키워드 배치까지 채점, 없으면 구조 점검 + title 기반 추정.
 * 종료코드: 통과 0 / 미달 1 (포스팅 워크플로 게이트로 사용).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
// gray-matter로 견고하게 frontmatter 파싱(folded scalar·특수문자 제목 대응). 없으면 수동 폴백.
let matter = null;
try { matter = createRequire(import.meta.url)('gray-matter'); } catch { /* fallback below */ }

const args = process.argv.slice(2);
const minlen = parseInt((args.find(a => a.startsWith('--minlen='))?.split('=')[1]) || (args[args.indexOf('--minlen') + 1]) || '2500', 10);
const kwArg = args.includes('--kw') ? args[args.indexOf('--kw') + 1] : null;
const today = args.includes('--today');

function parse(raw) {
  if (matter) {
    try { const g = matter(raw); return { fm: g.data || {}, body: g.content || raw }; } catch { /* fall through */ }
  }
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (mm) fm[mm[1]] = String(mm[2]).replace(/^["']|["']$/g, '').trim();
  }
  return { fm, body: m[2] };
}
// 한글 자수 = check-post-length.sh와 동일 기준(가~힣 음절만 집계). 이전 버전은 영문·숫자·기호까지 세서
// 과대표기(2026-06-12 ai-blog: preflight 2,800 vs 게이트 1,870 사고) — 자수 최종 판정은 어차피 check-post-length지만 표기도 일치시킴.
const krLen = (s) => (s.match(/[가-힣]/g) || []).length;

function score(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const { fm, body } = parse(raw);
  const kw = String(kwArg || fm.targetKeyword || fm.title || '');
  const kwTokens = kw.replace(/[^\wㄱ-힣 ]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
  const hasKw = (txt) => kwTokens.length === 0 ? true : kwTokens.some(t => txt.includes(t));
  const checks = [];
  const add = (pass, pts, label, fix) => checks.push({ pass, pts: pass ? pts : 0, max: pts, label, fix: pass ? '' : fix });

  const title = String(fm.title || '');
  add(!!title && title.length <= 70, 12, `제목 존재·≤70자 (${title.length}자)`, '제목 60~70자로, 타깃 키워드 포함');
  const desc = String(fm.description || '');
  add(desc.length >= 60 && desc.length <= 165, 14, `메타 description ${desc.length}자(60~165)`, 'description 70~160자 작성');
  add(hasKw(title) || hasKw(desc), 10, '키워드가 제목/메타에', '타깃 키워드를 제목 또는 description에 자연 포함');

  const first = body.slice(0, 400);
  add(hasKw(first), 10, '키워드 첫 문단 등장', '도입부 100단어 안에 타깃 키워드 자연 등장');

  const h2 = (body.match(/^##\s+.+$/gm) || []);
  add(h2.length >= 3 && h2.some(h => hasKw(h)), 12, `H2 ${h2.length}개·키워드 H2 ${h2.some(h => hasKw(h)) ? 'O' : 'X'}`, 'H2 3개+ & 최소 1개 H2에 키워드');

  const internal = (body.match(/\]\(\/blog\//g) || []).length;
  add(internal >= 2, 14, `내부링크 ${internal}개(≥2)`, '같은 블로그 관련글 2~3개 본문 링크(/blog/slug)');

  // FAQ는 대부분 frontmatter faq[] 배열(q/a) — body만 보면 false-negative (2026-06-02~ 오탐 fix)
  const fmFaqCount = Array.isArray(fm.faq) ? fm.faq.length : 0;
  const faq = fmFaqCount > 0 || /###\s*Q[:.]|자주\s*묻는|자주\s*하는\s*질문|<FAQ|faq/i.test(body);
  add(faq, 10, `FAQ ${fmFaqCount > 0 ? `${fmFaqCount}개(frontmatter)` : faq ? 'O(body)' : 'X'}`, 'FAQ 3~7개(PAA·리치스니펫 기회)');

  const len = krLen(body);
  add(len >= minlen, 14, `본문 한글 ${len}자(≥${minlen}, 가-힣만)`, `본문 한글 ${minlen}자+로 보강(최종 판정은 check-post-length.sh)`);

  const imgs = [...body.matchAll(/!\[([^\]]*)\]\(/g)];
  const emptyAlt = imgs.filter(m => !m[1].trim()).length;
  add(imgs.length === 0 || emptyAlt === 0, 8, `이미지 alt ${imgs.length - emptyAlt}/${imgs.length}`, `alt 비어있는 이미지 ${emptyAlt}개 채우기`);

  const slug = String(fm.slug || path.basename(file, path.extname(file)).replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  add(/^[a-z0-9-]+$/.test(slug), 6, `slug 클린 (${slug.slice(0, 40)})`, 'slug는 소문자·하이픈·ASCII');

  const total = checks.reduce((s, c) => s + c.pts, 0);
  const maxTotal = checks.reduce((s, c) => s + c.max, 0);
  return { file, kw, total, maxTotal, checks };
}

const PASS_RATIO = 0.75;
function report(r) {
  const slug = path.basename(r.file);
  const pct = Math.round((r.total / r.maxTotal) * 100);
  const pass = r.total / r.maxTotal >= PASS_RATIO;
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'} [${r.total}/${r.maxTotal} = ${pct}%] ${slug}  (kw: ${r.kw.slice(0, 40)})`);
  for (const c of r.checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.pts}/${c.max} ${c.label}${c.fix ? `  → ${c.fix}` : ''}`);
  return pass;
}

let files = [];
if (today) {
  const t = new Date().toISOString().split('T')[0];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
      try { if (fs.readFileSync(p, 'utf8').includes(t)) files.push(p); } catch {}
    }
  });
  ['content', 'src/content', 'posts'].forEach(d => { if (fs.existsSync(d)) walk(d); });
} else {
  files = args.filter(a => (a.endsWith('.mdx') || a.endsWith('.md')) && fs.existsSync(a));
}
if (!files.length) { console.log('대상 파일 없음. 사용법: node scripts/seo-preflight.mjs <file.mdx> [--kw "키워드"] [--minlen N]'); process.exit(0); }
let allPass = true;
for (const f of files) { if (!report(score(f))) allPass = false; }
console.log(`\n${allPass ? '✅ 전체 통과' : '❌ 일부 미달 — 위 ✗ 항목 보강 후 재실행'}`);
process.exit(allPass ? 0 : 1);
