/* 🔙 기록 층(assets/onf-hist.js · 2026-11-11) — 가짜 History(프로토타입에 pushState·go·state)를 vm 에 올려 층을 진짜로 돈다. 실브라우저는 test/repro/hist-reload.mjs. */
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), SRC = fs.readFileSync(path.join(ROOT, 'assets', 'onf-hist.js'), 'utf8');
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + '\n     ' + String(e && e.message).split('\n')[0]); } };
/** 브라우저 흉내 — entries(진짜 기록) · i(지금 칸) · reload() = 새 창 객체에 층을 다시 싣는다(기록은 남는다). go 는 다음 틱(run)에 popstate. */
function world(o = {}) {
  const W = { entries: [null], i: 0, left: false, tasks: [] };
  class History { pushState(s) { W.entries.length = W.i + 1; W.entries.push(s === undefined ? null : JSON.parse(JSON.stringify(s))); W.i++; }
    replaceState(s) { W.entries[W.i] = s === undefined ? null : JSON.parse(JSON.stringify(s)); }
    go(k) { W.tasks.push(() => { const n = W.i + k; if (n < 0) { W.left = true; return; } W.i = n; W.fire(); }); }
    back() { this.go(-1); } get state() { return W.entries[W.i]; } }
  W.boot = (src = SRC) => {
    const ls = { popstate: [], message: [], pointerup: [], keyup: [] }; W.pops = [];
    const g = { history: new History(), navigator: { userActivation: { isActive: !!o.active } }, document: { currentScript: { getAttribute: (k) => (o.gq && k === 'data-gq' ? '' : null) } },
      addEventListener: (k, f) => { (ls[k] = ls[k] || []).push(f); }, setTimeout: (f, ms) => { if (!ms) W.tasks.push(f); return 1; }   /* 1.5초 안전판은 안 돈다(진짜 popstate 가 먼저) */, clearTimeout() {},
      PopStateEvent: function (k, i) { this.type = k; this.state = i.state; }, dispatchEvent: (e) => W.fire(e) };
    g.top = g.self = g.window = g; vm.createContext(g); vm.runInContext(src, g); W.g = g; W.ls = ls;
    g.addEventListener('popstate', () => W.pops.push(g.history.state));          // 껍데기 손(층 뒤에 붙는다)
    W.fire = (e) => { let stop = false; e = e || { type: 'popstate' }; e.stopImmediatePropagation = () => { stop = true; }; for (const f of ls.popstate) { if (stop) break; f(e); } };
  };
  W.run = () => { let n = 0; while (W.tasks.length && n++ < 50) W.tasks.shift()(); };
  W.tap = () => { W.ls.pointerup.forEach((f) => f({})); W.run(); };
  W.realBack = () => { W.i--; if (W.i < 0) { W.left = true; return; } W.fire(); W.run(); };
  W.go = null;
  W.boot(); return W;
}
const open3 = (W) => { const h = W.g.history; h.pushState({ onfHist: 'a', n: 1 }, ''); h.pushState({ onfBook: 1, n: 1, bd: 1 }, ''); h.pushState({ onfBook: 1, n: 1, bd: 2, lg: 1 }, ''); };

