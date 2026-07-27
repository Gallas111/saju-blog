// thin(자수 미달) 글 스캔 — 발행 게이트와 100% 동일한 기준으로 센다 (2026-07-27 신설)
//
// 사용:
//   npx tsx scripts/thin-scan.ts                     # 전 블로그 요약
//   npx tsx scripts/thin-scan.ts ai-blog,saju-blog   # 특정 블로그
//   npx tsx scripts/thin-scan.ts ai-blog --list      # thin 글 전체 나열
//   npx tsx scripts/thin-scan.ts ai-blog --gsc       # 28일 노출 조인 (보강 우선순위용)
//
// 🔴 왜 이 스크립트가 존재하는가
//   자수 계산을 애드혹 정규식으로 하다가 3일 새 두 번 사고가 났다.
//     2026-07-24  `re.sub(r'^---.*?^---','',t,flags=S|M)`  count=1 누락 → 본문 --- 사이 삭제 → 41편 thin 오판
//     2026-07-27  `re.sub(r'<[^>]+>','',b)`                [^>]가 개행 매칭 → 꺾쇠 하나가 수십 줄 삭제 → 40편 thin 오판
//   두 번 다 "보강 필요 N편" 유령 백로그를 만들었다. 정답은 전처리를 안 하는 것이다.
//   publish-gate.ts:43 과 동일하게 gray-matter 로 프론트매터만 떼고 [가-힣] 를 그대로 센다.
//   코드블록·JSX 태그를 지우지 않는다 — 게이트가 안 지우므로 지우면 게이트와 어긋난다.

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { google } from 'googleapis';

const BASE = path.join(process.env.USERPROFILE || process.env.HOME || '', 'OneDrive', '바탕 화면', '사이트');

// 자수 컷 — ~/scripts/check-post-length.sh 의 CUT_MAP 과 일치시킬 것
const CUTS: Record<string, number> = {
  'ai-blog': 2500, 'saju-blog': 2500, 'health-blog': 2500,
  'easy-zetec': 3000, 'baby-blog': 3000,          // AdSense 반려 이력 → 컷 높음
  'coinday': 2500, 'bukbukstock': 2500, 'tokennara': 2500, 'altnara': 2500,
};

// gsc-page-impressions.ts 와 동일
const SITES: Record<string, string> = {
  'ai-blog': 'sc-domain:how-toai.com',
  'saju-blog': 'https://www.sajubokastory.com/',
  'easy-zetec': 'sc-domain:easyzetec.com',
  'baby-blog': 'sc-domain:babytodak.com',
  'health-blog': 'https://www.wellnesstodays.com/',
  'bukbukstock': 'sc-domain:bukbukstock.com',
  'coinday': 'sc-domain:coindaynow.com',
  'tokennara': 'sc-domain:tokennara.com',
  'altnara': 'sc-domain:altnara.com',
};

interface Post { slug: string; file: string; korean: number; noindex: boolean; imp: number; clicks: number }

/** 게이트 동일 기준. 전처리 금지 — matter().content 를 그대로 센다. */
function koreanChars(raw: string): { korean: number; noindex: boolean; slug: string | null } {
  const { data, content } = matter(raw);
  return {
    korean: (content.match(/[가-힣]/g) || []).length,
    noindex: data.noindex === true,
    slug: typeof data.slug === 'string' ? data.slug.trim() : null,
  };
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

function scan(blog: string): Post[] {
  return walk(path.join(BASE, blog, 'content')).map((file) => {
    const { korean, noindex, slug } = koreanChars(fs.readFileSync(file, 'utf-8'));
    const fallback = path.basename(file, '.mdx').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return { slug: slug || fallback, file, korean, noindex, imp: 0, clicks: 0 };
  });
}

async function joinGsc(blog: string, posts: Post[]): Promise<boolean> {
  const siteUrl = SITES[blog];
  if (!siteUrl) return false;
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'google-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });
  const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: day(31), endDate: day(3), dimensions: ['page'], rowLimit: 5000 },
  });
  const byslug = new Map<string, Post>(posts.map((p) => [p.slug, p]));
  const rows = res.data.rows || [];
  let hit = 0, miss = 0;
  for (const row of rows) {
    // 🔑 같은 slug 에 앵커(#섹션) 행이 여러 개 → 반드시 합산 (덮어쓰면 노출이 실제보다 작게 나온다)
    const slug = decodeURIComponent((row.keys?.[0] || '').split('/').pop() || '').split('#')[0];
    const p = byslug.get(slug);
    if (p) { p.imp += row.impressions || 0; p.clicks += row.clicks || 0; hit++; } else miss++;
  }
  // 🔴 조인 실패를 "노출 0"으로 착각하면 트래픽 있는 글을 지운다. 매칭률을 항상 보고한다.
  console.log(`  GSC 28일 ${rows.length}행 → 매칭 ${hit} / 미매칭 ${miss}` +
    (rows.length && hit / rows.length < 0.5 ? '  ⚠ 매칭률 50% 미만 = slug 추출 확인 필요' : ''));
  return true;
}

