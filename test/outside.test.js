/* 🌤 밖으로 1(2026-10-24) — 홈이 out:1 로 연 교재만 구글 밖 정적 판(ONF_OUT_BOOK)에 띄우고 토큰·사본 힌트는 postMessage 로 넘긴다.
   안 뜨면(OUT_MS 안 outHello 없음 · outFail) 같은 판에 지금 길(exec) · 그날은 그 기기에서 지금 길(onfOutFail) · 기기 끄기 out=0(onfOut).
   잰다: S5a 지금 길 무변 · S5b 정적 판 + outBoot 한 번 · S5c 물러남·하루 기억 · S5d 출처 도우미 하나 · S5e 기기 끄기 · S5f 첫 교재 기억 o:1 · S5g 내 문장·카드 덱은 지금 길
   실행: node test/outside.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
function win(name, parent) { const w = { name, sent: [] }; w.parent = parent || w; w.postMessage = (m, o) => w.sent.push([m, o]); return w; }
const js = (x) => JSON.parse(JSON.stringify(x));
const ROOT = path.join(__dirname, '..');
const CODE = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8');
const OUT_BOOK = (/var ONF_OUT_BOOK = '([^']+)'/.exec(CODE) || [])[1] || 'ONF_OUT_BOOK 없음';   // 상수 한 줄(시험 땐 Pages 주소로 바뀐다)
const OUT_O = (() => { try { return new URL(OUT_BOOK).origin; } catch (e) { return 'x'; } })();
const GO = 'https://n-abc-0lu-script.googleusercontent.com';
const LSf = (init) => { const m = Object.assign({}, init || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };

const E1 = 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', E2 = 'https://class.ownify.co.kr/a-s1-e2-b?mode=share';
const MINE = 'https://class.ownify.co.kr/?mode=mine&v=1', CARDS = 'https://class.ownify.co.kr/a-s1-e1-b?mode=share&view=cards';
const SRC1 = 'https://script.google.com/x/exec?t=T&mode=share&embed=1', SRC2 = 'https://script.google.com/x/exec?t=T&mode=share&ep=e2&embed=1';
const SRCM = 'https://script.google.com/x/exec?t=T&mode=mine&embed=1', SRCC = 'https://script.google.com/x/exec?t=T&mode=share&view=cards&embed=1';
const BS = (h) => (/view=cards/.test(h) ? SRCC : /mode=mine/.test(h) ? SRCM : /a-s1-e2-b/.test(h) ? SRC2 : /mode=share/.test(h) ? SRC1 : null);
const CF = { f: 'FILE_ID_0123456789', s: 'E1', k: 'v1.abc.def' };

/* book-panel.test.js 의 setup 꼴 — mount 에 out·tok 을 더 넘긴다(index.html 과 같게 기본 켬) */
function setup(o) {
  o = o || {};
  const listeners = {};
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '', vars: {}, style: { setProperty(k, v) { el.vars[k] = v; }, removeProperty(k) { delete el.vars[k]; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; }, getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
    L: {}, addEventListener(k, f) { (el.L[k] = el.L[k] || []).push(f); } }; return el; };
  const top = win('shell');
  const timers = [];
  const g = { listeners, top, timers,
    setTimeout: (f, ms) => { timers.push({ f, ms, on: true }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].on = false; } };
  vm.createContext(g);
  g.window = g; g.URL = URL; g.localStorage = o.ls || LSf(); g.innerWidth = 1440;
  g.T = 1.7e12; g.Date = { now: () => g.T };
  g.navigator = { userAgent: 'node' }; g.history = { state: null, replaceState() {}, pushState() {} };
  g.console = { info() {}, warn() {}, log() {} };
  const root = { attrs: {}, setAttribute(k, v) { root.attrs[k] = v; } };
  g.document = { addEventListener() {}, body, createElement: mkEl, documentElement: root };
  g.addEventListener = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); };
  g.removeEventListener = (k, fn) => { listeners[k] = (listeners[k] || []).filter((x) => x !== fn); };
  if (o.pre) o.pre(g, root);
  vm.runInContext(CODE, g, { filename: 'onf-frame.js' });
  const homeWin = win('home-exec', top), homeInner = win('home-user', homeWin);
  const frameEl = { contentWindow: homeWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), addEventListener() {} };
  const M = g.ONF.frame.mount(frameEl, 'https://script.google.com/x/exec?t=T', { phone: o.phone !== false, swap: o.swap, preKey: o.preKey, bookSrc: BS,
    out: o.out !== false, tok: o.tok === undefined ? 'TOK' : o.tok });
  const send = (data, source, origin) => (listeners.message || []).forEach((fn) => fn({ data, source, origin: origin || GO }));
  const panels = () => body.kids.filter((k) => k.className === 'onf-bookpanel');
  const obj = (box) => M && M._books.find((b) => b.box === box);
  const fire = (ms) => timers.filter((x) => x.on && x.ms === ms).forEach((x) => { x.on = false; x.f(); });
  return { g, listeners, body, homeInner, homeWin, send, panels, top, timers, frameEl, obj, fire };
}
/* 정적 판 액자 창 — 구글 겹 없이 액자 창 그 자체가 말한다 */
function outWin(s, box) { const w = win('out-book', s.top); box.kids[0].contentWindow = w; return w; }
const boots = (w) => js(w.sent).filter((x) => x[0].onf === 'outBoot');

