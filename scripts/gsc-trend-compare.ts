/**
 * GSC 트렌드 비교 — 최근 7일 vs 직전 7일, 최근 28일 vs 직전 28일
 * AdSense 하락이 "실제 트래픽 추세"인지 "노이즈"인지 판별용.
 * 사용법: npx tsx scripts/gsc-trend-compare.ts
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const SITES = [
  { name: 'ai-blog',     siteUrl: 'sc-domain:how-toai.com' },
  { name: 'saju-blog',   siteUrl: 'https://www.sajubokastory.com/' },
  { name: 'quicktools',  siteUrl: 'sc-domain:toolkio.com' },
  { name: 'tokennara',   siteUrl: 'sc-domain:tokennara.com' },
  { name: 'altnara',     siteUrl: 'sc-domain:altnara.com' },
  { name: 'easy-zetec',  siteUrl: 'sc-domain:easyzetec.com' },
  { name: 'baby-blog',   siteUrl: 'sc-domain:babytodak.com' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com' },
  { name: 'coinday',     siteUrl: 'sc-domain:coindaynow.com' },
  { name: 'lottohanpan', siteUrl: 'sc-domain:lottohanpan.com' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

// GSC 데이터는 ~2-3일 지연. end=daysAgo(4) 안전선.
const R7  = { start: daysAgo(10), end: daysAgo(4) };   // 최근 7일
const P7  = { start: daysAgo(17), end: daysAgo(11) };  // 직전 7일
const R28 = { start: daysAgo(31), end: daysAgo(4) };   // 최근 28일
const P28 = { start: daysAgo(59), end: daysAgo(32) };  // 직전 28일

async function tot(sc: any, siteUrl: string, period: { start: string; end: string }) {
  try {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: period.start, endDate: period.end, rowLimit: 1 },
    });
    const r = res.data.rows?.[0];
    return r ? { clk: r.clicks || 0, imp: r.impressions || 0, pos: r.position || 0 } : { clk: 0, imp: 0, pos: 0 };
  } catch (e: any) {
    return { err: e?.message || String(e) };
  }
}

const pct = (a: number, b: number) => b === 0 ? (a === 0 ? '0%' : '+∞') : ((a - b) / b * 100 >= 0 ? '+' : '') + ((a - b) / b * 100).toFixed(0) + '%';

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const authClient = await auth.getClient();
  // @ts-ignore
  const sc = google.searchconsole({ version: 'v1', auth: authClient });

  console.log(`=== GSC 트렌드 비교 ===`);
  console.log(`최근7일 ${R7.start}~${R7.end}  vs  직전7일 ${P7.start}~${P7.end}`);
  console.log(`최근28일 ${R28.start}~${R28.end}  vs  직전28일 ${P28.start}~${P28.end}\n`);

  let tClkR = 0, tClkP = 0;
  const flags: string[] = [];

  for (const s of SITES) {
    const [r7, p7, r28, p28] = await Promise.all([
      tot(sc, s.siteUrl, R7), tot(sc, s.siteUrl, P7), tot(sc, s.siteUrl, R28), tot(sc, s.siteUrl, P28),
    ]);
    if ((r7 as any).err) { console.log(`■ ${s.name}: ERROR ${(r7 as any).err}\n`); continue; }
    const a = r7 as any, b = p7 as any, c = r28 as any, d = p28 as any;
    tClkR += a.clk; tClkP += b.clk;
    console.log(`■ ${s.name}`);
    console.log(`  7일  클릭 ${b.clk}→${a.clk} (${pct(a.clk, b.clk)})  노출 ${b.imp}→${a.imp} (${pct(a.imp, b.imp)})  순위 ${b.pos.toFixed(1)}→${a.pos.toFixed(1)}`);
    console.log(`  28일 클릭 ${d.clk}→${c.clk} (${pct(c.clk, d.clk)})  노출 ${d.imp}→${c.imp} (${pct(c.imp, d.imp)})  순위 ${d.pos.toFixed(1)}→${c.pos.toFixed(1)}`);
    console.log();
    // 실제 하락 플래그: 7일·28일 둘 다 클릭 -15% 이상 + 표본 의미있음(직전 클릭>=20)
    const drop7 = b.clk >= 20 && (a.clk - b.clk) / b.clk <= -0.15;
    const drop28 = d.clk >= 50 && (c.clk - d.clk) / d.clk <= -0.15;
    if (drop7 && drop28) flags.push(`${s.name} (7일 ${pct(a.clk,b.clk)} + 28일 ${pct(c.clk,d.clk)})`);
  }

  console.log(`──────────────────────────────`);
  console.log(`전체 7일 클릭 합: ${tClkP} → ${tClkR} (${pct(tClkR, tClkP)})`);
  if (flags.length) {
    console.log(`🔴 실제 하락 추세(노이즈 아님): ${flags.join(' / ')}`);
  } else {
    console.log(`🟢 7일·28일 동시 -15%+ 지속하락 사이트 없음 → 등락은 노이즈/주말 dip 범위`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
