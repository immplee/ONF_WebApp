/* ONF 액자(shell) 공통 — 2026-08-06
 *
 * 이 파일이 하는 일 넷. 넷 다 **최상위 창만 할 수 있는 일**이라 여기 있다.
 *   1) 주소의 ?t=<토큰> 을 이 도메인에 저장한다 (다음부턴 주소 없이도 열린다)
 *   2) 구글 앱스스크립트 웹앱을 iframe 으로 띄운다 → "이 애플리케이션은 …" 배너가 안 뜬다
 *   3) 키보드 높이를 재서 iframe 안 앱에 넘긴다 (앱은 iframe 안이라 자기가 못 잰다 — MDN)
 *   4) iOS 가 페이지를 통째로 밀 때(pan) 앱을 화면에 도로 붙인다
 *
 * ⛔ 여기 손대기 전에 반드시 읽을 것:
 *    ONF_Archive/웹-앱/ONF_공유웹앱-모바일-입력창.md 의 "재발 방지 체크리스트 B1~B7".
 *    이 파일의 숫자와 순서는 전부 실기기에서 하나씩 깨져 가며 정해진 값이다.
 */
(function (global) {
  'use strict';

  var TOKEN_KEY = 'onfTok';

  // 브라우저마다 '키보드 윗선' 보고가 다르다 → 실기기로 잰 보정값(+면 화살표가 내려감).
  //   사파리 54 : 윗선을 실제(∧∨✓ 필 상단)보다 그만큼 위로 보고한다
  //   iOS 크롬계 12 : 사파리보다 덜 어긋난다. 0 이면 ~30px 떠 보인다
  //   그 외 0 : 안드로이드는 0 이 맞는 것으로 실기기 확인됨(2026-08-06) — 건드리지 마라
  var isIOS = /iPhone|iPad/.test(navigator.userAgent);
  var isIOSChromeLike = /CriOS|EdgiOS|FxiOS/.test(navigator.userAgent);
  var KB_SLACK = !isIOS ? 0 : (isIOSChromeLike ? 12 : 54);

  var KB_MIN = 60;        // 이보다 작으면 키보드가 아니라 잔값
  var KB_ZERO_HOLD = 300; // "키보드 없음"은 이만큼 유지될 때만 믿는다(아래 B7 참조)

  /** 경로에 실린 토큰 — `/i/<토큰>`. **설치된 홈 화면 아이콘**이 이 모양으로 열린다.
   *
   *   ⛔ 왜 필요한가 (2026-09-03 아이폰 실측 + Apple 1차 출처):
   *     iOS 홈 화면 웹앱은 브라우저와 **저장소를 안 나눠 쓴다**(WWDC23: "separate cookies and
   *     storage from the browser" · WebKit bug 181849 "by design"). 그래서 아이콘으로 처음 열면
   *     `localStorage` 가 비어 있다. 게다가 iOS 11.3 부터 「홈 화면에 추가」는 그때 열려 있던
   *     주소가 아니라 **매니페스트의 `start_url`** 을 아이콘에 박는다 — `start_url` 이 `/` 면
   *     토큰이 통째로 떨어져 나가 아이콘이 잠금 화면만 연다(Peter 가 실물로 잡았다).
   *   → 그래서 매니페스트를 `/i/<토큰>/manifest.json` 로 걸고 그 안에 `start_url: "."` 을 둔다.
   *     iOS 는 `start_url` 을 **매니페스트 주소 기준**으로 풀기 때문에 `/i/<토큰>/` 이 박힌다.
   *     즉 **주소가 토큰을 나른다** — 매니페스트 파일 안에는 토큰이 없다(파일 하나로 전 학생).
   *   ⚠️ 반드시 **원본 pathname** 을 본다. 짧은 주소(slug)쪽은 소문자로 낮춰 쓰는데 토큰은
   *     대소문자를 가린다(`h6GwGprFBZMU`) — 낮추면 그 학생을 못 찾는다.
   *   ⚠️ 평소 브라우징 주소는 그대로 깨끗하다(`/`). 이 모양은 아이콘이 여는 길에만 쓰인다.
   */
  function tokenFromPath() {
    try {
      var m = /^\/i\/([A-Za-z0-9_-]{6,64})\/?$/.exec(location.pathname);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  function getToken() {
    /* 주소가 이긴다: `?t=`(선생님 링크) → `/i/<토큰>`(아이콘) → 저장된 것.
       ⛔ 찾았으면 **저장까지** 한다. 아이콘으로 처음 열린 앱은 저장소가 비어 있으므로,
         여기서 안 넣으면 앱 안에서 새로고침 한 번에 토큰이 사라진다. */
    var t = new URLSearchParams(location.search).get('t') || tokenFromPath();
    if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} return t; }
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  /* [2026-08-29 Peter — "주소만 보이되 토큰은 숨겨지게"] 주소창을 지운다.
   *   토큰은 **위에서 이미 이 도메인에 저장**됐다. 주소창에 남겨 둘 이유가 없는데,
   *   남으면 ① 학생이 화면을 찍어 보낼 때 토큰이 같이 나가고 ② 방문기록·공유 미리보기에
   *   그대로 남는다. 토큰은 이 학생의 **비밀번호 자리**다(학생 화면엔 로그인이 없다).
   *   ⛔ `pushState` 가 아니라 `replaceState` 다 — 뒤로가기 한 칸을 만들면 학생이 뒤로 갔을 때
   *     토큰이 든 주소로 되돌아간다.
   *   ⚠️ 주소를 **지우기만** 한다. 앱에 넘기는 값은 이미 다 읽어 둔 뒤다(호출 순서를 지켜라).
   *   ⚠️ 옛 주소(`?fileId=…&sheetName=…`)는 그대로 둔다 — 그게 없으면 새로고침이 홈으로 간다.
   *     짧은 주소(경로)로 들어온 길만 깨끗해진다.
   */
  function hideToken() {
    try {
      var u = new URL(location.href);
      var t = u.searchParams.get('t');
      if (!t) return;
      /* ⛔ **저장이 실제로 됐을 때만** 지운다. 시크릿 모드·저장소 차단이면 setItem 이 조용히
       *   실패하는데, 그 상태에서 주소까지 지우면 새로고침 한 번에 토큰이 증발한다
       *   (「링크로 열어 주세요」로 떨어진다 — 지금은 되던 것이 안 되게 된다). */
      var kept = '';
      try { kept = localStorage.getItem(TOKEN_KEY) || ''; } catch (e2) { kept = ''; }
      if (kept !== t) return;
      u.searchParams.delete('t');
      history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
    } catch (e) {}
  }

  function withToken(url) {
    var t = getToken();
    if (!t) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + encodeURIComponent(t);
  }

  /* 이 창이 **내가 띄운 그 iframe 안**에서 온 것인가. 부모 사슬을 타고 올라가 찾는다.
   *
   *   ⛔ 깊이를 숫자로 박지 마라. GAS 는 우리 HTML 을 래퍼 안에 다시 감싸는데 그 겹 수가
   *     보장되지 않는다(exec → sandboxFrame → userHtmlFrame 로 두 겹인 경우가 실제로 있다).
   *     선생님 액자는 「자식이거나 손자」로 두 단만 보는데, 그쪽은 **노크를 놓쳐도 덤**이라
   *     괜찮다고 적혀 있다. 학생 액자는 다르다 — 노크를 놓치면 appWin 이 안 잡혀
   *     **키보드 높이 보정이 통째로 죽는다**(폰에서 입력칸이 키보드에 가린다).
   *     그래서 여기서는 겹 수를 안 세고 **끝까지 타고 올라가** 찾는다.
   *   ⚠️ `parent` 는 교차 출처에서도 읽고 비교할 수 있다(HTML 표준 CrossOriginProperties).
   *     최상위에서는 `w.parent === w` 라 그 자리에서 멈춘다(무한 루프 방지).
   *   ⚠️ 상한 8은 안전장치일 뿐이다 — 실제 겹은 1~2다. */
  function _fromOurFrame(win, frameEl) {
    var w = win, target = frameEl && frameEl.contentWindow;
    if (!w || !target) return false;
    for (var i = 0; i < 8 && w; i++) {
      if (w === target) return true;
      try { w = (w.parent && w.parent !== w) ? w.parent : null; } catch (e) { return false; }
    }
    return false;
  }

  /* iframe 에 GAS 웹앱을 띄우고, 키보드·팬 보정을 붙인다.
   * @param {HTMLIFrameElement} frameEl
   * @param {string} src  띄울 주소
   * @param {{diag?:boolean}} [opts]
   */
  function mount(frameEl, src, opts) {
    opts = opts || {};
    var appWin = null, lastH = -1, lastTop = -1, zeroTimer = null, diagEl = null;

    if (opts.diag) {
      diagEl = document.createElement('div');
      diagEl.style.cssText = 'position:fixed;top:4px;left:4px;z-index:99999;background:#000;' +
        'color:#0f0;font:12px/1.4 monospace;padding:4px 6px;border-radius:4px;pointer-events:none';
      diagEl.textContent = '대기…';
      document.body.appendChild(diagEl);
      setInterval(sync, 300);
    }

    function send(h, top) {
      if (!appWin || (h === lastH && top === lastTop)) return;
      lastH = h; lastTop = top;
      try { appWin.postMessage({ onf: 'kbH', h: h, top: top }, '*'); } catch (e) {}
    }

    function sync() {
      var vv = global.visualViewport;
      if (!vv || !frameEl) return;

      // ① 앱을 화면에 붙인다(B4) — iOS 는 키보드가 뜬 동안 페이지 전체를 밀 수 있고,
      //    그러면 앱의 고정 요소(입력창·화살표)가 통째로 화면 밖으로 나간다. 밀린 만큼 되민다.
      //    ⚠️ 핀치줌 중엔 풀어라 — 줌 팬과 싸우면 화면이 손가락을 쫓아다닌다.
      var notZooming = Math.abs((vv.scale || 1) - 1) < 0.02;
      frameEl.style.transform = (notZooming && vv.offsetTop > 0)
        ? 'translateY(' + vv.offsetTop + 'px)' : '';
      if (diagEl) diagEl.style.transform = frameEl.style.transform;

      // ② 키보드를 잰다.
      //    ⛔ innerHeight 로 되짚지 마라(B3) — 크롬 iOS 는 키보드가 뜨면 주소창을 접어
      //      innerHeight 가 ~120px 커지는데 iframe 높이는 그대로다. 그 차이가 오차가 된다.
      //    ⛔ 아래끝(bottom) 기준으로 넘기지 마라(B6) — 앱은 구글 래퍼 안 중첩 iframe 이라
      //      아래끝이 ~40px 어긋난다. **위끝은 어긋나지 않는다.**
      var h = 0, kbTopInFrame = 0;
      if (notZooming) {
        var r = frameEl.getBoundingClientRect();
        var kbTop = vv.offsetTop + vv.height;
        h = Math.round(r.bottom - kbTop);
        if (h < KB_MIN) h = 0;
        kbTopInFrame = h > 0 ? Math.round(kbTop - r.top) + KB_SLACK : 0;
      }
      if (diagEl) {
        diagEl.textContent = 'vvH ' + Math.round(vv.height) + ' / top ' + Math.round(vv.offsetTop)
          + ' / kb ' + h + ' / 선 ' + kbTopInFrame + (appWin ? ' / 연결됨' : ' / 대기');
      }

      // ③ "키보드 없음"(h=0)은 유예를 둔다(B7) — iOS 가 스크롤 중 vv 를 순간적으로 전체
      //    높이로 잘못 보고하는 틈에 0 을 보내면, 앱이 화살표를 우하단(= 아직 떠 있는 키보드
      //    뒤)으로 내려 사라진다. 진짜 접힘만 유예를 통과한다.
      if (h > 0) {
        if (zeroTimer) { clearTimeout(zeroTimer); zeroTimer = null; }
        send(h, kbTopInFrame);
      } else if (lastH !== 0 && !zeroTimer) {
        zeroTimer = setTimeout(function () { zeroTimer = null; send(0, 0); }, KB_ZERO_HOLD);
      }
    }

    // ⚠️ 핸드셰이크는 **앱이 먼저** 쏜다. 부모가 먼저 보내면 구글 래퍼가 자기 origin 이
    //    아니라며 버린다. 앱이 top 으로 쏘면 두 겹을 건너뛰고, 여기서 event.source 로 답한다.
    global.addEventListener('message', function (ev) {
      // ⛔ [2026-08-09] 오리진 검사. 지금 오가는 게 키보드 높이뿐이라 없어도 무해했지만,
      //    검사가 0줄이면 **아무 페이지나** 우리를 iframe 으로 감싸고 appWin 을 가로챌 수 있다.
      //    앱 본문은 googleusercontent.com 에서 온다(GAS 가 앱 HTML 을 거기서 서빙한다).
      //    ⚠️ 이 채널에 비밀(PIN·토큰)을 태우지 마라 — 앱 쪽 발신이 targetOrigin '*' 이라
      //      감싼 쪽이 누구든 같이 받는다. 값을 넘길 거면 iframe src 쿼리를 쓴다.
      /* ⛔ [2026-09-03] **출처 자물쇠 — 오리진 검사 하나로는 못 막는다.**
         `googleusercontent.com` 은 **누구나** GAS 앱을 하나 만들면 받는 도메인이다. 그래서
         오리진만 보면 「구글이 서빙한 아무 앱」이 다 통과한다. 여기서 좁힌다.

         ⚠️ **막는 것과 못 막는 것을 헷갈리지 마라**(2026-09-03 검수에서 이 주석이 한 번 틀렸다).
           · 막는다 — 우리가 **최상위**일 때. 남의 페이지가 `window.open(우리주소,'v')` 로 창을
             열어 두고, 자기 GAS iframe 에서 `window.open('','v')` 로 그 창 손잡이를 얻어
             `{onf:'title'}` 을 쏘는 길. 오리진만 보면 통과하던 자리다.
           · **못 막는다** — 우리가 남의 iframe 안에 있을 때. 그때 탭 제목은 애초에 **감싼 쪽
             문서의 것**이라 우리 title 을 바꿔 봐야 화면에 안 나온다(감싼 쪽은 자기 제목을
             처음부터 마음대로 쓴다). 게다가 그 상태에선 진짜 앱의 말도 우리에게 안 온다 —
             앱은 `onfPostToShell(window.top, …)` 로 보내는데 window.top 이 남의 창이면
             브라우저가 버린다. **감싸기 자체를 막는 것은 이 줄이 아니라 vercel.json 의
             `frame-ancestors 'none'` 이다.** 그쪽을 지우고 이 줄만 믿지 마라.

         ⛔ 선생님 액자(teacher/index.html)에 있는 **「한 번 정한 창은 안 바꾼다」 빗장은 안 넣는다.**
           아래 사슬 검사를 통과하려면 이미 내 iframe 안에서 온 말이어야 하므로 빗장이 더 막는
           것이 **없고**, 대신 안쪽 프레임이 다시 만들어지는 경로에서 새 노크를 영영 버려
           `appWin` 이 죽은 창을 가리킨 채 **키보드 보정이 조용히 죽는다**(오류도 로그도 안 난다). */
      try {
        if (!ev || !ev.data || !ev.source) return;
        if (!_fromOurFrame(ev.source, frameEl)) return;
        if (!/(^|\.)googleusercontent\.com$/.test(new URL(ev.origin).hostname)) return;
      } catch (e) { return; }
      if (ev && ev.data && ev.data.onf === 'frameHello') {
        appWin = ev.source; lastH = -1; lastTop = -1; sync();
      }
      // 탭 제목 — 앱(=GAS)만 학생 이름을 안다. 보이는 탭 제목은 **이 창**이 정하므로 받아서 세운다.
      //   위 오리진 검사를 이미 통과한 메시지다. 줄바꿈을 지우고 길이를 잘라 그대로 쓴다.
      if (ev && ev.data && ev.data.onf === 'title' && typeof ev.data.t === 'string') {
        var newTitle = ev.data.t.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);
        if (newTitle) document.title = newTitle;
      }
    });
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', sync);
      global.visualViewport.addEventListener('scroll', sync);
    }
    global.addEventListener('resize', sync);

    frameEl.src = src;
  }

  global.ONF = global.ONF || {};
  global.ONF.frame = {
    hideToken: hideToken, mount: mount, getToken: getToken, withToken: withToken, TOKEN_KEY: TOKEN_KEY,
    tokenFromPath: tokenFromPath,
    /* 검사용으로만 낸다 — 순수 판정 함수라 창 없이 잴 수 있다. 화면 코드에서 부르지 마라. */
    _fromOurFrame: _fromOurFrame };
})(window);
