import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { CATEGORIES } from "@/lib/categories";
import { getAllTags } from "@/lib/tags";

const BASE_URL = "https://www.sajubokastory.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const tags = getAllTags();

  const postUrls = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryUrls = Object.values(CATEGORIES).map((cat) => ({
    url: `${BASE_URL}/category/${encodeURIComponent(cat.name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagUrls = tags.slice(0, 50).map((tag) => ({
    url: `${BASE_URL}/tag/${encodeURIComponent(tag.slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...postUrls,
    ...categoryUrls,
    ...tagUrls,
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date("2026-03-14"),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
  ];
}
