/**
 * 성장 대시보드 수집기 — GSC(들어오기 전)를 11사이트 한 화면에 모은다.
 *
 * 왜 만들었나: 방문자·페이지뷰만 보는 대시보드는 "어디를 보완할지"를 알려주지 않는다.
 * 진단은 세 갈래로 갈리는데, 그 갈림을 만들려면 GSC 가 있어야 한다.
 *   1) 노출이 아예 없다            → 색인 문제      (지표: 노출 잡힌 페이지 / 사이트맵 URL)
 *   2) 노출은 있는데 클릭이 0      → 제목·설명 문제 (지표: imp>=THRESH & clicks=0 페이지)
 *   3) 들어오는데 금방 나간다      → 본문 문제      (여기엔 없다. 자체 비콘 대시보드가 본다)
 * 그리고 키워드 확장 후보는 "평균순위 11~20 + 노출 있음" 쿼리다(한 걸음 남은 것).
 *
 * 사용:
 *   cd saju-blog && npx tsx scripts/growth-dashboard.ts
 *   cd saju-blog && npx tsx scripts/growth-dashboard.ts --start 2026-07-10 --end 2026-08-06
 *   cd saju-blog && npx tsx scripts/growth-dashboard.ts --sites baby-blog,ai-blog
 *   cd saju-blog && npx tsx scripts/growth-dashboard.ts --country all      # 국가 필터 해제
 *
 * 산출물: reports/growth-dashboard.json  ·  reports/growth-dashboard.html (자체완결·더블클릭으로 열림)
 *          🔴 out/ 에 쓰면 안 된다 — 배포 산출물이라 빌드 때 지워진다.
 *
 * 🔴 창(window)을 바꾸면 값이 바뀐다. 회차 간 비교는 반드시 같은 창으로 할 것.
 * 🔴 GSC 는 희소 쿼리를 익명화하므로 쿼리 카운트는 항상 하한이다.
 * 🔴 "들어온 뒤"(체류·스크롤·이탈)는 여기서 다루지 않는다. GA4 는 쓰지 않기로 했고(2026-08-06 결정),
 *    그 자리는 자체 비콘 대시보드가 맡는다 → 사이트/blog-analytics (Worker + D1).
 */
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
// 🔴 out/ 에 쓰지 말 것 — next.config 가 output:"export" 라 out/ 은 배포 산출물이고 다음 빌드에 지워진다.
const OUT_DIR = path.join(process.cwd(), 'reports');
const SITES_ROOT = path.join(process.cwd(), '..');

type Site = {
  name: string;
  siteUrl: string;     // GSC 속성
  repoDir: string;     // 사이트맵을 읽기 위한 레포 폴더명 (🔴 lottohanpan = lotto)
};

