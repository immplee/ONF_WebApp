// 🔙 기록 층 실브라우저 — 탭 첫 페이지가 껍데기 · 칸 셋 → 새로 고침(바닥 3) → 못 나가 옛 칸(D2)에 선 채 판을 연다 (검토 2026-11-12)
//   ⓐ 뒤로(나가기 실패 → stuck) ⓑ 홈 「홈페이지를 나갈까요?」 확인 = 안쪽 액자 history.go(-2)(층을 안 거친다) — 둘 다 그 뒤 연 판이 보이고(state) 뒤로 = 판만 닫혀야 한다.
//   잰 값(2026-11-12 · 크롬·WebKit · 두 껍데기 꼴): 고치기 전 = 판 연 뒤 state null · 뒤로 = 껍데기 popstate 0 · 첫 칸(D0)으로 / 고친 뒤 = state 판 · 뒤로 = popstate [null] · D2
//   PW=<playwright index.js> node test/repro/hist-stuck.mjs [chromium|webkit] [before]   (before = 고치기 전 줄을 빼고 잰다)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), ENG = process.argv[2] || 'chromium', BEFORE = process.argv[3] === 'before';
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
let LAYER = fs.readFileSync(path.join(ROOT, 'assets', 'onf-hist.js'), 'utf8');
if (BEFORE) { const L2 = LAYER.replace('if (D < floor) toFirst(0); ', ''); if (L2 === LAYER) throw new Error('before 변이 자리 없음'); LAYER = L2; }
const html = (gq) => '<!doctype html><meta charset=utf-8><body style="height:100vh"><script' + (gq ? ' data-gq' : '') + '>' + LAYER + '</script><script>window.pops=[];addEventListener("popstate",function(){pops.push(JSON.stringify(history.state))});</script>ok<iframe src="/home" style="width:10px;height:10px"></iframe>';
const b = await pw[ENG].launch(); let bad = 0;
const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
for (const gq of [false, true]) for (const ask of [false, true]) {
  console.log('── ' + ENG + (gq ? ' · 학생 꼴(data-gq)' : ' · 선생님 꼴') + (ask ? ' · ⓑ 「나갈까요?」 확인(액자 go(-2))' : ' · ⓐ 뒤로'));
  const c2 = await b.newContext(); const q0 = await c2.newPage();
  await c2.route('**/*', (rr) => { const pn = new URL(rr.request().url()).pathname; rr.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: pn === '/opener' ? 'opener' : pn === '/home' ? 'home' : html(gq) }); });
  await q0.goto('https://shell.test/opener');
  const [q] = await Promise.all([c2.waitForEvent('page'), q0.evaluate(() => { window.open('https://shell.test/app', '_blank', 'noopener'); })]);   // 새 탭 첫 칸 = 껍데기(카톡 링크)
  await q.waitForLoadState(); await q.mouse.click(50, 50); await q.waitForTimeout(200);
  await q.evaluate(() => { history.pushState({ onfHist: 'a', n: 1 }, ''); history.pushState({ onfHist: 'b', n: 2 }, ''); history.pushState({ onfHist: 'c', n: 3 }, ''); });
  await q.reload(); await q.waitForTimeout(300);
  const st = () => q.evaluate(() => ({ L: onfHistL.peek(), pops: pops.splice(0), s: history.state }));
  if (ask) {
    await q.mouse.click(50, 50); await q.waitForTimeout(150);
    await q.evaluate(() => history.pushState({ onfHist: 'g', n: 1 }, ''));                       // 홈 지킴 칸(onfHomeLeave · 손짓 안)
    await q.mouse.click(50, 50); await q.waitForTimeout(150);
    await q.evaluate(() => document.querySelector('iframe').contentWindow.history.go(-2)); await q.waitForTimeout(2200);   // 확인 = 액자가 두 칸 뒤로(ONF_Shell_Js onfTabHist)
  } else { await q.goBack().catch(() => {}); await q.waitForTimeout(2200); }
  let r = await st();
  say('전제: 못 나가 옛 칸(D < 바닥)', r.L, r.L.D < r.L.floor || (r.L.D === r.L.floor && r.L.floor < 3));
  await q.mouse.click(50, 50); await q.waitForTimeout(150);
  await q.evaluate(() => history.pushState({ onfBook: 5, n: 0, bd: 1 }, ''));
  await q.mouse.click(50, 50); await q.waitForTimeout(150); r = await st();
  say('판 연 뒤 — 껍데기가 판을 안다(state = 판)', { s: r.s, L: r.L }, !!(r.s && r.s.onfBook === 5));
  await q.goBack().catch(() => {}); await q.waitForTimeout(800); r = await st();
  say('뒤로 — 판 칸만 빠짐(껍데기 popstate [null] · 첫 칸까지 안 감)', { pops: r.pops, L: r.L, at: q.url() }, /shell\.test\/app/.test(q.url()) && r.pops.length === 1 && r.pops[0] === 'null' && r.L.D > 0);
  await c2.close();
}
await b.close(); console.log(bad ? '❌ ' + bad + '건' : '✅ 전부'); process.exit(bad ? 1 : 0);
