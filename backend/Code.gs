/* ============================================
   Code.gs — 블로그 백엔드 (Google Apps Script)

   스프레드시트를 DB로 쓰는 JSON API다.
   프론트엔드(js/store.js)가 이 웹앱 하나만 호출한다.

   ── 처음 설정 ──────────────────────────────
   1. 이 파일 전체를 Apps Script 편집기의 Code.gs 에 붙여넣는다.
      (SHEET_ID는 이미 채워져 있다)
   2. 편집기에서 setup() 을 한 번 실행한다 — 시트·헤더·예시 데이터가 만들어진다.
      처음 실행하면 권한 승인 창이 뜬다. 승인해야 시트에 접근할 수 있다.
   3. [배포 > 새 배포 > 웹 앱]
        실행 계정   : 나
        액세스 권한 : 모든 사용자
      → 나오는 .../exec 주소를 js/config.js 의 BLOG_API_URL 에 붙여넣는다.

   ⚠️ 코드를 고칠 때마다 [배포 > 배포 관리 > 편집 > 버전: 새 버전]으로
      다시 배포해야 반영된다. 저장만 하면 이전 버전이 계속 서빙된다.
   ============================================ */

/* 스프레드시트에 연결된 스크립트면 '' 로 두고, 독립 스크립트면 시트 ID를 넣는다.
   시트 주소 .../spreadsheets/d/<여기>/edit 의 가운데 부분이다. */
const SHEET_ID = '1yNRhBwuq2ouszyKy3uGm3cZmIcSlyJIZK7nnfD6Cn7w';

const SESSION_DAYS = 30;   // 로그인 유지 기간
const MAX_TITLE = 80;
const MAX_TAGS = 5;

/* 시트 이름 → 헤더. readAll/appendRow가 이 순서를 따른다. */
const SCHEMA = {
  users: ['id', 'username', 'email', 'passwordHash', 'bio', 'createdAt'],
  posts: ['id', 'title', 'content', 'tags', 'authorId', 'authorName',
          'createdAt', 'updatedAt', 'views'],
  sessions: ['token', 'userId', 'createdAt'],
};

/* ============ 진입점 ============ */

/* 브라우저는 OPTIONS 프리플라이트를 Apps Script가 처리하지 못한다.
   그래서 프론트엔드는 POST를 text/plain으로 보내고(단순 요청),
   여기서는 본문을 직접 JSON.parse 한다. */
function doGet(e) {
  return route(e.parameter || {});
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, message: '요청 본문을 읽을 수 없습니다.' });
  }
  return route(body);
}

