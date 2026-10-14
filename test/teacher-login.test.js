/* teacher/index.html 로그인 화면 — 2026-10-14 Peter 아이폰(iOS 크롬 = WebKit · 다크) 세 가지.
   ② 로그인 화면 아래 절반이 하얗다 = 「숨긴」 #app 액자가 깔려 있었다(#app { display:block } 이 [hidden] 을 이김) + 다크 색 체계 안 빈 액자를 WebKit 이 흰 종이로 칠함.
   ③ 로그인했는데 또 로그인 창 = WebKit(ITP)의 One Tap 은 계정 없는 시트 → [계속] → 구글 계정 고르기 팝업 두 단계 — 버튼 하나면 팝업 하나로 끝난다.
   ④ 들어갈 때 하얀 깜빡임 = 다크 색 체계 액자 안의 밝은 구글 문서(exec 래퍼)를 브라우저가 불투명 흰 종이로 칠함.
   ⚠️ 색 체계·흰 종이는 vm 이 못 그린다 — 그건 WKWebView·크롬 헤드리스 실측(보고서)이고, 여기는 그 고침이 **지워지지 않게** 지킨다.
   ⚠️ 로그인이 실제로 되는지는 못 본다 — 껍데기 로그인을 고치면 라이브에서 같이 잰다(login-change-needs-live-test).
   실행: node test/teacher-login.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-ui.css'), 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('var CLIENT_ID'));
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

const UA = {
  iphone: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 },
  macSafari: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 0 },
  ipadDesktop: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Safari/604.1', platform: 'MacIntel', maxTouchPoints: 5 },
  macChrome: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', platform: 'MacIntel', maxTouchPoints: 0 },
  winChrome: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', platform: 'Win32', maxTouchPoints: 0 },
  android: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', platform: 'Linux armv8l', maxTouchPoints: 5 }
};
const jwt = (p) => 'x.' + Buffer.from(JSON.stringify(p)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_') + '.y';

/* 껍데기 본 스크립트를 통째로 돌린다(구글 GIS 는 대역) — 돌린 뒤 GIS 에 무엇을 불렀는지 센다. */
function boot(nav, store) {
  const calls = [], handlers = {}, els = {};
  const el = (id) => els[id] || (els[id] = { id, hidden: id === 'app' || id === 'wait', style: {}, classList: { add() {}, remove() {}, toggle() {} },
    contentWindow: id === 'app' ? { name: 'appwin' } : null, appendChild() {}, setAttribute() {}, parentNode: null, textContent: '', innerHTML: '' });
  const ls = store || {};
  const g = {
    navigator: nav, console: { warn() {}, log() {} }, atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    URL, URLSearchParams, Date, JSON, Math,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    document: { getElementById: el, querySelector: () => null, createElement: () => el('x' + Math.random()), body: { appendChild() {} },
      documentElement: { setAttribute() {}, getAttribute() {} } },
    location: { search: '', href: 'https://class.ownify.co.kr/teacher', reload() { calls.push('reload'); } },
    history: { state: null, replaceState() {}, pushState() {}, go() {}, back() {} },
    addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); },
    setTimeout: () => 0, clearTimeout() {},
    google: { accounts: { id: {
      initialize: (o) => calls.push('initialize:' + o.itp_support), renderButton: () => calls.push('button'),
      prompt: () => calls.push('prompt'), cancel: () => calls.push('cancel'), disableAutoSelect: () => calls.push('disableAutoSelect') } } }
  };
  g.window = g; g.top = g; g.self = g;
  vm.createContext(g); vm.runInContext(main, g);
  const fire = (data, source, origin) => (handlers.message || []).forEach((h) => h({ data, source, origin }));
  return { g, calls, els, ls, fire, n: (c) => calls.filter((x) => x === c).length };
}

console.log('[선생님 껍데기 로그인 화면]');

t('③ WebKit(아이폰 크롬·맥 사파리·데스크톱 UA 아이패드)은 첫 One Tap 을 안 띄운다 — 버튼(팝업 하나)만 · 그 밖(맥·윈도·안드로이드 크롬)은 종전대로 One Tap', () => {
  for (const k of ['iphone', 'macSafari', 'ipadDesktop']) {
    const b = boot(UA[k]);
    assert.strictEqual(b.n('prompt'), 0, '⛔ ' + k + ' — 계정 없는 시트 → 고르기 팝업 두 단계가 또 뜬다');
    assert.strictEqual(b.n('button'), 1, '⛔ ' + k + ' — 누를 버튼이 없다(막다른 골목)');
    assert.ok(b.calls.includes('initialize:true'), '⛔ ' + k + ' — GIS 를 안 세우면 만료·[다른 계정으로] 길이 죽는다(itp_support 도 그대로)');
  }
  for (const k of ['macChrome', 'winChrome', 'android']) {
    const b = boot(UA[k]);
    assert.strictEqual(b.n('prompt'), 1, '⛔ ' + k + ' — One Tap 이 사라졌다(WebKit 만 빼야 한다)');
    assert.strictEqual(b.n('button'), 1);
  }
  //   기기 열쇠를 7일 끈 크롬(DK_OFF)은 WebKit 이 아니다 — One Tap 은 그대로
  const off = boot(UA.macChrome, { onf_devkey_off: String(Date.now()) });
  assert.strictEqual(off.n('prompt'), 1, '⛔ 열쇠를 끈 크롬에서도 One Tap 이 사라졌다(UA 판정과 열쇠 끔이 섞였다)');
});

