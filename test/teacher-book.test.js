/* teacher/index.html 의 「선생님 홈 옆 판」(onf-book:begin ~ onf-book:end 표지 구간)만 잰다 — 2026-10-12 Peter
   「선생님 홈에서 교재를 열면 왜 새 창으로? 학생 홈처럼 창으로 열리고 전체 화면으로 바꿀 수 있게」.
   잰다: ① caps 는 내 액자(후손)·googleusercontent 에만 그 출처로 ② 주소는 아는 값만 · 선생님 보기 값(t·ttok·tas) 그대로 · embed=1 · 남의 주소·토큰 없는 주소는 안 연다
        ③ 메뉴 옆(left) · 남의 left 는 안 믿는다 ④ 판 액자의 bookFull·bookClose·openBook(갈아 끼우기) · 닫으면 홈에 bookClosed
        ⑤ 홈의 bookDismiss(탭 바꿈) · Esc ⑥ unload 처리기 0
   껍데기 전체는 구글 로그인 때문에 vm 에서 못 돌린다 — 표지 구간만 떼어 돌린다.
   실행: node test/teacher-book.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const A = src.indexOf('/* onf-book:begin */'), B = src.indexOf('/* onf-book:end */');
const HA = src.indexOf('/* onf-hist:begin */'), HB = src.indexOf('/* onf-hist:end */');   // 📱 폰 판 검사는 홈 기록 다리(onf-hist)와 같이 돌린다(판 칸·홈 칸이 한 기록에 쌓인다)
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
const ORIGIN = 'https://n-abc-script.googleusercontent.com';
const EXEC = 'https://script.google.com/macros/s/BOOKAPP/exec';
function win(name, parent) { const w = { name, sent: [] }; w.parent = parent || w; w.postMessage = (m, o) => w.sent.push([m, o]); return w; }

function run(o) {
  o = o || {};
  const L = {};
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = () => { const el = { kids: [], attrs: {}, className: '', src: '', vars: {}, innerHTML: '',
    style: { setProperty(k, v) { el.vars[k] = v; }, removeProperty(k) { delete el.vars[k]; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; }, getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
    L: {}, addEventListener(k, f) { (el.L[k] = el.L[k] || []).push(f); } }; return el; };   // 🔐 판 액자 load(우회 openExec — 아래 🔐 검사)
  const top = win('shell');
  const homeExec = win('home-exec', top), home = win('home-user', win('home-sbx', homeExec));
  const frame = { contentWindow: homeExec };
  const g = { URL, top, frame, innerWidth: 1440, location: { href: 'https://class.ownify.co.kr/teacher/' },
    document: { body, createElement: mkEl, documentElement: { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; },
      classList: { set: new Set(), toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } } } }, ONF: { api: { EXEC } }, localStorage: { s: {}, getItem(k) { return k in this.s ? this.s[k] : null; }, setItem(k, v) { this.s[k] = String(v); } },
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter((x) => x !== f); } };
  const timers = [];
  g.setTimeout = (f, ms) => { timers.push({ f, ms, on: true }); return timers.length; };
  g.clearTimeout = (id) => { if (timers[id - 1]) timers[id - 1].on = false; };
  g.window = g;
  if (o.pre) o.pre(g, home);
  vm.createContext(g);
  //   🔐 o.frame — 진짜 onf-frame.js 를 먼저 싣는다(선생님 껍데기가 <script> 로 싣는 그것 · 판 우회 openExec)
  if (o.frame) { g.navigator = { userAgent: 'node' }; vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' }); }
  vm.runInContext(src.slice(A, B) + (o.hist ? src.slice(HA, HB) : ''), g, { filename: 'teacher-book' });
  const send = (data, source, origin) => (L.message || []).forEach((f) => f({ data, source, origin: origin || ORIGIN }));
  const panel = () => body.kids.find((k) => k.className === 'onf-bookpanel');
  const panels = () => body.kids.filter((k) => k.className === 'onf-bookpanel');
  return { g, L, home, top, send, panel, panels, timers };
}
const TURL = 'https://class.ownify.co.kr/young-s1-e1-jungah?mode=share&t=STUTOK&ttok=CRED&tas=Peter&evil=1';

console.log('[선생님 홈 옆 판 — 껍데기]');
t('표지 구간이 하나 있다', () => { assert.ok(A > 0 && B > A && (src.match(/onf-book:begin/g) || []).length === 1, '표지가 없다'); });

t('caps — 내 액자 후손·googleusercontent 에만 그 출처로 · 남의 창·남의 출처엔 안 답한다', () => {
  const s = run();
  const stranger = win('stranger', s.top);
  s.send({ onf: 'bookHello' }, stranger);
  s.send({ onf: 'bookHello' }, s.home, 'https://evil.example.com');
  assert.strictEqual(stranger.sent.length + s.home.sent.length, 0, '⛔ 남의 창·출처에 caps 를 답했다');
  s.send({ onf: 'bookHello' }, s.home);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.home.sent)), [[{ onf: 'caps', book: 1, phone: 1 }, ORIGIN]], '⛔ caps 가 없거나 * 로 갔다(📱 선생님 폰 판은 기본 켬 — phone:1)');
});

t('주소 — 아는 값만(선생님 보기 t·ttok·tas 포함) · 짧은 주소는 slug · embed=1 · 교재 앱(ONF.api.EXEC)으로', () => {
  const s = run();
  const f = s.g.teacherBookSrc;
  assert.strictEqual(f(TURL), EXEC + '?t=STUTOK&mode=share&ttok=CRED&tas=Peter&slug=young-s1-e1-jungah&embed=1', '⛔ 판 주소가 틀렸다');
  assert.strictEqual(f('https://class.ownify.co.kr/?mode=mine&t=STUTOK&ttok=M&tas=Peter&view=Friends%20S2'), EXEC + '?t=STUTOK&mode=mine&view=Friends%20S2&ttok=M&tas=Peter&embed=1', '⛔ 내 문장 주소');
  assert.strictEqual(f('https://class.ownify.co.kr/?mode=share&fileId=F'), null, '⛔ 학생 토큰 없는 주소를 연다');
  assert.strictEqual(f('https://evil.example.com/a-s1-e1-b?mode=share&t=X'), null, '⛔ 남의 사이트');
  assert.strictEqual(f('https://class.ownify.co.kr/?mode=hw&t=X'), null, '⛔ 교재·내 문장 밖 주소');
  assert.ok(!/evil/.test(f(TURL)), '⛔ 모르는 값을 실어 보낸다');
});

t('홈의 openBook → 메뉴 옆 판 · 남의 창 openBook 은 버린다 · 남의 left 는 안 믿는다', () => {
  let s = run();
  s.send({ onf: 'openBook', href: TURL, left: 184 }, win('stranger', s.top));
  assert.ok(!s.panel(), '⛔ 남의 창 말로 판이 열렸다');
  s.send({ onf: 'openBook', href: TURL, left: 184 }, s.home);
  const p = s.panel();
  assert.ok(p && p.kids[0].src.indexOf(EXEC + '?') === 0 && p.classList.contains('beside') && p.vars['--bl'] === '184px', '⛔ 판이 안 열렸거나 메뉴 옆이 아니다');
  assert.ok(p.kids[1] && p.kids[1].className === 'onf-wait', '⛔ 판에 「불러오는 중」이 없다');
  for (const bad of [0, 2000, '184']) {
    s = run(); s.send({ onf: 'openBook', href: TURL, left: bad }, s.home);
    assert.ok(!s.panel().classList.contains('beside'), '⛔ 믿지 못할 left 로 판 자리를 바꿨다: ' + bad);
  }
});

