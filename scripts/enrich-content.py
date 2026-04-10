#!/usr/bin/env python3
"""saju-blog thin content 보강 스크립트"""
import glob, os, re, random, hashlib

random.seed(2026)

emoji_map = {
    "쥐": "🐭", "소": "🐂", "호랑이": "🐯", "토끼": "🐰",
    "용": "🐉", "뱀": "🐍", "말": "🐴", "양": "🐑",
    "원숭이": "🐵", "닭": "🐔", "개": "🐶", "돼지": "🐷",
}

zodiac_traits = {
    "쥐": ("지혜롭고 사교적인", "영리함과 적응력으로 어떤 환경에서도 살아남는 능력이 있어요. 계획을 세우는 걸 좋아하고 재물을 모으는 데도 소질이 있어요."),
    "소": ("성실하고 인내심 강한", "묵묵히 자기 일을 해내는 타입이에요. 신뢰감이 높고 한번 시작한 일은 끝까지 해내요. 다만 고집이 세서 유연성을 기르면 더 좋아요."),
    "호랑이": ("용감하고 리더십 있는", "카리스마가 넘치고 도전을 두려워하지 않아요. 정의감이 강해서 불의를 보면 참지 못하는 타입이에요."),
    "토끼": ("온화하고 감수성 풍부한", "세련된 취향을 가지고 있고 대인관계가 원만해요. 갈등을 싫어해서 평화로운 환경에서 능력을 발휘해요."),
    "용": ("카리스마 있고 야심찬", "큰 꿈을 품고 있고 주변에 영향력을 행사해요. 자존심이 강하고 완벽을 추구하는 경향이 있어요."),
    "뱀": ("지혜롭고 직관적인", "분석력이 뛰어나고 상황 판단이 빨라요. 내면의 세계가 깊어서 겉으로 드러내지 않는 매력이 있어요."),
    "말": ("활동적이고 자유로운", "에너지가 넘치고 모험을 좋아해요. 구속을 싫어하지만 한번 빠지면 열정적으로 몰입하는 스타일이에요."),
    "양": ("따뜻하고 예술적인", "감성이 풍부하고 주변 사람을 잘 챙겨요. 창의적인 분야에서 재능을 발휘하고 평화를 사랑해요."),
    "원숭이": ("재치 있고 영리한", "상황 대처 능력이 뛰어나고 유머 감각이 있어요. 다재다능해서 여러 분야에 관심을 가져요."),
    "닭": ("꼼꼼하고 성실한", "완벽주의적 성향이 있고 정리정돈을 잘해요. 약속을 철저히 지키고 책임감이 강해요."),
    "개": ("충직하고 정의로운", "한번 맺은 인연을 소중히 여기고 거짓을 싫어해요. 보호 본능이 강해서 가까운 사람을 지키려는 성향이 있어요."),
    "돼지": ("관대하고 낙천적인", "넉넉한 마음을 가지고 있고 물질적 풍요를 추구해요. 사교적이고 주변에 사람이 많이 모여요."),
}

compat_extras = [
    "### 데이트 추천 장소\n\n두 띠의 에너지를 살리려면 자연 속에서 함께하는 활동이 좋아요. 산책, 카페 탐방, 전시회 관람 같은 편안한 데이트를 추천해요.\n\n격한 운동보다는 대화를 나눌 수 있는 장소가 두 분의 관계를 더 깊게 만들어 줄 거예요.",
    "### 갈등 해결 꿀팁\n\n의견이 다를 때는 바로 대화하세요. 시간이 지나면 오해가 커지거든요.\n\n나는 이렇게 느꼈어 라는 I-message를 사용하면 상대방이 방어적으로 나오지 않아요. 비난보다 감정 표현이 관계에 훨씬 도움이 돼요.",
    "### 함께 성장하는 방법\n\n같은 취미를 찾아보세요. 함께하는 활동이 없으면 관계가 정체될 수 있거든요.\n\n요리 수업, 운동, 여행 계획 세우기 같은 공동 프로젝트가 두 사람의 유대감을 강화해 줘요.",
    "### 서로에게 해주면 좋은 말\n\n칭찬은 관계의 윤활유예요. 매일 한 가지씩 상대방의 좋은 점을 말해주세요.\n\n오늘 고생했어, 네 덕분이야 같은 간단한 말이 관계를 완전히 바꿀 수 있어요.",
]

