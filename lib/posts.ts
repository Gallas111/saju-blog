import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { calculateReadingTime } from "./reading-time";

const postsDirectory = path.join(process.cwd(), "content", "posts");

export interface PostMeta {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  date: string;
  dateModified?: string;
  icon: string;
  relatedService: {
    label: string;
    href: string;
  };
  keywords: {
    primary: string;
    secondary: string[];
    longTail: string[];
  };
  published: boolean;
  noindex?: boolean;
  readingTime: number;
}

export interface Post extends PostMeta {
  content: string;
}

function parseFrontmatter(fileContent: string, fileName: string): Post | null {
  const { data, content } = matter(fileContent);

  if (!data.published) return null;

  const today = new Date().toISOString().split("T")[0];
  if (data.date > today) return null;

  return {
    title: data.title ?? "",
    slug: data.slug ?? fileName.replace(/\.mdx?$/, ""),
    description: data.description ?? "",
    category: data.category ?? "운세",
    tags: data.tags ?? [],
    date: data.date ?? "",
    dateModified: data.dateModified ?? undefined,
    icon: data.icon ?? "🔮",
    relatedService: data.relatedService ?? {
      label: "내 사주 분석하기",
      href: "https://www.sajuboka.com/saju",
    },
    keywords: data.keywords ?? {
      primary: "",
      secondary: [],
      longTail: [],
    },
    published: data.published ?? true,
    noindex: data.noindex === true,
    readingTime: calculateReadingTime(content),
    content,
  };
}

// Build-time cache: 530개 MDX를 한 번만 읽고 모든 호출에서 재사용.
// 캐시 없을 때 페이지당 getAllPosts/getPostBySlug/getRelatedPosts가 매번 530회 readFileSync+matter() →
// 530 페이지 × ~1,500회 파싱으로 빌드 8분 + 누적 추세였음. (2026-05-09 fix)
let _allPostsCache: Map<string, Post> | null = null;

function loadAllPosts(): Map<string, Post> {
  if (_allPostsCache) return _allPostsCache;
  const cache = new Map<string, Post>();
  if (!fs.existsSync(postsDirectory)) {
    _allPostsCache = cache;
    return cache;
  }
  const fileNames = fs.readdirSync(postsDirectory);
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".mdx") && !fileName.endsWith(".md")) continue;
    const filePath = path.join(postsDirectory, fileName);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const post = parseFrontmatter(fileContent, fileName);
    if (post) cache.set(post.slug, post);
  }
  _allPostsCache = cache;
  return cache;
}

export function getAllPosts(): PostMeta[] {
  const cache = loadAllPosts();
  const posts: PostMeta[] = [];
  for (const post of cache.values()) {
    const { content: _, ...meta } = post;
    posts.push(meta);
  }
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): Post | null {
  return loadAllPosts().get(slug) ?? null;
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter((post) => post.category === category);
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export function getRelatedPosts(
  currentSlug: string,
  limit = 3
): PostMeta[] {
  const current = getAllPosts().find((p) => p.slug === currentSlug);
  if (!current) return [];

  const others = getAllPosts().filter((p) => p.slug !== currentSlug);

  const scored = others.map((post) => {
    let score = 0;
    if (post.category === current.category) score += 3;
    const commonTags = post.tags.filter((t) => current.tags.includes(t));
    score += commonTags.length;
    return { post, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.post);
}

export function searchPosts(query: string): PostMeta[] {
  const q = query.toLowerCase();
  return getAllPosts().filter(
    (post) =>
      post.title.toLowerCase().includes(q) ||
      post.description.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}
