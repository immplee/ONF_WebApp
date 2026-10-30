/* 🌤 밖으로 1(2026-10-24) — 홈이 out:1 로 연 교재만 구글 밖 정적 판(ONF_OUT_BOOK)에 띄우고 토큰·사본 힌트는 postMessage 로 넘긴다.
   안 뜨면(OUT_MS 안 outHello 없음 · outFail) 같은 판에 지금 길(exec) · 그날은 그 기기에서 지금 길(onfOutFail) · 기기 끄기 out=0(onfOut).
   잰다: S5a 지금 길 무변 · S5b 정적 판 + outBoot 한 번 · S5c 물러남·까닭별 기억(FB1~3 공용 함수 onf-frame.js fallBack) · S5d 출처 도우미 하나 · S5e 기기 끄기 · S5f 첫 교재 기억 o:1 · S5g 내 문장·카드 덱은 지금 길
   밖으로 2 Task 4: S4a 링크 직행 + /who cf → 첫 판 정적 판 · S4b 늦음·실패 → 지금 길 · S4c 토큰은 몸통만 · S4d 홈은 안 물음 · S4e slug · S4f 안 묻는 때
   밖으로 3 Task 6: S6a 켠 학생 홈 /home/get + 정적 홈 · S6b 답 없음 → 지금 길 · S6c 토큰은 몸통만 · S6d 정적 홈 실패 → 지금 길 + onfOutFailHome · S6f 미리 받기 무변
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
const BLK = String(1.7e12 + 3600000) + ',3';   // 🔁 물러남 기억에 막힌 기기(한 시간 뒤까지 · 연속 3) — onf-frame.js fallBlocked 꼴 '<그때까지>,<연속>'
const held = (m, k) => Number(String(m[k] || '').split(',')[0]) > 1.7e12 + 60000;   // 🔁 10분 넘게 막혔다(hard 하루·연속 2 이상) — 연속 1(slow 이번만)은 거짓
const LSf = (init) => { const m = Object.assign({}, init || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };

const E1 = 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', E2 = 'https://class.ownify.co.kr/a-s1-e2-b?mode=share';
const MINE = 'https://class.ownify.co.kr/?mode=mine&v=1', CARDS = 'https://class.ownify.co.kr/a-s1-e1-b?mode=share&view=cards';
const SRC1 = 'https://script.google.com/x/exec?t=T&mode=share&slug=a-s1-e1-b&embed=1', SRC2 = 'https://script.google.com/x/exec?t=T&mode=share&slug=a-s1-e2-b&embed=1';   // index.html bookSrc 꼴(slug = 드라마-시즌-회차-이름)
const SRCM = 'https://script.google.com/x/exec?t=T&mode=mine&embed=1', SRCC = 'https://script.google.com/x/exec?t=T&mode=share&view=cards&embed=1';
const B2 = 'https://class.ownify.co.kr/b-s1-e1-b?mode=share', SRCB2 = 'https://script.google.com/x/exec?t=T&mode=share&slug=b-s1-e1-b&embed=1';   // 둘째 교재(안 켬)
const B2N = 'https://class.ownify.co.kr/b-s1-e2-b?mode=share', SRCB2N = 'https://script.google.com/x/exec?t=T&mode=share&slug=b-s1-e2-b&embed=1';   // 둘째 교재 다음 회차
const SRCMR = 'https://script.google.com/x/exec?t=T&mode=mine&view=review&embed=1', SRCMT = 'https://script.google.com/x/exec?t=T&mode=mine&ttok=X&embed=1';   // 🌤 4-② 내 문장 복습 · 선생님 보기(ttok — 진짜 bookSrc 는 떼지만 껍데기가 한 번 더)
const BS = (h) => (/view=cards/.test(h) ? SRCC : /mode=mine/.test(h) ? (/ttok=/.test(h) ? SRCMT : /view=review/.test(h) ? SRCMR : SRCM) : /a-s1-e2-b/.test(h) ? SRC2 : /b-s1-e1-b/.test(h) ? SRCB2 : /b-s1-e2-b/.test(h) ? SRCB2N : /mode=share/.test(h) ? SRC1 : null);
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
  const frameEl = { contentWindow: homeWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), addEventListener() {},
    get src() { return this._src || ''; }, set src(v) { this._src = v; if (o.log) o.log.push('frame:' + v); } };
  if (o.log) { const ap = body.appendChild; body.appendChild = function (c) { o.log.push('panel'); return ap.call(this, c); }; }
  const M = g.ONF.frame.mount(frameEl, o.src || 'https://script.google.com/x/exec?t=T', { phone: o.phone !== false, swap: o.swap, preKey: o.preKey, bookSrc: o.bs || BS,
    out: o.out !== false, tok: o.tok === undefined ? 'TOK' : o.tok, hooks: o.hooks, home: o.home });
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
  assert.deepStrictEqual(boots(w), [[{ onf: 'outBoot', tok: 'TOK', src: SRC1, cf: CF }, OUT_O]], '⛔ outBoot 이 없거나 두 번이거나 꼴·출처가 다르다');   // 두 번째 hello(다시 읽힌 판)는 아래 R6
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

t('S5c OUT_MS 안 outHello 없음 → 같은 판에 exec 로 다시 · 시한(slow)은 이번만 — 연속 1 = 0 · 2 = 10분 · 3 = 1시간 · 4~ = 하루 · hello 오면 연속 0 · 옛 꼴(실패 시각 하나)은 곧 다시', () => {
  const ls = LSf();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  outWin(s, box);
  s.fire(2500);
  assert.ok(s.panels().length === 1 && s.panels()[0] === box, '⛔ 물러날 때 판을 새로 만들었다');
  assert.strictEqual(box.kids[0].src, SRC1, '⛔ 같은 판에 exec 로 다시 안 열었다');
  assert.strictEqual(ls.m.onfOutFail, '0,1', '⛔ 첫 시한 — 연속 1 · 막는 시간 0 이 아니다');
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  const b2 = s.panels().slice(-1)[0];
  assert.strictEqual(b2.kids[0].src, OUT_BOOK, '⛔ 시한 한 번에 다음 out:1 까지 지금 길로 묶었다(하루 기억 되살아남)');
  outWin(s, b2); s.fire(2500);
  assert.strictEqual(ls.m.onfOutFail, String(1.7e12 + 600000) + ',2', '⛔ 연속 2 — 10분이 아니다');
  for (const [n, ms] of [[2, 3600000], [3, 86400000], [9, 86400000]]) {
    const l = LSf({ onfOutFail: '1,' + n }), x = setup({ ls: l });
    x.send({ onf: 'openBook', href: E1, out: 1 }, x.homeInner);
    outWin(x, x.panels()[0]); x.fire(2500);
    assert.strictEqual(l.m.onfOutFail, String(1.7e12 + ms) + ',' + (n + 1), '⛔ 연속 ' + (n + 1) + ' — 막는 시간이 다르다');
  }
  const blk = setup({ ls: LSf({ onfOutFail: String(1.7e12 + 600000) + ',2' }) });
  blk.send({ onf: 'openBook', href: E1, out: 1 }, blk.homeInner);
  assert.strictEqual(blk.panels()[0].kids[0].src, SRC1, '⛔ 막힌 동안 out:1 이 또 정적 판으로 갔다');
  const ok = LSf({ onfOutFail: '1,3' }), o = setup({ ls: ok });
  o.send({ onf: 'openBook', href: E1, out: 1 }, o.homeInner);
  o.send({ onf: 'outHello' }, outWin(o, o.panels()[0]), OUT_O);
  assert.ok(!('onfOutFail' in ok.m), '⛔ hello(성공)인데 연속 물러남이 남았다');
  const n = setup({ ls: LSf({ onfOutFail: String(1.7e12 - 1000) }) });
  n.send({ onf: 'openBook', href: E1, out: 1 }, n.homeInner);
  assert.strictEqual(n.panels()[0].kids[0].src, OUT_BOOK, '⛔ 옛 꼴(실패 시각 하나 · 종전 하루 기억)에 아직 묶였다');
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
  assert.ok(box.kids[0].src === SRC1 && ls.m.onfOutFail === String(1.7e12 + 86400000) + ',1', '⛔ outFail(hard) 로 물러나 하루를 안 적었다');
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
    ['실패한 날', { ls: LSf(Object.assign(PB({ o: 1 }), { onfOutFail: BLK })), preKey: 'kA' }]]) {
    const q = setup(o);
    assert.strictEqual(q.panels()[0].kids[0].src, SRC1 + '&park=1', '⛔ ' + why + ' 인데 지금 길이 아니다');
  }
});

const vis = (s) => s.panels().filter((p) => !p.classList.contains('park'));   // 보이는 판(아래 shown 과 같다 — 그 줄보다 앞이라)
/* 2026-10-24 T7 라이브 F2 — 첫 방문은 늘 지금 길이었다: 홈 bookWarm 이 out 을 안 실어 지금 길 숨긴 판을 띄웠고 out:1 누름이 그 판(bookFind)을 썼다 */
t('S-F2a bookWarm(panel:1, out:1) → 정적 판으로 숨긴 판(park=1) · 기억에 o:1 · 그 뒤 out:1 누름은 그 정적 판을 보인다(새 판 0) · 끈 기기·실패한 날은 지금 길', () => {
  const ls = LSf(), s = setup({ ls, preKey: 'kA' });
  s.send({ onf: 'bookWarm', href: E1, panel: 1, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  assert.ok(box && box.classList.contains('park') && box.kids[0].src === OUT_BOOK, '⛔ out:1 미리 받기가 정적 숨긴 판이 아니다: ' + (box && box.kids[0].src));
  const w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w).map((x) => x[0].src), [SRC1 + '&park=1'], '⛔ 숨긴 정적 판 outBoot 에 park=1');
  assert.strictEqual(JSON.parse(ls.m.onfPreBook).o, 1, '⛔ out:1 미리 받기인데 기억에 o:1 이 없다(다음 방문 preEarly 가 지금 길)');
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  assert.deepStrictEqual([s.panels().length, vis(s)[0]], [1, box], '⛔ out:1 누름이 미리 띄운 정적 판을 안 썼다');
  for (const [why, o] of [['끈 기기', { out: false }], ['실패한 날', { ls: LSf({ onfOutFail: BLK }) }]]) {
    const q = setup(o);
    q.send({ onf: 'bookWarm', href: E1, panel: 1, out: 1 }, q.homeInner);
    assert.strictEqual(q.panels()[0].kids[0].src, SRC1 + '&park=1', '⛔ ' + why + ' 인데 미리 받기가 지금 길이 아니다');
  }
});
t('S-F2b out:1 누름이 찾은 판이 지금 길(exec) 판이면 — 자격 내리고 정적 새 판(out 없는 누름이 정적 판을 내리는 것의 거울) · 끈 기기면 그 판 그대로', () => {
  const s = setup();
  s.send({ onf: 'bookWarm', href: E1, panel: 1 }, s.homeInner);   // 옛 홈 — out 없는 미리 받기
  const old = s.panels()[0];
  assert.strictEqual(old.kids[0].src, SRC1 + '&park=1', '대역: 지금 길 숨긴 판');
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const v = vis(s);
  assert.ok(v.length === 1 && v[0] !== old && v[0].kids[0].src === OUT_BOOK, '⛔ out:1 누름이 지금 길 숨긴 판을 그대로 보였다: ' + (v[0] && v[0].kids[0].src));
  assert.ok(!s.panels().includes(old) || s.obj(old).gone, '⛔ 내린 지금 길 판이 주소로 또 찾힌다');
  const q = setup({ out: false });
  q.send({ onf: 'bookWarm', href: E1, panel: 1 }, q.homeInner);
  const o2 = q.panels()[0];
  q.send({ onf: 'openBook', href: E1, out: 1 }, q.homeInner);
  assert.deepStrictEqual([q.panels().length, vis(q)[0]], [1, o2], '⛔ 끈 기기인데 지금 길 판을 내렸다');
});

/* 검토 고침 1(2026-10-24) — 넓은 화면·판 모드 홈은 [첫 교재, 내 문장, 다음 회차, 둘째 교재] 를 한꺼번에 미리 받는다. 종전엔 첫 교재(지금 길 후보) 뒤에 둘이 줄 서
   판에 값만 받아 뒀다([교재, 내 문장]). 첫 교재가 정적 판이면 줄 설 곳이 없어 지금 길 숨긴 판이 하나 더 뜨고(GAS 한 번 더) 판 셋 넘침이 ⭐ 내 문장을 쫓아냈다(복습 ≈4.4초). */
