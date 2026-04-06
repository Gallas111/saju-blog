import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SITE_URL = "https://www.sajubokastory.com";
const postsDir = path.join(process.cwd(), "content", "posts");

interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));
  const results: Post[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), "utf-8");
    const { data } = matter(raw);
    if (!data.published) continue;
    results.push({
      slug: data.slug ?? file.replace(/\.mdx$/, ""),
      title: data.title ?? "",
      description: data.description ?? "",
      date: data.date ?? "",
      category: data.category ?? "",
    });
  }

  return results.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

const posts = getAllPosts();

const items = posts
  .slice(0, 50)
  .map((post) => {
    const link = `${SITE_URL}/blog/${post.slug}`;
    return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${post.description}]]></description>
      <category>${post.category}</category>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>사주보까 블로그</title>
    <link>${SITE_URL}</link>
    <description>사주, 운세, 꿈 해몽, 타로, 궁합, 일주론 등 운세 정보를 매일 업데이트합니다.</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

fs.writeFileSync(path.join(process.cwd(), "public", "feed.xml"), xml);
console.log(`feed.xml generated (${Math.min(posts.length, 50)} items)`);
