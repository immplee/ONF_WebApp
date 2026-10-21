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

/* 📖 o.lsRaw — 빈 localStorage 로 시작(새 기기). 없으면 onfThSwap '0'(판 한 장 끔) — 종전 길 검사들이 끔을 전제로 쓰였다(2026-10-21 기본 켬) · 기본 켬 자체는 H7 이 잰다. */
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
  const g = { URL, URLSearchParams, top, frame, innerWidth: 1440, location: { href: 'https://class.ownify.co.kr/teacher/' },
    document: { body, createElement: mkEl, documentElement: { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; },
      classList: { set: new Set(), toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } } } }, ONF: { api: { EXEC } }, localStorage: { s: o.lsRaw ? {} : { onfThSwap: '0' }, getItem(k) { return k in this.s ? this.s[k] : null; }, setItem(k, v) { this.s[k] = String(v); } },
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter((x) => x !== f); } };
  const timers = [];
  g.setTimeout = (f, ms) => { timers.push({ f, ms, on: true }); return timers.length; };
  g.clearTimeout = (id) => { if (timers[id - 1]) timers[id - 1].on = false; };
  g.window = g;
  if (o.pre) o.pre(g, home);
  vm.createContext(g);
  //   🔐 o.frame — 진짜 onf-frame.js 를 먼저 싣는다(선생님 껍데기가 <script> 로 싣는 그것 · 판 우회 openExec)
  if (o.frame) { g.navigator = { userAgent: 'node' }; vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' }); }
  const blk = src.slice(A, B), mblk = o.mut ? o.mut(blk) : blk;   // o.mut = 판 블록 변이(☁️ 사본 힌트 검사)
  if (o.mut) assert.notStrictEqual(mblk, blk, '변이 자리');
  vm.runInContext(mblk + (o.hist ? src.slice(HA, HB) : ''), g, { filename: 'teacher-book' });
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
  const s = run({ hist: true, lsRaw: o.lsRaw, mut: o.mut, pre(g, home) {
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
  for (let i = 0; i < 2; i++) {   // 🔁 한 번 다시 연 뒤에도 안 됨(2026-10-22)
    (el.L.load || []).forEach((f) => f({}));
    s.timers.filter((x) => x.on && x.ms === 1500).forEach((x) => { x.on = false; x.f(); });
  }
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

/* ═══ 📖 교재 판 한 장 1d — 홈에서 연 판 하나가 다른 교재로 갈아 끼운다 (설계 ONF_SlackBot docs/2026-10-15-교재판-한장-설계.md §5.1 · 갈래 표 2·3 · H1~H9) ═══
   판 쪽 약속(Ownify ONF_Share_WebApp_Html onfBookSwap): 노크 bookHi 는 두 번(둘째에 swap:1 — ONF_BOARD 가 evaluate 뒤에 붙는다) · {onf:'bookSwap', id, src} → {onf:'bookSwapped', id, ok, why, from, ms}
   · 진 갈아 끼우기엔 답이 없다 · {onf:'bookFetch', src} = 값만 받아 두기. */
console.log('[📖 교재 판 한 장 1d — 갈아 끼우기]');
const E4 = TURL.replace('e1', 'e4');
const srcOf = (s, h) => s.g.teacherBookSrc(h);
const T14 = (s) => s.timers.filter((x) => x.on && x.ms === 14000);
const sentOf = (w) => jsn(w.sent).map((x) => x[0]);
/* 판 노크 — 첫 노크(swap 없음) 뒤 둘째 노크(swap:1). swap === false 면 첫 노크만(옛 교재 · 스위치 꺼진 서버). */
function swapKnock(s, box, n, swap) {
  const bw = win('book-exec' + (n || ''), s.top), bi = win('book-user' + (n || ''), win('book-sbx' + (n || ''), bw));
  box.kids[0].contentWindow = bw;
  s.send({ onf: 'bookHi', views: 'line' }, bi);
  if (swap !== false) s.send({ onf: 'bookHi', views: 'line', swap: 1 }, bi);
  bi.sent.length = 0;
  return bi;
}
/* S1(갈래 표 2): PC · 스위치 켬 · 홈에서 연 판 P(E1)가 노크 swap:1 뒤 닫혀 숨김. o.search 로 주소 질의를 바꾼다(기본 ?swap=1). */
function boardRun(o) {
  o = o || {};
  const s = phoneRun({ wide: !o.phone, search: o.search != null ? o.search : '?swap=1', ls: o.ls, mut: o.mut });
  s.send({ onf: 'openBook', href: E1, left: 270, m: 22, r: 28 }, s.home);
  const P = s.panel(), src0 = P.kids[0].src, bi = swapKnock(s, P, 1, o.swap);
  if (o.phone) s.browserBack(); else s.send({ onf: 'bookClose' }, bi);
  bi.sent.length = 0; s.home.sent.length = 0;
  return { s, P, bi, src0, obj: () => s.g.books.find((b) => b.box === P) };
}
const swapMsg = (bi) => sentOf(bi).filter((m) => m.onf === 'bookSwap');

t('H1 — 홈에서 연 판이 있으면 [열기] = bookSwap(새 액자 0 · 같은 액자 · 그 창·그 출처로) · 같은 주소 다시 = 말 0 · 판 칸 값 그대로', () => {
  const { s, P, bi, src0 } = boardRun();
  assert.ok(P.classList.contains('park') && s.panels().length === 1, '전제: P 숨김');
  s.send({ onf: 'openBook', href: E2, left: 270, m: 22, r: 28 }, s.home);
  assert.ok(s.panels().length === 1 && !P.classList.contains('park') && P.kids[0].src === src0, '⛔ 갈아 끼우지 않고 새 판을 띄웠다(또는 P 를 안 보였다 · 액자를 다시 불렀다)');
  const m = swapMsg(bi);
  assert.ok(m.length === 1 && m[0].src === srcOf(s, E2) && typeof m[0].id === 'number' && m[0].id > 0, '⛔ bookSwap{id, src} 가 판에 안 갔다');
  assert.ok(jsn(bi.sent).every((x) => x[1] === ORIGIN), "⛔ 판에 '*' 나 남의 출처로 보냈다");
  s.send({ onf: 'bookSwapped', id: m[0].id, ok: true, why: '', from: 'cache', ms: 40 }, bi);
  assert.strictEqual(T14(s).length, 0, '⛔ 답(ok)을 받았는데 14초 시계가 남았다(진 교재가 새 판으로 뜬다)');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: E2, left: 270, m: 22, r: 28 }, s.home);
  assert.ok(bi.sent.length === 0 && s.panels().length === 1 && !P.classList.contains('park'), '⛔ 같은 주소인데 또 말을 보냈다(0초 길이 아니다)');
  s.send({ onf: 'bookClose' }, bi);
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  assert.ok(swapMsg(bi).length === 1 && swapMsg(bi)[0].src === srcOf(s, E1) && s.panels().length === 1, '⛔ 갈아 끼운 판을 옛 주소(E1)로 찾았다 — 판은 이제 E2 다');
});

t('H1 ☁️ 사본 힌트(2026-10-21) — 홈 openBook 의 cf 는 꼴이 맞을 때만 세 칸 그대로 bookSwap 에 · 꼴 틀림·없음 = 종전 말 · bookWarm(→ bookFetch)·판 안 openBook·뒤로엔 안 실음 · 기록 칸에 없음 · 답 vis → 홈 속도표 · 변이로', () => {
  const CF = { f: 'F_th_000001', s: 'E2_x', k: 'v1.eyJmIjoiRiJ9.sig-test-not-live', extra: 'x' };
  const go = (o) => {
    const b = boardRun(Object.assign({ search: '?swap=1&perf=1' }, o || {}));
    b.s.send({ onf: 'openBook', href: E2, left: 270, cf: CF }, b.s.home);
    return Object.assign(b, { m: swapMsg(b.bi) });
  };
  const r = go();
  assert.deepStrictEqual(r.m.map((x) => x.cf), [{ f: CF.f, s: CF.s, k: CF.k }], '⛔ 꼴 맞는 힌트를 세 칸 그대로 안 실었다(또는 딴 칸까지 실었다)');
  r.s.send({ onf: 'bookSwapped', id: r.m[0].id, ok: true, from: 'cf', ms: 2600, vis: 310 }, r.bi);
  const pf = sentOf(r.s.home).filter((x) => x.onf === 'bookPerf');
  assert.deepStrictEqual(pf.map((x) => [x.from, x.vis]), [['cf', 310]], '⛔ 홈 속도표에 사본·보인 ms 가 안 갔다: ' + JSON.stringify(pf));
  assert.ok(!JSON.stringify(r.s.H.st).includes(CF.k), '⛔ 입장권이 기록 칸에 남았다');
  //   꼴 틀림 — 각각 칸 없음(종전 말)
  for (const bad of [{ f: 'short', s: 'E1', k: CF.k }, { f: CF.f, s: '', k: CF.k }, { f: CF.f, s: 'x'.repeat(101), k: CF.k }, { f: CF.f, s: 'E1', k: 'v2.a.b' }, { f: CF.f, s: 'E1', k: 'v1.' + 'a'.repeat(700) + '.b' }, 'str', null]) {
    const b = boardRun(); b.s.send({ onf: 'openBook', href: E2, left: 270, cf: bad }, b.s.home);
    assert.ok(swapMsg(b.bi).length === 1 && !('cf' in swapMsg(b.bi)[0]), '⛔ 꼴 틀린 힌트를 실었다: ' + JSON.stringify(bad));
  }
  //   미리 받기(bookWarm → 판 bookFetch)엔 안 싣는다
  const w = boardRun(); w.s.send({ onf: 'bookWarm', href: E3, panel: 1, left: 270, cf: CF }, w.s.home);
  assert.ok(sentOf(w.bi).filter((x) => x.onf === 'bookFetch').every((x) => !('cf' in x)), '⛔ bookFetch 에 힌트를 실었다');
  //   판 안에서 온 openBook(cf 를 실어도) — 판으로 안 갈아 끼우니 힌트도 없다
  const ins = boardRun(); ins.s.send({ onf: 'openBook', href: E1, left: 270 }, ins.s.home); ins.bi.sent.length = 0;
  ins.s.send({ onf: 'openBook', href: E3, cf: CF }, ins.bi);
  assert.ok(swapMsg(ins.bi).every((x) => !('cf' in x)), '⛔ 판 안 openBook 의 힌트를 실었다');
  //   변이 — 꼴 검사 빼고 그대로 싣기
  const m = boardRun({ mut: (x) => x.replace('if (c) msg.cf = c;', 'if (cf) msg.cf = cf;') });
  m.s.send({ onf: 'openBook', href: E2, left: 270, cf: CF }, m.s.home);
  assert.ok(swapMsg(m.bi)[0].cf && swapMsg(m.bi)[0].cf.extra === 'x', '⛔ 변이(꼴 검사 뺌)가 안 먹었다');
});

t('H1 ☁️ 반박 — 마지막 갈아 끼우기가 끝나 주소를 되돌린 뒤 늦게 온 앞 번호 ok 는 주소(real·src)를 다시 안 바꾼다 · 자격 내린 판(gone)도 · 기다리는 동안 온 ok 는 종전대로 real', () => {
  const { s, bi, obj } = boardRun();
  s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
  s.send({ onf: 'openBook', href: E3, left: 270 }, s.home);
  const [m1, m2] = swapMsg(bi);
  s.send({ onf: 'bookSwapped', id: m2.id, ok: false, why: 'busy' }, bi);
  const p = obj();
  assert.strictEqual(p.real, srcOf(s, E1), '전제: 되돌림');
  s.send({ onf: 'bookSwapped', id: m1.id, ok: true, from: 'cf' }, bi);
  assert.deepStrictEqual([p.real, p.src], [srcOf(s, E1), srcOf(s, E1)], '⛔ 늦은 ok 가 되돌린 주소를 바꿨다(주소 A · 내용 B)');
  //   기다리는 동안 온 앞 번호 ok — 종전대로 real 만(마지막이 실패하면 거기로 되돌린다)
  const b = boardRun();
  b.s.send({ onf: 'openBook', href: E2, left: 270 }, b.s.home); b.s.send({ onf: 'openBook', href: E3, left: 270 }, b.s.home);
  const [n1] = swapMsg(b.bi);
  b.s.send({ onf: 'bookSwapped', id: n1.id, ok: true, from: 'server' }, b.bi);
  assert.strictEqual(b.obj().real, srcOf(b.s, E2), '⛔ 기다리는 동안 온 앞 번호 ok 를 버렸다(종전 동작)');
});

t('H1 cur — bookSwap 은 판이 **지금 든 주소**(p.real)를 cur 로 싣는다(Ownify 판의 떠나기 전 담기 열쇠 · 학생 껍데기와 같다) · 처음 = 판을 연 주소 · ok 뒤 = 그 주소 · 물러남 뒤 = 되돌린 주소', () => {
  const { s, bi } = boardRun();
  s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
  let m = swapMsg(bi);
  assert.strictEqual(m[0].cur, srcOf(s, E1), '⛔ 첫 갈아 끼우기에 판을 연 주소(E1)를 안 실었다');
  s.send({ onf: 'openBook', href: E4, left: 270 }, s.home);   // 앞 것(E2)이 답 전 — 판은 아직 E1
  assert.strictEqual(swapMsg(bi)[1].cur, srcOf(s, E1), '⛔ 답 전 둘째 갈아 끼우기의 cur 가 기다리는 주소(E2)다');
  s.send({ onf: 'openBook', href: E2, left: 270 }, s.home); m = swapMsg(bi).slice(-1);
  s.send({ onf: 'bookSwapped', id: m[0].id, ok: true, from: 'server' }, bi);
  s.send({ onf: 'bookClose' }, bi); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: E4, left: 270 }, s.home);
  m = swapMsg(bi);
  assert.strictEqual(m[0].cur, srcOf(s, E2), '⛔ ok 뒤 cur 가 판이 든 E2 가 아니다');
  s.send({ onf: 'bookSwapped', id: m[0].id, ok: false, why: 'busy' }, bi);
  s.send({ onf: 'bookClose' }, bi); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  m = swapMsg(bi);
  assert.ok(m.length === 1 && m[0].cur === srcOf(s, E2), '⛔ 물러난(busy) 뒤 cur 가 되돌린 E2 가 아니다: ' + JSON.stringify(m.map((x) => x.cur)));
});

