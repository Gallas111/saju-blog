// 페이지별 28일 노출/클릭 덤프 — 특정 글 집합의 실제 트래픽을 확인할 때 쓴다 (2026-07-17)
// 사용: npx tsx scripts/gsc-page-impressions.ts <site1,site2,...>
// 출력: "<slug>\t<impressions>\t<clicks>\t<position>" (노출 내림차순)
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

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

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

async function main() {
  const names = (process.argv[2] || Object.keys(SITES).join(',')).split(',');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });
  const start = daysAgo(31), end = daysAgo(3);

  for (const name of names) {
    const siteUrl = SITES[name];
    if (!siteUrl) { console.error(`알 수 없는 사이트: ${name}`); continue; }
    try {
      const res = await sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: ['page'], rowLimit: 5000 },
      });
      const rows = res.data.rows || [];
      console.log(`### ${name} — 페이지 ${rows.length}건 (${start}~${end})`);
      for (const r of rows) {
        const url = decodeURIComponent(r.keys?.[0] || '');
        const m = url.match(/\/blog\/([^/?#]+)/);
        if (!m) continue;
        console.log(`${name}\t${m[1]}\t${r.impressions || 0}\t${r.clicks || 0}\t${(r.position || 0).toFixed(1)}`);
      }
    } catch (e: any) {
      console.error(`${name} 조회 실패: ${e?.message || e}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
