/* teacher/index.html 정적 선생님 홈 「정적 먼저」·로그인 → Worker 입장권(tch.) — 밖으로 4-④-2c 껍데기 몫(2026-10-30)
   · 로그인(GIS 팝업·홈 화면 앱 리디렉트 gsiBack 둘 다 onCredential)마다 남은 7일 이하면 POST <Worker>/t/login {idt} → localStorage onf_tch {tk, x}
   · 기기 스위치 ?tout=1|0(onf_tout · 기본 꺼짐) · 입장권 있을 때만 · 홈(mode 없음)만 · 홈 화면 앱(standalone)은 아직 안 함
   · 판 outHello → outBoot{tk} · 그리기 전 outFail·시한 = 지금 길(구글 홈) + 그날 기억 · homeDrawn 뒤엔 안 바꾼다 · 화면 auth-please → auth{tch}
   ⚠️ 진짜 Worker·정적 판·WebKit 은 vm 이 못 본다 — 라이브 재기는 보고서. 실행: node test/teacher-tout.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('var CLIENT_ID'));
const FRAMEJS = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8');

const CHROME = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', platform: 'MacIntel', maxTouchPoints: 0 };
const MACSAFARI = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 0 };
const IPHONE = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 };
const IPAD = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 };
const KORIGIN = 'https://n-abc-0lu-script.googleusercontent.com';
const APP = 'https://app.ownify.co.kr', TURL = APP + '/teacher/';
const WORKER = 'https://onf-media.edia--orker.workers.dev';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const now = () => Math.floor(Date.now() / 1000);
const gtok = (em) => 'x.' + b64({ exp: now() + 3000, hd: 'ownify.co.kr', email: em || 't@ownify.co.kr' }) + '.y';
const tch = (tag, em) => 'tch.' + b64({ e: em || 't@ownify.co.kr', n: 'Luna', o: 0, iat: now(), x: now() + 30 * 86400, z: tag || 'a' }) + '.' + 'S'.repeat(43);
const odk = () => 'odk1.' + b64({ email: 't@ownify.co.kr', hd: 'ownify.co.kr', iat: now(), exp: now() + 30 * 86400 }) + '.sig';
const tkMail = (tk) => JSON.parse(Buffer.from(tk.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).e;
const tchCell = (days, tag) => JSON.stringify({ tk: tch(tag), x: now() + Math.round(days * 86400) });
const tick = () => new Promise((r) => setImmediate(r));

/* 껍데기 본 스크립트를 통째로 돌린다 — fetch·시계·액자 창은 대역 · 판 말은 손으로 쏜다 */
function boot(store, opt) {
  opt = opt || {};
  const calls = [], handlers = {}, els = {}, timers = new Map(), logs = [], fetches = [], nav = [], sent = [];
  let clock = 0, tid = 0;
  const win = { name: 'appwin', postMessage(m, o) { sent.push({ m: JSON.parse(JSON.stringify(m)), o }); },
    location: { get href() { throw new Error('cross-origin'); }, replace(u) { nav.push(String(u)); } } };
  const el = (id) => els[id] || (els[id] = { id, hidden: id === 'app' || id === 'wait', style: {}, classList: { add() {}, remove() {}, toggle() {} },
    contentWindow: id === 'app' ? win : null, isConnected: true, appendChild() {}, setAttribute() {}, parentNode: null, textContent: '', innerHTML: '', querySelector: () => null,
    _on: {}, addEventListener(tp, f) { (this._on[tp] = this._on[tp] || []).push(f); } });
  const ls = store || {};
  const ss = {}; if (opt.gsi) ss.onf_gsi = opt.gsi;
  const log = (...a) => logs.push(a.map(String).join(' '));
  const g = {
    navigator: Object.assign({}, CHROME, opt.nav || {}), console: { warn: log, log, info: log, error: log }, atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    URL, URLSearchParams, Date, JSON, Math, Promise,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    sessionStorage: { getItem: (k) => (k in ss ? ss[k] : null), setItem: (k, v) => { ss[k] = String(v); }, removeItem: (k) => { delete ss[k]; } },
    document: { getElementById: el, querySelector: () => null, createElement: (tag) => { const e = el('x' + Math.random()); e.tag = tag; return e; }, body: { appendChild(e) { e.parentNode = { removeChild() {} }; } },
      documentElement: { setAttribute() {}, getAttribute() {} } },
    location: { search: opt.search || '', pathname: '/teacher/', origin: 'https://class.ownify.co.kr', href: 'https://class.ownify.co.kr/teacher/' + (opt.search || ''), reload() { calls.push('reload'); } },
    history: { state: null, length: 2, replaceState() {}, pushState() {}, go() {}, back() {} },
    addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); },
    removeEventListener: (type, fn) => { handlers[type] = (handlers[type] || []).filter((f) => f !== fn); },
    setTimeout: (fn, ms) => { timers.set(++tid, { fn, at: clock + (ms || 0) }); return tid; },
    clearTimeout: (id) => { timers.delete(id); }, setInterval: () => 0, clearInterval() {},
    fetch: (url, init) => {
      fetches.push({ url, init });
      const r = typeof opt.fetch === 'function' ? opt.fetch(url, init) : { status: 200, body: { ok: true, tk: tch('new'), n: 'Luna', o: 0, x: now() + 30 * 86400 } };
      if (r === 'net') return Promise.reject(new TypeError('net'));
      return Promise.resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, json: () => Promise.resolve(r.body) });
    },
    google: { accounts: { id: { initialize() {}, renderButton() {}, prompt: () => calls.push('prompt'), cancel() {}, disableAutoSelect: () => calls.push('disableAutoSelect') } } }
  };
  if (opt.noFrameJs !== true) {
    vm.createContext(g); g.window = g; g.top = g; g.self = g;
    vm.runInContext(FRAMEJS, g);                                     // 진짜 onf-frame.js — ONF.frame.WORKER·OUT_BOOK·isAppOrigin 을 그쪽에서
  } else { g.window = g; g.top = g; g.self = g; vm.createContext(g); }
  vm.runInContext(main, g);
  const R = {
    g, ls, ss, els, calls, logs, fetches, nav, sent, win,
    advance(ms) {
      const end = clock + ms;
      for (;;) {
        let nx = null;
        for (const [k, v] of timers) if (v.at <= end && (!nx || v.at < nx[1].at)) nx = [k, v];
        if (!nx) break;
        timers.delete(nx[0]); clock = nx[1].at; nx[1].fn();
      }
      clock = end;
    },
    load() { (els.app._on.load || []).forEach((f) => f({ type: 'load' })); },
    fire(data, source, origin) { (handlers.message || []).slice().forEach((h) => h({ data, source, origin })); },
    fromApp(data) { R.fire(data, win, APP); },                       // 정적 판(액자 직접 자식 · 정적 출처)
    knockG(src) { R.lastSrc = src || { parent: win, postMessage(m, o) { sent.push({ m: JSON.parse(JSON.stringify(m)), o, g: 1 }); } }; R.fire({ onf: 'auth-please', stale: false }, R.lastSrc, KORIGIN); },
    opened: () => nav.concat([String(els.app.src || '')]).filter(Boolean),
    execOpen: () => R.opened().some((u) => /AKfycb/.test(u)),
    staticOpen: () => R.opened().some((u) => u === TURL),
    sentTo: (o) => sent.filter((x) => x.o === o).map((x) => x.m)
  };
  return R;
}
const login = (R, tok) => R.g.onCredential({ credential: tok || gtok() });

