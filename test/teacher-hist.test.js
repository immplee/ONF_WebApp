/* teacher/index.html 의 「기록 칸 다리」(onf-hist:begin ~ onf-hist:end 표지 구간) 만 잰다.
   왜: 안쪽(GAS iframe)이 「뒤로 = 창 닫기」 기록 칸을 이 껍데기(최상위 문서)에 만들어 달라고 부탁한다 — 칸이 최상위에 있어야
   아이폰 스와이프 뒤로의 덮개가 제때 걷힌다(Ownify ONF_Shell_Js 「기록 어댑터」 주석). 이 블록이 헐거우면 남의 창이 기록을 흔들고,
   너무 빡빡하면 안쪽의 부탁이 조용히 안 닿아 뒤로가 옛 동작(하얀 덮개)으로 돌아간다 — 둘 다 오류 없이 일어난다.
   껍데기 전체는 구글 로그인 때문에 vm 에서 못 돌린다 — 표지 구간만 떼어 돌린다. 로그인 배선은 이 검사가 건드리지 않는다.
   실행: node test/teacher-hist.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const A = src.indexOf('/* onf-hist:begin */'), B = src.indexOf('/* onf-hist:end */');
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

console.log('[껍데기 기록 칸 다리]');
t('표지 구간이 있고, 껍데기가 **최상위일 때만** 도는 자리에 있다 (남의 액자 안이면 안 돈다)', () => {
  assert.ok(A > 0 && B > A, '표지가 없다');
  assert.strictEqual((src.match(/onf-hist:begin/g) || []).length, 1);
  assert.ok(/if \(window\.top === window\.self\) \{$/.test(src.slice(0, A).trimEnd()), '표지 바로 앞이 「최상위일 때만」 문이 아니다');
  assert.ok(/\/\* onf-hist:end \*\/\s*\}/.test(src.slice(B)), '표지 끝 뒤가 그 문의 닫는 괄호가 아니다');
});
t('⛔ 안쪽에 토큰을 줄 때 hist 를 싣되, 껍데기가 최상위일 때만 1 이다 · targetOrigin 은 appOrigin (\'*\' 금지)', () => {
  assert.ok(/postMessage\(\{ onf: 'auth', token: pending, hist: \(window\.top === window\.self\) \? 1 : 0 \}, appOrigin\)/.test(src));
  const blk = src.slice(A, B);
  assert.ok(!/postMessage\([^)]*'\*'/.test(blk), "⛔ 블록에 '*' 발신이 있다");
  assert.ok(/postMessage\(\{ onf: 'hist-pop'[^\n]*\}, appOrigin\)/.test(blk), '⛔ hist-pop 은 appOrigin 으로만 보낸다');
});

const ORIGIN = 'https://n-abc-script.googleusercontent.com';
/** 블록을 vm 에서 돌린다. history 는 칸을 **구조화 복제로** 저장하는 가짜 세션 기록(브라우저처럼 back 은 나중에 popstate). */
function run(opt) {
  opt = opt || {};
  const H = { st: [{ state: opt.startState || null }], i: 0, backs: 0, goes: [], replaced: 0, to: [],
    get state() { return this.st[this.i].state; },
    pushState(s) { if (opt.pushThrows) throw new Error('SecurityError'); this.raw = s; this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(s)) }); this.i++; },
    replaceState(s) { this.replaced++; this.st[this.i].state = s; },
    back() { this.backs++; this.to.push(Math.max(0, this.i - 1)); },
    go(n) { this.goes.push(n); this.to.push(Math.max(0, Math.min(this.st.length - 1, this.i + n))); } };
  const L = { message: [], popstate: [] }, sent = [];
  const appWin = opt.noApp ? null : { postMessage(m, o) { sent.push({ m: JSON.parse(JSON.stringify(m)), o }); } };
  const c = { window: { addEventListener(tp, f) { L[tp].push(f); } }, history: H, appWin, appOrigin: ORIGIN };
  vm.createContext(c);
  vm.runInContext(src.slice(A, B), c, { filename: 'onf-hist-block' });
  const R = { H, sent, appWin, c,
    depth: () => vm.runInContext('histDepth', c),
    msg: (d, o) => L.message.forEach((f) => f({ data: d, source: (o && 'source' in o) ? o.source : appWin, origin: (o && o.origin) || ORIGIN })),
    push: (id, state, o) => R.msg({ onf: 'hist', op: 'push', id, state }, o),
    back: (id, o) => R.msg({ onf: 'hist', op: 'back', id }, o),
    hello: (o) => R.msg({ onf: 'hist', op: 'hello' }, o),
    pop: () => { if (H.to.length) H.i = H.to.shift(); L.popstate.forEach((f) => f({})); },
    flush: () => { let n = 0; while (H.to.length && n++ < 9) R.pop(); },
    browserBack: () => { H.i = Math.max(0, H.i - 1); R.pop(); },
    listeners: L };
  return R;
}

