/**
 * bukbukstock 색인/순위 회귀 정밀 진단 (2026-06-09)
 * - 주별 시계열(언제 떨어졌나) + 페이지별 prior vs recent(어느 글이 죽었나)
 * - 쿼리별 비교 + 사이트맵 + URL Inspection(디인덱싱 vs 순위하락 판정)
 * 사용법: cd saju-blog && npx tsx scripts/gsc-bukbuk-regression.ts
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const SITE = 'sc-domain:bukbukstock.com';
const SITEMAP = 'https://www.bukbukstock.com/sitemap.xml';

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;          // Mon=0
  d.setUTCDate(d.getUTCDate() - day);            // back to Monday
  return fmt(d);                                 // week-start date
}

async function q(sc: any, body: any) {
  const r = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: body });
  return r.data.rows || [];
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth: await auth.getClient() as any });

  const recentStart = daysAgo(31), recentEnd = daysAgo(3);
  const priorStart = daysAgo(59), priorEnd = daysAgo(32);

  console.log('=== bukbukstock 색인/순위 회귀 진단 ===');
  console.log(`recent : ${recentStart} ~ ${recentEnd}`);
  console.log(`prior  : ${priorStart} ~ ${priorEnd}\n`);

  // 1) 전체 prior vs recent
  const tot = async (s: string, e: string) => {
    const r = await q(sc, { startDate: s, endDate: e, rowLimit: 1 });
    const t = r[0]; return t ? { imp: t.impressions, clk: t.clicks, pos: (t.position || 0).toFixed(1) } : { imp: 0, clk: 0, pos: '-' };
  };
  const pr = await tot(priorStart, priorEnd), rc = await tot(recentStart, recentEnd);
  console.log('[전체 28일]');
  console.log(`  prior  : 노출 ${pr.imp} / 클릭 ${pr.clk} / 평균순위 ${pr.pos}`);
  console.log(`  recent : 노출 ${rc.imp} / 클릭 ${rc.clk} / 평균순위 ${rc.pos}`);
  console.log(`  Δ노출  : ${(rc.imp - pr.imp)} (${pr.imp ? (((rc.imp - pr.imp) / pr.imp) * 100).toFixed(0) : '-'}%)\n`);

  // 2) 주별 시계열 (최근 ~13주)
  console.log('[주별 노출 시계열 (월요일 기준 주 시작)]');
  const days = await q(sc, { startDate: daysAgo(92), endDate: daysAgo(3), dimensions: ['date'], rowLimit: 500 });
  const weekly: Record<string, { imp: number; clk: number }> = {};
  for (const row of days) {
    const w = isoWeek(row.keys[0]);
    weekly[w] = weekly[w] || { imp: 0, clk: 0 };
    weekly[w].imp += row.impressions; weekly[w].clk += row.clicks;
  }
  Object.keys(weekly).sort().forEach((w) => {
    const bar = '█'.repeat(Math.min(50, Math.round(weekly[w].imp / 10)));
    console.log(`  ${w}  노출 ${String(weekly[w].imp).padStart(5)} 클릭 ${String(weekly[w].clk).padStart(3)}  ${bar}`);
  });
  console.log();

  // 3) 페이지별 prior vs recent
  const pagePrior = await q(sc, { startDate: priorStart, endDate: priorEnd, dimensions: ['page'], rowLimit: 200, orderBy: [{ field: 'impressions', descending: true }] });
  const pageRecent = await q(sc, { startDate: recentStart, endDate: recentEnd, dimensions: ['page'], rowLimit: 200 });
  const recMap: Record<string, { imp: number; pos: number }> = {};
  for (const r of pageRecent) recMap[r.keys[0]] = { imp: r.impressions, pos: r.position };
  console.log('[prior 상위 페이지 → recent 변화 (노출 죽은 글 = 색인이탈/순위상실 후보)]');
  pagePrior.slice(0, 20).forEach((r: any) => {
    const u = r.keys[0].replace('https://www.bukbukstock.com', '');
    const rec = recMap[r.keys[0]];
    const recImp = rec ? rec.imp : 0;
    const flag = recImp === 0 ? ' ⛔DROP→0' : (recImp < r.impressions * 0.3 ? ' ⚠️-70%+' : '');
    console.log(`  ${String(r.impressions).padStart(4)}→${String(recImp).padStart(3)}  pos ${(r.position||0).toFixed(0)}→${rec ? rec.pos.toFixed(0) : '-'}  ${u}${flag}`);
  });
  const priorPages = new Set(pagePrior.map((r: any) => r.keys[0]));
  const recentPages = new Set(pageRecent.map((r: any) => r.keys[0]));
  const dropped = [...priorPages].filter((p) => !recentPages.has(p));
  console.log(`\n  prior에 노출됐다가 recent에 노출 0이 된 페이지: ${dropped.length}개 / prior 총 ${priorPages.size}개`);
  console.log();

  // 4) 쿼리별 prior vs recent
  const qPrior = await q(sc, { startDate: priorStart, endDate: priorEnd, dimensions: ['query'], rowLimit: 15, orderBy: [{ field: 'impressions', descending: true }] });
  const qRecentRows = await q(sc, { startDate: recentStart, endDate: recentEnd, dimensions: ['query'], rowLimit: 200 });
  const qRec: Record<string, number> = {};
  for (const r of qRecentRows) qRec[r.keys[0]] = r.impressions;
  console.log('[prior 상위 쿼리 → recent 노출]');
  qPrior.slice(0, 12).forEach((r: any) => {
    const recImp = qRec[r.keys[0]] || 0;
    const flag = recImp === 0 ? ' ⛔→0' : '';
    console.log(`  ${String(r.impressions).padStart(4)}→${String(recImp).padStart(3)}  pos ${(r.position||0).toFixed(0)}  "${r.keys[0]}"${flag}`);
  });
  console.log();

  // 5) 사이트맵
  console.log('[Sitemap]');
  try {
    const sm = await sc.sitemaps.get({ siteUrl: SITE, feedpath: SITEMAP });
    const web = (sm.data.contents || []).find((c: any) => c.type === 'web') as any;
    console.log(`  제출 URL: ${web?.submitted || '?'} / lastDownloaded ${sm.data.lastDownloaded?.slice(0,10)} / 에러 ${sm.data.errors||0} / 경고 ${sm.data.warnings||0} / pending ${sm.data.isPending}`);
  } catch (e: any) { console.log('  ERR', e.message?.slice(0, 80)); }
  console.log();

  // 6) URL Inspection — prior 상위 5개 페이지 실제 색인상태 (디인덱싱 판정)
  console.log('[URL Inspection — prior 상위 5 페이지 실제 색인상태]');
  for (const r of pagePrior.slice(0, 5)) {
    const url = r.keys[0];
    try {
      const res = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl: SITE } });
      const ix = res.data.inspectionResult?.indexStatusResult || {};
      console.log(`  ${url.replace('https://www.bukbukstock.com','')}`);
      console.log(`     verdict=${ix.verdict} coverage="${ix.coverageState}" robots=${ix.robotsTxtState} indexing=${ix.indexingState} lastCrawl=${ix.lastCrawlTime?.slice(0,10)}`);
    } catch (e: any) {
      console.log(`  ${url} → INSPECT ERR ${e.message?.slice(0,70)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
