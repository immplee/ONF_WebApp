/* 📖 홈 안 교재 판(2026-10-12 홈 리디자인 3단계) — 껍데기가 홈 옆에 교재 액자를 하나 더 띄운다.
   잰다: ① 홈 액자에서 온 openBook 만 받는다 ② 교재 액자에서 온 bookClose·bookFull 만 받는다
        ③ 교재 액자의 기록 다리(hist)·제목(title)은 안 받는다 ④ 주소는 교재만 · 토큰 버림 · embed=1
        ⑤ caps 는 노크(frameHello)한 창에 그 출처로만 ⑥ unload 처리기 0
   실행: node test/book-panel.test.js */
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

function setup(bs, o) {
  o = o || {};
  const listeners = {};
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '', vars: {}, style: { setProperty(k, v) { el.vars[k] = v; }, removeProperty(k) { delete el.vars[k]; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; }, getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
    L: {}, addEventListener(k, f) { (el.L[k] = el.L[k] || []).push(f); } }; return el; };   // 🔐 액자 load(여러 계정 우회 openExec — 따로 multilogin.test.js · 못 연 판은 아래 🔐 검사)
  const top = win('shell');
  const timers = [];
  const g = { listeners, top, timers,
    setTimeout: (f, ms) => { timers.push({ f, ms, on: true }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].on = false; } };
  vm.createContext(g);
  g.window = g; g.URL = URL; g.localStorage = null; g.innerWidth = 1440;
  g.T = 1.7e12; g.Date = { now: () => g.T };   // 📖 판 나이(2시간) — 가짜 시계(g.T 를 민다 · onf-frame.js 는 Date.now 만 쓴다) g.location = { search: '', pathname: '/', href: 'https://class.ownify.co.kr/' };
  g.navigator = { userAgent: 'node' }; g.history = { state: null, replaceState() {}, pushState() {} };
  const root = { attrs: {}, setAttribute(k, v) { root.attrs[k] = v; } };
  g.document = { addEventListener() {}, body, createElement: mkEl, documentElement: root };
  g.addEventListener = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); };
  g.removeEventListener = (k, fn) => { listeners[k] = (listeners[k] || []).filter((x) => x !== fn); };
  if (o.pre) o.pre(g, root);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' });
  const homeWin = win('home-exec', top), homeInner = win('home-user', homeWin);
  const frameEl = { contentWindow: homeWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), addEventListener() {} };
  const opened = [];
  const M = g.ONF.frame.mount(frameEl, 'https://script.google.com/x/exec?t=T', { phone: o.phone !== false, swap: o.swap, perf: o.perf, bookSrc: bs || ((h) => { opened.push(h); const m = /-(e\d+)-/.exec(h);
    return /mode=share/.test(h) ? 'https://script.google.com/x/exec?t=T&mode=share' + (m && m[1] !== 'e1' ? '&ep=' + m[1] : '') + '&embed=1' : /mode=mine&v/.test(h) ? 'https://script.google.com/x/exec?t=T&mode=mine&embed=1' : null; }) });
  const send = (data, source, origin) => listeners.message.forEach((fn) => fn({ data, source, origin: origin || 'https://n-abc-0lu-script.googleusercontent.com' }));
  const panel = () => body.kids.find((k) => k.className === 'onf-bookpanel');
  const panels = () => body.kids.filter((k) => k.className === 'onf-bookpanel');
  const obj = (box) => M && M._books.find((b) => b.box === box);   // 📖 검사용 판 목록(mount 반환값) — 판 자격·back 을 본다
  return { g, listeners, body, homeInner, homeWin, send, panel, panels, opened, top, root, timers, frameEl, obj, drop: (box) => M._drop(obj(box)) };
}

console.log('[홈 안 교재 판 — 껍데기]');

t('홈 노크(bookHello)에 caps(book:1)를 그 출처로만 답한다 · 키보드 노크(frameHello)엔 안 답한다 · 남의 창엔 안 답한다', () => {
  const s = setup();
  s.send({ onf: 'frameHello' }, s.homeInner);
  assert.strictEqual(s.homeInner.sent.length, 0, '⛔ 키보드 노크에 caps 를 답했다');
  const stranger = win('stranger', s.top);
  s.send({ onf: 'bookHello' }, stranger);
  assert.strictEqual(stranger.sent.length, 0, '⛔ 우리 액자 밖 창에 caps 를 답했다');
  s.send({ onf: 'bookHello' }, s.homeInner);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.homeInner.sent)), [[{ onf: 'caps', book: 1, phone: 1 }, 'https://n-abc-0lu-script.googleusercontent.com']], '⛔ caps 가 없거나 * 로 갔다(📱 phone:1 = 폰 판도 할 줄 안다 · 10-14)');
});

t('홈 액자에서 온 openBook 만 판을 연다 · 남의 창·남의 출처는 버린다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, win('stranger', s.top));
  assert.ok(!s.panel(), '⛔ 우리 액자 밖 창의 openBook 으로 판이 열렸다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner, 'https://evil.example.com');
  assert.ok(!s.panel(), '⛔ googleusercontent 가 아닌 출처의 말로 판이 열렸다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/?mode=mine' }, s.homeInner);
  assert.ok(!s.panel(), '⛔ 주소를 못 만들었는데(null) 판이 열렸다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  const p = s.panel();
  assert.ok(p && p.kids[0].src === 'https://script.google.com/x/exec?t=T&mode=share&embed=1', '⛔ 홈의 openBook 으로 판이 안 열렸다');
  assert.ok(!('sandbox' in p.kids[0].attrs) && p.kids[0].attrs.allow === 'clipboard-write; microphone', '교재 액자 권한은 홈 액자와 같다');
  assert.ok(p.kids[1] && p.kids[1].className === 'onf-wait' && /불러오는 중/.test(p.kids[1].innerHTML), '⛔ 판에 「불러오는 중」이 없다(구글이 그릴 때까지 흰 빈칸)');
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
  assert.ok(/\.onf-bookpanel iframe \{[^}]*position: relative; z-index: 1;/.test(css) && /\.onf-bookpanel \.onf-wait \{ position: absolute; \}/.test(css), '⛔ 판 안 「불러오는 중」이 액자 뒤가 아니다(그린 뒤에도 덮거나 판 밖 전체를 덮는다)');
});

t('교재 액자에서 온 bookFull·bookClose 만 듣는다 — 홈 액자가 보낸 같은 말은 버린다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  const bookEl = s.panel().kids[0];
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  bookEl.contentWindow = bookWin;
  s.send({ onf: 'bookFull', on: true }, s.homeInner);
  assert.ok(!s.panel().classList.contains('full'), '⛔ 홈 액자의 bookFull 을 받았다');
  s.send({ onf: 'bookFull', on: true }, bookInner);
  assert.ok(s.panel().classList.contains('full'), '⛔ 교재 액자의 bookFull 을 안 받았다');
  s.send({ onf: 'bookFull', on: false }, bookInner);
  assert.ok(!s.panel().classList.contains('full'), '창으로 되돌리기');
  s.send({ onf: 'bookClose' }, s.homeInner);
  assert.ok(s.panel(), '⛔ 홈 액자의 bookClose 로 닫혔다');
  s.send({ onf: 'bookClose' }, bookInner, 'https://evil.example.com');
  assert.ok(s.panel(), '⛔ 남의 출처로 닫혔다');
  s.homeInner.sent.length = 0;
  s.send({ onf: 'bookClose' }, bookInner);
  assert.ok(!s.panel(), '⛔ 교재 액자의 bookClose 로 안 닫혔다(액자째 지운다)');
  //   닫으면 판을 연 홈에 그 출처로 bookClosed(홈이 교재 카드 % 채움을 다시 읽는다 · 2026-10-12) — '*' 금지 · 한 번만
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.homeInner.sent)), [[{ onf: 'bookClosed' }, 'https://n-abc-0lu-script.googleusercontent.com']], '⛔ 닫혔다는 말이 홈에 안 갔거나 * 로 갔다');
  s.send({ onf: 'bookClose' }, bookInner);
  assert.strictEqual(s.homeInner.sent.length, 1, '⛔ 이미 닫힌 판의 bookClose 로 또 알렸다');
});

t('교재 액자의 기록 다리(hist hi)·제목(title)·노크는 **홈 자물쇠를 못 지난다** — 뒤로·키보드·탭 제목은 홈 것', () => {
  const s = setup();
  s.g.document.title = 'Ownify┃홈';
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  s.panel().kids[0].contentWindow = bookWin;
  s.send({ onf: 'hist', op: 'hi' }, bookInner);
  assert.strictEqual(bookInner.sent.length, 0, '⛔ 교재 액자의 hist hi 에 hist-on 으로 답했다 — 홈의 「뒤로 = 창 닫기」 다리를 뺏긴다');
  s.send({ onf: 'title', t: '교재 제목' }, bookInner);
  assert.strictEqual(s.g.document.title, 'Ownify┃홈', '⛔ 교재 액자가 탭 제목을 바꿨다');
  s.send({ onf: 'frameHello' }, bookInner);
  assert.strictEqual(bookInner.sent.length, 0, '⛔ 교재 액자의 노크를 홈 노크로 받았다(키보드 보정 창이 바뀐다)');
});

t('판 안에서 교재 ↔ 내 문장 — 교재 액자가 보낸 openBook 은 판만 바꾼다(새 판 · 보이던 판은 숨김 — 대기를 모르면 지움) · 거르개(null)면 그대로 · 남의 출처는 버린다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  const box = s.panel(), bookEl = box.kids[0];
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  bookEl.contentWindow = bookWin;
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/?mode=mine' }, bookInner);
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner, 'https://evil.example.com');
  assert.ok(s.panels().length === 1 && s.panel() === box && !box.classList.contains('park'), '⛔ 거르개가 못 만든 주소(null)·남의 출처의 openBook 으로 판을 바꿨다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner);
  assert.ok(s.panels().length === 1 && s.panel() !== box && s.panel().kids[0].src === 'https://script.google.com/x/exec?t=T&mode=share&ep=e2&embed=1', '⛔ 판 안 openBook 으로 새 주소 판이 안 떴다(노크 없던 옛 판은 지운다)');
});

t('판 자리 — 홈이 알린 왼쪽 메뉴 끝(left)부터 덮는다 · 남의 값(0·음수·화면 60% 넘음·숫자 아님)은 종전 자리 · 판 안 갈아 끼우기는 자리 그대로 (2026-10-12 Peter)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: 184 }, s.homeInner);
  const p = s.panel();
  assert.ok(p.classList.contains('beside') && p.vars['--bl'] === '184px', '⛔ 왼쪽 메뉴 끝부터 덮지 않는다');
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  p.kids[0].contentWindow = bookWin;
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner);
  const q = s.panel();
  assert.ok(q !== p && q.classList.contains('beside') && q.vars['--bl'] === '184px', '⛔ 판 안에서 갈아 끼우니(새 판) 자리가 바뀌었다');
  for (const bad of [0, -5, 1000, '184', NaN]) {
    const s2 = setup();
    s2.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: bad }, s2.homeInner);
    assert.ok(!s2.panel().classList.contains('beside') && !('--bl' in s2.panel().vars), '⛔ 믿지 못할 left 로 판 자리를 바꿨다: ' + String(bad));
  }
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
  assert.ok(/\.onf-bookpanel \{[^}]*top: 16px; right: 16px; bottom: 16px;[^}]*border-radius: 28px; overflow: hidden;/.test(css)
    && /\.onf-bookpanel\.beside \{ top: 0; right: 0; bottom: 0; left: var\(--bl\); width: auto; padding: var\(--bm, 16px\); border: 0; border-radius: 0; box-shadow: none; background: var\(--onf-dock-bg\); \}/.test(css)   // 🅱 칸 = 메뉴 옆 빈 칸 전체(2026-10-16) · 판은 그 안의 안쪽 상자(iframe)
    && /\.onf-bookpanel\.beside iframe \{ border-radius: var\(--br, 28px\); box-shadow: 0 0 0 1px var\(--onf-line\); \}/.test(css)
    && /--onf-dock-bg: #F1EADE;/.test(css) && /--onf-dock-bg: #1E1611;/.test(css)
    && css.indexOf('.onf-bookpanel.beside {') < css.indexOf('.onf-bookpanel.full {') && css.indexOf('.onf-bookpanel.full {') < css.indexOf('.onf-ph .onf-bookpanel {')   // ⤢·폰이 이긴다(같은 무게 — 뒤에 둔다)
    && /\.onf-bookpanel\.full \{ top: 0; right: 0; bottom: 0; left: 0; width: auto; padding: 10px;[^}]*background: var\(--onf-frame\); \}/.test(css) && /--onf-frame: #E9DFD0;/.test(css)   // 🌙 둘레 = 이름(밝은 값 그대로)
    && /\.onf-bookpanel\.full iframe \{ border-radius: 22px;/.test(css), '⛔ 판 모양(떠 있는 큰 판 · 메뉴 옆 · 전체 = 화면 끝까지 덮고 안은 둥근 판 — 뒤 홈이 안 보인다)');
});

t('판 자리 B — 홈이 알린 메뉴 끝·여백·모서리(left·m·r)로 칸을 덮는다 · 남의 m·r 은 기본값 (2026-10-16 Peter 「B로 가자」)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: 270, m: 22, r: 28 }, s.homeInner);
  const p = s.panel();
  assert.ok(p.classList.contains('beside') && p.vars['--bl'] === '270px' && p.vars['--bm'] === '22px' && p.vars['--br'] === '28px');
  for (const bad of [-1, 41, '22', NaN, undefined]) {
    const s2 = setup();
    s2.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: 270, m: bad, r: bad }, s2.homeInner);
    assert.ok(s2.panel().vars['--bl'] === '270px' && !('--bm' in s2.panel().vars) && !('--br' in s2.panel().vars), '⛔ 믿지 못할 m·r 을 받았다: ' + String(bad));
  }
});
t('숨긴 판(bookWarm panel:1)도 보일 때와 같은 칸 값으로 만든다', () => {
  const s = setup();
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', panel: 1, left: 270, m: 22, r: 28 }, s.homeInner);
  const p = s.panel();
  assert.ok(p.classList.contains('park') && p.vars['--bl'] === '270px' && p.vars['--bm'] === '22px' && p.vars['--br'] === '28px');
});
t('bookBox — 창 크기가 바뀌면 보이는 판·숨긴 판 모두 새 칸 · 다시 안 불러옴 · 홈 액자 말만', () => {
  const s = setup();
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share', panel: 1, left: 270, m: 22, r: 28 }, s.homeInner);
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: 270, m: 22, r: 28 }, s.homeInner);
  const before = s.panels().map((p) => [p, p.kids[0], p.kids[0].src]);
  s.send({ onf: 'bookBox', left: 224, m: 12, r: 22 }, win('stranger', s.top));
  assert.ok(s.panels().every((p) => p.vars['--bl'] === '270px'), '⛔ 남의 창 bookBox 로 칸을 바꿨다');
  s.send({ onf: 'bookBox', left: 224, m: 12, r: 22 }, s.homeInner);
  assert.ok(s.panels().every((p) => p.vars['--bl'] === '224px' && p.vars['--bm'] === '12px' && p.vars['--br'] === '22px'), '⛔ 판 하나라도 새 칸이 아니다');
  assert.deepStrictEqual(s.panels().map((p) => [p, p.kids[0], p.kids[0].src]), before, '⛔ 판·액자·주소가 바뀌었다(다시 불러옴)');
});
t('판 안 갈아 끼우기(left 없음)는 보이던 판의 칸 값(left·m·r)을 그대로 이어받는다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: 270, m: 22, r: 28 }, s.homeInner);
  const p = s.panel(), bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  p.kids[0].contentWindow = bookWin;
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner);
  const q = s.panel();
  assert.ok(q !== p && q.vars['--bl'] === '270px' && q.vars['--bm'] === '22px' && q.vars['--br'] === '28px', '⛔ 갈아 끼운 판이 칸 값(m·r)을 잃었다');
});

t('홈이 탭을 바꾸면(bookDismiss) 판을 닫는다 · 홈 액자에서 온 것만 · 판이 없으면 아무 일 없음 (2026-10-12 Peter)', () => {
  const s = setup();
  s.send({ onf: 'bookDismiss' }, s.homeInner);
  assert.ok(!s.panel(), '판이 없을 땐 아무 일 없음');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  s.send({ onf: 'bookDismiss' }, win('stranger', s.top));
  assert.ok(s.panel(), '⛔ 우리 액자 밖 창의 말로 판이 닫혔다');
  s.send({ onf: 'bookDismiss' }, s.homeInner);
  assert.ok(!s.panel(), '⛔ 홈이 탭을 바꿨는데 판이 남았다');
});

t('🌙 화면 색 — 홈 액자가 알린 theme 만 <html data-theme> · localStorage 에 둔다(다음에 열 때 그리기 전에) · 남의 창·남의 출처·모르는 값은 버린다 (Peter 2026-10-12 에스프레소)', () => {
  const s = setup(), ls = {};
  s.g.localStorage = { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } };
  s.send({ onf: 'theme', v: 'dark' }, win('stranger', s.top));
  s.send({ onf: 'theme', v: 'dark' }, s.homeInner, 'https://evil.example.com');
  s.send({ onf: 'theme', v: 'purple' }, s.homeInner);
  assert.ok(!('data-theme' in s.root.attrs) && !('onfTheme' in ls), '⛔ 남의 말·모르는 값으로 화면 색을 바꿨다');
  s.send({ onf: 'theme', v: 'dark' }, s.homeInner);
  assert.ok(s.root.attrs['data-theme'] === 'dark' && ls.onfTheme === 'dark', '⛔ 홈이 알린 다크를 안 달았다(또는 안 남겼다)');
  s.send({ onf: 'theme', v: 'light' }, s.homeInner);
  assert.ok(s.root.attrs['data-theme'] === 'light' && ls.onfTheme === 'light', '⛔ 밝게로 안 돌아온다');
  //   다크 값 — 바깥 틀의 색 이름은 전부 다크 값이 있다(밝은 값만 있으면 다크에서 그 자리만 밝다)
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
  const blk = (sel) => { const i = css.indexOf(sel); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
  const lightN = [...blk(':root {').matchAll(/(--onf-[a-z]+):/g)].map((m) => m[1]), darkB = blk(':root[data-theme="dark"] {');
  assert.ok(lightN.length >= 8, '⛔ 색 이름을 못 읽었다');
  for (const n of lightN) assert.ok(darkB.includes(n + ':'), '⛔ 바깥 틀 ' + n + ' 에 다크 값이 없다');
  //   머리 스크립트 — 셋 다(학생·선생님·과제) 스타일보다 먼저 · 남긴 값 → 없으면 기기 설정
  for (const f of ['index.html', 'teacher/index.html', 'hw.html']) {
    const h = fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), i = h.indexOf('localStorage.getItem("onfTheme")'), c = h.indexOf('onf-ui.css');
    assert.ok(i > 0 && i < c, '⛔ ' + f + ' — 화면 색을 스타일보다 먼저 안 단다(밝은 틀이 번쩍인다)');
    //   [Peter 2026-10-14 「홈페이지 기본은 다크모드로」] 남긴 값이 없으면 기기가 밝아도 어둡게 · 남긴 밝게는 밝게
    const code = /<script>(\/\* 🌙 다크 모드[\s\S]*?)<\/script>/.exec(h)[1];
    const paint = (store) => { const root = { attrs: {}, setAttribute(k, v) { root.attrs[k] = v; } };
      const g = { localStorage: { getItem: (k) => (k in store ? store[k] : null) }, matchMedia: () => ({ matches: false }), document: { documentElement: root } };
      g.window = g; vm.createContext(g); vm.runInContext(code, g); return root.attrs['data-theme']; };
    assert.strictEqual(paint({}), 'dark', '⛔ ' + f + ' — 처음 여는 기기(밝음)에서 바깥 틀이 밝게 번쩍인다(기본 어둡게)');
    assert.strictEqual(paint({ onfTheme: 'light' }), 'light', '⛔ ' + f + ' — 안쪽이 남긴 밝게를 안 따른다');
    assert.strictEqual(paint({ onfTheme: 'dark' }), 'dark');
  }
});

