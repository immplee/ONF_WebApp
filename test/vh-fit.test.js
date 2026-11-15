/* 📐 보이는 키 맞춤(2026-11-16 Peter 「홈을 열면 아래가 잘려 있다 · 한참 뒤에야 한 화면에」) — assets/onf-frame.js vhFit.
   아이패드 12.9 크롬 실측(clog vp1/vp2): 처음 0.15초 뒤부터 innerHeight·visualViewport 892 · 문서 키(documentElement.clientHeight) 1024 그대로
   = 주소창 132px 만큼 배치 창이 길다 → html 키를 보이는 키로 못 박고 표식(onf-vcut)을 단다.
   잰다: ① 그 상태면 892px + 표식 ② 크롬이 배치 창을 고치면(둘 다 892) 푼다 ③ 키보드가 뜬 동안·핀치 중엔 그대로 ④ 차이가 없거나 작으면 아무것도 안 함
        ⑤ 아이패드가 아니면 아무것도 안 함 ⑥ 두 껍데기 CSS 가 표식에 body 를 고정 요소의 바탕으로 삼는다
   실행: node test/vh-fit.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FSRC = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8');
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + '\n     ' + e.message); } };

const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
/** onf-frame.js 를 vm 에 — 창 값(L 문서 키 · I innerHeight · V visualViewport · scale)은 손으로 바꾸고 resize 를 쏜다 */
function setup(o) {
  o = Object.assign({ ua: IPAD, L: 1024, I: 1024, V: 1024, scale: 1 }, o || {});
  const WL = {}, VL = {}, cls = new Set();
  const root = { get clientHeight() { return o.L; }, style: { height: '' }, classList: { toggle(c, on) { if (on) cls.add(c); else cls.delete(c); } }, setAttribute() {} };
  const doc = { hidden: false, documentElement: root, body: null, addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] };
  const g = { URL, document: doc, location: { origin: 'https://class.ownify.co.kr', pathname: '/', search: '', href: 'https://class.ownify.co.kr/' },
    navigator: { userAgent: o.ua, maxTouchPoints: 5, sendBeacon: () => true }, localStorage: null, sessionStorage: null,
    get innerHeight() { return o.I; }, innerWidth: 1366,
    visualViewport: { get height() { return o.V; }, get scale() { return o.scale; }, offsetTop: 0, addEventListener(k, f) { (VL[k] = VL[k] || []).push(f); } },
    addEventListener(k, f) { (WL[k] = WL[k] || []).push(f); }, removeEventListener() {}, setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, Promise, JSON, Array, String, Math };
  g.window = g; vm.createContext(g);
  vm.runInContext(FSRC, g, { filename: 'onf-frame.js' });
  const set = (v) => { Object.assign(o, v); (VL.resize || []).forEach((f) => f()); (WL.resize || []).forEach((f) => f()); };
  return { o, root, cls, set, h: () => root.style.height, on: () => cls.has('onf-vcut') };
}

console.log('[📐 보이는 키 맞춤 — vhFit]');
t('아이패드 크롬 처음 상태(문서 키 1024 · 보이는 키 892) → html 892px + 표식 · 크롬이 배치 창을 고치면(892·892) 푼다', () => {
  const s = setup();
  assert.strictEqual(s.h(), '', '⛔ 처음(전부 1024)엔 손대면 안 된다'); assert.strictEqual(s.on(), false);
  s.set({ I: 892, V: 892 });
  assert.strictEqual(s.h(), '892px', '⛔ 보이는 키로 못 박지 않았다: ' + s.h()); assert.strictEqual(s.on(), true, '⛔ 표식(onf-vcut)이 없다');
  s.set({ L: 892 });
  assert.strictEqual(s.h(), '', '⛔ 맞은 뒤에도 못 박혀 있다'); assert.strictEqual(s.on(), false, '⛔ 맞은 뒤에도 표식이 남았다');
});
t('키보드가 뜬 동안은 그대로 — 주소창이 접혀 innerHeight 가 늘어도(B3) · 그냥 visualViewport 만 줄어도 · 접으면 다시 잰다', () => {
  const s = setup(); s.set({ I: 892, V: 892 });
  s.set({ I: 1024, V: 560 });   // 크롬 iOS: 키보드 + 주소창 접힘
  assert.strictEqual(s.h(), '892px', '⛔ 키보드가 뜨자 액자 키가 바뀌었다(B3): ' + s.h());
  s.set({ I: 892, V: 480 });    // 주소창 그대로 + 키보드
  assert.strictEqual(s.h(), '892px', '⛔ 키보드가 뜨자 액자 키가 바뀌었다: ' + s.h());
  s.set({ I: 892, V: 892 });
  assert.strictEqual(s.h(), '892px');
  const k = setup({ L: 892, I: 892, V: 892 }); k.set({ V: 470 });
  assert.strictEqual(k.h(), '', '⛔ 맞은 화면에서 키보드만 떴는데 못 박았다'); assert.strictEqual(k.on(), false);
});
t('핀치 중(innerHeight 가 배율 따라 준다)엔 그대로 · 차이가 없거나 작으면(20px 안) 아무것도 안 함 · 터무니없는 차이(400 넘음)도 안 함', () => {
  const s = setup({ L: 892, I: 892, V: 892 }); s.set({ I: 776, V: 776, scale: 1.15 });   // 1.15배 — 준 값(116px)이 주소창만 하다
  assert.strictEqual(s.h(), '', '⛔ 핀치 확대를 주소창으로 봤다: ' + s.h());
  const m = setup(); m.set({ I: 1010, V: 1010 });
  assert.strictEqual(m.h(), '', '⛔ 14px 차이에 못 박았다');
  const b = setup(); b.set({ I: 500, V: 500 });
  assert.strictEqual(b.h(), '', '⛔ 524px 차이(주소창일 수 없다)에 못 박았다');
});
t('아이패드가 아니면(아이폰 크롬 — 안 잰 기기) 같은 값이어도 아무것도 안 한다', () => {
  const s = setup({ ua: IPHONE }); s.set({ I: 892, V: 892 });
  assert.strictEqual(s.h(), '', '⛔ 아이폰에서 못 박았다'); assert.strictEqual(s.on(), false);
});
t('두 껍데기 CSS — 표식이 달린 동안 body 가 고정 요소(교재 판·과제 판)의 바탕 · 쌍둥이 같은 규칙', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets', 'onf-ui.css'), 'utf8'), th = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  assert.match(css, /html\.onf-vcut body \{ contain: layout; \}/, '⛔ 학생 껍데기 CSS 에 규칙이 없다');
  assert.match(th, /html\.onf-vcut body \{ contain:layout; \}/, '⛔ 선생님 껍데기 CSS 에 규칙이 없다');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
