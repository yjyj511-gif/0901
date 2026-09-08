/* ============================================
   post-detail.js — 게시글 상세 페이지 (post.html)

   ?id=<게시글 id> 를 읽어 한 편을 그린다.
   본문은 textContent로만 넣는다 (innerHTML을 쓰면 저장된 글이 코드가 된다).
   ============================================ */

/* 빈 줄로 나뉜 덩어리를 문단으로 만든다 */
function renderPostBody($target, content) {
  $target.textContent = '';
  content.split(/\n{2,}/).forEach((block) => {
    const text = block.trim();
    if (!text) return;
    const $p = document.createElement('p');
    // 문단 안의 줄바꿈은 그대로 유지한다
    text.split('\n').forEach((line, i) => {
      if (i > 0) $p.appendChild(document.createElement('br'));
      $p.appendChild(document.createTextNode(line));
    });
    $target.appendChild($p);
  });
}

function renderPostTags($target, tags) {
  $target.textContent = '';
  if (!tags.length) {
    $target.hidden = true;
    return;
  }
  $target.hidden = false;
  tags.forEach((tag) => {
    const $li = document.createElement('li');
    const $a = document.createElement('a');
    $a.className = 'tag';
    $a.href = 'index.html?tag=' + encodeURIComponent(tag);
    $a.textContent = '#' + tag;
    $li.appendChild($a);
    $target.appendChild($li);
  });
}

/* 목록에서 앞뒤 글로 이동할 수 있게 한다 */
function renderAdjacent(post) {
  const $wrap = document.getElementById('post-nav');
  if (!$wrap) return;

  const posts = getPostsSorted();
  const index = posts.findIndex((p) => p.id === post.id);
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

  $wrap.textContent = '';
  if (!newer && !older) {
    $wrap.hidden = true;
    return;
  }
  $wrap.hidden = false;

  const addLink = (target, label, modifier) => {
    if (!target) return;
    const $a = document.createElement('a');
    $a.className = 'post-nav__link post-nav__link--' + modifier;
    $a.href = 'post.html?id=' + encodeURIComponent(target.id);

    const $label = document.createElement('span');
    $label.className = 'post-nav__label';
    $label.textContent = label;

    const $title = document.createElement('span');
    $title.className = 'post-nav__title';
    $title.textContent = target.title;

    $a.append($label, $title);
    $wrap.appendChild($a);
  };

  addLink(newer, '이전 글', 'prev');
  addLink(older, '다음 글', 'next');
}

function initPostDetail() {
  const $article = document.getElementById('post-article');
  if (!$article) return;

  const id = new URLSearchParams(location.search).get('id');
  const post = id ? getPostById(id) : null;

  const $notFound = document.getElementById('post-not-found');

  if (!post) {
    $article.hidden = true;
    if ($notFound) $notFound.hidden = false;
    document.title = '글을 찾을 수 없습니다 | Devlog';
    return;
  }

  if ($notFound) $notFound.hidden = true;
  $article.hidden = false;

  document.title = post.title + ' | Devlog';

  document.getElementById('post-title').textContent = post.title;
  document.getElementById('post-author').textContent = post.authorName;
  document.getElementById('post-date').textContent = formatDate(post.createdAt);
  document.getElementById('post-reading').textContent = readingMinutes(post.content) + '분 분량';

  const $updated = document.getElementById('post-updated');
  if ($updated) {
    const edited = post.updatedAt && post.updatedAt !== post.createdAt;
    $updated.hidden = !edited;
    if (edited) $updated.textContent = formatDate(post.updatedAt) + ' 수정됨';
  }

  document.getElementById('post-views').textContent = '조회 ' + incrementViews(post.id);

  renderPostTags(document.getElementById('post-tags'), post.tags);
  renderPostBody(document.getElementById('post-body'), post.content);
  renderAdjacent(post);

  // 작성자 본인에게만 수정 / 삭제를 보여 준다
  const user = getCurrentUser();
  const isAuthor = !!user && user.id === post.authorId;

  const $owner = document.getElementById('post-owner-actions');
  if ($owner) $owner.hidden = !isAuthor;

  const $edit = document.getElementById('post-edit');
  if ($edit) $edit.href = 'write.html?id=' + encodeURIComponent(post.id);

  const $delete = document.getElementById('post-delete');
  if ($delete && isAuthor) {
    $delete.addEventListener('click', () => {
      if (!window.confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')) return;
      deletePost(post.id);
      location.href = 'index.html';
    });
  }
}