t('🌙 다크 2단계 — 판 안 교재가 themeAsk 로 물으면 지금 틀 색을 그 창·그 출처로 답한다 · 홈이 색을 바꾸면 물었던 교재에도 알린다 · 남의 출처엔 안 답한다 · 폰(홈 액자째 넘어간 교재)도 (2026-10-13)', () => {
  const s = setup(), O = 'https://n-abc-0lu-script.googleusercontent.com', js = (x) => JSON.parse(JSON.stringify(x));
  s.root.getAttribute = (k) => s.root.attrs[k];
  s.send({ onf: 'theme', v: 'dark' }, s.homeInner);
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  s.panel().kids[0].contentWindow = bookWin;
  s.send({ onf: 'themeAsk' }, bookInner, 'https://evil.example.com');
  s.send({ onf: 'themeAsk' }, win('stranger', s.top));
  assert.strictEqual(bookInner.sent.length, 0, '⛔ 남의 출처·남의 창에 답했다');
  s.send({ onf: 'themeAsk' }, bookInner);
  assert.deepStrictEqual(js(bookInner.sent), [[{ onf: 'theme', v: 'dark' }, O]], '⛔ 교재 물음에 지금 색(다크)을 그 출처로 안 답했다');
  s.send({ onf: 'theme', v: 'light' }, s.homeInner);
  assert.deepStrictEqual(js(bookInner.sent.slice(-1)), [[{ onf: 'theme', v: 'light' }, O]], '⛔ 홈이 바꾼 색을 물었던 교재에 안 알렸다');
  s.homeInner.sent.length = 0;
  s.send({ onf: 'themeAsk' }, s.homeInner);
  assert.deepStrictEqual(js(s.homeInner.sent), [[{ onf: 'theme', v: 'light' }, O]], '⛔ 폰(홈 액자째 넘어간 교재)의 물음에 안 답했다');
});

t('📖 교재 데우기(bookWarm) — 홈 액자의 말만 · 판과 같은 거르개(교재만) · 쿠키 없이 한 번 GET · 같은 주소 두 번은 한 번 · 판은 안 연다 (2026-10-12 · 설계서 §1-5)', () => {
  const s = setup(), got = [];
  s.g.fetch = (u, o) => { got.push([u, JSON.parse(JSON.stringify(o))]); return Promise.resolve(); };
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, win('stranger', s.top));
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner, 'https://evil.example.com');
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/?mode=hw' }, s.homeInner);
  assert.strictEqual(got.length, 0, '⛔ 남의 말·교재 아닌 주소로 데웠다');
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  assert.deepStrictEqual(got, [['https://script.google.com/x/exec?t=T&mode=share&embed=1', { mode: 'no-cors', credentials: 'omit', cache: 'no-store' }]], '⛔ 데우기 GET 이 판 주소·한 번·쿠키 없음이 아니다');
  assert.ok(!s.panel(), '⛔ 데우기가 판을 열었다(교재가 접속 신호를 보낸다)');
});

console.log('[숨긴 판 — 2026-10-13 Peter 「미리 불러와서 기다리는 시간이 아예 없게」]');
const O = 'https://n-abc-0lu-script.googleusercontent.com', js = (x) => JSON.parse(JSON.stringify(x));
const E1 = 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', E2 = 'https://class.ownify.co.kr/a-s1-e2-b?mode=share', E3 = 'https://class.ownify.co.kr/a-s1-e3-b?mode=share', E4 = 'https://class.ownify.co.kr/a-s1-e4-b?mode=share';
/* 판 하나에 교재 창을 붙이고 노크(bookHi)까지 — 새 교재가 뜨면 하는 일 */
function hi(s, box, origin) {
  const bw = win('book-exec', s.top), bi = win('book-user', bw);
  box.kids[0].contentWindow = bw;
  s.send({ onf: 'bookHi' }, bi, origin);
  return bi;
}

t('닫으면 지우지 않고 숨긴다(.park) · 교재에 bookPark{on:true}(노크한 그 창·출처로만) · 홈에 bookClosed 한 번 · 같은 주소를 다시 열면 **그 판** 그대로(새로 안 받는다)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1, left: 184 }, s.homeInner);
  const box = s.panel(), src0 = box.kids[0].src;
  const bi = hi(s, box);
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, O]], '⛔ 노크에 지금 상태(보임)를 그 출처로 안 답했다');
  bi.sent.length = 0; s.homeInner.sent.length = 0;
  s.send({ onf: 'bookFull', on: true }, bi);
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(s.panels().length === 1 && box.classList.contains('park'), '⛔ 닫았는데 판을 지웠다(또는 안 숨겼다)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: true }, O]], '⛔ 숨겼는데 교재에 「대기」를 안 알렸다(접속 표시가 남는다)');
  assert.deepStrictEqual(js(s.homeInner.sent), [[{ onf: 'bookClosed' }, O]], '⛔ 닫혔다는 말이 홈에 안 갔다(교재 카드 % 를 다시 안 읽는다)');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: E1, left: 184 }, s.homeInner);
  assert.ok(s.panels().length === 1 && s.panel() === box && !box.classList.contains('park') && box.kids[0].src === src0, '⛔ 같은 교재를 다시 열었는데 숨긴 판을 안 쓰고 새로 받았다');
  assert.ok(box.classList.contains('full'), '⛔ 전체 화면이던 판이 창으로 돌아왔다(교재 단추 글자와 어긋난다)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, O]], '⛔ 다시 보였는데 교재에 「보임」을 안 알렸다(접속 표시가 안 돌아온다)');  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
  assert.ok(/\.onf-bookpanel\.park \{ visibility: hidden; pointer-events: none; \}/.test(css) && !/\.onf-bookpanel\.park \{[^}]*display: none/.test(css), '⛔ 숨긴 판이 visibility 로 숨지 않는다(display:none 이면 교재가 0 크기로 그렸다가 보일 때 다시 그린다 · 누르기·초점이 간다)');
});

t('노크(bookHi)는 그 판 액자 안 · https googleusercontent 에서 온 것만 · 늦게 와도 지금 상태로 답한다 · 노크 없는 판은 숨기지 않고 지운다(대기를 모르는 옛 교재)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const box = s.panel(), bw = win('book-exec', s.top), bi = win('book-user', bw);
  box.kids[0].contentWindow = bw;
  const stranger = win('stranger', s.top);
  s.send({ onf: 'bookHi' }, stranger);
  s.send({ onf: 'bookHi' }, bi, 'http://n-abc-0lu-script.googleusercontent.com');
  s.send({ onf: 'bookHi' }, bi, 'https://evil.example.com');
  assert.strictEqual(stranger.sent.length + bi.sent.length, 0, '⛔ 남의 창·남의 출처 노크에 답했다');
  s.send({ onf: 'bookClose' }, bi);
  assert.strictEqual(s.panels().length, 0, '⛔ 노크 없는 판(옛 교재)을 숨겨 두었다 — 숨긴 채 접속 신호를 보낸다');
  //   미리 띄운 판에 노크가 늦게 오면 「대기」로 답한다
  s.send({ onf: 'bookWarm', href: E2, panel: 1 }, s.homeInner);
  const bi2 = hi(s, s.panel());
  assert.deepStrictEqual(js(bi2.sent), [[{ onf: 'bookPark', on: true }, O]], '⛔ 숨긴 판의 늦은 노크에 「대기」로 안 답했다');
});

t('미리 띄우기(bookWarm panel:1) — 숨긴 판 · 주소에 park=1 · GET 데우기 안 함 · 메뉴 옆 자리 · 같은 주소 두 번은 한 번 · 자리(3)가 차면 가장 오래 안 쓴 숨긴 판을 비킨다(보이는 판은 그대로 · 10-14) · 홈 액자 말만', () => {
  const s = setup(), got = [];
  s.g.fetch = (u) => { got.push(u); return Promise.resolve(); };
  s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 184 }, win('stranger', s.top));
  s.send({ onf: 'bookWarm', href: 'https://class.ownify.co.kr/?mode=hw', panel: 1 }, s.homeInner);
  assert.strictEqual(s.panels().length, 0, '⛔ 남의 말·교재 아닌 주소로 미리 띄웠다');
  s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 184 }, s.homeInner);
  s.send({ onf: 'bookWarm', href: E1, panel: 1, left: 184 }, s.homeInner);
  const p = s.panel();
  assert.ok(s.panels().length === 1 && p.classList.contains('park') && p.kids[0].src === 'https://script.google.com/x/exec?t=T&mode=share&embed=1&park=1', '⛔ 숨긴 판으로(park=1) 한 번만 미리 안 띄웠다');
  assert.ok(p.classList.contains('beside') && p.vars['--bl'] === '184px', '⛔ 미리 띄운 판이 보일 자리(메뉴 옆)가 아니다(보일 때 다시 그린다)');
  assert.strictEqual(got.length, 0, '⛔ 숨긴 판을 띄우면서 GET 데우기도 했다(두 번 받는다)');
  //   누르면 그 판이 0초로 — 새 액자 없음
  hi(s, p);
  s.send({ onf: 'openBook', href: E1, left: 184 }, s.homeInner);
  assert.ok(s.panels().length === 1 && !p.classList.contains('park'), '⛔ 미리 띄운 판을 안 쓰고 새로 받았다');
  //   자리(10-14 Peter 「미리 띄우는 교재 셋」) — 보이는 판 하나 + 미리 둘 = 셋 · 넷째 미리는 가장 오래 안 쓴 숨긴 판(E2)을 비키고 띄운다 · 보이는 판(E1)은 안 건드린다
  s.send({ onf: 'bookWarm', href: E2, panel: 1 }, s.homeInner);
  s.send({ onf: 'bookWarm', href: E3, panel: 1 }, s.homeInner);
  assert.strictEqual(s.panels().length, 3, '⛔ 판 셋까지 미리 안 띄웠다(보이는 판 하나 + 숨긴 판 둘)');
  const e2 = s.panels()[1];
  s.send({ onf: 'bookWarm', href: E4, panel: 1 }, s.homeInner);
  assert.ok(s.panels().length === 3 && s.panels().indexOf(e2) < 0 && s.panels().indexOf(p) >= 0 && !p.classList.contains('park'), '⛔ 자리가 찼을 때 가장 오래 안 쓴 숨긴 판(E2)을 비키지 않았다(또는 보이는 판을 지웠다 · 넷을 띄웠다)');
  assert.ok(/&ep=e4&embed=1&park=1$/.test(s.panels()[2].kids[0].src) && s.panels()[2].classList.contains('park'), '⛔ 비킨 자리에 넷째를 숨긴 판으로 안 띄웠다');
  //   보이는 판만 남았을 때(숨긴 판 0) — 셋 중 둘을 숨긴 판으로 지워도 보이는 판은 끝까지 그대로
  s.send({ onf: 'bookWarm', href: E2, panel: 1 }, s.homeInner);
  assert.ok(s.panels().length === 3 && s.panels().indexOf(p) >= 0 && !p.classList.contains('park'), '⛔ 미리 띄우기가 보이는 판을 지웠다');
  //   미리 띄운 판도 숨긴 채 30분이면 지운다(메모리) — 보이는 판은 남는다
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => x.f());
  assert.ok(s.panels().length === 1 && s.panels()[0] === p, '⛔ 미리 띄운 판을 30분 뒤에도 안 지웠다(또는 보이는 판을 지웠다)');
});

t('⛔ 숨긴 판은 아무 말도 못 가로챈다 — bookClose·bookFull·openBook 은 버림 · Esc·bookDismiss 는 보이는 판만(홈에 헛 bookClosed 없음) · themeAsk 는 답한다(보일 때 색)', () => {
  const s = setup();
  s.root.getAttribute = (k) => s.root.attrs[k];
  s.send({ onf: 'bookWarm', href: E1, panel: 1 }, s.homeInner);
  const box = s.panel(), bi = hi(s, box);
  bi.sent.length = 0;
  s.send({ onf: 'bookFull', on: true }, bi);
  s.send({ onf: 'openBook', href: E2 }, bi);
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(s.panels().length === 1 && box.classList.contains('park') && !box.classList.contains('full'), '⛔ 숨긴 판의 말(전체·갈아 끼우기·닫기)을 받았다');
  s.homeInner.sent.length = 0;
  s.listeners.keydown.forEach((fn) => fn({ key: 'Escape' }));
  s.send({ onf: 'bookDismiss' }, s.homeInner);
  assert.ok(s.panels().length === 1 && s.homeInner.sent.length === 0 && bi.sent.length === 0, '⛔ 숨긴 판만 있는데 Esc·탭 바꿈이 판을 건드렸다(또는 홈에 헛 bookClosed)');
  s.send({ onf: 'themeAsk' }, bi);
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'theme', v: 'light' }, O]], '⛔ 숨긴 판 교재의 색 물음에 안 답했다(보일 때 색이 틀린다)');
});

t('다른 교재·회차는 새 판 · 보이던 판은 숨김 → 돌아가면 0초 · 판은 셋까지(가장 오래 안 쓴 숨긴 판부터 지움 · 10-14) · 숨긴 채 30분이면 지움', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1, left: 184 }, s.homeInner);
  const a = s.panel(), ai = hi(s, a);
  s.send({ onf: 'openBook', href: E2, left: 184 }, s.homeInner);
  const b = s.panels().find((x) => x !== a);
  assert.ok(a.classList.contains('park') && b && !b.classList.contains('park'), '⛔ 다른 회차를 열었는데 보이던 판을 안 숨겼다(또는 새 판이 없다)');
  assert.deepStrictEqual(js(ai.sent.slice(-1)), [[{ onf: 'bookPark', on: true }, O]], '⛔ 가려진 판 교재에 「대기」를 안 알렸다');
  hi(s, b);
  s.send({ onf: 'openBook', href: E1, left: 184 }, s.homeInner);
  assert.ok(!a.classList.contains('park') && b.classList.contains('park') && s.panels().length === 2, '⛔ 앞 회차로 돌아갔는데 숨긴 판을 안 썼다');
  s.send({ onf: 'openBook', href: E3, left: 184 }, s.homeInner);
  const c = s.panels().find((x) => x !== a && x !== b);
  assert.ok(s.panels().length === 3 && c && a.classList.contains('park') && b.classList.contains('park'), '⛔ 셋째 판 — 셋까지 둘 수 있는데 숨긴 판을 지웠다');
  hi(s, c);
  s.send({ onf: 'openBook', href: E4, left: 184 }, s.homeInner);
  assert.ok(s.panels().length === 3 && s.panels().indexOf(b) < 0 && s.panels().indexOf(a) >= 0 && s.panels().indexOf(c) >= 0, '⛔ 넷째 판 — 가장 오래 안 쓴 숨긴 판(E2)을 안 지웠다(또는 방금 쓴 판을 지웠다)');
  //   숨긴 채 오래 — 지운다(메모리) · 다시 보인 판의 시계는 멈춘다
  const idle = s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000);
  assert.strictEqual(idle.length, 2, '⛔ 숨긴 판(E1·E3)에 30분 시계가 하나씩이 아니다(보인 판 시계를 안 멈췄거나 숨긴 판에 안 걸었다)');
  idle[0].f();
  assert.ok(s.panels().length === 2 && s.panels().indexOf(a) < 0, '⛔ 30분 숨긴 판을 안 지웠다');
});

t('Esc — 판이 열려 있으면 닫는다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  s.listeners.keydown.forEach((fn) => fn({ key: 'Escape' }));
  assert.ok(!s.panel(), '⛔ Esc 로 안 닫힌다');
});

