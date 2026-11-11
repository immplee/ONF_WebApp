/* 🔙 새로 고침 = 판 사슬 그대로 · 창마다 열쇠 · 학생 토큰 지문 · 숨긴 판 당겨서 새로고침 (2026-11-11 Peter 「새로 고침하면 그대로 · 뒤로는 켠 순서 역순으로 하나씩」)
   선생님 = teacher/index.html onf-book + onf-hist 표지 구간(vm) · 학생 = assets/onf-frame.js mount(vm). 가짜 기록은 칸을 구조화 복제로 쌓는다(브라우저처럼 back·go 는 나중 popstate).
   실브라우저 = test/repro/reload-chain.mjs. 실행: node test/reload-chain.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const TSRC = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8'), FSRC = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8');
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + '\n     ' + String(e && e.message).split('\n')[0]); } };
const ORIGIN = 'https://n-abc-script.googleusercontent.com';
const win = (name, parent) => { const w = { name, sent: [] }; w.parent = parent || w; w.postMessage = (m, o) => w.sent.push([JSON.parse(JSON.stringify(m)), o]); return w; };
const store = (init) => ({ s: Object.assign({}, init || {}), getItem(k) { return k in this.s ? this.s[k] : null; }, setItem(k, v) { this.s[k] = String(v); }, removeItem(k) { delete this.s[k]; } });
function hist() {
  return { st: [{ state: null }], i: 0, to: [],
    get state() { return this.st[this.i].state; },
    pushState(st) { this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(st)) }); this.i++; },
    replaceState(st) { this.st[this.i].state = st; },
    back() { this.to.push(Math.max(0, this.i - 1)); }, go(n) { this.to.push(Math.max(0, Math.min(this.st.length - 1, this.i + n))); } };
}
function els() {
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '', vars: {}, innerHTML: '', style: { setProperty(k, v) { el.vars[k] = v; }, removeProperty(k) { delete el.vars[k]; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; }, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), blur() {},
    L: {}, addEventListener(k, f) { (el.L[k] = el.L[k] || []).push(f); } }; return el; };
  const root = { attrs: {}, setAttribute(k, v) { root.attrs[k] = v; }, getAttribute(k) { return root.attrs[k]; }, classList: { set: new Set(), toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } } };
  return { body, mkEl, root };
}
/* 공통 손 — 판 목록·보이는 판·노크·뒤로 */
function hands(s) {
  s.panels = () => s.body.kids.filter((k) => k.className === 'onf-bookpanel');
  s.shown = () => s.panels().filter((k) => !k.classList.contains('park'));
  s.hi = (box, n) => { const bw = win('book-exec' + n, s.top), bi = win('book-user' + n, win('book-sbx' + n, bw)); box.kids[0].contentWindow = bw; s.send({ onf: 'bookHi', lg: 1 }, bi); return bi; };
  s.back = () => { s.H.i = Math.max(0, s.H.i - 1); (s.L.popstate || []).forEach((f) => f({})); let n = 0; while (s.H.to.length && n++ < 9) { s.H.i = s.H.to.shift(); (s.L.popstate || []).forEach((f) => f({})); } };
  s.rec = () => JSON.parse(s.ss.getItem(s.key) || 'null');
  return s;
}

