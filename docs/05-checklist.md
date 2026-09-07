# 05. 개발 체크리스트

위에서부터 순서대로 진행하면 된다. 각 단계 끝에서 브라우저를 열어 확인할 것.

## STEP 0. 준비

- [ ] `docs/06-content.md`에 내 정보 채우기
- [ ] 프로필 사진 준비 (정사각 400×400, WebP 또는 JPG, 200KB 이하)
- [ ] 프로젝트 썸네일 준비 (16:9, 800×450)
- [ ] `frontend/` 하위 폴더 생성 (`css`, `js`, `assets/images`, `assets/icons`)

## STEP 1. 뼈대

- [ ] `index.html` 생성 — `04-structure.md`의 HTML 뼈대 복사
- [ ] 섹션 5개(`#home`, `#about`, `#skills`, `#projects`, `#contact`) 빈 껍데기로 배치
- [ ] `reset.css` 작성 (`margin/padding 0`, `box-sizing: border-box`, 이미지 `display:block; max-width:100%`)
- [ ] `variables.css`에 `03-style-guide.md`의 토큰 전부 선언
- [ ] `style.css` 연결 확인 (배경색이 바뀌는지로 테스트)

## STEP 2. 레이아웃

- [ ] `.container` 정의 (`max-width: var(--container); margin-inline: auto; padding-inline: var(--space-3)`)
- [ ] 섹션 공통 상하 여백 적용
- [ ] 섹션 제목(h2 + 밑줄) 공통 스타일
- [ ] 헤더 sticky 고정 + 메뉴 가로 배치

## STEP 3. 섹션별 마크업 & 스타일

- [ ] **Hero** — 프로필 이미지(원형), 이름, 한 줄 소개, 버튼 2개
- [ ] **About** — 자기소개 문단 + 정보 배지
- [ ] **Skills** — 카테고리 + 태그 pill
- [ ] **Projects** — 카드 그리드 (일단 HTML에 하드코딩 1개로 모양 잡기)
- [ ] **Contact** — mailto 버튼 + SNS 아이콘 링크
- [ ] **Footer** — 저작권 문구

## STEP 4. 반응형

- [ ] 모바일(360px)에서 가로 스크롤이 생기지 않는지 확인
- [ ] `@media (min-width: 768px)` — 프로젝트 2열, Hero 가로 배치
- [ ] `@media (min-width: 1024px)` — 프로젝트 3열
- [ ] 햄버거 버튼 마크업 + 모바일 메뉴 스타일

## STEP 5. JavaScript

- [ ] `theme.js` — 토글 클릭 시 `data-theme` 전환, `localStorage` 저장/복원
- [ ] `nav.js` — 햄버거 열기/닫기, 메뉴 클릭 시 닫기, `aria-expanded` 갱신
- [ ] `nav.js` — 스크롤 50px 초과 시 헤더에 `.scrolled`
- [ ] `nav.js` — IntersectionObserver로 현재 섹션 메뉴에 `.active`
- [ ] `projects.js` — 데이터 배열 → 카드 DOM 생성 (하드코딩 카드 제거)
- [ ] 등장 애니메이션 (IntersectionObserver + `.visible`)
- [ ] `main.js`에서 초기화 함수 호출

## STEP 6. 콘텐츠 채우기

- [ ] 이름, 소개, 스킬, 프로젝트를 실제 내용으로 교체
- [ ] 모든 링크 실제 URL로 교체 (`#` 남아있지 않게)
- [ ] 이미지 경로 확인 (깨진 이미지 0개)
- [ ] `<title>`, `meta description`, OG 태그 작성

## STEP 7. 마무리 점검

### 기능
- [ ] 메뉴 클릭 → 해당 섹션으로 스크롤
- [ ] 다크 모드 전환 후 새로고침해도 유지
- [ ] 외부 링크에 `target="_blank" rel="noopener noreferrer"`
- [ ] 콘솔 에러/경고 0건

### 접근성
- [ ] 모든 `<img>`에 의미 있는 `alt`
- [ ] 아이콘 전용 링크·버튼에 `aria-label`
- [ ] Tab 키만으로 모든 링크·버튼 접근 가능, 포커스 표시가 보임
- [ ] 다크/라이트 양쪽에서 텍스트 대비 충분
- [ ] `prefers-reduced-motion`에서 애니메이션 비활성화

### 성능
- [ ] 이미지 압축 완료
- [ ] 첫 화면 밖 이미지에 `loading="lazy"`
- [ ] 프로필 이미지에 `width`/`height` 지정 (레이아웃 흔들림 방지)

### 브라우저
- [ ] Chrome, Edge, 모바일 크롬(또는 개발자도구 기기 모드)에서 확인

## STEP 8. 배포 (선택)

- [ ] Git 저장소 초기화, GitHub에 push
- [ ] GitHub Pages 활성화 (Settings → Pages → 브랜치 선택)
- [ ] 배포 URL에서 이미지·CSS 경로 깨지지 않는지 확인 (상대 경로 사용)
