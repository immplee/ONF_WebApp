/* teacher/index.html 껍데기 — 액자를 **로그인과 나란히** 불러 두는 길(2026-09-27).
   왜 재나: 미리 불러 두는 액자가 ① 🔒 위로 비쳐 나오거나(#app 가 [hidden] 을 이기는 CSS 함정)
   ② 토큰을 로그인 전에 흘리거나 ③ 먼저 온 노크를 놓쳐 영영 토큰을 못 받으면 — 셋 다 조용히 일어난다.
   페이지의 인라인 스크립트를 가짜 DOM·가짜 GIS 위에서 그대로 돌린다.
   실행: node test/teacher-shell.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();
const EXEC = /var EXEC = '([^']+)';/.exec(code)[1];

function b64(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function jwt(hd, life) {
  return b64({ alg: 'RS256' }) + '.' + b64({ exp: Math.floor(Date.now() / 1000) + (life || 3600), hd, email: 'x@' + hd }) + '.sig';
}

/** 페이지 한 장을 띄운다. opts: stored(받아 둔 토큰) · framed(남이 감쌈) */
function boot(opts) {
  opts = opts || {};
  const el = (id) => ({ id, hidden: false, textContent: '', innerHTML: '', onclick: null });
  const E = { lock: el('lock'), wait: el('wait'), waitmsg: el('waitmsg'), gsi: el('gsi'), why: el('why'), other: el('other'), app: el('app') };
  E.wait.hidden = true; E.other.hidden = true; E.app.hidden = true;
  const sent = [];                                   // 안쪽(손자 창)으로 간 postMessage
  const inner = { postMessage() {} };                // iframe#app 의 창 = 구글 래퍼
  const user = { parent: inner, postMessage: (m, o) => sent.push({ m, o }) };   // 우리 HTML 이 도는 손자 창
  const srcs = [];
  Object.defineProperty(E.app, 'src', { get: () => srcs[srcs.length - 1] || '', set: (v) => srcs.push(v) });
  E.app.contentWindow = inner;
  const store = new Map(opts.stored ? [['onf_id_tok', opts.stored]] : []);
  const timers = [];
  const gis = { prompts: 0, cb: null };
  let onMsg = null;
  const g = {
    document: { getElementById: (id) => E[id] || null, querySelector: () => null },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
    location: { search: '' },
    URLSearchParams, URL, atob, console: { warn() {}, log() {} },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1].fn = null; },
    google: { accounts: { id: {
      initialize: (c) => { gis.cb = c.callback; }, renderButton() {}, prompt: () => { gis.prompts++; },
      cancel() {}, disableAutoSelect() {} } } },
  };
  g.window = g; g.self = g; g.top = opts.framed ? {} : g;
  g.addEventListener = (t, fn) => { if (t === 'message') onMsg = fn; };
  vm.createContext(g);
  vm.runInContext(code, g, { filename: 'teacher/index.html' });
  return {
    E, sent, srcs, gis, timers,
    login: (hd, sel) => gis.cb({ credential: jwt(hd || 'ownify.co.kr'), select_by: sel || 'auto' }),
    /* 구글 래퍼 한 겹 아래(손자)에서 오는 노크 */
    knock: (extra) => onMsg({ data: Object.assign({ onf: 'auth-please' }, extra || {}),
      source: user, origin: 'https://n-abc-0lu-script.googleusercontent.com' }),
    tokensSent: () => sent.filter((s) => s.m && s.m.onf === 'auth'),
  };
}

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

