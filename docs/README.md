# 개인 프로필 페이지 — 문서

HTML / CSS / JavaScript(바닐라)로 만드는 1페이지 개인 프로필 사이트의 기획·설계 문서 모음입니다.

## 문서 목록

| 문서 | 내용 | 언제 보나 |
|---|---|---|
| [01-requirements.md](01-requirements.md) | 목표, 대상, 기능 요구사항, 비기능 요구사항 | 무엇을 만들지 정할 때 |
| [02-ui-design.md](02-ui-design.md) | 섹션 구성, 와이어프레임, 반응형 규칙 | 화면을 그릴 때 |
| [03-style-guide.md](03-style-guide.md) | 색상·타이포·간격 토큰, 컴포넌트 스타일 | CSS를 작성할 때 |
| [04-structure.md](04-structure.md) | 폴더/파일 구조, 네이밍 규칙, 데이터 형식 | 코드를 배치할 때 |
| [05-checklist.md](05-checklist.md) | 구현 순서와 완료 조건 | 개발 진행 중 |
| [06-content.md](06-content.md) | 실제 채워 넣을 내 정보 (작성 필요) | 텍스트를 넣을 때 |

## 진행 방식

1. `06-content.md`에 본인 정보를 채운다. ← **가장 먼저 할 일**
2. `04-structure.md`대로 `frontend/`에 파일을 만든다.
3. `02-ui-design.md`의 섹션 순서대로 HTML 마크업을 작성한다.
4. `03-style-guide.md`의 토큰을 `:root` 변수로 넣고 스타일을 입힌다.
5. `05-checklist.md`를 위에서부터 체크하며 마무리한다.

## 기술 스택

- HTML5 (시맨틱 마크업)
- CSS3 (커스텀 프로퍼티, Flexbox, Grid, 미디어 쿼리)
- JavaScript ES6+ (프레임워크·빌드 도구 없음)
- 배포: GitHub Pages 등 정적 호스팅