t('판 자리 B — 홈이 알린 메뉴 끝·여백·모서리(left·m·r)로 칸을 덮는다 · 남의 m·r 은 기본값 (2026-10-16 Peter 「B로 가자」)', () => {
  const s = run();
  s.send({ onf: 'openBook', href: TURL, left: 270, m: 22, r: 28 }, s.home);
  const p = s.panel();
  assert.ok(p.classList.contains('beside') && p.vars['--bl'] === '270px' && p.vars['--bm'] === '22px' && p.vars['--br'] === '28px');
  for (const bad of [-1, 41, '22', NaN, undefined]) {
    const s2 = run();
    s2.send({ onf: 'openBook', href: TURL, left: 270, m: bad, r: bad }, s2.home);
    assert.ok(s2.panel().vars['--bl'] === '270px' && !('--bm' in s2.panel().vars) && !('--br' in s2.panel().vars), '⛔ 믿지 못할 m·r 을 받았다: ' + String(bad));
  }
});
t('숨긴 판(bookWarm panel:1)도 보일 때와 같은 칸 값으로 만든다', () => {
  const s = run();
  s.send({ onf: 'bookWarm', href: TURL, panel: 1, left: 270, m: 22, r: 28 }, s.home);
  const p = s.panel();
  assert.ok(p.classList.contains('park') && p.vars['--bl'] === '270px' && p.vars['--bm'] === '22px' && p.vars['--br'] === '28px');
});
t('bookBox — 창 크기가 바뀌면 보이는 판·숨긴 판 모두 새 칸 · 다시 안 불러옴 · 내 액자 말만', () => {
  const s = run();
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e2'), panel: 1, left: 270, m: 22, r: 28 }, s.home);
  s.send({ onf: 'openBook', href: TURL, left: 270, m: 22, r: 28 }, s.home);
  const before = s.panels().map((p) => [p, p.kids[0], p.kids[0].src]);
  s.send({ onf: 'bookBox', left: 224, m: 12, r: 22 }, win('stranger', s.top));
  assert.ok(s.panels().every((p) => p.vars['--bl'] === '270px'), '⛔ 남의 창 bookBox 로 칸을 바꿨다');
  s.send({ onf: 'bookBox', left: 224, m: 12, r: 22 }, s.home);
  assert.ok(s.panels().every((p) => p.vars['--bl'] === '224px' && p.vars['--bm'] === '12px' && p.vars['--br'] === '22px'), '⛔ 판 하나라도 새 칸이 아니다');
  assert.deepStrictEqual(s.panels().map((p) => [p, p.kids[0], p.kids[0].src]), before, '⛔ 판·액자·주소가 바뀌었다(다시 불러옴)');
});

t('판 액자 — 전체 화면 · 닫기(홈에 bookClosed 한 번) · 판 안 openBook 은 판만 갈아 끼움 · 홈 액자가 보낸 bookClose 는 버린다', () => {
  const s = run();
  s.send({ onf: 'openBook', href: TURL, left: 184 }, s.home);
  const p = s.panel(), bookWin = win('book-exec', s.top), inner = win('book-user', bookWin);
  p.kids[0].contentWindow = bookWin;
  s.send({ onf: 'bookFull', on: true }, inner);
  assert.ok(p.classList.contains('full'), '⛔ 전체 화면이 안 된다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/?mode=mine&t=STUTOK&ttok=M&tas=Peter' }, inner);
  const q = s.panel();
  assert.ok(s.panels().length === 1 && q !== p && /mode=mine/.test(q.kids[0].src) && q.classList.contains('beside'), '⛔ 판 안에서 내 문장으로 안 바꿨다(또는 자리가 바뀌었다 · 노크 없던 옛 판은 지운다)');
  const qInner = win('book-user2', win('book-exec2', s.top));
  q.kids[0].contentWindow = qInner.parent;
  s.send({ onf: 'bookClose' }, s.home);
  assert.ok(s.panel(), '⛔ 홈 액자의 bookClose 로 닫혔다');
  s.home.sent.length = 0;
  s.send({ onf: 'bookClose' }, qInner);
  assert.ok(!s.panel(), '⛔ 판 액자의 bookClose 로 안 닫혔다(노크 없는 판은 지운다)');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.home.sent)), [[{ onf: 'bookClosed' }, ORIGIN]], '⛔ 닫혔다는 말이 홈에 안 갔다');
});

t('홈의 bookDismiss(탭 바꿈) · Esc 로 닫는다', () => {
  let s = run();
  s.send({ onf: 'openBook', href: TURL }, s.home);
  s.send({ onf: 'bookDismiss' }, s.home);
  assert.ok(!s.panel(), '⛔ 탭을 바꿨는데 판이 남았다');
  s = run();
  s.send({ onf: 'openBook', href: TURL }, s.home);
  s.L.keydown.forEach((f) => f({ key: 'Escape' }));
  assert.ok(!s.panel(), '⛔ Esc 로 안 닫힌다');
});

