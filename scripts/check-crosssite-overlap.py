#!/usr/bin/env python3
"""
교차 사이트 카니발 사전 점검 — 같은 니치 클러스터의 *다른* 사이트가 이미 쓴 토픽인지 확인.

배경(2026-08-01 실측): coinday·tokennara·altnara 는 같은 운영자의 코인 3사이트인데
니치가 갈려 있어야 함에도 같은 토픽을 며칠 간격으로 두 번 썼다.
  - coinday 7/21 "코인 현금화 방법 — 팔아서 원화로 출금하기"
    ↔ tokennara 7/23 "코인 현금화 방법 — 팔아서 원화로 출금하는 순서"
  - coinday 7/31 "코인 거래내역서 발급받는 법"
    ↔ tokennara 8/1 "코인 거래내역서 발급 — 업비트·빗썸·코인원 증명서 신청 방법"
기존 게이트(check-duplicate-post.py / check-keyword-overlap.py)는 *같은 사이트 안*만 보므로
이 유형을 구조적으로 못 잡는다. 이 스크립트가 그 구멍을 메운다.

같은 쿼리를 두 도메인이 겨냥하면 서로를 잡아먹을 뿐 아니라
같은 운영자 지문(네트워크처럼 보이는 것)이 된다.

Usage:
  python ~/scripts/check-crosssite-overlap.py <blog> "<제목>" [키워드1 키워드2 ...]
  python ~/scripts/check-crosssite-overlap.py tokennara "코인 거래내역서 발급 방법" "거래내역서"
  python ~/scripts/check-crosssite-overlap.py --audit coin        # 클러스터 전수 감사
옵션:
  --days N   최근 N일 글만 대조 (기본 90). 0 = 전체
  --audit <클러스터>  해당 클러스터의 기존 글끼리 교차 겹침을 전수 스캔

Exit codes:
  0 = 겹침 없음 (작성 OK)
  1 = 주의 — soft 클러스터 겹침 또는 약한 겹침. 각도 분리를 본문에 명시하고 작성
  2 = 작성 금지 — hard 클러스터에서 강한 겹침, 또는 네트워크 primary 완전일치
  3 = NOT_CHECKED — 검사된 글이 0편. **통과가 아니다.** 경로를 확인하고 다시 돌려라

## 🔴 2026-08-05 수리 (같은 결함을 또 내지 않으려면 이 문단을 지우지 말 것)

이전에는 **클러스터 밖 사이트(ai-blog 등)에 "교차 점검 대상 아님" 을 찍고 exit 0 을 냈다.**
검사를 안 한 것인데 출력이 "🟢 exit 0 — 겹침 없음, 작성 OK" 라서 통과로 읽혔다.
2026-08-05 회차에 정찰관·집필자 6명이 독립적으로 이걸 지적했다.
→ '검사 안 함' 을 없애고 **네트워크 전수 primary 대조로 실제 검사**한다(check_network).

또 프론트매터 파싱을 공용 모듈 `blog_frontmatter.py` 로 이관했다. 옛 primary_key() 는
`primary:`/`targetKeyword:` 만 봐서 keywords 를 평면 블록 리스트로 쓰는
**ai·health·easy·baby 네 사이트가 primary 판정에서 통째로 빠져 있었다.**
"""

import sys
import os
import re

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from blog_frontmatter import BASE, norm_key, read_posts as _read_posts  # noqa: E402

# hard = 같은 니치. 겹치면 작성 금지.
# soft = 인접 니치. 겹치면 각도 분리 명시 후 작성.
CLUSTERS = {
    "coin": {"kind": "hard", "sites": ["coinday", "tokennara", "altnara"]},
    "finance": {"kind": "soft", "sites": ["easy-zetec", "bukbukstock"]},
    "family-health": {"kind": "soft", "sites": ["health-blog", "baby-blog"]},
}

# 클러스터 밖 사이트(ai-blog 등)도 네트워크 전수 primary 대조는 받는다 — check_network 참조.
ALL_SITES = ["ai-blog", "saju-blog", "coinday", "bukbukstock", "tokennara",
             "altnara", "easy-zetec", "baby-blog", "health-blog"]

# 토픽 식별력이 없는 낱말. 이게 겹치는 건 신호가 아니다.
STOP = set("""
코인 가상자산 암호화폐 방법 보는 하는 법 뜻 확인 정리 기준 비교 사용 안내 총정리 완벽
가이드 순서 단계 주의 주의점 체크 리스트 체크리스트 자가진단 알아보기 무엇 어떻게 왜
그리고 하지만 위한 위해 대한 에서 부터 까지 이란 이라 라는 것을 것이 수가 있는 없는
2026 2025 년 월 일 top best 방법과 방법을 하기 되나 될까 한다 있다 없다 이다
""".split())

TOKEN_RE = re.compile(r"[가-힣A-Za-z][가-힣A-Za-z0-9]{1,}")


def tokens(text):
    return {t for t in TOKEN_RE.findall(text or "") if t.lower() not in STOP and len(t) >= 2}


