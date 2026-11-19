// 📱 위 상태 막대 색 = 화면 바탕(보수공사 ⑤ G · 2026-11-19 → 2026-11-20 구멍 점검) — 학생·선생님 껍데기 둘 다
//   기본은 다크(머리 스크립트 d = v !== "light") → 메타 한 줄 #1E1611 · 머리 스크립트·테마 받는 손이 data-theme 따라 content 를 갈아 끼운다.
//   ⛔ prefers-color-scheme 한 쌍 금지 — 라이트 모드 아이폰에서 에스프레소 화면 위에 크림색 막대가 떴다(앱 색 ≠ 기기 색).
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const RD = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
for (const f of ['index.html', 'teacher/index.html']) {
  const s = RD(f), m = s.match(/<meta name="theme-color"[^>]*>/g) || [];
  assert.deepStrictEqual(m, ['<meta name="theme-color" content="#1E1611">'], f + ' ⛔ theme-color 는 한 줄 #1E1611(기본 다크) — 기기 색 따라가는 한 쌍 금지');
  const head = /<script>\/\* 🌙 다크 모드[\s\S]*?\*\/(\(function\(\)\{[\s\S]*?\}\)\(\);)<\/script>/.exec(s);
  assert.ok(head, f + ' ⛔ 머리 다크 스크립트를 못 찾았다');
  for (const [saved, want] of [[null, '#1E1611'], ['dark', '#1E1611'], ['light', '#fdfbf7']]) {
    const meta = { c: '#1E1611', setAttribute(k, v) { if (k === 'content') this.c = v; } }, attrs = {};
    vm.runInNewContext(head[1], { localStorage: { getItem: () => saved }, document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, querySelector: (q) => q === 'meta[name=theme-color]' ? meta : null } });
    assert.strictEqual(meta.c, want, f + ' ⛔ 저장 색 ' + saved + ' → 막대 ' + meta.c + '(화면 ' + attrs['data-theme'] + ')');
  }
}
// 앱 안에서 테마를 바꾸면 막대도 따라간다 — 학생 껍데기(onf-frame.js 테마 받는 손) · 선생님 껍데기(onfShellTheme)
const frame = /if \(ev\.data\.onf === 'theme'\) \{[^\n]*/.exec(RD('assets/onf-frame.js'));
assert.ok(frame && /meta\[name=theme-color\][^\n]*'#1E1611' : '#fdfbf7'/.test(frame[0]), '⛔ onf-frame.js 테마 받는 손이 상태 막대 색을 안 바꾼다');
const shell = /function onfShellTheme\(v\) \{[\s\S]*?\n\}/.exec(RD('teacher/index.html'));
assert.ok(shell && /meta\[name=theme-color\][^\n]*'#1E1611' : '#fdfbf7'/.test(shell[0]), '⛔ 선생님 onfShellTheme 이 상태 막대 색을 안 바꾼다');
console.log('✅ theme-color 기본 다크 한 줄 · 저장 색·앱 안 바꿈 따라감');