t('push = 주소 칸을 비운 채 {onfHist,s,n} 한 칸 · 깊이 증가', () => {
  const R = run();
  R.push('abc1', { onfPeek: 'p1' });
  assert.strictEqual(R.H.st.length, 2);
  assert.deepStrictEqual(R.H.state, { onfHist: 'abc1', s: { onfPeek: 'p1' }, n: 1 });
  assert.strictEqual(R.depth(), 1);
  R.push('abc2', { onfHwv: 'v1' });
  assert.strictEqual(R.depth(), 2); assert.strictEqual(R.H.state.n, 2);
});

t('⛔ back 은 맨 위가 그 id 일 때만 걷는다 (남의 칸 보호)', () => {
  const R = run();
  R.push('abc1', { a: 1 }); R.push('abc2', { b: 1 });
  R.back('abc1');
  assert.strictEqual(R.H.backs, 0, '⛔ 맨 위가 아닌 id 로 걷었다');
  R.back('zzz');
  assert.strictEqual(R.H.backs, 0, '⛔ 모르는 id 로 걷었다');
  R.back('abc2');
  assert.strictEqual(R.H.backs, 1, '맨 위 id 는 걷는다(검사가 눈멀지 않았다)');
  R.H.pushState({ someoneElse: 1 });                       // 남의 칸이 위에 쌓였다
  R.back('abc2');
  assert.strictEqual(R.H.backs, 1, '⛔ 남의 칸 위에서 걷었다');
});

t('popstate = appWin 에게 hist-pop {id,s} 를 appOrigin 으로 · 깊이를 칸 수에 맞춘다 · 바닥이면 id 빈 글', () => {
  const R = run();
  R.push('abc1', { onfPeek: 'p1' }); R.push('abc2', { onfHwv: 'v1' });
  R.browserBack();
  assert.deepStrictEqual(R.sent.pop(), { m: { onf: 'hist-pop', id: 'abc1', s: { onfPeek: 'p1' } }, o: ORIGIN });
  assert.strictEqual(R.depth(), 1);
  R.browserBack();
  assert.deepStrictEqual(R.sent.pop(), { m: { onf: 'hist-pop', id: '', s: null }, o: ORIGIN });
  assert.strictEqual(R.depth(), 0, '⛔ 깊이가 0 으로 안 돌아왔다');
  R.browserBack();                                          // 바닥 밑으로 — 깊이는 0 밑으로 안 간다
  assert.strictEqual(R.depth(), 0);
  //   안쪽이 back 을 부탁한 메아리도 같은 길
  R.push('abc3', { a: 1 }); R.back('abc3'); R.flush();
  assert.strictEqual(R.sent.pop().m.id, '');
  assert.strictEqual(R.depth(), 0);
});

t('hello = 죽은 칸 치우기(깊이만큼 go) · 깊이 0 이면 아무 일 없다', () => {
  const R = run();
  R.hello();
  assert.deepStrictEqual(R.H.goes, [], '⛔ 칸이 없는데 go 를 불렀다');
  R.push('abc1', { a: 1 }); R.push('abc2', { b: 1 });
  R.hello();
  assert.deepStrictEqual(R.H.goes, [-2], '⛔ 죽은 칸 둘을 한 번에 치우지 않았다');
  assert.strictEqual(R.depth(), 0);
  R.flush();
  assert.strictEqual(R.H.i, 0);
});