# 🔴 norm_key 는 blog_frontmatter 에서 import 한다. 여기에 다시 정의하지 마라 —
# 2026-08-05 까지 로컬 사본이 import 를 가리고 있었고 문자 클래스도 미묘하게 달랐다
# (대괄호 누락). 정규화 규칙이 둘로 갈리면 같은 키워드가 게이트마다 다르게 판정된다.


def read_posts(site, days):
    """사이트의 모든 mdx 에서 프론트매터 추출.

    🔴 2026-08-05: 자체 정규식을 버리고 공용 파서 `blog_frontmatter.py` 를 쓴다.
    옛 primary_key() 는 `primary:`/`targetKeyword:` 만 봐서, keywords 를 **평면 블록
    리스트**로 쓰는 ai·health·easy·baby 에서는 primary 가 늘 빈 문자열이었다
    (= 그 네 사이트는 primary 완전일치 판정에서 통째로 빠져 있었다).
    새 게이트를 만들 때도 여기에 정규식을 다시 쓰지 말고 그 모듈을 import 하라 —
    파서가 갈라진 것이 이 결함 계보의 근본 원인이다.

    noindex 글은 색인에 없어 카니발라이즈가 불가능하므로 대조 대상에서 뺀다."""
    posts = _read_posts(site, days=days, skip_noindex=True)
    for p in posts:
        # 하위 호환: 기존 코드가 p["keywords"] 로 전체 키워드를 기대한다.
        p["keywords"] = p["all_keys"]
    return posts


def score(a_tokens, a_kws, post):
    """겹침 점수 = 제목 토큰 교집합 + 키워드 매칭 가중.
    🔴 키워드 매칭은 norm_key 로 정규화해서 본다 — 축자 비교로는
    '스캠코인 거르는 법' 이 '스캠 코인 거르는 법' 에 안 걸린다(8/1 실측)."""
    b_tokens = tokens(post["title"]) | tokens(" ".join(post["keywords"]))
    inter = a_tokens & b_tokens
    s = len(inter)
    joined = norm_key(post["title"] + " " + " ".join(post["keywords"]) + " " + post.get("primary", ""))
    kw_hits = [k for k in a_kws if k and norm_key(k) and norm_key(k) in joined]
    s += 2 * len(kw_hits)
    # primary 가 정규화 후 완전히 같으면 점수와 무관하게 정면 충돌이다
    exact = any(k and post.get("primary") and norm_key(k) == norm_key(post["primary"]) for k in a_kws)
    if exact:
        s = max(s, 99)
    return s, sorted(inter), kw_hits


def clusters_for(site):
    return [(name, c) for name, c in CLUSTERS.items() if site in c["sites"]]


def check_network(site, title, kws, days):
    """클러스터 밖 사이트용 — 네트워크 전체와 primary 완전일치만 대조한다.

    🔴 2026-08-05 신설 사유: 예전에는 클러스터 밖이면 "교차 점검 대상 아님" 을 찍고
    **exit 0(작성 OK)** 을 냈다. 검사를 안 한 것인데 통과로 읽혔고, 8/5 회차에 정찰관·집필자
    6명이 독립적으로 이걸 지적했다("이건 NOT_CHECKED 지 통과가 아니다").

    그래서 '검사 안 함' 을 없애고 **실제로 검사한다.** 클러스터 밖은 니치가 달라 토큰 겹침이
    상시 노이즈이므로, 판정은 **primary 완전일치 하나로만** 한다. 이건 오탐이 거의 없고
    (같은 쿼리를 두 도메인이 겨냥한다는 뜻) 비용도 싸다."""
    others = [s for s in ALL_SITES if s != site]
    kn = [norm_key(k) for k in kws if norm_key(k)]
    kn.append(norm_key(title))
    scanned = 0
    hits = []
    for o in others:
        for p in read_posts(o, days):
            scanned += 1
            pk = norm_key(p.get("primary", ""))
            if pk and pk in kn:
                hits.append(p)
    print(f"■ {site} 는 니치 클러스터 밖입니다 — 네트워크 전수 primary 대조로 대신합니다.")
    print(f"  대조 대상: {', '.join(others)} · {scanned}편 검사")
    if scanned == 0:
        print("  ⚠️  검사된 글이 0편입니다 — NOT_CHECKED. 경로를 확인하고 다시 돌리세요.")
        return 3
    if not hits:
        print("  겹침 없음 (primary 완전일치 0건)")
        return 0
    for p in hits[:6]:
        print(f"  🔴 {p['site']} {p['date']} | {p['title'][:66]}")
        print(f"       primary '{p['primary']}'")
    return 2


