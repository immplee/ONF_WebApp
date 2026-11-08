// 🔄 수업 자료(과제 판)를 연 채 새로 고침 — 홈이 반짝 보이나(Peter 2026-11-08). 진짜 teacher/index.html · 가짜 구글 홈(노크 → 1.2초 뒤 판 다시 열기) · 가짜 판.
//   60ms 마다 화면 가운데 맨 위 층(elementFromPoint): home(홈 액자) · cover(새로 고침 덮개) · board(판). 새로 고침 뒤 home 이 한 번이라도 맨 위면 반짝.
//   SHELL_DIR=<껍데기> PW=<playwright index.js> node test/repro/hw-reload-flash.mjs [chromium|webkit]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium';
const sh = fs.readFileSync(path.join(SHELL, 'teacher', 'index.html'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(sh)[1];
const GUC = 'https://n-flashrepro-0lu-script.googleusercontent.com';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOK = 'x.' + b64({ exp: Math.floor(Date.now() / 1000) + 3000, hd: 'ownify.co.kr', email: 'peter@ownify.co.kr' }) + '.y';
const HOME = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>
  var T = window.top, again = sessionStorage.getItem('boardWas') === '1';
  addEventListener('message', function (e) { var d = e.data; if (!d || d.onf !== 'auth' || window.__got) return; window.__got = 1;
    setTimeout(function () { T.postMessage(again ? { onf: 'hwbook', t: 'TokFlash01', l: '', rs: 1 } : { onf: 'hwbook', t: 'TokFlash01', l: '' }, '*'); sessionStorage.setItem('boardWas', '1'); }, again ? 1200 : 400); });
  T.postMessage({ onf: 'auth-please' }, '*');<\/script>`;
const BOARD = '<!doctype html><body style="margin:0;background:#ff4136"><h1>BOARD</h1>';
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
  // 색은 화면 맨 위 요소로 판단(스크린샷 해독 없이): 가운데 점의 맨 위 요소가 어느 층인가
  const top = () => p.evaluate(() => { const e = document.elementFromPoint(400, 300); if (!e) return '?'; if (e.closest('.onf-hwcover')) return 'cover'; if (e.closest('.onf-hwbox')) return 'board'; if (e.id === 'app') return 'home'; if (e.closest('#wait') || e.closest('.onf-wait')) return 'wait'; return e.id || e.className || e.tagName; });
  await p.goto('https://class.ownify.co.kr/teacher/');
  for (let i = 0; i < 60 && (await top()) !== 'board'; i++) await p.waitForTimeout(100);
  console.log('  처음 열기 → 판:', await top(), '· 표시', await p.evaluate(() => sessionStorage.getItem('onfHwUp')));
  if ((await top()) !== 'board') { console.log('  ⚠️ 이 가짜는 처음 열기를 못 했다(WebKit = 구글 버튼·입장권 길이라 가짜 토큰으로 안 붙는다) — 판정 안 함'); await b.close(); process.exit(2); }
  const seq = []; const t0 = Date.now();
  await p.reload({ waitUntil: 'commit' });
  for (let i = 0; i < 45; i++) { let v; try { v = await top(); } catch (e) { v = 'nav'; } seq.push(Math.round((Date.now() - t0) / 10) * 10 + ':' + v); if (v === 'board' && i > 3) break; await p.waitForTimeout(60); }
  const homeSeen = seq.some((x) => /:home$/.test(x));
  console.log('  새로 고침 뒤 맨 위 층:', seq.join(' '));
  console.log(homeSeen ? '  ❌ 홈이 보였다(반짝)' : '  ✅ 판이 다시 뜰 때까지 홈이 안 보였다'); if (homeSeen) bad++;
  if (!seq.some((x) => /:board$/.test(x))) { console.log('  ❌ 판이 다시 안 떴다'); bad++; }
} finally { await b.close(); }
console.log(ENG + (bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(bad ? 1 : 0);
