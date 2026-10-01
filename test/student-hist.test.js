/* assets/onf-frame.js 의 「기록 칸 다리」(학생 껍데기판) 를 **진짜 mount() 로** 잰다.
   왜: 안쪽(GAS iframe)이 「뒤로 = 창 닫기」 기록 칸을 이 껍데기(최상위 문서)에 만들어 달라고 부탁한다 — 칸이 최상위에 있어야
   아이폰 스와이프 뒤로의 덮개가 제때 걷힌다(Ownify ONF_Shell_Js 「기록 어댑터」 주석). 이 블록이 헐거우면 남의 창이 기록을 흔들고,
   너무 빡빡하면 안쪽의 부탁이 조용히 안 닿아 뒤로가 옛 동작(하얀 덮개)으로 돌아간다 — 둘 다 오류 없이 일어난다.
   teacher-hist.test.js 는 표지 구간만 떼어 돌린다(그쪽 껍데기는 구글 로그인 때문에 통째로 못 돌린다). 이쪽은 `ONF.frame.mount` 를 통째로 돌린다 —
   그래서 **기존 동작(kbH·title·frameHello·출처 자물쇠)이 무변인지**도 같이 못 박는다.
   ⛔ 실제 학생 토큰은 여기 넣지 마라(PUBLIC 저장소) — 아래 토큰은 가짜 글자다.
   실행: node test/student-hist.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'onf-frame.js'), 'utf8');
let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); console.log('  ✅ ' + label); pass++; }
  catch (e) { console.log('  ❌ ' + label + '\n     ' + e.message); fail++; }
}

const ORIGIN = 'https://n-abc-script.googleusercontent.com';
const ORIGIN2 = 'https://n-xyz-script.googleusercontent.com';

/** onf-frame.js 를 vm 에 올리고 mount() 를 진짜로 돈다. 껍데기 창·기록·iframe 은 가짜(브라우저처럼 back 은 나중에 popstate). */
function boot(opt) {
  opt = opt || {};
  const H = { st: [{ state: opt.startState || null }], i: 0, backs: 0, goes: [], replaced: [], to: [],
    get state() { if (opt.stateThrows) throw new Error('SecurityError'); return this.st[this.i].state; },
    pushState(s) { if (opt.pushThrows) throw new Error('SecurityError'); this.raw = s; this.pushArgs = [].slice.call(arguments);
      this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(s)) }); this.i++; },
    replaceState(s, tt, u) { this.replaced.push({ s, u, n: arguments.length }); this.st[this.i].state = s; },
    back() { this.backs++; this.to.push(Math.max(0, this.i - 1)); },
    go(n) { this.goes.push(n); this.to.push(Math.max(0, Math.min(this.st.length - 1, this.i + n))); } };
  const L = { message: [], popstate: [], resize: [] };
  const win = (name, parent) => { const w = { name, sent: [] }; w.parent = parent || w;
    w.postMessage = function (m, o) { if (opt.innerThrows) throw new Error('gone'); w.sent.push({ m: JSON.parse(JSON.stringify(m)), o }); }; return w; };
  const top = win('shell');
  const wrapper = win('exec', top);                    // iframe#app 의 contentWindow (구글 래퍼)
  const inner = win('userHtml', wrapper);              // 가장 안쪽 샌드박스 (GAS 겹 수는 보장이 없다 — 한 겹 더)
  const frameEl = { contentWindow: wrapper, style: {}, getBoundingClientRect: () => ({ top: 0, bottom: 800 }) };
  const vv = { height: 400, offsetTop: 0, scale: 1, addEventListener() {} };
  const window_ = { addEventListener(tp, f) { (L[tp] = L[tp] || []).push(f); }, visualViewport: opt.noVV ? undefined : vv };
  const c = { window: window_, history: H, localStorage: opt.localStorage || null, document: { title: 'Ownify', addEventListener() {} },
    navigator: { userAgent: 'node' }, location: opt.location || { search: '', pathname: '/', href: 'https://class.ownify.co.kr/', hash: '' },
    URL, URLSearchParams, setTimeout: (f) => { f(); return 0; }, clearTimeout() {}, unescape, encodeURIComponent };
  vm.createContext(c);
  vm.runInContext(SRC, c, { filename: 'onf-frame.js' });
  if (opt.beforeMount) opt.beforeMount(c);
  c.window.ONF.frame.mount(frameEl, 'about:blank', {});
  const R = { H, c, top, wrapper, inner, frameEl, win, L,
    /** 메시지 한 통. o.source/o.origin 로 보낸 창·출처를 바꾼다(기본: 안쪽 · 구글 출처). */
    msg: (d, o) => { o = o || {}; L.message.forEach((f) => f({ data: d, source: ('source' in o) ? o.source : inner, origin: o.origin || ORIGIN })); },
    hi: (o) => R.msg({ onf: 'hist', op: 'hi' }, o),
    push: (id, state, o) => R.msg({ onf: 'hist', op: 'push', id, state }, o),
    back: (id, o) => R.msg({ onf: 'hist', op: 'back', id }, o),
    hello: (o) => R.msg({ onf: 'hist', op: 'hello' }, o),
    pop: () => { if (H.to.length) H.i = H.to.shift(); L.popstate.forEach((f) => f({})); },
    flush: () => { let n = 0; while (H.to.length && n++ < 9) R.pop(); },
    browserBack: () => { H.i = Math.max(0, H.i - 1); R.pop(); },
    texts: (w) => (w || inner).sent.map((x) => x.m.onf + (x.m.op ? ':' + x.m.op : '')) };
  return R;
}