t('H1 — 판이 아니면 종전(새 판): 스위치 꺼짐 · swap 노크 없음(옛 교재·서버 스위치 끔) · ⭐ 내 문장 주소 · 판 안에서 연 판', () => {
  for (const o of [{ search: '' }, { search: '?swap=0' }, { swap: false }]) {
    const { s, P, bi } = boardRun(o);
    s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
    assert.ok(s.panels().length === 2 && P.classList.contains('park') && swapMsg(bi).length === 0, '⛔ 판이 아닌데 갈아 끼웠다: ' + JSON.stringify(o));
  }
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: MYS, left: 270 }, s.home);
  assert.ok(s.panels().length === 2 && P.classList.contains('park') && swapMsg(bi).length === 0, '⛔ ⭐ 내 문장 주소를 교재 판에 갈아 끼웠다(내 문장 판은 따로 — 설계 §5.4)');
  //   판 안에서 연 판(back 있음)은 판이 아니다 — 그 판만 남았을 때 [열기] 는 새 판
  const c = boardRun();
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  c.s.send({ onf: 'openBook', href: E2 }, c.bi);
  const q = shownOf(c.s)[0], qi = swapKnock(c.s, q, 2);
  c.s.g.bookDrop(c.obj());
  c.s.send({ onf: 'openBook', href: E3, left: 270 }, c.s.home);
  assert.ok(swapMsg(qi).length === 0 && c.s.panels().length === 2, '⛔ 판 안에서 연 판(back 있음)을 판으로 갈아 끼웠다');
});

