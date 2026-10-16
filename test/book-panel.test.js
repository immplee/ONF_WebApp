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
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '', vars: {}, style: { setProperty(k, v) { el.vars[k] = v; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; }, getBoundingClientRect: () => ({ top: 0, bottom: 800 }) }; return el; };
  const top = win('shell');
  const timers = [];
  const g = { listeners, top, timers,
    setTimeout: (f, ms) => { timers.push({ f, ms, on: true }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].on = false; } };
  vm.createContext(g);
  g.window = g; g.URL = URL; g.localStorage = null; g.innerWidth = 1440; g.location = { search: '', pathname: '/', href: 'https://class.ownify.co.kr/' };
  g.navigator = { userAgent: 'node' }; g.history = { state: null, replaceState() {}, pushState() {} };
  const root = { attrs: {}, setAttribute(k, v) { root.attrs[k] = v; } };
  g.document = { addEventListener() {}, body, createElement: mkEl, documentElement: root };
  g.addEventListener = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); };
  if (o.pre) o.pre(g, root);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' });
  const homeWin = win('home-exec', top), homeInner = win('home-user', homeWin);
  const frameEl = { contentWindow: homeWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }) };
  const opened = [];
  g.ONF.frame.mount(frameEl, 'https://script.google.com/x/exec?t=T', { phone: o.phone !== false, bookSrc: bs || ((h) => { opened.push(h); const m = /-(e\d+)-/.exec(h);
    return /mode=share/.test(h) ? 'https://script.google.com/x/exec?t=T&mode=share' + (m && m[1] !== 'e1' ? '&ep=' + m[1] : '') + '&embed=1' : /mode=mine&v/.test(h) ? 'https://script.google.com/x/exec?t=T&mode=mine&embed=1' : null; }) });
  const send = (data, source, origin) => listeners.message.forEach((fn) => fn({ data, source, origin: origin || 'https://n-abc-0lu-script.googleusercontent.com' }));
  const panel = () => body.kids.find((k) => k.className === 'onf-bookpanel');
  const panels = () => body.kids.filter((k) => k.className === 'onf-bookpanel');
  return { g, listeners, body, homeInner, homeWin, send, panel, panels, opened, top, root, timers, frameEl };
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
    && /\.onf-bookpanel\.beside \{ left: calc\(var\(--bl\) \+ 16px\); width: auto; \}/.test(css)
    && /\.onf-bookpanel\.full \{ top: 0; right: 0; bottom: 0; left: 0; width: auto; padding: 10px;[^}]*background: var\(--onf-frame\); \}/.test(css) && /--onf-frame: #E9DFD0;/.test(css)   // 🌙 둘레 = 이름(밝은 값 그대로)
    && /\.onf-bookpanel\.full iframe \{ border-radius: 22px;/.test(css), '⛔ 판 모양(떠 있는 큰 판 · 메뉴 옆 · 전체 = 화면 끝까지 덮고 안은 둥근 판 — 뒤 홈이 안 보인다)');
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
  const s = setup(o.bs || null, { phone: o.phone, pre(g, root) {
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

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
