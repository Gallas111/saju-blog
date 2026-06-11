import { google } from 'googleapis';
import path from 'path';

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'google-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
  const sc = google.webmasters({ version: 'v3', auth });
  const res = await sc.sites.list({});
  for (const s of res.data.siteEntry || []) {
    console.log(`${s.permissionLevel}  ${s.siteUrl}`);
  }
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
