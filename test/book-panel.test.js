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
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '',
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; } }; return el; };
  const top = win('shell');
  const g = { listeners, top };
  vm.createContext(g);
  g.window = g; g.URL = URL; g.localStorage = null; g.location = { search: '', pathname: '/', href: 'https://class.ownify.co.kr/' };
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
  s.send({ onf: 'bookClose' }, bookInner);
  assert.ok(!s.panel(), '⛔ 교재 액자의 bookClose 로 안 닫혔다(액자째 지운다)');
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
  assert.strictEqual(f('https://class.ownify.co.kr/?mode=mine&view=review'), null, '⛔ 내 문장 주소를 교재 판으로 연다');
  assert.strictEqual(f('https://evil.example.com/a-s1-e1-b?mode=share'), null, '⛔ 남의 사이트 주소를 연다');
  assert.strictEqual(f('javascript:alert(1)'), null, '⛔ javascript: 주소');
  assert.ok(!/LEAK/.test(String(f('https://script.ownify.co.kr/a-s1-e1-b?mode=share&t=LEAK&ttok=X&tas=Y'))), '⛔ 주소에 실려 온 토큰·선생님 자격을 넘긴다');
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
