// 사이트별 28일 GSC 총계 + 상위 쿼리 — 트래픽 진단용 (2026-07-02)
// 사용: npx tsx scripts/gsc-site-totals.ts [site1,site2,...]  (미지정=전체)
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const SITES: Array<{ name: string; siteUrl: string }> = [
  { name: 'ai-blog', siteUrl: 'sc-domain:how-toai.com' },
  { name: 'saju-blog', siteUrl: 'https://www.sajubokastory.com/' },
  { name: 'easy-zetec', siteUrl: 'sc-domain:easyzetec.com' },
  { name: 'baby-blog', siteUrl: 'sc-domain:babytodak.com' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com' },
  { name: 'coinday', siteUrl: 'sc-domain:coindaynow.com' },
  { name: 'quicktools', siteUrl: 'sc-domain:toolkio.com' },
  { name: 'tokennara', siteUrl: 'sc-domain:tokennara.com' },
  { name: 'altnara', siteUrl: 'sc-domain:altnara.com' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

async function main() {
  const filter = process.argv[2] ? process.argv[2].split(',') : null;
  const targets = filter ? SITES.filter(s => filter.includes(s.name)) : SITES;
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });
  const start = daysAgo(31), end = daysAgo(3);
  console.log(`=== GSC 총계 ${start} ~ ${end} (28일) ===\n`);

  for (const site of targets) {
    try {
      // 총계 (date 차원으로 합산)
      const tot = await sc.searchanalytics.query({
        siteUrl: site.siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: ['date'], rowLimit: 100 },
      });
      const rows = tot.data.rows || [];
      const imp = rows.reduce((a, r) => a + (r.impressions || 0), 0);
      const clk = rows.reduce((a, r) => a + (r.clicks || 0), 0);
      // 상위 쿼리 5
      const q = await sc.searchanalytics.query({
        siteUrl: site.siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 5 },
      });
      console.log(`■ ${site.name}: 노출 ${imp.toLocaleString()} · 클릭 ${clk.toLocaleString()}`);
      for (const r of q.data.rows || []) {
        console.log(`    imp ${String(r.impressions).padStart(5)} clk ${String(r.clicks).padStart(3)} pos ${(r.position || 0).toFixed(1).padStart(5)}  ${r.keys?.[0]}`);
      }
      if (!(q.data.rows || []).length) console.log('    (쿼리 데이터 없음)');
      console.log();
    } catch (e: any) {
      console.log(`■ ${site.name}: ERROR ${e.message?.slice(0, 80)}\n`);
    }
  }
}
main();
