import { getAllPosts } from "./posts";

export interface TagInfo {
  name: string;
  count: number;
  slug: string;
}

function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "");
}

export function getAllTags(): TagInfo[] {
  const posts = getAllPosts();
  const tagMap = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      slug: tagToSlug(name),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getPostsByTag(tagSlug: string) {
  const posts = getAllPosts();
  return posts.filter((post) =>
    post.tags.some((tag) => tagToSlug(tag) === tagSlug)
  );
}

export function findTagName(tagSlug: string): string | null {
  const tags = getAllTags();
  const found = tags.find((t) => t.slug === tagSlug);
  return found?.name ?? null;
}

export { tagToSlug };
