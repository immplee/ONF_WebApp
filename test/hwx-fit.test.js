/* 🖥️ 확장 창 = 보이는 칸에 딱(teacher/index.html hwxFit · 2026-11-04 Peter TV 사진 「아래 여백이 없어 — 정가운데로」).
   진짜 껍데기 조각을 떼어 vm 에서 돌린다 — 보이는 칸(visualViewport)·안전 영역이 화면보다 작을 때 액자 자리·크기 · 확대(scale≠1)는 안 따름 · 숫자 기록.
   실행: node test/hwx-fit.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const H = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const m = /if \(new URLSearchParams\(location\.search\)\.get\('mode'\) === 'hwext'\) \(function \(\) \{ try \{[\s\S]*?\n\} catch \(e0\) \{\} \}\)\(\);/.exec(H);
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + '\n     ' + e.message); } };
function run(o) {
  const props = {}, beacons = [], L = {}, VL = {}, timers = [], cls = [];
  const safe = o.safe || [0, 0, 0, 0];
  const vv = o.vv === null ? undefined : Object.assign({ width: o.W, height: o.H, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener: (k, f) => { VL[k] = f; } }, o.vv || {});
  const sb = { URLSearchParams, JSON, Math, parseFloat, String, setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {},
    location: { search: o.search == null ? '?mode=hwext&t=tokA&s=h0123456789abcdef0123' : o.search }, innerWidth: o.W, innerHeight: o.H, visualViewport: vv,
    screen: o.screen || { width: 1366, height: 1024 }, screenY: 0,
    navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', maxTouchPoints: o.mac ? 0 : 5, sendBeacon: (u, b) => beacons.push([u, JSON.parse(b)]) },
    ONF: { frame: { WORKER: 'https://w.example' } },
    getComputedStyle: () => ({ paddingTop: safe[0] + 'px', paddingRight: safe[1] + 'px', paddingBottom: safe[2] + 'px', paddingLeft: safe[3] + 'px' }),
    addEventListener: (k, f) => { L[k] = f; },
    document: { body: { appendChild() {} }, createElement: () => ({ style: {} }), addEventListener() {}, fullscreenElement: o.fs ? {} : null,
      documentElement: { style: { setProperty: (k, v) => { props[k] = v; } }, classList: { add: (c) => cls.push(c) } } } };
  sb.window = sb; vm.createContext(sb); vm.runInContext(m[0], sb);
  return { props, beacons, L, VL, timers, cls, sb };
}
console.log('[🖥️ 확장 창 보이는 칸 맞춤]');
t('조각이 있다', () => assert.ok(m, '⛔ teacher/index.html 에 hwext 보이는 칸 맞춤이 없다'));
t('보이는 칸 = 화면 전체면 종전과 같다(0·0·W·H) · 켬 표시', () => {
  const r = run({ W: 1920, H: 1080 });
  assert.deepStrictEqual([r.props['--hwx-l'], r.props['--hwx-t'], r.props['--hwx-w'], r.props['--hwx-h']], ['0px', '0px', '1920px', '1080px']);
  assert.deepStrictEqual(r.cls, ['onf-hwx']);
});
t('보이는 칸이 화면보다 낮다(아래가 화면 밖) — 액자 높이 = 보이는 높이 · 위치 = 보이는 칸 위', () => {
  const r = run({ W: 1920, H: 1080, vv: { height: 1010, offsetTop: 30 } });
  assert.deepStrictEqual([r.props['--hwx-t'], r.props['--hwx-h']], ['30px', '1010px'], '⛔ 보이는 칸보다 큰 액자 — 가운데가 화면 밖까지 센다');
});
t('안전 영역(위 24 · 아래 20)을 뺀다', () => {
  const r = run({ W: 1366, H: 1024, safe: [24, 0, 20, 0] });
  assert.deepStrictEqual([r.props['--hwx-t'], r.props['--hwx-h'], r.props['--hwx-w']], ['24px', '980px', '1366px']);
});
t('⛔ 확대(scale≠1) 중엔 보이는 칸을 안 따른다 — 돋보기라서', () => {
  const r = run({ W: 1920, H: 1080, vv: { height: 540, width: 960, offsetTop: 200, scale: 2 } });
  assert.deepStrictEqual([r.props['--hwx-t'], r.props['--hwx-h'], r.props['--hwx-w']], ['0px', '1080px', '1920px']);
});
t('크기·보이는 칸·전체 화면이 바뀌면 다시 맞춘다', () => {
  const r = run({ W: 1180, H: 820 });
  assert.ok(r.L.resize && r.VL.resize && r.VL.scroll, '⛔ 크기가 바뀌어도 안 맞춘다(모니터로 옮김 · 전체 화면)');
  r.sb.innerWidth = 1920; r.sb.innerHeight = 1080; r.sb.visualViewport.width = 1920; r.sb.visualViewport.height = 1040; r.VL.resize();
  assert.deepStrictEqual([r.props['--hwx-w'], r.props['--hwx-h']], ['1920px', '1040px']);
});
t('숫자 기록 — 바뀔 때만 · 0.8초 모아서 · perf hwvp:… · 값만(토큰·주소 0) · 한 창 8줄까지', () => {
  const r = run({ W: 1920, H: 1080, vv: { height: 1010, offsetTop: 30 }, safe: [24, 0, 0, 0], fs: true });
  r.timers.forEach((f) => f());
  assert.deepStrictEqual(r.beacons, [['https://w.example/clog', [{ k: 'perf', c: 'hwvp:1920,1080,1920,1010,30,24,0,0,0,1,1366,1024,0,0', d: 'ipad' }]]]);
  assert.ok(r.beacons[0][1][0].c.length <= 60, '⛔ clog c 는 60자에서 잘린다');
  for (let i = 0; i < 20; i++) { r.sb.innerHeight = 1000 + i; r.L.resize(); r.timers.splice(0).forEach((f) => f()); }
  assert.ok(r.beacons.length <= 8, '⛔ 기록이 끝없이 간다: ' + r.beacons.length);
});
t('📺 TV 위 띠(실기기 기록 3008×1560 · 안전 위 32·아래 28 · 전체 화면) — 16:9 로 셈한 띠 132px 만큼 아래를 비워 TV 기준 가운데', () => {
  const r = run({ W: 3008, H: 1560, safe: [32, 0, 28, 0], fs: true });
  assert.deepStrictEqual([r.props['--hwx-t'], r.props['--hwx-h']], ['32px', (1560 - 32 - 28 - 132) + 'px'], '⛔ 창 안 가운데 = TV 로는 아래로 쏠린다');
  //   TV 기준: 위 = 띠 132 + 32 + 안쪽 여백 · 아래 = 28 + 132 + 안쪽 여백 → 같다(차 4px = 안전 영역 차)
  r.timers.forEach((f) => f()); assert.ok(/^hwvp:3008,1560,3008,1560,0,32,28,0,0,1,1366,1024,0,132$/.test(r.beacons[0][1][0].c), r.beacons[0][1][0].c);
});
t('📺 화면 크기를 알려 주면 그 차를 쓴다(screen.width = 창 폭) · ⛔ 전체 화면 아님·맥·4:3·21:9·띠가 15% 넘음 = 안 함', () => {
  assert.strictEqual(run({ W: 1920, H: 1000, fs: true, screen: { width: 1920, height: 1080 } }).props['--hwx-h'], '1000px'.replace('1000', String(1000 - 80)), '⛔ 알려 준 화면 높이 차(80)를 안 썼다');
  assert.strictEqual(run({ W: 3008, H: 1560 }).props['--hwx-h'], '1560px', '⛔ 전체 화면이 아닌데 띠를 뺐다(창 모드는 창 안 가운데)');
  assert.strictEqual(run({ W: 3008, H: 1560, fs: true, mac: true }).props['--hwx-h'], '1560px', '⛔ 맥(전체 화면 = 화면 전체)인데 띠를 뺐다');
  assert.strictEqual(run({ W: 1366, H: 1024, fs: true }).props['--hwx-h'], '1024px', '⛔ 아이패드 화면 자체(4:3)인데 띠를 뺐다');
  assert.strictEqual(run({ W: 3440, H: 1440, fs: true }).props['--hwx-h'], '1440px', '⛔ 21:9 화면을 16:9 로 셈해 큰 띠를 뺐다');
});
t('확장 창이 아니면 아무것도 안 한다', () => {
  const r = run({ W: 1920, H: 1080, search: '?mode=hwbook' });
  assert.deepStrictEqual([Object.keys(r.props).length, r.cls.length], [0, 0]);
});
t('CSS — 켜졌을 때 액자·교재 칸이 그 자리·크기(inline inset:0 을 이김)', () => {
  assert.ok(/html\.onf-hwx #app, html\.onf-hwx \.onf-extbk \{ position:fixed !important; left:var\(--hwx-l, 0px\) !important; top:var\(--hwx-t, 0px\) !important; width:var\(--hwx-w, 100%\) !important; height:var\(--hwx-h, 100%\) !important; right:auto !important; bottom:auto !important; \}/.test(H));
});
console.log(`${pass}개 통과, ${fail}개 실패`);
if (fail) process.exit(1);
