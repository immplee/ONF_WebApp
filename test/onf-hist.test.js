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
  assert.deepStrictEqual(W.entries.map((e) => e && e.onfD), [null, 1, 2, 3]);
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
t('학생(data-gq) — 손짓 밖 칸은 줄(state·back 은 줄 먼저) · 손 뗌 알림(hwTap)에 쌓는다 · 줄 안에서 홈 칸은 판 칸 아래로(n +1)', () => {
  const W = world({ gq: true, active: false }), h = W.g.history;
  h.pushState({ onfBook: 1, n: 0, bd: 1 }, ''); h.pushState({ onfBook: 1, n: 0, bd: 2, lg: 1 }, ''); h.pushState({ onfHist: 'h', n: 1 }, '');
  assert.strictEqual(W.entries.length, 1); assert.strictEqual(h.state.lg, 1);
  h.back(); W.run(); assert.strictEqual(W.pops.length, 1); assert.ok(!h.state.lg);
  W.ls.message.forEach((f) => f({ data: { onf: 'hwTap' }, source: {} })); W.run();
  assert.deepStrictEqual(W.entries.slice(1).map((e) => [e.onfHist || 'book', e.n, e.onfD]), [['h', 1, 1], ['book', 1, 2]]);
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
console.log('\n' + pass + '개 통과, ' + fail + '개 실패'); if (fail) process.exit(1);
