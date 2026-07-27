// GumKit 성적표 한 방에 — 설치 수 + 검색 노출/클릭/순위 + 색인 상태 (2026-07-27 신설)
//
// 사용:
//   cd saju-blog
//   npx tsx scripts/gumkit-report.ts            # 스토어 + 검색 (빠름, ~10초)
//   npx tsx scripts/gumkit-report.ts --index    # + 사이트맵 전 URL 색인 상태 (URL당 ~1초)
//
// 왜 있나: gumkit.app 의 GSC 속성 소유자가 서비스계정(blog-growth-report)이라
//   대표 개인 계정으로는 Search Console UI 에 뜨지 않는다. 속성을 따로 열기 전까지
//   숫자를 보는 유일한 경로다. (속성을 열어도 이 스크립트가 더 빠르다 — 한 화면에 다 나온다)
//
// 🔴 GSC 데이터는 최신 3일이 비어 있다(구글 집계 지연). 그래서 창을 항상 D-31~D-3 으로 고정한다.

import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');
const SITE = 'sc-domain:gumkit.app';
const ORIGIN = 'https://gumkit.app';
const STORE_URL = 'https://chromewebstore.google.com/detail/gumkit/docjepaccjkknbjlelmcgmdchkaemipb';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
const pad = (v: unknown, n: number) => String(v).padStart(n);
const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? '—' : '신규') : `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(0)}%`);

async function store() {
  console.log('\n━━━ 확장 프로그램 (크롬 웹스토어) ━━━');
  try {
    const html = await (await fetch(STORE_URL, { headers: { 'User-Agent': UA } })).text();
    const users = html.match(/([\d,]+)\s*users?/)?.[1] ?? '?';
    const version = html.match(/Version<\/div><div[^>]*>([^<]+)</)?.[1] ?? '?';
    const updated = html.match(/Updated<\/div><div>([^<]+)</)?.[1] ?? '?';
    const rating = /No ratings/.test(html) ? '평점 없음' : (html.match(/([\d.]+)\s*out of 5/)?.[1] ?? '?');
    console.log(`  설치 ${users}명 · ${rating} · v${version} · 최종 업데이트 ${updated}`);
    console.log(`  ${STORE_URL}`);
  } catch (e) {
    console.log(`  ⚠ 스토어 페이지 조회 실패: ${(e as Error).message}`);
  }
}

async function search() {
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const sc = google.searchconsole({ version: 'v1', auth });
  const q = async (dims: string[], start: string, end: string, rowLimit = 200) =>
    (await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: start, endDate: end, dimensions: dims, rowLimit } })).data.rows || [];

  const [cur] = await q([], day(31), day(3), 1);
  const [prev] = await q([], day(59), day(32), 1);
  const c = cur || {}, p = prev || {};

  console.log(`\n━━━ 검색 (Google, 28일: ${day(31)} ~ ${day(3)}) ━━━`);
  console.log(`  노출 ${c.impressions || 0}  (직전 28일 ${p.impressions || 0} · ${pct(c.impressions || 0, p.impressions || 0)})`);
  console.log(`  클릭 ${c.clicks || 0}  (직전 28일 ${p.clicks || 0} · ${pct(c.clicks || 0, p.clicks || 0)})`);
  console.log(`  CTR ${((c.ctr || 0) * 100).toFixed(1)}% · 평균순위 ${(c.position || 0).toFixed(1)}위`);

  const queries = await q(['query'], day(31), day(3));
  const top = queries.filter((r) => (r.position || 99) <= 20).sort((a, b) => (a.position || 0) - (b.position || 0));
  console.log(`\n  ▸ 20위 안에 든 쿼리 ${top.length}개 ${top.length ? '' : '(없음)'}`);
  for (const r of top) console.log(`     ${pad((r.position || 0).toFixed(1), 5)}위  노출${pad(r.impressions, 4)} 클릭${pad(r.clicks, 3)}  ${r.keys?.[0]}`);

  const deep = queries.filter((r) => (r.position || 0) > 20).sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 6);
  if (deep.length) {
    console.log(`\n  ▸ 수요는 큰데 순위가 깊은 쿼리 (보강 후보)`);
    for (const r of deep) console.log(`     ${pad((r.position || 0).toFixed(1), 5)}위  노출${pad(r.impressions, 4)} 클릭${pad(r.clicks, 3)}  ${r.keys?.[0]}`);
  }
  // 🔑 쿼리 합계는 항상 총 노출보다 작다 — 구글이 소량 쿼리를 익명화해서 뺀다. 둘을 같은 수로 착각하지 말 것.
  const qImp = queries.reduce((s, r) => s + (r.impressions || 0), 0);
  console.log(`\n  (쿼리로 잡힌 노출 ${qImp} / 전체 ${c.impressions || 0} — 차이는 구글 익명화분)`);

  const pages = (await q(['page'], day(31), day(3))).sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  console.log(`\n  ▸ 페이지별 (상위 10)`);
  for (const r of pages.slice(0, 10)) {
    console.log(`     노출${pad(r.impressions, 4)} 클릭${pad(r.clicks, 3)} ${pad((r.position || 0).toFixed(1), 5)}위  ${(r.keys?.[0] || '').replace(ORIGIN, '') || '/'}`);
  }
}

async function indexStatus() {
  console.log('\n━━━ 색인 상태 (URL Inspection) ━━━');
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/webmasters'] });
  const sc = google.searchconsole({ version: 'v1', auth: (await auth.getClient()) as never });
  const sm = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  const urls = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  let ok = 0;
  const bad: string[] = [];
  for (const url of urls) {
    try {
      const res = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl: SITE } });
      const r = res.data.inspectionResult?.indexStatusResult;
      const state = r?.coverageState || '?';
      if (r?.verdict === 'PASS') ok++; else bad.push(`${state.padEnd(34)} ${url.replace(ORIGIN, '')}`);
    } catch (e) {
      bad.push(`조회실패(${(e as Error).message.slice(0, 30)})  ${url.replace(ORIGIN, '')}`);
    }
  }
  console.log(`  색인됨 ${ok}/${urls.length}`);
  for (const b of bad) console.log(`    🟡 ${b}`);
}

(async () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  GumKit 성적표                               ║');
  console.log('╚══════════════════════════════════════════════╝');
  await store();
  await search();
  if (process.argv.includes('--index')) await indexStatus();
  else console.log('\n(색인 상태까지 보려면 --index 를 붙일 것 — URL 수만큼 시간이 걸린다)');
  console.log('');
})().catch((e) => { console.error(e); process.exit(1); });
