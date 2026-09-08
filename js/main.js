/* ============================================
   main.js — 진입점

   모든 페이지가 마지막에 이 파일을 불러온다.
   페이지마다 필요한 스크립트만 <script>로 넣으므로,
   여기서는 "있으면 부른다" 방식으로 호출한다.

   데이터가 서버(스프레드시트)에 있으므로 순서가 중요하다.
   테마·메뉴처럼 데이터가 필요 없는 것을 먼저 켜서 화면이 죽지 않게 하고,
   bootstrapStore()가 끝난 뒤에 내용을 그린다.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 데이터와 무관한 것부터 — 통신이 실패해도 이건 동작해야 한다
  initTheme();       // theme.js
  initNav();         // nav.js — 메뉴 / 헤더 / 현재 페이지 표시
  initFooterYear();

  // 소개 페이지의 프로젝트 카드는 상수 배열이라 서버가 필요 없다
  if (typeof renderProjects === 'function') renderProjects();

  startApp();
});

async function startApp() {
  setLoading(true);
  hideAppStatus();

  try {
    await bootstrapStore();   // store.js — 서버에 한 번만 다녀온다
  } catch (error) {
    setLoading(false);
    showAppStatus(error.message);
    // 로그인 메뉴라도 맞게 보이도록 비로그인 상태로 정리한다
    initAuthUI();
    initScrollReveal();
    return;
  }

  setLoading(false);
  initAuthUI();      // auth.js — 로그인 상태에 따른 헤더

  // 페이지별 초기화 (해당 스크립트를 불러온 페이지에서만 존재한다)
  if (typeof initPostList === 'function') initPostList();
  if (typeof initPostDetail === 'function') initPostDetail();
  if (typeof initWriteForm === 'function') initWriteForm();
  if (typeof initProfilePage === 'function') initProfilePage();
  if (typeof initSignupForm === 'function') initSignupForm();
  if (typeof initLoginForm === 'function') initLoginForm();

  initScrollReveal();// nav.js — 내용이 그려진 뒤 관찰을 시작한다
}

/* --- 통신 중 표시 --- */
function setLoading(on) {
  document.body.classList.toggle('is-loading', on);
}

/* --- 통신 실패 안내 --- */
function showAppStatus(message) {
  const $wrap = document.getElementById('app-status');
  const $text = document.getElementById('app-status-text');
  if (!$wrap || !$text) return;

  $text.textContent = message;
  $wrap.hidden = false;

  const $retry = document.getElementById('app-retry');
  if ($retry && !$retry.dataset.bound) {
    $retry.dataset.bound = 'true';
    $retry.addEventListener('click', () => location.reload());
  }
}

function hideAppStatus() {
  const $wrap = document.getElementById('app-status');
  if ($wrap) $wrap.hidden = true;
}

function initFooterYear() {
  const $year = document.getElementById('year');
  if ($year) $year.textContent = String(new Date().getFullYear());
}
