#!/usr/bin/env python3
"""blog_frontmatter.py 카나리 — 부정검사는 반드시 왕복으로 확인한다.

파서를 고쳤으면 이걸 다시 돌려라. 통과 케이스만 보면 "안 잡히는" 구멍을 못 본다.
"""
import sys
import os

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from blog_frontmatter import parse_head, read_posts, norm_key, BLOG_PATHS  # noqa: E402

fails = []


def check(name, cond, detail=""):
    print(("  ✅ " if cond else "  ❌ ") + name + (f"  {detail}" if detail else ""))
    if not cond:
        fails.append(name)


print("=== 1. 형태 A — keywords 중첩 객체 (saju/coinday/bukbuk) ===")
A = """---
title: 관상 보는법 순서 7단계
slug: gwansang-order
targetKeyword: 관상 보는법 순서
tags:
  - 관상 보는법
  - 삼정 오악
date: '2026-08-05'
keywords:
  primary: 관상 보는법 순서
  secondary:
    - 관상 보는 순서
    - 삼정 오악 관상
  longTail:
    - 관상 얼굴 어디부터 보나
---"""
a = parse_head(A)
check("primary = keywords.primary", a["primary"] == "관상 보는법 순서", a["primary"])
check("secondary·longTail 흡수", "삼정 오악 관상" in a["keywords"] and "관상 얼굴 어디부터 보나" in a["keywords"])
check("🔴 'secondary'/'longTail' 헤더가 항목으로 새지 않음",
      not any(k in ("secondary", "longTail") for k in a["keywords"]), str(a["keywords"]))
check("tags 블록 파싱", a["tags"] == ["관상 보는법", "삼정 오악"], str(a["tags"]))

print("\n=== 2. 형태 B — keywords 평면 블록 리스트 (ai/health/easy/baby) ===")
B = """---
title: AI 전자책 환불
keywords:
  - 디지털 콘텐츠 환불 규정
  - 청약철회 제한
  - 전자책 환불 거절
author: HowtoAI
---"""
b = parse_head(B)
check("primary = 첫 항목", b["primary"] == "디지털 콘텐츠 환불 규정", b["primary"])
check("전 항목 파싱", len(b["keywords"]) == 3, str(b["keywords"]))
check("🔴 뒤따르는 다른 키(author)가 항목으로 새지 않음", "HowtoAI" not in b["keywords"])

print("\n=== 3. 형태 C — tags 인라인 + targetKeyword (tokennara/altnara) ===")
C = """---
title: 에이브 AAVE 분석
targetKeyword: 미신고 가상자산사업자
tags: ["딥다이브", "에이브", "AAVE"]
---"""
c = parse_head(C)
check("primary = targetKeyword", c["primary"] == "미신고 가상자산사업자", c["primary"])
check("인라인 tags 파싱", c["tags"] == ["딥다이브", "에이브", "AAVE"], str(c["tags"]))

print("\n=== 4. 형태 D — keywords 인라인 배열 ===")
D = """---
title: 옛 형식 글
keywords: ["GPT-5.5", "챗GPT 활용"]
---"""
d = parse_head(D)
check("인라인 배열 파싱", d["keywords"] == ["GPT-5.5", "챗GPT 활용"], str(d["keywords"]))
check("primary = 첫 항목", d["primary"] == "GPT-5.5", d["primary"])

print("\n=== 5. 부정 케이스 — keywords 가 없으면 빈 값이어야 한다 ===")
E = """---
title: 키워드 없는 글
description: 설명만 있다
---"""
e = parse_head(E)
check("keywords 빈 리스트", e["keywords"] == [], str(e["keywords"]))
check("primary 빈 문자열", e["primary"] == "", repr(e["primary"]))

print("\n=== 6. noindex 인식 ===")
check("noindex: true 인식", parse_head("---\ntitle: x\nnoindex: true\n---")["noindex"])
check("noindex 없으면 False", not parse_head("---\ntitle: x\n---")["noindex"])

print("\n=== 7. norm_key 정규화 ===")
check("'공포 탐욕 지수' == '공포탐욕지수'", norm_key("공포 탐욕 지수") == norm_key("공포탐욕지수"))
check("'스캠코인' == '스캠 코인'", norm_key("스캠코인") == norm_key("스캠 코인"))
check("다른 쿼리는 달라야 함", norm_key("코인 상속") != norm_key("코인 상장"))

print("\n=== 8. 🔴 파서 정확성 — 필드가 있는 글은 100% 뽑혀야 한다 ===")
print("   (커버리지 미달이 곧 파서 버그는 아니다. 원본에 필드가 없는 글도 있다 —")
print("    그건 데이터 결손으로 따로 보고한다. 두 가지를 섞으면 진짜 버그가 묻힌다.)")
import re as _re

HAS_FIELD = _re.compile(r"^(keywords|tags|targetKeyword):", _re.M)
total = 0
parser_bugs = []
data_gaps = []
for site in BLOG_PATHS:
    if site == "quicktools":
        continue
    root = BLOG_PATHS[site]
    import glob as _glob
    files = _glob.glob(os.path.join(root, "content", "**", "*.mdx"), recursive=True)
    if not files:
        print(f"  ⚠  {site}: 0편 — 경로 확인 필요")
        continue
    posts = read_posts(site)
    total += len(posts)
    # 원본에 필드가 있는데 파서가 못 뽑은 글 = 진짜 파서 버그
    raw_has = 0
    missed = []
    for f in files:
        try:
            head = open(f, encoding="utf-8").read(4000)
        except Exception:
            continue
        if not HAS_FIELD.search(head):
            continue
        raw_has += 1
        p = parse_head(head)
        if not p["all_keys"]:
            missed.append(os.path.basename(f))
    with_p = sum(1 for p in posts if p["primary"])
    ok = not missed
    if not ok:
        parser_bugs.append(f"{site}: {len(missed)}편 (예: {missed[0]})")
    no_field = len(files) - raw_has
    if no_field:
        data_gaps.append(f"{site} {no_field}편")
    print(f"  {'✅' if ok else '❌'} {site:13} {len(files):4}편  "
          f"필드보유 {raw_has:4} → 파싱성공 {raw_has - len(missed):4}  "
          f"primary {with_p:4}  필드없음 {no_field:3}")

check(f"필드가 있는 글은 전건 파싱 (총 {total}편)", not parser_bugs, " / ".join(parser_bugs))
if data_gaps:
    print(f"  ⚠  데이터 결손(원본에 키워드 필드 자체가 없음): {', '.join(data_gaps)}")
    print("     → 파서 문제가 아니다. 그 글들은 primary 완전일치 판정에서 빠진다.")

print("\n" + "=" * 60)
if fails:
    print(f"❌ 카나리 실패 {len(fails)}건: " + " | ".join(fails))
    sys.exit(1)
print("✅ 카나리 전건 통과")
sys.exit(0)
