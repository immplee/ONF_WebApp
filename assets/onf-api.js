/* ONF — 구글 쪽 주소를 여기 한 곳에만 둔다. */
(function (global) {
  'use strict';

  // 공유 교재 웹앱 배포 주소. 배포 ID 를 바꾸면 여기만 고친다.
  // ⚠️ 재배포는 항상 기존 배포를 갱신한다(`clasp create-deployment -i <배포ID>`) —
  //    새 배포를 만들면 이 주소가 바뀌어 이미 나간 링크가 전부 죽는다.
  var EXEC = 'https://script.google.com/macros/s/AKfycbygZNlsIPKH8bDvVuWjejdd4eb_6KbG3fxh4Jg-Ju-CGIWIAeAaqNwGmwE_M41eNwjx/exec';

  // ⛔ 명부를 여기 두지 마라. 2026-08-07 이전엔 학생·교재 fileId 가 이 파일에 박혀
  //    **공개 저장소에 그대로 노출**돼 있었다. 명부는 비공개 시트에 있고, 화면은 GAS 가 그린다.
  // ⛔ 액자에서 GAS 를 fetch 로 부를 수 없다 — CORS 로 전부 막힌다(실기기 크롬 5가지 실측).
  //    그래서 액자가 하는 일은 **토큰을 붙여 iframe 을 띄우는 것**뿐이다.

  function appUrl(token, extra) {
    var u = EXEC + (token ? '?t=' + encodeURIComponent(token) : '');
    return extra ? u + (token ? '&' : '?') + extra : u;
  }

  global.ONF = global.ONF || {};
  global.ONF.api = { EXEC: EXEC, appUrl: appUrl };
})(window);