console.log('[🌤 밖으로 1 — 껍데기]');

t('S5a out 없는 openBook → 지금 exec 주소 그대로(bookSrc 결과) · outBoot 없음', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const p = s.panels()[0];
  assert.strictEqual(p.kids[0].src, SRC1, '⛔ 지금 길 주소가 바뀌었다');
  const w = outWin(s, p);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.strictEqual(boots(w).length, 0, '⛔ out 없는 판에 outBoot 을 보냈다');
});

t('S5b out:1 → 액자 주소 = ONF_OUT_BOOK(t= 없음) · 그 액자 창의 outHello 에 그 출처로 outBoot{tok,src,cf} 한 번 · 남의 창·남의 출처 hello 는 버림', () => {
  assert.strictEqual(OUT_BOOK, 'https://app.ownify.co.kr/book/', '상수 값(브리프)');
  const s = setup();
  s.send({ onf: 'openBook', href: E1, out: 1, cf: CF }, s.homeInner);
  const p = s.panels()[0];
  assert.strictEqual(p.kids[0].src, OUT_BOOK, '⛔ 켠 교재인데 정적 판 주소가 아니다: ' + p.kids[0].src);
  assert.ok(!/[?&]t=/.test(p.kids[0].src) && p.kids[0].src.indexOf('TOK') < 0, '⛔ 정적 판 주소에 토큰이 실렸다');
  const w = outWin(s, p), stranger = win('stranger', s.top);
  s.send({ onf: 'outHello' }, stranger, OUT_O);
  s.send({ onf: 'outHello' }, w, 'https://evil.example.com');
  s.send({ onf: 'outHello' }, w, GO);
  assert.strictEqual(boots(w).length + boots(stranger).length, 0, '⛔ 남의 창·남의 출처 hello 에 outBoot 을 보냈다');
  s.send({ onf: 'outHello' }, w, OUT_O);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w), [[{ onf: 'outBoot', tok: 'TOK', src: SRC1, cf: CF }, OUT_O]], '⛔ outBoot 이 없거나 두 번이거나 꼴·출처가 다르다');
  //   정적 판의 노크(bookHi)는 새 출처로 와도 판 창이 된다 — 그 뒤는 지금 교재와 같은 말
  s.send({ onf: 'bookHi', views: 'line', swap: 1 }, w, OUT_O);
  assert.ok(s.obj(p).win === w && s.obj(p).origin === OUT_O, '⛔ 정적 판 노크를 판 창으로 안 받았다');
  //   OUT_MS 시계가 hello 뒤에 터져도 물러나지 않는다
  s.fire(2500);
  assert.strictEqual(p.kids[0].src, OUT_BOOK, '⛔ hello 가 왔는데 시한으로 지금 길로 물러났다');
});

t('S5b 사본 힌트가 틀린 꼴이면 cf 는 빼고(null) 보낸다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1, out: 1, cf: { f: 'x' } }, s.homeInner);
  const w = outWin(s, s.panels()[0]);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w).map((x) => x[0].cf), [null], '⛔ 틀린 cf 를 그대로 넘겼다');
});

