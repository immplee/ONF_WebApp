/* teacher/index.html 기기 열쇠 「8초 덫」 — 2026-10-17
   받아 둔 열쇠(또는 받아 둔 구글 토큰)로 연 화면에서 **열고 8초** 안에 노크가 없으면 그 기기 열쇠를 7일 끄고 새로 읽었다.
   그 시계는 「서버(doGet)가 한 번 느린 것」(10-17 10:05:52 doGet 12.2초)과 「진짜 막힌 액자」를 못 갈랐다.
   → 판정 시계는 **액자 load 부터**(막힌 액자도 load 를 빨리 쏜다 — 2026-09-02 실측 279ms · 느린 서버는 load 가 doGet 뒤) ·
     7일 끄기는 **두 번 잇달아** 막혔을 때만(학생 껍데기 onfClTry → onfCl 과 같은 두 번 규칙).
   ⚠️ 진짜 load·노크 시각은 vm 이 못 본다 — 그건 헤드리스 크롬 전/후(보고서)고, 여기는 규칙이 **지워지지 않게** 지킨다.
   실행: node test/teacher-shell.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(process.env.SHELL_HTML || path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('var CLIENT_ID'));
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

const CHROME = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', platform: 'MacIntel', maxTouchPoints: 0 };
const KORIGIN = 'https://n-abc-0lu-script.googleusercontent.com';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const now = () => Math.floor(Date.now() / 1000);
const odk = () => 'odk1.' + b64({ email: 't@ownify.co.kr', hd: 'ownify.co.kr', iat: now(), exp: now() + 30 * 86400 }) + '.sig';
const gtok = () => 'x.' + b64({ exp: now() + 3000, hd: 'ownify.co.kr', email: 't@ownify.co.kr' }) + '.y';
const DAY = 86400000;

/* 껍데기 본 스크립트를 통째로 돌린다 — 시계는 손으로 돌린다(advance) · 액자 load·안쪽 노크는 손으로 쏜다. */
function boot(store, opt) {
  opt = opt || {};
  const calls = [], handlers = {}, els = {}, timers = new Map(), created = [];
  const spin = { gone: false, parentNode: { removeChild() { spin.gone = true; } } };   // #wait .onf-spin — 걷히면 gone
  let clock = 0, tid = 0;
  const el = (id) => els[id] || (els[id] = { id, hidden: id === 'app' || id === 'wait', style: {}, classList: { add() {}, remove() {}, toggle() {} },
    contentWindow: id === 'app' ? { name: 'appwin', postMessage() {} } : null, appendChild() {}, setAttribute() {}, parentNode: null, textContent: '', innerHTML: '', querySelector: () => null,
    _on: {}, addEventListener(tp, f) { (this._on[tp] = this._on[tp] || []).push(f); } });
  const ls = store || {};
  const g = {
    navigator: CHROME, console: { warn() {}, log() {}, info() {} }, atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    URL, URLSearchParams, Date, JSON, Math,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { if (opt.full) throw new Error('QuotaExceededError'); ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    document: { getElementById: el, querySelector: (q) => (q === '#wait .onf-spin' && !spin.gone ? spin : null), createElement: (tag) => { const e = el('x' + Math.random()); e.tag = tag; if (tag === 'iframe') e.contentWindow = { name: 'hwwin', postMessage() {} }; created.push(e); return e; }, body: { appendChild(e) { e.parentNode = { removeChild() { e.removed = true; } }; } },
      documentElement: { setAttribute() {}, getAttribute() {} } },
    location: { search: opt.search || '', pathname: '/teacher/', href: 'https://class.ownify.co.kr/teacher', reload() { calls.push('reload'); } },
    history: { state: null, length: 2, replaceState() {}, pushState(st) { calls.push('push:' + JSON.stringify(st)); g.history.state = st; }, go() {}, back() { calls.push('back'); } },
    sessionStorage: (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; })(),
    addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); },
    removeEventListener: (type, fn) => { handlers[type] = (handlers[type] || []).filter((f) => f !== fn); },
    setTimeout: (fn, ms) => { timers.set(++tid, { fn, at: clock + (ms || 0) }); return tid; },
    clearTimeout: (id) => { timers.delete(id); }, setInterval: () => 0, clearInterval() {},
    google: { accounts: { id: { initialize() {}, renderButton() {}, prompt: () => calls.push('prompt'), cancel() {}, disableAutoSelect() {} } } }
  };
  g.window = g; g.top = g; g.self = g;
  vm.createContext(g); vm.runInContext(main, g);
  const app = els.app;
  const R = {
    g, ls, els, calls, created, pop() { (handlers.popstate || []).slice().forEach((h) => h({})); },
    reloads: () => calls.filter((x) => x === 'reload').length,
    advance(ms) {                                                       // 시계를 ms 만큼 — 그 사이 때가 된 타이머를 차례로
      const end = clock + ms;
      for (;;) {
        let nx = null;
        for (const [k, v] of timers) if (v.at <= end && (!nx || v.at < nx[1].at)) nx = [k, v];
        if (!nx) break;
        timers.delete(nx[0]); clock = nx[1].at; nx[1].fn();
      }
      clock = end;
    },
    load() { (app._on.load || []).forEach((f) => f({ type: 'load' })); },   // 액자 load(교차 출처 — contentWindow.location 을 못 읽는다)
    post(data, origin) { (handlers.message || []).slice().forEach((h) => h({ data, source: { postMessage() {} }, origin })); },   // 남의 창 말
    knockAs(src) { (handlers.message || []).slice().forEach((h) => h({ data: { onf: 'auth-please', stale: false }, source: src, origin: KORIGIN })); },   // 📝 그 창으로 노크(appWin 이 그 창이 된다)
    postAs(data, src, origin) { (handlers.message || []).slice().forEach((h) => h({ data, source: src, origin: origin || KORIGIN })); },
    knock() { (handlers.message || []).slice().forEach((h) => h({ data: { onf: 'auth-please', stale: false }, source: { parent: app.contentWindow, postMessage() {} }, origin: KORIGIN })); },
    opened: () => /AKfycb/.test(String(app.src || '')),
    msg: () => String(els.waitmsg ? els.waitmsg.innerHTML : ''),
    spinning: () => !spin.gone
  };
  return R;
}