t('📖 숨긴 판(2026-10-13) — 닫으면 숨김(.park) · 교재에 bookPark(노크한 창·출처로만) · 같은 주소는 그 판 그대로 · 노크는 판 액자·https googleusercontent 만', () => {
  const s = run(), js = (x) => JSON.parse(JSON.stringify(x));
  s.send({ onf: 'openBook', href: TURL, left: 184 }, s.home);
  const p = s.panel(), src0 = p.kids[0].src, bw = win('book-exec', s.top), bi = win('book-user', win('book-sbx', bw));
  p.kids[0].contentWindow = bw;
  s.send({ onf: 'bookHi' }, win('stranger', s.top));
  s.send({ onf: 'bookHi' }, bi, 'http://n-abc-script.googleusercontent.com');
  assert.strictEqual(bi.sent.length, 0, '⛔ 남의 창·http 출처 노크에 답했다');
  s.send({ onf: 'bookHi' }, bi);
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, ORIGIN]], '⛔ 노크에 지금 상태를 그 출처로 안 답했다');
  s.home.sent.length = 0; bi.sent.length = 0;
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(s.panels().length === 1 && p.classList.contains('park'), '⛔ 닫았는데 지웠다(또는 안 숨겼다)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: true }, ORIGIN]], '⛔ 숨겼는데 교재에 「대기」를 안 알렸다(학생 화면에 「선생님 접속 중」이 남는다)');
  assert.deepStrictEqual(js(s.home.sent), [[{ onf: 'bookClosed' }, ORIGIN]], '⛔ 닫혔다는 말이 홈에 안 갔다');
  //   숨긴 판은 말을 못 가로챈다 · Esc·탭 바꿈은 보이는 판만
  s.send({ onf: 'bookFull', on: true }, bi); s.send({ onf: 'openBook', href: TURL.replace('e1', 'e2') }, bi);
  s.L.keydown.forEach((f) => f({ key: 'Escape' })); s.send({ onf: 'bookDismiss' }, s.home);
  assert.ok(s.panels().length === 1 && !p.classList.contains('full') && s.home.sent.length === 1, '⛔ 숨긴 판의 말·Esc·탭 바꿈이 판을 건드렸다');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: TURL, left: 184 }, s.home);
  assert.ok(s.panels().length === 1 && !p.classList.contains('park') && p.kids[0].src === src0, '⛔ 같은 교재를 다시 열었는데 숨긴 판을 안 썼다');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, ORIGIN]], '⛔ 다시 보였는데 「보임」을 안 알렸다');  const idle = () => s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000);
  assert.strictEqual(idle().length, 0, '⛔ 다시 보인 판의 30분 시계를 안 멈췄다(보는 중에 지워진다)');
  //   다른 교재 셋 더 — 셋까지(10-14) · 가장 오래 안 쓴 숨긴 판부터 지운다 · 숨긴 채 30분이면 지운다
  const knock = (box, n) => { const ki = win('book-user' + n, win('book-exec' + n, s.top)); box.kids[0].contentWindow = ki.parent; s.send({ onf: 'bookHi' }, ki); };
  s.send({ onf: 'openBook', href: TURL.replace('e1', 'e2'), left: 184 }, s.home);
  const q = s.panels().find((x) => x !== p);
  knock(q, 2);
  assert.ok(p.classList.contains('park') && !q.classList.contains('park'), '⛔ 다른 교재를 열었는데 보이던 판을 안 숨겼다');
  s.send({ onf: 'openBook', href: TURL.replace('e1', 'e3'), left: 184 }, s.home);
  const r = s.panels().find((x) => x !== p && x !== q);
  knock(r, 3);
  assert.ok(s.panels().length === 3 && p.classList.contains('park') && q.classList.contains('park'), '⛔ 셋째 판 — 셋까지 둘 수 있는데 숨긴 판을 지웠다');
  //   E1 → E3 을 다시 열면 가장 오래 안 쓴 것은 E2 — 넷째(E4)는 E2 를 비킨다(만든 순서가 아니라 쓴 순서)
  s.send({ onf: 'openBook', href: TURL, left: 184 }, s.home);
  s.send({ onf: 'openBook', href: TURL.replace('e1', 'e3'), left: 184 }, s.home);
  s.send({ onf: 'openBook', href: TURL.replace('e1', 'e4'), left: 184 }, s.home);
  assert.ok(s.panels().length === 3 && s.panels().indexOf(q) < 0 && s.panels().indexOf(p) >= 0 && s.panels().indexOf(r) >= 0, '⛔ 넷째 판 — 가장 오래 안 쓴 숨긴 판(E2)을 안 지웠다(만든 순서로 지웠다)');
  assert.strictEqual(idle().length, 2, '⛔ 숨긴 판(E1·E3)에 30분 시계가 하나씩이 아니다');
  idle()[0].f();
  assert.ok(s.panels().length === 2 && s.panels().indexOf(p) < 0, '⛔ 30분 숨긴 판을 안 지웠다');
});

t('📖 미리 띄우기(bookWarm panel:1 · 2026-10-13) — 홈 액자 말만 · 숨긴 판 · 주소에 park=1 · 메뉴 옆 · 같은 주소 한 번 · 셋까지(차면 가장 오래 안 쓴 숨긴 판을 비킴 · 보이는 판은 그대로 · 10-14) · panel 없으면 안 함 · 숨긴 채 30분이면 지움', () => {
  const s = run();
  s.send({ onf: 'bookWarm', href: TURL, panel: 1, left: 184 }, win('stranger', s.top));
  s.send({ onf: 'bookWarm', href: TURL, left: 184 }, s.home);
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/?mode=hw&t=X', panel: 1 }, s.home);
  assert.strictEqual(s.panels().length, 0, '⛔ 남의 말·panel 없는 말·교재 아닌 주소로 미리 띄웠다');
  s.send({ onf: 'bookWarm', href: TURL, panel: 1, left: 184 }, s.home);
  s.send({ onf: 'bookWarm', href: TURL, panel: 1, left: 184 }, s.home);
  const p = s.panel();
  assert.ok(s.panels().length === 1 && p.classList.contains('park') && /&embed=1&park=1$/.test(p.kids[0].src) && p.classList.contains('beside'), '⛔ 숨긴 판(park=1 · 메뉴 옆)으로 한 번만 안 띄웠다');
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e2'), panel: 1 }, s.home);
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e3'), panel: 1 }, s.home);
  assert.strictEqual(s.panels().length, 3, '⛔ 셋까지 미리 안 띄웠다');
  //   넷째(교재 탭에서 머문 다른 학생) — 가장 오래 안 쓴 숨긴 판(첫 미리 p)을 비키고 띄운다
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e4'), panel: 1 }, s.home);
  assert.ok(s.panels().length === 3 && s.panels().indexOf(p) < 0 && /e4/.test(s.panels()[2].kids[0].src) && s.panels()[2].classList.contains('park'), '⛔ 자리가 찼을 때 가장 오래 안 쓴 숨긴 판을 비키고 띄우지 않았다(또는 넷을 띄웠다)');
  //   보이는 판은 미리 띄우기가 못 지운다 — e2 를 열고(보임) 미리 둘 더
  const e2 = s.panels()[0];
  e2.kids[0].contentWindow = win('book-exec9', s.top); s.send({ onf: 'bookHi' }, win('book-user9', e2.kids[0].contentWindow));
  s.send({ onf: 'openBook', href: TURL.replace('e1', 'e2'), left: 184 }, s.home);
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e5'), panel: 1 }, s.home);
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e6'), panel: 1 }, s.home);
  s.send({ onf: 'bookWarm', href: TURL.replace('e1', 'e7'), panel: 1 }, s.home);   // 이때 보이는 판(E2)이 가장 오래 안 쓴 판이다
  assert.ok(s.panels().length === 3 && s.panels().indexOf(e2) >= 0 && !e2.classList.contains('park'), '⛔ 미리 띄우기가 보이는 판을 지웠다');
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => x.f());
  assert.ok(s.panels().length === 1 && s.panels()[0] === e2, '⛔ 30분 숨긴 판을 안 지웠다(또는 보이는 판을 지웠다)');
});

t('🌙 화면 색 — 선생님 홈(내 액자)이 알린 theme 만 <html data-theme> · localStorage · 남의 창·모르는 값은 버린다 (2026-10-12)', () => {
  const s = run(), root = s.g.document.documentElement, ls = s.g.localStorage.s;
  s.send({ onf: 'theme', v: 'dark' }, win('stranger', s.top));
  s.send({ onf: 'theme', v: 'sepia' }, s.home);
  assert.ok(!('data-theme' in root.attrs) && !('onfTheme' in ls), '⛔ 남의 말·모르는 값으로 화면 색을 바꿨다');
  s.send({ onf: 'theme', v: 'dark' }, s.home);
  assert.ok(root.attrs['data-theme'] === 'dark' && ls.onfTheme === 'dark', '⛔ 선생님 홈이 알린 다크를 안 달았다');
});

t('🌙 다크 2단계 — 판 안 교재가 themeAsk 로 물으면 지금 틀 색을 그 창·그 출처로 답한다 · 선생님 홈이 색을 바꾸면 물었던 교재에도 · 남의 창엔 안 답한다 (2026-10-13)', () => {
  const s = run(), root = s.g.document.documentElement, js = (x) => JSON.parse(JSON.stringify(x));
  root.getAttribute = (k) => root.attrs[k];
  s.send({ onf: 'theme', v: 'dark' }, s.home);
  s.send({ onf: 'openBook', href: TURL }, s.home);
  const bookExec = win('book-exec', s.top), bookInner = win('book-user', win('book-sbx', bookExec));
  s.panel().kids[0].contentWindow = bookExec;
  s.send({ onf: 'themeAsk' }, win('stranger', s.top));
  s.send({ onf: 'themeAsk' }, bookInner);
  assert.deepStrictEqual(js(bookInner.sent), [[{ onf: 'theme', v: 'dark' }, ORIGIN]], '⛔ 판 안 교재 물음에 지금 색(다크)을 안 답했다');
  s.send({ onf: 'theme', v: 'light' }, s.home);
  assert.deepStrictEqual(js(bookInner.sent.slice(-1)), [[{ onf: 'theme', v: 'light' }, ORIGIN]], '⛔ 선생님 홈이 바꾼 색을 교재에 안 알렸다');
});

