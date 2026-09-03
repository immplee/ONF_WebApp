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


console.log('\n[아이콘 주소에서 토큰 읽기 — /i/<토큰>]');
/* 왜 재나: iOS 홈 화면 앱은 브라우저와 저장소를 안 나눠 쓴다. 아이콘이 여는 주소가 토큰을
   나르지 못하면 학생이 **잠금 화면만** 본다(2026-09-03 아이폰 실측). 이 판정이 조용히 죽으면
   화면만 보고는 절대 모른다 — 아이콘을 눌러 봐야 안다. */
const fromPath = g.ONF.frame.tokenFromPath;
assert.strictEqual(typeof fromPath, 'function', 'tokenFromPath 가 안 나왔다');
function at(pathname) { g.location.pathname = pathname; return fromPath(); }

t('아이콘 주소에서 토큰을 읽는다', () => {
  assert.strictEqual(at('/i/h6GwGprFBZMU'), 'h6GwGprFBZMU');
});

t('⛔ 끝 슬래시가 붙어도 읽는다 — start_url "." 이 `/i/<토큰>/` 로 풀린다', () => {
  assert.strictEqual(at('/i/h6GwGprFBZMU/'), 'h6GwGprFBZMU');
});

t('⛔ 대소문자를 지킨다 — 낮추면 그 학생을 못 찾는다', () => {
  assert.strictEqual(at('/i/AbCdEfGhIjKl'), 'AbCdEfGhIjKl');
});

t('평소 주소·짧은 주소는 토큰이 아니다', () => {
  assert.strictEqual(at('/'), '');
  assert.strictEqual(at('/thegoodplace-s1-e1-sandy'), '');
  assert.strictEqual(at('/teacher/'), '');
  assert.strictEqual(at('/manifest.json'), '');
});

t('⛔ 더 깊은 경로는 안 받는다 (매니페스트 주소를 토큰으로 읽으면 안 된다)', () => {
  assert.strictEqual(at('/i/h6GwGprFBZMU/manifest.json'), '');
  assert.strictEqual(at('/i/abc/def'), '');
});

t('짧거나 이상한 것은 안 받는다', () => {
  assert.strictEqual(at('/i/abc'), '');          // 6자 미만
  assert.strictEqual(at('/i/'), '');
  assert.strictEqual(at('/i'), '');
  assert.strictEqual(at('/i/has space'), '');
  assert.strictEqual(at('/i/../etc'), '');
});

g.location.pathname = '/';   // 뒷 검사에 안 새게 되돌린다


console.log('\n[여러 깊이로 서빙되는 파일의 자산 경로]');
/* index.html 한 장이 `/` · `/<짧은주소>` · `/i/<토큰>/` 세 깊이로 서빙된다. 상대경로가 하나라도
   남으면 가장 깊은 곳에서 CSS·JS 가 404 가 되고 화면이 글자만 남는다 — **오류도 안 난다.**
   2026-09-03 에 그 상태로 배포했고, 검사가 아니라 스크린샷이 잡았다. 그래서 검사로 못박는다. */
const shellHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
t('⛔ index.html 의 자산 경로는 전부 절대경로다', () => {
  const bad = (shellHtml.match(/(?:href|src)="(?!\/|https?:|data:|#)[^"]+"/g) || []);
  assert.deepStrictEqual(bad, [], '상대경로가 남았다 — /i/<토큰>/ 에서 404 가 된다');
});
t('⛔ 매니페스트 링크도 절대경로다', () => {
  assert.ok(/rel="manifest" href="\/manifest\.json"/.test(shellHtml),
    '매니페스트가 상대경로면 깊은 주소에서 엉뚱한 곳을 가리킨다');
});
const teacherHtml = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
t('⛔ 선생님 액자의 매니페스트도 절대경로다 (끝 슬래시 없이도 열린다)', () => {
  assert.ok(/rel="manifest" href="\/teacher\/manifest\.json"/.test(teacherHtml));
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