console.log('[선생님 껍데기 기기 열쇠 8초 덫]');

t('⛔ [10-17 사고] 느린 서버(load·노크 9초 · 12.2초) — 열쇠를 안 끄고 새로 읽지 않는다 · 받아 둔 열쇠도 그대로', () => {
  for (const ms of [9000, 12200]) {
    for (const tok of [odk(), gtok()]) {
      const R = boot({ onf_id_tok: tok });
      assert.ok(R.opened(), '전제: 받아 둔 것으로 바로 열었다');
      R.advance(ms);
      R.load(); R.knock();
      R.advance(30000);
      assert.strictEqual(R.reloads(), 0, '⛔ ' + ms + 'ms 느린 서버에서 새로 읽었다(다시 로그인 + 두 번째 doGet = 빈 화면 15~20초+)');
      assert.ok(!('onf_devkey_off' in R.ls), '⛔ ' + ms + 'ms 느린 서버 한 번에 그 기기 열쇠를 7일 껐다');
      assert.ok(!('onf_devkey_try' in R.ls), '⛔ 느린 서버를 「막힘」으로 셌다');
      assert.strictEqual(R.ls.onf_id_tok, tok, '⛔ 느린 서버에서 받아 둔 열쇠를 지웠다');
    }
  }
});

t('⛔ 진짜 막힘(load 빨리 · 노크 없음) — 첫 번째는 표시만 · 칸 치움 · 구글로 다시(새로 읽기) / 두 번째에 7일 끔', () => {
  const store = { onf_id_tok: odk() };
  const A = boot(store);
  A.advance(300); A.load();
  A.advance(7999);
  assert.strictEqual(A.reloads(), 0, '⛔ load 뒤 8초를 안 기다렸다');
  A.advance(1);
  assert.strictEqual(A.reloads(), 1, '⛔ 막힌 화면에 갇힌다 — load 뒤 8초에 구글 창구로 다시 열어야 한다');
  assert.ok(!('onf_devkey_off' in store), '⛔ 한 번 막힘으로 7일 껐다(구글 일시 오류 한 번이면 7일 로그인)');
  assert.ok(Number(store.onf_devkey_try) > 0, '⛔ 첫 막힘을 기록하지 않았다(두 번째를 못 센다)');
  assert.ok(!('onf_id_tok' in store), '⛔ 막힌 열쇠를 안 치웠다 — 새로 읽어도 같은 열쇠로 또 막힌다');
  //   그 사이 구글 창구로 열어 새 열쇠를 받았다 → 다음 열기에서 또 막힘 = 두 번 잇달아
  store.onf_id_tok = odk();
  const B = boot(store);
  B.advance(250); B.load(); B.advance(8000);
  assert.strictEqual(B.reloads(), 1);
  assert.ok(Number(store.onf_devkey_off) > 0, '⛔ 두 번 잇달아 막혔는데 안 껐다(진짜 막힌 기기가 열 때마다 8초+를 낸다)');
  assert.ok(!('onf_devkey_try' in store), '⛔ 끈 뒤에도 「한 번 막힘」이 남았다');
  assert.ok(!('onf_id_tok' in store));
  //   끈 뒤엔 받아 둔 열쇠를 안 쓴다(종전 그대로 — 7일 구글 창구)
  store.onf_id_tok = odk();
  const C = boot(store);
  assert.ok(!C.opened(), '⛔ 끈 기기가 열쇠로 또 열었다');
});

