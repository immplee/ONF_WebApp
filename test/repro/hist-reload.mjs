// 🔙 기록 층(assets/onf-hist.js) 실브라우저 재현 — 진짜 history 로 「새로 고침 뒤 옛 칸 정리 · 줄 · 손짓 전 뒤로 · 홈 칸은 판 칸 아래」를 잰다(2026-11-11).
//   PW=<playwright index.js> node test/repro/hist-reload.mjs [chromium|webkit]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), ENG = process.argv[2] || 'chromium';
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const LAYER = fs.readFileSync(path.join(ROOT, 'assets', 'onf-hist.js'), 'utf8');
const html = (gq) => '<!doctype html><meta charset=utf-8><body style="height:100vh"><script' + (gq ? ' data-gq' : '') + '>' + LAYER + '</script><script>window.pops=[];addEventListener("popstate",function(){pops.push(JSON.stringify(history.state))});</script>ok';
const b = await pw[ENG].launch(); let bad = 0;
const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
for (const gq of [false, true]) {
  console.log('── ' + ENG + (gq ? ' · 학생 껍데기(data-gq)' : ' · 선생님 껍데기'));
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await ctx.route('**/*', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: new URL(r.request().url()).pathname === '/before' ? 'before' : html(gq) }));
  await p.goto('https://shell.test/before'); await p.goto('https://shell.test/app');
  const ev = (f, a) => p.evaluate(f, a), tap = async () => { await p.mouse.click(50, 50); await p.waitForTimeout(250); };
  const st = () => ev(() => ({ s: history.state, L: onfHistL.peek(), len: history.length, pops: pops.splice(0), at: location.pathname }));
  await tap();
  await ev(() => { history.pushState({ onfHist: 'a', n: 1 }, ''); history.pushState({ onfBook: 1, n: 1, bd: 1 }, ''); history.pushState({ onfBook: 1, n: 1, bd: 2, lg: 1 }, ''); });
  let r = await st(); const len0 = r.len;
  say('전제: 칸 셋(깊이 3)', r.L, r.L.D === 3 && r.s && r.s.lg === 1);
  await p.reload(); r = await st();
  say('새로 고침 직후 — 바닥 3 · 옛 표식 안 보임', { L: r.L, s: r.s }, r.L.floor === 3 && r.s === null);
  await tap();
  await ev(() => { history.pushState({ onfHist: 'h', n: 1 }, ''); history.pushState({ onfBook: 1, n: 1, bd: 1 }, ''); });   // 되살린 창·판(손짓 뒤)
  await tap(); r = await st();
  say('되살린 칸은 바닥 위에(깊이 5)', { L: r.L, s: r.s }, r.L.D === 5 && r.s && r.s.onfBook === 1);
  await p.goBack(); await p.waitForTimeout(250); r = await st();
  say('뒤로 1 — 판 칸 빠짐 → 홈 창 칸', { s: r.s, pops: r.pops.length, at: r.at }, r.at === '/app' && r.pops.length === 1 && r.s && r.s.onfHist === 'h');
  await p.goBack(); await p.waitForTimeout(250); r = await st();
  say('뒤로 2 — 홈 창 칸 빠짐 → 바닥(껍데기엔 null · 페이지 그대로)', { s: r.s, pops: r.pops, at: r.at, L: r.L }, r.at === '/app' && r.pops.length === 1 && r.pops[0] === 'null' && r.s === null && r.L.D === 3);
  await p.goBack(); await p.waitForTimeout(600);
  say('뒤로 3 — 옛 칸 셋을 한 번에 지나 사이트 밖(헛도는 뒤로 0)', p.url(), /\/before$/.test(p.url()));
  await p.goto('https://shell.test/app'); await tap();
  await ev(() => { history.pushState({ onfHist: 'a', n: 1 }, ''); history.pushState({ onfHist: 'b', n: 2 }, ''); });
  await p.reload(); await tap();
  await ev(() => { history.pushState({ onfHist: 'x', n: 1 }, ''); history.go(-3); }); await p.waitForTimeout(300); r = await st();
  say('껍데기가 세어 부른 go(-3) — 바닥에서 멈춤(옛 칸 안 밟음)', { L: r.L, at: r.at }, r.at === '/app' && r.L.D === 2 && r.L.floor === 2);
  if (gq) {
    await p.goto('https://shell.test/app'); await p.waitForTimeout(100); const d0 = (await st()).L.D;
    await ev(() => history.pushState({ onfHist: 'q', n: 1 }, '')); r = await st();
    say('학생: 손짓 밖 칸은 줄에(브라우저가 평가 스크립트를 손짓으로 치면 바로)', r.L, r.L.q === 1 || r.L.D === d0 + 1);
    await tap(); r = await st();
    say('학생: 손짓에 쌓임', r.L, r.L.q === 0 && r.L.D === d0 + 1);
  }
  // ③ 앞 칸(2026-11-11) — 뒤로 둘 간 채 새로 고침 → 앞으로 = 옛 문서 칸 · 껍데기에 안 알리고 제자리
  await p.goto('https://shell.test/app'); await tap();
  await ev(() => { history.pushState({ onfHist: 'a', n: 1 }, ''); history.pushState({ onfHist: 'b', n: 2 }, ''); });
  await p.goBack(); await p.waitForTimeout(200); await p.goBack(); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(200); const at0 = await st();
  await p.goForward(); await p.waitForTimeout(700); r = await st();
  say('③ 새로 고침 전 앞 칸으로 앞으로 — 껍데기 popstate 0 · 제자리(깊이 그대로)', { pops: r.pops, L: r.L, s: r.s }, r.pops.length === 0 && r.L.D === at0.L.D && r.at === '/app');
  await ctx.close();
  // ④ 탭 첫 페이지가 껍데기(카톡 새 탭) — 새로 고침 뒤 뒤로 = 헛돌지 않고 탭 첫 칸에서 멈춤
  const c2 = await b.newContext(); const q0 = await c2.newPage();
  await c2.route('**/*', (rr) => rr.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: new URL(rr.request().url()).pathname === '/opener' ? 'opener' : html(gq) }));
  await q0.goto('https://shell.test/opener');
  const [q] = await Promise.all([c2.waitForEvent('page'), q0.evaluate(() => { window.open('https://shell.test/app', '_blank', 'noopener'); })]);   // 새 탭의 첫 칸 = 껍데기(카톡 링크로 연 새 탭과 같다)
  await q.waitForLoadState(); await q.mouse.click(50, 50); await q.waitForTimeout(200);
  await q.evaluate(() => { history.pushState({ onfHist: 'a', n: 1 }, ''); history.pushState({ onfHist: 'b', n: 2 }, ''); history.pushState({ onfHist: 'c', n: 3 }, ''); });
  await q.reload(); await q.waitForTimeout(200);
  const len4 = await q.evaluate(() => history.length);
  await q.goBack().catch(() => {}); await q.waitForTimeout(2200); await q.goBack().catch(() => {}); await q.waitForTimeout(600);   // 첫 뒤로 = 나가기 시도(밖 없음) · 둘째 = 첫 칸까지
  if (!/shell\.test\/app/.test(q.url())) { say('④ 전제: 이 탭의 첫 칸이 껍데기(길이 ' + len4 + ')', q.url(), false); await c2.close(); continue; }
  const r4 = await q.evaluate(() => ({ L: onfHistL.peek(), pops: pops.splice(0), s: history.state, len: history.length }));
  say('④ 첫 페이지 껍데기 · 뒤로 두 번 = 탭 첫 칸 · 바닥 0 · 껍데기 popstate 0 (1.5초 뒤)', r4, r4.L.D === 0 && r4.L.floor === 0 && r4.pops.length === 0 && r4.s === null);
  await c2.close();
}
await b.close(); console.log(bad ? '❌ ' + bad + '건' : '✅ 전부'); process.exit(bad ? 1 : 0);
