/* api/gsi.js — 홈 화면 앱(선생님) 구글 리디렉트 로그인 받기(2026-10-29).
   왜: 이 길이 틀리면 홈 화면 앱은 로그인이 조용히 막히거나(돌아와도 토큰 없음) 남의 글을 스크립트로 실어 준다.
   실행: node test/gsi-api.test.js */
const assert = require('assert');
const handler = require('../api/gsi.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
function call(method, body, cookies) {
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } };
  handler({ method, body, cookies: cookies || {} }, res);
  return res;
}
const CRED = 'eyJhbGciOiJSUzI1NiJ9.eyJoZCI6Im93bmlmeS5jby5rciJ9.c2lnX3Rlc3Q-_';

console.log('[📱 /api/gsi — 홈 화면 앱 리디렉트 로그인]');
t('POST + 같은 g_csrf_token → 같은 출처 sessionStorage 에 놓고 /teacher/ 로 · 주소엔 토큰 없음 · 캐시 안 함', () => {
  const r = call('POST', { credential: CRED, g_csrf_token: 'abc' }, { g_csrf_token: 'abc' });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.includes('sessionStorage.setItem("onf_gsi","' + CRED + '")'), '⛔ 토큰을 넘기지 않았다');
  assert.ok(r.body.includes('location.replace("/teacher/")'), '⛔ 선생님 홈으로 안 돌려보낸다');
  assert.ok(!/teacher\/[?#]/.test(r.body), '⛔ 토큰을 주소에 실었다');
  assert.strictEqual(r.headers['cache-control'], 'no-store');
});
t('쿠키가 아예 안 온 브라우저(SameSite)는 통과 · 쿠키가 왔는데 다르면 거절', () => {
  assert.strictEqual(call('POST', { credential: CRED, g_csrf_token: 'abc' }, {}).statusCode, 200);
  const r = call('POST', { credential: CRED, g_csrf_token: 'abc' }, { g_csrf_token: 'zzz' });
  assert.strictEqual(r.statusCode, 400, '⛔ CSRF 값이 다른데 받았다');
  assert.ok(!r.body.includes(CRED), '⛔ 거절하면서 토큰을 실었다');
});
t('⛔ 모양이 JWT 가 아니면 거절 — 스크립트 끼워 넣기(따옴표·<) 불가 · GET 은 405', () => {
  for (const bad of ['a"b.c.d', 'x.y</script><script>alert(1)</script>.z', 'onlyone', '', null, 'a.b.c' + 'x'.repeat(5000)]) {
    const r = call('POST', { credential: bad });
    assert.strictEqual(r.statusCode, 400, '⛔ 이상한 값을 받았다: ' + String(bad).slice(0, 30));
    assert.ok(!r.body.includes('sessionStorage.setItem'), '⛔ 거절하면서 저장 스크립트를 냈다');
  }
  assert.strictEqual(call('GET', {}).statusCode, 405);
});
console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