t('시작할 때: 껍데기가 다시 읽힌 채 남은 표식({onfHist})만 지운다 · 남의 state 는 안 건드린다', () => {
  let R = run({ startState: { onfHist: 'old1', s: { a: 1 }, n: 1 } });
  assert.strictEqual(R.H.replaced, 1);
  assert.strictEqual(R.H.state, null, '⛔ 표식을 안 지웠다');
  R = run({ startState: { other: 1 } });
  assert.strictEqual(R.H.replaced, 0, '⛔ 남의 state 를 지웠다');
  R = run();
  assert.strictEqual(R.H.replaced, 0);
});

t('⛔ 위조: 다른 출처 · 다른 창 · 아직 안쪽을 모르는 때(appWin 없음)는 버린다 — push·back·hello 전부', () => {
  const R = run();
  R.push('abc1', { a: 1 }, { origin: 'https://evil.example' });
  R.push('abc1', { a: 1 }, { source: {} });
  R.push('abc1', { a: 1 }, { source: null });
  assert.strictEqual(R.H.st.length, 1, '⛔ 위조된 push 를 받았다');
  R.push('abc2', { a: 1 });
  R.back('abc2', { origin: 'https://evil.example' }); R.back('abc2', { source: {} });
  assert.strictEqual(R.H.backs, 0, '⛔ 위조된 back 이 칸을 걷었다');
  R.hello({ origin: 'https://evil.example' }); R.hello({ source: {} });
  assert.deepStrictEqual(R.H.goes, [], '⛔ 위조된 hello 가 기록을 흔들었다');
  const N = run({ noApp: true });                           // 안쪽이 아직 노크 전 — 누구 말도 안 듣는다
  N.push('abc1', { a: 1 }, { source: null }); N.push('abc1', { a: 1 }, { source: undefined });
  assert.strictEqual(N.H.st.length, 1, '⛔ appWin 이 없을 때 source 없는 말이 통과했다');
  N.browserBack();                                          // 기록이 움직여도 죽지 않는다
});

t('⛔ 값 검증: op 는 push|back|hello · id 는 [A-Za-z0-9]{1,40} · state 는 2KB 이하의 평범한 객체', () => {
  const R = run();
  const bad = [['bad id!', { a: 1 }], ['', { a: 1 }], ['x'.repeat(41), { a: 1 }], [7, { a: 1 }], [null, { a: 1 }], ['한글id', { a: 1 }],
    ['ok1', 'str'], ['ok2', [1]], ['ok3', null], ['ok4', 5], ['ok5', { big: 'x'.repeat(2100) }], ['ok6', { k: '가'.repeat(700) }]];
  bad.forEach(([id, st]) => R.push(id, st));
  R.msg({ onf: 'hist', op: 'pwn', id: 'ok7', state: { a: 1 } });
  R.msg({ onf: 'hist', op: undefined, id: 'ok8', state: { a: 1 } });
  R.push('top1', { a: 1 }); const n1 = R.H.st.length;          // 맨 위 id 와 **같은** id 로 온 모르는 op 도 기록을 못 건드린다(back 으로 새지 않는다)
  R.msg({ onf: 'hist', op: 'pwn', id: 'top1' }); R.msg({ onf: 'hist', op: 'BACK', id: 'top1' }); R.msg({ onf: 'hist', id: 'top1' });
  assert.strictEqual(R.H.backs, 0, '⛔ 모르는 op 가 back 처럼 칸을 걷었다');
  R.H.st.pop(); R.H.i = 0; vm.runInContext('histDepth = 0', R.c);
  R.msg({ onf: 'other', op: 'push', id: 'ok9', state: { a: 1 } });
  R.msg(null); R.msg('hist'); R.msg({});
  assert.strictEqual(R.H.st.length, 1, '⛔ 나쁜 말이 칸을 만들었다: ' + R.H.st.length);
  R.push('good1', { a: 1 }); R.push('x'.repeat(40), { a: 1 }); R.push('good3', { big: 'x'.repeat(1900) });
  assert.strictEqual(R.H.st.length, 4, '정상 말은 받는다(검사가 눈멀지 않았다)');
  //   기록 API 가 막힌 곳(던진다) — 조용히
  const T = run({ pushThrows: true });
  assert.doesNotThrow(() => T.push('abc1', { a: 1 }));
  assert.strictEqual(T.depth(), 0, '⛔ 못 넣은 칸을 깊이에 셌다');
});

