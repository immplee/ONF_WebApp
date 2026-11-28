// 🛟 판 안쪽 칸 하나 걷기가 판 칸까지 넘어감(Peter 2026-11-28 아이패드 「준비 모드 들어가니까 홈으로 한 번 나가졌다」) — 선생님·학생 껍데기 bkOverCatch 쌍둥이.
//   넘어감(판 안쪽 칸 bd3 를 걷었는데 판 칸 bd1·홈에 내려앉음) = 판 그대로 + 판 칸·물음 칸 다시 + clog bkover · 제대로 내려앉음(bd2)·1.5초 넘음·다른 판 = 손대지 않음
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0; const t = (n, f) => { try { f(); console.log('  ✅ ' + n); pass++; } catch (e) { console.log('  ❌ ' + n + '\n     ' + e.message); fail++; } };
function cut(src) {
  const a = src.indexOf('var bkOver = null;'), b = src.indexOf('return true;\n', a);
  assert.ok(a > 0 && b > a, '⛔ bkOverCatch 를 못 찾았다');
  return src.slice(a, src.indexOf('}', b) + 1);
}
function run(file, beacon) {
  const code = cut(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
  const g = { now: 1000, sent: [], pushed: [], posted: [], shown: { key: 1, hw: { postMessage: (m) => g.posted.push(m) }, ho: 'o' } };
  const ctx = {
    Date: { now: () => g.now }, JSON, navigator: { sendBeacon: (u, b) => g.sent.push(JSON.parse(b)[0]) }, window: { ONF: { frame: { WORKER: 'https://w' } } }, ONF: { frame: { WORKER: 'https://w' } },
    bookOwner: (s) => (s && (s.onfBook || s.b)) || 0, bookShown: () => g.shown, histBook: () => g.pushed.push('book'), histGuard: () => g.pushed.push('lg'),
    tbkDev: () => 'ipad', whoBeacon: (r) => g.sent.push(r),
  };
  vm.createContext(ctx); vm.runInContext(code + '\n;this.arm = bkOverArm; this.cat = bkOverCatch;', ctx);
  return { g, arm: ctx.arm, cat: ctx.cat };
}
for (const f of ['teacher/index.html', 'assets/onf-frame.js']) {
  t(f + ' — 판 안쪽 칸(bd3) 걷기가 판 칸(bd1)까지 넘어감 = 판 그대로 · 칸 다시 · clog bkover', () => {
    const R = run(f); R.arm({ onfHist: 'h1', b: 1, bd: 3 }); R.g.now += 300;
    assert.strictEqual(R.cat({ onfBook: 1, bd: 1 }), true, '⛔ 넘어감을 못 잡았다(판을 숨긴다)');
    assert.strictEqual(JSON.stringify(R.g.pushed), '["book","lg"]', '⛔ 판 칸·물음 칸을 다시 안 쌓았다');
    assert.ok(R.g.sent.length === 1 && /^bkover bk 1\/2$/.test(R.g.sent[0].c), '⛔ clog 줄: ' + JSON.stringify(R.g.sent));
    assert.strictEqual(JSON.stringify(R.g.posted), '[{"onf":"hist-pop","id":"","s":null}]', '⛔ 판 안쪽에 칸이 다 빠졌다고 안 알렸다');
  });
  t(f + ' — 홈까지 넘어감(state null)도 잡는다', () => {
    const R = run(f); R.arm({ onfHist: 'h1', b: 1, bd: 3 });
    assert.strictEqual(R.cat(null), true); assert.ok(/^bkover 0 0\/2$/.test(R.g.sent[0].c));
  });
  t(f + ' — 제대로 내려앉음(물음 칸 bd2)·1.5초 넘음·다른 판·안 걸었음 = 손대지 않음', () => {
    let R = run(f); R.arm({ onfHist: 'h1', b: 1, bd: 3 }); assert.strictEqual(R.cat({ onfBook: 1, bd: 2, lg: 1 }), false);
    R = run(f); R.arm({ onfHist: 'h1', b: 1, bd: 3 }); R.g.now += 1600; assert.strictEqual(R.cat({ onfBook: 1, bd: 1 }), false, '⛔ 오래 뒤 사람이 누른 뒤로를 먹었다');
    R = run(f); R.arm({ onfHist: 'h1', b: 2, bd: 3 }); assert.strictEqual(R.cat(null), false, '⛔ 보이는 판이 아닌데 다시 세웠다');
    R = run(f); assert.strictEqual(R.cat(null), false);
    R = run(f); R.arm({ onfHist: 'h1', b: 1, bd: 3 }); R.cat({ onfBook: 1, bd: 2, lg: 1 }); assert.strictEqual(R.cat(null), false, '⛔ 한 번 건 지킴이 두 번째 뒤로까지 먹었다');
    assert.strictEqual(R.g.pushed.length + R.g.sent.length, 0);
  });
}
console.log(`\n${pass}개 통과, ${fail}개 실패`); process.exit(fail ? 1 : 0);