t('⛔ 어느 프레임 코드에도 unload 처리기가 없다(bfcache 「뒤로」를 막는다)', () => {
  for (const f of ['assets/onf-frame.js', 'index.html', 'teacher/index.html']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    assert.ok(!/addEventListener\(\s*['"](?:before)?unload['"]|onunload\s*=/.test(src), '⛔ ' + f + ' 에 unload 처리기');
  }
});

console.log('[view 만 다른 주소 — 같은 판에 「열어」(2026-10-14 Peter 「미리 띄워 둔 내 문장 판에 복습/카드 열어를 전달해서 바로」)]');
/* index.html bookSrc 처럼 아는 값(mode·sheet·view)만 옮겨 판 주소를 짓는다 — view 가 주소 가운데 낀다(진짜도 slug·embed 앞) */
const vSrc = (h) => { const u = new URL(h), q = ['mode', 'sheet', 'view'].filter((k) => u.searchParams.get(k)).map((k) => k + '=' + encodeURIComponent(u.searchParams.get(k)));
  return /^(share|mine)$/.test(u.searchParams.get('mode') || '') ? 'https://script.google.com/x/exec?t=T&' + q.join('&') + '&embed=1' : null; };
const MINE = 'https://class.ownify.co.kr/?mode=mine', RV = MINE + '&view=review', BK = 'https://class.ownify.co.kr/?mode=share&sheet=E1', DK = BK + '&view=cards';
function hiV(s, box, views) { const bw = win('book-exec', s.top), bi = win('book-user', bw); box.kids[0].contentWindow = bw; s.send(views === undefined ? { onf: 'bookHi' } : { onf: 'bookHi', views }, bi); bi.sent.length = 0; return bi; }

t('미리 띄운 ⭐ 내 문장(views review) — [복습 시작](view=review)은 새로 안 받고 그 판을 보이며 「보임」 다음 bookView{review} 를 노크한 창·출처로만 · 판 주소 그대로', () => {
  const s = setup(vSrc);
  s.send({ onf: 'bookWarm', href: MINE, panel: 1, left: 184 }, s.homeInner);
  const box = s.panel(), src0 = box.kids[0].src, bi = hiV(s, box, 'review');
  s.send({ onf: 'openBook', href: RV, left: 184 }, s.homeInner);
  assert.ok(s.panels().length === 1 && !box.classList.contains('park') && box.kids[0].src === src0, '⛔ 미리 띄운 내 문장 판을 안 쓰고 복습 주소로 새로 받았다(라이브 4.4초)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, O], [{ onf: 'bookView', view: 'review' }, O]], '⛔ 「보임」 다음 「복습 열어」가 노크한 출처로 안 갔다');
  //   닫았다 다시 [복습 시작] — 같은 판에 또 「열어」(복습이 떠 있으면 페이지가 그대로 둔다) · 그냥 「내 문장」은 판만 보인다(열어 없음)
  s.send({ onf: 'bookDismiss' }, s.homeInner); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: RV, left: 184 }, s.homeInner);
  assert.deepStrictEqual(js(bi.sent).map((x) => x[0].onf + ':' + (x[0].view || x[0].on)), ['bookPark:false', 'bookView:review'], '⛔ 두 번째 [복습 시작]에 「열어」를 다시 안 보냈다');
  s.send({ onf: 'bookDismiss' }, s.homeInner); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: MINE, left: 184 }, s.homeInner);
  assert.ok(s.panels().length === 1 && js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ view 없는 「내 문장」에 「열어」를 보냈다(또는 새 판)');
});

t('할 줄 모르는 판은 안 쓴다 — 노크 없음 · views 없음(옛 교재) · 모르는 값만 · 다른 view · 다른 주소면 종전대로 그 주소로 새 판', () => {
  for (const [views, why] of [[null, '노크 전'], [undefined, '옛 교재(views 없음)'], ['review2,*, review', '모르는 값'], ['cards', '다른 view'], [['review'], '문자열 아님'], ['', '빈 값']]) {
    const s = setup(vSrc);
    s.send({ onf: 'bookWarm', href: MINE, panel: 1 }, s.homeInner);
    const box = s.panel(), bi = views === null ? null : hiV(s, box, views);
    s.send({ onf: 'openBook', href: RV }, s.homeInner);
    assert.ok(s.panels().length === 2 && /&view=review&embed=1$/.test(s.panels()[1].kids[0].src) && box.classList.contains('park'), '⛔ ' + why + ' 판에 복습을 맡겼다(복습이 안 열린다)');
    assert.ok(!bi || js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ ' + why + ' 판에 「열어」를 보냈다');
  }
  const s = setup(vSrc);
  s.send({ onf: 'bookWarm', href: BK, panel: 1 }, s.homeInner);
  const bi = hiV(s, s.panel(), 'cards');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/?mode=share&sheet=E2&view=cards' }, s.homeInner);
  assert.ok(s.panels().length === 2 && js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ 다른 회차 덱을 이 회차 판에 맡겼다');
  //   view 없는 열기는 종전대로 — 덱 주소로 열린(미리 띄운 판 아님 · views '') 교재 판을 같은 교재 보통 열기가 가로채지 않는다
  const v = setup(vSrc);
  v.send({ onf: 'openBook', href: DK }, v.homeInner);
  const di = hiV(v, v.panel(), '');
  v.send({ onf: 'openBook', href: BK }, v.homeInner);
  assert.ok(v.panels().length === 2 && js(di.sent).every((x) => x[0].onf !== 'bookView'), '⛔ view 없는 보통 열기를 덱 판에 맡겼다(빈 view 를 「할 줄 안다」로 셌다)');
});

t('미리 띄운 교재(views cards) — 「카드 시작」(view=cards)은 그 판에 bookView{cards} · 다른 판(보이던 내 문장)은 숨긴다 · 홈이 아닌 남의 openBook 은 그대로 버림', () => {
  const s = setup(vSrc);
  s.send({ onf: 'bookWarm', href: BK, panel: 1, left: 184 }, s.homeInner);
  const book = s.panel(), bi = hiV(s, book, 'cards');
  s.send({ onf: 'openBook', href: MINE, left: 184 }, s.homeInner);
  const mine = s.panels().find((x) => x !== book), mi = hiV(s, mine, 'review');
  s.send({ onf: 'openBook', href: DK }, win('stranger', s.top));
  assert.ok(bi.sent.length === 0 && book.classList.contains('park'), '⛔ 남의 창 말로 판을 열었다');
  s.send({ onf: 'openBook', href: DK, left: 184 }, s.homeInner);
  assert.ok(s.panels().length === 2 && !book.classList.contains('park') && mine.classList.contains('park'), '⛔ 미리 띄운 교재 판을 안 썼다(또는 보이던 판을 안 숨겼다)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, O], [{ onf: 'bookView', view: 'cards' }, O]], '⛔ 교재 판에 「카드 열어」가 안 갔다');
  assert.ok(js(mi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ 내 문장 판에 교재 덱 「열어」가 갔다');
});

console.log('[줄만 다른 주소 — 같은 판에 「이 줄로」(검수 A3-5 2026-10-16 · 블럭 대사 줄·오늘의 표현·선생님 댓글 · 내 문장 「교재에서 보기」)]');
/* 진짜 index.html bookSrc — line 이 주소 가운데 낀다(fileId·sheetName·mode·back·line·view 다음 slug·embed) */
function realSrc() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const c = { URL, location: { href: 'https://class.ownify.co.kr/' }, token: 'TOK', ONF: { api: { appUrl: (tk, ex) => 'https://script.google.com/x/exec?t=' + tk + '&' + ex } } };
  vm.createContext(c); vm.runInContext(html.slice(html.indexOf('var BOOK_KEYS'), html.indexOf('ONF.frame.mount(document.getElementById')), c);
  return c.bookSrc;
}
const LB = 'https://script.ownify.co.kr/thegoodplace-s1-e3-sunny?mode=share&t=TOK', LM = 'https://script.ownify.co.kr/?mode=mine&t=TOK', LN = 'https://script.ownify.co.kr/thegoodplace-s1-e4-sunny?mode=share&t=TOK&back=E3_X';

t('미리 띄운 교재(views line) — 줄 링크(line=17)는 새로 안 받고 그 판을 보이며 bookView{line:17} · 옆 숨긴 판(내 문장·다음 회차)이 안 쫓겨난다 · 다른 줄도 같은 판 · [이어서 하기]는 판만', () => {
  const s = setup(realSrc());
  [LB, LM, LN].forEach((h) => s.send({ onf: 'bookWarm', href: h, panel: 1, left: 248 }, s.homeInner));
  const [book, mine, next] = s.panels(), src0 = book.kids[0].src;
  const bi = hiV(s, book, 'cards,line'); hiV(s, mine, 'review'); hiV(s, next, 'line');
  s.send({ onf: 'openBook', href: LB + '&line=17', left: 248 }, s.homeInner);
  assert.ok(s.panels().length === 3 && [book, mine, next].every((p) => s.panels().includes(p)), '⛔ 줄 링크가 새 판을 만들어 미리 띄운 판을 쫓아냈다(A3-5): ' + s.panels().map((p) => p.kids[0].src.replace(/^.*TOK&/, '')).join(' | '));
  assert.ok(!book.classList.contains('park') && book.kids[0].src === src0 && mine.classList.contains('park') && next.classList.contains('park'), '⛔ 미리 띄운 그 교재 판이 안 보인다(또는 주소가 바뀌었다)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, O], [{ onf: 'bookView', line: 17 }, O]], '⛔ 「보임」 다음 「17줄로」가 노크한 창·출처로 안 갔다');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: LB + '&line=20', left: 248 }, s.homeInner);
  assert.ok(s.panels().length === 3 && js(bi.sent).some((x) => x[0].onf === 'bookView' && x[0].line === 20), '⛔ 보이는 판에서 다른 줄을 누르니 새로 받았다(또는 「20줄로」가 안 갔다)');
  s.send({ onf: 'bookDismiss' }, s.homeInner); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: LB, left: 248 }, s.homeInner);
  assert.ok(s.panels().length === 3 && !book.classList.contains('park') && js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ 줄 없는 [이어서 하기]에 「열어」를 보냈다(또는 새 판)');
});

t('줄 링크로 새로 연 판(미리 띄운 판 없음) — 뒤 [이어서 하기]는 그 판을 그대로(새로 안 받음 · 「열어」 없음) · 덱(view)으로 연 판은 종전대로 안 맡긴다 (반박 검토 🟡4 2026-10-16)', () => {
  const s = setup(realSrc());
  s.send({ onf: 'openBook', href: LB + '&line=17', left: 248 }, s.homeInner);
  const box = s.panel(), bi = hiV(s, box, 'line');
  s.send({ onf: 'bookDismiss' }, s.homeInner); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: LB, left: 248 }, s.homeInner);
  assert.ok(s.panels().length === 1 && !box.classList.contains('park'), '⛔ 줄 링크로 연 판을 두고 [이어서 하기]가 새로 받았다');
  assert.ok(js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ 아무것도 안 물었는데 「열어」를 보냈다');
  //   옛 교재(줄 모름)로 줄 링크를 연 판도 — 맡길 말이 없으니 그대로 보이기만
  const o = setup(realSrc());
  o.send({ onf: 'openBook', href: LB + '&line=17' }, o.homeInner);
  hiV(o, o.panel(), undefined);
  o.send({ onf: 'openBook', href: LB }, o.homeInner);
  assert.strictEqual(o.panels().length, 1, '⛔ 옛 교재 줄 판을 두고 새로 받았다');
});

t('줄을 할 줄 모르는 판은 안 쓴다 — 노크 전 · 옛 교재(views 없음 · cards 만) · 다른 회차 줄이면 종전대로 그 주소로 새 판(그 판은 &line 으로 뜬다)', () => {
  for (const [views, why] of [[null, '노크 전'], [undefined, '옛 교재(views 없음)'], ['cards', '옛 교재(cards 만)'], ['review', '내 문장']]) {
    const s = setup(realSrc());
    s.send({ onf: 'bookWarm', href: LB, panel: 1 }, s.homeInner);
    const box = s.panel(), bi = views === null ? null : hiV(s, box, views);
    s.send({ onf: 'openBook', href: LB + '&line=17' }, s.homeInner);
    assert.ok(s.panels().length === 2 && /&line=17&slug=thegoodplace-s1-e3-sunny&embed=1$/.test(s.panels()[1].kids[0].src), '⛔ ' + why + ' 판에 줄 이동을 맡겼다(줄로 안 간다)');
    assert.ok(!bi || js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ ' + why + ' 판에 「줄로」를 보냈다');
  }
  const s = setup(realSrc());
  s.send({ onf: 'bookWarm', href: LB, panel: 1 }, s.homeInner);
  const bi = hiV(s, s.panel(), 'cards,line');
  s.send({ onf: 'openBook', href: LN + '&line=5' }, s.homeInner);
  assert.ok(s.panels().length === 2 && js(bi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ 다른 회차 줄을 이 회차 판에 맡겼다');
  //   숫자 아닌 줄은 줄로 안 친다(페이지에 이상한 값을 안 넘긴다)
  const v = setup(realSrc());
  v.send({ onf: 'bookWarm', href: LB, panel: 1 }, v.homeInner);
  const vi = hiV(v, v.panel(), 'cards,line');
  v.send({ onf: 'openBook', href: LB + '&line=1e9' }, v.homeInner);
  v.send({ onf: 'openBook', href: LB + '&line=12345678' }, v.homeInner);   // 서버도 7자리까지만 본다(jumpRow slice(0,7))
  assert.ok(js(vi.sent).every((x) => x[0].onf !== 'bookView'), '⛔ 숫자 아닌·8자리 줄 값을 판에 넘겼다');
});

console.log('[📱 폰 판 — 2026-10-14 Peter 「미리 불러와서 로딩 전혀 없이 열고 되돌리고」 → 「폰 숨긴 판 1개」]');
/* 폰 흉내 — matchMedia(넓은 화면 물음)가 거짓 · 최상위 기록(브라우저처럼 back·go 는 나중에 popstate) · <html> classList · (키보드) visualViewport */
function phoneSetup(o) {
  o = o || {};
  const mq = { matches: !!o.wide, fns: [], addEventListener(k, f) { if (k === 'change') this.fns.push(f); } };
  const H = { st: [{ state: null }], i: 0, to: [], goes: [], backs: 0,
    get state() { return this.st[this.i].state; },
    pushState(st) { this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(st)) }); this.i++; },
    replaceState(st) { this.st[this.i].state = st; },
    back() { this.backs++; this.to.push(Math.max(0, this.i - 1)); },
    go(n) { this.goes.push(n); this.to.push(Math.max(0, Math.min(this.st.length - 1, this.i + n))); } };
  const s = setup(o.bs || null, { phone: o.phone, swap: o.swap, perf: o.perf, pre(g, root) {
    g.matchMedia = (q) => { assert.strictEqual(q, '(min-width:1100px) and (hover:hover) and (pointer:fine)', '⛔ 폰 물음이 홈 onfBookWide 와 다르다'); return mq; };
    g.history = H;
    root.classList = { set: new Set(), toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } };
    root.getAttribute = (k) => root.attrs[k];
    if (o.vv) g.visualViewport = Object.assign({ addEventListener() {} }, o.vv);
  } });
  s.H = H; s.mq = mq;
  s.pop = () => { if (H.to.length) H.i = H.to.shift(); s.listeners.popstate.forEach((f) => f({})); };
  s.flush = () => { let n = 0; while (H.to.length && n++ < 9) s.pop(); };
  s.browserBack = () => { H.i = Math.max(0, H.i - 1); s.listeners.popstate.forEach((f) => f({})); };
  s.flip = (wide) => { mq.matches = wide; mq.fns.forEach((f) => f()); };
  s.hist = (data, w, origin) => s.send(Object.assign({ onf: 'hist' }, data), w, origin);
  return s;
}
const hp = (w) => js(w.sent).filter((x) => x[0].onf === 'hist-pop').map((x) => x[0].id);

t('📱 폰 — 미리 띄운 숨긴 판(views line)에 줄 링크 → 판 하나 그대로 보이며 「이 줄로」 · 판 칸 한 칸(뒤로 = 숨김) · 새로 안 받는다(검수 A3-5)', () => {
  const s = phoneSetup({ bs: realSrc() });
  s.send({ onf: 'bookWarm', href: LB, panel: 1 }, s.homeInner);
  const p = s.panel(), bi = hiV(s, p, 'line');
  s.send({ onf: 'openBook', href: LB + '&line=17', left: 0 }, s.homeInner);
  assert.ok(s.panels().length === 1 && !p.classList.contains('park'), '⛔ 폰에서 줄 링크가 판을 새로 받았다(폰 자리 2 — 미리 띄운 판이 쫓겨난다)');
  assert.ok(js(bi.sent).some((x) => x[0].onf === 'bookView' && x[0].line === 17) && s.H.st.length === 2 && s.H.state.onfBook === 1, '⛔ 「17줄로」가 안 갔거나 판 칸이 안 들어갔다');
  s.browserBack();
  assert.ok(p.classList.contains('park'), '⛔ 뒤로가 판을 안 숨겼다');
});

t('📱 폰 — 교재 누름 → 판 하나(화면 전체 <html onf-ph> · 메뉴 옆 아님) · 최상위 기록에 판 칸 한 칸 · 같은 판을 또 열면 칸 안 늘림 · PC 는 판 칸 없음(종전)', () => {
  const s = phoneSetup();
  assert.ok(s.root.classList.contains('onf-ph'), '⛔ 폰인데 <html> 에 onf-ph 가 없다(판이 PC 모양으로 뜬다)');
  s.send({ onf: 'openBook', href: E1, left: 0 }, s.homeInner);
  const p = s.panel();
  assert.ok(p && !p.classList.contains('park') && !p.classList.contains('beside'), '⛔ 폰 판이 안 보인다(또는 메뉴 옆 자리)');
  assert.ok(s.H.st.length === 2 && JSON.stringify(s.H.state) === JSON.stringify({ onfBook: 1, n: 0, bd: 1 }), '⛔ 판 칸이 최상위 기록에 안 들어갔다: ' + JSON.stringify(s.H.state));
  hi(s, p);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.strictEqual(s.H.st.length, 2, '⛔ 보이는 판을 또 열었는데 판 칸이 또 쌓였다(뒤로 두 번이 필요)');
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
  const ph = css.indexOf('.onf-ph .onf-bookpanel {'), phI = css.indexOf('.onf-ph .onf-bookpanel iframe {');
  assert.ok(ph > css.indexOf('.onf-bookpanel.full {') && ph > css.indexOf('.onf-bookpanel.beside {') && phI > css.indexOf('.onf-bookpanel.full iframe {'), '⛔ 폰 판 규칙이 창 모드·메뉴 옆 규칙보다 앞이다(같은 무게라 뒤가 이긴다 — 폰 판이 둥근 창으로 뜬다)');
  assert.ok(/\.onf-ph \.onf-bookpanel \{ top: 0; right: 0; bottom: 0; left: 0; width: auto; padding: 0; border: 0; border-radius: 0; box-shadow: none; \}/.test(css), '⛔ 폰 판이 화면 전체(홈 액자와 같은 상자)가 아니다');
  const pc = phoneSetup({ wide: true });
  pc.send({ onf: 'openBook', href: E1, left: 184 }, pc.homeInner);
  assert.ok(pc.H.st.length === 1 && !pc.root.classList.contains('onf-ph') && pc.panel().classList.contains('beside'), '⛔ PC 판에 판 칸을 넣었다(또는 폰 모양)');
});

t('📱 뒤로(popstate) = 숨김(지우지 않음) · 교재에 「대기」 · 홈에 bookClosed · 다시 누르면 **같은 판** 0초 + 판 칸 다시', () => {
  const s = phoneSetup();
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const p = s.panel(), src0 = p.kids[0].src, bi = hi(s, p);
  bi.sent.length = 0; s.homeInner.sent.length = 0;
  s.browserBack();
  assert.ok(s.panels().length === 1 && p.classList.contains('park'), '⛔ 뒤로가 판을 지웠다(또는 안 숨겼다)');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: true }, O]], '⛔ 숨겼는데 교재에 「대기」를 안 알렸다(접속 표시가 남는다)');
  assert.deepStrictEqual(js(s.homeInner.sent), [[{ onf: 'bookClosed' }, O]], '⛔ 뒤로로 닫았는데 홈에 bookClosed 가 안 갔다(교재 카드 % 를 안 다시 읽는다)');
  s.browserBack();
  assert.strictEqual(s.homeInner.sent.length, 1, '⛔ 숨길 판이 없는데 또 bookClosed');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.ok(s.panels().length === 1 && s.panel() === p && !p.classList.contains('park') && p.kids[0].src === src0, '⛔ 다시 누르니 새로 받았다(0초가 아니다)');
  assert.ok(s.H.st.length === 2 && s.H.state.onfBook === 1, '⛔ 다시 보인 판에 판 칸이 없다(다음 뒤로가 홈을 떠난다)');
});