const SITES: Site[] = [
  { name: 'ai-blog',     siteUrl: 'sc-domain:how-toai.com',              repoDir: 'ai-blog' },
  { name: 'saju-blog',   siteUrl: 'https://www.sajubokastory.com/',      repoDir: 'saju-blog' },
  { name: 'easy-zetec',  siteUrl: 'sc-domain:easyzetec.com',             repoDir: 'easy-zetec' },
  { name: 'baby-blog',   siteUrl: 'sc-domain:babytodak.com',             repoDir: 'baby-blog' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/',     repoDir: 'health-blog' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com',           repoDir: 'bukbukstock' },
  { name: 'coinday',     siteUrl: 'sc-domain:coindaynow.com',            repoDir: 'coinday' },
  { name: 'quicktools',  siteUrl: 'sc-domain:toolkio.com',               repoDir: 'quicktools' },
  { name: 'tokennara',   siteUrl: 'sc-domain:tokennara.com',             repoDir: 'tokennara' },
  { name: 'altnara',     siteUrl: 'sc-domain:altnara.com',               repoDir: 'altnara' },
  { name: 'lottohanpan', siteUrl: 'sc-domain:lottohanpan.com',           repoDir: 'lotto' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const shift = (iso: string, n: number) => fmt(new Date(new Date(iso).getTime() + n * 86400000));

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const END = arg('end', daysAgo(3));                    // GSC 는 약 3일 지연된다
const START = arg('start', shift(END, -27));           // 28일 창
const PREV_END = shift(START, -1);
const PREV_START = shift(PREV_END, -27);
const COUNTRY = arg('country', 'kor');                 // 'all' 이면 필터 해제
const ONLY = arg('sites', '').split(',').map(s => s.trim()).filter(Boolean);
const NOCLICK_MIN_IMP = parseInt(arg('noclick-min-imp', '30'), 10);
const STRIKING_MIN_IMP = parseInt(arg('striking-min-imp', '10'), 10);

const targets = ONLY.length ? SITES.filter(s => ONLY.includes(s.name)) : SITES;

// ── 색인 표면적의 분모: 사이트맵 URL 수 ─────────────────────────────────────
// 🔴 mdx 개수를 세면 안 된다. quicktools·lottohanpan 처럼 코드로 페이지를 만드는 사이트는 mdx 가 0이다.
//    분모로 옳은 것은 "우리가 색인해 달라고 낸 URL", 즉 사이트맵이다.
//    (레포마다 산출 위치가 달라 public/ 과 out/ 을 모두 본다)
function countIndexableUrls(repoDir: string): { count: number | null; source: string | null } {
  const candidates = ['public/sitemap.xml', 'out/sitemap.xml', 'public/sitemap-0.xml', 'out/sitemap-0.xml'];
  for (const rel of candidates) {
    const p = path.join(SITES_ROOT, repoDir, rel);
    if (!fs.existsSync(p)) continue;
    const xml = fs.readFileSync(p, 'utf8');
    const n = (xml.match(/<loc>/g) || []).length;
    if (n > 0) return { count: n, source: rel };
  }
  return { count: null, source: null };
}

// ── GSC ────────────────────────────────────────────────────────────────────
type Row = { keys?: string[] | null; clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null };

function countryFilter() {
  if (COUNTRY === 'all') return undefined;
  return [{ filters: [{ dimension: 'country', operator: 'equals', expression: COUNTRY }] }];
}

async function gscQuery(sc: any, siteUrl: string, startDate: string, endDate: string, dimensions: string[], rowLimit = 25000): Promise<Row[]> {
  const out: Row[] = [];
  let startRow = 0;
  for (;;) {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions, rowLimit: Math.min(rowLimit, 25000), startRow, dimensionFilterGroups: countryFilter() },
    });
    const rows: Row[] = res.data.rows || [];
    out.push(...rows);
    if (rows.length < Math.min(rowLimit, 25000) || out.length >= rowLimit) break;
    startRow += rows.length;
  }
  return out;
}

/**
 * 🔴🔴 GSC 의 page 차원은 앵커(#섹션)를 별개 URL 로 센다.
 * 구글이 SERP 에 "섹션으로 바로가기"를 붙이면 같은 글이 `...#소제목` 으로 여러 행 나오고,
 * 클릭은 기본 URL 행에만 쌓여 앵커 행은 전부 클릭 0 이 된다.
 *
 * 🔴🔴 그런데 여기서 앵커 노출을 "합치면" 안 된다. 같은 SERP 결과 하나를 섹션 수만큼 세는 꼴이라
 *      노출이 부풀고 CTR 이 바닥으로 찍힌다. 실측(easy-zetec 2026-08-06):
 *        기본 URL  2,789 노출 / 28 클릭 → CTR 1.00%
 *        앵커 9행  8,129 노출 /  0 클릭
 *        둘을 더하면 10,918 / 28 = 0.26% 로 네 배 왜곡된다.
 *      그래서 기본 URL 행을 이 결과의 실제 값으로 쓰고, 앵커는 참고치로만 따로 담는다.
 *      (기본 행이 아예 없는 페이지만 앵커 값으로 대신한다)
 */
