import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');

interface PostIndex {
    slug: string;
    title: string;
    keywords: string[];
    path: string;
}

// Global list of posts for indexing
const postDatabase: PostIndex[] = [];

/**
 * Scan all MDX files and build a search index
 */
function buildIndex(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            buildIndex(fullPath);
        } else if (file.endsWith('.mdx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const { data } = matter(content);
            if (data.slug && data.title) {
                postDatabase.push({
                    slug: data.slug,
                    title: data.title,
                    keywords: Array.isArray(data.keywords) ? data.keywords : (data.keywords?.secondary || data.tags || []),
                    path: fullPath
                });
            }
        }
    }
}

/**
 * Insert links naturally into the content
 */
function processPost(targetPost: PostIndex) {
    const fileContent = fs.readFileSync(targetPost.path, 'utf-8');
    const { data, content } = matter(fileContent);
    let newContent = content;
    let linkCount = 0;
    const MAX_LINKS = 3;

    // Sort database by title/keyword length (descending) to match longest phrases first
    const sortedDb = [...postDatabase]
        .filter(p => p.slug !== targetPost.slug) // Don't link to self
        .sort((a, b) => b.title.length - a.title.length);

    for (const sourcePost of sortedDb) {
        if (linkCount >= MAX_LINKS) break;

        // Terms to search for: Title and specific keywords
        const terms = [sourcePost.title, ...sourcePost.keywords];

        for (const term of terms) {
            if (term.length < 2) continue; // Skip very short terms

            // Regex rules:
            // 1. Match the term
            // 2. NOT already inside a markdown link [text](/blog/slug)
            // 3. NOT inside a header # Header
            // 4. NOT inside a code block ```

            // Simple approach for natural Korean text: check if it exists in body but not in a link
            if (newContent.includes(term)) {
                // Check if it's already linked
                const alreadyLinkedRegex = new RegExp(`\\[.*${term}.*\\]\\(/blog/`, 'i');
                if (alreadyLinkedRegex.test(newContent)) continue;

                // Simple check for headers: term shouldn't be preceded by # on the same line
                // (This is a basic heuristic, can be improved)

                const linkLabel = term;
                const linkUrl = `/blog/${sourcePost.slug}`;
                const markdownLink = `[${linkLabel}](${linkUrl})`;

                // Replace only the first occurrence
                const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const termRegex = new RegExp(escapedTerm, ''); // Only first match

                // Avoid replacing inside existing brackets or URLs
                // This is a complex task for pure regex, so we do a simple check
                const snippetIndex = newContent.indexOf(term);
                const precedingText = newContent.slice(Math.max(0, snippetIndex - 20), snippetIndex);
                const followingText = newContent.slice(snippetIndex + term.length, snippetIndex + term.length + 20);

                if (precedingText.includes('[') || followingText.includes('](') || precedingText.includes('#')) {
                    continue;
                }

                newContent = newContent.replace(termRegex, markdownLink);
                console.log(`🔗 Linked "${term}" to /blog/${sourcePost.slug} in ${targetPost.slug}`);
                linkCount++;
                break; // Move to next source post once one term is linked
            }
        }
    }

    if (linkCount > 0) {
        const updatedFile = matter.stringify(newContent, data);
        fs.writeFileSync(targetPost.path, updatedFile);
    }
}

async function main() {
    console.log("🔗 Internal Linker Bot starting...");

    buildIndex(CONTENT_DIR);
    console.log(`📚 Indexed ${postDatabase.length} posts.`);

    for (const post of postDatabase) {
        processPost(post);
    }

    console.log("🏁 Internal Linker Bot finished.");
}

main().catch(console.error);