t('⛔ 판 블록에 unload 처리기가 없다(bfcache)', () => {
  assert.ok(!/addEventListener\(\s*['"](?:before)?unload['"]|onunload\s*=/.test(src.slice(A, B)));
  assert.ok(/<script src="\.\.\/assets\/onf-api\.js"><\/script>/.test(src), '⛔ 교재 앱 주소(onf-api.js)를 안 싣는다');
});

/* ═══ 📱 폰 판(2026-10-14 Peter 아이폰 — 「교재를 열면 새 탭이 떠서 뒤로가기를 못 한다 · [열기]가 팝업 차단됨」) ═══
   학생 껍데기 book-panel.test.js 「📱」 검사들의 쌍둥이 — 판 블록 + 홈 기록 다리(onf-hist) 를 한 문맥에서 돌린다(판 칸과 홈 칸이 한 기록에 쌓인다).
   history 는 칸을 구조화 복제로 저장하는 가짜 세션 기록(브라우저처럼 back·go 는 나중에 popstate — flush). */
const WIDE_Q = '(min-width:1100px) and (hover:hover) and (pointer:fine)';
const E1 = TURL, E2 = TURL.replace('e1', 'e2'), E3 = TURL.replace('e1', 'e3');
function phoneRun(o) {
  o = o || {};
  const H = { st: [{ state: o.startState || null }], i: 0, to: [], goes: [], backs: 0, replaced: 0,
    get state() { return this.st[this.i].state; },
    pushState(st) { this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(st)) }); this.i++; },
    replaceState(st) { this.replaced++; this.st[this.i].state = st; },
    back() { this.backs++; this.to.push(Math.max(0, this.i - 1)); },
    go(n) { this.goes.push(n); this.to.push(Math.max(0, Math.min(this.st.length - 1, this.i + n))); } };
  const mq = { matches: !!o.wide, fns: [], addEventListener(k, f) { if (k === 'change') this.fns.push(f); } };
  const s = run({ hist: true, pre(g, home) {
    g.history = H; g.URLSearchParams = URLSearchParams; g.location.search = o.search || '';
    g.matchMedia = (q) => { assert.strictEqual(q, WIDE_Q, '⛔ 폰 물음이 선생님 홈 dhBookWide 와 다르다'); return mq; };
    Object.assign(g.localStorage.s, o.ls || {});
    g.appWin = home; g.appOrigin = ORIGIN;                    // 로그인 노크(onf-knock)가 정해 두는 홈 창 — 홈 기록 다리가 그 창 말만 받는다
    if (o.vv) g.visualViewport = Object.assign({ addEventListener() {} }, o.vv);
  } });
  s.H = H; s.mq = mq; s.root = s.g.document.documentElement;
  s.pop = () => { if (H.to.length) H.i = H.to.shift(); (s.L.popstate || []).forEach((f) => f({})); };
  s.flush = () => { let n = 0; while (H.to.length && n++ < 9) s.pop(); };
  s.browserBack = () => { H.i = Math.max(0, H.i - 1); (s.L.popstate || []).forEach((f) => f({})); };
  s.flip = (wide) => { mq.matches = wide; mq.fns.forEach((f) => f()); };
  s.hist = (data, w, origin) => s.send(Object.assign({ onf: 'hist' }, data), w, origin);
  s.hi = (box, n) => { const bw = win('book-exec' + (n || ''), s.top), bi = win('book-user' + (n || ''), win('book-sbx' + (n || ''), bw)); box.kids[0].contentWindow = bw; s.send({ onf: 'bookHi' }, bi); bi.sent.length = 0; return bi; };
  return s;
}
const jsn = (x) => JSON.parse(JSON.stringify(x));
const hp = (w) => jsn(w.sent).filter((x) => x[0].onf === 'hist-pop').map((x) => x[0].id);

t('📱 스위치 — 기본 켬(caps phone:1) · 주소 phonepanel=0 이면 끄고 이 기기에 기억(선생님 키 onfThPhonePanel) · 꺼지면 폰 폭이어도 onf-ph·판 칸 없음 · 학생 키(onfPhonePanel)는 안 본다 · phonepanel=1 이 기억된 끔을 이긴다', () => {
  const caps = (s) => { s.send({ onf: 'bookHello' }, s.home); return jsn(s.home.sent.find((x) => x[0].onf === 'caps')[0]); };
  let s = phoneRun({ ls: { onfPhonePanel: '0' } });
  assert.deepStrictEqual(caps(s), { onf: 'caps', book: 1, phone: 1 }, '⛔ 기본이 켬이 아니다(또는 학생 스위치 키를 봤다)');
  assert.ok(s.root.classList.contains('onf-ph'), '⛔ 폰 폭인데 <html> 에 onf-ph 가 없다');
  s = phoneRun({ search: '?phonepanel=0' });
  assert.deepStrictEqual(caps(s), { onf: 'caps', book: 1, phone: 0 }, '⛔ phonepanel=0 인데 phone:1 — 홈이 폰에서 판으로 보낸다');
  assert.strictEqual(s.g.localStorage.s.onfThPhonePanel, '0', '⛔ 끈 것을 이 기기에 기억 안 했다(다음에 주소 없이 열면 다시 켜진다)');
  assert.ok(!s.root.classList.contains('onf-ph'), '⛔ 꺼졌는데 폰 모양(onf-ph)');
  s.send({ onf: 'openBook', href: E1, left: 0 }, s.home);
  assert.strictEqual(s.H.st.length, 1, '⛔ 꺼졌는데 판 칸을 넣었다');
  s = phoneRun({ ls: { onfThPhonePanel: '0' } });
  assert.strictEqual(caps(s).phone, 0, '⛔ 기억한 끔을 안 따랐다');
  s = phoneRun({ ls: { onfThPhonePanel: '0' }, search: '?mode=student&phonepanel=1' });
  assert.ok(caps(s).phone === 1 && s.g.localStorage.s.onfThPhonePanel === '1', '⛔ phonepanel=1 이 기억된 끔을 못 이겼다');
});

t('📱 폰 — 홈 openBook → 판 하나(화면 전체 <html onf-ph> · left 가 와도 메뉴 옆 모양은 CSS 가 안 먹인다) · 최상위 기록에 판 칸 {onfBook, n, bd} · 같은 판을 또 열면 칸 안 늘림 · PC 는 판 칸 없음(종전)', () => {
  const s = phoneRun();
  s.send({ onf: 'openBook', href: E1, left: 0 }, s.home);
  const p = s.panel();
  assert.ok(p && !p.classList.contains('park') && !p.classList.contains('beside'), '⛔ 폰 판이 안 보인다(또는 메뉴 옆 자리)');
  assert.deepStrictEqual(s.H.state, { onfBook: 1, n: 0, bd: 1 }, '⛔ 판 칸이 최상위 기록에 안 들어갔다');
  s.hi(p);
  s.send({ onf: 'openBook', href: E1 }, s.home);
  assert.strictEqual(s.H.st.length, 2, '⛔ 보이는 판을 또 열었는데 판 칸이 또 쌓였다(뒤로 두 번이 필요)');
  const pc = phoneRun({ wide: true });
  pc.send({ onf: 'openBook', href: E1, left: 184 }, pc.home);
  assert.ok(pc.H.st.length === 1 && !pc.root.classList.contains('onf-ph') && pc.panel().classList.contains('beside'), '⛔ PC 판에 판 칸을 넣었다(또는 폰 모양)');
  assert.ok(/<link rel="stylesheet" href="\.\.\/assets\/onf-ui\.css">/.test(src), '⛔ 폰 판 모양(.onf-ph .onf-bookpanel)을 싣는 CSS 가 없다');
});