t('S5c OUT_MS 안 outHello 없음 → 같은 판에 exec 로 다시 · onfOutFail 하루 기억 → 그날 다음 out:1 은 바로 지금 길 · 하루 뒤엔 다시 정적 판', () => {
  const ls = LSf();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  outWin(s, box);
  s.fire(2500);
  assert.ok(s.panels().length === 1 && s.panels()[0] === box, '⛔ 물러날 때 판을 새로 만들었다');
  assert.strictEqual(box.kids[0].src, SRC1, '⛔ 같은 판에 exec 로 다시 안 열었다');
  assert.strictEqual(ls.m.onfOutFail, String(1.7e12), '⛔ 기기에 onfOutFail 을 안 적었다');
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  assert.strictEqual(s.panels().slice(-1)[0].kids[0].src, SRC2, '⛔ 실패한 날 다음 out:1 이 또 정적 판으로 갔다');
  const n = setup({ ls: LSf({ onfOutFail: String(1.7e12 - 86400000 - 1) }) });
  n.send({ onf: 'openBook', href: E1, out: 1 }, n.homeInner);
  assert.strictEqual(n.panels()[0].kids[0].src, OUT_BOOK, '⛔ 하루 지난 기억에도 지금 길로 갔다');
});

t('S5c outFail(그 창·그 출처) → 같은 판에 exec 로 다시 · 남의 출처 outFail 은 버림 · hello 뒤에 와도 물러남', () => {
  const ls = LSf();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  s.send({ onf: 'outFail', why: 'api' }, w, 'https://evil.example.com');
  s.send({ onf: 'outFail', why: 'api' }, win('stranger', s.top), OUT_O);
  assert.strictEqual(box.kids[0].src, OUT_BOOK, '⛔ 남의 출처·남의 창 outFail 로 물러났다');
  s.send({ onf: 'outFail', why: 'bridge' }, w, OUT_O);
  assert.ok(box.kids[0].src === SRC1 && ls.m.onfOutFail, '⛔ outFail 로 물러나지 않았다');
  s.send({ onf: 'outFail', why: 'bridge' }, w, OUT_O);
  assert.strictEqual(box.kids[0].src, SRC1, '물러남은 한 번');
});

t('S5c 지운 판(load 전)의 정적 판 시계는 걷힌다 — 지운 뒤 시한이 터져도 기억·주소 안 바뀜', () => {
  const ls = LSf();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  s.obj(box).oe.stop();
  s.fire(2500);
  assert.ok(box.kids[0].src === OUT_BOOK && !ls.m.onfOutFail, '⛔ 멈춘 뒤에도 물러났다');
});

t('S5d isAppOrigin — googleusercontent·정적 판 출처 둘만 · 비슷한 이름·http·우리 껍데기 출처는 거짓', () => {
  const s = setup();
  const f = s.g.ONF.frame.isAppOrigin;
  assert.strictEqual(typeof f, 'function', '⛔ ONF.frame.isAppOrigin 이 없다');
  for (const o of [GO, 'https://app.ownify.co.kr', 'https://onf-app.pages.dev']) assert.strictEqual(f(o), true, o);
  for (const o of ['https://app.ownify.co.kr.evil.com', 'http://app.ownify.co.kr', 'https://class.ownify.co.kr', 'https://x.onf-app.pages.dev', 'https://app.ownify.co.kr:8443',
    'http://n-abc-script.googleusercontent.com', 'https://googleusercontent.com.evil.example', 'https://evilgoogleusercontent.com', 'null', '', undefined, null]) assert.strictEqual(f(o), false, String(o));
});