t('H5·H9 — bookSwap 이 bookPark{on:false} 보다 먼저 · 갈아 끼울 때 openBook 의 left·m·r 로 자리(bookBox 뒤에도)', () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'bookBox', left: 300, m: 20, r: 24 }, s.home);
  assert.ok(P.vars['--bl'] === '300px', '전제: 숨긴 판도 새 칸');
  s.send({ onf: 'openBook', href: E2, left: 310, m: 18, r: 26 }, s.home);
  assert.deepStrictEqual(sentOf(bi).map((m) => m.onf + (m.onf === 'bookPark' ? ':' + m.on : '')), ['bookSwap', 'bookPark:false'], '⛔ 「보임」이 bookSwap 보다 먼저 갔다(판이 A 로 「들어옴」을 알린다 — R12)');
  assert.ok(P.vars['--bl'] === '310px' && P.vars['--bm'] === '18px' && P.vars['--br'] === '26px' && P.classList.contains('beside'), '⛔ 갈아 끼운 판이 openBook 의 칸 값(left·m·r)으로 안 놓였다');
});

t('H2 — ok:false(busy·fail·notice) → 종전 새 판 + 판 숨김 + 판 주소 되돌림(다시 열면 0초) · stale·14초 답 없음 → 판 자격만 내림(액자는 안 지움 · 30분 시계) + 새 판', () => {
  for (const why of ['busy', 'fail', 'notice', 'bad_arg']) {
    const { s, P, bi, src0 } = boardRun();
    s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
    const id = swapMsg(bi)[0].id;
    s.send({ onf: 'bookSwapped', id, ok: false, why, from: '', ms: 3 }, bi);
    const n = shownOf(s)[0];
    assert.ok(s.panels().length === 2 && n !== P && P.classList.contains('park') && n.kids[0].src === srcOf(s, E2), '⛔ ' + why + ' 인데 종전 새 판(E2)으로 안 물러났다(또는 판을 안 숨겼다)');
    assert.ok(n.vars['--bl'] === '270px', '⛔ 물러난 새 판이 openBook 칸 값으로 안 놓였다');
    assert.strictEqual(T14(s).length, 0, '⛔ 물러났는데 14초 시계가 남았다');
    bi.sent.length = 0;
    s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
    assert.ok(shownOf(s)[0] === P && P.kids[0].src === src0 && swapMsg(bi).length === 0, '⛔ ' + why + ' 뒤 판 주소를 안 되돌렸다(E1 을 다시 열면 0초여야 — 판은 E1 을 그대로 들고 있다)');
  }
  /* stale(판 2시간)·14초 답 없음 — ⛔ 판 액자를 **지우지 않는다**(반박 검토 🟠 2026-10-17: 판은 나이 검사를 맺음 앞에서 해 stale 이 곧장 온다 →
     지우면 beforeunload 도 안 돌아 안 보낸 글·오프라인 백업이 사라진다). 판 자격만 내리고 숨긴 채 30분 시계 — 저장을 마친 뒤 30분 지우기·셋 넘침이 치운다. */
  const T30 = (s) => s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000);
  let c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: false, why: 'stale' }, c.bi);
  assert.ok(c.s.panels().includes(c.P) && c.P.parentNode && c.P.classList.contains('park') && shownOf(c.s).length === 1 && shownOf(c.s)[0].kids[0].src === srcOf(c.s, E2), '⛔ stale 에 옛 판 액자를 지웠다(안 보낸 글이 사라진다) — 또는 새 판(E2)을 안 띄웠다');
  assert.strictEqual(c.obj().swap, false, '⛔ stale 판이 아직 판 자격을 들고 있다(다시 갈아 끼우기로 뽑힌다)');
  assert.ok(T30(c.s).length >= 1, '⛔ stale 판에 30분 시계가 없다(영영 안 치운다)');
  c.s.send({ onf: 'bookClose' }, swapKnock(c.s, shownOf(c.s)[0], 7, false));   // 새 E2 판(아직 swap 노크 전)을 닫고
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: E3, left: 270 }, c.s.home);
  assert.ok(swapMsg(c.bi).length === 0, '⛔ stale 판을 다시 판으로 뽑아 갈아 끼웠다');
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] !== c.P, '⛔ stale 판을 E1 주소로 찾아 보였다(판은 바꾸다 던지면 「반쯤 바뀐 판」을 stale 로 답한다 — 내용을 못 믿는다)');
  T30(c.s).forEach((x) => { x.on = false; x.f(); });
  assert.ok(!c.s.panels().includes(c.P), '⛔ 30분 뒤에도 stale 판이 남았다');
  //   숨긴 판이 stale 답을 받았다(그 사이 사람이 닫음) — 지우지 않고 30분 시계만
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.timers.forEach((x) => { if (x.ms === 30 * 60 * 1000) x.on = false; });   // 닫을 때 건 시계를 치우고 — stale 이 다시 거는지 본다
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: false, why: 'stale' }, c.bi);
  assert.ok(c.s.panels().includes(c.P) && shownOf(c.s).length === 0 && T30(c.s).length === 1, '⛔ 숨긴 판의 stale — 지웠거나(안 보낸 글) 30분 시계를 안 걸었다(판이 아니게 됐는데 영영 남는다)');
  //   14초 답 없음 — 같게 하되 판 내용과 주소가 어긋날 수 있으니 아무도 그 판을 주소로 못 찾는다
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  assert.strictEqual(T14(c.s).length, 1, '⛔ 14초 시한이 없다');
  T14(c.s)[0].f();
  assert.ok(c.s.panels().includes(c.P) && c.P.parentNode && c.P.classList.contains('park') && shownOf(c.s).length === 1 && shownOf(c.s)[0].kids[0].src === srcOf(c.s, E2), '⛔ 14초 답 없음 — 옛 판 액자를 지웠다(또는 새 판 E2 가 아니다)');
  assert.ok(c.obj().swap === false && T30(c.s).length >= 1, '⛔ 14초 답 없는 판이 판 자격을 들고 있다(또는 30분 시계가 없다)');
  c.s.send({ onf: 'bookClose' }, swapKnock(c.s, shownOf(c.s)[0], 8, false));
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] !== c.P && swapMsg(c.bi).length === 0, '⛔ 14초 답 없던 판(내용 모름)을 E1 주소로 찾아 보였다');
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] !== c.P, '⛔ 14초 답 없던 판(내용 모름)을 E2 주소로 찾아 보였다');
  //   남의 창·모르는 번호의 답은 버린다
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  const id = swapMsg(c.bi)[0].id;
  c.s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, win('stranger', c.s.top));
  c.s.send({ onf: 'bookSwapped', id: id + 99, ok: false, why: 'busy' }, c.bi);
  c.s.send({ onf: 'bookSwapped', id: id + 99, ok: true, from: 'cache' }, c.bi);   // 모르는 번호의 ok — 판이 든 교재(real)로 믿으면 안 된다
  c.s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, c.s.home);
  assert.ok(c.s.panels().length === 1 && T14(c.s).length === 1, '⛔ 남의 창·모르는 번호·홈 액자의 답으로 물러났다');
  c.s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === c.P && swapMsg(c.bi).length === 0, '⛔ 모르는 번호의 ok 로 판이 든 교재를 바꿔 알았다(E1 을 못 찾는다)');
});

