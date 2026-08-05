#!/usr/bin/env python3
"""키워드 카니발리제이션 사전 점검 — 글 작성 전 핵심 키워드가 **같은 사이트** 기존 글과 겹치는지 확인.

사이트 **간** 겹침은 check-crosssite-overlap.py 가 본다. 둘 다 돌려라.

## 🔴 2026-08-05 대수리 (같은 결함을 또 내지 않으려면 이 문단을 지우지 말 것)

이 스크립트는 **keywords 를 사실상 한 번도 제대로 읽지 못하고 있었다.**
옛 정규식이 인라인 `keywords: [a, b]` 형식만 매칭했는데, 실측하니 네트워크 3,222편 중
그 형식은 **40편뿐**이었다(나머지는 블록 리스트이거나 중첩 객체다). 즉 3,182편에 대해
keywords 대조가 통째로 죽어 있었고, 게이트는 title/description 부분문자열 매칭만 하고 있었다.

실제 사고: 2026-08-05 ai-revenue 후보 키워드 `AI 디지털 상품 판매` 가 기존 글
`ai-digital-download-products-etsy-gumroad-revenue` 의 **primary 와 정확히 일치**하는데
게이트는 "매칭 없음 · exit 0" 을 냈다. 집필자가 실파일 grep 으로 겨우 잡았다.

수리 3종:
  1. 프론트매터 파싱을 **공용 모듈 `blog_frontmatter.py` 로 이관**했다(형태 4종 전부 처리).
     🔴 여기에 정규식을 다시 쓰지 마라 — 파서가 둘로 갈린 것이 이 결함의 근본 원인이다.
  2. **primary 완전일치 규칙 신설** — 입력 키워드가 기존 글의 primary 와 정규화 후 같으면
     점수와 무관하게 **exit 2**. 메모리 표준("클러스터·자기잠식 판정 = keywords.primary 일치")이
     이 스크립트에는 구현돼 있지 않았다.
  3. **검사 커버리지를 함께 출력** — 몇 편을 읽었고 그중 몇 편에서 키워드를 뽑았는지 찍는다.
     0 을 검사하고 0 을 찾은 것과 N 을 검사하고 0 을 찾은 것은 로그가 같으면 구분이 안 된다
     (trap#60 계보). 커버리지가 0 이면 exit 3(NOT_CHECKED)다.

Usage:
  python ~/scripts/check-keyword-overlap.py <blog> <keyword1> [<keyword2> ...]
  python ~/scripts/check-keyword-overlap.py ai-blog "AI 디지털 상품 판매"
  python ~/scripts/check-keyword-overlap.py all "GPT-5.5"

Exit codes:
  0 = 겹침 없음 (작성 OK)
  1 = 주의 — title 매칭 1~2건 또는 약한 매칭 3건+. 카테고리·각도 분리를 명시하고 작성
  2 = 작성 금지 — primary 완전일치, 또는 title 강매칭 3건 이상
  3 = NOT_CHECKED — 검사 대상이 0편이거나 키워드를 한 건도 못 뽑았다. **통과가 아니다.**
"""

import sys
import os

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from blog_frontmatter import BLOG_PATHS, norm_key, read_posts  # noqa: E402


