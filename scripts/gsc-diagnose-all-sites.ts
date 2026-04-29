/**
 * GSC 통합 진단 — 7개 사이트 한 번에 분석
 * 사용법: npx tsx scripts/gsc-diagnose-all-sites.ts
 */
import { google } from 'googleapis';
import * as path from 'path';

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');

const SITES: Array<{ name: string; siteUrl: string; sitemapUrl: string }> = [
  { name: 'ai-blog',     siteUrl: 'sc-domain:how-toai.com',           sitemapUrl: 'https://www.how-toai.com/sitemap.xml' },
  { name: 'saju-blog',   siteUrl: 'https://www.sajubokastory.com/',   sitemapUrl: 'https://www.sajubokastory.com/sitemap.xml' },
  { name: 'quicktools',  siteUrl: 'sc-domain:toolkio.com',            sitemapUrl: 'https://toolkio.com/sitemap.xml' },
  { name: 'easy-zetec',  siteUrl: 'sc-domain:easyzetec.com',          sitemapUrl: 'https://www.easyzetec.com/sitemap.xml' },
  { name: 'baby-blog',   siteUrl: 'sc-domain:babytodak.com',          sitemapUrl: 'https://www.babytodak.com/sitemap.xml' },
  { name: 'health-blog', siteUrl: 'https://www.wellnesstodays.com/',  sitemapUrl: 'https://www.wellnesstodays.com/sitemap.xml' },
  { name: 'bukbukstock', siteUrl: 'sc-domain:bukbukstock.com',        sitemapUrl: 'https://www.bukbukstock.com/sitemap.xml' },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

async function diagnoseSite(sc: any, site: typeof SITES[0]) {
    const start28 = daysAgo(31), end28 = daysAgo(3);
    const result: any = { name: site.name };

    try {
        const total = await sc.searchanalytics.query({
            siteUrl: site.siteUrl,
            requestBody: { startDate: start28, endDate: end28, rowLimit: 1 },
        });
        const t = total.data.rows?.[0];
        result.total = t ? {
            imp: t.impressions, clk: t.clicks,
            ctr: ((t.ctr || 0) * 100).toFixed(2) + '%',
            pos: (t.position || 0).toFixed(1)
        } : 'NO DATA';

        const top = await sc.searchanalytics.query({
            siteUrl: site.siteUrl,
            requestBody: {
                startDate: start28, endDate: end28,
                dimensions: ['query'], rowLimit: 5,
                orderBy: [{ field: 'impressions', descending: true } as any],
            },
        });
        result.topQueries = top.data.rows?.map((r: any) => ({
            q: r.keys[0], imp: r.impressions, clk: r.clicks,
            ctr: ((r.ctr || 0) * 100).toFixed(1) + '%',
            pos: (r.position || 0).toFixed(1)
        })) || [];

        const dev = await sc.searchanalytics.query({
            siteUrl: site.siteUrl,
            requestBody: { startDate: start28, endDate: end28, dimensions: ['device'] },
        });
        result.devices = dev.data.rows?.map((r: any) => ({
            d: r.keys[0], imp: r.impressions, clk: r.clicks,
            ctr: ((r.ctr || 0) * 100).toFixed(1) + '%'
        })) || [];

        try {
            const sm = await sc.sitemaps.get({ siteUrl: site.siteUrl, feedpath: site.sitemapUrl });
            result.sitemap = {
                lastDownloaded: sm.data.lastDownloaded,
                submitted: (sm.data.contents || []).find((c: any) => c.type === 'web')?.submitted || 'N/A',
                errors: sm.data.errors || 0,
                warnings: sm.data.warnings || 0,
                pending: sm.data.isPending,
            };
        } catch (e: any) {
            result.sitemap = `ERR: ${e.message?.slice(0, 60)}`;
        }
    } catch (e: any) {
        result.error = e.message?.slice(0, 100);
    }
    return result;
}

async function main() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const authClient = await auth.getClient();
    // @ts-ignore
    const sc = google.searchconsole({ version: 'v1', auth: authClient });

    console.log('=== GSC 통합 진단 (28일 기간) ===\n');

    for (const site of SITES) {
        const r = await diagnoseSite(sc, site);
        console.log(`■ ${r.name}`);
        if (r.error) {
            console.log(`  ERROR: ${r.error}\n`);
            continue;
        }
        console.log(`  전체: ${JSON.stringify(r.total)}`);
        console.log(`  디바이스: ${r.devices.map((d: any) => `${d.d} ${d.imp}/${d.clk}/${d.ctr}`).join(' | ')}`);
        if (r.sitemap && typeof r.sitemap === 'object') {
            console.log(`  Sitemap: 마지막다운로드 ${r.sitemap.lastDownloaded?.slice(0,10)} / 제출 ${r.sitemap.submitted} / 에러 ${r.sitemap.errors}`);
        } else {
            console.log(`  Sitemap: ${r.sitemap}`);
        }
        console.log(`  Top5 검색어:`);
        r.topQueries.slice(0, 5).forEach((q: any, i: number) => {
            console.log(`    ${i + 1}. ${q.q} — ${q.imp}/${q.clk}/${q.ctr}/위치${q.pos}`);
        });
        console.log();
    }
}

main().catch(e => { console.error(e); process.exit(1); });