/* 🌤 밖으로 4-②(2026-10-29) — ⭐ 내 문장(/mine/)·🗂️ 카드 덱(/book/)도 정적 판 · 홈이 out:1 을 실었을 때만(학생별 스위치 · Ownify Task 4) */
const OUT_MINE = (/var OUT_MINE_URL = '([^']+)'/.exec(CODE) || [])[1] || 'OUT_MINE_URL 없음';
t('S5g ⭐ 내 문장 out:1 → 액자 = /mine/ · hello 에 outBoot{src} · out 없음 → 구글 판(종전)', () => {
  assert.strictEqual(OUT_MINE, 'https://app.ownify.co.kr/mine/', '상수 값(브리프)');
  const s = setup();
  s.send({ onf: 'openBook', href: MINE, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  assert.strictEqual(box.kids[0].src, OUT_MINE, '⛔ 켠 내 문장이 /mine/ 이 아니다: ' + box.kids[0].src);
  const w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w), [[{ onf: 'outBoot', tok: 'TOK', src: SRCM, cf: null }, OUT_O]], '⛔ 내 문장 판 outBoot 꼴·출처');
  const q = setup();
  q.send({ onf: 'openBook', href: MINE }, q.homeInner);
  assert.strictEqual(q.panels()[0].kids[0].src, SRCM, '⛔ out 없는 내 문장이 구글 판이 아니다');
});
t('S5g 내 문장 + ttok(선생님 보기) → out:1 이어도 구글 판', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: MINE + '&ttok=X', out: 1 }, s.homeInner);
  assert.strictEqual(s.panels()[0].kids[0].src, SRCMT, '⛔ ttok 내 문장이 정적 판으로 갔다');
});
t('S5g 🗂️ 카드 덱 out:1 → /book/ 정적 판(outBoot src) · out 없음 → 구글 판', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: CARDS, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  assert.strictEqual(box.kids[0].src, OUT_BOOK, '⛔ 켠 카드 덱이 정적 판이 아니다: ' + box.kids[0].src);
  const w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w).map((x) => x[0].src), [SRCC], '⛔ 덱 outBoot src');
  const q = setup();
  q.send({ onf: 'openBook', href: CARDS }, q.homeInner);
  assert.strictEqual(q.panels()[0].kids[0].src, SRCC, '⛔ out 없는 덱이 구글 판이 아니다');
});
t('S5g 덱 정적 판이 hello 뒤 outFail → 같은 판에 구글 exec · onfOutFail 적힘 · 내 문장 판도 같다', () => {
  for (const [h, g] of [[CARDS, SRCC], [MINE, SRCM]]) {
    const ls = LSf(), s = setup({ ls });
    s.send({ onf: 'openBook', href: h, out: 1 }, s.homeInner);
    const box = s.panels()[0], w = outWin(s, box);
    s.send({ onf: 'outHello' }, w, OUT_O);
    s.send({ onf: 'outFail' }, w, OUT_O);
    assert.ok(s.panels().length === 1 && box.kids[0].src === g, '⛔ ' + h + ' — 같은 판에 구글로 안 물러났다: ' + box.kids[0].src);
    assert.strictEqual(ls.m.onfOutFail, String(1.7e12 + 86400000) + ',1', '⛔ ' + h + ' — outFail(hard)인데 하루를 안 적었다');
  }
});
t('S5g 숨긴 내 문장 판(bookWarm panel:1 out:1) → /mine/ + park=1 · 그 판이 review 노크하면 [복습 시작] 누름에 bookView 가 그 판으로(새 판 0)', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'bookWarm', href: MINE, panel: 1, out: 1 }, s.homeInner);
  const box = s.panels()[0];
  assert.ok(box.classList.contains('park') && box.kids[0].src === OUT_MINE, '⛔ 숨긴 내 문장 판이 /mine/ 이 아니다: ' + box.kids[0].src);
  const w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w).map((x) => x[0].src), [SRCM + '&park=1'], '⛔ 숨긴 내 문장 판 outBoot 에 park=1');
  s.send({ onf: 'bookHi', views: 'review' }, w, OUT_O); w.sent.length = 0;
  s.send({ onf: 'openBook', href: MINE + '&view=review', out: 1 }, s.homeInner);
  assert.strictEqual(s.panels().length, 1, '⛔ [복습 시작]이 새 판을 띄웠다');
  assert.deepStrictEqual(js(w.sent), [[{ onf: 'bookPark', on: false }, OUT_O], [{ onf: 'bookView', view: 'review' }, OUT_O]], '⛔ 숨긴 내 문장 판에 bookView 가 안 갔다');
});
console.log('[🌤 검토 고침 1차 — 켠 교재만 · 판 섞지 않기]');
/* 판 노크 — 첫 노크 뒤 swap:1 노크(정적 판도 지금 교재와 같은 말) */
function knock(s, box, origin, views) { const w = box.kids[0].contentWindow; s.send({ onf: 'bookHi', views: views || 'line' }, w, origin); s.send({ onf: 'bookHi', views: views || 'line', swap: 1 }, w, origin); w.sent.length = 0; return w; }
const execWin = (s, box) => { const bw = win('book-exec', s.top), bi = win('book-user', bw); box.kids[0].contentWindow = bw; return bi; };
const shown = (s) => s.panels().filter((p) => !p.classList.contains('park'));
const sentOf = (w, k) => js(w.sent).filter((x) => x[0].onf === k);

/* 둘째 교재 고침(2026-10-24) — 검토 고침 1 은 숨긴 정적 판이 있으면 지금 길 미리 받기를 다 버렸다 → 안 켠 둘째 교재 누름이 지금 길 새 판(≈5초 · 종전 판 갈아 끼우기 1~2초).
   통제자 판정: 지금 길 판(판)은 **안 켠 다른 교재**의 미리 받기만 띄운다 — 켠 교재의 다음 회차는 정적 판이 Worker 사본으로 ≈0.1~0.2초에 바꾸니 미리 받기 = 헛 GAS(홈도 안 보낸다 · Ownify O-F2).
   켠 교재 하나 학생 [정적, 내 문장](GAS 둘 — 종전과 같다) · 둘 학생 [정적, 내 문장, 지금 길 판(둘째 교재)]. 정적 판은 판으로 안 쓴다(I1). */
const srcs = (s) => s.panels().map((p) => p.kids[0].src);
const phonePre = (g, root) => { const mq = { matches: false, addEventListener() {} }; g.matchMedia = () => mq; root.classList = { toggle() {}, contains() { return false; } }; };   // 폰(phone() 참 · 위 S5d 꼴)
const knockEx = (s, box, sw) => { execWin(s, box); const w = box.kids[0].contentWindow; s.send({ onf: 'bookHi', views: 'line' }, w); if (sw) s.send({ onf: 'bookHi', views: 'line', swap: 1 }, w); return w; };
const warmAll = (s, list) => list.forEach(([h, o]) => s.send({ onf: 'bookWarm', href: h, panel: 1, left: 0, out: o }, s.homeInner));
t('S-F2c 켠 교재 하나 학생 — 판 [정적 첫 교재, 내 문장] 둘뿐(지금 길 판 없음) · 옛 홈이 같은 교재 다음 회차를 out 없이 보내도 안 띄운다', () => {
  const s = setup({ swap: true, phone: false });
  warmAll(s, [[E1, 1], [MINE]]);
  assert.deepStrictEqual(srcs(s), [OUT_BOOK, SRCM + '&park=1'], '⛔ 켠 교재 하나 학생 판이 [정적, 내 문장] 이 아니다');
  const o = setup({ swap: true, phone: false });
  warmAll(o, [[E1, 1], [MINE], [E2]]);   // 옛 홈(배포 사이) — 다음 회차를 out 없이
  assert.deepStrictEqual(srcs(o), [OUT_BOOK, SRCM + '&park=1'], '⛔ 켠 교재의 다음 회차로 지금 길 판을 띄웠다(헛 GAS)');
  const k = setup({ swap: true, phone: false });   // 정적 판이 먼저 노크한 뒤(다음 방문 — preEarly) 와도 같다
  warmAll(k, [[E1, 1]]);
  const kb = k.panels()[0], kw = outWin(k, kb);
  k.send({ onf: 'outHello' }, kw, OUT_O); knock(k, kb, OUT_O);
  warmAll(k, [[MINE], [E2]]);
  assert.deepStrictEqual(srcs(k), [OUT_BOOK, SRCM + '&park=1'], '⛔ 노크 뒤 — 다음 회차로 지금 길 판을 띄웠다');
});
t('S-F2d 켠 교재 + 안 켠 둘째 교재 학생 — [정적, 내 문장, 지금 길 판(둘째 교재)] · 둘째 교재 누름 = 그 판(새 판 0) · 둘째 교재 다음 회차 = 갈아 끼움 · 내 문장 안 쫓겨남', () => {
  for (const list of [[[E1, 1], [MINE], [B2]], [[E1, 1], [MINE], [E2], [B2]]]) {   // 새 홈 · 옛 홈(다음 회차도 보냄)
    const s = setup({ swap: true, phone: false });
    warmAll(s, list);
    assert.deepStrictEqual(srcs(s), [OUT_BOOK, SRCM + '&park=1', SRCB2 + '&park=1'], '⛔ 판이 [정적, 내 문장, 지금 길 판(둘째 교재)] 이 아니다: ' + list.length);
    const [sb, mb, eb] = s.panels(), w = outWin(s, sb);
    s.send({ onf: 'outHello' }, w, OUT_O); knock(s, sb, OUT_O);
    execWin(s, eb);
    const ew = eb.kids[0].contentWindow;
    s.send({ onf: 'bookHi', views: 'line' }, ew); s.send({ onf: 'bookHi', views: 'line', swap: 1 }, ew);
    assert.strictEqual(sentOf(w, 'bookFetch').length, 0, '⛔ 정적 판에 bookFetch');
    s.send({ onf: 'openBook', href: E1, left: 0, out: 1 }, s.homeInner);   // 첫 교재(정적 판)를 보다가
    s.send({ onf: 'openBook', href: B2, left: 0 }, s.homeInner);
    assert.deepStrictEqual([s.panels().length, shown(s)[0] === eb, s.panels().includes(mb)], [3, true, true], '⛔ 둘째 교재 누름이 지금 길 판이 아니거나 내 문장이 쫓겨났다');
    s.send({ onf: 'openBook', href: B2N, left: 0 }, s.homeInner);
    assert.deepStrictEqual(sentOf(ew, 'bookSwap').map((x) => x[0].src), [SRCB2N], '⛔ 둘째 교재 다음 회차가 판 갈아 끼우기가 아니다');
    assert.deepStrictEqual([s.panels().length, s.panels().includes(mb)], [3, true], '⛔ 새 판이 생겼거나 내 문장이 쫓겨났다');
    s.fire(30 * 60 * 1000);   // 숨긴 채 30분 — 정적 첫 교재 판도 하루 판(종전 판처럼 안 지운다)
    assert.ok(s.panels().includes(sb), '⛔ 30분 지우기가 정적 첫 교재 판을 지웠다');
  }
  //   첫 교재가 지금 길이면 종전 그대로(다음 회차·둘째 교재는 첫 교재 뒤 줄 — 판 둘)
  const o = setup({ swap: true, phone: false });
  warmAll(o, [[E1], [MINE], [E2], [B2]]);
  assert.deepStrictEqual(srcs(o), [SRC1 + '&park=1', SRCM + '&park=1'], '종전 — 지금 길 첫 교재 뒤 줄');
  //   폰(홈은 첫 교재 하나만 미리 보낸다) — 정적 숨긴 판 하나 그대로
  const f = setup({ swap: true, pre: phonePre });
  warmAll(f, [[E1, 1]]);
  assert.deepStrictEqual(srcs(f), [OUT_BOOK], '폰 — 정적 숨긴 판 하나');
});
t('S-F2e 넷째 판 — 정적 판이 있는 넓은 화면은 ⭐ 내 문장 판을 안 지운다 · 가장 오래 안 쓴 숨긴 다른 판을 지운다(보이는 판은 그대로)', () => {
  const s = setup({ swap: true, phone: false });
  warmAll(s, [[E1, 1], [MINE], [B2]]);
  const [sb, mb, eb] = s.panels(), w = outWin(s, sb);
  s.send({ onf: 'outHello' }, w, OUT_O); knock(s, sb, OUT_O);
  knockEx(s, eb, 1);
  s.send({ onf: 'openBook', href: E1, left: 0, out: 1 }, s.homeInner);   // 정적 판을 보인다 → 내 문장이 가장 오래 안 쓴 판
  s.send({ onf: 'openBook', href: E2, left: 0, out: 1 }, s.homeInner);   // 미리 안 받은 다음 회차(out:1) → 정적 새 판 = 넷째
  assert.strictEqual(shown(s)[0].kids[0].src, OUT_BOOK, '대역: 다음 회차가 정적 새 판');
  assert.deepStrictEqual([s.panels().length, s.panels().includes(mb), s.panels().includes(eb), s.panels().includes(sb)], [3, true, true, false], '⛔ 넷째 판 자리 — 내 문장을 지웠거나 엉뚱한 판을 지웠다');
});
t('S-F2f 자리 — 내 문장 말고 지울 숨긴 판이 없으면(판·후보뿐) 내 문장을 지운다 · 판 수는 넘지 않는다', () => {
  const s = setup({ swap: true, phone: false });
  warmAll(s, [[E1, 1], [MINE], [B2]]);   // 정적 판은 노크 전(후보 — 안 지운다)
  const [sb, mb, eb] = s.panels();
  knockEx(s, eb, 1);   // 지금 길 판(판 — 안 지운다)
  s.send({ onf: 'openBook', href: MINE, left: 0 }, s.homeInner);
  const mw = knockEx(s, mb);
  s.send({ onf: 'openBook', href: B2N }, mw);   // 내 문장 판 안 링크(홈 아님) → 새 판 = 넷째
  assert.deepStrictEqual([s.panels().length, s.panels().includes(mb), s.panels().includes(sb), s.panels().includes(eb)], [3, false, true, true], '⛔ 판 수를 넘었거나 엉뚱한 판을 지웠다: ' + s.panels().length);
});
t('S-F2g 정적 판 없는 학생은 종전 그대로(가장 오래 안 쓴 숨긴 판 — 내 문장이어도) · 폰은 정적 판이 있어도 판 자리 2 를 안 넘는다', () => {
  const o = setup({ phone: false });   // 넓은 화면 · 판 모드 아님
  o.send({ onf: 'openBook', href: MINE, left: 0 }, o.homeInner);
  const om = o.panels()[0];
  knockEx(o, om);   // 노크한 판만 숨길 수 있다(대기를 모르는 판은 지운다)
  for (const h of [E1, E2, B2]) { o.send({ onf: 'openBook', href: h, left: 0 }, o.homeInner); knockEx(o, shown(o)[0]); }
  assert.deepStrictEqual([o.panels().length, o.panels().includes(om), shown(o)[0].kids[0].src], [3, false, SRCB2], '⛔ 정적 판 없는 학생 — 종전(가장 오래 안 쓴 내 문장 판을 비킴)과 다르다');
  for (const out of [false, true]) {   // 폰 · 판 모드 — 안 켠 학생(검토 재현) · 켠 학생
    const s = setup({ swap: true, out, pre: phonePre });
    s.send({ onf: 'bookWarm', href: E1, panel: 1, out: out ? 1 : undefined }, s.homeInner);
    const bb = s.panels()[0];
    if (out) { const w = outWin(s, bb); s.send({ onf: 'outHello' }, w, OUT_O); knock(s, bb, OUT_O); } else knockEx(s, bb, 1);
    s.send({ onf: 'openBook', href: MINE }, s.homeInner);
    const mw = knockEx(s, shown(s)[0]);
    s.send({ onf: 'openBook', href: B2 }, mw);   // ⭐ → 「교재에서 보기」 같은 판 안 링크
    assert.strictEqual(s.panels().length, 2, '⛔ 폰 판 자리 2 를 넘었다(' + (out ? '켠' : '안 켠') + ' 학생): ' + s.panels().length);
    assert.ok(s.panels().includes(bb), '⛔ 폰 — 첫 교재 판을 지웠다');
  }
});

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
  knock(s, box, OUT_O);   // 실제 정적 /book/ 은 views 'line' 만 노크한다(ONF_PARK.on 이 DOMContentLoaded 뒤)
  s.send({ onf: 'openBook', href: CARDS }, s.homeInner);   // 🌤 4-② — out 없는 덱만 지금 길(out:1 덱은 위 S5g 정적 판)
  assert.strictEqual(sentOf(w, 'bookView').length + sentOf(w, 'bookSwap').length, 0, '⛔ out 없는 카드 덱을 정적 판에 보냈다');
  assert.strictEqual(shown(s)[0].kids[0].src, SRCC, '⛔ 카드 덱이 지금 길 판으로 안 떴다');
});

