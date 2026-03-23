/**
 * AI wrapper: Gemini first → Groq → CF Workers AI fallback
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

async function callGeminiDirect(prompt, { temperature = 0.8, maxTokens = 8192 } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });
  if (response.status === 429) throw new Error("GEMINI_RATE_LIMIT");
  if (!response.ok) throw new Error(`Gemini error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callCFWorkersAI(prompt, { maxTokens = 8192 } = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
  });
  if (!response.ok) throw new Error(`CF AI error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.result?.response ?? "";
}

async function callGemini(prompt, opts = {}) {
  if (GEMINI_API_KEY) {
    try {
      return await callGeminiDirect(prompt, opts);
    } catch (err) {
      if (err.message === "GEMINI_RATE_LIMIT") {
        console.warn("⚡ Gemini 한도 초과 → CF Workers AI로 전환");
      } else {
        console.warn(`⚠️ Gemini 실패 → CF Workers AI로 전환: ${err.message}`);
      }
    }
  }
  // 2nd: Try Groq
  if (GROQ_API_KEY) {
    try {
      const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 8192 }),
      });
      if (groqResp.status === 429) {
        console.warn('⚡ Groq 한도 초과 → CF Workers AI로 전환');
      } else if (groqResp.ok) {
        const groqData = await groqResp.json();
        const text = groqData.choices?.[0]?.message?.content?.trim() || '';
        if (text) return text;
      }
    } catch (err) {
      console.warn(`⚠️ Groq 실패 → CF Workers AI로 전환: ${err.message}`);
    }
  }

  // 3rd: CF Workers AI fallback
  if (CF_ACCOUNT_ID && CF_API_TOKEN) {
    return await callCFWorkersAI(prompt, opts);
  }
  throw new Error("Gemini, Groq, CF Workers AI 모두 사용 불가");
}

module.exports = { callGemini };