t('📱 ✕ = 숨김 + 판 칸 줄만 걷기(go(-bd)) — 홈 기록 다리 칸은 안 걷는다 · 판은 홈 칸을 back 으로 못 걷는다 · 홈엔 그 홈 칸 그대로 알림', () => {
  const s = phoneSetup();
  s.hist({ op: 'hi' }, s.homeInner);
  s.hist({ op: 'push', id: 'homeA1', state: { onfHwv: 'v1' } }, s.homeInner);
  assert.strictEqual(s.H.st.length, 2, '전제: 홈 칸 하나');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.deepStrictEqual(s.H.state, { onfBook: 1, n: 1, bd: 1 }, '⛔ 판 칸의 n(아래 홈 칸 수)·bd 가 틀렸다');
  const p = s.panel(), bi = hi(s, p);
  s.hist({ op: 'hi' }, bi);
  s.hist({ op: 'back', id: 'homeA1' }, bi);
  s.hist({ op: 'back', id: 'homeA1' }, s.homeInner);
  assert.ok(s.H.backs === 0, '⛔ 판(또는 맨 위가 아닌 홈 칸)의 back 으로 기록을 걷었다');
  s.homeInner.sent.length = 0; bi.sent.length = 0;
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(p.classList.contains('park') && s.panels().length === 1, '⛔ ✕ 가 판을 안 숨겼다(또는 지웠다)');
  assert.deepStrictEqual(s.H.goes, [-1], '⛔ ✕ 가 판 칸 하나만 걷지 않았다(홈 칸까지 걷거나 안 걷음)');
  s.flush();
  assert.ok(s.H.i === 1 && s.H.state.onfHist === 'homeA1', '⛔ ✕ 뒤 홈 칸이 사라졌다');
  assert.deepStrictEqual(hp(s.homeInner), ['homeA1'], '⛔ 홈에 자기 맨 위 칸(homeA1)을 안 알렸다(또는 비었다고 해서 홈 창이 닫힌다)');
  assert.deepStrictEqual(js(s.homeInner.sent).filter((x) => x[0].onf === 'bookClosed').length, 1, '⛔ bookClosed 가 한 번이 아니다');
});

t('📱 남의 칸 보호 — 판 안쪽은 맨 위 **홈 칸**을 같은 id 로도 못 걷는다 · 판 칸이 맨 위일 때 홈의 hello(다시 뜸)는 기록을 안 흔든다(판 칸부터 걷게 된다)', () => {
  const s = phoneSetup();
  s.hist({ op: 'hi' }, s.homeInner);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const p = s.panel(), bi = hi(s, p);
  s.hist({ op: 'hi' }, bi);
  s.browserBack();
  s.hist({ op: 'push', id: 'same1', state: { onfHwv: 'v' } }, s.homeInner);
  assert.ok(s.H.state.onfHist === 'same1' && !s.H.state.b, '전제: 맨 위가 홈 칸');
  s.hist({ op: 'back', id: 'same1' }, bi);
  assert.strictEqual(s.H.backs, 0, '⛔ 판 안쪽이 맨 위 홈 칸을 걷었다(id 만 보고)');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.ok(s.H.state.onfBook === 1 && s.H.state.n === 1, '전제: 홈 칸 위에 판 칸');
  s.hist({ op: 'hello' }, s.homeInner);
  assert.deepStrictEqual(s.H.goes, [], '⛔ 판 칸이 맨 위인데 홈 hello 가 go(-n) 으로 판 칸부터 걷었다');
  s.hist({ op: 'hello' }, bi);
  assert.deepStrictEqual(s.H.goes, [], '⛔ 판 안쪽 hello 가 기록을 흔들었다');
});

t('📱 판 안 창(카드·응용) 칸도 최상위 — 노크(hist hi)는 폰 판만 답(PC 판·홈 다리 그대로) · 칸 = {onfHist, s, n, b, bd} · 뒤로 → 그 판에만 hist-pop(창만 닫힘 · 판 그대로) · 한 번 더 → 판 숨김 · 숨긴 판은 못 민다 · ✕ 는 판 칸 줄 통째', () => {
  const s = phoneSetup();
  s.hist({ op: 'hi' }, s.homeInner);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const p = s.panel(), bi = hi(s, p);
  bi.sent.length = 0;
  s.hist({ op: 'hi' }, bi, 'https://evil.example.com');
  assert.strictEqual(bi.sent.length, 0, '⛔ 남의 출처 노크에 hist-on');
  s.hist({ op: 'hi' }, bi);
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'hist-on' }, O]], '⛔ 폰 판 안쪽 노크에 hist-on 을 그 출처로 안 답했다(창 칸이 액자 안에 쌓인다 — 아이폰 3초 덮개)');
  s.hist({ op: 'push', id: 'homeB1', state: { a: 1 } }, s.homeInner);
  assert.ok(s.H.state.onfHist === 'homeB1' && !s.H.state.b, '⛔ 판 노크가 홈 다리를 뺏었다(홈 push 가 안 받힌다)');
  s.browserBack();
  bi.sent.length = 0; s.homeInner.sent.length = 0;
  s.hist({ op: 'push', id: 'c1', state: { onfCards: 't1' } }, bi);
  assert.deepStrictEqual(s.H.state, { onfHist: 'c1', s: { onfCards: 't1' }, n: 0, b: 1, bd: 2 }, '⛔ 판 안 창 칸 모양이 틀렸다');
  s.browserBack();
  assert.deepStrictEqual(hp(bi), [''], '⛔ 창 칸이 빠졌는데 판 안쪽에 안 알렸다(창이 안 닫힌다)');
  assert.ok(!p.classList.contains('park') && s.homeInner.sent.length === 0, '⛔ 창 칸 뒤로가 판을 숨겼다(또는 홈에 알렸다)');
  s.browserBack();
  assert.ok(p.classList.contains('park'), '⛔ 판 칸 뒤로가 판을 안 숨겼다');
  const n0 = s.H.st.length;
  s.hist({ op: 'push', id: 'c2', state: { onfCards: 't2' } }, bi);
  assert.strictEqual(s.H.st.length, n0, '⛔ 숨긴 판이 칸을 밀었다(보이지 않는 칸이 뒤로를 먹는다)');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  s.hist({ op: 'push', id: 'c3', state: { onfAp: 'a' } }, bi);
  s.hist({ op: 'back', id: 'c3' }, s.homeInner);
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
  const pc = phoneSetup({ wide: true });
  pc.send({ onf: 'openBook', href: E1 }, pc.homeInner);
  const pi = hi(pc, pc.panel());
  pi.sent.length = 0;
  pc.hist({ op: 'hi' }, pi);
  assert.strictEqual(pi.sent.length, 0, '⛔ PC 판 노크에 hist-on — PC 판은 종전대로 액자 안 기록');
});

t('📱 판 안에서 다른 교재·⭐ 내 문장 → 새 판 칸이 위에 · 뒤로 = 앞 판(종전 폰 「뒤로」 차례) · 그 판이 지워졌으면 그 주소로 다시 받는다 · 폰 판 자리 2', () => {
  const s = phoneSetup();
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const a = s.panel(), ai = hi(s, a);
  s.send({ onf: 'openBook', href: E2 }, ai);
  const b = s.panels().find((x) => x !== a), bi = hi(s, b);
  assert.ok(a.classList.contains('park') && !b.classList.contains('park') && s.H.st.length === 3 && s.H.state.bd === 2, '⛔ 판 안 openBook 이 새 판 칸을 위에 안 쌓았다');
  s.send({ onf: 'openBook', href: E3 }, bi);
  const c = s.panels().find((x) => x !== a && x !== b);
  assert.ok(s.panels().length === 2 && s.panels().indexOf(a) < 0, '⛔ 폰 판 자리가 2 가 아니다(가장 오래 안 쓴 숨긴 판부터 지운다)');
  hi(s, c);
  s.browserBack();
  assert.ok(!b.classList.contains('park') && c.classList.contains('park'), '⛔ 뒤로가 앞 판(E2)을 안 보였다');
  s.browserBack();
  const a2 = s.panels().find((x) => !x.classList.contains('park'));
  assert.ok(a2 && a2 !== a && /&embed=1$/.test(a2.kids[0].src) && !/&ep=/.test(a2.kids[0].src) && s.panels().length === 2, '⛔ 지워진 판(E1)의 칸으로 돌아왔는데 그 주소로 다시 안 받았다(또는 자리 2 를 넘었다)');
  s.browserBack();
  assert.ok(s.panels().every((x) => x.classList.contains('park') || !x.parentNode), '⛔ 맨 아래로 왔는데 판이 남았다');
});

t('📱 미리 띄우기(bookWarm panel:1) — 숨긴 판(park=1) · 기록 안 건드림 · 누르면 그 판 0초 + 판 칸 · 폰 자리 2(보이는 판 + 미리 하나)', () => {
  const s = phoneSetup();
  s.send({ onf: 'bookWarm', href: E1, panel: 1 }, s.homeInner);
  const p = s.panel();
  assert.ok(p && p.classList.contains('park') && /&park=1$/.test(p.kids[0].src) && s.H.st.length === 1, '⛔ 폰 미리 띄우기가 숨긴 판(park=1)이 아니다(또는 기록을 건드렸다)');
  hi(s, p);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.ok(s.panels().length === 1 && !p.classList.contains('park') && s.H.st.length === 2, '⛔ 미리 띄운 판을 안 쓰고 새로 받았다(또는 판 칸 없음)');
  s.send({ onf: 'bookWarm', href: E2, panel: 1 }, s.homeInner);
  s.send({ onf: 'bookWarm', href: E3, panel: 1 }, s.homeInner);
  assert.ok(s.panels().length === 2 && !p.classList.contains('park') && /&ep=e3&embed=1&park=1$/.test(s.panels()[1].kids[0].src), '⛔ 폰 판 자리가 2 가 아니다(또는 보이는 판을 지웠다)');
});

t('📱 폭이 바뀜 — PC 판(보임) → 폰: 화면 전체 · 판 칸 넣음(뒤로 = 숨김) · 자리 2 로 줄임 / 폰 → PC: 판 그대로 · ✕ 가 남은 판 칸을 걷는다 · PC 의 뒤로는 판을 안 건드림', () => {
  const s = phoneSetup({ wide: true }), inner = [];
  for (const h of [E1, E2, E3]) { s.send({ onf: 'openBook', href: h, left: 184 }, s.homeInner); inner.push(hi(s, s.panels()[s.panels().length - 1])); }
  assert.ok(s.panels().length === 3 && s.H.st.length === 1, '전제: PC 판 셋 · 판 칸 없음');
  const v = s.panels()[2], vi = inner[2];
  s.flip(false);
  assert.ok(s.root.classList.contains('onf-ph') && s.panels().length === 2 && !v.classList.contains('park'), '⛔ 폰이 됐는데 모양·자리(2)가 안 바뀌었다(또는 보이던 판을 숨겼다)');
  assert.ok(s.H.st.length === 2 && s.H.state.onfBook > 0 && s.H.state.bd === 1, '⛔ 폰이 됐는데 보이는 판에 판 칸이 없다(뒤로가 홈을 떠난다)');
  s.browserBack();
  assert.ok(v.classList.contains('park'), '⛔ 폰이 된 뒤 뒤로가 판을 안 숨겼다');
  s.send({ onf: 'openBook', href: E3 }, s.homeInner);
  s.flip(true);
  assert.ok(!s.root.classList.contains('onf-ph') && !v.classList.contains('park'), '⛔ PC 가 됐는데 모양이 안 바뀌었다(또는 판을 숨겼다)');
  s.H.goes.length = 0;
  s.send({ onf: 'bookClose' }, vi);
  assert.deepStrictEqual(s.H.goes, [-1], '⛔ PC 가 된 뒤 ✕ 가 남은 판 칸을 안 걷었다(뒤로 한 번이 헛돈다)');
  s.flush();
  s.send({ onf: 'openBook', href: E3, left: 184 }, s.homeInner);
  const n0 = s.H.st.length;
  s.browserBack();
  assert.ok(!v.classList.contains('park') && n0 === s.H.st.length, '⛔ PC 의 뒤로가 판을 숨겼다(또는 PC 가 판 칸을 넣었다)');
});

t('📱 키보드 높이·밀림 보정은 **보이는 폰 판**에 — 판의 frameHello 창으로 kbH · 그 판 액자에 translateY · 숨기면 홈 액자로 돌아가 다시 알림 · PC 판은 종전대로 홈', () => {
  const s = phoneSetup({ vv: { height: 400, offsetTop: 30, scale: 1 } });
  const kb = (w) => js(w.sent).filter((x) => x[0].onf === 'kbH').map((x) => x[0].h + '@' + x[1]);
  s.send({ onf: 'frameHello' }, s.homeInner);
  assert.deepStrictEqual(kb(s.homeInner), ['370@*'], '전제: 홈 노크 → 홈에 키보드 높이');
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const p = s.panel(), bi = hi(s, p);
  s.send({ onf: 'frameHello' }, bi);
  assert.deepStrictEqual(kb(bi), ['370@*'], '⛔ 폰 판 교재에 키보드 높이가 안 간다(입력칸이 키보드에 가린다)');
  assert.ok(p.kids[0].style.transform === 'translateY(30px)' && s.frameEl.style.transform === '', '⛔ 밀림 보정이 판 액자에 안 붙었다(또는 홈 액자에 남았다)');
  s.homeInner.sent.length = 0;
  s.browserBack();
  assert.ok(kb(s.homeInner).length === 1 && s.frameEl.style.transform === 'translateY(30px)' && p.kids[0].style.transform === '', '⛔ 판을 숨겼는데 키보드 보정이 홈 액자로 안 돌아왔다');
  const pc = phoneSetup({ wide: true, vv: { height: 400, offsetTop: 0, scale: 1 } });
  pc.send({ onf: 'frameHello' }, pc.homeInner);
  pc.send({ onf: 'openBook', href: E1 }, pc.homeInner);
  const pci = hi(pc, pc.panel());
  pc.send({ onf: 'frameHello' }, pci);
  assert.ok(kb(pci).length === 0, '⛔ PC 판 교재에 키보드 높이를 보냈다(PC 는 종전대로 홈)');
});

console.log('[홈 안 교재 판 — 주소(index.html bookSrc)]');
t('교재 주소만 · 아는 값만 · 토큰 버림 · embed=1', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const body = html.slice(html.indexOf('var BOOK_KEYS'), html.indexOf('ONF.frame.mount(document.getElementById'));
  const c = { URL, location: { href: 'https://class.ownify.co.kr/' }, token: 'TOK', ONF: { api: { appUrl: (tk, ex) => 'EXEC?t=' + tk + '&' + ex } } };
  vm.createContext(c); vm.runInContext(body, c);
  const f = c.bookSrc;
  assert.strictEqual(f('https://script.ownify.co.kr/youngsheldon-s1-e1-jungah?mode=share&t=LEAK&back=E1_Pilot'),
    'EXEC?t=TOK&mode=share&back=E1_Pilot&slug=youngsheldon-s1-e1-jungah&embed=1', '짧은 주소 → slug · 주소의 t 는 버리고 이 도메인 토큰');
  assert.strictEqual(f('https://class.ownify.co.kr/?fileId=F1&sheetName=E2_X&mode=share'), 'EXEC?t=TOK&fileId=F1&sheetName=E2_X&mode=share&embed=1', '옛 주소(fileId)');
  //   ⭐ 내 문장도 판으로(2026-10-12 Peter) — 보기 칸(view)은 싣고 주소의 토큰·선생님 자격은 버린다
  assert.strictEqual(f('https://script.ownify.co.kr/?mode=mine&t=LEAK&view=review'), 'EXEC?t=TOK&mode=mine&view=review&embed=1', '⛔ 내 문장 주소가 판 주소로 안 바뀐다');
  assert.strictEqual(f('https://class.ownify.co.kr/?mode=mine'), 'EXEC?t=TOK&mode=mine&embed=1', '⛔ 토큰 없는 내 문장 주소(이 도메인에 저장된 학생)');
  assert.ok(!/LEAK|ttok/.test(String(f('https://script.ownify.co.kr/?mode=mine&t=LEAK&ttok=X&tas=Y'))), '⛔ 내 문장 주소의 토큰·선생님 자격을 넘긴다');
  assert.strictEqual(f('https://class.ownify.co.kr/?mode=hw'), null, '⛔ 교재·내 문장 밖 주소(과제 등)를 판으로 연다');
  assert.strictEqual(f('https://class.ownify.co.kr/'), null, '⛔ 홈 주소를 판으로 연다');
  assert.strictEqual(f('https://evil.example.com/a-s1-e1-b?mode=share'), null, '⛔ 남의 사이트 주소를 연다');
  assert.strictEqual(f('javascript:alert(1)'), null, '⛔ javascript: 주소');
  assert.ok(!/LEAK/.test(String(f('https://script.ownify.co.kr/a-s1-e1-b?mode=share&t=LEAK&ttok=X&tas=Y'))), '⛔ 주소에 실려 온 토큰·선생님 자격을 넘긴다');
});

