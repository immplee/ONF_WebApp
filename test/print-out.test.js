/* 🖨️ 프린트용 교재 정적 먼저(2026-11-12 · assets/onf-frame.js printOut · index.html) — mode=print 주소를 구글 밖 정적 판(Pages /print/ · Worker /t/print)으로 먼저 연다.
   잰다: PO1 프린트가 아닌 주소 = 그 갈래를 안 본다(종전 그대로 · fetch 0)
         PO2 입장권이 있으면 정적 판 주소(입장권 없음) + Worker 미리 받기(몸통에만 입장권) · 그 액자 창·그 출처 hello 에만 outBoot{tk, d} · outDrawn = 로고 막 ok
         PO3 안 타는 때 = 종전 구글 화면: 입장권 없음·지남·꼴 틀림 · 기기 끄기 pout=0(기억) · 파일 값 꼴 아님 · 물러남 기억에 막힘 — 입장권은 어디에도 안 나간다
         PO4 못 서면 같은 액자에 구글 화면: hello 없음·첫 표 시한(느림 갈래 기억) · 판의 outFail(기억 안 함) · 그린 뒤 outFail 은 보던 회차로 · 미리 받기 실패면 d 없이
         PO5 index.html — script 출처의 프린트 주소만 class 로 한 번 넘긴다(질의 그대로) · mode=print 일 때만 mount 에 print 값을 넘긴다
         PO6 쌍둥이 — 입장권 칸 이름·꼴이 선생님 껍데기(teacher/index.html)와 같다 · 정적 판 출처 = 교재 정적 판과 같은 곳
   실행: node test/print-out.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const AT = [];
function ta(label, fn) { AT.push([label, fn]); }
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
function win(name, parent) { const w = { name, sent: [] }; w.parent = parent || w; w.postMessage = (m, o) => w.sent.push([m, o]); return w; }
const js = (x) => JSON.parse(JSON.stringify(x));
const ROOT = path.join(__dirname, '..');
const CODE = fs.readFileSync(path.join(ROOT, 'assets', 'onf-frame.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT_PRINT = (/var ONF_OUT_PRINT = '([^']+)'/.exec(CODE) || [])[1] || 'ONF_OUT_PRINT 없음';
const OUT_O = new URL(OUT_PRINT).origin, GO = 'https://n-abc-0lu-script.googleusercontent.com';
const NOW = 1.7e12, F = 'PRINTfile000000001';
const TK = 'tch.' + 'a'.repeat(40) + '.' + 'b'.repeat(43);   // 꼴만 맞는 가짜(서명 검사는 Worker 몫)
const tchLs = (o) => JSON.stringify(Object.assign({ tk: TK, x: NOW / 1000 + 86400 }, o || {}));
const LSf = (init) => { const m = Object.assign({}, init || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
const EXEC = 'https://script.google.com/x/exec?fileId=' + F + '&sheetName=E1_First%20Day&mode=print';
const BOOT = { ok: true, v: { fileId: F, sheetName: 'E1_First Day', initialPayload: '{"rows":[]}', sheetListPayload: '["E1_First Day"]' } };

/* outside.test.js 의 setup 꼴 — mount 에 print 값을 넘긴다(index.html 과 같게) · fetch 는 받아 적는다 */
function setup(o) {
  o = o || {};
  const listeners = {}, timers = [], asks = [], beacons = [];
  const body = { kids: [], appendChild(c) { this.kids.push(c); c.parentNode = this; }, removeChild(c) { this.kids = this.kids.filter((x) => x !== c); } };
  const mkEl = (tag) => { const el = { tag, kids: [], attrs: {}, className: '', src: '', vars: {}, style: { setProperty(k, v) { el.vars[k] = v; }, removeProperty(k) { delete el.vars[k]; } },
    classList: { set: new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    setAttribute(k, v) { el.attrs[k] = v; }, appendChild(c) { el.kids.push(c); c.parentNode = el; }, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), L: {}, addEventListener(k, f) { (el.L[k] = el.L[k] || []).push(f); } }; return el; };
  const top = win('shell');
  const g = { listeners, top, timers,
    setTimeout: (f, ms) => { timers.push({ f, ms, on: true }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].on = false; } };
  vm.createContext(g);
  g.window = g; g.URL = URL; g.localStorage = o.ls || LSf({ onf_tch: tchLs() }); g.innerWidth = 1440;
  g.T = NOW; g.Date = { now: () => g.T }; g.sessionStorage = LSf();
  g.navigator = { userAgent: 'node', sendBeacon: (u, b) => { beacons.push(JSON.parse(b)[0]); return true; } }; g.history = { state: null, replaceState() {}, pushState() {} };
  g.console = { info() {}, warn() {}, log() {} };
  g.document = { addEventListener() {}, body, createElement: mkEl, documentElement: { attrs: {}, setAttribute() {} } };
  g.addEventListener = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); };
  g.removeEventListener = (k, fn) => { listeners[k] = (listeners[k] || []).filter((x) => x !== fn); };
  if (o.fetch !== null) g.fetch = (url, init) => { asks.push({ url: String(url), method: init && init.method, body: init && init.body, headers: init && init.headers }); return (o.fetch || (() => Promise.resolve({ json: () => Promise.resolve(BOOT) })))(url, init); };
  vm.runInContext(o.code || CODE, g, { filename: 'onf-frame.js' });   // o.code = 변이 검사(PO7)
  const frameWin = win('frame', top);
  const frameEl = { contentWindow: frameWin, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }), addEventListener() {}, opened: [],
    get src() { return this._src || ''; }, set src(v) { this._src = v; this.opened.push(v); } };
  const hooks = { n: 0, ok() { hooks.n++; } };
  g.ONF.frame.mount(frameEl, o.src || EXEC, { phone: true, bookSrc: () => null, out: true, tok: '', hooks, print: o.print === undefined ? { f: F, s: 'E1_First Day', sw: null } : o.print });
  const send = (data, source, origin) => (listeners.message || []).slice().forEach((fn) => fn({ data, source, origin: origin || OUT_O }));
  const fire = (ms) => timers.filter((x) => x.on && x.ms === ms).forEach((x) => { x.on = false; x.f(); });
  return { g, send, fire, frameEl, frameWin, top, asks, beacons, hooks, ls: g.localStorage };
}
const boots = (w) => js(w.sent).filter((x) => x[0].onf === 'outBoot');
const leaks = (s) => s.frameEl.opened.concat(s.asks.map((a) => a.url)).filter((u) => u.indexOf('tch.') >= 0);