function route(req) {
  try {
    switch (req.action) {
      /* 읽기 */
      case 'bootstrap':      return json(bootstrap(req));
      case 'getUser':        return json(getPublicUser(req));

      /* 인증 */
      case 'signup':         return json(signup(req));
      case 'login':          return json(login(req));
      case 'logout':         return json(logout(req));

      /* 게시글 */
      case 'createPost':     return json(createPost(req));
      case 'updatePost':     return json(updatePost(req));
      case 'deletePost':     return json(deletePost(req));
      case 'incrementViews': return json(incrementViews(req));

      /* 프로필 */
      case 'updateUser':     return json(updateUser(req));
      case 'changePassword': return json(changePassword(req));

      default:
        return json({ ok: false, message: '알 수 없는 action: ' + req.action });
    }
  } catch (err) {
    // 예기치 못한 오류도 JSON으로 돌려줘야 프론트가 안내를 띄울 수 있다
    return json({ ok: false, message: '서버 오류: ' + (err && err.message ? err.message : err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============ 시트 접근 ============ */

function ss() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('SHEET_ID를 채우거나, 스프레드시트에 연결된 스크립트로 만드세요.');
}

/* 시트를 가져온다. 없으면 헤더까지 갖춰서 만든다.
   setup()을 깜빡해도 첫 요청에서 알아서 준비되도록 하기 위해서다. */
function sheet(name) {
  if (!SCHEMA[name]) throw new Error('알 수 없는 시트 이름: ' + name);
  return ensureSheet(ss(), name);
}

/* 시트가 없으면 만들고, 헤더가 비어 있으면 채운다. 여러 번 불러도 안전하다. */
function ensureSheet(book, name) {
  let target = book.getSheetByName(name);

  if (!target) {
    try {
      target = book.insertSheet(name);
    } catch (err) {
      // 동시에 들어온 두 요청이 같이 만들려 하면 한쪽이 실패한다.
      // 그때는 이미 다른 쪽이 만들어 둔 것이므로 그걸 쓴다.
      target = book.getSheetByName(name);
      if (!target) throw err;
    }
  }

  // 1행이 비어 있으면 헤더를 넣는다
  const width = SCHEMA[name].length;
  if (String(target.getRange(1, 1).getValue()) === '') {
    target.getRange(1, 1, 1, width).setValues([SCHEMA[name]]).setFontWeight('bold');
    target.setFrozenRows(1);
    // 날짜 문자열이 날짜로 바뀌지 않도록 텍스트 서식으로 둔다
    target.getRange(1, 1, target.getMaxRows(), width).setNumberFormat('@');
  }

  return target;
}

/* 시트를 객체 배열로 읽는다.
   스프레드시트가 ISO 문자열을 날짜로 바꿔 두는 경우가 있어 되돌린다. */
function readAll(name) {
  const values = sheet(name).getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0] !== '')          // 지워진 행 건너뛰기
    .map((row) => {
      const obj = {};
      headers.forEach((key, i) => { obj[key] = normalize(key, row[i]); });
      return obj;
    });
}

function normalize(key, value) {
  if (value instanceof Date) return value.toISOString();
  if (key === 'tags') return String(value || '').split(',').filter(Boolean);
  if (key === 'views') return Number(value) || 0;
  return value;
}

/* 객체를 SCHEMA 순서의 행 배열로 바꾼다 */
function toRow(name, obj) {
  return SCHEMA[name].map((key) => {
    const value = obj[key];
    if (key === 'tags') return (value || []).join(',');
    return value === undefined || value === null ? '' : value;
  });
}

/* id로 행 번호를 찾는다. 없으면 -1. (헤더가 1행이므로 반환값은 2 이상) */
function findRow(name, idColumnValue) {
  const ids = sheet(name).getDataRange().getValues().map((row) => row[0]);
  const index = ids.indexOf(idColumnValue);
  return index === -1 ? -1 : index + 1;
}

/* 쓰기는 반드시 잠근다. 두 명이 동시에 글을 쓰면 같은 행에 겹쳐 쓰인다. */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { ok: false, message: '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.' };
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ============ 유틸 ============ */

function uid(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

/* 비밀번호는 솔트를 섞어 SHA-256으로 해시한다.
   솔트는 스크립트 속성에 두고 시트에는 넣지 않는다. */
function salt() {
  const props = PropertiesService.getScriptProperties();
  let value = props.getProperty('SALT');
  if (!value) {
    value = Utilities.getUuid();
    props.setProperty('SALT', value);
  }
  return value;
}

function hashPassword(password) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password) + salt(),
    Utilities.Charset.UTF_8
  );
  return bytes.map((b) => ((b & 0xff) + 0x100).toString(16).slice(1)).join('');
}

/* 사용자에게 돌려줄 때는 해시를 뺀다 */
function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    createdAt: user.createdAt,
  };
}

/* 남의 프로필을 볼 때는 이메일도 가린다 */
function anonUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, bio: user.bio, createdAt: user.createdAt };
}

/* ============ 세션 ============ */

function issueToken(userId) {
  const token = Utilities.getUuid();
  sheet('sessions').appendRow(toRow('sessions', {
    token,
    userId,
    createdAt: new Date().toISOString(),
  }));
  return token;
}

/* 토큰으로 사용자를 찾는다. 없거나 만료면 null. */
function userFromToken(token) {
  if (!token) return null;

  const session = readAll('sessions').find((s) => s.token === token);
  if (!session) return null;

  const age = Date.now() - new Date(session.createdAt).getTime();
  if (age > SESSION_DAYS * 24 * 60 * 60 * 1000) return null;

  return readAll('users').find((u) => u.id === session.userId) || null;
}

/* 로그인이 필요한 동작에서 쓴다. 실패하면 예외를 던진다. */
function requireUser(req) {
  const user = userFromToken(req.token);
  if (!user) throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
  return user;
}

/* ============ 읽기 ============ */

/* 페이지가 뜰 때 한 번 호출한다. 그 페이지에 필요한 걸 한꺼번에 준다.
   왕복을 한 번으로 줄여야 목록·상세·프로필이 각각 따로 기다리지 않는다.
   req.userId가 있으면(공개 프로필 화면) 그 사람 정보도 함께 담는다. */
function bootstrap(req) {
  const user = userFromToken(req.token);
  const posts = readAll('posts')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const result = { ok: true, posts, user: publicUser(user) };

  if (req.userId) {
    const viewed = readAll('users').find((u) => u.id === req.userId);
    // 본인 프로필을 id로 열었다면 이메일까지 보여 준다
    result.viewedUser = user && viewed && user.id === viewed.id
      ? publicUser(viewed)
      : anonUser(viewed);
  }

  return result;
}