t('📱 폰 판 스위치 — 꺼져 있으면(opts.phone 없음) caps 에 phone 0 · 폰 폭이어도 onf-ph·판 칸 없음(종전 PC 판 그대로) · index.html 은 기본 켬(2026-10-16) · phonepanel=0 · 기억값 0 으로만 끈다', () => {
  const s = phoneSetup({ phone: false });
  s.send({ onf: 'bookHello' }, s.homeInner);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.homeInner.sent.find((x) => x[0].onf === 'caps')[0])), { onf: 'caps', book: 1, phone: 0 }, '⛔ 스위치가 꺼졌는데 caps 에 phone:1 — 모든 폰에서 가로챈다');
  assert.ok(!s.root.classList.contains('onf-ph'), '⛔ 스위치가 꺼졌는데 폰 모양(onf-ph)');
  s.send({ onf: 'openBook', href: E1, left: 0 }, s.homeInner);
  assert.strictEqual(s.H.st.length, 1, '⛔ 스위치가 꺼졌는데 판 칸을 넣었다');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(/phone: phoneOn !== '0' \}\);/.test(html) && /q\.get\('phonepanel'\)/.test(html) && /localStorage\.getItem\('onfPhonePanel'\)/.test(html), '⛔ index.html 이 스위치를 안 넘긴다(또는 기본 꺼짐 · 끄는 길 없음)');
});

console.log('[🔐 못 연 판 — 여러 계정 우회 반박 검토 🟡4 2026-10-16]');
/* 판 액자를 「구글 오류 화면(자식 0)」으로 다 읽히게 하고 여유를 흘린다 → 안내 판(이 대역엔 credentialless 가 없다 = 다시 안 열고 바로 안내) */
function stuckLoad(s, box) {
  const el = box.kids[0];
  el.contentWindow = { length: 0, parent: null, location: { get href() { throw new Error('cross-origin'); }, replace() {} } };
  el.contentWindow.parent = el.contentWindow;
  (el.L.load || []).forEach((f) => f({}));
  s.timers.filter((x) => x.on && x.ms === 1500).forEach((x) => { x.on = false; x.f(); });
  assert.ok(box.kids[1].kids.some((k) => k.className === 'onf-stuck'), '안내가 안 떴다(대역 확인)');
}
t('🔐 못 연 판(안내)을 다시 열면 지우고 **새로 받는다** — 보이던 판·숨긴 미리 판 둘 다(종전: 안내가 그대로 · [닫기] 해야 새로)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const box = s.panel();
  stuckLoad(s, box);
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.ok(s.panels().length === 1 && s.panel() !== box && s.panel().kids[0].src === box.kids[0].src, '⛔ 못 연 판을 다시 보였다(안내가 그대로)');
  assert.ok(!s.panel().classList.contains('park'), '새 판은 보인다');
  //   숨긴 미리 판(park=1)이 못 열렸으면 — 누를 때 새로(보이는 판으로)
  const w = setup();
  w.send({ onf: 'bookWarm', href: E2, panel: 1 }, w.homeInner);
  const pre = w.panel();
  assert.ok(pre.classList.contains('park') && /park=1/.test(pre.kids[0].src));
  stuckLoad(w, pre);
  w.send({ onf: 'openBook', href: E2 }, w.homeInner);
  const now = w.panels().find((b) => !b.classList.contains('park'));
  assert.ok(now && now !== pre && !w.body.kids.includes(pre) && !/park=1/.test(now.kids[0].src), '⛔ 못 연 숨긴 미리 판을 그대로 보였다');
});
t('🔐 판을 지우면(load 전 · 닫기·자리 비키기) 그 판의 노크 듣기를 걷는다 — 누수 없음', () => {
  const s = setup();
  s.send({ onf: 'bookHello' }, s.homeInner);                  // 홈 노크 — 홈 액자 판정이 끝나 홈의 노크 듣기가 걷힌다(그 뒤로 센다)
  const n0 = s.listeners.message.length;
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  assert.strictEqual(s.listeners.message.length, n0 + 1, '판이 노크 듣기를 단다(대역 확인)');
  s.send({ onf: 'bookDismiss' }, s.homeInner);                // 노크(bookHi) 없는 판 = 숨기지 않고 지운다(bookDrop)
  assert.ok(!s.panel(), '판이 지워졌다(대역 확인)');
  assert.strictEqual(s.listeners.message.length, n0, '⛔ 지운 판의 노크 듣기가 남았다(판이 오갈 때마다 쌓인다)');
});

t('📤🔐 과제 끝맺음 맡기기(hwFin) — credentialless 창이 맡긴 끝맺음을 이 껍데기 저장소에 둔다 · 홈 액자 말만 · sid 로 넣고 뺀다 · hwFinAsk 엔 그 창·그 출처로 목록 · 모양·크기·개수 거름 (반박 검토 🟡3 2026-10-16)', () => {
  const s = setup(), ls = {};
  s.g.localStorage = { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } };
  const job = { sid: 'a1b2-c3', ymd: '2026-10-16', id: 'F1', name: 'rec.m4a', mime: 'audio/mp4' };
  s.send({ onf: 'hwFin', on: true, job }, win('stranger', s.top));
  s.send({ onf: 'hwFin', on: true, job }, s.homeInner, 'https://evil.example.com');
  s.send({ onf: 'hwFin', on: true, job: { sid: '../x', ymd: 'D' } }, s.homeInner);
  s.send({ onf: 'hwFin', on: true, job: { sid: 'big', pad: 'x'.repeat(3000) } }, s.homeInner);
  assert.ok(!('onfHwFin' in ls), '⛔ 남의 창·남의 출처·이상한 sid·큰 값을 맡았다');
  s.send({ onf: 'hwFin', on: true, job }, s.homeInner);
  s.send({ onf: 'hwFin', on: true, job }, s.homeInner);
  assert.deepStrictEqual(JSON.parse(ls.onfHwFin), [job], '⛔ 맡긴 끝맺음을 안 뒀다(또는 같은 sid 를 둘로)');
  s.homeInner.sent.length = 0;
  s.send({ onf: 'hwFinAsk' }, win('stranger', s.top));
  s.send({ onf: 'hwFinAsk' }, s.homeInner);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.homeInner.sent)), [[{ onf: 'hwFin', jobs: [job] }, 'https://n-abc-0lu-script.googleusercontent.com']], '⛔ 물은 그 창·그 출처로 목록을 안 줬다(또는 남의 창에 줬다)');
  s.send({ onf: 'hwFin', on: false, job: { sid: 'a1b2-c3' } }, s.homeInner);
  assert.ok(!('onfHwFin' in ls), '⛔ 끝난 끝맺음을 안 뺐다');
  for (let i = 0; i < 25; i++) s.send({ onf: 'hwFin', on: true, job: { sid: 's' + i, ymd: 'D' } }, s.homeInner);
  assert.strictEqual(JSON.parse(ls.onfHwFin).length, 20, '⛔ 맡긴 끝맺음 개수 상한이 없다');
});

console.log('[앞 판 규칙 — 2026-10-16 Peter 「B로 가자」 창 B안 ② (설계 4.4) · 판 안에서 연 판을 닫으면 앞 판 · 홈 링크·메뉴는 전부 닫기]');
const MYS = 'https://class.ownify.co.kr/?mode=mine&view=A', shownOf = (s) => s.panels().filter((p) => !p.classList.contains('park'));
/* 교재(E1)를 홈에서 열고 노크 → 그 안에서 내 문장(MYS)을 열고 노크. 판·안쪽 창·첫 액자 src 를 돌려준다. */
function backSetup(s) {
  s = s || setup();
  s.send({ onf: 'openBook', href: E1, left: 270, m: 22, r: 28 }, s.homeInner);
  const book = s.panel(), bi = hi(s, book), src0 = book.kids[0].src;
  s.send({ onf: 'openBook', href: MYS }, bi);
  const mine = s.panels().find((p) => p !== book), mi = hi(s, mine);
  return { s, book, bi, mine, mi, src0 };
}

t('판 안에서 연 판을 닫으면 앞 판이 보인다 — 같은 판·같은 액자(다시 안 불러옴) · Esc 도 같다 (설계 4.4 앞 판 규칙)', () => {
  const { s, book, bi, mine, mi, src0 } = backSetup();
  assert.ok(book.classList.contains('park') && !mine.classList.contains('park'), '전제: 내 문장이 보이고 교재는 숨었다');
  bi.sent.length = 0; mi.sent.length = 0; s.homeInner.sent.length = 0;
  s.send({ onf: 'bookClose' }, mi);
  assert.ok(!book.classList.contains('park') && mine.classList.contains('park') && s.panels().length === 2 && s.panels().includes(book) && book.kids[0].src === src0 && book.kids[0].src.indexOf('park=1') < 0, '⛔ 닫으니 앞 판(교재)이 안 보이거나 새로 받았다(src 가 바뀌었다)');
  assert.ok(book.vars['--bl'] === '270px' && book.vars['--bm'] === '22px' && book.vars['--br'] === '28px', '⛔ 앞 판이 보이는데 칸 값(left·m·r)이 달라졌다');
  assert.deepStrictEqual(js(bi.sent), [[{ onf: 'bookPark', on: false }, O]], '⛔ 앞 판 교재에 「보임」을 안 알렸다');
  assert.deepStrictEqual(js(mi.sent), [[{ onf: 'bookPark', on: true }, O]], '⛔ 닫힌 내 문장에 「대기」를 안 알렸다');
  assert.strictEqual(s.homeInner.sent.length, 0, '⛔ 창이 아직 열려 있는데 홈에 bookClosed 를 알렸다');
  //   Esc 도 한 단계 — 앞 판 → 다시 Esc = 홈(보이는 판 없음 · 이때 bookClosed 한 번)
  s.send({ onf: 'openBook', href: MYS }, bi);
  assert.ok(mine === shownOf(s)[0] && shownOf(s).length === 1, '전제: 다시 내 문장');
  s.listeners.keydown.forEach((f) => f({ key: 'Escape' }));
  assert.ok(shownOf(s)[0] === book && shownOf(s).length === 1, '⛔ Esc 가 앞 판으로 안 갔다');
  s.listeners.keydown.forEach((f) => f({ key: 'Escape' }));
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 앞 판이 없는 판에서 Esc 가 홈으로 안 갔다');
  assert.deepStrictEqual(js(s.homeInner.sent), [[{ onf: 'bookClosed' }, O]], '⛔ 홈으로 나갈 때 bookClosed 가 한 번이 아니다');
});

t('돌아가기 고리 — 교재 → 내 문장 → 「교재에서 보기」(같은 교재 판) → ✕ = 홈(왔다 갔다 해도 안 늘어남)', () => {
  const { s, book, bi, mine, mi, src0 } = backSetup();
  for (let i = 0; i < 3; i++) {
    s.send({ onf: 'openBook', href: E1 + '&line=3' }, mi);   // 내 문장 → 교재(같은 판) = 돌아간 것
    assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === book && s.panels().length === 2 && book.kids[0].src === src0, '⛔ 「교재에서 보기」가 같은 교재 판을 안 보였다(' + i + ')');
    s.send({ onf: 'openBook', href: MYS }, bi);              // 교재 → 내 문장
    assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === mine && s.panels().length === 2, '⛔ 다시 내 문장이 안 보였다(' + i + ')');
  }
  s.send({ onf: 'bookClose' }, mi);                           // 내 문장 ✕ = 교재(앞 판)
  assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === book, '⛔ 왔다 갔다 한 뒤 내 문장 ✕ 가 앞 판(교재)을 안 보였다');
  s.send({ onf: 'bookClose' }, bi);                           // 교재 ✕ = 홈 — 교재가 내 문장을 앞 판으로 기억하면 둘이 번갈아 보인다
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 왔다 갔다 한 뒤 교재 ✕ 가 홈으로 안 갔다(서로를 앞 판으로 기억한다 — 판 둘이 번갈아 보인다)');
  //   교재에서 끝나는 쪽도 같다 — 내 문장에서 「교재에서 보기」로 돌아간 직후 ✕ = 홈
  s.send({ onf: 'openBook', href: MYS }, bi);
  s.send({ onf: 'openBook', href: E1 + '&line=3' }, mi);
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 돌아간 직후 ✕ 가 홈으로 안 갔다');
  s.send({ onf: 'bookClose' }, mi);   // 숨은 판의 말은 못 가로챈다 — 그대로 홈
  assert.ok(shownOf(s).length === 0, '⛔ 숨은 판의 ✕ 가 판을 보였다');
});

t('앞 판이 이미 지워졌으면(30분 안 씀 · 판 셋 넘침) 닫기 = 홈 · 새로 안 받는다', () => {
  const { s, book, mine, mi } = backSetup();
  const n = s.panels().length;
  s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000).forEach((x) => { x.on = false; x.f(); });   // 숨긴 채 BOOK_IDLE_MS — 교재 판이 지워진다
  assert.ok(!s.panels().includes(book) && s.panels().length === n - 1, '전제: 앞 판(교재)이 30분에 지워졌다');
  s.send({ onf: 'bookClose' }, mi);
  assert.ok(shownOf(s).length === 0 && s.panels().length <= n - 1 && s.panels().every((p) => p === mine), '⛔ 지워진 앞 판을 다시 불러왔다(또는 홈으로 안 갔다)');
  //   판 셋 넘침으로 밀려난 경우도 같다: 교재 → 내 문장 → E3 → E4 (네 번째가 가장 오래 안 쓴 숨긴 판 = 교재를 비킨다)
  const c = backSetup();
  c.s.send({ onf: 'openBook', href: E3 }, c.mi);
  const e3 = c.s.panels().find((p) => p !== c.book && p !== c.mine), i3 = hi(c.s, e3);
  c.s.send({ onf: 'openBook', href: E4 }, i3);
  assert.ok(!c.s.panels().includes(c.book) && c.s.panels().length === 3, '전제: 판 셋 넘침으로 교재가 밀려났다');
  c.s.send({ onf: 'bookClose' }, hi(c.s, shownOf(c.s)[0]));   // E4 닫기 → E3
  assert.ok(shownOf(c.s)[0] === e3 && shownOf(c.s).length === 1, '⛔ E4 를 닫았는데 앞 판 E3 이 안 보인다');
  c.s.send({ onf: 'bookClose' }, i3);                         // E3 닫기 → 내 문장
  assert.ok(shownOf(c.s)[0] === c.mine && shownOf(c.s).length === 1, '⛔ E3 을 닫았는데 앞 판(내 문장)이 안 보인다');
  c.s.send({ onf: 'bookClose' }, c.mi);                       // 내 문장 닫기 → 앞 판(교재)은 밀려났다 = 홈
  assert.ok(shownOf(c.s).length === 0 && c.s.panels().length === 3 && !c.s.panels().includes(c.book), '⛔ 밀려난 앞 판을 다시 불러왔다(또는 홈으로 안 갔다)');
});

t('전부 닫기 — 판의 bookClose{all:1}(교재 「홈」)·홈의 bookDismiss(메뉴 누름)는 앞 판을 안 보인다 · 홈에서 다시 연 판은 앞 판 기억이 없다', () => {
  let c = backSetup();
  c.s.homeInner.sent.length = 0;
  c.s.send({ onf: 'bookClose', all: 1 }, c.mi);
  assert.ok(shownOf(c.s).length === 0 && c.s.panels().length === 2, '⛔ 「홈」(all:1)이 앞 판을 보였다');
  assert.deepStrictEqual(js(c.s.homeInner.sent), [[{ onf: 'bookClosed' }, O]], '⛔ 전부 닫는데 홈에 bookClosed 가 한 번이 아니다');
  c = backSetup();
  c.s.send({ onf: 'bookDismiss' }, c.s.homeInner);
  assert.ok(shownOf(c.s).length === 0 && c.s.panels().length === 2, '⛔ 메뉴 누름(bookDismiss)이 앞 판을 보였다');
  c = backSetup();
  c.s.send({ onf: 'bookClose', all: 0 }, c.mi);
  assert.ok(shownOf(c.s)[0] === c.book, '⛔ all 이 1 이 아닌데 전부 닫았다(all:1 만 전부 닫기)');
  //   홈에서 다시 연 판은 「나를 열어 준 판」이 없다 — 내 문장을 홈에서 열면 닫을 때 교재가 아니라 홈
  c = backSetup();
  c.s.send({ onf: 'openBook', href: MYS, left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === c.mine && shownOf(c.s).length === 1, '전제: 홈에서 내 문장을 다시 열었다');
  c.s.send({ onf: 'bookClose' }, c.mi);
  assert.ok(shownOf(c.s).length === 0, '⛔ 홈에서 연 판인데 닫으니 옛 앞 판(교재)이 보인다');
});

t('폰(onf-ph)에선 앞 판 규칙 없음 — 종전(닫으면 판 칸 기록을 걷고 홈)', () => {
  const s = phoneSetup();
  s.send({ onf: 'openBook', href: E1 }, s.homeInner);
  const book = s.panel(), bi = hi(s, book);
  s.send({ onf: 'openBook', href: MYS }, bi);
  const mine = s.panels().find((p) => p !== book), mi = hi(s, mine);
  assert.ok(s.root.classList.contains('onf-ph') && book.classList.contains('park') && !mine.classList.contains('park'), '전제: 폰 — 내 문장이 보인다');
  const goes = s.H.goes.length;
  s.send({ onf: 'bookClose' }, mi);
  assert.ok(shownOf(s).length === 0 && s.panels().length === 2, '⛔ 폰에서 닫았는데 앞 판이 보인다(폰은 종전: 닫으면 홈)');
  assert.ok(s.H.goes.length === goes + 1, '⛔ 폰 ✕ 가 판 칸 기록을 안 걷었다(종전)');
});

t('앞 판 기억은 한 줄로 이어진다 — 교재 → E2 → 내 문장 → 「교재에서 보기」(E1) 는 돌아간 것: ✕ 가 홈으로 간다(고리가 안 생긴다)', () => {
  const { s, book, bi, mine, mi } = backSetup();
  s.send({ onf: 'bookClose' }, mi);                                       // 한 번 내 문장을 닫아 두고(교재가 보임)
  s.send({ onf: 'openBook', href: E2 }, bi);                              // 교재 → E2
  const e2 = shownOf(s)[0], i2 = hi(s, e2);
  assert.ok(e2 !== book && s.panels().length === 3, '전제: E2 판이 떴다');
  s.send({ onf: 'openBook', href: MYS }, i2);                            // E2 → 내 문장(기존 판)
  assert.ok(shownOf(s)[0] === mine, '전제: 내 문장');
  s.send({ onf: 'openBook', href: E1 }, mi);                              // 내 문장 → 교재 — E2 를 거쳐 교재가 열어 준 길이다 = 돌아감
  assert.ok(shownOf(s)[0] === book && shownOf(s).length === 1, '전제: 교재가 보인다');
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(shownOf(s).length === 0, '⛔ 교재 ✕ 가 홈으로 안 갔다 — 교재 ← 내 문장 ← E2 ← 교재 고리가 생겼다(✕ 가 끝없이 돈다)');
});

t('🔐 못 연 판 안내의 [닫기](이벤트가 인자로 온다)도 한 단계 — 앞 판이 보이고 안내 판은 지워진다(all 은 엄격하게 true 만)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: E1, left: 270 }, s.homeInner);
  const book = s.panel(), bi = hi(s, book);
  s.send({ onf: 'openBook', href: MYS }, bi);
  const mine = s.panels().find((p) => p !== book);
  stuckLoad(s, mine);
  mine.kids[1].kids.find((k) => k.className === 'onf-stuck').kids[2].onclick({ type: 'click' });
  assert.ok(shownOf(s).length === 1 && shownOf(s)[0] === book && !s.panels().includes(mine), '⛔ 안내의 [닫기]가 앞 판을 안 보였다(이벤트 인자를 「전부 닫기」로 읽었다)');
});


