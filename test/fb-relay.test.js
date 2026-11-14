/* 🎧 발음 피드백 중계(Ownify 2026-11-06 2단계) — teacher/index.html 의 hwFbClean·hwFbRelay·hwFbSync·hwFbBack 만 떼어 돌린다.
   잰다: ① 과제 판 hwFb → 옆 교재 fbBook(꼴 거름 · 남는 칸 없음 · 글 길이 자름) ② 교재가 늦게 노크하면 마지막 목록을 다시(댓글은 다시 안 보냄)
        ③ 옆 교재가 없으면 댓글은 과제 판에 바로 「nobook」 ④ 교재 → 과제 판 fbPick·fbFocus·fbCmtAck 만 · 그 출처로 ⑤ 받는 자리 = 교재 액자 길(bookFrom 뒤) · 과제 판 허용 목록에 hwFb
   실행: node test/fb-relay.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const A = src.indexOf('var hwFbLast = null;'), B = src.indexOf('/* 과제 판 전용 교재 액자가 하는 말');
assert.ok(A > 0 && B > A, '구간을 못 찾음');
let pass = 0, fail = 0; const t = (n, f) => { try { f(); console.log('  ✅ ' + n); pass++; } catch (e) { console.log('  ❌ ' + n + '\n     ' + e.message); fail++; } };
const win = () => { const w = { sent: [] }; w.postMessage = (m, o) => w.sent.push([m, o]); return w; };
function run() { const ctx = { hwBk: null, hwWin: win(), hwOrigin: 'https://board.example', appWin: null, appOrigin: '' }; vm.createContext(ctx); vm.runInContext(src.slice(A, B), ctx); return ctx; }
t('① 과제 판 목록 → 옆 교재(꼴 거름 · 그 출처로)', () => {
  const c = run(); c.hwBk = { win: win(), origin: 'https://book.example' };
  c.hwFbRelay({ onf: 'hwFb', on: 1, draw: 1, items: [{ id: 'abc', n: 2, row: '15', w0: 3, w1: 4, ipa: 'x'.repeat(500), sent: 0, sheet: 'E1', st: 'M', lv: 7, sel: 1, evil: '<script>' }, { id: 'abd', st: '<b>', lv: 0 }], junk: 1 });
  const [m, o] = c.hwBk.win.sent[0];
  assert.strictEqual(o, 'https://book.example');
  assert.deepStrictEqual(Object.keys(m).sort(), ['draw', 'items', 'on', 'onf']); assert.strictEqual(m.draw, 1);
  assert.strictEqual(m.onf, 'fbBook'); assert.strictEqual(m.on, 1);
  assert.deepStrictEqual(Object.keys(m.items[0]).sort(), ['id', 'ipa', 'lv', 'n', 'row', 'sel', 'sent', 'sheet', 'st', 'w0', 'w1']);
  assert.deepStrictEqual([m.items[0].st, m.items[0].lv, m.items[0].sel, m.items[1].st, m.items[1].lv], ['M', 3, 1, 'R', 1], '⛔ 단계 색·진하기·고른 곳이 옆 교재로 안 간다(또는 거르지 않는다)');
  assert.strictEqual(m.items[0].row, 15); assert.strictEqual(m.items[0].ipa.length, 200);
});
t('①-2 카드 누름 → 옆 교재 그 대사 · 체크한 낱말 범위(w0·w1)까지', () => {
  const c = run(); c.hwBk = { win: win(), origin: 'https://book.example' };
  c.hwFbRelay({ onf: 'hwFb', go: { row: 9, sheet: 'E1', w0: 2, w1: 5, x: 1 } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.hwBk.win.sent[0][0])), { onf: 'fbBook', go: { row: 9, sheet: 'E1', w0: 2, w1: 5 } });
});
t('② 교재가 늦게 노크 → 마지막 목록만 다시(댓글은 다시 안 보냄)', () => {
  const c = run(); c.hwBk = { win: win(), origin: 'https://book.example' };
  c.hwFbRelay({ on: 1, items: [], cmt: [{ id: 'k1', row: 3, sheet: 'E1', text: '💬' }] });
  assert.ok(c.hwBk.win.sent[0][0].cmt.length === 1);
  c.hwBk.win = win(); c.hwFbSync();
  assert.strictEqual(c.hwBk.win.sent.length, 1); assert.strictEqual(c.hwBk.win.sent[0][0].cmt, undefined, '⛔ 다시 노크할 때마다 댓글이 또 달린다');
});
t('③ 옆 교재가 없으면 댓글은 과제 판에 바로 nobook', () => {
  const c = run(); c.hwFbRelay({ on: 1, items: [], cmt: [{ id: 'k1', row: 3, sheet: 'E1', text: 'x' }] });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.hwWin.sent.map((x) => x[0]))), [{ onf: 'fbCmtAck', id: 'k1', ok: 0, why: 'nobook' }]);
});
t('④ 교재 → 과제 판: 세 가지만 · 꼴 거름 · 과제 판 출처로', () => {
  const c = run();
  c.hwFbBack({ onf: 'fbPick', row: 7, w0: 1, w1: 2, text: 'show', ipa: 'ʃoʊ', sheet: 'E1', extra: 1 });
  c.hwFbBack({ onf: 'fbFocus', id: 'abc' }); c.hwFbBack({ onf: 'fbCmtAck', id: 'abc', ok: true }); c.hwFbBack({ onf: 'hwbook', x: 1 });
  assert.deepStrictEqual(c.hwWin.sent.map((x) => x[0].onf), ['fbPick', 'fbFocus', 'fbCmtAck']);
  assert.ok(c.hwWin.sent.every((x) => x[1] === 'https://board.example'));
  assert.deepStrictEqual(Object.keys(c.hwWin.sent[0][0]).sort(), ['ipa', 'onf', 'row', 'sheet', 'text', 'w0', 'w1']);
});
t('⑥ 카드 → 그 줄로(go): 줄·회차만 옆 교재에 · 목록(켜짐·항목)은 그대로', () => {
  const c = run(); c.hwBk = { win: win(), origin: 'https://book.example' };
  c.hwFbRelay({ onf: 'hwFb', on: 1, items: [{ id: 'abc', n: 1, row: 5, w0: 0, w1: 0, sheet: 'E1' }] });
  c.hwFbRelay({ onf: 'hwFb', go: { row: '15', sheet: 'E1', evil: 1 } });
  const [m, o] = c.hwBk.win.sent[1];
  assert.strictEqual(o, 'https://book.example');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(m)), { onf: 'fbBook', go: { row: 15, sheet: 'E1', w0: 0, w1: 0 } }, '⛔ go 가 「꺼짐 + 빈 목록」으로 바뀌었다');
  c.hwBk.win = win(); c.hwFbSync();
  assert.strictEqual(c.hwBk.win.sent[0][0].on, 1, '⛔ go 가 마지막 목록을 꺼짐으로 덮었다'); assert.strictEqual(c.hwBk.win.sent[0][0].items.length, 1);
});
t('⑧ 지금 대사(now · 2026-11-13): 옆 교재에만 · 꼴 거름 · 목록(켜짐·항목)은 그대로 · 0 = 없음 · 교재 → 과제 판 낱말 글자(fbWords) 거름', () => {
  const c = run(); c.hwBk = { win: win(), origin: 'https://book.example' };
  c.hwFbRelay({ onf: 'hwFb', on: 1, items: [{ id: 'abc', n: 1, row: 5, w0: 0, w1: 0, sheet: 'E1' }] });
  c.hwFbRelay({ onf: 'hwFb', now: { r: '33', k: 4, f: true, w: [2, '3', 9], evil: 1 } }); c.hwFbRelay({ onf: 'hwFb', now: { r: 33, k: 4, f: 0, w: [1, 2] } }); c.hwFbRelay({ onf: 'hwFb', now: 0 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.hwBk.win.sent.slice(1).map((x) => x[0]))), [{ onf: 'fbBook', now: { r: 33, k: 4, f: 1, w: null } }, { onf: 'fbBook', now: { r: 33, k: 4, f: 0, w: [1, 2] } }, { onf: 'fbBook', now: 0 }]);
  c.hwBk.win = win(); c.hwFbSync();
  assert.strictEqual(c.hwBk.win.sent[0][0].on, 1, '⛔ now 가 마지막 목록을 덮었다'); assert.strictEqual(c.hwBk.win.sent[0][0].items.length, 1);
  c.hwFbBack({ onf: 'fbWords', k: '4', ws: ['I', 'x'.repeat(99), 3].concat(Array(100).fill('a')), evil: 1 });
  const m = c.hwWin.sent.slice(-1)[0][0]; assert.deepStrictEqual(Object.keys(m).sort(), ['k', 'onf', 'ws']); assert.strictEqual(m.k, 4); assert.strictEqual(m.ws.length, 80); assert.strictEqual(m.ws[1].length, 40); assert.strictEqual(m.ws[2], '3');
});
t('⑦ 지난 수업 자료 열기: 꼴 맞으면 그 수업을 열고 · 그 수업 자료가 물을 때 한 번만 범위를 준다 · 다른 수업·2분 넘음·꼴 틀림 = 안 줌', () => {
  const L = '0123abcd-0000-4000-8000-00000000000a', opened = [];
  const c = run(); c.hwT = 'TOKSTU'; c.hwOpen = (t, l, f, hwt) => { opened.push([t, l]); c.hwL = l; c.lastOpen = { f, hwt }; };
  c.hwLessonGo({ onf: 'hwbookLesson', l: 'nope', fb: { from: '2026-11-04', to: '2026-11-11' } });
  c.hwLessonGo({ onf: 'hwbookLesson', l: L, fb: { from: '2026-11-4', to: '2026-11-11' } });
  assert.strictEqual(opened.length, 0, '⛔ 꼴이 틀린 말로 수업 자료를 열었다');
  c.appWin = win(); c.appOrigin = 'https://home.example';
  c.hwLessonGo({ onf: 'hwbookLesson', l: L, fb: { from: '2026-11-04', to: '2026-11-11', evil: 1 } });
  assert.deepStrictEqual(opened, [['TOKSTU', L]]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.appWin.sent)), [[{ onf: 'hwOpened', t: 'TOKSTU', l: L }, 'https://home.example']], '⛔ 바뀐 수업 판을 홈에 안 알렸다(새로 고침 뒤 판이 사라진다 · Ownify onfThHw)');
  c.hwLessonGo({ onf: 'hwbookLesson', l: L, fb: { from: '2026-11-04', to: '2026-11-11' }, hwt: { p: '{"s":"x"}', sig: 'S'.repeat(43) } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.lastOpen)), { f: [], hwt: { p: '{"s":"x"}', sig: 'S'.repeat(43) } }, '⛔ 입장권·빈 사진 목록을 안 넘겼다 — 그 수업 자료가 구글로 늦게 열린다');
  c.hwWin = win(); c.hwOrigin = 'https://board.example';
  c.hwFbAskAns(); c.hwFbAskAns();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.hwWin.sent)), [[{ onf: 'hwFbAuto', from: '2026-11-04', to: '2026-11-11' }, 'https://board.example']], '⛔ 한 번만 · 그 출처로');
  c.hwLessonGo({ onf: 'hwbookLesson', l: L, fb: { from: '2026-11-04', to: '2026-11-11' } }); c.hwL = 'other'; c.hwWin = win(); c.hwFbAskAns();
  assert.strictEqual(c.hwWin.sent.length, 0, '⛔ 다른 수업 자료에 범위를 줬다');
  c.hwLessonGo({ onf: 'hwbookLesson', l: L, fb: { from: '2026-11-04', to: '2026-11-11' } }); c.hwFbNext.at -= 121000; c.hwWin = win(); c.hwFbAskAns();
  assert.strictEqual(c.hwWin.sent.length, 0, '⛔ 2분 넘은 것을 줬다');
  assert.match(src, /d\.onf !== 'hwbookLesson' && d\.onf !== 'hwFbAsk' &&/, '⛔ 수업 자료 말 허용 목록에 없다');
  //   판을 닫으면 범위도 버린다 — 진짜 hwOpen 은 안에서 hwClose(= 범위 지움)를 부르니 범위는 연 뒤에 적어야 한다
  const c2 = run(); c2.hwT = 'TOKSTU'; c2.hwOpen = (t, l) => { c2.hwFbNext = null; c2.hwL = l; };
  c2.hwLessonGo({ onf: 'hwbookLesson', l: L, fb: { from: '2026-11-04', to: '2026-11-11' } });
  assert.ok(c2.hwFbNext && c2.hwFbNext.l === L, '⛔ 범위를 연 뒤에 안 적었다 — hwOpen 안 hwClose 가 지워 시작 창이 안 뜬다');
  assert.match(src, /function hwClose\(\) \{\n  hwFbNext = null;/, '⛔ 판을 닫아도 범위가 남는다(2분 안 같은 수업을 다시 열면 시작 창이 저절로)');
});
t('⑤ 받는 자리 — 과제 판 허용 목록에 hwFb · 교재 말은 bookFrom 걸러진 길 안', () => {
  assert.match(src, /d\.onf !== 'hwPen' && d\.onf !== 'hwFb' &&/);
  const i = src.indexOf("if (d.onf === 'fbPick' || d.onf === 'fbFocus' || d.onf === 'fbCmtAck' || d.onf === 'fbWords') { hwFbBack(d); return; }"), g = src.lastIndexOf('if (!d || !hwBk || !bookFrom(ev, hwBk.el, true)) return;', i);
  assert.ok(i > 0 && g > 0 && i - g < 1500, '⛔ 교재 말을 출처 확인 없이 받는다');
});
console.log(`fb-relay: ${pass} 통과${fail ? ' · ' + fail + ' 실패' : ''}`); process.exitCode = fail ? 1 : 0;
