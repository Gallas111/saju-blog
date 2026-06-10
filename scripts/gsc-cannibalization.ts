/**
 * GSC 키워드 카니발리제이션 감지 — 9개 사이트
 *
 * 같은 검색 쿼리에 여러 URL이 노출되는 패턴을 찾아내고
 * 약한 URL → 강한 URL 정리(301/noindex/머지) 후보를 리포트.
 *
 * 사용법:
 *   npx tsx scripts/gsc-cannibalization.ts                  # 전체 사이트, 기본 28일
 *   npx tsx scripts/gsc-cannibalization.ts --site coinday   # 특정 사이트
 *   npx tsx scripts/gsc-cannibalization.ts --days 90        # 90일 데이터
 *   npx tsx scripts/gsc-cannibalization.ts --json > cannibal.json
 *
 * 출력 (사이트별):
 *   ■ ai-blog
 *     [카니발 의심 키워드 N건]
 *     1. "claude 4.7"
 *        winner ▶ /blog/claude-opus-47-... (imp 521 · clk 18 · pos 7.2 · ctr 3.5%)
 *        loser  → /blog/claude-4-7-overview-... (imp 234 · clk 1 · pos 21 · ctr 0.4%)
 *        권장: loser 301 → winner (또는 noindex)
 *
 * 판정 룰:
 *   - 같은 query에 우리 사이트 URL 2개 이상 노출
 *   - winner: imp 최다 (또는 clicks 최다)
 *   - loser: position > winner+5 또는 ctr < winner/3
 *   - impact score: query 총 imp × URL 갯수
 */
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const SITES: Array<{ name: string; siteUrl: string }> = [
  { name: 'ai-blog',     siteUrl: 'sc-domain:how-toai.com' },
  { name: 'saju-blog',   siteUrl: 'https://www.sajubokastory.com/' },
  { name: 'quicktools',  siteUrl: 'sc-domain:toolkio.com' },
  { name: 'easy-zetec',  siteUrl: 'sc-domain:easyzetec.com' },
  { name: 'baby-blog',   siteUrl: 'sc-domain:babytodak.com' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com' },
  { name: 'lottohanpan', siteUrl: 'sc-domain:lottohanpan.com' },
  { name: 'coinday',     siteUrl: 'sc-domain:coindaynow.com' },
  { name: 'tokennara',   siteUrl: 'sc-domain:tokennara.com' },
  { name: 'altnara',     siteUrl: 'sc-domain:altnara.com' },
];

interface CliArgs {
  site?: string;
  days: number;
  json: boolean;
  minImpressions: number;
  topN: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = { days: 28, json: false, minImpressions: 10, topN: 20 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--site') out.site = args[++i];
    else if (a === '--days') out.days = parseInt(args[++i], 10);
    else if (a === '--json') out.json = true;
    else if (a === '--min-imp') out.minImpressions = parseInt(args[++i], 10);
    else if (a === '--top') out.topN = parseInt(args[++i], 10);
  }
  return out;
}

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

interface Row {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;     // 0~1
  position: number;
}

interface CannibalGroup {
  query: string;
  totalImpressions: number;
  totalClicks: number;
  urls: Row[];
  winner: Row;
  losers: Row[];
  impactScore: number;
}

/** URL에서 #hash 앵커 제거 → 같은 글의 다른 섹션 인덱싱이 가짜 카니발로 잡히는 것 회피 */
function normalizeUrl(u: string): string {
  const i = u.indexOf('#');
  return i >= 0 ? u.slice(0, i) : u;
}

async function fetchSiteData(sc: any, site: typeof SITES[0], days: number): Promise<Row[]> {
  const start = daysAgo(days + 2);
  const end = daysAgo(2);

  // raw rows: 같은 (query, base URL) 쌍에 #hash 만 다른 행들이 분리돼 들어옴 → 머지 필요
  const merged = new Map<string, Row>();
  let startRow = 0;
  const pageSize = 5000;
  while (true) {
    const resp = await sc.searchanalytics.query({
      siteUrl: site.siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ['query', 'page'],
        rowLimit: pageSize,
        startRow,
      },
    });
    const rows = resp.data.rows || [];
    if (!rows.length) break;
    for (const r of rows) {
      const query = r.keys[0];
      const page = normalizeUrl(r.keys[1]);
      const key = `${query}\t${page}`;
      const imp = r.impressions || 0;
      const clk = r.clicks || 0;
      const pos = r.position || 0;
      const existing = merged.get(key);
      if (existing) {
        // 노출 가중 평균 position, imp/clk 합산
        const totalImp = existing.impressions + imp;
        existing.position = totalImp > 0
          ? (existing.position * existing.impressions + pos * imp) / totalImp
          : 0;
        existing.impressions = totalImp;
        existing.clicks = existing.clicks + clk;
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      } else {
        merged.set(key, { query, page, impressions: imp, clicks: clk, ctr: r.ctr || 0, position: pos });
      }
    }
    if (rows.length < pageSize) break;
    startRow += pageSize;
    if (startRow > 25000) break; // safety cap
  }
  return Array.from(merged.values());
}

