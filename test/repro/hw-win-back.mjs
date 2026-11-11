// 🪟 수업 자료(과제 판) 안 창을 연 채 뒤로 = 그 창만(Peter 2026-11-11) — 진짜 teacher/index.html · 가짜 판이 hwWin 을 알리고 hwWinBack·hwLeaveAsk 를 센다.
//   60ms 마다 화면 가운데 맨 위 층(elementFromPoint): home(홈 액자) · cover(새로 고침 덮개) · board(판). 새로 고침 뒤 home 이 한 번이라도 맨 위면 반짝.
//   SHELL_DIR=<껍데기> PW=<playwright index.js> node test/repro/hw-reload-flash.mjs [chromium|webkit]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium';
const sh = fs.readFileSync(path.join(SHELL, 'teacher', 'index.html'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(sh)[1];
const GUC = 'https://n-flashrepro-0lu-script.googleusercontent.com';
const GUCV = GUC;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOK = 'x.' + b64({ exp: Math.floor(Date.now() / 1000) + 3000, hd: 'ownify.co.kr', email: 'peter@ownify.co.kr' }) + '.y';
const HOME = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>
  var T = window.top, again = sessionStorage.getItem('boardWas') === '1';
  window.__pops = []; addEventListener('click', function () { T.postMessage({ onf: 'hwTap' }, '*'); });
  addEventListener('message', function (e) { var d = e.data; if (d && d.onf === 'hist-pop') { window.__pops.push(d.id || '(바닥)'); return; } if (!d || d.onf !== 'auth' || window.__got) return; window.__got = 1;
    console.log('[home] auth → push peek · again=' + again);
    T.postMessage({ onf: 'hist', op: 'push', id: 'peek' + (again ? 2 : 1), state: { onfPeek: 'p' } }, '*');   // 학생 창 칸(되살릴 때도 다시 민다)
    setTimeout(function () { T.postMessage(again ? { onf: 'hwbook', t: 'TokFlash01', l: '', rs: 1 } : { onf: 'hwbook', t: 'TokFlash01', l: '' }, '*'); sessionStorage.setItem('boardWas', '1'); }, again ? 1200 : 400); });
  T.postMessage({ onf: 'auth-please' }, '*');<\/script>`;
const BOARD = '<!doctype html><body style="margin:0;background:#ff4136;height:100vh"><h1>BOARD</h1><script>var T=top,W={wb:0,ask:0,open:0};T.postMessage({onf:"auth-please"},"*");'
  + 'addEventListener("click",function(){T.postMessage({onf:"hwTap"},"*");if(window.OPENW){W.open=1;T.postMessage({onf:"hwWin",on:1},"*")}});'
  + 'addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="hwWinBack"){W.wb++;W.open=0}if(d.onf==="hwLeaveAsk")W.ask++});<\/script>';
const wrap = (inner) => '<!doctype html><body style="margin:0"><iframe src="' + inner + '" style="border:0;width:100%;height:100vh"></iframe>';
const b = await pw[ENG].launch(); let bad = 0;
try {
  const ctx = await b.newContext({ viewport: { width: 800, height: 600 } });
  await ctx.addInitScript((tok) => { if (location.host === 'class.ownify.co.kr') { try { localStorage.setItem('onf_id_tok', tok); localStorage.setItem('onf_tout', '0'); } catch (e) {} } }, TOK);
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.host === 'accounts.google.com') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){},prompt(){},cancel(){},disableAutoSelect(){}}}};' });
    if (u.host === 'class.ownify.co.kr') { const f = path.join(SHELL, u.pathname.replace(/\/$/, '/index.html')); return fs.existsSync(f) ? route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html; charset=utf-8', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: '' }); }
    if (u.origin + u.pathname === EXEC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrap(GUC + (u.searchParams.get('mode') === 'hwbook' ? '/board' : '/home')) });
    if (u.origin === GUC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: u.pathname === '/board' ? BOARD : HOME });
    if (/hwbook/.test(u.href)) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: BOARD });
    return route.fulfill({ status: 204, body: '' });
  });
  const p = await ctx.newPage();
  let loads = 0; p.on('console', (m) => { if (/^\[home\] auth/.test(m.text())) loads++; });
  if (process.env.DBG) p.on('console', (m) => { if (/^\[home\]/.test(m.text())) console.log('    ', Date.now() % 100000, m.text()); });
  // 색은 화면 맨 위 요소로 판단(스크린샷 해독 없이): 가운데 점의 맨 위 요소가 어느 층인가
  const top = () => p.evaluate(() => { const e = document.elementFromPoint(400, 300); if (!e) return '?'; if (e.closest('.onf-hwcover')) return 'cover'; if (e.closest('.onf-hwbox')) return 'board'; if (e.id === 'app') return 'home'; if (e.closest('#wait') || e.closest('.onf-wait')) return 'wait'; return e.id || e.className || e.tagName; });
  await p.goto('https://class.ownify.co.kr/teacher/');
  for (let i = 0; i < 60 && (await top()) !== 'board'; i++) await p.waitForTimeout(100);
  console.log('  처음 열기 → 판:', await top(), '· 표시', await p.evaluate(() => sessionStorage.getItem('onfHwUp')));
  if ((await top()) !== 'board') { console.log('  ⚠️ 이 가짜는 처음 열기를 못 했다(WebKit = 구글 버튼·입장권 길이라 가짜 토큰으로 안 붙는다) — 판정 안 함'); await b.close(); process.exit(2); }
  const L = () => p.evaluate(() => (window.onfHistL ? window.onfHistL.peek() : null));
  const homePops = async () => { const f = p.frames().find((x) => x.url().indexOf('/home') > 0 && x.url().startsWith(GUCV)); return f ? f.evaluate(() => window.__pops.slice()) : null; };
  const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
  const bf = () => p.frames().find((x) => /\/board/.test(x.url()));
  const W = () => bf().evaluate(() => Object.assign({}, W));
  await p.mouse.click(400, 300); await p.waitForTimeout(400); await p.mouse.click(400, 320); await p.waitForTimeout(300);   // 판 칸을 손짓 안에서 쌓는다
  const s0 = await p.evaluate(() => history.state);
  await bf().evaluate(() => { window.OPENW = 1; }); await p.mouse.click(400, 300); await p.waitForTimeout(400);                 // 판 안 창 하나 열림(알림)
  await p.goBack(); await p.waitForTimeout(500);
  let w = await W(), st = await p.evaluate(() => history.state);
  say('창 연 채 뒤로 1 — 판에 「창 닫아」 한 번 · 되묻기 0 · 판 그대로 · 물음 칸 다시', { w, top: await top(), st }, w.wb === 1 && w.ask === 0 && (await top()) === 'board' && st && st.onfHw === 1 && st.lg === 1);
  await bf().evaluate(() => { window.OPENW = 0; }); await p.mouse.click(400, 300); await p.waitForTimeout(400);
  await p.goBack(); await p.waitForTimeout(500); w = await W();
  say('창 없이 뒤로 2 — 이번엔 「홈으로 나갈까요?」(창 닫아 추가 0)', { w, top: await top() }, w.wb === 1 && w.ask === 1 && (await top()) === 'board');
  if (process.env.DBG) console.log('    처음 칸:', JSON.stringify(s0));
} finally { await b.close(); }
console.log(ENG + (bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(bad ? 1 : 0);
