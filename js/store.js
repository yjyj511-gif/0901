/* ============================================
   store.js — 데이터 계층 (localStorage)

   서버가 없으므로 회원/게시글을 브라우저 localStorage에 저장한다.
   file:// 로 열어도 동작하며, 나중에 backend/ 가 생기면
   이 파일의 함수 본문만 fetch 호출로 바꾸면 된다.

   ⚠️ 학습용 구조다. 비밀번호가 브라우저에 남으므로
      실제 서비스에 그대로 쓰면 안 된다.
   ============================================ */

const DB_KEYS = {
  users: 'blog:users',
  posts: 'blog:posts',
  session: 'blog:session',
  seeded: 'blog:seeded',
};

/* --- 저장소 원시 접근 (차단 환경에서도 앱이 죽지 않게 감싼다) --- */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* --- 공통 유틸 --- */
function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* 데모용 해시. 되돌릴 수는 없지만 암호학적으로 안전하지는 않다.
   (crypto.subtle은 file:// 에서 막히는 브라우저가 있어 쓰지 않았다) */
function hashPassword(password) {
  let h = 0x811c9dc5;
  for (let i = 0; i < password.length; i += 1) {
    h ^= password.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'h' + h.toString(16) + ':' + password.length;
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}. ${mm}. ${dd}.`;
}

/* 본문 앞부분을 목록용 요약으로 자른다 */
function makeExcerpt(content, max = 120) {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max) + '…' : flat;
}

function readingMinutes(content) {
  // 한국어 기준 분당 약 500자
  return Math.max(1, Math.round(content.replace(/\s/g, '').length / 500));
}

/* --- 사용자 --- */
function getUsers() {
  return readJSON(DB_KEYS.users, []);
}

function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

/* 이메일 또는 닉네임으로 찾는다 (로그인 입력이 둘 다 허용이라서) */
function findUser(emailOrName) {
  const key = String(emailOrName).trim().toLowerCase();
  return getUsers().find(
    (u) => u.email.toLowerCase() === key || u.username.toLowerCase() === key
  ) || null;
}

/* 성공하면 { ok: true, user }, 실패하면 { ok: false, field, message } */
function createUser({ username, email, password, bio }) {
  const users = getUsers();

  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, field: 'username', message: '이미 사용 중인 닉네임입니다.' };
  }
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, field: 'email', message: '이미 가입된 이메일입니다.' };
  }

  const user = {
    id: uid('u'),
    username,
    email,
    passwordHash: hashPassword(password),
    bio: bio || '',
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  if (!writeJSON(DB_KEYS.users, users)) {
    return { ok: false, field: null, message: '브라우저 저장소를 쓸 수 없어 가입에 실패했습니다.' };
  }
  return { ok: true, user };
}

function updateUser(id, patch) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return { ok: false, message: '사용자를 찾을 수 없습니다.' };

  // 닉네임을 바꾸면 다른 사람과 겹치지 않는지 확인한다
  if (patch.username) {
    const taken = users.some(
      (u) => u.id !== id && u.username.toLowerCase() === patch.username.toLowerCase()
    );
    if (taken) return { ok: false, field: 'username', message: '이미 사용 중인 닉네임입니다.' };
  }

  users[index] = { ...users[index], ...patch };
  writeJSON(DB_KEYS.users, users);

  // 게시글에 복사해 둔 작성자 이름도 함께 갱신한다
  if (patch.username) {
    const posts = getPosts();
    let changed = false;
    posts.forEach((p) => {
      if (p.authorId === id && p.authorName !== patch.username) {
        p.authorName = patch.username;
        changed = true;
      }
    });
    if (changed) writeJSON(DB_KEYS.posts, posts);
  }

  return { ok: true, user: users[index] };
}

/* --- 세션 --- */
function login(emailOrName, password) {
  const user = findUser(emailOrName);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { ok: false, message: '이메일(닉네임) 또는 비밀번호가 올바르지 않습니다.' };
  }
  writeJSON(DB_KEYS.session, { userId: user.id, at: new Date().toISOString() });
  return { ok: true, user };
}

function logout() {
  try {
    localStorage.removeItem(DB_KEYS.session);
  } catch (e) { /* 저장소 차단 환경 무시 */ }
}

function getCurrentUser() {
  const session = readJSON(DB_KEYS.session, null);
  if (!session || !session.userId) return null;
  return getUserById(session.userId);
}

/* --- 게시글 --- */
function getPosts() {
  return readJSON(DB_KEYS.posts, []);
}

/* 최신 글이 위로 */
function getPostsSorted() {
  return getPosts().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getPostById(id) {
  return getPosts().find((p) => p.id === id) || null;
}

function getPostsByAuthor(authorId) {
  return getPostsSorted().filter((p) => p.authorId === authorId);
}

/* 사이드바 태그 목록용 — 많이 쓰인 순서 */
function getAllTags() {
  const counts = new Map();
  getPosts().forEach((p) => {
    p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

function createPost({ title, content, tags, author }) {
  const posts = getPosts();
  const now = new Date().toISOString();

  const post = {
    id: uid('p'),
    title,
    content,
    tags,
    authorId: author.id,
    authorName: author.username,
    createdAt: now,
    updatedAt: now,
    views: 0,
  };

  posts.push(post);
  if (!writeJSON(DB_KEYS.posts, posts)) {
    return { ok: false, message: '브라우저 저장소를 쓸 수 없어 저장에 실패했습니다.' };
  }
  return { ok: true, post };
}

function updatePost(id, { title, content, tags }) {
  const posts = getPosts();
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return { ok: false, message: '게시글을 찾을 수 없습니다.' };

  posts[index] = {
    ...posts[index],
    title,
    content,
    tags,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(DB_KEYS.posts, posts);
  return { ok: true, post: posts[index] };
}

function deletePost(id) {
  writeJSON(DB_KEYS.posts, getPosts().filter((p) => p.id !== id));
}

/* 상세 페이지 진입 시 1회 호출 */
function incrementViews(id) {
  const posts = getPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) return 0;
  post.views = (post.views || 0) + 1;
  writeJSON(DB_KEYS.posts, posts);
  return post.views;
}

/* --- 첫 방문 시 예시 데이터 ---
   목록이 텅 빈 화면부터 보이지 않도록 데모 계정 하나와 글 세 편을 넣는다.
   demo@blog.dev / demo1234 로 로그인해 볼 수 있다. */
function seedIfEmpty() {
  if (readJSON(DB_KEYS.seeded, null)) return;

  const demo = {
    id: 'u_demo',
    username: '홍길동',
    email: 'demo@blog.dev',
    passwordHash: hashPassword('demo1234'),
    bio: '웹에서 사람이 겪는 작은 불편을 줄이는 일에 관심이 있는 프론트엔드 개발자입니다. 배운 것을 잊지 않으려고 여기에 적어 둡니다.',
    createdAt: '2026-03-02T09:00:00.000Z',
  };

  const samples = [
    {
      title: '바닐라 자바스크립트로 다크 모드 만들기',
      tags: ['JavaScript', 'CSS'],
      createdAt: '2026-08-21T10:20:00.000Z',
      content:
        '다크 모드를 붙일 때 가장 먼저 부딪히는 문제는 화면이 한 번 밝게 깜빡이는 현상입니다.\n\nCSS 커스텀 프로퍼티로 색을 토큰화해 두면 다크 선택자 한 블록에서 값만 다시 선언하면 됩니다. 진짜 문제는 시점입니다. 저장된 값을 DOMContentLoaded 이후에 읽으면 이미 라이트 화면이 한 프레임 그려진 뒤라 눈에 띄게 번쩍입니다.\n\n해결은 단순합니다. head 안, 스타일시트 다음에 아주 짧은 인라인 스크립트를 두고 localStorage에서 읽은 테마를 documentElement에 바로 꽂아 줍니다. 렌더링이 시작되기 전에 값이 정해지므로 깜빡임이 사라집니다.\n\n토글 버튼에는 aria-pressed를 함께 관리해 주세요. 화면에 보이는 아이콘만 바꾸면 스크린 리더 사용자는 현재 상태를 알 수 없습니다.',
    },
    {
      title: '리스트를 그릴 때 innerHTML을 피한 이유',
      tags: ['JavaScript', '보안'],
      createdAt: '2026-08-30T02:05:00.000Z',
      content:
        '사용자가 쓴 글을 화면에 뿌릴 때 innerHTML은 가장 쉬운 선택지이면서 가장 위험한 선택지입니다.\n\n제목에 스크립트 태그를 넣은 글이 하나만 저장되어도, 그 목록을 여는 모든 사람의 브라우저에서 그 코드가 실행됩니다. 직접 만든 서비스라면 저장해 둔 데이터가 그대로 새어 나갑니다.\n\ncreateElement와 textContent로 만들면 문자열은 언제나 문자열로만 들어갑니다. 코드가 조금 길어지는 대신 이스케이프를 신경 쓸 일이 사라집니다.\n\n항목이 많다면 DocumentFragment에 모아 두었다가 한 번에 붙이세요. 리플로우가 한 번으로 줄어듭니다.',
    },
    {
      title: '반응형 레이아웃, 브레이크포인트를 줄이는 법',
      tags: ['CSS', '반응형'],
      createdAt: '2026-09-04T07:40:00.000Z',
      content:
        '브레이크포인트를 늘릴수록 유지보수는 빠르게 어려워집니다. 화면 폭마다 다른 규칙을 기억해야 하기 때문입니다.\n\nGrid의 repeat(auto-fill, minmax(300px, 1fr))은 미디어 쿼리 없이 한 줄에 들어갈 카드 수를 스스로 정합니다. 폭이 줄면 카드가 자연스럽게 아래로 내려갑니다.\n\n글자 크기는 clamp()로 최소·최대를 묶어 두면 모바일에서 너무 작고 데스크톱에서 과하게 커지는 문제를 한 줄로 해결할 수 있습니다.\n\n그래도 남는 분기는 대개 두 개면 충분합니다. 메뉴가 접히는 지점 하나, 레이아웃이 가로로 펼쳐지는 지점 하나입니다.',
    },
  ];

  const posts = samples.map((s, i) => ({
    id: 'p_sample' + (i + 1),
    title: s.title,
    content: s.content,
    tags: s.tags,
    authorId: demo.id,
    authorName: demo.username,
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
    views: 12 * (i + 1),
  }));

  writeJSON(DB_KEYS.users, [demo]);
  writeJSON(DB_KEYS.posts, posts);
  writeJSON(DB_KEYS.seeded, true);
}