t('H2 — 그 사이 사람이 닫았으면(판 숨김) 물러나도 새 판을 안 띄운다(주소만 되돌림)', () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
  const id = swapMsg(bi)[0].id;
  s.send({ onf: 'bookClose' }, bi);
  s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, bi);
  assert.ok(s.panels().length === 1 && shownOf(s).length === 0, '⛔ 닫은 뒤 늦게 온 busy 가 새 판을 띄웠다');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  assert.ok(shownOf(s)[0] === P && swapMsg(bi).length === 0, '⛔ 주소를 안 되돌렸다');
});

t('판 고르기 — 보이는 판이 먼저(그보다 나중에 생긴 숨긴 판이 있어도) · 기다리던 판을 지우면 그 14초 시한도 걷힌다(14초 뒤 엉뚱한 새 판 없음)', () => {
  const s = phoneRun({ wide: true, search: '?swap=1' });
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  const A = s.panel();
  s.send({ onf: 'bookHi', views: 'line' }, knockWin(s, A, 0));          // A 는 첫 노크만(swap 전) — 판도 노크 전 후보(bookCand)도 아니다
  s.send({ onf: 'bookWarm', href: E3, panel: 1, left: 270 }, s.home);   // 판이 없다 → 종전 숨긴 판(뒤에 생김)
  const C = s.panels().find((x) => x !== A), ai = swapKnock(s, A, 1), ci = swapKnock(s, C, 3);
  assert.ok(!A.classList.contains('park') && C.classList.contains('park'), '전제: A 보임 · C 숨김(나중에 생김)');
  s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
  assert.ok(swapMsg(ai).length === 1 && swapMsg(ci).length === 0 && shownOf(s)[0] === A, '⛔ 보이는 판(A)을 두고 숨긴 판(C)을 갈아 끼웠다');
  s.g.bookDrop(s.g.books.find((b) => b.box === A));
  assert.strictEqual(T14(s).length, 0, '⛔ 지운 판의 갈아 끼우기 시한이 남았다(14초 뒤 새 판이 불쑥 뜬다)');
});

t('갈래 12 — 빠르게 둘(C 뒤 D): 나중 것만 기다린다(시한 하나) · 진 C 의 답 없음은 무해 · C 가 먼저 끝났는데(ok) D 가 실패하면 판 주소는 C', () => {
  let c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'openBook', href: E3, left: 270 }, c.s.home);
  let m = swapMsg(c.bi);
  assert.ok(m.length === 2 && m[1].id > m[0].id && m[1].src === srcOf(c.s, E3) && c.s.panels().length === 1, '⛔ 둘째가 bookSwap 으로 안 갔다');
  assert.strictEqual(T14(c.s).length, 1, '⛔ 진 갈아 끼우기의 14초 시계를 안 걷었다(진 교재가 14초 뒤 새 판으로 뜬다)');
  c.s.send({ onf: 'bookSwapped', id: m[1].id, ok: true, from: 'server', ms: 2600 }, c.bi);
  assert.ok(T14(c.s).length === 0 && c.s.panels().length === 1, '⛔ 나중 것(D) ok 뒤에 시계·판이 남았다');
  //   C 가 받아 둔 값으로 바로 끝나(ok) 그 답이 D 를 보낸 뒤 도착 · D 는 실패 → 판은 C 를 들고 있다
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'openBook', href: E3, left: 270 }, c.s.home);
  m = swapMsg(c.bi);
  c.s.send({ onf: 'bookSwapped', id: m[0].id, ok: true, from: 'cache', ms: 30 }, c.bi);
  assert.strictEqual(T14(c.s).length, 1, '⛔ 진 번호(C)의 답으로 D 기다림을 끝냈다');
  c.s.send({ onf: 'bookSwapped', id: m[1].id, ok: false, why: 'fail' }, c.bi);
  assert.ok(c.s.panels().length === 2 && shownOf(c.s)[0].kids[0].src === srcOf(c.s, E3), '전제: D 는 새 판으로 물러났다');
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === c.P && swapMsg(c.bi).length === 0, '⛔ 판이 실제로 든 C(E2)를 못 찾았다 — 옛 A 로 되돌렸다(C 를 열면 엉뚱한 교재)');
});

