/* 📱 홈 화면 앱(선생님) 구글 로그인 받기 — GIS 리디렉트(ux_mode:'redirect')의 login_uri (2026-10-29 Peter 아이패드)
   홈 화면 앱 안에선 구글 팝업이 「400 malformed」로 끝나서, 그 앱만 리디렉트로 로그인한다(teacher/index.html gsiBack · homeApp).
   구글이 이리로 POST(credential · g_csrf_token) → credential 을 같은 출처 sessionStorage 에 놓고 /teacher/ 로 돌려보낸다.
   ⛔ 토큰을 주소(쿼리·#)에 싣지 않는다 — 기록·로그에 남는다.
   ⛔ 여기선 토큰을 믿지 않는다 — 진짜 검사(서명·aud·hd·exp)는 그대로 서버(GAS _onfTeacherMe)가 한다. 여기는 모양만 거른다.
   g_csrf_token: GIS 가 우리 출처에 심은 쿠키와 본문 값이 같아야 한다(구글 문서). 쿠키가 아예 안 왔으면(SameSite 로 막힌 브라우저) 넘어간다 —
   ponytail: 로그인 CSRF 는 회사 계정 토큰이 있어야 성립하고 서버가 hd 를 본다 · 쿠키가 늘 오는 게 확인되면 「없으면 거절」로 조인다. */
module.exports = (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(); }
  const b = req.body || {};
  const cred = typeof b.credential === 'string' ? b.credential : '';
  const csrfCookie = (req.cookies && req.cookies.g_csrf_token) || '';
  const bad = !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(cred) || cred.length > 4096 || (csrfCookie && b.g_csrf_token !== csrfCookie);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (bad) {
    res.statusCode = 400;
    return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:16px system-ui;padding:24px">로그인을 다시 해 주세요. <a href="/teacher/">돌아가기</a></p>');
  }
  /* cred 는 위 정규식(영숫자·_·-·점 둘)을 지났다 — 스크립트 안에 그대로 넣어도 안전하다 */
  res.end('<!doctype html><meta charset="utf-8"><script>try{sessionStorage.setItem("onf_gsi","' + cred + '")}catch(e){}location.replace("/teacher/")</script>');
};
