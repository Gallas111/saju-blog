/**
 * GSC 속성 추가 + 사이트맵 제출 — sc-domain 속성을 Search Console에 등록(측정 활성화).
 * 전제: SA가 해당 도메인 소유 검증됨(scripts/gsc-siteverify.ts list 로 확인).
 * 사용: cd saju-blog && npx tsx scripts/gsc-add-property.ts <domain> [sitemapUrl]
 *   예: npx tsx scripts/gsc-add-property.ts gumkit.app https://gumkit.app/sitemap.xml
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');
const domain = process.argv[2];
const sitemapUrl = process.argv[3];

async function main() {
  if (!domain) { console.log('사용: npx tsx scripts/gsc-add-property.ts <domain> [sitemapUrl]'); process.exit(1); }
  const siteUrl = `sc-domain:${domain}`;
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/webmasters'] });
  const sc = google.searchconsole({ version: 'v1', auth: (await auth.getClient()) as any });

  // 1) 속성 추가 (이미 있으면 무해)
  try {
    await sc.sites.add({ siteUrl });
    console.log('✅ 속성 추가:', siteUrl);
  } catch (e: any) {
    console.log(`⚠️ 속성 추가 [${e?.code || e?.response?.status}]: ${e?.errors?.[0]?.message || e?.message}`);
  }

  // 2) 권한 확인
  try {
    const got = await sc.sites.get({ siteUrl });
    console.log('   권한레벨:', got.data.permissionLevel);
  } catch (e: any) {
    console.log('   sites.get 실패:', e?.message);
  }

  // 3) 사이트맵 제출
  if (sitemapUrl) {
    try {
      await sc.sitemaps.submit({ siteUrl, feedpath: sitemapUrl });
      console.log('✅ 사이트맵 제출:', sitemapUrl);
      const s = await sc.sitemaps.get({ siteUrl, feedpath: sitemapUrl });
      console.log('   isPending:', s.data.isPending, '| lastDownloaded:', s.data.lastDownloaded || '(아직 미크롤)');
    } catch (e: any) {
      console.log(`⚠️ 사이트맵 제출 [${e?.code || e?.response?.status}]: ${e?.errors?.[0]?.message || e?.message}`);
    }
  }

  // 4) 최종 재확인
  const list = await sc.sites.list({});
  const found = (list.data.siteEntry || []).find((s) => s.siteUrl === siteUrl);
  console.log(found ? `\n🟢 최종 확인: ${siteUrl} 등록됨 (${found.permissionLevel})` : `\n🔴 ${siteUrl} 아직 목록에 없음`);
}
main().catch((e) => { console.error('FATAL', e?.message || e); process.exit(1); });