t('판이 다시 읽혔다(노크가 다시 옴) — 판 주소를 처음 주소로 · 기다리던 갈아 끼우기는 말이 사라졌으니 물러난다', () => {
  let c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache' }, c.bi);
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.send({ onf: 'bookHi', views: 'line' }, c.bi);                   // 판이 처음 주소(E1)로 다시 읽혔다(오래 산 판의 「다시 시도」 = location.reload)
  c.s.send({ onf: 'bookHi', views: 'line', swap: 1 }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === c.P && swapMsg(c.bi).length === 0, '⛔ 다시 읽힌 판(E1)을 E1 로 못 찾았다');
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  assert.ok(swapMsg(c.bi).length === 1 && c.s.panels().length === 1, '⛔ 다시 읽힌 판을 아직 E2 로 안다(E2 를 열면 E1 이 보인다)');
  //   첫 노크만 왔다(다시 읽히는 중 · swap:1 은 둘째 노크에) — 그 사이엔 판이 아니다(반박 검토 🟡 2026-10-17 · 행동으로 잰다)
  c = boardRun();
  c.s.send({ onf: 'bookHi', views: 'line' }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  assert.ok(swapMsg(c.bi).length === 0 && c.s.panels().length === 2, '⛔ 첫 노크(swap 없음) 뒤에도 옛 swap:1 을 믿고 갈아 끼웠다(다시 읽힌 판이 옛 교재 화면이면 말이 버려진다)');
  //   기다리는 중에 다시 읽힘 → 새 판
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookHi', views: 'line' }, c.bi);
  assert.ok(c.s.panels().length === 2 && shownOf(c.s)[0].kids[0].src === srcOf(c.s, E2) && T14(c.s).length === 0, '⛔ 말이 사라진 갈아 끼우기를 14초 기다린다(또는 새 판을 안 띄웠다)');
});

t('H3 — 미리(bookWarm panel:1): 판 있음 → bookFetch(새 판 0) · 판이 든 주소면 말 0 · 판 없음 → 종전 숨긴 판 · 📱 폰은 판 없으면 미리 판 없음(D1)', () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'bookWarm', href: E3, panel: 1, left: 270 }, s.home);
  assert.ok(s.panels().length === 1 && P.classList.contains('park'), '⛔ 판이 있는데 미리 새 판을 띄웠다(또는 판을 보였다)');
  assert.deepStrictEqual(sentOf(bi), [{ onf: 'bookFetch', src: srcOf(s, E3) }], '⛔ 판에 bookFetch{src} 가 안 갔다');
  bi.sent.length = 0;
  s.send({ onf: 'bookWarm', href: E1, panel: 1 }, s.home);
  s.send({ onf: 'bookWarm', href: MYS, panel: 1 }, s.home);
  assert.ok(sentOf(bi).length === 0, '⛔ 판이 든 주소·내 문장 주소를 bookFetch 로 보냈다');
  const off = boardRun({ search: '' });
  off.s.send({ onf: 'bookWarm', href: E3, panel: 1 }, off.s.home);
  assert.ok(off.s.panels().length === 2 && off.s.panels()[1].classList.contains('park') && sentOf(off.bi).length === 0, '⛔ 스위치 꺼짐인데 종전(숨긴 판 미리)이 아니다');
  const ph = phoneRun({ search: '?swap=1' });
  ph.send({ onf: 'bookWarm', href: E3, panel: 1 }, ph.home);
  assert.strictEqual(ph.panels().length, 0, '⛔ 폰(스위치 켬)인데 판 없이 미리 판을 띄웠다(D1 — 첫 [열기]로 생긴 판을 쓴다)');
  const ph0 = phoneRun();
  ph0.send({ onf: 'bookWarm', href: E3, panel: 1 }, ph0.home);
  assert.strictEqual(ph0.panels().length, 1, '⛔ 스위치 꺼짐 폰의 종전 길이 바뀌었다');
});

t('H6 — 판은 30분 지우기·판 셋 넘침에서 빠진다 · 물러난 판·판 안에서 연 판은 종전대로', () => {
  const { s, P, bi } = boardRun();
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => { x.on = false; x.f(); });
  assert.ok(s.panels().includes(P), '⛔ 판이 숨긴 채 30분에 지워졌다(하루 종일 한 판)');
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  s.send({ onf: 'openBook', href: E2 }, bi);                                  // 판 안에서 E2 → E3 → E4(새 판 셋 · back 있음)
  const q2 = shownOf(s)[0], i2 = swapKnock(s, q2, 2);
  s.send({ onf: 'openBook', href: E3 }, i2);
  const q3 = shownOf(s)[0], i3 = swapKnock(s, q3, 3);
  s.send({ onf: 'openBook', href: E4 }, i3);
  assert.ok(s.panels().length === 3 && s.panels().includes(P) && !s.panels().includes(q2), '⛔ 판 셋 넘침에서 판(P)을 비켰다(가장 오래 안 쓴 「판 아닌」 숨긴 판 q2 를 비켜야)');
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => { x.on = false; x.f(); });
  assert.ok(s.panels().includes(P) && !s.panels().includes(q3), '⛔ 판 안에서 연 숨긴 판의 30분 지우기가 안 돈다(종전)');
});

t('판 나이 — 숨긴 판이 만든 지 2시간 넘었으면 다시 보일 때 새로(옛 코드 그대로 안 뜬다) · 옛 판은 지우지 않고(저장 중일 수 있다) 숨긴 채 30분 시계 · 보이는 판·스위치 끔은 종전 (반박 검토 🟡 2026-10-17)', () => {
  const OLD = 2 * 60 * 60 * 1000 + 1000;
  let c = boardRun();
  c.obj().born -= OLD;
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  const n = shownOf(c.s)[0];
  assert.ok(n && n !== c.P && n.kids[0].src === srcOf(c.s, E1) && c.s.panels().includes(c.P) && c.P.classList.contains('park'), '⛔ 2시간 넘은 숨긴 판을 그대로 보였다(또는 옛 판을 지웠다 — 저장 중일 수 있다)');
  assert.ok(c.obj().swap === false && c.s.timers.some((x) => x.on && x.ms === 30 * 60 * 1000), '⛔ 늙은 판이 판 자격을 들고 있다(또는 30분 시계가 없다)');
  c.s.send({ onf: 'bookClose' }, swapKnock(c.s, n, 9, false));
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === n, '⛔ 새로 띄운 E1 판을 다시 못 찾는다(늙은 판을 또 찾았다)');
  //   보이는 판은 그대로(사람이 쓰는 중) · 스위치 끔은 종전(늙어도 그대로)
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  c.obj().born -= OLD;
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === c.P && c.s.panels().length === 1, '⛔ 보이는 판을 나이로 갈았다');
  c = boardRun({ search: '' });
  c.obj().born -= OLD;
  c.s.send({ onf: 'openBook', href: E1, left: 270 }, c.s.home);
  assert.ok(shownOf(c.s)[0] === c.P && c.s.panels().length === 1, '⛔ 스위치 끔인데 종전(같은 판 0초)이 아니다');
});

t('H8 — 판 안에서 온 openBook 은 bookSwap 0 · 새 판 + back · 판을 갈아 끼우면 그 판을 back 으로 든 판의 back 을 비운다', () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  s.send({ onf: 'openBook', href: E2 }, bi);
  const q = shownOf(s)[0], qi = swapKnock(s, q, 2);
  assert.ok(q !== P && swapMsg(bi).length === 0 && s.panels().length === 2, '⛔ 판 안 openBook 이 판을 갈아 끼웠다');
  s.send({ onf: 'bookClose' }, qi);
  assert.ok(shownOf(s)[0] === P, '⛔ 판 안에서 연 판의 ✕ 가 앞 판(P) 0초가 아니다');
  s.send({ onf: 'openBook', href: E2 }, bi);                                  // 다시 q(back = P)
  s.send({ onf: 'openBook', href: E3, left: 270 }, s.home);                   // 홈에서 E3 → 판 P 를 갈아 끼움(q 는 숨김)
  assert.ok(swapMsg(bi).length === 1 && shownOf(s)[0] === P, '전제: P 를 E3 으로');
  const qo = s.g.books.find((b) => b.box === q);
  assert.strictEqual(qo.back, null, '⛔ 갈아 끼운 판을 back 으로 든 판(q)의 back 이 남았다(✕ 가 엉뚱한 교재를 보인다)');
});

