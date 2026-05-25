import { getAllTags } from "../lib/tags";
import { getAllPosts } from "../lib/posts";

const tags = getAllTags();
const posts = getAllPosts();
console.log("Total posts:", posts.length);
console.log("Total tags:", tags.length);
console.log("Singleton tags (count=1):", tags.filter(t => t.count === 1).length);
console.log("Top 10:");
tags.slice(0, 10).forEach(t => console.log(`  ${t.count}: ${t.name}`));
