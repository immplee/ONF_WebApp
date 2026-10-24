/* 🟠 첫 화면 로고 로딩(assets/onf-load.js · 2026-10-22 Peter) — 막이 **화면을 못 막는다**는 약속과 스위치·판단을 잰다.
   잰다: ① 스위치(ON·?loadfx=0|1·기기 기억) ② 평균 학습·채움 곡선(92% 상한) ③ 홈이 보낸 로고 자리 검사(모양이 이상하면 날지 않는다)
        ④ 막: 못 열면 바로 걷힘 · 홈 아닌 화면은 다 뜨면 걷힘 · 홈은 로고 자리를 받으면 난다 · 남의 창 말은 버린다 · 30초 안전 시계 · 홈인데 자리가 안 오면 여유 뒤 걷힘
   실행: node test/onf-load.test.js · LOAD_JS=<변이 판> 으로 빨강을 본다 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(process.env.LOAD_JS || path.join(__dirname, '..', 'assets', 'onf-load.js'), 'utf8');
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

/* 아주 작은 DOM 대역 — 이 파일이 만지는 것만. querySelector 는 고른 이름마다 한 벌의 가짜 요소를 돌려준다. */
function mkEl(name) {
  const subs = {};
  const el = {
    name, style: {}, attrs: {}, kids: [], parentNode: null, anims: [], _cls: new Set(),
    set className(v) { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }, get className() { return [...el._cls].join(' '); },
    classList: { add: (c) => el._cls.add(c), contains: (c) => el._cls.has(c) },
    setAttribute(k, v) { el.attrs[k] = v; },
    appendChild(c) { el.kids.push(c); c.parentNode = el; return c; },
    removeChild(c) { el.kids = el.kids.filter((x) => x !== c); c.parentNode = null; return c; },
    querySelector(sel) { return subs[sel] || (subs[sel] = mkEl(sel)); },
    getBoundingClientRect: () => el.rect || { left: 0, top: 0, width: 0, height: 0 },
    animate(kf, o) { const a = { kf, o, cancel() {} }; el.anims.push(a); return a; },
    innerHTML: '', textContent: ''
  };
  return el;
}
function env(o) {
  o = o || {};
  const now = { v: 0 }, timers = [], L = {}, ls = Object.assign({}, o.ls || {});
  const body = mkEl('body'), head = mkEl('head');
  const g = {
    console, URL, URLSearchParams, JSON, Math, Date: { now: () => now.v },
    performance: { now: () => now.v },
    location: { search: o.search === undefined ? '?loadfx=1' : o.search },   // 기본 = 이 기기 켬(전 기기 스위치 ON 이 꺼져 있어도 막 검사가 돈다)
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    setTimeout: (f, ms) => { timers.push({ f, at: now.v + (ms || 0), on: true }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].on = false; },
    requestAnimationFrame: (f) => { timers.push({ f: () => f(now.v), at: now.v + 16, on: true }); return timers.length; },
    cancelAnimationFrame: (id) => { if (timers[id - 1]) timers[id - 1].on = false; },
    matchMedia: () => ({ matches: !!o.reduced }),
    addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); },
    removeEventListener: (k, f) => { L[k] = (L[k] || []).filter((x) => x !== f); },
    innerWidth: 390, innerHeight: 844,
    document: { body, head, createElement: (tag) => mkEl(tag), currentScript: { hasAttribute: (k) => k === 'data-lazy' && !!o.lazy } }
  };
  g.window = g;
  vm.createContext(g);
  vm.runInContext(SRC, g, { filename: 'onf-load.js' });
  const tick = (ms) => { const end = now.v + ms; while (true) { const due = timers.filter((x) => x.on && x.at <= end).sort((a, b) => a.at - b.at)[0]; if (!due) break; now.v = due.at; due.on = false; due.f(); } now.v = end; };
  const box = () => body.kids.find((k) => k.className && k.className.indexOf('onf-ld') === 0) || null;
  return { g, ls, now, tick, box, L, body };
}
function win(name, parent) { const w = { name }; w.parent = parent || w; return w; }
/* 홈 액자 — 안쪽 창(exec → sandbox → user) 과 출처 자물쇠(onf-frame.js 의 것을 그대로 흉내) */
function homeFrame(s) {
  const top = win('shell'), exec = win('exec', top), user = win('user', win('sandbox', exec));
  user.sent = []; user.postMessage = (m, o) => user.sent.push([m.onf, o]);
  const fr = { contentWindow: exec, clientWidth: 390, clientHeight: 844, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) };
  s.g.ONF.frame = { _fromOurFrame(w, f) { for (let i = 0; i < 8 && w; i++) { if (w === f.contentWindow) return true; w = w.parent !== w ? w.parent : null; } return false; } };
  const send = (data, source, origin) => (s.L.message || []).slice().forEach((f) => f({ data, source: source || user, origin: origin || 'https://n-abc-0lu-script.googleusercontent.com' }));
  return { fr, send, user, top };
}
const T = (s) => s.g.ONF.load._t;
const BRAND = { onf: 'brand', x: 16, y: 18, w: 86, h: 14.3, k: 'svg', c: 'rgb(111, 74, 47)' };

