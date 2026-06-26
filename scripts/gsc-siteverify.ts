/**
 * Site Verification API — 서비스계정을 도메인 소유자로 DNS_TXT 검증.
 * 사용: cd saju-blog && npx tsx scripts/gsc-siteverify.ts gettoken <domain>
 *       cd saju-blog && npx tsx scripts/gsc-siteverify.ts insert   <domain>
 *       cd saju-blog && npx tsx scripts/gsc-siteverify.ts list
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');
const cmd = process.argv[2];
const domain = process.argv[3];

async function sv() {
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/siteverification'] });
  const client = await auth.getClient();
  return google.siteVerification({ version: 'v1', auth: client as any });
}

async function main() {
  const s = await sv();
  if (cmd === 'gettoken') {
    const r = await s.webResource.getToken({ requestBody: { verificationMethod: 'DNS_TXT', site: { type: 'INET_DOMAIN', identifier: domain } } });
    console.log('METHOD:', r.data.method);
    console.log('TOKEN:', r.data.token);
  } else if (cmd === 'insert') {
    try {
      const r = await s.webResource.insert({ verificationMethod: 'DNS_TXT', requestBody: { site: { type: 'INET_DOMAIN', identifier: domain } } });
      console.log('✅ 검증 성공:', JSON.stringify(r.data));
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message || e?.response?.data?.error?.message || e?.message || String(e);
      console.log(`❌ [${e?.code || e?.response?.status}] ${msg}`);
    }
  } else if (cmd === 'list') {
    const r = await s.webResource.list();
    const items = (r.data.items || []);
    console.log(`소유 검증된 리소스 ${items.length}건:`);
    for (const it of items) console.log('  -', it.site?.type, it.site?.identifier, '| owners:', (it.owners || []).join(','));
  } else {
    console.log('cmd: gettoken <domain> | insert <domain> | list');
  }
}
main().catch(e => { console.error('FATAL', e?.message || e); process.exit(1); });