const SRCC0 = SRCC.replace('&view=cards', ''), BSC = (h) => (/plain-base/.test(h) ? SRCC0 : BS(h)), PLAIN = 'https://class.ownify.co.kr/plain-base?mode=share';   // 덱과 같은 교재 주소(view 만 다름) — bookLike 의 base 비교를 통과시키는 대역
t('I1b 최종 검토 — 실제 노크 views "line" 인 정적 판에 out:1 덱 → 새 정적 /book/ 판 · 기존 판에 bookView 없음', () => {
  const s = setup({ swap: true, bs: BSC });
  s.send({ onf: 'openBook', href: PLAIN, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  knock(s, box, OUT_O, 'line');
  s.send({ onf: 'openBook', href: CARDS, out: 1 }, s.homeInner);
  assert.strictEqual(sentOf(w, 'bookView').length, 0, '⛔ 기존 정적 판에 덱 bookView 를 보냈다');
  assert.strictEqual(s.panels().length, 2, '⛔ 새 판이 안 떴다');
  assert.strictEqual(shown(s)[0].kids[0].src, OUT_BOOK, '⛔ 덱이 새 정적 /book/ 판이 아니다');
});
t('I1b 방어 — 정적 판이 "cards,line" 을 노크해도 out:1 덱은 새 판(bookCan 이 p.out 에 cards 를 안 맡긴다)', () => {
  const s = setup({ swap: true, bs: BSC });
  s.send({ onf: 'openBook', href: PLAIN, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  knock(s, box, OUT_O, 'cards,line');
  s.send({ onf: 'openBook', href: CARDS, out: 1 }, s.homeInner);
  assert.strictEqual(sentOf(w, 'bookView').length, 0, '⛔ cards 를 광고한 정적 판에 덱 bookView 를 보냈다');
  assert.strictEqual(s.panels().length, 2, '⛔ 새 판이 안 떴다');
  assert.strictEqual(shown(s)[0].kids[0].src, OUT_BOOK, '⛔ 덱이 새 정적 /book/ 판이 아니다');
});

t('I1 노크 전 정적 판 후보 뒤에 미리(bookWarm) 주소를 줄 세우지 않는다 — 정적 판에 bookFetch 안 감 · 지금 길 숨긴 판으로 미리', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'bookWarm', href: B2, panel: 1 }, s.homeInner);
  knock(s, box, OUT_O);
  s.send({ onf: 'bookHi', views: 'line', swap: 1 }, w, OUT_O);
  assert.strictEqual(sentOf(w, 'bookFetch').length, 0, '⛔ 안 켠 미리 주소를 정적 판에 bookFetch 했다');
  assert.ok(s.panels().some((p) => p.kids[0].src === SRCB2 + '&park=1'), '⛔ 미리 주소를 지금 길 숨긴 판으로 안 띄웠다');
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

console.log('[🌤 Task 6 — 다시 읽힌 판 · 남은 쓰기 넘겨주기]');

t('R6 다시 읽힌 정적 판(2시간 다시 읽기·「다시 열기」)의 outHello 마다 outBoot 다시 — 같은 값 · 그 창·그 출처만(남의 창·출처 hello 엔 안 보냄)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1, out: 1, cf: CF }, s.homeInner);
  const w = outWin(s, s.panels()[0]);
  s.send({ onf: 'outHello' }, w, OUT_O);
  s.send({ onf: 'outHello' }, w, OUT_O);
  s.send({ onf: 'outHello' }, win('stranger', s.top), OUT_O);
  s.send({ onf: 'outHello' }, w, 'https://evil.example.com');
  const one = [{ onf: 'outBoot', tok: 'TOK', src: SRC1, cf: CF }, OUT_O];
  assert.deepStrictEqual(boots(w), [one, one], '⛔ 다시 읽힌 판의 hello 에 outBoot 을 다시 안 보냈다(판이 4초 뒤 outFail → 지금 길): ' + JSON.stringify(boots(w)));
});

/* 남은 쓰기 넘겨주기 — 숨긴 정적 판(books 밖) = 주소가 정적 판이고 park 인 판 */
const DAY = 86400000;
const flushes = (s) => s.panels().filter((p) => p.kids[0].src === OUT_BOOK && p.classList.contains('park') && !s.obj(p));   // books 밖만(숨겨진 진짜 정적 판은 빼고)
const PK1 = 'onfOutPending:' + SRC1, PK2 = 'onfOutPending:' + SRC2;   // 교재(회차) 주소마다 — 넘겨주기가 회차 하나씩이라
const USED = (o) => LSf(Object.assign({ onfOutUsed: String(1.7e12 - 13 * DAY), [PK1]: '1', [PK2]: '1' }, o || {}));
/* 보이는 판이 다 떴다(첫 노크) → 한가할 때(시험엔 rIC 가 없어 setTimeout 0) — 넘겨주기는 그 뒤에만 */
function settle(s) { const v = shown(s)[0]; if (v && v.kids[0].contentWindow == null) execWin(s, v); if (v) s.send({ onf: 'bookHi', views: 'line' }, v.kids[0].contentWindow, GO); s.fire(0); }
t('S6a onfOutUsed(14일 안)·onfOutPending 있고 out 없는 교재 열기 → 보이는 판이 뜬 뒤 정적 숨긴 판 하나(outBoot src park=1 · cf 없음) · outFlushed(그 창·그 출처) 받으면 닫힘 · 남의 말엔 안 닫힘', () => {
  const ls = USED();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, cf: CF }, s.homeInner);
  assert.strictEqual(shown(s)[0].kids[0].src, SRC1, '⛔ 보이는 판이 지금 길이 아니다');
  settle(s);
  const f = flushes(s);
  assert.strictEqual(f.length, 1, '⛔ 남은 쓰기 넘겨줄 숨긴 정적 판이 하나가 아니다: ' + f.length);
  const w = outWin(s, f[0]);
  s.send({ onf: 'outHello' }, w, OUT_O);
  assert.deepStrictEqual(boots(w), [[{ onf: 'outBoot', tok: 'TOK', src: SRC1 + '&park=1', cf: null }, OUT_O]], '⛔ 숨긴 판 outBoot 꼴: ' + JSON.stringify(boots(w)));
  s.send({ onf: 'outFlushed', n: 2 }, win('stranger', s.top), OUT_O);
  s.send({ onf: 'outFlushed', n: 2 }, w, 'https://evil.example.com');
  assert.strictEqual(flushes(s).length, 1, '⛔ 남의 outFlushed 로 닫혔다');
  s.send({ onf: 'outFlushed', n: 2 }, w, OUT_O);
  assert.strictEqual(flushes(s).length, 0, '⛔ outFlushed 를 받았는데 안 닫혔다');
  assert.ok(!(PK1 in ls.m), '⛔ outFlushed 뒤에도 그 교재 onfOutPending 이 남았다');
  assert.strictEqual(ls.m[PK2], '1', '⛔ E1 을 넘겨줬는데 E2 의 남은 쓰기 표시까지 지웠다');
  assert.strictEqual(shown(s)[0].kids[0].src, SRC1, '⛔ 보이던 판이 사라졌다');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner); settle(s);
  s.send({ onf: 'openBook', href: E2 }, s.homeInner); settle(s);
  assert.strictEqual(flushes(s).length, 1, '⛔ 한 화면에 같은 교재를 또 넘겨주거나 다른 교재(E2)를 안 넘겨줬다');
});

t('S6a onfOutUsed 없음·14일 넘음·onfOutPending 없음·끈 기기·실패한 날·토큰 없음·켠 교재(out:1)·내 문장 → 넘겨줄 판 안 생김', () => {
  for (const [why, o, msg] of [['없음', {}], ['14일 넘음', { ls: USED({ onfOutUsed: String(1.7e12 - 14 * DAY - 1) }) }],
    ['남은 쓰기 없음', { ls: LSf({ onfOutUsed: String(1.7e12) }) }], ['옛 전역 표시만', { ls: LSf({ onfOutUsed: String(1.7e12), onfOutPending: '1' }) }],
    ['다른 교재만 남음', { ls: LSf({ onfOutUsed: String(1.7e12), [PK2]: '1' }) }],
    ['끈 기기', { out: false, ls: USED() }], ['실패한 날', { ls: USED({ onfOutFail: BLK }) }],
    ['토큰 없음', { tok: '', ls: USED() }], ['켠 교재', { ls: USED() }, { out: 1 }], ['내 문장', { ls: USED() }, { href: MINE }]]) {
    const s = setup(o);
    s.send(Object.assign({ onf: 'openBook', href: E1 }, msg || {}), s.homeInner);
    settle(s); s.fire(15000);
    assert.ok(s.panels().every((p) => !p.classList.contains('park')), '⛔ ' + why + ' 인데 숨긴 판이 생겼다');
  }
});

t('S5g 넘겨주기(bookFlush)는 내 문장 주소를 안 다룬다 — 내 문장 회차 표시가 남아도 숨긴 판(/book/·/mine/) 0', () => {
  const s = setup({ ls: USED({ ['onfOutPending:' + SRCM]: '1' }) });
  s.send({ onf: 'openBook', href: MINE }, s.homeInner);
  settle(s); s.fire(15000);
  assert.ok(s.panels().every((p) => !p.classList.contains('park')), '⛔ 내 문장 주소로 넘겨주기 판을 띄웠다: ' + s.panels().map((p) => p.kids[0].src).join(' '));
});

t('S6a 정적 판을 띄우면 onfOutUsed 를 적는다 · 넘겨줄 판이 안 뜨면(OUT_MS)·outFail·60초 상한이면 닫고 하루 실패(onfOutFail)는 안 적는다', () => {
  const ls = LSf();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  assert.strictEqual(ls.m.onfOutUsed, String(1.7e12), '⛔ 정적 판을 띄웠는데 onfOutUsed 를 안 적었다');
  for (const how of ['hello 없음', 'outFail', '상한']) {
    const l2 = USED(), q = setup({ ls: l2 });
    q.send({ onf: 'openBook', href: E1 }, q.homeInner); settle(q);
    const w = outWin(q, flushes(q)[0]);
    if (how === 'hello 없음') q.fire(2500);
    else if (how === 'outFail') { q.send({ onf: 'outHello' }, w, OUT_O); q.send({ onf: 'outFail', why: 'bridge' }, w, OUT_O); }
    else { q.send({ onf: 'outHello' }, w, OUT_O); q.fire(60000); }
    assert.strictEqual(flushes(q).length, 0, '⛔ ' + how + ' — 넘겨줄 판이 안 닫혔다');
    assert.ok(!l2.m.onfOutFail, '⛔ ' + how + ' — 넘겨주기 실패로 그날 정적 판을 껐다');
    assert.strictEqual(q.panels()[0].kids[0].src, SRC1, '⛔ ' + how + ' — 보이는 판이 바뀌었다');
  }
});

console.log('[🌤 Task 6 검토 고침 1차]');
t('F1 살아 있는 정적 판(자격 내린 판 포함)이 있으면 넘겨주기를 안 띄운다 — 같은 기기 대기열을 두 판이 보내지 않게', () => {
  const s = setup({ ls: USED() });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const sp = s.panels()[0], w = outWin(s, sp);
  s.send({ onf: 'outHello' }, w, OUT_O);
  knock(s, sp, OUT_O);
  s.send({ onf: 'openBook', href: E2 }, w, OUT_O);   // 판 안에서 연 교재(out 없음)
  settle(s); s.fire(15000);
  assert.strictEqual(flushes(s).length, 0, '⛔ 정적 판이 살아 있는데 넘겨주기 판을 또 띄웠다');
  //   서버 스위치를 끈 뒤 같은 교재 — 정적 판은 자격만 내려가고(gone) 액자는 산다
  const q = setup({ ls: USED() });
  q.send({ onf: 'openBook', href: E1, out: 1 }, q.homeInner);
  const qp = q.panels()[0], qw = outWin(q, qp);
  q.send({ onf: 'outHello' }, qw, OUT_O); knock(q, qp, OUT_O);
  q.send({ onf: 'openBook', href: E1 }, q.homeInner);
  assert.ok(q.obj(qp).gone, '준비: 정적 판 자격 내림');
  settle(q); q.fire(15000);
  assert.strictEqual(flushes(q).length, 0, '⛔ 자격 내린 정적 판의 액자가 사는데 넘겨주기 판을 띄웠다');
});

