/* ONF 액자(shell) 공통 — 2026-08-06
 *
 * 이 파일이 하는 일 여섯. 여섯 다 **최상위 창만 할 수 있는 일**이라 여기 있다.
 *   1) 주소의 ?t=<토큰> 을 이 도메인에 저장한다 (다음부턴 주소 없이도 열린다)
 *   2) 구글 앱스스크립트 웹앱을 iframe 으로 띄운다 → "이 애플리케이션은 …" 배너가 안 뜬다
 *   3) 키보드 높이를 재서 iframe 안 앱에 넘긴다 (앱은 iframe 안이라 자기가 못 잰다 — MDN)
 *   4) iOS 가 페이지를 통째로 밀 때(pan) 앱을 화면에 도로 붙인다
 *   5) 안쪽 「뒤로 = 창 닫기」 기록 칸을 이 최상위 문서에 만들어 준다 — 폰 뒤로 스와이프의 하얀 덮개 (mount 안 「기록 칸 다리」)
 *   6) 구글 계정이 여러 개 로그인된 크롬에서 학생 exec 가 구글 오류 화면이면 credentialless 액자로 한 번 더 연다 (openExec · 선생님 판도 쓴다)
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
  /* 📄 PDF 저장 이름(Peter 2026-10-23 「Ownify 선생님 → ONF_영어이름(한글이름)_yymmdd(요일)」) — 크롬은 「PDF 로 저장」 이름을 **탭 제목**에서 가져온다.
     교재가 인쇄하는 동안만 이름을 바꿔 달라고 한다(printTitle · t:'' = 되돌림 · 교재 executeIframePrint). 받는 쪽은 홈 액자·보이는 판 둘 다(아래 두 message 자리).
     ⚠️ 첫 바꿈 때의 제목만 적어 둔다 — 인쇄를 두 번 눌러도 되돌릴 곳은 처음 제목이다. */
  var printOld = null;
  function printTitle(t) {
    if (typeof t !== 'string') return;
    t = t.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);
    if (t) { if (printOld === null) printOld = document.title; document.title = t; }
    else if (printOld !== null) { document.title = printOld; printOld = null; }
  }
  function _fromOurFrame(win, frameEl) {
    var w = win, target = frameEl && frameEl.contentWindow;
    if (!w || !target) return false;
    for (var i = 0; i < 8 && w; i++) {
      if (w === target) return true;
      try { w = (w.parent && w.parent !== w) ? w.parent : null; } catch (e) { return false; }
    }
    return false;
  }

  /* ═══ 🔐 구글 계정이 여러 개 로그인된 크롬 — 학생 exec 우회 (2026-10-16 Peter 「우회 주소도 시험해봐」 → 시험 성공) ═══
   *   한 브라우저에 구글 계정이 여럿이면 `/macros/s/<id>/exec` 가 `/macros/u/N/…` 로 튀어 구글 드라이브 오류 화면
   *   (「Sorry, unable to open the file at this time」)이 뜬다 — 우리 앱이 아니라 Apps Script 의 여러 계정 버그다
   *   (`authuser=0`·`/u/0/`·`/u/1/` 도 같은 오류 · 기록 ONF_Archive 웹-앱/ONF_공유웹앱-접근권한 「원인 ②」).
   *   `<iframe credentialless>`(크롬·엣지)는 쿠키 없이 열어 안 튄다 — Peter 의 여러 계정 크롬에서 우리 화면이 떴다(2026-10-16 실측).
   *   · 판별: 다 읽힌 뒤(load) 그 문서의 자식 프레임 수(`contentWindow.length` — 교차 출처여도 읽힌다).
   *     정상 GAS 바깥 문서는 샌드박스 액자(sandboxFrame)를 **HTML 에 박아 두어** 1 · 구글 오류 화면은 0(Peter 실측 · curl 로 박힌 것 확인).
   *     0 이면 CL_GRACE 만큼 더 본다 — 그 사이 그 액자 후손의 말(노크)이 오거나 자식이 생기면 산 화면(구글이 래퍼를 늦게 그리게 바뀌어도 안 속게).
   *   · 막혔으면 같은 주소를 credentialless 로 **한 번** 더 — `location.replace`(src 를 다시 넣으면 기록 칸이 하나 쌓여 기록 다리의 go(-n) 전제가 깨진다).
   *     다시 열기 자체는 늘 한다(구글 일시 오류도 이걸로 구한다).
   *   · 기억은 **「두 번 걸리면」**(반박 검토 🟠1 2026-10-16) — 계정 하나 학생도 구글 일시 오류(동시 실행 한도 등 · 자식 0 화면) 한 번이면 막힌 꼴이다.
   *     그걸로 7일 credentialless 면 아래 대가(오프라인 백업·홈 첫 화면 사본·사전 사본)를 7일 낸다. 그래서
   *       첫 우회 성공 = onfClTry(시각)만 · 다음 열기에서 보통이 **또** 막혀 우회가 되면 그때 onfCl(CL_MS) · 그 사이 보통으로 뜨면 onfClTry 를 지운다(잇달아야 두 번).
   *     기억을 정하는 건 **홈 액자(mount · keep)** 뿐 — 판(숨긴 미리 판 포함)은 읽기만 한다(학생이 안 본 미리 판 하나의 오류로 기기 전체가 바뀌지 않게).
   *     같은 페이지 안에선 홈이든 판이든 우회로 떴으면(clPage · 저장 안 함) 뒤 판은 처음부터 credentialless — 첫 방문 여러 계정 학생·여러 계정 선생님(판만 학생 exec)이
   *     판마다 오류 화면 + 여유를 안 거친다(재확인 T2). 저장을 안 하니 숨긴 판 하나의 일시 오류는 그 페이지에서 끝난다(R3).
   *     기억 시각은 **안 늘린다** — CL_MS 마다 보통으로 다시 재 본다. 기억으로 연 credentialless 가 안 되면 홈은 기억을 버리고 보통으로 한 번(판은 기억을 안 건드리고 보통으로만).
   *   · 그래도 안 되면 구글 영어 오류를 걷고(액자 visibility) 뒤의 「불러오는 중」 자리에 우리 말 — **연결 안내 하나**(원인을 단정하지 않는다):
   *     credentialless 까지 해 봤으면 쿠키를 안 실었으니 여러 계정 탓이 아니고, credentialless 를 모르는 사파리·iOS·파이어폭스는 끼운 액자에 구글 쿠키를
   *     애초에 안 실어(ITP · 쿠키 나눔) 이 버그가 거의 없다(반박 검토 🟡2 — 그 브라우저의 구글 일시 오류에 「여러 계정」은 틀린 말). 시크릿 창은 덤 한 마디.
   *     홈엔 [다시 열기](새로고침) · 판엔 [닫기](교재가 안 떴으니 교재의 ✕ 도 없다) — 못 연 판은 다시 열면 지우고 새로 받는다(bookShow · 🟡4).
   *   ⛔ 대가: credentialless 액자 안 저장소(localStorage·IndexedDB·쿠키)는 **이 페이지가 닫히거나 새로고침되면 사라진다** —
   *     교재 오프라인 백업(저장 못 한 수정)·사전 기기 사본·테마·카드 크기 고름이 안 남는다. 교재 저장 실패 카드는 그 창에선 「닫으면 사라져요」를 말하고
   *     (Ownify `window.credentialless`) · 과제 끝맺음 미룬 것은 이 껍데기 저장소에 맡긴다(아래 mount 의 hwFin). 껍데기 저장소(onfTok·onfTheme·이 기억)는 그대로다.
   *   ⛔ 학생 exec(ONF.api.EXEC)에만 쓴다. 선생님 홈 액자(`/a/macros/ownify.co.kr`)는 구글 로그인이 있어야 열린다 — credentialless 면 쿠키가 없어 문에서 잘린다. */
  var CL_KEY = 'onfCl', CL_TRY = 'onfClTry', CL_MS = 7 * 86400000, CL_GRACE = 1500, clPage = false, APP_MS = 3000;   // APP_MS = 래퍼는 떴는데 앱 프레임이 없을 때 더 기다리는 시간(아래 quiet)
  function clCan() { try { return 'credentialless' in HTMLIFrameElement.prototype; } catch (e) { return false; } }
  function clAt(k) { try { var t = Number(localStorage.getItem(k) || 0); return t > 0 && Date.now() - t < CL_MS; } catch (e) { return false; } }
  function clSet(k, on) { try { if (on) localStorage.setItem(k, String(Date.now())); else localStorage.removeItem(k); } catch (e) {} }
  var CL_SAY = '인터넷 연결을 확인하고 다시 열어 주세요. 계속 안 되면 시크릿(개인정보 보호) 창으로 열어 보세요.';

  /** el 에 학생 exec 주소 src 를 연다(위 「여러 계정 우회」).
   *  @param wait  액자 뒤 「불러오는 중」(.onf-wait) — 못 열면 여기에 우리 말 · 없으면 액자만 걷는다
   *  @param close 판이면 닫는 함수 — 안내에 [닫기] · 없으면(홈) [다시 열기]
   *  @param keep  홈 액자만 true — 이 기기 기억(onfClTry·onfCl)을 정한다 · 판은 읽기만
   *  @param hooks 홈 액자만 — { ok: 산 화면, stuck: 못 엶 } 를 알린다(첫 화면 로고 로딩 onf-load.js · 2026-10-22) · 없으면 종전 그대로
   *  @return { stop: 판정을 그만두고 노크 듣기를 걷는다(판을 지울 때) · stuck: 못 열어 안내를 띄웠나 } */
  function openExec(el, src, wait, close, keep, hooks) {
    var can = clCan(), cl = can && (clPage || clAt(CL_KEY)), byMemory = cl, tried = {}, done = false, stuck = false, tm = null, re = 0, nav = false;   // re = 다시 연 횟수 · nav = 다시 여는 중(다음 load 전)
    function onMsg(ev) { if (!done && !nav && ev && _fromOurFrame(ev.source, el)) ok(); }   // 🔁 다시 여는 중엔 안 받는다 — replace 는 새 응답까지 옛 문서를 살려 둬 옛 문서의 늦은 말이 올 수 있다(반박 🟠1)   // 노크 — 깊이 무관 · 내 액자 후손의 말이면 산 화면(값은 안 본다 · load 전에 와도 여기서 끝난다)
    function end() { done = true; clearTimeout(tm); global.removeEventListener('message', onMsg); }
    function tell(k) { try { if (hooks && typeof hooks[k] === 'function') hooks[k](); } catch (e) {} }   // 알림이 던져도 열기 판정은 그대로 간다
    function ok() {
      end();
      tell('ok');                                                    // 🟠 로고 로딩 — 막을 걷기 시작한다(아래 기억 판정과 무관 · 먼저 알린다)
      if (re) el.style.visibility = '';                              // 🔁 다시 연 화면이 떴다 — 걷었던 액자를 되돌린다(처음에 뜬 액자는 안 만진다)
      if (cl && tried.norm) clPage = true;                           // 이 페이지의 뒤 판은 처음부터 — 판이 정해도(저장 안 함 · 여러 계정 선생님 판마다 오류 + 1.5초 · 재확인 T2)
      if (!keep) return;                                             // 기기 기억은 홈 액자만 — 판은 읽기만
      if (!cl) return clSet(CL_TRY, false);                          // 보통으로 떴다 — 「한 번 걸림」을 지운다(잇달아야 두 번)
      if (!tried.norm) return;                                       // 기억(또는 이 페이지)으로 처음부터 연 것 — 시각을 안 늘린다
      if (clAt(CL_TRY)) { clSet(CL_KEY, true); clSet(CL_TRY, false); } else clSet(CL_TRY, true);   // 두 번째면 기억 · 첫 번째면 표시만
    }
    function kids() { try { return el.contentWindow.length; } catch (e) { return 0; } }
    function app() { try { var w = el.contentWindow[0]; return w ? w.length : 0; } catch (e) { return 1; } }   // 🔁 래퍼 sandboxFrame 의 자식(userHtmlFrame = 우리 앱) 수 — 교차 출처여도 읽힌다
    function go() {
      re++; nav = true;
      el.style.visibility = 'hidden';                                // 🔁 다시 여는 동안 구글 오류 화면을 걷는다 — 뒤 「불러오는 중」이 보인다(뜨면 ok 가 되돌린다 · 또 실패면 say 가 그대로 둔다)
      if (can) el.credentialless = cl;                               // 다음 탐색부터 먹는다(속성을 비추는 값)
      try { el.contentWindow.location.replace(src); } catch (e) { el.src = src; }
    }
    function fail() {
      tried[cl ? 'cl' : 'norm'] = 1;
      if (cl && byMemory) { clPage = false; if (keep) clSet(CL_KEY, false); byMemory = false; }   // 기억(기기·페이지)으로 연 cl 이 안 됐다 — 페이지 기억은 누구든 버리고 기기 기억은 홈만
      if (tried.quiet) { end(); return say(); }                     // 🔁 노크 없는 화면에서 이미 한 번 다시 열었다 — 판 하나당 다시 열기는 한 번(아래 quiet)
      if (!tried.norm) { cl = false; console.info('[onf] credentialless 로 연 화면이 안 떴다 — 보통으로 한 번 더'); return go(); }
      if (can && !tried.cl) { cl = true; console.info('[onf] 구글 오류 화면(여러 계정?) — credentialless 로 다시 연다'); return go(); }
      /* 🔁 credentialless 를 모르는 브라우저(사파리·iOS·파이어폭스)도 **한 번은** 같은 주소로 다시 연다(2026-10-22 Peter 「A+B」 중 B) —
         구글 일시 오류(Lib 배포 순간 「스토리지에서 읽는 중 서버 오류 INTERNAL」 · 동시 실행 한도)는 다시 열면 뜬다. 크롬은 위 credentialless 가 그 한 번이다.
         ⚠️ 노크 없음 + 자식 0 화면(우리 앱이 아니다)만 여기 온다 — 안 보낸 글이 있을 수 없다 · 두 번째도 실패면 아래 안내(종전). */
      if (!can && !tried.again) { tried.again = 1; console.info('[onf] 구글 오류 화면 — 한 번 더 연다'); return go(); }
      end();
      say();
    }
    /* 🔁 래퍼(자식 프레임)는 떴는데 그 안에 **앱 프레임이 없다**(sandboxFrame 의 자식 userHtmlFrame 0) — 구글이 래퍼 안에 오류를 그린 화면으로 보고
         APP_MS 더 기다려도 없으면 **한 번** 같은 주소로 다시 연다(2026-10-22 Peter 「A+B」 중 B · Lib 배포 순간 「스토리지에서 읽는 중 서버 오류 INTERNAL」 ·
         선생님 홈 판 07:27 — 구글 글이 그대로 남았다 = 자식 0 판정에 안 걸린 꼴로 **추정** · 오류 화면 구조 자체는 못 잼).
       · 판별을 노크 시각이 아니라 **구조**로 한다(반박 🟠3) — 노크는 이웃 긴 작업(같은 출처 액자는 한 렌더러 · 안드로이드는 껍데기까지 한 스레드)에 밀리고
         노크 없는 우리 안내 한 장(Lib _onfNoticePage · PIN 칸)도 있다. 앱 프레임은 **load 때 이미 있다**:
         2026-10-22 헤드리스 실측(사이트 격리 끔 = 한 렌더러) 홈·내 문장·안내 한 장 셋을 한꺼번에 · 보통 9 · CPU×6 9 · CPU×6 + 껍데기 200ms 긴 작업 9 —
         27번 모두 load 처리기 안에서 앱 프레임 1(노크 없는 안내 한 장 포함). 라이브(김가상 홈 3·숨긴 판 3)도 노크 load 뒤 18~43ms.
       · 그래서 정상 길은 load 그 자리에서 끝(시계·호출 0) · 노크가 늦어도·없어도 앱 프레임이 있으면 안 다시 연다.
       · ⛔ 노크한 판은 여기 안 온다(onMsg → ok → end) · 앱 프레임이 없는 문서는 우리 스크립트가 없어 쓴 글이 있을 수 없다.
       · 두 번째도 앱 프레임이 없으면 종전대로 그대로 둔다(ok — 안내 안 띄움 · 기억은 종전 「떴다」). */
    function quiet() {
      if (!el.contentWindow) return end();                           // 그 사이 액자가 지워졌다
      if (app() > 0 || re) return ok();                              // 앱이 생겼다 · 이미 한 번 다시 열었다 — 그대로 둔다
      tried.quiet = 1;
      console.info('[onf] 래퍼는 떴는데 앱 프레임이 없다(구글 오류?) — 한 번 더 연다');
      go();
    }
    function say() {
      console.warn('[onf] 화면을 못 열었다 — 안내로 바꾼다');
      stuck = true;
      tell('stuck');                                                 // 🟠 로고 로딩 막을 바로 걷는다 — 아래 안내가 보여야 한다
      el.style.visibility = 'hidden';                                // 구글 영어 오류를 걷는다 — 뒤(z 0)의 안내가 보이고 눌린다
      if (!wait) return;
      var box = document.createElement('div'), h = document.createElement('b'), p = document.createElement('span'), b = document.createElement('button');
      box.className = 'onf-stuck';
      h.textContent = '화면이 안 열렸어요'; p.textContent = CL_SAY;
      b.type = 'button'; b.textContent = close ? '닫기' : '다시 열기';
      b.onclick = close || function () { location.reload(); };
      box.appendChild(h); box.appendChild(p); box.appendChild(b);
      wait.textContent = '';                                         // 「불러오는 중」 고리·글을 걷는다(못 연 것을 여는 중처럼 보이지 않게)
      wait.appendChild(box);
    }
    global.addEventListener('message', onMsg);
    el.addEventListener('load', function () {
      if (done) return;
      try { if (el.contentWindow.location.href === 'about:blank') return; } catch (e) {}   // 처음 빈 문서(같은 출처라 읽힌다) — 진짜 화면이 아니다
      nav = false;                                                   // 🔁 새 문서가 섰다 — 이제 노크를 받는다
      clearTimeout(tm);
      if (kids() > 0) { if (app() > 0 || re) return ok(); tm = setTimeout(quiet, APP_MS); return; }   // 🔁 래퍼 + 앱 프레임 = 산 화면(종전처럼 그 자리) · 앱 없으면 아래 quiet
      tm = setTimeout(function () {                                  // 그 사이 노크가 오면 onMsg 가 끝낸다
        if (done) return;
        if (!el.contentWindow) return end();                         // 그 사이 액자가 지워졌다 — 판정하지 않는다(기억을 잘못 버리지 않게)
        if (kids() > 0) quiet(); else fail();                        // 여유 안에 래퍼가 생겼다 — 앱 프레임을 본다(없으면 한 번 · quiet)
      }, CL_GRACE);
    });
    if (can) el.credentialless = cl;
    /* 📱 처음 열기도 replace(2026-10-23 Peter 아이폰 「교재 판에서 뒤로가 홈으로 안 가고 · 그 뒤 ✕ 면 흰 화면 userCodeAppPanel」) —
       이미 문서에 붙은 액자(빈 about:blank)에 `src` 를 넣으면 WebKit(아이폰·아이패드 모든 브라우저)은 그 이동을 **기록 칸 하나로** 쌓는다
       (크롬은 「처음 빈 문서 → replace」라 안 쌓는다). 폰 판은 누르는 순간 판 칸(histBook · pushState)을 넣고 판 액자는 ≈4초 뒤 커밋하니
       그 칸이 **우리 판 칸 위**에 앉는다 → 뒤로 = 판 액자만 빈 문서로 되감김(판 그대로) · ✕ 의 go(-bd) 도 그 칸으로 → 아이폰 크롬은 최상위가 구글 샌드박스 주소로 바뀌어 흰 화면.
       Playwright WebKit(iPhone 13) 라이브 실측: 누른 뒤 history.length 3 이어야 할 것이 5 · 뒤로 = popstate 없음. replace 는 칸을 안 만든다(위 go() 와 같은 이유). */
    try { if (el.isConnected && el.contentWindow) { el.contentWindow.location.replace(src); return { stop: end, stuck: function () { return stuck; } }; } } catch (e) {}
    el.src = src;
    return { stop: end, stuck: function () { return stuck; } };
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
      if (ev.data.onf === 'bookHello' && opts.bookSrc) {   // 📖 swap:1 = 판 한 장(켰을 때만 칸이 있다 — 끔이면 종전 글자 그대로 · 홈은 이때만 미리 넷을 보낸다)
        var cp = { onf: 'caps', book: 1, phone: opts.phone ? 1 : 0 };
        if (BOOK_SW) cp.swap = 1;
        try { ev.source.postMessage(cp, ev.origin); } catch (eC) {}
        return;
      }
      if (ev.data.onf === 'openBook' && opts.bookSrc && typeof ev.data.href === 'string') { bookHome = ev.source; bookHomeOrigin = ev.origin; bookOpen(ev.data.href, ev.data.left, ev.data.m, ev.data.r, true, ev.data.cf); var hp = bookShown(); if (hp) { hp.back = null; hp.home = true; } return; }   // 홈에서 연 판은 앞 판 기억 없음(종전 · 4.4) · 📖 판이 있으면 갈아 끼움 · home = 판 자격(아래 bookBoard)
      /* 홈이 탭을 바꿨다 → 옆 판을 닫는다(2026-10-12 Peter 「창이 켜진 채 탭을 바꾸면 자동으로 꺼져야」) — bookClose 는 판 액자만 말한다(따로 둔 이름) */
      if (ev.data.onf === 'bookDismiss') { bookClose(true); return; }   // 메뉴를 눌렀다 = 전부 닫고 홈(앞 판을 보이지 않는다) · 보이는 판만 숨긴다(없으면 아무 일 없음)
      /* 📖 홈이 「첫 교재를 미리 받아 줘」(2026-10-12 · 설계서 §1-5 · 10-13 숨긴 판) — 주소는 판과 같은 거르개(bookSrc — 교재만 · 아는 값만 · embed=1).
         · panel:1(홈이 판을 쓸 넓은 화면이라고 했다) → **숨긴 판**으로 미리 띄운다(아래 bookPre · 교재는 park=1 로 「대기」 — 접속 신호 0).
         · 아니면(폰) 종전대로 그 주소를 **한 번** GET 해 교재 서버 캐시만 데운다(봇 수업 전 데우기와 같은 길 · 쿠키 안 실음 · 한 주소 한 번). */
      if (ev.data.onf === 'bookWarm' && opts.bookSrc && typeof ev.data.href === 'string') { if (ev.data.panel === 1) { preSave(ev.data.href); bookPre(ev.data.href, ev.data.left, ev.data.m, ev.data.r); } else bookWarm(ev.data.href); return; }   // 🚀 첫 panel:1 은 다음 열기용으로 기억(아래 preEarly)
      /* 📐 창 크기가 바뀌었다(2026-10-16 Peter 「B로 가자」 · 설계서 §4.1) — 홈이 다시 잰 메뉴 끝·여백·모서리를 **판 전부**(보이는 판·숨긴 판)에 새로 단다.
         보이기·숨기기·주소는 안 건드린다(다시 안 불러온다) · 위 홈 자물쇠를 지난 말만 — 판 액자 쪽 말은 여기까지 못 온다. */
      if (ev.data.onf === 'bookBox' && opts.bookSrc) { for (var bi = 0; bi < books.length; bi++) bookPlace(books[bi], ev.data.left, ev.data.m, ev.data.r); sync(); return; }
      /* 🌙 화면 색(Peter 2026-10-12 다크 모드) — 안쪽 홈이 알린다 · 틀·판 둘레·「불러오는 중」을 같은 색으로 · 다음에 열 때 머리 스크립트가 그리기 전에 쓴다. 아는 값만. */
      if (ev.data.onf === 'theme') { if (ev.data.v === 'dark' || ev.data.v === 'light') { document.documentElement.setAttribute('data-theme', ev.data.v); try { localStorage.setItem('onfTheme', ev.data.v); } catch (eT) {} themeTell(); } return; }
      if (ev.data.onf === 'themeAsk') { themeAsk(ev); return; }   // 🌙 폰에선 교재가 홈 액자째 넘어가 이 자리에서 묻는다
      /* 📤 과제 끝맺음 맡기기(반박 검토 🟡3 2026-10-16) — credentialless 창(위 openExec 우회)의 과제 화면은 제 저장소가 페이지와 같이 사라져
         「못 한 끝맺음(이름·도장·「새 과제」)은 다음에 열 때」를 못 지킨다 → 그 창이 이 껍데기 저장소(onfHwFin)에 맡기고(hwFin · sid 로 넣고 뺀다) 열 때 묻는다(hwFinAsk).
         ⛔ 위 홈 자물쇠를 지난 말만 · 답은 물은 그 창·그 출처로('*' 금지) · 한 줄은 JSON 2KB 이하 평범한 객체(histSmall) · 스무 줄까지(오래된 것부터 버림).
         ⚠️ 학생 구분은 안 한다 — 남의 것이면 서버가 gone 으로 답해 그 창이 뺀다(_onfHwUpEnd 는 세션의 토큰을 본다). */
      if (ev.data.onf === 'hwFin') { hwFinKeep(ev.data); return; }
      if (ev.data.onf === 'hwFinAsk') { try { ev.source.postMessage({ onf: 'hwFin', jobs: hwFinList() }, ev.origin); } catch (eH) {} return; }
      // 탭 제목 — 앱(=GAS)만 학생 이름을 안다. 보이는 탭 제목은 **이 창**이 정하므로 받아서 세운다.
      //   위 오리진 검사를 이미 통과한 메시지다. 줄바꿈을 지우고 길이를 잘라 그대로 쓴다.
      if (ev && ev.data && ev.data.onf === 'title' && typeof ev.data.t === 'string') {
        var newTitle = ev.data.t.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);
        if (newTitle) document.title = newTitle;
      }
      if (ev.data.onf === 'printTitle') { printTitle(ev.data.t); return; }   // 📄 위 printTitle — 홈 액자에서 바로 연 교재(폰·옛 길)
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
    function hwFinList() { try { var a = JSON.parse(localStorage.getItem('onfHwFin') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function hwFinKeep(d) {
      var j = d.job, sid = (j && typeof j.sid === 'string') ? j.sid : '', a;
      if (!/^[A-Za-z0-9-]{1,64}$/.test(sid) || (d.on === true && !histSmall(j))) return;
      a = hwFinList().filter(function (x) { return x && x.sid !== sid; });
      if (d.on === true) a.push(JSON.parse(JSON.stringify(j)));
      a = a.slice(-20);
      try { if (a.length) localStorage.setItem('onfHwFin', JSON.stringify(a)); else localStorage.removeItem('onfHwFin'); } catch (e) {}
    }
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
    var PRE_LS = 'onfPreBook', PRE_AGE_MS = 14 * 86400000, preSaved = false, preP = null;   // 🚀 첫 교재 처음부터(아래 preEarly)
    var books = [], bookHome = null, bookHomeOrigin = '';   // books = 판들(오래 안 쓴 것이 앞) · { box, el, src, key, parked, win, origin, views, kb, hw, ho, idle, left }
    var warmed = {};
    /* 📖 판 한 장 스위치(2단계 · 아래 「교재 판 한 장」) — index.html 이 주소 swap=1|0 을 기기에 기억해 넘긴다(학생 키 onfSwap · 기본 끔). 끔이면 bookBoard 가 늘 null 이라 모든 길이 종전 그대로다(caps 에도 swap 칸이 없다). */
    var BOOK_SW = !!opts.swap, BOOK_PERF = !!opts.perf;
    var BOOK_SWAP_MS = 14000, bookSwapN = 0, BOOK_AGE_MS = 2 * 60 * 60 * 1000;   // 갈아 끼우기 답 시한(판의 맺음 8초와 받기 10초는 같이 돈다 + 여유 4초) · 번호(나중 것이 이긴다) · 판 나이(판 ONF_BOOK_AGE_MS 와 같다 · D3)
    var bookQ = [], BOOK_Q_MAX = 6, BOOK_HI_MS = 60 * 1000;                       // 노크 전 판 줄(아래 bookCand)
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
        if (src && !p) { p = bookBoardFor(src); if (p) { bookSwapTo(p, src); p = bookShown(); } else p = bookMake(src, false); }   // 📖 판이 있으면 그 주소로 갈아 끼운다(새 액자 대신) · 보인 판을 다시 집는다 — 판이 늙었으면 bookSwapTo 안 bookShow 가 새 판으로 바꿨다(옛 p 로 또 보이면 고아 액자 · 2단계 반박 🟡)
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
    function bookFind(src) { for (var i = 0; i < books.length; i++) if (books[i].src === src && !books[i].gone) return books[i]; return null; }   // 📖 gone = 내용과 주소가 어긋날 수 있는 판(아래 bookRetire)
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
    function bookCan(p, a) { return !!(p && !p.gone && !p.sw && (a.view || a.line) && (!a.view || p.views.indexOf(a.view) >= 0) && (!a.line || p.views.indexOf('line') >= 0)); }   // views 는 노크(bookHi)가 채운다 — 노크 전엔 [] · 📖 자격 내린 판(gone)·갈아 끼우는 중(sw — 아직 옛 교재)엔 「열어」를 안 보낸다
    /* 아무것도 안 묻는 열기([이어서 하기])도 **줄 링크로 연 판**(view 없음)이면 그 판(반박 검토 🟡4) — 판은 이미 그 교재다 · 할 말이 없으니 보이기만.
       ⛔ view 로 연 판(덱·복습)은 안 맡긴다 — 열자마자 그 창을 띄운 판이다(위 「view 없는 보통 열기」 검사). */
    function bookLike(src, a) {
      var b = bookBase(src), q;
      for (var i = 0; i < books.length; i++) { q = books[i]; if (q.gone || q.sw || bookAged(q)) continue; if (bookBase(q.src) === b && (bookCan(q, a) || (!a.view && !a.line && !bookAsk(q.src).view))) return q; }   // 📖 늙은 판(bookAged)은 bookShow 가 그 주소로 새로 띄워 view·line 을 잃는다 — 갈아 끼우기(→ stale → 새 판)로
      return null;
    }
    /* left = 홈 왼쪽 메뉴의 오른쪽 끝(px · 홈이 잰다) — 있으면 판이 그 오른쪽부터 덮는다(2026-10-12 Peter 「창 모드일 때는 맨 왼쪽 탭만 보이게」).
       없으면(옛 홈 · 판 안에서 갈아 끼울 때) 종전 자리 그대로. ⚠️ 숫자·화면 폭 60% 안만 믿는다(남의 값으로 판이 화면 밖으로 가지 않게). */
    function bookPlace(p, left, m, r) {
      if (typeof left !== 'number' || !isFinite(left)) return;
      var okL = left > 0 && left < (global.innerWidth || 0) * 0.6;
      p.left = left;
      p.box.classList.toggle('beside', okL);
      if (okL) p.box.style.setProperty('--bl', Math.round(left) + 'px');
      /* 🅱 칸 안 여백(m)·판 모서리(r) — 홈이 잰 값(2026-10-16 Peter 「B로 가자」: 판이 메뉴 옆 빈 칸을 채우고 둘레는 홈 바탕색 · 모서리는 메뉴와 같은 말).
         숫자이고 0~40 일 때만 믿는다(남의 값으로 판이 찌그러지지 않게) — 아니면 변수를 지워 CSS 기본값(16px·28px). */
      p.m = bookPx(p, '--bm', m);
      p.r = bookPx(p, '--br', r);
    }
    function bookPx(p, name, v) {
      var ok = typeof v === 'number' && isFinite(v) && v >= 0 && v <= 40;
      if (ok) p.box.style.setProperty(name, Math.round(v) + 'px'); else p.box.style.removeProperty(name);
      return ok ? v : null;
    }
    function bookMake(src, parked) {
      var p = { box: document.createElement('div'), el: document.createElement('iframe'), src: src, key: bookKey(src), parked: parked, win: null, origin: '', views: [], kb: null, hw: null, ho: '', idle: null, left: null, m: null, r: null, back: null,   // back = 나를 열어 준 판(하나만 · 없으면 null) — 아래 「앞 판 규칙」
        swap: false, load: src, real: src, sw: null, ask: {}, born: Date.now(), gone: false, home: false };   // 📖 아래 「교재 판 한 장」 — swap = 노크 swap:1 · load = 액자가 처음 연 주소 · real = 판이 실제로 든 교재 · sw = 기다리는 갈아 끼우기 · ask = 보낸 번호 → 주소 · born = 만든 때 · gone = 주소로 못 찾음 · home = 홈에서 연 판(bookBoard)
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
      if (parked) p.idle = setTimeout(function () { bookIdle(p); }, BOOK_IDLE_MS);
      p.oe = openExec(p.el, parked ? src + (src.indexOf('?') < 0 ? '?' : '&') + 'park=1' : src, wait, bookClose);   // 🔐 여러 계정 우회(위) — 못 열면 이 판 「불러오는 중」 자리에 안내 + [닫기] · 기억은 읽기만
      books.push(p);
      return p;
    }
    function bookDrop(p) {
      var i = books.indexOf(p);
      if (i < 0) return;
      books.splice(i, 1);
      if (p.idle) clearTimeout(p.idle);
      if (p.sw) clearTimeout(p.sw.tm);                    // 📖 지운 판의 갈아 끼우기 시한은 걷는다
      if (p.oe) p.oe.stop();                              // 🔐 load 전에 지우는 판 — 노크 듣기를 걷는다
      if (p.box.parentNode) p.box.parentNode.removeChild(p.box);
    }
    function bookTell(p) { if (p.win) { try { p.win.postMessage({ onf: 'bookPark', on: p.parked }, p.origin); } catch (e) {} } }
    function bookPark(p, on) {
      if (on && !p.win) { bookDrop(p); return; }   // 대기를 모르는 판(옛 교재 · 아직 뜨는 중)은 숨기지 않는다
      p.parked = on;
      p.box.classList.toggle('park', on);
      if (p.idle) { clearTimeout(p.idle); p.idle = null; }
      if (on) { p.idle = setTimeout(function () { bookIdle(p); }, BOOK_IDLE_MS); try { p.el.blur(); } catch (e) {} }
      bookTell(p);
    }
    /* 숨긴 채 30분 — 지운다. 📖 판(bookBoard)은 빼 준다(하루 종일 한 판 · 판 나이 2시간은 판이 stale 로 말한다). */
    function bookIdle(p) { p.idle = null; if (p !== bookBoard()) bookDrop(p); }
    /* p 를 보이고 보이던 판은 숨긴다 · 폰이면 판 칸(histBook) · 키보드 보정 자리(sync). ⚠️ 새 판(bookMake 가 보이게 만든)이면 books 끝이라 bookShown 은 보이던 옛 판을 먼저 찾는다. */
    function bookShow(p, left, m, r) {
      if (p.oe && p.oe.stuck()) { bookDrop(p); p = bookMake(p.src, false); }   // 🔐 못 연 판(안내) — 지우고 새로 받는다(반박 검토 🟡4 · 종전: 안내 그대로 · [닫기] 해야 새로)
      if (bookAged(p)) { var old = p; p = bookMake(old.src, false); p.home = old.home; bookRetire(old); }   // 📖 2시간 넘은 숨긴 판(판은 30분 지우기에서 빠진다) — 옛 코드 그대로 안 띄우고 새로 · 옛 판은 저장 중일 수 있어 안 지운다
      var cur = bookShown();
      if (cur && cur !== p) bookPark(cur, true);
      if (typeof left === 'number') bookPlace(p, left, m, r);
      else bookPlace(p, cur ? cur.left : null, cur ? cur.m : null, cur ? cur.r : null);   // 판 안 갈아 끼우기(left 없음)는 보이던 판 자리·칸 값(left·m·r) 그대로
      if (p.parked) bookPark(p, false);
      books.splice(books.indexOf(p), 1); books.push(p);   // 가장 최근
      bookRoom(bookMax());
      if (phone()) histBook(p);
      sync();
    }
    /* home === true = 홈에서 온 openBook — 📖 같은 주소·할 줄 아는 판(bookLike)이 없고 판(bookBoard)이 있으면 새 판 대신 갈아 끼운다(아래 「교재 판 한 장」).
       ⛔ 판 안에서 온 openBook(⭐ → 「교재에서 보기」 · 판 안 링크)은 종전 새 판(창 B안 앞 판 0초). */
    function bookOpen(href, left, bm, br, home, cf) {   // ⚠️ 칸 값 m·r 은 이 안의 지역 m(bookView 말)과 겹쳐 bm·br 로 받는다 · cf = 📖 ☁️ 홈이 실은 사본 힌트(홈 openBook 만)
      var src = opts.bookSrc(href), b;
      if (!src) return;
      var a = bookAsk(src), p = bookFind(src) || bookLike(src, a), m = { onf: 'bookView' };   // 📖 view·line 만 다른 판이 할 줄 알면 그 판(위 bookLike) — 갈아 끼우기보다 **먼저**(0초 길)
      if (!p && home && (b = bookBoardFor(src))) { bookSwapTo(b, src, left, bm, br, cf); return; }
      p = p || bookMake(src, false);
      bookShow(p, left, bm, br);   // 🔐 못 연 판이면 bookShow 가 새 판으로 바꾼다 — 새 판은 노크 전이라 아래 bookCan 이 거짓(말 안 보냄)
      if (a.view) m.view = a.view;
      if (a.line) m.line = a.line;
      if (bookCan(p, a)) { try { p.win.postMessage(m, p.origin); } catch (e) {} }   // 보인다(bookPark) 다음에 — 페이지가 「보임」 손질 뒤 연다
    }
    /* 판이 n 개를 넘으면 가장 오래 안 쓴 **숨긴** 판부터 지운다 — 보이는 판·📖 판(bookBoard)·📖 노크 전 판 후보(bookCand)는 안 건드린다(books 는 오래 안 쓴 것이 앞). */
    /* ⛔ 자격 내린 판(gone — 늙음·stale·답 없음)은 **세지도 지우지도 않는다**(2단계 반박 🟠 2026-10-17) — 맺음(안 보낸 칸·실패 카드·오프라인 백업)이 끝나기 전에 지우면 그 글이 사라진다 · 30분 지우기(bookIdle)가 치운다. */
    function bookRoom(n) { var bd = bookBoard(), c = 0, i, q; for (i = 0; i < books.length; i++) if (!books[i].gone) c++; for (i = 0; c > n && i < books.length; ) { q = books[i]; if (q.parked && q !== bd && !q.gone && !bookCand(q)) { bookDrop(q); c--; } else i++; } }
    function bookPre(href, left, m, r) {
      var src = opts.bookSrc(href), b, ex;
      if (!src) return;
      if ((ex = bookFind(src))) { if (ex.parked) bookPlace(ex, left, m, r); return; }   // 🚀 이미 있는 숨긴 판(미리 띄운 판 · 자리값 없이 만든 것)에 홈이 잰 자리를 단다(반박 🟡2 — 보일 때 폭이 바뀌어 다시 그리던 것)
      b = bookBoardFor(src);
      if (b) { bookFetch(b, src); return; }   // 📖 판이 값만 받아 둔다(새 판 0 · 접속 표시 0 · 판이 차례를 맡는다)
      if (!bookMine(src) && books.some(bookCand)) { if (bookQ.length < BOOK_Q_MAX && bookQ.indexOf(src) < 0) bookQ.push(src); return; }   // 📖 곧 판이 될 판이 노크 전 — 줄에 세운다(아래 bookCand)
      //   ⚠️ 선생님 껍데기의 D1(폰은 미리 판 없음)은 안 가져온다 — 학생 폰은 숨긴 미리 판 하나가 종전 그대로다(설계 §7.2 · 그 판이 곧 판이 된다)
      bookRoom(bookMax() - 1);   // 자리가 차면 가장 오래 안 쓴 숨긴 판을 비킨다(2026-10-14 Peter 「미리 띄우는 교재 셋」 — 종전엔 안 띄웠다 · 📱 폰은 자리 2)
      var np = bookMake(src, true); np.home = true;   // 📖 홈이 미리 띄운 판 — 노크하면 판이 된다
      bookPlace(np, left, m, r);
    }
    /* ═══ 📖 교재 판 한 장 2단계(학생 · 2026-10-17 · 설계 ONF_SlackBot docs/2026-10-15-교재판-한장-설계.md §5.2 · §7.2 갈래 표 4) ═══
       ⚠️ 쌍둥이: teacher/index.html 「📖 교재 판 한 장 1d」 블록이 정본이다 — 같은 반박 검토 교훈(stale·14초는 자격만 내림 · 진 번호 시한 걷기 · 실패면 주소 되돌리고 새 판 · 2시간 숨긴 판은 보일 때 새로 ·
          노크 전 판 줄 · bookRoom 이 후보를 안 지움)을 그대로 옮겼다 · 까닭 주석은 거기. 판 쪽 약속은 Ownify ONF_Share_WebApp_Html onfBookSwap.
       홈에서 연 판 하나(판)가 다른 교재로 **갈아 끼운다** — 새 판(GAS doGet ≈5초) 대신 판이 값만 받아 표를 바꾼다(받아 둔 값 ≤0.5초 · 서버 ≈2.5~3.2초).
       학생만의 점: ① view·line 만 다른 주소는 bookLike → bookView 를 먼저(위 bookOpen) ② 폰도 숨긴 미리 판 하나는 종전(위 bookPre) ③ 2시간 나이는 판 자격 있는 판만(⭐ 내 문장 판은 종전 — bookAged).
         ④ 판 = **홈에서 연 판(home)** — 선생님 껍데기는 back === null 로 본다. 학생은 ⭐ 판 안 「교재에서 보기」가 bookLike 로 판을 그대로 다시 보이며 back = ⭐ 를 단다(✕ = ⭐ 0초 · 종전 앞 판 규칙) —
            back 으로 보면 판이 자격을 잃어 다음 홈 [열기]가 새 판이 되고 판 셋 넘침이 그 판(안 보낸 글)을 쫓아냈다(크롬 실측 2026-10-17). 판 안에서 처음 연 판은 home 이 없어 종전대로 판이 아니다.
       ⛔ 학생 토큰은 판 주소(src — 판의 fetch 주소)에만 있다. 기록 칸엔 판 번호(key)뿐이다(histBook). */
    function bookBoard() {
      var b = null, p, i;
      if (!BOOK_SW) return null;
      for (i = 0; i < books.length; i++) { p = books[i]; if (p.swap && p.win && p.home) { if (!p.parked) return p; b = p; } }
      return b;
    }
    function bookMine(src) { return /[?&]mode=mine(&|$)/.test(src); }
    function bookBoardFor(src) { return bookMine(src) ? null : bookBoard(); }   // ⭐ 내 문장 주소는 교재 판에 안 끼운다(설계 §5.4 — 내 문장 판은 따로)
    function bookFetch(b, src) { try { b.win.postMessage({ onf: 'bookFetch', src: src }, b.origin); } catch (e) {} }
    /* 노크 전 판 후보 = 홈에서 연·미리 띄운 판(home) · 아직 노크 전(!win) · 내 문장 아님 · 만든 지 1분 안. 있으면 미리(교재) 주소는 줄에 선다 — 학생 홈은 2초 뒤 넷을 한꺼번에 보낸다(첫 교재 판은 그때 노크 전).
       그 판이 swap:1 로 노크해 판이 되면 줄을 bookFetch 로 흘린다(아래 bookHi) · swap 없이 끝나면 안 흘린다. ponytail: 1분 = 노크 기다림 짐작(선생님 껍데기와 같다). */
    function bookCand(p) { return BOOK_SW && p.home && !p.win && !bookMine(p.src) && Date.now() - p.born < BOOK_HI_MS; }
    function bookAged(p) { return BOOK_SW && p.home && p.swap && p.parked && Date.now() - p.born > BOOK_AGE_MS; }   // 홈 판만(판 안에서 연 판은 30분 지우기가 있어 종전 · 2단계 반박 🟡)
    /* 📖 ☁️ 사본 힌트 꼴(2026-10-21 · ⚠️ 쌍둥이: teacher/index.html bookCfOk 가 정본 · 판 쪽 Ownify onfSwapCfHint 가 같은 꼴을 다시 본다) — 맞으면 세 칸 그대로 · 틀리면 뺀다 */
    function bookCfOk(c) {
      return (c && typeof c === 'object' && typeof c.f === 'string' && /^[A-Za-z0-9_-]{10,200}$/.test(c.f) && typeof c.s === 'string' && c.s.length >= 1 && c.s.length <= 100
        && typeof c.k === 'string' && c.k.length <= 700 && /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.k)) ? { f: c.f, s: c.s, k: c.k } : null;
    }
    function bookSwapTo(p, src, left, m, r, cf) {
      var id = ++bookSwapN, sw, i, msg = { onf: 'bookSwap', id: id, src: src, cur: p.real }, c = bookCfOk(cf);
      if (p.sw) clearTimeout(p.sw.tm);
      p.ask[id] = src;
      if (c) msg.cf = c;
      try { p.win.postMessage(msg, p.origin); } catch (e) {}   // cur = 판이 지금 든 주소 — 판이 떠나기 전 지금 표를 그 열쇠로 담는다(Ownify onfBootsKeep · A→B→A 의 A 가 서버를 안 기다린다)
      sw = p.sw = { id: id, src: src, left: left, m: m, r: r, t0: Date.now(), tm: 0 };
      sw.tm = setTimeout(function () { if (p.sw === sw) bookSwapEnd(p, sw, false, 'time', ''); }, BOOK_SWAP_MS);
      p.src = src; p.key = bookKey(src);
      for (i = 0; i < books.length; i++) if (books[i].back === p) books[i].back = null;   // 그 판은 이제 다른 교재다
      bookShow(p, left, m, r);
    }
    function bookSwapped(p, d) {   // 판의 답 — 이 판에 보낸 번호만
      var src = p.ask[d.id];
      if (typeof src !== 'string') return;
      delete p.ask[d.id];
      if (d.ok === true && p.sw && !p.gone) p.real = src;   // 📖 ☁️ 반박: 마지막 갈아 끼우기가 끝나(주소 되돌림 · 자격 내림) 뒤 늦은 ok 는 주소를 안 바꾼다 — 기다리는 동안 온 것만 real
      if (p.sw && p.sw.id === d.id && typeof d.vis === 'number' && isFinite(d.vis) && d.vis >= 0) p.sw.vis = Math.round(d.vis);
      if (p.sw && p.sw.id === d.id) bookSwapEnd(p, p.sw, d.ok === true, String(d.why || 'fail'), d.from);
    }
    function bookSwapEnd(p, sw, ok, why, from) {
      var shown = !p.parked;
      clearTimeout(sw.tm); p.sw = null;
      bookPerf(sw, ok ? String(from || '') : 'new', ok ? '' : why);
      if (ok) return;
      p.src = p.real; p.key = bookKey(p.real);
      if (why === 'stale' || why === 'time') bookRetire(p);   // ⛔ 지우지 않는다 — 안 보낸 글·저장 중일 수 있다
      if (shown) { var np = bookMake(sw.src, false); np.home = true; bookShow(np, sw.left, sw.m, sw.r); }   // 종전 길 그대로(판은 숨김 — bookShow 가 숨긴다) · 그 사이 사람이 닫았으면 안 띄운다 · 홈에서 연 것이라 다음 판
    }
    function bookRetire(p) { p.swap = false; p.gone = true; if (p.parked) bookPark(p, true); }   // 판 자격만 내린다 — 액자는 안 지운다 · 숨긴 판이면 30분 시계를 다시 건다
    function bookPerf(sw, from, why) {   // perf=1 — 「판 갈아 끼움 Nms(받아 둔 값|서버)」 · 물러남은 from:'new'(why) · 콘솔 한 줄 + 홈에 bookPerf(모르는 홈은 버린다)
      if (!BOOK_PERF) return;
      var ms = Date.now() - sw.t0;
      try { console.log('[onf 속도] 판 갈아 끼움 ' + ms + 'ms(' + (from === 'cache' ? '받아 둔 값' : from === 'server' ? '서버' : from === 'cf' ? '사본 · 보임 ' + sw.vis + 'ms' : '물러남 → 새 판 · ' + why) + ')'); } catch (e) {}
      var pm = { onf: 'bookPerf', ms: ms, from: from, why: why };
      if (typeof sw.vis === 'number') pm.vis = sw.vis;   // 📖 ☁️ 사본으로 보인 ms
      if (bookHome && bookHomeOrigin) { try { bookHome.postMessage(pm, bookHomeOrigin); } catch (e2) {} }
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
    /* q 가 p 를 (몇 단계 거쳐서든) 열어 준 판인가 — 판 안에서 q 를 여는 게 앞으로 간 건지 돌아간 건지(bookClose 위 앞 판 규칙). 9 = 고리가 생겨도 안 도는 안전 상한. */
    function bookOpener(p, q) { for (var a = p.back, n = 0; a && n < 9; a = a.back, n++) if (a === q) return true; return false; }
    /* ✕·Esc·홈 링크·홈 탭 바꿈 — 숨기고, 📱 맨 위에 판 칸 줄이 있으면 걷는다(뒤로로 닫은 것과 같은 기록 · 뒤따르는 popstate 는 숨길 판이 없어 알림만). PC 는 판 칸이 없다(폰에서 넓힌 창만).
       🅱 앞 판 규칙(2026-10-16 Peter 「B로 가자」 · 설계 4.4) — 판 안에서 연 판(교재 → ⭐ 내 문장)의 ✕·Esc 는 한 단계: 나를 열어 준 판(back)이 아직 살아 있으면 그 판을 보인다
       (숨긴 판 보이기 = CSS 한 번 · 0초 · 액자·src 그대로). 이미 지워졌으면(30분 안 씀 · 판 셋 넘침) 새로 안 받고 홈으로 — 기억된 판이라고 지우기(bookRoom·BOOK_IDLE_MS)에서 빼 주지 않는다(홈이 미리 띄운 판을 밀어내면 안 된다). 폰은 종전(판 칸 기록을 걷고 홈).
       「열어 준 판」은 한 줄로만 이어진다 — 판 안에서 q 를 열 때 q 가 이미 p 를 (몇 단계 거쳐서든) 열어 준 판이면(bookOpener) 앞으로 간 게 아니라 **돌아간 것**이라 q.back 을 안 바꾼다
       (교재 → 내 문장 → 「교재에서 보기」 → 교재 가 서로를 가리키면 ✕ 가 끝없이 돈다 · 한 단계 위(p.back === q)만 보면 교재 → E2 → 내 문장 → 교재 에서 고리가 생긴다).
       all === true 만 전부 닫기(교재 「홈」 bookClose{all:1} · 홈 메뉴 bookDismiss) — ⚠️ 엄격 비교: 못 연 판 안내의 [닫기] 가 이 함수를 onclick 으로 받아 이벤트가 인자로 온다. */
    function bookClose(all) {
      var cur = bookShown(), b = cur && cur.back;
      if (all !== true && !phone() && b && books.indexOf(b) >= 0) { bookShow(b); return; }   // left·m·r 없이 부르면 보이던 판 칸 값 그대로(위 bookShow)
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
        p.swap = d.swap === 1;   // 📖 swap:1 은 둘째 노크에 온다 — 첫 노크(없음)가 다시 오면 판이 다시 읽힌 것
        if (p.real !== p.load || p.sw) { p.real = p.load; if (p.sw) bookSwapEnd(p, p.sw, false, 'fail', ''); p.src = p.load; p.key = bookKey(p.load); }   // 다시 읽힌 판 = 처음 주소
        bookTell(p);
        var bd = bookBoard(), bq = bookQ;   // 📖 판이 생겼다 — 노크 전에 줄 선 미리 주소를 흘린다(위 bookCand)
        if (bd && bq.length) { bookQ = []; bq.forEach(function (x) { if (!bookFind(x)) bookFetch(bd, x); }); }
        return;
      }
      if (d.onf === 'bookSwapped') { bookSwapped(p, d); return; }   // 📖 판의 답 — 숨긴 판도(답을 기다리는 사이 사람이 닫을 수 있다)
      if (d.onf === 'themeAsk') { themeAsk(ev); return; }   // 🌙 판 안 교재가 묻는다(2단계) — 숨긴 판도(보일 때 색이 맞게)
      /* 📱 판 안쪽 기록 다리(폰 · 위 bookHist — 숨긴 판의 노크도 받는다: 미리 띄운 판은 숨긴 채 뜬다) · 키보드 노크 = 이 판의 키보드 높이 받는 창(kbAt) */
      if (d.onf === 'hist') { bookHist(p, ev); return; }
      if (d.onf === 'frameHello') { p.kb = ev.source; lastH = -1; lastTop = -1; sync(); return; }
      if (p.parked) return;                                 // ⛔ 숨긴 판은 닫기·전체·갈아 끼우기를 못 부른다
      if (d.onf === 'printTitle') { printTitle(d.t); return; }   // 📄 판 안 교재의 PDF 저장 이름(위 printTitle) — 보이는 판만
      if (d.onf === 'bookClose') bookClose(d.all === 1);   // all:1 = 교재 머리줄 「홈」 — 앞 판 없이 전부 닫기
      else if (d.onf === 'bookFull') p.box.classList.toggle('full', !!d.on);
      /* 판 안에서 교재 ↔ ⭐ 내 문장을 오갈 때(2026-10-12) — 판만 바꾼다(홈째 넘어가면 「뒤로」에 홈을 다시 읽는다) · 10-13 부터 보이던 판은 숨기고 새 판(돌아가면 0초).
         ⚠️ 주소는 홈에서 온 것과 같은 거르개(opts.bookSrc)를 지난다 — 못 만들면 그대로 둔다. */
      else if (d.onf === 'openBook' && typeof d.href === 'string') {
        bookOpen(d.href);
        var q = bookShown();                                  // 🅱 앞 판 규칙(위 bookClose) — 새로 보이게 된 판 q 의 「나를 열어 준 판」을 p 로 · 돌아간 것이면 그대로 · 폰은 종전
        if (q && q !== p && !phone() && !bookOpener(p, q)) q.back = p;
      }
    });
    global.addEventListener('keydown', function (e) { if (e.key === 'Escape') bookClose(false); });   // 껍데기에 초점이 있을 때만 닿는다(액자 안 키는 [✕]) · 보이는 판만(숨긴 판은 Esc 를 안 먹는다)

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

    /* 🚀 첫 교재를 처음부터(2026-10-22 Peter 「홈 들어가자마자 교재를 딱 열면 로딩이 길다」) — 홈은 다 그린 **뒤** 2초에 첫 교재 bookWarm(panel:1)을 보낸다.
       그래서 들어가자마자 누르면 숨긴 판이 아직 없거나 받는 중이라 교재를 통째로 기다렸다(실측 학생 홈 뜨자마자 누름 4.5~5.4초 · 15초 뒤 누름 0.03초).
       → 이 기기에서 **지난번 첫 panel:1 주소**를 기억해 두고(preSave · 키 onfPreBook), 다음에 홈을 띄우는 **그 순간** 같은 숨긴 판을 띄운다(preEarly · bookPre).
         홈이 2초 뒤 같은 주소를 보내면 bookPre 가 이미 있는 판이라 버린다 · 회차가 바뀌었으면 그 주소는 노크 전 판 줄(bookCand)에 섰다가 판이 받아 둔다(종전 길 그대로).
       ⛔ 홈 주소로 열 때만(index.html 이 opts.preKey = 토큰 꼬리 해시를 넘길 때만) · 같은 학생(키)·같은 기기 꼴(폰/PC)·14일 안 · 교재 거르개(bookSrc)를 다시 지난다.
       ⚠️ 끄기: index.html PREBOOK_ON = false(모두) · 주소 prebook=0(이 기기 기억). 대가: 홈만 보고 교재를 안 여는 날은 GAS 교재 받기 한 번이 헛일(판은 30분 뒤 지운다). */
    function preSave(href) {
      if (!opts.preKey || preSaved) return;
      preSaved = true;
      /* 반박 검토 🟠1 — 홈의 오늘 첫 교재가 기억과 다르고(회차가 바뀜) 미리 띄운 판이 아직 노크 전이면 지운다:
         노크를 못 하는 판(옮긴·막힌 교재 · 못 연 판)이면 오늘 교재가 그 판 줄(bookCand → bookQ)에 섰다가 버려져 누를 때 통째로 기다렸다(종전 0.03초). 지우면 종전 길 그대로. */
      if (preP && !preP.win && books.indexOf(preP) >= 0 && preP.src !== opts.bookSrc(href)) bookDrop(preP);
      preP = null;
      try { global.localStorage.setItem(PRE_LS, JSON.stringify({ k: opts.preKey, h: String(href).slice(0, 2000), ph: phone() ? 1 : 0, t: Date.now() })); } catch (e) {}
    }
    function preEarly() {
      if (!opts.preKey || !opts.bookSrc) return;
      var v = null;
      try { v = JSON.parse(global.localStorage.getItem(PRE_LS) || 'null'); } catch (e) { v = null; }
      if (!v || v.k !== opts.preKey || typeof v.h !== 'string' || v.ph !== (phone() ? 1 : 0) || !(Date.now() - Number(v.t) < PRE_AGE_MS)) return;
      bookPre(v.h);
      preP = bookFind(opts.bookSrc(v.h));   // 🚀 미리 띄운 판(위 preSave 가 오늘 주소와 견준다)
    }
    openExec(frameEl, src, opts.wait || null, null, true, opts.hooks || null);   // 🟠 hooks = 첫 화면 로고 로딩(index.html · onf-load.js) · 🔐 여러 계정 우회(위) — 못 열면 index.html 의 「불러오는 중」 자리에 안내 · 기억은 홈 액자만 정한다
    preEarly();   // 🚀 홈 요청이 먼저 나간 **뒤** — 홈이 더 중요하다(둘이 같이 받는다)
    return { _books: books, _drop: bookDrop };   // 검사용으로만(test/book-panel.test.js 가 판 자격·back 을 본다) — 화면 코드에서 쓰지 마라
  }

  global.ONF = global.ONF || {};
  global.ONF.frame = {
    hideToken: hideToken, mount: mount, getToken: getToken, withToken: withToken, TOKEN_KEY: TOKEN_KEY,
    tokenFromPath: tokenFromPath,
    openExec: openExec,   // 🔐 선생님 껍데기 판도 쓴다(teacher/index.html bookMake)
    printTitle: printTitle,   // 📄 선생님 껍데기(teacher/index.html) 판도 같은 함수
    /* 검사용으로만 낸다 — 순수 판정 함수라 창 없이 잴 수 있다. 화면 코드에서 부르지 마라. */
    _fromOurFrame: _fromOurFrame };
})(window);