def check(site, title, kws, days):
    mine = clusters_for(site)
    if not mine:
        return check_network(site, title, kws, days)
    a_tokens = tokens(title) | tokens(" ".join(kws))
    worst = 0
    for cname, c in mine:
        others = [s for s in c["sites"] if s != site]
        print(f"\n■ 클러스터 '{cname}' ({c['kind']}) — 대조 대상: {', '.join(others)}")
        hits = []
        for o in others:
            for p in read_posts(o, days):
                s, inter, kw_hits = score(a_tokens, kws, p)
                if s >= 3:
                    hits.append((s, p, inter, kw_hits))
        hits.sort(key=lambda x: -x[0])
        if not hits:
            print("  겹침 없음")
            continue
        for s, p, inter, kw_hits in hits[:6]:
            flag = "🔴" if s >= 5 else "🟡"
            print(f"  {flag} [{s}] {p['site']} {p['date']} | {p['title'][:70]}")
            print(f"       공통어: {' '.join(inter)}" + (f" | 키워드매칭: {kw_hits}" if kw_hits else ""))
        top = hits[0][0]
        # hard 클러스터에서 키워드가 축자로 걸리면 그건 같은 쿼리를 겨냥한다는 뜻이다.
        # 제목 토큰이 몇 개 겹치느냐와 무관하게 작성 금지다(키워드를 하나만 넘겨도 잡혀야 한다).
        kw_collision = any(kw_hits for _, _, _, kw_hits in hits)
        if c["kind"] == "hard" and (top >= 5 or kw_collision):
            worst = max(worst, 2)
        else:
            worst = max(worst, 1)
    return worst


def audit(cname, days):
    c = CLUSTERS.get(cname)
    if not c:
        print(f"알 수 없는 클러스터: {cname}. 가능: {', '.join(CLUSTERS)}")
        return 2
    posts = []
    for s in c["sites"]:
        posts.extend(read_posts(s, days))
    print(f"■ '{cname}' 클러스터 전수 감사 — {len(posts)}편 ({', '.join(c['sites'])})")

    # ── 1차: primary 키워드 완전일치 (가장 정밀 — 제목 토큰으로는 안 잡힌다) ──
    bykey = {}
    for p in posts:
        if p["primary"]:
            bykey.setdefault(norm_key(p["primary"]), []).append(p)
    exact = [(k, v) for k, v in bykey.items() if len({x["site"] for x in v}) > 1]
    exact.sort()
    print(f"\n▣ primary 키워드 완전일치: {len(exact)}건  ← 사이트 간 같은 쿼리를 정면으로 겨냥한 것")
    for k, v in exact:
        print(f"  🔴 '{k}'")
        for p in sorted(v, key=lambda x: x["date"]):
            print(f"       {p['site']:10s} {p['date']}  {p['title'][:62]}")
    if not exact:
        print("  없음")

    # ── 2차: 제목 토큰 겹침 (보조 신호) ──
    pairs = []
    for i in range(len(posts)):
        ti = tokens(posts[i]["title"]) | tokens(" ".join(posts[i]["keywords"]))
        for j in range(i + 1, len(posts)):
            if posts[i]["site"] == posts[j]["site"]:
                continue
            tj = tokens(posts[j]["title"]) | tokens(" ".join(posts[j]["keywords"]))
            inter = ti & tj
            if len(inter) >= 3:
                pairs.append((len(inter), posts[i], posts[j], sorted(inter)))
    pairs.sort(key=lambda x: -x[0])
    for n, a, b, inter in pairs[:25]:
        flag = "🔴" if n >= 5 else "🟡"
        print(f"  {flag} [{n}] {a['site']} {a['date']} | {a['title'][:62]}")
        print(f"        {b['site']} {b['date']} | {b['title'][:62]}")
        print(f"        공통어: {' '.join(inter)}")
    print(f"\n▣ 제목 토큰 겹침 후보: {len(pairs)}건 (🔴 {sum(1 for p in pairs if p[0] >= 5)}건)")
    print(f"▣ primary 완전일치: {len(exact)}건")
    print("\n🔑 판정은 primary 완전일치를 우선한다. 제목 토큰 겹침은 표현이 비슷할 뿐 의도가 다를 수 있고,")
    print("   반대로 토큰이 하나도 안 겹쳐도 primary 가 같으면 정면 충돌이다(8/1 실측으로 확인).")
    if exact:
        return 2
    return 2 if any(p[0] >= 5 for p in pairs) else (1 if pairs else 0)


def main():
    argv = sys.argv[1:]
    days = 90
    if "--days" in argv:
        i = argv.index("--days")
        days = int(argv[i + 1])
        del argv[i:i + 2]
    if argv and argv[0] == "--audit":
        if len(argv) < 2:
            print(__doc__)
            return 2
        return audit(argv[1], days)
    if len(argv) < 2:
        print(__doc__)
        return 2
    site, title, kws = argv[0], argv[1], argv[2:]
    if site not in [s for c in CLUSTERS.values() for s in c["sites"]] and site not in os.listdir(BASE):
        print(f"알 수 없는 블로그: {site}")
        return 2
    rc = check(site, title, kws, days)
    print("\n" + {0: "🟢 exit 0 — 겹침 없음, 작성 OK",
                  1: "🟡 exit 1 — 주의. 각도 분리를 본문에 명시하고 작성",
                  2: "🔴 exit 2 — 작성 금지. 같은 니치의 다른 사이트가 이미 쓴 토픽이다"}[rc])
    return rc


if __name__ == "__main__":
    sys.exit(main())