console.log('[학생 껍데기 기록 칸 다리 — 악수 hi → hist-on]');
t('hi = 안쪽 창을 정하고 {onf:hist-on} 으로 **그 출처로만** 답한다 (\'*\' 금지)', () => {
  const R = boot();
  R.hi();
  assert.deepStrictEqual(R.inner.sent, [{ m: { onf: 'hist-on' }, o: ORIGIN }], '⛔ hist-on 이 안 갔거나 targetOrigin 이 hi 의 출처가 아니다: ' + JSON.stringify(R.inner.sent));
  assert.deepStrictEqual(R.wrapper.sent, [], '⛔ 래퍼에 보냈다(hi 를 보낸 창에만 답한다)');
});

t('⛔ 출처 자물쇠: 내 iframe 사슬 밖의 창 · 구글이 아닌 출처 · 구글 흉내 호스트 의 hi 는 답도 없고 창도 안 정한다', () => {
  const R = boot();
  const stranger = R.win('stranger', R.top);           // 오리진은 구글이어도 우리 iframe 이 아니다
  R.hi({ source: stranger });
  R.hi({ origin: 'https://evil.example' });
  R.hi({ origin: 'https://googleusercontent.com.evil.example' });
  R.hi({ origin: 'http://n-abc-script.googleusercontent.com' });           // 프로토콜 — 호스트 이름만 보는 기존 자물쇠는 통과시키지만 hi 는 https 만
  R.hi({ origin: 'https://n-abc-script.googleusercontent.com:8443' });     // 포트
  R.hi({ source: R.top });
  R.hi({ source: null });
  assert.deepStrictEqual(R.inner.sent.concat(stranger.sent, R.top.sent), [], '⛔ 자물쇠 밖의 hi 에 답했다');
  R.push('abc1', { a: 1 });                            // 위 hi 가 창을 정했다면 이 push 가 받힌다
  assert.strictEqual(R.H.st.length, 1, '⛔ 자물쇠 밖의 hi 가 창을 정했다 — 안쪽이 아닌 창이 기록을 흔든다');
  R.hi();
  R.push('abc1', { a: 1 });
  assert.strictEqual(R.H.st.length, 2, '전제: 진짜 안쪽의 hi 는 통한다(검사가 눈멀지 않았다)');
});

