/* ⌨️ 과제 판 자판 신호(teacher/index.html hwKb · 2026-11-28 「아이패드+매직 키보드에서 판이 괜히 올라감」).
   진짜 껍데기 조각(hwKbSend·hwKb·hwKbHi)을 떼어 vm 에서 돌린다 — 판 창이 정해지면 첫 값 0(300ms 뒤) · 화면 자판이 뜨면 높이 · 단축 막대(≈55)는 0 · 숨긴 판엔 안 보냄 · 판 창 출처로만.
   실행: node test/hw-kbh.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const H = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const m = /var hwKbH = -1, hwKbZ = null;[\s\S]*?function hwKbHi\(\) \{[^\n]*\}/.exec(H);
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + '\n     ' + e.message); } };
function run(o) {
  const sent = [], timers = [];
  const sb = { Math, setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {},
    window: { visualViewport: Object.assign({ height: 1024, offsetTop: 0, scale: 1 }, o.vv || {}) },
    hwFr: { getBoundingClientRect: () => ({ top: 0, bottom: 1024 }) }, hwBox: { style: { visibility: o.hidden ? 'hidden' : '' } },
    hwWin: { postMessage: (m, org) => sent.push([m, org]) }, hwOrigin: 'https://app.ownify.co.kr' };
  vm.createContext(sb); vm.runInContext(m[0], sb);
  const flush = () => { const q = timers.splice(0); q.forEach((f) => f && f()); };
  return { sent, sb, flush };
}
console.log('[⌨️ 과제 판 자판 신호]');
t('조각이 있다 · 판 창이 정해질 때 첫 값 · 자판 높이 바뀔 때마다', () => {
  assert.ok(m, '⛔ teacher/index.html 에 hwKb 조각이 없다');
  assert.ok(/var hwNew = hwWin !== ev\.source; hwWin = ev\.source; hwOrigin = ev\.origin;\n    if \(hwNew && typeof hwKbHi === 'function'\) hwKbHi\(\);/.test(H), '⛔ 판 창이 정해질 때 첫 값을 안 보낸다(판이 「이 껍데기는 알려 준다」를 모른다)');
  assert.ok(/visualViewport\.addEventListener\('resize', hwKb\)/.test(H) && /window\.addEventListener\('resize', hwKb\)/.test(H), '⛔ 화면 칸이 바뀔 때 다시 안 잰다');
});
t('첫 값 = 자판 없음 0(300ms 유지 뒤) · 판 출처로만', () => {
  const r = run({}); r.sb.hwKbHi(); assert.strictEqual(r.sent.length, 0, '0 은 300ms 기다린다'); r.flush();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r.sent)), [[{ onf: 'kbH', h: 0, top: 0 }, 'https://app.ownify.co.kr']]);
});
t('화면 자판(보이는 칸 1024 → 640) = 높이 384 바로 · 하드웨어 키보드 단축 막대(55) = 0', () => {
  let r = run({ vv: { height: 640 } }); r.sb.hwKbHi(); assert.deepStrictEqual(JSON.parse(JSON.stringify(r.sent[0][0])), { onf: 'kbH', h: 384, top: 640 });
  r = run({ vv: { height: 969 } }); r.sb.hwKbHi(); r.flush(); assert.strictEqual(r.sent[0][0].h, 0, '⛔ 단축 막대를 자판으로 읽었다(매직 키보드인데 판이 올라간다)');
});
t('숨긴 판·핀치줌 중엔 안 보낸다', () => {
  let r = run({ hidden: true }); r.sb.hwKbHi(); r.flush(); assert.strictEqual(r.sent.length, 0);
  r = run({ vv: { height: 640, scale: 1.5 } }); r.sb.hwKbHi(); r.flush(); assert.strictEqual(r.sent.length, 0);
});
console.log('\n' + pass + '개 통과, ' + fail + '개 실패'); process.exit(fail ? 1 : 0);
