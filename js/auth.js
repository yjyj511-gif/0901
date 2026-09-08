/* ============================================
   auth.js — 회원가입 / 로그인 / 로그아웃 / 접근 제어

   헤더의 로그인 상태 표시는 모든 페이지에서 동작하고,
   폼 처리는 해당 폼이 있는 페이지에서만 동작한다.
   ============================================ */

/* --- 폼 공통 헬퍼 --- */

/* 필드 아래 빨간 안내문을 채우고 aria-invalid를 맞춘다 */
function setFieldError($input, message) {
  const $field = $input.closest('.field');
  const $error = $field ? $field.querySelector('.field__error') : null;
  if ($error) $error.textContent = message || '';
  $input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function clearFormErrors($form) {
  $form.querySelectorAll('.field__error').forEach(($e) => { $e.textContent = ''; });
  $form.querySelectorAll('[aria-invalid]').forEach(($i) => $i.setAttribute('aria-invalid', 'false'));
  const $alert = $form.querySelector('.alert');
  if ($alert) {
    $alert.textContent = '';
    $alert.hidden = true;
  }
}

/* 폼 전체에 걸리는 오류 (예: 비밀번호 불일치) */
function showFormAlert($form, message) {
  const $alert = $form.querySelector('.alert');
  if (!$alert) return;
  $alert.textContent = message;
  $alert.hidden = false;
}

/* 로그인 후 돌아갈 주소. 외부 사이트로 튕기지 않도록 같은 폴더의 html만 허용한다. */
function safeRedirect(fallback) {
  const next = new URLSearchParams(location.search).get('next');
  if (next && /^[\w-]+\.html(\?[^#]*)?$/.test(next)) return next;
  return fallback;
}

/* --- 헤더: 로그인 상태에 따른 메뉴 ---
   data-auth="in" 은 로그인했을 때만, "out" 은 로그아웃 상태일 때만 보인다.
   실제로 숨기는 일은 CSS(.is-auth / .is-guest)가 한다. 각 페이지 <head>의
   인라인 스크립트가 렌더 전에 클래스를 붙여 두므로 메뉴가 깜빡이지 않는다. */
function initAuthUI() {
  const user = getCurrentUser();

  document.documentElement.classList.toggle('is-auth', !!user);
  document.documentElement.classList.toggle('is-guest', !user);

  document.querySelectorAll('[data-user-name]').forEach(($el) => {
    $el.textContent = user ? user.username : '';
  });

  const $logout = document.getElementById('logout-btn');
  if ($logout) {
    $logout.addEventListener('click', () => {
      logout();
      location.href = 'index.html';
    });
  }
}

/* --- 로그인이 필요한 페이지에서 호출 ---
   비로그인 상태면 로그인 페이지로 보내고 false를 돌려준다. */
function requireLogin() {
  const user = getCurrentUser();
  if (user) return user;

  const here = location.pathname.split('/').pop() + location.search;
  location.replace('login.html?next=' + encodeURIComponent(here));
  return null;
}

/* --- 회원가입 --- */
function initSignupForm() {
  const $form = document.getElementById('signup-form');
  if (!$form) return;

  // 이미 로그인한 사람은 홈으로
  if (getCurrentUser()) {
    location.replace('index.html');
    return;
  }

  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFormErrors($form);

    const $username = $form.elements.username;
    const $email = $form.elements.email;
    const $password = $form.elements.password;
    const $confirm = $form.elements.passwordConfirm;
    const $bio = $form.elements.bio;
    const $agree = $form.elements.agree;

    const username = $username.value.trim();
    const email = $email.value.trim();
    const password = $password.value;

    let valid = true;

    if (username.length < 2 || username.length > 20) {
      setFieldError($username, '닉네임은 2자 이상 20자 이하로 입력해 주세요.');
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError($email, '이메일 형식이 올바르지 않습니다.');
      valid = false;
    }
    if (password.length < 8) {
      setFieldError($password, '비밀번호는 8자 이상이어야 합니다.');
      valid = false;
    }
    if (password !== $confirm.value) {
      setFieldError($confirm, '비밀번호가 서로 다릅니다.');
      valid = false;
    }
    if (!$agree.checked) {
      showFormAlert($form, '약관에 동의해야 가입할 수 있습니다.');
      valid = false;
    }

    if (!valid) {
      const $first = $form.querySelector('[aria-invalid="true"]');
      if ($first) $first.focus();
      return;
    }

    const result = createUser({ username, email, password, bio: $bio.value.trim() });
    if (!result.ok) {
      if (result.field && $form.elements[result.field]) {
        setFieldError($form.elements[result.field], result.message);
        $form.elements[result.field].focus();
      } else {
        showFormAlert($form, result.message);
      }
      return;
    }

    // 가입 직후 바로 로그인 상태로 만든다
    login(email, password);
    location.href = 'index.html';
  });
}

/* --- 로그인 --- */
function initLoginForm() {
  const $form = document.getElementById('login-form');
  if (!$form) return;

  if (getCurrentUser()) {
    location.replace(safeRedirect('index.html'));
    return;
  }

  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFormErrors($form);

    const $account = $form.elements.account;
    const $password = $form.elements.password;

    if (!$account.value.trim()) {
      setFieldError($account, '이메일 또는 닉네임을 입력해 주세요.');
      $account.focus();
      return;
    }
    if (!$password.value) {
      setFieldError($password, '비밀번호를 입력해 주세요.');
      $password.focus();
      return;
    }

    const result = login($account.value.trim(), $password.value);
    if (!result.ok) {
      showFormAlert($form, result.message);
      $password.value = '';
      $password.focus();
      return;
    }

    location.href = safeRedirect('index.html');
  });

  // 데모 계정 채우기 버튼
  const $demo = document.getElementById('demo-fill');
  if ($demo) {
    $demo.addEventListener('click', () => {
      $form.elements.account.value = 'demo@blog.dev';
      $form.elements.password.value = 'demo1234';
      $form.elements.account.focus();
    });
  }
}
