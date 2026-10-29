/* ONF 첫 화면 로고 로딩 — 2026-10-22 Peter 「원형 도넛 + 불러오는 중 대신 로고 모션」
 *
 *   C 채움 → 7 제자리로 → 통통 (목업 ONF_SlackBot docs/검수-목업/2026-10-22-로고로딩/v4.html 에서 고른 조합 · 배경 = 기본 단색)
 *     ① 채움: 흐린 워드마크 위로 주황이 왼→오로 차오른다. 껍데기가 아는 **진짜 단계 둘**에 맞춘다(Peter 2026-10-24 「로딩 속도에 맞춰 채워지게」):
 *        화면이 살아남(노크 · ok)까지 60% · 홈이 다 그림(brand)까지 92% — 단계마다 「이 기기 최근 다섯 번 평균」 걸린 시간으로 다가간다(구글이 짓는 동안 안은 못 본다).
 *        ⛔ 끝나는 길은 **전부** 남은 만큼을 빠르게 끝까지 채운 뒤 넘어간다(0.2~0.6초 · 남은 양에 비례) — 못 엶·안전 시계도(Peter 「다 안 찼을 때 모션을 꺼 버리지 말고」).
 *     ② 제자리로: 홈이 알려 준 자기 로고 자리(`{onf:'brand'}` — Ownify ONF_Home_Html onfBrandTell)로 활처럼 휜 길(세로 먼저·가로 늦게)로 0.95초 긴 감속.
 *        날아가는 동안 바탕이 걷혀 그 밑의 홈이 보인다. ③ 통통: 내려앉으면 왼쪽 글자부터 하나씩 튄다 → 겹쳐 둔 로고를 걷는다.
 *        ⚠️ 날고 튀는 동안 홈의 진짜 로고는 숨는다 — 자리를 받으면 `{onf:'brandHold'}`, 걷을 때 `{onf:'brandDone'}` 를 홈에 보낸다
 *          (안 숨기면 바탕이 걷히는 순간 로고가 둘로 보였다 — 2026-10-22 헤드리스 3.5초 장면). 홈은 답을 못 받아도 4초면 스스로 다시 보인다.
 *     홈이 아닌 화면(교재 짧은 주소·mode=share/mine)·로고 자리를 안 알려 준 홈 → 채움 끝나면 그냥 걷힌다(fade).
 *
 *   ⛔ 되돌리기 (Peter 「다시 되돌릴 수 있게」)
 *     · 전 기기: 아래 `ON = true` 를 false 로 바꿔 push — 이 파일이 아무것도 안 그리고, 종전 「고리 + 불러오는 중」(index.html .onf-wait) 그대로다.
 *     · 이 기기만: 주소에 `?loadfx=0`(끔 · 기억) / `?loadfx=1`(켬 · 기억 — ON=false 여도 이 기기는 켠다 = 끈 채로 시험하는 길).
 *     · 통째로: 이 파일을 싣는 index.html 의 <script> 한 줄과 mount 의 hooks 한 칸을 걷는다(onf-frame.js openExec 의 hooks 는 없으면 아무 일 없다).
 *
 *   ⛔ 이 막은 화면을 **절대 못 막는다** — 망가져도 종전보다 나빠지지 않게:
 *     · pointer-events:none — 막이 남아 있어도 누르기는 밑의 홈으로 간다.
 *     · 30초 안전 시계 — 무슨 일이 있어도 30초면 걷는다.
 *     · 못 열었다(openExec say · 구글 오류 · 여러 계정) → 그 자리에서 걷는다(종전 안내가 그대로 보인다).
 *     · 이 파일의 어떤 오류도 막을 걷고 끝난다(try/catch). 파일이 안 실리면 막 자체가 없다(종전).
 *   ⛔ 받는 말은 홈 액자 후손 + googleusercontent 출처만(onf-frame.js 출처 자물쇠와 같은 검사) · 값은 숫자·모양 검사 뒤에만 쓴다.
 *   ⚠️ 두 껍데기 홈 액자 — 학생(index.html · 실릴 때 바로) · 선생님(teacher/index.html · `data-lazy` = 로그인 뒤 mount 때 · 2026-10-22 Peter 폰에서 「고리 그대로」 — 그때 선생님 껍데기엔 이 막이 없었다).
 *     교재 판(.onf-bookpanel .onf-wait)은 종전 고리 그대로.
 */