t('③ 받아 둔 토큰으로 바로 연 크롬은 종전대로 묻지 않는다 · WebKit 은 받아 둔 것을 안 쓴다(늘 구글 창구) · 만료(stale) 땐 WebKit 도 다시 묻는다', () => {
  const now = Math.floor(Date.now() / 1000), tok = jwt({ exp: now + 3000, hd: 'ownify.co.kr', email: 'a@ownify.co.kr' });
  const c = boot(UA.macChrome, { onf_id_tok: tok });
  assert.strictEqual(c.n('prompt'), 0, '⛔ 이미 들어왔는데 One Tap 을 띄운다');
  assert.ok(/AKfycb/.test(String(c.els.app.src || '')), '⛔ 받아 둔 토큰으로 액자를 안 열었다');
  const w = boot(UA.iphone, { onf_id_tok: tok });
  assert.ok(!w.els.app.src, '⛔ WebKit 이 받아 둔 토큰으로 바로 열었다(구글 창구 없이 열면 「화면이 안 열렸어요」 — 2026-10-12)');
  assert.strictEqual(w.n('prompt'), 0);
  //   만료 — 안쪽(내 액자 후손 · googleusercontent)이 stale 노크 → WebKit 에서도 prompt(그땐 누를 버튼이 화면에 없다)
  w.g.mount();
  w.fire({ onf: 'auth-please', stale: true }, { parent: w.els.app.contentWindow }, 'https://n-abc-0lu-script.googleusercontent.com');
  assert.deepStrictEqual(w.calls.filter((x) => x === 'cancel' || x === 'prompt'), ['cancel', 'prompt'], '⛔ 만료 때 WebKit 이 다시 못 묻는다(20초 뒤 「만료됐어요」에 갇힌다)');
});

t('② 숨긴 #app 은 정말 숨는다 — #app { display:block } 이 [hidden] 을 이겨 로그인 화면 밑에 화면 높이만큼 깔렸다(WebKit 은 그걸 흰 종이로 칠함)', () => {
  const style = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
  assert.ok(/#app \{[^}]*display:block/.test(style), '전제: #app 은 display:block 이다(이게 [hidden] 을 이긴다)');
  assert.ok(/#app\[hidden\] \{ display:none; \}/.test(style), '⛔ #app[hidden] 을 다시 눌러 주지 않는다 — 로그인 화면 아래 절반이 하얗다');
  assert.ok(/<iframe id="app" hidden/.test(html), '전제: 액자는 숨긴 채 시작한다');
});

t('②④ 다크에선 액자를 밝은 색 체계로 둔다 — 안 그러면 구글 문서(버튼·exec 래퍼)를 불투명 흰 종이로 칠한다 · 껍데기가 덮어쓰지 않는다', () => {
  const blk = (sel) => { const i = css.indexOf(sel); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
  assert.ok(/color-scheme:\s*dark/.test(blk(':root[data-theme="dark"] {')), '전제: 다크는 색 체계를 dark 로 단다(액자가 이걸 물려받는다)');
  assert.ok(/:root\[data-theme="dark"\] iframe \{ color-scheme: light; \}/.test(css), '⛔ 다크 액자가 dark 를 물려받는다 — 버튼 흰 테 · 들어갈 때 흰 화면');
  const after = css.slice(css.indexOf(':root[data-theme="dark"] iframe'));
  assert.ok(!/iframe[^{]*\{[^}]*color-scheme/.test(after.slice(after.indexOf('}'))), '⛔ 뒤에서 액자 색 체계를 다시 바꾼다');
  assert.ok(!/color-scheme/.test(/<style>([\s\S]*?)<\/style>/.exec(html)[1]), '⛔ 선생님 껍데기가 색 체계를 따로 단다(공용 규칙을 덮는다)');
  assert.ok(html.indexOf('../assets/onf-ui.css') > 0, '전제: 선생님 껍데기가 공용 스타일을 읽는다');
});

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