def insert_before_marker(body, extra, markers=None):
    if markers is None:
        markers = ["## 관련 글 더 보기", "## 마무리"]
    for marker in markers:
        if marker in body:
            return body.replace(marker, extra + marker, 1)
    return body + extra

# === 1. 궁합 144개 보강 ===
compat_files = glob.glob("content/posts/2026-04-10-*-zodiac-compatibility-guide.mdx")
compat_updated = 0
for f in compat_files:
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()
    parts = content.split("---", 2)
    if len(parts) < 3 or "심층 성격 분석" in parts[2]:
        continue
    body = parts[2]
    title_m = re.search(r'title:\s*"(.+)"', content)
    if not title_m:
        continue
    title = title_m.group(1)
    animals = [a for a in emoji_map if a in title]
    if len(animals) < 1:
        continue
    a, b = animals[0], animals[-1]
    a_adj, a_desc = zodiac_traits.get(a, ("",""))
    b_adj, b_desc = zodiac_traits.get(b, ("",""))
    seed = int(hashlib.md5(f.encode()).hexdigest()[:8], 16)
    extra = f"""

### {emoji_map.get(a,'')}{a}띠의 심층 성격 분석

{a}띠는 {a_adj} 성격이에요. {a_desc}

연애에서는 진심을 담아 표현하는 스타일이에요. 상대방의 작은 변화도 놓치지 않고 챙기는 세심함이 있어요. 다만 자기 기준이 뚜렷해서 상대방이 부담을 느낄 수도 있거든요.

### {emoji_map.get(b,'')}{b}띠의 심층 성격 분석

{b}띠는 {b_adj} 성격이에요. {b_desc}

연애에서는 상대방을 편하게 만드는 능력이 있어요. 자연스러운 매력으로 사람을 끌어당기지만 속마음을 잘 드러내지 않는 편이에요.

### 두 띠의 시너지 포인트

{emoji_map.get(a,'')}{a}띠의 에너지와 {emoji_map.get(b,'')}{b}띠의 에너지가 만나면 서로의 부족한 부분을 채워줄 수 있어요.

핵심은 서로의 역할을 존중하는 거예요. 누가 더 잘하고 못하고가 아니라 다름을 인정하면 최고의 팀이 될 수 있어요.

{compat_extras[seed % len(compat_extras)]}

### 2026년 두 띠의 궁합 흐름

2026년 병오년에는 두 띠 모두 변화의 기운이 강해요. 상반기에는 서로의 생각 차이가 두드러질 수 있지만 그걸 대화로 풀어가면 하반기에는 더 단단한 관계가 돼요. 특히 5~6월에 함께하는 여행이나 프로젝트가 관계의 전환점이 될 수 있어요.

"""
    body = insert_before_marker(body, extra)
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(parts[0] + "---" + parts[1] + "---" + body)
    compat_updated += 1
print(f"궁합 보강: {compat_updated}개")

# === 2. 일주론 32개 보강 ===
ilju_extra = """

### 일상에서의 실생활 활용 팁

사주를 아는 것만으로는 부족해요. 실제로 활용해야 의미가 있거든요.

자신의 오행에 맞는 색상을 일상에 활용해보세요. 지갑 색상, 인테리어 포인트, 옷 색상에 반영하면 기운을 보강할 수 있어요.

중요한 결정을 내릴 때는 자신의 일주 성격을 참고하세요. 추진력이 강한 일주라면 빠른 결정이 맞고, 신중한 일주라면 충분히 고민하는 게 맞아요.

### 일주와 직업 적성 심화 분석

자신의 천간과 지지 조합에 따라 적합한 업종이 달라져요.

양의 기운이 강한 일주는 리더십을 발휘할 수 있는 경영, 영업, 교육 분야가 좋아요. 음의 기운이 강한 일주는 기획, 연구, 예술 같은 내면 작업에 적합해요.

물론 사주는 경향성이지 절대 법칙이 아니에요. 자신이 좋아하는 일이 가장 좋은 일이라는 건 변하지 않아요.

### 건강 관리 포인트

오행의 균형이 건강에도 영향을 미쳐요. 부족한 오행에 해당하는 장기를 특별히 관리하면 좋아요.

목이 부족하면 간과 눈 관리, 화가 부족하면 심장과 혈관, 토가 부족하면 위장, 금이 부족하면 폐와 호흡기, 수가 부족하면 신장과 방광을 챙기세요.

규칙적인 운동과 균형 잡힌 식단이 사주보다 중요한 건강의 기본이에요.

"""
ilju_files = glob.glob("content/posts/2026-04-10-*-ilju-*.mdx")
ilju_updated = 0
for f in ilju_files:
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()
    parts = content.split("---", 2)
    if len(parts) < 3 or "실생활 활용 팁" in parts[2]:
        continue
    body = insert_before_marker(parts[2], ilju_extra)
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(parts[0] + "---" + parts[1] + "---" + body)
    ilju_updated += 1