t('📱 뒤로(popstate) = 숨김(지우지 않음) · 교재에 「대기」 · 홈에 bookClosed · 홈에 hist-pop 은 홈 칸 그대로(바닥이면 빈 id) · 다시 누르면 같은 판 0초 + 판 칸 다시', () => {
  const s = phoneRun();
  s.send({ onf: 'openBook', href: E1 }, s.home);
  const p = s.panel(), src0 = p.kids[0].src, bi = s.hi(p);
  s.home.sent.length = 0;
  s.browserBack();
  assert.ok(s.panels().length === 1 && p.classList.contains('park'), '⛔ 뒤로가 판을 지웠다(또는 안 숨겼다)');
  assert.deepStrictEqual(jsn(bi.sent), [[{ onf: 'bookPark', on: true }, ORIGIN]], '⛔ 숨겼는데 교재에 「대기」를 안 알렸다(학생 화면에 「선생님 접속 중」이 남는다)');
  assert.deepStrictEqual(jsn(s.home.sent).map((x) => x[0].onf), ['bookClosed', 'hist-pop'], '⛔ 뒤로로 닫았는데 홈에 bookClosed·제 칸 알림이 안 갔다');
  assert.deepStrictEqual(hp(s.home), [''], '⛔ 홈에 엉뚱한 칸을 알렸다');
  s.send({ onf: 'openBook', href: E1 }, s.home);
  assert.ok(s.panels().length === 1 && s.panel() === p && !p.classList.contains('park') && p.kids[0].src === src0, '⛔ 다시 누르니 새로 받았다(0초가 아니다)');
  assert.ok(s.H.st.length === 2 && s.H.state.onfBook === 1, '⛔ 다시 보인 판에 판 칸이 없다(다음 뒤로가 홈을 떠난다)');
});

t('📱 ✕ = 숨김 + 판 칸 줄만 걷기(go(-bd)) — 홈 칸은 안 걷는다 · 판·홈 back 이 남의 칸을 못 걷는다 · 판 칸이 맨 위면 홈 hello 가 기록을 안 흔든다 · 홈엔 그 홈 칸 그대로 알림', () => {
  const s = phoneRun();
  s.hist({ op: 'push', id: 'homeA1', state: { onfPeek: 'p1' } }, s.home);
  assert.deepStrictEqual(s.H.state, { onfHist: 'homeA1', s: { onfPeek: 'p1' }, n: 1 }, '전제: 홈 칸 하나(학생 창)');
  s.send({ onf: 'openBook', href: E1 }, s.home);
  assert.deepStrictEqual(s.H.state, { onfBook: 1, n: 1, bd: 1 }, '⛔ 판 칸의 n(아래 홈 칸 수)·bd 가 틀렸다');
  const p = s.panel(), bi = s.hi(p);
  s.hist({ op: 'hi' }, bi);
  s.hist({ op: 'back', id: 'homeA1' }, bi);
  s.hist({ op: 'back', id: 'homeA1' }, s.home);
  s.hist({ op: 'hello' }, s.home);
  assert.ok(s.H.backs === 0 && s.H.goes.length === 0, '⛔ 판 칸이 맨 위인데 back·hello 가 기록을 흔들었다(판 칸부터 걷는다)');
  s.home.sent.length = 0;
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(p.classList.contains('park') && s.panels().length === 1, '⛔ ✕ 가 판을 안 숨겼다(또는 지웠다)');
  assert.deepStrictEqual(s.H.goes, [-1], '⛔ ✕ 가 판 칸 하나만 걷지 않았다(홈 칸까지 걷거나 안 걷음)');
  s.flush();
  assert.ok(s.H.i === 1 && s.H.state.onfHist === 'homeA1', '⛔ ✕ 뒤 홈 칸(학생 창)이 사라졌다');
  assert.deepStrictEqual(hp(s.home), ['homeA1'], '⛔ 홈에 자기 맨 위 칸(homeA1)을 안 알렸다(비었다고 하면 학생 창이 닫힌다)');
  assert.strictEqual(jsn(s.home.sent).filter((x) => x[0].onf === 'bookClosed').length, 1, '⛔ bookClosed 가 한 번이 아니다');
  s.hist({ op: 'back', id: 'homeA1' }, s.home);
  assert.strictEqual(s.H.backs, 1, '전제: 판이 걷힌 뒤 홈은 제 칸을 걷는다(검사가 눈멀지 않았다)');
});

t('📱 판 안 창(카드·응용) 칸도 최상위 — 노크(hist hi)는 폰 판만 그 출처로 hist-on(PC 판·남의 출처는 안 답함) · 칸 {onfHist, s, n, b, bd} · 뒤로 → 그 판에만 hist-pop(홈엔 안 감) · 한 번 더 → 판 숨김 · 숨긴 판은 못 민다 · 홈은 판 안 칸을 못 걷는다 · ✕ 는 판 칸 줄 통째', () => {
  const s = phoneRun();
  s.send({ onf: 'openBook', href: E1 }, s.home);
  const p = s.panel(), bi = s.hi(p);
  s.hist({ op: 'hi' }, bi, 'https://evil.example.com');
  assert.strictEqual(bi.sent.length, 0, '⛔ 남의 출처 노크에 hist-on');
  s.hist({ op: 'hi' }, bi);
  assert.deepStrictEqual(jsn(bi.sent), [[{ onf: 'hist-on' }, ORIGIN]], '⛔ 폰 판 안쪽 노크에 hist-on 을 그 출처로 안 답했다(창 칸이 액자 안에 쌓인다 — 아이폰 3초 덮개)');
  bi.sent.length = 0; s.home.sent.length = 0;
  s.hist({ op: 'push', id: 'c1', state: { onfCards: 't1' } }, bi);
  assert.deepStrictEqual(s.H.state, { onfHist: 'c1', s: { onfCards: 't1' }, n: 0, b: 1, bd: 2 }, '⛔ 판 안 창 칸 모양이 틀렸다');
  s.browserBack();
  assert.deepStrictEqual(hp(bi), [''], '⛔ 창 칸이 빠졌는데 판 안쪽에 안 알렸다(창이 안 닫힌다)');
  assert.ok(!p.classList.contains('park') && s.home.sent.length === 0, '⛔ 창 칸 뒤로가 판을 숨겼다(또는 홈에 알렸다 — 홈 창이 닫힌다)');
  s.browserBack();
  assert.ok(p.classList.contains('park'), '⛔ 판 칸 뒤로가 판을 안 숨겼다');
  const n0 = s.H.st.length;
  s.hist({ op: 'push', id: 'c2', state: { onfCards: 't2' } }, bi);
  assert.strictEqual(s.H.st.length, n0, '⛔ 숨긴 판이 칸을 밀었다(보이지 않는 칸이 뒤로를 먹는다)');
  s.send({ onf: 'openBook', href: E1 }, s.home);
  s.hist({ op: 'push', id: 'c3', state: { onfAp: 'a' } }, bi);
  s.hist({ op: 'back', id: 'c3' }, s.home);
  assert.strictEqual(s.H.backs, 0, '⛔ 홈이 판 안 칸을 back 으로 걷었다');
  s.hist({ op: 'back', id: 'c3' }, bi);
  assert.strictEqual(s.H.backs, 1, '⛔ 판 안쪽이 자기 맨 위 칸을 못 걷는다(✕ 로 창을 닫아도 칸이 남는다)');
  s.flush();
  s.hist({ op: 'push', id: 'c4', state: { onfAp: 'b' } }, bi);
  s.H.goes.length = 0;
  s.send({ onf: 'bookClose' }, bi);
  assert.deepStrictEqual(s.H.goes, [-2], '⛔ ✕ 가 판 칸 줄(판 칸 + 창 칸)을 통째로 안 걷었다');
  bi.sent.length = 0; s.flush();
  assert.deepStrictEqual(hp(bi), [''], '⛔ ✕ 뒤 판 안쪽에 「칸 없음」을 안 알렸다(다시 열면 창이 떠 있다)');
  const pc = phoneRun({ wide: true });
  pc.send({ onf: 'openBook', href: E1 }, pc.home);
  const pi = pc.hi(pc.panel());
  pc.hist({ op: 'hi' }, pi);
  assert.strictEqual(pi.sent.length, 0, '⛔ PC 판 노크에 hist-on — PC 판은 종전대로 액자 안 기록');
});