t('⛔ hi 전에는 아무 말도 안 받는다 — push·back·hello 전부 (안쪽을 아직 모른다)', () => {
  const R = boot();
  R.push('abc1', { a: 1 }); R.back('abc1'); R.hello();
  assert.strictEqual(R.H.st.length, 1); assert.strictEqual(R.H.backs, 0); assert.deepStrictEqual(R.H.goes, []);
  R.browserBack();                                     // 안쪽을 모르는데 기록이 움직여도 죽지 않고 보내지도 않는다
  assert.deepStrictEqual(R.inner.sent, []);
});

t('⛔ hi 가 **올 때마다** 창을 갈아 끼운다 — iframe 이 다시 만들어지면 새 안쪽이 이긴다 · 옛 안쪽의 늦은 push·back·hello 는 버린다 (키보드 사고 경로)', () => {
  const R = boot();
  R.hi(); R.push('old1', { onfPeek: 'p' });
  assert.strictEqual(R.H.st.length, 2);
  const inner2 = R.win('userHtml2', R.wrapper);        // 같은 래퍼 아래 새로 만들어진 안쪽(출처도 새것)
  R.hi({ source: inner2, origin: ORIGIN2 });
  assert.deepStrictEqual(inner2.sent, [{ m: { onf: 'hist-on' }, o: ORIGIN2 }], '⛔ 새 안쪽에 답이 안 갔다');
  //   옛 안쪽의 늦은 말
  R.push('old2', { a: 1 }); R.back('old1'); R.hello();
  assert.strictEqual(R.H.st.length, 2, '⛔ 옛 안쪽의 push 가 새 안쪽 뒤에 도착해 칸을 만들었다');
  assert.strictEqual(R.H.backs, 0, '⛔ 옛 안쪽의 back 이 칸을 걷었다');
  assert.deepStrictEqual(R.H.goes, [], '⛔ 옛 안쪽의 hello 가 기록을 흔들었다');
  //   ⛔ 내 iframe 사슬 안의 **다른 창**이 같은 출처로 말해도(형제 안쪽) 정한 창이 아니면 버린다 — 바깥 자물쇠(_fromOurFrame)는 통과하는 말이다
  const sibling = R.win('userHtmlSibling', R.wrapper);
  R.push('sib1', { a: 1 }, { source: sibling, origin: ORIGIN2 }); R.back('old1', { source: sibling, origin: ORIGIN2 }); R.hello({ source: sibling, origin: ORIGIN2 });
  R.push('sib2', { a: 1 }, { source: R.win('x', R.wrapper), origin: ORIGIN2 });
  assert.strictEqual(R.H.st.length, 2, '⛔ 정한 창이 아닌(사슬 안) 창의 push 를 받았다');
  assert.deepStrictEqual(R.H.goes, [], '⛔ 정한 창이 아닌 창의 hello 가 기록을 흔들었다');
  //   같은 창이어도 출처가 다르면(hi 의 출처로 못 박힌다) 버린다
  R.push('new0', { a: 1 }, { source: inner2, origin: ORIGIN });
  assert.strictEqual(R.H.st.length, 2, '⛔ 정한 창이어도 정한 출처가 아닌 push 를 받았다');
  //   새 안쪽의 말은 받는다 + 죽은 칸 치우기
  R.hello({ source: inner2, origin: ORIGIN2 });
  assert.deepStrictEqual(R.H.goes, [-1], '⛔ 새 안쪽의 hello 가 옛 안쪽이 남긴 죽은 칸을 못 치웠다');
  R.flush();
  assert.strictEqual(R.H.i, 0);
  R.push('new1', { a: 1 }, { source: inner2, origin: ORIGIN2 });
  assert.strictEqual(R.H.st.length, 2, '전제: 새 안쪽의 push 는 받는다(검사가 눈멀지 않았다)');
});

