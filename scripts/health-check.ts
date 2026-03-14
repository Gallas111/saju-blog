/**
 * Health Check Bot for AI Blog
 *
 * Scans all MDX content for broken images, links, render issues,
 * and MDX syntax problems. Automatically fixes what it can.
 *
 * Usage: npx tsx scripts/health-check.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// ─── Load environment ────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ─── Load config ─────────────────────────────────────────────────────────────

interface HealthCheckConfig {
  siteUrl: string;
  blogPath: string;
  contentDir: string;
  contentStructure: 'nested' | 'flat';
  imageDir: string;
  defaultImageDir: string;
  limits: {
    maxImageFixes: number;
    maxLinkFixes: number;
    maxRenderFixes: number;
    minImageSize: number;
    requestRetries: number;
    requestTimeout: number;
  };
}

const configPath = path.resolve(process.cwd(), 'scripts/health-check.config.json');
const config: HealthCheckConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// ─── Types ───────────────────────────────────────────────────────────────────

type IssueType = 'render' | 'thumbnail' | 'bodyImage' | 'link' | 'mdxSyntax';

interface Issue {
  type: IssueType;
  file: string;
  slug: string;
  detail: string;
  line?: number;
  fixable: boolean;
  fixed?: boolean;
}

interface PostInfo {
  filePath: string;
  slug: string;
  category: string;
  frontmatter: Record<string, any>;
  content: string;
  rawContent: string;
}

// ─── Globals ─────────────────────────────────────────────────────────────────

const issues: Issue[] = [];
const fixCounts: Record<string, number> = {
  image: 0,
  link: 0,
  render: 0,
};

// ─── Utility Functions ───────────────────────────────────────────────────────

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`);
}

function getAllMdxFiles(): string[] {
  const contentDir = path.resolve(process.cwd(), config.contentDir);
  const files: string[] = [];

  if (config.contentStructure === 'nested') {
    // content/{category}/*.mdx
    if (!fs.existsSync(contentDir)) return files;
    const categories = fs.readdirSync(contentDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const cat of categories) {
      const catDir = path.join(contentDir, cat);
      const mdxFiles = fs.readdirSync(catDir)
        .filter(f => f.endsWith('.mdx'))
        .map(f => path.join(catDir, f));
      files.push(...mdxFiles);
    }
  } else {
    // content/posts/*.mdx
    const postsDir = path.join(contentDir, 'posts');
    if (!fs.existsSync(postsDir)) return files;
    const mdxFiles = fs.readdirSync(postsDir)
      .filter(f => f.endsWith('.mdx'))
      .map(f => path.join(postsDir, f));
    files.push(...mdxFiles);
  }

  return files;
}

function parsePost(filePath: string): PostInfo | null {
  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(rawContent);
    const category = config.contentStructure === 'nested'
      ? path.basename(path.dirname(filePath))
      : (data.category || 'uncategorized');
    const slug = data.slug || path.basename(filePath, '.mdx');

    return {
      filePath,
      slug,
      category,
      frontmatter: data,
      content,
      rawContent,
    };
  } catch (err) {
    log('⚠️', `Failed to parse ${filePath}: ${(err as Error).message}`);
    return null;
  }
}

function extractKeywords(frontmatter: Record<string, any>): string {
  const kw = frontmatter.keywords;
  if (!kw) return frontmatter.title || 'ai technology';

  if (Array.isArray(kw)) {
    return kw.slice(0, 3).join(' ');
  }

  if (typeof kw === 'object' && kw.primary) {
    if (Array.isArray(kw.primary)) {
      return kw.primary.slice(0, 3).join(' ');
    }
    return String(kw.primary);
  }

  return String(kw);
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = config.limits.requestRetries): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.limits.requestTimeout);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      if (attempt < retries) {
        log('🔄', `Retry ${attempt + 1}/${retries} for ${url}`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  return null;
}

function checkFileExists(relativePath: string): { exists: boolean; size: number } {
  // relativePath like /images/posts/something.png
  const absPath = path.resolve(process.cwd(), 'public', relativePath.replace(/^\//, ''));
  if (!fs.existsSync(absPath)) {
    return { exists: false, size: 0 };
  }
  const stat = fs.statSync(absPath);
  return { exists: true, size: stat.size };
}

// ─── Phase 1: Scan ──────────────────────────────────────────────────────────

async function scanRenderCheck(posts: PostInfo[]): Promise<void> {
  log('🔍', `Checking page renders for ${posts.length} posts...`);

  // Process in batches of 5 to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (post) => {
        const url = `${config.siteUrl}${config.blogPath}/${post.slug}`;
        const response = await fetchWithRetry(url);
        if (!response || response.status !== 200) {
          const status = response?.status || 'timeout';
          issues.push({
            type: 'render',
            file: post.filePath,
            slug: post.slug,
            detail: `Page returned ${status}: ${url}`,
            fixable: false, // will be updated in MDX syntax check
          });
        }
      })
    );
    // Small delay between batches
    if (i + batchSize < posts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

function scanThumbnails(posts: PostInfo[]): void {
  log('🖼️', 'Checking thumbnails...');

  for (const post of posts) {
    const image = post.frontmatter.image;
    if (!image) continue;

    // Skip external URLs
    if (image.startsWith('http://') || image.startsWith('https://')) continue;

    const { exists, size } = checkFileExists(image);
    if (!exists) {
      issues.push({
        type: 'thumbnail',
        file: post.filePath,
        slug: post.slug,
        detail: `Thumbnail not found: ${image}`,
        fixable: true,
      });
    } else if (size < config.limits.minImageSize) {
      issues.push({
        type: 'thumbnail',
        file: post.filePath,
        slug: post.slug,
        detail: `Thumbnail too small (${size} bytes): ${image}`,
        fixable: true,
      });
    }
  }
}

function scanBodyImages(posts: PostInfo[]): void {
  log('🖼️', 'Checking body images...');

  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  for (const post of posts) {
    let match;
    const lines = post.content.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      imgRegex.lastIndex = 0;
      while ((match = imgRegex.exec(line)) !== null) {
        const imgPath = match[2];
        // Only check local images
        if (!imgPath.startsWith('/images/')) continue;

        const { exists, size } = checkFileExists(imgPath);
        if (!exists) {
          issues.push({
            type: 'bodyImage',
            file: post.filePath,
            slug: post.slug,
            detail: `Body image not found: ${imgPath}`,
            line: lineIdx + 1,
            fixable: true,
          });
        } else if (size < config.limits.minImageSize) {
          issues.push({
            type: 'bodyImage',
            file: post.filePath,
            slug: post.slug,
            detail: `Body image too small (${size} bytes): ${imgPath}`,
            line: lineIdx + 1,
            fixable: true,
          });
        }
      }
    }
  }
}

function scanInternalLinks(posts: PostInfo[], allSlugs: Set<string>): void {
  log('🔗', 'Checking internal links...');

  const linkRegex = /\[([^\]]*)\]\(\/blog\/([^)#\s]+)\)/g;

  for (const post of posts) {
    let match;
    const lines = post.content.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      linkRegex.lastIndex = 0;
      while ((match = linkRegex.exec(line)) !== null) {
        const targetSlug = match[2].replace(/\/$/, '');
        if (!allSlugs.has(targetSlug)) {
          issues.push({
            type: 'link',
            file: post.filePath,
            slug: post.slug,
            detail: `Broken internal link to /blog/${targetSlug}`,
            line: lineIdx + 1,
            fixable: true,
          });
        }
      }
    }
  }
}

function scanMdxSyntax(posts: PostInfo[]): void {
  log('📝', 'Checking MDX syntax...');

  for (const post of posts) {
    const lines = post.content.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // Check for {#custom-id} patterns in headings
      if (/^#{1,6}\s/.test(line) && /\{#[^}]+\}/.test(line)) {
        issues.push({
          type: 'mdxSyntax',
          file: post.filePath,
          slug: post.slug,
          detail: `Custom heading ID found: ${line.trim()}`,
          line: lineIdx + 1,
          fixable: true,
        });
      }

      // Check for broken Callout closing tags (</n>, </n-Callout>, </nCallout>, etc.)
      if (/^<\/n[-]?C?a?l?l?o?u?t?>/.test(line.trim()) || /^<\/n>/.test(line.trim())) {
        issues.push({
          type: 'mdxSyntax',
          file: post.filePath,
          slug: post.slug,
          detail: `Broken Callout closing tag: ${line.trim()}`,
          line: lineIdx + 1,
          fixable: true,
        });
      }

      // Check for other {…} in heading lines (not JSX components like <Component />)
      if (/^#{1,6}\s/.test(line)) {
        const withoutCustomId = line.replace(/\{#[^}]+\}/g, '');
        // Match {...} that aren't JSX-like (no < or / inside)
        const curlyMatch = withoutCustomId.match(/\{[^}<>/]+\}/g);
        if (curlyMatch) {
          for (const m of curlyMatch) {
            // Skip things that look like template literals or JSX expressions
            if (m.includes('`') || m.includes('props') || m.includes('children')) continue;
            issues.push({
              type: 'mdxSyntax',
              file: post.filePath,
              slug: post.slug,
              detail: `Suspicious curly braces in heading: ${m}`,
              line: lineIdx + 1,
              fixable: true,
            });
          }
        }
      }
    }
  }
}

// ─── Phase 2: Fix ────────────────────────────────────────────────────────────

async function fixBrokenImage(imagePath: string, keywords: string, category: string): Promise<boolean> {
  const absPath = path.resolve(process.cwd(), 'public', imagePath.replace(/^\//, ''));
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Try Unsplash first
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      log('📸', `Fetching Unsplash image for: ${keywords}`);
      const searchQuery = encodeURIComponent(keywords);
      const unsplashUrl = `https://api.unsplash.com/photos/random?query=${searchQuery}&orientation=squarish&content_filter=high`;
      const response = await fetchWithRetry(unsplashUrl, {
        headers: {
          'Authorization': `Client-ID ${unsplashKey}`,
        },
      });

      if (response && response.ok) {
        const data = await response.json() as any;
        const imageUrl = data.urls?.regular;
        if (imageUrl) {
          const imgResponse = await fetchWithRetry(imageUrl);
          if (imgResponse && imgResponse.ok) {
            const buffer = Buffer.from(await imgResponse.arrayBuffer());
            if (buffer.length >= config.limits.minImageSize) {
              fs.writeFileSync(absPath, buffer);
              log('✅', `Unsplash image saved: ${imagePath} (${buffer.length} bytes)`);
              return true;
            } else {
              log('⚠️', `Unsplash image too small: ${buffer.length} bytes`);
            }
          }
        }
      } else {
        log('⚠️', `Unsplash API returned ${response?.status}`);
      }
    } catch (err) {
      log('⚠️', `Unsplash fetch failed: ${(err as Error).message}`);
    }
  } else {
    log('⚠️', 'UNSPLASH_ACCESS_KEY not set, skipping Unsplash');
  }

  // Fallback to category default image
  const defaultDir = path.resolve(process.cwd(), config.defaultImageDir);
  const categoryDefault = path.join(defaultDir, `${category}.png`);
  const genericDefault = path.join(defaultDir, 'default.png');

  const fallbackPath = fs.existsSync(categoryDefault) ? categoryDefault :
                       fs.existsSync(genericDefault) ? genericDefault : null;

  if (fallbackPath) {
    const stat = fs.statSync(fallbackPath);
    if (stat.size >= config.limits.minImageSize) {
      fs.copyFileSync(fallbackPath, absPath);
      log('✅', `Category default image copied: ${path.basename(fallbackPath)} -> ${imagePath}`);
      return true;
    }
  }

  log('❌', `Could not fix image: ${imagePath}`);
  return false;
}

async function fixImages(posts: PostInfo[]): Promise<void> {
  const imageIssues = issues.filter(i => i.type === 'thumbnail' || i.type === 'bodyImage');
  if (imageIssues.length === 0) return;

  log('🔧', `Fixing ${imageIssues.length} image issues (limit: ${config.limits.maxImageFixes})...`);

  for (const issue of imageIssues) {
    if (fixCounts.image >= config.limits.maxImageFixes) {
      log('⚠️', `Image fix limit reached (${config.limits.maxImageFixes})`);
      break;
    }

    // Extract image path from detail
    const pathMatch = issue.detail.match(/:\s*(.+)$/);
    if (!pathMatch) continue;
    const imagePath = pathMatch[1].trim();

    const post = posts.find(p => p.filePath === issue.file);
    if (!post) continue;

    const keywords = extractKeywords(post.frontmatter);
    const success = await fixBrokenImage(imagePath, keywords, post.category);
    issue.fixed = success;
    if (success) fixCounts.image++;
  }
}

function buildFilenameToSlugMap(posts: PostInfo[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const post of posts) {
    // Extract filename-based slug (without date prefix)
    const basename = path.basename(post.filePath, '.mdx');
    const filenameSlug = basename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    if (filenameSlug !== post.slug) {
      map.set(filenameSlug, post.slug);
    }
  }
  return map;
}

function fixInternalLinks(posts: PostInfo[]): void {
  const linkIssues = issues.filter(i => i.type === 'link');
  if (linkIssues.length === 0) return;

  log('🔧', `Fixing ${linkIssues.length} broken link issues (limit: ${config.limits.maxLinkFixes})...`);

  // Build a mapping from filename-based slugs to actual frontmatter slugs
  const filenameToSlug = buildFilenameToSlugMap(posts);
  const allSlugs = new Set(posts.map(p => p.slug));

  // Group by file for efficient processing
  const issuesByFile = new Map<string, Issue[]>();
  for (const issue of linkIssues) {
    if (fixCounts.link >= config.limits.maxLinkFixes) break;
    const list = issuesByFile.get(issue.file) || [];
    list.push(issue);
    issuesByFile.set(issue.file, list);
  }

  for (const [filePath, fileIssues] of issuesByFile) {
    let rawContent = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const issue of fileIssues) {
      if (fixCounts.link >= config.limits.maxLinkFixes) break;

      // Extract the broken slug from the detail
      const slugMatch = issue.detail.match(/\/blog\/(.+)$/);
      if (!slugMatch) continue;
      const brokenSlug = slugMatch[1];

      // Strategy 1: Try to find the correct slug via filename→slug mapping
      const correctSlug = filenameToSlug.get(brokenSlug);
      if (correctSlug && allSlugs.has(correctSlug)) {
        const escapedSlug = brokenSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const replacePattern = new RegExp(`\\/blog\\/${escapedSlug}(?=[)#\\s])`, 'g');
        const newContent = rawContent.replace(replacePattern, `/blog/${correctSlug}`);
        if (newContent !== rawContent) {
          rawContent = newContent;
          modified = true;
          issue.fixed = true;
          fixCounts.link++;
          log('✅', `Corrected link /blog/${brokenSlug} → /blog/${correctSlug} in ${path.basename(filePath)}`);
          continue;
        }
      }

      // Strategy 2: Fallback — remove the entire line containing the broken link
      const linePattern = new RegExp(
        `^[ \\t]*-\\s+\\[([^\\]]*)\\]\\(\\/blog\\/${brokenSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)[^\\n]*\\n?`,
        'gm'
      );

      const newContent = rawContent.replace(linePattern, '');
      if (newContent !== rawContent) {
        rawContent = newContent;
        modified = true;
        issue.fixed = true;
        fixCounts.link++;
        log('✅', `Removed broken link to /blog/${brokenSlug} in ${path.basename(filePath)}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, rawContent, 'utf-8');
    }
  }
}

function fixMdxSyntax(posts: PostInfo[]): void {
  const syntaxIssues = issues.filter(i => i.type === 'mdxSyntax');
  if (syntaxIssues.length === 0) return;

  log('🔧', `Fixing ${syntaxIssues.length} MDX syntax issues (limit: ${config.limits.maxRenderFixes})...`);

  // Group by file
  const issuesByFile = new Map<string, Issue[]>();
  for (const issue of syntaxIssues) {
    const list = issuesByFile.get(issue.file) || [];
    list.push(issue);
    issuesByFile.set(issue.file, list);
  }

  let fixCount = 0;

  for (const [filePath, fileIssues] of issuesByFile) {
    if (fixCount >= config.limits.maxRenderFixes) break;

    let rawContent = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Remove {#custom-id} from headings
    let newContent = rawContent.replace(
      /^(#{1,6}\s.*?)\s*\{#[^}]+\}/gm,
      '$1'
    );

    if (newContent !== rawContent) {
      rawContent = newContent;
      modified = true;

      for (const issue of fileIssues) {
        if (issue.detail.includes('Custom heading ID')) {
          issue.fixed = true;
          fixCount++;
        }
      }
    }

    // Fix broken Callout closing tags (</n>, </n-Callout>, </nCallout>, etc.)
    newContent = rawContent.replace(
      /^<\/n[-]?C?a?l?l?o?u?t?>/gm,
      '</Callout>'
    );

    if (newContent !== rawContent) {
      rawContent = newContent;
      modified = true;

      for (const issue of fileIssues) {
        if (issue.detail.includes('Broken Callout')) {
          issue.fixed = true;
          fixCount++;
        }
      }
    }

    // Remove other suspicious curly braces in headings
    const finalContent = rawContent.replace(
      /^(#{1,6}\s.*?)\s*\{[^}<>/]+\}/gm,
      '$1'
    );

    if (finalContent !== rawContent) {
      rawContent = finalContent;
      modified = true;

      for (const issue of fileIssues) {
        if (issue.detail.includes('Suspicious curly braces')) {
          issue.fixed = true;
          fixCount++;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, rawContent, 'utf-8');
      log('✅', `Fixed MDX syntax in ${path.basename(filePath)}`);
    }
  }

  // Also update render issues that might be caused by MDX syntax
  for (const renderIssue of issues.filter(i => i.type === 'render')) {
    const syntaxFixed = issues.some(
      i => i.type === 'mdxSyntax' && i.file === renderIssue.file && i.fixed
    );
    if (syntaxFixed) {
      renderIssue.fixed = true;
    }
  }
}

// ─── Phase 3: Verify ────────────────────────────────────────────────────────

function verifyBuild(): boolean {
  const totalFixes = Object.values(fixCounts).reduce((a, b) => a + b, 0);
  const anyFixed = issues.some(i => i.fixed);

  if (!anyFixed && totalFixes === 0) {
    log('ℹ️', 'No fixes applied, skipping build verification');
    return true;
  }

  log('🏗️', 'Verifying build after fixes...');

  try {
    execSync('npx next build', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 300_000, // 5 min timeout
    });
    log('✅', 'Build verification passed!');
    return true;
  } catch (err) {
    log('❌', 'Build verification FAILED! Reverting all changes...');
    try {
      execSync('git checkout -- .', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
      log('🔄', 'All changes reverted via git checkout');
    } catch (revertErr) {
      log('❌', `Failed to revert changes: ${(revertErr as Error).message}`);
    }
    return false;
  }
}

// ─── Phase 4: Report ────────────────────────────────────────────────────────

function printReport(totalPosts: number, buildOk: boolean): void {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Health Check Report');
  console.log('═'.repeat(60));
  console.log(`  Total posts scanned: ${totalPosts}`);
  console.log(`  Total issues found:  ${issues.length}`);
  console.log('');

  const byType: Record<string, Issue[]> = {};
  for (const issue of issues) {
    const key = issue.type;
    if (!byType[key]) byType[key] = [];
    byType[key].push(issue);
  }

  const typeLabels: Record<string, string> = {
    render: 'Render errors',
    thumbnail: 'Broken thumbnails',
    bodyImage: 'Broken body images',
    link: 'Broken internal links',
    mdxSyntax: 'MDX syntax issues',
  };

  for (const [type, label] of Object.entries(typeLabels)) {
    const typeIssues = byType[type] || [];
    if (typeIssues.length === 0) continue;

    const fixed = typeIssues.filter(i => i.fixed).length;
    const unfixed = typeIssues.length - fixed;

    console.log(`  ${label}: ${typeIssues.length} found, ${fixed} fixed, ${unfixed} remaining`);

    // Show unfixed issues
    for (const issue of typeIssues.filter(i => !i.fixed)) {
      console.log(`    - [${issue.slug}] ${issue.detail}`);
    }
  }

  console.log('');
  if (issues.length === 0) {
    console.log('  ✅ All checks passed! No issues found.');
  } else {
    const totalFixed = issues.filter(i => i.fixed).length;
    const totalUnfixed = issues.length - totalFixed;
    console.log(`  Fixes applied: ${totalFixed}`);
    console.log(`  Remaining issues: ${totalUnfixed}`);
    if (!buildOk) {
      console.log('  ❌ Build verification failed - all fixes reverted');
    }
  }

  console.log('═'.repeat(60) + '\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  log('🏥', 'AI Blog Health Check Bot');
  console.log('═'.repeat(60) + '\n');

  // ── Collect all posts ──
  const mdxFiles = getAllMdxFiles();
  log('📂', `Found ${mdxFiles.length} MDX files`);

  const posts: PostInfo[] = [];
  for (const file of mdxFiles) {
    const post = parsePost(file);
    if (post) posts.push(post);
  }

  const allSlugs = new Set(posts.map(p => p.slug));
  log('📄', `Parsed ${posts.length} posts with ${allSlugs.size} unique slugs\n`);

  // ── Phase 1: Scan ──
  log('🔍', '━━━ Phase 1: Scan ━━━');

  // Run independent scans in parallel
  const [renderResult] = await Promise.allSettled([
    scanRenderCheck(posts),
  ]);

  // These are synchronous
  scanThumbnails(posts);
  scanBodyImages(posts);
  scanInternalLinks(posts, allSlugs);
  scanMdxSyntax(posts);

  log('📊', `Scan complete: ${issues.length} issues found\n`);

  if (issues.length === 0) {
    printReport(posts.length, true);
    process.exit(0);
  }

  // ── Phase 2: Fix ──
  log('🔧', '━━━ Phase 2: Fix ━━━');

  // Fix MDX syntax first (may resolve render issues)
  fixMdxSyntax(posts);

  // Fix broken links
  fixInternalLinks(posts);

  // Fix broken images (async - Unsplash API calls)
  await fixImages(posts);

  const totalFixes = issues.filter(i => i.fixed).length;
  log('📊', `Fix phase complete: ${totalFixes} fixes applied\n`);

  // ── Phase 3: Verify ──
  log('🏗️', '━━━ Phase 3: Verify ━━━');
  const buildOk = verifyBuild();

  // ── Phase 4: Report ──
  printReport(posts.length, buildOk);

  if (!buildOk) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  log('❌', `Fatal error: ${(err as Error).message}`);
  console.error(err);
  process.exit(1);
});
