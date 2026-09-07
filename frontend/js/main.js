/* ============================================
   main.js — 진입점
   각 모듈의 init 함수를 여기서 한 번만 호출한다.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();       // theme.js
  initNav();         // nav.js — 메뉴 / 헤더 / 현재 페이지 표시

  // projects.js는 projects.html에서만 불러오므로 존재할 때만 호출한다
  if (typeof renderProjects === 'function') renderProjects();

  initScrollReveal();// nav.js — 카드가 그려진 뒤 관찰을 시작한다
  initFooterYear();
});

function initFooterYear() {
  const $year = document.getElementById('year');
  if ($year) $year.textContent = String(new Date().getFullYear());
}