t('칸마다 깊이(onfD) · 다시 읽히면 그 깊이가 바닥 — 옛 표식은 안 보이고(state null) 새 칸은 그 위에만', () => {
  const W = world({ active: true }); open3(W);
  assert.deepStrictEqual(W.entries.map((e) => (e && e.onfD) || null), [null, 1, 2, 3]);
  W.boot();
  assert.strictEqual(W.g.history.state, null); assert.strictEqual(W.g.onfHistL.floor(), 3);
  W.g.history.pushState({ onfHist: 'x', n: 1 }, '');
  assert.strictEqual(W.entries.length, 5); assert.strictEqual(W.entries[4].onfD, 4); assert.strictEqual(W.g.history.state.onfHist, 'x');
});
t('뒤로 — 새 칸이 빠져 바닥에 서면 껍데기는 「바닥」(null)으로 본다 · 한 번 더 = 옛 칸에 닿는 순간 껍데기에 안 알리고 곧장 사이트 밖', () => {
  const W = world({ active: true }); open3(W); W.boot();
  W.g.history.pushState({ onfHist: 'x', n: 1 }, '');
  W.realBack(); assert.deepStrictEqual(W.pops, [null]); assert.ok(!W.left);
  W.realBack(); assert.deepStrictEqual(W.pops, [null], '⛔ 옛 칸의 popstate 가 껍데기에 샜다(닫은 판이 되살아난다)'); assert.ok(W.left, '⛔ 옛 칸에서 헛돈다');
});
t('back·go 는 바닥 아래로 안 내려간다(껍데기가 세어 부른 go 가 옛 칸을 밟지 않는다) · 주소만 바꾸는 replaceState 는 바닥 칸 표식을 그대로 둔다', () => {
  const W = world({ active: true }); open3(W); W.boot();
  const h = W.g.history; h.pushState({ onfHist: 'x', n: 1 }, ''); h.go(-3); W.run();
  assert.strictEqual(W.i, 3); assert.ok(!W.left); assert.deepStrictEqual(W.pops, [null]);
  h.back(); W.run(); assert.strictEqual(W.i, 3);
  h.replaceState(null, '', '/x'); assert.strictEqual(W.entries[3].onfD, 3);
});
t('③ 앞 칸(2026-11-11) — 뒤로 몇 칸 간 채 새로 고치면 그 위 칸은 옛 문서 것 · 앞으로가 닿으면 껍데기에 안 알리고 있던 칸으로 되돌아간다(되돌아온 popstate 도 삼킴) · 이 문서가 민 칸은 앞으로 그대로', () => {
  const W = world({ active: true }); open3(W);
  W.realBack(); W.realBack(); assert.strictEqual(W.i, 1);
  W.boot(); assert.strictEqual(W.g.onfHistL.floor(), 1);
  W.i = 3; W.fire(); W.run();                                   // 앞으로 두 칸(옛 판 칸 · 물음 칸)
  assert.strictEqual(W.i, 1, '⛔ 옛 문서의 앞 칸에 섰다(판 번호가 이 문서와 달라 엉뚱한 교재가 열린다)');
  assert.deepStrictEqual(W.pops, [], '⛔ 옛 앞 칸·되돌아온 칸을 껍데기에 알렸다');
  W.g.history.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); W.realBack(); W.pops.length = 0;
  W.i++; W.fire(); W.run();
  assert.ok(W.i === 2 && W.pops.length === 1 && W.pops[0].onfBook === 1, '⛔ 이 문서가 민 칸의 앞으로를 막았다');
  const M = world({ active: true }); open3(M); M.realBack(); M.realBack(); M.boot(SRC.replace('else if (D > floor) {', 'else if (false) {'));
  M.i = 3; M.fire(); M.run(); assert.ok(M.i !== 1 || M.left, '변이가 안 먹었다');
});
t('④ 탭 첫 페이지가 껍데기(검토 2026-11-11) — 새로 고침 뒤 뒤로가 옛 칸에 닿아 밖으로 못 나가면 다음 뒤로에 탭 첫 칸까지(타이머로 또 움직이지 않는다 — 앞 페이지가 늦으면 지나친다) · 그 자리가 바닥(껍데기엔 안 알림 · 헛도는 뒤로 0) · 못 나간 것은 1.5초 뒤에 안다(navigation index 는 같은 출처 칸만 세 못 쓴다)', () => {
  {
    const W = world({ active: true }); W.entries = [null]; W.i = 0; W.boot(); open3(W); W.boot();
    const timers = []; W.g.setTimeout = (f, ms) => { if (!ms) W.tasks.push(f); else timers.push(f); return 1; };
    W.realBack();                                               // 옛 칸 2 — go(-3) 은 탭 밖이라 안 먹는다(가짜 기록: left)
    assert.ok(W.left, '전제: 밖으로 가려 했다'); W.left = false; timers.forEach((f) => f()); W.run();
    assert.ok(W.i === 2, '⛔ 1.5초 뒤 저절로 또 움직였다(앞 페이지가 늦게 뜨는 중이면 탭 첫 칸까지 지나친다 · 검토 2026-11-12 실측)');
    W.realBack();                                               // 다음 뒤로 — 지난번에 못 나갔다 = 밖이 없다 → 첫 칸까지
    assert.ok(!W.left && W.i === 0 && W.g.onfHistL.floor() === 0, '⛔ 둘째 뒤로에 탭 첫 칸까지 안 내려갔다: i' + W.i + ' f' + W.g.onfHistL.floor());
    assert.deepStrictEqual(W.pops, [], '⛔ 껍데기에 옛 칸을 알렸다');
    W.g.history.pushState({ onfHist: 'n', n: 1 }, ''); W.realBack(); assert.ok(W.pops.length === 1 && W.pops[0] === null, '⛔ 새 칸 뒤로 = 바닥(null)');
  }
});
t('④ 못 나가 옛 칸에 선 채(D < 바닥) 판을 열면 — 새 칸이 보이고(state = 판) · 뒤로 = 판 칸 빠짐(껍데기에 알림 · null) · 홈 「나갈까요?」 확인(액자 go(-2))도 같다 (검토 2026-11-12)', () => {
  const run = (src, viaAsk) => {
    const W = world({ active: true }); W.entries = [null]; W.i = 0; W.boot(src); open3(W); W.boot(src);
    const timers = []; W.g.setTimeout = (f, ms) => { if (!ms) W.tasks.push(f); else timers.push(f); return 1; };
    if (viaAsk) { W.g.history.pushState({ onfHist: 'g', n: 1 }, ''); W.i -= 2; W.fire(); W.run(); }   // 지킴 칸에서 안쪽 액자가 층을 안 거치고 go(-2) → 옛 칸 2
    else W.realBack();                                          // 옛 칸 2
    W.left = false; timers.forEach((f) => f()); W.run(); W.pops.length = 0;
    W.g.history.pushState({ onfBook: 5, n: 0, bd: 1 }, '');
    const s = W.g.history.state; W.realBack();
    return { s, pops: W.pops.slice(), i: W.i, left: W.left };
  };
  for (const viaAsk of [false, true]) {
    const r = run(SRC, viaAsk);
    assert.ok(r.s && r.s.onfBook === 5, '⛔ 판 칸이 바닥 깊이에 앉아 껍데기엔 null' + (viaAsk ? ' (나갈까요)' : ''));
    assert.ok(r.pops.length === 1 && r.pops[0] === null && r.i === 2 && !r.left, '⛔ 뒤로가 판을 닫지 않았다: ' + JSON.stringify(r));
  }
  const M = run(SRC.replace('if (D < floor) toFirst(0); ', ''), false); assert.ok(!(M.s && M.s.onfBook === 5), '변이가 안 먹었다');
});
t('학생(data-gq) — 손짓 밖 칸은 줄(state·back 은 줄 먼저) · 손 뗌 알림(hwTap)에 쌓는다 · 줄 안에서 홈 칸은 판 칸 아래로(n +1)', () => {
  const W = world({ gq: true, active: false }), h = W.g.history;
  h.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); h.pushState({ onfBook: 1, n: 0, bd: 2, lg: 1 }, ''); h.pushState({ onfHist: 'h', n: 1 }, '');
  assert.strictEqual(W.entries.length, 1); assert.strictEqual(h.state.lg, 1);
  h.back(); W.run(); assert.strictEqual(W.pops.length, 1); assert.ok(!h.state.lg);
  W.ls.message.forEach((f) => f({ data: { onf: 'hwTap' }, source: {} })); W.run();
  assert.deepStrictEqual(W.entries.slice(1).map((e) => [e.onfHist || 'book', e.n, e.onfD]), [['h', 1, 1], ['book', 1, 2]]);
  h.pushState({ onfHist: 'w', n: 2 }, ''); assert.strictEqual(W.entries.length, 4, '⛔ 손 뗌 알림 직후(3초 안) 민 칸을 줄에 세웠다 — 알림이 칸 말보다 먼저 온다');
});
t('🔄 붙잡기(hold · 검토 2026-11-12) — 되살린 판 칸을 붙잡은 동안 손짓이 와도 안 쌓고(자리 칸 하나만) 그 뒤 온 홈 칸은 판 칸 아래로 · 놓으면 자리 칸을 첫 칸으로 갈아 차례대로 · 손짓 뒤 3초 시한 · 학생·선생님 둘 다', () => {
  const kinds = (W) => W.entries.slice(1).map((e) => e.onfSp ? 'sp' : e.onfHist ? 'h:' + e.n : 'b' + e.bd + ':' + e.n);
  const go = (o, src) => {
    const W = world(o), h = W.g.history, timers = []; W.g.setTimeout = (f, ms) => { if (!ms) W.tasks.push(f); else timers.push({ f, ms }); return timers.length; };
    W.g.onfHistL.hold(true);
    h.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); h.pushState({ onfBook: 1, n: 0, bd: 2, lg: 1 }, '');   // rsBoot(mount · 손짓 밖)
    W.tap();                                                     // 홈이 되살리기 전 손짓
    const mid = kinds(W);
    h.pushState({ onfHist: 'w1', n: 1 }, '');                     // 홈이 되살린 창 칸
    return { W, h, timers, mid };
  };
  for (const o of [{ gq: true, active: false }, { gq: false, active: false }]) {
    const { W, h, timers, mid } = go(o);
    assert.deepStrictEqual(mid, ['sp'], '⛔ 붙잡는 동안 손짓에 판 칸을 쌓았다(그 뒤 홈 칸이 위로 간다) 또는 자리 칸이 없다: ' + JSON.stringify(mid) + (o.gq ? ' 학생' : ' 선생님'));
    assert.strictEqual(h.state.lg, 1, '⛔ 붙잡는 동안 껍데기가 판 칸을 못 본다');
    assert.ok(timers.some((x) => x.ms === 3000), '⛔ 손짓 뒤 3초 시한이 없다(손짓 창 밖에 쌓으면 뒤로가 건너뛴다)');
    W.g.onfHistL.hold(false);
    assert.deepStrictEqual(kinds(W), ['h:1', 'b1:1', 'b2:1'], '⛔ 홈 칸이 판 칸 아래가 아니다: ' + JSON.stringify(kinds(W)));
    assert.strictEqual(W.entries[1].onfD, 1); assert.strictEqual(W.entries[3].onfD, 3);
  }
  { const { W, timers } = go({ gq: true, active: false }); timers.find((x) => x.ms === 3000).f(); assert.deepStrictEqual(kinds(W), ['h:1', 'b1:1', 'b2:1'], '⛔ 3초 시한에 안 쌓았다'); }
  { // 붙잡는 동안 진짜 뒤로(자리 칸이 빠짐) = 줄 맨 위 칸만 빠짐 — 고치기 전처럼 판이 닫힌다(밖으로 안 나간다)
    const W = world({ gq: true, active: false }), h = W.g.history; W.g.onfHistL.hold(true);
    h.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); h.pushState({ onfBook: 1, n: 0, bd: 2, lg: 1 }, ''); W.tap();
    W.realBack();
    assert.ok(!W.left && W.i === 1 && W.entries[1].bd === 1 && !W.g.onfHistL.peek().hold, '⛔ 자리 칸 뒤로 — 밖으로 갔거나 남은 줄(판 칸)을 안 쌓았다(다음 뒤로가 옛 칸 → 밖): i' + W.i);
    assert.ok(W.pops.length === 1 && W.pops[0] && W.pops[0].bd === 1 && !W.pops[0].lg, '⛔ 물음 칸 하나만 빠진 것으로 안 알렸다: ' + JSON.stringify(W.pops));
    h.go(-1); W.run();                                           // 껍데기가 판을 닫는다(✕ · bookClose) — 진짜 칸 하나
    assert.ok(W.i === 0 && W.pops.length === 2 && W.pops[1] === null && !W.left, '⛔ 판 칸 걷기');
    const N = world({ gq: true, active: false }); N.boot(SRC.replace('if (hold) { arm(); return; }', '')); N.g.onfHistL.hold(true);
    N.g.history.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); N.tap(); N.g.history.pushState({ onfHist: 'w1', n: 1 }, ''); N.g.onfHistL.hold(false);
    assert.ok(N.entries[N.entries.length - 1].onfHist === 'w1', '변이가 안 먹었다(붙잡기 없음 = 홈 칸이 판 칸 위)');
    const S = world({ gq: true, active: false }); S.boot(SRC.replace("if (own(st) && D === was - 1 && Q.length) {", 'if (false) {')); S.g.onfHistL.hold(true);
    S.g.history.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); S.g.history.pushState({ onfBook: 1, n: 0, bd: 2, lg: 1 }, ''); S.tap(); S.realBack();
    assert.ok(!(S.pops.length === 1 && S.pops[0] && S.pops[0].bd === 1), '변이가 안 먹었다(자리 칸 뒤로 흉내 없음)');
  }
  { // 붙잡는 동안 껍데기가 줄을 다 걷으면 자리 칸도 같이(진짜 go 하나 · 흉내 없음)
    const W = world({ gq: true, active: false }), h = W.g.history; W.g.onfHistL.hold(true);
    h.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); h.pushState({ onfBook: 1, n: 0, bd: 2, lg: 1 }, ''); W.tap();
    h.go(-2); W.run();
    assert.ok(W.i === 0 && W.pops.length === 1 && W.pops[0] === null && !W.g.onfHistL.peek().sp, '⛔ 자리 칸이 남았다: i' + W.i + ' ' + JSON.stringify(W.pops));
  }
});
t('선생님(gq 없음)은 줄을 안 선다(제 histQ 가 맡는다) · 배포 전 칸(onfD 없음) = 바닥 0 — 종전 그대로 · 변이(바닥 무시)는 위 검사가 잡는다', () => {
  let W = world({ active: false }); W.g.history.pushState({ onfHist: 'x', n: 1 }, ''); assert.strictEqual(W.entries.length, 2);
  W = world({ active: true }); W.entries = [null, { onfHist: 'old', n: 1 }]; W.i = 1; W.boot();
  assert.strictEqual(W.g.onfHistL.floor(), 0); assert.strictEqual(W.g.history.state.onfHist, 'old');
  const M = world({ active: true }); open3(M); M.boot(SRC.replace('floor = D,', 'floor = 0,'));
  assert.ok(M.g.history.state && M.g.history.state.lg === 1, '변이가 안 먹었다');
});
t('배선 — 두 껍데기가 onf-frame.js 보다 먼저 싣는다(학생은 data-gq) · 선생님 줄도 홈 칸을 판 칸 아래로 · 과제 판·옆 교재의 당겨서 새로고침을 받는다', () => {
  const S = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), T = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  assert.ok(/<script src="\/assets\/onf-hist\.js" data-gq><\/script>\n<script src="\/assets\/onf-frame\.js">/.test(S));
  assert.ok(/<script src="\.\.\/assets\/onf-hist\.js"><\/script>\n<script src="\.\.\/assets\/onf-frame\.js">/.test(T));
  assert.ok(/\{ histEnq\(st\); return true; \}/.test(T), '⛔ 선생님 줄이 차례(홈 칸은 판 칸 아래)를 안 본다');
  assert.ok(/d\.onf !== 'hwTap' && d\.onf !== 'reload' &&/.test(T) && /if \(d\.onf === 'reload'\) \{ reopenLog\('pullhw'\); location\.reload\(\); return; \}/.test(T) && /reopenLog\('pullhwbk'\); location\.reload\(\)/.test(T));
});
t('🪟 수업 자료 판 안 창 뒤로(2026-11-11) — 판이 hwWin 으로 알린 동안의 뒤로는 판에 hwWinBack 만 · 빠진 칸(보기·물음)은 다시 민다 · 판을 걷으면 잊는다 · 판 액자 말만 받는다', () => {
  const T = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  const i = T.indexOf('if (hwWinOn && hwWin && !code) {'), blk = T.slice(i, i + 700);
  assert.ok(i > 0 && /hwWinOn = false;\s*try \{ hwWin\.postMessage\(\{ onf: 'hwWinBack' \}, hwOrigin\)/.test(blk), '⛔ 한 번 쓰고 끄기 · 판 출처로만 보내기');
  assert.ok(/\(!s\.hv && hwView !== 'photo'\) \? \{ onfHw: 1, n: s\.n \|\| 0, lg: 1, hv: 1 \} : !s\.lg \? \{ onfHw: 1, n: s\.n \|\| 0, lg: 1 \} : null/.test(blk) && /return;\s*\}/.test(blk), '⛔ 빠진 칸 다시 밀기(보기 칸 먼저 · 아니면 물음 칸) 뒤 그 뒤로를 끝낸다');
  assert.ok(T.indexOf("if (!hwBox || hwWarmOn || !s || !s.onfHw) return;") < i && i < T.indexOf("if (!s.hv && hwView !== 'photo') { hwViewSet('photo', null, true)"), '⛔ 자리 — 판 칸이 맨 위일 때만 · 보기·되묻기 처리보다 먼저');
  assert.ok(/d\.onf !== 'reload' && d\.onf !== 'hwWin' &&/.test(T) && /if \(d\.onf === 'hwWin'\) \{ hwWinOn = d\.on === 1; return; \}/.test(T) && /hwHvWait = false; hwWinOn = false;/.test(T));
});
console.log('\n' + pass + '개 통과, ' + fail + '개 실패'); if (fail) process.exit(1);