t('📱 판 안에서 다른 교재·⭐ 내 문장 → 새 판 칸이 위에 · 뒤로 = 앞 판 · 그 판이 지워졌으면 그 주소로 다시 받는다 · 폰 판 자리 2 · 맨 아래면 판 없음', () => {
  const s = phoneRun();
  s.send({ onf: 'openBook', href: E1 }, s.home);
  const a = s.panel(), ai = s.hi(a, 1), aSrc = a.kids[0].src;
  s.send({ onf: 'openBook', href: E2 }, ai);
  const b = s.panels().find((x) => x !== a), bi = s.hi(b, 2);
  assert.ok(a.classList.contains('park') && !b.classList.contains('park') && s.H.st.length === 3 && s.H.state.bd === 2, '⛔ 판 안 openBook 이 새 판 칸을 위에 안 쌓았다');
  s.send({ onf: 'openBook', href: E3 }, bi);
  const c = s.panels().find((x) => x !== a && x !== b);
  assert.ok(s.panels().length === 2 && s.panels().indexOf(a) < 0, '⛔ 폰 판 자리가 2 가 아니다(가장 오래 안 쓴 숨긴 판부터 지운다)');
  s.hi(c, 3);
  s.browserBack();
  assert.ok(!b.classList.contains('park') && c.classList.contains('park'), '⛔ 뒤로가 앞 판(E2)을 안 보였다');
  s.browserBack();
  const a2 = s.panels().find((x) => !x.classList.contains('park'));
  assert.ok(a2 && a2 !== a && a2.kids[0].src === aSrc && s.panels().length === 2, '⛔ 지워진 판(E1)의 칸으로 돌아왔는데 그 주소로 다시 안 받았다(또는 자리 2 를 넘었다)');
  s.browserBack();
  assert.ok(s.panels().every((x) => x.classList.contains('park')), '⛔ 맨 아래로 왔는데 판이 보인다');
});

t('📱 폭이 바뀜 — PC 판(보임) → 폰: 화면 전체 · 판 칸 넣음(뒤로 = 숨김) · 자리 2 로 줄임 / 폰 → PC: 판 그대로 · ✕ 가 남은 판 칸을 걷는다 · PC 의 뒤로는 판을 안 건드림', () => {
  const s = phoneRun({ wide: true }), inner = [];
  [E1, E2, E3].forEach((h, i) => { s.send({ onf: 'openBook', href: h, left: 184 }, s.home); inner.push(s.hi(s.panels()[s.panels().length - 1], i)); });
  assert.ok(s.panels().length === 3 && s.H.st.length === 1, '전제: PC 판 셋 · 판 칸 없음');
  const v = s.panels()[2], vi = inner[2];
  s.flip(false);
  assert.ok(s.root.classList.contains('onf-ph') && s.panels().length === 2 && !v.classList.contains('park'), '⛔ 폰이 됐는데 모양·자리(2)가 안 바뀌었다(또는 보이던 판을 숨겼다)');
  assert.ok(s.H.st.length === 2 && s.H.state.onfBook > 0 && s.H.state.bd === 1, '⛔ 폰이 됐는데 보이는 판에 판 칸이 없다(뒤로가 홈을 떠난다)');
  s.browserBack();
  assert.ok(v.classList.contains('park'), '⛔ 폰이 된 뒤 뒤로가 판을 안 숨겼다');
  s.send({ onf: 'openBook', href: E3 }, s.home);
  s.flip(true);
  assert.ok(!s.root.classList.contains('onf-ph') && !v.classList.contains('park'), '⛔ PC 가 됐는데 모양이 안 바뀌었다(또는 판을 숨겼다)');
  s.H.goes.length = 0;
  s.send({ onf: 'bookClose' }, vi);
  assert.deepStrictEqual(s.H.goes, [-1], '⛔ PC 가 된 뒤 ✕ 가 남은 판 칸을 안 걷었다(뒤로 한 번이 헛돈다)');
  s.flush();
  s.send({ onf: 'openBook', href: E3, left: 184 }, s.home);
  const n0 = s.H.st.length;
  s.browserBack();
  assert.ok(!v.classList.contains('park') && n0 === s.H.st.length, '⛔ PC 의 뒤로가 판을 숨겼다(또는 PC 가 판 칸을 넣었다)');
});

t('📱 키보드 높이·밀림 보정은 **보이는 폰 판**에 — 판 교재의 frameHello 창·출처로 kbH(\'*\' 아님) · 그 판 액자에 translateY · 숨기면 밀림을 푼다 · 홈·PC 판엔 안 보낸다', () => {
  const s = phoneRun({ vv: { height: 400, offsetTop: 30, scale: 1 } });
  const kb = (w) => jsn(w.sent).filter((x) => x[0].onf === 'kbH').map((x) => x[0].h + '/' + x[0].top + '@' + x[1]);
  s.send({ onf: 'frameHello' }, s.home);
  assert.deepStrictEqual(kb(s.home), [], '⛔ 홈 액자에 키보드 높이를 보냈다(종전대로 안 한다)');
  s.send({ onf: 'openBook', href: E1 }, s.home);
  const p = s.panel(), bi = s.hi(p);
  s.send({ onf: 'frameHello' }, bi);
  assert.deepStrictEqual(kb(bi), ['370/430@' + ORIGIN], '⛔ 폰 판 교재에 키보드 높이(그 출처로)가 안 간다(입력칸이 키보드에 가린다)');
  assert.strictEqual(p.kids[0].style.transform, 'translateY(30px)', '⛔ 밀림 보정이 판 액자에 안 붙었다');
  s.browserBack();
  assert.strictEqual(p.kids[0].style.transform, '', '⛔ 판을 숨겼는데 밀림 보정이 남았다');
  const pc = phoneRun({ wide: true, vv: { height: 400, offsetTop: 0, scale: 1 } });
  pc.send({ onf: 'openBook', href: E1 }, pc.home);
  const pci = pc.hi(pc.panel());
  pc.send({ onf: 'frameHello' }, pci);
  assert.deepStrictEqual(kb(pci), [], '⛔ PC 판 교재에 키보드 높이를 보냈다');
});