t('⛔ 한 번만 막힘 → 안 끔 · 다음 열쇠 열기가 성공하면 기록을 지운다(잇달아야 두 번) · 7일 지난 기록은 안 센다', () => {
  const store = { onf_id_tok: odk() };
  const A = boot(store); A.advance(300); A.load(); A.advance(8000);
  assert.ok(store.onf_devkey_try, '전제: 첫 막힘 기록');
  store.onf_id_tok = odk();
  const B = boot(store); B.advance(400); B.load(); B.advance(100); B.knock(); B.advance(30000);   // load 뒤 노크 — 성공
  assert.strictEqual(B.reloads(), 0);
  assert.ok(!('onf_devkey_try' in store), '⛔ 열쇠 열기가 성공했는데 「한 번 막힘」이 남았다 — 몇 주 뒤 한 번 막힘에 7일 꺼진다');
  assert.strictEqual(store.onf_id_tok !== undefined, true, '⛔ 성공한 열쇠를 지웠다');
  const C = boot(store); C.advance(300); C.load(); C.advance(8000);
  assert.ok(!('onf_devkey_off' in store), '⛔ 성공을 사이에 둔 두 번째 막힘으로 껐다(잇달아야 두 번)');
  assert.ok(store.onf_devkey_try, '⛔ 다시 첫 막힘으로 세야 한다');
  //   노크가 load 보다 먼저 와도(안쪽 스크립트는 바깥 load 전에 돈다) 성공
  store.onf_id_tok = odk();
  const D = boot(store); D.advance(300); D.knock(); D.advance(50); D.load(); D.advance(30000);
  assert.strictEqual(D.reloads(), 0, '⛔ 노크 뒤에 온 load 로 덫이 다시 섰다');
  assert.ok(!('onf_devkey_try' in store), '⛔ 노크가 먼저 온 성공을 성공으로 안 셌다');
  //   7일 지난 「한 번 막힘」은 잇달음이 아니다
  store.onf_id_tok = odk(); store.onf_devkey_try = String(Date.now() - 8 * DAY);
  const E = boot(store); E.advance(300); E.load(); E.advance(8000);
  assert.ok(!('onf_devkey_off' in store), '⛔ 8일 전 막힘과 오늘 막힘을 잇달음으로 셌다');
  assert.ok(Date.now() - Number(store.onf_devkey_try) < DAY, '⛔ 오늘 막힘을 새로 기록하지 않았다');
});

t('⛔ [보강] 열쇠로 연 느린 서버(load 12초) — 8초에 안내를 안 띄우고 도는 원을 그대로 둔다(서버가 느린 것뿐 · 10-17 12.2초 · 7일 최대 12.7초)', () => {
  for (const tok of [odk(), gtok()]) {
    const R = boot({ onf_id_tok: tok });
    R.advance(8000);
    assert.strictEqual(R.msg(), '', '⛔ 느린 서버에 8초에 「화면이 안 열렸어요」를 띄웠다(곧 그려질 화면 위에 겁주는 말)');
    assert.ok(R.spinning(), '⛔ 느린 서버에 8초에 도는 원을 걷었다');
    R.advance(4000); R.load(); R.knock(); R.advance(60000);
    assert.strictEqual(R.msg(), '', '⛔ 그려진 뒤에 안내가 떴다');
    assert.strictEqual(R.reloads(), 0);
  }
});

t('열쇠 열기인데 load 가 너무 오래 안 옴(연결 멈춤) — 열고 30초에 안내(원 걷음) · 열쇠를 끄지도 새로 읽지도 않는다', () => {
  const store = { onf_id_tok: odk() };
  const R = boot(store);
  R.advance(29999);
  assert.strictEqual(R.msg(), '', '⛔ 30초 전에 안내가 떴다');
  assert.ok(R.spinning());
  R.advance(1);
  assert.ok(/화면이 안 열렸어요/.test(R.msg()), '⛔ 멈춘 연결에 안내가 없다(도는 원만 영영)');
  assert.ok(!R.spinning(), '⛔ 안내를 띄웠는데 원이 계속 돈다(「곧 됩니다」 거짓말)');
  R.advance(60000);
  assert.strictEqual(R.reloads(), 0);
  assert.ok(!('onf_devkey_off' in store) && !('onf_devkey_try' in store), '⛔ load 도 안 왔는데 막힘으로 셌다(느린 서버일 수 있다)');
  //   그 뒤 늦게 load 가 오고 노크도 없으면 — 그때부터 8초에 막힘(첫 번째)
  R.load(); R.advance(8000);
  assert.strictEqual(R.reloads(), 1, '⛔ 늦게 온 load 뒤 노크가 없는데 갇힌다');
  assert.ok(store.onf_devkey_try && !('onf_devkey_off' in store));
});

t('⛔ [2026-10-22 사고] 로그인 길(구글 토큰)도 load 부터 8초 — 느린 doGet(load 12초)에 8초 안내·원 걷기 없음 · load 빠르면 load+8초 · load 없으면 열고 30초 · 새로 읽지도 기록하지도 않는다', () => {
  for (const loadAt of [12000, 300, null]) {
    const store = {};
    const R = boot(store);
    assert.ok(!R.opened(), '전제: 받아 둔 것이 없으면 바로 안 연다');
    R.g.onCredential({ credential: gtok() });
    assert.ok(R.opened(), '전제: 구글 토큰으로 연다');
    const due = loadAt === null ? 30000 : loadAt + 8000;
    if (loadAt !== null) { R.advance(Math.min(loadAt, 8000)); }
    if (loadAt === 12000) {
      assert.strictEqual(R.msg(), '', '⛔ 아직 읽는 중(load 전)인 액자에 8초에 「화면이 안 열렸어요」를 띄웠다(2026-10-22 Peter 사고)');
      assert.ok(R.spinning(), '⛔ 아직 읽는 중인데 8초에 원을 걷었다');
      R.advance(loadAt - 8000);
    }
    if (loadAt !== null) R.load();
    R.advance(due - (loadAt === null ? 0 : loadAt) - 1);
    assert.strictEqual(R.msg(), '', '⛔ 안내가 ' + due + 'ms 보다 일찍 떴다(load=' + loadAt + ')');
    R.advance(1);
    assert.ok(/화면이 안 열렸어요/.test(R.msg()), '⛔ 로그인 길 안내가 ' + due + 'ms 에 안 떴다(load=' + loadAt + ')');
    assert.ok(!R.spinning(), '⛔ 안내를 띄웠는데 원이 계속 돈다');
    R.advance(60000);
    assert.strictEqual(R.reloads(), 0, '⛔ 로그인 길에서 새로 읽었다');
    assert.ok(!('onf_devkey_off' in store) && !('onf_devkey_try' in store), '⛔ 로그인 길을 열쇠 막힘으로 셌다');
  }
  //   느린 doGet 이 결국 그려지면(load 뒤 노크) 안내는 끝까지 없다
  const R = boot({}); R.g.onCredential({ credential: gtok() });
  R.advance(12000); R.load(); R.knock(); R.advance(60000);
  assert.strictEqual(R.msg(), '', '⛔ 그려진 느린 화면에 안내가 떴다');
});

