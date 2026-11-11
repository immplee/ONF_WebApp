// 🔙 학생 껍데기(진짜 index.html · onf-frame.js · onf-hist.js) — 판 안에서 연 판(A → B)을 연 채 새로 고침 → 사슬 그대로 · 뒤로 = B → A → 홈 · 다른 학생 토큰이면 안 연다 (2026-11-11)
//   선생님 껍데기 쌍둥이는 vm 검사(test/reload-chain.test.js) — 선생님 재현기는 WebKit 로그인 길을 못 탄다(hw-reload-back 머리말).
//   SHELL_DIR=<껍데기> PW=<playwright index.js> node test/repro/reload-chain.mjs [chromium|webkit]
import fs from 'node:fs'; import path from 'node:path';
const SHELL = process.env.SHELL_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pw = (await import(process.env.PW || '/Users/peter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js')).default;
const ENG = process.argv[2] || 'chromium';
const API = fs.readFileSync(path.join(SHELL, 'assets', 'onf-api.js'), 'utf8'), EXEC = /var EXEC = '([^']+)'/.exec(API)[1];
const GUC = 'https://n-chainrepro-0lu-script.googleusercontent.com';
const SE = (n) => 'https://class.ownify.co.kr/a-s1-e' + n + '-b?mode=share';
const HOME = '<!doctype html><body style="margin:0;background:#2ecc40"><h1>HOME</h1><script>console.log("[home] load");top.postMessage({onf:"bookHello"},"*");</' + 'script>';
const BOOK = (slug) => '<!doctype html><body style="margin:0;background:#0074d9;height:100vh"><h1>BOOK ' + slug + '</h1><script>var T=top;window.__rs=[];console.log("[book] load ' + slug + '");'
  + 'T.postMessage({onf:"bookHi",lg:1},"*");T.postMessage({onf:"hist",op:"hi"},"*");'
  + 'addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.onf==="bookRestore")window.__rs.push(d.st&&d.st.sheet);if(d.onf==="bookLeaveAsk")T.postMessage({onf:"bookClose"},"*");});'
  + 'addEventListener("click",function(){T.postMessage({onf:"hwTap"},"*")});'
  + 'setTimeout(function(){T.postMessage({onf:"bookState",st:{sheet:"' + slug.toUpperCase().replace(/^A-S1-(E\d)-B$/, '$1') + '_X",top:7,left:0,side:null}},"*")},150);</' + 'script>';