/* ═══ 선생님 껍데기 ═══ */
const TA = TSRC.indexOf('/* onf-book:begin */'), TB = TSRC.indexOf('/* onf-book:end */'), HA = TSRC.indexOf('/* onf-hist:begin */'), HB = TSRC.indexOf('/* onf-hist:end */');
const TEXEC = 'https://script.google.com/macros/s/BOOKAPP/exec';
const ID = 'x.' + Buffer.from(JSON.stringify({ email: 't@ownify.co.kr' })).toString('base64url') + '.y';
function teacher(o) {
  o = o || {};
  const L = {}, E = els(), top = win('shell'), homeExec = win('home-exec', top), home = win('home-user', win('home-sbx', homeExec));
  const ss = o.ss || store(), H = hist(), timers = [], reloads = [];
  const g = { URL, URLSearchParams, top, frame: { contentWindow: homeExec }, innerWidth: 1440, atob, pending: ID, appOrigin: ORIGIN,
    location: { href: 'https://class.ownify.co.kr/teacher/' + (o.search || ''), search: o.search || '', reload() { reloads.push(1); } },
    document: { body: E.body, createElement: E.mkEl, documentElement: E.root }, ONF: { api: { EXEC: TEXEC } },
    localStorage: store({ onfThSwap: '0' }), sessionStorage: ss, history: H,
    matchMedia: () => ({ matches: o.phone ? false : true, addEventListener() {} }),
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter((x) => x !== f); },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {} };
  g.window = g; g.appWin = home; vm.createContext(g);
  const blk = TSRC.slice(TA, TB), mb = o.mut ? o.mut(blk) : blk;
  if (o.mut) assert.notStrictEqual(mb, blk, '변이 자리');
  vm.runInContext(mb + TSRC.slice(HA, HB), g, { filename: 'teacher-book' });
  const s = hands({ g, L, top, home, ss, H, timers, reloads, body: E.body, key: 'onfThOpenBook' + (o.key || '') });
  s.send = (data, source, origin) => (L.message || []).forEach((f) => f({ data, source, origin: origin || ORIGIN }));
  s.tick = () => { let n = 0; while (n++ < 50) { const x = timers.find((y) => !y.done && !y.ms); if (!x) break; x.done = true; x.f(); } };
  return s;
}
const TE1 = 'https://class.ownify.co.kr/young-s1-e1-jungah?mode=share&t=STUTOK', TE2 = TE1.replace('e1', 'e2'), TE3 = TE1.replace('e1', 'e3'), TE4 = TE1.replace('e1', 'e4');
/** A(홈에서) → 판 안에서 B 를 연 채 새로 고침 → 사슬로 되살린 껍데기 */
function teacherAB(o) {
  o = o || {};
  const a = teacher(o);
  a.send({ onf: 'openBook', href: TE1, left: 270 }, a.home);
  const ia = a.hi(a.panels()[0], 'a');
  a.send({ onf: 'bookState', st: { sheet: 'E1_A', top: 900, left: 0, side: null } }, ia);
  a.send({ onf: 'openBook', href: TE2 }, ia);
  const ib = a.hi(a.panels()[1], 'b');
  a.send({ onf: 'bookState', st: { sheet: 'E2_B', top: 40, left: 0, side: null } }, ib);
  const b = teacher(Object.assign({}, o, { ss: a.ss }));
  b.send({ onf: 'bookHello' }, b.home);   // 블록만 도는 검사 — 껍데기 mount 대신 노크가 rsBoot 를 부른다
  return { a, b, ia, ib };
}

