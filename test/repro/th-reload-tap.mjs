// 🔙 선생님 껍데기(진짜 teacher/index.html · onf-hist.js) — 홈에서 연 교재 판을 연 채 새로 고침 → 되살린 판 칸(rsBoot · histQ 줄) · 홈은 hello 뒤 1초에 학생 창 칸(w1)을 되살린다 (검토 2026-11-12)
//   학생 쌍둥이 = hw-reload-tap.mjs. tapfirst = 판이 뜨자마자 판을 누름 · tapafter = 2.2초 뒤 · tapback = 누르고 0.5초 뒤 뒤로
//   잰 값(2026-11-12 · 크롬): 고치기 전 tapfirst·tapafter 둘 다 = 뒤로1 아무 일 없음(판 그대로 · hp []) → 뒤로2 판·창 한꺼번에(hp ["-"]) → 밖 · tapback = 판 닫힘
//     / 고친 뒤 = 셋 다 판 → 창 → 밖 · tapback 판 닫힘(사이트 안 · 자리 칸) · WebKit 은 이 가짜로 로그인 못 함(hw-reload-back 머리말 · 판정 안 함 exit 2)
//   SHELL_DIR=<껍데기> PW=<playwright index.js> node test/repro/th-reload-tap.mjs [chromium|webkit] [tapfirst|tapafter|tapback]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium', MODES = process.argv[3] ? [process.argv[3]] : ['tapfirst', 'tapafter', 'tapback'];
const API = fs.readFileSync(path.join(SHELL, 'assets', 'onf-api.js'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(API)[1];
const sh = fs.readFileSync(path.join(SHELL, 'teacher', 'index.html'), 'utf8'), TEXEC = /var EXEC = '([^']+)'/.exec(sh)[1];
const GUC = 'https://n-thtaprepro-0lu-script.googleusercontent.com';
const TE1 = 'https://class.ownify.co.kr/young-s1-e1-jungah?mode=share&t=STUTOK';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOK = 'x.' + b64({ exp: Math.floor(Date.now() / 1000) + 3000, hd: 'ownify.co.kr', email: 'peter@ownify.co.kr' }) + '.y';
const HOME = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>
  var T = window.top; window.hp = []; addEventListener('click', function () { T.postMessage({ onf: 'hwTap' }, '*'); });
  T.postMessage({ onf: 'bookHello' }, '*');
  addEventListener('message', function (e) { var d = e.data; if (d && d.onf === 'hist-pop') { hp.push(d.id || '-'); return; } if (!d || d.onf !== 'auth' || window.__got) return; window.__got = 1;
    T.postMessage({ onf: 'hist', op: 'hello' }, '*');
    if (sessionStorage.getItem('RW')) setTimeout(function () { T.postMessage({ onf: 'hist', op: 'push', id: 'w1', state: { onfPeek: 'p' } }, '*'); }, 1000); });
  T.postMessage({ onf: 'auth-please' }, '*');<\/script>`;
const BOOK = '<!doctype html><body style="margin:0;background:#0074d9;height:100vh"><h1>BOOK</h1><script>var T=top;'
  + 'T.postMessage({onf:"bookHi",lg:1},"*");'
  + 'addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="bookLeaveAsk")T.postMessage({onf:"bookClose"},"*");});'
  + 'addEventListener("click",function(){T.postMessage({onf:"hwTap"},"*")});'
  + 'setTimeout(function(){T.postMessage({onf:"bookState",st:{sheet:"E1_X",top:7,left:0,side:null}},"*")},150);<\/script>';
const wrap = (inner) => '<!doctype html><body style="margin:0"><iframe src="' + inner + '" style="border:0;width:100%;height:100vh"></iframe>';
const b = await pw[ENG].launch(); let bad = 0, skip = false;
const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
try {
  for (const MODE of MODES) {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 800 } });
    await ctx.addInitScript((tok) => { if (location.host === 'class.ownify.co.kr') { try { localStorage.setItem('onf_id_tok', tok); localStorage.setItem('onf_tout', '0'); localStorage.setItem('onfThSwap', '0'); } catch (e) {} } }, TOK);
    await ctx.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.host === 'before.test') return route.fulfill({ status: 200, contentType: 'text/html', body: 'before' });
      if (u.host === 'accounts.google.com') return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){},prompt(){},cancel(){},disableAutoSelect(){}}}};' });
      if (u.host === 'class.ownify.co.kr') { const f = path.join(SHELL, u.pathname.replace(/\/$/, '/index.html')); return fs.existsSync(f) ? route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html; charset=utf-8', body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: '' }); }
      if (u.origin + u.pathname === TEXEC || u.origin + u.pathname === EXEC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrap(GUC + (u.searchParams.get('slug') ? '/book' : '/home')) });
      if (u.origin === GUC) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: u.pathname === '/book' ? BOOK : HOME });
      return route.fulfill({ status: 204, body: '' });
    });
    const p = await ctx.newPage();
    const shown = async () => { for (const h of await p.locator('.onf-bookpanel').elementHandles()) if (!(await h.evaluate((x) => x.classList.contains('park')))) return 'board'; return 'home'; };
    const homeF = () => p.frames().find((x) => x.url() === GUC + '/home');
    const bookF = () => p.frames().find((x) => x.url() === GUC + '/book');
    const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 50; i++) { if (await f()) return true; await p.waitForTimeout(50); } return false; };
    await p.goto('https://before.test/'); await p.goto('https://class.ownify.co.kr/teacher/');
    if (!(await until(() => homeF(), 8000))) { console.log('  ⚠️ 이 가짜로 선생님 홈이 안 붙었다(WebKit 로그인 길) — 판정 안 함'); skip = true; await ctx.close(); break; }
    await p.mouse.click(100, 400);
    await homeF().evaluate((h) => top.postMessage({ onf: 'openBook', href: h, left: 300 }, '*'), TE1);
    await until(() => bookF()); await p.waitForTimeout(500); await p.mouse.click(1000, 400); await p.waitForTimeout(200);
    await homeF().evaluate(() => sessionStorage.setItem('RW', '1'));
    await p.reload();
    await until(() => bookF(), 8000);
    console.log('── ' + ENG + ' · 선생님 · ' + MODE + ' · 판 ' + (await shown()));
    const steps = [];
    if (MODE === 'tapback') {
      await p.mouse.click(1000, 400); await p.waitForTimeout(500);
      await p.goBack().catch(() => {}); await p.waitForTimeout(1500);
      const out = !/class\.ownify\.co\.kr/.test(p.url());
      steps.push(out ? '밖' : (await shown()));
      say('손짓 → 0.5초 → 뒤로 = 사이트 안 · 판 닫힘', steps, !out && steps[0] === 'home');
    } else {
      await p.waitForTimeout(MODE === 'tapfirst' ? 50 : 2200);
      await p.mouse.click(1000, 400); await p.waitForTimeout(3500);   // 손짓 하나 — 붙잡은 칸은 3초 시한에 쌓여야 한다
      for (let i = 0; i < 5; i++) {
        await p.goBack().catch(() => {}); await p.waitForTimeout(1200);
        if (!/class\.ownify\.co\.kr/.test(p.url())) { steps.push('밖'); break; }
        steps.push((await shown()) + ' hp=' + JSON.stringify(await homeF().evaluate(() => hp.splice(0))));
      }
      say('뒤로 = 판 닫힘(학생 창 그대로) → 학생 창 닫힘 → 밖', steps, JSON.stringify(steps) === JSON.stringify(['home hp=["w1"]', 'home hp=["-"]', '밖']));
    }
    await ctx.close();
  }
} finally { await b.close(); }
console.log(ENG + (skip ? ' — 판정 안 함' : bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(skip ? 2 : bad ? 1 : 0);
