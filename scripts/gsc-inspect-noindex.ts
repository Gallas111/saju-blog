/**
 * 옛 thin(noindex) 글이 Google 색인에서 빠졌는지 URL Inspection API로 확인.
 * AdSense 재검토 전 "재크롤로 deindex 반영됐는지" 게이트 점검용.
 * 사용법: npx tsx scripts/gsc-inspect-noindex.ts
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const TARGETS = [
  {
    name: 'baby-blog', siteUrl: 'sc-domain:babytodak.com', base: 'https://www.babytodak.com/blog/',
    slugs: [
      'baby-bottle-sterilization-guide', 'baby-colic-relief-guide', 'baby-diaper-recommendation-guide',
      'baby-ear-cleaning-safety-guide', 'baby-nail-trimming-safe-guide', 'baby-vaccination-schedule-guide',
      'baby-spring-clothes-dressing-guide', 'baby-spring-pollen-allergy-response-april-guide',
    ],
  },
  {
    name: 'easy-zetec', siteUrl: 'sc-domain:easyzetec.com', base: 'https://www.easyzetec.com/blog/',
    slugs: [
      'bank-account-splitting-guide-2026', 'check-card-benefits-comparison-2026', 'credit-check-card-tax-deduction',
      'credit-score-boost-with-credit-card', 'credit-score-misconceptions-5-mistakes', 'emergency-fund-account-3-steps-practice',
      'irp-withdrawal-penalty-method-guide', 'isa-account-monthly-30k-strategy-guide',
    ],
  },
];

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const authClient = await auth.getClient();
  const sc = google.searchconsole({ version: 'v1', auth: authClient as any });

  for (const t of TARGETS) {
    console.log(`\n■ ${t.name} (${t.siteUrl}) — 옛 noindex 글 색인상태`);
    let indexedBad = 0, deindexedGood = 0, other = 0;
    for (const slug of t.slugs) {
      const url = t.base + slug;
      try {
        const res = await sc.urlInspection.index.inspect({
          requestBody: { inspectionUrl: url, siteUrl: t.siteUrl },
        });
        const r: any = res.data.inspectionResult?.indexStatusResult || {};
        const verdict = r.verdict || '?';
        const cov = r.coverageState || '?';
        // 색인되어 있으면(=AdSense가 보는 thin) 나쁨, 'noindex로 제외'/'색인 안 됨'이면 좋음
        const isIndexed = /indexed/i.test(cov) && !/not indexed/i.test(cov);
        const isExcludedNoindex = /noindex|not indexed|excluded|not in index/i.test(cov);
        if (isIndexed && !isExcludedNoindex) indexedBad++;
        else if (isExcludedNoindex) deindexedGood++;
        else other++;
        console.log(`  ${slug}\n      verdict=${verdict} | coverage=${cov} | robots=${r.robotsTxtState || '?'} | indexing=${r.indexingState || '?'}`);
      } catch (e: any) {
        console.log(`  ${slug}\n      ERROR: ${e?.errors?.[0]?.message || e?.message || e}`);
        other++;
      }
    }
    console.log(`  → 요약: 아직색인(나쁨)=${indexedBad} / deindex·제외(좋음)=${deindexedGood} / 기타=${other}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