console.log('[스위치 — 되돌리기]');
const ON_NOW = /\n  var ON = true;/.test(SRC);
t('기본(주소·기억 없음)은 전 기기 스위치 ON 을 따른다 · 켜지면 막을 그린다(body 에 .onf-ld 하나 · 누르기는 통과) · 지금 ON=' + ON_NOW, () => {
  assert.ok(/\n  var ON = (true|false);/.test(SRC), '⛔ 전 기기 스위치 줄이 없다');
  assert.strictEqual(!!env({ search: '' }).box(), ON_NOW, '⛔ 기본이 스위치를 안 따른다');
  const s = env();
  assert.ok(s.box(), '⛔ 막이 없다');
  assert.ok(/pointer-events:none/.test(s.g.document.head.kids[0].textContent), '⛔ 막이 누르기를 막는다');
});
t('?loadfx=0 → 안 그리고 이 기기에 기억 · 다음엔 주소 없이도 끔', () => {
  const s = env({ search: '?loadfx=0' });
  assert.strictEqual(s.box(), null); assert.strictEqual(s.ls.onfLoadFx, '0');
  assert.strictEqual(env({ search: '', ls: { onfLoadFx: '0' } }).box(), null, '⛔ 기억을 안 따른다');
  assert.strictEqual(env({ search: '', ls: { onfLoadFx: '0' } }).g.ONF.load.bind({}, {}), null, '⛔ 꺼졌는데 bind 가 손잡이를 준다');
  assert.ok(env({ search: '', ls: { onfLoadFx: '1' } }).box(), '⛔ 켬 기억(loadfx=1)을 안 따른다');
});
t('전 기기 되돌리기(ON=false) → 안 그린다 · ?loadfx=1 기기만 켠다', () => {
  const off = SRC.replace(/\n  var ON = (true|false);/, '\n  var ON = false;');
  const ctx = (search) => { const g = { console, URL, URLSearchParams, JSON, Math, location: { search }, localStorage: { getItem() { return null; }, setItem() {} },
    addEventListener() {}, removeEventListener() {}, setTimeout() {}, document: { body: mkEl('body'), head: mkEl('head'), createElement: mkEl } }; g.window = g; vm.createContext(g); vm.runInContext(off, g); return g; };
  assert.strictEqual(ctx('').document.body.kids.length, 0, '⛔ 꺼도 그린다');
  assert.strictEqual(ctx('?loadfx=1').document.body.kids.length, 1, '⛔ 시험 기기(loadfx=1)도 못 켠다');
});

console.log('[채움 — 평균 학습 · 92% 상한]');
t('평균 — 없으면 4초 · 최근 다섯 · 엉뚱한 값 버림 · 0.8~20초로 자름', () => {
  const ls = (v) => ({ getItem: () => v });
  assert.strictEqual(T(env()).expected(ls(null)), 4000);
  assert.strictEqual(T(env()).expected(ls('[1500,3600]')), 2550);
  assert.strictEqual(T(env()).expected(ls('[9000,1000,1000,1000,1000,1000]')), 1000, '⛔ 다섯 개만 봐야 한다');
  assert.strictEqual(T(env()).expected(ls('["x",-5,1e9,2000]')), 2000);
  assert.strictEqual(T(env()).expected(ls('[100]')), 800);
  assert.strictEqual(T(env()).expected(ls('{bad')), 4000);
});
t('곡선 — 0초 8% · 평균 시각 ≈84% · 아무리 기다려도 92% 를 안 넘는다', () => {
  const c = T(env()).curve;
  assert.strictEqual(c(0, 4000), 0.08);
  assert.ok(Math.abs(c(4000, 4000) - 0.834) < 0.01);
  assert.ok(c(1e7, 4000) <= 0.92 + 1e-9);
});
t('기억 — 다 뜨면 걸린 시간을 다섯 개까지 쌓는다', () => {
  const s = env({ ls: { onfLoadMs: '[1,2,3,4,5]' } });
  T(s).remember(s.g.localStorage, 3333.4);
  assert.strictEqual(s.ls.onfLoadMs, '[2,3,4,5,3333]');
});