(function (global) {
  'use strict';

  var ON = true;                                   // ⛔ 전 기기 되돌리기 = false
  var KEY = 'onfLoadFx', HIST = 'onfLoadMs', HIST1 = 'onfLoadMs1', HIST2 = 'onfLoadMs2';   // 다 뜸까지 · 노크까지 · 노크 뒤 다 그림까지(단계 채움)
  var SAFE_MS = 30000, HOME_MS = 15000, HOLD_MS = 120, FLY_MS = 950, FADE_MS = 300;
  /* ⛔ [2026-10-25 Peter 「로고 모션은 항상 끝까지 — 차오르고, 왼쪽 위로 가서, 글자별로 통통까지. 로딩이 빠르면 차오르는 속도를 빠르게 하면 되잖아, 건너뛰지 말고」]
     종전 「0.5초 안에 다 그렸으면 0.2초 투명 걷힘」(QUICK_MS · 밖으로 3 · 2026-10-24)을 걷었다 — 정적 홈(시험 학생)이 빨라 늘 그 길을 타서
     로고가 덜 찬 채 사라지고 밑에서 블럭이 「확인 중」인 홈이 그대로 보였다. 이제 빠르면 fillUp 이 남은 만큼을 짧게(0.2~0.6초) 채우고 언제나 날고 튄다. */
  var HOP_STEP = 75, HOP_MS = 460;
  var ORANGE = '#D2691E';
  var VB = '60 60 712.7 118.7';                    // ⛔ Ownify ONF_Brand_Svg 와 같은 viewBox·같은 글자 — 홈 로고 상자와 1:1 로 겹친다
  var LETTERS = [
    "<g transform=\"translate(120.515,159.190) scale(0.98,1.0) translate(-65.0,0)\"><path d=\"M3.25 -38.61Q3.25 -56.03 10.725 -69.095Q18.2 -82.16 32.11 -89.375Q46.02 -96.59 65.0 -96.59Q83.850 -96.59 97.825 -89.375Q111.8 -82.16 119.275 -69.03Q126.75 -55.9 126.75 -38.61Q126.75 -21.32 119.275 -8.19Q111.8 4.94 97.825 12.22Q83.850 19.5 65.0 19.5Q46.15 19.5 32.175 12.285Q18.2 5.07 10.725 -8.06Q3.25 -21.19 3.25 -38.61ZM84.11 -38.61Q84.11 -49.660 78.975 -55.445Q73.84 -61.230 65.0 -61.230Q56.160 -61.230 51.025 -55.445Q45.89 -49.660 45.89 -38.61Q45.89 -27.43 51.025 -21.645Q56.160 -15.860 65.0 -15.860Q73.84 -15.860 78.975 -21.645Q84.11 -27.43 84.11 -38.61Z\"/></g>",
    "<g transform=\"translate(267.015,159.190) scale(0.98,1.0) translate(-78.0,0)\"><path d=\"M1.3 -93.990H37.7L38.74 -87.490Q41.34 -70.460 43.745 -56.680Q46.15 -42.9 49.27 -28.6Q52.13 -40.56 54.925 -54.405Q57.72 -68.25 59.93 -79.95L62.53 -93.34H93.47L96.070 -79.95Q98.28 -68.25 101.075 -54.405Q103.87 -40.56 106.73 -28.6Q109.98 -43.29 112.125 -55.965Q114.270 -68.64 117.65 -89.7L118.3 -93.990H154.700Q151.450 -65.26 144.495 -33.93Q137.54 -2.6 130.13 16.900H88.14Q83.460 0.91 78.0 -25.61Q72.54 0.91 67.86 16.900H25.87Q18.46 -2.6 11.505 -33.93Q4.55 -65.26 1.3 -93.990Z\"/></g>",
    "<g transform=\"translate(414.915,159.190) scale(0.98,1.0) translate(-62.400,0)\"><path d=\"M44.72 -37.83Q44.59 -13.13 42.64 16.900H10.4Q5.850 -16.900 5.850 -50.7Q5.850 -71.76 7.41 -93.990H45.370Q53.95 -84.76 62.92 -71.240Q71.89 -57.72 80.08 -42.25Q80.08 -64.48 80.73 -93.990H117.39Q118.95 -71.76 118.95 -50.7Q118.95 -16.900 114.4 16.900H80.86Q71.5 6.890 62.269 -7.345Q53.04 -21.580 44.72 -37.83Z\"/></g>",
    "<g transform=\"translate(510.225,159.190) scale(0.98,1.0) translate(-26.91,0)\"><path d=\"M5.850 -50.050Q5.850 -70.72 7.28 -93.990H46.54Q47.97 -70.72 47.97 -50.050Q47.97 -16.12 44.2 16.900H9.620Q5.850 -16.12 5.850 -50.050Z\"/></g>",
    "<g transform=\"translate(601.660,159.190) scale(0.98,1.0) translate(-56.525,-93.99)\"><path d=\"M3.5 66 C3.3 52 3.8 36 7 22 C9.5 12 14 5.5 22 2 C34 -3.2 46 -5 58 -5.2 C72 -5.4 90 -1.8 99.97 2.99 L95.16 36.92 Q84.5 33.15 72.41 33.15 Q64.48 33.15 59.54 34.97 Q49.53 38.35 46.41 48.23 Q60.06 47.58 70.98 47.58 Q82.16 47.58 94.25 48.23 L94.51 80.99 Q82.16 82.03 64.87 82.03 Q54.99 82.03 45.24 81.64 Q45.76 93.99 47.45 110.89 L8.32 110.89 C5 96 3.7 82 3.5 66 Z\"/></g>",
    "<g transform=\"translate(716.685,159.190) scale(0.98,1.0) translate(-58.5,0)\"><path d=\"M1.3 -93.990H41.86Q47.71 -74.36 58.5 -50.31Q69.29 -74.36 75.14 -93.990H115.7Q111.15 -75.66 101.855 -55.315Q92.56 -34.97 80.600 -15.99Q80.73 -13.780 80.73 -9.23Q80.73 4.16 78.52 16.900H38.480Q36.27 4.55 36.27 -10.790V-15.99Q24.310 -35.1 15.080 -55.445Q5.850 -75.79 1.3 -93.990Z\"/></g>"
  ];

  /* ── 순수 판단(검사가 vm 으로 잰다) ── */
  function readOn(q, ls) {
    var v = q && q.get ? q.get('loadfx') : null;
    try { if (v === '0' || v === '1') ls.setItem(KEY, v); else v = ls.getItem(KEY); } catch (e) {}
    return ON ? v !== '0' : v === '1';
  }
  function expected(ls, key, def, lo) {
    var a = [];
    try { a = JSON.parse(ls.getItem(key || HIST) || '[]'); } catch (e) {}
    a = Array.isArray(a) ? a.filter(function (x) { return typeof x === 'number' && x > 0 && x < 60000; }).slice(-5) : [];
    if (!a.length) return def || 4000;
    var m = a.reduce(function (s, x) { return s + x; }, 0) / a.length;
    return Math.min(20000, Math.max(lo || 800, m));
  }
  function remember(ls, ms, key) {
    try {
      var a = JSON.parse(ls.getItem(key || HIST) || '[]');
      a = (Array.isArray(a) ? a : []).concat([Math.round(ms)]).slice(-5);
      ls.setItem(key || HIST, JSON.stringify(a));
    } catch (e) {}
  }
  function curve(t, E) { return 0.08 + 0.84 * (1 - Math.exp(-2.3 * t / E)); }   // (옛 한 줄 곡선 · 검사가 잰다) 0초 8% · E 에 ≈84% · 끝없이 기다려도 92%
  /* 단계 채움 — 노크 전: 0초 8% → 노크 평균 시각 ≈52% → 60% 상한 · 노크 뒤: 노크 때 자리에서 → 다 그림 평균 시각 ≈84% 몫 → 92% 상한 */
  function stage(t, E1, okT, E2) {
    var p1 = function (x) { return 0.08 + 0.52 * (1 - Math.exp(-2.3 * x / E1)); };
    if (okT == null || t < okT) return p1(t);
    var a = p1(okT); return a + (0.92 - a) * (1 - Math.exp(-2.3 * (t - okT) / E2));
  }
  function fillMs(p0) { return Math.round(180 + 420 * Math.max(0, Math.min(1, 1 - p0))); }   // 남은 만큼 — 92% 에서 ≈0.21초 · 30% 에서 ≈0.47초
  /* 새로고침(⌘R · 당겨서 새로고침)이면 로고 막을 안 띄운다(Peter 2026-10-25 「새로 고침할 때는 로고가 날아와서 튕겨지지 않도록」 · 고른 것 = 「로고 모션 없이 바로 홈」).
     처음 열기·다시 열기(navigate)·뒤로(back_forward)는 종전대로 막을 띄운다. 못 재는 브라우저는 새로고침이 아니라고 본다(종전 그대로). */
  function isReload(perf) {
    try {
      var n = perf && perf.getEntriesByType && perf.getEntriesByType('navigation');
      if (n && n[0] && n[0].type) return n[0].type === 'reload';
      return !!(perf && perf.navigation && perf.navigation.type === 1);   // 옛 사파리(Navigation Timing 1 · TYPE_RELOAD)
    } catch (e) { return false; }
  }
  /* 홈이 보낸 로고 자리 — 안쪽 화면 좌표(px). 모양이 이상하면 null(→ 날지 않고 걷힌다). */
  function brandOk(d, vw, vh) {
    if (!d || d.onf !== 'brand') return null;
    if (d.k === 'none') return { k: 'none' };                                // 다 떴는데 내려앉을 자리가 없다(못 들어오는 안내 등) — 기다리지 않고 걷힌다
    var x = +d.x, y = +d.y, w = +d.w, h = +d.h;
    if (![x, y, w, h].every(isFinite)) return null;
    if (w < 16 || h < 4 || w > vw || x < -1 || y < -1 || x + w > vw + 1 || y + h > vh + 1) return null;
    var k = d.k === 'text' ? 'text' : (d.k === 'svg' ? 'svg' : null);
    if (!k) return null;
    var c = typeof d.c === 'string' && /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., ]{5,40}\))$/.test(d.c) ? d.c : ORANGE;
    return { x: x, y: y, w: w, h: h, k: k, c: c };
  }
  /* 마무리 고르기 — 날 수 있을 때만 난다 */
  function pick(brand, reduced, canAnimate) { return brand && brand.k !== 'none' && !reduced && canAnimate ? 'fly' : 'fade'; }

  var CSS =
    '.onf-ld{position:fixed;inset:0;z-index:5;pointer-events:none;contain:strict;fill:' + ORANGE + '}'
  + '.onf-ld-hold{visibility:hidden}'                                          // 막이 가리는 동안 홈 액자(아래 hold)
  + '.onf-ld-bg{position:absolute;inset:0;background:var(--onf-bg,#1E1611)}'
  + '.onf-ld-logo{position:absolute;left:50%;top:50%;width:min(62vw,300px);transform:translate(-50%,-50%)}'
  + '.onf-ld-in{position:relative;width:100%}'
  + '.onf-ld svg{display:block;width:100%;height:auto;overflow:visible}'
  + '.onf-ld-ghost{opacity:.16}'
  /* 채움 = 가리개(.onf-ld-fill · overflow 로 자름)를 왼쪽으로 밀어 두고 속(.onf-ld-fi)을 같은 만큼 되민다 — 둘 다 transform 이라 합성기에서 돈다(아래 fillRun) */
  + '.onf-ld-fill{position:absolute;inset:0;overflow:hidden;transform:translateX(-92%)}'
  + '.onf-ld-fi{position:absolute;inset:0;transform:translateX(92%)}'
  + '.onf-ld .L{position:absolute;inset:0}'                                     // 글자 하나 = HTML 상자 하나(통통이 합성기에서 돈다 · 아래 svg 주석)
  + '.onf-ld.hop .L{animation:onfLdHop ' + HOP_MS + 'ms cubic-bezier(.3,0,.3,1) both}'
  + '@keyframes onfLdHop{0%{transform:none}18%{transform:scale(1.06,.9)}48%{transform:translateY(-32%) scale(.96,1.06)}78%{transform:scale(1.05,.93)}100%{transform:none}}';

  function svg(cls, inner) { return '<svg class="' + cls + '" viewBox="' + VB + '" aria-hidden="true" focusable="false">' + inner + '</svg>'; }
  /* ⛔ [2026-10-29 Peter 「뭔가 계속 끊긴다」] 통통 글자는 svg <g> 가 아니라 **글자마다 HTML 상자**(.L) 다.
     svg 안 요소의 transform 은 합성기로 못 간다 — 종전엔 튈 때마다 메인 스레드가 레이아웃·칠하기를 다시 했다(헤드리스 트레이스 0.87초에 레이아웃 52·칠하기 156번).
     상자는 막 전체 크기(겹쳐 둔다) · 튀는 기준점 = 그 글자 아래 가운데(글자 g 의 translate x · 바닥 98%). */
  function letters() {
    var s = '', vb = VB.split(' ');
    for (var i = 0; i < LETTERS.length; i++) {
      var x = +(/translate\(([\d.]+),/.exec(LETTERS[i]) || [0, 0])[1];
      s += '<div class="L" style="animation-delay:' + (i * HOP_STEP) + 'ms;transform-origin:' + ((x - vb[0]) / vb[2] * 100).toFixed(2) + '% 98%">' + svg('', LETTERS[i]) + '</div>';
    }
    return s;
  }

  var doc = global.document, box = null, fillEl = null, fiEl = null, ls = null, on = false, lazy = false;
  try { ls = global.localStorage; } catch (e) {}
  /* 막 만들기 — 학생 껍데기는 이 파일이 실릴 때 바로(고리보다 먼저 보이게) · 선생님 껍데기는 `data-lazy` 라 bind 때(⛔ 로그인 화면을 가리면 안 된다). */
  function make() {
    try {
      var st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
      box = doc.createElement('div'); box.className = 'onf-ld'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = '<div class="onf-ld-bg"></div><div class="onf-ld-logo"><div class="onf-ld-in">'
        + svg('onf-ld-ghost', LETTERS.join('')) + '<div class="onf-ld-fill"><div class="onf-ld-fi">' + letters() + '</div></div></div></div>';
      doc.body.appendChild(box);
      fillEl = box.querySelector('.onf-ld-fill'); fiEl = box.querySelector('.onf-ld-fi');
    } catch (e) { try { if (box && box.parentNode) box.parentNode.removeChild(box); } catch (e2) {} box = null; }
  }
  try {
    lazy = !!(doc && doc.currentScript && doc.currentScript.hasAttribute && doc.currentScript.hasAttribute('data-lazy'));
    /* 📏 [2026-10-29 Peter] 걸린 시간 기억은 **껍데기마다 따로** — 학생·선생님 홈이 같은 출처(class.ownify.co.kr)라 같은 칸에 섞였다
       (같은 기기에서 둘을 번갈아 열면 채움 속도가 남의 평균을 따랐다). 선생님 껍데기 = data-lazy 로 싣는 쪽 → 칸 이름 끝 T. 첫 몇 번은 기본값으로 채우고 다시 배운다. */
    if (lazy) { HIST += 'T'; HIST1 += 'T'; HIST2 += 'T'; }
    on = !!(doc && doc.body) && readOn(new URLSearchParams(global.location.search), ls) && !isReload(global.performance);
    if (on && !lazy) make();
  } catch (e) { on = false; }

  /* 홈 액자에 묶는다 — index.html 이 mount 직전에 부른다. 돌려준 hooks 를 openExec 가 부른다(ok = 산 화면 · stuck = 못 엶). */
  function bind(frameEl, opts) {
    if (on && lazy && !box) make();                                         // 선생님 껍데기 — 로그인 뒤 액자를 열 때 처음 그린다
    if (!box) return null;
    opts = opts || {};
    /* ⛔ [2026-10-29 Peter 화면 기록 「아직도 끊겨」] 막이 가리는 동안 홈 액자를 **안 그리게** 둔다(visibility:hidden — 크롬은 숨은 액자의 그리기를 쉰다).
       기록: 채움 뒤쪽(구글 래퍼·샌드박스·홈 문서가 차례로 들어서는 2.7초)에 창 전체가 초당 ≈13번만 그려졌다 — 덮여 안 보이는 액자가 중간 화면을
       그리고 래스터하느라 GPU 를 잡았다. 홈은 숨어도 돌고(타이머·레이아웃) 로고 자리(brand)도 그대로 잰다 → 채움을 끝내기 시작할 때(finish) 보인다.
       ⚠️ 클래스로만 — onf-frame.js openExec 가 다시 열기·못 엶에서 쓰는 인라인 visibility 와 안 겹친다(걷어도 그쪽 hidden 은 남는다). */
    function hold(on) { try { frameEl.classList[on ? 'add' : 'remove']('onf-ld-hold'); } catch (e) {} }
    hold(true);
    var t0 = global.performance ? performance.now() : Date.now();
    var E1 = expected(ls, HIST1, 2500, 300), E2 = expected(ls, HIST2, 2000, 300), phase = 'wait', timers = [], anims = [], fa = [], brand = null, okAt = 0, home = null;   // home = 로고 자리를 보낸 창·출처(숨김·다시 보임을 알린다)
    var reduced = false;
    try { reduced = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    function now() { return global.performance ? performance.now() : Date.now(); }
    function later(f, ms) { timers.push(setTimeout(function () { try { f(); } catch (e) { gone(); } }, ms)); }
    function tr(p) { return ['translateX(' + ((p - 1) * 100).toFixed(2) + '%)', 'translateX(' + ((1 - p) * 100).toFixed(2) + '%)']; }   // [가리개, 속]
    function setP(p) { var t = tr(p); fillEl.style.transform = t[0]; fiEl.style.transform = t[1]; }
    /* ⛔ [2026-10-29 Peter 「뭔가 계속 끊긴다」] 채움은 **합성기 애니메이션**이다 — 종전엔 rAF 마다 clip-path 를 바꿨다:
       ① 프레임마다 칠하기·래스터(헤드리스 6초에 칠하기 693·래스터 347) ② 메인 스레드에 묶여, 액자(구글 화면)가 같은 프로세스에서 도는 폰·아이폰에선
       구글 스크립트 한 덩이(0.2~0.3초)마다 채움이 그 자리에 멈췄다(헤드리스 폰·한 프로세스·CPU×4 실측 max 317ms).
       → 지금 곡선(stage)을 점 몇 개로 떠서 WAAPI transform 으로 넘긴다. 노크·다 그림에서 새로 뜬다. ps = 채움 값들 · 균등 간격. */
    function fillRun(ps, ms, easing) {
      fa.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      setP(ps[ps.length - 1]);                                              // 끝값을 스타일에 — 애니메이션이 없거나 끝나도 그 자리
      if (typeof fillEl.animate !== 'function' || ms <= 0) { fa = []; return; }
      fa = [0, 1].map(function (k) {
        return [fillEl, fiEl][k].animate(ps.map(function (p) { return { transform: tr(p)[k] }; }), { duration: ms, easing: easing || 'linear' });
      });
    }
    /* 지금 단계의 곡선을 끝(상한의 99%)까지 — 노크 전 4·E1 · 노크 뒤 4·E2 */
    function fillCurve() {
      var t = now() - t0, ok = okAt ? okAt - t0 : null, H = ok == null ? 4 * E1 : ok + 4 * E2, ps = [];
      if (t >= H) return fillRun([pNow()], 0);
      for (var i = 0; i <= 16; i++) ps.push(stage(t + (H - t) * i / 16, E1, ok, E2));
      fillRun(ps, H - t);
    }
    function tellHome(k) { try { if (home) home.w.postMessage({ onf: k }, home.o); } catch (e) {} }
    function gone() {
      if (phase === 'gone') return;
      phase = 'gone';
      hold(false);
      tellHome('brandDone');                                                // 홈 로고 다시 보이기(받은 적 없으면 아무 일 없다)
      timers.forEach(clearTimeout);
      global.removeEventListener('message', onMsg);
      try { if (box.parentNode) box.parentNode.removeChild(box); } catch (e) {}
    }
    function pNow() { return stage(now() - t0, E1, okAt ? okAt - t0 : null, E2); }
    /* 끝까지 빠르게 채운 뒤 then — 끝나는 길은 전부 여기를 지난다(Peter 2026-10-24) · 끝은 시계로 안다(숨은 탭에서도 · then 은 한 번만 돈다) */
    function fillUp(then) {
      var p0 = pNow(), d = fillMs(p0);
      fillRun([p0, 1], d, 'cubic-bezier(.33,1,.68,1)');                     // 감속(옛 1-(1-k)³ 과 같은 꼴)
      later(function () { if (phase !== 'gone') then(); }, d);
    }
    function finish() {
      if (phase !== 'wait') return;
      phase = 'fin';
      hold(false);                                                          // 끝까지 채우고(0.2~0.6초) 멈춤 0.12초 동안 홈이 한 번 그려진다 — 날기 전에
      var at = now();
      remember(ls, (okAt || at) - t0);
      if (okAt) remember(ls, okAt - t0, HIST1);
      if (okAt && brand && at > okAt) remember(ls, at - okAt, HIST2);
      var done = false;
      fillUp(function () { if (done) return; done = true; later(function () { pick(brand, reduced, typeof box.animate === 'function') === 'fly' ? fly() : fade(); }, HOLD_MS); });
    }
    /* 못 엶·안전 시계 — 바로 없애지 않고 끝까지 채운 뒤 살짝 걷는다(안내가 0.4초 안에 보인다) */
    function quit() {
      if (phase === 'gone' || phase === 'quit') return;
      if (phase === 'fly') return gone();
      phase = 'quit';
      hold(false);
      var done = false;
      fillUp(function () { if (done) return; done = true; if (typeof box.animate !== 'function') return gone(); anims.push(box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })); later(gone, 180); });
    }
    function fade(ms) {
      ms = ms || FADE_MS;
      if (typeof box.animate !== 'function') return gone();
      anims.push(box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' }));
      later(gone, ms + 20);
    }
    /* 활처럼 휜 길 — 가로(바깥 .onf-ld-logo)와 세로·크기(안 .onf-ld-in)를 서로 다른 곡선으로. 끝은 길게 감속. 홈은 안 움직인다(목업 v3 에서 홈이 커지는 중이라 끝이 튀었다). */
    function fly() {
      phase = 'fly';
      var lg = box.querySelector('.onf-ld-logo'), inn = box.querySelector('.onf-ld-in');
      var fr = frameEl.getBoundingClientRect(), a = inn.getBoundingClientRect();
      if (!a.width) return fade();
      var tw = brand.w;                                                     // 글자 폭에 맞춘다(svg 는 비율이 같아 높이도 맞다 · 글자 이름은 가운데)
      var cx = fr.left + brand.x + brand.w / 2, cy = fr.top + brand.y + brand.h / 2;
      var s = tw / a.width, dx = cx - (a.left + a.width / 2), dy = cy - (a.top + a.height / 2);
      box.querySelector('.onf-ld-ghost').style.opacity = 0;
      tellHome('brandHold');                                                // 날 때만·날기 직전에 숨긴다 — 받자마자 숨기면 숨은 탭에서 여기 오기 전에 홈의 4초 시계가 먼저 풀린다
      anims.push(lg.animate([{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(-50%,-50%) translateX(' + dx + 'px)' }],
        { duration: FLY_MS, easing: 'cubic-bezier(.55,0,.12,1)', fill: 'forwards' }));
      anims.push(inn.animate([{ transform: 'none' }, { transform: 'translateY(' + dy + 'px) scale(' + s + ')' }],
        { duration: FLY_MS, easing: 'cubic-bezier(.3,0,.08,1)', fill: 'forwards' }));
      anims.push(fiEl.animate([{ fill: ORANGE }, { fill: brand.c }], { duration: FLY_MS, easing: 'ease-in', fill: 'forwards' }));   // 글자 svg 는 색을 물려받는다
      /* ⛔ [2026-10-29 Peter 12:29 화면 기록 「왼쪽 위로 가는 과정이 약간 끊긴다」] 바탕은 날기 **뒤쪽 40%**(로고가 감속해 내려앉는 때)에 걷는다.
         바탕 투명도가 바뀌는 동안은 창 **전체**를 매 프레임 다시 합성한다(밑의 홈이 비친다) — GPU 가 바쁜 기기에선 그 구간만 30fps 로 떨어졌고
         (기록: 57프레임 중 7 빠짐 · 전부 걷힘 구간), 종전 25~80% 는 로고가 가장 빨리 움직이는 때와 겹쳐 끊김이 눈에 띄었다.
         빠르게 나는 동안은 불투명 바탕 위라 로고 자리만 다시 그린다(통통처럼). */
      anims.push(box.querySelector('.onf-ld-bg').animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: FLY_MS * 0.4, delay: FLY_MS * 0.6, easing: 'ease-out', fill: 'forwards' }));
      later(function () {
        fillEl.style.overflow = 'visible';                                  // ⛔ 가리개를 푼다 — 안 풀면 튀어 오른 글자 윗부분이 막 상자 위에서 잘린다(종전 clip-path 도 잘랐다)
        box.classList.add('hop');                                           // 왼쪽 글자부터 하나씩
        var end = (LETTERS.length - 1) * HOP_STEP + HOP_MS;
        if (brand.k === 'svg') later(gone, end + 30);                       // 밑의 홈 로고와 같은 자리·같은 모양 — 그냥 걷는다
        else { later(function () { tellHome('brandDone'); anims.push(box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })); later(gone, 240); }, end); }   // 글자 이름(PC 메뉴 「Ownify」) — 겹친 로고를 살짝 걷는다
      }, FLY_MS);
    }
    function onMsg(ev) {
      try {
        if (phase !== 'wait' || !ev || !ev.data) return;
        if (!global.ONF || !ONF.frame || !ONF.frame._fromOurFrame(ev.source, frameEl)) return;
        if (!(ONF.frame.isAppOrigin ? ONF.frame.isAppOrigin(ev.origin) : /(^|\.)googleusercontent\.com$/.test(new URL(ev.origin).hostname))) return;   // 🌤 onf-frame.js 와 같은 자물쇠(2026-10-24) · 옛 onf-frame.js(캐시가 어긋남)면 종전 판정
        if (ev.data.onf !== 'brand' || !opts.home) return;
        var b = brandOk(ev.data, frameEl.clientWidth || global.innerWidth, frameEl.clientHeight || global.innerHeight);
        if (!b) return;
        brand = b; if (!okAt) okAt = now();
        home = { w: ev.source, o: ev.origin };
        finish();
      } catch (e) {}
    }
    global.addEventListener('message', onMsg);
    later(quit, SAFE_MS);
    fillCurve();
    return {
      ok: function () {                                                     // 산 화면 — 홈이면 로고 자리를 조금 기다리고, 아니면 바로 끝낸다
        if (phase !== 'wait') return;
        if (!okAt) { okAt = now(); fillCurve(); }                           // 노크 — 둘째 단계 곡선으로 갈아탄다
        /* 홈은 「다 그렸다」(brand)만 기다린다 — 두 홈 다 15초(선생님은 노크 뒤 자료를 받아 그리고 · 학생은 load 뒤 첫 그리기가 끝나야 보낸다).
           ⛔ [2026-10-22 Peter 「학생 홈은 날지 않고 『원형 도넛 + 불러오는 중』」 → 아이폰 「또 떠」] 종전 학생은 1.5초만 기다렸고(a883cbc 뒤엔
             「1.5초 안에 말을 안 하면 스크립트 없는 화면」으로 짐작) — 홈이 액자 load 뒤 말을 꺼내기까지 맥 0.04~0.31초 · 아이폰은 더 걸려 그 짐작이 홈에서도 걷었고,
             안 그려진 액자 뒤 껍데기 고리가 비쳤다. → 짐작을 걷는다. 스크립트 없는 안내(잠금 두 갈래 · _onfNoticePage)는 스스로 `k:'none'` 을 보낸다(Ownify _onfBrandNoneScript).
           · 그래도 안 오면(옛 안내·구글 오류 화면) 15초에 걷힌다 · 30초 안전 시계는 그대로. */
        if (opts.home) later(finish, opts.grace || HOME_MS); else finish();
      },
      stuck: quit                                                           // 못 열었다 — 끝까지 채우고 곧바로 걷는다(종전 안내가 0.4초 안에 보인다)
    };
  }

  global.ONF = global.ONF || {};
  global.ONF.load = { bind: bind,
    /* 검사용으로만 — 화면 코드에서 부르지 마라 */
    _t: { readOn: readOn, isReload: isReload, expected: expected, remember: remember, curve: curve, stage: stage, fillMs: fillMs, brandOk: brandOk, pick: pick, on: function () { return !!box; } } };
})(window);
