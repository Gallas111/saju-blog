/**
 * GSC 한국(KOR) · 1페이지 쿼리 카운터 — "니치가 구글 한국으로 흘려보내는 쿼리 표면적" 단일 지표.
 * country=kor 로 필터한 뒤 query 차원 전체를 페이지네이션으로 받아, 평균순위 <= --max-pos 인 쿼리 수를 센다.
 * (GSC API에는 position 필터가 없으므로 클라이언트 측에서 자른다. rowLimit 25000/요청 한도라 startRow 로 넘긴다.)
 *
 * 사용:
 *   cd saju-blog && npx tsx scripts/gsc-kor-page1.ts
 *   cd saju-blog && npx tsx scripts/gsc-kor-page1.ts --start 2026-06-24 --end 2026-07-21
 *   cd saju-blog && npx tsx scripts/gsc-kor-page1.ts --sites ai-blog,saju-blog --max-pos 10 --tsv
 *
 * 기본 창: end = 오늘-3일(GSC 지연), start = end-27일 (28일).
 * 주의: GSC는 희소 쿼리를 익명화하므로 이 카운트는 하한이다. 창을 바꾸면 값이 바뀐다 — 비교 시 창을 반드시 고정할 것.
 * 기준선(2026-06-24~07-21): ai-blog 406 / saju 46 / easy 23 / baby 22 / coinday 11 / quicktools 7 / tokennara 5 / lottohanpan 1 / health 0 / bukbuk 0 / altnara 0.
 */
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
  { name: 'lottohanpan', siteUrl: 'sc-domain:lottohanpan.com' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const END = arg('end', daysAgo(3));
const START = arg('start', fmt(new Date(new Date(END).getTime() - 27 * 86400000)));
const MAX_POS = parseFloat(arg('max-pos', '10'));
const COUNTRY = arg('country', 'kor');
const TSV = process.argv.includes('--tsv');
const only = arg('sites', '');
const TARGETS = only ? SITES.filter(s => only.split(',').includes(s.name)) : SITES;

const PAGE = 25000; // GSC rowLimit 상한

type Row = { query: string; imp: number; clk: number; pos: number };

async function allKorQueries(sc: any, siteUrl: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let startRow = 0; ; startRow += PAGE) {
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: START,
        endDate: END,
        dimensions: ['query'],
        dimensionFilterGroups: [{
          filters: [{ dimension: 'country', operator: 'equals', expression: COUNTRY }],
        }],
        rowLimit: PAGE,
        startRow,
      },
    });
    const rows = res.data.rows || [];
    for (const r of rows) {
      out.push({
        query: r.keys?.[0] ?? '',
        imp: r.impressions || 0,
        clk: r.clicks || 0,
        pos: r.position || 0,
      });
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });

  if (!TSV) {
    console.log(`=== GSC 한국(${COUNTRY.toUpperCase()}) · 평균순위 ${MAX_POS}위 이내 쿼리 수 ===`);
    console.log(`창: ${START} ~ ${END}\n`);
  }
  console.log(['site', `p${MAX_POS}_queries`, `p${MAX_POS}_imp`, `p${MAX_POS}_clk`, 'kor_queries_all', 'kor_imp_all', 'kor_clk_all'].join('\t'));

  let sumP = 0;
  for (const s of TARGETS) {
    try {
      const rows = await allKorQueries(sc, s.siteUrl);
      const hit = rows.filter(r => r.pos > 0 && r.pos <= MAX_POS);
      sumP += hit.length;
      console.log([
        s.name,
        hit.length,
        hit.reduce((a, r) => a + r.imp, 0),
        hit.reduce((a, r) => a + r.clk, 0),
        rows.length,
        rows.reduce((a, r) => a + r.imp, 0),
        rows.reduce((a, r) => a + r.clk, 0),
      ].join('\t'));
    } catch (e: any) {
      console.log([s.name, 'ERROR', String(e?.message).slice(0, 80)].join('\t'));
    }
  }
  if (!TSV) console.log(`\n합계 ${MAX_POS}위 이내 쿼리: ${sumP}  (창 ${START}~${END} · 익명화 쿼리 제외 하한값)`);
}

main().catch(e => { console.error(e?.message || e); process.exit(1); });
