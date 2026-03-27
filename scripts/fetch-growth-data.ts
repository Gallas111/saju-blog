/**
 * Growth Data Fetcher — Search Console + GA4 데이터를 JSON으로 출력
 * Claude가 직접 분석할 수 있도록 raw 데이터만 수집
 *
 * 사용법: npx tsx scripts/fetch-growth-data.ts
 */
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;
const GSC_SITE_URL = process.env.GSC_SITE_URL;

async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: [
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/analytics.readonly'
        ],
    });
    return await auth.getClient();
}

async function fetchGSC(authClient: any) {
    if (!GSC_SITE_URL) return [];
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    const end = new Date(); end.setDate(end.getDate() - 3);
    const start = new Date(); start.setDate(end.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const res = await searchconsole.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
            startDate: fmt(start),
            endDate: fmt(end),
            dimensions: ['query', 'page'],
            rowLimit: 30,
        },
    });
    return res.data.rows || [];
}

async function fetchGA4(authClient: any) {
    if (!GA_PROPERTY_ID) return [];
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: authClient });

    // @ts-ignore
    const res = await analyticsdata.properties.runReport({
        property: `properties/${GA_PROPERTY_ID}`,
        requestBody: {
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
            metrics: [
                { name: 'screenPageViews' },
                { name: 'activeUsers' },
                { name: 'averageSessionDuration' },
                { name: 'engagementRate' },
            ],
            limit: 30,
        },
    }) as any;
    return res.data.rows || [];
}

async function main() {
    const authClient = await authenticate();

    const [gscData, gaData] = await Promise.all([
        fetchGSC(authClient),
        fetchGA4(authClient),
    ]);

    const report = {
        site: GSC_SITE_URL,
        fetchedAt: new Date().toISOString(),
        searchConsole: {
            period: 'last 7 days (3-day delay)',
            count: gscData.length,
            data: gscData,
        },
        analytics: {
            period: 'last 7 days',
            count: gaData.length,
            data: gaData,
        },
    };

    // stdout으로 JSON 출력 (Claude가 읽을 수 있도록)
    console.log(JSON.stringify(report, null, 2));
}

main().catch(e => {
    console.error('ERROR:', e.message);
    process.exit(1);
});