console.log('[🖨️ 프린트용 교재 정적 먼저 — 껍데기]');

ta('PO1 프린트가 아닌 주소(print 값 없음) — 종전 그대로 구글 주소 · Worker 0 · 프린트 갈래 기록 0', async () => {
  const s = setup({ print: null, src: 'https://script.google.com/x/exec?fileId=' + F + '&mode=share' }); await flush();
  assert.deepStrictEqual(s.frameEl.opened, ['https://script.google.com/x/exec?fileId=' + F + '&mode=share']);
  assert.strictEqual(s.asks.filter((a) => /\/t\/print/.test(a.url)).length, 0, '⛔ 프린트가 아닌 화면이 /t/print 를 불렀다');
  assert.strictEqual(s.beacons.filter((b) => /print/.test(b.c)).length, 0);
});

ta('PO2 입장권 있음 → 정적 판 주소(입장권 없음) + Worker 미리 받기(몸통에만) · 그 창·그 출처 hello 에만 outBoot{tk, d} · outDrawn = 로고 막 ok · 구글 주소는 안 연다', async () => {
  assert.strictEqual(OUT_PRINT, 'https://app.ownify.co.kr/print/', '상수 값');
  const s = setup();
  assert.deepStrictEqual(s.frameEl.opened, [OUT_PRINT + '?f=' + F + '&s=E1_First%20Day'], '⛔ 정적 판 주소가 아니다');
  assert.deepStrictEqual(s.asks.map((a) => [a.url, a.method, JSON.parse(a.body), a.headers]), [['https://app.ownify.co.kr/w/t/print', 'POST', { tk: TK, f: F, s: 'E1_First Day' }, undefined]], '⛔ 미리 받기 = Worker 한 번 · 머리말 없음(사전 요청 0) · 입장권은 몸통');
  assert.deepStrictEqual(leaks(s), [], '⛔ 입장권이 주소에 실렸다');
  const stranger = win('stranger', s.top);
  s.send({ onf: 'outHello' }, stranger, OUT_O); s.send({ onf: 'outHello' }, s.frameWin, 'https://evil.example.com'); s.send({ onf: 'outHello' }, s.frameWin, GO); await flush();
  assert.strictEqual(boots(s.frameWin).length + boots(stranger).length, 0, '⛔ 남의 창·남의 출처 hello 에 입장권을 보냈다');
  s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush();
  assert.deepStrictEqual(boots(s.frameWin), [[{ onf: 'outBoot', tk: TK, d: BOOT }, OUT_O]], '⛔ outBoot 꼴·출처');
  assert.strictEqual(s.hooks.n, 0, '첫 표 전엔 로고 막 그대로');
  s.ls.m.onfPrintOutFail = (NOW - 1) + ',1';   // 앞서 한 번 물러난 기기 — 서면 지운다
  s.send({ onf: 'outDrawn' }, s.frameWin, OUT_O);
  assert.deepStrictEqual([s.hooks.n, 'onfPrintOutFail' in s.ls.m], [1, false], '⛔ 섰는데 로고 막을 안 걷었다(또는 연속 물러남을 안 지웠다)');
  s.fire(2500); s.fire(6000);
  assert.strictEqual(s.frameEl.opened.length, 1, '⛔ 섰는데 시한으로 구글 화면을 열었다');
  //   회차 없는 주소(선생님 홈 「프린트용 교재」)
  const s2 = setup({ print: { f: F, s: '', sw: null }, src: 'https://script.google.com/x/exec?fileId=' + F + '&mode=print' });
  assert.deepStrictEqual([s2.frameEl.opened, JSON.parse(s2.asks[0].body)], [[OUT_PRINT + '?f=' + F], { tk: TK, f: F }]);
});