t('F2a 정적 판의 outQueue{n} — n>0 이면 onfOutPending=1 · 0 이면 지움 · 판 안 정적 판 출처만(구글 출처·남의 창·남의 출처는 버림) · 넘겨줄 판의 outQueue 도', () => {
  const ls = LSf();
  const s = setup({ ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const w = outWin(s, s.panels()[0]);
  s.send({ onf: 'outQueue', n: 2 }, win('stranger', s.top), OUT_O);
  s.send({ onf: 'outQueue', n: 2 }, w, 'https://evil.example.com');
  s.send({ onf: 'outQueue', n: 2 }, w, GO);
  assert.ok(!Object.keys(ls.m).some((k) => /^onfOutPending/.test(k)), '⛔ 남의 창·출처 outQueue 를 받았다');
  s.send({ onf: 'outQueue', n: 2 }, w, OUT_O);
  assert.strictEqual(ls.m[PK1], '1', '⛔ n>0 인데 그 교재 onfOutPending 을 안 적었다');
  assert.ok(!('onfOutPending' in ls.m), '⛔ 옛 전역 표시를 적었다');
  s.send({ onf: 'outQueue', n: 0 }, w, OUT_O);
  assert.ok(!(PK1 in ls.m), '⛔ n 0 인데 onfOutPending 을 안 지웠다');
  const l2 = USED(), q = setup({ ls: l2 });
  q.send({ onf: 'openBook', href: E1 }, q.homeInner); settle(q);
  const fw = outWin(q, flushes(q)[0]);
  q.send({ onf: 'outQueue', n: 0 }, fw, OUT_O);
  assert.ok(!(PK1 in l2.m) && l2.m[PK2] === '1', '⛔ 넘겨줄 판의 outQueue 0 이 제 교재 표시만 지우지 않았다: ' + JSON.stringify(l2.m));
});

t('F2b 넘겨주기는 보이는 판을 띄운 그 박자에 안 뜬다 — 보이는 판 첫 노크 뒤 한가할 때 · 노크가 없으면 15초 상한 뒤', () => {
  const s = setup({ ls: USED() });
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.strictEqual(flushes(s).length, 0, '⛔ 보이는 판과 같은 박자에 넘겨줄 판을 띄웠다(1.9MB + 다리가 보이는 판과 겨룬다)');
  s.fire(0);
  assert.strictEqual(flushes(s).length, 0, '⛔ 보이는 판 노크 전에 띄웠다');
  settle(s);
  assert.strictEqual(flushes(s).length, 1, '⛔ 보이는 판이 뜬 뒤에도 안 띄웠다');
  const q = setup({ ls: USED() });
  q.send({ onf: 'openBook', href: E1 }, q.homeInner);
  q.fire(15000); q.fire(0);
  assert.strictEqual(flushes(q).length, 1, '⛔ 노크가 없을 때 상한 뒤에도 안 띄웠다');
});

console.log('[🌤 Task 6 검토 고침 2차]');
t('G1 회차 A·B 둘 다 남음 — A 를 지금 길로 열어 넘겨주고 outFlushed 받아도 B 표시는 남는다 → B 를 열면 B 넘겨주기', () => {
  const ls = USED(), s = setup({ ls });
  s.send({ onf: 'openBook', href: E1 }, s.homeInner); settle(s);
  const w = outWin(s, flushes(s)[0]);
  s.send({ onf: 'outHello' }, w, OUT_O); s.send({ onf: 'outFlushed', n: 1 }, w, OUT_O);
  assert.ok(!(PK1 in ls.m) && ls.m[PK2] === '1', '⛔ A 넘겨주기가 B 표시를 지웠다: ' + JSON.stringify(ls.m));
  s.send({ onf: 'openBook', href: E2 }, s.homeInner); settle(s);
  const f = flushes(s);
  assert.strictEqual(f.length, 1, '⛔ B 를 열었는데 B 넘겨주기가 안 떴다');
  const w2 = outWin(s, f[0]); s.send({ onf: 'outHello' }, w2, OUT_O);
  assert.deepStrictEqual(boots(w2).map((x) => x[0].src), [SRC2 + '&park=1'], '⛔ B 넘겨주기 판이 B 가 아니다');
});

/* G2 — 2026-10-24 최종 검토 뒤: 정적 판엔 이제 갈아 끼우지 않는다(F-I1) → A·B 는 각자 정적 판 · 각 판의 outQueue 는 그 판이 든 교재(p.real) 표시로 */
t('G2 정적 판 둘(A·B)의 outQueue — 각자 든 교재(p.real) 표시로', () => {
  const ls = LSf(), s = setup({ swap: true, ls });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O); knock(s, box, OUT_O);
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  const box2 = shown(s)[0], w2 = outWin(s, box2);
  assert.ok(box2 !== box, '준비: B 는 새 정적 판');
  s.send({ onf: 'outQueue', n: 1 }, w2, OUT_O);
  assert.ok(ls.m[PK2] === '1' && !(PK1 in ls.m), '⛔ B 판의 outQueue 를 B 표시로 안 적었다: ' + JSON.stringify(ls.m));
  s.send({ onf: 'outQueue', n: 1 }, w, OUT_O);
  assert.ok(ls.m[PK1] === '1', '⛔ A 판(숨김)의 outQueue 를 A 표시로 안 적었다: ' + JSON.stringify(ls.m));
});

t('G3 같은 판에 넘겨주기를 두 번 걸어도 잃지도 겹치지도 않는다 — 노크 전 같은 교재 두 번 → 하나', () => {
  const s = setup({ ls: USED() });
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  settle(s); s.fire(0);
  assert.strictEqual(flushes(s).length, 1, '⛔ 넘겨주기 판이 하나가 아니다: ' + flushes(s).length);
});

t('G4 넘겨주기 판이 사는 동안 보이는 정적 판을 만들면 넘겨주기 판을 먼저 닫는다 — 한 출처에 정적 판 둘 금지', () => {
  const s = setup({ ls: USED() });
  s.send({ onf: 'openBook', href: E1 }, s.homeInner); settle(s);
  const fw = outWin(s, flushes(s)[0]); s.send({ onf: 'outHello' }, fw, OUT_O);
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  assert.strictEqual(flushes(s).length, 0, '⛔ 정적 판을 띄웠는데 넘겨주기 판이 살아 있다');
  assert.strictEqual(shown(s)[0].kids[0].src, OUT_BOOK, '준비: 보이는 정적 판');
});

console.log('[🌤 최종 검토 고침 — 2026-10-24]');
/* I1 정적 판(board)엔 홈 out:1 누름도 안 끼운다 — 정적 판의 다리는 첫 교재에 묶여 O.boot 가 바로 fail → bookSwapEnd 가 지금 길 새 판(≈5초)으로 물러났다(오늘 판 갈아 끼우기 0.5~3초보다 느림).
   그래서 out:1 누름은 새 정적 판(사본 겨루기)으로 · out 없는 누름은 이미 정적 판을 못 고른다(위 I1). */
t('F-I1 홈이 A(out) 다음 B(out) — B 는 새 정적 판 · A 창에 bookSwap 없음', () => {
  const s = setup({ swap: true });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner);
  const box = s.panels()[0], w = outWin(s, box);
  s.send({ onf: 'outHello' }, w, OUT_O); knock(s, box, OUT_O);
  s.send({ onf: 'openBook', href: E2, out: 1 }, s.homeInner);
  assert.strictEqual(sentOf(w, 'bookSwap').length, 0, '⛔ 켠 교재를 정적 판(board)에 갈아 끼웠다');
  const v = shown(s);
  assert.ok(v.length === 1 && v[0] !== box && v[0].kids[0].src === OUT_BOOK, '⛔ B 가 새 정적 판으로 안 떴다');
  const w2 = outWin(s, v[0]); s.send({ onf: 'outHello' }, w2, OUT_O);
  assert.deepStrictEqual(boots(w2).map((x) => x[0].src), [SRC2], '⛔ 새 정적 판에 B 를 안 넘겼다');
});

/* M2 주소 out=1 은 그 기기의 하루 물러남 기억(onfOutFail)도 지운다 — Peter 가 기기를 바로 다시 시험하게. out=0 은 종전. */
t('F-M2 index.html — out=1 이면 onfOutFail 지움 · out=0·없음은 그대로', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const line = (/\n\s*(var outOn = q\.get\('out'\);[^\n]*\n[^\n]*catch \(eO\) \{\})/.exec(html) || [])[1];
  assert.ok(line, '⛔ index.html 에 out 스위치 줄이 없다');
  const run = (qs, m) => { const c = { q: new URLSearchParams(qs), localStorage: LSf(m) }; vm.createContext(c); vm.runInContext(line, c); return c.localStorage.m; };
  assert.ok(!('onfOutFail' in run('out=1', { onfOutFail: '1700000000000' })), '⛔ out=1 인데 onfOutFail 이 남았다');
  assert.strictEqual(run('out=0', { onfOutFail: '17' }).onfOutFail, '17', '⛔ out=0 이 onfOutFail 을 건드렸다');
  assert.strictEqual(run('', { onfOutFail: '17' }).onfOutFail, '17', '⛔ out 없는 주소가 onfOutFail 을 건드렸다');
});

/* ═══ 🌤 밖으로 2 Task 4(2026-10-24) — 링크 직행 교재(?fileId&sheetName · slug)도 Worker /who 가 cf 를 주면 첫 판(큰 화면)을 정적 판으로 ═══
   묻는 때: 링크 직행 · 토큰 · 기기 out≠0 · 그날 물러남 없음 · 14일 안에 정적 판을 쓴 기기(onfOutUsed) · ⭐ 내 문장·🗂️ 카드 덱·ttok 아님 — 아니면 종전 그대로(요청 0 · 기다림 0).
   WHO_MS 800 안 답이 없거나 실패·ok:false·cf 없음 = 지금 길 · 늦은 답은 판을 안 바꾼다 · 토큰은 몸통에만. */
const AT = [];
function ta(label, fn) { AT.push([label, fn]); }
const flush = () => new Promise((r) => setImmediate(r));
const WHO = (/var ONF_WHO = '([^']+)'/.exec(CODE) || [])[1] || 'ONF_WHO 없음';
const HOME_GET = (/var ONF_HOME_GET = '([^']+)'/.exec(CODE) || [])[1] || 'ONF_HOME_GET 없음';
const HOME_URL = (/var ONF_OUT_HOME_URL = '([^']+)'/.exec(CODE) || [])[1] || 'ONF_OUT_HOME_URL 없음';
const DSRC = 'https://script.google.com/x/exec?t=TOK&fileId=FILE_ID_0123456789&sheetName=E1&mode=share';   // 링크 직행(fileId) 첫 판 주소(index.html appUrl 꼴)
const SSRC = 'https://script.google.com/x/exec?t=TOK&mode=share&slug=a-s1-e1-b';                          // 짧은 주소(slug)
const HSRC = 'https://script.google.com/x/exec?t=TOK';                                                     // 홈(/i/<tok>)
const UL = (o) => LSf(Object.assign({ onfOutUsed: String(1.7e12 - 13 * 86400000) }, o || {}));
function wsetup(o) {
  o = o || {};
  const calls = [], okN = { n: 0 };
  const s = setup(Object.assign({ ls: UL(), src: DSRC, hooks: { ok() { okN.n++; }, stuck() {} } }, o, {
    pre: (g) => { g.fetch = (url, init) => new Promise((res, rej) => { if (o.log) o.log.push('fetch:' + url); calls.push({ url, init, ok: (st, body) => res({ ok: st >= 200 && st < 300, status: st, json: () => Promise.resolve(body) }), no: rej }); }); } }));
  s.calls = calls; s.okN = okN;
  return s;
}
const ANS = (cf, extra) => ({ ok: true, api: 2, who: 'w', ended: false, books: [Object.assign({ f: 'FILE_ID_0123456789', s: 'E1', title: 'x', slug: 'a-s1-e1-b', out: !!cf, ended: false, cf: cf || null }, extra || {})] });

ta('S4a ?fileId&sheetName 링크 + /who cf → 첫 판 = ONF_OUT_BOOK · 답 전엔 안 연다 · hello 에 outBoot{tok, src, cf(/who 것)} · 로고 ok · onfOutUsed 새로', async () => {
  assert.strictEqual(WHO, 'https://onf-media.edia--orker.workers.dev/who', '상수 값(브리프)');
  const s = wsetup();
  assert.strictEqual(s.calls.length, 1, '⛔ /who 를 안 물었다');
  assert.ok(!s.frameEl.src, '⛔ /who 답 전에 첫 판을 열었다: ' + s.frameEl.src);
  assert.deepStrictEqual(JSON.parse(s.calls[0].init.body), { t: 'TOK', f: 'FILE_ID_0123456789', s: 'E1' }, '⛔ 몸통 꼴(slug 칸 없음)');
  s.g.T += 300;
  s.calls[0].ok(200, ANS(CF)); await flush();
  assert.strictEqual(s.frameEl.src, OUT_BOOK, '⛔ 새 길인데 첫 판이 정적 판이 아니다: ' + s.frameEl.src);
  s.send({ onf: 'outHello' }, win('stranger', s.top), OUT_O);
  assert.strictEqual(boots(s.homeWin).length, 0, '⛔ 남의 창 hello 에 outBoot');
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.deepStrictEqual(boots(s.homeWin), [[{ onf: 'outBoot', tok: 'TOK', src: DSRC, cf: CF }, OUT_O]], '⛔ outBoot 이 없거나 꼴이 다르다');
  assert.strictEqual(s.okN.n, 1, '⛔ 정적 판이 떴는데 로고 막(hooks.ok)을 안 걷었다');
  assert.strictEqual(s.g.localStorage.m.onfOutUsed, String(1.7e12 + 300), '⛔ 정적 판을 띄웠는데 onfOutUsed 를 안 새로 적었다');
  s.fire(2500);
  assert.strictEqual(s.frameEl.src, OUT_BOOK, '⛔ hello 뒤 시한으로 물러났다');
});

ta('S4a 첫 판 정적 판이 outFail(또는 hello 없음) → 같은 액자에 지금 exec 주소 · outFail(hard) = 하루 · hello 없음(slow) = 이번만', async () => {
  const s = wsetup();
  s.calls[0].ok(200, ANS(CF)); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'outFail', why: 'bridge' }, s.homeWin, OUT_O);
  assert.strictEqual(s.frameEl.src, DSRC, '⛔ outFail 인데 지금 길로 안 다시 열었다');
  assert.strictEqual(s.g.localStorage.m.onfOutFail, String(1.7e12 + 86400000) + ',1', '⛔ outFail(bridge · hard) — 하루를 안 적었다');
  const n = wsetup();
  n.calls[0].ok(200, ANS(CF)); await flush();
  n.fire(2500);
  assert.strictEqual(n.frameEl.src, DSRC, '⛔ hello 없음 — 지금 길로 안 물러났다');
  assert.strictEqual(n.g.localStorage.m.onfOutFail, '0,1', '⛔ hello 없음(slow) — 이번만(연속 1 · 0)이 아니다');
});

ta('S4b /who 가 WHO_MS(800) 넘김 → 지금 길 · 늦은 답(cf)이 와도 판을 안 바꾼다', async () => {
  const s = wsetup();
  s.fire(800); await flush();
  assert.strictEqual(s.frameEl.src, DSRC, '⛔ 시한 넘었는데 지금 길로 안 열었다');
  s.calls[0].ok(200, ANS(CF)); await flush();
  assert.strictEqual(s.frameEl.src, DSRC, '⛔ 늦은 답이 판을 바꿨다');
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.strictEqual(boots(s.homeWin).length, 0, '⛔ 늦은 답 뒤 outBoot');
});

ta('S4b 500 · 끊김 · ok:false(unknown·stale·other·bad) · cf null · 빈 books → 지금 길(시한 전에 바로)', async () => {
  const cases = [['500', (c) => c.ok(500, { ok: false })], ['끊김', (c) => c.no(new Error('net'))],
    ['unknown', (c) => c.ok(200, { ok: false, why: 'unknown' })], ['stale', (c) => c.ok(200, { ok: false, why: 'stale' })],
    ['other', (c) => c.ok(200, { ok: false, why: 'other' })], ['bad', (c) => c.ok(400, { ok: false, why: 'bad' })],
    ['cf null', (c) => c.ok(200, ANS(null))], ['끝난 교재', (c) => c.ok(200, ANS(null, { out: true, ended: true }))], ['빈 books', (c) => c.ok(200, { ok: true, api: 2, books: [] })]];
  for (const [nm, go] of cases) {
    const s = wsetup();
    go(s.calls[0]); await flush();
    assert.strictEqual(s.frameEl.src, DSRC, '⛔ ' + nm + ' — 지금 길로 안 열었다: ' + s.frameEl.src);
    s.fire(800); await flush();
    assert.strictEqual(s.frameEl.src, DSRC, '⛔ ' + nm + ' — 시한 뒤 판이 바뀌었다');
  }
});

