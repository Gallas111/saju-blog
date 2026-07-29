/**
 * validate-links.ts (포터블판)
 *
 * MDX 내부 링크/이미지/리다이렉트 검증. publish-gate.ts 가 파일 단위 검사 함수를 import 해서 재사용한다.
 * Usage: npx tsx scripts/validate-links.ts
 *
 * ai-blog 원본 대비 수정 4곳 — 전부 "고치면 8개 레포 전부에서 더 맞아지는" 순수 버그다.
 *  (1) getAllSlugs() 에 basename 폴백 추가 (원본은 findTargetFiles() 에만 있어 비대칭이었다)
 *  (2) 이미지 정규식이 마크다운 타이틀 속성을 src 로 삼키던 것 수정
 *  (3) 원격 URL 썸네일 가드 (path.join(PUBLIC_DIR, 'https://...') 오판정 차단)
 *  (4) VALID_CATEGORIES·썸네일 키를 gate.config.json 으로 분리
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { loadGateConfig, resolveSlug } from './gate-config';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const REDIRECTS_PATH = path.join(process.cwd(), 'redirects.json');

export interface Issue {
  file: string;
  type: 'broken-link' | 'broken-image' | 'broken-redirect';
  detail: string;
}

/**
 * content/<1단>/*.mdx 순회. 평면 레포(content/posts/)와 2단 레포(content/<category>/) 양쪽에서 맞는다.
 * 평면 레포는 'posts' 를 카테고리 1개로 보고 정상 동작하므로 경로 설정이 따로 필요 없다.
 */
export function getMdxFiles(): string[] {
  const files: string[] = [];
  if (!fs.existsSync(CONTENT_DIR)) return files;
  for (const cat of fs.readdirSync(CONTENT_DIR)) {
    const catDir = path.join(CONTENT_DIR, cat);
    if (!fs.statSync(catDir).isDirectory()) continue;
    for (const file of fs.readdirSync(catDir)) {
      if (file.endsWith('.mdx')) files.push(path.join(catDir, file));
    }
  }
  return files;
}

/**
 * 🔴 원본과 다른 곳: `if (data.slug)` 만 보던 것을 resolveSlug 로 바꿨다.
 * frontmatter slug 가 없는 레포에서 빈 Set 이 반환되어 전 내부링크가 broken 으로 잡히던 결함.
 */
export function getAllSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const f of getMdxFiles()) {
    const { data } = matter(fs.readFileSync(f, 'utf-8'));
    slugs.add(resolveSlug(f, data));
  }
  return slugs;
}

export function checkInternalLinksInFiles(files: string[], slugs: Set<string>): Issue[] {
  const { validCategories } = loadGateConfig();
  const issues: Issue[] = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    const linkRegex = /\[([^\]]+)\]\(\/blog\/([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(content)) !== null) {
      const slug = match[2];
      if (slug.startsWith('category/')) {
        const cat = slug.replace('category/', '');
        // validCategories 가 빈 배열인 레포는 그 라우트 자체가 없다 = 그런 링크는 진짜 깨진 링크다.
        if (!validCategories.includes(cat)) {
          issues.push({ file: path.relative(process.cwd(), f), type: 'broken-link', detail: `/blog/${slug}` });
        }
        continue;
      }
      if (!slugs.has(slug) && !slugs.has(safeDecode(slug))) {
        issues.push({ file: path.relative(process.cwd(), f), type: 'broken-link', detail: `/blog/${slug}` });
      }
    }
  }
  return issues;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * 마크다운 이미지의 src 만 캡처한다.
 *
 * 🔴 원본 `/!\[[^\]]*\]\(([^)]+)\)/g` 는 `![alt](/images/x.webp "제목")` 에서
 * `/images/x.webp "제목"` 전체를 src 로 삼켰다. ai-blog 은 1,617개 중 타이틀 속성형이 16개뿐이라
 * 드러나지 않았지만, tokennara 는 479/479 가 이 형태라 전 글이 broken-image 로 격리된다.
 */