t('⛔ [🟡1] 「한 번 막힘」 기록은 새로고침에 안 사라진다 — 막힘 1 → 다음 열쇠 열기 3초에 새로고침 → 그다음 막힘이 「2번째」', () => {
  const store = { onf_id_tok: odk() };
  const A = boot(store); A.advance(300); A.load(); A.advance(8000);
  assert.ok(store.onf_devkey_try, '전제: 첫 막힘 기록');
  store.onf_id_tok = odk();
  const B = boot(store); B.advance(3000);                                   // 다음 열쇠 열기 — 판정 전에 사람이 새로고침(B 는 버려진다)
  assert.ok(store.onf_devkey_try, '⛔ 판정도 전에(노크·막힘 없이) 「한 번 막힘」을 지웠다 — 새로고침하면 두 번 규칙이 처음부터');
  const C = boot(store); C.advance(300); C.load(); C.advance(8000);
  assert.ok(Number(store.onf_devkey_off) > 0, '⛔ 새로고침을 사이에 둔 두 번째 막힘을 「2번째」로 안 셌다');
  assert.ok(!('onf_devkey_try' in store), '⛔ 끈 뒤에도 「한 번 막힘」이 남았다');
  //   열쇠 길 노크(stale 도 — 서버가 열쇠를 거절해도 액자는 떴다)를 받으면 그때 지운다
  delete store.onf_devkey_off; store.onf_devkey_try = String(Date.now()); store.onf_id_tok = odk();
  const D = boot(store); D.advance(2000);
  D.post({ onf: 'auth-please' }, 'https://evil.example'); D.post({ onf: 'x' }, KORIGIN);   // 노크 전 남의 말 — appWin 이 안 정해진다
  assert.ok(store.onf_devkey_try, '⛔ 노크 전(남의 말)에 「한 번 막힘」을 지웠다');
  D.knock();
  assert.ok(!('onf_devkey_try' in store), '⛔ 열쇠 길 노크를 받았는데 「한 번 막힘」이 남았다');
  //   로그인 길(구글 창구) 노크는 열쇠 길 성공이 아니다 — 안 지운다(진짜 막힌 기기가 영영 「첫 번째」에 머문다)
  store.onf_devkey_try = String(Date.now()); delete store.onf_id_tok;
  const E = boot(store); E.g.onCredential({ credential: gtok() }); E.advance(1000); E.knock();
  assert.ok(store.onf_devkey_try, '⛔ 로그인 길 노크로 「한 번 막힘」을 지웠다 — 막힌 기기가 두 번째에 안 꺼진다');
});

t('⛔ [🟡2] 저장소가 가득 차 setItem 이 던져도 받아 둔 열쇠는 치운다 — 새로 읽기가 끝없이 돌지 않는다', () => {
  const store = { onf_id_tok: odk() };
  const A = boot(store, { full: true }); A.advance(300); A.load(); A.advance(8000);
  assert.strictEqual(A.reloads(), 1, '전제: 막힘에 한 번 새로 읽는다');
  assert.ok(!('onf_id_tok' in store), '⛔ setItem 이 던지자 열쇠를 안 치웠다 — 새로 읽어도 같은 열쇠로 또 막혀 끝없이 돈다');
  const B = boot(store, { full: true });
  assert.ok(!B.opened(), '⛔ 새로 읽은 뒤에도 열쇠로 다시 열었다(끝없는 새로 읽기)');
});

