/**
 * gsc-index-monitor.ts — 최근 글 색인 상태 전수 모니터 + 미색인 자동 재처리 (2026-06-10 신설)
 *
 * 동작: 각 사이트 sitemap에서 최근 글 N개 추출 → GSC URL Inspection API(조회 전용)로
 *       색인 상태 분류 → 미색인(Crawled/Discovered-not-indexed/Unknown)은 IndexNow 재핑 +
 *       수동 "색인 생성 요청" 후보 목록으로 리포트.
 *
 * 사용: npx tsx scripts/gsc-index-monitor.ts            # 사이트당 최근 8개
 *       npx tsx scripts/gsc-index-monitor.ts --per 15   # 사이트당 15개
 *       npx tsx scripts/gsc-index-monitor.ts --no-reping
 *
 * 한계(reference-google-index-acceleration-limits 참조): 색인 "요청"은 API 불가(UI 전용).
 * 이 루프는 감지→재신호(IndexNow/WebSub)→수동요청 후보 압축이 목적.
 */
import { google } from 'googleapis';
import path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const SITES: Array<{ name: string; siteUrl: string; sitemapUrl: string; postPattern: RegExp }> = [
  { name: 'ai-blog', siteUrl: 'sc-domain:how-toai.com', sitemapUrl: 'https://www.how-toai.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'saju-blog', siteUrl: 'https://www.sajubokastory.com/', sitemapUrl: 'https://www.sajubokastory.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'easy-zetec', siteUrl: 'sc-domain:easyzetec.com', sitemapUrl: 'https://www.easyzetec.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'baby-blog', siteUrl: 'sc-domain:babytodak.com', sitemapUrl: 'https://www.babytodak.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/', sitemapUrl: 'https://www.wellnesstodays.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com', sitemapUrl: 'https://www.bukbukstock.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'coinday', siteUrl: 'sc-domain:coindaynow.com', sitemapUrl: 'https://www.coindaynow.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'quicktools', siteUrl: 'sc-domain:toolkio.com', sitemapUrl: 'https://toolkio.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'tokennara', siteUrl: 'sc-domain:tokennara.com', sitemapUrl: 'https://www.tokennara.com/sitemap.xml', postPattern: /\/blog\// },
  { name: 'altnara', siteUrl: 'sc-domain:altnara.com', sitemapUrl: 'https://www.altnara.com/sitemap.xml', postPattern: /\/blog\// },
];

const INDEXNOW_KEY = 'b3f8a2d1e5c94f7689012345abcdef67';

type UrlEntry = { loc: string; lastmod: string };

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'index-monitor/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseSitemap(xml: string): { urls: UrlEntry[]; children: string[] } {
  const children = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const block = m[1];
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '';
    return { loc: loc.trim(), lastmod: lastmod.trim() };
  });
  return { urls, children };
}

async function recentPosts(site: typeof SITES[0], per: number): Promise<UrlEntry[]> {
  let all: UrlEntry[] = [];
  const root = parseSitemap(await fetchText(site.sitemapUrl));
  all = all.concat(root.urls);
  for (const child of root.children.slice(0, 10)) {
    try {
      all = all.concat(parseSitemap(await fetchText(child)).urls);
    } catch { /* 자식 사이트맵 한 개 실패는 무시 */ }
  }
  const posts = all.filter((u) => site.postPattern.test(u.loc) && !//blog/(category|tag|page)//.test(u.loc));
  // lastmod 우선, 없으면 URL 내 날짜 추정값
  const key = (u: UrlEntry) => u.lastmod || (u.loc.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  posts.sort((a, b) => (key(a) < key(b) ? 1 : -1));
  return posts.slice(0, per);
}

async function repingIndexNow(url: string): Promise<boolean> {
  try {
    const res = await fetch(`https://yandex.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`);
    return res.status === 200 || res.status === 202;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const per = args.includes('--per') ? parseInt(args[args.indexOf('--per') + 1], 10) : 8;
  const reping = !args.includes('--no-reping');

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });

  const summary: Record<string, { ok: number; notIndexed: number; unknown: number; err: number }> = {};
  const manualCandidates: string[] = [];

  for (const site of SITES) {
    summary[site.name] = { ok: 0, notIndexed: 0, unknown: 0, err: 0 };
    let posts: UrlEntry[] = [];
    try {
      posts = await recentPosts(site, per);
    } catch (e: any) {
      console.log(`\n## ${site.name} — sitemap 실패: ${e.message}`);
      continue;
    }
    console.log(`\n## ${site.name} (최근 ${posts.length}개)`);
    for (const p of posts) {
      try {
        const res = await sc.urlInspection.index.inspect({
          requestBody: { inspectionUrl: p.loc, siteUrl: site.siteUrl },
        });
        const r = res.data.inspectionResult?.indexStatusResult;
        const state = r?.coverageState || 'UNKNOWN';
        const verdict = r?.verdict || '?';
        const short = p.loc.replace(/^https?:\/\/[^/]+/, '');
        if (verdict === 'PASS') {
          summary[site.name].ok++;
          console.log(`  ✅ ${short}`);
        } else if (/unknown to Google/i.test(state)) {
          summary[site.name].unknown++;
          console.log(`  ⬜ 미발견 ${short} (${state})`);
          if (reping) await repingIndexNow(p.loc);
          manualCandidates.push(p.loc);
        } else {
          summary[site.name].notIndexed++;
          console.log(`  🟨 미색인 ${short} (${state})`);
          if (reping) await repingIndexNow(p.loc);
          manualCandidates.push(p.loc);
        }
      } catch (e: any) {
        summary[site.name].err++;
        console.log(`  ❌ inspect 실패 ${p.loc} — ${e.message}`);
      }
    }
  }

  console.log('\n===== 요약 =====');
  for (const [name, s] of Object.entries(summary)) {
    console.log(`${name}: 색인 ${s.ok} / 미색인 ${s.notIndexed} / 미발견 ${s.unknown}${s.err ? ` / 에러 ${s.err}` : ''}`);
  }
  if (manualCandidates.length) {
    console.log(`\n[재신호 완료${reping ? '(IndexNow 재핑됨)' : ''}] 수동 "색인 생성 요청" 후보 ${manualCandidates.length}건:`);
    manualCandidates.forEach((u) => console.log(`  ${u}`));
    console.log('\n→ 3~7일 후 재실행해도 미색인이면 GSC URL검사에서 수동 색인요청 권장 (일~12개 한도)');
  }
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
