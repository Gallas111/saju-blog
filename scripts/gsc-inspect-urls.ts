// 지정한 URL 목록의 색인 상태를 URL Inspection API 로 조회 (2026-07-17)
// 사용: npx tsx scripts/gsc-inspect-urls.ts <urls.txt> <siteUrl>
//   urls.txt = 한 줄에 URL 하나
//   siteUrl  = 'sc-domain:example.com' 또는 'https://www.example.com/'
// 출력: "<URL>\t<verdict>\t<coverageState>" — verdict: PASS/NEUTRAL/FAIL
// 쿼리 한도가 있으므로(속성당 일 2000·분 600) 표본 조회에 쓸 것.
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-credentials.json');

async function main() {
  const listFile = process.argv[2];
  const siteUrl = process.argv[3];
  if (!listFile || !siteUrl) {
    console.log('사용: npx tsx scripts/gsc-inspect-urls.ts <urls.txt> <siteUrl>');
    process.exit(1);
  }
  const urls = fs.readFileSync(listFile, 'utf-8').split('\n').map(s => s.trim()).filter(Boolean);
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });

  let pass = 0, fail = 0, err = 0;
  for (const url of urls) {
    try {
      const r = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl },
      });
      const idx = r.data.inspectionResult?.indexStatusResult;
      const verdict = idx?.verdict || 'UNKNOWN';
      const cov = idx?.coverageState || '';
      if (verdict === 'PASS') pass++; else fail++;
      console.log(`${url}\t${verdict}\t${cov}`);
    } catch (e: any) {
      err++;
      console.log(`${url}\tERROR\t${(e?.message || e).toString().slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 120)); // 분당 한도 여유
  }
  console.error(`\n=== PASS(색인됨) ${pass} / 비PASS ${fail} / 에러 ${err} ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