t('⛔ [🟡3] load 셈 가장자리 — 읽히는 빈 문서(about:blank) load 는 안 센다 · 두 번째 load 로 시계를 다시 안 세운다 · 열고 25초 load 면 30초 시계를 걷는다', () => {
  //   ① about:blank(같은 출처라 읽힌다) load — 세면 느린 서버를 8초에 막힘으로 판다
  const store = { onf_id_tok: odk() };
  const A = boot(store);
  A.els.app.contentWindow.location = { href: 'about:blank' };
  A.advance(100); A.load();
  delete A.els.app.contentWindow.location;
  A.advance(8000);
  assert.strictEqual(A.reloads(), 0, '⛔ 첫 빈 문서 load 를 진짜 load 로 셌다(8초에 막힘 판정)');
  assert.ok(!store.onf_devkey_try);
  A.advance(1900); A.load(); A.advance(7999);                               // 진짜 load(10초) — 그 뒤 8초
  assert.strictEqual(A.reloads(), 0);
  A.advance(1);
  assert.strictEqual(A.reloads(), 1, '⛔ 빈 문서 뒤 진짜 load 를 안 셌다');
  //   ② load 두 번 — 두 번째로 시계를 다시 세우면 막힘 판정이 밀린다
  const B = boot({ onf_id_tok: odk() });
  B.advance(300); B.load(); B.advance(4700); B.load(); B.advance(3300);    // 첫 load 뒤 8초 = 8.3초
  assert.strictEqual(B.reloads(), 1, '⛔ 두 번째 load 로 시계를 다시 세웠다(막힘 판정이 늦어진다)');
  //   ③ 열고 25초에 load — 30초 시계를 안 걷으면 load 5초 뒤(30초)에 막힘으로 판다
  const C = boot({ onf_id_tok: odk() });
  C.advance(25000); C.load(); C.advance(5000);
  assert.strictEqual(C.reloads(), 0, '⛔ 30초 시계를 안 걷었다 — load 5초 만에 막힘 판정');
  assert.strictEqual(C.msg(), '', '⛔ load 가 왔는데 30초에 안내를 띄웠다');
  C.advance(1000); C.knock(); C.advance(30000);                             // load 6초 뒤 노크 — 정상
  assert.strictEqual(C.reloads(), 0);
});

t('정상 열쇠 열기(노크 8초 안) — 안내도 새로 읽기도 기록도 없다(지금과 같다)', () => {
  const store = { onf_id_tok: odk() };
  const R = boot(store);
  R.advance(2500); R.load(); R.knock(); R.advance(60000);
  assert.strictEqual(R.reloads(), 0);
  assert.strictEqual(R.msg(), '');
  assert.ok(!('onf_devkey_off' in store) && !('onf_devkey_try' in store));
});

console.log('\n[🔁 선생님 홈 — 래퍼는 떴는데 앱 프레임이 없으면 한 번 저절로 다시 연다 (2026-10-22 Peter 「A+B」 중 B · 반박 🟡5 반영)]');
/* 액자 창 대역 — kids = 자식(sandboxFrame) 수 · app = 그 자식의 자식(userHtmlFrame = 우리 앱) 수 · location.replace 를 적는다 */
function cw(R, kids, app) {
  const w = R.els.app.contentWindow, nav = [];
  w.length = kids;
  w[0] = kids > 0 ? { length: app } : undefined;
  w.location = { get href() { throw new Error('cross-origin'); }, replace(u) { nav.push(u); } };
  return nav;
}
function loginOpen() { const R = boot({}); R.g.onCredential({ credential: gtok() }); return R; }

t('T1 로그인 길 · 래퍼는 떴는데 앱 프레임 0 → 3초 뒤에도 0 이면 같은 주소로 한 번(replace — 기록 칸 안 쌓음) · 8초 안내 시계를 다시 세운다(다시 여는 동안 「안 열렸어요」 안 적음) · 다시 연 것도 같으면 또 안 연다', () => {
  const R = loginOpen(), nav = cw(R, 1, 0), src = R.els.app.src;
  R.advance(4000); R.load(); R.advance(2999);
  assert.strictEqual(nav.length, 0, '⛔ 3초를 안 기다렸다');
  R.advance(1);
  assert.deepStrictEqual(nav, [src], '⛔ 앱 없는 래퍼를 같은 주소로 다시 안 열었다');
  R.advance(9000);
  assert.strictEqual(R.msg(), '', '⛔ 다시 여는 동안(다시 연 문서 load 전) 「화면이 안 열렸어요」를 적었다');
  R.load(); R.advance(7999);
  assert.strictEqual(R.msg(), '', '⛔ 다시 연 문서 load 뒤 8초를 안 기다렸다');
  R.advance(1);
  assert.ok(/화면이 안 열렸어요/.test(R.msg()), '⛔ 다시 연 뒤 load+8초에도 노크가 없는데 종전 안내가 없다');
  R.advance(60000);
  assert.strictEqual(nav.length, 1, '⛔ 두 번 넘게 열었다');
  assert.strictEqual(R.reloads(), 0);
});

t('T2 정상(앱 있음 · 노크) · 노크만 놓친 화면(앱 있음 · 노크 없음 — 2026-08-14 Mary) · 노크 없는 안내 한 장 · 노크 뒤 load · 3초 안 노크 — 다시 안 연다', () => {
  for (const knock of [true, false]) {
    const R = loginOpen(), nav = cw(R, 1, 1);
    R.advance(2500); R.load(); if (knock) R.knock(); R.advance(60000);
    assert.strictEqual(nav.length, 0, '⛔ 앱이 뜬 화면(노크를 놓쳐도 도는 화면)을 다시 열었다');
  }
  const R = loginOpen(), nav = cw(R, 1, 0);
  R.advance(2000); R.knock(); R.load(); R.advance(60000);
  assert.strictEqual(nav.length, 0, '⛔ 노크한 화면(안 보낸 글이 있을 수 있다)을 다시 열었다');
  const Q = loginOpen(), nq = cw(Q, 1, 0);
  Q.advance(300); Q.load(); Q.advance(2000); Q.knock(); Q.advance(60000);
  assert.strictEqual(nq.length, 0, '⛔ 3초 안에 노크한 화면을 다시 열었다');
  const A = loginOpen(), na = cw(A, 1, 0);
  A.advance(300); A.load(); A.advance(1000); A.els.app.contentWindow[0] = { length: 1 }; A.advance(60000);
  assert.strictEqual(na.length, 0, '⛔ 3초 안에 앱 프레임이 생긴 화면을 다시 열었다');
});

