/* ============================================
   projects.js — 프로젝트 카드 렌더링

   데이터는 별도 JSON 파일 대신 아래 상수로 둔다.
   (file:// 로 index.html을 열면 fetch가 CORS로 막히기 때문 — docs/04-structure.md 참고)
   필드 규격은 docs/04-structure.md "3. 프로젝트 데이터 형식"과 동일하다.
   ============================================ */

/* TODO(06-content.md): 실제 프로젝트로 교체 */
const PROJECTS = [
  {
    id: 'todo-app',
    title: '할 일 관리 앱',
    description:
      '드래그 앤 드롭으로 순서를 바꾸는 투두 리스트. localStorage로 새로고침 후에도 목록이 유지됩니다.',
    thumbnail: 'assets/images/projects/placeholder.svg',
    tags: ['JavaScript', 'CSS Grid', 'localStorage'],
    demo: 'https://example.com/todo',
    code: 'https://github.com/username/todo-app',
    period: '2026.03 ~ 2026.04',
  },
  {
    id: 'weather-dashboard',
    title: '날씨 대시보드',
    description:
      '공공 API로 지역별 날씨를 조회하는 대시보드. 응답 캐싱으로 같은 지역 재조회 시 호출을 줄였습니다.',
    thumbnail: 'assets/images/projects/placeholder.svg',
    tags: ['JavaScript', 'REST API', 'Chart'],
    demo: '',
    code: 'https://github.com/username/weather-dashboard',
    period: '2026.05 ~ 2026.06',
  },
  {
    id: 'recipe-search',
    title: '레시피 검색 서비스',
    description:
      '재료를 입력하면 만들 수 있는 요리를 찾아주는 서비스. 검색 입력에 디바운스를 적용했습니다.',
    thumbnail: 'assets/images/projects/placeholder.svg',
    tags: ['React', 'Node.js', 'Express'],
    demo: 'https://example.com/recipe',
    code: '',
    period: '2026.07 ~ 2026.08',
  },
];

/* 링크 버튼 하나를 만든다. url이 없으면 아무것도 만들지 않는다. */
function createLinkButton(url, label, modifier, projectTitle) {
  if (!url) return null;

  const $a = document.createElement('a');
  $a.className = `btn btn--${modifier} btn--sm`;
  $a.href = url;
  $a.target = '_blank';
  $a.rel = 'noopener noreferrer';
  $a.textContent = label;
  $a.setAttribute('aria-label', `${projectTitle} ${label}`);
  return $a;
}

function createProjectCard(project) {
  const $item = document.createElement('li');
  $item.className = 'project-card';
  $item.dataset.id = project.id;

  const $thumb = document.createElement('img');
  $thumb.className = 'project-card__thumb';
  $thumb.src = project.thumbnail;
  $thumb.alt = `${project.title} 미리보기`;
  $thumb.loading = 'lazy';
  $thumb.width = 800;
  $thumb.height = 450;

  const $body = document.createElement('div');
  $body.className = 'project-card__body';

  if (project.period) {
    const $period = document.createElement('p');
    $period.className = 'project-card__period';
    $period.textContent = project.period;
    $body.appendChild($period);
  }

  const $title = document.createElement('h3');
  $title.className = 'project-card__title';
  $title.textContent = project.title;

  const $desc = document.createElement('p');
  $desc.className = 'project-card__desc';
  $desc.textContent = project.description;

  const $tags = document.createElement('ul');
  $tags.className = 'tags';
  project.tags.forEach((tag) => {
    const $tag = document.createElement('li');
    $tag.className = 'tag';
    $tag.textContent = tag;
    $tags.appendChild($tag);
  });

  $body.append($title, $desc, $tags);

  const $demo = createLinkButton(project.demo, 'Demo', 'primary', project.title);
  const $code = createLinkButton(project.code, 'Code', 'outline', project.title);

  if ($demo || $code) {
    const $links = document.createElement('div');
    $links.className = 'project-card__links';
    if ($demo) $links.appendChild($demo);
    if ($code) $links.appendChild($code);
    $body.appendChild($links);
  }

  $item.append($thumb, $body);
  return $item;
}

function renderProjects() {
  const $list = document.getElementById('project-list');
  if (!$list) return;

  if (!PROJECTS.length) {
    const $empty = document.createElement('li');
    $empty.className = 'project-card__desc';
    $empty.textContent = '아직 등록된 프로젝트가 없습니다.';
    $list.appendChild($empty);
    return;
  }

  // 카드를 한 번에 붙여 리플로우를 줄인다
  const fragment = document.createDocumentFragment();
  PROJECTS.forEach((project) => fragment.appendChild(createProjectCard(project)));
  $list.appendChild(fragment);
}
