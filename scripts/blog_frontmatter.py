#!/usr/bin/env python3
"""블로그 MDX 프론트매터 공용 파서 — 2026-08-05 신설.

## 왜 만들었나 (신설 사유를 지우지 말 것)

check-keyword-overlap.py 와 check-crosssite-overlap.py 가 **각자 프론트매터 파서를
따로 갖고 있었고 둘 다 부분적으로 틀렸다.** 네트워크 9레포에 프론트매터 형태가 3종
섞여 있는데 각 파서가 그중 일부만 알았다.

2026-08-05 실측으로 드러난 것:
  - check-keyword-overlap.py 의 keywords 정규식이 인라인 `keywords: [a, b]` 형식만 읽어서
    **3,222편 중 40편만 파싱**되고 있었다. 나머지 3,182편은 keywords 대조가 아예 안 됐다.
    그래서 ai-revenue 후보 키워드 'AI 디지털 상품 판매' 가 기존 글의 primary 와
    정확히 같은데도 게이트가 "매칭 없음 · exit 0" 을 냈다(집필자가 실파일 grep 으로 잡음).
  - check-crosssite-overlap.py 의 primary_key 는 `primary:`/`targetKeyword:` 만 봐서
    flat 리스트를 쓰는 ai·health·easy·baby 에서는 primary 가 늘 빈 문자열이었다.

**같은 클래스의 버그가 두 번 난 것이므로 파서를 하나로 합친다.** 새 게이트를 만들 때도
이 모듈을 import 하고 자체 정규식을 다시 쓰지 마라.

## 실측 프론트매터 형태 3종 (2026-08-05)

  형태 A — keywords 가 중첩 객체 (saju-blog · coinday · bukbukstock, 각 100%)
      targetKeyword: 관상 보는법 순서
      tags:
        - 관상 보는법
      keywords:
        primary: 관상 보는법 순서
        secondary:
          - 관상 보는 순서
        longTail:
          - 관상 얼굴 어디부터 보나

  형태 B — keywords 가 평면 블록 리스트 (ai-blog 766 · health 263 · easy 258 · baby 163)
      keywords:
        - 디지털 콘텐츠 환불 규정
        - 청약철회 제한
      → 첫 항목이 primary 다

  형태 C — keywords 없음, tags 인라인 + targetKeyword (tokennara · altnara)
      targetKeyword: 미신고 가상자산사업자
      tags: ["딥다이브", "에이브"]

  형태 D — 인라인 배열 (ai 6 · easy 2 · baby 32 = 소수 잔존)
      keywords: [a, b, c]

## primary 결정 순서

  1) keywords.primary (형태 A)
  2) targetKeyword
  3) keywords 리스트의 첫 항목 (형태 B·D)

🔴 **tags 의 첫 항목은 primary 로 쓰지 않는다.** tags 는 겨냥 쿼리가 아니라 주제 라벨이라
tokennara 에서 '딥다이브' 가 수십 편의 primary 가 돼 버린다 — 완전일치 판정이 상시
오탐을 낸다. tags 는 all_keys 에만 넣어 약한 신호로 쓴다.

이 순서는 "글이 겨냥한 단 하나의 쿼리"를 뽑는 것이 목적이다. 클러스터·자기잠식 판정의
1차 기준이 primary 완전일치이므로(메모리 표준), 여기서 빈 문자열이 나오면 그 글은
그 판정에서 빠진다. 실측(2026-08-05) 기준 primary 커버리지는 ai·saju·coinday·bukbuk·
easy·baby·health 100%, tokennara 37%(85/229), altnara 40%(34/84) 다. 뒤 둘은 파서 문제가
아니라 **원본에 겨냥 키워드 필드가 없는 것**이다(altnara alteval 50편은 ticker 만 있다).
"""

import os
import re
import glob

__all__ = ["norm_key", "parse_head", "read_posts", "BASE", "BLOG_PATHS"]

BASE = r"C:\Users\owner\OneDrive\바탕 화면\사이트"

BLOG_PATHS = {
    name: os.path.join(BASE, name)
    for name in (
        "ai-blog", "health-blog", "easy-zetec", "baby-blog", "saju-blog",
        "quicktools", "bukbukstock", "coinday", "tokennara", "altnara",
    )
}

# 프론트매터 앞부분만 읽으면 충분하다. 넉넉히 잡되 본문까지 훑지 않는다.
HEAD_BYTES = 4000


def norm_key(s):
    """키워드 정규화 — 띄어쓰기·구분기호만 다른 같은 쿼리를 같은 것으로 본다.

    8/1 실측: coinday '공포 탐욕 지수' 와 tokennara '공포탐욕지수' 는 축자 비교로 안 걸리는데
    사람이 검색창에 치는 형태는 둘 다 같다."""
    return re.sub(r"[\s·・\-_,/()\[\]]+", "", (s or "").strip().lower())


def _strip(v):
    return (v or "").strip().strip("\"'").strip()


def _inline_list(v):
    """`[a, b, c]` 또는 `"a, b"` 를 리스트로."""
    v = (v or "").strip()
    if v.startswith("[") and v.endswith("]"):
        v = v[1:-1]
    return [x for x in (_strip(x) for x in v.split(",")) if x]


def _block_items(block):
    """블록 스칼라에서 `- 항목` 만 뽑는다.

    🔴 `key: value` 줄을 항목으로 오인하면 안 된다(형태 A 의 primary/secondary/longTail
    헤더가 항목으로 섞여 들어간다). 하이픈으로 시작하는 줄만 항목으로 센다."""
    out = []
    for line in block.split("\n"):
        m = re.match(r"^\s*-\s+(.*)$", line)
        if m:
            item = _strip(m.group(1))
            if item:
                out.append(item)
    return out


