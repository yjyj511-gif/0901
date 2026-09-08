/* ============================================
   step1-auth.gs — 1단계: 회원가입 / 로그인만

   배포가 제대로 되는지 먼저 확인하기 위한 최소 버전이다.
   게시글 기능은 아직 없다. 확인이 끝나면 Code.gs 전체로 교체한다.
   (Code.gs는 이 파일의 상위 집합이라 데이터는 그대로 이어진다)

   ── 진행 순서 ──────────────────────────────
   1. 이 파일 전체를 Apps Script 편집기에 붙여넣는다.
   2. setup()   을 실행한다 → users / sessions 시트가 만들어진다.
   3. testAuth() 를 실행한다 → 배포 없이 코드만 먼저 검증한다.
                                실행 로그(Ctrl+Enter)에 결과가 찍힌다.
   4. [배포 > 새 배포 > 웹 앱]  실행: 나 / 액세스: 모든 사용자
   5. 나온 .../exec 주소를 브라우저에 그냥 붙여넣어 본다.
      {"ok":true,"message":"연결됐습니다..."} 가 보이면 배포 성공이다.
   6. 그 주소를 js/config.js 의 BLOG_API_URL 에 넣는다.
   ============================================ */

/* 시트 주소 .../spreadsheets/d/<여기>/edit 의 가운데 부분 */
const SHEET_ID = '1yNRhBwuq2ouszyKy3uGm3cZmIcSlyJIZK7nnfD6Cn7w';

const SESSION_DAYS = 30;   // 로그인 유지 기간

/* 시트 이름 → 헤더. 이 순서대로 열이 만들어진다. */
const SCHEMA = {
  users: ['id', 'username', 'email', 'passwordHash', 'bio', 'createdAt'],
  sessions: ['token', 'userId', 'createdAt'],
};

/* ============ 진입점 ============ */

/* 주소창에 그냥 붙여넣으면 여기로 온다 (action 없이) → 연결 확인용 응답 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!params.action) {
    return json({
      ok: true,
      message: '연결됐습니다. 1단계(회원가입·로그인) 서버가 살아 있습니다.',
      actions: ['bootstrap', 'signup', 'login', 'logout'],
    });
  }
  return route(params);
}

/* 브라우저는 POST 앞에 OPTIONS 프리플라이트를 보내는데 Apps Script는 그걸
   처리하지 못한다. 그래서 프론트엔드는 Content-Type을 text/plain으로 보내고
   (프리플라이트가 없는 "단순 요청"), 여기서 본문을 직접 JSON으로 읽는다. */
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, message: '요청 본문을 읽을 수 없습니다.' });
  }
  return route(body);
}

function route(req) {
  try {
    switch (req.action) {
      case 'bootstrap': return json(bootstrap(req));
      case 'signup':    return json(signup(req));
      case 'login':     return json(login(req));
      case 'logout':    return json(logout(req));

      default:
        return json({
          ok: false,
          message: '1단계에서는 지원하지 않는 기능입니다: ' + req.action,
        });
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
  return SpreadsheetApp.openById(SHEET_ID);
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
      target = book.getSheetByName(name);
      if (!target) throw err;
    }
  }

  const width = SCHEMA[name].length;
  if (String(target.getRange(1, 1).getValue()) === '') {
    target.getRange(1, 1, 1, width).setValues([SCHEMA[name]]).setFontWeight('bold');
    target.setFrozenRows(1);
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
      headers.forEach((key, i) => {
        obj[key] = row[i] instanceof Date ? row[i].toISOString() : row[i];
      });
      return obj;
    });
}

/* 객체를 SCHEMA 순서의 행 배열로 바꾼다 */
function toRow(name, obj) {
  return SCHEMA[name].map((key) => {
    const value = obj[key];
    return value === undefined || value === null ? '' : value;
  });
}

/* A열 값으로 행 번호를 찾는다. 없으면 -1. (헤더가 1행이라 반환값은 2 이상) */
function findRow(name, keyValue) {
  const ids = sheet(name).getDataRange().getValues().map((row) => row[0]);
  const index = ids.indexOf(keyValue);
  return index === -1 ? -1 : index + 1;
}

/* 쓰기는 반드시 잠근다. 두 명이 동시에 가입하면 같은 행에 겹쳐 쓰인다. */
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

/* ============ 비밀번호 ============ */

function uid(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

/* 솔트는 시트가 아니라 스크립트 속성에 둔다.
   시트를 공유해도 솔트까지 넘어가지 않게 하기 위해서다. */
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
  // 바이트 배열을 16진수 문자열로
  return bytes.map((b) => ((b & 0xff) + 0x100).toString(16).slice(1)).join('');
}

/* 밖으로 내보낼 때는 해시를 반드시 뺀다 */
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

/* ============ 기능 ============ */

/* 페이지가 뜰 때 한 번 호출한다.
   1단계에는 게시글이 없으므로 posts는 빈 배열로 준다.
   덕분에 목록 페이지가 "아직 글이 없습니다"로 정상 표시된다. */
function bootstrap(req) {
  return {
    ok: true,
    posts: [],
    user: publicUser(userFromToken(req.token)),
  };
}

function signup(req) {
  const username = String(req.username || '').trim();
  const email = String(req.email || '').trim();
  const password = String(req.password || '');

  // 프론트엔드에도 같은 검사가 있지만, 서버가 마지막 방어선이다.
  // 브라우저를 거치지 않고 API를 직접 부를 수 있기 때문이다.
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

    // 가입하자마자 로그인 상태가 되도록 토큰을 함께 준다
    return { ok: true, user: publicUser(user), token: issueToken(user.id) };
  });
}

