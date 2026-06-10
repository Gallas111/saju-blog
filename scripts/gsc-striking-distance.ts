/**
 * GSC striking-distance 분석기 — 페이지×쿼리 단위로 "1페이지 직전" 기회 추출.
 * 위치 5~20 + 노출 임계 이상인 (페이지,쿼리)를 뽑아 기회점수(노출×위치갭)로 랭킹.
 * 신생 사이트 최대 ROI: 새 글 1위 따기보다 '거의 페이지1' 글을 밀어올리기.
 * 사용법: npx tsx scripts/gsc-striking-distance.ts [최소노출(기본10)]
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const MIN_IMP = parseInt(process.argv[2] || '10', 10);

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

type Opp = { site: string; query: string; page: string; pos: number; imp: number; clk: number; ctr: number; score: number };

async function siteOpps(sc: any, site: typeof SITES[0]): Promise<Opp[]> {
  const start = daysAgo(31), end = daysAgo(3);
  try {
    const res = await sc.searchanalytics.query({
      siteUrl: site.siteUrl,
      requestBody: { startDate: start, endDate: end, dimensions: ['query', 'page'], rowLimit: 5000 },
    });
    const rows = res.data.rows || [];
    const opps: Opp[] = [];
    for (const r of rows) {
      const pos = r.position || 0;
      const imp = r.impressions || 0;
      if (pos >= 5 && pos <= 20 && imp >= MIN_IMP) {
        // 기회점수: 노출 × 위치갭(목표 3위까지). 페이지2(11~20)는 한 번에 큰 점프라 가중.
        const gap = Math.max(0, pos - 3);
        const page2boost = pos > 10 ? 1.3 : 1.0;
        opps.push({
          site: site.name, query: r.keys[0], page: r.keys[1],
          pos: +pos.toFixed(1), imp, clk: r.clicks || 0,
          ctr: +(((r.ctr || 0) * 100)).toFixed(1),
          score: Math.round(imp * gap * page2boost),
        });
      }
    }
    return opps;
  } catch (e: any) {
    console.log(`  ⚠️ ${site.name}: ${e.message?.slice(0, 80)}`);
    return [];
  }
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth: await auth.getClient() as any });

  console.log(`=== GSC striking-distance (위치 5~20, 노출≥${MIN_IMP}, 최근 28일) ===\n`);
  const all: Opp[] = [];
  for (const site of SITES) {
    const opps = await siteOpps(sc, site);
    all.push(...opps);
    const top = opps.sort((a, b) => b.score - a.score).slice(0, 8);
    console.log(`■ ${site.name} — 기회 ${opps.length}건 (상위 ${top.length})`);
    for (const o of top) {
      const slug = o.page.replace(/^https?:\/\/[^/]+/, '');
      console.log(`  [${o.score}] "${o.query}" pos${o.pos} imp${o.imp} clk${o.clk} ctr${o.ctr}% ${slug}`);
    }
    console.log('');
  }
  // 전 사이트 통합 상위 25 (실행 우선순위)
  console.log('━━━ 🎯 전체 통합 우선순위 TOP 25 (기회점수 순) ━━━');
  for (const o of all.sort((a, b) => b.score - a.score).slice(0, 25)) {
    const slug = o.page.replace(/^https?:\/\/[^/]+/, '');
    const tier = o.pos > 10 ? '📄2p' : '🔽1p하단';
    console.log(`[${o.score}] ${tier} ${o.site} "${o.query}" pos${o.pos} imp${o.imp} → ${slug}`);
  }
  console.log(`\n총 striking-distance 기회: ${all.length}건`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
