// 🔙 학생 창 + 수업 자료(과제 판)를 연 채 새로 고침 → 뒤로가 켠 순서 역순으로 하나씩인가 · 옛 칸이 안 남나(Peter 2026-11-11 · hw-reload-flash.mjs 본뜸). 진짜 teacher/index.html · 가짜 구글 홈(노크 → 1.2초 뒤 판 다시 열기) · 가짜 판.
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
const BOARD = '<!doctype html><body style="margin:0;background:#ff4136;height:100vh"><h1>BOARD</h1><script>addEventListener("click",function(){top.postMessage({onf:"hwTap"},"*")})<\/script>';
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
  await p.mouse.click(400, 300); await p.waitForTimeout(400);
  const homeLoads = () => loads;
  await p.reload(); for (let i = 0; i < 60 && (await top()) !== 'board'; i++) await p.waitForTimeout(100);
  await p.waitForTimeout(300); const n0 = homeLoads();
  say('새로 고침 뒤 판 다시 뜸', { top: await top(), L: await L() }, (await top()) === 'board');
  await p.mouse.click(400, 300); await p.waitForTimeout(500); await p.mouse.click(400, 320); await p.waitForTimeout(300);   // 두 번 만진다 — 크롬은 한 손짓에 쌓은 여러 칸을 다음 손짓 전까지 뒤로 단추가 건너뛴다(종전 histQ 도 같다)
  if (process.env.DBG) console.log('    층 기록:', (await p.evaluate(() => (window.onfHistL ? window.onfHistL.log : []))).join(' | '));
  const steps = [];
  for (let i = 0; i < 9; i++) {
    await p.goBack().catch(() => {}); await p.waitForTimeout(600);
    if (!/class\.ownify\.co\.kr\/teacher/.test(p.url())) { steps.push('밖'); break; }
    steps.push((await top()) + '/' + JSON.stringify(await homePops()));
    if (process.env.DBG) console.log('    ·', i + 1, JSON.stringify(await p.evaluate(() => history.state)), JSON.stringify(await L()));
  }
  console.log('  뒤로 차례:', steps.join(' → '));
  const closeAt = steps.findIndex((x) => !/^board/.test(x)), peekAt = steps.findIndex((x) => /바닥/.test(x)), outAt = steps.indexOf('밖');
  say('판이 먼저 닫히고(' + (closeAt + 1) + '번째) · 그다음 학생 창 칸(' + (peekAt + 1) + ') · 그다음 밖(' + (outAt + 1) + ') — 헛도는 뒤로·되살아난 판 없음', steps.length, closeAt >= 0 && peekAt === closeAt + 1 && outAt === peekAt + 1 && !steps.slice(closeAt).some((x) => /^board/.test(x)));
  say('뒤로 가는 동안 홈 액자를 다시 읽지 않았다(새로 고침 뒤 ' + n0 + '번 → ' + homeLoads() + '번)', homeLoads() - n0, homeLoads() === n0);
} finally { await b.close(); }
console.log(ENG + (bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(bad ? 1 : 0);