ta('PO3 안 타는 때 = 종전 구글 화면 그대로 · 입장권은 어디에도 안 나간다', async () => {
  const cases = {
    '입장권 없음': { ls: LSf() }, '지난 입장권': { ls: LSf({ onf_tch: tchLs({ x: NOW / 1000 - 5 }) }) }, '꼴 틀린 입장권': { ls: LSf({ onf_tch: tchLs({ tk: 'tokStudentTest01' }) }) },
    '깨진 칸': { ls: LSf({ onf_tch: '{not json' }) }, '기기 끄기 pout=0': { print: { f: F, s: '', sw: '0' } }, '기억된 끄기': { ls: LSf({ onf_tch: tchLs(), onfPrintOut: '0' }) },
    '파일 값 꼴 아님': { print: { f: '../x', s: '', sw: null } }, '회차 값이 너무 김': { print: { f: F, s: 'x'.repeat(101), sw: null } },
    '물러남 기억에 막힘': { ls: LSf({ onf_tch: tchLs(), onfPrintOutFail: (NOW + 600000) + ',2' }) }, 'fetch 없는 브라우저': { fetch: null } };
  for (const [k, o] of Object.entries(cases)) {
    const s = setup(o); await flush();
    assert.deepStrictEqual(s.frameEl.opened, [EXEC], '⛔ ' + k + ' — 종전 구글 주소가 아니다');
    assert.strictEqual(s.asks.length, 0, '⛔ ' + k + ' — Worker 를 불렀다');
  }
  const off = setup({ print: { f: F, s: '', sw: '0' } });
  assert.strictEqual(off.ls.m.onfPrintOut, '0', '주소 pout=0 을 이 기기에 기억');
  const on = setup({ ls: LSf({ onf_tch: tchLs(), onfPrintOut: '0', onfPrintOutFail: (NOW + 600000) + ',2' }), print: { f: F, s: '', sw: '1' } });
  assert.deepStrictEqual([on.frameEl.opened[0].indexOf(OUT_PRINT), on.ls.m.onfPrintOut, 'onfPrintOutFail' in on.ls.m], [0, '1', false], 'pout=1 = 다시 켜고 물러남 기억도 지운다');
  //   🔭 안 탄 까닭이 기록에 한 줄(종전엔 프린트 화면이 기록에 안 보였다)
  const nt = setup({ ls: LSf() }); await flush();
  assert.deepStrictEqual(nt.beacons.map((b) => [b.k, b.c]), [['gp', 'sh:print:notch']]);
});

