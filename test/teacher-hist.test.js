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
    pushState(s) { if (opt.pushThrows) throw new Error('SecurityError'); this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(s)) }); this.i++; },
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

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
