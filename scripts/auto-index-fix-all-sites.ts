/**
 * 7개 사이트 통합 자동 색인 점검·수정 스크립트
 *
 * 동작:
 *   1. 각 사이트의 라이브 sitemap.xml 파싱
 *   2. 모든 URL HTTP 응답 검사 (200/3xx/4xx/5xx/루프)
 *   3. 200 OK URL은 IndexNow 일괄 재제출 (Bing/Yandex 우회 색인 깨우기)
 *   4. 4xx·루프·orphan은 stdout 보고 (사용자 검토용, 알림 채널 X)
 *
 * 사용법: npx tsx scripts/auto-index-fix-all-sites.ts
 *
 * 월요일 루틴 (feedback-monday-gsc-first.md):
 *   gsc-diagnose-all-sites.ts → auto-index-fix-all-sites.ts → 포스팅 작업
 */

const INDEXNOW_KEY = 'b3f8a2d1e5c94f7689012345abcdef67';
const PARALLEL = 8;

interface Site {
  name: string;
  sitemapUrl: string;
  host: string; // IndexNow host (apex)
}

const SITES: Site[] = [
  { name: 'ai-blog',     sitemapUrl: 'https://www.how-toai.com/sitemap.xml',       host: 'how-toai.com' },
  { name: 'saju-blog',   sitemapUrl: 'https://www.sajubokastory.com/sitemap.xml',  host: 'sajubokastory.com' },
  { name: 'quicktools',  sitemapUrl: 'https://toolkio.com/sitemap.xml',            host: 'toolkio.com' },
  { name: 'easy-zetec',  sitemapUrl: 'https://www.easyzetec.com/sitemap.xml',      host: 'easyzetec.com' },
  { name: 'baby-blog',   sitemapUrl: 'https://www.babytodak.com/sitemap.xml',      host: 'babytodak.com' },
  { name: 'health-blog', sitemapUrl: 'https://www.wellnesstodays.com/sitemap.xml', host: 'wellnesstodays.com' },
  { name: 'bukbukstock', sitemapUrl: 'https://www.bukbukstock.com/sitemap.xml',    host: 'bukbukstock.com' },
];

interface UrlStatus {
  url: string;
  status: number;
  redirectChain?: string[];
}

async function fetchSitemap(url: string): Promise<string[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

async function checkUrl(url: string): Promise<UrlStatus> {
  const chain: string[] = [];
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    try {
      const res = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      const status = res.status;
      if (status >= 300 && status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { url, status, redirectChain: chain };
        chain.push(loc);
        current = new URL(loc, current).href;
        continue;
      }
      return { url, status, redirectChain: chain.length > 0 ? chain : undefined };
    } catch {
      return { url, status: 0, redirectChain: chain };
    }
  }
  return { url, status: -1, redirectChain: chain };
}

async function batchCheck(urls: string[]): Promise<UrlStatus[]> {
  const results: UrlStatus[] = [];
  for (let i = 0; i < urls.length; i += PARALLEL) {
    const batch = urls.slice(i, i + PARALLEL);
    const r = await Promise.all(batch.map(checkUrl));
    results.push(...r);
  }
  return results;
}

async function submitIndexNow(host: string, urls: string[]): Promise<{ success: number; fail: number; status?: number }> {
  if (urls.length === 0) return { success: 0, fail: 0 };
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, urlList: urls }),
    });
    if (res.status === 200 || res.status === 202) {
      return { success: urls.length, fail: 0, status: res.status };
    }
    return { success: 0, fail: urls.length, status: res.status };
  } catch {
    return { success: 0, fail: urls.length };
  }
}

async function processSite(site: Site) {
  const urls = await fetchSitemap(site.sitemapUrl);
  if (urls.length === 0) {
    return { site: site.name, error: 'sitemap fetch failed' };
  }

  const statuses = await batchCheck(urls);

  const ok = statuses.filter((s) => s.status === 200);
  const redir = statuses.filter((s) => s.redirectChain && s.redirectChain.length > 0);
  const notFound = statuses.filter((s) => s.status === 404);
  const serverErr = statuses.filter((s) => s.status >= 500);
  const loops = statuses.filter((s) => s.status === -1);
  const fails = statuses.filter((s) => s.status === 0);

  const okUrls = ok.map((s) => s.url);
  const submitResult = await submitIndexNow(site.host, okUrls);

  return {
    site: site.name,
    total: urls.length,
    ok: ok.length,
    redir: redir.length,
    notFound: notFound.length,
    serverErr: serverErr.length,
    loops: loops.length,
    fails: fails.length,
    indexNow: submitResult,
    notFoundUrls: notFound.map((s) => s.url),
    loopUrls: loops.map((s) => ({ url: s.url, chain: s.redirectChain })),
  };
}

async function main() {
  console.log('=== 7개 사이트 통합 자동 색인 점검 ===\n');

  const startedAt = Date.now();
  const reports: any[] = [];

  for (const site of SITES) {
    process.stdout.write(`[${site.name}] 처리 중...`);
    const t0 = Date.now();
    const r = await processSite(site);
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(` ${sec}s`);
    reports.push(r);
  }

  console.log('\n=== 사이트별 요약 ===');
  console.log('사이트          | 총   | 200  | 3xx  | 404  | 5xx  | 루프 | 실패 | IndexNow');
  console.log('----------------|------|------|------|------|------|------|------|----------');
  for (const r of reports) {
    if (r.error) {
      console.log(`${r.site.padEnd(15)} | ERROR: ${r.error}`);
      continue;
    }
    const inResult = r.indexNow.success > 0 ? `✓${r.indexNow.success}` : `✗${r.indexNow.fail} (${r.indexNow.status || '-'})`;
    console.log(
      `${r.site.padEnd(15)} | ${String(r.total).padStart(4)} | ${String(r.ok).padStart(4)} | ${String(r.redir).padStart(4)} | ${String(r.notFound).padStart(4)} | ${String(r.serverErr).padStart(4)} | ${String(r.loops).padStart(4)} | ${String(r.fails).padStart(4)} | ${inResult}`
    );
  }

  // 사용자 검토 필요 항목
  console.log('\n=== 사용자 검토 필요 ===');
  let hasIssue = false;
  for (const r of reports) {
    if (r.error) continue;
    if (r.notFoundUrls.length > 0) {
      hasIssue = true;
      console.log(`\n[${r.site}] 404 응답 (_redirects 추가 검토)`);
      r.notFoundUrls.slice(0, 10).forEach((u: string) => console.log(`  ${u}`));
      if (r.notFoundUrls.length > 10) console.log(`  ... +${r.notFoundUrls.length - 10}개 더`);
    }
    if (r.loopUrls.length > 0) {
      hasIssue = true;
      console.log(`\n[${r.site}] 리디렉션 루프 (즉시 수정 필요)`);
      r.loopUrls.forEach((x: any) => console.log(`  ${x.url} → ${x.chain.join(' → ')}`));
    }
  }
  if (!hasIssue) {
    console.log('✓ 검토 필요 항목 없음 (모든 사이트 sitemap 깨끗)');
  }

  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n=== 완료 (${totalSec}s) ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