console.log('[🔙 선생님 — 판 사슬]');
t('판 안에서 연 판(A → B)을 연 채 새로 고침 — 밑 판 A 도 적는다(u · b = ✕ 한 단계) · 되살리면 A 는 숨긴 판(park=1) · B 는 보이고 그 back = A · 칸 차례 A·A물음·B·B물음', () => {
  const { a, b } = teacherAB();
  const v = a.rec();
  assert.ok(v && /e2/.test(v.h) && v.b === 1 && v.u.length === 1 && /e1/.test(v.u[0].h) && v.u[0].st.sheet === 'E1_A', '⛔ 밑 판 사슬을 안 적었다: ' + JSON.stringify(v && { h: v.h, u: v.u, b: v.b }));
  const ps = b.panels();
  assert.ok(ps.length === 2 && ps[0].classList.contains('park') && /park=1/.test(ps[0].kids[0].src) && /slug=young-s1-e1-jungah/.test(ps[0].kids[0].src), '⛔ 밑 판 A 를 숨긴 판으로 안 만들었다');
  assert.ok(!ps[1].classList.contains('park') && /slug=young-s1-e2-jungah/.test(ps[1].kids[0].src), '⛔ 맨 위 판 B 가 안 보인다');
  const bk = b.g.books, pa = bk.find((q) => /e1/.test(q.src)), pb = bk.find((q) => /e2/.test(q.src));
  assert.strictEqual(pb.back, pa, '⛔ 앞 판 규칙(✕ 한 단계) back 이 사라졌다');
  assert.deepStrictEqual(b.H.st.slice(1).map((x) => [x.state.onfBook, x.state.bd, x.state.lg || 0]), [[pa.key, 1, 0], [pa.key, 2, 1], [pb.key, 3, 0], [pb.key, 4, 1]], '⛔ 칸 차례가 뒤로 = B → A → 홈 이 아니다');
});
t('되살린 뒤 뒤로 — B 물음 칸 → (B 칸) → A 가 보이고 A 에 되살릴 상태(bookRestore) · 기억도 A 로 · 한 번 더 = 홈(기억 지움)', () => {
  const { b } = teacherAB();
  const [boxA, boxB] = b.panels(), iA = b.hi(boxA, 'A2'); b.hi(boxB, 'B2'); b.tick();
  iA.sent.length = 0;
  b.H.i = 3; (b.L.popstate || []).forEach((f) => f({}));              // B 물음 칸이 빠졌다 → 교재가 묻는다(확인 = bookClose)
  b.send({ onf: 'bookClose' }, win('x'));                               // 남의 말은 무시
  const pb = b.g.books.find((q) => /e2/.test(q.src)); pb.lgOn = false;
  b.H.i = 2; (b.L.popstate || []).forEach((f) => f({})); b.tick();    // A 물음 칸(밑 판 줄) — A 가 보인다
  assert.ok(!boxA.classList.contains('park') && boxB.classList.contains('park'), '⛔ 뒤로가 밑 판 A 를 안 보였다');
  assert.ok(iA.sent.some((x) => x[0].onf === 'bookRestore' && x[0].st.sheet === 'E1_A'), '⛔ 숨긴 채 노크한 A 에 되살릴 상태를 안 보냈다');
  assert.ok(/e1/.test(b.rec().h) && b.rec().u.length === 0, '⛔ 뒤로로 A 가 보였는데 기억은 B(닫은 판)다: ' + b.rec().h);
  b.H.i = 0; (b.L.popstate || []).forEach((f) => f({}));
  assert.ok(b.shown().length === 0 && b.rec() === null, '⛔ 홈까지 뒤로 = 판 다 숨김 · 기억 지움');
});
t('판 수 상한 — 넷 사슬(A → B → C → D)은 위 셋만(밑 판 BOOK_MAX-1 = 2) · 📱 폰은 둘(밑 판 1)', () => {
  const go = (o) => {
    const a = teacher(o); a.send({ onf: 'openBook', href: TE1 }, a.home);
    let w = a.hi(a.panels()[0], 0);
    [TE2, TE3, TE4].forEach((h, i) => { a.send({ onf: 'openBook', href: h }, w); w = a.hi(a.panels()[a.panels().length - 1], i + 1); });
    const b = teacher(Object.assign({}, o, { ss: a.ss })); b.send({ onf: 'bookHello' }, b.home);
    return { v: a.rec(), n: b.panels().length };
  };
  const pc = go({});
  assert.ok(pc.v.u.length === 2 && /e2/.test(pc.v.u[0].h) && /e3/.test(pc.v.u[1].h) && pc.n === 3, '⛔ PC 사슬 상한(위 셋) — ' + JSON.stringify(pc.v.u.map((x) => x.h.slice(30, 50))) + ' 판 ' + pc.n);
  const ph = go({ phone: true });
  assert.ok(ph.n === 2, '⛔ 폰은 판 둘까지(밑 판 하나) — 판 ' + ph.n);
});
t('변이 — 사슬을 안 적으면(u 빈 칸) 위 검사가 잡는다 · 홈에서 연 판 위에 홈에서 또 연 판은 b 0(✕ = 전부 닫기 그대로)', () => {
  const m = teacherAB({ mut: (x) => x.replace("u: p.rsU ? p.rsU.u : [],", "u: [],") });
  assert.strictEqual(m.b.panels().length, 1, '변이가 안 먹었다');
  const a = teacher(); a.send({ onf: 'openBook', href: TE1 }, a.home); a.hi(a.panels()[0], 'a'); a.send({ onf: 'openBook', href: TE2 }, a.home);
  const v = a.rec(); assert.ok(v.u.length === 1 && v.b === 0, '⛔ 홈에서 연 판에 앞 판 표시(b)를 달았다: ' + JSON.stringify({ u: v.u.length, b: v.b }));
});