let pass = 0, fail = 0;
const tests = [];
function t(label, fn) { tests.push([label, fn]); }

console.log('[🏫 선생님 껍데기 — 로그인 → Worker 입장권 · 정적 먼저]');

t('A0 onf-frame.js 가 Worker 바탕 주소를 낸다(있는 상수에서 · 새로 적지 않는다) · 껍데기는 그 이름만 부른다', () => {
  const R = boot({});
  assert.strictEqual(R.g.ONF.frame.WORKER, WORKER);
  assert.ok(!/onf-media\.edia--orker/.test(main), '⛔ 껍데기에 Worker 주소를 새로 적었다(onf-frame.js 상수를 써라)');
  assert.ok(!/['"]https:\/\/app\.ownify\.co\.kr\/teacher/.test(main), '⛔ 껍데기에 정적 선생님 판 주소를 새로 적었다(ONF.frame.OUT_BOOK 에서)');
});

t('A1 로그인(팝업 onCredential) → POST <Worker>/t/login {idt} (text/plain · 머리말 없음) → onf_tch = {tk, x}', async () => {
  const R = boot({}), tok = gtok();
  login(R, tok); await tick(); await tick();
  assert.strictEqual(R.fetches.length, 1, '⛔ /t/login 을 안 불렀다');
  const f = R.fetches[0];
  assert.strictEqual(f.url, WORKER + '/t/login');
  assert.strictEqual(f.init.method, 'POST');
  assert.ok(!f.init.headers, '⛔ 머리말을 달면 사전 요청(preflight)이 붙는다');
  assert.deepStrictEqual(JSON.parse(f.init.body), { idt: tok });
  const c = JSON.parse(R.ls.onf_tch);
  assert.ok(/^tch\./.test(c.tk) && c.x > now(), '⛔ 입장권 칸 꼴이 틀렸다: ' + R.ls.onf_tch);
  assert.deepStrictEqual(Object.keys(c).sort(), ['tk', 'x'], '⛔ 입장권 칸에 다른 것을 적었다');
  assert.ok(R.execOpen(), '⛔ 지금 길(구글 홈)을 안 열었다 — 입장권 받기는 덧붙이는 것이다');
});

t('A2 홈 화면 앱 리디렉트 길(gsiBack · sessionStorage onf_gsi)도 /t/login · standalone 도 입장권은 받는다', async () => {
  const tok = gtok();
  const R = boot({}, { gsi: tok, nav: { standalone: true } });
  await tick(); await tick();
  assert.strictEqual(R.fetches.length, 1, '⛔ 리디렉트로 받은 토큰을 /t/login 에 안 보냈다');
  assert.deepStrictEqual(JSON.parse(R.fetches[0].init.body), { idt: tok });
  assert.ok(/^tch\./.test(JSON.parse(R.ls.onf_tch).tk));
  assert.ok(!('onf_gsi' in R.ss), '⛔ 한 번 쓴 리디렉트 토큰이 남았다');
});

t('A2b WebKit(사파리·아이폰 크롬·아이패드 · devkeyOff)도 /t/login 입장권은 받는다 — 기기 열쇠처럼 저장은 안 하고 이 페이지 메모리에만', async () => {
  for (const nav of [MACSAFARI, IPHONE, IPAD]) {
    const R = boot({}, { nav });
    login(R); await tick(); await tick();
    assert.strictEqual(R.fetches.length, 1, '⛔ WebKit 에서 입장권을 안 받았다: ' + nav.platform);
    assert.ok(!('onf_tch' in R.ls), '⛔ WebKit 이 30일 입장권을 저장소에 남겼다: ' + nav.platform);
    assert.ok(/^tch\./.test(R.g.tchGet().tk), '⛔ 메모리에도 없다');
    R.g.tchDrop(); assert.strictEqual(R.g.tchGet(), null);
  }
  //   기기 열쇠를 7일 끈 크롬(DK_OFF)도 같은 규칙(devkeyOff)
  const K = boot({ onf_devkey_off: String(Date.now()) });
  login(K); await tick(); await tick();
  assert.ok(!('onf_tch' in K.ls) && K.g.tchGet());
});

t('A2c 계정이 바뀌면(같은 컴퓨터 Mary → Peter) 7일 규칙 없이 옛 입장권을 버리고 새로 묻는다 · 그 사이 옛 계정으로 정적 먼저를 안 연다', async () => {
  const R = boot({ onf_tch: JSON.stringify({ tk: tch('m', 'mary@ownify.co.kr'), x: now() + 25 * 86400 }), onf_tout: '1' });
  login(R, gtok('peter@ownify.co.kr'));
  assert.ok(!R.staticOpen() && R.execOpen(), '⛔ 다른 계정의 입장권으로 정적 먼저를 열었다');
  R.fromApp({ onf: 'outHello' });
  assert.ok(!R.sent.some((x) => x.m.onf === 'outBoot'), '⛔ 다른 계정의 입장권을 줬다');
  await tick(); await tick();
  assert.strictEqual(R.fetches.length, 1, '⛔ 다른 계정인데 /t/login 을 안 불렀다');
  //   대소문자만 다르면 같은 계정(안 묻는다)
  const S = boot({ onf_tch: JSON.stringify({ tk: tch('p', 'peter@ownify.co.kr'), x: now() + 25 * 86400 }), onf_tout: '1' });
  login(S, gtok('Peter@Ownify.co.kr')); await tick();
  assert.strictEqual(S.fetches.length, 0); assert.ok(S.staticOpen());
  //   실패해도 옛 계정 칸은 안 돌아온다
  const F = boot({ onf_tch: JSON.stringify({ tk: tch('m', 'mary@ownify.co.kr'), x: now() + 25 * 86400 }) }, { fetch: () => ({ status: 503, body: { ok: false, reason: 'off' } }) });
  login(F, gtok('peter@ownify.co.kr')); await tick(); await tick();
  assert.ok(!('onf_tch' in F.ls), '⛔ 다른 계정 입장권이 남았다');
  //   새로 받은 것은 새 계정
  const N = boot({ onf_tch: JSON.stringify({ tk: tch('m', 'mary@ownify.co.kr'), x: now() + 25 * 86400 }) }, { fetch: () => ({ status: 200, body: { ok: true, tk: tch('p', 'peter@ownify.co.kr'), x: now() + 30 * 86400 } }) });
  login(N, gtok('peter@ownify.co.kr')); await tick(); await tick();
  assert.strictEqual(tkMail(JSON.parse(N.ls.onf_tch).tk), 'peter@ownify.co.kr');
});

t('A2d 「다른 계정으로」 두 갈래(잠금 화면 버튼 · 안쪽 🔒 other) 모두 입장권도 버린다', async () => {
  const R = boot({ onf_tch: tchCell(20) });
  login(R, 'x.' + b64({ exp: now() + 3000, email: 'me@gmail.com' }) + '.y');   // 회사 밖 계정 → 버튼이 뜬다
  R.els.other.onclick();
  assert.ok(!('onf_tch' in R.ls), '⛔ 잠금 화면 「다른 계정으로」가 입장권을 남겼다');
  const K = boot({ onf_tch: tchCell(20) });
  login(K); K.knockG();
  K.fire({ onf: 'auth-please', stale: true, other: true }, K.lastSrc, KORIGIN);
  assert.ok(!('onf_tch' in K.ls), '⛔ 안쪽 「다른 계정으로 로그인」이 입장권을 남겼다');
});

t('A3 남은 7일 넘으면 안 묻는다 · 7일 이하·만료·깨진 칸이면 새로', async () => {
  for (const [cell, want] of [[tchCell(20), 0], [tchCell(8), 0], [tchCell(6.9), 1], [tchCell(-1), 1], ['{bad', 1], [JSON.stringify({ tk: 'odk1.x.y', x: now() + 99999 }), 1]]) {
    const R = boot({ onf_tch: cell });
    login(R); await tick(); await tick();
    assert.strictEqual(R.fetches.length, want, '⛔ 칸 ' + cell.slice(0, 40) + ' 에서 묻기 ' + R.fetches.length + '번');
  }
});

t('A4 실패·꺼짐 = 조용히 지금 길 — 503 off·unverified · 400 · 그물 끊김 · 꼴 틀린 답(tch 아님·x 없음·x 지남) 은 안 적는다 · 403(끊김)은 받아 둔 것도 지운다', async () => {
  const bads = [{ status: 503, body: { ok: false, reason: 'off' } }, { status: 503, body: { ok: false, reason: 'unverified' } }, { status: 400, body: { ok: false, reason: 'invalid_token' } }, 'net',
    { status: 200, body: { ok: true, tk: 'odk1.a.b', x: now() + 99 } }, { status: 200, body: { ok: true, tk: tch() } }, { status: 200, body: { ok: true, tk: tch(), x: now() - 5 } }, { status: 200, body: { ok: false } }];
  for (const b of bads) {
    const R = boot({}, { fetch: () => b });
    login(R); await tick(); await tick();
    assert.ok(!('onf_tch' in R.ls), '⛔ 실패 답을 적었다: ' + JSON.stringify(b));
    assert.ok(R.execOpen(), '⛔ 실패에 지금 길이 막혔다');
  }
  const old = tchCell(3);
  const K = boot({ onf_tch: old }, { fetch: () => ({ status: 503, body: { ok: false, reason: 'off' } }) });
  login(K); await tick(); await tick();
  assert.strictEqual(K.ls.onf_tch, old, '⛔ 꺼짐(503)에 아직 산 입장권을 지웠다');
  const X = boot({ onf_tch: old }, { fetch: () => ({ status: 403, body: { ok: false, reason: 'revoked' } }) });
  login(X); await tick(); await tick();
  assert.ok(!('onf_tch' in X.ls), '⛔ 끊긴 선생님(403)의 입장권을 남겼다');
});

t('B0 꺼짐(tout 없음 · 기본) = 지금 길 그대로 — 입장권이 있어도 정적 판을 안 열고 · 정적 출처 노크·판 말은 버린다 · 구글 노크엔 종전 답', async () => {
  for (const st of [{ onf_tch: tchCell(20) }, { onf_tch: tchCell(20), onf_tout: '0' }]) {
    const R = boot(st), tok = gtok();
    login(R, tok);
    assert.ok(!R.staticOpen() && R.execOpen(), '⛔ 꺼짐에 정적 판을 열었다');
    R.fromApp({ onf: 'auth-please', stale: false });
    R.fromApp({ onf: 'bookHello' });
    assert.strictEqual(R.sent.length, 0, '⛔ 꺼짐에 정적 출처 말에 답했다: ' + JSON.stringify(R.sent));
    R.knockG();
    assert.deepStrictEqual(R.sent.map((x) => x.m), [{ onf: 'auth', token: tok, hist: 1 }], '⛔ 구글 노크 답이 종전과 다르다');
  }
  const Q = boot({ onf_tch: tchCell(20) }, { search: '?tout=0' });
  login(Q);
  assert.strictEqual(Q.ls.onf_tout, '0'); assert.ok(!Q.staticOpen());
});

t('B1 ?tout=1(기억) · 입장권 있음 · 홈 → 정적 판 먼저(주소에 입장권 없음) → outHello 에 outBoot{tk} · homeDrawn 뒤 60초 · outFail 와도 그대로 · 화면 노크엔 auth{tch}', async () => {
  const cell = tchCell(20), tk = JSON.parse(cell).tk;
  const R = boot({ onf_tch: cell }, { search: '?tout=1' }), tok = gtok();
  login(R, tok);
  assert.strictEqual(R.ls.onf_tout, '1');
  assert.deepStrictEqual(R.nav, [TURL], '⛔ 정적 판을 먼저 안 열었다: ' + JSON.stringify(R.nav));
  R.fromApp({ onf: 'outHello' });
  assert.deepStrictEqual(R.sentTo(APP), [{ onf: 'outBoot', tk }], '⛔ outBoot 꼴이 틀렸다');
  R.advance(1500); R.fromApp({ onf: 'homeDrawn' });
  R.advance(60000);
  R.fromApp({ onf: 'outFail', why: 'error' });
  R.load(); R.advance(60000);
  assert.deepStrictEqual(R.nav, [TURL], '⛔ 그린 뒤 지금 길로 바꿨다');
  assert.ok(!('onfTOutFail' in R.ls), '⛔ 그린 판을 실패로 적었다');
  assert.strictEqual(R.calls.filter((c) => c === 'reload').length, 0);
  R.sent.length = 0;
  R.fromApp({ onf: 'auth-please', stale: false });
  assert.deepStrictEqual(R.sent.map((x) => [x.m, x.o]), [[{ onf: 'auth', token: tk, hist: 1 }, APP]], '⛔ 정적 화면에 구글 토큰을 줬거나 입장권을 안 줬다');
  //   그 뒤 기억만으로(주소 없이) 다시 열어도 정적 먼저
  const S = boot({ onf_tch: cell, onf_tout: '1' });
  login(S);
  assert.deepStrictEqual(S.nav, [TURL]);
});

t('B2 그리기 전 outFail · hello 없음 · 그리기 시한 → 지금 길(같은 액자에 구글 홈) + 그날 기억 → 그날 다음 열기는 바로 지금 길 · ?tout=1 이 기억을 지운다', async () => {
  const cell = tchCell(20);
  const cases = [
    (R) => { R.fromApp({ onf: 'outHello' }); R.fromApp({ onf: 'outFail', why: 'copy' }); },
    (R) => { R.advance(60000); },
    (R) => { R.fromApp({ onf: 'outHello' }); R.advance(60000); }
  ];
  for (const go of cases) {
    const store = { onf_tch: cell, onf_tout: '1' };
    const R = boot(store);
    login(R, gtok());
    go(R);
    assert.strictEqual(R.nav[0], TURL);
    assert.ok(R.nav.slice(1).some((u) => /AKfycb/.test(u)) || /AKfycb/.test(String(R.els.app.src || '')), '⛔ 물러나 지금 길로 안 갔다: ' + JSON.stringify(R.nav));
    assert.ok(Number(store.onfTOutFail) > 0, '⛔ 그날 기억을 안 적었다');
    //   물러난 뒤 옛 정적 문서의 노크는 버린다 · 구글 노크엔 구글 토큰
    R.sent.length = 0;
    R.fromApp({ onf: 'auth-please', stale: false });
    assert.strictEqual(R.sent.length, 0, '⛔ 물러난 정적 판에 답했다');
    const N = boot(store); login(N);
    assert.ok(!N.staticOpen() && N.execOpen(), '⛔ 그날 물러난 기기가 또 정적 판을 열었다');
    const Y = boot(store, { search: '?tout=1' }); login(Y);
    assert.ok(Y.staticOpen(), '⛔ ?tout=1 이 그날 기억을 안 지웠다');
  }
});

t('B3 물러난 지금 길도 종전처럼 돈다 — 구글 노크에 구글 토큰 · load 뒤 노크 없으면 8초 안내', async () => {
  const R = boot({ onf_tch: tchCell(20), onf_tout: '1' }), tok = gtok();
  login(R, tok);
  R.load();                                                        // 정적 문서 load — 지금 길 시계가 세면 안 된다
  R.fromApp({ onf: 'outFail', why: 'none' });
  R.advance(7000);
  assert.strictEqual(String(R.els.waitmsg ? R.els.waitmsg.innerHTML : ''), '', '⛔ 정적 문서 load 를 지금 길 시계가 셌다');
  R.knockG();
  assert.deepStrictEqual(R.sent.map((x) => x.m), [{ onf: 'auth', token: tok, hist: 1 }]);
  //   정적 문서 load 를 「첫 진짜 load」로 써 버리면 지금 길의 「래퍼만 뜸 → 한 번 다시」(T1)가 죽는다
  const Q = boot({ onf_tch: tchCell(20), onf_tout: '1' });
  login(Q); Q.load(); Q.fromApp({ onf: 'outFail', why: 'none' });
  Q.win.length = 1; Q.win[0] = { length: 0 };
  const n0 = Q.nav.length;
  Q.load(); Q.advance(3000);
  assert.strictEqual(Q.nav.length, n0 + 1, '⛔ 물러난 지금 길의 「한 번 다시 열기」가 안 돌았다(정적 문서 load 를 셌다)');
  assert.ok(/AKfycb/.test(Q.nav[Q.nav.length - 1]));
});

t('B4 입장권 없음·만료 · 학생 한 명 창(mode=student)·과제 판(hwbook) · 홈 화면 앱(standalone) · WebKit(맥 사파리·아이폰 크롬·아이패드) → 정적 먼저 안 함', async () => {
  const st = (o) => Object.assign({ onf_tout: '1' }, o);
  for (const [store, opt] of [[st({}), {}], [st({ onf_tch: tchCell(-1) }), {}], [st({ onf_tch: tchCell(20) }), { search: '?mode=student&t=Tok_1' }],
    [st({ onf_tch: tchCell(20) }), { search: '?mode=hwbook&t=Tok_1' }], [st({ onf_tch: tchCell(20) }), { nav: { standalone: true } }],
    [st({ onf_tch: tchCell(20) }), { nav: MACSAFARI }], [st({ onf_tch: tchCell(20) }), { nav: IPHONE }], [st({ onf_tch: tchCell(20) }), { nav: IPAD }]]) {
    const R = boot(store, opt);
    login(R);
    assert.ok(!R.staticOpen() && R.execOpen(), '⛔ 정적 먼저를 했다: ' + JSON.stringify([Object.keys(store), opt]));
  }
});

t('B5 화면 auth-please stale → 입장권 칸 비우고 구글에 새로 → 새 로그인 → /t/login → 새 입장권으로 auth · other 면 자동 선택도 끈다', async () => {
  const cell = tchCell(20);
  const R = boot({ onf_tch: cell, onf_tout: '1' });
  login(R); await tick(); await tick();
  assert.strictEqual(R.fetches.length, 0, '전제: 남은 20일이면 안 묻는다');
  R.fromApp({ onf: 'outHello' }); R.fromApp({ onf: 'homeDrawn' });
  R.fromApp({ onf: 'auth-please', stale: false });
  R.sent.length = 0;
  R.fromApp({ onf: 'auth-please', stale: true });
  assert.ok(!('onf_tch' in R.ls), '⛔ 거절당한 입장권을 남겼다');
  assert.ok(R.calls.includes('prompt'), '⛔ 새로 받으러 구글에 안 갔다');
  assert.strictEqual(R.sent.length, 0, '⛔ 죽은 입장권·구글 토큰을 정적 화면에 줬다');
  login(R); await tick(); await tick();
  assert.strictEqual(R.fetches.length, 1, '⛔ 새 구글 토큰으로 /t/login 을 안 불렀다');
  const nt = JSON.parse(R.ls.onf_tch).tk;
  assert.deepStrictEqual(R.sent.map((x) => [x.m, x.o]), [[{ onf: 'auth', token: nt, hist: 1 }, APP]], '⛔ 새 입장권을 화면에 안 줬다');
  const O = boot({ onf_tch: cell, onf_tout: '1' });
  login(O); O.fromApp({ onf: 'outHello' }); O.fromApp({ onf: 'homeDrawn' }); O.fromApp({ onf: 'auth-please' });
  O.fromApp({ onf: 'auth-please', stale: true, other: true });
  assert.ok(O.calls.includes('disableAutoSelect') && !('onf_tch' in O.ls) && !('onf_id_tok' in O.ls));
});

t('C1 출처 자물쇠 — 정적 먼저 동안 노크·판 말(bookFrom 홈)은 그 액자 직접 자식 + 정적 출처만 · 남의 창·남의 출처·비슷한 이름은 버린다 · 한 번 정한 창만', async () => {
  const cell = tchCell(20), tk = JSON.parse(cell).tk;
  const R = boot({ onf_tch: cell, onf_tout: '1' });
  login(R); R.fromApp({ onf: 'outHello' }); R.fromApp({ onf: 'homeDrawn' });
  R.sent.length = 0;
  const other = { postMessage(m, o) { R.sent.push({ m: JSON.parse(JSON.stringify(m)), o, other: 1 }); } };
  R.fire({ onf: 'auth-please' }, other, APP);                                   // 남의 창
  R.fire({ onf: 'auth-please' }, R.win, 'https://app.ownify.co.kr.evil.com');   // 비슷한 이름
  R.fire({ onf: 'auth-please' }, R.win, 'http://app.ownify.co.kr');              // http
  R.fire({ onf: 'auth-please' }, { parent: R.win, postMessage() {} }, APP);      // 정적 판 안 액자(정적은 겹이 없다)
  R.fire({ onf: 'outHello' }, other, APP);
  assert.strictEqual(R.sent.length, 0, '⛔ 자물쇠 밖 말에 답했다: ' + JSON.stringify(R.sent));
  R.fromApp({ onf: 'auth-please' });
  assert.deepStrictEqual(R.sent.map((x) => x.m), [{ onf: 'auth', token: tk, hist: 1 }]);
  R.sent.length = 0;
  R.fromApp({ onf: 'bookHello' });
  assert.ok(R.sent.some((x) => x.m.onf === 'caps' && x.o === APP), '⛔ 정적 홈의 bookHello 에 답이 없다(홈 갈래 자물쇠)');
  //   한 번 정한 창(정적 판)만 — 그 뒤 구글 출처 노크는 안 받는다
  R.sent.length = 0;
  R.knockG();
  assert.ok(!R.sent.some((x) => x.m.onf === 'auth'), '⛔ 정한 창 말고 다른 창에 토큰을 줬다');
});

t('C2 과제 판(hwbook) 노크 자물쇠는 그대로 googleusercontent 만', () => {
  const blk = main.slice(main.indexOf('/* onf-hwbook:begin */'));
  assert.ok(/if \(hwFr && hwFrom\(ev\.source\)\) \{[^\n]*\n\s*try \{ if \(!\/\(\^\|\\\.\)googleusercontent\\\.com\$\/\.test\(new URL\(ev\.origin\)\.hostname\)\) return; \}/.test(blk), '⛔ 과제 판 노크 자물쇠가 바뀌었다');
});

t('E1 정적 화면이 노크한 뒤 그리기 전 outFail → 노크 칸을 비워 지금 길 구글 노크를 받는다(구글 토큰으로 답)', async () => {
  const R = boot({ onf_tch: tchCell(20), onf_tout: '1' }), tok = gtok();
  login(R, tok); R.fromApp({ onf: 'outHello' }); R.fromApp({ onf: 'auth-please', stale: false });
  R.fromApp({ onf: 'outFail', why: 'error' });
  R.sent.length = 0; R.knockG();
  assert.deepStrictEqual(R.sent.map((x) => x.m), [{ onf: 'auth', token: tok, hist: 1 }], '⛔ 물러난 뒤에도 노크 칸이 정적 창에 박혔다');
});

t('E2 열쇠 길(받아 둔 odk1 · reuse) + 정적 먼저 — 정적 문서 load 를 8초 덫이 안 세고 · 정적 노크가 「한 번 막힘」을 안 지운다 · 물러난 뒤엔 덫이 종전대로', async () => {
  const store = { onf_id_tok: odk(), onf_tch: tchCell(20), onf_tout: '1', onf_devkey_try: String(Date.now()) };
  const R = boot(store);
  assert.deepStrictEqual(R.nav, [TURL], '⛔ 열쇠 길에서 정적 먼저를 안 했다');
  R.load(); R.fromApp({ onf: 'outHello' }); R.advance(2000); R.fromApp({ onf: 'homeDrawn' }); R.fromApp({ onf: 'auth-please' });
  R.advance(60000);
  assert.strictEqual(R.calls.filter((c) => c === 'reload').length, 0, '⛔ 정적 문서 load 를 열쇠 덫이 셌다(새로 읽기)');
  assert.ok('onf_devkey_try' in store, '⛔ 정적 홈이 뜬 것을 열쇠 길이 뜬 것으로 쳤다');
  assert.ok('onf_id_tok' in store);
  const Q = boot({ onf_id_tok: odk(), onf_tch: tchCell(20), onf_tout: '1' });
  Q.load(); Q.fromApp({ onf: 'outFail', why: 'none' });
  Q.load(); Q.advance(8000);
  assert.strictEqual(Q.calls.filter((c) => c === 'reload').length, 1, '⛔ 물러난 지금 길(열쇠)의 8초 덫이 안 돈다');
});

t('E3 판 말은 그 판 출처만 — 다른 출처(pages.dev·구글)의 outFail 은 물러나게 못 하고 homeDrawn 은 확정 못 한다', async () => {
  for (const o of ['https://onf-app.pages.dev', KORIGIN]) {
    const R = boot({ onf_tch: tchCell(20), onf_tout: '1' });
    login(R); R.fromApp({ onf: 'outHello' });
    R.fire({ onf: 'outFail', why: 'x' }, R.win, o);
    assert.deepStrictEqual(R.nav, [TURL], '⛔ 다른 출처 outFail 로 물러났다: ' + o);
    R.fire({ onf: 'homeDrawn' }, R.win, o);
    R.advance(60000);
    assert.ok(R.nav.length > 1 && /AKfycb/.test(R.nav[1]), '⛔ 다른 출처 homeDrawn 으로 확정됐다: ' + o);
  }
});

t('E4 hello 때 입장권이 사라졌으면 outBoot 없이 물러난다 · 꼴 틀린 입장권 칸은 없는 것', async () => {
  const R = boot({ onf_tch: tchCell(20), onf_tout: '1' });
  login(R); delete R.ls.onf_tch;
  R.fromApp({ onf: 'outHello' });
  assert.ok(!R.sent.some((x) => x.m.onf === 'outBoot'), '⛔ 빈 입장권을 보냈다');
  assert.ok(R.nav.length > 1 && /AKfycb/.test(R.nav[1]), '⛔ 입장권 없이 정적 판에 머물렀다');
  const body = b64({ e: 't@ownify.co.kr' });   // 계정은 맞고(계정 대조를 지나) 꼴만 틀린 칸
  for (const tk of ['tch.' + body + '.' + 'S'.repeat(10), 'tch.' + body + '.' + 'S'.repeat(43) + '<', 'xtch.' + body + '.' + 'S'.repeat(43), 'tch.' + body]) {
    const B = boot({ onf_tch: JSON.stringify({ tk, x: now() + 20 * 86400 }), onf_tout: '1' });
    login(B); await tick(); await tick();
    assert.ok(!B.staticOpen(), '⛔ 꼴 틀린 입장권으로 정적 먼저: ' + tk);
    assert.strictEqual(B.fetches.length, 1, '⛔ 꼴 틀린 칸이 있다고 새로 안 물었다: ' + tk);
  }
});

t('E5 이중 잠금 한 겹씩 — 정적 먼저 동안 pages.dev(우리 다른 정적 출처) 직접 자식 노크·bookHello 는 버린다 · 판 출처라도 판 안 후손의 bookHello 는 버린다', async () => {
  const R = boot({ onf_tch: tchCell(20), onf_tout: '1' });
  login(R); R.fromApp({ onf: 'outHello' }); R.fromApp({ onf: 'homeDrawn' });
  R.sent.length = 0;
  R.fire({ onf: 'auth-please' }, R.win, 'https://onf-app.pages.dev');
  R.fire({ onf: 'bookHello' }, R.win, 'https://onf-app.pages.dev');
  const kid = { parent: R.win, postMessage(m, o) { R.sent.push({ m: JSON.parse(JSON.stringify(m)), o, kid: 1 }); } };
  R.fire({ onf: 'bookHello' }, kid, APP);
  assert.strictEqual(R.sent.length, 0, '⛔ 잠금 한 겹을 넘었다: ' + JSON.stringify(R.sent));
  R.fromApp({ onf: 'bookHello' });
  assert.ok(R.sent.some((x) => x.m.onf === 'caps'), '전제: 그 판 창 bookHello 는 받는다');
});

t('D1 입장권은 주소·기록·로그 어디에도 안 실린다(정적 먼저 성공·물러남·새로 받기 전부)', async () => {
  const runs = [];
  const A = boot({ onf_tch: tchCell(20), onf_tout: '1' }, { search: '?tout=1' }); login(A); A.fromApp({ onf: 'outHello' }); A.fromApp({ onf: 'homeDrawn' }); A.fromApp({ onf: 'auth-please' }); runs.push(A);
  const B = boot({ onf_tch: tchCell(20), onf_tout: '1' }); login(B); B.fromApp({ onf: 'outHello' }); B.fromApp({ onf: 'outFail', why: 'auth' }); B.advance(60000); runs.push(B);
  const C = boot({}); login(C); await tick(); await tick(); runs.push(C);
  const D = boot({ onf_tch: tchCell(20), onf_tout: '1' }); login(D); D.fromApp({ onf: 'outHello' }); D.fromApp({ onf: 'homeDrawn' }); D.fromApp({ onf: 'auth-please', stale: true }); login(D); await tick(); await tick(); runs.push(D);
  for (const R of runs) {
    const seen = R.opened().concat(R.logs, [R.g.location.href, R.g.location.search]);
    assert.ok(!seen.some((s) => /tch\./.test(s)), '⛔ 입장권이 주소·로그에 실렸다: ' + seen.filter((s) => /tch\./.test(s)).join(' | '));
  }
});

t('D2 onf-frame.js 없는 옛 사본 — 입장권 받기·정적 먼저 둘 다 조용히 안 함(지금 길)', async () => {
  const R = boot({ onf_tch: tchCell(20), onf_tout: '1' }, { noFrameJs: true });
  login(R); await tick();
  assert.strictEqual(R.fetches.length, 0);
  assert.ok(!R.staticOpen() && R.execOpen());
});

/* ── 🏫 머리 미리 받기(tPre · 2026-10-30 「새로 고침 2배」) — 머리 스크립트를 따로 돌린다(본 스크립트보다 먼저 · ONF 없이) ── */
const HEAD = /<script>(\/\* 🏫 정적 먼저 사본 미리 받기[\s\S]*?)<\/script>/.exec(html);
function head(store, opt) {
  opt = opt || {};
  const ls = store || {}, fetches = [];
  const g = { navigator: Object.assign({}, CHROME, opt.nav || {}), location: { search: opt.search || '' }, URLSearchParams, Date, JSON, Math, Promise, Number,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    matchMedia: () => ({ matches: false }), setTimeout: (f) => { g.__tm = f; return 1; }, clearTimeout() {}, AbortController,
    fetch: (url, init) => { fetches.push({ url, init }); return opt.fetch ? opt.fetch(url, init) : Promise.resolve({ json: () => Promise.resolve({ ok: true, api: 1, c: {} }) }); } };
  g.window = g; g.top = opt.framed ? {} : g; g.self = g;
  vm.createContext(g); vm.runInContext(HEAD[1], g);
  return { g, fetches, pre: g.tPre };
}
const eligible = (o) => Object.assign({ onf_tout: '1', onf_tch: tchCell(20) }, o);
const PRE_CASES = [[eligible({}), {}], [{ onf_tch: tchCell(20) }, { search: '?tout=1' }], [eligible({}), { search: '?tout=0' }], [{ onf_tch: tchCell(20) }, {}],
  [eligible({ onf_tch: tchCell(-1) }), {}], [eligible({ onf_tch: '{bad' }), {}], [{ onf_tout: '1' }, {}], [eligible({ onfTOutFail: String(Date.now()) }), {}],
  [eligible({ onfTOutFail: String(Date.now()) }), { search: '?tout=1' }], [eligible({ onfTOutFail: String(Date.now() - 2 * 86400000) }), {}], [eligible({ onf_devkey_off: String(Date.now()) }), {}],
  [eligible({}), { search: '?mode=student&t=Tok_1' }], [eligible({}), { search: '?mode=hwbook&t=Tok_1' }], [eligible({}), { nav: { standalone: true } }],
  [eligible({}), { nav: MACSAFARI }], [eligible({}), { nav: IPHONE }], [eligible({}), { nav: IPAD }]];

t('P1 머리 미리 받기 — 묻는 때 = tOutQ 와 같다(스위치·주소·입장권·그날 물러남·열쇠 꺼짐·mode·홈 화면 앱·WebKit 전부) · POST <Worker>/t/home/get {tk} 머리말 없음 · 저장소에 안 쓴다', () => {
  assert.ok(HEAD, '⛔ 머리 미리 받기 스크립트가 없다');
  assert.ok(html.indexOf(HEAD[0]) < html.indexOf('<link rel="stylesheet"'), '⛔ 스타일시트 뒤에 있다(스타일을 기다린다)');
  let fired = 0;
  for (const [store, opt] of PRE_CASES) {
    const before = JSON.stringify(store), hs = JSON.parse(before), H = head(hs, opt), R = boot(JSON.parse(before), opt);
    const q = R.g.tOutQ();
    assert.strictEqual(H.fetches.length === 1, q, '⛔ 머리 미리 받기와 tOutQ 가 다르다: ' + JSON.stringify([Object.keys(store), opt.search, opt.nav && opt.nav.platform]) + ' 머리=' + H.fetches.length + ' tOutQ=' + q);
    if (H.fetches.length) {
      fired++;
      const f = H.fetches[0], tk = JSON.parse(store.onf_tch).tk;
      assert.strictEqual(f.url, WORKER + '/t/home/get');
      assert.strictEqual(f.init.method, 'POST'); assert.ok(!f.init.headers, '⛔ 머리말 = 사전 요청');
      assert.deepStrictEqual(JSON.parse(f.init.body), { tk });
      assert.strictEqual(H.pre.tk, tk);
    } else assert.strictEqual(H.pre, null);
    assert.strictEqual(JSON.stringify(hs), before, '⛔ 머리 스크립트가 저장소를 바꿨다');
  }
  assert.ok(fired >= 3, '전제: 묻는 경우가 셋 넘게 있었다 — ' + fired);
  assert.strictEqual(head(eligible({}), { framed: true }).fetches.length, 0, '⛔ 남의 액자 안에서 물었다');
});

t('P2 머리의 Worker 주소 = onf-frame.js 상수(ONF.frame.WORKER) 쌍둥이 · 머리 말고 본 스크립트엔 여전히 안 적는다', () => {
  const R = boot({});
  assert.deepStrictEqual(HEAD[1].match(/https:\/\/[^'"]+\/t\/home\/get/g), [R.g.ONF.frame.WORKER + '/t/home/get'], '⛔ 머리 Worker 주소가 onf-frame.js 와 다르다');
});

t('P3 머리 답 → 판 hello 에 outBoot{tk, d} 한 번(다음 hello 는 종전 {tk}) · 답 전엔 안 보냄 · 못 받음(null)·다른 입장권 = 종전 {tk} · 기다리는 새 물러남 = 안 보냄', async () => {
  const D = { ok: true, api: 1, c: { boot: { ts: 1, age: 0, v: { ok: true } } } };
  const go = (pre, cell) => { cell = cell || tchCell(20); const R = boot({ onf_tch: cell, onf_tout: '1' }); R.g.tPre = pre(JSON.parse(cell).tk); login(R); return { R, tk: JSON.parse(cell).tk }; };
  let res; const later = new Promise((r) => { res = r; });
  let { R, tk } = go((tk) => ({ tk, p: later }));
  assert.deepStrictEqual(R.nav, [TURL]);
  R.fromApp({ onf: 'outHello' }); await tick();
  assert.deepStrictEqual(R.sentTo(APP), [], '⛔ 머리 답 전에 outBoot 을 보냈다(판이 따로 묻는다)');
  res(D); await tick(); await tick();
  assert.deepStrictEqual(R.sentTo(APP), [{ onf: 'outBoot', tk, d: D }], '⛔ 머리 답을 안 실었다: ' + JSON.stringify(R.sentTo(APP)));
  assert.strictEqual(R.g.tPre, null, '⛔ 넘긴 사본을 계속 잡고 있다');
  R.fromApp({ onf: 'outHello' }); await tick();
  assert.deepStrictEqual(R.sentTo(APP).slice(1), [{ onf: 'outBoot', tk }], '⛔ 다시 읽힌 판에 옛 사본을 또 줬다');
  ({ R, tk } = go((tk) => ({ tk, p: Promise.resolve(null) })));
  R.fromApp({ onf: 'outHello' }); await tick(); await tick();
  assert.deepStrictEqual(R.sentTo(APP), [{ onf: 'outBoot', tk }], '⛔ 못 받은 머리 답에 종전 outBoot 이 아니다');
  ({ R, tk } = go(() => ({ tk: JSON.parse(tchCell(20, 'other')).tk, p: Promise.resolve(D) })));
  R.fromApp({ onf: 'outHello' }); await tick(); await tick();
  assert.deepStrictEqual(R.sentTo(APP), [{ onf: 'outBoot', tk }], '⛔ 다른 입장권으로 받은 사본을 실었다');
  let res2; ({ R, tk } = go((tk) => ({ tk, p: new Promise((r) => { res2 = r; }) })));
  R.fromApp({ onf: 'outHello' }); R.fromApp({ onf: 'outFail', why: 'error' }); res2(D); await tick(); await tick();
  assert.ok(!R.sentTo(APP).some((m) => m.onf === 'outBoot'), '⛔ 물러난 판에 사본을 보냈다');
  //   정적 먼저를 안 타면(스위치 꺼짐) 사본을 버린다
  const K = boot({ onf_tch: tchCell(20) }); K.g.tPre = { tk: 'x', p: Promise.resolve(D) }; login(K);
  assert.ok(K.execOpen() && K.g.tPre === null, '⛔ 안 쓰는 사본을 잡고 있다');
});

t('G1 기기 열쇠(odk1 · reuse)로 연 구글 홈이 넘긴 입장권 { onf:\'tch\', tk } — 정한 그 구글 창·출처만 · 같은 계정만 · 만료는 본문 x · 칸 꼴 {tk, x}', () => {
  const R = boot({ onf_id_tok: odk() });
  assert.ok(R.execOpen() && !R.staticOpen(), '전제: 입장권 없는 열쇠 길 = 지금 길');
  const tk = tch('gas');
  R.fire({ onf: 'tch', tk }, R.win, KORIGIN);
  assert.ok(!('onf_tch' in R.ls), '⛔ 노크 전(창을 정하기 전)에 받았다');
  R.knockG();
  R.fire({ onf: 'tch', tk }, { parent: null }, KORIGIN);
  R.fire({ onf: 'tch', tk }, R.lastSrc, 'https://evil.googleusercontent.com.example');
  assert.ok(!('onf_tch' in R.ls), '⛔ 정한 창·출처가 아닌 말을 받았다');
  for (const bad of [tch('m', 'mary@ownify.co.kr'), 'odk1.' + tk.slice(4), 'tch.' + b64({ e: 't@ownify.co.kr', x: now() - 5 }) + '.' + 'S'.repeat(43), 'tch.x.y', 7, null])
    R.fire({ onf: 'tch', tk: bad }, R.lastSrc, KORIGIN);
  assert.ok(!('onf_tch' in R.ls), '⛔ 다른 계정·꼴 틀림·만료 입장권을 받았다');
  R.fire({ onf: 'tch', tk, x: now() + 999 * 86400 }, R.lastSrc, KORIGIN);
  const c = JSON.parse(R.ls.onf_tch);
  assert.deepStrictEqual(c, { tk, x: JSON.parse(Buffer.from(tk.split('.')[1], 'base64').toString()).x }, '⛔ 칸 꼴 · 만료는 본문 x 에서');
  assert.ok(R.fetches.every((f) => !/\/t\/login$/.test(f.url)), '⛔ 받은 입장권으로 /t/login 을 또 불렀다');
  //   다음 열기 = 정적 먼저(기기 스위치 켠 기기)
  const N = boot({ onf_id_tok: odk(), onf_tch: R.ls.onf_tch, onf_tout: '1' });
  assert.ok(N.staticOpen(), '⛔ 받아 둔 입장권으로 다음 열기가 정적 먼저를 안 탔다');
});

t('G2 구글 홈 입장권 — 같은 계정 것이 7일 넘게 남았으면 안 바꾼다 · 7일 이하·다른 계정 것은 바꾼다 · 열쇠 못 쓰는 기기(devkeyOff)는 메모리만 · 정적 판 창은 못 넣는다', async () => {
  const keep = tchCell(20, 'old');
  const A = boot({ onf_id_tok: odk(), onf_tch: keep }); A.knockG(); A.fire({ onf: 'tch', tk: tch('new') }, A.lastSrc, KORIGIN);
  assert.strictEqual(A.ls.onf_tch, keep, '⛔ 넉넉한 입장권을 갈아 끼웠다');
  const B = boot({ onf_id_tok: odk(), onf_tch: tchCell(5, 'old') }); B.knockG(); const nt = tch('new'); B.fire({ onf: 'tch', tk: nt }, B.lastSrc, KORIGIN);
  assert.strictEqual(JSON.parse(B.ls.onf_tch).tk, nt, '⛔ 7일 이하 입장권을 안 바꿨다');
  const M = boot({ onf_id_tok: odk(), onf_tch: JSON.stringify({ tk: tch('m', 'mary@ownify.co.kr'), x: now() + 25 * 86400 }) }); M.knockG(); M.fire({ onf: 'tch', tk: nt }, M.lastSrc, KORIGIN);
  assert.strictEqual(JSON.parse(M.ls.onf_tch).tk, nt, '⛔ 다른 계정 입장권을 남겼다');
  const K = boot({ onf_devkey_off: String(Date.now()) }, { fetch: () => ({ status: 503, body: { ok: false, reason: 'off' } }) });
  login(K); K.knockG(); K.fire({ onf: 'tch', tk: nt }, K.lastSrc, KORIGIN);
  assert.ok(!('onf_tch' in K.ls) && K.g.tchGet().tk === nt, '⛔ 열쇠 못 쓰는 기기가 입장권을 저장소에 남겼다(또는 메모리에도 없다)');
  const S = boot({ onf_tch: tchCell(20), onf_tout: '1' }); login(S); S.fromApp({ onf: 'outHello' }); S.fromApp({ onf: 'auth-please' });
  const before = S.ls.onf_tch; S.fromApp({ onf: 'tch', tk: tch('static') });
  assert.strictEqual(S.ls.onf_tch, before, '⛔ 정적 판 창이 입장권을 갈아 끼웠다');
});

t('G3 스스로 다시 연 자리 = clog 한 줄(reopen:<까닭> · 기기 꼴 · 값 없음 · sendBeacon) — 열쇠 덫 새로 읽기 · 정적 먼저 물러남(hello·fail) · 다시 로그인(stale)', () => {
  const beacons = [], nav = { sendBeacon: (u, b) => { beacons.push({ u, b: JSON.parse(b) }); return true; } };
  const K = boot({ onf_id_tok: odk() }, { nav }); K.load(); K.advance(8000);
  assert.strictEqual(K.calls.filter((c) => c === 'reload').length, 1, '전제: 열쇠 덫이 새로 읽었다');
  assert.deepStrictEqual(beacons.map((x) => x.b), [[{ k: 'err', c: 'reopen:key-noknock', d: 'mac' }]], '⛔ 열쇠 덫 새로 읽기 기록이 없다');
  assert.strictEqual(beacons[0].u, WORKER + '/clog');
  beacons.length = 0;
  const T = boot({ onf_tch: tchCell(20), onf_tout: '1' }, { nav }); login(T); T.advance(3000);
  const U = boot({ onf_tch: tchCell(20), onf_tout: '1' }, { nav }); login(U); U.fromApp({ onf: 'outHello' }); U.fromApp({ onf: 'outFail', why: 'copy' });
  const V = boot({ onf_tch: tchCell(20), onf_tout: '1' }, { nav }); login(V); V.fromApp({ onf: 'outFail', why: '<b>Bad' });
  assert.deepStrictEqual(beacons.map((x) => x.b[0].c), ['reopen:tout-hello', 'reopen:tout-fail-copy', 'reopen:tout-fail-x']);
  beacons.length = 0;
  const S = boot({ onf_id_tok: odk() }, { nav }); S.knockG(); S.fire({ onf: 'auth-please', stale: true }, S.lastSrc, KORIGIN);
  assert.deepStrictEqual(beacons.map((x) => x.b[0].c), ['reopen:stale-key']);
  const all = JSON.stringify(beacons);
  assert.ok(all.indexOf('tch.') < 0 && all.indexOf('odk1.') < 0 && all.indexOf('@') < 0, '⛔ 기록에 토큰·이메일');
  //   sendBeacon 없는 브라우저 = 조용히 안 보낸다(화면 일은 그대로)
  const Q = boot({ onf_id_tok: odk() }); Q.load(); Q.advance(8000);
  assert.strictEqual(Q.calls.filter((c) => c === 'reload').length, 1);
});

(async () => {
  for (const [label, fn] of tests) {
    try { await fn(); console.log('  ✅ ' + label); pass++; }
    catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
  }
  console.log(`\n${pass}개 통과, ${fail}개 실패`);
  process.exit(fail ? 1 : 0);
})();
