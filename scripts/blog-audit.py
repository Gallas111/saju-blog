# -*- coding: utf-8 -*-
"""
블로그 9레포 상시 감사 게이트 (2026-08-03 신설).

왜 만들었나
-----------
8/3 회차에서 애드혹으로 돌린 검사들이 실제 결함을 여럿 잡았는데, 그 검사들이 어디에도
배선돼 있지 않아 다음 회차에 사라질 판이었다. 특히 고아 이미지 434장(22.9MB)은
"삭제·개명된 글이 남긴 잔재"라 아무도 안 보면 계속 쌓인다. 게다가 그 고아들이
픽셀중복 검사를 오염시켜 **"라이브 중복 22장"이라는 잘못된 판정**을 만들었다.

설계 원칙 (오늘 데인 것들)
--------------------------
1. 🔴 **검사를 안 하고 통과를 내지 않는다.** 분모(무엇을 몇 개 검사했는지)를 항상 찍고,
   분모가 0이면 통과가 아니라 NOT_CHECKED 로 실패시킨다. (gen-post-images-finalize 무음통과 교훈)
2. 🔴 **집합 판정은 참조 그래프를 붙인 뒤에 한다.** 해시가 같다는 사실만으로 중복이라 부르지 않는다.
3. 🔴 **파일명 패턴은 유니코드 안전하게.** ASCII 클래스는 한글 슬러그 이미지를 놓친다.
4. 🔴 **오탐을 만들지 않는다.** "잠깐 숨을 참고" 같은 정상 한국어를 초안 흔적으로 잡으면
   239건짜리 쓰레기 리포트가 나와 아무도 안 본다. 패턴을 좁게 잡는다.

사용
----
    python ~/scripts/blog-audit.py                 # 전 레포
    python ~/scripts/blog-audit.py ai-blog saju-blog
    python ~/scripts/blog-audit.py --fix-orphans   # 고아를 git rm 까지
    python ~/scripts/blog-audit.py --fast          # 픽셀 해시 생략(빠름)
    python ~/scripts/blog-audit.py --canary        # 게이트 자체 자가검증

종료코드: 0 통과 · 1 위반 · 2 검사불가(도구 오류)
"""
import sys, os, re, io, glob, json, hashlib, subprocess, unicodedata, tempfile, shutil
from collections import defaultdict
from urllib.parse import unquote

BASE = r'C:\Users\owner\OneDrive\바탕 화면\사이트'
REPOS = ['ai-blog', 'saju-blog', 'coinday', 'bukbukstock', 'tokennara',
         'altnara', 'easy-zetec', 'baby-blog', 'health-blog']
SKIP_DIRS = {'node_modules', '.git', '.next', 'out', 'dist', 'quarantine', '.vercel', 'tmp-build'}
TEXT_EXT = ('.mdx', '.md', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json',
            '.html', '.css', '.xml', '.txt', '.yml', '.yaml')
IMG_EXT = ('.webp', '.png', '.jpg', '.jpeg')

# 🔴 유니코드 안전. ASCII 클래스로 잡으면 한글 슬러그 이미지를 참조로 못 세어 고아를 과대보고한다.
REF_RE = re.compile(r'([^\s"\'`()\[\]{}<>,;:!?]+\.(?:webp|png|jpe?g))', re.I)
BODY_IMG_RE = re.compile(r'!\[[\s\S]*?\]\((/images/[^)\s]+)\)')
FM_IMG_RE = re.compile(r"^\s*(?:image|thumbnail):\s*['\"]?(/images/[^'\"\s]+)", re.M)