/* ═══ 📖 교재 판 한 장 2단계 — 학생 홈에서 연 판 하나가 다른 교재로 갈아 끼운다 (설계 ONF_SlackBot docs/2026-10-15-교재판-한장-설계.md §5.2 · §7.2 갈래 표 4 · H1'~H9') ═══
   쌍둥이: test/teacher-book.test.js 「1d — 갈아 끼우기」(같은 반박 검토 교훈) · 판 쪽 약속은 Ownify ONF_Share_WebApp_Html onfBookSwap.
   학생만의 점: view·line 만 다른 주소는 bookLike → bookView 를 **먼저**(할 줄 아는 판) · 폰도 숨긴 미리 판 하나 그대로(선생님 D1 아님) · 2시간 나이는 판 자격 있는 판만. */
console.log('[📖 교재 판 한 장 2단계 — 학생 갈아 끼우기]');
const RS = realSrc();
const SE = (ep, x) => 'https://script.ownify.co.kr/thegoodplace-s1-' + ep + '-sunny?mode=share&t=TOK' + (x || '');
const SM = 'https://script.ownify.co.kr/?mode=mine&t=TOK';
const sentOf = (w) => js(w.sent).map((x) => x[0]);
const swapMsg = (bi) => sentOf(bi).filter((m) => m.onf === 'bookSwap');
const viewMsg = (bi) => sentOf(bi).filter((m) => m.onf === 'bookView');
const fetchOf = (bi) => sentOf(bi).filter((m) => m.onf === 'bookFetch').map((m) => m.src);
const T14 = (s) => s.timers.filter((x) => x.on && x.ms === 14000);
const T30 = (s) => s.timers.filter((x) => x.on && x.ms === 30 * 60 * 1000);
const AGE = 2 * 60 * 60 * 1000 + 1000;
function kwin(s, box, n) { const bw = win('book-exec' + n, s.top), bi = win('book-user' + n, bw); box.kids[0].contentWindow = bw; return bi; }
/* 판 노크 — 첫 노크(swap 없음) 뒤 둘째 노크(swap:1 — 판의 ONF_BOARD 는 evaluate 뒤라 첫 노크엔 없다). swap === false 면 첫 노크만(옛 교재 · Lib 스위치 끔). */
function swapKnock(s, box, n, swap, views) {
  const bi = kwin(s, box, n);
  s.send({ onf: 'bookHi', views: views || 'line' }, bi);
  if (swap !== false) s.send({ onf: 'bookHi', views: views || 'line', swap: 1 }, bi);
  bi.sent.length = 0;
  return bi;
}
/* S3(갈래 표 4): 스위치 켬 · 홈에서 연 교재 판 P(E1)가 노크 swap:1 뒤 닫혀 숨김. o.off = 스위치 끔 · o.knock === false = swap 노크 없음 · o.views = 노크 views. */
function boardRun(o) {
  o = o || {};
  const s = o.phone ? phoneSetup({ bs: RS, swap: !o.off, perf: o.perf }) : setup(RS, { swap: !o.off, perf: o.perf });
  s.send({ onf: 'openBook', href: SE('e1'), left: 270, m: 22, r: 28 }, s.homeInner);
  const P = s.panel(), src0 = P.kids[0].src, bi = swapKnock(s, P, 1, o.knock, o.views);
  if (o.phone) s.browserBack(); else s.send({ onf: 'bookClose' }, bi);
  bi.sent.length = 0; s.homeInner.sent.length = 0;
  return { s, P, bi, src0 };
}

t("H1' — 홈에서 연 판이 있으면 [열기] = bookSwap(새 액자 0 · 같은 액자 · 그 창·그 출처로) · 같은 주소 다시 = 말 0 · 갈아 끼운 판은 옛 주소로 안 찾는다", () => {
  const { s, P, bi, src0 } = boardRun();
  assert.ok(P.classList.contains('park') && s.panels().length === 1, '전제: P 숨김');
  s.send({ onf: 'openBook', href: SE('e2'), left: 270, m: 22, r: 28 }, s.homeInner);
  assert.ok(s.panels().length === 1 && !P.classList.contains('park') && P.kids[0].src === src0, '⛔ 갈아 끼우지 않고 새 판을 띄웠다(또는 P 를 안 보였다 · 액자를 다시 불렀다)');
  const m = swapMsg(bi);
  assert.ok(m.length === 1 && m[0].src === RS(SE('e2')) && typeof m[0].id === 'number' && m[0].id > 0, '⛔ bookSwap{id, src} 가 판에 안 갔다');
  assert.ok(js(bi.sent).every((x) => x[1] === O), "⛔ 판에 '*' 나 남의 출처로 보냈다");
  s.send({ onf: 'bookSwapped', id: m[0].id, ok: true, why: '', from: 'cache', ms: 40 }, bi);
  assert.strictEqual(T14(s).length, 0, '⛔ 답(ok)을 받았는데 14초 시계가 남았다');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner);
  assert.ok(bi.sent.length === 0 && s.panels().length === 1 && !P.classList.contains('park'), '⛔ 같은 주소인데 또 말을 보냈다(0초 길이 아니다)');
  s.send({ onf: 'bookClose' }, bi);
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  assert.ok(swapMsg(bi).length === 1 && swapMsg(bi)[0].src === RS(SE('e1')) && s.panels().length === 1, '⛔ 갈아 끼운 판을 옛 주소(E1)로 찾았다 — 판은 이제 E2 다');
});

t("H1' cur — bookSwap 은 판이 **지금 든 주소**(p.real)를 cur 로 싣는다(Ownify 판의 떠나기 전 담기 열쇠 · 2026-10-17 라이브 A→B→A 의 A 2.6초) · 처음 = 판을 연 주소 · ok 뒤 = 그 주소 · 물러남 뒤 = 되돌린 주소", () => {
  const { s, bi } = boardRun();
  s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner);
  let m = swapMsg(bi);
  assert.strictEqual(m[0].cur, RS(SE('e1')), '⛔ 첫 갈아 끼우기에 판을 연 주소(처음 doGet 으로 그린 E1)를 안 실었다 — 판이 E1 을 담을 열쇠를 모른다');
  s.send({ onf: 'openBook', href: SE('e4'), left: 270 }, s.homeInner);   // 앞 것(E2)이 답 전 — 판은 아직 E1 을 들고 있다
  assert.strictEqual(swapMsg(bi)[1].cur, RS(SE('e1')), '⛔ 답 전 둘째 갈아 끼우기의 cur 가 기다리는 주소(E2)다 — 판이 든 것은 아직 E1');
  s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner); m = swapMsg(bi).slice(-1);
  s.send({ onf: 'bookSwapped', id: m[0].id, ok: true, from: 'server' }, bi);
  s.send({ onf: 'bookClose' }, bi); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, s.homeInner);
  m = swapMsg(bi);
  assert.strictEqual(m[0].cur, RS(SE('e2')), '⛔ ok 뒤 cur 가 판이 든 E2 가 아니다');
  s.send({ onf: 'bookSwapped', id: m[0].id, ok: false, why: 'busy' }, bi);   // 판은 E2 그대로 · E3 는 새 판
  s.send({ onf: 'bookClose' }, bi); bi.sent.length = 0;
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  m = swapMsg(bi);
  assert.ok(m.length === 1 && m[0].cur === RS(SE('e2')), '⛔ 물러난(busy) 뒤 cur 가 되돌린 E2 가 아니다: ' + JSON.stringify(m.map((x) => x.cur)));
});

t("H1' 학생만 — view·line 만 다른 주소는 할 줄 아는 판이면 **먼저** bookView(갈아 끼우지 않음) · 할 줄 모르면(cards 노크 없음) 갈아 끼움 · 갈아 끼우는 중인 판엔 bookView 를 안 보낸다", () => {
  let c = boardRun({ views: 'cards,line' });
  c.s.send({ onf: 'openBook', href: SE('e1', '&line=17'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(c.bi).length === 0 && viewMsg(c.bi).length === 1 && viewMsg(c.bi)[0].line === 17 && c.s.panels().length === 1, '⛔ 줄만 다른 주소를 bookView 대신 갈아 끼웠다(또는 새 판)');
  c.s.send({ onf: 'bookClose' }, c.bi); c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: SE('e1', '&view=cards'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(c.bi).length === 0 && viewMsg(c.bi).length === 1 && viewMsg(c.bi)[0].view === 'cards', '⛔ 「카드 시작」(같은 회차 · 할 줄 아는 판)을 갈아 끼웠다 — 0초 길(bookView)이어야(갈래 표 4 #2)');
  //   cards 를 모르는 판(보이게 연 판 · views line) — 덱은 갈아 끼우기(view=cards 주소 → 판이 다 받으면 덱을 연다 · 갈래 표 4 #3)
  c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e1', '&view=cards'), left: 270 }, c.s.homeInner);
  assert.ok(viewMsg(c.bi).length === 0 && swapMsg(c.bi).length === 1 && swapMsg(c.bi)[0].src === RS(SE('e1', '&view=cards')) && c.s.panels().length === 1, '⛔ cards 를 모르는 판인데 덱을 갈아 끼우기로 안 보냈다(또는 새 판)');
  //   다른 회차 덱(E4) — 갈아 끼움
  c = boardRun({ views: 'cards,line' });
  c.s.send({ onf: 'openBook', href: SE('e4', '&view=cards'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(c.bi).length === 1 && swapMsg(c.bi)[0].src === RS(SE('e4', '&view=cards')) && viewMsg(c.bi).length === 0 && c.s.panels().length === 1, '⛔ 다른 회차 덱이 갈아 끼우기가 아니다');
  //   갈아 끼우는 중(답 전) — 같은 회차 줄 링크는 bookView 가 아니라 다시 갈아 끼움(판은 아직 옛 교재다 · 나중 것이 이긴다)
  c = boardRun({ views: 'cards,line' });
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'openBook', href: SE('e2', '&line=3'), left: 270 }, c.s.homeInner);
  assert.ok(viewMsg(c.bi).length === 0 && swapMsg(c.bi).length === 2 && swapMsg(c.bi)[1].src === RS(SE('e2', '&line=3')), '⛔ 갈아 끼우는 중인 판에 bookView 를 보냈다(옛 교재에서 줄을 굴린다)');
  assert.strictEqual(T14(c.s).length, 1, '⛔ 진 갈아 끼우기 시계를 안 걷었다');
  c.s.send({ onf: 'openBook', href: SE('e2', '&line=3'), left: 270 }, c.s.homeInner);   // 같은 주소를 또(아직 답 전) — 판은 그 주소로 가는 중 · 옛 교재에서 줄을 굴리지 않는다
  assert.ok(viewMsg(c.bi).length === 0 && swapMsg(c.bi).length === 2, '⛔ 갈아 끼우는 중인 판(같은 주소)에 bookView 를 보냈다');
});

t("판 고르기 — 보이는 판이 먼저(그보다 나중에 생긴 숨긴 판이 있어도) · 1분 넘게 노크 없는 판은 노크 전 후보가 아니다(미리가 줄에 갇히지 않는다)", () => {
  let s = setup(RS, { swap: true });
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  const A = s.panel();
  s.send({ onf: 'bookHi', views: 'line' }, kwin(s, A, 0));            // A 는 첫 노크만(swap 전) — 판도 노크 전 후보도 아니다
  s.send({ onf: 'bookWarm', href: SE('e3'), panel: 1, left: 270 }, s.homeInner);
  const C = s.panels().find((x) => x !== A), ai = swapKnock(s, A, 1), ci = swapKnock(s, C, 3);
  assert.ok(!A.classList.contains('park') && C.classList.contains('park'), '전제: A 보임 · C 숨김(나중에 생김)');
  s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner);
  assert.ok(swapMsg(ai).length === 1 && swapMsg(ci).length === 0 && shownOf(s)[0] === A, '⛔ 보이는 판(A)을 두고 숨긴 판(C)을 갈아 끼웠다');
  s = setup(RS, { swap: true });
  s.send({ onf: 'bookWarm', href: SE('e1'), panel: 1, left: 270 }, s.homeInner);
  s.g.T += 61 * 1000;
  s.send({ onf: 'bookWarm', href: SE('e2'), panel: 1, left: 270 }, s.homeInner);
  assert.strictEqual(s.panels().length, 2, '⛔ 1분 넘게 노크 없는 판(안내 화면)이 아직 미리를 줄에 세운다');
});

t("H1' — 판이 아니면 종전(새 판): 스위치 끔 · swap 노크 없음 · ⭐ 내 문장 주소 · 판 안에서 연 판", () => {
  for (const o of [{ off: true }, { knock: false }]) {
    const { s, P, bi } = boardRun(o);
    s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner);
    assert.ok(s.panels().length === 2 && P.classList.contains('park') && swapMsg(bi).length === 0, '⛔ 판이 아닌데 갈아 끼웠다: ' + JSON.stringify(o));
  }
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: SM, left: 270 }, s.homeInner);
  assert.ok(s.panels().length === 2 && P.classList.contains('park') && swapMsg(bi).length === 0, '⛔ ⭐ 내 문장 주소를 교재 판에 갈아 끼웠다(내 문장 판은 따로 — 설계 §5.4)');
  //   판 안에서 연 판(back 있음)은 판이 아니다 — 그 판만 남았을 때 [열기] 는 새 판
  const c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'openBook', href: SE('e2') }, c.bi);
  const q = shownOf(c.s)[0], qi = swapKnock(c.s, q, 2);
  c.s.drop(c.P);
  c.s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(qi).length === 0 && c.s.panels().length === 2, '⛔ 판 안에서 연 판(back 있음)을 판으로 갈아 끼웠다');
});

t("H5·H9' — bookSwap 이 bookPark{on:false} 보다 먼저 · 갈아 끼울 때 openBook 의 left·m·r 로 자리(bookBox 뒤에도)", () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'bookBox', left: 300, m: 20, r: 24 }, s.homeInner);
  assert.ok(P.vars['--bl'] === '300px', '전제: 숨긴 판도 새 칸');
  s.send({ onf: 'openBook', href: SE('e2'), left: 310, m: 18, r: 26 }, s.homeInner);
  assert.deepStrictEqual(sentOf(bi).map((m) => m.onf + (m.onf === 'bookPark' ? ':' + m.on : '')), ['bookSwap', 'bookPark:false'], '⛔ 「보임」이 bookSwap 보다 먼저 갔다(판이 A 로 「들어옴」을 알린다 — R12)');
  assert.ok(P.vars['--bl'] === '310px' && P.vars['--bm'] === '18px' && P.vars['--br'] === '26px' && P.classList.contains('beside'), '⛔ 갈아 끼운 판이 openBook 의 칸 값(left·m·r)으로 안 놓였다');
});

t("H2' — ok:false(busy·fail·notice·bad_arg) → 종전 새 판 + 판 숨김 + 판 주소 되돌림 · stale·14초 답 없음 → 판 자격만 내림(액자는 안 지움 · 30분 시계 · 주소로 못 찾음) + 새 판 · 남의 창·모르는 번호는 버림", () => {
  for (const why of ['busy', 'fail', 'notice', 'bad_arg']) {
    const { s, P, bi, src0 } = boardRun();
    s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner);
    s.send({ onf: 'bookSwapped', id: swapMsg(bi)[0].id, ok: false, why, from: '', ms: 3 }, bi);
    const n = shownOf(s)[0];
    assert.ok(s.panels().length === 2 && n !== P && P.classList.contains('park') && n.kids[0].src === RS(SE('e2')), '⛔ ' + why + ' 인데 종전 새 판(E2)으로 안 물러났다');
    assert.ok(n.vars['--bl'] === '270px' && T14(s).length === 0, '⛔ 물러난 새 판 자리 · 14초 시계');
    bi.sent.length = 0;
    s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
    assert.ok(shownOf(s)[0] === P && P.kids[0].src === src0 && swapMsg(bi).length === 0, '⛔ ' + why + ' 뒤 판 주소를 안 되돌렸다(E1 을 다시 열면 0초여야)');
  }
  for (const how of ['stale', 'time']) {
    const c = boardRun();
    c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
    if (how === 'stale') c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: false, why: 'stale' }, c.bi);
    else { assert.strictEqual(T14(c.s).length, 1, '⛔ 14초 시한이 없다'); T14(c.s)[0].f(); }
    assert.ok(c.s.panels().includes(c.P) && c.P.parentNode && c.P.classList.contains('park') && shownOf(c.s).length === 1 && shownOf(c.s)[0].kids[0].src === RS(SE('e2')), '⛔ ' + how + ' — 옛 판 액자를 지웠다(안 보낸 글이 사라진다) · 또는 새 판(E2)이 아니다');
    assert.ok(T30(c.s).length >= 1 && c.s.obj(c.P).swap === false, '⛔ ' + how + ' 판에 30분 시계가 없다(영영 안 치운다) · 또는 판 자격이 남았다');
    c.s.send({ onf: 'bookClose' }, swapKnock(c.s, shownOf(c.s)[0], 7, false));
    c.bi.sent.length = 0;
    c.s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, c.s.homeInner);
    assert.ok(swapMsg(c.bi).length === 0, '⛔ ' + how + ' 판을 다시 판으로 뽑았다');
    for (const h of [SE('e1'), SE('e1', '&line=4')]) {
      c.s.send({ onf: 'openBook', href: h, left: 270 }, c.s.homeInner);
      assert.ok(shownOf(c.s)[0] !== c.P && viewMsg(c.bi).length === 0, '⛔ ' + how + ' 판(내용 모름)을 주소·bookLike 로 찾아 보였다: ' + h);
    }
    T30(c.s).forEach((x) => { x.on = false; x.f(); });
    assert.ok(!c.s.panels().includes(c.P), '⛔ 30분 뒤에도 ' + how + ' 판이 남았다');
  }
  const c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  const id = swapMsg(c.bi)[0].id;
  c.s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, win('stranger', c.s.top));
  c.s.send({ onf: 'bookSwapped', id: id + 99, ok: false, why: 'busy' }, c.bi);
  c.s.send({ onf: 'bookSwapped', id: id + 99, ok: true, from: 'cache' }, c.bi);
  c.s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, c.s.homeInner);
  assert.ok(c.s.panels().length === 1 && T14(c.s).length === 1, '⛔ 남의 창·모르는 번호·홈 액자의 답으로 물러났다');
  c.s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === c.P && swapMsg(c.bi).length === 0, '⛔ 모르는 번호의 ok 로 판이 든 교재를 바꿔 알았다(E1 을 못 찾는다)');
});