def match_score(post, kws_lower, kws_norm):
    """매칭 점수: title 3점 / description 2점 / keywords 2점.
    primary 완전일치는 점수가 아니라 별도 플래그로 돌려준다 — 점수 임계에 묻히면 안 된다."""
    score = 0
    matched = []
    title_l = post["title"].lower()
    desc_l = post["description"].lower()
    post_keys_l = [k.lower() for k in post["all_keys"]]

    for kw in kws_lower:
        if kw in title_l:
            score += 3
            matched.append(kw)
        elif kw in desc_l:
            score += 2
            matched.append(kw)
        elif any(kw in pk for pk in post_keys_l):
            score += 2
            matched.append(kw)

    p_norm = norm_key(post.get("primary", ""))
    exact_primary = bool(p_norm) and any(k == p_norm for k in kws_norm)
    return score, matched, exact_primary


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1

    blog = sys.argv[1]
    keywords = sys.argv[2:]

    if blog == "all":
        targets = list(BLOG_PATHS.items())
    elif blog in BLOG_PATHS:
        targets = [(blog, BLOG_PATHS[blog])]
    else:
        print(f"[ERROR] unknown blog: {blog}")
        print(f"available: {', '.join(BLOG_PATHS)}, all")
        return 1

    kws_lower = [k.lower() for k in keywords]
    kws_norm = [norm_key(k) for k in keywords if norm_key(k)]

    print("=== 키워드 카니발 사전 점검 (같은 사이트) ===")
    print(f"키워드: {', '.join(keywords)}\n")

    total_strong = total_weak = 0
    total_posts = total_with_keys = 0
    exact_hits = []

    for name, path in targets:
        if not os.path.exists(path):
            print(f"■ {name}: 경로 없음, 스킵")
            continue
        posts = read_posts(name, skip_noindex=True)
        with_keys = sum(1 for p in posts if p["all_keys"])
        total_posts += len(posts)
        total_with_keys += with_keys

        matches = []
        for p in posts:
            s, m, ex = match_score(p, kws_lower, kws_norm)
            if ex:
                exact_hits.append((name, p))
            if s > 0:
                matches.append((s, p, m, ex))
        matches.sort(key=lambda x: -x[0])

        # 🔑 무엇을 몇 개 검사했는지 항상 찍는다(trap#60).
        print(f"■ {name} — 색인 열린 글 {len(posts)}편 검사 · 그중 키워드 보유 {with_keys}편")
        if not matches:
            print("   ✅ 매칭 없음\n")
            continue

        total_strong += sum(1 for m in matches if m[0] >= 3)
        total_weak += sum(1 for m in matches if m[0] < 3)
        for s, p, m, ex in matches[:5]:
            tag = "🔴🔴" if ex else ("🔴" if s >= 6 else ("🟡" if s >= 3 else "🟢"))
            print(f"   {tag} score {s}{' · PRIMARY 완전일치' if ex else ''} | {p['slug']}")
            print(f"      title: {p['title'][:74]}")
            print(f"      primary: {p['primary']}")
            print(f"      매칭: {', '.join(m)}")
        if len(matches) > 5:
            print(f"   ...외 {len(matches) - 5}건")
        print()

    print("=" * 60)
    print(f"검사 대상 {total_posts}편 · 키워드 보유 {total_with_keys}편")
    print(f"강한 매칭(title) {total_strong}건 / 약한 매칭 {total_weak}건 / primary 완전일치 {len(exact_hits)}건")

    if total_posts == 0 or total_with_keys == 0:
        print("\n⚠️  exit 3 — NOT_CHECKED: 검사 대상이 0편이거나 키워드를 한 건도 못 뽑았다.")
        print("    이건 통과가 아니다. 경로·프론트매터 형식을 확인하고 다시 돌려라.")
        return 3

    if exact_hits:
        print("\n🔴 exit 2 — 작성 금지: 기존 글의 primary 와 정규화 후 완전히 같다.")
        for site, p in exact_hits[:6]:
            print(f"    {site} · {p['slug']} · primary '{p['primary']}'")
        print("    → 키워드를 실제 각도로 좁히거나, 그 글을 보강하는 쪽으로 전환하라.")
        return 2
    if total_strong >= 3:
        print("\n🔴 exit 2 — 작성 금지: title 강매칭 3건 이상. 기존 글 보강 권장")
        return 2
    if total_strong >= 1 or total_weak >= 3:
        print("\n🟡 exit 1 — 주의: 카테고리·각도 차별화를 본문에 명시하고 작성")
        return 1
    print("\n🟢 exit 0 — 겹침 없음, 작성 OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
