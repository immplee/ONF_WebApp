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
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
const ORIGIN = 'https://n-abc-script.googleusercontent.com';
const EXEC = 'https://script.google.com/macros/s/BOOKAPP/exec';
function win(name, parent) { const w = { name, sent: [] }; w.parent = parent || w; w.postMessage = (m, o) => w.sent.push([m, o]); return w; }

function run() {
  const L = {};
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = () => { const el = { kids: [], attrs: {}, className: '', src: '', vars: {}, innerHTML: '',
    style: { setProperty(k, v) { el.vars[k] = v; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; } }; return el; };
  const top = win('shell');
  const homeExec = win('home-exec', top), home = win('home-user', win('home-sbx', homeExec));
  const frame = { contentWindow: homeExec };
  const g = { URL, top, frame, innerWidth: 1440, location: { href: 'https://class.ownify.co.kr/teacher/' },
    document: { body, createElement: mkEl }, ONF: { api: { EXEC } },
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); } };
  g.window = g;
  vm.createContext(g);
  vm.runInContext(src.slice(A, B), g, { filename: 'teacher-book' });
  const send = (data, source, origin) => (L.message || []).forEach((f) => f({ data, source, origin: origin || ORIGIN }));
  const panel = () => body.kids.find((k) => k.className === 'onf-bookpanel');
  return { g, L, home, top, send, panel };
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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.home.sent)), [[{ onf: 'caps', book: 1 }, ORIGIN]], '⛔ caps 가 없거나 * 로 갔다');
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

t('판 액자 — 전체 화면 · 닫기(홈에 bookClosed 한 번) · 판 안 openBook 은 판만 갈아 끼움 · 홈 액자가 보낸 bookClose 는 버린다', () => {
  const s = run();
  s.send({ onf: 'openBook', href: TURL, left: 184 }, s.home);
  const p = s.panel(), bookWin = win('book-exec', s.top), inner = win('book-user', bookWin);
  p.kids[0].contentWindow = bookWin;
  s.send({ onf: 'bookFull', on: true }, inner);
  assert.ok(p.classList.contains('full'), '⛔ 전체 화면이 안 된다');
  s.send({ onf: 'openBook', href: 'https://class.ownify.co.kr/?mode=mine&t=STUTOK&ttok=M&tas=Peter' }, inner);
  assert.ok(s.panel() === p && /mode=mine/.test(p.kids[0].src) && p.classList.contains('beside'), '⛔ 판 안에서 내 문장으로 안 갈아 끼웠다(또는 자리가 바뀌었다)');
  s.send({ onf: 'bookClose' }, s.home);
  assert.ok(s.panel(), '⛔ 홈 액자의 bookClose 로 닫혔다');
  s.home.sent.length = 0;
  s.send({ onf: 'bookClose' }, inner);
  assert.ok(!s.panel(), '⛔ 판 액자의 bookClose 로 안 닫혔다');
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

t('⛔ 판 블록에 unload 처리기가 없다(bfcache)', () => {
  assert.ok(!/addEventListener\(\s*['"](?:before)?unload['"]|onunload\s*=/.test(src.slice(A, B)));
  assert.ok(/<script src="\.\.\/assets\/onf-api\.js"><\/script>/.test(src), '⛔ 교재 앱 주소(onf-api.js)를 안 싣는다');
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