t('H4 — 📱 폰: [열기] → bookSwap · 판 칸 push {onfBook:key(B)} · 뒤로 = 숨김 · 판이 없는 칸으로 돌아오면 판을 그 주소로(새 액자 아님) · 기록 칸에 자격(ttok) 없음', () => {
  const { s, P, bi } = boardRun({ phone: true });
  assert.ok(P.classList.contains('park') && s.H.i === 0, '전제: 폰 판 숨김 · 홈 칸');
  s.send({ onf: 'openBook', href: E2 }, s.home);
  const k2 = s.g.bookKey(srcOf(s, E2));
  assert.ok(swapMsg(bi).length === 1 && s.panels().length === 1 && !P.classList.contains('park'), '⛔ 폰 [열기]가 갈아 끼우지 않았다');
  assert.deepStrictEqual(s.H.state, { onfBook: k2, n: 0, bd: 1 }, '⛔ 갈아 끼운 판 칸이 key(B) 가 아니다(뒤로가 엉뚱한 판을 찾는다)');
  s.send({ onf: 'bookSwapped', id: swapMsg(bi)[0].id, ok: true, from: 'cache' }, bi);
  s.browserBack();
  assert.ok(P.classList.contains('park'), '⛔ 뒤로가 판을 안 숨겼다');
  //   판이 E2 를 든 채 E1 칸으로 돌아온다(앞으로 가기 등) — E1 판은 없다 → 판을 E1 로
  bi.sent.length = 0;
  s.H.st = [{ state: null }, { state: { onfBook: s.g.bookKey(srcOf(s, E1)), n: 0, bd: 1 } }, { state: { onfBook: k2, n: 0, bd: 1 } }]; s.H.i = 2;
  s.browserBack();
  assert.ok(swapMsg(bi).length === 1 && swapMsg(bi)[0].src === srcOf(s, E1) && s.panels().length === 1 && !P.classList.contains('park'), '⛔ 판이 없는 칸으로 돌아왔는데 판을 갈아 끼우지 않았다(새 액자를 띄웠다)');
  assert.ok(!/CRED/.test(JSON.stringify(s.H.st)), '⛔ 기록 칸에 선생님 자격(ttok)이 실렸다');
});

t('H7 — caps: 스위치 켜면 swap:1 · 꺼짐이면 칸 없음(종전 글자 그대로) · 주소 swap=1|0 은 이 기기에 기억(onfThSwap)', () => {
  const caps = (s) => { s.send({ onf: 'bookHello' }, s.home); return jsn(s.home.sent.find((x) => x[0].onf === 'caps')[0]); };
  let s = phoneRun({ wide: true, search: '?swap=1' });
  assert.deepStrictEqual(caps(s), { onf: 'caps', book: 1, phone: 1, swap: 1 }, '⛔ 켰는데 caps 에 swap:1 이 없다');
  assert.strictEqual(s.g.localStorage.s.onfThSwap, '1', '⛔ 켠 것을 이 기기에 기억 안 했다');
  s = phoneRun({ wide: true, ls: { onfThSwap: '1' } });
  assert.strictEqual(caps(s).swap, 1, '⛔ 기억한 켬을 안 따랐다');
  s = phoneRun({ wide: true, ls: { onfThSwap: '1' }, search: '?swap=0' });
  assert.deepStrictEqual(caps(s), { onf: 'caps', book: 1, phone: 1 }, '⛔ swap=0 인데 swap 칸이 있다');
  assert.strictEqual(s.g.localStorage.s.onfThSwap, '0', '⛔ 끈 것을 기억 안 했다');
  s = phoneRun({ wide: true, lsRaw: true, ls: { onfSwap: '0' } });   // 빈 저장소(새 기기) — 검사 장치 기본 끔(onfThSwap '0')을 안 깐다
  assert.strictEqual(caps(s).swap, 1, '⛔ 기본이 켬이 아니다(2026-10-21 Peter 「전체 켜줘」 · 또는 학생 키 onfSwap 을 봤다)');
  assert.ok(!('onfThSwap' in s.g.localStorage.s), '⛔ 기본 켬을 이 기기에 괜히 기억했다');
});

/* ═══ 📖 1e 반박 검토 🟡(2026-10-17) — 홈은 판이 노크했는지 모른다(1e: 판을 띄울 첫 주소 → 20초 뒤 나머지 최대 다섯을 bookWarm panel:1).
   판이 20초 안에 swap 노크를 안 하면(차가운 GAS · 안내 화면 · 여러 계정 우회) 그 다섯이 숨긴 판 다섯을 띄우고(무거운 doGet 동시) bookRoom 이 노크 전 P0(지금 수업 교재)까지 지웠다.
   → 판이 될 판(홈에서 연·미리 띄운 판 · 아직 노크 전)이 있으면 미리 주소는 줄에 섰다가 그 판이 swap:1 로 노크해 판이 되면 bookFetch 로 흐른다. ═══ */
console.log('[📖 1e 반박 — 노크 전 판 줄]');
const E5 = TURL.replace('e1', 'e5'), E6 = TURL.replace('e1', 'e6'), E7 = TURL.replace('e1', 'e7'), E8 = TURL.replace('e1', 'e8');
function knockWin(s, box, n) { const bw = win('book-exec' + n, s.top), bi = win('book-user' + n, win('book-sbx' + n, bw)); box.kids[0].contentWindow = bw; return bi; }
const fetchOf = (bi) => sentOf(bi).filter((m) => m.onf === 'bookFetch').map((m) => m.src);
const warmAll = (s, hs) => hs.forEach((h) => s.send({ onf: 'bookWarm', href: h, panel: 1, left: 270 }, s.home));

