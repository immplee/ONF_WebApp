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

function setup() {
  const listeners = {};
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '', vars: {}, style: { setProperty(k, v) { el.vars[k] = v; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; } }; return el; };
  const top = win('shell');
  const g = { listeners, top };
  vm.createContext(g);
  g.window = g; g.URL = URL; g.localStorage = null; g.innerWidth = 1440; g.location = { search: '', pathname: '/', href: 'https://class.ownify.co.kr/' };
  g.navigator = { userAgent: 'node' }; g.history = { state: null, replaceState() {}, pushState() {} };
  g.document = { addEventListener() {}, body, createElement: mkEl };
  g.addEventListener = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' });
  const homeWin = win('home-exec', top), homeInner = win('home-user', homeWin);
  const frameEl = { contentWindow: homeWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }) };
  const opened = [];
  g.ONF.frame.mount(frameEl, 'https://script.google.com/x/exec?t=T', { bookSrc: (h) => { opened.push(h); return /mode=share/.test(h) ? 'https://script.google.com/x/exec?t=T&mode=share&embed=1' : null; } });
  const send = (data, source, origin) => listeners.message.forEach((fn) => fn({ data, source, origin: origin || 'https://n-abc-0lu-script.googleusercontent.com' }));
  const panel = () => body.kids.find((k) => k.className === 'onf-bookpanel');
  return { g, listeners, body, homeInner, homeWin, send, panel, opened, top };
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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.homeInner.sent)), [[{ onf: 'caps', book: 1 }, 'https://n-abc-0lu-script.googleusercontent.com']], '⛔ caps 가 없거나 * 로 갔다');
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

t('판 안에서 교재 ↔ 내 문장 — 교재 액자가 보낸 openBook 은 판만 갈아 끼운다 · 거르개(null)면 그대로 · 남의 출처는 버린다', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share' }, s.homeInner);
  const box = s.panel(), bookEl = box.kids[0];
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  bookEl.contentWindow = bookWin;
  bookEl.src = 'BEFORE';
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/?mode=mine' }, bookInner);
  assert.strictEqual(bookEl.src, 'BEFORE', '⛔ 거르개가 못 만든 주소(null)로 판을 바꿨다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner, 'https://evil.example.com');
  assert.strictEqual(bookEl.src, 'BEFORE', '⛔ 남의 출처의 openBook 으로 판을 바꿨다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner);
  assert.ok(s.panel() === box && bookEl.src === 'https://script.google.com/x/exec?t=T&mode=share&embed=1', '⛔ 판 안 openBook 으로 판이 안 바뀌었다(같은 판 · 새 주소)');
});

t('판 자리 — 홈이 알린 왼쪽 메뉴 끝(left)부터 덮는다 · 남의 값(0·음수·화면 60% 넘음·숫자 아님)은 종전 자리 · 판 안 갈아 끼우기는 자리 그대로 (2026-10-12 Peter)', () => {
  const s = setup();
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: 184 }, s.homeInner);
  const p = s.panel();
  assert.ok(p.classList.contains('beside') && p.vars['--bl'] === '184px', '⛔ 왼쪽 메뉴 끝부터 덮지 않는다');
  const bookWin = win('book-exec', s.top), bookInner = win('book-user', bookWin);
  p.kids[0].contentWindow = bookWin;
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e2-b?mode=share' }, bookInner);
  assert.ok(p.classList.contains('beside') && p.vars['--bl'] === '184px', '⛔ 판 안에서 갈아 끼우니 자리가 바뀌었다');
  for (const bad of [0, -5, 1000, '184', NaN]) {
    const s2 = setup();
    s2.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/a-s1-e1-b?mode=share', left: bad }, s2.homeInner);
    assert.ok(!s2.panel().classList.contains('beside') && !('--bl' in s2.panel().vars), '⛔ 믿지 못할 left 로 판 자리를 바꿨다: ' + String(bad));
  }
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
  assert.ok(/\.onf-bookpanel \{[^}]*top: 16px; right: 16px; bottom: 16px;[^}]*border-radius: 28px; overflow: hidden;/.test(css)
    && /\.onf-bookpanel\.beside \{ left: calc\(var\(--bl\) \+ 16px\); width: auto; \}/.test(css)
    && /\.onf-bookpanel\.full \{ top: 0; right: 0; bottom: 0; left: 0; width: auto; padding: 10px;[^}]*background: #E9DFD0; \}/.test(css)
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

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