# 좁게 잡는다 — "잠깐 숨을 참고" 같은 정상 문장을 잡으면 리포트가 쓰레기가 된다
DRAFT_RE = [
    # 🔴 제목/소제목의 "잠깐 —"은 수사적 전환이라 정상이다(`## 잠깐 — A와 B, 뭐가 다를까`).
    #    본문 한복판에서 저자가 자기한테 말하는 것만 잡는다.
    (re.compile(r'(?<!#)(?<!# )잠깐[,\s]*[—\-]\s*(?:보수|다시|아니|어|음|잠시만)', re.M), '자문자답(잠깐 — …)'),
    (re.compile(r'잠깐,?\s*(다시|계산|확인)\s*(해\s*)?(보자|보(?:겠|아야)|하자)'), '자문자답(잠깐 다시…)'),
    (re.compile(r'(?:^|\n)\s*(?:TODO|FIXME)\s*[:：]'), 'TODO/FIXME 주석'),
    (re.compile(r'\(\s*(?:확인\s*필요|수정\s*필요|나중에)\s*\)'), '작성 메모'),
    # 🔴 "사실을 못 정하고 그대로 발행"한 유형(2026-08-03 tokennara ONDO 실사례).
    #    독자 안내("약관 확인 필요"·"매년 자격 재확인 필요"·"개별 확인 필요해요")와 반드시 구분해야 한다 —
    #    처음에 넓게 잡았더니 4건 전부 독자 안내문 오탐이었다. 그래서 조건을 둘 다 요구한다:
    #      ① 단정 못 한 서술(가능성 있음/미상장/미정/불명) ② 그 뒤 '괄호 안'의 확인 필요
    (re.compile(r'(?:가능성\s*있음|미상장|미정|불명)[^\n]{0,30}\([^)\n]{0,40}확인\s*필요[^)\n]{0,10}\)'),
     '미확정 사실 방치'),
]
PLACEHOLDER_RE = [
    (re.compile(r'제\s*20\d\d\s*-\s*(?:XXX|OOO|\?\?\?|000)\s*호'), '고시번호 플레이스홀더'),
    (re.compile(r'lorem\s+ipsum', re.I), 'lorem ipsum'),
    (re.compile(r'\bTBD\b'), 'TBD'),
]
SPAM_TITLE_RE = [
    (re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]'), '이모지'),
    (re.compile(r'0원|공짜'), '0원'),
    (re.compile(r'칼퇴|야근'), '칼퇴'),
    (re.compile(r'폭발|박멸|지옥|치트키|대박|충격'), '자극어'),
    (re.compile(r'\d+배\s*(?:폭발|폭증|증가)'), '배수과장'),
]
OG_HARDCODE_RE = re.compile(r'width:\s*1200\s*,\s*height:\s*630')


def norm_key(s):
    return re.sub(r'[\s·\-—()\[\]/]', '', unicodedata.normalize('NFKC', s or '')).lower()


def frontmatter(text):
    return text.split('---', 2)[1] if text.startswith('---') and text.count('---') >= 2 else ''


def pixel_hash(path):
    try:
        from PIL import Image
        with Image.open(path) as im:
            return hashlib.md5(im.convert('RGB').resize((64, 64)).tobytes()).hexdigest()
    except Exception:
        return None


