import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import { marked } from 'marked';

dotenv.config({ path: '.env.local' });
dotenv.config();

const KEY_FILE_PATH = path.join(process.cwd(), 'google-credentials.json');
const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;
const GSC_SITE_URL = process.env.GSC_SITE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_RECEIVER = process.env.EMAIL_RECEIVER;

async function authenticateGoogle() {
    let auth;
    if (fs.existsSync(KEY_FILE_PATH)) {
        auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: [
                'https://www.googleapis.com/auth/webmasters.readonly',
                'https://www.googleapis.com/auth/analytics.readonly'
            ],
        });
    } else {
        const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
        if (!credentialsBase64) {
            throw new Error('Google Credentials (JSON file or GOOGLE_CREDENTIALS_BASE64)이 필요합니다.');
        }
        const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
        fs.writeFileSync(KEY_FILE_PATH, credentialsJson);
        auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: [
                'https://www.googleapis.com/auth/webmasters.readonly',
                'https://www.googleapis.com/auth/analytics.readonly'
            ],
        });
    }
    return await auth.getClient();
}

async function fetchSearchConsoleData(authClient: any) {
    if (!GSC_SITE_URL) throw new Error('환경변수 GSC_SITE_URL이 설정되지 않았습니다.');
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 10);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const response = await searchconsole.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['query', 'page'],
            rowLimit: 50,
        },
    });
    return response.data.rows || [];
}

async function fetchAnalyticsData(authClient: any) {
    if (!GA_PROPERTY_ID) throw new Error('환경변수 GA_PROPERTY_ID가 설정되지 않았습니다.');
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: authClient });

    // @ts-ignore
    const response = await analyticsdata.properties.runReport({
        property: `properties/${GA_PROPERTY_ID}`,
        requestBody: {
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }, { name: 'hostName' }],
            metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }, { name: 'engagementRate' }],
            dimensionFilter: {
                filter: {
                    fieldName: 'hostName',
                    stringFilter: {
                        matchType: 'CONTAINS',
                        value: 'sajubokastory.com',
                    },
                },
            },
            limit: 100,
        },
    }) as any;

    return response.data.rows || [];
}

async function generateFocusedInsights(gscData: any[], gaData: any[]) {
    if (!GEMINI_API_KEY) throw new Error('환경변수 GEMINI_API_KEY가 설정되지 않았습니다.');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
당신은 '사주보까 스토리(sajubokastory.com)' 사주/운세 블로그 전담 SEO 및 수익형 블로그 컨설턴트입니다.
제공된 데이터를 기반으로 오직 sajubokastory.com 블로그의 성장에만 집중한 리포트를 작성해주세요.

[GSC 데이터]
${JSON.stringify(gscData.slice(0, 20), null, 2)}

[GA4 데이터 (sajubokastory.com 관련 페이지만 추출됨)]
${JSON.stringify(gaData.slice(0, 20), null, 2)}

### 리포트 구성 가이드:
1. **[분석 리포트] 사주보까 스토리 블로그 성장 현황** 이라는 제목으로 시작하세요.
2. **📊 주요 성과 요약**: GSC에서 상위 노출되는 사주/운세 관련 키워드(1~5위)와 클릭률(CTR) 분석을 강조하세요.
3. **🚀 3단계 개선 전략**:
   - [Step 1] 클릭을 유도하는 구체적인 제목 변경 제안 (3가지 옵션)
   - [Step 2] 콘텐츠 내 사용자 체류 시간을 높이기 위한 구조적 개선안
   - [Step 3] 데이터 추적 최적화 방향
4. **💡 분석 도우미 요청 프롬프트 (가이드)**: 사용자가 다음에 나에게 요청할 때 사용할 수 있는 디테일한 프롬프트 템플릿을 마크다운 코드 블록으로 반드시 포함하세요. (제목 제안, 메타 설명, 이미지 프롬프트, 내부 링크 전략 등이 포함된 체크리스트 형태)

톤앤매너는 전문적이면서도 응원하는 분위기로 작성해주시고, 이메일로 읽기 좋게 마크다운 형식을 잘 활용해주세요.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function main() {
    try {
        console.log('🔮 사주보까 스토리 블로그 전담 자동 리포트 생성을 시작합니다...');
        const authClient = await authenticateGoogle();

        const gscData = await fetchSearchConsoleData(authClient);
        const gaData = await fetchAnalyticsData(authClient);

        const insights = await generateFocusedInsights(gscData, gaData);

        const reportHtml = await marked.parse(insights);
        const dateStr = new Date().toISOString().split('T')[0];

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 0; font-family: 'Pretendard', sans-serif; background-color: #f4f7f9; color: #333; line-height: 1.7; }
        .container { max-width: 680px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 50px 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 800; }
        .content { padding: 40px; }
        h1, h2, h3 { color: #1e293b; }
        h2 { color: #7c3aed; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        pre { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 12px; font-size: 14px; }
        .footer { padding: 30px; text-align: center; background: #f8fafc; color: #94a3b8; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔮 사주보까 스토리 3일 주기 AI 성장 리포트</h1>
            <p>${dateStr} 기준 데이터 분석 결과</p>
        </div>
        <div class="content">
            ${reportHtml}
        </div>
        <div class="footer">
            본 리포트는 GitHub Actions를 통해 3일마다 자동으로 생성됩니다.<br>
            &copy; ${new Date().getFullYear()} 사주보까 스토리 Automation
        </div>
    </div>
</body>
</html>
        `;

        const mailOptions = {
            from: `"사주보까 분석 도우미" <${EMAIL_USER}>`,
            to: EMAIL_RECEIVER,
            subject: `[자동 보고] 🔮 사주보까 스토리 블로그 3일 주기 성장 전략`,
            html: emailTemplate,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ 이메일 자동 발송 완료! 수신: ${EMAIL_RECEIVER}`);

    } catch (error) {
        console.error('❌ 실행 중 에러 발생:', error);
        process.exit(1);
    }
}

main();
