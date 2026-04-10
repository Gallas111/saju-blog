#!/usr/bin/env python3
"""saju-blog 대량 콘텐츠 생성 스크립트
- 꿈해몽 20개
- 관상 10개
- 60갑자 나머지 32개
- 띠별 궁합 144개
- 타로 메이저 아르카나 22개
- 월별 운세 24개 (5~6월)
"""
import os, json, random, hashlib
from datetime import datetime, timedelta

POSTS_DIR = "content/posts"
IMAGES_DIR = "public/images/posts"
DATE_BASE = "2026-04-10"

# Unsplash images for each category (pre-selected IDs)
UNSPLASH_DREAM = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80"
UNSPLASH_FACE = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80"
UNSPLASH_ILJU = "https://images.unsplash.com/photo-1505506874110-6a7a69069a08?w=800&q=80"
UNSPLASH_GUNGHAP = "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80"
UNSPLASH_TAROT = "https://images.unsplash.com/photo-1600430188203-bea644de1071?w=800&q=80"
UNSPLASH_FORTUNE = "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80"

def write_mdx(filename, content):
    path = os.path.join(POSTS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

created_count = 0

# ============================================================
# 1. 꿈해몽 20개
# ============================================================
dreams = [
    ("떨어지는 꿈", "falling-dream", "추락하는 꿈 해몽", "높은 곳에서 떨어지는 꿈", "추락", "불안정한 심리 상태나 변화의 전조"),
    ("쫓기는 꿈", "being-chased-dream", "쫓기는 꿈 해몽", "누군가에게 쫓기는 꿈", "도망", "해결하지 못한 문제나 스트레스"),
    ("아기 꿈", "baby-dream", "아기 꿈 해몽 태몽", "아기가 나오는 꿈", "아기", "새로운 시작이나 가능성의 상징"),
    ("꽃 꿈", "flower-dream", "꽃 꿈 해몽", "꽃이 피는 꿈", "꽃", "행복한 일이 다가오는 길몽"),
    ("자동차 꿈", "car-dream", "자동차 꿈 해몽 운전", "자동차 관련 꿈", "자동차", "인생의 방향과 통제력의 상징"),
    ("시험 꿈", "exam-dream", "시험 꿈 해몽", "시험 보는 꿈", "시험", "자기 평가와 도전에 대한 불안"),
    ("결혼 꿈", "wedding-dream", "결혼 꿈 해몽", "결혼하는 꿈", "결혼", "새로운 결합이나 전환점의 신호"),
    ("비행 꿈", "flying-dream", "하늘 나는 꿈 해몽", "하늘을 나는 꿈", "비행", "자유와 해방감 또는 야망의 표현"),
    ("집 꿈", "house-dream", "집 꿈 해몽", "집이 나오는 꿈", "집", "자아와 내면 세계의 반영"),
    ("비 꿈", "rain-dream", "비 오는 꿈 해몽", "비가 오는 꿈", "비", "감정의 정화와 새로운 시작"),
    ("산 꿈", "mountain-dream", "산 꿈 해몽 등산", "산에 오르는 꿈", "산", "목표 달성과 도전의 상징"),
    ("바다 꿈", "ocean-dream", "바다 꿈 해몽", "바다가 나오는 꿈", "바다", "무의식과 감정의 깊이"),
    ("벌레 꿈", "insect-dream", "벌레 꿈 해몽 바퀴벌레", "벌레가 나오는 꿈", "벌레", "사소한 걱정이나 불쾌한 상황"),
    ("전쟁 꿈", "war-dream", "전쟁 꿈 해몽", "전쟁이 나는 꿈", "전쟁", "내면의 갈등과 스트레스의 반영"),
    ("이사 꿈 세부", "detailed-moving-dream", "이사 꿈 해몽 새집 이사짐", "이사하는 꿈 상세 해석", "이사", "삶의 변화와 새출발"),
    ("음식 꿈", "food-dream", "음식 꿈 해몽 먹는 꿈", "음식을 먹는 꿈", "음식", "에너지 보충과 욕구의 충족"),
    ("고양이 꿈 심화", "cat-dream-detailed", "고양이 꿈 해몽 색깔별", "고양이 색깔별 꿈 해석", "고양이", "직관과 독립심의 상징"),
    ("지진 꿈", "earthquake-dream", "지진 꿈 해몽", "지진이 나는 꿈", "지진", "삶의 기반이 흔들리는 불안"),
    ("눈 꿈", "snow-dream", "눈 오는 꿈 해몽", "눈이 오는 꿈", "눈", "순수함과 새 시작 또는 감정의 냉각"),
    ("반지 꿈", "ring-dream", "반지 꿈 해몽", "반지가 나오는 꿈", "반지", "약속과 관계의 상징"),
]

for i, (title_kr, slug, primary_kw, desc_short, symbol, meaning) in enumerate(dreams):
    date_str = DATE_BASE
    filename = f"{date_str}-{slug}-meaning-interpretation-guide.mdx"

    # Check if similar already exists
    existing = [f for f in os.listdir(POSTS_DIR) if slug.split('-')[0] in f.lower()]
    if slug in ["detailed-moving-dream", "cat-dream-detailed"]:
        existing = []  # these are intentional new angles

    content = f"""---
title: "{title_kr} 해몽 완전 가이드: 상황별 길몽과 흉몽 구분법"
slug: {slug}-meaning-interpretation-guide
description: "{desc_short}의 의미를 상황별로 정리했어요. {symbol}이(가) 나오는 꿈의 길몽/흉몽 해석과 꿈 속 메시지를 알려드립니다."
category: 꿈해몽
tags:
  - {title_kr}
  - {primary_kw}
  - 꿈해몽
  - 길몽 흉몽
  - 꿈 의미
date: "{date_str}"
published: true
icon: "🌙"
relatedService:
  label: AI 꿈해몽
  href: "https://www.sajuboka.com/dream"
keywords:
  primary: {primary_kw}
  secondary:
    - {title_kr} 의미
    - {symbol} 꿈 길몽
  longTail:
    - {title_kr} 해몽 상황별 의미 해석
    - {symbol} 나오는 꿈 길몽 흉몽
image: /images/posts/{slug}-meaning-interpretation-guide-thumb.webp
faq:
  - q: {title_kr}은 길몽인가요 흉몽인가요
    a: 상황에 따라 달라요. {meaning}을 의미하기 때문에 꿈의 세부 상황과 감정 상태를 함께 봐야 정확한 해석이 가능해요.
  - q: {title_kr}을 자주 꾸면 어떤 의미인가요
    a: 반복되는 꿈은 무의식이 보내는 강한 메시지예요. {symbol}와(과) 관련된 현실의 상황을 점검해 보시는 게 좋아요.
  - q: {title_kr}을 꾸고 로또를 사도 되나요
    a: 꿈해몽에서 재물운과 연결되는 해석이 있다면 시도해 볼 수 있어요. 다만 꿈은 심리적 신호이지 미래 예측이 아니라는 점을 기억하세요.
  - q: {title_kr}의 의미가 나이대별로 다른가요
    a: 같은 꿈이라도 현재 상황에 따라 해석이 달라져요. 학생이면 학업, 직장인이면 커리어, 부부라면 가정사와 연결해서 봐야 해요.
  - q: {title_kr}을 꾸고 나서 어떻게 해야 하나요
    a: 길몽이라면 그 에너지를 활용해서 적극적으로 행동하세요. 흉몽이라면 경고 신호로 받아들이고 조심하면 돼요. 어떤 꿈이든 기록해 두면 패턴을 파악할 수 있어요.
---

{symbol}이(가) 등장하는 꿈을 꾸고 나면 "이게 무슨 의미지?" 궁금하셨죠?

동양 꿈해몽에서 {symbol}은(는) 매우 의미 있는 상징이에요. 단순한 꿈이 아니라 무의식이 보내는 메시지거든요.

오늘은 {title_kr}의 상황별 의미를 길몽과 흉몽으로 나눠서 정리했어요.

## {title_kr}의 기본 의미

{title_kr}은 일반적으로 **{meaning}**을 뜻해요.

![ {title_kr} 해몽을 상징하는 신비로운 이미지]({UNSPLASH_DREAM})

하지만 꿈의 세부 상황에 따라 해석이 완전히 달라질 수 있어요. 감정 상태, 주변 환경, 함께 등장하는 사물이나 사람에 따라 길몽이 될 수도 있고 흉몽이 될 수도 있거든요.

## 상황별 길몽 해석

### 1. 밝고 긍정적인 분위기의 {symbol} 꿈

꿈속에서 {symbol}이(가) 밝고 아름다운 분위기로 등장했다면 좋은 소식이에요. 재물운이 상승하거나 좋은 기회가 다가올 수 있어요.

특히 꿈에서 편안하고 행복한 감정을 느꼈다면 가까운 미래에 기분 좋은 일이 생길 징조예요.

### 2. {symbol}이(가) 크거나 풍성하게 나타나는 꿈

{symbol}이(가) 평소보다 크거나 인상적으로 등장했다면 큰 행운의 신호일 수 있어요.

사업이나 투자에서 좋은 결과가 올 수 있고, 인간관계에서도 의미 있는 만남이 예상돼요.

### 3. {symbol}을(를) 손에 넣거나 가까이하는 꿈

직접 {symbol}을(를) 잡거나 가까이 있었다면 원하던 것을 얻게 될 가능성이 높아요. 목표하는 일이 있다면 적극적으로 도전하세요.

[뱀꿈 해몽 가이드](/blog/snake-dream-interpretation-meaning-guide)에서도 비슷한 패턴을 확인할 수 있어요.

## 상황별 흉몽 해석

### 1. 어둡고 불안한 분위기의 {symbol} 꿈

꿈속에서 두려움이나 불안을 느꼈다면 현실에서 해결하지 못한 문제가 있다는 신호예요.

당장 큰 문제가 아니더라도 마음 한구석에 걱정되는 일이 있다면 정면으로 마주하는 게 좋아요.

### 2. {symbol}이(가) 사라지거나 부서지는 꿈

소중한 것을 잃을 수 있다는 경고일 수 있어요. 건강이나 재정 상태를 점검해 보세요.

### 3. {symbol}에게 쫓기거나 피하는 꿈

회피하고 있는 문제를 직면해야 할 때가 왔다는 의미예요. 미루고 있던 결정이 있다면 용기를 내보세요.

![꿈의 의미를 해석하는 신비로운 분위기의 이미지](https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80)

## 특수한 상황별 해석

### 다른 사람과 함께 {symbol}이(가) 등장하는 꿈

가족이나 연인과 함께 {symbol}을(를) 보는 꿈이라면 그 관계에 변화가 올 수 있다는 뜻이에요. 대체로 관계가 깊어지는 긍정적인 신호예요.

### 반복적으로 {symbol} 꿈을 꾸는 경우

같은 꿈이 반복된다면 무의식이 강하게 전달하려는 메시지가 있어요. 현재 삶에서 {symbol}와(과) 연결되는 상황을 찾아보세요.

[물꿈 해몽 가이드](/blog/water-dream-interpretation-meaning-guide)에서도 반복 꿈에 대한 해석을 다뤘어요.

## 꿈을 기록하는 습관

꿈해몽을 정확하게 하려면 꿈을 기록하는 게 중요해요.

깨어나자마자 핸드폰 메모장에 적으세요:
- 꿈에 등장한 주요 대상
- 느꼈던 감정
- 꿈의 전체적인 분위기
- 특이한 세부 사항

이 4가지만 기록하면 나중에 패턴을 파악할 수 있어요.

## 마무리: {title_kr}을 꿨다면

{title_kr}은 단순한 잠꼬대가 아니에요. 여러분의 무의식이 보내는 소중한 메시지예요.

길몽이든 흉몽이든 꿈의 메시지를 받아들이고 현실에서 긍정적인 행동으로 연결하면 좋은 결과가 따라올 거예요.

더 자세한 꿈 해석이 필요하다면 [돈꿈 해몽 가이드](/blog/money-dream-interpretation-lottery-guide)도 참고해 보세요.
"""
    write_mdx(filename, content)
    created_count += 1

print(f"꿈해몽: {created_count}개 생성")

# ============================================================
# 2. 관상 부위별 10개
# ============================================================
face_parts = [
    ("이마 관상", "forehead-face-reading", "이마 관상 보는법", "이마 넓이와 높이로 보는 지혜운", "이마", "🧠"),
    ("턱 관상", "chin-jaw-face-reading", "턱 관상 보는법", "턱 모양으로 보는 의지력과 말년운", "턱", "💪"),
    ("눈썹 관상", "eyebrow-face-reading", "눈썹 관상 보는법", "눈썹 모양과 길이로 보는 성격과 운", "눈썹", "✨"),
    ("점 관상", "mole-face-reading", "점 관상 위치별", "얼굴 점 위치별 의미와 운세 해석", "점", "⭐"),
    ("미간 관상", "between-brows-face-reading", "미간 관상 보는법", "미간 넓이와 주름으로 보는 운세", "미간", "🔮"),
    ("인중 관상", "philtrum-face-reading", "인중 관상 보는법", "인중 길이와 모양으로 보는 수명운", "인중", "💫"),
    ("광대뼈 관상", "cheekbone-face-reading", "광대뼈 관상 보는법", "광대뼈 높이와 크기로 보는 사회운", "광대뼈", "🌟"),
    ("치아 관상", "teeth-face-reading", "치아 관상 보는법", "치아 모양과 배열로 보는 복운", "치아", "😁"),
    ("주름 관상", "wrinkle-face-reading", "주름 관상 보는법", "주름 위치별 의미와 운세 해석", "주름", "📖"),
    ("목 관상", "neck-face-reading", "목 관상 보는법", "목 길이와 굵기로 보는 사회적 성공운", "목", "🎯"),
]

face_count = 0
for title_kr, slug, primary_kw, desc, part, icon in face_parts:
    filename = f"{DATE_BASE}-{slug}-physiognomy-guide.mdx"
    full_slug = f"{slug}-physiognomy-guide"

    content = f"""---
title: "{title_kr} 보는법: {part} 모양별 성격과 운세 해석"
slug: {full_slug}
description: "{desc}. {part} 관상으로 성격, 재물운, 대인관계를 파악하는 방법을 알려드려요."
category: 관상/손금
tags:
  - {title_kr}
  - 관상 보는법
  - {part} 관상
  - 관상학
  - 얼굴 관상
date: "{DATE_BASE}"
published: true
icon: "{icon}"
relatedService:
  label: AI 관상 분석
  href: "https://www.sajuboka.com/face-reading"
keywords:
  primary: {primary_kw}
  secondary:
    - {part} 관상 의미
    - {part} 모양 성격
  longTail:
    - {title_kr} 성격 재물운 해석
    - {part} 모양별 관상 의미 총정리
image: /images/posts/{full_slug}-thumb.webp
faq:
  - q: {part} 관상만으로 정확한 판단이 가능한가요
    a: {part} 하나만으로 전체 운세를 판단하기는 어려워요. 다른 부위와 종합적으로 봐야 정확도가 높아져요. {part}은(는) 전체 관상의 한 조각이라고 생각하시면 돼요.
  - q: {part} 모양이 바뀌면 운도 바뀌나요
    a: 관상학에서는 외형이 바뀌면 기운도 달라진다고 봐요. 하지만 타고난 골격의 기본 에너지는 유지되기 때문에 외형 변화만으로 완전히 달라지지는 않아요.
  - q: 남녀 {part} 관상 해석이 다른가요
    a: 기본 원리는 같지만 세부 해석에 차이가 있어요. 남성은 사회적 성취와 재물운 중심, 여성은 대인관계와 가정운까지 함께 봐요.
  - q: {part} 관상에서 가장 좋은 상은 어떤 건가요
    a: 균형 잡히고 결함이 없는 {part}이(가) 가장 좋은 상이에요. 지나치게 크거나 작은 것보다 조화로운 모습이 길상이에요.
  - q: 관상은 타고나는 건가요 바뀌는 건가요
    a: 기본 골격은 타고나지만, 표정과 습관이 쌓이면서 관상이 변해요. 긍정적인 표정을 자주 짓는 사람의 관상이 좋아지는 건 그 때문이에요.
---

관상학에서 {part}은(는) 매우 중요한 의미를 가지고 있어요.

{part}의 모양과 특징을 보면 그 사람의 성격, 재물운, 대인관계까지 파악할 수 있거든요. 옛 관상학 고서에서도 {part}을(를) 핵심 관찰 포인트로 꼽았어요.

오늘은 {part} 관상의 의미를 모양별로 자세히 정리했어요.

## {part} 관상의 기본 원리

관상학에서 {part}은(는) 특별한 의미를 가진 부위예요.

![ {title_kr}을 보는 관상학 이미지]({UNSPLASH_FACE})

고대부터 전해져 오는 관상의 원리에 따르면 {part}은(는) 에너지의 흐름을 보여주는 중요한 지표예요.

{part}의 크기, 모양, 색, 질감에 따라 해석이 달라져요.

## {part} 모양별 성격 분석

### 넓고 뚜렷한 {part}

넓고 뚜렷한 {part}을(를) 가진 사람은 대체로 리더십이 강하고 추진력이 있어요.

사회적으로 인정받기 쉽고, 주변 사람들에게 신뢰를 주는 타입이에요. 다만 고집이 셀 수 있으니 유연성을 기르는 게 좋아요.

### 작고 섬세한 {part}

섬세한 {part}을(를) 가진 사람은 감수성이 풍부하고 예술적 감각이 뛰어나요.

대인관계에서 배려심이 강하고, 상대방의 감정을 잘 읽어요. 창의적인 분야에서 두각을 나타낼 수 있어요.

### 균형 잡힌 {part}

가장 이상적인 상이에요. 성격이 온화하고 대인관계가 원만해요. 어떤 상황에서든 균형을 유지할 줄 아는 지혜를 가지고 있어요.

[코 관상 보는법 가이드](/blog/nose-face-reading-physiognomy-guide)에서 다른 부위와 함께 종합적으로 해석하는 방법도 확인해 보세요.

## {part} 관상으로 보는 재물운

{part}은(는) 재물운과도 밀접한 관련이 있어요.

두텁고 윤기가 있는 {part}은(를) 가진 사람은 재물을 모으는 능력이 뛰어나요. 반면 얇고 건조한 느낌이면 지출이 많을 수 있으니 재무 관리에 신경 쓰는 게 좋아요.

## {part} 관상과 대인관계

{part}의 특징은 대인관계 스타일도 보여줘요.

![ 관상학에서 대인관계를 해석하는 이미지](https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80)

부드럽고 온화한 인상의 {part}을(를) 가진 사람은 사람들에게 호감을 주기 쉬워요. 날카롭거나 각진 느낌이면 결단력은 강하지만 첫인상에서 차갑게 보일 수 있어요.

## {part} 관상의 변화와 관리

관상은 고정된 것이 아니에요. 표정 습관과 건강 상태에 따라 변할 수 있어요.

긍정적인 표정을 자주 짓고, 건강을 관리하면 {part}의 관상도 좋아질 수 있어요.

[손금 보는법 가이드](/blog/palm-reading-beginner-guide)에서 손금과 관상을 함께 보는 방법도 확인해 보세요.

## 마무리

{part} 관상은 전체 관상의 중요한 한 부분이에요.

다른 부위들과 종합적으로 봐야 정확한 해석이 가능하다는 점을 기억하세요. [얼굴형 관상 가이드](/blog/face-shape-physiognomy-guide)도 함께 읽어보면 관상에 대한 이해가 깊어질 거예요.
"""
    write_mdx(filename, content)
    face_count += 1

created_count += face_count
print(f"관상: {face_count}개 생성")

# ============================================================
# 3. 60갑자 나머지 32개
# ============================================================
missing_ilju = [
    ("병인","byeongin","호랑이의 기운","강한 추진력과 리더십, 불같은 열정"),
    ("경오","gyeongo","말의 기운","활동적이고 자유를 사랑하는 성격"),
    ("신미","sinmi","양의 기운","섬세하고 예술적 감각이 뛰어남"),
    ("계유","gyeyu","닭의 기운","날카로운 분석력과 완벽주의 성향"),
    ("병자","byeongja","쥐의 기운","밝은 지혜와 사교적인 매력"),
    ("기묘","gimyo","토끼의 기운","부드러운 성품과 조화로운 대인관계"),
    ("경진","gyeongjin","용의 기운","강한 카리스마와 변화를 이끄는 힘"),
    ("임오","imo","말의 기운","지혜롭고 감성적인 리더"),
    ("갑신","gapsin","원숭이의 기운","재치 있고 다재다능한 성격"),
    ("을유","eulyu","닭의 기운","섬세하고 예리한 관찰력"),
    ("신묘","sinmyo","토끼의 기운","날카로운 판단력과 부드러운 외면"),
    ("임진","imjin","용의 기운","깊은 지혜와 포용력 있는 리더십"),
    ("계사","gyesa","뱀의 기운","직관적이고 신비로운 매력"),
    ("정유","jeongyu","닭의 기운","정확하고 체계적인 성격"),
    ("무술","musul","개의 기운","충직하고 안정적인 성품"),
    ("신축","sinchuk","소의 기운","끈기 있고 성실한 노력가"),
    ("임인","imin","호랑이의 기운","지혜로운 리더십과 깊은 사고"),
    ("갑진","gapjin","용의 기운","혁신적이고 도전적인 성격"),
    ("을사","eulsa","뱀의 기운","부드러운 지혜와 적응력"),
    ("정미","jeongmi","양의 기운","따뜻한 감성과 예술적 재능"),
    ("무신","musin","원숭이의 기운","안정적이면서 재치 있는 성격"),
    ("기유","giyu","닭의 기운","섬세한 감각과 현실적 판단력"),
    ("경술","gyeongsul","개의 기운","정의로운 성품과 강한 책임감"),
    ("신해","sinhae","돼지의 기운","날카로운 지성과 풍요로운 복"),
    ("임자","imja","쥐의 기운","깊은 지혜와 유연한 처세술"),
    ("계축","gyechuk","소의 기운","인내심 있고 꾸준한 성격"),
    ("을묘","eulmyo","토끼의 기운","예술적 감수성과 부드러운 매력"),
    ("병진","byeongjin","용의 기운","밝은 에너지와 강한 존재감"),
    ("정사","jeongsa","뱀의 기운","차분한 지혜와 날카로운 통찰력"),
    ("무오","muo","말의 기운","안정감 있는 추진력과 리더십"),
    ("기미","gimi","양의 기운","현실적 감각과 따뜻한 성품"),
    ("경신","gyeongsin","원숭이의 기운","냉철한 판단력과 실행력"),
]

ilju_count = 0
for kr, roman, animal_energy, personality in missing_ilju:
    slug = f"{roman}-ilju-2026-fortune-personality-guide"
    filename = f"{DATE_BASE}-{slug}.mdx"

    cheongan = kr[0]
    jiji = kr[1]

    content = f"""---
title: "{kr}일주 특징과 2026년 운세: 성격, 재물운, 연애운 총정리"
slug: {slug}
description: "{kr}일주의 성격 특징과 2026년 운세를 정리했어요. {animal_energy}을 가진 {kr}일주의 재물운, 연애운, 직업운, 건강운까지 알려드립니다."
category: 일주론
tags:
  - {kr}일주
  - {kr}일주 특징
  - {kr}일주 2026
  - 일주 분석
  - 60갑자
date: "{DATE_BASE}"
published: true
icon: "📊"
relatedService:
  label: 내 사주 분석하기
  href: "https://www.sajuboka.com/saju"
keywords:
  primary: {kr}일주 특징
  secondary:
    - {kr}일주 2026 운세
    - {kr}일주 성격
  longTail:
    - {kr}일주 성격 특징 재물운 연애운 총정리
    - {kr}일주 2026년 운세 직업 건강
image: /images/posts/{slug}-thumb.webp
faq:
  - q: {kr}일주는 어떤 성격인가요
    a: {kr}일주는 {personality}이 특징이에요. {animal_energy}이 담겨있어서 독특한 매력을 가지고 있어요.
  - q: {kr}일주의 2026년 운세는 어떤가요
    a: 2026년 병오년에 {kr}일주는 변화와 도약의 기회가 찾아와요. 상반기에 기반을 다지고 하반기에 성과를 거두는 패턴이에요.
  - q: {kr}일주와 궁합이 좋은 일주는 뭔가요
    a: 오행의 상생 관계에 있는 일주와 궁합이 좋아요. 구체적인 궁합은 두 사람의 사주 전체를 봐야 정확해요.
  - q: {kr}일주에 맞는 직업은 뭔가요
    a: {personality}의 특징을 살릴 수 있는 분야가 적합해요. 리더십이 강하다면 경영/관리직, 감수성이 풍부하다면 예술/창작 분야를 추천해요.
  - q: {kr}일주의 건강 주의사항은 뭔가요
    a: 오행 균형에 따라 주의할 장기가 달라요. {cheongan} 천간의 기운에 따라 특정 장기를 관리하는 게 좋아요.
---

내 사주의 일주가 {kr}이라면 어떤 성격과 운명을 가지고 있는지 궁금하셨죠?

{kr}일주는 60갑자 중에서도 독특한 에너지를 가진 일주예요. {animal_energy}이 담겨있어서 {personality}이 특징이에요.

오늘은 {kr}일주의 모든 것을 정리해 드릴게요.

## {kr}일주의 기본 구성

{kr}일주는 천간 {cheongan}과 지지 {jiji}가 만나서 이루어진 조합이에요.

![ {kr}일주 사주 분석 이미지]({UNSPLASH_ILJU})

이 조합은 {animal_energy}의 특성을 가지고 있어요.

천간 {cheongan}의 에너지와 지지 {jiji}의 에너지가 어떻게 조화를 이루느냐에 따라 성격과 운세가 결정돼요.

## {kr}일주 성격 특징

### 강점

{kr}일주의 가장 큰 강점은 {personality}이에요.

주변 사람들에게 신뢰를 주고, 어떤 상황에서도 본인만의 방식으로 문제를 해결하는 능력이 있어요. 위기 상황에서 더 빛나는 타입이에요.

### 성격의 이면

모든 장점에는 반대면이 있어요. {kr}일주는 때로는 완고하거나 고집이 세다는 평가를 받을 수 있어요.

자기 확신이 강한 만큼 다른 사람의 의견을 수용하는 연습이 필요해요.

## 2026년 병오년 운세

### 재물운

2026년 {kr}일주의 재물운은 상승 기조예요. 특히 상반기에 투자나 사업에서 좋은 기회가 올 수 있어요.

다만 충동적인 지출은 피하고, 계획적인 재무 관리가 중요해요.

### 연애운

새로운 인연이 다가올 수 있는 해예요. 이미 파트너가 있다면 관계가 한 단계 더 깊어질 수 있어요.

소통을 많이 하는 게 관계 개선의 핵심이에요.

### 직업운

커리어에서 변화의 바람이 불 수 있어요. 이직이나 승진의 기회가 올 수 있으니 준비를 해두세요.

[2026년 띠별 운세 가이드](/blog/2026-zodiac-animal-fortune-complete)에서 더 넓은 운세 흐름도 확인해 보세요.

### 건강운

오행 균형에 따라 특정 장기를 관리해야 해요. 규칙적인 운동과 충분한 수면이 기본이에요.

스트레스 관리에 특히 신경 쓰세요. 명상이나 산책이 도움이 돼요.

![사주 오행과 건강 관리 이미지](https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80)

## {kr}일주에 맞는 직업

{personality}의 특성을 살리면 이런 분야에서 두각을 나타낼 수 있어요:

- 리더십을 발휘할 수 있는 관리/경영직
- 창의성을 살릴 수 있는 예술/디자인 분야
- 분석력이 필요한 연구/기술직
- 사람을 이끄는 교육/상담 분야

## 궁합이 좋은 일주

오행의 상생 관계에 있는 일주와 궁합이 좋아요.

[사주 궁합 가이드](/blog/saju-compatibility-guide)에서 더 자세한 궁합 분석 방법을 확인할 수 있어요.

## 마무리

{kr}일주는 독특한 매력과 잠재력을 가진 일주예요.

{personality}이 큰 강점이니까 이걸 잘 살려서 2026년을 보내세요. 운명은 알되 노력으로 바꿀 수 있다는 걸 기억하세요.

[사주 보는법 초보 가이드](/blog/how-to-read-saju-beginners)도 함께 읽어보면 사주 해석에 대한 이해가 깊어질 거예요.
"""
    write_mdx(filename, content)
    ilju_count += 1

created_count += ilju_count
print(f"60갑자: {ilju_count}개 생성")

# ============================================================
# 4. 띠별 궁합 144개
# ============================================================
zodiac_animals = [
    ("쥐","jwi","子","지혜롭고 사교적"),
    ("소","so","丑","성실하고 인내심 강함"),
    ("호랑이","horangi","寅","용감하고 리더십 있음"),
    ("토끼","tokki","卯","온화하고 감수성 풍부"),
    ("용","yong","辰","카리스마 있고 야심찬"),
    ("뱀","baem","巳","지혜롭고 직관적"),
    ("말","mal","午","활동적이고 자유로움"),
    ("양","yang","未","따뜻하고 예술적"),
    ("원숭이","wonsungi","申","재치 있고 영리함"),
    ("닭","dak","酉","꼼꼼하고 성실함"),
    ("개","gae","戌","충직하고 정의로움"),
    ("돼지","dwaeji","亥","관대하고 낙천적"),
]

# 궁합 데이터 (삼합/육합/상충/상형 기반)
samhap = {("쥐","용","원숭이"), ("소","뱀","닭"), ("호랑이","말","개"), ("토끼","양","돼지")}
yukhap = {("쥐","소"), ("호랑이","돼지"), ("토끼","개"), ("용","닭"), ("뱀","원숭이"), ("말","양")}
sangchung = {("쥐","말"), ("소","양"), ("호랑이","원숭이"), ("토끼","닭"), ("용","개"), ("뱀","돼지")}

def get_compat_score(a, b):
    pair = frozenset([a, b])
    for s in samhap:
        if a in s and b in s:
            return 95, "삼합"
    for s in yukhap:
        if pair == frozenset(s):
            return 90, "육합"
    for s in sangchung:
        if pair == frozenset(s):
            return 40, "상충"
    return 70, "보통"

gunghap_count = 0
for a_kr, a_en, a_hanja, a_trait in zodiac_animals:
    for b_kr, b_en, b_hanja, b_trait in zodiac_animals:
        slug = f"{a_en}-{b_en}-zodiac-compatibility-guide"
        filename = f"{DATE_BASE}-{slug}.mdx"
        score, relation = get_compat_score(a_kr, b_kr)

        if score >= 90:
            overall = "매우 좋은"
            advice = "서로를 이해하고 지지하는 최고의 궁합이에요. 자연스럽게 잘 맞는 관계예요."
            love_score = random.randint(88, 98)
            work_score = random.randint(85, 95)
        elif score >= 70:
            overall = "무난한"
            advice = "서로 다른 점을 이해하고 배려하면 좋은 관계를 만들 수 있어요."
            love_score = random.randint(65, 80)
            work_score = random.randint(60, 78)
        else:
            overall = "주의가 필요한"
            advice = "성격 차이가 있지만 노력하면 충분히 좋은 관계가 될 수 있어요. 서로의 장점을 인정하는 게 핵심이에요."
            love_score = random.randint(45, 60)
            work_score = random.randint(50, 65)

        same = a_kr == b_kr
        title_prefix = f"{a_kr}띠" if same else f"{a_kr}띠와 {b_kr}띠"

        content = f"""---
title: "{title_prefix} 궁합: 연애, 결혼, 직장 궁합 점수와 조언"
slug: {slug}
description: "{a_kr}띠와 {b_kr}띠의 궁합을 연애, 결혼, 직장별로 분석했어요. 궁합 점수와 관계 개선 조언까지 한번에 정리했습니다."
category: 궁합
tags:
  - {a_kr}띠 궁합
  - {b_kr}띠 궁합
  - 띠별 궁합
  - 궁합 보기
  - 연애 궁합
date: "{DATE_BASE}"
published: true
icon: "💑"
relatedService:
  label: 궁합 보러가기
  href: "https://www.sajuboka.com/compatibility"
keywords:
  primary: {a_kr}띠 {b_kr}띠 궁합
  secondary:
    - {a_kr}띠 {b_kr}띠 연애 궁합
    - {a_kr} {b_kr} 궁합 점수
  longTail:
    - {a_kr}띠와 {b_kr}띠 궁합 연애 결혼 직장
    - {a_kr}띠 {b_kr}띠 궁합 좋은지
image: /images/posts/{slug}-thumb.webp
faq:
  - q: {a_kr}띠와 {b_kr}띠는 궁합이 좋은 편인가요
    a: {relation} 관계로 {overall} 궁합이에요. {advice}
  - q: {a_kr}띠와 {b_kr}띠가 결혼하면 잘 살 수 있나요
    a: 띠 궁합은 참고 사항이에요. 실제 결혼 생활은 서로의 노력과 소통이 가장 중요하거든요. 궁합이 맞지 않더라도 서로 배려하면 충분히 행복할 수 있어요.
  - q: 궁합이 안 좋으면 피하는 게 좋나요
    a: 궁합이 안 좋다고 관계를 끊을 필요는 없어요. 오히려 주의할 점을 미리 알고 준비하면 더 좋은 관계를 만들 수 있어요.
  - q: 띠 궁합과 사주 궁합은 다른 건가요
    a: 띠 궁합은 12지지 기반의 간략한 분석이고, 사주 궁합은 연월일시 4기둥 전체를 보는 정밀 분석이에요. 더 정확한 결과를 원하면 사주 궁합을 추천해요.
  - q: 같은 띠끼리는 궁합이 어떤가요
    a: 같은 띠끼리는 서로를 잘 이해하지만 비슷한 단점도 공유해요. 장점은 공감대가 크고, 단점은 같은 문제로 충돌할 수 있다는 거예요.
---

{a_kr}띠와 {b_kr}띠의 궁합이 궁금하셨죠?

12간지 궁합에서 {a_kr}띠({a_hanja})와 {b_kr}띠({b_hanja})는 **{overall} 궁합**이에요.

{a_kr}띠는 {a_trait} 성격이고, {b_kr}띠는 {b_trait} 성격이에요. 이 두 성격이 만나면 어떤 시너지가 나는지 알려드릴게요.

## 궁합 점수

| 분야 | 점수 | 평가 |
|------|------|------|
| 연애 궁합 | {love_score}점 | {'좋음' if love_score >= 80 else '보통' if love_score >= 60 else '노력 필요'} |
| 직장 궁합 | {work_score}점 | {'좋음' if work_score >= 80 else '보통' if work_score >= 60 else '노력 필요'} |
| 종합 | {score}점 | {overall} |

## {a_kr}띠의 성격

{a_kr}띠는 {a_trait} 성격을 가지고 있어요.

![ {a_kr}띠와 {b_kr}띠 궁합을 상징하는 이미지]({UNSPLASH_GUNGHAP})

{a_kr}띠 사람은 주변에서 믿음직하다는 평가를 자주 받아요. 한번 마음먹으면 끝까지 해내는 추진력도 있어요.

## {b_kr}띠의 성격

{b_kr}띠는 {b_trait} 성격이에요.

{b_kr}띠 사람은 독특한 매력으로 주변 사람들을 끌어당기는 힘이 있어요.

## 연애 궁합 분석

{a_kr}띠와 {b_kr}띠의 연애에서 핵심은 **서로의 다름을 인정하는 것**이에요.

{a_kr}띠가 원하는 사랑 방식과 {b_kr}띠가 원하는 방식이 다를 수 있어요. 하지만 이 차이를 이해하고 맞춰가면 오히려 더 풍성한 관계가 될 수 있어요.

**연애 꿀팁:**
- 서로의 속도를 존중하세요
- 감정 표현을 아끼지 마세요
- 작은 것부터 타협하는 연습을 하세요

## 직장/업무 궁합 분석

함께 일할 때는 역할 분담이 핵심이에요.

{a_kr}띠의 {a_trait.split('하고')[0]} 성격과 {b_kr}띠의 {b_trait.split('하고')[0]} 성격을 잘 조합하면 시너지가 나요.

## 관계 개선 조언

{advice}

특히 이런 점을 기억하세요:
- 상대방의 장점에 집중하기
- 갈등이 생기면 대화로 해결하기
- 서로의 공간을 존중하기

[사주 궁합 가이드](/blog/saju-compatibility-guide)에서 더 정밀한 궁합 분석 방법도 확인해 보세요.

## 마무리

{a_kr}띠와 {b_kr}띠의 궁합은 {overall} 편이에요.

하지만 어떤 궁합이든 결국 가장 중요한 건 서로의 노력이에요. 궁합을 참고하되 맹신하지 말고, 상대방을 이해하려는 마음이 가장 좋은 궁합을 만들어 줘요.

[띠별 운세 가이드](/blog/zodiac-fortune-2026-by-animal)도 함께 확인해 보세요.
"""
        write_mdx(filename, content)
        gunghap_count += 1

created_count += gunghap_count
print(f"띠별 궁합: {gunghap_count}개 생성")

# ============================================================
# 5. 타로 메이저 아르카나 22장
# ============================================================
tarot_cards = [
    (0, "바보", "The Fool", "fool", "새로운 시작", "무모함", "순수한 마음으로 새로운 여정을 시작하세요"),
    (1, "마법사", "The Magician", "magician", "의지와 창조", "속임수", "당신에게 필요한 모든 도구가 이미 있어요"),
    (2, "여사제", "The High Priestess", "high-priestess", "직관과 지혜", "비밀", "내면의 목소리에 귀 기울이세요"),
    (3, "여황제", "The Empress", "empress", "풍요와 모성", "방종", "창조적 에너지가 넘치는 시기예요"),
    (4, "황제", "The Emperor", "emperor", "권위와 안정", "독재", "체계적으로 기반을 다질 때예요"),
    (5, "교황", "The Hierophant", "hierophant", "전통과 가르침", "독단", "경험자의 조언을 구해보세요"),
    (6, "연인", "The Lovers", "lovers", "사랑과 선택", "갈등", "중요한 선택의 순간이에요"),
    (7, "전차", "The Chariot", "chariot", "승리와 전진", "좌절", "강한 의지로 앞으로 나아가세요"),
    (8, "힘", "Strength", "strength", "내면의 힘", "나약함", "부드러운 힘으로 상황을 다스리세요"),
    (9, "은둔자", "The Hermit", "hermit", "성찰과 지혜", "고립", "혼자만의 시간이 필요한 때예요"),
    (10, "운명의 수레바퀴", "Wheel of Fortune", "wheel-of-fortune", "전환과 기회", "불운", "변화의 바람이 불고 있어요"),
    (11, "정의", "Justice", "justice", "공정과 균형", "불공정", "올바른 판단이 필요해요"),
    (12, "매달린 사람", "The Hanged Man", "hanged-man", "희생과 관점 변화", "저항", "다른 각도에서 바라보세요"),
    (13, "죽음", "Death", "death", "끝과 새로운 시작", "집착", "무언가를 내려놓아야 새것이 와요"),
    (14, "절제", "Temperance", "temperance", "균형과 조화", "극단", "중용의 길을 걸으세요"),
    (15, "악마", "The Devil", "devil", "유혹과 속박", "해방", "스스로 만든 족쇄를 벗으세요"),
    (16, "탑", "The Tower", "tower", "파괴와 각성", "혼란", "무너져야 새로 세울 수 있어요"),
    (17, "별", "The Star", "star", "희망과 영감", "절망", "어둠 속에서도 빛은 있어요"),
    (18, "달", "The Moon", "moon", "환상과 불안", "혼동", "감정에 휘둘리지 마세요"),
    (19, "태양", "The Sun", "sun", "성공과 기쁨", "과시", "밝은 에너지가 가득한 시기예요"),
    (20, "심판", "Judgement", "judgement", "각성과 부활", "자책", "과거를 정리하고 새출발하세요"),
    (21, "세계", "The World", "world", "완성과 성취", "미완", "하나의 사이클이 완성되고 있어요"),
]

tarot_count = 0
for num, kr_name, en_name, slug_part, upright, reversed_meaning, message in tarot_cards:
    slug = f"tarot-{slug_part}-card-meaning-guide"
    filename = f"{DATE_BASE}-{slug}.mdx"

    content = f"""---
title: "타로 {kr_name} 카드 뜻: 정방향/역방향 해석과 연애, 직업, 재물 리딩"
slug: {slug}
description: "타로 {kr_name}({en_name}) 카드의 정방향/역방향 의미를 연애, 직업, 재물 분야별로 해석했어요. 다른 카드와의 조합 해석까지 알려드립니다."
category: 타로
tags:
  - 타로 {kr_name}
  - {en_name}
  - 타로 카드 뜻
  - 타로 해석
  - 메이저 아르카나
date: "{DATE_BASE}"
published: true
icon: "🃏"
relatedService:
  label: AI 타로 점 보러가기
  href: "https://www.sajuboka.com/tarot"
keywords:
  primary: 타로 {kr_name} 카드 뜻
  secondary:
    - {en_name} 타로 의미
    - {kr_name} 카드 해석
  longTail:
    - 타로 {kr_name} 카드 정방향 역방향 의미
    - {en_name} 타로 연애 직업 재물 해석
image: /images/posts/{slug}-thumb.webp
faq:
  - q: {kr_name} 카드가 나오면 어떤 의미인가요
    a: 정방향이면 {upright}을 뜻하고, 역방향이면 {reversed_meaning}의 에너지가 있어요. {message}
  - q: {kr_name} 카드와 궁합이 좋은 카드는 뭔가요
    a: {kr_name} 카드는 긍정적인 카드와 함께 나오면 의미가 강화돼요. 구체적인 조합은 스프레드 위치와 질문에 따라 달라져요.
  - q: 역방향 {kr_name}이 나오면 나쁜 건가요
    a: 역방향이 무조건 나쁜 건 아니에요. {reversed_meaning}의 에너지를 인식하고 조심하라는 조언이에요. 경고를 받아들이면 오히려 좋은 결과로 이어질 수 있어요.
  - q: {kr_name} 카드 번호 {num}의 의미는 뭔가요
    a: 숫자 {num}은 타로에서 특별한 의미를 가져요. 메이저 아르카나에서 {kr_name}의 위치는 영혼의 여정에서 중요한 단계를 나타내요.
  - q: 타로 초보인데 {kr_name} 카드를 어떻게 해석해야 하나요
    a: 카드의 그림을 먼저 직관적으로 느끼고, 정방향/역방향 기본 의미를 참고하세요. 경험이 쌓이면 자연스럽게 깊은 해석이 가능해져요.
---

타로에서 {kr_name}({en_name}) 카드가 나왔다면 어떤 메시지를 전하는 걸까요?

메이저 아르카나 {num}번 {kr_name} 카드는 **{upright}**의 에너지를 상징해요.

{message}

오늘은 {kr_name} 카드의 모든 해석을 정리해 드릴게요.

## {kr_name} 카드 기본 의미

![ 타로 {kr_name} 카드 이미지]({UNSPLASH_TAROT})

### 정방향: {upright}

{kr_name} 카드가 정방향으로 나오면 {upright}의 에너지가 강하게 작용하고 있어요.

지금은 이 에너지를 활용해서 적극적으로 행동할 때예요. 주저하지 말고 앞으로 나아가세요.

### 역방향: {reversed_meaning}

역방향은 {reversed_meaning}의 에너지가 있어요.

이건 경고가 아니라 조언이에요. 현재 상황에서 놓치고 있는 부분이 없는지 점검해 보라는 메시지거든요.

## 분야별 해석

### 연애 리딩

정방향: 관계에서 {upright}의 에너지가 흐르고 있어요. 솔로라면 새로운 인연이, 커플이라면 관계의 발전이 기대돼요.

역방향: 관계에서 {reversed_meaning}이(가) 나타날 수 있어요. 소통이 부족하거나 서로의 기대가 다를 수 있으니 대화가 필요해요.

### 직업/커리어 리딩

정방향: 업무에서 {upright}의 기회가 올 수 있어요. 새로운 프로젝트나 도전에 긍정적으로 임하세요.

역방향: 직장에서 {reversed_meaning}이(가) 있을 수 있어요. 계획을 재점검하고 신중하게 판단하세요.

### 재물 리딩

정방향: 재정적으로 {upright}의 흐름이 있어요. 합리적인 투자나 저축에 좋은 시기예요.

역방향: 충동적인 지출이나 {reversed_meaning}에 주의하세요. 꼼꼼한 재무 관리가 필요해요.

## 다른 카드와의 조합

{kr_name} 카드는 주변 카드에 따라 의미가 확장돼요.

- **긍정적 카드(태양, 별 등)**와 함께: {upright}의 에너지가 극대화돼요
- **도전적 카드(탑, 악마 등)**와 함께: 시련을 통한 성장을 암시해요
- **중립적 카드(정의, 절제 등)**와 함께: 균형 잡힌 접근이 필요하다는 의미예요

[타로 카드 전체 의미 가이드](/blog/tarot-major-arcana-22-cards-meaning-guide)에서 다른 카드와의 관계도 확인해 보세요.

## {kr_name} 카드의 조언

{kr_name} 카드가 당신에게 전하는 핵심 메시지예요:

{message}

![타로 리딩에서 메시지를 전달하는 이미지](https://images.unsplash.com/photo-1572276596920-7e5d60f23490?w=800&q=80)

이 카드가 나왔다면 지금이 행동할 때예요. 카드의 에너지를 믿고 한 발짝 내딛어 보세요.

[타로 초보 가이드](/blog/tarot-card-beginner-guide)도 함께 읽어보면 카드 리딩에 대한 이해가 깊어질 거예요.
"""
    write_mdx(filename, content)
    tarot_count += 1

created_count += tarot_count
print(f"타로 메이저 아르카나: {tarot_count}개 생성")

# ============================================================
# 6. 월별 운세 24개 (5~6월 x 12띠)
# ============================================================
months = [("5월", "may", "봄의 에너지가 절정에 달하는"), ("6월", "june", "여름의 시작과 함께 활력이 넘치는")]

fortune_count = 0
for month_kr, month_en, season_desc in months:
    for animal_kr, animal_en, animal_hanja, animal_trait in zodiac_animals:
        slug = f"2026-{month_en}-{animal_en}-tti-fortune-guide"
        filename = f"{DATE_BASE}-{slug}.mdx"

        content = f"""---
title: "2026년 {month_kr} {animal_kr}띠 운세: 재물운, 연애운, 건강운 총정리"
slug: {slug}
description: "2026년 {month_kr} {animal_kr}띠의 운세를 재물운, 연애운, 건강운, 직업운별로 정리했어요. {season_desc} {month_kr}에 {animal_kr}띠가 주의할 점과 행운의 방향을 알려드립니다."
category: 운세
tags:
  - {month_kr} 운세
  - {animal_kr}띠 운세
  - 2026년 {month_kr} 운세
  - 띠별 운세
  - 월별 운세
date: "{DATE_BASE}"
published: true
icon: "🗓️"
relatedService:
  label: 오늘의 운세 확인하기
  href: "https://www.sajuboka.com/today"
keywords:
  primary: 2026년 {month_kr} {animal_kr}띠 운세
  secondary:
    - {animal_kr}띠 {month_kr} 재물운
    - {animal_kr}띠 {month_kr} 연애운
  longTail:
    - 2026년 {month_kr} {animal_kr}띠 운세 재물 연애 건강
    - {month_kr} {animal_kr}띠 행운의 방향 색상
image: /images/posts/{slug}-thumb.webp
faq:
  - q: {month_kr}에 {animal_kr}띠 재물운은 어떤가요
    a: {season_desc} {month_kr}에 {animal_kr}띠의 재물운은 안정적인 흐름이에요. 큰 투자보다는 꾸준한 저축과 관리에 집중하는 게 좋아요.
  - q: {animal_kr}띠의 {month_kr} 행운의 색상은 뭔가요
    a: {animal_kr}띠의 {month_kr} 행운색은 오행의 기운에 따라 결정돼요. 자세한 내용은 본문에서 확인하세요.
  - q: {month_kr}에 {animal_kr}띠가 특히 조심해야 할 것은 뭔가요
    a: 건강과 대인관계에 주의가 필요해요. 특히 과로와 스트레스 관리에 신경 쓰시고, 불필요한 갈등은 피하세요.
  - q: {animal_kr}띠와 {month_kr}에 궁합이 좋은 띠는 뭔가요
    a: {month_kr}에는 상생 관계의 띠와 시너지가 좋아요. 구체적인 궁합은 상대방의 띠와 사주를 함께 봐야 정확해요.
  - q: {month_kr} 운세를 좋게 만드는 방법이 있나요
    a: 긍정적인 마인드와 꾸준한 노력이 가장 중요해요. 행운의 방향이나 색상을 활용하면 작은 도움이 될 수 있어요.
---

{animal_kr}띠 여러분, 2026년 {month_kr} 운세가 궁금하시죠?

{season_desc} {month_kr}에 {animal_kr}띠에게는 어떤 기운이 흐르는지 하나하나 살펴볼게요.

## {month_kr} 전체 운세 흐름

2026년 {month_kr}은 {animal_kr}띠에게 **변화와 기회**가 공존하는 달이에요.

![ 2026년 {month_kr} {animal_kr}띠 운세 이미지]({UNSPLASH_FORTUNE})

{animal_kr}띠의 기본 성격인 {animal_trait} 성향이 {month_kr}의 에너지와 만나면서 새로운 가능성이 열려요.

## 재물운

{month_kr} {animal_kr}띠의 재물운은 **안정적**이에요.

큰 투자보다는 기존 재산을 잘 관리하는 데 집중하세요. 월 초에 예상치 못한 지출이 있을 수 있으니 비상금을 확보해 두는 게 좋아요.

월 중반 이후로는 새로운 수입원이 생길 가능성이 있어요. 부업이나 프리랜서 기회를 열어두세요.

## 연애운

솔로 {animal_kr}띠에게는 새로운 만남의 기회가 찾아올 수 있어요. 주변 소개나 모임에 적극적으로 참여해 보세요.

커플 {animal_kr}띠는 소소한 이벤트로 관계에 활력을 불어넣으세요. 깜짝 선물이나 함께하는 새로운 경험이 좋아요.

## 직업운

직장에서 인정받을 수 있는 달이에요. 맡은 업무에 최선을 다하면 상사의 눈에 띌 수 있어요.

이직을 고민 중이라면 {month_kr} 중반 이후가 좋은 타이밍이에요.

[2026년 띠별 운세 전체 가이드](/blog/2026-zodiac-animal-fortune-complete)에서 연간 흐름도 확인해 보세요.

## 건강운

과로에 주의하세요. 특히 {month_kr}은 계절 변화로 면역력이 떨어지기 쉬운 시기예요.

규칙적인 운동과 충분한 수면을 챙기세요. 비타민 보충도 도움이 돼요.

## 행운의 포인트

| 항목 | 내용 |
|------|------|
| 행운의 숫자 | {random.randint(1,9)}, {random.randint(10,45)} |
| 행운의 색상 | {'빨강' if hash(animal_kr + month_kr) % 5 == 0 else '파랑' if hash(animal_kr + month_kr) % 5 == 1 else '노랑' if hash(animal_kr + month_kr) % 5 == 2 else '초록' if hash(animal_kr + month_kr) % 5 == 3 else '보라'} |
| 행운의 방향 | {'동쪽' if hash(animal_en + month_en) % 4 == 0 else '서쪽' if hash(animal_en + month_en) % 4 == 1 else '남쪽' if hash(animal_en + month_en) % 4 == 2 else '북쪽'} |

## {month_kr} 주간별 운세 포인트

- **1주차**: 새로운 시작에 유리한 시기. 계획을 세우세요.
- **2주차**: 대인관계에서 좋은 소식이 올 수 있어요.
- **3주차**: 재물운이 상승해요. 기회를 놓치지 마세요.
- **4주차**: 건강에 주의하고 무리하지 마세요.

![월별 운세 체크하는 이미지](https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80)

## 마무리

{animal_kr}띠에게 2026년 {month_kr}은 **기회를 잡고 안정을 다지는** 달이에요.

긍정적인 마인드로 하루하루를 보내면 좋은 결과가 따라올 거예요. 운세는 참고일 뿐, 가장 중요한 건 여러분의 노력이에요.

[오늘의 운세](/blog/daily-fortune-guide)에서 매일 체크해 보세요.
"""
        write_mdx(filename, content)
        fortune_count += 1

created_count += fortune_count
print(f"월별 운세: {fortune_count}개 생성")

print(f"\n=== 총 {created_count}개 MDX 파일 생성 완료 ===")
