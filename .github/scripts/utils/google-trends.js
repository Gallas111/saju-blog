/**
 * Google Trends data fetcher (using unofficial API)
 * No API key required
 */

async function getGoogleTrends() {
  try {
    // Use Google Trends RSS for daily trends in South Korea
    const url = "https://trends.google.co.kr/trending/rss?geo=KR";
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Google Trends RSS returned ${response.status}`);
      return [];
    }

    const xml = await response.text();

    // Simple XML parsing for trend titles
    const titles = [];
    const regex = /<title><!\[CDATA\[(.+?)\]\]><\/title>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const title = match[1].trim();
      if (title && title !== "Daily Search Trends") {
        titles.push(title);
      }
    }

    return titles.slice(0, 20);
  } catch (error) {
    console.warn("Google Trends fetch failed:", error.message);
    return [];
  }
}

module.exports = { getGoogleTrends };