t('Q1 — 노크 전 판(PC 미리 띄운 P0 · 홈에서 연 판 · 📱 폰 [열기])이 있으면 미리 주소는 숨긴 판을 안 띄우고 줄에 선다 · P0 는 그대로 · 첫 노크(swap 없음)엔 안 흐른다 · swap:1 노크 = bookFetch 차례대로 한 번씩', () => {
  for (const how of ['warm', 'open', 'phone']) {
    const s = phoneRun({ wide: how !== 'phone', search: '?swap=1' });
    if (how === 'warm') s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 270 }, s.home);   // 6초 — 판 없음 → 숨긴 판 P0(곧 판)
    else s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);                           // [열기] — 뜨는 중
    const P0 = s.panel();
    warmAll(s, [E2, E3, E4, E5, E6, E3]);                                                    // 26초 — P0 는 아직 노크 전
    assert.ok(s.panels().length === 1 && s.panels()[0] === P0 && P0.parentNode, '⛔ ' + how + ' — 노크 전 판이 있는데 숨긴 판을 더 띄웠다(무거운 doGet 동시) · 또는 P0 를 지웠다: ' + s.panels().length);
    const bi = knockWin(s, P0, 1);
    s.send({ onf: 'bookHi', views: 'line' }, bi);
    assert.ok(fetchOf(bi).length === 0 && s.panels().length === 1, '⛔ ' + how + ' — 첫 노크(swap 없음 — 아직 판인지 모른다)에 줄을 흘렸다');
    s.send({ onf: 'bookHi', views: 'line', swap: 1 }, bi);
    assert.deepStrictEqual(fetchOf(bi), [E2, E3, E4, E5, E6].map((h) => srcOf(s, h)), '⛔ ' + how + ' — 판이 된 P0 에 줄이 bookFetch 로(차례대로 · 같은 주소 한 번) 안 갔다');
    assert.ok(jsn(bi.sent).every((x) => x[1] === ORIGIN) && s.panels().length === 1, "⛔ '*'·남의 출처로 보냈다(또는 새 판을 띄웠다)");
    bi.sent.length = 0;
    s.send({ onf: 'bookHi', views: 'line', swap: 1 }, bi);
    assert.strictEqual(fetchOf(bi).length, 0, '⛔ 줄을 두 번 흘렸다');
  }
  //   줄 상한 6 · 판이 이미 든 주소(그 사이 [열기]로 뜬 판)는 안 흘린다 · ⭐ 내 문장은 판에 안 가니 줄에 안 서고 종전(숨긴 판 · P0 그대로)
  const s = phoneRun({ wide: true, search: '?swap=1' });
  s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 270 }, s.home);
  const P0 = s.panel();
  warmAll(s, [E1, E2, E3, E4, E5, E6, E7, E8]);
  s.send({ onf: 'bookWarm', href: MYS, panel: 1, left: 270 }, s.home);
  assert.ok(s.panels().length === 2 && s.panels().includes(P0) && s.panels()[1].kids[0].src.indexOf('mode=mine') > 0, '⛔ 내 문장 미리가 종전(숨긴 판)이 아니다 · 또는 P0 를 지웠다');
  s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);                                 // 줄에 선 E2 를 그 사이 [열기] — 판이 아직 없어 새 판
  const bi = knockWin(s, P0, 1);
  s.send({ onf: 'bookHi', views: 'line', swap: 1 }, bi);
  assert.deepStrictEqual(fetchOf(bi), [E3, E4, E5, E6, E7].map((h) => srcOf(s, h)), '⛔ 줄 상한(6)·이미 뜬 주소(E2) 거르기가 틀렸다');
});

t('Q2 — 노크가 swap 없이 끝남(판 못 됨 · Lib 스위치 끔 · 옛 교재) = 줄은 안 흘린다(숨긴 판 몰림 0) · 그 뒤 미리는 종전 길 · 1분 넘게 노크 없는 판(안내 화면)은 후보가 아니다', () => {
  let s = phoneRun({ wide: true, search: '?swap=1' });
  s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 270 }, s.home);
  const P0 = s.panel();
  warmAll(s, [E2, E3, E4]);
  const bi = knockWin(s, P0, 1);
  s.send({ onf: 'bookHi', views: 'line' }, bi);
  assert.ok(s.panels().length === 1 && fetchOf(bi).length === 0, '⛔ swap 없는 노크 뒤 줄을 숨긴 판으로 몰아 띄웠다');
  s.send({ onf: 'bookWarm', href: E5, panel: 1, left: 270 }, s.home);
  assert.ok(s.panels().length === 2 && s.panels().includes(P0) && s.panels()[1].classList.contains('park'), '⛔ 판 못 된 뒤 미리가 종전(숨긴 판)이 아니다');
  //   1분 넘게 노크 없음 — 미리는 종전(줄에 갇히지 않는다 · 30분 묵은 안내 화면이 미리를 막지 않게)
  s = phoneRun({ wide: true, search: '?swap=1' });
  s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 270 }, s.home);
  s.g.books[0].born -= 61 * 1000;
  s.send({ onf: 'bookWarm', href: E2, panel: 1, left: 270 }, s.home);
  assert.strictEqual(s.panels().length, 2, '⛔ 1분 넘게 노크 없는 판이 아직 미리를 줄에 세운다');
  //   판이 못 될 판은 후보가 아니다 — ⭐ 내 문장 판 · 판 안에서 연 판(back) (줄이 1분 갇힌다)
  s = phoneRun({ wide: true, search: '?swap=1' });
  s.send({ onf: 'bookWarm', href: MYS, panel: 1, left: 270 }, s.home);
  s.send({ onf: 'bookWarm', href: E2, panel: 1, left: 270 }, s.home);
  assert.strictEqual(s.panels().length, 2, '⛔ 노크 전 ⭐ 내 문장 판을 판 후보로 봤다');
  s = phoneRun({ wide: true, search: '?swap=1' });
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  const A = s.panel(), ai = knockWin(s, A, 1);
  s.send({ onf: 'bookHi', views: 'line' }, ai);
  s.send({ onf: 'openBook', href: E2 }, ai);                                                // 판 안에서 연 판(back = A) — 노크 전
  s.send({ onf: 'bookWarm', href: E3, panel: 1, left: 270 }, s.home);
  assert.strictEqual(s.panels().length, 3, '⛔ 판 안에서 연 판(back)을 판 후보로 봤다');
});

t('Q3 — 판 셋 넘침(bookRoom)이 노크 전 판 후보(P0)를 안 지운다 · 1분 넘으면 종전대로 지운다', () => {
  for (const old of [false, true]) {
    const s = phoneRun({ wide: true, search: '?swap=1' });
    s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 270 }, s.home);
    const P0 = s.panel();
    if (old) s.g.books[0].born -= 61 * 1000;
    s.send({ onf: 'openBook', href: E2, left: 270 }, s.home);
    const A = shownOf(s)[0]; s.send({ onf: 'bookHi', views: 'line' }, knockWin(s, A, 2));   // swap 없는 판(옛 교재)
    s.send({ onf: 'openBook', href: E3, left: 270 }, s.home);
    const B = shownOf(s)[0]; s.send({ onf: 'bookHi', views: 'line' }, knockWin(s, B, 3));
    s.send({ onf: 'openBook', href: E4, left: 270 }, s.home);                                // 넷째 → 가장 오래 안 쓴 숨긴 판을 비킨다
    assert.strictEqual(s.panels().length, 3, '전제: 판 셋');
    if (!old) assert.ok(s.panels().includes(P0) && !s.panels().includes(A), '⛔ 판 셋 넘침이 노크 전 P0(지금 수업 교재 · 곧 판)를 지웠다');
    else assert.ok(!s.panels().includes(P0) && s.panels().includes(A), '⛔ 1분 넘게 노크 없는 판을 아직 감싼다(종전 — 가장 오래 안 쓴 숨긴 판을 비킨다)');
  }
});