t('⛔ 넣는 state 는 **JSON 으로 납작하게 만든 사본**이다 — Map·Set 같은 JSON 으로 안 나오는 타입이 2KB 상한을 우회해 기록 칸에 실리지 않는다 (검수 2026-10-01)', () => {
  const R = run();
  const big = new Map(); for (let i = 0; i < 5; i++) big.set('k' + i, 'v'.repeat(50));
  R.push('mp1', { m: big, d: new Date(0), ok: 1 });
  assert.strictEqual(R.H.st.length, 2, '전제: 정상 모양(평범한 객체)이라 받는다');
  assert.ok(!(R.H.raw.s.m instanceof Map) && !(R.H.raw.s.d instanceof Date), '⛔ pushState 에 JSON 이 아닌 타입 그대로 들어갔다(구조화 복제로 덩어리째 기록에 실린다)');
  assert.strictEqual(JSON.stringify(R.H.raw.s), '{"m":{},"d":"1970-01-01T00:00:00.000Z","ok":1}', '⛔ 납작하게 만든 사본이 아니다: ' + JSON.stringify(R.H.raw.s));
  //   JSON 으로 못 바꾸는 값(순환)은 받지 않는다
  const cyc = { a: 1 }; cyc.self = cyc;
  R.push('cy1', cyc);
  assert.strictEqual(R.H.st.length, 2, '⛔ 순환 객체가 칸을 만들었다');
});

t('⛔ 칸 깊이는 **칸의 n 에서 다시 읽는다** — 칸이 둘일 때 뒤로 한 번 · 앞으로 가기로 깊은 칸에 다시 서도 맞다 (검수 2026-10-01)', () => {
  const R = run();
  R.push('pk1', { onfPeek: 'p' }); R.push('hv1', { onfHwv: 'h' });
  assert.strictEqual(R.depth(), 2);
  R.browserBack();
  assert.strictEqual(R.depth(), 1, '⛔ 뒤로 한 번 뒤 깊이가 1 이 아니다');
  R.H.i++; R.pop();                              // 앞으로 가기 — 깊은 칸(n=2)에 다시 선다
  assert.strictEqual(R.depth(), 2, '⛔ 앞으로 가기로 깊은 칸에 섰는데 깊이를 1 로 셌다 — hello 의 go(-n) 이 한 칸 모자라게 걷는다');
  R.hello(); R.flush();
  assert.strictEqual(R.H.i, 0, '⛔ hello 가 깊은 칸 둘을 다 걷지 못했다');
});

/* ═══ 로그인 노크의 「누가 노크했나」 검사 (Peter 2026-10-01) — onf-knock 표지 구간(appWin · fromOurFrame · answer · 노크 리스너)을 vm 에서 돌린다 ═══
   왜: 라이브(크롬)에서 노크가 `n-…-script.googleusercontent.com` 의 **깊이 2**(shell → exec → sandboxFrame → userHtmlFrame)에서 와, 종전 「자식이거나 손자」 두 단 검사에 걸려 버려졌다 →
   appWin 이 null 로 굳어 토큰 `auth{hist:1}` 이 안 가고 기록 다리가 영영 안 켜졌다(속도표에 「토큰 받음」 없음). 이 검사가 깊이를 못 박는다.
   ⛔ 로그인 배선(mount·GIS·onCredential)은 이 검사가 건드리지 않는다 — 구간 안의 노크 리스너와 answer 만. */