console.log('[홈이 보낸 로고 자리 검사]');
t('정상 svg·글자 이름은 받는다 · 색이 이상하면 주황', () => {
  const b = T(env()).brandOk;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(b(BRAND, 390, 844))), { x: 16, y: 18, w: 86, h: 14.3, k: 'svg', c: 'rgb(111, 74, 47)' });
  assert.strictEqual(b(Object.assign({}, BRAND, { k: 'text', c: 'url(evil)' }), 390, 844).c, '#D2691E');
});
t('⛔ 모양이 이상하면 null — 숫자 아님 · 너무 작음 · 화면 밖 · 모르는 k · 다른 말', () => {
  const b = T(env()).brandOk;
  [{ x: 'a' }, { w: 5 }, { h: 1 }, { x: 380 }, { y: 900 }, { w: 1000 }, { k: 'img' }, { onf: 'title' }, { x: -50 }].forEach((p) => {
    assert.strictEqual(b(Object.assign({}, BRAND, p), 390, 844), null, '⛔ 받았다: ' + JSON.stringify(p));
  });
  assert.strictEqual(b(null, 390, 844), null);
});
t('마무리 고르기 — 자리 있고 움직임 허용·애니메이션 되면 날고, 아니면 걷힌다', () => {
  const p = T(env()).pick;
  assert.strictEqual(p({}, false, true), 'fly');
  assert.strictEqual(p(null, false, true), 'fade');
  assert.strictEqual(p({}, true, true), 'fade', '⛔ 동작 줄이기인데 날았다');
  assert.strictEqual(p({}, false, false), 'fade');
});