def _grab_block(head, key):
    """`key:` 가 값 없이 끝나는 줄 뒤의 들여쓴 블록 전체를 돌려준다."""
    m = re.search(rf"^{key}:[ \t]*$\n((?:[ \t]+\S.*\n?|\s*\n)*)", head, re.M)
    return m.group(1) if m else ""


def parse_head(head):
    """프론트매터 문자열 → dict.

    반환 키: title description slug date noindex primary keywords tags all_keys
      - keywords = 그 글이 겨냥하는 모든 키워드(primary·secondary·longTail·평면리스트 합집합)
      - tags     = tags 필드
      - all_keys = keywords + tags 합집합(중복 제거, 순서 보존)
      - primary  = 위 결정 순서로 뽑은 대표 쿼리 하나
    """
    def scalar(key):
        m = re.search(rf"^{key}:[ \t]*(.+?)[ \t]*$", head, re.M)
        return _strip(m.group(1)) if m else ""

    title = scalar("title")
    desc = scalar("description")
    slug = scalar("slug")
    date = ""
    dm = re.search(r"^date:\s*['\"]?(\d{4}-\d{2}-\d{2})", head, re.M)
    if dm:
        date = dm.group(1)
    noindex = bool(re.search(r"^noindex:\s*true\b", head, re.M))
    target_kw = scalar("targetKeyword")

    # ── keywords ────────────────────────────────────────────────
    kw_primary = ""
    keywords = []

    kw_inline = scalar("keywords")           # 형태 D: keywords: [a, b]  또는 keywords: "a, b"
    kw_block = _grab_block(head, "keywords")  # 형태 A·B

    if kw_inline:
        keywords = _inline_list(kw_inline)
    elif kw_block:
        # 형태 A — 중첩 객체
        pm = re.search(r"^\s*primary:[ \t]*(.+?)[ \t]*$", kw_block, re.M)
        if pm:
            kw_primary = _strip(pm.group(1))
            keywords.append(kw_primary)
            for sub in ("secondary", "longTail", "longtail", "related"):
                # 🔴 하위 블록은 `- 항목` 줄만 먹어야 한다. `[ \t]+\S.*` 로 잡으면
                # 다음 키(longTail:)와 그 항목까지 통째로 삼켜 중복이 생긴다(8/5 카나리가 잡음).
                sb = re.search(rf"^\s*{sub}:[ \t]*$\n((?:[ \t]*-[ \t]+.*\n?)*)", kw_block, re.M)
                if sb:
                    keywords.extend(_block_items(sb.group(1)))
                else:
                    si = re.search(rf"^\s*{sub}:[ \t]*(\[.*\])[ \t]*$", kw_block, re.M)
                    if si:
                        keywords.extend(_inline_list(si.group(1)))
        else:
            # 형태 B — 평면 블록 리스트
            keywords = _block_items(kw_block)

    # ── tags ────────────────────────────────────────────────────
    tags_inline = scalar("tags")
    tags = _inline_list(tags_inline) if tags_inline else _block_items(_grab_block(head, "tags"))

    # ── primary 결정 ────────────────────────────────────────────
    # 🔴 tags[0] 는 폴백에 넣지 마라 — 주제 라벨이지 겨냥 쿼리가 아니다(모듈 docstring 참조).
    primary = kw_primary or target_kw or (keywords[0] if keywords else "")

    # 🔴 primary 를 반드시 all_keys 에 넣어라. targetKeyword 만 있는 글(altnara 34편)은
    # keywords·tags 가 비어서 all_keys 가 통째로 빈 채로 남는다 — 그러면 그 글은
    # 키워드 대조에 아무 기여도 못 한다(8/5 카나리가 잡음).
    seen, all_keys = set(), []
    for k in ([primary] if primary else []) + keywords + tags:
        n = norm_key(k)
        if k and n and n not in seen:
            seen.add(n)
            all_keys.append(k)

    return {
        "title": title, "description": desc, "slug": slug, "date": date,
        "noindex": noindex, "primary": primary,
        "keywords": keywords, "tags": tags, "all_keys": all_keys,
    }


def read_posts(site, days=0, skip_noindex=False):
    """사이트의 모든 mdx 를 parse_head 로 읽어 리스트로.

    days>0 이면 그 기간 안의 글만. skip_noindex 면 색인에서 내린 글 제외
    (카니발 판정에는 빼는 게 맞고, 커버리지 집계에는 넣는 게 맞다)."""
    import datetime
    root = BLOG_PATHS.get(site, os.path.join(BASE, site))
    files = []
    for pat in ("content/**/*.mdx", "src/content/**/*.mdx"):
        files.extend(glob.glob(os.path.join(root, pat), recursive=True))
    cutoff = ((datetime.date.today() - datetime.timedelta(days=days)).isoformat()
              if days else None)
    out = []
    for f in files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                head = fh.read(HEAD_BYTES)
        except Exception:
            continue
        p = parse_head(head)
        if not p["title"]:
            continue
        if cutoff and p["date"] and p["date"] < cutoff:
            continue
        if skip_noindex and p["noindex"]:
            continue
        if not p["slug"]:
            p["slug"] = re.sub(r"^\d{4}-\d{2}-\d{2}-", "",
                               os.path.splitext(os.path.basename(f))[0])
        p["site"] = site
        p["path"] = os.path.relpath(f, root).replace("\\", "/")
        out.append(p)
    return out
