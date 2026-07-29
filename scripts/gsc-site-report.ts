// 고래이야기 GSC 진단 — 실제 검색 노출/클릭/쿼리/페이지/국가. 읽기 전용.
import { google } from 'googleapis';
import path from 'path';

const SITE = 'sc-domain:' + (process.argv[2] || 'goraestory.com');
const KEY = path.join(process.cwd(), 'google-credentials.json');

const day = (d: number) => new Date(Date.now() - d * 86400e3).toISOString().slice(0, 10);

async function main() {
  const auth = new google.auth.GoogleAuth({ keyFile: KEY, scopes: ['https://www.googleapis.com/auth/webmasters'] });
  const sc = google.webmasters({ version: 'v3', auth });
  const q = async (start: string, end: string, dims: string[], rowLimit = 25) =>
    (await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: start, endDate: end, dimensions: dims, rowLimit } })).data.rows || [];

  const tot = async (start: string, end: string) => {
    const r = (await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: start, endDate: end } })).data.rows || [];
    return r[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  };

  const cur = await tot(day(30), day(3));   // GSC는 최근 2~3일 지연
  const prev = await tot(day(58), day(31));
  const line = (t: string, x: any) => `${t}  클릭 ${String(x.clicks).padStart(5)} · 노출 ${String(x.impressions).padStart(7)} · CTR ${(x.ctr * 100).toFixed(2)}% · 평균순위 ${x.position?.toFixed(1)}`;
  console.log('=== 전체 (최근 28일 vs 직전 28일) ===');
  console.log(line('현재 ', cur));
  console.log(line('직전 ', prev));

  console.log('\n=== 국가별 (28일) ===');
  for (const r of await q(day(30), day(3), ['country'], 10))
    console.log(`  ${String(r.keys?.[0]).toUpperCase().padEnd(6)} 클릭 ${String(r.clicks).padStart(4)} · 노출 ${String(r.impressions).padStart(6)} · 순위 ${r.position?.toFixed(1)}`);

  console.log('\n=== 노출 상위 쿼리 25 (28일) ===');
  for (const r of await q(day(30), day(3), ['query'], 25))
    console.log(`  ${String(r.keys?.[0]).slice(0, 38).padEnd(40)} 노출 ${String(r.impressions).padStart(5)} · 클릭 ${String(r.clicks).padStart(3)} · 순위 ${r.position?.toFixed(1)}`);

  console.log('\n=== 노출 상위 페이지 20 (28일) ===');
  for (const r of await q(day(30), day(3), ['page'], 20))
    console.log(`  ${String(r.keys?.[0]).replace('https://goraestory.com', '').slice(0, 44).padEnd(46)} 노출 ${String(r.impressions).padStart(5)} · 클릭 ${String(r.clicks).padStart(3)} · 순위 ${r.position?.toFixed(1)}`);

  console.log('\n=== 문턱 쿼리: 순위 4~20 · 노출 있음 (28일) — 조금만 올리면 클릭 나오는 것 ===');
  const all = await q(day(30), day(3), ['query'], 400);
  const strike = all.filter((r) => (r.position || 99) > 3.5 && (r.position || 99) <= 20).sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  console.log(`  (총 ${strike.length}개)`);
  for (const r of strike.slice(0, 20))
    console.log(`  ${String(r.keys?.[0]).slice(0, 38).padEnd(40)} 노출 ${String(r.impressions).padStart(5)} · 클릭 ${String(r.clicks).padStart(3)} · 순위 ${r.position?.toFixed(1)}`);

  console.log('\n=== 90일 추이(주별 노출) ===');
  const daily = await q(day(93), day(3), ['date'], 500);
  const weeks: Record<string, { c: number; i: number }> = {};
  for (const r of daily) {
    const d = new Date(String(r.keys?.[0]));
    const wk = new Date(d.getTime() - d.getUTCDay() * 86400e3).toISOString().slice(0, 10);
    weeks[wk] = weeks[wk] || { c: 0, i: 0 };
    weeks[wk].c += r.clicks || 0; weeks[wk].i += r.impressions || 0;
  }
  for (const [w, v] of Object.entries(weeks)) console.log(`  ${w}  노출 ${String(v.i).padStart(6)} · 클릭 ${String(v.c).padStart(4)}`);
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
