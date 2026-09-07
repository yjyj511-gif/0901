# 04. 파일 구조 및 규칙

## 1. 폴더 구조

```
0901/
├── frontend/                  ← 실제 페이지 코드
│   ├── index.html             Hero (홈)
│   ├── about.html             About
│   ├── skills.html            Skills
│   ├── projects.html          Projects
│   ├── contact.html           Contact
│   ├── css/
│   │   ├── reset.css          리셋 / 노멀라이즈
│   │   ├── variables.css      색상·간격·타이포 토큰 (03 문서 기준)
│   │   └── style.css          레이아웃 + 컴포넌트 + 섹션
│   ├── js/
│   │   ├── main.js            진입점 (초기화 호출)
│   │   ├── nav.js             현재 페이지 표시, 햄버거 메뉴, 헤더 상태, 등장 애니메이션
│   │   ├── theme.js           다크 모드 토글 + localStorage
│   │   └── projects.js        프로젝트 데이터 → 카드 렌더링
│   ├── data/
│   │   └── projects.json      프로젝트 목록 (선택: js에 상수로 둬도 됨)
│   └── assets/
│       ├── images/
│       │   ├── profile.webp   프로필 사진 (정사각, 400×400 권장)
│       │   ├── og-image.png   공유 미리보기 (1200×630)
│       │   └── projects/      프로젝트 썸네일 (16:9, 800×450)
│       ├── icons/             SVG 아이콘 (github, mail, linkedin …)
│       └── resume.pdf         이력서 (선택)
├── docs/                      ← 이 문서들
└── backend/                   ← 이번 범위에서는 사용하지 않음
```

> CSS를 3개로 나누는 이유: 토큰(variables)만 따로 두면 다크 모드·색상 변경이 한 파일 수정으로 끝난다.
> 파일 분리가 번거로우면 `style.css` 하나로 합쳐도 되지만, 순서(리셋 → 변수 → 나머지)는 지킨다.

## 2. HTML 뼈대

```html
<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>홍길동 | 프론트엔드 개발자</title>
  <meta name="description" content="사용자 경험을 고민하는 프론트엔드 개발자 홍길동의 포트폴리오입니다.">

  <!-- Open Graph -->
  <meta property="og:title" content="홍길동 | 프론트엔드 개발자">
  <meta property="og:description" content="…">
  <meta property="og:image" content="assets/images/og-image.png">
  <meta property="og:type" content="website">

  <link rel="icon" href="assets/icons/favicon.svg">
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <a class="skip-link" href="#main">본문 바로가기</a>

  <header class="header" id="header"> … </header>

  <main id="main">
    <section class="hero"     id="home">     … </section>
    <section class="section"  id="about">    … </section>
    <section class="section"  id="skills">   … </section>
    <section class="section"  id="projects"> … </section>
    <section class="section"  id="contact">  … </section>
  </main>

  <footer class="footer"> … </footer>

  <script src="js/theme.js"></script>
  <script src="js/nav.js"></script>
  <script src="js/projects.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- 시맨틱 태그 사용: `header / nav / main / section / article / footer`
- 섹션마다 `<h2>` 하나. 제목 레벨을 건너뛰지 않는다 (h1 → h2 → h3)
- 스크립트는 `</body>` 직전 또는 `<script defer>`

## 3. 프로젝트 데이터 형식

`projects.json` (또는 `projects.js`의 상수 배열):

```json
[
  {
    "id": "todo-app",
    "title": "할 일 관리 앱",
    "description": "드래그 앤 드롭으로 순서를 바꾸는 투두 리스트. localStorage로 데이터를 유지합니다.",
    "thumbnail": "assets/images/projects/todo-app.png",
    "tags": ["JavaScript", "CSS Grid", "localStorage"],
    "demo": "https://example.com/todo",
    "code": "https://github.com/username/todo-app",
    "period": "2026.03 ~ 2026.04"
  }
]
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✅ | 고유 키 (필터·DOM key용) |
| `title` | ✅ | 프로젝트 이름 |
| `description` | ✅ | 1~2문장. **무엇을 만들었고 무엇이 어려웠는지** |
| `thumbnail` | ✅ | 16:9 이미지 경로 |
| `tags` | ✅ | 사용 기술 배열 |
| `demo` | ❌ | 배포 링크. 없으면 버튼 숨김 |
| `code` | ❌ | 저장소 링크 |
| `period` | ❌ | 작업 기간 |

렌더링 시 `demo`/`code`가 없으면 해당 버튼을 아예 만들지 않는다.

## 4. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일·폴더 | 소문자 케밥케이스 | `projects.js`, `og-image.png` |
| CSS 클래스 | BEM | `.project-card__title`, `.btn--outline` |
| JS 변수·함수 | 카멜케이스 | `renderProjects`, `isMenuOpen` |
| JS 상수 | 대문자 스네이크 | `SCROLL_THRESHOLD` |
| DOM 참조 변수 | `$` 접두사 (선택) | `const $nav = document.querySelector('.nav')` |
| id 속성 | 앵커·JS 훅 전용, 스타일 금지 | `#projects` |

## 5. JS 작성 규칙

- `var` 금지 — `const` 우선, 재할당 시 `let`
- 각 파일은 `initXxx()` 함수를 정의하고, `main.js`에서 `DOMContentLoaded` 시 호출
- 스크롤·리사이즈 핸들러는 throttle 또는 `requestAnimationFrame` 사용
- 등장 애니메이션·스크롤 스파이는 스크롤 이벤트 대신 `IntersectionObserver`
- DOM 삽입 시 사용자 입력이 섞이면 `innerHTML` 대신 `textContent` / `createElement`

```js
// main.js
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  renderProjects();
  initScrollReveal();
});
```
