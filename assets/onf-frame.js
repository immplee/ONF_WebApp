/* ONF 액자(shell) 공통 — 2026-08-06
 *
 * 이 파일이 하는 일 다섯. 다섯 다 **최상위 창만 할 수 있는 일**이라 여기 있다.
 *   1) 주소의 ?t=<토큰> 을 이 도메인에 저장한다 (다음부턴 주소 없이도 열린다)
 *   2) 구글 앱스스크립트 웹앱을 iframe 으로 띄운다 → "이 애플리케이션은 …" 배너가 안 뜬다
 *   3) 키보드 높이를 재서 iframe 안 앱에 넘긴다 (앱은 iframe 안이라 자기가 못 잰다 — MDN)
 *   4) iOS 가 페이지를 통째로 밀 때(pan) 앱을 화면에 도로 붙인다
 *   5) 안쪽 「뒤로 = 창 닫기」 기록 칸을 이 최상위 문서에 만들어 준다 — 폰 뒤로 스와이프의 하얀 덮개 (mount 안 「기록 칸 다리」)
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

    /* 📱 키보드 보정 자리 — 폰 판이 보이면 그 판 액자·그 판 교재 창(판의 frameHello), 아니면 홈 액자·홈 창(2026-10-14 · 교재가 홈 액자째 넘어가던 때와 같은 보정). */
    function kbAt() { var p = phone() ? bookShown() : null; return p ? [p.el, p.kb] : [frameEl, appWin]; }
    var kbEl = frameEl;
    function send(h, top) {
      var w = kbAt()[1];
      if (!w || (h === lastH && top === lastTop)) return;
      lastH = h; lastTop = top;
      try { w.postMessage({ onf: 'kbH', h: h, top: top }, '*'); } catch (e) {}
    }

    function sync() {
      var vv = global.visualViewport;
      if (!vv || !frameEl) return;
      var el = kbAt()[0];
      if (el !== kbEl) { kbEl.style.transform = ''; kbEl = el; lastH = -1; lastTop = -1; }   // 📱 판이 보이거나 숨었다 — 옛 자리 밀림 풀고 새 자리에 다시 알린다

      // ① 앱을 화면에 붙인다(B4) — iOS 는 키보드가 뜬 동안 페이지 전체를 밀 수 있고,
      //    그러면 앱의 고정 요소(입력창·화살표)가 통째로 화면 밖으로 나간다. 밀린 만큼 되민다.
      //    ⚠️ 핀치줌 중엔 풀어라 — 줌 팬과 싸우면 화면이 손가락을 쫓아다닌다.
      var notZooming = Math.abs((vv.scale || 1) - 1) < 0.02;
      el.style.transform = (notZooming && vv.offsetTop > 0)
        ? 'translateY(' + vv.offsetTop + 'px)' : '';
      if (diagEl) diagEl.style.transform = el.style.transform;

      // ② 키보드를 잰다.
      //    ⛔ innerHeight 로 되짚지 마라(B3) — 크롬 iOS 는 키보드가 뜨면 주소창을 접어
      //      innerHeight 가 ~120px 커지는데 iframe 높이는 그대로다. 그 차이가 오차가 된다.
      //    ⛔ 아래끝(bottom) 기준으로 넘기지 마라(B6) — 앱은 구글 래퍼 안 중첩 iframe 이라
      //      아래끝이 ~40px 어긋난다. **위끝은 어긋나지 않는다.**
      var h = 0, kbTopInFrame = 0;
      if (notZooming) {
        var r = el.getBoundingClientRect();
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
      if (ev.data.onf === 'hist') { histMsg(ev); return; }   // 기록 칸 다리 — 위 자물쇠를 통과한 말만(아래 블록)
      if (ev && ev.data && ev.data.onf === 'frameHello') {
        appWin = ev.source; lastH = -1; lastTop = -1; sync();
      }
      /* 📖 홈의 노크(bookHello)에 「홈 안에서 교재 열기」를 할 줄 안다고 답한다(2026-10-12). 홈은 이 답을 받은 뒤에만 교재 링크를 가로챈다 —
         옛 껍데기(답이 없다)면 종전대로 교재 화면으로 넘어간다. ⛔ 키보드 노크(frameHello)와 섞지 않는다(appWin 을 안 바꾼다).
         targetOrigin 은 노크한 출처(브라우저가 채운 값 · 위 자물쇠를 지난 googleusercontent).
         📱 phone:1 = 폰 판(전체 화면 · 뒤로 = 숨김 · 아래 「폰 판」)도 할 줄 안다(2026-10-14) — 홈은 이 칸이 있을 때만 폰에서 가로챈다(옛 껍데기 = 종전대로 넘어감). */
      if (ev.data.onf === 'bookHello' && opts.bookSrc) { try { ev.source.postMessage({ onf: 'caps', book: 1, phone: opts.phone ? 1 : 0 }, ev.origin); } catch (eC) {} return; }
      if (ev.data.onf === 'openBook' && opts.bookSrc && typeof ev.data.href === 'string') { bookHome = ev.source; bookHomeOrigin = ev.origin; bookOpen(ev.data.href, ev.data.left); return; }
      /* 홈이 탭을 바꿨다 → 옆 판을 닫는다(2026-10-12 Peter 「창이 켜진 채 탭을 바꾸면 자동으로 꺼져야」) — bookClose 는 판 액자만 말한다(따로 둔 이름) */
      if (ev.data.onf === 'bookDismiss') { bookClose(); return; }   // 보이는 판만 숨긴다(없으면 아무 일 없음)
      /* 📖 홈이 「첫 교재를 미리 받아 줘」(2026-10-12 · 설계서 §1-5 · 10-13 숨긴 판) — 주소는 판과 같은 거르개(bookSrc — 교재만 · 아는 값만 · embed=1).
         · panel:1(홈이 판을 쓸 넓은 화면이라고 했다) → **숨긴 판**으로 미리 띄운다(아래 bookPre · 교재는 park=1 로 「대기」 — 접속 신호 0).
         · 아니면(폰) 종전대로 그 주소를 **한 번** GET 해 교재 서버 캐시만 데운다(봇 수업 전 데우기와 같은 길 · 쿠키 안 실음 · 한 주소 한 번). */
      if (ev.data.onf === 'bookWarm' && opts.bookSrc && typeof ev.data.href === 'string') { if (ev.data.panel === 1) bookPre(ev.data.href, ev.data.left); else bookWarm(ev.data.href); return; }
      /* 🌙 화면 색(Peter 2026-10-12 다크 모드) — 안쪽 홈이 알린다 · 틀·판 둘레·「불러오는 중」을 같은 색으로 · 다음에 열 때 머리 스크립트가 그리기 전에 쓴다. 아는 값만. */
      if (ev.data.onf === 'theme') { if (ev.data.v === 'dark' || ev.data.v === 'light') { document.documentElement.setAttribute('data-theme', ev.data.v); try { localStorage.setItem('onfTheme', ev.data.v); } catch (eT) {} themeTell(); } return; }
      if (ev.data.onf === 'themeAsk') { themeAsk(ev); return; }   // 🌙 폰에선 교재가 홈 액자째 넘어가 이 자리에서 묻는다
      // 탭 제목 — 앱(=GAS)만 학생 이름을 안다. 보이는 탭 제목은 **이 창**이 정하므로 받아서 세운다.
      //   위 오리진 검사를 이미 통과한 메시지다. 줄바꿈을 지우고 길이를 잘라 그대로 쓴다.
      if (ev && ev.data && ev.data.onf === 'title' && typeof ev.data.t === 'string') {
        var newTitle = ev.data.t.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);
        if (newTitle) document.title = newTitle;
      }
    });
    /* ═══ 기록 칸 다리 — 안쪽(GAS iframe)의 「뒤로 = 창 닫기」 기록 칸을 **여기(최상위 문서)** 에 만든다 (Peter 2026-10-01 「학생홈도 고쳐줘」) ═══
       ⛔ 왜: 아이폰 스와이프 뒤로는 이전 기록의 스냅샷을 덮개로 깔고, **메인 프레임**의 같은 문서 이동 신호가 오면 덮개를 걷는다.
         기록 칸을 가장 안쪽 iframe(GAS 샌드박스)에서 만들면 그 pop 이 서브프레임 이동이라 신호가 안 와 덮개(빈 화면)가 **3초 감시 타이머**까지 남았다
         (WebKit ViewGestureController 소스 확인 · 「하얀 화면 → 좀 뒤에 목록」 · **아이폰 실기기로 덮개 자체는 못 쟀다** — 프로토콜만 크롬·맥 Safari 로 봤다).
         선생님 껍데기(teacher/index.html 의 onf-hist 블록 `124496e`)와 **같은 처방·같은 모양**이다 — 거기 주석에 적힌 사고(Map 우회·go(-n) 전제·깊이 재읽기)를 통째로 가져왔다.
       ⛔ 선생님 껍데기와 **다른 점 하나**: 학생 화면엔 로그인 노크(`auth-please`)가 없다. 그래서 켜는 악수가 따로다 —
         안쪽이 먼저 `{onf:'hist', op:'hi'}` 로 자기를 알리고(부모가 먼저 쏘면 구글 래퍼가 버린다 — 위 주석), 여기서 `{onf:'hist-on'}` 으로 답한다.
         안쪽 어댑터는 그 답을 받아야 다리를 켠다(ONF_Shell_Js `_onfHistMsg`). 이 껍데기를 모르는 옛 안쪽은 `hi` 를 안 보내고, `hi` 를 보내도 옛 껍데기는 답이 없다 → 어느 쪽이든 **네이티브(종전)** 다.
       ⛔ 이 블록은 `appWin`·`frameHello` 를 **건드리지 않는다**(키보드 보정 배선 — 별도 변수 `histWin`/`histOrigin`). 받는 말은 위 출처 자물쇠(`_fromOurFrame` + googleusercontent)를 **통과한 뒤**에만 온다.
       ⛔ `hi` 는 **올 때마다** 창을 갈아 끼운다(「한 번 정한 창은 안 바꾼다」 빗장을 일부러 안 둔 위 주석과 같은 이유 — 안쪽이 다시 만들어지면 새 노크를 버려 다리가 죽은 창을 가리킨다).
         그 밖의 말(push·back·hello)은 **그 `hi` 로 정한 창·출처**에서 온 것만 받는다 → 옛 안쪽의 늦은 push 가 새 안쪽 뒤에 도착해도 버려진다.
       ⛔ 보낼 때 targetOrigin 은 `hi` 의 `ev.origin`(브라우저가 채운 값)뿐 — `'*'` 금지(기존 kbH 는 `'*'` 지만 새 말은 아니다).
       ⛔ 값 검증: op 는 hi|push|back|hello · id 는 [A-Za-z0-9]{1,40} · state 는 JSON 2KB 이하의 평범한 객체. 아니면 버린다.
       ⚠️ hello 의 go(-n) 은 「기록 맨 위 n 칸이 전부 우리 칸」이라는 **전제**에 선다 — 안쪽은 칸을 넣은 뒤 문서 이동을 하지 않고(같은 주소의 새로 읽기만) 우리는 우리 칸 밖에는 아무것도 안 쌓는다.
         `hideToken()` 의 replaceState 는 칸을 만들지 않으니 이 전제를 깨지 않는다.
       ⚠️ 알고 받아들인 한계: 껍데기 문서 자체가 다시 읽히면(새로고침·아이폰이 탭을 버렸다 복원) 죽은 칸 하나가 남아 첫 뒤로 1회가 같은 주소로 돌아가 다시 읽는다(종전과 같다 —
         아래 시작 줄은 표식만 지울 수 있고 칸은 못 없앤다). 안쪽만 다시 읽힐 땐 새 안쪽의 `hi`→`hist-on`→`hello` 로 죽은 칸을 치운다. */
    var histWin = null, histOrigin = '', histDepth = 0;   // 깊이 = 지금 기록에 쌓인 우리 칸 수(칸 state.n 에서 다시 읽는다)
    var HIST_ID = /^[A-Za-z0-9]{1,40}$/;
    function histSmall(st) {                              // JSON 으로 2KB 이하인 평범한 객체인가
      if (!st || Object.prototype.toString.call(st) !== '[object Object]') return false;
      try { return unescape(encodeURIComponent(JSON.stringify(st))).length <= 2048; } catch (e) { return false; }
    }
    function histMsg(ev) {
      var d = ev.data, s, n, flat;
      if (d.op === 'hi') {                                // 안쪽이 떴다 — 창을 (갈아) 정하고 다리를 켜라고 답한다
        /* ⛔ 위 기존 자물쇠는 **호스트 이름만** 본다(프로토콜·포트는 안 봄). 이 출처가 곧 hist-on·hist-pop 의 targetOrigin 이 되므로 여기서만 `https://<호스트>` 모양으로 한 번 더 좁힌다
           (검수 2026-10-01 — 구글이 서빙하는 GAS 래퍼 안이라 닿는 길은 없지만 값은 싸다). 기존 자물쇠 자체는 건드리지 않는다(키보드 보정·제목 배선).
           ⚠️ 어댑터를 끼운 창은 **껍데기당 하나**라고 본다 — `hi` 는 올 때마다 다리 창을 갈아 끼우므로 나중에 뜬 쪽이 가져간다(학생 화면은 한 번에 한 안쪽만 뜬다). */
        if (!/^https:\/\/[^\/:]+\.googleusercontent\.com$/.test(String(ev.origin))) return;
        histWin = ev.source; histOrigin = ev.origin;
        try { histWin.postMessage({ onf: 'hist-on' }, histOrigin); } catch (e) {}
        return;
      }
      if (!histWin || ev.source !== histWin || ev.origin !== histOrigin) return;   // 우리가 정한 그 창·출처만
      if (d.op === 'hello') {                             // 안쪽이 새로 떴다 — 옛 안쪽이 남긴 죽은 칸을 치운다(같은 문서 안 칸이라 조용히 빠진다)
        //   📱 판 칸이 맨 위면 안 치운다 — go(-n) 이 판 칸부터 걷는다(「맨 위 n 칸이 전부 홈 칸」 전제가 깨진다 · 죽은 홈 칸은 남는 한계)
        if (histDepth > 0 && !histRun()) { n = histDepth; histDepth = 0; try { history.go(-n); } catch (e) {} }
        return;
      }
      if ((d.op !== 'push' && d.op !== 'back') || typeof d.id !== 'string' || !HIST_ID.test(d.id)) return;
      if (d.op === 'push') {
        if (!histSmall(d.state)) return;
        /* ⛔ 받은 state 를 **JSON 으로 납작하게 만든 사본**으로만 넣는다 — 「JSON 2KB 이하」 상한이 Map·Set·Date 같은 JSON 으로 안 나오는 타입으로 우회되면
           pushState 의 구조화 복제가 덩어리째 기록 칸에 저장되고 popstate 마다 안쪽으로 되돌려 보낸다(선생님 껍데기 검수 2026-10-01). 평범한 JSON 값만 남긴다. */
        flat = null;
        try { flat = JSON.parse(JSON.stringify(d.state)); } catch (e) { return; }
        try { history.pushState({ onfHist: d.id, s: flat, n: histDepth + 1 }, ''); histDepth++; } catch (e) {}   // 주소 칸은 비운다
        return;
      }
      s = history.state;                                  // back — 맨 위가 그 id 일 때만(남의 칸 보호 · 📱 판 칸·판 안쪽 칸은 홈 것이 아니다)
      if (s && s.onfHist === d.id && !bookOwner(s)) history.back();
    }
    global.addEventListener('popstate', function () {
      var s = history.state, h = (s && s.onfHist) ? s : null;
      histDepth = (h || bookOwner(s)) ? Math.max(0, Number(s.n) || 0) : 0;   // 📱 판 칸의 n = 그 아래 홈 칸 수
      bookPop(s);                                         // 📱 폰 판 — 맨 위 칸 주인 판을 보이거나(판 칸) 숨긴다(홈 칸·바닥)
      if (!histWin || bookOwner(s)) return;               // `hi` 전엔 알릴 안쪽이 없다 · 📱 판 칸이 맨 위면 홈은 안 바뀌었다(폰 판 칸은 늘 홈 칸 위에 쌓인다)
      try { histWin.postMessage({ onf: 'hist-pop', id: h ? h.onfHist : '', s: h ? (h.s || null) : null }, histOrigin); } catch (e) {}   // '*' 금지
    });
    /* ═══ 📖 교재 판(2026-10-12 Peter 홈 리디자인 3단계 · PC) ═══
       홈 액자 옆(오른쪽)에 교재 액자를 **하나 더** 띄운다 — GAS 안 GAS 액자를 만들지 않는다(그건 빈 칸이 된다 · 설계서 §3-1).
       ⛔ 교재 액자의 말은 **그 액자에서 온 것만**(아래 자물쇠) 받는다. 홈 액자 자물쇠(위 frameEl)는 그대로라 교재 액자의 기록 다리(hist)·제목(title)·노크(frameHello)는 **홈 것으로는 안 받는다**
          (홈 다리 histWin·키보드 창 appWin 을 안 바꾼다). 📱 폰 판(아래)만 판마다 따로 받는다 — 판 안쪽 기록 다리(p.hw) · 키보드 창(p.kb). 제목은 늘 홈 것.
       ⛔ unload 처리기를 달지 마라(bfcache 「뒤로」를 막는다).
       ⚠️ 주소를 만드는 일(아는 값만 · embed=1)은 index.html 의 opts.bookSrc 가 한다 — 못 만들면 null(안 연다).
       ═══ 숨긴 판(2026-10-13 Peter 「닫았다가 열면 또 불러오고 … 미리 불러와서 기다리는 시간이 아예 없게」) ═══ ⚠️ 쌍둥이: teacher/index.html onf-book 블록
       · 닫으면(✕ · Esc · 홈 탭 바꿈) 지우지 않고 **숨긴다**(.park = visibility:hidden — 초점·누르기도 안 간다). 같은 주소를 다시 열면 그 판을 그대로 보인다(0초 · 전체 화면이었으면 그대로).
       · 다른 주소(다른 회차·교재 · 판 안 교재↔⭐ 내 문장)는 **새 판** — 보이던 판은 숨긴다(돌아가면 0초).
         ponytail: 숨긴 판에 「그 회차로 바꿔」는 안 한다(짧은 주소→회차를 껍데기가 모른다) — 다른 회차는 새로 받는다.
         단 view(review · cards)만 다른 주소는 그 view 를 할 줄 아는 판이면 같은 판에 「열어」만 보낸다(10-14 · 아래 bookLike · bookView).
       · 홈이 bookWarm 에 panel:1 을 실으면 그 교재를 **숨긴 판으로 미리** 띄운다(bookPre · 주소에 park=1). 자리가 차면 가장 오래 안 쓴 **숨긴** 판을 비키고 띄운다(10-14 · 보이는 판은 안 건드린다 · 종전엔 안 띄웠다).
       ⛔ 숨긴 판의 교재는 「대기」 — 접속 표시·옛 메모 이관·요약본 다시 짓기를 안 보낸다(Ownify ONF_PARK). 보일 때 {onf:'bookPark', on:false} · 숨길 때 {on:true}.
          말은 교재가 먼저 건 bookHi 의 그 창·그 출처로만('*' 금지 · 부모가 먼저 쏘면 구글 래퍼가 버린다). bookHi 가 늦게 오면 그때 지금 상태를 답한다.
          bookHi 를 안 한 판(옛 교재 · 아직 뜨는 중)은 숨기지 않고 **지운다** — 대기를 못 알아듣는 교재를 숨겨 두면 선생님 화면에 접속 표시가 남는다.
       ⛔ 숨긴 판은 아무 말도 못 가로챈다 — bookClose·bookFull·openBook 은 **보이는 판**에서 온 것만 · Esc·bookDismiss 는 보이는 판만 숨긴다. themeAsk 는 숨긴 판도 답한다(보일 때 색이 맞게).
       ⚠️ 판은 BOOK_MAX(3 · 10-14 Peter 「미리 띄우는 교재 셋」 · 보이는 판 하나 + 숨긴 판 둘) 개까지 — 넘으면 가장 오래 안 쓴 숨긴 판부터 지운다(bookRoom) · 숨긴 채 BOOK_IDLE_MS 지나면 지운다(메모리). 지울 땐 액자째(종전 닫기와 같다). */
    var BOOK_MAX = 3, BOOK_IDLE_MS = 30 * 60 * 1000;
    var books = [], bookHome = null, bookHomeOrigin = '';   // books = 판들(오래 안 쓴 것이 앞) · { box, el, src, key, parked, win, origin, views, kb, hw, ho, idle, left }
    var warmed = {};
    /* ═══ 📱 폰 판(2026-10-14 Peter 「메모리를 잡아먹지 않으면서 미리 불러와서 로딩 전혀 없이 열고 되돌리고」 → 「폰 숨긴 판 1개」) ═══
       폰 = 홈의 onfBookWide 가 아닌 화면 — **같은 물음**(BOOK_WIDE_Q · Ownify ONF_Home_Html onfBookWide 와 같이 고쳐라). 홈 액자가 화면 폭 그대로라 둘이 같은 답을 낸다.
       종전 폰은 판 0 — 교재 링크를 누르면 껍데기째 교재 주소로 넘어가 매번 구글 doGet(≈2~3초)을 기다렸다. 이제 홈이 caps phone:1 을 받으면 폰에서도 openBook 을 보낸다.
       · 판은 늘 **전체 화면**(<html class="onf-ph"> · onf-ui.css) — 홈 액자와 같은 상자라 안전 영역(노치·홈 막대)은 안쪽 교재가 종전(홈 액자째 넘어갈 때)대로 맞춘다. 「창 모드」(.full)는 안 먹는다.
       · 판을 보이면 **최상위** 기록에 판 칸 {onfBook: 번호, n: 그 아래 홈 칸 수, bd: 판 칸 줄 깊이} 하나(histBook · 맨 위가 이미 그 판 칸이면 안 넣음).
         뒤로(안드로이드)·스와이프(아이폰)로 그 칸이 빠지면 popstate → 판을 **숨긴다**(지우지 않음 · 다시 누르면 0초). 판 안에서 다른 교재·내 문장을 열면 그 위에 새 판 칸 — 뒤로 = 앞 판(종전 폰의 「뒤로」와 같은 차례).
         ✕·홈 링크(bookClose)는 숨기고 판 칸 줄을 history.go(-bd) 로 걷는다(기록이 안 쌓이게) — bd 는 맨 위에서 이어진 판 칸만 센다 → 홈 칸(기록 다리 onfHist)은 안 걷는다.
       · 판 안 창(카드·퍼즐·복습·💡 응용 — Ownify onfHistWin)의 「뒤로 = 창 닫기」 칸도 **최상위**에 — 판마다 따로 다리(p.hw · 홈 다리 histWin 은 안 바꾼다).
         ⛔ 액자 안 pushState 에 기대지 마라 — 아이폰 스와이프가 액자 안 칸을 되돌리면 3초 덮개가 남는다(위 기록 칸 다리 주석). 판 안쪽 칸 = {onfHist, s, n, b: 판 번호, bd}.
         다리는 노크(hist hi) 때 폰이면 켠다 — PC 판은 종전 그대로(액자 안 기록). 숨긴 판은 칸을 못 민다(보이지 않는 칸이 뒤로를 먹는다).
       · 판 번호 = bookSrcs 자리(1부터) — 기록 칸엔 판 주소(토큰이 든다)를 안 넣는다. 지운 판(30분 · 자리)의 칸으로 돌아오면 그 주소로 다시 받는다.
       · 판 자리 2(BOOK_PHONE — 보이는 판 하나 + 숨긴 판 하나 · 숨긴 판 ≈15~20MB) · 키보드 높이·밀림 보정은 보이는 판에(kbAt).
       · 폭이 바뀌어 폰↔PC 가 바뀌면 보이는 판은 그대로 두고 모양만 바꾼다 — PC→폰이면 판 칸을 넣는다(뒤로 = 숨김) · 폰→PC 면 남은 판 칸은 ✕ 가 걷는다(PC 의 뒤로는 판을 안 건드린다).
       ⚠️ 알고 받아들인 한계: 판 액자가 스스로 다시 읽히면(새 안쪽의 hello) 옛 판 안쪽 칸은 안 치운다 — 그 칸으로 돌아오면 모르는 칸(안쪽 어댑터가 맨 위로만 쥔다) · 뒤로 한 번이 헛돈다.
          Chrome 길게 누른 뒤로 목록처럼 여러 칸을 한 번에 건너면 중간 판의 안쪽 창은 안 닫힐 수 있다(그 판을 다시 보이면 창이 떠 있다). */
    var BOOK_PHONE = 2, BOOK_WIDE_Q = '(min-width:1100px) and (hover:hover) and (pointer:fine)';
    var wideMq = null, bookSrcs = [];
    try { wideMq = global.matchMedia ? global.matchMedia(BOOK_WIDE_Q) : null; } catch (eM) {}
    /* ⛔ opts.phone(index.html 스위치 · 2026-10-16 기본 켬 · 주소 phonepanel=0 → 그 기기에서 끔)이 없으면 폰 판 전부 안 켠다.
       꺼져 있으면 caps 에 phone 0 → 홈이 폰에서 안 가로챈다(종전). */
    function phone() { return !!(opts.phone && wideMq && !wideMq.matches); }   // matchMedia 가 없으면 PC(종전)
    function bookMax() { return phone() ? BOOK_PHONE : BOOK_MAX; }
    function bookKey(src) { var i = bookSrcs.indexOf(src); if (i < 0) i = bookSrcs.push(src) - 1; return i + 1; }
    function histTop() { try { return history.state; } catch (e) { return null; } }
    function bookOwner(s) { return (s && (s.onfBook || s.b)) || 0; }           // 판 칸·판 안쪽 칸이면 그 판 번호
    function histRun() { var t = histTop(); return bookOwner(t) ? Math.max(0, Number(t.bd) || 0) : 0; }   // 맨 위에서 이어진 판 칸 수
    function histBook(p) {
      if (bookOwner(histTop()) === p.key) return;      // 맨 위가 이미 이 판 칸(뒤로로 돌아온 판 · 판 안 창 칸 위)
      try { history.pushState({ onfBook: p.key, n: histDepth, bd: histRun() + 1 }, ''); } catch (e) {}   // 주소 칸은 비운다
    }
    /* 판 안쪽 기록 다리(폰) — 홈 다리(histMsg)와 같은 약속·같은 검증(op · id · 2KB · JSON 사본). hello 는 안 받는다(위 한계). */
    function bookHist(p, ev) {
      var d = ev.data, t, flat;
      if (d.op === 'hi') {
        if (!phone() || !/^https:\/\/[^\/:]+\.googleusercontent\.com$/.test(String(ev.origin))) return;
        p.hw = ev.source; p.ho = ev.origin;
        try { p.hw.postMessage({ onf: 'hist-on' }, p.ho); } catch (e) {}
        return;
      }
      if (!p.hw || ev.source !== p.hw || ev.origin !== p.ho || typeof d.id !== 'string' || !HIST_ID.test(d.id)) return;
      t = histTop();
      if (d.op === 'push' && !p.parked && histSmall(d.state)) {
        try { flat = JSON.parse(JSON.stringify(d.state)); history.pushState({ onfHist: d.id, s: flat, n: histDepth, b: p.key, bd: histRun() + 1 }, ''); } catch (e) {}
      } else if (d.op === 'back' && t && t.onfHist === d.id && t.b === p.key) history.back();   // 맨 위가 이 판의 그 칸일 때만(남의 칸 보호)
    }
    /* 기록 칸이 빠졌다(뒤로·앞으로) — 폰이면 맨 위 칸 주인 판을 보이고(없어졌으면 다시 받음) · 홈 칸·바닥이면 보이는 판을 숨긴다.
       판 안쪽엔 그 판 맨 위 칸을 알린다(판 칸이면 '' = 안쪽 칸 없음) · 홈 칸·바닥이면 다리 있는 판 전부에 '' (판 칸은 늘 홈 칸 위라 남은 판 칸이 없다). PC 는 판을 안 보이고 안 숨긴다. */
    function bookPop(s) {
      var k = bookOwner(s), src = k ? bookSrcs[k - 1] : '', p = src ? bookFind(src) : null;
      if (phone()) {
        if (src && !p) p = bookMake(src, false);
        if (p) bookShow(p); else bookHide();
      }
      (p ? [p] : k ? [] : books).forEach(function (q) {
        if (q.hw) { try { q.hw.postMessage({ onf: 'hist-pop', id: p && s.onfHist ? s.onfHist : '', s: p && s.onfHist ? (s.s || null) : null }, q.ho); } catch (e) {} }
      });
    }
    function bookWarm(href) {
      var src = opts.bookSrc(href);
      if (!src || warmed[src] || typeof global.fetch !== 'function') return;
      warmed[src] = 1;
      try { global.fetch(src, { mode: 'no-cors', credentials: 'omit', cache: 'no-store' }).catch(function () {}); } catch (e) {}
    }
    function bookShown() { for (var i = 0; i < books.length; i++) if (!books[i].parked) return books[i]; return null; }
    function bookFind(src) { for (var i = 0; i < books.length; i++) if (books[i].src === src) return books[i]; return null; }
    /* 📖 view 만 다른 주소는 같은 판에서 연다(2026-10-14 Peter 「미리 띄워 둔 내 문장 판에 '복습/카드 열어'를 전달해서, 다시 안 불러오고 바로 열기」).
       view 는 「열자마자 무엇을 띄울까」뿐이다 — 홈 [복습 시작] = ⭐ 내 문장 view=review(🔁 오늘 복습) · 「카드 시작」 = 교재 view=cards(🗂️ 회차 덱).
       종전엔 주소가 달라 판을 하나 새로 받았다(라이브 [복습 시작] ≈4.4초 — 미리 띄운 내 문장 판이 옆에 숨어 있는데도).
       · 그 view 를 할 줄 안다고 노크(bookHi views)한 판이 있으면 그 판을 보이고 {onf:'bookView', view} 를 보낸다(새로 안 받음 · 페이지가 view 로 연 것과 같은 길로 연다).
         주소까지 같은 판에도 보낸다 — 닫아 둔 복습을 [복습 시작]으로 다시 누르면 판만 보이고 복습은 안 열렸다(복습이 떠 있으면 페이지가 그대로 둔다).
       · 할 줄 아는 판이 없으면(옛 교재 · 노크 전 · 미리 띄운 판이 아닌 교재) 종전대로 그 주소로 새 판.
       ⛔ views 는 그 판 교재가 노크로 말한 값 그대로(글자 하나하나 같아야 맞다 · 페이지는 review·cards·line 만 안다) · bookView 는 bookHi 의 그 창·그 출처로만('*' 금지 — bookPark 와 같다).
       📖 line 도 같은 길(검수 A3-5 2026-10-16) — 홈 「교재」 블럭 대사 줄·오늘의 표현·선생님 댓글·내 문장 「교재에서 보기」는 같은 교재 주소에 line=N 만 붙는다.
         종전엔 주소가 달라 새 판을 받았고, 판이 넷이 되어 가장 오래 숨긴 판 = **미리 띄운 그 교재**가 쫓겨났다(기다림 = 교재 통째).
         'line' 을 할 줄 안다고 노크한 판이면 그 판에 {onf:'bookView', line: N} — 교재가 &line= 으로 연 것과 같은 길(onfJumpOnce)로 굴린다. 줄은 숫자만(아니면 줄로 안 친다 = 종전 새 판). */
    function bookAsk(src) { try { var q = new URL(src).searchParams, l = q.get('line') || ''; return { view: q.get('view') || '', line: /^\d{1,7}$/.test(l) ? Number(l) : 0 }; } catch (e) { return { view: '', line: 0 }; } }
    function bookBase(src) { try { var u = new URL(src); u.searchParams.delete('view'); u.searchParams.delete('line'); return u.href; } catch (e) { return src; } }
    function bookCan(p, a) { return !!(p && (a.view || a.line) && (!a.view || p.views.indexOf(a.view) >= 0) && (!a.line || p.views.indexOf('line') >= 0)); }   // views 는 노크(bookHi)가 채운다 — 노크 전엔 []
    /* 아무것도 안 묻는 열기([이어서 하기])도 **줄 링크로 연 판**(view 없음)이면 그 판(반박 검토 🟡4) — 판은 이미 그 교재다 · 할 말이 없으니 보이기만.
       ⛔ view 로 연 판(덱·복습)은 안 맡긴다 — 열자마자 그 창을 띄운 판이다(위 「view 없는 보통 열기」 검사). */
    function bookLike(src, a) {
      var b = bookBase(src), q;
      for (var i = 0; i < books.length; i++) { q = books[i]; if (bookBase(q.src) === b && (bookCan(q, a) || (!a.view && !a.line && !bookAsk(q.src).view))) return q; }
      return null;
    }
    /* left = 홈 왼쪽 메뉴의 오른쪽 끝(px · 홈이 잰다) — 있으면 판이 그 오른쪽부터 덮는다(2026-10-12 Peter 「창 모드일 때는 맨 왼쪽 탭만 보이게」).
       없으면(옛 홈 · 판 안에서 갈아 끼울 때) 종전 자리 그대로. ⚠️ 숫자·화면 폭 60% 안만 믿는다(남의 값으로 판이 화면 밖으로 가지 않게). */
    function bookPlace(p, left) {
      if (typeof left !== 'number' || !isFinite(left)) return;
      var okL = left > 0 && left < (global.innerWidth || 0) * 0.6;
      p.left = left;
      p.box.classList.toggle('beside', okL);
      if (okL) p.box.style.setProperty('--bl', Math.round(left) + 'px');
    }
    function bookMake(src, parked) {
      var p = { box: document.createElement('div'), el: document.createElement('iframe'), src: src, key: bookKey(src), parked: parked, win: null, origin: '', views: [], kb: null, hw: null, ho: '', idle: null, left: null };
      p.box.className = 'onf-bookpanel';
      if (parked) p.box.classList.add('park');
      p.el.setAttribute('allow', 'clipboard-write; microphone');
      p.el.setAttribute('title', '교재');
      p.box.appendChild(p.el);
      /* 액자 뒤에 「불러오는 중」(2026-10-12 · 홈 첫 화면 .onf-wait 와 같은 것) — 구글이 화면을 그리면 액자가 덮는다.
         없으면 판이 9~12초 흰 빈칸이었다(라이브 내 문장 실측). ⚠️ 액자가 kids[0] 이어야 한다(검사). */
      var wait = document.createElement('div');
      wait.className = 'onf-wait';
      wait.innerHTML = '<div class="onf-spin"></div><span>불러오는 중</span>';
      p.box.appendChild(wait);
      document.body.appendChild(p.box);
      if (parked) p.idle = setTimeout(function () { bookDrop(p); }, BOOK_IDLE_MS);
      p.el.src = parked ? src + (src.indexOf('?') < 0 ? '?' : '&') + 'park=1' : src;
      books.push(p);
      return p;
    }
    function bookDrop(p) {
      var i = books.indexOf(p);
      if (i < 0) return;
      books.splice(i, 1);
      if (p.idle) clearTimeout(p.idle);
      if (p.box.parentNode) p.box.parentNode.removeChild(p.box);
    }
    function bookTell(p) { if (p.win) { try { p.win.postMessage({ onf: 'bookPark', on: p.parked }, p.origin); } catch (e) {} } }
    function bookPark(p, on) {
      if (on && !p.win) { bookDrop(p); return; }   // 대기를 모르는 판(옛 교재 · 아직 뜨는 중)은 숨기지 않는다
      p.parked = on;
      p.box.classList.toggle('park', on);
      if (p.idle) { clearTimeout(p.idle); p.idle = null; }
      if (on) { p.idle = setTimeout(function () { bookDrop(p); }, BOOK_IDLE_MS); try { p.el.blur(); } catch (e) {} }
      bookTell(p);
    }
    /* p 를 보이고 보이던 판은 숨긴다 · 폰이면 판 칸(histBook) · 키보드 보정 자리(sync). ⚠️ 새 판(bookMake 가 보이게 만든)이면 books 끝이라 bookShown 은 보이던 옛 판을 먼저 찾는다. */
    function bookShow(p, left) {
      var cur = bookShown();
      if (cur && cur !== p) bookPark(cur, true);
      bookPlace(p, (typeof left === 'number') ? left : (cur ? cur.left : null));   // 판 안 갈아 끼우기(left 없음)는 보이던 판 자리 그대로
      if (p.parked) bookPark(p, false);
      books.splice(books.indexOf(p), 1); books.push(p);   // 가장 최근
      bookRoom(bookMax());
      if (phone()) histBook(p);
      sync();
    }
    function bookOpen(href, left) {
      var src = opts.bookSrc(href);
      if (!src) return;
      var a = bookAsk(src), p = bookFind(src) || bookLike(src, a) || bookMake(src, false), m = { onf: 'bookView' };   // 📖 view·line 만 다른 판이 할 줄 알면 그 판(위 bookLike)
      bookShow(p, left);
      if (a.view) m.view = a.view;
      if (a.line) m.line = a.line;
      if (bookCan(p, a)) { try { p.win.postMessage(m, p.origin); } catch (e) {} }   // 보인다(bookPark) 다음에 — 페이지가 「보임」 손질 뒤 연다
    }
    /* 판이 n 개를 넘으면 가장 오래 안 쓴 **숨긴** 판부터 지운다 — 보이는 판은 안 건드린다(books 는 오래 안 쓴 것이 앞). */
    function bookRoom(n) { for (var i = 0; books.length > n && i < books.length; ) { if (books[i].parked) bookDrop(books[i]); else i++; } }
    function bookPre(href, left) {
      var src = opts.bookSrc(href);
      if (!src || bookFind(src)) return;
      bookRoom(bookMax() - 1);   // 자리가 차면 가장 오래 안 쓴 숨긴 판을 비킨다(2026-10-14 Peter 「미리 띄우는 교재 셋」 — 종전엔 안 띄웠다 · 📱 폰은 자리 2)
      bookPlace(bookMake(src, true), left);
    }
    /* 🌙 교재(다크 모드 2단계 · 2026-10-13)가 「무슨 색?」(themeAsk) → 지금 틀 색을 답하고, 홈이 색을 바꾸면 물었던 창에도 알린다.
       교재는 따르기만 한다(색을 알리지 않는다) — 선생님 홈처럼 액자 저장소가 다른 곳에서 연 교재도 홈과 같은 색이 된다.
       받는 곳 = 물은 그 창·그 출처(위 자물쇠를 지난 googleusercontent · '*' 금지) · 최근 넷만 기억. */
    var themeAskers = [];
    function themeNow() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
    function themeAsk(ev) {
      try { ev.source.postMessage({ onf: 'theme', v: themeNow() }, ev.origin); } catch (e) {}
      themeAskers = themeAskers.filter(function (a) { return a.w !== ev.source; }).concat([{ w: ev.source, o: ev.origin }]).slice(-4);
    }
    function themeTell() { themeAskers.forEach(function (a) { try { a.w.postMessage({ onf: 'theme', v: themeNow() }, a.o); } catch (e) {} }); }
    /* 닫으면(숨기면) 판을 연 홈에 「닫혔다」를 알린다(2026-10-12) — 홈이 교재 카드 「% 채움」을 다시 읽는다(교재에서 쓴 만큼).
       ⚠️ 받는 곳 = openBook 을 보낸 그 창 · 그 출처(위 자물쇠를 지난 googleusercontent) — '*' 금지. 옛 홈은 이 말을 모르니 그냥 버린다. */
    function bookHide() {
      var p = bookShown();
      if (!p) return false;
      bookPark(p, true);
      if (bookHome && bookHomeOrigin) { try { bookHome.postMessage({ onf: 'bookClosed' }, bookHomeOrigin); } catch (e) {} }
      sync();
      return true;
    }
    /* ✕·Esc·홈 링크·홈 탭 바꿈 — 숨기고, 📱 맨 위에 판 칸 줄이 있으면 걷는다(뒤로로 닫은 것과 같은 기록 · 뒤따르는 popstate 는 숨길 판이 없어 알림만). PC 는 판 칸이 없다(폰에서 넓힌 창만). */
    function bookClose() {
      if (!bookHide()) return;
      var r = histRun();
      if (r > 0) { try { history.go(-r); } catch (e) {} }
    }
    global.addEventListener('message', function (ev) {
      var p = null, i;
      try {
        if (!ev || !ev.data || !ev.source) return;
        for (i = 0; i < books.length && !p; i++) if (_fromOurFrame(ev.source, books[i].el)) p = books[i];
        if (!p) return;
        if (!/(^|\.)googleusercontent\.com$/.test(new URL(ev.origin).hostname)) return;
      } catch (e) { return; }
      var d = ev.data;
      /* 교재의 노크 — 이 판의 교재 창·출처를 적고 지금 상태(숨김/보임)를 답한다. 출처는 hist 다리와 같은 모양으로 한 번 더 좁힌다(답의 targetOrigin 이 된다). */
      if (d.onf === 'bookHi') {
        if (!/^https:\/\/[^\/:]+\.googleusercontent\.com$/.test(String(ev.origin))) return;
        p.win = ev.source; p.origin = ev.origin;
        p.views = typeof d.views === 'string' ? d.views.split(',') : [];   // 📖 할 줄 아는 view(위 bookLike) — 옛 교재는 안 싣는다 = 없음
        bookTell(p);
        return;
      }
      if (d.onf === 'themeAsk') { themeAsk(ev); return; }   // 🌙 판 안 교재가 묻는다(2단계) — 숨긴 판도(보일 때 색이 맞게)
      /* 📱 판 안쪽 기록 다리(폰 · 위 bookHist — 숨긴 판의 노크도 받는다: 미리 띄운 판은 숨긴 채 뜬다) · 키보드 노크 = 이 판의 키보드 높이 받는 창(kbAt) */
      if (d.onf === 'hist') { bookHist(p, ev); return; }
      if (d.onf === 'frameHello') { p.kb = ev.source; lastH = -1; lastTop = -1; sync(); return; }
      if (p.parked) return;                                 // ⛔ 숨긴 판은 닫기·전체·갈아 끼우기를 못 부른다
      if (d.onf === 'bookClose') bookClose();
      else if (d.onf === 'bookFull') p.box.classList.toggle('full', !!d.on);
      /* 판 안에서 교재 ↔ ⭐ 내 문장을 오갈 때(2026-10-12) — 판만 바꾼다(홈째 넘어가면 「뒤로」에 홈을 다시 읽는다) · 10-13 부터 보이던 판은 숨기고 새 판(돌아가면 0초).
         ⚠️ 주소는 홈에서 온 것과 같은 거르개(opts.bookSrc)를 지난다 — 못 만들면 그대로 둔다. */
      else if (d.onf === 'openBook' && typeof d.href === 'string') bookOpen(d.href);
    });
    global.addEventListener('keydown', function (e) { if (e.key === 'Escape') bookClose(); });   // 껍데기에 초점이 있을 때만 닿는다(액자 안 키는 [✕]) · 보이는 판만(숨긴 판은 Esc 를 안 먹는다)

    /* 껍데기가 다시 읽힌 채 남은 표식만 지운다. ⚠️ `hideToken()`(index.html 이 mount 보다 먼저 부른다)의 `replaceState(null, …)` 가 **주소에 ?t= 가 있던 때**는 이미 state 를 null 로 만들었다 —
       그땐 아래가 할 일이 없고(표식이 없다), 표식이 남은 것은 ?t= 가 없는 다시 읽기(새로고침)뿐이다. 둘은 겹치지 않는다. url 인자를 안 주므로 hideToken 이 지운 주소를 되돌리지도 않는다. */
    try { if (history.state && (history.state.onfHist || history.state.onfBook)) history.replaceState(null, ''); } catch (e) {}

    /* 📱 폰 ↔ PC(폭이 바뀜 · 위 「폰 판」) — 모양(<html class="onf-ph">)·자리 수를 맞추고, 폰이 되면 보이는 판에 판 칸(뒤로 = 숨김). 옛 사파리는 addListener 뿐. */
    function bookMode() {
      try { document.documentElement.classList.toggle('onf-ph', phone()); } catch (e) {}
      var p = bookShown();
      if (p && phone()) histBook(p);
      bookRoom(bookMax());
      sync();
    }
    if (wideMq) {
      bookMode();
      try { wideMq.addEventListener('change', bookMode); } catch (e) { try { wideMq.addListener(bookMode); } catch (e2) {} }
    }

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
