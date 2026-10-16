/* 🔐 구글 계정이 여러 개 로그인된 크롬 — 학생 exec 우회(assets/onf-frame.js openExec · 2026-10-16 Peter 「우회 주소도 시험해봐」 → 시험 성공).
   한 브라우저에 구글 계정이 여럿이면 `/macros/s/<id>/exec` 가 `/macros/u/N/…` 로 튀어 구글 드라이브 오류 화면
   (「Sorry, unable to open the file at this time」)이 뜬다. `<iframe credentialless>` 는 쿠키 없이 열어 안 튄다(Peter 크롬 실측).
   잰다: ① 보통 화면(자식 프레임 1)은 손대지 않는다 ② 처음 빈 문서(about:blank)의 load 는 안 센다
        ③ 오류 화면(자식 0 · 노크 없음)이면 여유(CL_GRACE) 뒤 같은 주소를 credentialless 로 **location.replace**(기록 칸 안 만듦)
        ④ 그게 되면 이 기기를 7일 기억 → 다음엔 처음부터 credentialless ⑤ 기억으로 연 것이 안 되면 기억을 버리고 보통으로 한 번
        ⑥ credentialless 를 모르는 브라우저·둘 다 안 됨 → 구글 영어 오류 대신 우리 말(액자를 걷는다) · 판이면 [닫기]
        ⑦ 노크가 오면 자식 수와 무관하게 산 화면 ⑧ 껍데기 셋(학생 홈·학생 판·선생님 판)이 이 길을 탄다 · 선생님 홈 액자는 안 탄다
   실행: node test/multilogin.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FRAME_JS = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8');
const DAY = 86400000;
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
function win(name, parent) { const w = { name, sent: [] }; w.parent = parent || w; w.postMessage = (m, o) => w.sent.push([m, o]); return w; }

/* 브라우저 대역 — 시계·저장소·credentialless 지원 여부·연결 상태를 고른다. */
function env(o) {
  o = o || {};
  const now = { v: o.now || 1760000000000 };
  const L = {}, timers = [], ls = Object.assign({}, o.ls || {});
  const g = {
    console: { info() {}, warn() {}, log() {} }, URL,
    Date: { now: () => now.v },
    navigator: { userAgent: 'node' },
    location: { search: '', pathname: '/', href: 'https://class.ownify.co.kr/' },
    localStorage: o.noStore ? null : { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    setTimeout: (f, ms) => { timers.push({ f, at: now.v + (ms || 0), on: true }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].on = false; },
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); },
    removeEventListener: (k, f) => { L[k] = (L[k] || []).filter((x) => x !== f); },
    document: { addEventListener() {}, createElement: mkEl }
  };
  if (o.cl !== false) { g.HTMLIFrameElement = function () {}; g.HTMLIFrameElement.prototype.credentialless = false; }
  else { g.HTMLIFrameElement = function () {}; }
  g.window = g;
  vm.createContext(g);
  vm.runInContext(FRAME_JS, g, { filename: 'onf-frame.js' });
  const top = win('shell');
  const tick = (ms) => { now.v += ms; let ran = true; while (ran) { ran = false; for (const x of timers) if (x.on && x.at <= now.v) { x.on = false; ran = true; x.f(); } } };
  const send = (data, source) => (L.message || []).forEach((f) => f({ data, source, origin: 'https://n-abc-0lu-script.googleusercontent.com' }));
  return { g, L, ls, now, tick, send, top, timers };
}
function mkEl(tag) {
  const el = { tag, kids: [], className: '', textContent: '', innerHTML: '', style: {}, attrs: {}, onclick: null,
    setAttribute(k, v) { el.attrs[k] = String(v); }, appendChild(c) { el.kids.push(c); c.parentNode = el; return c; } };
  return el;
}
/* 가짜 iframe — src 대입·location.replace 를 그때의 credentialless 값과 함께 적는다. load(쪽) 로 「다 읽혔다」를 쏜다. */
function mkFrame(s) {
  const nav = [], L = {};
  const doc = { kids: 0, blank: true, win: null };
  const el = { style: {}, credentialless: false, nav, L,
    addEventListener(k, f) { (L[k] = L[k] || []).push(f); },
    get src() { return this._src || ''; },
    set src(v) { this._src = v; nav.push(['src', v, !!this.credentialless]); doc.blank = true; } };
  const cw = win('exec', s.top);
  Object.defineProperty(cw, 'length', { get: () => doc.kids });
  cw.location = { get href() { if (doc.blank) return 'about:blank'; throw new Error('SecurityError: cross-origin'); },
    replace(u) { nav.push(['replace', u, !!el.credentialless]); doc.blank = true; } };
  el.contentWindow = cw; el.doc = doc;
  /* 다 읽혔다 — kids = 자식 프레임 수(정상 GAS 바깥 문서 1 · 구글 오류 화면 0) · blank = 처음 빈 문서(같은 출처) */
  el.load = (kids, blank) => { doc.kids = kids; doc.blank = !!blank; (L.load || []).forEach((f) => f({})); };
  el.inner = () => win('user', win('sandbox', cw));   // 안쪽 창(깊이 2 — exec → sandboxFrame → userHtmlFrame)
  return el;
}
const SRC = 'https://script.google.com/macros/s/APP/exec?t=T';
function open(o) {
  o = o || {};
  const s = env(o);
  const el = mkFrame(s), wait = mkEl('div'), closed = [], reloads = [];
  s.g.location.reload = () => reloads.push(1);
  wait.className = 'onf-wait';
  wait.kids.push({ className: 'onf-spin' }); wait._t = '불러오는 중';   // index.html 의 「불러오는 중」 — textContent 대입은 아이까지 지운다(DOM 과 같게)
  Object.defineProperty(wait, 'textContent', { get() { return this._t; }, set(v) { this._t = v; this.kids = []; } });
  //   홈 액자(mount)는 keep = 기억을 정한다 · 판(o.panel)은 읽기만
  const h = s.g.ONF.frame.openExec(el, SRC, wait, o.panel ? () => closed.push(1) : null, !o.panel);
  const txt = (e) => (e.textContent || '') + (e.kids || []).map(txt).join(' ');
  const btn = () => { const b = wait.kids[0]; return b && b.kids ? b.kids.find((k) => k.tag === 'button') : null; };
  return Object.assign(s, { el, wait, closed, reloads, h, btn, text: () => txt(wait) });
}
/* 막혔다 → 여유 → credentialless 로 다시 → 뜬다 */
function bypass(s) { s.el.load(0); s.tick(GRACE()); assert.deepStrictEqual(s.el.nav[s.el.nav.length - 1], ['replace', SRC, true], '우회 다시 열기가 아니다'); s.el.load(1); }
const GRACE = () => { const m = /CL_GRACE = (\d+)/.exec(FRAME_JS); assert.ok(m, 'CL_GRACE 를 못 찾았다'); return Number(m[1]); };

