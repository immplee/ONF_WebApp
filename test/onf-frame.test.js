/* assets/onf-frame.js 의 출처 자물쇠(_fromOurFrame) 하나만 잰다.
   왜 이것만: 이 판정이 헐거우면 남이 탭 제목을 위조하고, 너무 빡빡하면 **우리 앱의 노크를 놓쳐**
   키보드 보정이 죽는다. 둘 다 조용히 일어나 화면만 보고는 모른다.
   실행: node test/onf-frame.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const g = {};
vm.createContext(g);
// 브라우저 전역 최소 대역 — 이 파일이 불러올 때 만지는 것만 세운다.
vm.runInContext('var window = this; var localStorage = null;'
  + ' var location = { search: "", pathname: "/" };'
  + ' var navigator = { userAgent: "node" };'
  + ' var document = { addEventListener: function(){} };', g);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g,
  { filename: 'onf-frame.js' });
const fromOurFrame = g.ONF.frame._fromOurFrame;
assert.strictEqual(typeof fromOurFrame, 'function', '_fromOurFrame 이 안 나왔다');

// 가짜 창 — parent 사슬만 있으면 된다. 최상위는 자기 자신을 parent 로 갖는다(브라우저와 같게).
function win(name, parent) { const w = { name }; w.parent = parent || w; return w; }

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

console.log('[출처 자물쇠 — 우리 프레임에서 온 말만 받는다]');

const top = win('shell');
const appWin = win('exec', top);              // iframe#app = frameEl.contentWindow
const frameEl = { contentWindow: appWin };

t('앱 창 자신(자식)이면 받는다', () => {
  assert.strictEqual(fromOurFrame(appWin, frameEl), true);
});

t('구글 래퍼 한 겹 아래(손자)도 받는다', () => {
  assert.strictEqual(fromOurFrame(win('sandbox', appWin), frameEl), true);
});

t('⛔ 두 겹 아래(증손자)도 받는다 — GAS 겹 수는 보장이 없다', () => {
  const sandbox = win('sandbox', appWin);
  assert.strictEqual(fromOurFrame(win('userHtml', sandbox), frameEl), true);
});

t('⛔ 남의 창은 막는다 — 우리를 감싼 페이지가 띄운 다른 GAS 앱', () => {
  const attacker = win('attackerApp', top);   // 오리진은 같아도 우리 iframe 이 아니다
  assert.strictEqual(fromOurFrame(attacker, frameEl), false);
});

t('⛔ 우리를 감싼 최상위 창 자신도 막는다', () => {
  assert.strictEqual(fromOurFrame(top, frameEl), false);
});

t('사슬이 끊겨도(최상위 자기참조) 멈춘다 — 무한 루프 없음', () => {
  const lone = win('lone');                   // parent === self
  assert.strictEqual(fromOurFrame(lone, frameEl), false);
});

t('parent 를 읽다 던지면 막는다 (교차 출처 예외)', () => {
  const hostile = { name: 'hostile', get parent() { throw new Error('SecurityError'); } };
  assert.strictEqual(fromOurFrame(hostile, frameEl), false);
});

t('빈 값·아직 안 뜬 iframe 이면 막는다', () => {
  assert.strictEqual(fromOurFrame(null, frameEl), false);
  assert.strictEqual(fromOurFrame(appWin, { contentWindow: null }), false);
  assert.strictEqual(fromOurFrame(appWin, null), false);
});

t('⛔ 아주 깊어도 상한에서 멈춘다 (거짓 통과 없음)', () => {
  let w = appWin;
  for (let i = 0; i < 12; i++) w = win('d' + i, w);
  assert.strictEqual(fromOurFrame(w, frameEl), false, '상한을 넘으면 막아야');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