console.log('\n[칸 만들기·걷기·pop]');
t('push = 주소 칸을 비운 채 {onfHist,s,n} 한 칸 · 깊이 n 증가', () => {
  const R = boot(); R.hi();
  R.push('abc1', { onfHwv: 'v1' });
  assert.strictEqual(R.H.st.length, 2);
  assert.deepStrictEqual(R.H.state, { onfHist: 'abc1', s: { onfHwv: 'v1' }, n: 1 });
  assert.strictEqual(R.H.pushArgs.length, 2, '⛔ pushState 에 주소(세 번째 인자)를 줬다 — 주소는 안 건드린다');
  R.push('abc2', { b: 1 });
  assert.strictEqual(R.H.state.n, 2);
});

t('⛔ back 은 맨 위가 그 id 일 때만 걷는다 (남의 칸 보호) · 남의 칸이 위에 쌓였으면 안 걷는다', () => {
  const R = boot(); R.hi();
  R.push('abc1', { a: 1 }); R.push('abc2', { b: 1 });
  R.back('abc1'); R.back('zzz');
  assert.strictEqual(R.H.backs, 0, '⛔ 맨 위가 아닌 id 로 걷었다');
  R.back('abc2');
  assert.strictEqual(R.H.backs, 1, '맨 위 id 는 걷는다(검사가 눈멀지 않았다)');
  R.H.pushState({ someoneElse: 1 });
  R.back('abc2');
  assert.strictEqual(R.H.backs, 1, '⛔ 남의 칸 위에서 걷었다');
});

t('popstate = histWin 에게 hist-pop {id,s} 를 **정한 출처로** · 깊이를 칸 수에 맞춘다 · 바닥이면 id 빈 글 · 안쪽이 부탁한 back 의 메아리도 같은 길', () => {
  const R = boot(); R.hi(); R.inner.sent.length = 0;
  R.push('abc1', { onfPeek: 'p1' }); R.push('abc2', { onfHwv: 'v1' });
  R.browserBack();
  assert.deepStrictEqual(R.inner.sent.pop(), { m: { onf: 'hist-pop', id: 'abc1', s: { onfPeek: 'p1' } }, o: ORIGIN });
  R.browserBack();
  assert.deepStrictEqual(R.inner.sent.pop(), { m: { onf: 'hist-pop', id: '', s: null }, o: ORIGIN });
  R.browserBack();                                     // 바닥 밑으로 — 죽지 않는다
  R.push('abc3', { a: 1 }); R.back('abc3'); R.flush();
  assert.strictEqual(R.inner.sent.pop().m.id, '', '⛔ 안쪽이 부탁한 back 의 메아리(pop)가 안 갔다');
});

t('hello = 죽은 칸 치우기(깊이만큼 go) · 깊이 0 이면 아무 일 없다', () => {
  const R = boot(); R.hi();
  R.hello();
  assert.deepStrictEqual(R.H.goes, [], '⛔ 칸이 없는데 go 를 불렀다');
  R.push('abc1', { a: 1 }); R.push('abc2', { b: 1 });
  R.hello();
  assert.deepStrictEqual(R.H.goes, [-2], '⛔ 죽은 칸 둘을 한 번에 치우지 않았다');
  R.hello();                                           // pop 이 오기 전에 hello 가 또 와도 같은 칸을 두 번 걷지 않는다
  assert.deepStrictEqual(R.H.goes, [-2], '⛔ hello 가 깊이를 안 비워 같은 칸을 두 번 걷으려 했다');
  R.flush();
  assert.strictEqual(R.H.i, 0);
  R.hello();
  assert.deepStrictEqual(R.H.goes, [-2], '⛔ 치운 뒤 hello 가 또 go 를 불렀다');
});