console.log('[막 — 화면을 못 막는다]');
t('못 열었다(stuck) → 그 자리에서 걷는다', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true });
  s.tick(500); k.stuck();
  assert.ok(s.box(), '⛔ 다 안 찬 채 툭 껐다(Peter 2026-10-24 「모션을 꺼 버리지 말고 끝까지 채우고」)');
  s.tick(700);
  assert.strictEqual(s.box(), null, '⛔ 못 연 안내를 막이 0.7초 넘게 덮는다');
});
t('홈 아닌 화면(교재) → 다 뜨면(ok) 채우고 걷힌다 · 1초 안', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: false });
  s.tick(2000); k.ok(); s.tick(1000);
  assert.strictEqual(s.box(), null, '⛔ 교재 화면에서 막이 안 걷혔다');
  assert.ok(JSON.parse(s.ls.onfLoadMs).length === 1, '⛔ 걸린 시간을 안 배웠다');
});
t('홈인데 로고 자리가 끝내 안 온다(옛 안내·구글 오류 화면) → 15초 뒤 걷힌다', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true });
  k.ok(); s.tick(14900);
  assert.ok(s.box(), '⛔ 15초 전에 걷었다(아이폰은 홈이 늦게 말한다)');
  s.tick(1000);
  assert.strictEqual(s.box(), null, '⛔ 자리가 안 오면 영영 남는다');
});
t('홈 + 로고 자리 → 홈 로고 숨김 → 난다(가로·세로 따로 · 색 바꿈 · 바탕 걷힘) → 통통 → 걷고 홈 로고 다시 보임', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true }), box = s.box();
  box.querySelector('.onf-ld-in').rect = { left: 45, top: 400, width: 300, height: 50 };
  k.ok(); s.tick(100); h.send(BRAND);
  s.tick(800);   // 남은 만큼 채움(≈0.53초 · fillMs) + 잠깐(120) 뒤 난다
  const lg = box.querySelector('.onf-ld-logo'), inn = box.querySelector('.onf-ld-in');
  assert.strictEqual(lg.anims.length, 1, '⛔ 가로로 안 난다'); assert.strictEqual(inn.anims.length, 1, '⛔ 세로·크기가 안 변한다');
  const last = inn.anims[0].kf[1].transform; assert.ok(/scale\(0\.286/.test(last), '⛔ 홈 로고 폭(86)에 안 맞췄다: ' + last);
  assert.ok(/translateY\(-399\.85px\)/.test(last), '⛔ 홈 로고 세로 가운데로 안 간다: ' + last);
  assert.ok(/translateX\(-136px\)/.test(lg.anims[0].kf[1].transform), '⛔ 홈 로고 가로 가운데로 안 간다: ' + lg.anims[0].kf[1].transform);
  assert.strictEqual(box.querySelector('.onf-ld-bg').anims.length, 1, '⛔ 바탕이 안 걷힌다(홈이 안 보인다)');
  assert.deepStrictEqual(h.user.sent, [['brandHold', 'https://n-abc-0lu-script.googleusercontent.com']], '⛔ 날기 전에 홈 로고를 숨기라고 안 했다(로고가 둘로 보인다) · 또는 출처를 안 좁혔다');
  s.tick(950);
  assert.ok(box.classList.contains('hop'), '⛔ 내려앉고 통통이 없다');
  assert.strictEqual(h.user.sent.length, 1, '⛔ 통통 전에 홈 로고를 다시 보였다(튀는 글자 밑에 로고가 하나 더 보인다)');
  assert.ok(s.box(), '⛔ 통통 전에 걷었다');
  s.tick(900);
  assert.strictEqual(s.box(), null, '⛔ 통통 뒤 막이 남는다');
  assert.deepStrictEqual(h.user.sent.map((x) => x[0]), ['brandHold', 'brandDone'], '⛔ 걷을 때 홈 로고를 다시 보이라고 안 했다');
});
t('PC 글자 이름(k=text) → 통통 뒤 홈 글자를 먼저 보이고 겹친 로고를 살짝 걷는다', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true }), box = s.box();
  box.querySelector('.onf-ld-in').rect = { left: 570, top: 425, width: 300, height: 50 };
  k.ok(); h.send(Object.assign({}, BRAND, { k: 'text', w: 64, h: 22 }));
  s.tick(600 + 120 + 950 + 5 * 75 + 460 + 10);
  assert.deepStrictEqual(h.user.sent.map((x) => x[0]), ['brandHold', 'brandDone'], '⛔ 겹친 로고를 걷기 전에 홈 글자를 안 보였다');
  assert.ok(s.box() && s.box().anims.length === 1, '⛔ 글자 이름인데 살짝 걷지 않고 툭 없앴다');
  s.tick(300);
  assert.strictEqual(s.box(), null);
});
t('⛔ 남의 창·남의 출처 말은 버린다(로고 자리를 위조해 막을 움직이지 못한다)', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true }), box = s.box();
  h.send(BRAND, win('attacker', h.top));
  h.send(BRAND, undefined, 'https://evil.example.com');
  s.tick(1000);
  assert.strictEqual(box.querySelector('.onf-ld-logo').anims.length, 0, '⛔ 남의 말로 날았다');
  assert.ok(s.box(), '⛔ 남의 말로 막이 걷혔다'); void k;
});
t('동작 줄이기 → 날지 않고 걷힌다', () => {
  const s = env({ reduced: true }), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true }), box = s.box();
  k.ok(); h.send(BRAND); s.tick(1300);
  assert.strictEqual(box.querySelector('.onf-ld-logo').anims.length, 0);
  assert.ok(!h.user.sent.some((x) => x[0] === 'brandHold'), '⛔ 날지도 않는데 홈 로고를 숨겼다');
  assert.strictEqual(s.box(), null);
});
t('30초 안전 시계 — 아무 소식이 없어도 걷힌다', () => {
  const s = env(), h = homeFrame(s); s.g.ONF.load.bind(h.fr, { home: true });
  s.tick(29900); assert.ok(s.box());
  s.tick(700); assert.strictEqual(s.box(), null, '⛔ 막이 영영 남는다(끝까지 채운 뒤 걷힌다)');
});
t('채우는 중 — 화면이 살아나기(노크) 전엔 60% · 홈이 다 그리기 전엔 92% 를 안 넘고, 끝나면 100%(Peter 2026-10-24 「로딩 속도에 맞춰」)', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true }), box = s.box();
  const fill = box.querySelector('.onf-ld-fill'), P = () => 1 - parseFloat(/inset\(0 ([\d.]+)%/.exec(fill.style.clipPath)[1]) / 100;
  s.tick(12000);
  assert.ok(P() > 0.58 && P() <= 0.6, '⛔ 노크 전 상한이 틀렸다: ' + P());
  k.ok(); s.tick(14000);
  assert.ok(P() > 0.9 && P() <= 0.92, '⛔ 노크 뒤 상한이 틀렸다: ' + P());
  h.send(BRAND); s.tick(260);
  assert.strictEqual(fill.style.clipPath, 'inset(0 0.00% 0 0)', '⛔ 다 그렸는데 끝까지 안 찼다');
  assert.ok(JSON.parse(s.ls.onfLoadMs1).length === 1 && JSON.parse(s.ls.onfLoadMs2).length === 1, '⛔ 단계 시간을 안 배웠다(노크까지 · 다 그림까지)');
});
t('단계 곡선 · 남은 만큼 채움 시간 — 순수', () => {
  const T0 = T(env());
  assert.strictEqual(T0.stage(0, 2500, null, 2000), 0.08);
  assert.ok(Math.abs(T0.stage(2500, 2500, null, 2000) - 0.548) < 0.02, '노크 평균 시각 ≈55%');
  const a = T0.stage(1000, 2500, 1000, 2000);
  assert.strictEqual(T0.stage(1000, 2500, 1000, 2000), a, '노크 순간 이어진다(튀지 않는다)');
  assert.ok(T0.stage(1e7, 2500, 1000, 2000) <= 0.92 + 1e-9);
  assert.ok(T0.fillMs(0.92) < 230 && T0.fillMs(0.3) > 450 && T0.fillMs(0.3) < 500, '남은 양에 비례(0.2~0.6초)');
});

