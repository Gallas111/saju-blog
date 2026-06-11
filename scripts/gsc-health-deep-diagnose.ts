/**
 * health-blog 정밀 진단 — 색인·키워드·순위 분포·카테고리 강약
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const SITE_URL = 'https://www.wellnesstodays.com/';

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth: await auth.getClient() as any });

  const start = daysAgo(92);
  const end = daysAgo(2);

  // 1. 총합 (90일)
  const total = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, rowLimit: 1 },
  });
  const t = total.data.rows?.[0] || { impressions: 0, clicks: 0, ctr: 0, position: 0 };
  console.log('\n═══ 90일 총합 ═══');
  console.log(`  노출: ${t.impressions} | 클릭: ${t.clicks} | CTR: ${((t.ctr || 0) * 100).toFixed(2)}% | 평균순위: ${(t.position || 0).toFixed(1)}`);

  // 2. Sitemap status
  console.log('\n═══ Sitemap & 색인 ═══');
  try {
    const sm = await sc.sitemaps.get({ siteUrl: SITE_URL, feedpath: `${SITE_URL}sitemap.xml` });
    const web = (sm.data.contents || []).find((c: any) => c.type === 'web') as any;
    console.log(`  sitemap 제출: ${web?.submitted || '?'}건 / indexed: ${web?.indexed || '0'}건`);
    console.log(`  lastDownloaded: ${sm.data.lastDownloaded}`);
    console.log(`  pending: ${sm.data.isPending}`);
  } catch (e: any) { console.log('  ERR', e.message?.slice(0, 80)); }

  // 3. 노출 발생 키워드 top 30 (90일)
  console.log('\n═══ 90일 노출 키워드 top 30 ═══');
  const topQ = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 30, orderBy: [{ field: 'impressions', descending: true } as any] },
  });
  for (const r of (topQ.data.rows || [])) {
    const q = (r.keys?.[0] || '').slice(0, 32).padEnd(34);
    console.log(`  ${q} imp=${(r.impressions || 0).toString().padStart(4)} clk=${(r.clicks || 0).toString().padStart(2)} ctr=${((r.ctr || 0) * 100).toFixed(1).padStart(4)}% pos=${(r.position || 0).toFixed(1)}`);
  }

  // 4. 노출 발생 페이지 top 30 (90일)
  console.log('\n═══ 90일 노출 페이지 top 30 ═══');
  const topP = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: ['page'], rowLimit: 30, orderBy: [{ field: 'impressions', descending: true } as any] },
  });
  for (const r of (topP.data.rows || [])) {
    const url = (r.keys?.[0] || '').replace('https://www.wellnesstodays.com/blog/', '/').slice(0, 50).padEnd(52);
    console.log(`  ${url} imp=${(r.impressions || 0).toString().padStart(4)} clk=${(r.clicks || 0).toString().padStart(2)} pos=${(r.position || 0).toFixed(1)}`);
  }

  // 5. 순위 구간별 노출/클릭 분포
  console.log('\n═══ 순위 구간별 키워드 분포 (Top 1000 키워드 기준) ═══');
  const allQ = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 1000, orderBy: [{ field: 'impressions', descending: true } as any] },
  });
  const buckets = { p1_3: { c: 0, imp: 0, clk: 0 }, p4_10: { c: 0, imp: 0, clk: 0 }, p11_20: { c: 0, imp: 0, clk: 0 }, p21_50: { c: 0, imp: 0, clk: 0 }, p51_plus: { c: 0, imp: 0, clk: 0 } };
  for (const r of (allQ.data.rows || [])) {
    const p = r.position || 99;
    const target = p <= 3 ? buckets.p1_3 : p <= 10 ? buckets.p4_10 : p <= 20 ? buckets.p11_20 : p <= 50 ? buckets.p21_50 : buckets.p51_plus;
    target.c++;
    target.imp += r.impressions || 0;
    target.clk += r.clicks || 0;
  }
  console.log(`  1-3위:   ${String(buckets.p1_3.c).padStart(3)}개 키워드 / 노출 ${buckets.p1_3.imp} / 클릭 ${buckets.p1_3.clk}`);
  console.log(`  4-10위:  ${String(buckets.p4_10.c).padStart(3)}개 키워드 / 노출 ${buckets.p4_10.imp} / 클릭 ${buckets.p4_10.clk}`);
  console.log(`  11-20위: ${String(buckets.p11_20.c).padStart(3)}개 키워드 / 노출 ${buckets.p11_20.imp} / 클릭 ${buckets.p11_20.clk}  ◀ 보강 ROI 최고`);
  console.log(`  21-50위: ${String(buckets.p21_50.c).padStart(3)}개 키워드 / 노출 ${buckets.p21_50.imp} / 클릭 ${buckets.p21_50.clk}`);
  console.log(`  51위+:   ${String(buckets.p51_plus.c).padStart(3)}개 키워드 / 노출 ${buckets.p51_plus.imp} / 클릭 ${buckets.p51_plus.clk}`);

  // 6. 페이지 2 (11-20위) 키워드 — 1페이지로 끌어올릴 후보
  console.log('\n═══ 페이지 2 (11-20위) 키워드 — 1페이지 끌어올림 후보 (노출 5+) ═══');
  const page2 = (allQ.data.rows || [])
    .filter((r: any) => r.position >= 11 && r.position <= 20 && r.impressions >= 5)
    .sort((a: any, b: any) => b.impressions - a.impressions)
    .slice(0, 20);
  for (const r of page2) {
    const q = (r.keys?.[0] || '').slice(0, 32).padEnd(34);
    console.log(`  ${q} imp=${r.impressions} pos=${r.position.toFixed(1)}`);
  }

  // 7. 모바일/데스크탑
  console.log('\n═══ 디바이스 분포 (90일) ═══');
  const dev = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: ['device'] },
  });
  for (const r of (dev.data.rows || [])) {
    console.log(`  ${r.keys?.[0]?.padEnd(10)} imp=${r.impressions} clk=${r.clicks} ctr=${((r.ctr || 0) * 100).toFixed(2)}% pos=${(r.position || 0).toFixed(1)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
