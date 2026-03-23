/**
 * Cloudflare Workers AI wrapper for content generation
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

async function callGemini(prompt, { temperature = 0.8, maxTokens = 8192 } = {}) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) throw new Error("CF_ACCOUNT_ID and CF_API_TOKEN are required");

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`CF Workers AI error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.result?.response ?? "";
}

module.exports = { callGemini };
