# 03. 스타일 가이드

모든 값은 CSS 커스텀 프로퍼티로 선언하고, 컴포넌트에서는 변수만 참조한다.

## 1. 색상

테마는 **옅은 오렌지 배경 + 블랙·오렌지 텍스트**다.
라이트가 이 페이지의 기본 모습이며, OS의 다크 설정을 따라가지 않는다.
다크는 사용자가 헤더 토글로 직접 고른 경우에만 적용된다.

### 라이트 (기본)

`대비` 칸은 `--color-bg`(#ffeedd) 위에서의 대비비.

| 토큰 | 값 | 대비 | 용도 |
|---|---|---|---|
| `--color-bg` | `#ffeedd` | — | 페이지 배경 (옅은 오렌지) |
| `--color-surface` | `#ffe3ca` | — | 카드·교차 섹션 배경 |
| `--color-border` | `#f0cba6` | — | 구분선, 카드 테두리 |
| `--color-text` | `#201a12` | 15.2:1 | 본문 (웜 블랙) |
| `--color-text-muted` | `#6b5a3e` | 5.9:1 | 보조 텍스트, 캡션 (웜 브라운) |
| `--color-primary` | `#a63c06` | 5.7:1 | 버튼, 링크, 강조 (딥 오렌지) |
| `--color-primary-hover` | `#7f2d04` | — | 버튼 hover |
| `--color-primary-soft` | `#ffd3ac` | — | 태그·배지 배경 (진한 살구) |
| `--color-on-primary` | `#ffffff` | 6.4:1 | 오렌지 버튼 위 글자 |

### 다크

오렌지를 그대로 어둡게 만들면 탁해지므로, 웜 다크 배경 + 밝은 오렌지로 맞춘다.

| 토큰 | 값 |
|---|---|
| `--color-bg` | `#1b1710` |
| `--color-surface` | `#241f16` |
| `--color-border` | `#3a3226` |
| `--color-text` | `#f7f1e3` |
| `--color-text-muted` | `#bdb097` |
| `--color-primary` | `#ff9147` |
| `--color-primary-hover` | `#ffab73` |
| `--color-primary-soft` | `#46301c` |
| `--color-on-primary` | `#1b1710` |

```css
:root {
  --color-bg: #ffeedd;
  --color-text: #201a12;
  /* … 라이트 토큰 전체 … */
}

[data-theme="dark"] {
  --color-bg: #1b1710;
  --color-text: #f7f1e3;
  /* … 다크 토큰만 재정의 … */
}
```

> 색상은 반드시 라이트 값을 `:root`에 **전부** 선언하고, 다크에서는 재정의만 한다.
> 대비비 검사: 본문 4.5:1 이상, 큰 제목 3:1 이상.

## 2. 타이포그래피

```css
--font-sans: "Pretendard", -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
--font-mono: "JetBrains Mono", Consolas, monospace;
```

| 토큰 | 크기 | 굵기 | 행간 | 용도 |
|---|---|---|---|---|
| `--fs-hero` | `clamp(2rem, 5vw, 3.5rem)` | 700 | 1.2 | Hero 이름 |
| `--fs-h2` | `clamp(1.5rem, 3vw, 2rem)` | 700 | 1.3 | 섹션 제목 |
| `--fs-h3` | `1.25rem` | 600 | 1.4 | 카드 제목 |
| `--fs-body` | `1rem` | 400 | 1.7 | 본문 |
| `--fs-sm` | `0.875rem` | 400 | 1.6 | 태그, 캡션 |

- 한글 본문 행간은 1.6~1.8로 넉넉하게
- 한 줄 최대 길이 70자 이내 (`max-width: 65ch`)

## 3. 간격

8px 배수 스케일.

| 토큰 | 값 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 16px |
| `--space-4` | 24px |
| `--space-5` | 32px |
| `--space-6` | 48px |
| `--space-7` | 64px |
| `--space-8` | 96px |

- 섹션 상하 패딩: 모바일 `--space-7`, 데스크톱 `--space-8`
- 카드 내부 패딩: `--space-4`
- 요소 간 기본 간격: `--space-3`

## 4. 모양

```css
--radius-sm: 6px;    /* 태그, 작은 버튼 */
--radius-md: 12px;   /* 카드, 버튼 */
--radius-full: 999px;/* pill 태그, 원형 프로필 */

/* 오렌지 배경에서 검정 그림자는 탁해 보이므로 갈색 계열로 쓴다 */
--shadow-sm: 0 1px 3px rgba(94,68,20,.12);
--shadow-md: 0 4px 16px rgba(94,68,20,.16);
--shadow-lg: 0 12px 32px rgba(94,68,20,.22);

--transition: 200ms ease;
--container: 1120px;
```

## 5. 컴포넌트 규칙

### 버튼
- 높이 44px 이상 (터치 타겟), 좌우 패딩 `--space-4`
- primary: 배경 `--color-primary`, 글자 흰색
- outline: 배경 투명, 테두리 `--color-border`, 글자 `--color-text`
- hover: 배경 변경 + `transform: translateY(-1px)`
- `:focus-visible`에 `outline: 2px solid var(--color-primary); outline-offset: 2px`

### 카드
- 배경 `--color-surface`, 테두리 `--color-border`, 반경 `--radius-md`
- hover: `--shadow-md` + `translateY(-4px)`

### 태그(pill)
- 배경 `--color-primary-soft`, 글자 `--color-primary`
- 패딩 `4px 12px`, 반경 `--radius-full`, 크기 `--fs-sm`

### 섹션 제목
- `<h2>` + 아래 짧은 밑줄(폭 40px, 두께 3px, `--color-primary`)
- 섹션마다 동일한 패턴 유지

## 6. 작성 규칙

- 클래스 네이밍: **BEM** — `.card`, `.card__title`, `.card--featured`
- `!important` 금지, ID 선택자로 스타일 금지 (ID는 앵커·JS용)
- 색상 하드코딩 금지 — 반드시 변수 사용
- CSS 파일 순서: 리셋 → 변수 → 베이스 → 레이아웃 → 컴포넌트 → 섹션 → 유틸 → 미디어쿼리
