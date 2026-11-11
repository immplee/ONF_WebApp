/* 🔙 기록 층(2026-11-11 Peter 「새로 고침하면 그대로 · 뒤로는 켠 순서 역순으로 하나씩」) — 두 껍데기(학생 index.html · 선생님 teacher/index.html)가 **onf-frame.js 보다 먼저** 싣는다.
   껍데기 코드는 종전처럼 history.pushState·replaceState·back·go·state 를 쓴다 — 이 파일이 그 다섯을 감싼다(부르는 자리는 안 고친다).

   ① 새 바닥 — 새로 고침해도 브라우저 기록 칸은 남는다(같은 문서 칸 · state 째). 종전엔 맨 위 표식만 지워 그 아래 옛 칸이 살아 있었다:
      되살린 창·판을 다 닫고도 뒤로가 옛 칸을 밟아 헛돌고 · 닫은 교재·과제 판이 되살아나고 · **옛 칸에 닿는 순간 브라우저가 안쪽 액자(홈)를 통째로 다시 읽었다**
      (크롬 실측 2026-11-11 — 옛 칸의 액자 기록이 다시 읽기 전 문서 것이라). 옛 칸은 지울 수 없고(걷으러 가도 액자가 다시 읽힌다) 밟으면 안 된다.
      → 칸마다 깊이(onfD)를 적는다. 다시 읽힌 순간의 깊이 = **바닥**(floor): 그 칸은 「아무것도 안 열림」으로 읽히고(state = null), 새 칸은 그 위에만 쌓인다.
        뒤로가 바닥 아래(옛 칸)에 닿으면 우리 것은 다 닫힌 뒤다 → 껍데기에 안 알리고 곧장 사이트 밖으로(go(-(깊이+1))). back·go 는 바닥 아래로 안 내려간다.
   ② 줄(학생 껍데기 · data-gq) — WebKit·크롬은 손짓 밖에 쌓은 칸을 뒤로에서 건너뛴다(WebKit 은 앞 칸 하나 더). 선생님 껍데기는 제 줄(histQ)이 있고 학생 껍데기엔 없었다
      → 손짓 밖(userActivation 꺼짐)이면 줄에 세웠다가 어느 액자든 손을 뗄 때(hwTap)·껍데기를 누를 때 차례대로 쌓는다. state·back·go 는 줄을 먼저 본다.
      줄 안에서 홈 칸은 판 칸 아래로 끼운다(되살릴 땐 판이 홈 창보다 먼저 칸을 민다 — 「판 칸은 늘 홈 칸 위」가 껍데기 popstate 의 전제).
   ③ 앞 칸(2026-11-11 Peter 「남은 것 하나도 빠짐없이」) — 뒤로 몇 칸 간 채 새로 고치면 그 위(앞으로) 칸들도 옛 문서 것이다(판 번호가 이 문서 bookSrcs 와 다르다 — 앞으로가 엉뚱한 교재를 열었다).
      칸마다 이 문서(읽힌 회) 표 onfL(뜰 때 만든 무작위 · 읽힌 칸에도 찍는다 · 검토 2026-11-11 힌트). 다른 표 칸이 바닥 위면(앞으로) 껍데기에 안 알리고 있던 칸으로 되돌아간다
      (되돌아오는 popstate 도 삼킨다 · 앞으로 = 아무 일 없음) · 바닥 이하면 ①(밖으로). 표식뿐인 칸(onfD·onfL)은 껍데기엔 null.
   ④ 탭 첫 페이지가 껍데기면 밖이 없다 — 아래 toFirst.
   ⚠️ 한계: 새로 고침 뒤 **한 번도 안 만지고** 누른 뒤로는 사이트 밖으로 나간다(손짓 밖 칸은 브라우저가 건너뛰고 · 그 아래는 옛 칸이다). 배포 전 칸(onfD 없음)은 바닥 0 으로 읽어 종전 그대로.
      바닥에 되돌아와 맨 위 하나만 닫는 길은 안 한다 — 진짜 선생님 껍데기 크롬 실측(test/repro/hist-floor.mjs): 옛 칸에 닿는 순간 홈 액자 1번 · 과제 판 액자 1번이 통째로 다시 읽혀
      (홈은 다시 읽히며 제 되살리기·hello 칸 정리를 또 돈다 — 닫는 흉내와 겨룬다) 「뒤로 = 하나 닫기」가 아니라 「화면 전부 다시 읽기」가 된다(WebKit 은 학생 껍데기로 재면 다시 읽힘 0 — 크롬이 문제다 · 아이폰 Safari 만 따로 켜는 길은 실기기 실측 뒤에).
   검사 = test/onf-hist.test.js(vm) · 실브라우저 = test/repro/hist-reload.mjs · 진짜 선생님 껍데기 = test/repro/hw-reload-back.mjs */
