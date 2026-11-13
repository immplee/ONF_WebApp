/* 🔄 새 코드 알아채기(2026-11-14 Peter 「새로 배포한 코드는 새로 고침을 안 눌러도」) — assets/onf-frame.js verWatch + 두 껍데기 배선.
   잰다: ① 처음 값 = 기준(바뀜 아님) ② 정적 판 도장(v.json)·껍데기 ETag 가 바뀌면 onNew 한 번 ③ 보이는 동안엔 절대 onBack(다시 읽기) 안 함
        ④ 30초 넘게 숨었다 돌아올 때만 onBack + clog reopen:ver ⑤ 못 읽은 칸(망·404)은 바뀜이 아님 ⑥ 남의 출처 script 는 안 묻는다 ⑦ fetch 없는 창은 아무것도 안 함
        ⑧ 배선 — 학생 mount·선생님 mount: onNew = 숨긴 판만 bookRetire(+ 선생님 미리 띄운 과제 판 hwClose) · onBack = 보이는 판 rsSave → location.reload
   실행: node test/ver-reload.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FSRC = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8'), TSRC = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const T = [];
const t = (n, f) => T.push([n, f]);
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };

/** onf-frame.js 를 vm 에 — fetch 는 표(srv)에서 답한다 · 시계·숨김·5분 틱은 손으로 민다 */
function setup(o) {
  o = o || {};
  const srv = { 'https://app.ownify.co.kr/v.json': { ok: true, v: 'A' }, 'https://class.ownify.co.kr/teacher/': { ok: true, etag: '"p1"' }, 'https://class.ownify.co.kr/assets/onf-frame.js': { ok: true, etag: 'W/"f1"' } };
  const asked = [], beacons = [], ticks = [], vis = [];
  const doc = { hidden: false, addEventListener(k, f) { if (k === 'visibilitychange') vis.push(f); }, documentElement: { setAttribute() {} },
    querySelectorAll: () => [{ src: 'https://class.ownify.co.kr/assets/onf-frame.js' }, { src: 'https://accounts.google.com/gsi/client' }, { href: 'https://class.ownify.co.kr/assets/onf-frame.js' }] };
  const g = { URL, document: doc, location: { origin: 'https://class.ownify.co.kr', pathname: '/teacher/', search: '', href: 'https://class.ownify.co.kr/teacher/' },
    navigator: { userAgent: 'node', sendBeacon: (u, b) => { beacons.push([u, JSON.parse(b)]); return true; } }, localStorage: null, sessionStorage: null,
    addEventListener() {}, setTimeout() { return 0; }, clearTimeout() {}, Promise, JSON, Array, String };
  g.T = 1.7e12; g.Date = { now: () => g.T };
  if (!o.noFetch) {
    g.fetch = (u, opt) => {
      asked.push([u, (opt && opt.method) || 'GET']);
      const r = srv[u];
      if (!r || r.err) return Promise.reject(new Error('net'));
      return Promise.resolve({ ok: r.ok, headers: { get: (k) => (k === 'etag' ? r.etag || null : null) }, json: () => Promise.resolve({ v: r.v }) });
    };
  }
  g.setInterval = (f, ms) => { ticks.push([f, ms]); return ticks.length; };
  g.window = g; vm.createContext(g);
  vm.runInContext(FSRC, g, { filename: 'onf-frame.js' });
  const calls = { nw: 0, back: 0 };
  g.ONF.frame.verWatch('/teacher/', () => calls.nw++, () => calls.back++);
  const hide = (ms) => { doc.hidden = true; vis.forEach((f) => f()); g.T += ms; doc.hidden = false; vis.forEach((f) => f()); };
  return { g, srv, asked, beacons, ticks, calls, hide, tick: () => ticks.forEach((x) => x[0]()) };
}