function getPublicUser(req) {
  const user = readAll('users').find((u) => u.id === req.userId);
  if (!user) return { ok: false, message: '사용자를 찾을 수 없습니다.' };
  return { ok: true, user: anonUser(user) };
}

/* ============ 인증 ============ */

function signup(req) {
  const username = String(req.username || '').trim();
  const email = String(req.email || '').trim();
  const password = String(req.password || '');

  if (username.length < 2 || username.length > 20) {
    return { ok: false, field: 'username', message: '닉네임은 2자 이상 20자 이하로 입력해 주세요.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, field: 'email', message: '이메일 형식이 올바르지 않습니다.' };
  }
  if (password.length < 8) {
    return { ok: false, field: 'password', message: '비밀번호는 8자 이상이어야 합니다.' };
  }

  return withLock(() => {
    const users = readAll('users');
    if (users.some((u) => String(u.username).toLowerCase() === username.toLowerCase())) {
      return { ok: false, field: 'username', message: '이미 사용 중인 닉네임입니다.' };
    }
    if (users.some((u) => String(u.email).toLowerCase() === email.toLowerCase())) {
      return { ok: false, field: 'email', message: '이미 가입된 이메일입니다.' };
    }

    const user = {
      id: uid('u'),
      username,
      email,
      passwordHash: hashPassword(password),
      bio: String(req.bio || '').trim(),
      createdAt: new Date().toISOString(),
    };
    sheet('users').appendRow(toRow('users', user));

    return { ok: true, user: publicUser(user), token: issueToken(user.id) };
  });
}

function login(req) {
  const key = String(req.account || '').trim().toLowerCase();
  const user = readAll('users').find(
    (u) => String(u.email).toLowerCase() === key || String(u.username).toLowerCase() === key
  );

  if (!user || user.passwordHash !== hashPassword(req.password)) {
    return { ok: false, message: '이메일(닉네임) 또는 비밀번호가 올바르지 않습니다.' };
  }

  return { ok: true, user: publicUser(user), token: issueToken(user.id) };
}

function logout(req) {
  if (req.token) {
    const row = findRow('sessions', req.token);
    if (row > 1) sheet('sessions').deleteRow(row);
  }
  return { ok: true };
}

/* ============ 게시글 ============ */

function cleanTags(tags) {
  const seen = {};
  const out = [];
  (tags || []).forEach((raw) => {
    const tag = String(raw).trim().replace(/^#/, '');
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(tag);
  });
  return out.slice(0, MAX_TAGS);
}

function validatePost(req) {
  const title = String(req.title || '').trim();
  const content = String(req.content || '').trim();

  if (!title) return { message: '제목을 입력해 주세요.', field: 'title' };
  if (title.length > MAX_TITLE) return { message: '제목은 ' + MAX_TITLE + '자 이하로 입력해 주세요.', field: 'title' };
  if (content.length < 10) return { message: '본문을 10자 이상 입력해 주세요.', field: 'content' };
  return null;
}

function createPost(req) {
  const user = requireUser(req);
  const invalid = validatePost(req);
  if (invalid) return { ok: false, field: invalid.field, message: invalid.message };

  return withLock(() => {
    const now = new Date().toISOString();
    const post = {
      id: uid('p'),
      title: String(req.title).trim(),
      content: String(req.content).trim(),
      tags: cleanTags(req.tags),
      authorId: user.id,
      authorName: user.username,
      createdAt: now,
      updatedAt: now,
      views: 0,
    };
    sheet('posts').appendRow(toRow('posts', post));
    return { ok: true, post };
  });
}

function updatePost(req) {
  const user = requireUser(req);
  const invalid = validatePost(req);
  if (invalid) return { ok: false, field: invalid.field, message: invalid.message };

  return withLock(() => {
    const post = readAll('posts').find((p) => p.id === req.id);
    if (!post) return { ok: false, message: '게시글을 찾을 수 없습니다.' };
    if (post.authorId !== user.id) return { ok: false, message: '본인이 쓴 글만 수정할 수 있습니다.' };

    const updated = {
      ...post,
      title: String(req.title).trim(),
      content: String(req.content).trim(),
      tags: cleanTags(req.tags),
      updatedAt: new Date().toISOString(),
    };

    const row = findRow('posts', post.id);
    sheet('posts').getRange(row, 1, 1, SCHEMA.posts.length)
      .setValues([toRow('posts', updated)]);

    return { ok: true, post: updated };
  });
}

function deletePost(req) {
  const user = requireUser(req);

  return withLock(() => {
    const post = readAll('posts').find((p) => p.id === req.id);
    if (!post) return { ok: false, message: '게시글을 찾을 수 없습니다.' };
    if (post.authorId !== user.id) return { ok: false, message: '본인이 쓴 글만 삭제할 수 있습니다.' };

    const row = findRow('posts', post.id);
    if (row > 1) sheet('posts').deleteRow(row);
    return { ok: true };
  });
}

/* 조회수는 로그인 없이 오르고, 실패해도 화면에 영향을 주지 않는다 */
function incrementViews(req) {
  return withLock(() => {
    const row = findRow('posts', req.id);
    if (row < 2) return { ok: false, message: '게시글을 찾을 수 없습니다.' };

    const column = SCHEMA.posts.indexOf('views') + 1;
    const cell = sheet('posts').getRange(row, column);
    const next = (Number(cell.getValue()) || 0) + 1;
    cell.setValue(next);

    return { ok: true, views: next };
  });
}

/* ============ 프로필 ============ */

function updateUser(req) {
  const user = requireUser(req);
  const username = String(req.username || '').trim();

  if (username.length < 2 || username.length > 20) {
    return { ok: false, field: 'username', message: '닉네임은 2자 이상 20자 이하로 입력해 주세요.' };
  }

  return withLock(() => {
    const users = readAll('users');
    const taken = users.some(
      (u) => u.id !== user.id && String(u.username).toLowerCase() === username.toLowerCase()
    );
    if (taken) return { ok: false, field: 'username', message: '이미 사용 중인 닉네임입니다.' };

    const updated = { ...user, username, bio: String(req.bio || '').trim() };
    const row = findRow('users', user.id);
    sheet('users').getRange(row, 1, 1, SCHEMA.users.length)
      .setValues([toRow('users', updated)]);

    // 게시글에 복사해 둔 작성자 이름도 함께 고친다
    if (user.username !== username) {
      const posts = readAll('posts');
      const column = SCHEMA.posts.indexOf('authorName') + 1;
      posts.forEach((p) => {
        if (p.authorId !== user.id) return;
        const postRow = findRow('posts', p.id);
        if (postRow > 1) sheet('posts').getRange(postRow, column).setValue(username);
      });
    }

    return { ok: true, user: publicUser(updated) };
  });
}

function changePassword(req) {
  const user = requireUser(req);

  if (user.passwordHash !== hashPassword(req.current)) {
    return { ok: false, field: 'current', message: '현재 비밀번호가 올바르지 않습니다.' };
  }
  if (String(req.next || '').length < 8) {
    return { ok: false, field: 'next', message: '새 비밀번호는 8자 이상이어야 합니다.' };
  }

  return withLock(() => {
    const updated = { ...user, passwordHash: hashPassword(req.next) };
    const row = findRow('users', user.id);
    sheet('users').getRange(row, 1, 1, SCHEMA.users.length)
      .setValues([toRow('users', updated)]);
    return { ok: true };
  });
}

/* ============ 최초 설정 ============
   편집기에서 이 함수를 한 번 실행한다. 여러 번 실행해도 안전하다. */
function setup() {
  const book = ss();

  Object.keys(SCHEMA).forEach((name) => ensureSheet(book, name));

  // 기본 시트가 남아 있으면 지운다
  const first = book.getSheetByName('시트1') || book.getSheetByName('Sheet1');
  if (first && book.getSheets().length > 1) book.deleteSheet(first);

  seedDemo();
  Logger.log('설정 완료. 이제 [배포 > 새 배포 > 웹 앱]으로 배포하세요.');
}

/* 글이 하나도 없을 때만 예시 데이터를 넣는다 */
function seedDemo() {
  if (readAll('posts').length > 0) return;

  const demo = {
    id: 'u_demo',
    username: '홍길동',
    email: 'demo@blog.dev',
    passwordHash: hashPassword('demo1234'),
    bio: '웹에서 사람이 겪는 작은 불편을 줄이는 일에 관심이 있는 프론트엔드 개발자입니다.',
    createdAt: '2026-03-02T09:00:00.000Z',
  };
  if (!readAll('users').some((u) => u.id === demo.id)) {
    sheet('users').appendRow(toRow('users', demo));
  }

  const samples = [
    {
      title: '바닐라 자바스크립트로 다크 모드 만들기',
      tags: ['JavaScript', 'CSS'],
      createdAt: '2026-08-21T10:20:00.000Z',
      content: '다크 모드를 붙일 때 가장 먼저 부딪히는 문제는 화면이 한 번 밝게 깜빡이는 현상입니다.\n\nCSS 커스텀 프로퍼티로 색을 토큰화해 두면 다크 선택자 한 블록에서 값만 다시 선언하면 됩니다. 진짜 문제는 시점입니다.\n\n해결은 단순합니다. head 안에 짧은 인라인 스크립트를 두고 저장된 테마를 렌더링 전에 적용합니다.',
    },
    {
      title: '리스트를 그릴 때 innerHTML을 피한 이유',
      tags: ['JavaScript', '보안'],
      createdAt: '2026-08-30T02:05:00.000Z',
      content: '사용자가 쓴 글을 화면에 뿌릴 때 innerHTML은 가장 쉬운 선택지이면서 가장 위험한 선택지입니다.\n\n제목에 스크립트 태그를 넣은 글이 하나만 저장되어도, 그 목록을 여는 모든 사람의 브라우저에서 그 코드가 실행됩니다.\n\ncreateElement와 textContent로 만들면 문자열은 언제나 문자열로만 들어갑니다.',
    },
    {
      title: '반응형 레이아웃, 브레이크포인트를 줄이는 법',
      tags: ['CSS', '반응형'],
      createdAt: '2026-09-04T07:40:00.000Z',
      content: '브레이크포인트를 늘릴수록 유지보수는 빠르게 어려워집니다. 화면 폭마다 다른 규칙을 기억해야 하기 때문입니다.\n\nGrid의 auto-fill과 minmax는 미디어 쿼리 없이 한 줄에 들어갈 카드 수를 스스로 정합니다.\n\n글자 크기는 clamp()로 최소·최대를 묶어 두면 한 줄로 해결됩니다.',
    },
  ];

  samples.forEach((s, i) => {
    sheet('posts').appendRow(toRow('posts', {
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
  });
}

/* ============ 진단 ============
   setup()이 안 먹을 때 무엇이 문제인지 알려 준다.
   편집기에서 이 함수를 실행하고 실행 로그(Ctrl+Enter)를 확인한다.
   재배포는 필요 없다 — 편집기에서 실행하는 함수는 저장만 하면 바로 돈다. */
function diagnose() {
  const log = [];

  log.push('SHEET_ID = ' + SHEET_ID);

  let book;
  try {
    book = SpreadsheetApp.openById(SHEET_ID);
  } catch (err) {
    log.push('');
    log.push('❌ 스프레드시트를 열지 못했습니다: ' + err.message);
    log.push('   → SHEET_ID가 틀렸거나, 이 스크립트에 접근 권한이 없습니다.');
    log.push('   → 시트 주소 .../spreadsheets/d/<이 부분>/edit 을 다시 확인하세요.');
    Logger.log(log.join('\n'));
    return log.join('\n');
  }

  log.push('스프레드시트 이름: ' + book.getName());
  log.push('스프레드시트 주소: ' + book.getUrl());
  log.push('');

  const names = book.getSheets().map((s) => s.getName());
  log.push('현재 시트 탭 (' + names.length + '개): ' + names.join(' | '));
  log.push('');

  const needed = Object.keys(SCHEMA);
  const missing = needed.filter((n) => names.indexOf(n) === -1);

  if (missing.length === 0) {
    log.push('✅ 필요한 시트가 모두 있습니다.');
    needed.forEach((n) => {
      log.push('   ' + n + ': ' + readAll(n).length + '행');
    });
  } else {
    log.push('없는 시트: ' + missing.join(', '));
    log.push('이름은 대소문자까지 정확히 같아야 합니다 (users, posts, sessions).');
    log.push('');
    log.push('setup() 을 지금 실행합니다…');
    try {
      setup();
      const after = book.getSheets().map((s) => s.getName());
      log.push('✅ setup() 성공. 이제 시트: ' + after.join(' | '));
      needed.forEach((n) => {
        log.push('   ' + n + ': ' + readAll(n).length + '행');
      });
    } catch (err) {
      log.push('❌ setup() 실패: ' + err.message);
      log.push('   → 권한 승인을 끝까지 마쳤는지 확인하세요.');
    }
  }

  const report = log.join('\n');
  Logger.log(report);
  return report;
}

/* 만료된 세션을 지운다. 트리거로 하루 한 번 돌리면 좋다. */
function cleanupSessions() {
  withLock(() => {
    const target = sheet('sessions');
    const limit = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessions = readAll('sessions');

    // 아래에서 위로 지워야 행 번호가 밀리지 않는다
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (Date.now() - new Date(sessions[i].createdAt).getTime() > limit) {
        target.deleteRow(i + 2);
      }
    }
    return { ok: true };
  });
}