console.log('\n[껍데기 로그인 노크 — 누가 노크했나]');
const KA = src.indexOf('/* onf-knock:begin */'), KB = src.indexOf('/* onf-knock:end */');
t('표지 구간이 하나 있고, 노크 리스너·answer·fromOurFrame 이 그 안에 있다', () => {
  assert.ok(KA > 0 && KB > KA, '표지가 없다');
  assert.strictEqual((src.match(/onf-knock:begin/g) || []).length, 1);
  const blk = src.slice(KA, KB);
  assert.ok(/function fromOurFrame\(win\)/.test(blk) && /function answer\(\)/.test(blk) && /onf !== 'auth-please'/.test(blk), '구간에 셋이 다 없다');
  assert.ok(/!fromOurFrame\(ev\.source\)/.test(blk), '⛔ 노크 리스너가 사슬 검사(fromOurFrame)를 안 부른다');
});

const KORIGIN = 'https://n-abc-script.googleusercontent.com';
/** 가짜 창 사슬. mk(name, parent) — parent 를 안 주면 최상위(parent === 자기). */
function mkWin(name, parent, sent) {
  const w = { name, postMessage(m, o) { sent.push({ to: name, m: JSON.parse(JSON.stringify(m)), o }); } };
  w.parent = parent || w;
  return w;
}
/** 노크 구간을 vm 에서 돌린다. frame.contentWindow = exec 창. 반환: 노크 보내기·보낸 것·appWin. */
function runKnock(opt) {
  opt = opt || {};
  const L = { message: [] }, sent = [], calls = [];
  const top = {}; top.top = top; top.self = top;                       // 껍데기는 최상위(window.top === window.self)
  top.addEventListener = (tp, f) => { (L[tp] = L[tp] || []).push(f); };
  const exec = mkWin('exec', null, sent);                              // frame.contentWindow — script.google.com 래퍼 문서
  const c = { window: top, frame: { contentWindow: opt.noFrameWin ? null : exec }, pending: ('pending' in opt) ? opt.pending : 'TOK', frameWatch: null,
    clearTimeout() { calls.push('clearTimeout'); }, document: { getElementById() { return { hidden: false }; } }, URL,
    google: { accounts: { id: { cancel() { calls.push('cancel'); }, prompt() { calls.push('prompt'); }, disableAutoSelect() { calls.push('disableAutoSelect'); } } } },
    localStorage: { removeItem() { calls.push('removeItem'); } }, TOKKEY: 'k' };
  vm.createContext(c);
  vm.runInContext(src.slice(KA, KB), c, { filename: 'onf-knock-block' });
  const R = { c, sent, calls, exec, sentTo: (n) => sent.filter((x) => x.to === n),
    knock: (source, o) => L.message.forEach((f) => f({ data: (o && o.data) || { onf: 'auth-please', stale: false }, source, origin: (o && 'origin' in o) ? o.origin : KORIGIN })),
    appWin: () => vm.runInContext('appWin', c),
    chain(n, nameOf) {                                                   // exec 아래 n 겹 — n=1: sandboxFrame, n=2: userHtmlFrame …
      let p = exec; for (let i = 1; i <= n; i++) p = mkWin((nameOf || 'w') + i, p, sent);
      return p;
    } };
  return R;
}

t('⛔ [라이브 사고] 깊이 2(exec → sandboxFrame → userHtmlFrame)의 노크를 받아 appWin 으로 정하고 `auth{token,hist:1}` 을 그 창에 appOrigin 으로 답한다', () => {
  const R = runKnock();
  const inner = R.chain(2, 'userHtml');
  R.knock(inner);
  assert.strictEqual(R.appWin(), inner, '⛔ 깊이 2 노크를 버렸다 — appWin 이 안 잡혀 기록 다리·토큰이 안 켜진다');
  assert.deepStrictEqual(R.sentTo('userHtml2'), [{ to: 'userHtml2', m: { onf: 'auth', token: 'TOK', hist: 1 }, o: KORIGIN }], '답이 이 모양이 아니다');
  assert.ok(R.calls.includes('clearTimeout'), '막힘 안내 시계를 안 껐다');
});