ta('PO4 못 서면 같은 액자에 구글 화면 — hello 없음·첫 표 시한(느림 기억) · 판 outFail(기억 안 함) · 그린 뒤는 보던 회차로 · 미리 받기 실패면 d 없이', async () => {
  let s = setup(); await flush();
  s.fire(2500);
  assert.deepStrictEqual(s.frameEl.opened.slice(1), [EXEC], '⛔ hello 가 없는데 구글 화면으로 안 물러났다');
  assert.ok(/^\d+,1$/.test(s.ls.m.onfPrintOutFail) && Number(s.ls.m.onfPrintOutFail.split(',')[0]) <= NOW, '느림 갈래 첫 번 = 이번만(다음엔 다시 시도)');
  assert.ok(s.beacons.some((b) => b.c === 'fallback:print:hello:1'));
  s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush();
  assert.strictEqual(boots(s.frameWin).length, 0, '⛔ 물러난 뒤 늦은 hello 에 입장권을 보냈다');
  //   두 번째 잇단 물러남 = 10분 막힘
  s = setup({ ls: s.ls }); s.fire(2500);
  assert.ok(Number(s.ls.m.onfPrintOutFail.split(',')[0]) === NOW + 600000, '연속 2번째 = 10분');
  //   hello 는 왔는데 첫 표가 시한 안에 안 선다
  s = setup(); s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush(); s.fire(2500);
  assert.strictEqual(s.frameEl.opened.length, 1, 'hello 뒤엔 hello 시계가 죽는다');
  s.fire(6000);
  assert.deepStrictEqual([s.frameEl.opened.slice(1), /,1$/.test(s.ls.m.onfPrintOutFail)], [[EXEC], true], '⛔ 첫 표 시한에 안 물러났다');
  //   판이 못 선다고 말한다(프린트 원본 아님·입장권 거절·날짜 칸…) — 그 파일·그 순간 일이라 기억하지 않는다
  for (const why of ['notprint', 'ticket', 'date', 'off', 'parse']) {
    s = setup(); s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush();
    s.send({ onf: 'outFail', why, s: '' }, s.frameWin, OUT_O);
    assert.deepStrictEqual([s.frameEl.opened.slice(1), 'onfPrintOutFail' in s.ls.m], [[EXEC], false], '⛔ ' + why);
    assert.ok(s.beacons.some((b) => b.c === 'fallback:print:fail-' + why + ':0'), why + ' 기록');
  }
  s = setup(); s.send({ onf: 'outFail', why: 'net', s: '' }, s.frameWin, OUT_O);
  assert.ok(/,1$/.test(s.ls.m.onfPrintOutFail), '망 실패는 느림 갈래로 기억');
  s = setup(); s.send({ onf: 'outFail', why: 'x', s: '' }, win('stranger', s.top), OUT_O);
  assert.strictEqual(s.frameEl.opened.length, 1, '남의 창 outFail 은 버린다');
  //   그린 뒤 — 정적 판에서만 못 여는 회차: 보던 회차를 구글 화면으로
  s = setup(); s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush(); s.send({ onf: 'outDrawn' }, s.frameWin, OUT_O);
  s.send({ onf: 'outFail', why: 'date', s: 'E4_Date' }, s.frameWin, OUT_O);
  const u = new URL(s.frameEl.opened[1]);
  assert.deepStrictEqual([u.origin + u.pathname, u.searchParams.get('fileId'), u.searchParams.get('sheetName'), u.searchParams.get('mode'), 'onfPrintOutFail' in s.ls.m], ['https://script.google.com/x/exec', F, 'E4_Date', 'print', false], '⛔ 그린 뒤 물러남이 보던 회차로 안 갔다');
  assert.ok(s.beacons.some((b) => b.c === 'fallback:print:late-date:0'));
  //   미리 받기가 끊기면 d 없이 — 판이 스스로 묻는다
  s = setup({ fetch: () => Promise.reject(new Error('net')) }); s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush();
  assert.deepStrictEqual(boots(s.frameWin), [[{ onf: 'outBoot', tk: TK }, OUT_O]]);
  s = setup({ fetch: () => Promise.resolve({ json: () => Promise.reject(new Error('html')) }) }); s.send({ onf: 'outHello' }, s.frameWin, OUT_O); await flush();
  assert.deepStrictEqual(boots(s.frameWin), [[{ onf: 'outBoot', tk: TK }, OUT_O]], 'JSON 아닌 답');
});

