/**
 * Naver DataLab API wrapper for search trend data
 * Requires NAVER_CLIENT_ID and NAVER_CLIENT_SECRET
 */

const NAVER_API_URL = "https://openapi.naver.com/v1/datalab/search";

async function getNaverTrends(keywords = []) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("Naver DataLab API keys not set, skipping");
    return [];
  }

  if (keywords.length === 0) return [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d) => d.toISOString().split("T")[0];

  // Naver DataLab allows max 5 keyword groups per request
  const groups = keywords.slice(0, 5).map((kw) => ({
    groupName: kw,
    keywords: [kw],
  }));

  try {
    const response = await fetch(NAVER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      body: JSON.stringify({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        timeUnit: "week",
        keywordGroups: groups,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`Naver DataLab error (${response.status}):`, error);
      return [];
    }

    const data = await response.json();
    return (data.results ?? []).map((r) => ({
      keyword: r.title,
      data: r.data,
    }));
  } catch (error) {
    console.warn("Naver DataLab fetch failed:", error.message);
    return [];
  }
}

module.exports = { getNaverTrends };