console.log('[여러 계정 우회 — 판별 · 다시 열기 · 기억]');

t('openExec 가 나와 있다 · 처음 열 땐 src 대입(보통) — 기억이 없으면 credentialless 를 안 켠다 · 손잡이(stop·stuck)를 돌려준다', () => {
  const s = open();
  assert.strictEqual(typeof s.g.ONF.frame.openExec, 'function');
  assert.deepStrictEqual(s.el.nav, [['src', SRC, false]], '⛔ 처음 열기가 src 대입·보통이 아니다');
  assert.ok(s.h && typeof s.h.stop === 'function' && s.h.stuck() === false, '⛔ 손잡이가 없다(판이 지울 때 노크 듣기를 못 걷는다 · 못 연 판을 못 가린다)');
});

t('① 보통 화면(자식 프레임 1)이면 아무것도 안 한다 — 다시 열지 않고 기억도 안 한다', () => {
  const s = open();
  s.el.load(1);
  s.tick(10 * GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 멀쩡한 화면을 다시 열었다');
  assert.ok(!('onfCl' in s.ls) && !('onfClTry' in s.ls), '⛔ 멀쩡한 기기를 우회 기기로 기억했다');
  assert.strictEqual(s.el.style.visibility, undefined, '⛔ 멀쩡한 액자를 걷었다');
});

t('② 처음 빈 문서(about:blank — 같은 출처라 주소가 읽힌다)의 load 는 안 센다', () => {
  const s = open();
  s.el.load(0, true);
  s.tick(10 * GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 빈 문서를 오류 화면으로 보고 다시 열었다');
});

t('③ 오류 화면(자식 0 · 노크 없음) → 여유 뒤 같은 주소를 credentialless 로 location.replace(기록 칸을 안 만든다) — 여유 전엔 안 연다', () => {
  const s = open();
  s.el.load(0);
  s.tick(GRACE() - 1);
  assert.strictEqual(s.el.nav.length, 1, '⛔ 여유를 안 기다리고 다시 열었다');
  s.tick(1);
  assert.deepStrictEqual(s.el.nav[1], ['replace', SRC, true], '⛔ credentialless 로 location.replace 를 안 했다(src 대입은 기록 칸을 하나 쌓는다 — 기록 다리 go(-n) 전제가 깨진다)');
  assert.strictEqual(s.el.credentialless, true);
  assert.ok(!('onfCl' in s.ls), '⛔ 아직 되는지 모르는데 기억했다');
});

t('④ 🟠 「두 번 걸리면」 기억 — 홈이 한 번 막혀 우회로 뜨면 onfClTry 만(기억 아님 · 구글 일시 오류 한 번으로 7일 갇히지 않게) · 다음 열기(새로고침)도 보통부터 · 또 막히면 그때 onfCl', () => {
  const s = open();
  bypass(s);
  assert.ok(!('onfCl' in s.ls), '⛔ 한 번 걸린 것으로 7일 credentialless 를 기억했다(계정 하나 학생도 구글 일시 오류 한 번이면 — R1)');
  assert.strictEqual(Number(s.ls.onfClTry), s.now.v, '⛔ 한 번 걸린 것을 안 적었다');
  const s2 = open({ ls: s.ls, now: s.now.v + 60000 });
  assert.deepStrictEqual(s2.el.nav, [['src', SRC, false]], '⛔ 한 번 걸린 기기를 처음부터 credentialless 로 열었다');
  bypass(s2);
  assert.strictEqual(Number(s2.ls.onfCl), s2.now.v, '⛔ 두 번째 열기도 막혔는데 기억을 안 했다(여러 계정 크롬은 매번 오류 화면을 거친다)');
  assert.ok(!('onfClTry' in s2.ls), '⛔ 기억한 뒤 「한 번 걸림」 표시를 안 지웠다');
  const s3 = open({ ls: s2.ls, now: s2.now.v + 60000 });
  assert.deepStrictEqual(s3.el.nav, [['src', SRC, true]], '⛔ 기억한 기기인데 처음부터 credentialless 가 아니다');
  const s4 = open({ ls: s2.ls, now: s2.now.v + 7 * DAY + 1 });
  assert.deepStrictEqual(s4.el.nav, [['src', SRC, false]], '⛔ 기억이 7일 넘었는데 credentialless 로 열었다');
});

t('④-b 「두 번」은 잇달아야 — 한 번 걸린 뒤 보통으로 뜨면 표시를 지운다 · 7일 지난 표시는 처음으로 친다', () => {
  const s = open();
  bypass(s);
  const s2 = open({ ls: s.ls, now: s.now.v + 1000 });
  s2.el.load(1);
  assert.ok(!('onfClTry' in s2.ls), '⛔ 보통으로 떴는데 「한 번 걸림」이 남았다(띄엄띄엄 일시 오류 둘로 7일 갇힌다)');
  const s3 = open({ ls: { onfClTry: String(1760000000000 - 8 * DAY) } });
  bypass(s3);
  assert.ok(!('onfCl' in s3.ls) && Number(s3.ls.onfClTry) === s3.now.v, '⛔ 7일 넘은 표시를 두 번째로 쳤다');
});

t('④-c 🟠 판(숨긴 미리 판 포함)은 기억을 **안 정한다** — 판 하나의 일시 오류로 기기 전체가 credentialless 가 되지 않게(R3) · 같은 페이지 다음 판도 보통부터', () => {
  const s = open({ panel: true });
  bypass(s);
  assert.ok(!('onfCl' in s.ls) && !('onfClTry' in s.ls), '⛔ 판이 기억을 썼다(숨긴 판 하나의 오류로 기기 전체 7일 — R3)');
  const el2 = mkFrame(s);
  s.g.ONF.frame.openExec(el2, SRC, null, null, false);
  assert.deepStrictEqual(el2.nav, [['src', SRC, false]], '⛔ 판이 막힌 것으로 같은 페이지 다른 판까지 credentialless 로 열었다');
});

t('④-d 같은 페이지 — 홈이 우회로 떴으면(첫 방문 · 아직 기억 전) 뒤에 여는 판은 처음부터 credentialless(판마다 오류 화면 + 여유를 안 거친다) · 저장은 안 한다', () => {
  const s = open();
  bypass(s);
  const el2 = mkFrame(s);
  s.g.ONF.frame.openExec(el2, SRC, null, null, false);
  assert.deepStrictEqual(el2.nav, [['src', SRC, true]], '⛔ 홈이 막혔던 페이지에서 판을 또 보통부터 열었다(판마다 1.5초+)');
  assert.ok(!('onfCl' in s.ls), '⛔ 페이지 안 기억을 기기에 적었다');
});

t('④-2 기억으로 처음부터 연 credentialless 가 되면 기억 시각을 **안 늘린다**(7일마다 한 번 보통으로 다시 재 본다)', () => {
  const t0 = 1760000000000 - 3 * DAY;
  const s = open({ ls: { onfCl: String(t0) } });
  assert.deepStrictEqual(s.el.nav, [['src', SRC, true]]);
  s.el.load(1);
  assert.strictEqual(Number(s.ls.onfCl), t0, '⛔ 기억으로 연 것에 기억을 덧씌웠다 — 영영 보통으로 안 돌아간다');
  assert.ok(!('onfClTry' in s.ls), '⛔ 기억으로 연 것을 「한 번 걸림」으로 셌다(보통이 막힌 적이 없다)');
});

t('⑤ 기억으로 연 credentialless 가 안 되면 홈은 기억을 버리고 보통으로 한 번(replace) — 그것도 안 되면 연결 안내 · 판은 기억을 안 건드리고 보통으로만', () => {
  const s = open({ ls: { onfCl: String(1760000000000 - DAY) } });
  s.el.load(0); s.tick(GRACE());
  assert.ok(!('onfCl' in s.ls), '⛔ 안 되는 기억을 안 버렸다(7일 갇힌다)');
  assert.deepStrictEqual(s.el.nav[1], ['replace', SRC, false], '⛔ 보통으로 다시 안 열었다');
  s.el.load(0); s.tick(GRACE());
  assert.strictEqual(s.el.nav.length, 2, '⛔ 둘 다 해 봤는데 또 열었다(빙빙 돈다)');
  assert.strictEqual(s.el.style.visibility, 'hidden', '⛔ 구글 오류 화면을 안 걷었다');
  assert.ok(/화면이 안 열렸어요/.test(s.text()) && /인터넷 연결/.test(s.text()), '⛔ 연결 안내가 아니다: ' + s.text());
  assert.ok(s.h.stuck() === true, '⛔ 못 연 액자를 못 연 것으로 안 알린다');
  const p = open({ panel: true, ls: { onfCl: String(1760000000000 - DAY) } });
  p.el.load(0); p.tick(GRACE());
  assert.ok('onfCl' in p.ls, '⛔ 판이 기억을 버렸다(판은 읽기만)');
  assert.deepStrictEqual(p.el.nav[1], ['replace', SRC, false], '⛔ 판이 보통으로 다시 안 열었다');
});

t('⑥ 🟡 credentialless 를 모르는 브라우저(사파리·iOS·파이어폭스 — 이 버그가 거의 없다)의 실패 = 연결 안내(여러 계정 탓을 단정하지 않는다) · 액자를 걷는다 · 홈엔 [다시 열기](새로고침)', () => {
  const s = open({ cl: false });
  s.el.load(0); s.tick(GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 모르는 브라우저에서 다시 열었다');
  assert.strictEqual(s.el.style.visibility, 'hidden');
  assert.ok(/화면이 안 열렸어요/.test(s.text()) && /인터넷 연결/.test(s.text()) && !/여러 개/.test(s.text()), '⛔ 사파리 일시 오류를 여러 계정 탓으로 말했다(R2): ' + s.text());
  assert.ok(!('onfCl' in s.ls) && !('onfClTry' in s.ls));
  assert.ok(s.wait.kids.length === 1 && s.wait.kids[0].className === 'onf-stuck' && s.wait.textContent === '', '⛔ 「불러오는 중」 고리·글을 안 걷었다(못 연 것을 아직 여는 중처럼 보인다)');
  const b = s.btn();
  assert.ok(b && b.textContent === '다시 열기', '⛔ 홈 안내에 [다시 열기]가 없다(누를 것 없는 막다른 화면)');
  b.onclick();
  assert.strictEqual(s.reloads.length, 1, '⛔ [다시 열기]가 새로고침을 안 한다');
});

t('⑥-3 판이면 안내에 [닫기] — 누르면 부르는 쪽 닫기', () => {
  const s = open({ cl: false, panel: true });
  s.el.load(0); s.tick(GRACE());
  const b = s.btn();
  assert.ok(b && b.textContent === '닫기' && typeof b.onclick === 'function', '⛔ 판 안내에 [닫기]가 없다(교재가 안 떴으니 교재의 ✕ 도 없다 — 막다른 골목)');
  b.onclick();
  assert.strictEqual(s.closed.length, 1, '⛔ [닫기]가 판을 안 닫는다');
  assert.strictEqual(s.reloads.length, 0);
});

t('⑥-4 stop() — 판정 전에 걷으면 노크 듣기를 걷고 뒤 load·여유에도 아무 일 없다(판을 load 전에 지울 때 · 누수)', () => {
  const s = open();
  const n0 = (s.L.message || []).length;
  s.el.load(0);
  s.h.stop();
  assert.strictEqual((s.L.message || []).length, n0 - 1, '⛔ stop 이 노크 듣기를 안 걷었다');
  s.tick(10 * GRACE()); s.el.load(0); s.tick(10 * GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 걷은 액자를 다시 열었다');
});

t('⑦-0 노크가 load **전에** 와도(안쪽이 바깥 load 전에 쏜다 — 보통 순서) 산 화면 — 그 뒤 자식 0 load 에도 다시 안 연다', () => {
  const s = open();
  s.send({ onf: 'hist', op: 'hi' }, s.el.inner());
  s.el.load(0);
  s.tick(10 * GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 먼저 노크한 화면을 다시 열었다');
});

t('⑦ 노크(그 액자 후손의 말 — 깊이 무관)가 오면 산 화면 — 자식 수가 0 이어도 다시 안 연다 · 남의 창 말은 안 친다', () => {
  const s = open();
  s.send({ onf: 'theme', v: 'dark' }, win('stranger', s.top));
  s.el.load(0);
  s.send({ onf: 'hist', op: 'hi' }, s.el.inner());
  s.tick(10 * GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 노크한(살아 있는) 화면을 다시 열었다');
  const s2 = open();
  s2.el.load(0);
  s2.send({ onf: 'theme' }, win('stranger', s2.top));
  s2.tick(GRACE());
  assert.strictEqual(s2.el.nav.length, 2, '⛔ 남의 창 말을 노크로 쳐서 오류 화면을 그대로 뒀다');
});

t('⑦-2 여유 동안 자식 프레임이 생기면(늦게 그리는 래퍼) 산 화면', () => {
  const s = open();
  s.el.load(0);
  s.el.contentWindow.location.replace = () => { throw new Error('부르면 안 된다'); };
  s.el.doc.kids = 1;
  s.tick(GRACE());
  assert.strictEqual(s.el.nav.length, 1, '⛔ 늦게 그린 래퍼(여유 안에 자식이 생김)를 다시 열었다');
  assert.strictEqual(s.el.style.visibility, undefined);
});

t('⑦-3 판정이 끝나면 노크 듣기를 걷는다(판이 오갈 때마다 리스너가 쌓이지 않게)', () => {
  const s = open();
  const n0 = (s.L.message || []).length;
  s.el.load(1);
  assert.strictEqual((s.L.message || []).length, n0 - 1, '⛔ 판정 뒤에도 노크 듣기가 남았다');
});

t('여유 동안 액자가 지워지면(액자 창 없음) 판정하지 않는다 — 기억도 안 버리고 다시도 안 연다', () => {
  const t0 = String(1760000000000 - DAY);
  const s = open({ ls: { onfCl: t0 } });
  s.el.load(0);
  s.el.contentWindow = null;
  s.tick(GRACE());
  assert.strictEqual(s.ls.onfCl, t0, '⛔ 지워진 판 때문에 우회 기억을 버렸다');
  assert.strictEqual(s.el.nav.length, 1, '⛔ 지워진 판을 다시 열었다');
  assert.strictEqual((s.L.message || []).length, 0, '⛔ 노크 듣기를 안 걷었다');
});

t('저장소가 막힌 창(사생활 보호 · localStorage 없음)에서도 죽지 않는다 — 기억만 못 한다', () => {
  const s = open({ noStore: true });
  s.el.load(0); s.tick(GRACE());
  assert.deepStrictEqual(s.el.nav[1], ['replace', SRC, true]);
  s.el.load(1);
});

t('location.replace 를 못 부르면(던짐) src 대입으로라도 연다', () => {
  const s = open();
  s.el.contentWindow.location.replace = () => { throw new Error('x'); };
  s.el.load(0); s.tick(GRACE());
  assert.deepStrictEqual(s.el.nav[1], ['src', SRC, true]);
});

console.log('\n[껍데기 셋이 이 길을 탄다]');

t('⑧ 학생 홈 액자(mount) — 기억한 기기면 홈 액자도 처음부터 credentialless · 안내 자리는 opts.wait', () => {
  const s = env({ ls: { onfCl: String(1760000000000 - DAY) } });
  const el = mkFrame(s); el.getBoundingClientRect = () => ({ top: 0, bottom: 800 });
  s.g.history = { state: null, replaceState() {}, pushState() {} };
  s.g.document.documentElement = { classList: { toggle() {} } };
  s.g.ONF.frame.mount(el, SRC, { wait: mkEl('div') });
  assert.deepStrictEqual(el.nav, [['src', SRC, true]], '⛔ 홈 액자가 우회 길을 안 탄다');
  assert.ok(/openExec\(frameEl, src, opts\.wait \|\| null, null, true\)/.test(FRAME_JS), '⛔ 홈 액자가 기억을 정하는 자리(keep)가 아니다');
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/wait: document\.querySelector\('\.onf-wait'\)/.test(idx), '⛔ index.html 이 안내 자리(.onf-wait)를 안 넘긴다 — 못 열면 구글 오류 화면 그대로');
});

t('⑧-2 학생 판(bookMake) — 우회 길로 연다(숨긴 판은 park=1 주소 그대로) · 안내 자리는 그 판의 「불러오는 중」 · [닫기]', () => {
  const src = FRAME_JS;
  const mk = src.slice(src.indexOf('function bookMake('), src.indexOf('function bookDrop('));
  assert.ok(/p\.oe = openExec\(p\.el, parked \? src \+ \(src\.indexOf\('\?'\) < 0 \? '\?' : '&'\) \+ 'park=1' : src, wait, bookClose\);/.test(mk), '⛔ 학생 판이 우회 길(openExec · park=1 · 안내 자리 · 닫기 · 기억은 안 정함)을 안 탄다');
  assert.ok(!/p\.el\.src = /.test(mk), '⛔ 판 액자를 src 로 바로 연다(우회 없음)');
});

t('⑧-3 선생님 판(teacher bookMake)은 우회 길 · 선생님 **홈** 액자(/a/macros/ownify.co.kr — 구글 로그인이 있어야 열린다)는 안 탄다 · onf-frame.js 를 싣는다', () => {
  const th = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  const mk = th.slice(th.indexOf('function bookMake('), th.indexOf('function bookDrop('));
  assert.ok(/p\.oe = ONF\.frame\.openExec\(p\.el, u, wait, bookClose\);/.test(mk), '⛔ 선생님 판이 우회 길을 안 탄다(선생님은 회사+개인 계정을 같이 쓰는 일이 흔하다)');
  assert.ok(/<script src="\.\.\/assets\/onf-frame\.js"><\/script>/.test(th), '⛔ 선생님 껍데기가 onf-frame.js 를 안 싣는다');
  const mount = th.slice(th.indexOf('function mount()'), th.indexOf('var frameWatch = null;'));
  assert.ok(/frame\.src = EXEC/.test(mount) && !/openExec|credentialless/.test(mount), '⛔ 선생님 홈 액자를 우회 길로 연다 — credentialless 면 구글 로그인 쿠키가 없어 회사 계정 문에서 잘린다');
});

t('⑧-4 선생님 판 — onf-frame.js 가 없으면(못 받음) 종전대로 src 로 연다', () => {
  const th = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  const mk = th.slice(th.indexOf('function bookMake('), th.indexOf('function bookDrop('));
  assert.ok(/else p\.el\.src = u;/.test(mk), '⛔ onf-frame.js 가 없을 때 판이 안 열린다');
});

t('안내 꼴(onf-ui.css .onf-stuck) — 가운데 · 낱말 안 쪼갬 · 단추', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets', 'onf-ui.css'), 'utf8');
  assert.ok(/\.onf-stuck \{[^}]*text-align: center;[^}]*word-break: keep-all;/.test(css), '⛔ 안내 꼴이 없다(폰에서 「주세요.」만 떨어진다)');
  assert.ok(/\.onf-stuck button \{/.test(css), '⛔ [닫기] 꼴이 없다');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