function mergeByPage(rows: Row[]): Row[] {
  type Acc = { base: Row | null; anchorImp: number; anchorClicks: number; anchorRows: number };
  const m = new Map<string, Acc>();
  for (const r of rows) {
    const raw = r.keys?.[0] || '';
    const url = raw.split('#')[0];
    const cur = m.get(url) || { base: null, anchorImp: 0, anchorClicks: 0, anchorRows: 0 };
    if (raw === url) cur.base = r;
    else { cur.anchorImp += r.impressions || 0; cur.anchorClicks += r.clicks || 0; cur.anchorRows++; }
    m.set(url, cur);
  }
  return [...m.entries()].map(([url, v]) => {
    // 기본 URL 행이 있으면 그것이 이 결과의 실제 노출·클릭이다.
    // 기본 행이 없는 페이지(앵커로만 잡힌 경우)만 앵커 최댓값으로 대신한다.
    const b = v.base;
    const impressions = b ? (b.impressions || 0) : v.anchorImp;
    const clicks = b ? (b.clicks || 0) : v.anchorClicks;
    const position = b ? (b.position || 0) : 0;
    return {
      keys: [url], clicks, impressions,
      ctr: impressions ? clicks / impressions : 0,
      position,
      anchorImpressions: v.anchorImp,
      anchorRows: v.anchorRows,
      baseRowMissing: !b,
    } as Row & { anchorImpressions: number; anchorRows: number; baseRowMissing: boolean };
  });
}

function totals(rows: Row[]) {
  const clicks = rows.reduce((a, r) => a + (r.clicks || 0), 0);
  const impressions = rows.reduce((a, r) => a + (r.impressions || 0), 0);
  // 평균순위는 노출 가중 평균이어야 한다 (단순 평균은 희소 쿼리에 끌려간다)
  const wpos = impressions ? rows.reduce((a, r) => a + (r.position || 0) * (r.impressions || 0), 0) / impressions : 0;
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: wpos };
}

// ── 본체 ───────────────────────────────────────────────────────────────────
async function main() {
  const scAuth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const sc = google.webmasters({ version: 'v3', auth: scAuth as any });


  const report: any = {
    generatedAt: new Date().toISOString(),
    window: { start: START, end: END, prevStart: PREV_START, prevEnd: PREV_END, country: COUNTRY },
    thresholds: { noClickMinImpressions: NOCLICK_MIN_IMP, strikingMinImpressions: STRIKING_MIN_IMP },
    sites: [] as any[],
  };

  for (const s of targets) {
    process.stdout.write(`· ${s.name} `);
    try {
      const [pagesRaw, queries, prevAll] = await Promise.all([
        gscQuery(sc, s.siteUrl, START, END, ['page']),
        gscQuery(sc, s.siteUrl, START, END, ['query']),
        gscQuery(sc, s.siteUrl, PREV_START, PREV_END, ['date']),
      ]);

      const pages = mergeByPage(pagesRaw);   // 🔴 앵커(#) 행 합치기 — 위 mergeByPage 주석 참조
      const anchorRowsMerged = pagesRaw.length - pages.length;
      const now = totals(pages);
      const prev = totals(prevAll);
      const idx = countIndexableUrls(s.repoDir);
      const postCount = idx.count;

      // 1) 색인 문제 — 노출이 한 번이라도 잡힌 페이지 / 전체 글
      const pagesWithImpressions = pages.filter(r => (r.impressions || 0) > 0).length;

      // 2) 제목·설명 문제 — 노출은 쌓였는데 클릭이 0
      const noClick = pages
        .filter(r => (r.impressions || 0) >= NOCLICK_MIN_IMP && (r.clicks || 0) === 0)
        .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
        .slice(0, 15)
        .map(r => ({ url: r.keys?.[0] || '', impressions: r.impressions || 0, position: +(r.position || 0).toFixed(1) }));

      // 3) 키워드 확장 후보 — 한 걸음 남은 쿼리(11~20위)
      const striking = queries
        .filter(r => (r.position || 0) > 10 && (r.position || 0) <= 20 && (r.impressions || 0) >= STRIKING_MIN_IMP)
        .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
        .slice(0, 15)
        .map(r => ({ query: r.keys?.[0] || '', impressions: r.impressions || 0, clicks: r.clicks || 0, position: +(r.position || 0).toFixed(1) }));

      // 4) 이미 1페이지 — 지켜야 할 것
      const page1 = queries.filter(r => (r.position || 0) > 0 && (r.position || 0) <= 10);
      const topPage1 = page1
        .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
        .slice(0, 15)
        .map(r => ({ query: r.keys?.[0] || '', impressions: r.impressions || 0, clicks: r.clicks || 0, position: +(r.position || 0).toFixed(1) }));

      const topPages = pages
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.impressions || 0) - (a.impressions || 0))
        .slice(0, 15)
        .map(r => ({ url: r.keys?.[0] || '', clicks: r.clicks || 0, impressions: r.impressions || 0, position: +(r.position || 0).toFixed(1) }));

      report.sites.push({
        name: s.name, siteUrl: s.siteUrl,
        totals: { ...now, prevClicks: prev.clicks, prevImpressions: prev.impressions },
        index: { postCount, sitemapSource: idx.source, pagesWithImpressions, coverage: postCount ? pagesWithImpressions / postCount : null },
        queryCounts: { total: queries.length, page1: page1.length, striking: striking.length },
        anchorRowsMerged,
        noClick, striking, topPage1, topPages,
      });
      console.log(`imp ${now.impressions} · clk ${now.clicks} · 색인표면 ${pagesWithImpressions}/${postCount ?? '?'}`);
    } catch (e: any) {
      console.log(`ERR ${e?.errors?.[0]?.message || e?.message || e}`);
      report.sites.push({ name: s.name, error: String(e?.errors?.[0]?.message || e?.message || e).slice(0, 300) });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'growth-dashboard.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  const htmlPath = path.join(OUT_DIR, 'growth-dashboard.html');
  fs.writeFileSync(htmlPath, renderHtml(report), 'utf8');

  console.log(`\n✅ ${jsonPath}`);
  console.log(`✅ ${htmlPath}  ← 더블클릭으로 열면 됩니다`);
}

