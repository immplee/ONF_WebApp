/* ⛶ 전체 화면 대신 켜기(assets/onf-frame.js · 2026-10-29) — 액자 겹 안 교재가 {onf:'fullscreen'} 을 보내면 맨 위 껍데기가 켜고 끄고 알린다.
   왜: 교재는 액자마다 allow 가 없어 스스로 못 켠다(구글 액자는 우리가 못 단다). 이 길이 막히면 ☰ 「⛶ 전체 화면」이 조용히 아무 일도 안 한다.
   실행: node test/fullscreen.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function env() {
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
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8'), g, { filename: 'onf-frame.js' });
  const W = vm.runInContext("window", g);   // 안쪽 전역(바깥 g 와 === 가 아니다)
  const frame = (parent) => { const w = { got: [], postMessage(m, o) { w.got.push([m, o]); } }; w.parent = parent; return w; };
  const send = (data, source, origin) => (L.message || []).forEach((f) => f({ data, source, origin }));
  return { g: W, doc, calls, frame, send };
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
console.log(`${pass}개 통과, ${fail}개 실패`);
if (fail) process.exit(1);