t('종전 두 단은 그대로 받는다: 자기 자신(깊이 0) · 자식(깊이 1) · 손자(깊이 2) · 더 깊은 래퍼(깊이 3·7) — 전부 hist:1 로 답', () => {
  [[0], [1], [2], [3], [7]].forEach(([n]) => {
    const R = runKnock();
    const w = n === 0 ? R.exec : R.chain(n, 'x');
    R.knock(w);
    assert.strictEqual(R.appWin(), w, '⛔ 깊이 ' + n + ' 노크를 버렸다');
    assert.strictEqual(R.sentTo(w.name).length, 1, '깊이 ' + n + ': 답이 한 번 가야 한다');
    assert.strictEqual(R.sentTo(w.name)[0].m.hist, 1);
  });
});

t('⛔ 상한 8: 사슬이 8겹을 넘는 창은 안 받는다(깊이 8) — 끝없는 사슬을 따라가지 않는다', () => {
  const R = runKnock();
  const deep = R.chain(8, 'd');
  R.knock(deep);
  assert.strictEqual(R.appWin(), null, '⛔ 상한을 넘은 창을 받았다');
  assert.strictEqual(R.sent.length, 0);
});

t('⛔ 위조: 내 iframe 의 후손이 아닌 창(형제 iframe · 최상위 자신 · 열어 둔 다른 창 · 남의 래퍼)은 origin 이 맞아도 버린다', () => {
  const R = runKnock();
  const sib = mkWin('sibling', null, R.sent);                             // 껍데기 안의 다른 iframe — 부모 사슬이 exec 에 안 닿는다
  const sibKid = mkWin('sibKid', mkWin('sibMid', sib, R.sent), R.sent);   // 그 아래 깊이 2 라도 마찬가지
  const other = mkWin('otherWindow', null, R.sent);
  [sib, sibKid, other, R.c.window].forEach((w) => R.knock(w));
  assert.strictEqual(R.appWin(), null, '⛔ 후손이 아닌 창을 받았다');
  assert.strictEqual(R.sent.length, 0, '⛔ 후손이 아닌 창에 토큰을 보냈다');
  R.knock(null); R.knock(undefined);
  assert.strictEqual(R.appWin(), null, '⛔ source 없는 노크를 받았다');
});

t('⛔ 위조: 후손이어도 출처가 googleusercontent.com 이 아니면 버린다 (script.google.com · 남의 도메인 · 접미 흉내 · 깨진 출처)', () => {
  const bad = ['https://script.google.com', 'https://evil.example', 'https://evilgoogleusercontent.com', 'https://googleusercontent.com.evil.example', 'null', '', 'not a url'];
  bad.forEach((o) => {
    const R = runKnock();
    R.knock(R.chain(2, 'u'), { origin: o });
    assert.strictEqual(R.appWin(), null, '⛔ 나쁜 출처를 받았다: ' + o);
    assert.strictEqual(R.sent.length, 0, '⛔ 나쁜 출처에 토큰을 보냈다: ' + o);
  });
  const ok = runKnock();                                                   // 검사가 눈멀지 않았다 — 맨 도메인·하위 도메인은 받는다
  ok.knock(ok.chain(2, 'u'), { origin: 'https://googleusercontent.com' });
  assert.ok(ok.appWin(), '맨 googleusercontent.com 은 받아야 한다');
});