console.log('[🔄 새 코드 알아채기 — verWatch]');
t('처음 값은 기준(바뀜 아님) · 같은 값 5분 틱·30초 넘게 숨었다 와도 아무 일 없음 · 5분 틱 · 남의 출처 script(구글 로그인)는 안 묻고 같은 파일은 한 번만', async () => {
  const s = setup(); await flush();
  assert.deepStrictEqual(s.asked.map((x) => x.join(' ')), ['https://app.ownify.co.kr/v.json GET', 'https://class.ownify.co.kr/teacher/ HEAD', 'https://class.ownify.co.kr/assets/onf-frame.js HEAD'], '⛔ 묻는 곳: ' + JSON.stringify(s.asked));
  assert.strictEqual(s.ticks.length, 1); assert.strictEqual(s.ticks[0][1], 5 * 60 * 1000, '⛔ 틱이 5분이 아니다');
  s.tick(); await flush(); s.hide(60000); await flush();
  assert.deepStrictEqual(s.calls, { nw: 0, back: 0 }, '⛔ 안 바뀌었는데 움직였다');
});
t('정적 판 도장이 바뀌면 onNew 한 번 · 보이는 동안엔 다시 안 읽는다 · 29초 숨김도 안 읽는다 · 31초 숨었다 오면 다시 읽고 clog reopen:ver(값 없음)', async () => {
  const s = setup(); await flush();
  s.srv['https://app.ownify.co.kr/v.json'].v = 'B';
  s.tick(); await flush();
  assert.deepStrictEqual(s.calls, { nw: 1, back: 0 }, '⛔ 바뀜에 onNew 한 번 · 보이는 중 다시 읽기 0 이어야: ' + JSON.stringify(s.calls));
  s.tick(); await flush(); s.hide(29000); await flush();
  assert.deepStrictEqual(s.calls, { nw: 1, back: 0 }, '⛔ 보이는 중·짧게 숨김에 다시 읽었거나 onNew 를 또 불렀다: ' + JSON.stringify(s.calls));
  s.hide(31000); await flush();
  assert.strictEqual(s.calls.back, 1, '⛔ 30초 넘게 숨었다 왔는데 다시 안 읽었다');
  assert.ok(s.beacons.length === 1 && s.beacons[0][1][0].c === 'reopen:ver' && /\/clog$/.test(s.beacons[0][0]), '⛔ clog 줄: ' + JSON.stringify(s.beacons));
});
t('숨은 동안 배포 — 31초 뒤 돌아온 그 순간 처음 알아도 onNew 뒤 바로 다시 읽는다', async () => {
  const s = setup(); await flush();
  s.srv['https://app.ownify.co.kr/v.json'].v = 'B';
  s.hide(120000); await flush();
  assert.deepStrictEqual(s.calls, { nw: 1, back: 1 }, '⛔ ' + JSON.stringify(s.calls));
});
t('껍데기(Vercel) ETag 가 바뀌어도 새 코드 · W/ 앞붙이만 다른 것은 같은 값', async () => {
  const s = setup(); await flush();
  s.srv['https://class.ownify.co.kr/assets/onf-frame.js'].etag = '"f1"'; s.tick(); await flush();
  assert.strictEqual(s.calls.nw, 0, '⛔ W/ 만 다른 ETag 를 바뀜으로 셌다');
  s.srv['https://class.ownify.co.kr/teacher/'].etag = '"p2"'; s.tick(); await flush();
  assert.strictEqual(s.calls.nw, 1, '⛔ 껍데기 페이지 ETag 바뀜을 못 알아챘다');
});
t('못 읽은 칸(망 끊김 · 404 · 도장 없음)은 바뀜이 아니다 · 나중에 처음 읽힌 값은 기준', async () => {
  const s = setup({}); s.srv['https://app.ownify.co.kr/v.json'] = { ok: false }; await flush();
  s.srv['https://class.ownify.co.kr/teacher/'].err = true; s.tick(); await flush();
  s.srv['https://app.ownify.co.kr/v.json'] = { ok: true, v: 'A' }; s.tick(); await flush();
  s.srv['https://class.ownify.co.kr/teacher/'].err = false; s.tick(); await flush();
  assert.strictEqual(s.calls.nw, 0, '⛔ 못 읽은 칸·처음 생긴 도장을 바뀜으로 셌다');
  s.srv['https://app.ownify.co.kr/v.json'].v = 'B'; s.tick(); await flush();
  assert.strictEqual(s.calls.nw, 1, '⛔ 나중에 생긴 도장을 기준으로 안 잡았다');
});
t('fetch 없는 창 — 아무것도 안 한다(틱도 안 건다 · 던지지 않는다)', async () => {
  const s = setup({ noFetch: true }); await flush();
  assert.deepStrictEqual([s.asked.length, s.ticks.length, s.calls.nw], [0, 0, 0]);
});