console.log('[🪟 선생님 — 창마다 열쇠 · 숨긴 판 당겨서 새로고침]');
t('주소로 연 학생 창(?mode=student&t=…)은 제 열쇠(.s.<지문> · 토큰 없음) — 홈 기억을 안 열고 제 기억은 연다 · 과제 판·확장 창은 mode 열쇠 · 홈은 종전 열쇠', () => {
  const S = '?mode=student&t=Tok_1';
  const a = teacher({ search: S }); a.send({ onf: 'openBook', href: TE1 }, a.home);
  const keys = Object.keys(a.ss.s);
  assert.ok(keys.length === 1 && /^onfThOpenBook\.s\.[a-z0-9]+$/.test(keys[0]) && keys[0].indexOf('Tok_1') < 0, '⛔ 학생 창 기억 열쇠: ' + keys.join());
  const h = teacher({ ss: store({ [keys[0]]: a.ss.s[keys[0]] }) }); h.send({ onf: 'bookHello' }, h.home);
  assert.strictEqual(h.panels().length, 0, '⛔ 홈이 주소로 연 학생 창의 기억을 열었다');
  const solo = teacher({ search: S, ss: store({ [keys[0]]: a.ss.s[keys[0]], onfThOpenBook: JSON.stringify({ h: TE3, l: 0, st: null, e: 't@ownify.co.kr', at: Date.now() }) }) });
  solo.send({ onf: 'bookHello' }, solo.home);
  assert.ok(solo.panels().length === 1 && /e1/.test(solo.panels()[0].kids[0].src), '⛔ 학생 창이 제 기억(e1) 대신 홈 기억(e3)을 열었다');
  const other = teacher({ search: '?mode=student&t=Tok_2', ss: store({ [keys[0]]: a.ss.s[keys[0]] }) }); other.send({ onf: 'bookHello' }, other.home);
  assert.strictEqual(other.panels().length, 0, '⛔ 다른 학생 창이 앞 학생 창 기억을 열었다');
});
t('배선 — mount 는 홈·주소로 연 학생 창에서 덮개·되살리기(rsWinMine) · 과제 판 표시(onfHwUp)도 창마다 열쇠', () => {
  assert.ok(/if \(typeof rsWinMine === 'function' \? rsWinMine\(\) : !new URLSearchParams\(location\.search\)\.get\('mode'\)\) hwCoverOn\(\);/.test(TSRC), '⛔ 덮개 배선');
  assert.ok(/if \(typeof rsWinMine === 'function' \? rsWinMine\(\) : !new URLSearchParams\(location\.search\)\.get\('mode'\)\) rsBoot\(\);/.test(TSRC), '⛔ 되살리기 배선');
  assert.ok(/var HWUP_KEY = 'onfHwUp' \+ \(typeof rsWin === 'function' \? rsWin\(\) : ''\)/.test(TSRC), '⛔ 과제 판 표시 열쇠');
  const g = teacher().g;
  const w = (q) => { g.location.search = q; return [g.rsWin(), g.rsWinMine()]; };
  assert.deepStrictEqual(w(''), ['', true]);
  assert.ok(/^\.s\.[a-z0-9]+$/.test(w('?mode=student&t=Tok_1')[0]) && w('?mode=student&t=Tok_1')[1] === true);
  assert.deepStrictEqual(w('?mode=hwbook&t=Tok_1'), ['.hwbook', false]);
  assert.deepStrictEqual(w('?mode=hwext&t=a&s=b'), ['.hwext', false]);
  assert.notStrictEqual(w('?mode=student&t=Tok_1')[0], w('?mode=student&t=Tok_2')[0]);
});
t('숨긴 판의 당겨서 새로고침(reload)도 받는다 — 기억은 보이는 판으로(숨긴 판을 열린 판으로 안 적는다) · 남의 창 말은 무시', () => {
  const a = teacher(); a.send({ onf: 'openBook', href: TE1 }, a.home);
  const ia = a.hi(a.panels()[0], 'a'); a.send({ onf: 'openBook', href: TE2 }, a.home); a.hi(a.panels()[1], 'b');
  assert.ok(a.panels()[0].classList.contains('park'), '전제: A 숨김');
  a.send({ onf: 'reload' }, win('stranger'));
  assert.strictEqual(a.reloads.length, 0, '⛔ 남의 창 말로 다시 읽었다');
  a.send({ onf: 'reload' }, ia);
  assert.ok(a.reloads.length === 1 && /e2/.test(a.rec().h), '⛔ 숨긴 판의 reload 를 무시했거나 숨긴 판을 열린 판으로 적었다: ' + (a.rec() || {}).h);
});