t("H2' — 그 사이 사람이 닫았으면(판 숨김) 물러나도 새 판을 안 띄운다(주소만 되돌림) · 숨긴 판이 받는 답도 듣는다", () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, s.homeInner);
  const id = swapMsg(bi)[0].id;
  s.send({ onf: 'bookClose' }, bi);
  s.send({ onf: 'bookSwapped', id, ok: false, why: 'busy' }, bi);
  assert.ok(s.panels().length === 1 && shownOf(s).length === 0 && T14(s).length === 0, '⛔ 닫은 뒤 늦게 온 busy 가 새 판을 띄웠다(또는 숨긴 판의 답을 안 들었다)');
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  assert.ok(shownOf(s)[0] === P && swapMsg(bi).length === 0, '⛔ 주소를 안 되돌렸다');
});

t("갈래 12' — 빠르게 둘: 나중 것만 기다린다(시한 하나) · 앞 것이 먼저 ok 인데 나중 것이 실패하면 판 주소는 앞 것 · 기다리던 판을 지우면 시한도 걷힌다", () => {
  let c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, c.s.homeInner);
  let m = swapMsg(c.bi);
  assert.ok(m.length === 2 && m[1].id > m[0].id && T14(c.s).length === 1, '⛔ 진 갈아 끼우기의 14초 시계를 안 걷었다');
  c.s.send({ onf: 'bookSwapped', id: m[0].id, ok: true, from: 'cache' }, c.bi);
  assert.strictEqual(T14(c.s).length, 1, '⛔ 진 번호의 답으로 나중 것 기다림을 끝냈다');
  c.s.send({ onf: 'bookSwapped', id: m[1].id, ok: false, why: 'fail' }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === c.P && swapMsg(c.bi).length === 0, '⛔ 판이 실제로 든 E2 를 못 찾았다');
  c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.drop(c.P);
  assert.strictEqual(T14(c.s).length, 0, '⛔ 지운 판의 갈아 끼우기 시한이 남았다(14초 뒤 새 판이 불쑥 뜬다)');
});

t("판이 다시 읽혔다(노크가 다시 옴) — 판 주소를 처음 주소로 · 첫 노크만 온 사이엔 판이 아니다 · 기다리던 갈아 끼우기는 물러난다", () => {
  let c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache' }, c.bi);
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.send({ onf: 'bookHi', views: 'line' }, c.bi);
  c.s.send({ onf: 'bookHi', views: 'line', swap: 1 }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === c.P && swapMsg(c.bi).length === 0, '⛔ 다시 읽힌 판(E1)을 E1 로 못 찾았다');
  c = boardRun();
  c.s.send({ onf: 'bookHi', views: 'line' }, c.bi);
  c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(c.bi).length === 0 && c.s.panels().length === 2, '⛔ 첫 노크(swap 없음) 뒤에도 옛 swap:1 을 믿고 갈아 끼웠다');
  c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookHi', views: 'line' }, c.bi);
  assert.ok(c.s.panels().length === 2 && shownOf(c.s)[0].kids[0].src === RS(SE('e2')) && T14(c.s).length === 0, '⛔ 말이 사라진 갈아 끼우기를 14초 기다린다(또는 새 판을 안 띄웠다)');
});

t("H3' — 미리(bookWarm panel:1): 판 있음 → bookFetch(새 판 0) · 판이 든 주소·⭐ 주소는 말 0(내 문장은 종전 숨긴 판) · 판 없음 → 종전 숨긴 판 · 📱 폰도 판 없으면 숨긴 미리 판 하나(학생은 D1 아님 · 종전 그대로)", () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'bookWarm', href: SE('e3'), panel: 1, left: 270 }, s.homeInner);
  assert.ok(s.panels().length === 1 && P.classList.contains('park'), '⛔ 판이 있는데 미리 새 판을 띄웠다');
  assert.deepStrictEqual(sentOf(bi), [{ onf: 'bookFetch', src: RS(SE('e3')) }], '⛔ 판에 bookFetch{src} 가 안 갔다');
  bi.sent.length = 0;
  s.send({ onf: 'bookWarm', href: SE('e1'), panel: 1 }, s.homeInner);
  s.send({ onf: 'bookWarm', href: SM, panel: 1, left: 270 }, s.homeInner);
  assert.ok(sentOf(bi).length === 0 && s.panels().length === 2 && s.panels()[1].kids[0].src.indexOf('mode=mine') > 0, '⛔ 판이 든 주소·내 문장을 bookFetch 로 보냈다(또는 내 문장 숨긴 판이 종전이 아니다)');
  const off = boardRun({ off: true });
  off.s.send({ onf: 'bookWarm', href: SE('e3'), panel: 1 }, off.s.homeInner);
  assert.ok(off.s.panels().length === 2 && off.s.panels()[1].classList.contains('park') && sentOf(off.bi).length === 0, '⛔ 스위치 꺼짐인데 종전(숨긴 판 미리)이 아니다');
  const ph = phoneSetup({ bs: RS, swap: true });
  ph.send({ onf: 'bookWarm', href: SE('e3'), panel: 1 }, ph.homeInner);
  assert.ok(ph.panels().length === 1 && ph.panels()[0].classList.contains('park'), '⛔ 학생 폰(스위치 켬)이 판 없을 때 숨긴 미리 판 하나를 안 띄운다(종전 BOOK_PHONE 2 그대로 · 설계 §7.2)');
  const pb = boardRun({ phone: true });
  pb.s.send({ onf: 'bookWarm', href: SE('e3'), panel: 1 }, pb.s.homeInner);
  assert.ok(pb.s.panels().length === 1 && fetchOf(pb.bi)[0] === RS(SE('e3')), '⛔ 폰 판이 있는데 bookFetch 가 아니다');
});

t("H6' — 판은 30분 지우기·판 셋 넘침에서 빠진다 · 판 안에서 연 판·⭐ 내 문장 판은 종전대로", () => {
  const { s, P, bi } = boardRun();
  T30(s).forEach((x) => { x.on = false; x.f(); });
  assert.ok(s.panels().includes(P), '⛔ 판이 숨긴 채 30분에 지워졌다(하루 종일 한 판)');
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  s.send({ onf: 'openBook', href: SE('e2') }, bi);
  const q2 = shownOf(s)[0], i2 = swapKnock(s, q2, 2);
  s.send({ onf: 'openBook', href: SE('e3') }, i2);
  const q3 = shownOf(s)[0], i3 = swapKnock(s, q3, 3);
  s.send({ onf: 'openBook', href: SE('e4') }, i3);
  assert.ok(s.panels().length === 3 && s.panels().includes(P) && !s.panels().includes(q2), '⛔ 판 셋 넘침에서 판(P)을 비켰다');
  T30(s).forEach((x) => { x.on = false; x.f(); });
  assert.ok(s.panels().includes(P) && !s.panels().includes(q3), '⛔ 판 안에서 연 숨긴 판의 30분 지우기가 안 돈다(종전)');
  const m = boardRun();
  m.s.send({ onf: 'bookWarm', href: SM, panel: 1, left: 270 }, m.s.homeInner);
  const M = m.s.panels()[1]; swapKnock(m.s, M, 5, false, 'review');
  T30(m.s).forEach((x) => { x.on = false; x.f(); });
  assert.ok(!m.s.panels().includes(M) && m.s.panels().includes(m.P), '⛔ ⭐ 내 문장 숨긴 판의 30분 지우기가 바뀌었다(종전)');
});

t("판 나이 — 판 자격 있는 숨긴 판이 2시간 넘었으면 다시 보일 때 새로(옛 판은 지우지 않고 자격만 내림) · bookLike 도 그 판을 안 쓴다(덱·줄이 새 판 주소로 간다) · ⭐ 내 문장 판·보이는 판·스위치 끔은 종전", () => {
  let c = boardRun({ views: 'cards,line' });
  c.s.g.T += AGE;
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  const n = shownOf(c.s)[0];
  assert.ok(n && n !== c.P && n.kids[0].src === RS(SE('e1')) && c.s.panels().includes(c.P) && c.P.classList.contains('park'), '⛔ 2시간 넘은 숨긴 판을 그대로 보였다(또는 옛 판을 지웠다)');
  assert.ok(T30(c.s).length >= 1 && viewMsg(c.bi).length === 0, '⛔ 늙은 판에 30분 시계가 없다(또는 늙은 판에 말을 보냈다)');
  //   늙은 판에 줄·덱 — bookView 로 옛 판을 쓰지 않는다(갈아 끼우기 → 판이 stale 로 답하면 새 판)
  c = boardRun({ views: 'cards,line' });
  c.s.g.T += AGE;
  c.s.send({ onf: 'openBook', href: SE('e1', '&view=cards'), left: 270 }, c.s.homeInner);
  assert.ok(viewMsg(c.bi).length === 0 && shownOf(c.s)[0] !== c.P && shownOf(c.s)[0].kids[0].src === RS(SE('e1', '&view=cards')), '⛔ 늙은 판에 bookView 를 보냈다 · 또는 새로 띄운 판이 덱 주소(view=cards)가 아니다(덱을 잃는다)');
  //   늙은 판이 든 주소가 줄 주소(갈아 끼운 판) — 새로 띄우면 그 주소로 뜬다 · 옛 판에 「이 줄로」를 안 보낸다
  c = boardRun({ views: 'cards,line' });
  c.s.send({ onf: 'openBook', href: SE('e2', '&line=5'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache' }, c.bi);
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.g.T += AGE; c.bi.sent.length = 0;
  c.s.send({ onf: 'openBook', href: SE('e2', '&line=5'), left: 270 }, c.s.homeInner);
  assert.ok(viewMsg(c.bi).length === 0 && shownOf(c.s)[0] !== c.P && shownOf(c.s)[0].kids[0].src === RS(SE('e2', '&line=5')), '⛔ 자격 내린 늙은 판에 bookView 를 보냈다(숨긴 옛 판이 줄을 굴린다)');
  //   ⭐ 내 문장 판(swap 아님) — 늙어도 종전(그대로 0초)
  c = boardRun();
  c.s.send({ onf: 'bookWarm', href: SM, panel: 1, left: 270 }, c.s.homeInner);
  const M = c.s.panels()[1], mi = swapKnock(c.s, M, 5, false, 'review');
  c.s.g.T += AGE;
  c.s.send({ onf: 'openBook', href: SM, left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === M && c.s.panels().length === 2, '⛔ ⭐ 내 문장 판을 나이로 갈았다(⭐ 판 속도 — 종전 0초)');
  c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  c.s.g.T += AGE;
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === c.P && c.s.panels().length === 1, '⛔ 보이는 판을 나이로 갈았다');
  c = boardRun({ off: true });
  c.s.g.T += AGE;
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  assert.ok(shownOf(c.s)[0] === c.P && c.s.panels().length === 1, '⛔ 스위치 끔인데 종전(같은 판 0초)이 아니다');
});

t("H8' — 판 안에서 온 openBook(⭐ → 「교재에서 보기」 · 판 안 링크)은 bookSwap 0 · 새 판 + back · 같은 교재 줄이면 앞 판에 줄(종전) · 판을 갈아 끼우면 그 판을 back 으로 든 판의 back 을 비운다", () => {
  const { s, P, bi } = boardRun({ views: 'cards,line' });
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  s.send({ onf: 'openBook', href: SM }, bi);
  const M = shownOf(s)[0], mi = swapKnock(s, M, 2, false, 'review');
  assert.ok(M !== P && swapMsg(bi).length === 0, '⛔ 판 안 openBook(내 문장)이 판을 갈아 끼웠다');
  s.send({ onf: 'openBook', href: SE('e1', '&line=9') }, mi);
  assert.ok(shownOf(s)[0] === P && viewMsg(bi).length === 1 && viewMsg(bi)[0].line === 9 && swapMsg(bi).length === 0, '⛔ 내 문장 「교재에서 보기」(같은 교재 줄)가 앞 판 0초 줄 점프가 아니다(갈래 표 4 #6)');
  s.send({ onf: 'openBook', href: SM }, bi);
  s.send({ onf: 'openBook', href: SE('e3', '&line=2') }, mi);
  const Q = shownOf(s)[0];
  assert.ok(Q !== P && Q !== M && swapMsg(bi).length === 0 && s.panels().length === 3, '⛔ 내 문장 「교재에서 보기」(다른 교재)가 새 판이 아니다(갈아 끼웠다)');
  s.send({ onf: 'bookClose' }, swapKnock(s, Q, 3));
  assert.ok(shownOf(s)[0] === M, '⛔ 새 판의 ✕ 가 앞 판(내 문장) 0초가 아니다');
  assert.strictEqual(s.obj(M).back, s.obj(P), '전제: 내 문장 판의 back = P');
  s.send({ onf: 'openBook', href: SE('e5'), left: 270 }, s.homeInner);   // 홈에서 E5 → 판 P 갈아 끼움
  assert.ok(swapMsg(bi).length === 1 && shownOf(s)[0] === P, '전제: P 를 E5 로');
  assert.strictEqual(s.obj(M).back, null, '⛔ 갈아 끼운 판을 back 으로 든 판(내 문장)의 back 이 남았다(✕ 가 엉뚱한 교재를 보인다)');
});

t("H8' 학생만 — 판(P)을 ⭐ 판 안 「교재에서 보기」(같은 교재 줄 · bookLike)로 보이면 back = ⭐(✕ = ⭐ 0초 · 종전)이지만 **판 자격은 그대로** — 다음 홈 [열기]는 갈아 끼움(새 판 아님 · 판 셋 넘침에 안 쫓겨남)", () => {
  const { s, P, bi } = boardRun({ views: 'cards,line' });
  s.send({ onf: 'openBook', href: SM, left: 270 }, s.homeInner);                 // ⭐ 를 홈에서(P 가 연 판이 아니다)
  const M = shownOf(s)[0], mi = swapKnock(s, M, 2, false, 'review');
  s.send({ onf: 'openBook', href: SE('e1', '&line=12') }, mi);                     // ⭐ 안 「교재에서 보기」 — 같은 교재 줄 → P 0초 줄 점프
  assert.ok(shownOf(s)[0] === P && viewMsg(bi).length === 1 && s.obj(P).back === s.obj(M), '전제: P 0초 · back = ⭐(종전 앞 판 규칙)');
  s.send({ onf: 'bookClose' }, bi);
  assert.ok(shownOf(s)[0] === M, '⛔ P 의 ✕ 가 ⭐ 0초가 아니다(종전 앞 판 규칙)');
  s.send({ onf: 'bookClose' }, mi);
  bi.sent.length = 0;
  s.send({ onf: 'openBook', href: SE('e5'), left: 270 }, s.homeInner);
  assert.ok(swapMsg(bi).length === 1 && s.panels().length === 2 && shownOf(s)[0] === P, '⛔ ⭐ 안에서 다시 보인 판이 판 자격을 잃었다 — 홈 [열기]가 새 판(판 셋 넘침에 판이 쫓겨난다 · 안 보낸 글)');
  s.send({ onf: 'bookSwapped', id: swapMsg(bi)[0].id, ok: true, from: 'cache' }, bi);
  assert.strictEqual(s.obj(P).back, null, '⛔ 홈에서 갈아 끼운 판에 back 이 남았다');
  //   판 안에서 처음 연 판(⭐ 안에서 연 다른 교재)은 그래도 판이 아니다
  s.send({ onf: 'openBook', href: SM, left: 270 }, s.homeInner);
  s.send({ onf: 'openBook', href: SE('e9') }, mi);
  const Q = shownOf(s)[0], qi = swapKnock(s, Q, 3);
  s.drop(P);
  s.send({ onf: 'openBook', href: SE('e8'), left: 270 }, s.homeInner);
  assert.ok(swapMsg(qi).length === 0, '⛔ 판 안에서 처음 연 판을 판으로 갈아 끼웠다');
});

t("H4' — 📱 폰: [열기] → bookSwap · 판 칸 push {onfBook:key(B)} · 뒤로 = 숨김 · 판이 없는 칸으로 돌아오면 판을 그 주소로(새 액자 아님) · 기록 칸에 토큰 없음", () => {
  const { s, P, bi } = boardRun({ phone: true });
  assert.ok(P.classList.contains('park') && s.H.i === 0, '전제: 폰 판 숨김 · 홈 칸');
  s.send({ onf: 'openBook', href: SE('e2') }, s.homeInner);
  assert.ok(swapMsg(bi).length === 1 && s.panels().length === 1 && !P.classList.contains('park'), '⛔ 폰 [열기]가 갈아 끼우지 않았다');
  const k2 = s.H.state.onfBook;
  assert.deepStrictEqual(s.H.state, { onfBook: k2, n: 0, bd: 1 }, '⛔ 판 칸 모양');
  assert.ok(k2 !== 1, '⛔ 갈아 끼운 판 칸이 key(E1) 그대로다(뒤로가 엉뚱한 판을 찾는다)');
  s.send({ onf: 'bookSwapped', id: swapMsg(bi)[0].id, ok: true, from: 'cache' }, bi);
  s.browserBack();
  assert.ok(P.classList.contains('park'), '⛔ 뒤로가 판을 안 숨겼다');
  bi.sent.length = 0;
  s.H.st = [{ state: null }, { state: { onfBook: 1, n: 0, bd: 1 } }, { state: { onfBook: k2, n: 0, bd: 1 } }]; s.H.i = 2;
  s.browserBack();
  assert.ok(swapMsg(bi).length === 1 && swapMsg(bi)[0].src === RS(SE('e1')) && s.panels().length === 1 && !P.classList.contains('park'), '⛔ 판이 없는 칸으로 돌아왔는데 판을 갈아 끼우지 않았다(새 액자)');
  assert.ok(!/TOK/.test(JSON.stringify(s.H.st)), '⛔ 기록 칸에 학생 토큰이 실렸다');
});

t("H7' — caps: 스위치 켜면 swap:1 · 꺼짐이면 칸 없음(종전 글자 그대로) · index.html: 주소 swap=1|0 을 이 기기에 기억(학생 키 onfSwap · 선생님 onfThSwap 아님) · 기본 끔 · perf 넘김", () => {
  const caps = (s) => { s.send({ onf: 'bookHello' }, s.homeInner); return js(s.homeInner.sent.find((x) => x[0].onf === 'caps')[0]); };
  assert.deepStrictEqual(caps(setup(null, { swap: true })), { onf: 'caps', book: 1, phone: 1, swap: 1 }, '⛔ 켰는데 caps 에 swap:1 이 없다');
  assert.deepStrictEqual(caps(setup()), { onf: 'caps', book: 1, phone: 1 }, '⛔ 끔인데 caps 글자가 종전과 다르다');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const run = (search, ls) => {
    const st = Object.assign({}, ls || {}), opts = {};
    const c = { URLSearchParams, location: { search, pathname: '/', href: 'https://class.ownify.co.kr/' + search }, navigator: { userAgent: 'x', platform: '', maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }), document: { getElementById: () => ({}), querySelector: () => null },
      localStorage: { getItem: (k) => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: (k) => { delete st[k]; } },
      ONF: { frame: { getToken: () => 'TOK', tokenFromPath: () => '', hideToken() {}, mount: (el, src, o) => Object.assign(opts, o) }, api: { appUrl: (t, e) => 'X?' + e } } };
    c.window = c;
    vm.createContext(c); vm.runInContext(html.slice(html.indexOf('var q = new URLSearchParams'), html.lastIndexOf('</script>')), c);
    return { opts, st };
  };
  let r = run('');
  assert.ok(r.opts.swap === false && !('onfSwap' in r.st), '⛔ 기본이 끔이 아니다');
  r = run('?swap=1');
  assert.ok(r.opts.swap === true && r.st.onfSwap === '1', '⛔ swap=1 을 안 켰다(또는 이 기기에 안 기억했다)');
  r = run('', { onfSwap: '1' });
  assert.strictEqual(r.opts.swap, true, '⛔ 기억한 켬을 안 따랐다');
  r = run('?swap=0', { onfSwap: '1' });
  assert.ok(r.opts.swap === false && r.st.onfSwap === '0', '⛔ swap=0 이 안 끈다');
  r = run('', { onfThSwap: '1' });
  assert.strictEqual(r.opts.swap, false, '⛔ 선생님 키(onfThSwap)를 봤다');
  assert.ok(run('?perf=1').opts.perf === true && run('').opts.perf === false, '⛔ perf=1 을 판 갈아 끼움 속도표로 안 넘긴다');
});

/* 노크 전 판 줄(선생님 1e 반박 검토 🟡 의 쌍둥이) — 학생 홈은 2초 뒤 [첫 교재 · ⭐ · 다음 회차 · 둘째 교재]를 bookWarm panel:1 로 한꺼번에 보낸다(Ownify ONF_Home_Html · caps.swap 일 때).
   그때 첫 교재 판은 아직 노크 전이다 → 다음 회차·둘째 교재는 숨긴 판을 띄우지 않고 줄에 섰다가 그 판이 swap:1 로 노크하면 bookFetch 로 흐른다(액자 둘 = 교재 판 · ⭐ 판). */
t("Q' — 학생 홈 미리 넷(첫 교재 · ⭐ · 다음 회차 · 둘째 교재) = 액자 둘(교재 판 · ⭐ 판) · 노크 전엔 줄 · swap:1 노크 = bookFetch 차례대로 한 번씩 · 첫 노크엔 안 흐름 · swap 없이 끝나면 안 흐름 · 판 셋 넘침이 후보를 안 지움", () => {
  const SX = 'https://script.ownify.co.kr/othershow-s2-e7-sunny?mode=share&t=TOK';
  const warm4 = (s) => [SE('e1'), SM, SE('e2', '&back=E1_X'), SX].forEach((h) => s.send({ onf: 'bookWarm', href: h, panel: 1, left: 184, m: 22, r: 28 }, s.homeInner));
  let s = setup(RS, { swap: true });
  warm4(s);
  assert.strictEqual(s.panels().length, 2, '⛔ 학생 홈 미리 넷이 액자 둘(교재 판 · ⭐ 판)이 아니다: ' + s.panels().length);
  const P0 = s.panels()[0], M = s.panels()[1];
  assert.ok(P0.kids[0].src === RS(SE('e1')) + '&park=1' && M.kids[0].src.indexOf('mode=mine') > 0, '전제: 교재 판 · ⭐ 판');
  const bi = kwin(s, P0, 1);
  s.send({ onf: 'bookHi', views: 'cards,line' }, bi);
  assert.strictEqual(fetchOf(bi).length, 0, '⛔ 첫 노크(swap 없음)에 줄을 흘렸다');
  s.send({ onf: 'bookHi', views: 'cards,line', swap: 1 }, bi);
  assert.deepStrictEqual(fetchOf(bi), [RS(SE('e2', '&back=E1_X')), RS(SX)], '⛔ 판이 된 교재 판에 다음 회차·둘째 교재가 bookFetch 로(차례대로) 안 갔다');
  assert.ok(js(bi.sent).every((x) => x[1] === O) && s.panels().length === 2, "⛔ '*'·남의 출처 · 또는 액자가 늘었다");
  bi.sent.length = 0;
  s.send({ onf: 'bookHi', views: 'cards,line', swap: 1 }, bi);
  assert.strictEqual(fetchOf(bi).length, 0, '⛔ 줄을 두 번 흘렸다');
  //   swap 없이 끝남(Lib 스위치 끔 · 옛 교재) — 숨긴 판으로 몰지 않는다
  s = setup(RS, { swap: true });
  warm4(s);
  s.send({ onf: 'bookHi', views: 'cards,line' }, kwin(s, s.panels()[0], 1));
  assert.strictEqual(s.panels().length, 2, '⛔ swap 없는 노크 뒤 줄을 숨긴 판으로 몰아 띄웠다');
  //   판 셋 넘침이 노크 전 후보(첫 교재 판)를 안 지운다 — 보이게 연 둘째·셋째
  s = setup(RS, { swap: true });
  warm4(s);
  s.send({ onf: 'openBook', href: SE('e8'), left: 270 }, s.homeInner);
  s.send({ onf: 'bookHi', views: 'line' }, kwin(s, shownOf(s)[0], 3));
  s.send({ onf: 'openBook', href: SE('e9'), left: 270 }, s.homeInner);
  assert.ok(s.panels().some((p) => p.kids[0].src === RS(SE('e1')) + '&park=1'), '⛔ 판 셋 넘침이 노크 전 교재 판(곧 판)을 지웠다');
});

t("판 자격 이어 받기 — 물러나 띄운 새 판·늙어서 새로 띄운 판은 노크하면 판(홈에서 연 판) · 판 안에서 연 노크 전 판은 노크 전 후보가 아니다(미리가 줄에 갇히지 않는다)", () => {
  let c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: false, why: 'busy' }, c.bi);
  const N = shownOf(c.s)[0], ni = swapKnock(c.s, N, 4);
  c.s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(ni).length === 1 && swapMsg(c.bi).length === 1, '⛔ 물러나 띄운 새 판(보임)이 판이 아니다 — 홈 [열기]가 숨긴 옛 판(busy 를 든 판)으로 갔다');
  c = boardRun();
  c.s.g.T += AGE;
  c.s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, c.s.homeInner);
  const A2 = shownOf(c.s)[0], ai = swapKnock(c.s, A2, 5);
  c.s.send({ onf: 'bookClose' }, ai);
  c.s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, c.s.homeInner);
  assert.ok(swapMsg(ai).length === 1 && c.s.panels().length === 2, '⛔ 늙어서 새로 띄운 판이 판이 아니다(다음 [열기]가 또 새 판)');
  //   📱 뒤로·앞으로(bookPop)로 늙은 판을 다시 보임 — 홈 말이 아니어도 새로 띄운 판이 판 자격을 이어 받는다
  const ph = boardRun({ phone: true });
  ph.s.g.T += AGE;
  ph.s.H.st = [{ state: null }, { state: { onfBook: 1, n: 0, bd: 1 } }, { state: null }]; ph.s.H.i = 2;
  ph.s.browserBack();
  const A3 = shownOf(ph.s)[0], a3 = swapKnock(ph.s, A3, 6);
  assert.ok(A3 !== ph.P && A3.kids[0].src === RS(SE('e1')), '전제: 늙은 판 대신 새 판');
  ph.s.send({ onf: 'openBook', href: SE('e3') }, ph.s.homeInner);
  assert.ok(swapMsg(a3).length === 1, '⛔ 뒤로로 새로 띄운 판(늙은 판 대신)이 판 자격을 못 이어 받았다');
  const s = setup(RS, { swap: true });
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  const A = s.panel(), ki = kwin(s, A, 1);
  s.send({ onf: 'bookHi', views: 'line' }, ki);                                   // swap 없는 판(옛 교재)
  s.send({ onf: 'openBook', href: SE('e2') }, ki);                                // 판 안에서 연 판 — 노크 전
  s.send({ onf: 'bookWarm', href: SE('e3'), panel: 1, left: 270 }, s.homeInner);
  assert.strictEqual(s.panels().length, 3, '⛔ 판 안에서 연 노크 전 판을 판 후보로 봤다(미리가 줄에 갇힌다)');
});

