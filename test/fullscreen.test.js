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
console.log(`${pass}개 통과, ${fail}개 실패`);
if (fail) process.exit(1);
})();
