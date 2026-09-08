/* ============================================
   profile.js — 프로필 페이지 (profile.html)

   ?user=<id> 가 있으면 그 사람의 공개 프로필,
   없으면 내 프로필(수정 가능)을 보여 준다.

   비밀번호 확인은 서버가 한다. 예전에는 해시를 브라우저에서 비교했는데,
   이제 해시가 클라이언트로 내려오지 않으므로 changePassword로 넘긴다.
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
    $del.addEventListener('click', async () => {
      if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;

      $del.disabled = true;
      $del.textContent = '삭제 중…';

      try {
        const result = await deletePost(post.id);
        if (!result.ok) throw new Error(result.message);
      } catch (error) {
        window.alert('삭제하지 못했습니다. ' + error.message);
        $del.disabled = false;
        $del.textContent = '삭제';
        return;
      }

      renderProfilePage();
    });

    $actions.append($edit, $del);
    $li.appendChild($actions);
  }

  return $li;
}

/* 프로필 본문 전체를 다시 그린다 (삭제·저장 후에도 재사용) */
function renderProfilePage() {
  const viewedId = new URLSearchParams(location.search).get('user');
  const me = getCurrentUser();

  // 공개 프로필은 bootstrap이 함께 받아 왔다
  const user = viewedId ? getViewedUser() : me;
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
    new Set(posts.flatMap((p) => p.tags || [])).size
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
    $empty.textContent = '아직 쓴 글이 없습니다.';
  }

  // 수정 폼 초깃값
  const $form = document.getElementById('profile-form');
  if ($form && isMe) {
    $form.elements.username.value = user.username;
    $form.elements.bio.value = user.bio || '';
  }
}

/* 저장 완료 안내를 잠깐 띄운다 */
function flashNotice(id) {
  const $notice = document.getElementById(id);
  if (!$notice) return;
  $notice.hidden = false;
  setTimeout(() => { $notice.hidden = true; }, 2500);
}

function initProfilePage() {
  const $body = document.getElementById('profile-body');
  if (!$body) return;

  // 남의 프로필은 로그인 없이도 볼 수 있다. 내 프로필만 로그인을 요구한다.
  const viewedId = new URLSearchParams(location.search).get('user');
  if (!viewedId && !requireLogin()) return;

  renderProfilePage();

  /* --- 프로필 수정 --- */
  const $form = document.getElementById('profile-form');
  if ($form) {
    $form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFormErrors($form);

      if (!getCurrentUser()) return;

      const $username = $form.elements.username;
      const username = $username.value.trim();

      if (username.length < 2 || username.length > 20) {
        setFieldError($username, '닉네임은 2자 이상 20자 이하로 입력해 주세요.');
        $username.focus();
        return;
      }

      withSubmitLock($form, async () => {
        let result;
        try {
          result = await updateUser({ username, bio: $form.elements.bio.value.trim() });
        } catch (error) {
          showFormAlert($form, error.message);
          return;
        }

        if (!result.ok) {
          applyServerError($form, result);
          return;
        }

        flashNotice('profile-saved');
        renderProfilePage();
        initAuthUI();   // 헤더의 닉네임도 갱신한다
      });
    });
  }

  /* --- 비밀번호 변경 --- */
  const $passwordForm = document.getElementById('password-form');
  if ($passwordForm) {
    $passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFormErrors($passwordForm);

      if (!getCurrentUser()) return;

      const $current = $passwordForm.elements.current;
      const $next = $passwordForm.elements.next;
      const $confirm = $passwordForm.elements.nextConfirm;

      // 현재 비밀번호가 맞는지는 서버만 안다. 여기서는 형식만 본다.
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

      withSubmitLock($passwordForm, async () => {
        let result;
        try {
          result = await changePassword($current.value, $next.value);
        } catch (error) {
          showFormAlert($passwordForm, error.message);
          return;
        }

        if (!result.ok) {
          applyServerError($passwordForm, result);
          return;
        }

        $passwordForm.reset();
        flashNotice('password-saved');
      });
    });
  }
}