t('T3 🟡5 자식 0 화면(구글 오류·여러 계정 /a/macros 리다이렉트 중간 문서·「액세스 권한 필요」)은 안 탄다 — 진행 중 doGet 을 안 끊는다 · 로그인 전(잠금 화면) · 느린 서버도 안 연다', () => {
  const Z = loginOpen(), nz = cw(Z, 0, 0);
  Z.advance(300); Z.load(); Z.advance(60000);
  assert.strictEqual(nz.length, 0, '⛔ 자식 0 문서(리다이렉트 중간일 수 있다)를 다시 열었다');
  const R = boot({}), nav = cw(R, 0, 0);
  R.advance(120000);
  assert.ok(!R.opened() && nav.length === 0, '⛔ 로그인 전에 액자를 열었다');
  const S = loginOpen(), ns = cw(S, 1, 1);
  S.advance(12000); S.load(); S.knock(); S.advance(60000);
  assert.strictEqual(ns.length, 0, '⛔ 느린 서버를 다시 열었다(doGet 두 번)');
});

t('T4 열쇠 길은 안 탄다 — 8초 덫이 그 한 번(구글 창구로 새로 읽기)이다 · 겹쳐 다시 열지 않는다', () => {
  const store = { onf_id_tok: odk() };
  const R = boot(store), nav = cw(R, 1, 0);
  R.advance(300); R.load(); R.advance(8000);
  assert.strictEqual(nav.length, 0, '⛔ 열쇠 길에서 덫 말고 따로 다시 열었다');
  assert.strictEqual(R.reloads(), 1, '전제: 덫은 종전대로');
});

t('📝 주소의 mode — student·hwbook(과제 판 2026-10-23)만 안쪽으로 넘긴다 · 모르는 mode 는 버린다 · t 는 모양만', () => {
  const src = (q) => { const R = boot({ onf_id_tok: odk() }, { search: q }); return String(R.els.app.src || ''); };
  assert.ok(/[?&]mode=hwbook(&|$)/.test(src('?mode=hwbook&t=Tok_1')) && /[?&]t=Tok_1(&|$)/.test(src('?mode=hwbook&t=Tok_1')), '⛔ 과제 판 주소가 안쪽에 안 간다: ' + src('?mode=hwbook&t=Tok_1'));
  assert.ok(/[?&]mode=student(&|$)/.test(src('?mode=student&t=Tok_1')), '학생 한 명 창은 그대로');
  assert.ok(!/mode=/.test(src('?mode=evil&t=Tok_1')), '⛔ 모르는 mode 를 안쪽 doGet 에 흘렸다');
  assert.ok(!/t=/.test(src('?mode=hwbook&t=bad%20tok')), '⛔ 모양이 틀린 t 를 넘겼다');
});

