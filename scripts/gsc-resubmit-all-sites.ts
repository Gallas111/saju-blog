/**
 * GSC Sitemap 통합 재제출 — 7개 사이트
 * 사용법: npx tsx scripts/gsc-resubmit-all-sites.ts
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const SITES = [
  { name: 'ai-blog',     siteUrl: 'sc-domain:how-toai.com',           sitemapUrl: 'https://www.how-toai.com/sitemap.xml' },
  { name: 'saju-blog',   siteUrl: 'https://www.sajubokastory.com/',   sitemapUrl: 'https://www.sajubokastory.com/sitemap.xml' },
  { name: 'quicktools',  siteUrl: 'sc-domain:toolkio.com',            sitemapUrl: 'https://toolkio.com/sitemap.xml' },
  { name: 'easy-zetec',  siteUrl: 'sc-domain:easyzetec.com',          sitemapUrl: 'https://www.easyzetec.com/sitemap.xml' },
  { name: 'baby-blog',   siteUrl: 'sc-domain:babytodak.com',          sitemapUrl: 'https://www.babytodak.com/sitemap.xml' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/',  sitemapUrl: 'https://www.wellnesstodays.com/sitemap.xml' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com',        sitemapUrl: 'https://www.bukbukstock.com/sitemap.xml' },
];

async function main() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    const authClient = await auth.getClient();
    // @ts-ignore
    const sc = google.searchconsole({ version: 'v1', auth: authClient });

    console.log('=== GSC Sitemap 통합 재제출 ===\n');

    for (const site of SITES) {
        try {
            const before = await sc.sitemaps.get({ siteUrl: site.siteUrl, feedpath: site.sitemapUrl });
            const beforeDate = before.data.lastDownloaded?.slice(0, 10);
            const beforeSubmitted = (before.data.contents || []).find((c: any) => c.type === 'web')?.submitted || 'N/A';

            await sc.sitemaps.submit({ siteUrl: site.siteUrl, feedpath: site.sitemapUrl });

            const after = await sc.sitemaps.get({ siteUrl: site.siteUrl, feedpath: site.sitemapUrl });
            console.log(`✅ ${site.name}`);
            console.log(`   Before: ${beforeDate} (${beforeSubmitted}개)`);
            console.log(`   After:  isPending=${after.data.isPending}`);
        } catch (e: any) {
            console.log(`❌ ${site.name}: ${e.message?.slice(0, 100)}`);
        }
        console.log();
    }
}

main().catch(e => { console.error(e); process.exit(1); });
