/* ONF — 서버(구글) 쪽과 이야기하는 곳. 주소·명부 조회를 여기 한 곳에만 둔다. */
(function (global) {
  'use strict';

  // 공유 교재 웹앱 배포 주소. 배포 ID 를 바꾸면 여기만 고친다.
  // ⚠️ 재배포는 항상 기존 배포를 갱신한다(`clasp create-deployment -i <배포ID>`) —
  //    새 배포를 만들면 이 주소가 바뀌어 이미 나간 링크가 전부 죽는다.
  var EXEC = 'https://script.google.com/macros/s/AKfycbygZNlsIPKH8bDvVuWjejdd4eb_6KbG3fxh4Jg-Ju-CGIWIAeAaqNwGmwE_M41eNwjx/exec';

  // ⚠️ 임시 명부 — P1(로그인)에서 **명부 시트 조회로 교체된다.**
  //    지금은 액자를 실기기에서 확인하려고 한 명만 표로 박아 뒀다.
  //    ⛔ 여기에 학생을 계속 추가하지 마라. 그러면 '학생마다 손대는 일'이 되살아난다.
  var ROSTER = {
    A7K2M9: {
      name: '시범',
      books: [
        { id: '1GXo1pkeK9YnSX3POhN0FdUEryKz1UCabUtZGrgndVAk', sheet: 'E1_Pilot',
          title: 'Young Sheldon S1 E1' }
      ]
    }
  };

  function lookup(token) { return (token && ROSTER[token]) || null; }

  function bookUrl(book) {
    return EXEC + '?mode=share&fileId=' + encodeURIComponent(book.id) +
      '&sheetName=' + encodeURIComponent(book.sheet);
  }

  global.ONF = global.ONF || {};
  global.ONF.api = { EXEC: EXEC, lookup: lookup, bookUrl: bookUrl };
})(window);
