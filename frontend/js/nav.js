/* ============================================
   nav.js — 헤더 상태, 모바일 메뉴, 스크롤 스파이, 등장 애니메이션
   ============================================ */

const SCROLL_THRESHOLD = 50;
const DESKTOP_QUERY = '(min-width: 768px)';

/* --- 모바일 메뉴 --- */
function initMenu() {
  const $toggle = document.getElementById('nav-toggle');
  const $nav = document.getElementById('nav');
  if (!$toggle || !$nav) return;

  const setOpen = (open) => {
    $nav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    $toggle.setAttribute('aria-expanded', String(open));
    $toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  };

  $toggle.addEventListener('click', () => {
    setOpen($toggle.getAttribute('aria-expanded') !== 'true');
  });

  // 메뉴 항목을 누르면 닫는다
  $nav.addEventListener('click', (e) => {
    if (e.target.closest('.nav__link')) setOpen(false);
  });

  // ESC로 닫는다
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // 데스크톱 폭으로 넓어지면 열린 상태를 정리한다
  window.matchMedia(DESKTOP_QUERY).addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/* --- 스크롤 시 헤더 배경 --- */
function initHeaderState() {
  const $header = document.getElementById('header');
  if (!$header) return;

  let ticking = false;

  const update = () => {
    $header.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
}

/* --- 현재 보고 있는 페이지의 메뉴에 .active ---
   페이지가 분리되어 있으므로 스크롤 위치가 아니라 파일명으로 판단한다. */
function initActiveNav() {
  const current = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav__link').forEach(($link) => {
    if ($link.getAttribute('href') !== current) return;
    $link.classList.add('active');
    $link.setAttribute('aria-current', 'page');
  });
}

/* --- 섹션 등장 애니메이션 --- */
function initScrollReveal() {
  const $targets = document.querySelectorAll('.reveal');
  if (!$targets.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target); // 한 번만 실행
    });
  }, { threshold: 0.12 });

  $targets.forEach(($el) => observer.observe($el));
}

function initNav() {
  initMenu();
  initHeaderState();
  initActiveNav();
}