(function (g) {
  'use strict';
  var H = g.history, P, sd;
  try { if (!H || g.top !== g.self) return; P = Object.getPrototypeOf(H); sd = Object.getOwnPropertyDescriptor(P, 'state'); } catch (e) { return; }
  if (!P || !P.pushState || !sd || !sd.get) return;
  var nPush = P.pushState, nRep = P.replaceState, nGo = P.go;
  var cs = g.document && g.document.currentScript, GQ = !!(cs && cs.getAttribute && cs.getAttribute('data-gq') !== null);
  var nat = function () { try { return sd.get.call(H); } catch (e) { return null; } };
  var dOf = function (s) { return (s && typeof s === 'object' && s.onfD > 0) ? (s.onfD | 0) : 0; };
  var D = dOf(nat()), floor = D, bounce = -1, land = false, Q = [], virt = false, out = false, stuck = false, LOG = [];   // bounce = 위 ③ · land = 위 ④
  var L = 'L' + Math.random().toString(36).slice(2, 10);   // ③ 이 문서(읽힌 회) 표 — 칸마다 onfL 로 찍는다 · 다른 표(또는 없음) = 옛 문서 칸
  var own = function (s) { return !!(s && typeof s === 'object' && s.onfL === L); };
  function note(k, st) { if (LOG.length < 80) LOG.push(k + (st && typeof st === 'object' ? ':' + Object.keys(st).filter(function (x) { return x !== 'onfD' && x !== 'onfL' && x !== 's'; }).map(function (x) { return x + '=' + st[x]; }).join(',') : '') + ' [D' + D + ' f' + floor + ' q' + Q.length + ']'); }   // 🔭 진단(표식·수만 — 안쪽 state(s)는 안 싣는다)
  function stamp(st, d) {
    var o = {}, k;
    if (st && typeof st === 'object') for (k in st) if (Object.prototype.hasOwnProperty.call(st, k)) o[k] = st[k];
    if (d) o.onfD = d; else delete o.onfD;
    o.onfL = L;
    return o;
  }
  function clean(s) { if (!s || typeof s !== 'object') return s === undefined ? null : s; for (var k in s) if (k !== 'onfD' && k !== 'onfL') return s; return null; }   // 표식뿐인 칸 = 아무것도 안 열림(껍데기엔 null · 종전과 같다)
  var gestAt = 0;   // 마지막 손짓(hwTap·껍데기 누름) — 손 뗌 알림은 그 손짓의 칸 밀기 말보다 **먼저** 온다(안쪽이 pointerup 에 보내고 칸은 click 에 민다) → 3초 안이면 손짓 안으로 친다(WebKit 창은 10초)
  function late() { try { var ua = g.navigator.userActivation; return GQ && !!ua && !ua.isActive && Date.now() - gestAt > 3000; } catch (e) { return false; } }
  function bookish(s) { return !!(s && (s.onfBook || s.b)); }
  function enq(a) {
    var st = a[0], i, j, c;
    if (st && st.onfHist && !bookish(st)) {            // 홈 칸 — 줄의 첫 판 칸 아래로 · 그 위 칸의 n(아래 홈 칸 수) +1
      for (i = 0; i < Q.length; i++) if (bookish(Q[i][0])) break;
      if (i < Q.length) {
        for (j = i; j < Q.length; j++) { c = stamp(Q[j][0], 0) || {}; c.n = (Number(c.n) || 0) + 1; Q[j] = [c, Q[j][1], Q[j][2]]; }
        Q.splice(i, 0, a); return;
      }
    }
    Q.push(a);
  }
  function realPush(a) { try { nPush.call(H, stamp(a[0], D + 1), a[1] === undefined ? '' : a[1], a[2]); D++; } catch (e) {} }
  function flush(force) { if (!Q.length || (!force && late())) return; var q = Q; Q = []; q.forEach(realPush); }
  function synth() {
    setTimeout(function () {
      virt = true;
      try { var e; try { e = new g.PopStateEvent('popstate', { state: H.state }); } catch (e1) { e = g.document.createEvent('Event'); e.initEvent('popstate', false, false); } g.dispatchEvent(e); } catch (e2) {} finally { virt = false; }
    }, 0);
  }
  H.pushState = function (st, t, u) {
    var q = Q.length || late(); note(q ? 'q' : 'push', st);
    if (q) enq([st, t, u]); else realPush([st, t, u]);
  };
  H.replaceState = function (st, t, u) {
    note('rep', st);
    try {
      if (Q.length && u === undefined) { Q[Q.length - 1] = [st, Q[Q.length - 1][1], Q[Q.length - 1][2]]; return; }
      var fl = floor > 0 && D <= floor;
      if (Q.length || fl) { nRep.call(H, fl || Q.length ? nat() : stamp(st, D), t === undefined ? '' : t, u); return; }   // 바닥 칸·줄 아래 칸 — 주소만(학생 토큰 숨기기) · 깊이 표식은 그대로
      nRep.call(H, stamp(st, D), t === undefined ? '' : t, u);
    } catch (e) {}
  };
  H.go = function (k) {
    k = Number(k) || 0; note('go' + k);
    if (k >= 0) return nGo.call(H, k);
    var n = -k, v = Math.min(n, Q.length);
    if (v) { Q.length -= v; n -= v; }
    n = Math.min(n, Math.max(0, D - floor));             // 바닥 아래(옛 칸)로는 안 내려간다
    if (n > 0) { nGo.call(H, -n); return; }              // 진짜 popstate 가 온다
    if (v) synth();
  };
  H.back = function () { H.go(-1); };
  try {
    Object.defineProperty(H, 'state', { configurable: true, get: function () {
      if (Q.length) return Q[Q.length - 1][0];
      if (floor > 0 && D <= floor) return null;                       // 바닥(옛 칸 맨 위) = 아무것도 안 열림
      return clean(nat());
    } });
  } catch (e) { H.pushState = nPush; H.replaceState = nRep; H.go = nGo; delete H.back; return; }   // state 를 못 감싸면 통째로 종전
  try { nRep.call(H, stamp(nat(), D), ''); } catch (e) {}   // ③ 읽힌 칸 = 이 문서 칸(표 찍기 · 내용·깊이·주소 그대로)
  /* ④ 이 탭의 첫 페이지가 껍데기다(카톡 링크로 연 새 탭 · 홈 화면 앱 · 2026-11-11 검토 실측) — 밖이 없어 go(-(D+1)) 가 안 먹고 종전엔 뒤로마다 한 칸씩 헛돌았다(바닥 3→2→1→0).
     → 탭 첫 칸까지 한 번에 내려가 그 자리를 바닥으로(그 popstate 는 삼킨다 · 껍데기는 이미 「아무것도 안 열림」). 못 나간 것은 1.5초 뒤에도 옛 칸에 서 있는 것으로 안다.
     ⛔ navigation.currentEntry.index 로 앞 칸 유무를 재지 마라 — 같은 출처 칸만 센다(앞 사이트가 있어도 0 · 학생 재현기 reload-chain 실측: 크롬·WebKit 다 그래서 밖 대신 첫 칸에 섰다). */
  function toFirst(k) { out = false; if (k <= 0) { floor = D; try { nRep.call(H, stamp(nat(), D), ''); } catch (e) {} return; } floor = D - k; land = true; try { nGo.call(H, -k); } catch (e) { land = false; } }
  g.addEventListener('popstate', function (ev) {
    if (virt) return;
    var was = D, st = nat(); D = dOf(st); note('pop', st);
    if (land) { land = false; ev.stopImmediatePropagation(); floor = D; try { nRep.call(H, stamp(st, D), ''); } catch (e) {} return; }   // ④ 탭 첫 칸에 내려앉았다 — 이 문서 칸으로 · 바닥
    if (own(st)) { if (bounce >= 0 && D === bounce) { bounce = -1; ev.stopImmediatePropagation(); return; } }   // ③ 되돌아온 칸 — 껍데기는 그 자리에 그대로 있었다
    else if (D > floor) {                                // ③ 앞으로가 옛 문서 칸에 닿았다(뒤로 몇 칸 간 채 새로 고친 탭) — 껍데기에 안 알리고 있던 칸으로
      ev.stopImmediatePropagation(); bounce = was;
      try { nGo.call(H, was - D); } catch (e) {}
      setTimeout(function () { bounce = -1; }, 1500);   // 못 돌아갔으면 다음 칸을 삼키지 않게
      return;
    } else {                                             // ① 옛 칸(바닥 아래 · 같은 깊이의 옛 칸)에 닿았다 — 껍데기에 안 알리고 곧장 밖으로
      ev.stopImmediatePropagation();
      if (stuck) { stuck = false; toFirst(D); return; }   // ④ 지난번 나가기가 안 먹었다(밖이 없다) — 이번 뒤로에 첫 칸까지
      /* 나가는 중에 또 popstate = 아직 사이트 안(액자 문서가 바뀐 칸은 같은 깊이로 하나 더 있다 — 판·홈 액자가 처음 뜰 때의 기록 칸 · 학생 재현기 reload-chain 실측) → 남은 만큼 또 */
      var first = !out;
      out = true;
      try { nGo.call(H, -(D + 1)); } catch (e) {}
      /* ④ 1.5초 뒤에도 그 자리 = 밖이 없을 **수도** 있다 — ⛔ 여기서 또 움직이지 마라(검토 2026-11-12 실측: 앞 페이지가 1.8초 넘게 늦게 뜨면 나가는 중인데 한 번 더 go 해 탭 첫 칸(about:blank)까지 지나쳤다 · 크롬·WebKit).
         표시만 해 두고 다음 뒤로에 첫 칸으로(그 사이 나가면 이 문서가 없어져 아무 일 없다) — 첫 페이지 탭은 뒤로 두 번에 첫 칸. */
      if (first) setTimeout(function () { if (out && !own(nat())) stuck = true; out = false; }, 1500);
      return;
    }
    if (Q.length) Q = [];                                // 줄에 세운 채 진짜 뒤로 — 줄 칸은 그 아래 칸보다 위였다(선생님 histQ 와 같은 약속)
  }, true);
  function gesture() { gestAt = Date.now(); flush(true); }
  g.addEventListener('message', function (ev) { var d = ev && ev.data; if (d && d.onf === 'hwTap' && ev.source && ev.source !== g) gesture(); });
  g.addEventListener('pointerup', gesture, true);
  g.addEventListener('keyup', gesture, true);
  g.onfHistL = { floor: function () { return floor; }, peek: function () { return { D: D, floor: floor, q: Q.length }; }, log: LOG };
})(window);
