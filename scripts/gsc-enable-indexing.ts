/** Service Usage API로 Indexing API 활성화 시도 (서비스계정에 권한 있을 때만). */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');
const PROJECT = 'poised-climate-491505-p6';

async function main() {
  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const su = google.serviceusage({ version: 'v1', auth: client as any });
  console.log(`projects/${PROJECT}/services/indexing.googleapis.com 활성화 시도...`);
  try {
    const r = await su.services.enable({ name: `projects/${PROJECT}/services/indexing.googleapis.com` });
    console.log('✅ enable 호출 OK:', JSON.stringify(r.data).slice(0, 300));
  } catch (e: any) {
    const msg = e?.errors?.[0]?.message || e?.response?.data?.error?.message || e?.message || String(e);
    const code = e?.code || e?.response?.status;
    console.log(`❌ [${code}] ${msg}`);
    const link = (msg.match(/https?:\/\/\S+/) || [])[0];
    if (link) console.log('   (참고 링크:', link, ')');
  }
}
main().catch(e => { console.error('FATAL', e?.message || e); process.exit(1); });
