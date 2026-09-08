# 개인 블로그 — 문서

HTML / CSS / JavaScript(바닐라)로 만드는 개인 블로그의 기획·설계 문서 모음입니다.

> **문서 상태 안내**
> 이 프로젝트는 처음에 *1페이지 개인 프로필 사이트*로 시작했고, 이후 블로그 구조로 바뀌었습니다.
> 예전 프로필 사이트의 내용은 `about.html`(소개 페이지)로 옮겨 살아 있습니다.
> 아래 표의 **상태** 칸을 확인하세요.

## 문서 목록

| 문서 | 내용 | 상태 |
|---|---|---|
| [01-requirements.md](01-requirements.md) | 목표, 대상, 기능 요구사항 | ⚠️ 프로필 기준 |
| [02-ui-design.md](02-ui-design.md) | 섹션 구성, 와이어프레임, 반응형 규칙 | 🔸 소개 페이지에만 해당 |
| [03-style-guide.md](03-style-guide.md) | 색상·타이포·간격 토큰, 컴포넌트 스타일 | ✅ 그대로 유효 |
| [04-structure.md](04-structure.md) | 폴더/파일 구조, 데이터 형식, 코딩 규칙 | ✅ 블로그 기준 |
| [05-checklist.md](05-checklist.md) | 구현 순서와 완료 조건 | ⚠️ 프로필 기준 |
| [06-content.md](06-content.md) | 채워 넣을 내 정보 | 🔸 소개 페이지에만 해당 |

현재 구현된 페이지 목록과 실행 방법은 [최상위 README](../README.md)를 보세요.

## 기술 스택

- HTML5 (시맨틱 마크업)
- CSS3 (커스텀 프로퍼티, Flexbox, Grid, 미디어 쿼리, 다크 모드)
- JavaScript ES6+ (프레임워크·빌드 도구 없음)
- 저장소: 브라우저 `localStorage` (서버 없음 — [04번 문서 2절](04-structure.md#2-데이터-저장-방식) 참고)
- 배포: GitHub Pages 등 정적 호스팅