// ── HTML (자체완결 · 외부 요청 0) ───────────────────────────────────────────
function renderHtml(r: any): string {
  const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const pct = (v: number) => (v * 100).toFixed(1) + '%';
  const delta = (now: number, prev: number) => {
    if (!prev && !now) return '<span class="d0">—</span>';
    if (!prev) return '<span class="up">신규</span>';
    const d = ((now - prev) / prev) * 100;
    const cls = d > 2 ? 'up' : d < -2 ? 'down' : 'd0';
    return `<span class="${cls}">${d >= 0 ? '+' : ''}${d.toFixed(0)}%</span>`;
  };
  const shortUrl = (u: string) => { try { return decodeURIComponent(new URL(u).pathname); } catch { return u; } };

  const ok = r.sites.filter((s: any) => !s.error);
  const net = ok.reduce((a: any, s: any) => ({
    clicks: a.clicks + s.totals.clicks, impressions: a.impressions + s.totals.impressions,
    prevClicks: a.prevClicks + s.totals.prevClicks, prevImpressions: a.prevImpressions + s.totals.prevImpressions,
    posts: a.posts + (s.index.postCount || 0), indexed: a.indexed + s.index.pagesWithImpressions,
    page1: a.page1 + s.queryCounts.page1, striking: a.striking + s.queryCounts.striking,
  }), { clicks: 0, impressions: 0, prevClicks: 0, prevImpressions: 0, posts: 0, indexed: 0, page1: 0, striking: 0 });

  const siteRows = ok.map((s: any) => {
    const cov = s.index.coverage;
    const covCls = cov === null ? 'd0' : cov < 0.2 ? 'bad' : cov < 0.5 ? 'warn' : 'good';
    return `<tr>
      <td><b>${esc(s.name)}</b></td>
      <td class="num">${s.totals.impressions.toLocaleString()} ${delta(s.totals.impressions, s.totals.prevImpressions)}</td>
      <td class="num">${s.totals.clicks.toLocaleString()} ${delta(s.totals.clicks, s.totals.prevClicks)}</td>
      <td class="num">${pct(s.totals.ctr)}</td>
      <td class="num">${s.totals.position.toFixed(1)}</td>
      <td class="num ${covCls}">${s.index.pagesWithImpressions}/${s.index.postCount ?? '?'}${cov !== null ? ` <small>(${pct(cov)})</small>` : ''}</td>
      <td class="num">${s.queryCounts.page1}</td>
      <td class="num">${s.queryCounts.striking}</td>
    </tr>`;
  }).join('');

  const detail = ok.map((s: any) => {
    const rows = (arr: any[], cols: string[]) => arr.length
      ? arr.map(x => `<tr>${cols.map(c => c === 'query' || c === 'url'
          ? `<td class="txt">${esc(c === 'url' ? shortUrl(x[c]) : x[c])}</td>`
          : `<td class="num">${esc(x[c])}</td>`).join('')}</tr>`).join('')
      : `<tr><td class="na" colspan="${cols.length}">해당 없음</td></tr>`;
    return `<section class="site">
      <h3>${esc(s.name)} <small>${esc(s.siteUrl)}</small></h3>
      <div class="grid3">
        <div class="card">
          <h4>🔧 제목·설명을 고칠 글</h4>
          <p class="hint">노출 ${r.thresholds.noClickMinImpressions}회 이상인데 클릭 0 — 검색결과에 뜨는데 안 눌립니다.</p>
          <table><thead><tr><th>페이지</th><th>노출</th><th>순위</th></tr></thead>
          <tbody>${rows(s.noClick, ['url', 'impressions', 'position'])}</tbody></table>
        </div>
        <div class="card">
          <h4>🎯 한 걸음 남은 키워드</h4>
          <p class="hint">평균순위 11~20위 — 여기를 보강하면 1페이지로 올라갑니다. <b>확장 1순위</b>.</p>
          <table><thead><tr><th>쿼리</th><th>노출</th><th>클릭</th><th>순위</th></tr></thead>
          <tbody>${rows(s.striking, ['query', 'impressions', 'clicks', 'position'])}</tbody></table>
        </div>
        <div class="card">
          <h4>🛡 이미 1페이지</h4>
          <p class="hint">지켜야 할 쿼리 — 같은 주제로 새 글을 쓰면 자기잠식입니다.</p>
          <table><thead><tr><th>쿼리</th><th>노출</th><th>클릭</th><th>순위</th></tr></thead>
          <tbody>${rows(s.topPage1, ['query', 'impressions', 'clicks', 'position'])}</tbody></table>
        </div>
      </div>
    </section>`;
  }).join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>블로그 네트워크 성장 대시보드</title>
<style>
:root{--bg:#fff;--fg:#111;--mut:#666;--line:#e5e5e5;--card:#fafafa;--up:#0a7d33;--down:#c0392b;--bad:#c0392b;--warn:#b8860b;--good:#0a7d33;--acc:#4f46e5}
@media(prefers-color-scheme:dark){:root{--bg:#111418;--fg:#e8e8e8;--mut:#9aa0a6;--line:#2a2f36;--card:#181c22;--up:#4ade80;--down:#f87171;--bad:#f87171;--warn:#fbbf24;--good:#4ade80;--acc:#818cf8}}
:root[data-theme=dark]{--bg:#111418;--fg:#e8e8e8;--mut:#9aa0a6;--line:#2a2f36;--card:#181c22;--up:#4ade80;--down:#f87171;--bad:#f87171;--warn:#fbbf24;--good:#4ade80;--acc:#818cf8}
:root[data-theme=light]{--bg:#fff;--fg:#111;--mut:#666;--line:#e5e5e5;--card:#fafafa;--up:#0a7d33;--down:#c0392b;--bad:#c0392b;--warn:#b8860b;--good:#0a7d33;--acc:#4f46e5}
*{box-sizing:border-box}body{margin:0;padding:24px;background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,'Segoe UI','Malgun Gothic',sans-serif}
h1{font-size:20px;margin:0 0 4px}h3{font-size:16px;margin:28px 0 10px;border-bottom:2px solid var(--acc);padding-bottom:6px}
h3 small{font-weight:400;color:var(--mut);font-size:12px;margin-left:8px}h4{font-size:13px;margin:0 0 4px}
.meta{color:var(--mut);font-size:12px;margin-bottom:16px}
.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 20px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-width:120px}
.kpi .l{font-size:11px;color:var(--mut)}.kpi .v{font-size:20px;font-weight:700}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;white-space:nowrap}
th{color:var(--mut);font-weight:600;font-size:11.5px}
td.num{text-align:right;font-variant-numeric:tabular-nums}
td.txt{max-width:280px;overflow:hidden;text-overflow:ellipsis}
.up{color:var(--up);font-size:11px}.down{color:var(--down);font-size:11px}.d0{color:var(--mut);font-size:11px}
.bad{color:var(--bad);font-weight:700}.warn{color:var(--warn);font-weight:700}.good{color:var(--good);font-weight:700}
.na{color:var(--mut);text-align:center}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;overflow-x:auto}
.hint{color:var(--mut);font-size:11.5px;margin:0 0 8px}
.notice{background:var(--card);border:1px solid var(--warn);border-radius:10px;padding:12px 16px;margin:12px 0 20px;font-size:13px}
.notice ol{margin:8px 0 4px 20px}.notice code{background:var(--bg);padding:1px 5px;border-radius:4px;font-size:11.5px}
.legend{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;font-size:12.5px;margin-bottom:8px}
.legend b{color:var(--acc)}
</style></head><body>
<h1>블로그 네트워크 성장 대시보드</h1>
<div class="meta">창 ${r.window.start} ~ ${r.window.end} (28일) · 직전 창 ${r.window.prevStart} ~ ${r.window.prevEnd} 대비 · 국가 ${r.window.country} · 생성 ${new Date(r.generatedAt).toLocaleString('ko-KR')}</div>

<div class="legend">
<b>읽는 법</b> — 진단은 세 갈래로 갈립니다.
<b>색인 표면</b>이 낮으면 <b>색인 문제</b>(글이 검색에 안 뜸) · 노출은 있는데 클릭이 0이면 <b>제목·설명 문제</b> 입니다. 들어온 뒤(체류·스크롤·이탈)는 자체 비콘 대시보드에서 봅니다.
키워드를 늘릴 자리는 <b>한 걸음 남은 키워드(11~20위)</b>입니다.
</div>


<div class="kpis">
  <div class="kpi"><div class="l">총 노출</div><div class="v">${net.impressions.toLocaleString()}</div><div>${delta(net.impressions, net.prevImpressions)}</div></div>
  <div class="kpi"><div class="l">총 클릭</div><div class="v">${net.clicks.toLocaleString()}</div><div>${delta(net.clicks, net.prevClicks)}</div></div>
  <div class="kpi"><div class="l">색인 표면</div><div class="v">${net.indexed}/${net.posts}</div><div class="d0">${net.posts ? pct(net.indexed / net.posts) : '—'}</div></div>
  <div class="kpi"><div class="l">1페이지 쿼리</div><div class="v">${net.page1}</div></div>
  <div class="kpi"><div class="l">한 걸음 남음</div><div class="v">${net.striking}</div><div class="d0">확장 후보</div></div>
</div>

<div class="wrap"><table>
<thead><tr>
<th>사이트</th><th style="text-align:right">노출</th><th style="text-align:right">클릭</th><th style="text-align:right">CTR</th><th style="text-align:right">평균순위</th>
<th style="text-align:right">색인 표면</th><th style="text-align:right">1p 쿼리</th><th style="text-align:right">11~20위</th>
</tr></thead>
<tbody>${siteRows}</tbody></table></div>

${detail}

<p class="meta" style="margin-top:28px">🔴 창을 바꾸면 값이 바뀝니다. 회차 간 비교는 같은 창으로만 하세요. 🔴 GSC 는 희소 쿼리를 익명화하므로 쿼리 수는 항상 하한입니다.</p>
</body></html>`;
}

main().catch(e => { console.error(e); process.exit(1); });