t('📝 과제 판 — 「열어 줘(hwbook)」 = 껍데기 주소를 안 바꾸고(새로 읽기 0 = 로그인 다시 안 물음) 위에 과제 판 액자 · 홈(우리 안쪽 창)에서 온 것만 · 모양 거름 · 홈에 hwOpened', () => {
  const L = '402d6a62-96ae-817f-86ec-ecaf4f919ab9', HREF = 'https://class.ownify.co.kr/teacher';
  assert.ok(/[?&]l=402d6a62/.test(String(boot({ onf_id_tok: odk() }, { search: '?mode=hwbook&t=Tok_1&l=' + L }).els.app.src || '')), '⛔ 주소로 연 과제 판 — l 이 안쪽에 안 간다');
  assert.ok(!/[?&]l=/.test(String(boot({ onf_id_tok: odk() }, { search: '?mode=student&t=Tok_1&l=' + L }).els.app.src || '')), '⛔ 학생 창에 l 을 흘렸다');
  const R = boot({ onf_id_tok: odk() }), told = [], me = { parent: R.els.app.contentWindow, postMessage: (m) => told.push(m) }, other = { parent: R.els.app.contentWindow, postMessage() {} };
  R.knockAs(me);
  const frames = () => R.created.filter((e) => e.tag === 'iframe');
  R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L }, other);
  R.postAs({ onf: 'hwbook', t: 'Tok 1', l: L }, me);
  R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L }, me, 'https://evil.example');
  assert.equal(frames().length, 0, '⛔ 노크한 창이 아닌 창·틀린 모양·다른 출처의 말로 열었다');
  R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L, f: [{ id: 'PHOTOaaaaaaaa1', ymd: '2026-10-20' }, { id: 'bad id', ymd: '2026-10-20' }], hwt: { p: '{"s":"Tok_1"}', sig: 'A'.repeat(43) } }, me);
  assert.equal(R.g.location.href, HREF, '⛔ 껍데기 주소를 바꿨다(새로 읽기 = WebKit 로그인 다시)');
  assert.equal(frames().length, 1);
  assert.equal(frames()[0].src, R.g.EXEC + '?mode=hwbook&t=Tok_1&l=' + L, '⛔ 과제 판 액자 주소');
  assert.ok(R.calls.some((c) => /^push:\{"onfHw":1/.test(c)), '⛔ 뒤로 = 닫기 칸이 없다');
  assert.ok(told.some((m) => m.onf === 'hwOpened'), '⛔ 홈에 hwOpened');
  assert.ok(!JSON.stringify(R.calls).includes('PHOTO') && R.g.sessionStorage.getItem('onfHwGo') === null, '⛔ 고른 사진을 주소·저장소에 남겼다');
});
t('📝 과제 판 액자 — 노크엔 지금 토큰 + 고른 사진·입장권(한 번만) · 그 액자 후손·googleusercontent 만 · 홈 노크 자물쇠(appWin)는 안 건드림 · ‹ 와 뒤로 = 닫기(홈엔 뒤로 안 보냄)', () => {
  const L = '402d6a62-96ae-817f-86ec-ecaf4f919ab9', HWT = { p: '{"s":"Tok_1"}', sig: 'A'.repeat(43) };
  const R = boot({ onf_id_tok: odk() }), homeGot = [], me = { parent: R.els.app.contentWindow, postMessage: (m) => homeGot.push(m) };
  R.knockAs(me); homeGot.length = 0;
  R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L, f: [{ id: 'PHOTOaaaaaaaa1', ymd: '2026-10-20' }], hwt: HWT }, me);
  const fr = R.created.filter((e) => e.tag === 'iframe')[0], got = [], inner = { parent: { parent: fr.contentWindow }, postMessage: (m) => got.push(m) };
  R.postAs({ onf: 'auth-please' }, { parent: {}, postMessage: (m) => got.push(m) });
  R.postAs({ onf: 'auth-please' }, inner, 'https://evil.example');
  assert.equal(got.length, 0, '⛔ 남의 창·다른 출처 노크에 토큰을 줬다');
  R.postAs({ onf: 'auth-please' }, inner);
  assert.equal(got.length, 1); assert.ok(/^odk1\./.test(got[0].token) && got[0].hist === 0);
  assert.deepEqual(JSON.parse(JSON.stringify(got[0].hw)), { f: [{ id: 'PHOTOaaaaaaaa1', ymd: '2026-10-20' }], hwt: HWT }, '⛔ 고른 사진·입장권');
  R.postAs({ onf: 'auth-please', stale: true }, inner);
  assert.equal(got.length, 1, '⛔ 죽은 토큰을 또 줬다(판이 「로그인이 필요해요」 에 갇힌다)');
  assert.ok(R.calls.includes('prompt'), '⛔ 만료 토큰 — 구글에서 새로 받지 않았다');
  assert.ok(!homeGot.some((m) => m.onf === 'auth'), '⛔ 과제 판 노크가 홈 자물쇠를 건드렸다');
  const fresh = gtok(); R.g.onCredential({ credential: fresh });
  assert.equal(got.length, 2, '⛔ 새로 받은 토큰을 판에 안 줬다'); assert.equal(got[1].token, fresh);
  assert.equal(got[1].hw, undefined, '⛔ 고른 사진을 두 번 줬다(다시 열기마다 사진을 또 붙인다)');
  R.postAs({ onf: 'auth-please', stale: true }, inner);   // 홈이 그새 또 새 토큰을 받았다면 그것을 바로 — 같은 것이면 다시 받기
  assert.equal(got.length, 2);
  R.postAs({ onf: 'hwbookBack' }, inner);
  assert.ok(R.calls.includes('back'), '⛔ ‹ = 기록 칸 하나 뒤로(닫기)');
  R.g.history.state = null; R.pop();
  assert.ok(R.created.find((e) => e.className === 'onf-hwbox').removed, '⛔ 뒤로 = 과제 판 액자 닫기');
  assert.ok(!homeGot.some((m) => m.onf === 'hist-pop'), '⛔ 과제 판 칸을 걷은 뒤로를 홈 「뒤로」 로 보냈다(홈 창이 닫힌다)');
  R.postAs({ onf: 'auth-please' }, inner);
  assert.equal(got.length, 2, '⛔ 닫힌 액자 노크에 답했다');
  // 두 번 열면 과제 판 칸은 하나(덮어쓰기) · 붙이기 전에 주소
  R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L }, me); R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L }, me);
  assert.equal(R.calls.filter((c) => /^push:\{"onfHw"/.test(c)).length, 2, '⛔ 열려 있는 과제 판 위에 칸을 또 쌓았다(처음 1 + 다시 1 · 그 사이 닫았으므로 2)');
});