ta('S4c 요청 = POST ONF_WHO · 주소에 토큰 없음(몸통만)', async () => {
  const s = wsetup();
  const c = s.calls[0];
  assert.strictEqual(c.url, WHO, '⛔ 요청 주소가 상수와 다르다(쿼리를 붙였다?): ' + c.url);
  assert.ok(c.url.indexOf('TOK') < 0, '⛔ 주소에 토큰');
  assert.strictEqual(c.init.method, 'POST');
  assert.strictEqual(JSON.parse(c.init.body).t, 'TOK', '⛔ 몸통에 토큰이 없다');
  assert.ok(!c.init.headers || !/json/i.test(JSON.stringify(c.init.headers)), '⛔ application/json — 사전 요청(preflight)이 붙는다');
});

ta('S4d 홈(/i/<tok> — 교재 주소 없음) → /who 0회 · 홈 표시 없는 mount(옛 index.html)는 바로 지금 길 · 홈 표시면 /home/get 만(밖으로 3 S6a)', async () => {
  const s = wsetup({ src: HSRC });
  assert.strictEqual(s.calls.length, 0, '⛔ 홈에서 /who 를 물었다');
  assert.strictEqual(s.frameEl.src, HSRC, '⛔ 홈이 바로 안 열렸다');
  const h = wsetup({ src: HSRC, home: true });
  assert.deepStrictEqual(h.calls.map((c) => c.url), [HOME_GET], '⛔ 홈인데 /who 를 묻거나 /home/get 을 안 물었다');
});

ta('S4e slug 링크 → 몸통 {t, slug}(f·s 칸 없음) · cf 면 정적 판', async () => {
  const s = wsetup({ src: SSRC });
  assert.deepStrictEqual(JSON.parse(s.calls[0].init.body), { t: 'TOK', slug: 'a-s1-e1-b' }, '⛔ slug 몸통 꼴');
  s.calls[0].ok(200, ANS(CF)); await flush();
  assert.strictEqual(s.frameEl.src, OUT_BOOK, '⛔ slug 링크가 새 길로 안 갔다');
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.deepStrictEqual(boots(s.homeWin).map((x) => x[0].src), [SSRC]);
  const f = wsetup({ src: DSRC.replace('&sheetName=E1', '') });   // sheetName 없는 fileId 링크 — s 칸을 아예 안 싣는다
  assert.deepStrictEqual(Object.keys(JSON.parse(f.calls[0].init.body)), ['t', 'f'], '⛔ 없는 칸을 실었다(빈 값은 Worker 가 400 bad)');
});

ta('S4f 안 묻는 때 — 기기 out=0 · 토큰 없음 · 14일 안에 정적 판 안 씀(없음·15일 전) · 그날 물러남 · ⭐ 내 문장 · 🗂️ 카드 덱 · ttok → /who 0회 · 바로 지금 길', async () => {
  const D = 86400000;
  const cases = [['out=0', { out: false }], ['토큰 없음', { tok: '' }], ['정적 판 안 씀', { ls: LSf() }], ['15일 전', { ls: UL({ onfOutUsed: String(1.7e12 - 15 * D) }) }],
    ['그날 물러남', { ls: UL({ onfOutFail: BLK }) }],
    ['내 문장', { src: DSRC.replace('mode=share', 'mode=mine') }], ['카드 덱', { src: DSRC + '&view=cards' }], ['ttok', { src: DSRC + '&ttok=X' }]];
  for (const [nm, o] of cases) {
    const s = wsetup(o);
    assert.strictEqual(s.calls.length, 0, '⛔ ' + nm + ' — /who 를 물었다');
    assert.strictEqual(s.frameEl.src, o.src || DSRC, '⛔ ' + nm + ' — 바로 지금 길로 안 열었다');
  }
});

/* 검토 고침 1 — 첫 판 정적 판의 outQueue 도 남은 쓰기 표시(onfOutPending)로 · 열쇠는 판과 같은 교재 주소(bookSrc 꼴) — 다음에 지금 길 판으로 열 때 넘겨주기가 찾는다.
   첫 판 정적 판이 사는 동안엔 넘겨주기 판을 안 띄운다(한 출처에 정적 판 둘 금지) · 물러난 뒤엔 띄운다. */
ta('S4g 첫 판 정적 판 outQueue → onfOutPending:<판 교재 주소> · 남의 창·출처는 버림 · n 0 이면 지움', async () => {
  const s = wsetup({ src: SSRC });
  s.calls[0].ok(200, ANS(CF)); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'outQueue', n: 2 }, win('stranger', s.top), OUT_O);
  s.send({ onf: 'outQueue', n: 2 }, s.homeWin, 'https://evil.example.com');
  assert.ok(!(PK1 in s.g.localStorage.m), '⛔ 남의 창·출처 outQueue 를 적었다');
  s.send({ onf: 'outQueue', n: 2 }, s.homeWin, OUT_O);
  assert.strictEqual(s.g.localStorage.m[PK1], '1', '⛔ 첫 판 outQueue 를 판 교재 주소 열쇠로 안 적었다: ' + JSON.stringify(s.g.localStorage.m));
  s.send({ onf: 'outQueue', n: 0 }, s.homeWin, OUT_O);
  assert.ok(!(PK1 in s.g.localStorage.m), '⛔ n 0 인데 안 지웠다');
});
ta('S4g 첫 판 정적 판이 사는 동안 지금 길 판을 열어도 넘겨주기 판 없음 · 물러난 뒤엔 넘겨주기', async () => {
  const s = wsetup({ src: SSRC, ls: UL({ [PK1]: '1' }) });
  s.calls[0].ok(200, ANS(CF)); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner); settle(s); s.fire(0);
  assert.strictEqual(flushes(s).length, 0, '⛔ 첫 판 정적 판이 사는데 넘겨주기 판을 띄웠다(같은 대기열 두 번)');
  const n = wsetup({ src: SSRC, ls: UL({ [PK1]: '1' }) });
  n.calls[0].ok(200, ANS(CF)); await flush();
  n.send({ onf: 'outFail', why: 'bridge' }, n.homeWin, OUT_O);
  n.g.localStorage.removeItem('onfOutFail');   // 그날 물러남은 넘겨주기도 막는다(outOk) — 이 검사는 「첫 판이 정적 판이 아님」만 본다
  n.send({ onf: 'openBook', href: E1 }, n.homeInner); settle(n); n.fire(0);
  assert.strictEqual(flushes(n).length, 1, '⛔ 첫 판이 물러났는데 넘겨주기 판이 안 떴다');
});

/* 최종 검토 F3·F4·F5 */
ta('S4h /who 는 공유 교재 링크만 — mode 없음·share 만 묻고 그 밖(print·teacher 등)은 0회 · 바로 지금 길', async () => {
  const none = wsetup({ src: DSRC.replace('&mode=share', '') });
  assert.strictEqual(none.calls.length, 1, '⛔ mode 없는 링크인데 /who 를 안 물었다');
  for (const m of ['print', 'teacher', 'view']) {
    const src = DSRC.replace('mode=share', 'mode=' + m), s = wsetup({ src });
    assert.strictEqual(s.calls.length, 0, '⛔ mode=' + m + ' — /who 를 물었다');
    assert.strictEqual(s.frameEl.src, src, '⛔ mode=' + m + ' — 바로 지금 길로 안 열었다');
  }
});
ta('S4i /who 답의 api 가 2 가 아니면(없음·1·3) 지금 길', async () => {
  for (const api of [undefined, 1, 3]) {
    const s = wsetup(), a = ANS(CF); if (api === undefined) delete a.api; else a.api = api;
    s.calls[0].ok(200, a); await flush();
    assert.strictEqual(s.frameEl.src, DSRC, '⛔ api ' + api + ' 인데 정적 판으로 갔다: ' + s.frameEl.src);
  }
});
ta('S4j index.html 머리에 Worker preconnect(ONF_WHO 와 같은 출처 · crossorigin)', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), head = html.slice(0, html.indexOf('</head>'));
  const o = new URL(WHO).origin;
  assert.ok(head.indexOf('<link rel="preconnect" href="' + o + '" crossorigin>') >= 0, '⛔ preconnect 줄이 없다(출처 ' + o + ')');
});

/* ═══ 🌤 밖으로 3 Task 6(2026-10-24) — 켠 학생 홈은 Worker /home/get 답 + 정적 홈(ONF_OUT_HOME_URL)을 같이 시작 ═══
   묻는 때(전역 조건): mount home 표시 · 토큰 · 기기 out≠0 · 그날 홈 물러남 없음(onfOutFailHome — 교재 onfOutFail 과 따로). ③-3 부터 안 쓴 기기(onfOutUsed 없음·14일 넘음)도 묻는다(첫 그림 시한 5000 · 시한으로 물러나도 그날 기록 없음 · 그리기 전 mismatch 는 기기와 무관하게 그날 기록 없음).
   답(ok·api 3·v)을 받아야 outBoot{src, tok, d} · 답 없음(HOMEGET_MS 1500 넘김·실패·ok:false·api 다름) = 정적 손잡이를 걷고 지금 길(그날 기록 없음).
   outBoot 뒤 HOME_PAINT_MS 안 homeDrawn 없음·그리기 전 outFail = 지금 길 + onfOutFailHome · 그린 뒤 outFail = 지금 길(error·mismatch 만 그날 기록). 로고 ok 는 homeDrawn 에. */
const HANS = (o) => Object.assign({ ok: true, api: 3, v: { vars: { a: 1 }, books: { ok: true, books: {} } }, at: 1 }, o || {});
const hsetup = (o) => wsetup(Object.assign({ src: HSRC, home: true }, o || {}));

ta('S6a 켠 학생·쓴 기기 → /home/get 1회 + 정적 홈을 같이 시작(답 전에 액자 주소 = 정적 홈) · 답 뒤 hello 에 outBoot{src, tok, d} · 로고 ok 와 onfOutUsed 는 homeDrawn 에', async () => {
  assert.strictEqual(HOME_GET, 'https://onf-media.edia--orker.workers.dev/home/get', '상수 값(브리프)');
  assert.strictEqual(HOME_URL, 'https://app.ownify.co.kr/home/', '상수 값(브리프)');
  const s = hsetup();
  assert.strictEqual(s.calls.length, 1, '⛔ /home/get 을 안 물었다');
  assert.strictEqual(s.calls[0].url, HOME_GET);
  assert.strictEqual(s.frameEl.src, HOME_URL, '⛔ 정적 홈을 답과 같이 시작하지 않았다: ' + s.frameEl.src);
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.strictEqual(boots(s.homeWin).length, 0, '⛔ 답 전에 outBoot');
  s.g.T += 300;
  const a = HANS();
  s.calls[0].ok(200, a); await flush();
  assert.deepStrictEqual(boots(s.homeWin), [[{ onf: 'outBoot', src: HSRC, tok: 'TOK', d: a }, OUT_O]], '⛔ 답이 온 뒤 기다리던 hello 에 outBoot 을 안 보냈다(또는 꼴이 다르다)');
  s.send({ onf: 'outHello' }, win('stranger', s.top), OUT_O);
  s.send({ onf: 'outHello' }, s.homeWin, GO);
  assert.strictEqual(boots(s.homeWin).length, 1, '⛔ 남의 창·남의 출처 hello 에 outBoot');
  assert.strictEqual(s.okN.n, 0, '⛔ homeDrawn 전에 로고 막(hooks.ok)을 걷었다(R14)');
  assert.strictEqual(s.g.localStorage.m.onfOutUsed, String(1.7e12 - 13 * 86400000), '⛔ homeDrawn 전에 onfOutUsed 를 적었다');
  s.send({ onf: 'homeDrawn' }, win('stranger', s.top), OUT_O);
  assert.strictEqual(s.okN.n, 0, '⛔ 남의 창 homeDrawn 을 받았다');
  s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
  assert.strictEqual(s.okN.n, 1, '⛔ homeDrawn 에 로고 막을 안 걷었다');
  assert.strictEqual(s.g.localStorage.m.onfOutUsed, String(1.7e12 + 300), '⛔ 정적 홈이 떴는데 onfOutUsed 를 안 새로 적었다(R18)');
  s.fire(2500); s.fire(1500); await flush();
  assert.strictEqual(s.frameEl.src, HOME_URL, '⛔ 다 그린 뒤 시한으로 물러났다');
  assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')));
  const r = hsetup();   // 답이 hello 보다 먼저 와도 hello 에 보낸다
  r.calls[0].ok(200, a); await flush();
  assert.strictEqual(boots(r.homeWin).length, 0, '⛔ hello 전에 outBoot');
  r.send({ onf: 'outHello' }, r.homeWin, OUT_O);
  assert.strictEqual(boots(r.homeWin).length, 1, '⛔ 답 뒤 hello 에 outBoot 을 안 보냈다');
});

ta('S6a 안 묻는 때 — 홈 표시 없음·기기 out=0·토큰 없음·그날 홈 물러남(쓴 기기든 새 기기든) → /home/get 0회 · 바로 지금 길(종전 그대로) · 교재 물러남(onfOutFail)은 홈을 안 막는다', async () => {
  const D = 86400000;
  const cases = [['홈 표시 없음', { home: false }], ['out=0', { out: false }], ['토큰 없음', { tok: '' }], ['그날 홈 물러남', { ls: UL({ onfOutFailHome: BLK }) }], ['새 기기라도 그날 홈 물러남', { ls: LSf({ onfOutFailHome: BLK }) }]];
  for (const [nm, o] of cases) {
    const s = hsetup(o);
    assert.strictEqual(s.calls.length, 0, '⛔ ' + nm + ' — /home/get 을 물었다');
    assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + nm + ' — 바로 지금 길로 안 열었다: ' + s.frameEl.src);
  }
  const b = hsetup({ ls: UL({ onfOutFail: BLK }) });
  assert.strictEqual(b.calls.length, 1, '⛔ 교재 물러남(onfOutFail)이 홈까지 막는다(R11 — 키를 따로)');
  const y = hsetup({ ls: UL({ onfOutFailHome: String(1.7e12 - D - 1) }) });
  assert.strictEqual(y.calls.length, 1, '⛔ 하루 지난 홈 물러남이 아직 막는다');
});

