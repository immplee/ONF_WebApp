// 🔬 실측(판정 없음 · 2026-11-11 갈래 5) — 진짜 선생님 껍데기: 새로 고침 뒤 **한 번도 안 만지고** 뒤로 → 지금 = 사이트 밖 · patch = 「바닥으로 되돌아와 머문다」(onf-hist.js 한 줄 바꿔 싣기)
//   그때 홈 액자·과제 판 액자가 몇 번 다시 읽히나(옛 칸에 닿는 값). ⛔ 뒤로 전 page.evaluate 금지 — 크롬 Playwright evaluate 는 손짓(사용자 활성)으로 친다.
//   잰 값(2026-11-11): 크롬 지금 = before.test(밖) · 홈 0 · 판 0 / 크롬 patch = 머묾 · 홈 1 · 판 1 · WebKit = 이 가짜로 로그인 못 함(학생 껍데기로는 patch 홈 0 — 크롬 1).
//   PW=<playwright index.js> node test/repro/hist-floor.mjs [chromium|webkit] [patch]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium', PATCH = process.argv[3] === 'patch';
const sh = fs.readFileSync(path.join(SHELL, 'teacher', 'index.html'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(sh)[1];
const GUC = 'https://n-flashrepro-0lu-script.googleusercontent.com';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOK = 'x.' + b64({ exp: Math.floor(Date.now() / 1000) + 3000, hd: 'ownify.co.kr', email: 'peter@ownify.co.kr' }) + '.y';
const HOME = `<!doctype html><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>
  var T = window.top, again = sessionStorage.getItem('boardWas') === '1';
  addEventListener('click', function () { T.postMessage({ onf: 'hwTap' }, '*'); });
  addEventListener('message', function (e) { var d = e.data; if (!d || d.onf !== 'auth' || window.__got) return; window.__got = 1; console.log('[home] auth');
    T.postMessage({ onf: 'hist', op: 'push', id: 'peek1', state: { onfPeek: 'p' } }, '*');
    setTimeout(function () { T.postMessage(again ? { onf: 'hwbook', t: 'TokFlash01', l: '', rs: 1 } : { onf: 'hwbook', t: 'TokFlash01', l: '' }, '*'); sessionStorage.setItem('boardWas', '1'); }, again ? 1200 : 400); });
  T.postMessage({ onf: 'auth-please' }, '*');<\/script>`;
const BOARD = '<!doctype html><body style="margin:0;background:#ff4136;height:100vh"><h1>BOARD</h1><script>console.log("[board] load");addEventListener("click",function(){top.postMessage({onf:"hwTap"},"*")})<\/script>';
const wrap = (inner) => '<!doctype html><body style="margin:0"><iframe src="' + inner + '" style="border:0;width:100%;height:100vh"></iframe>';
const b = await pw[ENG].launch();
const ctx = await b.newContext({ viewport: { width: 800, height: 600 } });
await ctx.addInitScript((tok) => { if (location.host === 'class.ownify.co.kr') { try { localStorage.setItem('onf_id_tok', tok); localStorage.setItem('onf_tout', '0'); } catch (e) {} } }, TOK);
await ctx.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === 'before.test') return route.fulfill({ status: 200, contentType: 'text/html', body: 'before' });
  if (u.host === 'accounts.google.com') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){},prompt(){},cancel(){},disableAutoSelect(){}}}};' });
  if (u.host === 'class.ownify.co.kr') { const f = path.join(SHELL, u.pathname.replace(/\/$/, '/index.html')); if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(f, 'utf8'); if (PATCH && /onf-hist\.js$/.test(f)) body = body.replace('try { nGo.call(H, -(D + 1)); } catch (e) {}', 'try { nGo.call(H, floor - D); } catch (e) {} out = false; return;'); return route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html; charset=utf-8', body }); }
  if (u.origin + u.pathname === EXEC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrap(GUC + (u.searchParams.get('mode') === 'hwbook' ? '/board' : '/home')) });
  if (u.origin === GUC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: u.pathname === '/board' ? BOARD : HOME });
  if (/hwbook/.test(u.href)) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: BOARD });
  return route.fulfill({ status: 204, body: '' });
});
const p = await ctx.newPage();
let H = 0, B = 0; p.on('console', (m) => { if (/^\[home\] auth/.test(m.text())) H++; if (/^\[board\] load/.test(m.text())) B++; });
const top = () => p.evaluate(() => { const e = document.elementFromPoint(400, 300); if (!e) return '?'; if (e.closest('.onf-hwcover')) return 'cover'; if (e.closest('.onf-hwbox')) return 'board'; if (e.id === 'app') return 'home'; return e.id || e.tagName; });
await p.goto('https://before.test/'); await p.goto('https://class.ownify.co.kr/teacher/');
for (let i = 0; i < 60 && (await top()) !== 'board'; i++) await p.waitForTimeout(100);
await p.mouse.click(400, 300); await p.waitForTimeout(400);
await p.reload(); await p.waitForTimeout(3500);   // ⛔ evaluate 금지 — 크롬 Playwright evaluate 는 사용자 활성(손짓)으로 친다
const L = () => p.evaluate(() => (window.onfHistL ? window.onfHistL.peek() : null));
console.log('새로 고침 뒤(평가 없이 3.5초) home', H, 'board', B);
const h0 = H, b0 = B;
await p.goBack().catch(() => {}); await p.waitForTimeout(1500);
console.log('손짓 없이 뒤로 →', p.url(), /ownify/.test(p.url()) ? await top() : '', /ownify/.test(p.url()) ? JSON.stringify(await L()) : '', '홈 다시 읽힘', H - h0, '판 다시 읽힘', B - b0);
await b.close();
