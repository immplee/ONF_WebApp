/* ONF 첫 화면 로고 로딩 — 2026-10-22 Peter 「원형 도넛 + 불러오는 중 대신 로고 모션」
 *
 *   C 채움 → 7 제자리로 → 통통 (목업 ONF_SlackBot docs/검수-목업/2026-10-22-로고로딩/v4.html 에서 고른 조합 · 배경 = 기본 단색)
 *     ① 채움: 흐린 워드마크 위로 주황이 왼→오로 차오른다. **진짜 퍼센트가 아니다** — 껍데기는 구글이 홈을 짓는 동안 안을 못 본다.
 *        그래서 「이 기기 최근 다섯 번 평균」에 맞춰 다가가되 92% 에서 멈춘다(0초 8% · 평균 시각 ≈84%). 다 뜨면 0.25초에 100%.
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
 *   ⚠️ 학생 껍데기(index.html) 홈 액자 한 곳만 — 교재 판(.onf-bookpanel .onf-wait)·선생님 껍데기(teacher/)는 종전 고리 그대로.
 */
(function (global) {
  'use strict';

  var ON = true;                                   // ⛔ 전 기기 되돌리기 = false
  var KEY = 'onfLoadFx', HIST = 'onfLoadMs';
  var SAFE_MS = 30000, GRACE_MS = 1500, FILL_MS = 250, HOLD_MS = 120, FLY_MS = 950, FADE_MS = 300;
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
  function expected(ls) {
    var a = [];
    try { a = JSON.parse(ls.getItem(HIST) || '[]'); } catch (e) {}
    a = Array.isArray(a) ? a.filter(function (x) { return typeof x === 'number' && x > 0 && x < 60000; }).slice(-5) : [];
    if (!a.length) return 4000;
    var m = a.reduce(function (s, x) { return s + x; }, 0) / a.length;
    return Math.min(20000, Math.max(800, m));
  }
  function remember(ls, ms) {
    try {
      var a = JSON.parse(ls.getItem(HIST) || '[]');
      a = (Array.isArray(a) ? a : []).concat([Math.round(ms)]).slice(-5);
      ls.setItem(HIST, JSON.stringify(a));
    } catch (e) {}
  }
  function curve(t, E) { return 0.08 + 0.84 * (1 - Math.exp(-2.3 * t / E)); }   // 0초 8% · E 에 ≈84% · 끝없이 기다려도 92%
  /* 홈이 보낸 로고 자리 — 안쪽 화면 좌표(px). 모양이 이상하면 null(→ 날지 않고 걷힌다). */
  function brandOk(d, vw, vh) {
    if (!d || d.onf !== 'brand') return null;
    var x = +d.x, y = +d.y, w = +d.w, h = +d.h;
    if (![x, y, w, h].every(isFinite)) return null;
    if (w < 16 || h < 4 || w > vw || x < -1 || y < -1 || x + w > vw + 1 || y + h > vh + 1) return null;
    var k = d.k === 'text' ? 'text' : (d.k === 'svg' ? 'svg' : null);
    if (!k) return null;
    var c = typeof d.c === 'string' && /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., ]{5,40}\))$/.test(d.c) ? d.c : ORANGE;
    return { x: x, y: y, w: w, h: h, k: k, c: c };
  }
  /* 마무리 고르기 — 날 수 있을 때만 난다 */
  function pick(brand, reduced, canAnimate) { return brand && !reduced && canAnimate ? 'fly' : 'fade'; }

  var CSS =
    '.onf-ld{position:fixed;inset:0;z-index:5;pointer-events:none;contain:strict}'
  + '.onf-ld-bg{position:absolute;inset:0;background:var(--onf-bg,#1E1611)}'
  + '.onf-ld-logo{position:absolute;left:50%;top:50%;width:min(62vw,300px);transform:translate(-50%,-50%)}'
  + '.onf-ld-in{position:relative;width:100%}'
  + '.onf-ld svg{display:block;width:100%;height:auto;overflow:visible;fill:' + ORANGE + '}'
  + '.onf-ld-ghost{opacity:.16}'
  + '.onf-ld-fill{position:absolute;inset:0;clip-path:inset(0 92% 0 0)}'
  + '.onf-ld .L{transform-box:fill-box;transform-origin:50% 100%}'
  + '.onf-ld.hop .L{animation:onfLdHop ' + HOP_MS + 'ms cubic-bezier(.3,0,.3,1) both}'
  + '@keyframes onfLdHop{0%{transform:none}18%{transform:scale(1.06,.9)}48%{transform:translateY(-34%) scale(.96,1.06)}78%{transform:scale(1.05,.93)}100%{transform:none}}';

  function svg(cls) {
    var s = '<svg class="' + cls + '" viewBox="' + VB + '" aria-hidden="true" focusable="false">';
    for (var i = 0; i < LETTERS.length; i++) s += '<g class="L" style="animation-delay:' + (i * HOP_STEP) + 'ms">' + LETTERS[i] + '</g>';
    return s + '</svg>';
  }

  var doc = global.document, box = null, fillEl = null, ls = null, on = false;
  try { ls = global.localStorage; } catch (e) {}
  try {
    on = !!(doc && doc.body) && readOn(new URLSearchParams(global.location.search), ls);
    if (on) {
      var st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
      box = doc.createElement('div'); box.className = 'onf-ld'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = '<div class="onf-ld-bg"></div><div class="onf-ld-logo"><div class="onf-ld-in">'
        + svg('onf-ld-ghost') + '<div class="onf-ld-fill">' + svg('') + '</div></div></div>';
      doc.body.appendChild(box);
      fillEl = box.querySelector('.onf-ld-fill');
    }
  } catch (e) { try { if (box && box.parentNode) box.parentNode.removeChild(box); } catch (e2) {} box = null; }

  /* 홈 액자에 묶는다 — index.html 이 mount 직전에 부른다. 돌려준 hooks 를 openExec 가 부른다(ok = 산 화면 · stuck = 못 엶). */
  function bind(frameEl, opts) {
    if (!box) return null;
    opts = opts || {};
    var t0 = global.performance ? performance.now() : Date.now();
    var E = expected(ls), phase = 'wait', raf = 0, timers = [], anims = [], brand = null, okAt = 0, home = null;   // home = 로고 자리를 보낸 창·출처(숨김·다시 보임을 알린다)
    var reduced = false;
    try { reduced = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    function now() { return global.performance ? performance.now() : Date.now(); }
    function later(f, ms) { timers.push(setTimeout(function () { try { f(); } catch (e) { gone(); } }, ms)); }
    function setP(p) { fillEl.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)'; }
    function tellHome(k) { try { if (home) home.w.postMessage({ onf: k }, home.o); } catch (e) {} }
    function gone() {
      if (phase === 'gone') return;
      phase = 'gone';
      tellHome('brandDone');                                                // 홈 로고 다시 보이기(받은 적 없으면 아무 일 없다)
      try { cancelAnimationFrame(raf); } catch (e) {}
      timers.forEach(clearTimeout);
      global.removeEventListener('message', onMsg);
      try { if (box.parentNode) box.parentNode.removeChild(box); } catch (e) {}
    }
    function tick() {
      if (phase !== 'wait') return;
      try { setP(curve(now() - t0, E)); raf = requestAnimationFrame(tick); } catch (e) { gone(); }
    }
    function finish() {
      if (phase !== 'wait') return;
      phase = 'fin';
      cancelAnimationFrame(raf);
      remember(ls, (okAt || now()) - t0);
      var p0 = curve(now() - t0, E), f0 = now();
      (function up() {
        if (phase !== 'fin') return;
        try {
          var k = Math.min(1, (now() - f0) / FILL_MS);
          setP(p0 + (1 - p0) * (1 - Math.pow(1 - k, 3)));
          if (k < 1) { raf = requestAnimationFrame(up); return; }
          later(function () { pick(brand, reduced, typeof box.animate === 'function') === 'fly' ? fly() : fade(); }, HOLD_MS);
        } catch (e) { gone(); }
      })();
    }
    function fade() {
      if (typeof box.animate !== 'function') return gone();
      anims.push(box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' }));
      later(gone, FADE_MS + 20);
    }
    /* 활처럼 휜 길 — 가로(바깥 .onf-ld-logo)와 세로·크기(안 .onf-ld-in)를 서로 다른 곡선으로. 끝은 길게 감속. 홈은 안 움직인다(목업 v3 에서 홈이 커지는 중이라 끝이 튀었다). */
    function fly() {
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
      anims.push(fillEl.querySelector('svg').animate([{ fill: ORANGE }, { fill: brand.c }], { duration: FLY_MS, easing: 'ease-in', fill: 'forwards' }));
      anims.push(box.querySelector('.onf-ld-bg').animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: FLY_MS * 0.55, delay: FLY_MS * 0.25, easing: 'ease-out', fill: 'forwards' }));
      later(function () {
        box.classList.add('hop');                                           // 왼쪽 글자부터 하나씩
        var end = (LETTERS.length - 1) * HOP_STEP + HOP_MS;
        if (brand.k === 'svg') later(gone, end + 30);                       // 밑의 홈 로고와 같은 자리·같은 모양 — 그냥 걷는다
        else { later(function () { tellHome('brandDone'); anims.push(box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })); later(gone, 240); }, end); }   // 글자 이름(PC 메뉴 「Ownify」) — 겹친 로고를 살짝 걷는다
      }, FLY_MS);
    }
    function onMsg(ev) {
      try {
        if (phase !== 'wait' || !ev || !ev.data || ev.data.onf !== 'brand' || !opts.home) return;
        if (!global.ONF || !ONF.frame || !ONF.frame._fromOurFrame(ev.source, frameEl)) return;
        if (!/(^|\.)googleusercontent\.com$/.test(new URL(ev.origin).hostname)) return;
        var b = brandOk(ev.data, frameEl.clientWidth || global.innerWidth, frameEl.clientHeight || global.innerHeight);
        if (!b) return;
        brand = b; if (!okAt) okAt = now();
        home = { w: ev.source, o: ev.origin };
        finish();
      } catch (e) {}
    }
    global.addEventListener('message', onMsg);
    later(gone, SAFE_MS);
    tick();
    return {
      ok: function () {                                                     // 산 화면 — 홈이면 로고 자리를 조금 기다리고, 아니면 바로 끝낸다
        if (phase !== 'wait') return;
        if (!okAt) okAt = now();
        if (opts.home) later(finish, GRACE_MS); else finish();
      },
      stuck: gone                                                           // 못 열었다 — 종전 안내가 보이게 바로 걷는다
    };
  }

  global.ONF = global.ONF || {};
  global.ONF.load = { bind: bind,
    /* 검사용으로만 — 화면 코드에서 부르지 마라 */
    _t: { readOn: readOn, expected: expected, remember: remember, curve: curve, brandOk: brandOk, pick: pick, on: function () { return !!box; } } };
})(window);