console.log('[숨긴 액자 — CSS 함정]');
t('⛔ #app[hidden] 을 CSS 가 다시 숨긴다 — `#app{display:block}` 이 기본 [hidden] 을 이긴다', () => {
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  assert.ok(/#app\s*\{[^}]*display\s*:\s*block/.test(css), '전제(#app display:block)가 바뀌었다 — 이 검사를 다시 봐라');
  assert.ok(/#app\[hidden\]\s*\{[^}]*visibility\s*:\s*hidden/.test(css),
    '#app[hidden]{visibility:hidden} 이 없다 — 미리 불러 둔 GAS 화면이 🔒 아래로 비쳐 나온다');
});

console.log('\n[로그인과 나란히 불러 두기]');
t('토큰이 없어도 **로그인 전에** 액자 주소가 들어간다 — 숨긴 채로', () => {
  const p = boot();
  assert.deepStrictEqual(p.srcs, [EXEC], '로그인 전에 액자를 불러 두지 않았다');
  assert.strictEqual(p.E.app.hidden, true, '로그인 전에 액자가 보인다');
  assert.strictEqual(p.E.lock.hidden, false, '🔒 가 사라졌다');
  assert.strictEqual(p.E.wait.hidden, true, '로그인 전인데 회전자가 떴다');
  assert.strictEqual(p.gis.prompts, 1, 'One Tap 을 한 번 물어야 한다(종전 그대로)');
});

t('⛔ 노크가 로그인보다 먼저 와도 **토큰은 로그인 뒤에만** 간다 — 먼저 온 노크는 안 버린다', () => {
  const p = boot();
  p.knock();
  assert.strictEqual(p.tokensSent().length, 0, '로그인 전에 토큰이 갔다');
  assert.strictEqual(p.E.app.hidden, true, '노크만으로 액자가 보였다');
  p.login();
  assert.strictEqual(p.tokensSent().length, 1, '먼저 노크한 안쪽이 토큰을 못 받았다(영원한 대기)');
  assert.ok(p.tokensSent()[0].o.endsWith('googleusercontent.com'), 'targetOrigin 이 노크 출처가 아니다');
  assert.strictEqual(p.E.lock.hidden, true);
  assert.strictEqual(p.E.app.hidden, false);
  assert.strictEqual(p.E.wait.hidden, true, '이미 그려진 액자 뒤에 회전자를 다시 띄웠다');
  assert.deepStrictEqual(p.srcs, [EXEC], '살아 있는 액자를 다시 열었다');
});

t('로그인이 노크보다 먼저면 종전처럼 — 회전자 → 노크 때 토큰', () => {
  const p = boot();
  p.login();
  assert.strictEqual(p.E.app.hidden, false);
  assert.strictEqual(p.E.wait.hidden, false, '회전자가 안 떴다');
  assert.strictEqual(p.tokensSent().length, 0);
  assert.ok(p.timers.some((x) => x.fn && x.ms === 8000), '못 열림 마감 시계(8초)가 안 걸렸다');
  p.knock();
  assert.strictEqual(p.tokensSent().length, 1);
  assert.strictEqual(p.E.wait.hidden, true);
  assert.deepStrictEqual(p.srcs, [EXEC], '액자를 두 번 열었다');
});

t('⛔ 로그인 중 구글 세션이 새로 생겼고(*_add_session) 노크가 없었으면 **한 번 다시 연다**', () => {
  const p = boot();
  p.login('ownify.co.kr', 'btn_add_session');
  assert.deepStrictEqual(p.srcs, [EXEC, EXEC], '세션 없이 열린 빈 액자를 그대로 뒀다');
  p.knock();
  assert.strictEqual(p.tokensSent().length, 1);
});

t('⛔ add_session 이어도 이미 노크했으면(살아 있는 화면) 다시 열지 않는다', () => {
  const p = boot();
  p.knock();
  p.login('ownify.co.kr', 'btn_add_session');
  assert.deepStrictEqual(p.srcs, [EXEC]);
  assert.strictEqual(p.tokensSent().length, 1);
});

t('개인 계정이면 액자는 숨은 채, 🔒 와 [다른 계정] 이 그대로', () => {
  const p = boot();
  p.knock();
  p.login('gmail.com');
  assert.strictEqual(p.E.app.hidden, true);
  assert.strictEqual(p.E.lock.hidden, false);
  assert.strictEqual(p.E.other.hidden, false);
  assert.strictEqual(p.tokensSent().length, 0, '개인 계정 토큰이 안쪽으로 갔다');
});

console.log('\n[종전 길 그대로]');
t('받아 둔 토큰이 살아 있으면 바로 연다 · One Tap 은 안 띄운다(6efd252)', () => {
  const p = boot({ stored: jwt('ownify.co.kr') });
  assert.deepStrictEqual(p.srcs, [EXEC], '액자를 두 번 열었다(미리 불러 두기 + 바로 열기)');
  assert.strictEqual(p.E.app.hidden, false);
  assert.strictEqual(p.E.wait.hidden, false);
  assert.strictEqual(p.gis.prompts, 0, '이미 들어와 있는데 One Tap 을 띄웠다');
  p.knock();
  assert.strictEqual(p.tokensSent().length, 1);
});

t('만료 다시 받기 — stale 노크엔 prompt 를 다시 부르고, 새 토큰은 그 창으로 간다', () => {
  const p = boot({ stored: jwt('ownify.co.kr') });
  p.knock();
  p.knock({ stale: true });
  assert.strictEqual(p.gis.prompts, 1, '만료 노크에 prompt 를 안 불렀다');
  p.login();
  assert.strictEqual(p.tokensSent().length, 2);
  assert.deepStrictEqual(p.srcs, [EXEC], '다시 받는 동안 액자를 다시 열었다');
});

t('⛔ 남이 감싼 페이지에선 미리 불러 두지 않는다', () => {
  const p = boot({ framed: true });
  assert.deepStrictEqual(p.srcs, []);
});

t('mount 는 스스로 액자를 연다 — 미리 불러 두기에 기대지 않는다(감싸인 채 받아 둔 토큰: 종전 그대로)', () => {
  const p = boot({ framed: true, stored: jwt('ownify.co.kr') });
  assert.deepStrictEqual(p.srcs, [EXEC], '보이는 액자에 주소가 없다');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