t('⛔ 칸 깊이는 **칸의 n 에서 다시 읽는다** — 앞으로 가기로 깊은 칸에 다시 서도 맞다', () => {
  const R = boot(); R.hi();
  R.push('pk1', { onfPeek: 'p' }); R.push('hv1', { onfHwv: 'h' });
  R.browserBack();
  R.hello();
  assert.deepStrictEqual(R.H.goes, [-1], '⛔ 뒤로 한 번 뒤 깊이가 1 이 아니다(칸 n 에서 안 읽고 세어 둔 값을 그대로 썼다): ' + JSON.stringify(R.H.goes));
  R.flush();
  R.H.goes.length = 0;
  R.push('pk2', { onfPeek: 'p' }); R.push('hv2', { onfHwv: 'h' });
  R.browserBack();
  R.H.i++; R.pop();                                    // 앞으로 가기 — 깊은 칸(n=2)에 다시 선다
  R.hello();
  assert.deepStrictEqual(R.H.goes, [-2], '⛔ 앞으로 가기로 깊은 칸(n=2)에 섰는데 깊이를 틀리게 셌다');
  R.flush();
  assert.strictEqual(R.H.i, 0, '⛔ hello 가 깊은 칸 둘을 다 걷지 못했다(깊이를 1 로 셌다)');
});

t('⛔ 값 검증: op 는 hi|push|back|hello · id 는 [A-Za-z0-9]{1,40} · state 는 2KB 이하의 평범한 객체', () => {
  const R = boot(); R.hi();
  const bad = [['bad id!', { a: 1 }], ['', { a: 1 }], ['x'.repeat(41), { a: 1 }], [7, { a: 1 }], [null, { a: 1 }], ['한글id', { a: 1 }],
    ['ok1', 'str'], ['ok2', [1]], ['ok3', null], ['ok4', 5], ['ok5', { big: 'x'.repeat(2100) }], ['ok6', { k: '가'.repeat(700) }]];
  bad.forEach(([id, st]) => R.push(id, st));
  R.msg({ onf: 'hist', op: 'pwn', id: 'ok7', state: { a: 1 } });
  R.msg({ onf: 'hist', op: undefined, id: 'ok8', state: { a: 1 } });
  R.push('top1', { a: 1 });                            // 맨 위 id 와 **같은** id 로 온 모르는 op 도 기록을 못 건드린다(back 으로 새지 않는다)
  R.msg({ onf: 'hist', op: 'pwn', id: 'top1' }); R.msg({ onf: 'hist', op: 'BACK', id: 'top1' }); R.msg({ onf: 'hist', id: 'top1' });
  assert.strictEqual(R.H.backs, 0, '⛔ 모르는 op 가 back 처럼 칸을 걷었다');
  R.H.st.pop(); R.H.i = 0;
  R.hello(); R.flush();                                // 깊이 맞추기(위 정상 push 한 칸 지움)
  R.msg({ onf: 'other', op: 'push', id: 'ok9', state: { a: 1 } });
  R.msg(null); R.msg('hist'); R.msg({});
  assert.strictEqual(R.H.st.length, 1, '⛔ 나쁜 말이 칸을 만들었다: ' + R.H.st.length);
  R.push('good1', { a: 1 }); R.push('x'.repeat(40), { a: 1 }); R.push('good3', { big: 'x'.repeat(1900) });
  assert.strictEqual(R.H.st.length, 4, '정상 말은 받는다(검사가 눈멀지 않았다)');
  const T = boot({ pushThrows: true }); T.hi();        // 기록 API 가 막힌 곳(던진다) — 조용히
  assert.doesNotThrow(() => T.push('abc1', { a: 1 }));
  T.hello(); assert.deepStrictEqual(T.H.goes, [], '⛔ 못 넣은 칸을 깊이에 셌다');
});

t('⛔ 넣는 state 는 **JSON 으로 납작하게 만든 사본**이다 — Map·Set 같은 JSON 으로 안 나오는 타입이 2KB 상한을 우회해 기록 칸에 실리지 않는다 · 순환은 버린다', () => {
  const R = boot(); R.hi();
  const big = new Map(); for (let i = 0; i < 5; i++) big.set('k' + i, 'v'.repeat(50));
  R.push('mp1', { m: big, d: new Date(0), ok: 1 });
  assert.strictEqual(R.H.st.length, 2, '전제: 정상 모양(평범한 객체)이라 받는다');
  assert.ok(!(R.H.raw.s.m instanceof Map) && !(R.H.raw.s.d instanceof Date), '⛔ pushState 에 JSON 이 아닌 타입 그대로 들어갔다');
  assert.strictEqual(JSON.stringify(R.H.raw.s), '{"m":{},"d":"1970-01-01T00:00:00.000Z","ok":1}');
  const cyc = { a: 1 }; cyc.self = cyc;
  R.push('cy1', cyc);
  assert.strictEqual(R.H.st.length, 2, '⛔ 순환 객체가 칸을 만들었다');
});