const wrap = (inner) => '<!doctype html><body style="margin:0"><iframe src="' + inner + '" style="border:0;width:100%;height:100vh"></iframe>';
const b = await pw[ENG].launch(); let bad = 0;
const say = (k, v, ok) => { if (!ok) bad++; console.log((ok ? '  ✅ ' : '  ❌ ') + k + ' = ' + JSON.stringify(v)); };
try {
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
  if (process.env.DBG) p.on('console', (m) => console.log('    ', m.text()));
  const panels = async () => {   // 판 액자는 openExec 가 location.replace 로 연다(src 속성 없음) — 액자 문서 주소로 가른다
    const out = [];
    for (const h of await p.locator('.onf-bookpanel').elementHandles()) {
      const hid = await h.evaluate((x) => x.classList.contains('park')), f = await (await h.waitForSelector('iframe', { state: 'attached' })).contentFrame();
      out.push((hid ? 'hid:' : 'on:') + ((((f && f.url()) || '').match(/slug=([a-z0-9-]+)/) || [])[1] || '?'));
    }
    return out;
  };
  const homeF = () => p.frames().find((x) => x.url() === GUC + '/home');
  const bookF = (n) => p.frames().find((x) => x.url() === GUC + '/book/a-s1-e' + n + '-b');
  const until = async (f, ms) => { for (let i = 0; i < (ms || 6000) / 100; i++) { if (await f()) return true; await p.waitForTimeout(100); } return false; };
  await p.goto('https://before.test/'); await p.goto('https://class.ownify.co.kr/?t=TokAAAA1111');
  await until(() => homeF());
  await p.mouse.click(100, 400);
  await homeF().evaluate((h) => top.postMessage({ onf: 'openBook', href: h, left: 300 }, '*'), SE(1));
  await until(() => bookF(1)); await p.waitForTimeout(400);
  await p.mouse.click(900, 400);
  await bookF(1).evaluate((h) => top.postMessage({ onf: 'openBook', href: h }, '*'), SE(2));
  await until(() => bookF(2)); await p.waitForTimeout(500); await p.mouse.click(900, 400); await p.waitForTimeout(200);
  console.log('  새로 고침 전 판:', JSON.stringify(await panels()));
  const rec = await p.evaluate(() => sessionStorage.getItem('onfOpenBook'));
  say('기억 — 맨 위 B · 밑 판 A(u) · 앞 판(b 1) · 토큰 없음', JSON.parse(rec || 'null') && { h: JSON.parse(rec).h.slice(-20), u: JSON.parse(rec).u.map((x) => x.h.slice(-20)), b: JSON.parse(rec).b }, !!rec && /e2/.test(JSON.parse(rec).h) && JSON.parse(rec).u.length === 1 && JSON.parse(rec).b === 1 && rec.indexOf('TokAAAA') < 0);
  await p.reload();
  await until(async () => (await panels()).length === 2 && bookF(1) && bookF(2), 8000); await p.waitForTimeout(500);
  await p.mouse.click(900, 400); await p.waitForTimeout(300);   // 손짓 — 미룬 칸을 쌓는다
  const ps = await panels();
  say('새로 고침 뒤 — A 숨긴 판 · B 보임', ps, JSON.stringify(ps) === JSON.stringify(['hid:a-s1-e1-b', 'on:a-s1-e2-b']));
  const steps = []; let rsA = null;
  for (let i = 0; i < 6; i++) {
    await p.goBack().catch(() => {}); await p.waitForTimeout(1200);
    if (!/class\.ownify\.co\.kr/.test(p.url())) { steps.push('밖'); break; }
    const on = ((await panels()).find((x) => /^on:/.test(x)) || 'home').replace('on:', '');
    if (on === 'a-s1-e1-b' && rsA === null && bookF(1)) rsA = await bookF(1).evaluate(() => window.__rs.slice());
    steps.push(on + ' D' + (await p.evaluate(() => onfHistL.peek().D))); if (process.env.LOGH) console.log('     ', (await p.evaluate(() => onfHistL.log.slice(-6).join(' / '))), await p.evaluate(() => history.length + ' ix' + (window.navigation ? navigation.currentEntry.index : '-')));
  }
  console.log('  뒤로 차례:', steps.join(' → '));
  const nm = steps.map((x) => x.split(' ')[0]), a = nm.indexOf('a-s1-e1-b'), h = nm.indexOf('home');
  //   B 의 물음 칸 뒤로 = 교재가 「나갈까요?」 → (가짜 교재는 바로 확인) bookClose = 앞 판 규칙 한 단계 → A. A 의 물음 칸 뒤로 = 확인 → 홈. 그다음 = 옛 칸 → 밖
  say('뒤로 = B(물음→확인) → A → 홈 → 밖 · 헛도는 뒤로 0 · 되살아난 판 없음', steps, a >= 0 && h === a + 1 && nm[h + 1] === '밖' && nm.slice(0, a).every((x) => x === 'a-s1-e2-b'));
  say('밑 판 A 에 되살릴 상태(bookRestore E1_X) — 보일 때', rsA, Array.isArray(rsA) && rsA.indexOf('E1_X') >= 0);
  // 🔐 같은 탭에서 다른 학생 링크 — 앞 학생 교재를 안 연다
  await p.goto('https://class.ownify.co.kr/?t=TokAAAA1111'); await until(() => homeF()); await p.mouse.click(100, 400);
  await homeF().evaluate((h) => top.postMessage({ onf: 'openBook', href: h, left: 300 }, '*'), SE(3)); await until(() => bookF(3));
  await p.goto('https://class.ownify.co.kr/?t=TokBBBB2222'); await until(() => homeF()); await p.waitForTimeout(800);
  const pb = await panels(), rb = await p.evaluate(() => sessionStorage.getItem('onfOpenBook'));
  say('다른 학생 토큰으로 넘어옴 — 판 0 · 기억 지움', { pb, rb }, pb.length === 0 && rb === null);
} finally { await b.close(); }
console.log(ENG + (bad ? ' — 실패 ' + bad : ' — 통과')); process.exit(bad ? 1 : 0);