print(f"일주론 보강: {ilju_updated}개")

# === 3. 타로 22개 보강 ===
tarot_extra = """

### 스프레드에서의 위치별 해석

같은 카드라도 스프레드 위치에 따라 의미가 달라져요.

과거 위치에 나오면 지나간 경험이나 영향을 나타내요. 현재 위치에 나오면 지금 가장 강하게 작용하는 에너지예요. 미래 위치에 나오면 다가올 에너지의 방향을 보여줘요.

조언 위치에 나오면 카드가 주는 핵심 메시지예요. 지금 가장 필요한 행동이나 마음가짐을 알려주는 거예요.

### 타로 리딩 실전 팁

카드를 뽑기 전에 질문을 명확하게 정리하세요. 어떻게 하면 좋을까보다 이 상황에서 내가 집중해야 할 것은 무엇일까가 더 좋은 질문이에요.

카드의 그림을 먼저 직관적으로 느껴보세요. 머리로 해석하기 전에 가슴으로 느끼는 첫인상이 가장 정확한 경우가 많거든요.

한 번 뽑은 카드에 만족하지 못한다고 다시 뽑지 마세요. 처음 나온 카드가 가장 정확한 답이에요.

"""
tarot_files = glob.glob("content/posts/2026-04-10-tarot-*-card-meaning-guide.mdx")
tarot_updated = 0
for f in tarot_files:
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()
    parts = content.split("---", 2)
    if len(parts) < 3 or "스프레드에서의 위치별" in parts[2]:
        continue
    body = insert_before_marker(parts[2], tarot_extra)
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(parts[0] + "---" + parts[1] + "---" + body)
    tarot_updated += 1
print(f"타로 보강: {tarot_updated}개")

# === 4. 월별운세 24개 보강 ===
fortune_extra = """

### 재물운 올리는 실천법

이번 달 재물운을 최대한 활용하려면 작은 습관부터 바꿔보세요.

매일 가계부를 적어보세요. 지출을 의식하는 것만으로도 불필요한 소비가 줄어요. 앱을 써도 좋고 메모장에 적어도 충분해요.

투자는 소액부터 시작하세요. 큰 금액을 한번에 넣기보다 매일 1,000원씩 적립하는 습관이 장기적으로 더 큰 재물을 만들어 줘요.

### 연애운 활성화 방법

솔로라면 새로운 환경에 나가보세요. 같은 일상에서는 새로운 인연이 오기 어렵거든요. 동호회, 스터디, 봉사활동처럼 공통 관심사를 가진 모임이 좋은 만남의 장소예요.

커플이라면 일상에 작은 변화를 주세요. 새로운 레스토랑 가보기, 함께 요리하기, 서로에게 손편지 쓰기 같은 소소한 이벤트가 관계에 활력을 불어넣어요.

### 건강 체크리스트

이번 달 건강을 지키기 위한 매일 체크리스트예요.

물 1.5L 이상 마시기, 30분 이상 걷기, 7시간 이상 수면, 과일이나 채소 한 접시 먹기, 5분 이상 스트레칭하기.

전부 할 필요 없어요. 매일 3개 이상만 지켜도 한 달 후에 달라진 몸 상태를 느낄 수 있어요.

"""
fortune_files = glob.glob("content/posts/2026-04-10-2026-*-tti-fortune-guide.mdx")
fortune_updated = 0
for f in fortune_files:
    with open(f, "r", encoding="utf-8") as fh:
        content = fh.read()
    parts = content.split("---", 2)
    if len(parts) < 3 or "재물운 올리는 실천법" in parts[2]:
        continue
    body = insert_before_marker(parts[2], fortune_extra)
    with open(f, "w", encoding="utf-8") as fh:
        fh.write(parts[0] + "---" + parts[1] + "---" + body)
    fortune_updated += 1
print(f"월별운세 보강: {fortune_updated}개")

total = compat_updated + ilju_updated + tarot_updated + fortune_updated
print(f"\n=== 총 보강: {total}개 ===")