t("Q4' — ⛔ 스위치 끔이면 종전 글자 그대로: 미리 넷이 숨긴 판을 띄우며 셋 안에서 밀어낸다 · 판에 말 0 · 줄 0", () => {
  const SX = 'https://script.ownify.co.kr/othershow-s2-e7-sunny?mode=share&t=TOK';
  const s = setup(RS);
  [SE('e1'), SM, SE('e2'), SX].forEach((h) => s.send({ onf: 'bookWarm', href: h, panel: 1, left: 184 }, s.homeInner));
  assert.deepStrictEqual(s.panels().map((p) => p.kids[0].src), [SM, SE('e2'), SX].map((h) => RS(h) + '&park=1'), '⛔ 끔인데 종전(숨긴 판 셋 · 가장 오래 안 쓴 것부터 비킴)이 아니다');
  const bi = kwin(s, s.panels()[2], 1);
  s.send({ onf: 'bookHi', views: 'line', swap: 1 }, bi);
  assert.ok(s.panels().every((p) => p.classList.contains('park')) && fetchOf(bi).length === 0, '⛔ 끔인데 bookFetch 가 있다');
});

t("perf=1' — 갈아 끼움이 끝나면 홈에 bookPerf{ms, from} · 물러나면 from:new · perf 없으면 말 0", () => {
  let c = boardRun({ perf: true });
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.g.T += 120;
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache', ms: 30 }, c.bi);
  let pf = sentOf(c.s.homeInner).filter((m) => m.onf === 'bookPerf');
  assert.ok(pf.length === 1 && pf[0].from === 'cache' && pf[0].ms === 120, '⛔ perf=1 인데 홈에 bookPerf{from:cache, ms} 가 없다');
  c.s.send({ onf: 'bookClose' }, c.bi);
  c.s.send({ onf: 'openBook', href: SE('e3'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[1].id, ok: false, why: 'busy' }, c.bi);
  pf = sentOf(c.s.homeInner).filter((m) => m.onf === 'bookPerf');
  assert.ok(pf.length === 2 && pf[1].from === 'new' && pf[1].why === 'busy', '⛔ 물러남이 속도표에 안 남는다');
  c = boardRun();
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: true, from: 'cache' }, c.bi);
  assert.ok(!sentOf(c.s.homeInner).some((m) => m.onf === 'bookPerf'), '⛔ perf 없이 bookPerf 를 보냈다');
});


/* ═══ 2단계 반박 검토(2026-10-17) ═══ */
console.log('[📖 2단계 반박 — 늙은 판 · 폰 뒤로 · 2시간은 홈 판만 · 속도 말 · 줄 거름]');
t("🟠 늙은 판(2시간)을 다시 보이면 자격만 내린 옛 판은 판 셋 넘침이 **세지도 지우지도 않는다**(맺음이 끝날 때까지 남고 30분 지우기가 치운다)", () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'bookWarm', href: SM, panel: 1, left: 184 }, s.homeInner);
  const M = s.panels()[1], mi = swapKnock(s, M, 2, false, 'review');
  s.send({ onf: 'openBook', href: SM, left: 184 }, s.homeInner);
  s.send({ onf: 'openBook', href: SE('e7', '&line=3') }, mi);                     // ⭐ → 「교재에서 보기」(다른 교재 = 새 판 X)
  swapKnock(s, shownOf(s)[0], 3);
  s.send({ onf: 'bookDismiss' }, s.homeInner);
  assert.ok(s.panels().length === 3, '전제: 숨긴 판 셋(P · ⭐ · X)');
  s.g.T += 2.2 * 60 * 60 * 1000;
  s.send({ onf: 'openBook', href: SE('e2'), left: 184 }, s.homeInner);
  assert.ok(s.panels().includes(P) && P.parentNode && P.classList.contains('park') && s.obj(P).gone, '⛔ 자격 내린 늙은 판을 판 셋 넘침이 바로 지웠다(맺음 안 돎 → 안 보낸 칸·실패 카드 잃음)');
  const X = s.panels().find((x) => /e7/.test(x.kids[0].src));
  assert.ok(s.panels().includes(M) && X && s.panels().length === 4, '⛔ 자격 내린 판을 판 셋에 셌다 — 멀쩡한 숨긴 판(⭐·X)이 밀려났다');
  const N = shownOf(s)[0], ni = swapKnock(s, N, 4);
  s.send({ onf: 'openBook', href: SE('e9') }, ni);                                // 판 안 링크 → 넷째 → 가장 오래 안 쓴 「멀쩡한」 숨긴 판을 비킨다
  assert.ok(s.panels().includes(P) && s.panels().filter((x) => !s.obj(x).gone).length === 3, '⛔ 판 셋 넘침이 자격 내린 판(가장 오래된 숨긴 판)을 지웠다 — 맺음 전이다');
  T30(s).forEach((x) => { x.on = false; x.f(); });
  assert.ok(!s.panels().includes(P), '⛔ 30분 뒤에도 자격 내린 판이 남았다');
});
t("🟡 📱 폰 뒤로로 판을 갈아 끼울 때 판이 늙었으면(새 판으로 바뀜) 고아 액자가 안 생긴다 — 판 목록 밖 DOM 판 0 · 보이는 판 하나", () => {
  const { s, P, bi } = boardRun({ phone: true });
  s.send({ onf: 'openBook', href: SE('e1') }, s.homeInner);
  s.send({ onf: 'openBook', href: SE('e2') }, bi);
  const q = shownOf(s)[0], qi = swapKnock(s, q, 2);
  s.send({ onf: 'openBook', href: SE('e3') }, qi);
  swapKnock(s, shownOf(s)[0], 3);
  s.g.T += 2.5 * 60 * 60 * 1000;
  s.browserBack();
  const bs = s.panels().filter((x) => !s.obj(x));
  assert.strictEqual(bs.length, 0, '⛔ 판 목록 밖에 남은 액자(고아)가 있다');
  assert.ok(shownOf(s).length === 1 && shownOf(s)[0] !== P && shownOf(s)[0].kids[0].src === RS(SE('e2')), '⛔ 보이는 판이 그 칸 주소(E2) 새 판 하나가 아니다');
});
t("🟡 2시간 규칙은 홈에서 연 판만 — 판 안에서 연 교재 판(swap 노크 · 홈 아님)은 늙어도 종전(그대로 0초)", () => {
  const { s, P, bi } = boardRun();
  s.send({ onf: 'openBook', href: SE('e1'), left: 270 }, s.homeInner);
  s.send({ onf: 'openBook', href: SE('e2') }, bi);
  const Q = shownOf(s)[0], qi = swapKnock(s, Q, 2);
  s.send({ onf: 'bookClose' }, qi);                                              // ✕ = 앞 판 P
  s.g.T += AGE;
  s.send({ onf: 'openBook', href: SE('e2') }, bi);                               // P 안 링크 → Q(숨김 · 늙음) 다시
  assert.ok(shownOf(s)[0] === Q && s.panels().length === 2, '⛔ 홈 판이 아닌 교재 판을 나이로 갈았다(종전 0초가 아니다)');
});
t("🟡 속도 말(bookPerf)에는 주소·토큰이 없다 — {onf, ms, from, why} 뿐 · 줄 흘리기는 이미 판(액자)이 든 주소를 bookFetch 로 안 보낸다", () => {
  const c = boardRun({ perf: true });
  c.s.send({ onf: 'openBook', href: SE('e2'), left: 270 }, c.s.homeInner);
  c.s.send({ onf: 'bookSwapped', id: swapMsg(c.bi)[0].id, ok: false, why: 'busy' }, c.bi);
  const pf = js(c.s.homeInner.sent).filter((x) => x[0].onf === 'bookPerf');
  assert.ok(pf.length === 1 && pf.every((x) => JSON.stringify(Object.keys(x[0]).sort()) === JSON.stringify(['from', 'ms', 'onf', 'why']) && !/TOK|exec|script/.test(JSON.stringify(x[0]))), '⛔ 속도 말에 주소·토큰·모르는 칸이 실렸다: ' + JSON.stringify(pf));
  //   줄 — 노크 전 판 P0 · 줄에 E2·E3 · 그 사이 E2 를 [열기](새 판 · 판이 없다) → 노크 swap:1 = E3 만
  const s = setup(RS, { swap: true });
  s.send({ onf: 'bookWarm', href: SE('e1'), panel: 1, left: 184 }, s.homeInner);
  const P0 = s.panel();
  [SE('e2'), SE('e3')].forEach((h) => s.send({ onf: 'bookWarm', href: h, panel: 1, left: 184 }, s.homeInner));
  s.send({ onf: 'openBook', href: SE('e2'), left: 184 }, s.homeInner);
  const bi = kwin(s, P0, 1);
  s.send({ onf: 'bookHi', views: 'cards,line', swap: 1 }, bi);
  assert.deepStrictEqual(fetchOf(bi), [RS(SE('e3'))], '⛔ 이미 판이 든 주소(E2)를 줄에서 bookFetch 로 보냈다');
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