ta('S6b /home/get 이 HOMEGET_MS(1500) 넘김 → 지금 길 · 늦은 답은 무시 · 그날 기록 없음', async () => {
  const s = hsetup();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.fire(1500); await flush();
  assert.strictEqual(s.frameEl.src, HSRC, '⛔ 시한 넘었는데 지금 길로 안 갈아 끼웠다');
  s.calls[0].ok(200, HANS()); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.strictEqual(boots(s.homeWin).length, 0, '⛔ 늦은 답 뒤 outBoot');
  assert.strictEqual(s.frameEl.src, HSRC, '⛔ 늦은 답이 액자를 바꿨다');
  s.fire(2500);
  assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ 답 없음인데 그날 홈 물러남을 적었다(R4 — 정적 시계가 두 번째 물러남을 했다)');
  assert.ok(!('onfOutFail' in s.g.localStorage.m), '⛔ 홈 일로 교재 물러남을 적었다');
});

ta('S6b unknown·ended·stale·none · api 다름 · v 없음 · 500 · 끊김 → 지금 길(시한 전에 바로 · 그날 기록 없음)', async () => {
  const cases = [['unknown', (c) => c.ok(200, { ok: false, why: 'unknown' })], ['ended', (c) => c.ok(200, { ok: false, why: 'ended' })],
    ['stale', (c) => c.ok(200, { ok: false, why: 'stale' })], ['none', (c) => c.ok(200, { ok: false, why: 'none' })],
    ['api 2', (c) => c.ok(200, HANS({ api: 2 }))], ['api 없음', (c) => { const a = HANS(); delete a.api; c.ok(200, a); }], ['v 없음', (c) => c.ok(200, HANS({ v: null }))],
    ['500', (c) => c.ok(500, { ok: false })], ['끊김', (c) => c.no(new Error('net'))]];
  for (const [nm, go] of cases) {
    const s = hsetup();
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    go(s.calls[0]); await flush();
    assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + nm + ' — 지금 길로 안 갈아 끼웠다: ' + s.frameEl.src);
    assert.strictEqual(boots(s.homeWin).length, 0, '⛔ ' + nm + ' — outBoot 을 보냈다');
    s.fire(2500); s.fire(1500); await flush();
    assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ ' + nm + ' — 그날 홈 물러남을 적었다');
  }
});

ta('S6c 요청 = POST ONF_HOME_GET 몸통 {t} · 주소·정적 홈 주소에 토큰 없음 · outBoot 은 정적 홈 출처로만', async () => {
  const log = [];
  const s = hsetup({ log });
  const c = s.calls[0];
  assert.strictEqual(c.url, HOME_GET, '⛔ 요청 주소가 상수와 다르다: ' + c.url);
  assert.strictEqual(c.init.method, 'POST');
  assert.deepStrictEqual(JSON.parse(c.init.body), { t: 'TOK' }, '⛔ 몸통 꼴');
  assert.ok(!c.init.headers || !/json/i.test(JSON.stringify(c.init.headers)), '⛔ application/json — 사전 요청이 붙는다');
  assert.ok(log.every((x) => x.indexOf('TOK') < 0), '⛔ 주소에 토큰: ' + log.join(' '));
  s.calls[0].ok(200, HANS()); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.ok(js(s.homeWin.sent).every((x) => x[1] === OUT_O), '⛔ 정적 홈 출처가 아닌 곳으로 보냈다');
});

ta('S6d 그리기 전 실패 — homeDrawn 이 HOME_PAINT_MS(outBoot 부터) 안 안 옴 · outFail(error) · hello 없음(OUT_MS) → 같은 액자 지금 길 + onfOutFailHome(교재 onfOutFail 은 그대로)', async () => {
  const s = hsetup();
  s.calls[0].ok(200, HANS()); await flush();
  s.g.T += 5000;   // 시계는 outBoot 부터 — hello 가 늦게 와도 그 뒤 HOME_PAINT_MS 를 준다
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.strictEqual(s.frameEl.src, HOME_URL);
  s.fire(2500);
  assert.strictEqual(s.frameEl.src, HSRC, '⛔ homeDrawn 이 안 왔는데 지금 길로 안 갈아 끼웠다');
  assert.strictEqual(s.g.localStorage.m.onfOutFailHome, '0,1', '⛔ 그리기 시한(slow) — 이번만(연속 1 · 막지 않음)이 아니다');
  assert.ok(!('onfOutFail' in s.g.localStorage.m), '⛔ 홈 일로 교재 물러남을 적었다(R11)');
  const e = hsetup();
  e.calls[0].ok(200, HANS()); await flush();
  e.send({ onf: 'outHello' }, e.homeWin, OUT_O);
  e.send({ onf: 'outFail', why: 'error' }, win('stranger', e.top), OUT_O);
  assert.strictEqual(e.frameEl.src, HOME_URL, '⛔ 남의 창 outFail 로 물러났다');
  e.send({ onf: 'outFail', why: 'error' }, e.homeWin, OUT_O);
  assert.strictEqual(e.frameEl.src, HSRC, '⛔ outFail 인데 지금 길로 안 갈아 끼웠다');
  assert.ok(held(e.g.localStorage.m, 'onfOutFailHome'), '⛔ 그리기 전 outFail 인데 그날 기록이 없다');
  assert.strictEqual(e.okN.n, 0, '⛔ 못 그린 정적 홈으로 로고 막을 걷었다');
  const n = hsetup();
  n.fire(2500);
  assert.strictEqual(n.frameEl.src, HSRC, '⛔ hello 가 없는데 지금 길로 안 갈아 끼웠다');
  assert.strictEqual(n.g.localStorage.m.onfOutFailHome, '0,1', '⛔ hello 없음(slow) — 이번만(연속 1 · 막지 않음)이 아니다');
  n.calls[0].ok(200, HANS()); await flush();
  assert.strictEqual(n.frameEl.src, HSRC, '⛔ 물러난 뒤 온 답이 액자를 바꿨다');
});

ta('S6d 그린 뒤 outFail — error·mismatch 는 지금 길 + 그날 기록 · notice·stale 은 지금 길만 · 그 뒤 hello·homeDrawn·outFail 은 무시', async () => {
  for (const [why, kill] of [['error', true], ['mismatch', true], ['notice', false], ['stale', false]]) {
    const s = hsetup();
    s.calls[0].ok(200, HANS()); await flush();
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
    s.send({ onf: 'outFail', why }, s.homeWin, OUT_O);
    assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + why + ' — 지금 길로 안 갈아 끼웠다');
    assert.strictEqual(held(s.g.localStorage.m, 'onfOutFailHome'), kill, '⛔ ' + why + ' — 그날 기록이 ' + (kill ? '없다' : '있다'));
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    s.send({ onf: 'outFail', why: 'error' }, s.homeWin, OUT_O);
    s.fire(2500);
    assert.strictEqual(boots(s.homeWin).length, 1, '⛔ ' + why + ' — 물러난 뒤 hello 에 outBoot');
    assert.strictEqual(held(s.g.localStorage.m, 'onfOutFailHome'), kill, '⛔ ' + why + ' — 물러난 뒤 말이 그날 기록을 바꿨다');
  }
});

/* ═══ ③-3 Task 4(2026-10-29) — 새 기기(onfOutUsed 없음·14일 넘음)도 정적 홈을 시도한다 ═══
   첫 그림 시한 HOME_PAINT_MS_COLD 5000(쓴 기기는 2500) · 시한으로 물러나도 그날 기록(onfOutFailHome) 없음(다음 열기에 다시 시도) ·
   그리기 전 mismatch(③-3 교재 목록 대조 어긋남)는 쓴 기기든 새 기기든 그날 기록 없음 · 그린 뒤 mismatch 는 종전 · 쓴 기기의 다른 실패는 종전 그대로. flushWorth·whoQ 는 무변. */
const D14 = 86400000;
const NEWS = () => [['onfOutUsed 없음', { ls: LSf() }], ['14일 넘음', { ls: LSf({ onfOutUsed: String(1.7e12 - 14 * D14 - 1) }) }]];   // 부를 때마다 새 저장소(시험끼리 안 섞인다)
ta('N1 새 기기(onfOutUsed 없음·14일 넘음) → /home/get 1회 + 정적 홈 시작 · 답 뒤 hello 에 outBoot · homeDrawn 에 로고 ok·onfOutUsed 새로', async () => {
  for (const [nm, o] of NEWS()) {
    const s = hsetup(o);
    assert.strictEqual(s.calls.length, 1, '⛔ ' + nm + ' — /home/get 을 안 물었다');
    assert.strictEqual(s.frameEl.src, HOME_URL, '⛔ ' + nm + ' — 정적 홈을 안 시작했다: ' + s.frameEl.src);
    const a = HANS();
    s.calls[0].ok(200, a); await flush();
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    assert.deepStrictEqual(boots(s.homeWin), [[{ onf: 'outBoot', src: HSRC, tok: 'TOK', d: a }, OUT_O]], '⛔ ' + nm + ' — outBoot 꼴');
    assert.strictEqual(s.okN.n, 0);
    s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
    assert.strictEqual(s.okN.n, 1, '⛔ ' + nm + ' — homeDrawn 에 로고 막을 안 걷었다');
    assert.strictEqual(s.g.localStorage.m.onfOutUsed, String(1.7e12), '⛔ ' + nm + ' — 처음 그린 기기가 onfOutUsed 를 안 적었다(다음부턴 쓴 기기)');
  }
});
ta('N2 새 기기 첫 그림 시한 = 5000(outBoot 부터) — 2500 에 안 물러나고 5000 에 물러난다 · 막지 않음(slow 연속 1) · 다음 열기에 다시 시도 · 쓴 기기는 2500', async () => {
  for (const [nm, o] of NEWS()) {
    const s = hsetup(o);
    s.calls[0].ok(200, HANS()); await flush();
    s.g.T += 4000;
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    s.fire(2500);
    assert.strictEqual(s.frameEl.src, HOME_URL, '⛔ ' + nm + ' — 새 기기가 2500 에 물러났다(시한이 안 늘었다)');
    s.fire(5000); await flush();
    assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + nm + ' — 5000 이 지나도 지금 길로 안 갔다');
    assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ ' + nm + ' — 시한으로 물러났는데 그날 기록을 남겼다(다음 열기에 다시 시도해야 한다)');
    assert.ok(!('onfOutFail' in s.g.localStorage.m), '⛔ ' + nm + ' — 교재 물러남을 적었다');
    const n = hsetup({ ls: s.g.localStorage });   // 다음 열기
    assert.strictEqual(n.calls.length, 1, '⛔ ' + nm + ' — 다음 열기에 다시 시도하지 않는다');
    assert.strictEqual(n.frameEl.src, HOME_URL);
  }
  const u = hsetup();   // 쓴 기기 시한은 종전 2500 · 기록도 종전
  u.calls[0].ok(200, HANS()); await flush();
  u.send({ onf: 'outHello' }, u.homeWin, OUT_O);
  u.fire(2500);
  assert.strictEqual(u.frameEl.src, HSRC, '⛔ 쓴 기기 시한이 바뀌었다');
  assert.ok(!held(u.g.localStorage.m, 'onfOutFailHome') && u.g.localStorage.m.onfOutFailHome === '0,1', '⛔ 쓴 기기 첫 시한 실패도 이번만(연속 1)이어야 한다');
});
ta('N3 새 기기 hello 없음(OUT_MS) → 지금 길 · 그날 기록 없음 (쓴 기기는 종전: 기록 있음 — S6d)', async () => {
  for (const [nm, o] of NEWS()) {
    const s = hsetup(o);
    s.fire(2500);
    assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + nm + ' — hello 가 없는데 지금 길로 안 갔다');
    assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ ' + nm + ' — hello 시한으로 물러났는데 그날 기록');
  }
});
ta('N4 그리기 전 mismatch → 지금 길 · 그날 기록 없음 — 새 기기든 쓴 기기든 (그린 뒤 mismatch 는 종전대로 기록 — S6d)', async () => {
  for (const [nm, o] of NEWS().concat([['쓴 기기', {}]])) {
    for (const drawn of [false]) {
      const s = hsetup(o);
      s.calls[0].ok(200, HANS()); await flush();
      s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
      if (drawn) s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
      s.send({ onf: 'outFail', why: 'mismatch' }, s.homeWin, OUT_O);
      assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + nm + ' 그림 ' + drawn + ' — 지금 길로 안 갔다');
      assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ ' + nm + ' 그림 ' + drawn + ' — mismatch 가 그날 기록을 남겼다(다음 열기에 다시 시도해야 한다)');
      const n = hsetup({ ls: s.g.localStorage });
      assert.strictEqual(n.calls.length, 1, '⛔ ' + nm + ' — mismatch 뒤 다음 열기에 다시 시도하지 않는다');
    }
  }
});
ta('N5 새 기기의 다른 실패(error · 그리기 전 notice·stale · 스위치 꺼짐)는 종전 그대로 그날 기록 — 시한·mismatch 만 면제', async () => {
  for (const why of ['error', 'notice', 'stale']) {
    const s = hsetup({ ls: LSf() });
    s.calls[0].ok(200, HANS()); await flush();
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    s.send({ onf: 'outFail', why }, s.homeWin, OUT_O);
    assert.strictEqual(s.frameEl.src, HSRC);
    assert.ok(held(s.g.localStorage.m, 'onfOutFailHome'), '⛔ 새 기기 ' + why + ' — 그날 기록이 없다');
  }
  const o = hsetup({ ls: LSf() });
  o.send({ onf: 'outHello' }, o.homeWin, OUT_O);
  o.calls[0].ok(503, { ok: false, why: 'off' }); await flush();
  assert.ok(held(o.g.localStorage.m, 'onfOutFailHome'), '⛔ 새 기기 스위치 꺼짐 — 그날 기록이 없다');
  const t = hsetup({ ls: LSf() });   // 답 없음(HOMEGET_MS) = 종전: 지금 길 · 기록 없음
  t.fire(1500); await flush();
  assert.strictEqual(t.frameEl.src, HSRC);
  assert.ok(!(held(t.g.localStorage.m, 'onfOutFailHome')));
});
ta('N6 flushWorth·whoQ 의 onfOutUsed 판정은 그대로(새 기기 홈 시도가 교재 넘겨주기·링크 직행을 안 연다)', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8');
  const at = (k, n) => src.slice(src.indexOf(k), src.indexOf(k) + n);
  assert.ok(/OUT_USED/.test(at('function flushWorth(b)', 500)), '⛔ flushWorth 의 onfOutUsed 판정이 사라졌다');
  assert.ok(/OUT_USED/.test(at('function whoQ(s)', 700)), '⛔ whoQ 의 onfOutUsed 판정이 사라졌다');
});