t('S5d 다섯 자리 모두 같은 도우미 — googleusercontent 정규식은 도우미 한 곳 · 홈 자물쇠·홈 hist hi·판 자물쇠·판 hist hi·bookHi 가 정적 판 출처를 받는다 · onf-load.js 도', () => {
  assert.strictEqual((CODE.match(/googleusercontent\\\.com/g) || []).length, 1, '⛔ googleusercontent 판정이 도우미 밖에 남았다');
  assert.ok((CODE.match(/isAppOrigin\(/g) || []).length >= 6, '⛔ 도우미를 다섯 자리에서 안 쓴다');
  const ld = fs.readFileSync(path.join(ROOT, 'assets', 'onf-load.js'), 'utf8');
  assert.ok(/isAppOrigin/.test(ld), '⛔ onf-load.js 가 같은 도우미를 안 쓴다');
  const s = setup();
  // 홈 자물쇠(bookHello → caps) · 홈 hist hi
  s.send({ onf: 'bookHello' }, s.homeInner, OUT_O);
  assert.ok(js(s.homeInner.sent).some((x) => x[0].onf === 'caps' && x[1] === OUT_O), '⛔ 홈 자물쇠가 정적 판 출처를 안 받는다');
  s.send({ onf: 'hist', op: 'hi' }, s.homeInner, OUT_O);
  assert.ok(js(s.homeInner.sent).some((x) => x[0].onf === 'hist-on' && x[1] === OUT_O), '⛔ 홈 hist hi 가 정적 판 출처를 안 받는다');
  s.send({ onf: 'hist', op: 'hi' }, s.homeInner, 'http://app.ownify.co.kr');
  assert.strictEqual(js(s.homeInner.sent).filter((x) => x[0].onf === 'hist-on').length, 1, '⛔ http 출처에 hist-on');
  // 판 자물쇠 + bookHi
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'bookHi' }, w, 'https://app.ownify.co.kr.evil.com');
  assert.ok(!s.obj(box).win, '⛔ 비슷한 이름 출처의 bookHi 를 받았다');
  s.send({ onf: 'bookHi' }, w, OUT_O);
  assert.ok(s.obj(box).win === w, '⛔ 판 bookHi 가 정적 판 출처를 안 받는다');
  s.send({ onf: 'bookFull', on: true }, w, OUT_O);
  assert.ok(box.classList.contains('full'), '⛔ 판 자물쇠가 정적 판 출처를 안 받는다');
});

t('S5d 판 hist hi(폰) — 정적 판 출처를 받는다', () => {
  const mq = { matches: false, addEventListener() {} };
  const s = setup({ pre(g, root) { g.matchMedia = () => mq; root.classList = { toggle() {}, contains() { return false; } }; } });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const w = outWin(s, s.panels()[0]);
  s.send({ onf: 'hist', op: 'hi' }, w, OUT_O);
  assert.ok(js(w.sent).some((x) => x[0].onf === 'hist-on' && x[1] === OUT_O), '⛔ 판 hist hi 가 정적 판 출처를 안 받는다');
});

t('S5e 기기 끄기 — mount out:false 면 out:1 이어도 지금 길 · index.html 이 out=0|1 을 onfOut 에 기억하고 out·토큰을 넘긴다', () => {
  const s = setup({ out: false });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  assert.strictEqual(s.panels()[0].kids[0].src, SRC1, '⛔ 끈 기기인데 정적 판으로 갔다');
  const nt = setup({ tok: '' });
  nt.send({ onf: 'openBook', href: E1, out: 1 }, nt.homeInner);
  assert.strictEqual(nt.panels()[0].kids[0].src, SRC1, '⛔ 토큰이 없는데 정적 판으로 갔다');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const line = (/\n\s*(var outOn = q\.get\('out'\);[^\n]*\n[^\n]*catch \(eO\) \{\})/.exec(html) || [])[1];
  assert.ok(line, '⛔ index.html 에 out 스위치 줄이 없다');
  assert.ok(html.indexOf(line) < html.indexOf('ONF.frame.hideToken();'), '⛔ 스위치가 hideToken 뒤다');
  assert.ok(/out: outOn !== '0', tok: token,/.test(html), '⛔ mount 에 out·tok 을 안 넘긴다');
  const run = (qs, m) => { const c = { q: new URLSearchParams(qs), localStorage: LSf(m) }; vm.createContext(c); vm.runInContext(line, c); return [c.outOn !== '0', c.localStorage.m.onfOut]; };
  assert.deepStrictEqual(run('out=0'), [false, '0'], '⛔ out=0 을 기억 안 했다');
  assert.deepStrictEqual(run('', { onfOut: '0' }), [false, '0'], '⛔ 기억한 끔을 안 읽었다');
  assert.deepStrictEqual(run('out=1', { onfOut: '0' }), [true, '1'], '⛔ out=1 로 다시 못 켰다');
  assert.deepStrictEqual(run(''), [true, undefined], '⛔ 기본이 켬이 아니다');
});

