/* ⛶ 전체 화면 대신 켜기(assets/onf-frame.js · 2026-10-29) — 액자 겹 안 교재가 {onf:'fullscreen'} 을 보내면 맨 위 껍데기가 켜고 끄고 알린다.
   왜: 교재는 액자마다 allow 가 없어 스스로 못 켠다(구글 액자는 우리가 못 단다). 이 길이 막히면 ☰ 「⛶ 전체 화면」이 조용히 아무 일도 안 한다.
   실행: node test/fullscreen.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function env(extra) {
  const L = {}, DL = {}, calls = [];
  const g = {};
  vm.createContext(g);
  vm.runInContext('var window = this; var localStorage = null; var location = { search: "", pathname: "/" }; var navigator = { userAgent: "node" };', g);
  g.addEventListener = (k, f) => { (L[k] = L[k] || []).push(f); };
  g.removeEventListener = () => {};
  const doc = {
    fullscreenElement: null,
    documentElement: { requestFullscreen() { calls.push('req'); doc.fullscreenElement = doc.documentElement; (DL.fullscreenchange || []).forEach((f) => f()); return Promise.resolve(); } },
    exitFullscreen() { calls.push('exit'); doc.fullscreenElement = null; (DL.fullscreenchange || []).forEach((f) => f()); return Promise.resolve(); },
    addEventListener: (k, f) => { (DL[k] = DL[k] || []).push(f); },
    createElement: () => ({ style: {}, setAttribute() {}, classList: { add() {}, remove() {}, toggle() {} } })
  };
  g.document = doc;
  if (extra) Object.assign(g, extra);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' });
  const W = vm.runInContext("window", g);   // 안쪽 전역(바깥 g 와 === 가 아니다)
  const frame = (parent) => { const w = { got: [], postMessage(m, o) { w.got.push([m, o]); } }; w.parent = parent; return w; };
  const send = (data, source, origin) => (L.message || []).forEach((f) => f({ data, source, origin }));
  return { g: W, doc, calls, frame, send, L };
}

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
const last = (w) => JSON.parse(JSON.stringify(w.got.pop()));   // 안쪽 창 글은 다른 realm 객체 — 모양만 잰다
const GAS = 'https://n-abc123-0lu-script.googleusercontent.com', OUT = 'https://app.ownify.co.kr';

console.log('[⛶ 전체 화면 대신 켜기]');
t('우리 액자 안(구글 액자 겹) 교재가 켜 달라면 켜고 · 끄라면 끄고 · 물어본 창에 상태를 알린다', () => {
  const s = env(), mid = s.frame(s.g), book = s.frame(mid);
  s.send({ onf: 'fullscreen', on: true }, book, GAS);
  assert.deepStrictEqual(s.calls, ['req']);
  assert.deepStrictEqual(last(book), [{ onf: 'fsState', on: true }, GAS]);
  s.send({ onf: 'fullscreen', on: false }, book, GAS);
  assert.deepStrictEqual(s.calls, ['req', 'exit']);
  assert.deepStrictEqual(last(book), [{ onf: 'fsState', on: false }, GAS]);
});
t('정적 교재 판(app.ownify.co.kr)도 · on 없이 보내면 뒤집기', () => {
  const s = env(), book = s.frame(s.g);
  s.send({ onf: 'fullscreen' }, book, OUT);
  assert.deepStrictEqual(s.calls, ['req']);
});
t('⛔ 남의 출처 · 이 창 밖에서 온 말은 안 듣는다', () => {
  const s = env(), other = { parent: null, postMessage() {} }; other.parent = other;
  s.send({ onf: 'fullscreen', on: true }, s.frame(s.g), 'https://evil.example');
  s.send({ onf: 'fullscreen', on: true }, other, GAS);
  assert.deepStrictEqual(s.calls, []);
});
t('이미 켜져 있으면 다시 안 켜고 지금 상태만 알린다', () => {
  const s = env(), book = s.frame(s.g);
  s.send({ onf: 'fullscreen', on: true }, book, OUT); s.send({ onf: 'fullscreen', on: true }, book, OUT);
  assert.deepStrictEqual(s.calls, ['req']);
  assert.deepStrictEqual(last(book), [{ onf: 'fsState', on: true }, OUT]);
});

(async () => {
async function ta(label, fn) {
  try { await fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}
console.log('[🖥️ 모니터 알림 · 확장 창 열기]');
const EXT = 'https://script.ownify.co.kr/?fileId=F&sheetName=E1&ttok=x&ext=1';
function mon(isExt, details) {
  const SL = {}, opened = [], TO = [];
  const screen = { isExtended: isExt, addEventListener: (k, f) => { (SL[k] = SL[k] || []).push(f); } };
  const open = (u, n, f) => { const w = { u, n, f, closed: false, close() { w.closed = true; }, location: {}, focus() {} }; opened.push(w); return w; };
  const e = env({ screen, open, URL, getScreenDetails: details ? () => Promise.resolve(details) : undefined, setInterval: () => 1, clearInterval() {}, setTimeout: (f, ms) => { TO.push([f, ms]); return TO.length; }, clearTimeout() {} });
  return Object.assign(e, { screen, SL, opened, TO });
}
t('monitorHello = 지금 상태 바로 · 꽂으면(change) 알림 · 사파리처럼 모르면 can:false', () => {
  const s = mon(false), book = s.frame(s.g);
  s.send({ onf: 'monitorHello' }, book, GAS);
  assert.deepStrictEqual(last(book)[0], { onf: 'monitor', on: false, can: true, ext: false });
  s.screen.isExtended = true; s.SL.change.forEach((f) => f());
  assert.deepStrictEqual(last(book)[0], { onf: 'monitor', on: true, can: true, ext: false }, '⛔ 모니터를 꽂았는데 교재에 안 알렸다');
  const n = mon(undefined), b2 = n.frame(n.g); n.send({ onf: 'monitorHello' }, b2, GAS);
  assert.deepStrictEqual(last(b2)[0], { onf: 'monitor', on: false, can: false, ext: false });
});
await ta('extOpen — 모니터 없음 = 보통 창 · 붙음 = 그 모니터 자리·크기 · 열림 알림 · ⛔ 우리 ext 주소만', async () => {
  const s = mon(false), book = s.frame(s.g);
  s.send({ onf: 'extOpen', url: EXT }, book, GAS);
  assert.strictEqual(s.opened.length, 1); assert.ok(/width=1280,height=800/.test(s.opened[0].f));
  assert.deepStrictEqual(last(book)[0], { onf: 'extState', on: true, why: '' });
  for (const bad of ['https://evil.example/?ext=1', 'https://script.ownify.co.kr/?fileId=F', 'javascript:alert(1)']) s.send({ onf: 'extOpen', url: bad }, book, GAS);
  assert.strictEqual(s.opened.length, 1, '⛔ 남의 주소·ext 없는 주소로 창을 열었다');
  const cur = { availLeft: 0, availTop: 0, availWidth: 1440, availHeight: 900 }, mo = { availLeft: 1440, availTop: 0, availWidth: 1920, availHeight: 1080 };
  const m = mon(true, { currentScreen: cur, screens: [cur, mo] }), b2 = m.frame(m.g);
  m.send({ onf: 'extOpen', url: EXT }, b2, GAS); await new Promise((r) => setImmediate(r));
  assert.ok(/left=1440,top=0,width=1920,height=1080/.test(m.opened[0].f), '⛔ 모니터가 붙었는데 그 모니터 자리로 안 열었다: ' + m.opened[0].f);
  m.send({ onf: 'extClose' }, b2, GAS);
  assert.ok(m.opened[0].closed, '⛔ 닫기를 안 했다'); assert.deepStrictEqual(last(b2)[0], { onf: 'extState', on: false, why: '' });
});
t('창이 막히면 blocked 로 알린다(허락을 묻는 사이 손길이 식은 때)', () => {
  const s = mon(false); s.g.open = () => null; const book = s.frame(s.g);
  s.send({ onf: 'extOpen', url: EXT }, book, GAS);
  assert.deepStrictEqual(last(book)[0], { onf: 'extState', on: false, why: 'blocked' });
});
t('🖥️ 판이 떠나도 창은 남는다(extRelease) — 다음 판 monitorHello 에 ext:true · 그 판 extOpen = 같은 창을 그 주소로(새 창 0) · 10분 주인 없으면 닫음 · 남의 판은 못 놓음', () => {
  const s = mon(false), a = s.frame(s.g), b = s.frame(s.g), c = s.frame(s.g);
  s.send({ onf: 'extOpen', url: EXT }, a, GAS); assert.strictEqual(s.opened.length, 1);
  s.send({ onf: 'extRelease' }, c, GAS); s.send({ onf: 'monitorHello' }, c, GAS);
  assert.strictEqual(last(c)[0].ext, false, '⛔ 주인 아닌 판이 창을 놓았다');
  s.send({ onf: 'extRelease' }, a, GAS);
  assert.ok(!s.opened[0].closed, '⛔ 판이 떠났다고 창을 닫았다(다음 판이 이어 못 쓴다)');
  s.send({ onf: 'monitorHello' }, b, GAS);
  assert.deepStrictEqual(last(b)[0], { onf: 'monitor', on: false, can: true, ext: true }, '⛔ 다음 판에 주인 없는 창이 있다고 안 알렸다');
  const EXT2 = 'https://script.ownify.co.kr/?fileId=G&sheetName=E2&ttok=y&ext=1';
  s.send({ onf: 'extOpen', url: EXT2 }, b, GAS);
  assert.strictEqual(s.opened.length, 1, '⛔ 새 창을 또 열었다'); assert.strictEqual(s.opened[0].location.href, EXT2, '⛔ 남은 창을 새 판 주소로 안 옮겼다');
  assert.deepStrictEqual(last(b)[0], { onf: 'extState', on: true, why: '' });
  s.send({ onf: 'extRelease' }, b, GAS);
  const lone = s.TO.filter((x) => x[1] === 600000).pop(); assert.ok(lone, '⛔ 주인 없는 창 10분 시계가 없다');
  lone[0](); assert.ok(s.opened[0].closed, '⛔ 10분 주인 없는 창을 안 닫았다');
});
console.log('[📱 아이패드 확장 창 = 맨 주소 링크 + 맡긴 긴 주소(2026-11-02 Peter 「https://class.ownify.co.kr/ 만」)]');
function store(init) { const m = Object.assign({}, init || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; }
t('extPend — 우리 ext 주소만 30초 맡김 · 빈 url = 지움 · ⛔ 남의 출처·바깥 창·남의 주소는 안 맡김', () => {
  const ls = store(), s = mon(false); s.g.localStorage = ls; const book = s.frame(s.g);
  s.send({ onf: 'extPend', url: EXT }, book, GAS);
  const p = JSON.parse(ls.m.onfExtPend || 'null'); assert.ok(p && p.u === EXT && Math.abs(Date.now() - p.t) < 2000, '⛔ 긴 확장 주소를 안 맡겼다(새 창이 홈으로 뜬다)');
  assert.strictEqual(s.opened.length, 0, '⛔ 맡기기만 해야 하는데 창을 열었다');
  s.send({ onf: 'extPend', url: '' }, book, GAS); assert.ok(!('onfExtPend' in ls.m), '⛔ 짧게 눌렀는데 맡긴 주소가 남았다');
  for (const bad of ['https://evil.example/?ext=1', 'https://script.ownify.co.kr/?fileId=F', 'javascript:alert(1)']) s.send({ onf: 'extPend', url: bad }, book, GAS);
  s.send({ onf: 'extPend', url: EXT }, s.frame(s.g), 'https://evil.example');
  const other = { postMessage() {} }; other.parent = other; s.send({ onf: 'extPend', url: EXT }, other, GAS);
  assert.ok(!('onfExtPend' in ls.m), '⛔ 남의 주소·출처·창의 말로 맡겼다(새 창이 거기로 간다)');
});
t('index.html 머리 — 맨 주소로 뜬 새 창은 30초 안 맡긴 주소로 간다(한 번 · 지움) · 낡음·맨 주소 아님·남의 주소면 그냥 홈', () => {
  const H = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const js = (H.match(/<script>\/\* 📱 아이패드 「화면 확장」 새 창[\s\S]*?\*\/([\s\S]*?)<\/script>/) || [])[1];
  assert.ok(js, '⛔ index.html 머리에 맡긴 주소 꺼내기가 없다');
  assert.ok(H.indexOf(js) < H.indexOf('/assets/onf-load.js'), '⛔ 꺼내기가 로고 로딩 뒤다(홈이 먼저 그려진다)');
  const run = (loc, ls) => { const went = []; vm.runInNewContext(js, { location: Object.assign({ pathname: '/', search: '', hash: '', replace: (u) => went.push(u) }, loc), localStorage: ls, JSON, Date }); return went; };
  const T = 'https://class.ownify.co.kr/teacher/?mode=hwext&t=S&s=1&ext=1', pend = (u, ago) => store({ onfExtPend: JSON.stringify({ u, t: Date.now() - ago }) });
  let ls = pend(T, 5000); assert.deepStrictEqual(run({}, ls), [T], '⛔ 맡긴 확장 주소로 안 갔다'); assert.ok(!('onfExtPend' in ls.m), '⛔ 쓴 뒤 안 지웠다(다음 홈도 확장으로 간다)');
  assert.deepStrictEqual(run({}, pend(EXT, 1000)), [EXT]);
  ls = pend(T, 31000); assert.deepStrictEqual(run({}, ls), [], '⛔ 낡은(30초 넘은) 주소로 갔다'); assert.ok(!('onfExtPend' in ls.m));
  assert.deepStrictEqual(run({ search: '?t=abc' }, pend(T, 1000)), [], '⛔ 학생 링크(맨 주소 아님)까지 끌고 갔다');
  assert.deepStrictEqual(run({ pathname: '/i/abcdef' }, pend(T, 1000)), []);
  for (const bad of ['https://evil.example/?ext=1', 'https://class.ownify.co.kr/?fileId=F', 'javascript:alert(1)//?ext=1']) assert.deepStrictEqual(run({}, pend(bad, 1000)), [], '⛔ 남의 주소로 갔다: ' + bad);
  assert.deepStrictEqual(run({}, store()), []);
});
console.log('[🖥️ 모니터 창 이어 쓰기(2026-11-05 Peter 「하루 한 번 띄워 두고 어떤 교재·과제 판을 열든 따라오게」)]');
function bus() { const chs = []; return function BC(name) { const me = { name, onmessage: null, postMessage(m) { chs.filter((c) => c !== me && c.name === name && c.onmessage).forEach((c) => c.onmessage({ data: JSON.parse(JSON.stringify(m)) })); } }; chs.push(me); return me; }; }
function monPair() {
  const BC = bus(), TO = [], app = [], rep = [];
  const tm = { setTimeout: (f, ms) => { TO.push([f, ms]); return TO.length; }, clearTimeout: (i) => { if (TO[i - 1]) TO[i - 1][0] = () => {}; }, setInterval: () => 0, BroadcastChannel: BC, URL };
  const MU = 'https://class.ownify.co.kr/?t=T1&mode=share&fileId=A&sheetName=E1&ttok=x&ext=1';
  const m = env(Object.assign({}, tm, { location: { search: MU.slice(MU.indexOf('?')), pathname: '/', href: MU, replace: (u) => rep.push(u) } }));
  m.doc.body = { appendChild: (x) => app.push(x) };
  const t = env(Object.assign({}, tm));
  return { m, t, TO, app, rep };
}
t('창 소리(beat)를 들은 선생님 껍데기 = monHello 한 판에 monState(key) · monGo(다른 화면) = 창이 그 주소로 갈아탐 · 같은 화면이면 그대로 · ⛔ 남의 주소는 안 나름', () => {
  const p = monPair(), book = p.t.frame(p.t.g);
  p.t.send({ onf: 'monitorHello' }, book, OUT);
  assert.deepStrictEqual(last(book), [{ onf: 'monState', key: 'share|A|T1' }, OUT], '⛔ 창이 있는데 판에 안 알렸다(monitorHello 로 듣기 등록)');
  p.t.send({ onf: 'monGo', url: 'https://script.ownify.co.kr/?t=T1&mode=share&fileId=A&sheetName=E3&ttok=x&ext=1' }, book, OUT);
  assert.strictEqual(p.rep.length, 0, '⛔ 같은 교재인데 창을 다시 불렀다(회차는 방이 따라간다)');
  const HW = 'https://class.ownify.co.kr/teacher/?mode=hwext&t=T2&s=h0123456789abcdef0123&ext=1';
  p.t.send({ onf: 'monGo', url: HW }, book, OUT);
  assert.deepStrictEqual(p.rep, [HW], '⛔ 모니터 창이 새 화면(과제 판)으로 안 갈아탔다');
  for (const bad of ['https://evil.example/?ext=1', 'https://class.ownify.co.kr/?fileId=B', 'javascript:alert(1)']) p.t.send({ onf: 'monGo', url: bad }, book, OUT);
  p.t.send({ onf: 'monGo', url: HW.replace('T2', 'T9') }, p.t.frame(p.t.g), 'https://evil.example');
  assert.strictEqual(p.rep.length, 1, '⛔ 남의 주소·출처로 창을 옮겼다');
});
t('monIdle = 창이 그 화면을 보이고 있을 때만 1.5초 뒤 로고 · 그 사이 monGo 면 안 덮음 · 다른 화면의 idle 은 무시', () => {
  const p = monPair(), book = p.t.frame(p.t.g), A = 'https://script.ownify.co.kr/?t=T1&mode=share&fileId=A&ext=1';
  p.t.send({ onf: 'monIdle', url: 'https://class.ownify.co.kr/teacher/?mode=hwext&t=T2&s=h0123456789abcdef0123&ext=1' }, book, OUT);
  assert.ok(!p.TO.some((x) => x[1] === 1500), '⛔ 다른 화면이 떠났는데 로고로 덮으려 했다');
  p.t.send({ onf: 'monIdle', url: A }, book, OUT);
  const c = p.TO.filter((x) => x[1] === 1500).pop(); assert.ok(c, '⛔ 보이던 화면이 떠났는데 로고 시계가 없다');
  p.t.send({ onf: 'monGo', url: A }, book, OUT); c[0]();
  assert.strictEqual(p.app.length, 0, '⛔ 다시 불렀는데 로고로 덮었다');
  p.t.send({ onf: 'monIdle', url: A }, book, OUT); p.TO.filter((x) => x[1] === 1500).pop()[0]();
  assert.strictEqual(p.app.length, 1, '⛔ 로고를 안 덮었다(쉬는 시간에 학생 교재가 모니터에 남는다)');
  assert.ok(/onf-512\.png/.test(p.app[0].innerHTML) && /pointer-events:none/.test(p.app[0].style.cssText), '⛔ 로고 덮개 모양이 다르다');
});
t('창 소리가 없으면(모니터 창 없음) monState 없음 — 판이 갈아타기를 안 부른다', () => {
  const s = env(), book = s.frame(s.g);
  s.send({ onf: 'monitorHello' }, book, OUT);
  assert.ok(!book.got.some((x) => x[0].onf === 'monState'));
});
console.log(`${pass}개 통과, ${fail}개 실패`);
if (fail) process.exit(1);
})();
