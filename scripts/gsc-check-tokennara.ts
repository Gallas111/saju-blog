/**
 * tokennara GSC 권한 점검 — 서비스 계정 등록 됐는지 확인
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const TOKENNARA_VARIANTS = [
  'sc-domain:tokennara.com',
  'https://www.tokennara.com/',
  'https://tokennara.com/',
];

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth: await auth.getClient() as any });

  // 1. 서비스 계정이 접근 가능한 모든 사이트 list
  console.log('▸ 서비스 계정에 등록된 사이트 list:');
  const sites = await sc.sites.list();
  for (const s of (sites.data.siteEntry || [])) {
    const isToken = (s.siteUrl || '').toLowerCase().includes('tokennara');
    console.log(`  ${isToken ? '🎯' : '  '} ${s.siteUrl}  (${s.permissionLevel})`);
  }

  // 2. tokennara 변형별로 액세스 시도
  console.log('\n▸ tokennara 데이터 액세스 시도:');
  for (const url of TOKENNARA_VARIANTS) {
    try {
      const r = await sc.searchanalytics.query({
        siteUrl: url,
        requestBody: { startDate: '2026-05-13', endDate: '2026-05-18', rowLimit: 1 },
      });
      const row = r.data.rows?.[0];
      console.log(`  ✅ ${url}  imp=${row?.impressions ?? 0} clk=${row?.clicks ?? 0}`);
    } catch (e: any) {
      console.log(`  ❌ ${url}  → ${e.message?.slice(0, 80)}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
