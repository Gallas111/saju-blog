/**
 * MDX file writer - generates MDX files with frontmatter
 */

const fs = require("fs");
const path = require("path");

const VALID_SERVICE_URLS = {
  일주론: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  "꿈 해몽": { label: "내 꿈 AI 해몽하기", href: "https://www.sajuboka.com/dream" },
  운세: { label: "오늘의 운세 확인하기", href: "https://www.sajuboka.com/today" },
  사주: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  타로: { label: "AI 타로 점 보러가기", href: "https://www.sajuboka.com/tarot" },
  명리학: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  궁합: { label: "궁합 보러가기", href: "https://www.sajuboka.com/compatibility" },
  오행: { label: "내 사주 분석하기", href: "https://www.sajuboka.com/saju" },
  절기: { label: "오늘의 운세 확인하기", href: "https://www.sajuboka.com/today" },
  작명: { label: "AI 작명하기", href: "https://www.sajuboka.com/name" },
};

const ALLOWED_HREFS = new Set(Object.values(VALID_SERVICE_URLS).map(v => v.href));

function getValidRelatedService(category, provided) {
  // If the provided href is valid, use it
  if (provided?.href && ALLOWED_HREFS.has(provided.href)) {
    return provided;
  }
  // Otherwise, use the category-based default
  const defaults = VALID_SERVICE_URLS[category] || VALID_SERVICE_URLS["사주"];
  if (provided?.href && !ALLOWED_HREFS.has(provided.href)) {
    console.warn(`  ⚠️ relatedService URL 교정: ${provided.href} → ${defaults.href}`);
  }
  return defaults;
}

function generateSlug(title) {
  // Extract key Korean words and romanize roughly
  const today = new Date().toISOString().split("T")[0];
  // Create a simple slug from date + sanitized title
  const sanitized = title
    .replace(/[^\w가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
  return `${today}-${sanitized}`;
}

function writeMdxFile(post, { postsDir } = {}) {
  const dir = postsDir || path.join(process.cwd(), "content", "posts");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const slug = post.slug || generateSlug(post.title);
  const date = post.date || new Date().toISOString().split("T")[0];
  const fileName = `${date}-${slug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}.mdx`;
  const filePath = path.join(dir, fileName);

  // Check for duplicate
  if (fs.existsSync(filePath)) {
    console.log(`Skipping duplicate: ${fileName}`);
    return null;
  }

  const category = post.category || "운세";
  const relatedService = getValidRelatedService(category, post.relatedService);

  const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
slug: "${slug}"
description: "${(post.description || "").replace(/"/g, '\\"')}"
category: "${category}"
tags: ${JSON.stringify(post.tags || [])}
date: "${date}"
icon: "${post.icon || "🔮"}"
relatedService:
  label: "${relatedService.label.replace(/"/g, '\\"')}"
  href: "${relatedService.href}"
keywords:
  primary: "${(post.keywords?.primary || "").replace(/"/g, '\\"')}"
  secondary: ${JSON.stringify(post.keywords?.secondary || [])}
  longTail: ${JSON.stringify(post.keywords?.longTail || [])}
published: true
---

${post.content}`;

  fs.writeFileSync(filePath, frontmatter, "utf-8");
  console.log(`Created: ${fileName}`);
  return filePath;
}

module.exports = { writeMdxFile, generateSlug };