t('안쪽 창이 던져도(닫힌 창) 껍데기는 죽지 않는다 — hi 답·hist-pop 둘 다', () => {
  const R = boot({ innerThrows: true });
  assert.doesNotThrow(() => R.hi());
  R.push('abc1', { a: 1 });
  assert.doesNotThrow(() => R.browserBack());
  assert.strictEqual(R.H.st.length, 2, '(답이 던져도 hi 로 정한 창은 유지 — push 는 받았다)');
});

console.log('\n[시작: 죽은 칸 표식 · hideToken 과의 관계]');
t('시작할 때: 껍데기가 다시 읽힌 채 남은 표식({onfHist})만 지운다 · 주소 인자는 안 준다 · 남의 state 는 안 건드린다', () => {
  let R = boot({ startState: { onfHist: 'old1', s: { a: 1 }, n: 1 } });
  assert.strictEqual(R.H.replaced.length, 1);
  assert.strictEqual(R.H.state, null, '⛔ 표식을 안 지웠다');
  assert.strictEqual(R.H.replaced[0].n, 2, '⛔ replaceState 에 주소(세 번째 인자)를 줬다 — hideToken 이 지운 주소를 되돌릴 수 있다');
  R = boot({ startState: { other: 1 } });
  assert.strictEqual(R.H.replaced.length, 0, '⛔ 남의 state 를 지웠다');
  R = boot();
  assert.strictEqual(R.H.replaced.length, 0);
});

t('⛔ hideToken 과 겹치지 않는다 — 주소에 ?t= 가 있으면 hideToken 이 state 를 null 로 만들어 표식 지우기는 할 일이 없다(둘이 두 번 쓰지 않는다)', () => {
  const TOK = 'FAKETOKEN12';
  const loc = { search: '?t=' + TOK, pathname: '/', href: 'https://class.ownify.co.kr/?t=' + TOK, hash: '' };
  const ls = { getItem: () => TOK, setItem() {} };      // 저장이 실제로 됐다 → hideToken 이 주소를 지운다
  const R = boot({ startState: { onfHist: 'old1', s: { a: 1 }, n: 1 }, location: loc, localStorage: ls,
    beforeMount: (c) => c.window.ONF.frame.hideToken() });
  assert.strictEqual(R.H.replaced.length, 1, '⛔ replaceState 가 둘 이상이다 — hideToken 과 표식 지우기가 겹친다: ' + R.H.replaced.length);
  assert.ok(R.H.replaced[0].u === '/', 'hideToken 이 주소를 깨끗이 만들었다: ' + R.H.replaced[0].u);
  assert.strictEqual(R.H.state, null);
});

console.log('\n[기존 동작 무변 — 키보드 높이(kbH) · 탭 제목 · frameHello · 출처 자물쇠]');
t('⛔ frameHello 가 appWin 을 정한다 → kbH 를 그 창에 \'*\' 로(종전 그대로) · hi 는 appWin 을 안 건드리고 frameHello 는 histWin 을 안 건드린다', () => {
  const R = boot();
  R.hi();
  assert.deepStrictEqual(R.texts(), ['hist-on'], '⛔ hi 만으로 kbH 가 갔다 — hi 가 appWin 을 정했다');
  R.L.resize.forEach((f) => f());                      // 키보드 보정이 도는 길 — appWin 이 안 잡혔으면 아무 데도 안 보낸다
  assert.deepStrictEqual(R.texts(), ['hist-on'], '⛔ hi 가 appWin 을 정해 화면 크기 변화에 kbH 가 갔다');
  R.msg({ onf: 'frameHello' });
  assert.deepStrictEqual(R.inner.sent.slice(1), [{ m: { onf: 'kbH', h: 400, top: 400 }, o: '*' }], '⛔ kbH 모양·targetOrigin 이 종전과 다르다: ' + JSON.stringify(R.inner.sent));
  const R2 = boot();                                   // frameHello 만 — histWin 이 안 잡혀 hist 말은 버려진다
  R2.msg({ onf: 'frameHello' });
  R2.push('abc1', { a: 1 }); R2.hello();
  assert.strictEqual(R2.H.st.length, 1, '⛔ frameHello 가 histWin 까지 정했다');
  assert.deepStrictEqual(R2.texts(), ['kbH']);
});

