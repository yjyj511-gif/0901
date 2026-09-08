# Devlog — 개인 블로그

HTML / CSS / 바닐라 자바스크립트로 만든 개인 블로그입니다.
빌드 도구와 서버 없이 동작하며, 회원과 게시글은 브라우저 `localStorage`에 저장됩니다.

## 실행

**반드시 서버로 띄워야 합니다.** `index.html`을 더블클릭해서 열면(`file://`)
브라우저가 API 요청을 CORS로 막습니다.

```bash
python -m http.server 8000
# http://localhost:8000
```

먼저 [`backend/README.md`](backend/README.md)의 설치 절차를 마치고
`js/config.js`에 배포 주소를 넣어야 동작합니다.

시트에는 예시 글 3편과 데모 계정이 들어 있습니다.

- 이메일 `demo@blog.dev`
- 비밀번호 `demo1234`

로그인 페이지의 **데모 계정 채우기** 버튼으로도 넣을 수 있습니다.

## 페이지

| 페이지 | 파일 | 설명 |
|---|---|---|
| 게시글 목록 | `index.html` | 검색, 태그 필터, 페이지네이션(6개/쪽) |
| 소개 | `about.html` | 블로그 주인 소개 — About / Skills / Projects / Contact |
| 게시글 상세 | `post.html?id=…` | 본문, 태그, 조회수, 이전/다음 글. 작성자에게만 수정·삭제 |
| 게시글 작성 | `write.html` | `?id=` 가 붙으면 수정 모드. 로그인 필요 |
| 로그인 | `login.html` | 이메일 또는 닉네임으로 로그인 |
| 회원가입 | `signup.html` | 닉네임·이메일 중복 확인, 비밀번호 8자 이상 |
| 프로필 | `profile.html` | 통계, 내 글 관리, 프로필·비밀번호 수정. `?user=` 는 공개 프로필 |

**소개**와 **프로필**은 다릅니다. `about.html`은 블로그 주인을 소개하는 공개 정적 페이지고,
`profile.html`은 로그인한 사용자의 계정 화면입니다.

## 구조

```
브라우저 (GitHub Pages)          Apps Script 웹앱           구글 스프레드시트
  js/store.js  ──fetch──▶  doGet / doPost  ──▶  users / posts / sessions
```

- 회원과 게시글은 **구글 스프레드시트**에 저장됩니다. 기기를 바꿔도 같은 글이 보입니다.
- 서버 코드는 [`backend/Code.gs`](backend/Code.gs) 하나입니다.
- 프론트엔드에서 서버와 이야기하는 파일은 `js/store.js` 하나뿐입니다.
- 페이지가 뜰 때 `bootstrap`을 한 번만 호출해 데이터를 받아 두므로,
  읽기 함수는 동기이고 실제로 서버를 오가는 쓰기 함수만 비동기입니다.

## 기술 스택

- HTML5 (시맨틱 마크업)
- CSS3 (커스텀 프로퍼티, Flexbox, Grid, 미디어 쿼리, 다크 모드)
- JavaScript ES6+ (프레임워크·빌드 도구 없음)
- 백엔드: Google Apps Script + 스프레드시트
- 배포: GitHub Pages 등 정적 호스팅

## 주의

학습용 프로젝트입니다. API 주소가 프론트엔드 코드에 들어 있어
**누구나 소스를 보고 API를 직접 호출할 수 있습니다.**

비밀번호는 솔트를 섞어 해시한 뒤 저장하고 해시가 브라우저로 내려오지는 않지만,
그래도 **실제로 쓰는 비밀번호는 입력하지 마세요.**

## 문서

설계 문서는 [`docs/`](docs/README.md)에 있습니다.