/* ═══ 학생 껍데기 ═══ */
const SE1 = 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', SE2 = SE1.replace('e1', 'e2'), SE3 = SE1.replace('e1', 'e3');
function student(o) {
  o = o || {};
  const L = {}, E = els(), top = win('shell'), ss = o.ss || store(), H = hist(), timers = [], reloads = [];
  const g = { listeners: L, top, URL, innerWidth: 1440, localStorage: null, sessionStorage: ss, history: H, navigator: { userAgent: 'node' },
    location: { pathname: o.path || '/', search: o.search || '', href: 'https://class.ownify.co.kr' + (o.path || '/') + (o.search || ''), reload() { reloads.push(1); } },
    document: { addEventListener() {}, body: E.body, createElement: E.mkEl, documentElement: E.root },
    matchMedia: () => ({ matches: o.phone ? false : true, addEventListener() {} }),
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter((x) => x !== f); },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() {} };
  g.window = g; vm.createContext(g);
  vm.runInContext(o.mut ? o.mut(FSRC) : FSRC, g, { filename: 'onf-frame.js' });
  const homeWin = win('home-exec', top), home = win('home-user', homeWin);
  const frameEl = { contentWindow: homeWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), addEventListener() {} };
  g.ONF.frame.mount(frameEl, 'https://script.google.com/x/exec?t=T', { phone: true, lg: true, tok: o.tok === undefined ? 'TokA' : o.tok, home: o.home === undefined ? true : o.home,
    bookSrc: (h) => { const m = /\/([a-z0-9-]+)\?mode=share/.exec(h); return m ? 'https://script.google.com/x/exec?t=T&mode=share&slug=' + m[1] + '&embed=1' : null; } });
  const s = hands({ g, L, top, home, ss, H, timers, reloads, body: E.body, key: o.key || 'onfOpenBook' });
  s.send = (data, source, origin) => (L.message || []).forEach((f) => f({ data, source, origin: origin || 'https://n-abc-0lu-script.googleusercontent.com' }));
  return s;
}
function studentAB(o) {
  o = o || {};
  const a = student(o); a.send({ onf: 'openBook', href: SE1, left: 184 }, a.home);
  const ia = a.hi(a.panels()[0], 'a'); a.send({ onf: 'bookState', st: { sheet: 'E1_A', top: 5, left: 0, side: null } }, ia);
  a.send({ onf: 'openBook', href: SE2 }, ia); a.hi(a.panels()[1], 'b');
  const b = student(Object.assign({}, o, { ss: a.ss, tok: o.tok2 === undefined ? o.tok : o.tok2 }));
  return { a, b };
}
console.log('[🔙 학생 — 판 사슬 · 🔐 토큰 지문 · 🪟 창 열쇠 · 숨긴 판 reload]');
t('학생도 같은 약속 — A → B 를 연 채 새로 고침 = A 숨긴 판 · B 보임 · back = A · 칸 차례 A·A물음·B·B물음 · 뒤로 = A', () => {
  const { a, b } = studentAB();
  const v = a.rec();
  assert.ok(v.u.length === 1 && /e1/.test(v.u[0].h) && v.b === 1 && v.e === 'k' + (() => { let h = 5381; for (const c of 'TokA') h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); })(), '⛔ 학생 사슬·지문: ' + JSON.stringify(v));
  assert.ok(JSON.stringify(v).indexOf('TokA') < 0, '⛔ 기억에 토큰을 적었다');
  const ps = b.panels();
  assert.ok(ps.length === 2 && ps[0].classList.contains('park') && !ps[1].classList.contains('park'), '⛔ 학생 사슬 되살리기');
  assert.deepStrictEqual(b.H.st.slice(1).map((x) => [x.state.bd, x.state.lg || 0]), [[1, 0], [2, 1], [3, 0], [4, 1]]);
  b.hi(ps[0], 'A2'); b.hi(ps[1], 'B2');   // 노크 전 판은 숨기지 않고 지운다(종전 bookPark) — 둘 다 뜬 뒤
  b.H.i = 2; (b.L.popstate || []).forEach((f) => f({}));
  assert.ok(!ps[0].classList.contains('park') && ps[1].classList.contains('park') && /e1/.test(b.rec().h), '⛔ 뒤로가 A 를 안 보였거나 기억이 B 에 남았다');
});
t('같은 탭에서 다른 학생 토큰으로 넘어오면 앞 학생 교재를 안 연다(기억 지움) · 옛 기억(지문 없음)도 안 연다 · 같은 학생이면 연다', () => {
  const { b } = studentAB({ tok2: 'TokB' });
  assert.ok(b.panels().length === 0 && b.rec() === null, '⛔ 다른 학생 토큰으로 앞 학생 교재를 열었다');
  const old = student({ ss: store({ onfOpenBook: JSON.stringify({ h: SE1, l: 0, m: 0, r: 0, o: 0, st: null, at: Date.now() }) }) });
  assert.strictEqual(old.panels().length, 0, '⛔ 지문 없는 옛 기억을 열었다');
  assert.strictEqual(studentAB().b.panels().length, 2);
  const m = studentAB({ tok2: 'TokB', mut: (x) => x.replace("if (v.e !== RS_E) { rsDrop(); return; }", '') });
  assert.ok(m.b.panels().length > 0, '변이가 안 먹었다');
});
t('홈 아닌 창(opts.home === false — 짧은 주소·?fileId= 로 연 교재)은 제 열쇠(.w.<주소 지문>) — 홈 기억을 안 열고 · 홈도 그 창 기억을 안 연다', () => {
  const d = student({ home: false, path: '/a-s1-e3-b', key: 'x' }); d.send({ onf: 'openBook', href: SE1 }, d.home);
  const k = Object.keys(d.ss.s).find((x) => /^onfOpenBook/.test(x));
  assert.ok(/^onfOpenBook\.w\.k[a-z0-9]+$/.test(k), '⛔ 주소로 연 창 열쇠: ' + k);
  assert.strictEqual(student({ ss: d.ss }).panels().length, 0, '⛔ 홈이 주소로 연 창의 기억을 열었다');
  assert.strictEqual(student({ ss: d.ss, home: false, path: '/a-s1-e3-b' }).panels().length, 1, '⛔ 그 창 새로 고침이 제 기억을 안 열었다');
  assert.strictEqual(student({ ss: d.ss, home: false, path: '/c-s1-e1-d' }).panels().length, 0, '⛔ 다른 주소 창이 그 기억을 열었다');
});
t('학생 숨긴 판의 reload 도 받는다 — 기억은 보이는 판', () => {
  const a = student(); a.send({ onf: 'openBook', href: SE1 }, a.home);
  const ia = a.hi(a.panels()[0], 'a'); a.send({ onf: 'openBook', href: SE3 }, a.home); a.hi(a.panels()[1], 'b');
  a.send({ onf: 'reload' }, ia);
  assert.ok(a.reloads.length === 1 && /e3/.test(a.rec().h), '⛔ 숨긴 판 reload 무시 · 또는 숨긴 판을 적었다');
});
console.log('\n' + pass + '개 통과, ' + fail + '개 실패'); if (fail) process.exit(1);