ta('PO5 index.html — script 출처의 프린트 주소만 class 로 한 번(질의 그대로) · mode=print 일 때만 print 값을 넘긴다', async () => {
  const m = /<script>\/\* 🖨️ 프린트용 교재는 class 출처에서 연다[\s\S]*?\*\/([\s\S]*?)<\/script>/.exec(HTML);
  assert.ok(m, '⛔ index.html 머리에 프린트 넘기기가 없다');
  assert.ok(HTML.indexOf(m[0]) < HTML.indexOf('/assets/onf-frame.js'), '큰 스크립트를 받기 전에');
  const hop = (host, search) => { let to = null; vm.runInNewContext(m[1], { location: { hostname: host, search, replace(u) { to = u; } }, URLSearchParams }); return to; };
  const Q = '?fileId=' + F + '&sheetName=E1_First%20Day&mode=print';
  assert.strictEqual(hop('script.ownify.co.kr', Q), 'https://class.ownify.co.kr/' + Q, '⛔ 옛 시트 A1 링크가 class 로 안 넘어간다(또는 질의가 바뀌었다)');
  assert.strictEqual(hop('class.ownify.co.kr', Q), null, 'class 에선 안 넘긴다(고리 0)');
  assert.strictEqual(hop('script.ownify.co.kr', '?fileId=' + F + '&mode=share'), null, '교재는 안 넘긴다');
  assert.strictEqual(hop('script.ownify.co.kr', '?mode=print'), null, '파일 없는 주소');
  assert.strictEqual(hop('script.ownify.co.kr', Q + '&pout=0'), null, 'pout=0 = 그 열기는 종전 그대로');
  assert.strictEqual(hop('script.ownify.co.kr', '%E0%A4%A'), null, '⛔ 깨진 주소에 던졌다');
  const line = /print: (q\.get\('mode'\) === 'print' \? \{[^}]*\} : null),/.exec(HTML);
  assert.ok(line, '⛔ index.html 이 mount 에 print 값을 안 넘긴다');
  const val = (search) => vm.runInNewContext('(' + line[1] + ')', { q: new URLSearchParams(search) });
  assert.deepStrictEqual(js(val(Q + '&pout=1')), { f: F, s: 'E1_First Day', sw: '1' });
  assert.strictEqual(val('?fileId=' + F + '&mode=share'), null, '⛔ 프린트가 아닌 주소에 print 값을 넘겼다(다른 화면이 그 갈래를 본다)');
});