console.log('[선생님 껍데기 — 로그인 화면을 가리지 않는다]');
t('data-lazy → 실릴 땐 안 그린다(로그인 화면) · bind(로그인 뒤 mount) 때 처음 그린다 · 꺼져 있으면 bind 도 안 그린다', () => {
  const s = env({ lazy: true });
  assert.strictEqual(s.box(), null, '⛔ 실리자마자 막을 그렸다 — 로그인 화면(🔒)을 가린다');
  const h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true, grace: 15000 });
  assert.ok(k && s.box(), '⛔ mount 때 막을 안 그린다');
  const off = env({ lazy: true, search: '?loadfx=0' });
  assert.strictEqual(off.g.ONF.load.bind({}, {}), null); assert.strictEqual(off.box(), null);
});
t('grace — 선생님 홈은 노크 뒤 15초까지 「다 그렸다」를 기다린다(학생 1.5초로 걷으면 자료 받는 동안 옛 화면이 드러난다)', () => {
  const s = env({ lazy: true }), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true, grace: 15000 });
  h.send({ onf: 'auth-please' }); k.ok(); s.tick(14000); assert.ok(s.box(), '⛔ 15초 전에 걷었다');   // 노크가 ok 를 부른다 — 막 손이 먼저 듣는다(bind 가 먼저 달렸다)
  s.tick(2000); assert.strictEqual(s.box(), null, '⛔ 15초가 지나도 안 걷힌다');
});
t('⛔ [2026-10-22 아이폰 사고] 학생 홈 — 액자 load 뒤 4초 동안 아무 말이 없어도(아이폰은 홈이 늦게 말한다) 걷지 않고 로고 자리를 기다려 난다', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true }), box = s.box();
  box.querySelector('.onf-ld-in').rect = { left: 45, top: 400, width: 300, height: 50 };
  k.ok(); s.tick(4000);                                                   // 말 0 — 종전엔 1.5초에 「스크립트 없는 화면」으로 짐작해 걷었다
  assert.ok(s.box(), '⛔ 말 없는 4초에 걷었다(안 그려진 액자 뒤 고리가 비친다)');
  assert.strictEqual(box.querySelector('.onf-ld-logo').anims.length, 0, '⛔ 자리도 없이 날았다');
  h.send({ onf: 'hist', op: 'hi' }); h.send(BRAND); s.tick(600 + 120 + 20);   // 남은 만큼 채움(≤0.6초) + 잠깐 멈춤
  assert.strictEqual(box.querySelector('.onf-ld-logo').anims.length, 1, '⛔ 늦게 온 로고 자리로 안 난다');
  assert.deepStrictEqual(h.user.sent.map((x) => x[0]), ['brandHold']);
  //   스크립트 없는 안내(잠금·_onfNoticePage)는 스스로 k:none 을 보낸다 → 기다리지 않고 걷힌다
  const s2 = env(), h2 = homeFrame(s2), k2 = s2.g.ONF.load.bind(h2.fr, { home: true });
  k2.ok(); h2.send({ onf: 'brand', k: 'none' }); s2.tick(1200);   // 남은 만큼 채움(≤0.6초) + 멈춤 + 걷힘
  assert.strictEqual(s2.box(), null, '⛔ 안내 화면이 「자리 없음」을 보냈는데 막이 남는다');
});
t('k:none(다 그렸는데 자리 없음 — 못 들어오는 안내 등) → 날지 않고 바로 걷힌다 · 홈 로고 숨김 없음', () => {
  const s = env(), h = homeFrame(s), k = s.g.ONF.load.bind(h.fr, { home: true, grace: 15000 }), box = s.box();
  k.ok(); h.send({ onf: 'brand', k: 'none' }); s.tick(1200);
  assert.strictEqual(box.querySelector('.onf-ld-logo').anims.length, 0, '⛔ 자리 없이 날았다');
  assert.strictEqual(s.box(), null, '⛔ 「다 그렸다」를 받고도 여유만큼 더 덮는다');
  assert.ok(!h.user.sent.some((x) => x[0] === 'brandHold'));
});
t('선생님 껍데기 배선 — data-lazy 로 싣는다 · mount 에서 bind · 다시 로그인(stale) 노크·8초 막힘(watch) 땐 바로 걷는다 · 로그인·토큰 블록은 안 건드린다', () => {
  const th = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
  assert.ok(/<script src="\.\.\/assets\/onf-load\.js" data-lazy><\/script>/.test(th), '⛔ data-lazy 로 안 싣는다(로그인 화면을 가린다)');
  const mt = th.slice(th.indexOf('function mount() {'), th.indexOf('var frameWatch = null;'));
  const bm = mt.match(/var LDHOME = (.+?);[^\n]*\n/);
  assert.ok(bm && /ONF\.load\.bind\(frame, \{ home: LDHOME, grace: 15000 \}\)/.test(mt), '⛔ mount 에서 막을 안 묶는다');
  /* 📝 [2026-10-24 Peter 「로딩 때 OWNIFY 에서 멈춘다」] 과제 판(mode=hwbook)은 「다 그렸다」(brand)를 안 보낸다 — home:true 면 노크 뒤 15초를 92% 로 덮었다(라이브 2.84초 노크 → 18.66초 걷힘).
     brand 를 보내는 화면(홈 · 학생 한 명 창)만 홈이다 — 모르는 mode 는 기다리지 않고 걷는다. */
  const homeOf = (mode) => vm.runInNewContext(bm[1], { location: { search: mode == null ? '' : '?mode=' + mode + '&t=abc' }, URLSearchParams });
  assert.strictEqual(homeOf(null), true, '⛔ 선생님 홈을 홈으로 안 친다(날지 않는다)');
  assert.strictEqual(homeOf('student'), true, '⛔ 학생 한 명 창(brand 보냄)을 홈으로 안 친다');
  assert.strictEqual(homeOf('hwbook'), false, '⛔ 과제 판(brand 없음)을 홈으로 쳐 15초 덮는다');
  assert.strictEqual(homeOf('xyz'), false, '⛔ 모르는 화면을 홈으로 쳐 15초 덮는다');
  assert.ok(/if \(d\.stale\) LD\.stuck\(\); else LD\.ok\(\);/.test(mt), '⛔ 다시 로그인 노크에 막을 안 걷는다(로그인 창을 가린다)');
  const w = mt.slice(mt.indexOf('function watch() {'));
  assert.ok(/if \(appWin\) return;\s*if \(LD\) LD\.stuck\(\);/.test(w), '⛔ 막힘 안내 전에 막을 안 걷는다');
  const knock = th.slice(th.indexOf('/* onf-knock:begin */'), th.indexOf('/* onf-knock:end */'));
  assert.ok(knock.length > 100 && !/LD\b|ONF\.load/.test(knock), '⛔ 로그인·토큰 블록(onf-knock)에 손을 댔다');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
