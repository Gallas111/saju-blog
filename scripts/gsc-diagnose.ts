/**
 * GSC 진단 스크립트 — saju-blog 구글 검색 성능 + 색인 상태 점검
 * 사용법: npx tsx scripts/gsc-diagnose.ts
 */
import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const GSC_SITE_URL = process.env.GSC_SITE_URL!;

async function main() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const authClient = await auth.getClient();
    // @ts-ignore
    const sc = google.searchconsole({ version: 'v1', auth: authClient });

    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d);
    };

    // 최근 28일 (3일 데이터 지연)
    const end28 = daysAgo(3);
    const start28 = daysAgo(31);

    console.log('=== GSC 진단:', GSC_SITE_URL, '===');
    console.log('기간:', start28, '~', end28);
    console.log();

    // 1. 전체 합계
    const total = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: { startDate: start28, endDate: end28, rowLimit: 1 },
    });
    const t = total.data.rows?.[0];
    if (t) {
        console.log('[전체 28일]');
        console.log(`  노출: ${t.impressions?.toLocaleString()}`);
        console.log(`  클릭: ${t.clicks?.toLocaleString()}`);
        console.log(`  CTR: ${((t.ctr || 0) * 100).toFixed(2)}%`);
        console.log(`  평균 게재순위: ${(t.position || 0).toFixed(1)}`);
    } else {
        console.log('[전체 28일] 데이터 없음');
    }
    console.log();

    // 2. 상위 검색어 20개 (노출 많은 순)
    const queries = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
            startDate: start28, endDate: end28,
            dimensions: ['query'], rowLimit: 20,
            orderBy: [{ field: 'impressions', descending: true } as any],
        },
    });
    console.log('[상위 검색어 20개 (노출 많은 순)]');
    queries.data.rows?.forEach((r, i) => {
        const q = r.keys?.[0];
        console.log(`  ${(i+1).toString().padStart(2)}. ${q}`);
        console.log(`      노출 ${r.impressions} / 클릭 ${r.clicks} / CTR ${((r.ctr||0)*100).toFixed(1)}% / 위치 ${(r.position||0).toFixed(1)}`);
    });
    console.log();

    // 3. 상위 페이지 15개
    const pages = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
            startDate: start28, endDate: end28,
            dimensions: ['page'], rowLimit: 15,
            orderBy: [{ field: 'impressions', descending: true } as any],
        },
    });
    console.log('[상위 페이지 15개 (노출 많은 순)]');
    pages.data.rows?.forEach((r, i) => {
        const p = r.keys?.[0]?.replace('https://www.sajubokastory.com', '');
        console.log(`  ${(i+1).toString().padStart(2)}. ${p}`);
        console.log(`      노출 ${r.impressions} / 클릭 ${r.clicks} / CTR ${((r.ctr||0)*100).toFixed(1)}% / 위치 ${(r.position||0).toFixed(1)}`);
    });
    console.log();

    // 4. 디바이스별
    const devices = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
            startDate: start28, endDate: end28,
            dimensions: ['device'],
        },
    });
    console.log('[디바이스별]');
    devices.data.rows?.forEach((r) => {
        console.log(`  ${r.keys?.[0]}: 노출 ${r.impressions} / 클릭 ${r.clicks} / CTR ${((r.ctr||0)*100).toFixed(1)}% / 위치 ${(r.position||0).toFixed(1)}`);
    });
    console.log();

    // 5. 국가별 상위 5
    const countries = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
            startDate: start28, endDate: end28,
            dimensions: ['country'], rowLimit: 5,
        },
    });
    console.log('[국가별 상위 5]');
    countries.data.rows?.forEach((r) => {
        console.log(`  ${r.keys?.[0]}: 노출 ${r.impressions} / 클릭 ${r.clicks}`);
    });
    console.log();

    // 6. Sitemap 상태
    try {
        const sm = await sc.sitemaps.list({ siteUrl: GSC_SITE_URL });
        console.log('[제출된 Sitemap]');
        sm.data.sitemap?.forEach((s) => {
            console.log(`  ${s.path}`);
            console.log(`    마지막 다운로드: ${s.lastDownloaded}`);
            console.log(`    제출 페이지(웹): ${(s.contents || []).find(c => c.type === 'web')?.submitted || 'N/A'}`);
            console.log(`    경고/에러: ${s.warnings || 0} / ${s.errors || 0}`);
            console.log(`    처리 가능: ${s.isPending ? '대기' : '완료'}`);
        });
    } catch (e: any) {
        console.log('[Sitemap] 조회 실패:', e.message);
    }
    console.log();

    // 7. 7일 vs 직전 7일 추세
    const recent7End = daysAgo(3);
    const recent7Start = daysAgo(10);
    const prev7End = daysAgo(11);
    const prev7Start = daysAgo(18);

    const r7 = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: { startDate: recent7Start, endDate: recent7End, rowLimit: 1 },
    });
    const p7 = await sc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: { startDate: prev7Start, endDate: prev7End, rowLimit: 1 },
    });
    const r = r7.data.rows?.[0]; const p = p7.data.rows?.[0];
    console.log('[7일 vs 직전 7일 추세]');
    if (r && p) {
        const impDelta = ((r.impressions! - p.impressions!) / Math.max(p.impressions!, 1) * 100).toFixed(1);
        const clkDelta = ((r.clicks! - p.clicks!) / Math.max(p.clicks!, 1) * 100).toFixed(1);
        console.log(`  최근 7일: 노출 ${r.impressions} / 클릭 ${r.clicks} / 위치 ${r.position?.toFixed(1)}`);
        console.log(`  직전 7일: 노출 ${p.impressions} / 클릭 ${p.clicks} / 위치 ${p.position?.toFixed(1)}`);
        console.log(`  변화: 노출 ${impDelta}% / 클릭 ${clkDelta}%`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