const PB = (o) => ({ onfPreBook: JSON.stringify(Object.assign({ k: 'kA', h: E1, ph: 0, t: 1.7e12 }, o || {})) });
t('S5f out:1 교재를 첫 교재로 기억하면 o:1 — bookWarm 뒤 openBook 이든 그 반대든 · 다른 교재의 out:1 은 안 붙는다', () => {
  let ls = LSf();
  let s = setup({ ls, preKey: 'kA' });
  s.send({ onf: 'bookWarm', href: E1, panel: 1 }, s.homeInner);
  assert.strictEqual(JSON.parse(ls.m.onfPreBook).o, undefined, 'out 모를 땐 o 없음(옛 꼴)');
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  assert.strictEqual(JSON.parse(ls.m.onfPreBook).o, undefined, '⛔ 다른 교재의 out:1 이 기억에 붙었다');
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  assert.strictEqual(JSON.parse(ls.m.onfPreBook).o, 1, '⛔ 기억한 교재가 out:1 로 열렸는데 o:1 이 없다');
  ls = LSf();
  s = setup({ ls, preKey: 'kA' });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  s.send({ onf: 'bookWarm', href: E1, panel: 1 }, s.homeInner);
  assert.strictEqual(JSON.parse(ls.m.onfPreBook).o, 1, '⛔ out:1 로 먼저 연 교재를 기억할 때 o:1 이 없다');
});

t('S5f 다음 홈 열기 — o:1 기억이면 정적 판으로 숨긴 판(park · outBoot src 에 park=1) · o 없는 옛 기억·끈 기기·실패한 날은 지금 길', () => {
  const s = setup({ ls: LSf(PB({ o: 1 })), preKey: 'kA' });
  const box = s.panels()[0];
  assert.ok(box && box.classList.contains('park') && box.kids[0].src === OUT_BOOK, '⛔ o:1 기억인데 정적 판 숨긴 판이 아니다: ' + (box && box.kids[0].src));
  const w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w).map((x) => x[0].src), [SRC1 + '&park=1'], '⛔ 숨긴 판 outBoot 에 park=1 이 없다');
  for (const [why, o] of [['옛 기억(o 없음)', { ls: LSf(PB()), preKey: 'kA' }], ['끈 기기', { ls: LSf(PB({ o: 1 })), preKey: 'kA', out: false }],
    ['실패한 날', { ls: LSf(Object.assign(PB({ o: 1 }), { onfOutFail: String(1.7e12 - 1000) })), preKey: 'kA' }]]) {
    const q = setup(o);
    assert.strictEqual(q.panels()[0].kids[0].src, SRC1 + '&park=1', '⛔ ' + why + ' 인데 지금 길이 아니다');
  }
});

t('S5g ⭐ 내 문장·카드 덱 주소는 out:1 이어도 지금 길', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: MINE, out: 1 }, s.homeInner);
  assert.strictEqual(s.panels().slice(-1)[0].kids[0].src, SRCM, '⛔ 내 문장이 정적 판으로 갔다');
  s.send({ onf: 'openBook', href: CARDS, out: 1 }, s.homeInner);
  assert.strictEqual(s.panels().slice(-1)[0].kids[0].src, SRCC, '⛔ 카드 덱이 정적 판으로 갔다');
});

console.log('[🌤 검토 고침 1차 — 켠 교재만 · 판 섞지 않기]');
/* 판 노크 — 첫 노크 뒤 swap:1 노크(정적 판도 지금 교재와 같은 말) */
function knock(s, box, origin, views) { const w = box.kids[0].contentWindow; s.send({ onf: 'bookHi', views: views || 'line' }, w, origin); s.send({ onf: 'bookHi', views: views || 'line', swap: 1 }, w, origin); w.sent.length = 0; return w; }
const execWin = (s, box) => { const bw = win('book-exec', s.top), bi = win('book-user', bw); box.kids[0].contentWindow = bw; return bi; };
const shown = (s) => s.panels().filter((p) => !p.classList.contains('park'));
const sentOf = (w, k) => js(w.sent).filter((x) => x[0].onf === k);

t('I1 정적 판이 판(board)이 돼도 안 켠 교재(out 없음)를 그 판에 갈아 끼우지 않는다 — 새 지금 길 판', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  knock(s, box, OUT_O);
  s.send({ onf: 'openBook', href: E2 }, s.homeInner);
  assert.strictEqual(sentOf(w, 'bookSwap').length, 0, '⛔ 안 켠 교재를 정적 판에 갈아 끼웠다');
  assert.strictEqual(shown(s)[0].kids[0].src, SRC2, '⛔ 안 켠 교재가 지금 길 새 판으로 안 떴다');
});

