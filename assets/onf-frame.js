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

  function getToken() {
    var t = new URLSearchParams(location.search).get('t');
    if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} return t; }
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function withToken(url) {
    var t = getToken();
    if (!t) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + encodeURIComponent(t);
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
      try {
        if (!/(^|\.)googleusercontent\.com$/.test(new URL(ev.origin).hostname)) return;
      } catch (e) { return; }
      if (ev && ev.data && ev.data.onf === 'frameHello') {
        appWin = ev.source; lastH = -1; lastTop = -1; sync();
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
  global.ONF.frame = { mount: mount, getToken: getToken, withToken: withToken, TOKEN_KEY: TOKEN_KEY };
})(window);
