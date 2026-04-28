/**
 * GSC Sitemap 재제출 — saju-blog
 * 사용법: npx tsx scripts/gsc-resubmit-sitemap.ts
 */
import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const GSC_SITE_URL = process.env.GSC_SITE_URL!;
const SITEMAP_URL = 'https://www.sajubokastory.com/sitemap.xml';

async function main() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    const authClient = await auth.getClient();
    // @ts-ignore
    const sc = google.searchconsole({ version: 'v1', auth: authClient });

    console.log('=== GSC Sitemap 재제출 ===');
    console.log('사이트:', GSC_SITE_URL);
    console.log('Sitemap:', SITEMAP_URL);

    // Before 상태
    const before = await sc.sitemaps.get({ siteUrl: GSC_SITE_URL, feedpath: SITEMAP_URL });
    console.log('\n[재제출 전]');
    console.log('  마지막 다운로드:', before.data.lastDownloaded);
    console.log('  제출 페이지:', (before.data.contents || []).find(c => c.type === 'web')?.submitted || 'N/A');
    console.log('  에러/경고:', before.data.errors || 0, '/', before.data.warnings || 0);

    // 재제출
    console.log('\n[재제출 호출]');
    await sc.sitemaps.submit({
        siteUrl: GSC_SITE_URL,
        feedpath: SITEMAP_URL,
    });
    console.log('  ✅ submit() 호출 완료');

    // After 상태 (즉시는 반영 안 됨, 호출 결과만 확인)
    const after = await sc.sitemaps.get({ siteUrl: GSC_SITE_URL, feedpath: SITEMAP_URL });
    console.log('\n[재제출 후 즉시 상태]');
    console.log('  마지막 다운로드:', after.data.lastDownloaded);
    console.log('  isPending:', after.data.isPending);
    console.log('  isSitemapsIndex:', after.data.isSitemapsIndex);
    console.log('\n참고: lastDownloaded 갱신은 GSC 크롤러가 실제로 다시 가져와야 반영. 보통 1~3일 소요.');
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
