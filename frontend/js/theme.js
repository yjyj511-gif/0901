/* ============================================
   theme.js — 다크 모드 토글
   최초 적용은 index.html <head>의 인라인 스크립트가 담당한다(깜빡임 방지).
   여기서는 토글 버튼 동작과 상태 저장만 처리한다.
   ============================================ */

const STORAGE_KEY = 'theme';

function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function syncToggleLabel($toggle, theme) {
  const isDark = theme === 'dark';
  $toggle.setAttribute('aria-pressed', String(isDark));
  $toggle.setAttribute('aria-label', isDark ? '라이트 모드 전환' : '다크 모드 전환');
}

function applyTheme(theme, $toggle) {
  document.documentElement.dataset.theme = theme;
  syncToggleLabel($toggle, theme);

  // 사용자가 직접 고른 값만 저장한다.
  // (초기 상태까지 저장하면 시스템 설정 변경을 더 이상 따라가지 못한다)
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    /* localStorage를 못 쓰는 환경에서는 저장만 건너뛴다 */
  }
}

function initTheme() {
  const $toggle = document.getElementById('theme-toggle');
  if (!$toggle) return;

  syncToggleLabel($toggle, getTheme());

  $toggle.addEventListener('click', () => {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark', $toggle);
  });
}
