/* ============================================
   main.js — 진입점

   모든 페이지가 마지막에 이 파일을 불러온다.
   페이지마다 필요한 스크립트만 <script>로 넣으므로,
   여기서는 "있으면 부른다" 방식으로 호출한다.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedIfEmpty();     // store.js — 첫 방문이면 예시 글을 넣는다

  initTheme();       // theme.js
  initNav();         // nav.js — 메뉴 / 헤더 / 현재 페이지 표시
  initAuthUI();      // auth.js — 로그인 상태에 따른 헤더

  // 페이지별 초기화 (해당 스크립트를 불러온 페이지에서만 존재한다)
  if (typeof renderProjects === 'function') renderProjects();
  if (typeof initPostList === 'function') initPostList();
  if (typeof initPostDetail === 'function') initPostDetail();
  if (typeof initWriteForm === 'function') initWriteForm();
  if (typeof initProfilePage === 'function') initProfilePage();
  if (typeof initSignupForm === 'function') initSignupForm();
  if (typeof initLoginForm === 'function') initLoginForm();

  initScrollReveal();// nav.js — 내용이 그려진 뒤 관찰을 시작한다
  initFooterYear();
});

function initFooterYear() {
  const $year = document.getElementById('year');
  if ($year) $year.textContent = String(new Date().getFullYear());
}
