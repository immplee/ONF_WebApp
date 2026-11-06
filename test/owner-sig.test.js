/* 👑 오너 서명 osg(Peter·Mary 줄 편집 · Ownify 2026-11-06) — 껍데기가 교재 판 주소로 **넘긴다** · 기기 저장소 열쇠엔 안 남긴다.
   빠졌던 날(2026-11-06): 선생님 홈 판이 BOOK_KEYS 로 거르며 osg 를 버려 교재가 오너를 몰랐다(우클릭 = 브라우저 메뉴 · 칸 편집 안 열림).
   실행: node test/owner-sig.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const T = fs.readFileSync(path.join(__dirname, '..', 'teacher', 'index.html'), 'utf8');
const S = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const fn = (src, name) => { const i = src.indexOf('function ' + name + '('); let d = 0, k = src.indexOf('{', i); for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) break; } return src.slice(i, k + 1); };
const keys = T.match(/var BOOK_KEYS = \[[^\]]*\];/)[0];
const c = { URL, location: { href: 'https://class.ownify.co.kr/teacher/' }, encodeURIComponent, decodeURIComponent, window: { ONF: { api: { EXEC: 'https://script.google.com/macros/s/X/exec' } } } };
c.ONF = c.window.ONF; vm.createContext(c);
vm.runInContext(keys + '\n' + fn(T, 'teacherBookSrc') + '\n' + fn(T, 'bookStrip') + '\n' + fn(T, 'bookPendKey'), c);
const src = c.teacherBookSrc('https://class.ownify.co.kr/?mode=share&t=TOK123&fileId=F1&sheetName=E1&ttok=abc&tas=Peter&osg=SIG_value-1');
assert.ok(/[?&]osg=SIG_value-1(&|$)/.test(src), '⛔ 선생님 홈 판이 osg 를 버렸다: ' + src);
assert.ok(!/osg=/.test(c.bookPendKey(src)), '⛔ 기기 저장소 열쇠에 osg 가 남았다');
assert.ok(/\['fileId', 'sheetName', 'mode', 'back', 'ttok', 'tas', 'osg',/.test(S), '⛔ 교재 껍데기(index.html)가 osg 를 앱에 안 넘긴다');
console.log('✓ owner-sig 3개 통과');
