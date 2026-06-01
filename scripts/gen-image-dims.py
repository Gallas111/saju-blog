# -*- coding: utf-8 -*-
"""
Generate a static image-dimensions map for body images referenced in content/posts.
Reads markdown image refs ![alt](/images/...), looks them up under public/, and
emits lib/image-dims.json: { "/images/posts/x-body-1.webp": [w, h], ... }.
Missing files are reported but NOT included (component falls back gracefully).
"""
import os
import re
import json
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content", "posts")
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(ROOT, "lib", "image-dims.json")

from PIL import Image

IMG_RE = re.compile(r"!\[[^\]]*\]\((/images/[^)\s]+)\)")

refs = set()
for fn in os.listdir(CONTENT):
    if not fn.endswith(".mdx"):
        continue
    with open(os.path.join(CONTENT, fn), "r", encoding="utf-8") as f:
        text = f.read()
    for m in IMG_RE.finditer(text):
        refs.add(m.group(1))

dims = {}
missing = []
errors = []
for ref in sorted(refs):
    fs_path = os.path.join(PUBLIC, ref.lstrip("/").replace("/", os.sep))
    if not os.path.isfile(fs_path):
        missing.append(ref)
        continue
    try:
        with Image.open(fs_path) as im:
            w, h = im.size
        if w > 0 and h > 0:
            dims[ref] = [w, h]
        else:
            errors.append(ref + " (zero dim)")
    except Exception as e:
        errors.append(ref + " (" + str(e) + ")")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(dims, f, ensure_ascii=False, indent=0, sort_keys=True)
    f.write("\n")

print("referenced body images:", len(refs))
print("dims written:", len(dims))
print("missing (not on disk, will fallback):", len(missing))
for m in missing[:50]:
    print("  MISSING:", m)
print("errors:", len(errors))
for e in errors[:50]:
    print("  ERROR:", e)
print("output:", OUT)
