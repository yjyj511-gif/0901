/* ============================================
   posts.js — 게시글 목록 페이지 (index.html)

   검색어 / 태그 / 페이지 상태를 하나의 객체로 두고,
   상태가 바뀔 때마다 목록 전체를 다시 그린다.
   ============================================ */

const PER_PAGE = 6;

const listState = {
  query: '',
  tag: '',
  page: 1,
};

/* --- 카드 하나 --- */
function createPostCard(post) {
  const $item = document.createElement('li');
  $item.className = 'post-card';

  const $link = document.createElement('a');
  $link.className = 'post-card__link';
  $link.href = 'post.html?id=' + encodeURIComponent(post.id);

  const $meta = document.createElement('p');
  $meta.className = 'post-card__meta';
  $meta.textContent = `${post.authorName} · ${formatDate(post.createdAt)} · ${readingMinutes(post.content)}분`;

  const $title = document.createElement('h2');
  $title.className = 'post-card__title';
  $title.textContent = post.title;

  const $excerpt = document.createElement('p');
  $excerpt.className = 'post-card__excerpt';
  $excerpt.textContent = makeExcerpt(post.content);

  $link.append($meta, $title, $excerpt);
  $item.appendChild($link);

  if (post.tags.length) {
    const $tags = document.createElement('ul');
    $tags.className = 'tags post-card__tags';
    post.tags.forEach((tag) => {
      const $li = document.createElement('li');
      const $btn = document.createElement('button');
      $btn.type = 'button';
      $btn.className = 'tag tag--btn';
      $btn.textContent = '#' + tag;
      $btn.dataset.tag = tag;
      $li.appendChild($btn);
      $tags.appendChild($li);
    });
    $item.appendChild($tags);
  }

  return $item;
}

/* --- 필터 적용 --- */
function filterPosts() {
  const q = listState.query.trim().toLowerCase();

  return getPostsSorted().filter((post) => {
    if (listState.tag && !post.tags.includes(listState.tag)) return false;
    if (!q) return true;
    return (
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q) ||
      post.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

/* --- 태그 필터 줄 --- */
function renderTagFilter() {
  const $wrap = document.getElementById('tag-filter');
  if (!$wrap) return;

  $wrap.textContent = '';
  const tags = getAllTags();

  const makeChip = (label, value, count) => {
    const $li = document.createElement('li');
    const $btn = document.createElement('button');
    $btn.type = 'button';
    $btn.className = 'chip';
    $btn.dataset.tag = value;
    $btn.textContent = count === null ? label : `${label} ${count}`;
    if (listState.tag === value) {
      $btn.classList.add('chip--active');
      $btn.setAttribute('aria-pressed', 'true');
    } else {
      $btn.setAttribute('aria-pressed', 'false');
    }
    $li.appendChild($btn);
    return $li;
  };

  $wrap.appendChild(makeChip('전체', '', null));
  tags.forEach(({ name, count }) => $wrap.appendChild(makeChip('#' + name, name, count)));
}

/* --- 페이지 버튼 --- */
function renderPagination(totalPages) {
  const $wrap = document.getElementById('pagination');
  if (!$wrap) return;

  $wrap.textContent = '';
  if (totalPages <= 1) return;

  const addButton = (label, page, disabled, current) => {
    const $btn = document.createElement('button');
    $btn.type = 'button';
    $btn.className = 'pagination__btn';
    $btn.textContent = label;
    $btn.disabled = disabled;
    if (current) {
      $btn.classList.add('pagination__btn--active');
      $btn.setAttribute('aria-current', 'page');
    }
    $btn.dataset.page = String(page);
    $wrap.appendChild($btn);
  };

  addButton('이전', listState.page - 1, listState.page === 1, false);
  for (let i = 1; i <= totalPages; i += 1) {
    addButton(String(i), i, false, i === listState.page);
  }
  addButton('다음', listState.page + 1, listState.page === totalPages, false);
}

/* --- 목록 전체 다시 그리기 --- */
function renderPostList() {
  const $list = document.getElementById('post-list');
  const $empty = document.getElementById('post-empty');
  const $count = document.getElementById('post-count');
  if (!$list) return;

  const posts = filterPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));

  // 필터를 좁혀 마지막 페이지가 사라졌을 때를 보정한다
  if (listState.page > totalPages) listState.page = totalPages;

  const start = (listState.page - 1) * PER_PAGE;
  const visible = posts.slice(start, start + PER_PAGE);

  $list.textContent = '';
  const fragment = document.createDocumentFragment();
  visible.forEach((post) => fragment.appendChild(createPostCard(post)));
  $list.appendChild(fragment);

  if ($count) {
    $count.textContent = posts.length
      ? `${posts.length}개의 글`
      : '';
  }

  if ($empty) {
    $empty.hidden = posts.length > 0;
    if (!posts.length) {
      $empty.textContent = listState.query || listState.tag
        ? '조건에 맞는 글이 없습니다.'
        : '아직 작성된 글이 없습니다. 첫 글을 남겨 보세요.';
    }
  }

  renderTagFilter();
  renderPagination(totalPages);
}

/* --- 초기화 --- */
function initPostList() {
  const $list = document.getElementById('post-list');
  if (!$list) return;

  // 상세 페이지에서 태그를 눌러 넘어온 경우를 받는다
  const params = new URLSearchParams(location.search);
  listState.tag = params.get('tag') || '';
  listState.query = params.get('q') || '';

  const $search = document.getElementById('post-search');
  if ($search) {
    $search.value = listState.query;

    // 입력할 때마다 그리면 낭비라 잠깐 기다렸다 반영한다
    let timer = 0;
    $search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        listState.query = $search.value;
        listState.page = 1;
        renderPostList();
      }, 200);
    });
  }

  // 태그 칩 / 카드 안 태그 / 페이지 버튼을 한곳에서 위임 처리한다
  document.addEventListener('click', (e) => {
    const $tagBtn = e.target.closest('[data-tag]');
    if ($tagBtn) {
      const tag = $tagBtn.dataset.tag;
      listState.tag = listState.tag === tag ? '' : tag;
      listState.page = 1;
      renderPostList();
      return;
    }

    const $pageBtn = e.target.closest('[data-page]');
    if ($pageBtn && !$pageBtn.disabled) {
      listState.page = Number($pageBtn.dataset.page);
      renderPostList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  renderPostList();
}
