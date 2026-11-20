/* 🗂️ 탭마다 학생 토큰(2026-11-04 Peter 「두 학생 홈을 탭 둘에 열고 먼저 연 탭을 새로고침하면 마지막에 연 학생 홈이 뜬다」)
   localStorage 는 탭끼리 같이 쓰고 주소의 토큰은 지워진다(hideToken) → 새로고침한 탭이 마지막에 연 학생 것을 읽었다.
   실행: node test/tab-token.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8');
const store = () => { const m = {}; return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
const LS = store();   // 브라우저 하나 — 탭끼리 같이 쓴다
function tab(url) {   // 탭 하나 = 제 sessionStorage · 제 주소
  const u = new URL(url), ss = store(), g = {};
  vm.createContext(g);
  g.localStorage = LS; g.sessionStorage = ss; g.URL = URL; g.URLSearchParams = URLSearchParams;
  g.location = { get search() { return u.search; }, get pathname() { return u.pathname; }, get href() { return u.href; }, get hash() { return u.hash; } };
  g.history = { replaceState: (a, b, to) => { const n = new URL(to, u.origin); u.search = n.search; u.pathname = n.pathname; } };
  vm.runInContext('var window = this; var navigator = { userAgent: "node" }; var document = { addEventListener: function(){} };', g);
  const load = () => { vm.runInContext(SRC, g, { filename: 'onf-frame.js' }); const t = g.ONF.frame.getToken(); g.ONF.frame.hideToken(); return t; };
  return { load, u };
}
let pass = 0, fail = 0;
const t = (label, fn) => { try { fn(); console.log('  ✅ ' + label); pass++; } catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; } };
t('두 학생 탭 — 먼저 연 탭을 새로고침해도 그 학생 · 주소의 토큰은 지운다', () => {
  const A = tab('https://class.ownify.co.kr/?t=tokAAAAAAAA'), B = tab('https://class.ownify.co.kr/?t=tokBBBBBBBB');
  assert.strictEqual(A.load(), 'tokAAAAAAAA');
  assert.strictEqual(B.load(), 'tokBBBBBBBB');
  assert.ok(!A.u.search.includes('t=') && !B.u.search.includes('t='), '⛔ 주소에 토큰이 남았다');
  assert.strictEqual(A.load(), 'tokAAAAAAAA', '⛔ 먼저 연 탭 새로고침이 마지막에 연 학생 홈을 띄운다');
  assert.strictEqual(B.load(), 'tokBBBBBBBB');
});
t('토큰 없는 새 탭(홈 화면 앱 다시 열기 · 북마크) — 종전대로 마지막 토큰(localStorage)', () => {
  const C = tab('https://class.ownify.co.kr/');
  assert.strictEqual(C.load(), 'tokBBBBBBBB');
});
t('선생님 보기 주소(?t=학생&ttok=…) — 학생 토큰을 이 기기의 「내 토큰」(localStorage)에 안 남긴다 · 이 탭 새로고침은 그대로(2026-11-20 후속 구멍 점검)', () => {
  const T = tab('https://class.ownify.co.kr/?mode=mine&t=tokSTUDENT01&ttok=c0ffee0123456789&tas=Neo');
  assert.strictEqual(T.load(), 'tokSTUDENT01');
  assert.strictEqual(LS.getItem('onfTok'), 'tokBBBBBBBB', '⛔ 선생님 보기 주소의 학생 토큰이 기기 토큰이 됐다 — 나중에 맨 주소를 열면 그 학생 홈');
  assert.strictEqual(T.load(), 'tokSTUDENT01', '⛔ 선생님 보기 탭 새로고침에 토큰이 사라졌다');
  assert.strictEqual(tab('https://class.ownify.co.kr/').load(), 'tokBBBBBBBB', '⛔ 다른 새 탭이 선생님이 본 학생 홈을 연다');
});
console.log(fail ? `❌ 실패 ${fail} / 통과 ${pass}` : `✅ 통과 ${pass}`);
if (fail) process.exit(1);