ta('N7 시한 실패 사다리(종전 Ruling 6 「새 기기 첫 번째만 면제」를 대신 · 쓴 기기도 같다) — 연속 1 = 0 · 2 = 10분(그 동안 정적 0) · hello·그리기 섞여도 셈 · mismatch 는 셈에 안 들어감 · 그리면 셈 지움', async () => {
  const miss = async (ls, how) => {
    const s = hsetup({ ls });
    if (how === 'hello') s.fire(2500);
    else { s.calls[0].ok(200, HANS()); await flush(); s.send({ onf: 'outHello' }, s.homeWin, OUT_O); s.fire(5000); s.fire(2500); }
    assert.strictEqual(s.frameEl.src, HSRC); return s;
  };
  for (const [nm, mk] of [['새 기기', () => LSf()], ['쓴 기기', () => LSf({ onfOutUsed: String(1.7e12 - D14) })]]) {
    const ls = mk();
    await miss(ls, 'paint');
    assert.ok(!held(ls.m, 'onfOutFailHome') && ls.m.onfOutFailHome === '0,1', '⛔ ' + nm + ' 첫 시한 실패 — 이번만(연속 1 · 0)이 아니다: ' + ls.m.onfOutFailHome);
    await miss(ls, 'hello');
    assert.strictEqual(ls.m.onfOutFailHome, String(1.7e12 + 600000) + ',2', '⛔ ' + nm + ' 연속 2(hello) — 10분이 아니다');
    assert.strictEqual(hsetup({ ls }).calls.length, 0, '⛔ ' + nm + ' 10분 막힘 동안 또 정적을 시도한다');
  }
  const l5 = LSf();   // mismatch 는 셈에 안 넣는다
  for (let i = 0; i < 2; i++) { const m = hsetup({ ls: l5 }); m.calls[0].ok(200, HANS()); await flush(); m.send({ onf: 'outHello' }, m.homeWin, OUT_O); m.send({ onf: 'outFail', why: 'mismatch' }, m.homeWin, OUT_O); }
  assert.ok(!('onfOutFailHome' in l5.m), '⛔ mismatch 가 셈에 들어갔다');
  await miss(l5, 'paint'); assert.strictEqual(l5.m.onfOutFailHome, '0,1', '⛔ mismatch 뒤 첫 시한 실패가 연속 1 이 아니다');
  const l6 = LSf();   // 한 번 그리면 셈 지움
  await miss(l6, 'paint'); assert.ok('onfOutFailHome' in l6.m);
  const g = hsetup({ ls: l6 }); g.calls[0].ok(200, HANS()); await flush(); g.send({ onf: 'outHello' }, g.homeWin, OUT_O); g.send({ onf: 'homeDrawn' }, g.homeWin, OUT_O);
  assert.ok(!('onfOutFailHome' in l6.m), '⛔ 그렸는데 셈이 안 지워졌다');
});
ta('S6d 물러나면 죽은 정적 홈 창을 비운다 — 정적 홈이 연 판을 닫아도 그 창엔 bookClosed 를 안 보낸다', async () => {
  const s = hsetup();
  s.calls[0].ok(200, HANS()); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
  s.send({ onf: 'openBook', href: E1 }, s.homeWin, OUT_O);
  assert.strictEqual(s.panels().length, 1, '정적 홈의 openBook 이 판을 연다');
  s.send({ onf: 'outFail', why: 'mismatch' }, s.homeWin, OUT_O);
  s.homeWin.sent.length = 0;
  s.send({ onf: 'bookDismiss' }, s.homeInner, GO);
  assert.ok(!js(s.homeWin.sent).some((x) => x[0].onf === 'bookClosed'), '⛔ 물러난 정적 홈 창(bookHome)에 계속 보낸다');
});

ta('S6f 미리 받기(preEarly) — 순서·횟수 무변: 홈 요청(정적 홈 + /home/get)이 먼저 나간 뒤 숨긴 판 하나 · 판 주소·outBoot 그대로', async () => {
  const pb = { onfPreBook: JSON.stringify({ k: 'kA', h: E1, ph: 0, t: 1.7e12, o: 1 }) };
  const oldLog = [], newLog = [];
  const o = hsetup({ home: false, preKey: 'kA', ls: UL(pb), log: oldLog });
  const n = hsetup({ preKey: 'kA', ls: UL(pb), log: newLog });
  assert.deepStrictEqual(oldLog, ['frame:' + HSRC, 'panel'], '옛 길 순서');
  assert.deepStrictEqual(newLog, ['fetch:' + HOME_GET, 'frame:' + HOME_URL, 'panel'], '⛔ 미리 받기가 홈 요청보다 먼저 나갔거나 한 번이 아니다');
  const po = o.panels()[0], pn = n.panels()[0];
  assert.strictEqual(pn.kids[0].src, po.kids[0].src, '⛔ 미리 받은 판 주소가 바뀌었다');
  const wo = outWin(o, po), wn = outWin(n, pn);
  o.send({ onf: 'outHello' }, wo, OUT_O); n.send({ onf: 'outHello' }, wn, OUT_O);
  assert.deepStrictEqual(boots(wn), boots(wo), '⛔ 미리 받은 판 outBoot 이 바뀌었다');
});

ta('S6 index.html — mount 에 홈 표시(home)를 넘긴다(PREBOOK 끔과 무관) · out=1 은 홈 물러남(onfOutFailHome)도 지운다', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/out: outOn !== '0', tok: token, home: preHome === true,/.test(html), '⛔ mount 에 home 표시를 안 넘긴다');
  assert.ok(/var preHome = !!token && !q\.get\('fileId'\) && !q\.get\('mode'\) && extra\.join\('&'\)\.indexOf\('slug='\) < 0;/.test(html), '⛔ 홈 판정 줄이 바뀌었다');
  const line = (/\n\s*(var outOn = q\.get\('out'\);[^\n]*\n[^\n]*catch \(eO\) \{\})/.exec(html) || [])[1];
  const c = { q: new URLSearchParams('out=1'), localStorage: LSf({ onfOutFailHome: '1', onfOutFail: '1' }) }; vm.createContext(c); vm.runInContext(line, c);
  assert.ok(!('onfOutFailHome' in c.localStorage.m) && !('onfOutFail' in c.localStorage.m), '⛔ out=1 인데 물러남 기억이 남았다');
});

/* 검토 고침 1(Task 6) */
const on25 = (s) => s.timers.filter((x) => x.on && x.ms === 2500);
ta('R12 그리기 시한은 outBoot 부터 — hello 가 mount 시계(OUT_MS)를 걷고 outBoot 뒤 새 2500 시계를 건다(답이 먼저 와도 · hello 가 먼저여도)', async () => {
  for (const order of ['hello먼저', '답먼저']) {
    const s = hsetup();
    const m0 = on25(s);
    assert.strictEqual(m0.length, 1, 'mount 때 hello 시계 하나');
    if (order === '답먼저') { s.calls[0].ok(200, HANS()); await flush(); assert.strictEqual(on25(s)[0], m0[0], '⛔ ' + order + ' — hello 전에 시계를 바꿨다'); }
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    assert.strictEqual(m0[0].on, false, '⛔ ' + order + ' — hello 가 mount 시계를 안 걷었다(시한이 mount 부터 센다)');
    if (order === 'hello먼저') { assert.strictEqual(on25(s).length, 0, '⛔ outBoot 전에 그리기 시계'); s.calls[0].ok(200, HANS()); await flush(); }
    assert.strictEqual(boots(s.homeWin).length, 1);
    const p = on25(s);
    assert.ok(p.length === 1 && p[0] !== m0[0] && s.timers.indexOf(p[0]) > s.timers.indexOf(m0[0]), '⛔ ' + order + ' — outBoot 뒤 새 2500 시계가 없다');
  }
});
const wk = (o) => {   // 아직 about:blank 인 액자(WebKit 이 정적 홈 이동을 아직 안 커밋한 때) · load 처리기·replace 기록
  const s = hsetup(o), reps = [], loads = [];
  s.homeWin.location = { href: 'about:blank', replace(u) { reps.push(u); } }; s.homeWin.length = 0;
  s.frameEl.addEventListener = (k, f) => { if (k === 'load') loads.push(f); };
  s.reps = reps; s.loads = loads;
  s.commit = (href) => { s.homeWin.location.href = href; loads.forEach((f) => f()); };
  return s;
};
ta('R-2 그리기 전 물러남은 openExec 길 — 같은 액자의 구글 홈 노크가 로고 막 ok 를 부른다(여러 계정 우회·hooks 그대로)', async () => {
  const s = wk();
  s.calls[0].ok(200, HANS()); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'outFail', why: 'error' }, s.homeWin, OUT_O);
  assert.strictEqual(s.okN.n, 0);
  s.commit('https://n-abc-0lu-script.googleusercontent.com/userCodeAppPanel');   // 지금 길 구글 홈이 섰다(back() 은 「이동 중」으로 열어 load 뒤부터 노크를 받는다)
  s.send({ onf: 'frameHello' }, s.homeInner, GO);
  assert.strictEqual(s.okN.n, 1, '⛔ 물러난 뒤 지금 길 노크에 로고 ok 가 없다(openExec 를 안 탔다)');
});
ta('R-3 답 전 homeDrawn 은 무시 — 로고 ok·onfOutUsed 없음 · 답 뒤 outBoot 시한은 그대로 돈다', async () => {
  const s = hsetup();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
  assert.strictEqual(s.okN.n, 0, '⛔ 답 전 homeDrawn 으로 로고 막을 걷었다');
  assert.strictEqual(s.g.localStorage.m.onfOutUsed, String(1.7e12 - 13 * 86400000), '⛔ 답 전 homeDrawn 으로 onfOutUsed 를 적었다');
  s.calls[0].ok(200, HANS()); await flush();
  s.fire(2500);
  assert.strictEqual(s.frameEl.src, HSRC, '⛔ 답 전 homeDrawn 이 그리기 시한을 껐다');
});
ta('R-4 그리기 전 outFail 은 notice·stale 이어도 그날 기록', async () => {
  for (const why of ['notice', 'stale']) {
    const s = hsetup();
    s.calls[0].ok(200, HANS()); await flush();
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    s.send({ onf: 'outFail', why }, s.homeWin, OUT_O);
    assert.strictEqual(s.frameEl.src, HSRC);
    assert.ok(held(s.g.localStorage.m, 'onfOutFailHome'), '⛔ 그리기 전 ' + why + ' 인데 그날 기록이 없다');
  }
});
ta('R-5 물러난 뒤 죽어 가는 정적 홈 창(그 액자 · 정적 홈 출처)의 openBook·hist·bookWarm·frameHello 는 버린다 · 지금 길 구글 홈 말은 받는다', async () => {
  const s = hsetup();
  s.calls[0].ok(200, HANS()); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'homeDrawn' }, s.homeWin, OUT_O);
  s.send({ onf: 'outFail', why: 'mismatch' }, s.homeWin, OUT_O);
  s.homeWin.sent.length = 0;
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeWin, OUT_O);
  s.send({ onf: 'bookWarm', href: E2, panel: 1 }, s.homeWin, OUT_O);
  s.send({ onf: 'hist', op: 'hi' }, s.homeWin, OUT_O);
  s.send({ onf: 'bookHello' }, s.homeWin, OUT_O);
  assert.strictEqual(s.panels().length, 0, '⛔ 죽어 가는 정적 홈 말로 판을 열었다');
  assert.deepStrictEqual(js(s.homeWin.sent), [], '⛔ 죽어 가는 정적 홈 창에 답했다(hist-on·caps)');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner, GO);
  s.send({ onf: 'hist', op: 'hi' }, s.homeInner, GO);
  assert.strictEqual(s.panels().length, 1, '⛔ 지금 길 구글 홈의 openBook 을 버렸다');
  assert.ok(js(s.homeInner.sent).some((x) => x[0].onf === 'hist-on'), '⛔ 지금 길 구글 홈의 hist hi 를 버렸다');
  s.homeInner.sent.length = 0;
  s.send({ onf: 'bookDismiss' }, s.homeInner, GO);
  assert.ok(js(s.homeInner.sent).some((x) => x[0].onf === 'bookClosed'), '⛔ 판을 연 구글 홈에 bookClosed 가 안 간다');
});

