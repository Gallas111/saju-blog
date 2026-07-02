/**
 * GSC URL Inspection — 도메인 sitemap의 모든 URL 색인 상태 일괄 점검(즉시 조회).
 * 전제: sc-domain:<domain> 속성이 GSC에 등록됨(gsc-add-property.ts).
 * 사용: cd saju-blog && npx tsx scripts/gsc-url-inspect.ts <domain>
 *   예: npx tsx scripts/gsc-url-inspect.ts gumkit.app
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');
const domain = process.argv[2];

async function main() {
  if (!domain) { console.log('사용: npx tsx scripts/gsc-url-inspect.ts <domain>'); process.exit(1); }
  const siteUrl = `sc-domain:${domain}`;
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/webmasters'] });
  const sc = google.searchconsole({ version: 'v1', auth: (await auth.getClient()) as any });

  const sm = await (await fetch(`https://${domain}/sitemap.xml`)).text();
  const urls = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  console.log(`=== ${domain} 색인 점검 (${urls.length} URL) ===\n`);

  let indexed = 0;
  for (const url of urls) {
    try {
      const r = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl } });
      const i: any = r.data.inspectionResult?.indexStatusResult || {};
      const v = i.verdict || '?';
      const cov = i.coverageState || '?';
      const crawl = i.lastCrawlTime ? String(i.lastCrawlTime).slice(0, 10) : '미크롤';
      if (v === 'PASS') indexed++;
      const mark = v === 'PASS' ? '🟢' : v === 'NEUTRAL' ? '🟡' : '🔴';
      console.log(`${mark} ${String(v).padEnd(8)} ${String(cov).padEnd(30)} crawl:${crawl}  ${url.replace(`https://${domain}`, '') || '/'}`);
    } catch (e: any) {
      console.log(`⚠️ [${e?.code || ''}] ${String(e?.message).slice(0, 60)}  ${url}`);
    }
  }
  console.log(`\n색인(PASS): ${indexed}/${urls.length}`);
}
main().catch((e) => { console.error('FATAL', e?.message || e); process.exit(1); });
