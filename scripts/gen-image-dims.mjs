// Generate a static image-dimensions map for body images referenced in content/posts.
// Node replacement for scripts/gen-image-dims.py (no Python/Pillow dependency).
//
// Reads markdown image refs ![alt](/images/...) from content/posts/*.mdx, looks
// them up under public/, reads each file's real dimensions with the pure-JS
// `image-size` package (webp/png/jpg/...), and emits lib/image-dims.json:
//   { "/images/posts/x-body-1.webp": [w, h], ... }
//
// Runs as the FIRST step of `npm run build`, so new posts get body-image dims
// automatically (permanent CLS fix). Missing files are warned about but do NOT
// fail the build (the img component falls back to no width/height gracefully).
// Frontmatter `image:` thumbnails are NOT scanned here (body images only).

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT = join(ROOT, "content", "posts");
const PUBLIC = join(ROOT, "public");
const OUT = join(ROOT, "lib", "image-dims.json");

// URL group is anchored so nested square brackets in the alt text don't break it.
// [\s\S]*? = lazy match across any chars (incl. newlines), then the literal
// `](` and a /images/... path with no whitespace or closing paren.
const IMG_RE = /!\[[\s\S]*?\]\((\/images\/[^)\s]+)\)/g;

const refs = new Set();
for (const fn of readdirSync(CONTENT)) {
  if (!fn.endsWith(".mdx")) continue;
  const text = readFileSync(join(CONTENT, fn), "utf-8");
  let m;
  IMG_RE.lastIndex = 0;
  while ((m = IMG_RE.exec(text)) !== null) {
    refs.add(m[1]);
  }
}

const dims = {};
const missing = [];
const errors = [];
for (const ref of [...refs].sort()) {
  const fsPath = join(PUBLIC, ref.replace(/^\//, "").split("/").join(sep));
  if (!existsSync(fsPath)) {
    missing.push(ref);
    continue;
  }
  try {
    const { width: w, height: h } = imageSize(readFileSync(fsPath));
    if (w > 0 && h > 0) {
      dims[ref] = [w, h];
    } else {
      errors.push(`${ref} (zero dim)`);
    }
  } catch (e) {
    errors.push(`${ref} (${e && e.message ? e.message : String(e)})`);
  }
}

// Match the previous Python `json.dump(..., ensure_ascii=False, indent=0,
// sort_keys=True)` output byte-for-byte so the committed JSON and git diffs stay
// stable. Python's indent=0 puts every token on its own line (no indentation)
// with a ": " key separator; JS's JSON.stringify(obj, null, 0) does NOT — it
// emits a compact single line — so serialize manually.
const keys = Object.keys(dims).sort();
const lines = keys.map((k, i) => {
  const [w, h] = dims[k];
  const comma = i < keys.length - 1 ? "," : "";
  return `${JSON.stringify(k)}: [\n${w},\n${h}\n]${comma}`;
});
const out = keys.length ? `{\n${lines.join("\n")}\n}\n` : "{}\n";
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out, "utf-8");

console.log("referenced body images:", refs.size);
console.log("dims written:", Object.keys(dims).length);
console.log("missing (not on disk, will fallback):", missing.length);
for (const m of missing.slice(0, 50)) console.log("  MISSING:", m);
console.log("errors:", errors.length);
for (const e of errors.slice(0, 50)) console.log("  ERROR:", e);
console.log("output:", OUT);
