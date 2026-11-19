// 📱 위 상태 막대 색 = 화면 바탕(보수공사 ⑤ G · 2026-11-19) — 학생·선생님 껍데기 둘 다 · 밝음/어두움 한 쌍 · 옛 갈색 한 색 금지
const fs = require('fs'), path = require('path'), assert = require('assert');
for (const f of ['index.html', 'teacher/index.html']) {
  const s = fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), m = s.match(/<meta name="theme-color"[^>]*>/g) || [];
  assert.strictEqual(m.length, 2, f + ' ⛔ theme-color 가 밝음·어두움 두 줄이 아니다');
  assert.ok(m.some((x) => /prefers-color-scheme: light\)" content="#fdfbf7"/.test(x)), f + ' ⛔ 밝은 화면 막대 색');
  assert.ok(m.some((x) => /prefers-color-scheme: dark\)" content="#1E1611"/.test(x)), f + ' ⛔ 어두운 화면 막대 색');
}
console.log('✅ theme-color 한 쌍');
