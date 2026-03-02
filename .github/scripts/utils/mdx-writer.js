/**
 * MDX file writer - generates MDX files with frontmatter
 */

const fs = require("fs");
const path = require("path");

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

  const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
slug: "${slug}"
description: "${(post.description || "").replace(/"/g, '\\"')}"
category: "${post.category || "운세"}"
tags: ${JSON.stringify(post.tags || [])}
date: "${date}"
icon: "${post.icon || "🔮"}"
relatedService:
  label: "${(post.relatedService?.label || "내 사주 분석하기").replace(/"/g, '\\"')}"
  href: "${post.relatedService?.href || "https://www.sajuboka.com/saju"}"
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