ta('PO7 🔐 구글 프린트 화면이 묻는다(printTkAsk) — 내 액자 사슬·우리 출처에서 온 물음에만 그 창·그 출처로 입장권 · 없으면 빈 값 · 프린트 아닌 껍데기·남의 창·남의 출처는 무시 · 변이(자물쇠·프린트 확인 뺌)는 빨강', async () => {
  const ask = (s, src, origin) => { s.send({ onf: 'printTkAsk' }, src, origin); return js(src.sent).filter((x) => x[0].onf === 'printTk'); };
  //   물러난 뒤 같은 액자에 뜬 구글 화면 — 겉 래퍼(script.google.com) 안의 샌드박스 창이 묻는다(맨 위 = 이 껍데기)
  let s = setup(); s.fire(2500);
  const sandbox = win('sandbox', win('wrapper', s.frameWin));
  assert.deepStrictEqual(ask(s, sandbox, GO), [[{ onf: 'printTk', tk: TK }, GO]], '⛔ 우리 구글 화면의 물음에 입장권을 안 줬다(또는 받는 곳이 그 출처가 아니다)');
  assert.deepStrictEqual(leaks(s), [], '⛔ 입장권이 주소에 실렸다');
  //   입장권 없음·지남 = 빈 값(화면이 안내 한 줄 — 기다리지 않게)
  for (const ls of [LSf(), LSf({ onf_tch: tchLs({ x: NOW / 1000 - 5 }) })]) {
    s = setup({ ls }); await flush();
    assert.deepStrictEqual(ask(s, win('sandbox', win('wrapper', s.frameWin)), GO), [[{ onf: 'printTk', tk: '' }, GO]]);
  }
  //   남의 창(내 액자 사슬 밖) · 남의 출처 · 프린트가 아닌 껍데기 = 답 0
  s = setup();
  assert.deepStrictEqual(ask(s, win('stranger', s.top), GO), [], '⛔ 내 액자 밖 창에 입장권을 줬다');
  assert.deepStrictEqual(ask(s, win('sandbox', win('wrapper', s.frameWin)), 'https://evil.example.com'), [], '⛔ 남의 출처에 입장권을 줬다');
  const sh = setup({ print: null, src: 'https://script.google.com/x/exec?fileId=' + F + '&mode=share' });
  assert.deepStrictEqual(ask(sh, win('sandbox', win('wrapper', sh.frameWin)), GO), [], '⛔ 프린트가 아닌 화면(교재·홈)에 입장권을 줬다');
  //   변이 — 프린트 확인을 빼면 교재 화면에도 준다 · 자물쇠(내 액자 사슬)를 빼면 남의 창에도 준다
  const MUT = (from, to) => { assert.ok(CODE.indexOf(from) > 0, '변이 자리'); return CODE.replace(from, to); };
  const withCode = (code, o) => setup(Object.assign({ code }, o));
  const m1 = withCode(MUT("if (opts.print) { try { ev.source.postMessage({ onf: 'printTk'", "if (true) { try { ev.source.postMessage({ onf: 'printTk'"), { print: null, src: 'https://script.google.com/x/exec?fileId=' + F + '&mode=share' });
  assert.strictEqual(ask(m1, win('sandbox', win('wrapper', m1.frameWin)), GO).length, 1, '변이(프린트 확인 뺌)가 안 잡힌다');
  const m2 = withCode(MUT('if (!_fromOurFrame(ev.source, frameEl)) return;', ''));
  assert.strictEqual(ask(m2, win('stranger', m2.top), GO).length, 1, '변이(자물쇠 뺌)가 안 잡힌다');
});

ta('PO6 쌍둥이 — 입장권 칸·꼴 = 선생님 껍데기 · 정적 판 출처 = 교재 정적 판', async () => {
  const TH = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  const t = /var TCHKEY = '([^']+)', TCH_RENEW = [^,]+, TCH_RE = (\/[^\n]*?\/), tchMem/.exec(TH), p = /var PRINT_TK = (\/[^\n]*?\/), PRINT_F/.exec(CODE);
  assert.ok(t && p, '상수 줄을 못 읽었다');
  assert.strictEqual(p[1], t[2], '⛔ 입장권 꼴이 선생님 껍데기(TCH_RE)와 다르다');
  assert.ok(CODE.indexOf("localStorage.getItem('" + t[1] + "')") > 0, '⛔ 입장권 칸 이름이 선생님 껍데기(TCHKEY)와 다르다');
  assert.strictEqual(OUT_O, new URL((/var ONF_OUT_BOOK = '([^']+)'/.exec(CODE) || [])[1]).origin);
});

(async () => {
  for (const [label, fn] of AT) {
    try { await fn(); console.log('  ✅ ' + label); pass++; } catch (e) { console.log('  ❌ ' + label + '\n     ' + ((e && e.stack) || e)); fail++; }
  }
  console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
  process.exit(fail ? 1 : 0);
})();