t('I1 지금 길 판(board)에 켠 교재(out:1)를 갈아 끼우지 않는다 — 새 정적 판', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const box = s.panels()[0], bi = execWin(s, box);
  knock(s, box, GO);
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  assert.strictEqual(sentOf(bi, 'bookSwap').length, 0, '⛔ 켠 교재를 지금 길 판에 갈아 끼웠다');
  assert.strictEqual(shown(s)[0].kids[0].src, OUT_BOOK, '⛔ 켠 교재가 정적 판으로 안 떴다');
});

t('I1 카드 덱(view=cards)은 정적 판에 「열어」(bookLike)를 안 보낸다 — 지금 길 새 판', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  knock(s, box, OUT_O, 'cards,line');
  for (const o of [{}, { out: 1 }]) {
    s.send(Object.assign({ onf: 'openBook', href: CARDS }, o), s.homeInner);
    assert.strictEqual(sentOf(w, 'bookView').length + sentOf(w, 'bookSwap').length, 0, '⛔ 카드 덱을 정적 판에 보냈다 ' + JSON.stringify(o));
    assert.strictEqual(shown(s)[0].kids[0].src, SRCC, '⛔ 카드 덱이 지금 길 판으로 안 떴다');
  }
});

t('I1 노크 전 정적 판 후보 뒤에 미리(bookWarm) 주소를 줄 세우지 않는다 — 정적 판에 bookFetch 안 감 · 지금 길 숨긴 판으로 미리', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'bookWarm', href: E2, panel: 1 }, s.homeInner);
  knock(s, box, OUT_O);
  s.send({ onf: 'bookHi', views: 'line', swap: 1 }, w, OUT_O);
  assert.strictEqual(sentOf(w, 'bookFetch').length, 0, '⛔ 안 켠 미리 주소를 정적 판에 bookFetch 했다');
  assert.ok(s.panels().some((p) => p.kids[0].src === SRC2 + '&park=1'), '⛔ 미리 주소를 지금 길 숨긴 판으로 안 띄웠다');
});

t('I2 서버 스위치가 꺼진 뒤 — 낡은 o:1 기억으로 띄운 정적 숨긴 판을 out 없는 누름이 쓰지 않는다(자격 내리고 지금 길 새 판)', () => {
  const s = setup({ ls: LSf(PB({ o: 1 })), preKey: 'kA' });
  const old = s.panels()[0];
  assert.strictEqual(old.kids[0].src, OUT_BOOK, '대역: 정적 숨긴 판');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const v = shown(s);
  assert.ok(v.length === 1 && v[0] !== old && v[0].kids[0].src === SRC1, '⛔ out 없는 누름이 정적 판을 그대로 보였다');
  assert.ok(!s.panels().includes(old) || s.obj(old).gone, '⛔ 낡은 정적 판이 주소로 또 찾힌다');
});

t('I3 hello 뒤 outFail — 판 창·출처·views·swap·기록 다리를 비운다(새 판처럼) · 다음 열기가 죽은 창에 갈아 끼우지 않는다', () => {
  const s = setup({ swap: true, ls: LSf() });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  knock(s, box, OUT_O, 'cards,line');
  s.send({ onf: 'outFail', why: 'api' }, w, OUT_O);
  const p = s.obj(box);
  assert.ok(p.win === null && p.origin === '' && p.views.length === 0 && p.swap === false && p.hw === null && p.kb === null, '⛔ 물러난 판에 정적 판 창이 남았다');
  s.send({ onf: 'openBook', href: E2 }, s.homeInner);
  assert.strictEqual(sentOf(w, 'bookSwap').length, 0, '⛔ 물러난 판(죽은 정적 창)에 갈아 끼우기를 보냈다');
});

t('minor 저장소가 막힌 창(localStorage 던짐) — 실패를 못 기억하니 정적 판을 안 쓴다', () => {
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const s = setup({ ls: bad });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  assert.strictEqual(s.panels()[0].kids[0].src, SRC1, '⛔ 저장소가 막혔는데 정적 판으로 갔다');
});

console.log('\n통과 ' + pass + ' / 실패 ' + fail);
process.exit(fail ? 1 : 0);
