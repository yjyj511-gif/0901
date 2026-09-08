/* ============================================
   profile.js — 프로필 페이지 (profile.html)

   ?user=<id> 가 있으면 그 사람의 공개 프로필,
   없으면 내 프로필(수정 가능)을 보여 준다.
   ============================================ */

/* 내가 쓴 글 목록 (수정/삭제 버튼 포함) */
function createMyPostRow(post, editable) {
  const $li = document.createElement('li');
  $li.className = 'my-post';

  const $main = document.createElement('div');
  $main.className = 'my-post__main';

  const $link = document.createElement('a');
  $link.className = 'my-post__title';
  $link.href = 'post.html?id=' + encodeURIComponent(post.id);
  $link.textContent = post.title;

  const $meta = document.createElement('p');
  $meta.className = 'my-post__meta';
  $meta.textContent = `${formatDate(post.createdAt)} · 조회 ${post.views || 0}`;

  $main.append($link, $meta);
  $li.appendChild($main);

  if (editable) {
    const $actions = document.createElement('div');
    $actions.className = 'my-post__actions';

    const $edit = document.createElement('a');
    $edit.className = 'btn btn--outline btn--sm';
    $edit.href = 'write.html?id=' + encodeURIComponent(post.id);
    $edit.textContent = '수정';

    const $del = document.createElement('button');
    $del.type = 'button';
    $del.className = 'btn btn--danger btn--sm';
    $del.textContent = '삭제';
    $del.addEventListener('click', () => {
      if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;
      deletePost(post.id);
      renderProfilePage();
    });

    $actions.append($edit, $del);
    $li.appendChild($actions);
  }

  return $li;
}

/* 프로필 본문 전체를 다시 그린다 (삭제 후에도 재사용) */
function renderProfilePage() {
  const params = new URLSearchParams(location.search);
  const viewedId = params.get('user');
  const me = getCurrentUser();

  const user = viewedId ? getUserById(viewedId) : me;
  const isMe = !!user && !!me && user.id === me.id;

  const $notFound = document.getElementById('profile-not-found');
  const $body = document.getElementById('profile-body');

  if (!user) {
    if ($body) $body.hidden = true;
    if ($notFound) $notFound.hidden = false;
    return;
  }

  if ($notFound) $notFound.hidden = true;
  if ($body) $body.hidden = false;

  document.title = user.username + ' | Devlog';

  const posts = getPostsByAuthor(user.id);
  const views = posts.reduce((sum, p) => sum + (p.views || 0), 0);

  document.getElementById('profile-avatar').textContent = user.username.slice(0, 1);
  document.getElementById('profile-name').textContent = user.username;
  document.getElementById('profile-email').textContent = isMe ? user.email : '';
  document.getElementById('profile-joined').textContent = formatDate(user.createdAt) + ' 가입';
  document.getElementById('profile-bio').textContent =
    user.bio || (isMe ? '아직 소개가 없습니다. 아래에서 채워 보세요.' : '아직 소개가 없습니다.');

  document.getElementById('stat-posts').textContent = String(posts.length);
  document.getElementById('stat-views').textContent = String(views);
  document.getElementById('stat-tags').textContent = String(
    new Set(posts.flatMap((p) => p.tags)).size
  );

  // 내 프로필일 때만 수정 폼과 글 관리 버튼을 보여 준다
  document.querySelectorAll('[data-owner-only]').forEach(($el) => { $el.hidden = !isMe; });

  const $heading = document.getElementById('posts-heading');
  if ($heading) $heading.textContent = isMe ? '내가 쓴 글' : `${user.username}님이 쓴 글`;

  const $list = document.getElementById('my-posts');
  const $empty = document.getElementById('my-posts-empty');
  if ($list) {
    $list.textContent = '';
    posts.forEach((post) => $list.appendChild(createMyPostRow(post, isMe)));
  }
  if ($empty) {
    $empty.hidden = posts.length > 0;
    $empty.textContent = isMe ? '아직 쓴 글이 없습니다.' : '아직 쓴 글이 없습니다.';
  }

  // 수정 폼 초깃값
  const $form = document.getElementById('profile-form');
  if ($form && isMe) {
    $form.elements.username.value = user.username;
    $form.elements.bio.value = user.bio || '';
  }
}

function initProfilePage() {
  const $body = document.getElementById('profile-body');
  if (!$body) return;

  // 남의 프로필은 로그인 없이도 볼 수 있다. 내 프로필만 로그인을 요구한다.
  const viewedId = new URLSearchParams(location.search).get('user');
  if (!viewedId && !requireLogin()) return;

  renderProfilePage();

  const $form = document.getElementById('profile-form');
  if ($form) {
    $form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFormErrors($form);

      const me = getCurrentUser();
      if (!me) return;

      const $username = $form.elements.username;
      const username = $username.value.trim();

      if (username.length < 2 || username.length > 20) {
        setFieldError($username, '닉네임은 2자 이상 20자 이하로 입력해 주세요.');
        $username.focus();
        return;
      }

      const result = updateUser(me.id, { username, bio: $form.elements.bio.value.trim() });
      if (!result.ok) {
        if (result.field && $form.elements[result.field]) {
          setFieldError($form.elements[result.field], result.message);
        } else {
          showFormAlert($form, result.message);
        }
        return;
      }

      const $saved = document.getElementById('profile-saved');
      if ($saved) {
        $saved.hidden = false;
        setTimeout(() => { $saved.hidden = true; }, 2500);
      }

      renderProfilePage();
      initAuthUI(); // 헤더의 닉네임도 갱신한다
    });
  }

  const $passwordForm = document.getElementById('password-form');
  if ($passwordForm) {
    $passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFormErrors($passwordForm);

      const me = getCurrentUser();
      if (!me) return;

      const $current = $passwordForm.elements.current;
      const $next = $passwordForm.elements.next;
      const $confirm = $passwordForm.elements.nextConfirm;

      if (hashPassword($current.value) !== me.passwordHash) {
        setFieldError($current, '현재 비밀번호가 올바르지 않습니다.');
        $current.focus();
        return;
      }
      if ($next.value.length < 8) {
        setFieldError($next, '새 비밀번호는 8자 이상이어야 합니다.');
        $next.focus();
        return;
      }
      if ($next.value !== $confirm.value) {
        setFieldError($confirm, '새 비밀번호가 서로 다릅니다.');
        $confirm.focus();
        return;
      }

      updateUser(me.id, { passwordHash: hashPassword($next.value) });
      $passwordForm.reset();

      const $done = document.getElementById('password-saved');
      if ($done) {
        $done.hidden = false;
        setTimeout(() => { $done.hidden = true; }, 2500);
      }
    });
  }
}
