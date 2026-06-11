/**
 * health-blog sitemap GSC 재제출 (색인 가속)
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const SITE_URL = 'https://www.wellnesstodays.com/';
const SITEMAP_URL = 'https://www.wellnesstodays.com/sitemap.xml';

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
  const sc = google.searchconsole({ version: 'v1', auth: await auth.getClient() as any });

  console.log('▸ health-blog sitemap 재제출 중...');
  try {
    await sc.sitemaps.submit({ siteUrl: SITE_URL, feedpath: SITEMAP_URL });
    console.log('  ✅ 재제출 성공');
    const sm = await sc.sitemaps.get({ siteUrl: SITE_URL, feedpath: SITEMAP_URL });
    console.log(`  pending: ${sm.data.isPending}`);
    console.log(`  lastDownloaded: ${sm.data.lastDownloaded}`);
  } catch (e: any) {
    console.log('  ❌', e.message?.slice(0, 100));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
