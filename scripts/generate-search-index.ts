import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDir = path.join(process.cwd(), "content", "posts");

interface SearchEntry {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  date: string;
}

function generate(): SearchEntry[] {
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));
  const today = new Date().toISOString().split("T")[0];
  const results: SearchEntry[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), "utf-8");
    const { data } = matter(raw);
    if (!data.published) continue;
    if (data.date > today) continue;
    results.push({
      title: data.title ?? "",
      slug: data.slug ?? file.replace(/\.mdx$/, ""),
      description: data.description ?? "",
      category: data.category ?? "",
      tags: data.tags ?? [],
      icon: data.icon ?? "🔮",
      date: data.date ?? "",
    });
  }

  return results.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

const entries = generate();
fs.writeFileSync(
  path.join(process.cwd(), "public", "search-index.json"),
  JSON.stringify(entries)
);
console.log(`search-index.json generated (${entries.length} posts)`);
