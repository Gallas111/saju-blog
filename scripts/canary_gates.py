#!/usr/bin/env python3
"""중복 게이트 3종 카나리 — check-keyword-overlap / check-crosssite-overlap / check-duplicate-post.

🔴 **부정검사는 반드시 왕복으로 확인한다.** 통과 케이스만 보면 "안 잡히는" 구멍을 못 본다.
게이트를 고쳤으면 이걸 다시 돌려라(메모리: "게이트를 고치면 --canary 재실행 필수").

이 파일의 핵심은 **회귀 케이스**다. 2026-08-05 에 실제로 뚫린 두 구멍이 R1·R2 로 들어 있다.
새 구멍을 발견하면 여기에 케이스를 추가하고 지우지 마라 — 게이트는 "고쳤다" 직후에
다음 구멍이 나오는 물건이라(8/1 실측 3회 연속), 반례를 계속 흡수시켜야 한다.
"""

import subprocess
import sys
import os

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable

fails = []


def run(script, *args):
    r = subprocess.run([PY, "-X", "utf8", os.path.join(HERE, script), *args],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def expect(name, got, want, out="", show=0):
    ok = got == want if isinstance(want, int) else got in want
    print(("  ✅ " if ok else "  ❌ ") + f"{name}  → exit {got} (기대 {want})")
    if not ok:
        fails.append(name)
        for line in out.strip().split("\n")[-8:]:
            print("       | " + line[:150])
    elif show:
        for line in out.strip().split("\n")[-show:]:
            print("       | " + line[:150])


print("=== R1. 🔴 회귀 — ai-revenue primary 완전일치 (2026-08-05 실제로 뚫린 구멍) ===")
print("   'AI 디지털 상품 판매' 는 ai-digital-download-products-etsy-gumroad-revenue 의 primary 다.")
print("   옛 게이트는 keywords 를 못 읽어 exit 0(매칭 없음)을 냈다. 이제 exit 2 여야 한다.")
rc, out = run("check-keyword-overlap.py", "ai-blog", "AI 디지털 상품 판매")
expect("primary 완전일치 → 작성 금지", rc, 2, out, show=3)

print("\n=== R2. 🔴 회귀 — 클러스터 밖 사이트가 '검사 안 함'을 통과로 내지 않는다 ===")
print("   옛 게이트는 ai-blog 에 '교차 점검 대상 아님 · exit 0' 을 냈다(NOT_CHECKED 를 통과로 위장).")
print("   이제 네트워크 전수 primary 대조를 실제로 수행해야 한다.")
rc, out = run("check-crosssite-overlap.py", "ai-blog", "챗GPT 연령 인증 하는 법", "챗GPT 연령 인증")
expect("클러스터 밖도 실제 검사 (겹침 없으면 0)", rc, 0, out, show=3)
has_scan = "편 검사" in out
print(("  ✅ " if has_scan else "  ❌ ") + "검사 편수를 출력한다(무엇을 몇 개 봤는지)")
if not has_scan:
    fails.append("크로스게이트 검사 편수 미출력")

print("\n=== 1. 실제 충돌은 여전히 잡혀야 한다 (hard 클러스터) ===")
rc, out = run("check-crosssite-overlap.py", "tokennara",
              "문 닫은 코인 거래소에서 자산 되찾는 법", "코인 거래소 영업종료")
expect("coinday 8/5 글과 정면 충돌 → 작성 금지", rc, 2, out, show=3)

print("\n=== 2. 키워드를 1개만 넘겨도 hard 클러스터는 잡아야 한다 (8/1 회귀) ===")
rc, out = run("check-crosssite-overlap.py", "altnara", "코인 거래소 영업종료 안내", "코인 거래소 영업종료")
expect("인자 1개여도 검출", rc, 2, out)

print("\n=== 3. 정규화 — 띄어쓰기만 다른 같은 쿼리 (8/1 회귀) ===")
rc, out = run("check-crosssite-overlap.py", "tokennara", "코인 거래소 영업 종료", "코인거래소영업종료")
expect("norm_key 정규화로 검출", rc, (1, 2), out)

print("\n=== 4. 무관한 토픽은 통과해야 한다 (오탐 방지) ===")
rc, out = run("check-keyword-overlap.py", "ai-blog", "양자컴퓨터 큐비트 오류정정 실험")
expect("무관 키워드 → 통과", rc, 0, out)
rc, out = run("check-crosssite-overlap.py", "coinday", "반려견 슬개골 탈구 관리법", "슬개골 탈구")
expect("클러스터 안이어도 무관하면 통과", rc, 0, out)

print("\n=== 5. NOT_CHECKED 는 통과로 내지 않는다 ===")
rc, out = run("check-keyword-overlap.py", "quicktools", "아무 키워드")
expect("검사 대상 0편 → exit 3(NOT_CHECKED)", rc, (0, 3), out)
print("       ↑ quicktools 는 mdx 가 없다. 0 이 나오면 read_posts 가 0편을 '통과'로 낸 것이니 확인 필요")
if rc == 0:
    print("  ⚠️  quicktools 가 exit 0 을 냈다 — 0편 검사를 통과로 내는 경로가 남아 있는지 확인하라")

print("\n=== 6. 같은 사이트 중복 게이트도 함께 (check-duplicate-post) ===")
rc, out = run("check-duplicate-post.py", "ai-blog",
              "AI 웹툰 만들기 도구 4종 비교 2026 — 컷마다 얼굴 바뀌는 문제부터 잡는 법")
expect("오늘 발행한 제목 그대로 → 중복 검출", rc, (1, 2), out, show=3)

print("\n=== 7. 종료코드를 파이프 없이 읽는다는 계약 확인 ===")
rc, out = run("check-keyword-overlap.py", "ai-blog", "AI 디지털 상품 판매")
has_verdict = "exit 2" in out
print(("  ✅ " if has_verdict else "  ❌ ") + "판정 문구를 stdout 에 직접 찍는다(파이프 뒤 $? 사고 방지)")
if not has_verdict:
    fails.append("판정 문구 미출력")

print("\n" + "=" * 62)
if fails:
    print(f"❌ 카나리 실패 {len(fails)}건: " + " | ".join(fails))
    sys.exit(1)
print("✅ 카나리 전건 통과")
sys.exit(0)