t('📱 껍데기가 다시 읽힌 채 남은 판 칸 표식({onfBook})도 지운다(홈 기록 다리 시작 줄) · 남의 state 는 안 건드린다', () => {
  let s = phoneRun({ startState: { onfBook: 1, n: 0, bd: 1 } });
  assert.ok(s.H.replaced === 1 && s.H.state === null, '⛔ 판 칸 표식을 안 지웠다(다시 읽은 뒤 뒤로가 판을 찾는다)');
  s = phoneRun({ startState: { other: 1 } });
  assert.strictEqual(s.H.replaced, 0, '⛔ 남의 state 를 지웠다');
});

console.log('[🔐 선생님 판 — 여러 계정 우회(onf-frame.js openExec 쌍둥이) · 반박 검토 🟡4 2026-10-16]');
t('🔐 선생님 판도 우회 길 — 못 연 판(안내)을 다시 열면 지우고 새로 받는다 · load 전에 지운 판의 노크 듣기를 걷는다', () => {
  const s = run({ frame: true });
  const n0 = s.L.message.length;
  s.send({ onf: 'openBook', href: TURL }, s.home);
  const box = s.panel(), el = box.kids[0];
  assert.strictEqual(s.L.message.length, n0 + 1, '⛔ 선생님 판이 우회 길(openExec)을 안 탄다');
  el.contentWindow = { length: 0, location: { get href() { throw new Error('cross-origin'); }, replace() {} } };
  el.contentWindow.parent = el.contentWindow;
  (el.L.load || []).forEach((f) => f({}));
  s.timers.filter((x) => x.on && x.ms === 1500).forEach((x) => { x.on = false; x.f(); });
  assert.ok(box.kids[1].kids.some((k) => k.className === 'onf-stuck'), '못 연 판 안내(대역 확인)');
  s.send({ onf: 'openBook', href: TURL }, s.home);
  assert.ok(s.panels().length === 1 && s.panel() !== box, '⛔ 못 연 선생님 판을 다시 보였다(안내 그대로)');
  s.send({ onf: 'bookDismiss' }, s.home);
  assert.ok(!s.panel() && s.L.message.length === n0, '⛔ 지운 선생님 판의 노크 듣기가 남았다');
});

console.log('[앞 판 규칙 — 2026-10-16 Peter 「B로 가자」 창 B안 ② (설계 4.4) · 학생 껍데기 book-panel.test.js 의 쌍둥이]');
const MYS = 'https://class.ownify.co.kr/?mode=mine&t=STUTOK&ttok=M&tas=Peter', shownOf = (s) => s.panels().filter((p) => !p.classList.contains('park'));
/* 판 하나에 교재 창을 붙이고 노크(bookHi)까지 — 새 교재가 뜨면 하는 일 */
function bookKnock(s, box, n) { const bw = win('book-exec' + (n || ''), s.top), bi = win('book-user' + (n || ''), win('book-sbx' + (n || ''), bw)); box.kids[0].contentWindow = bw; s.send({ onf: 'bookHi' }, bi); bi.sent.length = 0; return bi; }
/* 교재(E1)를 홈에서 열고 노크 → 그 안에서 내 문장(MYS)을 열고 노크. 판·안쪽 창·첫 액자 src 를 돌려준다. */
function backRun(s) {
  s = s || run();
  s.send({ onf: 'openBook', href: E1, left: 270, m: 22, r: 28 }, s.home);
  const book = s.panel(), bi = bookKnock(s, book, 1), src0 = book.kids[0].src;
  s.send({ onf: 'openBook', href: MYS }, bi);
  const mine = s.panels().find((p) => p !== book), mi = bookKnock(s, mine, 2);
  return { s, book, bi, mine, mi, src0 };
}

t('판 안에서 연 판을 닫으면 앞 판이 보인다 — 같은 판·같은 액자(다시 안 불러옴) · Esc 도 같다 (설계 4.4 앞 판 규칙)', () => {
  const { s, book, bi, mine, mi, src0 } = backRun();
  assert.ok(book.classList.contains('park') && !mine.classList.contains('park'), '전제: 내 문장이 보이고 교재는 숨었다');
  bi.sent.length = 0; mi.sent.length = 0; s.home.sent.length = 0;
  s.send({ onf: 'bookClose' }, mi);
  assert.ok(!book.classList.contains('park') && mine.classList.contains('park') && s.panels().length === 2 && s.panels().includes(book) && book.kids[0].src === src0 && book.kids[0].src.indexOf('park=1') < 0, '⛔ 닫으니 앞 판(교재)이 안 보이거나 새로 받았다(src 가 바뀌었다)');
  assert.ok(book.vars['--bl'] === '270px' && book.vars['--bm'] === '22px' && book.vars['--br'] === '28px', '⛔ 앞 판이 보이는데 칸 값(left·m·r)이 달라졌다');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(bi.sent)), [[{ onf: 'bookPark', on: false }, ORIGIN]], '⛔ 앞 판 교재에 「보임」을 안 알렸다');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(mi.sent)), [[{ onf: 'bookPark', on: true }, ORIGIN]], '⛔ 닫힌 내 문장에 「대기」를 안 알렸다');
  assert.strictEqual(s.home.sent.length, 0, '⛔ 창이 아직 열려 있는데 홈에 bookClosed 를 알렸다');
  //   Esc 도 한 단계 — 앞 판 → 다시 Esc = 홈(보이는 판 없음 · 이때 bookClosed 한 번)
  s.send({ onf: 'openBook', href: MYS }, bi);
  assert.ok(mine === shownOf(s)[0] && shownOf(s).length === 1, '전제: 다시 내 문장');
  s.L.keydown.forEach((f) => f({ key: 'Escape' }));
  assert.ok(shownOf(s)[0] === book && shownOf(s).length === 1, '⛔ Esc 가 앞 판으로 안 갔다');
  s.L.keydown.forEach((f) => f({ key: 'Escape' }));
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 앞 판이 없는 판에서 Esc 가 홈으로 안 갔다');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.home.sent)), [[{ onf: 'bookClosed' }, ORIGIN]], '⛔ 홈으로 나갈 때 bookClosed 가 한 번이 아니다');
});

t('돌아가기 고리 — 교재 → 내 문장 → 「교재에서 보기」(같은 교재 판) → ✕ = 홈(왔다 갔다 해도 안 늘어남)', () => {
  const { s, book, bi, mine, mi, src0 } = backRun();
  for (let i = 0; i < 3; i++) {
    s.send({ onf: 'openBook', href: E1 }, mi);                // 내 문장 → 교재(같은 판) = 돌아간 것
    assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === book && s.panels().length === 2 && book.kids[0].src === src0, '⛔ 「교재에서 보기」가 같은 교재 판을 안 보였다(' + i + ')');
    s.send({ onf: 'openBook', href: MYS }, bi);               // 교재 → 내 문장
    assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === mine && s.panels().length === 2, '⛔ 다시 내 문장이 안 보였다(' + i + ')');
  }
  s.send({ onf: 'bookClose' }, mi);                           // 내 문장 ✕ = 교재(앞 판)
  assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === book, '⛔ 왔다 갔다 한 뒤 내 문장 ✕ 가 앞 판(교재)을 안 보였다');
  s.send({ onf: 'bookClose' }, bi);                           // 교재 ✕ = 홈 — 교재가 내 문장을 앞 판으로 기억하면 둘이 번갈아 보인다
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 왔다 갔다 한 뒤 교재 ✕ 가 홈으로 안 갔다(서로를 앞 판으로 기억한다 — 판 둘이 번갈아 보인다)');
  //   교재에서 끝나는 쪽도 같다 — 내 문장에서 「교재에서 보기」로 돌아간 직후 ✕ = 홈
  s.send({ onf: 'openBook', href: MYS }, bi);
  s.send({ onf: 'openBook', href: E1 }, mi);
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 돌아간 직후 ✕ 가 홈으로 안 갔다');
  s.send({ onf: 'bookClose' }, mi);                           // 숨은 판의 말은 못 가로챈다 — 그대로 홈
  assert.ok(shownOf(s).length === 0, '⛔ 숨은 판의 ✕ 가 판을 보였다');
});