class Repo:
    def __init__(self, name):
        self.name = name
        self.root = os.path.join(BASE, name)
        self.imgdir = os.path.join(self.root, 'public', 'images', 'posts')
        self.posts = []          # dict(slug,title,primary,noindex,rel,text,head)
        self.images = []         # basename
        self.referenced = set()  # basename (전 레포 텍스트 기준)
        self.load()

    def load(self):
        for f in glob.glob(os.path.join(self.root, 'content', '**', '*.mdx'), recursive=True):
            try:
                t = io.open(f, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            head = frontmatter(t)
            m = re.search(r"^slug:\s*['\"]?([^'\"\n]+)", head, re.M)
            slug = m.group(1).strip() if m else re.sub(r'^\d{4}-\d{2}-\d{2}-', '', os.path.splitext(os.path.basename(f))[0])
            tm = re.search(r'^title:\s*(.+)$', head, re.M)
            pm = re.search(r"^\s*primary:\s*['\"]?([^'\"\n]+)", head, re.M) or \
                 re.search(r"^targetKeyword:\s*['\"]?([^'\"\n]+)", head, re.M)
            self.posts.append({
                'slug': slug,
                'title': (tm.group(1).strip().strip('"\'') if tm else ''),
                'primary': (pm.group(1).strip() if pm else ''),
                'noindex': bool(re.search(r'^noindex:\s*true', head, re.M)),
                'rel': os.path.relpath(f, self.root).replace(os.sep, '/'),
                'text': t, 'head': head,
            })
        # 🔴 이미지가 public/images/posts 에만 있는 게 아니다. easy-zetec 는 frontmatter 가
        #    `/images/<name>.png` 를 가리킨다. posts 하위만 보면 썸네일 90건을 '누락'으로
        #    오탐한다(2026-08-03 첫 실행에서 실제로 그랬고 라이브 og:image 는 200 이었다).
        #    그래서 public/images 전체를 훑고, 'URL 경로 → 실제 파일' 맵을 만든다.
        self.public = os.path.join(self.root, 'public')
        imgroot = os.path.join(self.public, 'images')
        self.url2path = {}
        if os.path.isdir(imgroot):
            for dirpath, dirnames, filenames in os.walk(imgroot):
                dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
                for fn in filenames:
                    if not fn.lower().endswith(IMG_EXT):
                        continue
                    full = os.path.join(dirpath, fn)
                    url = '/' + os.path.relpath(full, self.public).replace(os.sep, '/')
                    self.url2path[url] = full
        # 고아 판정 대상은 posts 하위(회차 산출물)로 한정한다 — 루트 /images 에는 로고·OG 기본 이미지 등
        # 코드에서만 쓰는 자산이 섞여 있어 별도 취급이 맞다.
        if os.path.isdir(self.imgdir):
            self.images = [os.path.basename(p) for p in glob.glob(os.path.join(self.imgdir, '*'))
                           if p.lower().endswith(IMG_EXT)]
        for dirpath, dirnames, filenames in os.walk(self.root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            if os.path.normpath(dirpath) == os.path.normpath(self.imgdir):
                continue  # 이미지 디렉터리 자신은 참조원이 아니다
            for fn in filenames:
                if not fn.lower().endswith(TEXT_EXT):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    if os.path.getsize(p) > 12 * 1024 * 1024:
                        continue
                    t = io.open(p, encoding='utf-8', errors='replace').read()
                except Exception:
                    continue
                for m in REF_RE.finditer(t):
                    name = m.group(1).replace('\\', '/').split('/')[-1]
                    self.referenced.add(name)
                    self.referenced.add(unquote(name))


class Result:
    def __init__(self):
        self.checks = []   # (name, repo, checked, violations, detail_lines)

    def add(self, name, repo, checked, violations, details=None):
        self.checks.append((name, repo, checked, violations, details or []))

    def failures(self):
        return [c for c in self.checks if c[3] > 0 or c[2] == 'NOT_CHECKED']


def audit(repos, fast=False, res=None):
    res = res or Result()
    for name in repos:
        r = Repo(name)
        if not r.posts:
            res.add('load', name, 'NOT_CHECKED', 1, ['content 에서 mdx 를 하나도 못 읽었다 — 경로 확인'])
            continue

        # 1) 고아 이미지
        if not os.path.isdir(r.imgdir):
            res.add('orphan', name, 'NOT_CHECKED', 1, ['이미지 디렉터리 없음: ' + r.imgdir])
        else:
            orph = sorted(f for f in r.images if f not in r.referenced)
            res.add('orphan', name, len(r.images), len(orph), orph[:12])

        # 2) 깨진 이미지 참조 — 🔴 URL 경로를 그대로 해석한다(/images/posts 만 보지 않는다)
        def resolve(url):
            u = url.split('?')[0].split('#')[0]
            return r.url2path.get(u) or r.url2path.get(unquote(u))

        broken, nrefs = [], 0
        for p in r.posts:
            for m in re.finditer(r'(/images/[^)\s"\'\]]+\.(?:webp|png|jpe?g))', p['text'], re.I):
                nrefs += 1
                if not resolve(m.group(1)):
                    broken.append('%s ← %s' % (m.group(1)[:60], p['rel'][:48]))
        res.add('broken-ref', name, nrefs if nrefs else 'NOT_CHECKED', len(broken), broken[:12])

        # 3) 라이브 픽셀중복 — 🔴 참조 그래프를 붙인 뒤에 판정한다
        if fast:
            res.add('pixel-dup', name, 'SKIPPED(--fast)', 0)
        else:
            users = defaultdict(set)
            for p in r.posts:
                if p['noindex']:
                    continue
                for m in re.finditer(r'/images/posts/([^)\s"\'\]]+\.(?:webp|png|jpe?g))', p['text'], re.I):
                    users[unquote(m.group(1))].add(p['slug'])
            groups, hashed = defaultdict(list), 0
            for fn in users:
                fp = os.path.join(r.imgdir, fn)
                h = pixel_hash(fp)
                if h:
                    groups[h].append(fn); hashed += 1
            dups = []
            for h, v in groups.items():
                posts = set()
                for fn in v:
                    posts |= users[fn]
                if len(v) > 1 and len(posts) > 1:
                    dups.append(' == '.join(x[:46] for x in v) + '  글: ' + ', '.join(list(posts)[:3]))
            res.add('pixel-dup', name, hashed if hashed else 'NOT_CHECKED', len(dups), dups[:8])

        # 4) 썸네일 누락 — frontmatter 키가 없는 레포(coinday 등)는 본문 첫 이미지를 썸네일로 본다
        miss, n, conv = [], 0, 'frontmatter'
        for p in r.posts:
            m = FM_IMG_RE.search(p['head'])
            if not m:
                bm = BODY_IMG_RE.search(p['text'])
                if not bm:
                    continue
                m, conv = bm, 'body-first'
            n += 1
            if not resolve(m.group(1)):
                miss.append('%s ← %s' % (m.group(1)[:56], p['rel'][:44]))
        res.add('thumb-missing', name, ('%d(%s)' % (n, conv)) if n else 'NOT_CHECKED', len(miss), miss[:10])

        # 5) U+FFFD
        bad = [p['rel'] for p in r.posts if '\ufffd' in p['text']]
        res.add('u+fffd', name, len(r.posts), len(bad), bad[:10])

        # 6) 사이트 내 자기잠식 (색인 열린 글끼리 primary 완전일치)
        prim = defaultdict(list)
        for p in r.posts:
            if p['noindex'] or not p['primary']:
                continue
            prim[norm_key(p['primary'])].append(p['slug'])
        cann = ['primary=%s → %s' % (k[:30], ', '.join(v[:3])) for k, v in prim.items() if len(v) > 1]
        res.add('self-cannibal', name, len(prim) if prim else 'NOT_CHECKED', len(cann), cann[:8])

        # 7) 플레이스홀더 (좁게)
        ph = []
        for p in r.posts:
            if p['noindex']:
                continue
            for rx, lab in PLACEHOLDER_RE:
                if rx.search(p['text']):
                    ph.append('%s · %s' % (lab, p['rel'][:52]))
        res.add('placeholder', name, len(r.posts), len(ph), ph[:10])

        # 8) 초안 흔적 (좁게)
        dr = []
        for p in r.posts:
            if p['noindex']:
                continue
            for rx, lab in DRAFT_RE:
                if rx.search(p['text']):
                    dr.append('%s · %s' % (lab, p['rel'][:52]))
        res.add('draft-artifact', name, len(r.posts), len(dr), dr[:10])

        # 9) og:image 크기 하드코딩
        og = []
        for dirpath, dirnames, filenames in os.walk(os.path.join(r.root, 'src')):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if not fn.endswith(('.ts', '.tsx')):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    t = io.open(p, encoding='utf-8', errors='replace').read()
                except Exception:
                    continue
                # 🔴 오탐 제외 3종 (2026-08-03 첫 실행에서 전부 실제로 났다):
                #   ① opengraph-image.tsx 의 size 선언 — 실제로 그 크기 이미지를 생성하므로 정상
                #   ② layout.tsx 의 사이트 기본 og-image — 고정 자산(실측 1200x630)이라 맞다
                #   ③ 카테고리/목록 페이지의 고정 og-image.png — 역시 고정 자산이라 맞다
                # 잡아야 하는 것은 **글마다 달라지는 썸네일**에 고정 치수를 붙이는 자리뿐이다.
                if 'opengraph-image' in fn or fn == 'layout.tsx':
                    continue
                if not OG_HARDCODE_RE.search(t):
                    continue
                dynamic = re.search(r'(frontmatter\.image|meta\.image|post\.\w*[Ii]mage)', t)
                fixed_only = re.search(r'=\s*["\'`][^"\'`]*og-image\.(png|jpg|webp)', t)
                if dynamic and not (fixed_only and not dynamic):
                    og.append(os.path.relpath(p, r.root).replace(os.sep, '/'))
        res.add('og-hardcode', name, 'src 스캔', len(og), og[:6])

        # 10) 스팸 제목 (색인 열린 글만 · 경고성)
        sp = []
        for p in r.posts:
            if p['noindex']:
                continue
            hits = [lab for rx, lab in SPAM_TITLE_RE if rx.search(p['title'])]
            if hits:
                sp.append('%s ← %s' % (p['title'][:52], ','.join(hits)))
        res.add('spam-title(warn)', name, len(r.posts), len(sp), sp[:6])
    return res


def report(res, warn_only=('spam-title(warn)',)):
    by = defaultdict(lambda: [0, 0])
    print('%-18s %-12s %12s %10s' % ('검사', '레포', '검사한 수', '위반'))
    print('-' * 58)
    for name, repo, checked, viol, det in res.checks:
        by[name][0] += (viol if name not in warn_only else 0)
        by[name][1] += 1
        if viol or checked == 'NOT_CHECKED':
            print('%-18s %-12s %12s %10s' % (name, repo, checked, viol))
            for d in det:
                print('      · %s' % d)
    print('-' * 58)
    hard = 0
    for name, (v, _) in sorted(by.items()):
        mark = '⚠ ' if name in warn_only else ('✅' if v == 0 else '🔴')
        print('%s %-18s 위반 %d' % (mark, name, v))
        if name not in warn_only:
            hard += v
    notchecked = sum(1 for c in res.checks if c[2] == 'NOT_CHECKED')
    if notchecked:
        print('🔴 NOT_CHECKED %d건 — 검사가 실행되지 않았다(통과 아님)' % notchecked)
    return hard, notchecked


def fix_orphans(repos):
    total = 0
    for name in repos:
        r = Repo(name)
        orph = sorted(f for f in r.images if f not in r.referenced)
        if not orph:
            print('%-12s 고아 없음' % name)
            continue
        spec = os.path.join(tempfile.gettempdir(), 'rmspec-%s.txt' % name)
        io.open(spec, 'w', encoding='utf-8', newline='\n').write(
            '\n'.join('public/images/posts/' + f for f in orph) + '\n')
        subprocess.run(['git', 'rm', '-q', '--ignore-unmatch', '--pathspec-from-file', spec],
                       cwd=r.root, capture_output=True, text=True, encoding='utf-8', errors='replace')
        print('%-12s 고아 %d장 git rm (커밋은 사람이 한다)' % (name, len(orph)))
        total += len(orph)
    return total


def canary():
    """🔑 부정검사는 카나리 왕복으로 검증한다 — 게이트가 '검사하고도 못 잡는' 상태를 막는다."""
    print('=== 카나리: 결함을 심어 놓고 게이트가 잡는지 본다 ===')
    tmp = tempfile.mkdtemp(prefix='blogaudit-canary-')
    repo = os.path.join(tmp, 'fake-blog')
    os.makedirs(os.path.join(repo, 'content', 'posts'))
    os.makedirs(os.path.join(repo, 'public', 'images', 'posts'))
    os.makedirs(os.path.join(repo, 'src'))
    W = lambda p, s: io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    from PIL import Image
    img = os.path.join(repo, 'public', 'images', 'posts')
    Image.new('RGB', (32, 32), (10, 20, 30)).save(os.path.join(img, 'a-thumb.webp'))
    Image.new('RGB', (32, 32), (10, 20, 30)).save(os.path.join(img, 'b-thumb.webp'))   # a 와 픽셀 동일
    Image.new('RGB', (32, 32), (99, 88, 77)).save(os.path.join(img, 'orphan-thumb.webp'))  # 고아
    W(os.path.join(repo, 'content', 'posts', 'a.mdx'),
      '---\nslug: a\ntitle: "🚀 0원 완벽 가이드"\nimage: /images/posts/a-thumb.webp\nkeywords:\n  primary: 같은키워드\n---\n\n'
      '![x](/images/posts/a-thumb.webp)\n![gone](/images/posts/missing.webp)\n잠깐 — 다시 계산해 보자.\n')
    W(os.path.join(repo, 'content', 'posts', 'b.mdx'),
      '---\nslug: b\ntitle: "정상 제목"\nimage: /images/posts/b-thumb.webp\nkeywords:\n  primary: 같은 키워드\n---\n\n'
      '![y](/images/posts/b-thumb.webp)\n보건복지부 고시 제2025-XXX호.\n')
    W(os.path.join(repo, 'src', 'page.tsx'),
      'export function m(post){return {openGraph:{images:[{url: post.frontmatter.image, width: 1200, height: 630}]}}}\n')

    global BASE
    old = BASE
    BASE = tmp
    try:
        res = audit(['fake-blog'])
    finally:
        BASE = old
    got = {c[0]: c[3] for c in res.checks}
    expect = {
        'orphan': 1, 'broken-ref': 1, 'pixel-dup': 1, 'thumb-missing': 0,
        'self-cannibal': 1, 'placeholder': 1, 'draft-artifact': 1,
        'og-hardcode': 1, 'spam-title(warn)': 1,
    }
    ok = True
    for k, want in expect.items():
        g = got.get(k)
        mark = '✅' if g == want else '🔴'
        if g != want:
            ok = False
        print('  %s %-18s 기대 %s · 실제 %s' % (mark, k, want, g))
    shutil.rmtree(tmp, ignore_errors=True)
    print('카나리 %s' % ('전건 통과' if ok else '실패 — 게이트를 고쳐라'))
    return 0 if ok else 2


def main():
    args = [a for a in sys.argv[1:]]
    fast = '--fast' in args
    do_fix = '--fix-orphans' in args
    as_json = '--json' in args
    if '--canary' in args:
        sys.exit(canary())
    targets = [a for a in args if not a.startswith('--')] or REPOS
    bad = [t for t in targets if t not in REPOS]
    if bad:
        print('알 수 없는 레포: %s' % bad)
        sys.exit(2)
    if do_fix:
        fix_orphans(targets)
        print()
    res = audit(targets, fast=fast)
    if as_json:
        print(json.dumps([{'check': c[0], 'repo': c[1], 'checked': c[2], 'violations': c[3], 'detail': c[4]}
                          for c in res.checks], ensure_ascii=False, indent=1))
    hard, notchecked = report(res)
    print()
    if notchecked:
        print('🔴 결과: 검사불가 %d건 — exit 2' % notchecked)
        sys.exit(2)
    if hard:
        print('🔴 결과: 위반 %d건 — exit 1' % hard)
        sys.exit(1)
    print('✅ 결과: 전 항목 통과 (spam-title 은 경고이며 종료코드에 반영하지 않는다)')
    sys.exit(0)


if __name__ == '__main__':
    main()