function login(req) {
  const key = String(req.account || '').trim().toLowerCase();

  // 이메일로도 닉네임으로도 로그인할 수 있다
  const user = readAll('users').find(
    (u) => String(u.email).toLowerCase() === key || String(u.username).toLowerCase() === key
  );

  // 어느 쪽이 틀렸는지 알려 주지 않는다 (가입 여부가 새어 나가지 않도록)
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

/* ============ 최초 설정 ============
   편집기에서 한 번 실행한다. 여러 번 실행해도 안전하다. */
function setup() {
  const book = ss();

  Object.keys(SCHEMA).forEach((name) => ensureSheet(book, name));

  // 로그인해 볼 데모 계정 (demo@blog.dev / demo1234)
  if (!readAll('users').some((u) => u.id === 'u_demo')) {
    sheet('users').appendRow(toRow('users', {
      id: 'u_demo',
      username: '홍길동',
      email: 'demo@blog.dev',
      passwordHash: hashPassword('demo1234'),
      bio: '데모 계정입니다.',
      createdAt: new Date().toISOString(),
    }));
  }

  Logger.log('설정 완료. 다음: testAuth() 를 실행해 보세요.');
}

/* ============ 자체 점검 ============
   배포하기 전에 코드만 먼저 확인한다.
   여기서 실패하면 코드나 시트 문제이고,
   여기는 통과하는데 브라우저에서 실패하면 배포/CORS 문제다. */
function testAuth() {
  const log = [];
  let passed = 0;
  let failed = 0;

  const check = (name, condition, detail) => {
    if (condition) {
      passed += 1;
      log.push('  통과  ' + name);
    } else {
      failed += 1;
      log.push('  실패  ' + name + (detail ? ' → ' + detail : ''));
    }
  };

  // 매번 새 이메일을 써서 이전 실행과 겹치지 않게 한다
  const stamp = Date.now();
  const email = 'test' + stamp + '@example.com';
  const username = '테스트' + stamp;
  let createdUserId = null;
  const tokens = [];

  try {
    check('users 시트가 있다', !!ss().getSheetByName('users'), 'setup()을 먼저 실행하세요');
    check('sessions 시트가 있다', !!ss().getSheetByName('sessions'), 'setup()을 먼저 실행하세요');

    // --- 입력 검증 ---
    check('짧은 닉네임을 막는다',
      signup({ username: '가', email, password: 'password1' }).field === 'username');
    check('잘못된 이메일을 막는다',
      signup({ username, email: '이메일아님', password: 'password1' }).field === 'email');
    check('짧은 비밀번호를 막는다',
      signup({ username, email, password: '123' }).field === 'password');

    // --- 가입 ---
    const created = signup({ username, email, password: 'password1', bio: '자동 점검' });
    check('가입에 성공한다', created.ok === true, created.message);
    if (created.ok) {
      createdUserId = created.user.id;
      tokens.push(created.token);
      check('가입과 동시에 토큰을 준다', String(created.token).length > 10);
      check('응답에 비밀번호 해시가 없다',
        JSON.stringify(created).indexOf('passwordHash') === -1);
    }

    // --- 중복 ---
    check('중복 이메일을 막는다',
      signup({ username: username + 'x', email, password: 'password1' }).field === 'email');
    check('중복 닉네임을 막는다',
      signup({ username, email: 'other' + stamp + '@example.com', password: 'password1' }).field === 'username');

    // --- 로그인 ---
    check('틀린 비밀번호를 막는다',
      login({ account: email, password: '틀린비번' }).ok === false);

    const byEmail = login({ account: email, password: 'password1' });
    check('이메일로 로그인된다', byEmail.ok === true, byEmail.message);
    if (byEmail.ok) tokens.push(byEmail.token);

    const byName = login({ account: username, password: 'password1' });
    check('닉네임으로도 로그인된다', byName.ok === true, byName.message);
    if (byName.ok) tokens.push(byName.token);

    // --- 토큰 ---
    if (byEmail.ok) {
      check('토큰으로 내 정보를 찾는다',
        bootstrap({ token: byEmail.token }).user.email === email);
      logout({ token: byEmail.token });
      check('로그아웃하면 토큰이 죽는다',
        bootstrap({ token: byEmail.token }).user === null);
    }
    check('가짜 토큰은 통하지 않는다', bootstrap({ token: '가짜' }).user === null);
    check('토큰이 없으면 비로그인이다', bootstrap({}).user === null);

    // --- 시트에 원문이 남지 않는지 ---
    check('시트에 원문 비밀번호가 없다',
      JSON.stringify(readAll('users')).indexOf('password1') === -1);

    // --- 데모 계정 ---
    check('데모 계정으로 로그인된다',
      login({ account: 'demo@blog.dev', password: 'demo1234' }).ok === true,
      'setup()을 실행했는지 확인하세요');

  } finally {
    // 점검용으로 만든 행을 지운다
    tokens.forEach((token) => {
      const row = findRow('sessions', token);
      if (row > 1) sheet('sessions').deleteRow(row);
    });
    if (createdUserId) {
      const row = findRow('users', createdUserId);
      if (row > 1) sheet('users').deleteRow(row);
    }
  }

  log.unshift(failed === 0
    ? `전부 통과 (${passed}건). 이제 [배포 > 새 배포 > 웹 앱]으로 배포하세요.`
    : `${failed}건 실패 / ${passed}건 통과`);

  const report = log.join('\n');
  Logger.log(report);
  return report;
}

/* 만료된 세션을 지운다. [트리거]에서 하루 한 번 돌리면 좋다. */
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