t('앞 판이 이미 지워졌으면(30분 안 씀 · 판 셋 넘침) 닫기 = 홈 · 새로 안 받는다', () => {
  const { s, book, mine, mi } = backRun();
  const n = s.panels().length;
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => { x.on = false; x.f(); });   // 숨긴 채 BOOK_IDLE_MS — 교재 판이 지워진다
  assert.ok(!s.panels().includes(book) && s.panels().length === n - 1, '전제: 앞 판(교재)이 30분에 지워졌다');
  s.send({ onf: 'bookClose' }, mi);
  assert.ok(shownOf(s).length === 0 && s.panels().length <= n - 1 && s.panels().every((p) => p === mine), '⛔ 지워진 앞 판을 다시 불러왔다(또는 홈으로 안 갔다)');
  //   판 셋 넘침으로 밀려난 경우도 같다: 교재 → 내 문장 → E3 → E4 (네 번째가 가장 오래 안 쓴 숨긴 판 = 교재를 비킨다)
  const c = backRun();
  c.s.send({ onf: 'openBook', href: E3 }, c.mi);
  const e3 = c.s.panels().find((p) => p !== c.book && p !== c.mine), i3 = bookKnock(c.s, e3, 3);
  c.s.send({ onf: 'openBook', href: TURL.replace('e1', 'e4') }, i3);
  assert.ok(!c.s.panels().includes(c.book) && c.s.panels().length === 3, '전제: 판 셋 넘침으로 교재가 밀려났다');
  c.s.send({ onf: 'bookClose' }, bookKnock(c.s, shownOf(c.s)[0], 4));   // E4 닫기 → E3
  assert.ok(shownOf(c.s)[0] === e3 && shownOf(c.s).length === 1, '⛔ E4 를 닫았는데 앞 판 E3 이 안 보인다');
  c.s.send({ onf: 'bookClose' }, i3);                         // E3 닫기 → 내 문장
  assert.ok(shownOf(c.s)[0] === c.mine && shownOf(c.s).length === 1, '⛔ E3 을 닫았는데 앞 판(내 문장)이 안 보인다');
  c.s.send({ onf: 'bookClose' }, c.mi);                       // 내 문장 닫기 → 앞 판(교재)은 밀려났다 = 홈
  assert.ok(shownOf(c.s).length === 0 && c.s.panels().length === 3 && !c.s.panels().includes(c.book), '⛔ 밀려난 앞 판을 다시 불러왔다(또는 홈으로 안 갔다)');
});

t('전부 닫기 — 판의 bookClose{all:1}(교재 「홈」)·홈의 bookDismiss(메뉴 누름)는 앞 판을 안 보인다 · 홈에서 다시 연 판은 앞 판 기억이 없다', () => {
  let c = backRun();
  c.s.home.sent.length = 0;
  c.s.send({ onf: 'bookClose', all: 1 }, c.mi);
  assert.ok(shownOf(c.s).length === 0 && c.s.panels().length === 2, '⛔ 「홈」(all:1)이 앞 판을 보였다');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.s.home.sent)), [[{ onf: 'bookClosed' }, ORIGIN]], '⛔ 전부 닫는데 홈에 bookClosed 가 한 번이 아니다');
  c = backRun();
  c.s.send({ onf: 'bookDismiss' }, c.s.home);
  assert.ok(shownOf(c.s).length === 0 && c.s.panels().length === 2, '⛔ 메뉴 누름(bookDismiss)이 앞 판을 보였다');
  c = backRun();
  c.s.send({ onf: 'bookClose', all: 0 }, c.mi);
  assert.ok(shownOf(c.s)[0] === c.book, '⛔ all 이 1 이 아닌데 전부 닫았다(all:1 만 전부 닫기)');
  //   홈에서 다시 연 판은 「나를 열어 준 판」이 없다 — 내 문장을 홈에서 열면 닫을 때 교재가 아니라 홈
  c = backRun();
  c.s.send({ onf: 'openBook', href: MYS, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === c.mine && shownOf(c.s).length === 1, '전제: 홈에서 내 문장을 다시 열었다');
  c.s.send({ onf: 'bookClose' }, c.mi);
  assert.ok(shownOf(c.s).length === 0, '⛔ 홈에서 연 판인데 닫으니 옛 앞 판(교재)이 보인다');
});

t('폰(onf-ph)에선 앞 판 규칙 없음 — 종전(닫으면 판 칸 기록을 걷고 홈)', () => {
  const s = phoneRun();
  s.send({ onf: 'openBook', href: E1 }, s.home);
  const book = s.panel(), bi = s.hi(book, 1);
  s.send({ onf: 'openBook', href: MYS }, bi);
  const mine = s.panels().find((p) => p !== book), mi = s.hi(mine, 2);
  assert.ok(s.root.classList.contains('onf-ph') && book.classList.contains('park') && !mine.classList.contains('park'), '전제: 폰 — 내 문장이 보인다');
  const goes = s.H.goes.length;
  s.send({ onf: 'bookClose' }, mi);
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 폰에서 닫았는데 앞 판이 보인다(폰은 종전: 닫으면 홈)');
  assert.ok(s.H.goes.length === goes + 1, '⛔ 폰 ✕ 가 판 칸 기록을 안 걷었다(종전)');
});

t('앞 판 기억은 한 줄로 이어진다 — 교재 → E2 → 내 문장 → 「교재에서 보기」(E1) 는 돌아간 것: ✕ 가 홈으로 간다(고리가 안 생긴다)', () => {
  const { s, book, bi, mine, mi } = backRun();
  s.send({ onf: 'bookClose' }, mi);                                       // 한 번 내 문장을 닫아 두고(교재가 보임)
  s.send({ onf: 'openBook', href: E2 }, bi);                              // 교재 → E2
  const e2 = shownOf(s)[0], i2 = bookKnock(s, e2, 5);
  assert.ok(e2 !== book && s.panels().length === 3, '전제: E2 판이 떴다');
  s.send({ onf: 'openBook', href: MYS }, i2);                             // E2 → 내 문장(기존 판)
  assert.ok(shownOf(s)[0] === mine, '전제: 내 문장');
  s.send({ onf: 'openBook', href: E1 }, mi);                              // 내 문장 → 교재 — E2 를 거쳐 교재가 열어 준 길이다 = 돌아감
  assert.ok(shownOf(s)[0] === book && shownOf(s).length === 1, '전제: 교재가 보인다');
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(shownOf(s).length === 0, '⛔ 교재 ✕ 가 홈으로 안 갔다 — 교재 ← 내 문장 ← E2 ← 교재 고리가 생겼다(✕ 가 끝없이 돈다)');
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
