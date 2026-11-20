/* 📤 과제 판 「본 파일」 중계(Ownify 2026-11-20 Peter 「확인을 안 눌러도 보거나 듣고 피드백을 주면 자동 확인」) — teacher/index.html 의 hwSawRelay 를 떼어 돌린다.
   잰다: ① 아는 칸만(t·ids) · 홈 출처로 ② 꼴이 아닌 id·긴 토큰·51개째는 버림 ③ 홈이 없으면 안 보냄 ④ 판 말 받는 자리(hwFr 길)에 hwSaw 가 이 함수로 간다.
   실행: node test/hwsaw-relay.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const m = /^function hwSawRelay\(d\) \{[\s\S]*?\n\}\n/m.exec(src); assert.ok(m, 'hwSawRelay 를 못 찾음');
let pass = 0, fail = 0; const t = (n, f) => { try { f(); console.log('  ✅ ' + n); pass++; } catch (e) { console.log('  ❌ ' + n + '\n     ' + e.message); fail++; } };
const win = () => { const w = { sent: [] }; w.postMessage = (x, o) => w.sent.push([x, o]); return w; };
const run = (app) => { const c = { appWin: app, appOrigin: 'https://home.example' }; vm.createContext(c); vm.runInContext(m[0], c); return c; };
t('① 아는 칸만 · 홈 출처로', () => {
  const a = win(), c = run(a); c.hwSawRelay({ onf: 'hwSaw', t: 'TOK1', ids: ['1AbCdEfGhIjK_-9'], evil: 1 });
  assert.strictEqual(a.sent.length, 1); assert.strictEqual(a.sent[0][1], 'https://home.example');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a.sent[0][0])), { onf: 'hwSaw', t: 'TOK1', ids: ['1AbCdEfGhIjK_-9'] });
});
t('② 꼴이 아닌 id · 긴 토큰 · 51개째 버림', () => {
  const a = win(), c = run(a), many = Array.from({ length: 60 }, (_, i) => 'FILEID' + String(i).padStart(6, '0'));
  c.hwSawRelay({ t: 'TOK', ids: ['short', '<script>alert(1)</script>', 7].concat(many) });
  assert.strictEqual(a.sent[0][0].ids.length, 50); assert.ok(a.sent[0][0].ids.every((x) => /^FILEID/.test(x)));
  c.hwSawRelay({ t: 'x'.repeat(201), ids: many }); c.hwSawRelay({ t: 'TOK', ids: ['bad'] }); c.hwSawRelay({ t: 'TOK', ids: 'FILEID000001' });
  assert.strictEqual(a.sent.length, 1, '⛔ 꼴이 아닌 말도 홈에 넘긴다');
});
t('③ 홈이 없으면 안 보냄', () => { const c = run(null); c.hwSawRelay({ t: 'TOK', ids: ['FILEID000001'] }); });
t('④ 판 말 받는 자리에 hwSaw → hwSawRelay(과제 판 액자 길 안 · hwFbAsk 옆)', () => {
  const i = src.indexOf("if (d.onf === 'hwSaw') { hwSawRelay(d); return; }"), j = src.indexOf("if (d.onf === 'hwFbAsk') { hwFbAskAns(); return; }");
  assert.ok(i > 0 && j > 0 && Math.abs(i - j) < 300, '⛔ 과제 판 말 받는 자리에 hwSaw 손이 없다');
});
console.log(fail ? fail + '개 실패' : '모두 통과 ' + pass); process.exitCode = fail ? 1 : 0;
