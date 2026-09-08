/* ============================================
   write.js — 게시글 작성 / 수정 페이지 (write.html)

   ?id= 가 있으면 수정, 없으면 새 글이다.
   수정은 작성자 본인만 열 수 있다.
   ============================================ */

const MAX_TITLE = 80;
const MAX_TAGS = 5;

/* "css, javascript, css" → ["css", "javascript"] (공백 제거, 중복 제거, 최대 5개) */
function parseTags(value) {
  const seen = new Set();
  const tags = [];

  value.split(',').forEach((raw) => {
    const tag = raw.trim().replace(/^#/, '');
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  });

  return tags.slice(0, MAX_TAGS);
}

/* 입력 중인 태그를 아래에 미리 보여 준다 */
function renderTagPreview(value) {
  const $preview = document.getElementById('tag-preview');
  if (!$preview) return;

  const tags = parseTags(value);
  $preview.textContent = '';
  tags.forEach((tag) => {
    const $li = document.createElement('li');
    $li.className = 'tag';
    $li.textContent = '#' + tag;
    $preview.appendChild($li);
  });
}

function initWriteForm() {
  const $form = document.getElementById('write-form');
  if (!$form) return;

  const user = requireLogin();
  if (!user) return; // 로그인 페이지로 이동 중

  const id = new URLSearchParams(location.search).get('id');
  const editing = id ? getPostById(id) : null;

  const $title = $form.elements.title;
  const $tags = $form.elements.tags;
  const $content = $form.elements.content;
  const $heading = document.getElementById('write-heading');
  const $submit = document.getElementById('write-submit');
  const $cancel = document.getElementById('write-cancel');

  // 수정 모드: 대상이 없거나 남의 글이면 되돌린다
  if (id && !editing) {
    alert('수정할 글을 찾을 수 없습니다.');
    location.replace('index.html');
    return;
  }
  if (editing && editing.authorId !== user.id) {
    alert('본인이 쓴 글만 수정할 수 있습니다.');
    location.replace('post.html?id=' + encodeURIComponent(editing.id));
    return;
  }

  if (editing) {
    document.title = '글 수정 | Devlog';
    if ($heading) $heading.textContent = '글 수정';
    if ($submit) $submit.textContent = '수정 완료';
    if ($cancel) $cancel.href = 'post.html?id=' + encodeURIComponent(editing.id);

    $title.value = editing.title;
    $tags.value = editing.tags.join(', ');
    $content.value = editing.content;
  }

  /* --- 글자 수 표시 --- */
  const syncCounters = () => {
    const $titleCount = document.getElementById('title-count');
    const $contentCount = document.getElementById('content-count');
    if ($titleCount) $titleCount.textContent = `${$title.value.length} / ${MAX_TITLE}`;
    if ($contentCount) $contentCount.textContent = `${$content.value.length}자`;
  };

  $title.addEventListener('input', syncCounters);
  $content.addEventListener('input', syncCounters);
  $tags.addEventListener('input', () => renderTagPreview($tags.value));

  syncCounters();
  renderTagPreview($tags.value);

  /* --- 실수로 창을 닫는 것을 막는다 --- */
  let dirty = false;
  let saved = false;
  $form.addEventListener('input', () => { dirty = true; });
  window.addEventListener('beforeunload', (e) => {
    if (!dirty || saved) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* --- 저장 --- */
  $form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFormErrors($form);

    const title = $title.value.trim();
    const content = $content.value.trim();
    let valid = true;

    if (!title) {
      setFieldError($title, '제목을 입력해 주세요.');
      valid = false;
    } else if (title.length > MAX_TITLE) {
      setFieldError($title, `제목은 ${MAX_TITLE}자 이하로 입력해 주세요.`);
      valid = false;
    }

    if (content.length < 10) {
      setFieldError($content, '본문을 10자 이상 입력해 주세요.');
      valid = false;
    }

    if (!valid) {
      const $first = $form.querySelector('[aria-invalid="true"]');
      if ($first) $first.focus();
      return;
    }

    const payload = { title, content, tags: parseTags($tags.value) };

    withSubmitLock($form, async () => {
      let result;
      try {
        result = editing
          ? await updatePost(editing.id, payload)
          : await createPost(payload);
      } catch (error) {
        // 여기서 실패하면 사용자가 쓴 글이 사라지므로 폼을 그대로 둔다
        showFormAlert($form, error.message + ' 작성한 내용은 그대로 있으니 다시 시도해 주세요.');
        return;
      }

      if (!result.ok) {
        applyServerError($form, result);
        return;
      }

      saved = true;   // 이탈 경고를 끄고 이동한다
      location.href = 'post.html?id=' + encodeURIComponent(result.post.id);
    });
  });
}
