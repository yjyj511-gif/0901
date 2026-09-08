# 04. 파일 구조 및 규칙

## 1. 폴더 구조

```
0901/
├── index.html                 게시글 목록 (블로그 홈)
├── about.html                 소개 (블로그 주인 — About / Skills / Projects / Contact)
├── post.html                  게시글 상세      ?id=<게시글 id>
├── write.html                 게시글 작성/수정 ?id=<게시글 id> 이면 수정
├── login.html                 로그인
├── signup.html                회원가입
├── profile.html               프로필          ?user=<사용자 id> 이면 공개 프로필
├── css/
│   ├── reset.css              리셋 / 노멀라이즈
│   ├── variables.css          색상·간격·타이포 토큰 (03 문서 기준)
│   └── style.css              레이아웃 + 컴포넌트 + 폼 + 페이지
├── js/
│   ├── config.js              배포 주소 한 줄 (환경마다 다른 값)
│   ├── store.js               데이터 계층 (Apps Script API 호출)
│   ├── theme.js               다크 모드 토글
│   ├── nav.js                 현재 페이지 표시, 햄버거 메뉴, 헤더 상태, 등장 애니메이션
│   ├── auth.js                회원가입/로그인/로그아웃, 헤더 로그인 상태, 폼 공통 헬퍼
│   ├── posts.js               목록 렌더링 (검색·태그 필터·페이지네이션)
│   ├── post-detail.js         상세 렌더링, 삭제, 이전/다음 글
│   ├── write.js               작성/수정 폼
│   ├── profile.js             프로필 표시·수정, 내 글 관리
│   ├── projects.js            소개 페이지의 프로젝트 카드 렌더링
│   └── main.js                진입점 (초기화 호출)
├── assets/
│   ├── images/
│   │   ├── profile.jpg        소개 페이지 사진
│   │   ├── og-image.png       공유 미리보기 (1200×630) — 아직 없음
│   │   └── projects/          프로젝트 썸네일 (16:9, 800×450)
│   └── icons/favicon.svg
├── docs/                      ← 이 문서들
└── backend/
    ├── Code.gs                Apps Script 백엔드 (2절 참고)
    └── README.md              설치·배포 절차
```

> CSS를 3개로 나누는 이유: 토큰(variables)만 따로 두면 다크 모드·색상 변경이 한 파일 수정으로 끝난다.
> 순서(리셋 → 변수 → 나머지)는 반드시 지킨다.

### 페이지별 스크립트

모든 페이지가 `config.js → store.js → theme.js → nav.js → auth.js` 를 먼저 불러오고,
마지막이 `main.js` 다.
그 사이에 해당 페이지 전용 스크립트를 하나 넣는다.

| 페이지 | 추가 스크립트 |
|---|---|
| index.html | `posts.js` |
| about.html | `projects.js` |
| post.html | `post-detail.js` |
| write.html | `write.js` |
| profile.html | `profile.js` |
| login.html / signup.html | 없음 (`auth.js`가 처리) |

`main.js`는 `typeof initXxx === 'function'` 으로 확인한 뒤 호출하므로,
스크립트를 넣지 않은 페이지에서는 그냥 건너뛴다.

## 2. 데이터 저장 방식

**구글 스프레드시트**가 DB이고, **Apps Script 웹앱**이 그 앞의 JSON API다.
`js/store.js` 가 서버와 이야기하는 유일한 파일이다. 설치 절차는 [backend/README.md](../backend/README.md).

```
js/store.js  ──fetch──▶  backend/Code.gs  ──▶  users / posts / sessions 시트
```

### 읽기는 동기, 쓰기는 비동기

페이지가 뜰 때 `bootstrapStore()`가 `bootstrap` 액션을 **한 번만** 호출해
글 목록과 내 정보를 `snapshot`에 담는다. 그 뒤 `getPosts()` 같은 읽기 함수는
네트워크를 타지 않고 snapshot에서 꺼내므로 동기다.
실제로 서버를 오가는 쓰기 함수(`createPost`, `login`, `updateUser` …)만 `async`다.

이렇게 나눈 이유는 호출 지점 25곳을 전부 `await`로 바꾸지 않기 위해서다.
쓰기는 제출 핸들러 안에만 있어 비동기로 바꾸기 쉽다.

### 브라우저에 남는 것

| 키 | 내용 |
|---|---|
| `blog:token` | 로그인 토큰. 서버가 발급하고 요청마다 함께 보낸다 |
| `theme` | `light` / `dark` |

> ⚠️ **`file://` 로 열면 동작하지 않는다.** 출처가 `null`이라 브라우저가 CORS로 막는다.
> 로컬에서도 `python -m http.server` 로 띄워야 한다.

