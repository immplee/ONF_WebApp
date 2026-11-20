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
t('③-2 토큰 없는 말(교재만 판) = ids 만 넘김 · 숨긴 판은 안 넘김 · 교재 판 손 자리', () => {
  const a = win(), c = run(a); c.hwSawRelay({ ids: ['FILEID000009'] });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a.sent[0][0])), { onf: 'hwSaw', ids: ['FILEID000009'] });
  const k = src.indexOf("if (d.onf === 'hwSaw') { hwSawRelay({ ids: d.ids }); return; }"), pk = src.indexOf('if (p.parked) return;'), pf = src.indexOf("for (i = 0; i < books.length && !p; i++) if (bookFrom(ev, books[i].el, true)) p = books[i];");
  assert.ok(pf > 0 && pk > pf && k > pk, '⛔ 교재 판 손에 hwSaw 가 없거나 숨긴 판(parked)도 넘긴다');
});
t('③ 홈이 없으면 안 보냄', () => { const c = run(null); c.hwSawRelay({ t: 'TOK', ids: ['FILEID000001'] }); });
t('④ 판 말 받는 손의 문(맨 위 거르기)에 hwSaw 가 있고 · 그 손이 다루는 말은 전부 문 목록에 있다(문에 빠지면 아래 손은 죽은 코드 — 2026-11-20 hwSaw 가 그랬다)', () => {
  const k = src.indexOf("if (d.onf === 'hwSaw') { hwSawRelay(d); return; }"); assert.ok(k > 0, '⛔ hwSaw 손이 없다');
  const a = src.lastIndexOf("window.addEventListener('message', function (ev) {", k), b = src.indexOf('\n});\n', k); assert.ok(a > 0 && b > k);
  const L = src.slice(a, b), gate = /\n  if \(!d \|\| \(([^\n]*?)\)\) return;/.exec(L); assert.ok(gate, '이 손의 문을 못 찾음');
  const allow = new Set([...gate[1].matchAll(/d\.onf !== '(\w+)'/g)].map((m) => m[1]));
  const used = new Set([...L.slice(gate.index + gate[0].length).matchAll(/d\.onf === '(\w+)'/g)].map((m) => m[1]));
  assert.ok(allow.has('hwSaw'), '⛔ 문 목록에 hwSaw 가 없다 — 과제 판이 보낸 「본 파일」을 껍데기가 버린다');
  const miss = [...used].filter((n) => !allow.has(n)); assert.deepStrictEqual(miss, [], '⛔ 이 손이 다루는데 문에서 버리는 말: ' + miss.join(', '));
});
t('⑤ 진짜 손으로 — 과제 판 액자에서 온 hwSaw 가 홈까지 간다(문 → 액자 출처 → hwSawRelay)', () => {
  const k = src.indexOf("if (d.onf === 'hwSaw') { hwSawRelay(d); return; }"), a = src.lastIndexOf("window.addEventListener('message', function (ev) {", k), b = src.indexOf('\n});\n', k) + 4;
  const app = win(), fr = { contentWindow: {} }, c = { appWin: app, appOrigin: 'https://home.example', hwFr: fr, hwOut: { org: 'https://board.example' }, hwFrom: (w) => w === fr.contentWindow, hwWin: null, hwOrigin: '', L: null };
  c.window = { addEventListener: (n, f) => { if (n === 'message' && !c.L) c.L = f; } };
  vm.createContext(c); vm.runInContext(m[0] + src.slice(a, b), c);
  c.L({ data: { onf: 'hwSaw', t: 'TOK', ids: ['FILEID000001'] }, source: fr.contentWindow, origin: 'https://board.example' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(app.sent.map((x) => x[0]))), [{ onf: 'hwSaw', t: 'TOK', ids: ['FILEID000001'] }], '⛔ 과제 판의 hwSaw 가 홈에 안 닿는다');
  c.L({ data: { onf: 'hwSaw', t: 'TOK', ids: ['FILEID000002'] }, source: {}, origin: 'https://evil.example' });
  assert.strictEqual(app.sent.length, 1, '⛔ 과제 판 액자가 아닌 창의 hwSaw 도 넘긴다');
});
console.log(fail ? fail + '개 실패' : '모두 통과 ' + pass); process.exitCode = fail ? 1 : 0;