t('⛔ frameHello 는 안쪽이 다시 만들어져도 새 창으로 갈아 끼운다(빗장 없음 — 종전) · 사슬 밖·구글 아닌 출처는 막는다', () => {
  const R = boot();
  R.msg({ onf: 'frameHello' });
  const inner2 = R.win('userHtml2', R.wrapper);
  R.msg({ onf: 'frameHello' }, { source: inner2 });
  assert.ok(inner2.sent.some((x) => x.m.onf === 'kbH'), '⛔ 새 안쪽의 노크를 버렸다 — 키보드 보정이 죽는다');
  const stranger = R.win('stranger', R.top);
  R.msg({ onf: 'frameHello' }, { source: stranger });
  R.msg({ onf: 'frameHello' }, { origin: 'https://evil.example' });
  assert.deepStrictEqual(stranger.sent, [], '⛔ 사슬 밖의 노크에 답했다');
});

t('탭 제목: 안쪽만 바꾼다 · 줄바꿈 제거 · 120자 · 남의 창은 못 바꾼다 (종전)', () => {
  const R = boot();
  R.msg({ onf: 'title', t: '  김선달님\n홈  ' });
  assert.strictEqual(R.c.document.title, '김선달님 홈');
  R.msg({ onf: 'title', t: 'x'.repeat(300) });
  assert.strictEqual(R.c.document.title.length, 120);
  R.msg({ onf: 'title', t: 'EVIL' }, { source: R.win('stranger', R.top) });
  R.msg({ onf: 'title', t: 'EVIL' }, { origin: 'https://evil.example' });
  assert.notStrictEqual(R.c.document.title, 'EVIL', '⛔ 남이 탭 제목을 바꿨다');
});

t('⛔ 소스: \'*\' 로 보내는 곳은 kbH 하나뿐이다 · 새 말(hist-on·hist-pop)은 전부 정한 출처(histOrigin)로', () => {
  const noC = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');
  const stars = noC.match(/postMessage\([^;]*'\*'\)/g) || [];
  assert.strictEqual(stars.length, 1, "⛔ '*' 발신이 " + stars.length + "곳이다(kbH 하나여야 한다): " + stars.join(' | '));
  assert.ok(/onf: 'kbH'/.test(stars[0]));
  assert.ok(/postMessage\(\{ onf: 'hist-on' \}, histOrigin\)/.test(noC), '⛔ hist-on 은 histOrigin 으로만');
  assert.ok(/postMessage\(\{ onf: 'hist-pop'[^\n]*\}, histOrigin\)/.test(noC), '⛔ hist-pop 은 histOrigin 으로만');
  //   새 갈래는 출처 자물쇠(_fromOurFrame · googleusercontent) **뒤에** 있다
  const iLock = noC.indexOf('_fromOurFrame(ev.source, frameEl)'), iHist = noC.indexOf("ev.data.onf === 'hist'");
  assert.ok(iLock > 0 && iHist > iLock, '⛔ hist 갈래가 출처 자물쇠보다 앞이다');
});

