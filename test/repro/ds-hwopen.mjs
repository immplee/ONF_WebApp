// (복사 원본: hw-side-back.mjs) 🔙 옆 교재(hwBk) 기록 다리 · 보기 칸 걷기 뒤로(2026-11-11 독립 검토 A·B) — 진짜 teacher/index.html · 가짜 과제 판이 「옆에」로 가짜 교재를 열고 · 교재가 다리(hist hi/push)로 창 칸을 민다.
//   잰다: 옆 교재 창 칸이 최상위 칸(onfHw k)으로 서나 · 뒤로 = 옆 교재 창 하나(hist-pop · 판 창 닫기·되묻기 0) · 사진만으로 = 옆 교재 칸까지 한 번에(판 창 닫기 0 — B) · ‹(hwBack) = 판이 닫힌다
// 🔗 내 기기 연동 수업 자료 열기 부탁(hwOpenReq · 2026-11-28) — 교재 판·수업 자료 판이 보내면 선생님 껍데기가 그 학생 그 수업 자료를 연다
//   SHELL_DIR=<껍데기> PW=<playwright index.js> node test/repro/hw-side-back.mjs [chromium|webkit]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium';
const sh = fs.readFileSync(path.join(SHELL, 'teacher', 'index.html'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(sh)[1];
const BOOKHREF = 'https://class.ownify.co.kr/young-s1-e1-jungah?mode=share&t=STUTOK';
const GUC = 'https://n-flashrepro-0lu-script.googleusercontent.com';
const GUCV = GUC;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOK = 'x.' + b64({ exp: Math.floor(Date.now() / 1000) + 3000, hd: 'ownify.co.kr', email: 'peter@ownify.co.kr' }) + '.y';
const HOME = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>
  var T = window.top; addEventListener('message', function (e) { var d = e.data; if (!d || d.onf !== 'auth' || window.__got) return; window.__got = 1; T.postMessage({ onf: 'openBook', href: '${BOOKHREF}', left: 0 }, '*'); });
  T.postMessage({ onf: 'auth-please' }, '*');<\/script>`;
const BOARD = '<!doctype html><body style="margin:0;background:#ff4136;height:100vh"><h1>BOARD</h1><script>var T=top,W={wb:0,ask:0,open:0};T.postMessage({onf:"auth-please"},"*");'
  + 'addEventListener("click",function(){T.postMessage({onf:"hwTap"},"*");if(window.OPENW){W.open=1;T.postMessage({onf:"hwWin",on:1},"*")}});'
  + 'addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="hwWinBack"){W.wb++;W.open=0}if(d.onf==="hwLeaveAsk")W.ask++});<\/script>';
const API = fs.readFileSync(path.join(SHELL, 'assets', 'onf-api.js'), 'utf8'), BEXEC = /var EXEC = '([^']+)'/.exec(API)[1];
const BOOK = '<!doctype html><body style="margin:0;background:#0074d9;height:100vh"><h1>BOOK</h1><script>var T=top;window.__on=0;window.__pops=[];T.postMessage({onf:"bookHi",lg:1},"*");T.postMessage({onf:"hist",op:"hi"},"*");'
  + 'addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="hist-on")window.__on=1;if(d.onf==="hist-pop")window.__pops.push(d.id||"(바닥)")});'
  + 'window.openWin=function(id){T.postMessage({onf:"hist",op:"push",id:id,state:{w:id}},"*")};<\/script>';
const wrap = (inner) => '<!doctype html><body style="margin:0"><iframe src="' + inner + '" style="border:0;width:100%;height:100vh"></iframe>';

const L1 = '3d4d6a62-96ae-4c1b-9f00-123456789abc', L2 = '11111111-2222-4333-8444-555555555555';
const b = await pw[ENG].launch(); let bad = 0;
try {
  const ctx = await b.newContext({ viewport: { width: 800, height: 600 } });
  await ctx.addInitScript((tok) => { if (location.host === 'class.ownify.co.kr') { try { localStorage.setItem('onf_id_tok', tok); localStorage.setItem('onf_tout', '0'); } catch (e) {} } }, TOK);
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.host === 'accounts.google.com') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){},prompt(){},cancel(){},disableAutoSelect(){}}}};' });
    if (u.host === 'class.ownify.co.kr') { const f = path.join(SHELL, u.pathname.replace(/\/$/, '/index.html')); return fs.existsSync(f) ? route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html; charset=utf-8', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: '' }); }
    if (u.origin + u.pathname === EXEC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrap(GUC + (u.searchParams.get('mode') === 'hwbook' ? '/board?l=' + (u.searchParams.get('l') || '') : '/home')) });
    if (u.origin + u.pathname === BEXEC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrap(GUC + '/book') });
    if (u.origin === GUC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: u.pathname === '/board' ? BOARD : u.pathname === '/book' ? BOOK : HOME });
    if (/hwbook/.test(u.href)) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: BOARD });
    return route.fulfill({ status: 204, body: '' });
  });
  const p = await ctx.newPage();
  const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
  const top = () => p.evaluate(() => { const e = document.elementFromPoint(400, 300); if (!e) return '?'; if (e.closest('.onf-hwbox')) return 'board'; if (e.closest('.onf-bookpanel') || /book/.test(e.className || '')) return 'book'; if (e.id === 'app') return 'home'; return e.tagName + '.' + (e.className || ''); });
  const kf = () => p.frames().find((x) => /\/book$/.test(x.url()));
  const hwL = () => p.evaluate(() => { const f = document.querySelector('.onf-hwbox iframe'); return f ? f.src : ''; });
  await p.goto('https://class.ownify.co.kr/teacher/');
  for (let i = 0; i < 60 && !kf(); i++) await p.waitForTimeout(100);
  if (!kf()) { console.log('  ⚠️ 교재 판이 안 떴다 — 판정 안 함'); await b.close(); process.exit(2); }
  await p.waitForTimeout(400);
  say('전제: 선생님 홈이 교재 판을 열었다(수업 자료 없음)', { top: await top(), hw: await hwL() }, !(await hwL()));
  if (process.env.DBG) await p.evaluate(() => { const o = window.onfHwOpenReq; window.__req = []; window.onfHwOpenReq = function (d) { window.__req.push(JSON.stringify(d)); return o(d); }; window.addEventListener('message', function (e) { if (e.data && e.data.onf === 'hwOpenReq') window.__req.push('msg ' + e.origin); }); });
  await kf().evaluate((l) => top.postMessage({ onf: 'hwOpenReq', t: 'TokFlash01', l: l }, '*'), L1);
  if (process.env.DBG) { await p.waitForTimeout(500); console.log('DBG2', await p.evaluate(() => window.__req)); }
  for (let i = 0; i < 40 && !(await hwL()); i++) await p.waitForTimeout(100);
  if (process.env.DBG) console.log('DBG', await p.evaluate(() => ({ f: typeof window.onfHwOpenReq, g: typeof gateGo !== 'undefined' && !!gateGo, box: !!document.querySelector('.onf-hwbox'), html: (document.querySelector('.onf-hwbox') || {}).outerHTML ? document.querySelector('.onf-hwbox').outerHTML.slice(0, 300) : '' })));
  const s1 = await hwL();
  say('① 교재 판 「hwOpenReq」 → 그 학생 그 수업 자료 판이 열림', { src: s1.slice(0, 160) }, /mode=hwbook/.test(s1) && s1.indexOf('t=TokFlash01') >= 0 && s1.indexOf('l=' + L1) >= 0);
  await kf().evaluate(() => top.postMessage({ onf: 'hwOpenReq', t: 'Tok Bad!', l: 'x' }, '*')); await p.waitForTimeout(300);
  say('② 꼴 틀린 부탁은 버림(판 그대로)', { same: (await hwL()) === s1 }, (await hwL()) === s1);
  const bf = () => p.frames().find((x) => /\/board/.test(x.url()));
  for (let i = 0; i < 40 && !bf(); i++) await p.waitForTimeout(100);
  await bf().evaluate(() => top.postMessage({ onf: 'auth-please' }, '*')); await p.waitForTimeout(300);
  await bf().evaluate((l) => top.postMessage({ onf: 'hwOpenReq', t: 'TokFlash01', l: l }, '*'), L2);
  for (let i = 0; i < 40 && (await hwL()).indexOf(L2) < 0; i++) await p.waitForTimeout(100);
  say('③ 수업 자료 판 「hwOpenReq」(다른 수업) → 그 수업 자료로 바뀜', { src: (await hwL()).slice(0, 160) }, (await hwL()).indexOf('l=' + L2) >= 0);
} finally { await b.close(); }
console.log(ENG + (bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(bad ? 1 : 0);