/** 배선 줄을 꺼내 가짜 판·가짜 verWatch 로 돌린다 — onNew·onBack 이 무엇을 부르나 */
function wire(src, re, extra) {
  const m = re.exec(src); assert.ok(m, '⛔ verWatch 배선 줄을 못 찾았다');
  const log = [], P = (n, parked) => ({ n, parked });
  const books = [P('a', true), P('b', false), P('c', true)];
  const g = Object.assign({ books, log, got: null, location: { reload: () => log.push('reload') },
    bookRetire: (p) => { log.push('retire ' + p.n); books.splice(books.indexOf(p), 1); },   // 진짜 bookRetire 는 판을 지울 수도 있다(bookPark → bookDrop) — 목록을 바꿔도 다 돈다
    bookShown: () => books.find((p) => !p.parked) || null, rsSave: (p) => log.push('rsSave ' + p.n), rsSaveNow: () => log.push('rsSaveNow') }, extra || {});
  g.window = g; g.global = g;
  g.verWatch = (page, a, b) => { g.got = { page, a, b }; };
  g.ONF = { frame: { verWatch: g.verWatch } };
  vm.createContext(g); vm.runInContext(m[0], g);
  assert.ok(g.got, '⛔ verWatch 를 안 불렀다');
  return g;
}
console.log('[🔄 배선 — 학생 mount · 선생님 mount]');
t('학생 mount — 숨긴 판만 bookRetire(보이는 판 그대로) · 돌아오면 rsSaveNow → reload · 페이지 = /index.html', async () => {
  const mi = FSRC.indexOf('  function mount(frameEl, src, opts) {'), me = FSRC.indexOf('return { _books: books, _drop: bookDrop };');
  const g = wire(FSRC.slice(mi, me), /verWatch\('\/index\.html'[^\n]*\n/);
  assert.strictEqual(g.got.page, '/index.html');
  g.got.a(); assert.deepStrictEqual(g.log, ['retire a', 'retire c'], '⛔ 내린 판: ' + g.log.join());
  g.log.length = 0; g.got.b(); assert.deepStrictEqual(g.log, ['rsSaveNow', 'reload'], '⛔ 다시 읽기 차례: ' + g.log.join());
});
t('선생님 mount — 숨긴 판만 bookRetire · 미리 띄운(숨긴) 과제 판만 hwClose · 보이는 과제 판은 그대로 · 돌아오면 보이는 판 rsSave → reload · 페이지 = /teacher/', async () => {
  const mi = TSRC.indexOf('function mount() {'), me = TSRC.indexOf('\n}\n', mi);
  const re = /if \(window\.ONF && ONF\.frame && ONF\.frame\.verWatch\) ONF\.frame\.verWatch\([^\n]*\n/;
  let g = wire(TSRC.slice(mi, me), re, { hwBox: {}, hwWarmOn: true, hwClose: () => g.log.push('hwClose') });
  assert.strictEqual(g.got.page, '/teacher/');
  g.got.a(); assert.deepStrictEqual(g.log, ['retire a', 'retire c', 'hwClose'], '⛔ 내린 것: ' + g.log.join());
  g.log.length = 0; g.got.b(); assert.deepStrictEqual(g.log, ['rsSave b', 'reload'], '⛔ 다시 읽기 차례: ' + g.log.join());
  g = wire(TSRC.slice(mi, me), re, { hwBox: {}, hwWarmOn: false, hwClose: () => g.log.push('hwClose') });
  g.got.a(); assert.ok(g.log.indexOf('hwClose') < 0, '⛔ 보이는 과제 판을 닫았다');
});

(async () => {
  for (const [n, f] of T) { try { await f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + '\n     ' + String(e && e.message).split('\n')[0]); } }
  console.log('\n' + pass + '개 통과, ' + fail + '개 실패'); if (fail) process.exit(1);
})();