/* 최종 검토 고침 I2·M3(2026-10-24) */
ta('I2 스위치 꺼짐(ok:false why off · HTTP 503) → 그날 onfOutFailHome 을 적고 다음 mount 는 /home/get 0회·바로 지금 길 · 다른 null 이유는 기록 없음 (?out=1 지움은 S6 index.html 검사)', async () => {
  const offs = [['why off', (c) => c.ok(200, { ok: false, why: 'off' })], ['503', (c) => c.ok(503, { ok: false, why: 'off' })]];
  for (const [nm, go] of offs) {
    const s = hsetup();
    s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
    go(s.calls[0]); await flush();
    assert.strictEqual(s.frameEl.src, HSRC, '⛔ ' + nm + ' — 지금 길로 안 갔다');
    assert.strictEqual(s.g.localStorage.m.onfOutFailHome, String(1.7e12 + 86400000) + ',1', '⛔ ' + nm + ' — 스위치 꺼짐(hard)인데 하루를 안 적었다');
    assert.ok(!('onfOutFail' in s.g.localStorage.m), '⛔ ' + nm + ' — 교재 물러남까지 적었다');
    const n = hsetup({ ls: s.g.localStorage });   // 같은 날 다음 mount
    assert.strictEqual(n.calls.length, 0, '⛔ ' + nm + ' — 같은 날 다시 /home/get 을 물었다');
    assert.strictEqual(n.frameEl.src, HSRC, '⛔ ' + nm + ' — 같은 날 정적 홈을 또 미리 받았다: ' + n.frameEl.src);
  }
  for (const why of ['unknown', 'stale', 'ended', 'none']) {
    const s = hsetup(); s.calls[0].ok(200, { ok: false, why }); await flush();
    assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ ' + why + ' — 그날 기록을 적었다(종전 그대로여야 한다)');
  }
  for (const st of [500, 404]) { const s = hsetup(); s.calls[0].ok(st, { ok: false }); await flush(); assert.ok(!(held(s.g.localStorage.m, 'onfOutFailHome')), '⛔ HTTP ' + st + ' — 기록'); }
});
ta('I2 하루 지난 스위치 꺼짐 기록은 다시 묻는다', async () => {
  const s = hsetup(); s.calls[0].ok(503, {}); await flush();
  const stamp = s.g.localStorage.m.onfOutFailHome;
  const y = hsetup({ ls: LSf(Object.assign({}, s.g.localStorage.m, { onfOutFailHome: String(1.7e12 - 1) + ',1' })) });
  assert.strictEqual(y.calls.length, 1, '⛔ 하루 지난 기록이 아직 막는다(' + stamp + ')');
});
ta('M3 outBoot 재전송(정적 홈이 몇 시간 뒤 다시 hello) → pre 칸 age 에 받은 뒤 흐른 시간을 더한다 · 원본 d 와 앞서 보낸 사본은 그대로', async () => {
  const s = hsetup();
  const a = HANS({ pre: { books: { ts: 5, age: 100, v: { z: 1 } }, odd: { ts: 6, v: 2 } } });
  s.calls[0].ok(200, a); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  assert.strictEqual(boots(s.homeWin)[0][0].d.pre.books.age, 100, '⛔ 바로 보낸 첫 outBoot 의 age 가 달라졌다');
  s.g.T += 3 * 3600000;
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  const b = boots(s.homeWin);
  assert.strictEqual(b.length, 2);
  assert.strictEqual(b[1][0].d.pre.books.age, 100 + 3 * 3600000, '⛔ 다시 보낸 outBoot 이 낡은 age 그대로다');
  assert.deepStrictEqual(b[1][0].d.pre.odd, { ts: 6, v: 2 }, '⛔ age 없는 칸이 바뀌었다');
  assert.strictEqual(b[1][0].d.pre.books.ts, 5);
  assert.deepStrictEqual(b[1][0].d.v, a.v);
  assert.strictEqual(a.pre.books.age, 100, '⛔ 원본 d 를 고쳤다(복사해야 한다)');
  assert.strictEqual(b[0][0].d.pre.books.age, 100, '⛔ 앞서 보낸 사본이 바뀌었다');
});

/* 통합 검사 고침(2026-10-24 · WebKit) — /home/get 이 일찍 null 이면 back() → openExec 의 replace(exec)가 아직 안 선 정적 홈 이동에 떨어져 WebKit 이 버릴 수 있다.
   그러면 정적 홈의 outHello 를 옛 홈의 노크로 받아 막을 걷고 빈 정적 홈에 멈췄다. */
ta('W1 /home/get 일찍 null → 지금 길 openExec 은 정적 홈 출처의 노크(outHello)를 옛 홈의 노크로 안 받는다(로고 막 ok 0) · 구글 출처 노크는 load 뒤 받는다', async () => {
  const s = wk();
  s.calls[0].ok(200, { ok: false, why: 'none' }); await flush();
  assert.strictEqual(s.frameEl.src, HSRC, '⛔ 지금 길로 안 갔다');
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.send({ onf: 'homeDrawn' }, s.homeWin, 'https://app.ownify.co.kr');
  assert.strictEqual(s.okN.n, 0, '⛔ 정적 홈의 말을 지금 길 노크로 받아 로고 막을 걷었다(빈 정적 홈에 멈춘다)');
  s.commit('https://n-abc-0lu-script.googleusercontent.com/userCodeAppPanel');   // 구글 홈이 커밋
  s.send({ onf: 'oldHello' }, s.homeInner, GO);
  assert.strictEqual(s.okN.n, 1, '⛔ 구글 홈 노크는 받아야 한다(종전 길)');
});
ta('W2 정적 홈이 커밋돼 버리면(replace(exec)를 WebKit 이 버림) → 자식 0 이라 CL_GRACE 뒤 같은 주소 exec 를 다시 연다 · 로고 막은 그대로', async () => {
  const s = wk();
  s.calls[0].ok(200, { ok: false, why: 'none' }); await flush();
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);
  s.commit(HOME_URL);
  assert.strictEqual(s.okN.n, 0, '⛔ 정적 홈 load 에 막을 걷었다');
  s.send({ onf: 'outHello' }, s.homeWin, OUT_O);   // load 뒤(이동 중 아님) 정적 홈이 다시 hello — 출처 거름이 막아야 한다
  assert.strictEqual(s.okN.n, 0, '⛔ load 뒤 정적 홈의 hello 를 옛 홈 노크로 받아 막을 걷었다(빈 정적 홈에 멈춘다)');
  assert.deepStrictEqual(s.reps, [], '⛔ load 직후 바로 다시 열었다(여유 전)');
  s.fire(1500);
  assert.deepStrictEqual(s.reps, [HSRC], '⛔ 정적 홈에 멈춘 액자에 exec 를 다시 안 열었다: ' + JSON.stringify(s.reps));
  assert.strictEqual(s.okN.n, 0);
});
ta('W3 back() 은 액자를 「이동 중」으로 시작 — 아직 about:blank 일 때 온 구글 출처 말(옛 문서의 늦은 말)도 load 전엔 노크로 안 받는다', async () => {
  const s = wk();
  s.calls[0].ok(200, { ok: false, why: 'none' }); await flush();
  s.send({ onf: 'oldHello' }, s.homeInner, GO);
  assert.strictEqual(s.okN.n, 0, '⛔ load 전 말을 노크로 받았다(back() 이 이동 중 표시를 안 했다)');
  s.commit('https://n-abc-0lu-script.googleusercontent.com/userCodeAppPanel');
  s.send({ onf: 'oldHello' }, s.homeInner, GO);
  assert.strictEqual(s.okN.n, 1, '⛔ load 뒤 노크는 받아야 한다');
});

/* ═══ 🔁 물러남 기억 한 곳(2026-10-30) — 「하루」 → 까닭별 · 학생·선생님·교재 모두 onf-frame.js fallBack/fallBlocked/fallOk 하나 ═══ */
ta('FB1 까닭별 표 — slow(hello·paint·fail-time·fail-net) 연속 1 = 0 · 2 = 10분 · 3 = 1시간 · 4~ = 하루 · hard(그 밖) = 하루 · skip(fail-mismatch·late-notice·late-stale·nodata) = 그대로 · fallOk = 0 · 판마다 칸 따로', async () => {
  const mk = (init) => {
    const ls = LSf(init), beacons = [], g = { T: 1.7e12, localStorage: ls, setTimeout, clearTimeout, URL, console: { info() {}, log() {}, warn() {} },
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)', sendBeacon: (u, b) => { beacons.push([u, JSON.parse(b)]); return true; } },
      document: { addEventListener() {} }, addEventListener() {} };
    g.window = g; g.Date = { now: () => g.T }; vm.createContext(g); vm.runInContext(CODE, g, { filename: 'onf-frame.js' });
    return { ls, beacons, F: g.ONF.frame, g };
  };
  const D = 86400000, x = mk();
  for (const [why, n, ms] of [['hello', 1, 0], ['paint', 2, 600000], ['fail-net', 3, 3600000], ['fail-time', 4, D], ['hello', 5, D]]) {
    assert.strictEqual(x.F.fallBack('book', why), ms, '⛔ ' + why + ' 연속 ' + n + ' — 막는 ms');
    assert.strictEqual(x.ls.m.onfOutFail, (ms ? String(1.7e12 + ms) : '0') + ',' + n, '⛔ ' + why + ' 연속 ' + n + ' — 칸 꼴');
    assert.strictEqual(x.F.fallBlocked('book'), ms > 0, '⛔ ' + why + ' — 막힘 판정');
  }
  x.F.fallOk('book');
  assert.ok(!('onfOutFail' in x.ls.m) && !x.F.fallBlocked('book'), '⛔ 성공(fallOk)인데 연속이 남았다');
  for (const why of ['fail-api', 'fail-boot', 'fail-bridge', 'fail-copy', 'fail-error', 'late-error', 'late-mismatch', 'off', 'notch', 'fail-x']) {
    const y = mk();
    assert.strictEqual(y.F.fallBack('home', why), D, '⛔ ' + why + ' 는 hard(하루)');
    assert.strictEqual(y.ls.m.onfOutFailHome, String(1.7e12 + D) + ',1');
  }
  for (const why of ['fail-mismatch', 'late-notice', 'late-stale', 'nodata']) {
    const y = mk({ onfTOutFail: '0,2' });
    assert.strictEqual(y.F.fallBack('thome', why), -1, '⛔ ' + why + ' 는 skip');
    assert.strictEqual(y.ls.m.onfTOutFail, '0,2', '⛔ ' + why + ' — skip 이 칸·연속을 바꿨다');
  }
  const z = mk({ onfOutFail: String(1.7e12 + D) + ',1' });   // 판마다 칸 따로
  assert.ok(z.F.fallBlocked('book') && !z.F.fallBlocked('home') && !z.F.fallBlocked('thome'), '⛔ 교재 물러남이 다른 판을 막는다');
  z.F.fallBack('home', 'hello'); z.F.fallOk('thome');
  assert.ok(z.F.fallBlocked('book') && z.ls.m.onfOutFailHome === '0,1', '⛔ 다른 판 기록이 교재 칸을 건드렸다');
  const old = mk({ onfOutFail: String(1.7e12 - 1000), onfOutFailHome: String(1.7e12 - 1000) });   // 옛 꼴(실패 시각 하나) = 곧 다시 · 연속은 0 부터
  assert.ok(!old.F.fallBlocked('book') && !old.F.fallBlocked('home'), '⛔ 옛 하루 기억에 아직 묶인다');
  assert.strictEqual(old.F.fallBack('book', 'hello'), 0, '⛔ 옛 꼴 뒤 첫 시한이 연속 1 이 아니다');
  const thr = mk(); thr.g.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.strictEqual(thr.F.fallBlocked('book'), true, '⛔ 저장소가 막힌 창은 막힘(종전 — 열 때마다 시한을 안 낸다)');
  assert.doesNotThrow(() => { thr.F.fallBack('book', 'hello'); thr.F.fallOk('book'); });
});
ta('FB2 물러날 때마다 clog 한 줄 {k:err, c:fallback:<판>:<까닭>:<연속>, d} — 값 칸 없음 · Worker /clog · 판 글자는 a-z·- 20자로', async () => {
  const ls = LSf(), beacons = [], g = { T: 1.7e12, localStorage: ls, setTimeout, clearTimeout, URL, console: { info() {}, log() {}, warn() {} },
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)', sendBeacon: (u, b) => { beacons.push([u, JSON.parse(b)]); return true; } },
    document: { addEventListener() {} }, addEventListener() {} };
  g.window = g; g.Date = { now: () => g.T }; vm.createContext(g); vm.runInContext(CODE, g, { filename: 'onf-frame.js' });
  const F = g.ONF.frame;
  F.fallBack('book', 'hello'); F.fallBack('book', 'hello'); F.fallBack('home', 'late-notice'); F.fallBack('thome', 'fail-<b>"TOKEN"');
  assert.deepStrictEqual(beacons.map((b) => b[1]), [[{ k: 'err', c: 'fallback:book:hello:1', d: 'ios' }], [{ k: 'err', c: 'fallback:book:hello:2', d: 'ios' }],
    [{ k: 'err', c: 'fallback:home:late-notice:0', d: 'ios' }], [{ k: 'err', c: 'fallback:thome:fail-b:1', d: 'ios' }]], '⛔ 기록 꼴');
  assert.ok(beacons.every((b) => b[0] === F.WORKER + '/clog'), '⛔ Worker /clog 가 아니다');
  //   학생 껍데기 판 물러남이 실제로 한 줄을 낸다(setup 경로 · 교재 hello 시한)
  const bs = [], s = setup({ pre: (gg) => { gg.navigator = { userAgent: 'node', sendBeacon: (u, b) => { bs.push(JSON.parse(b)[0].c); return true; } }; } });
  s.send({ onf: 'openBook', href: E1, out: 1 }, s.homeInner); outWin(s, s.panels()[0]); s.fire(2500);
  assert.deepStrictEqual(bs, ['fallback:book:hello:1'], '⛔ 교재 판 물러남 기록이 없다');
});
ta('FB3 한 함수 — 물러남 칸(onfOutFail·onfOutFailHome·onfTOutFail)을 적고 읽는 곳은 onf-frame.js fallBack/fallBlocked/fallOk 뿐 · 껍데기들엔 지우기(out=1·tout=1)와 선생님 머리 tPre 읽기만 · 86400000 「하루」 직접 비교 0', async () => {
  const T = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8'), I = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const keys = /onfOutFail(?!Home)|onfOutFailHome|onfTOutFail|OUT_FAIL|TOUT_FAIL/;
  const bad = [];
  for (const [nm, src] of [['onf-frame.js', CODE], ['teacher/index.html', T], ['index.html', I]]) {
    src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n').forEach((ln, i) => {   // 덩이 주석은 줄 수만 남기고 비운다
      const code = ln.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
      if (!keys.test(code)) return;
      const ok = /var FALL_KEY = /.test(code) || /removeItem\((?:'onfOutFail|'onfTOutFail|TOUT_FAIL)/.test(code) || /var TOUT_FAIL = 'onfTOutFail'/.test(code)
        || /ls\.getItem\('onfTOutFail'\) \|\| ''\)\.split\(','\)\[0\]/.test(code);
      if (!ok) bad.push(nm + ':' + (i + 1) + ' ' + code.trim().slice(0, 120));
    });
  }
  assert.deepStrictEqual(bad, [], '⛔ 물러남 칸을 공용 함수 밖에서 만진다');
  const bare = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/OUT_FAIL_MS|coldMissKill|OUT_COLD_MISS|86400000\)/.test(bare(CODE) + bare(T)), '⛔ 옛 하루 규칙(OUT_FAIL_MS·coldMissKill)이 남았다');
  assert.ok(/ONF\.frame\.fallBack\('thome'/.test(T) && /ONF\.frame\.fallBack\('book'/.test(T) && /ONF\.frame\.fallOk\('thome'\)/.test(T) && /ONF\.frame\.fallBlocked\('thome'\)/.test(T) && /ONF\.frame\.fallBlocked\('book'\)/.test(T), '⛔ 선생님 껍데기가 공용 함수를 안 쓴다');
});

(async () => {
  for (const [label, fn] of AT) {
    try { await fn(); console.log('  ✅ ' + label); pass++; }
    catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
  }
  console.log('\n통과 ' + pass + ' / 실패 ' + fail);
  process.exit(fail ? 1 : 0);
})();