> ⚠️ **학습용 구조다.** API 주소가 코드에 들어 있어 누구나 직접 호출할 수 있다.
> 실제로 쓰는 비밀번호를 넣지 말 것.

### 사용자

```json
{
  "id": "u_m1a2b3c4",
  "username": "홍길동",
  "email": "demo@blog.dev",
  "passwordHash": "h1f2e3d4:8",
  "bio": "한 줄 소개",
  "createdAt": "2026-03-02T09:00:00.000Z"
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✅ | `uid('u')` 로 생성 |
| `username` | ✅ | 2~20자. 글 작성자 이름으로 표시되며 중복 불가 |
| `email` | ✅ | 로그인 아이디. 중복 불가 |
| `passwordHash` | ✅ | 솔트 + SHA-256. 원문은 저장하지 않고, 클라이언트로도 내려가지 않는다 |
| `bio` | ❌ | 프로필 소개 |
| `createdAt` | ✅ | ISO 문자열 |

### 게시글

```json
{
  "id": "p_m1a2b3c4",
  "title": "바닐라 자바스크립트로 다크 모드 만들기",
  "content": "첫 문단.\n\n둘째 문단.",
  "tags": ["JavaScript", "CSS"],
  "authorId": "u_demo",
  "authorName": "홍길동",
  "createdAt": "2026-08-21T10:20:00.000Z",
  "updatedAt": "2026-08-21T10:20:00.000Z",
  "views": 12
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✅ | `uid('p')` 로 생성 |
| `title` | ✅ | 1~80자 |
| `content` | ✅ | 10자 이상. **빈 줄이 문단 구분** |
| `tags` | ✅ | 최대 5개. 입력은 쉼표 구분, 중복·`#`는 제거. **시트에는 쉼표로 이어 붙여 한 칸에 넣는다** |
| `authorId` | ✅ | 작성자 `id` |
| `authorName` | ✅ | 표시용 사본. 닉네임을 바꾸면 `updateUser`가 함께 갱신한다 |
| `createdAt` / `updatedAt` | ✅ | 두 값이 다르면 상세에서 "수정됨"을 표시 |
| `views` | ✅ | 상세 페이지 진입 시 1 증가 |

### 프로젝트 (소개 페이지)

게시글과 달리 사용자가 만드는 데이터가 아니라 **내가 직접 적는 목록**이라
`localStorage`가 아니라 `js/projects.js`의 `PROJECTS` 상수 배열에 둔다.
(`file://`로 열면 JSON `fetch`가 CORS로 막히기 때문이기도 하다.)

```js
{
  id: 'todo-app',
  title: '할 일 관리 앱',
  description: '드래그 앤 드롭으로 순서를 바꾸는 투두 리스트. localStorage로 목록이 유지됩니다.',
  thumbnail: 'assets/images/projects/placeholder.svg',
  tags: ['JavaScript', 'CSS Grid', 'localStorage'],
  demo: 'https://example.com/todo',
  code: 'https://github.com/username/todo-app',
  period: '2026.03 ~ 2026.04',
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✅ | 고유 키 |
| `title` | ✅ | 프로젝트 이름 |
| `description` | ✅ | 1~2문장. **무엇을 만들었고 무엇이 어려웠는지** |
| `thumbnail` | ✅ | 16:9 이미지 경로 |
| `tags` | ✅ | 사용 기술 배열 |
| `demo` | ❌ | 배포 링크. 없으면 버튼을 아예 만들지 않는다 |
| `code` | ❌ | 저장소 링크. 없으면 버튼을 아예 만들지 않는다 |
| `period` | ❌ | 작업 기간 |

## 3. HTML 뼈대

```html
<!DOCTYPE html>
<html lang="ko" class="no-js" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>글 목록 | Devlog</title>
  <meta name="description" content="…">

  <!-- Open Graph -->
  <meta property="og:title" content="…">
  <meta property="og:description" content="…">
  <meta property="og:image" content="assets/images/og-image.png">
  <meta property="og:type" content="blog">

  <link rel="icon" href="assets/icons/favicon.svg">
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/style.css">

  <!-- 렌더 전에 테마와 로그인 상태를 확정한다 (깜빡임 방지) -->
  <script> … </script>
</head>
<body>
  <a class="skip-link" href="#main">본문 바로가기</a>

  <header class="header" id="header"> … </header>

  <main id="main">
    <section class="section section--page"> … </section>
  </main>

  <footer class="footer"> … </footer>

  <script src="js/config.js"></script>
  <script src="js/store.js"></script>
  <script src="js/theme.js"></script>
  <script src="js/nav.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/posts.js"></script>   <!-- 페이지 전용 -->
  <script src="js/main.js"></script>
</body>
</html>
```

- 시맨틱 태그 사용: `header / nav / main / section / article / footer`
- 페이지마다 `<h1>` 하나. 제목 레벨을 건너뛰지 않는다 (h1 → h2 → h3)
  (소개 페이지는 `<h1>`이 이름 하나, 나머지 구획은 `<h2>`다)
- 헤더·푸터는 7개 페이지에 복사되어 있다. **한 곳을 고치면 나머지 여섯 곳도 고칠 것**
- 스크립트는 `</body>` 직전

## 4. 로그인 상태 표시

헤더 메뉴는 로그인 여부에 따라 달라진다. 자바스크립트가 요소를 지웠다 만들면
첫 프레임에 잘못된 메뉴가 보이므로, `<head>` 인라인 스크립트가 렌더 전에
`<html>`에 `is-auth` / `is-guest` 클래스를 붙이고 CSS가 숨긴다.

```html
<li data-auth="in"><a class="nav__link" href="write.html">글쓰기</a></li>
<li data-auth="out"><a class="nav__link" href="login.html">로그인</a></li>
```

```css
.is-guest [data-auth="in"],
.is-auth  [data-auth="out"] { display: none; }
```

로그인이 필요한 페이지(`write.html`, 본인 `profile.html`)는 `requireLogin()`을 호출한다.
비로그인 상태면 `login.html?next=<원래 주소>` 로 보내고, 로그인 후 그 자리로 돌아온다.

## 5. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일·폴더 | 소문자 케밥케이스 | `post-detail.js`, `og-image.png` |
| CSS 클래스 | BEM | `.post-card__title`, `.btn--outline` |
| JS 변수·함수 | 카멜케이스 | `renderPostList`, `isAuthor` |
| JS 상수 | 대문자 스네이크 | `PER_PAGE`, `MAX_TITLE` |
| DOM 참조 변수 | `$` 접두사 | `const $list = document.getElementById('post-list')` |
| id 속성 | JS 훅 전용, 스타일 금지 | `#post-list` |
| localStorage 키 | `blog:` 접두사 | `blog:posts` |

## 6. JS 작성 규칙

- `var` 금지 — `const` 우선, 재할당 시 `let`
- 각 파일은 `initXxx()` 를 정의하고, `main.js`에서 `DOMContentLoaded` 시 호출
- **서버 접근은 `store.js`를 통해서만 한다.** 다른 파일에서 `fetch`를 직접 부르지 않는다
- 쓰기 함수는 예외를 던질 수 있다. 제출 핸들러는 `try`로 감싸고 `showFormAlert`으로 안내한다
- 제출 중에는 `withSubmitLock($form, fn)` 으로 버튼을 잠가 두 번 눌리지 않게 한다
- **사용자 입력을 화면에 넣을 때 `innerHTML` 금지.** `createElement` + `textContent` 만 사용한다
  (제목에 `<script>`를 넣은 글 하나가 모든 방문자의 브라우저에서 실행될 수 있다)
- 목록처럼 여러 요소를 붙일 때는 `DocumentFragment`로 모아 한 번에 넣는다
- 스크롤·리사이즈 핸들러는 `requestAnimationFrame`으로 묶는다
- 등장 애니메이션은 스크롤 이벤트 대신 `IntersectionObserver`
- 검색 입력처럼 자주 발생하는 이벤트는 디바운스(200ms)
- 목록·페이지 버튼 등 동적으로 만든 요소의 클릭은 `document`에 이벤트 위임

```js
// main.js — 데이터가 서버에 있으므로 순서가 중요하다
document.addEventListener('DOMContentLoaded', () => {
  // 통신이 실패해도 이건 동작해야 한다
  initTheme();
  initNav();
  initFooterYear();

  startApp();
});

async function startApp() {
  setLoading(true);
  try {
    await bootstrapStore();       // 서버에 한 번만 다녀온다
  } catch (error) {
    setLoading(false);
    showAppStatus(error.message); // 화면 위쪽에 안내 + 다시 시도 버튼
    return;
  }
  setLoading(false);
  initAuthUI();

  if (typeof initPostList === 'function') initPostList();
  // … 페이지별 초기화

  initScrollReveal();
}
```

## 7. 폼 규칙

- `novalidate`를 붙이고 검증은 자바스크립트가 한다 (안내 문구를 한국어로 통일하기 위해)
- 필드 구조는 `label` → `input` → `.field__hint` → `.field__error` 순서
- 오류는 `setFieldError($input, message)` 로 넣는다. `aria-invalid`가 함께 설정된다
- 폼 전체에 걸리는 오류는 `showFormAlert($form, message)` — `.alert`에 `role="alert"`
- 제출 처리 첫 줄은 항상 `e.preventDefault()` + `clearFormErrors($form)`
- 검증 실패 시 첫 번째 오류 필드로 `focus()`
