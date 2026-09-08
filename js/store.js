/* ============================================
   store.js — 데이터 계층 (Google Apps Script + 스프레드시트)

   서버와 이야기하는 유일한 파일이다. 다른 파일은 여기 함수만 부른다.

   ── 읽기는 동기, 쓰기는 비동기 ──────────────
   페이지가 뜰 때 bootstrap()이 한 번만 서버에 다녀와 필요한 데이터를
   snapshot에 담는다. 그 뒤 getPosts() 같은 읽기 함수는 네트워크를 타지
   않고 snapshot을 그대로 돌려주므로 예전처럼 동기로 쓸 수 있다.
   실제로 서버에 다녀오는 쓰기 함수만 async다.

   ⚠️ 학습용 구조다. API 주소가 프론트엔드 코드에 그대로 들어가므로
      누구나 이 API를 직접 호출할 수 있다. 실제 비밀번호를 넣지 말 것.
   ============================================ */

/* 배포 주소는 js/config.js에 둔다. 배포할 때마다 이 파일을 고치지 않기 위해서다. */
const API_URL = typeof BLOG_API_URL === 'string' ? BLOG_API_URL : '';

const TOKEN_KEY = 'blog:token';

/* 서버에서 받아 온 현재 페이지의 데이터 */
const snapshot = {
  posts: [],
  user: null,        // 로그인한 사람 (없으면 null)
  viewedUser: null,  // 공개 프로필로 보고 있는 사람
  ready: false,
};

/* ============ 토큰 ============ */

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) { /* 저장소 차단 환경 무시 */ }
}

/* ============ 통신 ============ */

class ApiError extends Error {}

/* 읽기는 GET. 쿼리 문자열이라 프리플라이트가 없다. */
async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params });
  return request(`${API_URL}?${query}`, { method: 'GET' });
}

/* 쓰기는 POST.
   Content-Type을 application/json으로 두면 브라우저가 OPTIONS 프리플라이트를
   먼저 보내는데, Apps Script는 그걸 처리하지 못해 CORS로 막힌다.
   text/plain은 "단순 요청"이라 프리플라이트가 없다. 내용은 그대로 JSON이고,
   서버에서 JSON.parse(e.postData.contents)로 읽는다. */
async function apiPost(action, body = {}) {
  return request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: getToken(), ...body }),
  });
}