t('📝 과제 미리 띄우기 — hwbookWarm = 안 보이는 액자(&warm=1 · 뒤로 칸 없음) · 과제 열기 = 그 액자를 보이고 hwbookGo{l,hw} · 다른 학생이면 새로 · 안 보이는 동안 뒤로는 안 닫음', () => {
  const L = '402d6a62-96ae-817f-86ec-ecaf4f919ab9', HWT = { p: '{"s":"Tok_1"}', sig: 'A'.repeat(43) };
  const R = boot({ onf_id_tok: odk() }), me = { parent: R.els.app.contentWindow, postMessage() {} };
  R.knockAs(me);
  const frames = () => R.created.filter((e) => e.tag === 'iframe'), pushes = () => R.calls.filter((c) => /^push:/.test(c)).length;
  R.postAs({ onf: 'hwbookWarm', t: 'Tok_1' }, me);
  assert.equal(frames().length, 1); assert.equal(frames()[0].src, R.g.EXEC + '?mode=hwbook&t=Tok_1&warm=1');
  const box = R.created.find((e) => e.className === 'onf-hwbox');
  assert.ok(/visibility:hidden/.test(box.style.cssText) && /pointer-events:none/.test(box.style.cssText), '⛔ 미리 띄운 액자가 보인다');
  assert.equal(pushes(), 0, '⛔ 미리 띄우기가 뒤로 칸을 쌓았다');
  R.postAs({ onf: 'hwbookWarm', t: 'Tok_1' }, me); assert.equal(frames().length, 1, '같은 학생이면 다시 안 띄운다');
  R.g.history.state = null; R.pop(); assert.ok(!box.removed, '⛔ 안 보이는 미리 띄운 판을 뒤로가 닫았다');
  const got = [], inner = { parent: { parent: frames()[0].contentWindow }, postMessage: (m) => got.push(m) };
  R.postAs({ onf: 'auth-please' }, inner);   // 미리 띄운 판이 먼저 노크(토큰만)
  assert.equal(got.length, 1); assert.equal(got[0].hw, undefined);
  R.postAs({ onf: 'hwbook', t: 'Tok_1', l: L, f: [{ id: 'PHOTOaaaaaaaa1', ymd: '2026-10-20' }], hwt: HWT }, me);
  assert.equal(frames().length, 1, '⛔ 과제 열기가 새 액자를 또 만들었다(미리 띄운 것을 써야)');
  assert.equal(box.style.visibility, '', '⛔ 보이지 않았다');
  assert.equal(pushes(), 1, '보일 때 뒤로 칸 하나');
  assert.deepEqual(JSON.parse(JSON.stringify(got[1])), { onf: 'hwbookGo', l: L, hw: { f: [{ id: 'PHOTOaaaaaaaa1', ymd: '2026-10-20' }], hwt: HWT } }, '⛔ hwbookGo');
  // 늦게 뜬 판 — 과제 열기 뒤에 노크하면 토큰 다음에 바로 hwbookGo
  const R2 = boot({ onf_id_tok: odk() }), me2 = { parent: R2.els.app.contentWindow, postMessage() {} }; R2.knockAs(me2);
  R2.postAs({ onf: 'hwbookWarm', t: 'Tok_1' }, me2); R2.postAs({ onf: 'hwbook', t: 'Tok_1', l: L, f: [], hwt: HWT }, me2);
  const got2 = [], in2 = { parent: { parent: R2.created.filter((e) => e.tag === 'iframe')[0].contentWindow }, postMessage: (m) => got2.push(m) };
  R2.postAs({ onf: 'auth-please' }, in2);
  assert.deepEqual(got2.map((m) => m.onf), ['auth', 'hwbookGo'], '⛔ 늦게 뜬 판에 열기 말을 안 줬다');
  // 토큰이 죽은 채 늦게 뜬 판 — 새로 받은 토큰 뒤에도 「열어」 가 간다(반박 🔴1)
  const R4 = boot({ onf_id_tok: odk() }), me4 = { parent: R4.els.app.contentWindow, postMessage() {} }; R4.knockAs(me4);
  R4.postAs({ onf: 'hwbookWarm', t: 'Tok_1' }, me4); R4.postAs({ onf: 'hwbook', t: 'Tok_1', l: L, f: [], hwt: HWT }, me4);
  const got4 = [], in4 = { parent: { parent: R4.created.filter((e) => e.tag === 'iframe')[0].contentWindow }, postMessage: (m) => got4.push(m) };
  R4.g.pending = 'x.' + b64({ exp: now() - 10, hd: 'ownify.co.kr', email: 't@ownify.co.kr' }) + '.y';   // 그새 토큰이 죽었다
  R4.postAs({ onf: 'auth-please' }, in4); assert.equal(got4.length, 0, '죽은 토큰은 안 준다(새로 받기)');
  R4.g.onCredential({ credential: gtok() });
  assert.deepEqual(got4.map((m) => m.onf), ['auth', 'hwbookGo'], '⛔ 새 토큰 길에서 「열어」 가 빠졌다');
  assert.ok(R4.created.some((e) => e.className === 'onf-hwx'), '⛔ 미리 띄운 판에 닫기 단추가 없다');
  // 다른 학생 — 미리 띄운 것을 걷고 새로
  const R3 = boot({ onf_id_tok: odk() }), me3 = { parent: R3.els.app.contentWindow, postMessage() {} }; R3.knockAs(me3);
  R3.postAs({ onf: 'hwbookWarm', t: 'Tok_1' }, me3); R3.postAs({ onf: 'hwbook', t: 'Tok_2', l: L }, me3);
  const fr3 = R3.created.filter((e) => e.tag === 'iframe');
  assert.equal(fr3.length, 2); assert.ok(R3.created.filter((e) => e.className === 'onf-hwbox')[0].removed); assert.ok(/t=Tok_2&l=/.test(fr3[1].src));
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
