/**
 * GSC 콘텐츠 갭 마이너 — "수요는 있는데 우리가 약한" 신규 글 타깃 발굴.
 * 검색 노출은 잡히는데(=구글이 관련 있다고 봄) 평균 위치 15~70(2페이지+)인 쿼리 =
 *   전용 강한 글이 없어서 못 올라가는 것 → 그 쿼리로 전용 글 쓰면 이길 확률 높음(실수요·반증된 관련성).
 * striking-distance(pos5~20=기존글 boost)와 짝: 이건 pos15~70=신규글/대폭보강.
 * 사용법: npx tsx scripts/gsc-content-gaps.ts [최소노출(기본8)]
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const MIN_IMP = parseInt(process.argv[2] || '8', 10);

const SITES: Array<{ name: string; siteUrl: string }> = [
  { name: 'ai-blog', siteUrl: 'sc-domain:how-toai.com' },
  { name: 'saju-blog', siteUrl: 'https://www.sajubokastory.com/' },
  { name: 'easy-zetec', siteUrl: 'sc-domain:easyzetec.com' },
  { name: 'baby-blog', siteUrl: 'sc-domain:babytodak.com' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com' },
  { name: 'coinday', siteUrl: 'sc-domain:coindaynow.com' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

type Gap = { site: string; query: string; imp: number; clk: number; pos: number; page: string; score: number };

async function siteGaps(sc: any, site: typeof SITES[0]): Promise<Gap[]> {
  const start = daysAgo(31), end = daysAgo(3);
  try {
    const res = await sc.searchanalytics.query({
      siteUrl: site.siteUrl,
      requestBody: { startDate: start, endDate: end, dimensions: ['query', 'page'], rowLimit: 8000 },
    });
    const rows = res.data.rows || [];
    // 쿼리별 집계(여러 페이지가 한 쿼리 잡으면 합산), 최선 위치 보유 페이지 기록
    const byQ = new Map<string, Gap>();
    for (const r of rows) {
      const pos = r.position || 0, imp = r.impressions || 0;
      if (pos < 15 || pos > 70) continue;          // 2페이지~7페이지: 수요 있고 관련 있는데 약함
      const q = r.keys[0];
      const cur = byQ.get(q);
      if (!cur) {
        byQ.set(q, { site: site.name, query: q, imp, clk: r.clicks || 0, pos: +pos.toFixed(1), page: r.keys[1], score: 0 });
      } else {
        cur.imp += imp; cur.clk += r.clicks || 0;
        if (pos < cur.pos) { cur.pos = +pos.toFixed(1); cur.page = r.keys[1]; }
      }
    }
    const gaps = [...byQ.values()].filter((g) => g.imp >= MIN_IMP);
    // 기회점수: 노출(수요) × 깊이(멀수록 전용글 필요). 너무 깊으면(>50) 약간 감점(경쟁셀 가능성).
    for (const g of gaps) g.score = Math.round(g.imp * (g.pos > 50 ? 0.7 : 1) * Math.min(g.pos / 20, 3));
    return gaps;
  } catch (e: any) {
    console.log(`  ⚠️ ${site.name}: ${e.message?.slice(0, 80)}`);
    return [];
  }
}

async function main() {
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE_PATH, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const sc = google.searchconsole({ version: 'v1', auth: await auth.getClient() as any });
  console.log(`=== GSC 콘텐츠 갭 (위치 15~70, 노출≥${MIN_IMP}, 28일) = 신규 글/대폭보강 타깃 ===\n`);
  const all: Gap[] = [];
  for (const site of SITES) {
    const gaps = await siteGaps(sc, site);
    all.push(...gaps);
    const top = gaps.sort((a, b) => b.score - a.score).slice(0, 8);
    console.log(`■ ${site.name} — 갭 ${gaps.length}건 (상위 ${top.length})`);
    for (const g of top) {
      const slug = g.page.replace(/^https?:\/\/[^/]+/, '');
      console.log(`  [${g.score}] "${g.query}" pos${g.pos} imp${g.imp} clk${g.clk} (현재페이지 ${slug})`);
    }
    console.log('');
  }
  console.log('━━━ 🎯 신규 글 타깃 통합 TOP 25 (수요×갭 점수) ━━━');
  for (const g of all.sort((a, b) => b.score - a.score).slice(0, 25)) {
    console.log(`[${g.score}] ${g.site} "${g.query}" pos${g.pos} imp${g.imp}`);
  }
  console.log(`\n총 콘텐츠 갭: ${all.length}건. striking-distance(pos5~20)와 합쳐 쓰면 기존boost+신규작성 큐 완성.`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