async function request(url, options) {
  if (!API_URL) {
    throw new ApiError('API 주소가 아직 설정되지 않았습니다. js/config.js의 BLOG_API_URL에 배포 주소를 넣어 주세요.');
  }

  let response;
  try {
    response = await fetch(url, { ...options, redirect: 'follow' });
  } catch (e) {
    // 네트워크 단절, CORS 차단, file://로 열었을 때 모두 여기로 온다
    throw new ApiError('서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.');
  }

  if (!response.ok) {
    throw new ApiError(`서버가 응답하지 않습니다. (HTTP ${response.status})`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // 배포 설정이 잘못되면 JSON 대신 구글 로그인 HTML이 돌아온다
    throw new ApiError('서버 응답을 이해할 수 없습니다. 웹 앱 액세스 권한이 "모든 사용자"인지 확인해 주세요.');
  }
}

/* ============ 초기 적재 ============ */

/* 페이지마다 딱 한 번. 실패하면 예외를 던지므로 main.js가 안내를 띄운다. */
async function bootstrapStore() {
  const params = { token: getToken() };

  // 공개 프로필 화면이면 그 사람 정보까지 한 번에 받아 온다
  const userId = new URLSearchParams(location.search).get('user');
  if (userId) params.userId = userId;

  const result = await apiGet('bootstrap', params);
  if (!result.ok) throw new ApiError(result.message || '데이터를 불러오지 못했습니다.');

  snapshot.posts = result.posts || [];
  snapshot.user = result.user || null;
  snapshot.viewedUser = result.viewedUser || null;
  snapshot.ready = true;

  // 토큰이 만료됐으면 서버가 user를 주지 않는다. 죽은 토큰은 버린다.
  if (!snapshot.user) setToken('');
}

/* ============ 읽기 (동기 — snapshot에서 꺼낸다) ============ */

function getCurrentUser() {
  return snapshot.user;
}

function getViewedUser() {
  return snapshot.viewedUser;
}

function getPosts() {
  return snapshot.posts.slice();
}

/* 서버가 이미 최신순으로 정렬해 준다 */
function getPostsSorted() {
  return snapshot.posts.slice();
}

function getPostById(id) {
  return snapshot.posts.find((p) => p.id === id) || null;
}

function getPostsByAuthor(authorId) {
  return snapshot.posts.filter((p) => p.authorId === authorId);
}

/* 사이드바 태그 목록용 — 많이 쓰인 순서 */
function getAllTags() {
  const counts = new Map();
  snapshot.posts.forEach((p) => {
    (p.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

/* ============ 쓰기 (비동기) ============ */

/* 성공하면 { ok: true, ... }, 실패하면 { ok: false, field?, message } */
async function createUser({ username, email, password, bio }) {
  const result = await apiPost('signup', { username, email, password, bio });
  if (result.ok) {
    setToken(result.token);
    snapshot.user = result.user;
  }
  return result;
}

async function login(account, password) {
  const result = await apiPost('login', { account, password });
  if (result.ok) {
    setToken(result.token);
    snapshot.user = result.user;
  }
  return result;
}

async function logout() {
  const token = getToken();
  setToken('');
  snapshot.user = null;
  // 서버 세션 삭제는 실패해도 로그아웃 자체는 이미 끝났다
  try {
    await apiPost('logout', { token });
  } catch (e) { /* 무시 */ }
}

async function updateUser(patch) {
  const result = await apiPost('updateUser', patch);
  if (result.ok) {
    snapshot.user = result.user;
    // 게시글에 복사된 작성자 이름도 서버에서 함께 바뀌었으므로 화면도 맞춰 준다
    snapshot.posts.forEach((p) => {
      if (p.authorId === result.user.id) p.authorName = result.user.username;
    });
    if (snapshot.viewedUser && snapshot.viewedUser.id === result.user.id) {
      snapshot.viewedUser = result.user;
    }
  }
  return result;
}

async function changePassword(current, next) {
  return apiPost('changePassword', { current, next });
}

async function createPost({ title, content, tags }) {
  const result = await apiPost('createPost', { title, content, tags });
  if (result.ok) snapshot.posts.unshift(result.post);
  return result;
}

async function updatePost(id, { title, content, tags }) {
  const result = await apiPost('updatePost', { id, title, content, tags });
  if (result.ok) {
    const index = snapshot.posts.findIndex((p) => p.id === id);
    if (index !== -1) snapshot.posts[index] = result.post;
  }
  return result;
}

async function deletePost(id) {
  const result = await apiPost('deletePost', { id });
  if (result.ok) {
    snapshot.posts = snapshot.posts.filter((p) => p.id !== id);
  }
  return result;
}

/* 조회수는 화면을 붙잡아 둘 이유가 없다.
   숫자를 먼저 올려 보여 주고, 서버에는 뒤에서 알린다. */
function incrementViews(id) {
  const post = snapshot.posts.find((p) => p.id === id);
  if (!post) return 0;

  post.views = (post.views || 0) + 1;
  apiPost('incrementViews', { id }).catch(() => { /* 조회수는 실패해도 넘어간다 */ });
  return post.views;
}

/* ============ 표시용 유틸 (서버와 무관) ============ */

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}. ${mm}. ${dd}.`;
}

/* 본문 앞부분을 목록용 요약으로 자른다 */
function makeExcerpt(content, max = 120) {
  const flat = String(content).replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max) + '…' : flat;
}

function readingMinutes(content) {
  // 한국어 기준 분당 약 500자
  return Math.max(1, Math.round(String(content).replace(/\s/g, '').length / 500));
}