function detectCannibals(rows: Row[], minImp: number): CannibalGroup[] {
  const byQuery = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byQuery.has(r.query)) byQuery.set(r.query, []);
    byQuery.get(r.query)!.push(r);
  }

  const groups: CannibalGroup[] = [];
  for (const [query, urls] of byQuery.entries()) {
    if (urls.length < 2) continue;
    const totalImpressions = urls.reduce((s, u) => s + u.impressions, 0);
    if (totalImpressions < minImp) continue;
    const totalClicks = urls.reduce((s, u) => s + u.clicks, 0);

    // winner: 클릭 우선, 동률이면 노출수
    const sorted = [...urls].sort((a, b) => (b.clicks - a.clicks) || (b.impressions - a.impressions));
    const winner = sorted[0];
    const losers = sorted.slice(1);

    // impact score: 총 노출 × (URL 개수)^2 → URL이 많을수록 가중
    const impactScore = totalImpressions * Math.pow(urls.length, 2);

    groups.push({
      query,
      totalImpressions,
      totalClicks,
      urls: sorted,
      winner,
      losers,
      impactScore,
    });
  }

  return groups.sort((a, b) => b.impactScore - a.impactScore);
}

function recommendAction(group: CannibalGroup): string {
  const w = group.winner;
  const recs: string[] = [];
  for (const l of group.losers) {
    // 클릭 0 + 평균 위치 >20: noindex 추천
    if (l.clicks === 0 && l.position > 20) {
      recs.push(`noindex (낮은 노출·0 클릭)`);
    }
    // 평균 위치 winner+10 차이: 301 redirect
    else if (l.position > w.position + 10) {
      recs.push(`301 → winner`);
    }
    // ctr 차이 큼: 콘텐츠 머지·내부링크 보강
    else if (l.ctr < w.ctr / 3) {
      recs.push(`머지 또는 내부링크로 winner에 신호 통합`);
    } else {
      recs.push(`모니터 (winner와 비슷한 강도)`);
    }
  }
  return recs.join(' / ');
}

function printGroup(g: CannibalGroup, idx: number) {
  const ctrPct = (n: number) => (n * 100).toFixed(1) + '%';
  console.log(`  ${idx + 1}. "${g.query}"  (총 노출 ${g.totalImpressions}, 클릭 ${g.totalClicks}, URL ${g.urls.length}개)`);
  console.log(`     winner ▶ ${g.winner.page}`);
  console.log(`              imp ${g.winner.impressions} · clk ${g.winner.clicks} · pos ${g.winner.position.toFixed(1)} · ctr ${ctrPct(g.winner.ctr)}`);
  for (const l of g.losers) {
    console.log(`     loser  → ${l.page}`);
    console.log(`              imp ${l.impressions} · clk ${l.clicks} · pos ${l.position.toFixed(1)} · ctr ${ctrPct(l.ctr)}`);
  }
  console.log(`     권장: ${recommendAction(g)}`);
  console.log();
}

async function main() {
  const cli = parseArgs();
  if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error(`[FATAL] google-credentials.json not found at ${KEY_FILE_PATH}`);
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const authClient = await auth.getClient();
  // @ts-ignore
  const sc = google.searchconsole({ version: 'v1', auth: authClient });

  const targets = cli.site ? SITES.filter(s => s.name === cli.site) : SITES;
  if (cli.site && !targets.length) {
    console.error(`[FATAL] unknown site: ${cli.site}`);
    console.error(`available: ${SITES.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  const jsonOut: any = { generatedAt: new Date().toISOString(), days: cli.days, sites: {} };

  if (!cli.json) {
    console.log(`=== GSC 카니발리제이션 감지 (${cli.days}일 기간, 최소 노출 ${cli.minImpressions}) ===\n`);
  }

  for (const site of targets) {
    try {
      const rows = await fetchSiteData(sc, site, cli.days);
      const groups = detectCannibals(rows, cli.minImpressions);
      const top = groups.slice(0, cli.topN);

      if (cli.json) {
        jsonOut.sites[site.name] = {
          totalRows: rows.length,
          cannibalCount: groups.length,
          topGroups: top.map(g => ({
            query: g.query,
            totalImpressions: g.totalImpressions,
            totalClicks: g.totalClicks,
            urlCount: g.urls.length,
            impactScore: g.impactScore,
            winner: g.winner,
            losers: g.losers,
            recommendation: recommendAction(g),
          })),
        };
      } else {
        console.log(`■ ${site.name}`);
        console.log(`   query·page 행 ${rows.length} | 카니발 후보 ${groups.length}건 (상위 ${top.length}건 표시)\n`);
        if (top.length === 0) {
          console.log(`   ✅ 카니발 없음\n`);
        } else {
          top.forEach((g, i) => printGroup(g, i));
        }
      }
    } catch (e: any) {
      if (cli.json) {
        jsonOut.sites[site.name] = { error: e.message?.slice(0, 200) };
      } else {
        console.log(`■ ${site.name}\n   ERROR: ${e.message?.slice(0, 200)}\n`);
      }
    }
  }

  if (cli.json) {
    console.log(JSON.stringify(jsonOut, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
