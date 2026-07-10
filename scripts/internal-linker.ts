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
 * Escape a string so it can be used as a literal inside a RegExp.
 */
function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compute character ranges covered by fenced code blocks (``` ... ```)
 * and inline `code` spans. Candidate matches overlapping these ranges are
 * rejected so we never rewrite text inside code samples.
 */
function getCodeRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];

    // Fenced code blocks: a line starting with ``` toggles in/out of a fence.
    const lines = text.split('\n');
    let offset = 0;
    let fenceStart = -1;
    for (const line of lines) {
        if (line.trimStart().startsWith('```')) {
            if (fenceStart === -1) {
                fenceStart = offset;
            } else {
                ranges.push([fenceStart, offset + line.length]);
                fenceStart = -1;
            }
        }
        offset += line.length + 1; // +1 for the '\n' consumed by split
    }
    if (fenceStart !== -1) {
        ranges.push([fenceStart, text.length]); // unclosed fence -> to EOF
    }

    // Inline code spans: `...` (single line, best-effort/cheap).
    const inlineRe = /`[^`\n]+`/g;
    let m: RegExpExecArray | null;
    while ((m = inlineRe.exec(text)) !== null) {
        ranges.push([m.index, m.index + m[0].length]);
    }

    return ranges;
}

/**
 * True if [start, end) overlaps any of the given ranges.
 */
function overlapsRange(start: number, end: number, ranges: Array<[number, number]>): boolean {
    for (const [rs, re] of ranges) {
        if (start < re && end > rs) return true;
    }
    return false;
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

    // Character ranges covered by code (fences + inline). Recomputed after each
    // insertion, since inserting a link shifts the indices of later code.
    let codeRanges = getCodeRanges(newContent);

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
                const alreadyLinkedRegex = new RegExp(`\\[.*${escapeRegex(term)}.*\\]\\(/blog/`, 'i');
                if (alreadyLinkedRegex.test(newContent)) continue;

                // Simple check for headers: term shouldn't be preceded by # on the same line
                // (This is a basic heuristic, can be improved)

                const linkLabel = term;
                const linkUrl = `/blog/${sourcePost.slug}`;
                const markdownLink = `[${linkLabel}](${linkUrl})`;

                // Replace only the first occurrence
                const escapedTerm = escapeRegex(term);
                const termRegex = new RegExp(escapedTerm, ''); // Only first match

                // Avoid replacing inside existing brackets or URLs
                // This is a complex task for pure regex, so we do a simple check
                const snippetIndex = newContent.indexOf(term);

                // Reject matches inside (or straddling) a fenced/inline code region.
                if (overlapsRange(snippetIndex, snippetIndex + term.length, codeRanges)) {
                    continue;
                }

                const precedingText = newContent.slice(Math.max(0, snippetIndex - 20), snippetIndex);
                const followingText = newContent.slice(snippetIndex + term.length, snippetIndex + term.length + 20);

                if (precedingText.includes('[') || followingText.includes('](') || precedingText.includes('#')) {
                    continue;
                }

                newContent = newContent.replace(termRegex, markdownLink);
                codeRanges = getCodeRanges(newContent); // insertion shifted subsequent indices
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