console.log('\n[선생님 껍데기는 학생 껍데기의 hi 를 무시한다 — 어댑터가 껍데기 안 어디서나 hi 를 쏘므로]');
t('⛔ 선생님 껍데기(teacher/index.html onf-hist 블록)에 op:hi 를 보내도 기록·깊이·답신이 안 변한다 · hello·push 는 여전히 통한다', () => {
  const tsrc = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
  const A = tsrc.indexOf('/* onf-hist:begin */'), B = tsrc.indexOf('/* onf-hist:end */');
  assert.ok(A > 0 && B > A);
  const H = { st: [{ state: null }], i: 0, goes: [], get state() { return this.st[this.i].state; },
    pushState(st) { this.st = this.st.slice(0, this.i + 1); this.st.push({ state: JSON.parse(JSON.stringify(st)) }); this.i++; },
    replaceState(st) { this.st[this.i].state = st; }, back() {}, go(n) { this.goes.push(n); } };
  const L = { message: [], popstate: [] }, sent = [];
  const appWin = { postMessage(m, o) { sent.push({ m, o }); } };
  const c = { window: { addEventListener(tp, f) { L[tp].push(f); } }, history: H, appWin, appOrigin: ORIGIN };
  vm.createContext(c); vm.runInContext(tsrc.slice(A, B), c);
  const msg = (d) => L.message.forEach((f) => f({ data: d, source: appWin, origin: ORIGIN }));
  msg({ onf: 'hist', op: 'hi' });
  msg({ onf: 'hist', op: 'hi', id: 'abc1', state: { a: 1 } });                 // id·state 를 달아도(push 로 오해받게) 칸이 안 생긴다
  assert.strictEqual(H.st.length, 1, '⛔ hi 가 선생님 껍데기에 칸을 만들었다');
  assert.deepStrictEqual(sent, [], '⛔ 선생님 껍데기가 hi 에 답했다(hist-on 은 학생 껍데기만 준다)');
  assert.strictEqual(vm.runInContext('histDepth', c), 0);
  msg({ onf: 'hist', op: 'push', id: 'abc1', state: { a: 1 } });
  assert.strictEqual(vm.runInContext('histDepth', c), 1, '전제: 선생님 껍데기의 push 는 여전히 받는다(검사가 눈멀지 않았다)');
  msg({ onf: 'hist', op: 'hi' });
  assert.strictEqual(vm.runInContext('histDepth', c), 1, '⛔ hi 가 깊이를 흔들었다'); assert.deepStrictEqual(H.goes, []);
  msg({ onf: 'hist', op: 'hello' });
  assert.deepStrictEqual(H.goes, [-1]);
});

t('⛔ hi·기록 말은 키보드 보정의 중복 거름(lastH·lastTop)을 건드리지 않는다 — frameHello 뒤 같은 값이면 kbH 가 두 번 안 간다 (검수 2026-10-01)', () => {
  const R = boot();
  R.msg({ onf: 'frameHello' });
  const kb = () => R.inner.sent.filter((x) => x.m.onf === 'kbH').length;
  assert.strictEqual(kb(), 1, '전제: frameHello 뒤 kbH 한 번');
  R.hi(); R.push('abc1', { a: 1 }); R.hello(); R.back('abc1');
  R.L.resize.forEach((f) => f());                        // 같은 높이 — 중복 거름이 살아 있으면 안 나간다
  assert.strictEqual(kb(), 1, '⛔ hi·기록 말이 lastH/lastTop 을 되돌려 kbH 가 또 나갔다');
});

t('⛔ history.state 가 던져도(막힌 문서) mount() 는 끝까지 간다 — frameEl.src 가 서고 frameHello→kbH 가 그대로 된다 (검수 2026-10-01)', () => {
  const R = boot({ stateThrows: true });
  assert.strictEqual(R.frameEl.src, 'about:blank', '⛔ 시작 줄이 던져 mount() 가 중간에 끊겼다 — 학생 화면이 빈다');
  R.msg({ onf: 'frameHello' });
  assert.deepStrictEqual(R.inner.sent.map((x) => x.m.onf), ['kbH'], '⛔ 기록 API 가 막힌 곳에서 키보드 보정이 죽었다');
});

console.log('\n' + pass + '개 통과, ' + fail + '개 실패');
process.exit(fail ? 1 : 0);
