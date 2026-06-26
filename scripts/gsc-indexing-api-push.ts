/**
 * Google Indexing API 푸시 — 서비스계정(google-credentials.json)으로 urlNotifications:publish 호출.
 * ⚠️ 공식은 JobPosting/BroadcastEvent 전용. 일반 페이지는 그레이햇(크롤 유도 목적). 일 200 URL 한도.
 * 사용법: cd saju-blog && npx tsx scripts/gsc-indexing-api-push.ts <urls.txt> [URL_UPDATED|URL_DELETED]
 *   urls.txt = 한 줄에 URL 하나
 */
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');
const urlFile = process.argv[2];
const type = (process.argv[3] || 'URL_UPDATED') as 'URL_UPDATED' | 'URL_DELETED';

function looksDisabled(msg: string, code: any) {
  const m = (msg || '').toLowerCase();
  return m.includes('has not been used') || m.includes('is disabled') ||
    m.includes('indexing api has not') || (String(code) === '403' && m.includes('indexing'));
}

async function main() {
  if (!fs.existsSync(KEY_FILE)) { console.error('google-credentials.json 없음 (cwd:', process.cwd(), ')'); process.exit(1); }
  if (!urlFile || !fs.existsSync(urlFile)) { console.error('URL 파일 없음:', urlFile); process.exit(1); }
  const urls = fs.readFileSync(urlFile, 'utf-8').split('\n').map(s => s.trim()).filter(s => s.startsWith('http'));
  console.log(`대상 ${urls.length} URL · type=${type} · 서비스계정 인증\n`);

  const auth = new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/indexing'] });
  const client = await auth.getClient();
  const indexing = google.indexing({ version: 'v3', auth: client as any });

  let ok = 0, fail = 0; const failMsgs: string[] = [];
  for (const url of urls) {
    try {
      const res = await indexing.urlNotifications.publish({ requestBody: { url, type } });
      const t = (res.data as any)?.urlNotificationMetadata?.latestUpdate?.notifyTime;
      console.log(`  ✅ ${url}${t ? '  (' + t + ')' : ''}`);
      ok++;
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message || e?.response?.data?.error?.message || e?.message || String(e);
      const code = e?.code || e?.response?.status;
      console.log(`  ❌ [${code}] ${url} — ${msg}`);
      failMsgs.push(`${code}: ${msg}`);
      fail++;
      if (looksDisabled(msg, code)) {
        const link = (msg.match(/https?:\/\/\S+/) || [])[0];
        console.log(`\n⛔ Indexing API 미활성화로 판단 — 중단.`);
        if (link) console.log(`   활성화 링크: ${link}`);
        else console.log(`   활성화: https://console.cloud.google.com/apis/library/indexing.googleapis.com?project=poised-climate-491505-p6`);
        break;
      }
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`\n=== 완료: 성공 ${ok} / 실패 ${fail} ===`);
  if (failMsgs.length) {
    const uniq = [...new Set(failMsgs)];
    console.log('실패 유형:', uniq.slice(0, 6).join('  ||  '));
  }
}
main().catch(e => { console.error('FATAL', e?.message || e); process.exit(1); });
