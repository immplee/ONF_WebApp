// 🔙 학생 껍데기(진짜 index.html · onf-frame.js · onf-hist.js) — 판 A 를 연 채 새로 고침 → 되살린 판 칸(rsBoot · 줄) · 홈은 hello 뒤 1초에 창 칸(w1)을 되살린다 (검토 2026-11-12)
//   tapfirst = 판이 뜨자마자(홈 되살리기 전) 판을 누름 · tapafter = 2.2초 뒤 누름 → 둘 다 뒤로 = 판 닫힘(홈 창 w1 그대로) → 홈 창 닫힘 → 밖
//   tapback = 누르고 0.5초 뒤 뒤로(붙잡는 동안 진짜 뒤로 — 판이 닫히나 · 밖으로 나가나를 잰다)
//   잰 값(2026-11-12 · 크롬·WebKit): 고치기 전 tapfirst = 뒤로1 아무 일 없음(판 그대로 · hp []) → 뒤로2 판·창 한꺼번에(hp ["-"]) → 밖 / 고친 뒤 = 판 → 창 → 밖
//     tapback: 고치기 전 = 판 닫힘(사이트 안) · 붙잡기만(자리 칸 없이) = 밖 ❌ · 고친 뒤(자리 칸) = 판 닫힘 · 이어서 뒤로 셋 다 같은 꼴(창 닫힘 → 밖)
//   SHELL_DIR=<껍데기> PW=<playwright index.js> node test/repro/hw-reload-tap.mjs [chromium|webkit] [tapfirst|tapafter|tapback]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium', MODES = process.argv[3] ? [process.argv[3]] : ['tapfirst', 'tapafter', 'tapback'];
const API = fs.readFileSync(path.join(SHELL, 'assets', 'onf-api.js'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(API)[1];
const GUC = 'https://n-taprepro-0lu-script.googleusercontent.com';
const SE = (n) => 'https://class.ownify.co.kr/a-s1-e' + n + '-b?mode=share';
const HOME = '<!doctype html><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>window.hp=[];top.postMessage({onf:"bookHello"},"*");top.postMessage({onf:"hist",op:"hi"},"*");addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="hist-on"){top.postMessage({onf:"hist",op:"hello"},"*");if(sessionStorage.getItem("RW"))setTimeout(function(){top.postMessage({onf:"hist",op:"push",id:"w1",state:{onfHomeTab:"x"}},"*")},1000);}if(d.onf==="hist-pop")hp.push(d.id||"-");});</' + 'script>';
const BOOK = (slug) => '<!doctype html><body style="margin:0;background:#0074d9;height:100vh"><h1>BOOK ' + slug + '</h1><script>var T=top;'
  + 'T.postMessage({onf:"bookHi",lg:1},"*");T.postMessage({onf:"hist",op:"hi"},"*");'
  + 'addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="bookLeaveAsk")T.postMessage({onf:"bookClose"},"*");});'
  + 'addEventListener("click",function(){T.postMessage({onf:"hwTap"},"*")});'
  + 'setTimeout(function(){T.postMessage({onf:"bookState",st:{sheet:"E1_X",top:7,left:0,side:null}},"*")},150);</' + 'script>';
const wrap = (inner) => '<!doctype html><body style="margin:0"><iframe src="' + inner + '" style="border:0;width:100%;height:100vh"></iframe>';
const b = await pw[ENG].launch(); let bad = 0;
const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
try {
  for (const MODE of MODES) {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 800 } });
    await ctx.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.host === 'before.test') return route.fulfill({ status: 200, contentType: 'text/html', body: 'before' });
      if (u.host === 'class.ownify.co.kr') {
        let f = path.join(SHELL, u.pathname.replace(/\/$/, '/index.html'));
        if (!fs.existsSync(f)) f = path.join(SHELL, 'index.html');
        return route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html; charset=utf-8', body: fs.readFileSync(f) });
      }
      if (u.origin + u.pathname === EXEC) { const sl = u.searchParams.get('slug'); return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrap(GUC + (sl ? '/book/' + sl : '/home')) }); }
      if (u.origin === GUC) { const m = /^\/book\/(.+)$/.exec(u.pathname); return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: m ? BOOK(m[1]) : HOME }); }
      return route.fulfill({ status: 204, body: '' });
    });
    const p = await ctx.newPage();
    const shown = async () => { for (const h of await p.locator('.onf-bookpanel').elementHandles()) if (!(await h.evaluate((x) => x.classList.contains('park')))) return 'board'; return 'home'; };
    const homeF = () => p.frames().find((x) => x.url() === GUC + '/home');
    const bookF = () => p.frames().find((x) => x.url() === GUC + '/book/a-s1-e1-b');
    const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 50; i++) { if (await f()) return true; await p.waitForTimeout(50); } return false; };
    await p.goto('https://before.test/'); await p.goto('https://class.ownify.co.kr/?t=TokAAAA1111');
    await until(() => homeF()); await p.mouse.click(100, 400);
    await homeF().evaluate((h) => top.postMessage({ onf: 'openBook', href: h, left: 300 }, '*'), SE(1));
    await until(() => bookF()); await p.waitForTimeout(500); await p.mouse.click(900, 400); await p.waitForTimeout(200);
    await homeF().evaluate(() => sessionStorage.setItem('RW', '1'));
    await p.reload();
    await until(() => bookF(), 8000);
    console.log('── ' + ENG + ' · ' + MODE);
    const steps = [];
    if (MODE === 'tapback') {
      await p.mouse.click(900, 400); await p.waitForTimeout(500);
      await p.goBack().catch(() => {}); await p.waitForTimeout(1500);
      const out = !/class\.ownify\.co\.kr/.test(p.url());
      steps.push(out ? '밖' : (await shown()));
      say('손짓 → 0.5초 → 뒤로 = 사이트 안 · 판 닫힘', steps, !out && steps[0] === 'home');
      if (!out) {   // 그 뒤 홈이 창 칸(w1)을 되살린다 — 손짓 하나 · 뒤로 = 창 닫힘 → 밖
        await p.waitForTimeout(1500); await p.mouse.click(100, 400); await p.waitForTimeout(3500);
        for (let i = 0; i < 3; i++) {
          await p.goBack().catch(() => {}); await p.waitForTimeout(1200);
          if (!/class\.ownify\.co\.kr/.test(p.url())) { steps.push('밖'); break; }
          steps.push((await shown()) + ' hp=' + JSON.stringify(await homeF().evaluate(() => hp.splice(0))));
        }
        console.log('    이어서 뒤로:', steps.join(' → '));
      }
    } else {
      if (MODE === 'tapfirst') await p.waitForTimeout(50); else await p.waitForTimeout(2200);
      await p.mouse.click(900, 400); await p.waitForTimeout(3500);   // 손짓 하나 — 붙잡은 칸은 3초 시한에 쌓여야 한다
      for (let i = 0; i < 5; i++) {
        await p.goBack().catch(() => {}); await p.waitForTimeout(1200);
        if (!/class\.ownify\.co\.kr/.test(p.url())) { steps.push('밖'); break; }
        steps.push((await shown()) + ' hp=' + JSON.stringify(await homeF().evaluate(() => hp.splice(0))));
      }
      say('뒤로 = 판 닫힘(홈 창 그대로) → 홈 창 닫힘 → 밖', steps, JSON.stringify(steps) === JSON.stringify(['home hp=["w1"]', 'home hp=["-"]', '밖']));
    }
    await ctx.close();
  }
} finally { await b.close(); }
console.log(ENG + (bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(bad ? 1 : 0);