t('⛔ 적대적 사슬: parent 가 순환(A→B→A) · parent getter 가 던짐(어느 깊이에서든) · frame.contentWindow 가 null — 멈추지 않고 던지지 않고 버린다', () => {
  const R = runKnock();
  const a = { name: 'A', postMessage() { R.sent.push('A'); } }, b = { name: 'B', postMessage() { R.sent.push('B'); } };
  a.parent = b; b.parent = a;                                              // 순환 — 상한 8 이 끊는다
  assert.doesNotThrow(() => R.knock(a));
  assert.strictEqual(R.appWin(), null, '⛔ 순환 사슬을 받았다');
  const thrower = { name: 'T', postMessage() { R.sent.push('T'); } };
  Object.defineProperty(thrower, 'parent', { get() { throw new Error('SecurityError'); } });
  assert.doesNotThrow(() => R.knock(thrower));
  assert.strictEqual(R.appWin(), null, '⛔ parent 가 던지는 창을 받았다');
  R.c.__hostile = thrower;                                                 // 노크 리스너의 바깥 try 에 기대지 않는다 — fromOurFrame 자체가 던지지 않고 false 를 준다
  assert.strictEqual(vm.runInContext('fromOurFrame(__hostile)', R.c), false, '⛔ fromOurFrame 이 던지는 parent 에서 false 를 안 준다');
  const deepThrower = mkWin('DT', null, R.sent);                           // 깊이 1 까지는 정상, 그 위에서 던진다
  const mid = { name: 'M', postMessage() {} }; Object.defineProperty(mid, 'parent', { get() { throw new Error('SecurityError'); } });
  deepThrower.parent = mid;
  assert.doesNotThrow(() => R.knock(deepThrower));
  assert.strictEqual(R.appWin(), null);
  assert.strictEqual(R.sent.length, 0, '⛔ 적대적 창에 무언가 보냈다');
  const N = runKnock({ noFrameWin: true });                                // 액자가 떼어졌다(contentWindow null) — 아무도 후손이 아니다
  assert.doesNotThrow(() => N.knock(N.chain(2, 'u')));
  assert.strictEqual(N.appWin(), null);
  assert.strictEqual(N.sent.length, 0);
});

t('⛔ 한 번 정하면 안 바꾼다(래치) — 같은 창은 다시 답하고, 나중에 온 다른 후손은 깊이가 맞아도 토큰을 못 받는다', () => {
  const R = runKnock();
  const first = R.chain(2, 'first'), second = mkWin('second2', mkWin('secondMid', R.exec, R.sent), R.sent);
  R.knock(first);
  assert.strictEqual(R.appWin(), first);
  R.knock(second);
  assert.strictEqual(R.appWin(), first, '⛔ 나중 창이 appWin 을 빼앗았다');
  assert.strictEqual(R.sentTo('second2').length, 0, '⛔ 나중 창이 토큰을 받았다');
  R.knock(first);
  assert.strictEqual(R.sentTo('first2').length, 2, '같은 창의 재노크엔 다시 답한다(토큰이 늦게 와도 닿게)');
});

t('토큰 전의 노크: appWin 은 정하되 아무것도 안 보낸다 → 로그인 뒤 answer() 가 보낸다 · 만료 노크(stale)는 답 대신 GIS 를 다시 부른다(깊이 2 에서도)', () => {
  const R = runKnock({ pending: '' });
  const inner = R.chain(2, 'u');
  R.knock(inner);
  assert.strictEqual(R.appWin(), inner);
  assert.strictEqual(R.sent.length, 0, '⛔ 토큰도 없이 무언가 보냈다');
  vm.runInContext("pending = 'TOK2'; answer();", R.c);
  assert.deepStrictEqual(R.sentTo('u2'), [{ to: 'u2', m: { onf: 'auth', token: 'TOK2', hist: 1 }, o: KORIGIN }]);
  const S = runKnock();                                                    // stale = 안쪽이 「토큰 만료」를 알려 온 노크
  S.knock(S.chain(2, 'u'), { data: { onf: 'auth-please', stale: true, other: true } });
  assert.deepStrictEqual(S.calls.filter((x) => x !== 'clearTimeout'), ['removeItem', 'disableAutoSelect', 'cancel', 'prompt'], '⛔ 만료·다른 계정 노크가 GIS 를 안 불렀다');
  assert.strictEqual(S.sent.length, 0, '⛔ 만료 노크에 낡은 토큰으로 답했다');
  const E = runKnock();
  E.knock(E.chain(2, 'u'), { data: { onf: 'something-else' } });
  assert.strictEqual(E.appWin(), null, '⛔ 모르는 말이 appWin 을 정했다');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