async function main() {
  const arg = process.argv[2];
  const blogs = arg && !arg.startsWith('--') ? arg.split(',') : Object.keys(CUTS);
  const wantList = process.argv.includes('--list');
  const wantGsc = process.argv.includes('--gsc');

  for (const blog of blogs) {
    const cut = CUTS[blog];
    if (!cut) { console.error(`알 수 없는 블로그: ${blog}`); continue; }
    const posts = scan(blog);
    if (!posts.length) { console.log(`${blog}: content/*.mdx 없음`); continue; }

    let gscOk = false;
    if (wantGsc) {
      try { gscOk = await joinGsc(blog, posts); }
      catch (e) { console.error(`  ⚠ GSC 조회 실패(${blog}): ${(e as Error).message}`); }
    }

    const thin = posts.filter((p) => p.korean < cut);
    const exposed = thin.filter((p) => !p.noindex);   // 🔴 진짜 위험: 얇은데 색인이 열려 있음
    const lens = posts.map((p) => p.korean).sort((a, b) => a - b);
    const median = lens[Math.floor(lens.length / 2)];

    console.log(`\n=== ${blog} (컷 ${cut}자) ===`);
    console.log(`전체 ${posts.length}편 · 자수 최소 ${lens[0]} / 중앙값 ${median} / 최대 ${lens[lens.length - 1]}`);
    console.log(`thin ${thin.length}편 = noindex ${thin.length - exposed.length} + ${exposed.length ? '🔴' : '✅'}색인열림 ${exposed.length}편`);

    // 🔑 측정 버그 자가진단: thin 후보가 컷 바로 아래 좁은 띠에 뭉치면 자수 계산이 틀렸을 확률이 높다.
    //    (2026-07-27 사고에서 40편이 전부 2,000~2,499 구간에 몰려 있었다. 실제 분포는 그렇게 안 뭉친다.)
    const band = thin.filter((p) => p.korean >= cut - 500).length;
    if (thin.length >= 10 && band / thin.length >= 0.9) {
      console.log(`⚠ thin ${thin.length}편 중 ${band}편이 컷 바로 아래 500자 안에 뭉쳐 있다 — 자수 계산 버그를 먼저 의심할 것`);
    }

    const show = wantList ? thin : exposed;
    if (show.length) {
      console.log(wantList ? `\nthin 전체 ${show.length}편:` : `\n🔴 색인 열린 thin ${show.length}편 (즉시 조치 대상):`);
      show.sort((a, b) => (b.imp - a.imp) || (a.korean - b.korean));
      for (const p of show) {
        const g = gscOk ? ` imp${String(p.imp).padStart(5)} clk${String(p.clicks).padStart(3)}` : '';
        console.log(`  ${String(p.korean).padStart(5)}자 (-${cut - p.korean})${g} ${p.noindex ? 'NI ' : '   '}${p.slug}`);
      }
    } else if (!wantList) {
      console.log('✅ 색인 열린 thin 없음');
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