t('Q4 — ⛔ 스위치 끔(swap=0 · 기억 없음)이면 종전 글자 그대로: 미리 여섯이 숨긴 판을 띄우며 셋 안에서 밀어낸다(P0 포함) · 판에 말 0', () => {
  for (const search of ['', '?swap=0']) {
    const s = phoneRun({ wide: true, search });
    s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 270 }, s.home);
    warmAll(s, [E2, E3, E4, E5, E6]);
    assert.deepStrictEqual(s.panels().map((p) => p.kids[0].src), [E4, E5, E6].map((h) => srcOf(s, h) + '&park=1'), '⛔ 끔인데 종전(숨긴 판 셋 · 가장 오래 안 쓴 것부터 비킴)이 아니다: ' + search);
    const bi = knockWin(s, s.panels()[2], 1);
    s.send({ onf: 'bookHi', views: 'line', swap: 1 }, bi);
    assert.ok(s.panels().every((p) => p.classList.contains('park')) && fetchOf(bi).length === 0 && !(s.g.bookQ || []).length, '⛔ 끔인데 줄·bookFetch 가 있다');
  }
});

t('perf=1 — 갈아 끼움이 끝나면 홈에 bookPerf{ms, from}(속도표 줄 「판 갈아 끼움 Nms」 · 1e 가 그린다) · 물러나면 from:new · perf 없으면 말 0', () => {
  let c = boardRun({ search: '?swap=1&perf=1' });
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache', ms: 30 }, c.bi);
  let pf = sentOf(c.s.home).filter((m) => m.onf === 'bookPerf');
  assert.ok(pf.length === 1 && pf[0].from === 'cache' && typeof pf[0].ms === 'number' && pf[0].ms >= 0, '⛔ perf=1 인데 홈에 bookPerf{from:cache, ms} 가 없다');
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.send({ onf: 'openBook', href: E3, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[1].id, ok: false, why: 'busy' }, c.bi);
  pf = sentOf(c.s.home).filter((m) => m.onf === 'bookPerf');
  assert.ok(pf.length === 2 && pf[1].from === 'new' && pf[1].why === 'busy', '⛔ 물러남이 속도표에 안 남는다');
  c = boardRun();
  c.s.send({ onf: 'openBook', href: E2, left: 270 }, c.s.home);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache' }, c.bi);
  assert.ok(!sentOf(c.s.home).some((m) => m.onf === 'bookPerf'), '⛔ perf 없이 bookPerf 를 보냈다');
});


/* ═══ 2단계 반박 검토(2026-10-17) — 쌍둥이 둘 다 ═══ */
console.log('[📖 2단계 반박 — 늙은 판 · 폰 뒤로]');
t('🟠 늙은 판(2시간)을 다시 보이면 자격만 내린 옛 판은 판 셋 넘침이 **세지도 지우지도 않는다** — 맺음(안 보낸 칸·실패 카드)이 끝날 때까지 남고 30분 지우기가 치운다', () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.home);
  s.send({ onf: 'openBook', href: E2 }, bi);                                   // 판 안에서 연 판 둘(숨김) — 판 셋을 채운다
  const q2 = shownOf(s)[0], i2 = swapKnock(s, q2, 2);
  s.send({ onf: 'openBook', href: E3 }, i2);
  const q3 = shownOf(s)[0];
  swapKnock(s, q3, 3);
  s.send({ onf: 'bookDismiss' }, s.home);
  assert.ok(s.panels().length === 3 && s.panels().every((x) => x.classList.contains('park')), '전제: 숨긴 판 셋(P · q2 · q3)');
  s.g.books.find((b) => b.box === P).born -= 2 * 60 * 60 * 1000 + 1000;
  s.send({ onf: 'openBook', href: E4, left: 270 }, s.home);                   // 홈 [열기] → 판 P(늙음) → 새 판 + P 자격 내림
  assert.ok(s.panels().includes(P) && P.parentNode && P.classList.contains('park'), '⛔ 자격 내린 늙은 판을 판 셋 넘침이 바로 지웠다(맺음 안 돎 → 안 보낸 칸·실패 카드 잃음)');
  assert.ok(shownOf(s).length === 1 && shownOf(s)[0] !== P, '전제: 새 판이 보인다');
  assert.ok(s.panels().includes(q2) && s.panels().includes(q3) && s.panels().length === 4, '⛔ 자격 내린 판을 판 셋에 셌다 — 멀쩡한 숨긴 판(q2·q3)이 밀려났다');
  const N = shownOf(s)[0], ni = swapKnock(s, N, 4);
  s.send({ onf: 'openBook', href: E5 }, ni);                                   // 판 안 링크 → 넷째(자격 내린 판 빼고) → 가장 오래 안 쓴 「멀쩡한」 숨긴 판을 비킨다
  assert.ok(s.panels().includes(P) && !s.panels().includes(q2), '⛔ 판 셋 넘침이 자격 내린 판(가장 오래된 숨긴 판)을 지웠다 — 맺음 전이다');
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => { x.on = false; x.f(); });
  assert.ok(!s.panels().includes(P), '⛔ 30분 뒤에도 자격 내린 판이 남았다');
});
t('🟡 📱 폰 뒤로로 판을 갈아 끼울 때 판이 늙었으면(새 판으로 바뀜) 고아 액자·두 번째 새 판이 안 생긴다 — 판 목록 밖 DOM 판 0 · 보이는 판 = 그 칸 주소 하나', () => {
  const { s, P } = boardRun({ phone: true });
  s.g.books.find((b) => b.box === P).born -= 2.5 * 60 * 60 * 1000;
  s.H.st = [{ state: null }, { state: { onfBook: s.g.bookKey(srcOf(s, E2)), n: 0, bd: 1 } }, { state: { onfBook: s.g.bookKey(srcOf(s, E1)), n: 0, bd: 1 } }]; s.H.i = 2;
  const made = [], ap = s.g.document.body.appendChild;
  s.g.document.body.appendChild = function (c) { made.push(c); return ap.call(this, c); };
  s.browserBack();                                                              // E2 칸 — 판이 없다 → 판(P · 늙음)을 E2 로 → 새 판
  assert.strictEqual(made.length, 1, '⛔ 새 판을 둘 띄웠다(옛 p 로 bookShow 를 또 불러 늙은 판을 또 갈았다 — 하나는 노크 전이라 지워진다 · doGet 헛걸음)');
  const orphan = s.panels().filter((x) => !s.g.books.some((b) => b.box === x));
  assert.strictEqual(orphan.length, 0, '⛔ 판 목록 밖에 남은 액자(고아)가 있다');
  assert.ok(s.g.books.every((b) => b.box.parentNode), '⛔ 판 목록에 DOM 밖 판이 있다(엉뚱한 판을 뺐다)');
  assert.ok(shownOf(s).length === 1 && shownOf(s)[0] !== P && shownOf(s)[0].kids[0].src === srcOf(s, E2) && s.panels().length === 2, '⛔ 보이는 판이 E2 새 판 하나가 아니다(늙은 판을 또 보였거나 새 판을 둘 띄웠다): ' + s.panels().map((x) => x.kids[0].src.slice(-30)).join(' | '));
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