export const IMG_SRC_RE = /!\[[^\]]*\]\(\s*([^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

/** 로컬 절대경로(/images/...)만 파일 존재를 검사한다. 원격 URL·상대경로·data URI 는 검사 대상이 아니다. */
function isLocalAsset(src: string): boolean {
  return src.startsWith('/');
}

export function checkImagesInFiles(files: string[]): Issue[] {
  const { thumbnailKey } = loadGateConfig();
  const issues: Issue[] = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    const { data } = matter(content);
    const rel = path.relative(process.cwd(), f);

    // 프론트매터 썸네일. thumbnailKey 가 null 인 레포(coinday)는 건너뛴다.
    if (thumbnailKey) {
      const thumb = data[thumbnailKey];
      // 🔴 원격 URL 가드: altnara 13편이 https://images.unsplash.com/... 인데
      //    path.join(PUBLIC_DIR, 'https://...') 로 존재하지 않는 경로가 되어 전부 오격리됐다.
      if (typeof thumb === 'string' && thumb && isLocalAsset(thumb)) {
        if (!fs.existsSync(path.join(PUBLIC_DIR, thumb))) {
          issues.push({ file: rel, type: 'broken-image', detail: `${thumb} (frontmatter ${thumbnailKey})` });
        }
      }
    }

    IMG_SRC_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMG_SRC_RE.exec(content)) !== null) {
      const src = match[1];
      if (!isLocalAsset(src)) continue;
      if (!src.startsWith('/images/')) continue;
      if (!fs.existsSync(path.join(PUBLIC_DIR, src))) {
        issues.push({ file: rel, type: 'broken-image', detail: src });
      }
    }
  }
  return issues;
}

function checkRedirects(slugs: Set<string>): Issue[] {
  const { validCategories } = loadGateConfig();
  const issues: Issue[] = [];
  if (!fs.existsSync(REDIRECTS_PATH)) return issues;
  const redirects = JSON.parse(fs.readFileSync(REDIRECTS_PATH, 'utf-8'));
  for (const r of redirects) {
    const dest: string = r.destination;
    if (dest === '/blog') continue;
    const catMatch = dest.match(/^\/blog\/category\/(.+)$/);
    if (catMatch) {
      if (!validCategories.includes(catMatch[1])) {
        issues.push({ file: 'redirects.json', type: 'broken-redirect', detail: `${r.source} -> ${dest}` });
      }
      continue;
    }
    const slug = dest.replace('/blog/', '');
    if (!slugs.has(slug) && !slugs.has(safeDecode(slug))) {
      issues.push({ file: 'redirects.json', type: 'broken-redirect', detail: `${r.source} -> ${dest}` });
    }
  }
  return issues;
}

function runCli() {
  const files = getMdxFiles();
  const slugs = getAllSlugs();

  // V0 베이스라인용 요약. 이 세 줄이 이식 승인의 1차 관문이다.
  console.log(`[corpus] mdx ${files.length}개 · 슬러그 ${slugs.size}개`);
  if (files.length > 0 && slugs.size !== files.length) {
    console.warn(`[corpus] ⚠️ 슬러그 수와 파일 수가 다르다 — 중복 슬러그이거나 해석 오류다`);
  }

  const linkIssues = checkInternalLinksInFiles(files, slugs);
  const imageIssues = checkImagesInFiles(files);
  const redirectIssues = checkRedirects(slugs);
  const allIssues = [...linkIssues, ...imageIssues, ...redirectIssues];

  console.log(`[corpus] broken-link ${linkIssues.length} · broken-image ${imageIssues.length} · broken-redirect ${redirectIssues.length}`);

  if (allIssues.length === 0) {
    console.log('All links, images, and redirects are valid!');
    process.exitCode = 0;
    return;
  }
  const lines = [`Found ${allIssues.length} issue(s):`, ''];
  for (const issue of allIssues) {
    const icon = issue.type === 'broken-link' ? '[LINK]' : issue.type === 'broken-image' ? '[IMAGE]' : '[REDIRECT]';
    lines.push(`  ${icon} ${issue.file}`, `     -> ${issue.detail}`, '');
  }
  process.stderr.write(lines.join('\n') + '\n');
  process.exitCode = 1;
}

if (require.main === module) runCli();
