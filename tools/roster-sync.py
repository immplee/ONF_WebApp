#!/usr/bin/env python3
"""ONF 학생명부 시트 채우기 — 노션(정본) + 드라이브(교재)를 읽어 명부 시트를 맞춘다.

⛔ 정본은 노션 `재학생 DB` 다. 이 스크립트는 **시트를 노션에 맞추는 한 방향**이다.
   시트를 손으로 고치면 다음 실행에서 덮인다.

⛔ 토큰은 **한 번 발급하면 절대 바꾸지 않는다.** 학생이 이미 홈 화면에 저장한 링크가 죽는다.
   그래서 기존 줄의 토큰은 항상 재사용하고, 없을 때만 새로 만든다.
   ⛔ 재사용 기준은 **노션 행 ID**다(2026-08-09). 예전엔 한글 이름이었는데, 그러면
     **노션에서 이름을 고치는 순간 새 사람으로 보여 새 토큰이 나가고 학생 링크가 죽었다.**
     노션 행 ID 는 이름을 바꿔도 안 변한다. (옛 줄을 위해 이름 기준 폴백도 함께 본다)

쓰기 전에 무엇이 바뀌는지 보려면 인자 없이(=미리보기), 실제로 쓰려면 `--write`.
"""
import json, re, secrets, subprocess, sys
from datetime import datetime, timezone, timedelta

ROSTER_ID = '1yPblc_rO1tDcbgpORDNFxqFtxS4X9FJM5n1vNV0eSmo'   # ONF_학생명부 (비공개)
ROSTER_TAB = '명부'
TEACHER_ROOT = '1BB0KWRbsy7xAEx8yzjCGM9ejp8WE1WXz'            # ONF_수업_재학생
STUDENT_DS = '30bd6a62-96ae-8027-82cd-000b946cdac6'           # 노션 재학생 DB
NTNW = '/Users/peter/ONF_SlackBot/bin/ntnw'

# 노션 `수강 상태` 실물 8종: 수강 · 보강 · 완료 · 졸업 · 휴강 · 종료 · 환불 · 테스트
#
#   [2026-08-09 Peter] **모든 상태를 명부에 싣는다.** 예전엔 활성만 싣고 나머지는 통째로 뺐는데,
#   그러면 두 가지가 어긋났다:
#     ① 잠깐 쉬는 학생(휴강)이 명부에서 사라져 홈이 죽었다 — 지난 교재는 볼 수 있어야 한다.
#     ② 졸업생 교재는 **막고 싶은데 못 막았다** — 명부에 없으면 웹앱이 이름 규칙 폴백으로
#       그냥 열어 준다(ONF_Roster.js 의 허용 규칙 ③). 막으려면 명부에 **있어야** 한다.
#   → 이제 전부 싣고, 웹앱이 `수강상태` 열을 보고 판단한다.
ACTIVE = {'수강', '보강', '휴강'}          # 교재를 볼 수 있다
BLOCKED = {'졸업', '종료', '완료', '환불', '테스트'}   # 수업이 끝났다 — 교재를 막는다

HEADERS = ['토큰', '한글이름', '영어이름', '담당선생님', '수강상태',
           '교재fileId', '교재시트', '교재제목', '노션행ID', '발급일']

# 헷갈리는 글자(0 O 1 I l)는 뺀다 — 학생이 손으로 옮겨 적을 수도 있다.
ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
FOLDER_PAT = re.compile(r'^ONF_(.+?)_(.+?)\((.+?)님\)(?:_(\d+))?$')


def new_token(n=12):
    return ''.join(secrets.choice(ALPHABET) for _ in range(n))


class SyncError(RuntimeError):
    """사람이 읽고 바로 조치할 수 있는 실패. 여기서 멈추면 시트는 손대지 않은 상태다."""


# ⛔ [2026-08-10] 도구가 멈추면 **왜 멈췄는지**를 문구에 담는다.
#   실측: 맥 키체인이 '접근을 허용하시겠습니까' 창을 띄우면 `security` 가 그 자리에서 멈추고,
#   화면을 아무도 안 보고 있으면 그대로 타임아웃까지 간다. 봇의 정기 동기화가 3:18·7:57·12:32
#   모두 정확히 120초에서 죽은 게 이것이었다. 종전 문구엔 원인이 한 글자도 없었다.
def _run(cmd, timeout=90):
    # ⛔ [2026-08-11] `stdin=DEVNULL` 이 이 함수의 핵심이다. 빼면 봇에서 90초 멈췄다 실패한다.
    #   원인(스택 추적으로 확증): `ntn api` 는 `-d` 없이 부르면 **stdin 에서 본문을 읽는다**
    #     ntn::commands::api::read_input → StdinLock::read_to_string → read(2)
    #   셸에서는 stdin 이 /dev/null 이라 즉시 EOF → 0초에 끝난다. 그런데 봇은
    #     node execFile(python3) → subprocess.run(...) → bin/ntnw → ntn
    #   이고, node 의 execFile 은 자식 stdin 을 **파이프로 열어 둔 채 안 닫는다.**
    #   subprocess.run 은 stdin 을 그대로 물려주므로 ntn 이 그 파이프를 읽다 **영영 안 끝난다.**
    #   ⚠️ 이걸 4일 동안 '키체인 문제'로 오해했다(실패가 전부 90~120초라 그럴듯했다).
    #     키체인·gws 인증·네트워크 전부 정상이었다 — 대조군 `node → curl` 은 0.2초였다.
    try:
        return subprocess.run(cmd, capture_output=True, text=True,
                              stdin=subprocess.DEVNULL, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise SyncError(
            f"`{cmd[0]}` 가 {timeout}초 안에 안 끝났어요. "
            "그 명령을 셸에서 직접 쳐 보세요 — 셸에선 되고 봇에서만 멈춘다면 "
            "자식 프로세스가 stdin 을 기다리는 것입니다(_run 의 stdin=DEVNULL 주석 참고).")


def gws(args, params=None, body=None):
    cmd = ['gws'] + args
    if params is not None:
        cmd += ['--params', json.dumps(params, ensure_ascii=False)]
    if body is not None:
        cmd += ['--json', json.dumps(body, ensure_ascii=False)]
    p = _run(cmd)
    out = p.stdout
    i = out.find('{')
    # ⛔ 종전엔 여기서 조용히 `{}` 를 돌려줬다. 그래서 인증이 끊겨 401 이 와도
    #   "드라이브에 학생이 하나도 없다 / 명부가 비어 있다" 로 읽혔고, 그 상태로 --write 가 돌면
    #   **전 학생 토큰이 새로 발급돼 학생이 저장해 둔 홈 링크가 전부 죽는다**(이 파일 머리말의 그 사고).
    #   조용한 빈손은 이 스크립트에서 가장 비싼 실패다 — 반드시 시끄럽게 죽는다.
    if i < 0:
        raise SyncError(f"gws {' '.join(args)} 가 JSON 을 안 줬어요: "
                        + (p.stderr or out or '(빈 응답)').strip()[:200])
    d = json.loads(out[i:])
    if isinstance(d, dict) and d.get('error'):
        e = d['error'] if isinstance(d['error'], dict) else {'message': str(d['error'])}
        hint = ''
        if str(e.get('code')) == '401' or 'credential' in str(e.get('message', '')).lower():
            hint = "\n   → `gws auth login` 으로 구글 로그인을 다시 해야 해요(지금 auth_method=none)."
        raise SyncError(f"gws {' '.join(args)} 실패 [{e.get('code', '?')}] "
                        + str(e.get('message', ''))[:200] + hint)
    return d


def children(fid):
    q = {'q': f"'{fid}' in parents and trashed=false", 'fields': 'files(id,name,mimeType)'}
    return gws(['drive', 'files', 'list'], q).get('files', [])


def notion_students():
    r = _run([NTNW, 'api', f'/v1/data_sources/{STUDENT_DS}/query', '-d', '{"page_size":100}'])
    out = r.stdout
    if not out.strip():
        raise SyncError('노션이 빈 응답을 줬어요: ' + (r.stderr or '(stderr 도 비어 있음)').strip()[:200])
    rows = {}
    for p in json.loads(out).get('results', []):
        pr = p['properties']

        def val(k):
            v = pr.get(k, {})
            a = v.get('title') or v.get('rich_text') or []
            if a:
                return ''.join(x.get('plain_text', '') for x in a)
            return (v.get('select') or {}).get('name', '')

        kor = val('한글 이름')
        if not kor:
            continue
        # ⛔ [2026-08-11] 키가 **노션 행 ID** 다. 예전엔 한글 이름이었는데, 그러면
        #   동명이인의 뒤 행이 앞 행을 덮어 **두 학생이 한 사람으로 합쳐졌다.**
        #   그 뒤 drive 루프가 두 폴더 모두에 같은 rowId 를 물려 **같은 토큰**을 발급했고,
        #   토큰이 같으면 학생 웹앱에서 **서로의 교재가 열린다**(주소가 곧 신분증이라서).
        rows[p['id']] = {'kor': kor, 'eng': val('영어 이름'),
                         'status': val('수강 상태'), 'rowId': p['id']}
    return rows


def match_notion(notion, kor, eng):
    """드라이브 학생 폴더 → 노션 행 하나. `(info, 왜 못 찾았나)` 를 돌려준다.

    ⛔ 애매하면 **추측하지 않는다.** 기계가 둘 중 하나를 골라 버리면 그게 조용한 오답이고,
       여기서 잘못 고르면 남의 토큰이 나가 교재가 서로 열린다.
    ⚠️ 이름이 유일하면 **영어 이름을 안 본다** — 실물에 `ONF_Peter_(홍길동님)` 처럼
       영문 자리가 빈 폴더가 있어서, (이름,영문) 을 항상 키로 쓰면 매칭이 끊겨 홈이 죽는다.
    """
    same = [v for v in notion.values() if v['kor'] == kor]
    if len(same) == 1:
        return same[0], ''
    if not same:
        return None, '노션 재학생 DB 에 없음'
    byeng = [v for v in same if v['eng'] and v['eng'] == eng]
    if len(byeng) == 1:
        return byeng[0], ''
    return None, (f"노션에 '{kor}' 이 {len(same)}명인데 영어 이름('{eng or '빈칸'}')으로도 "
                  "못 가렸어요 — 어느 쪽인지 몰라 건너뜁니다. "
                  "노션에서 영어 이름을 서로 다르게 넣어 주세요")


def drive_students():
    """학생 폴더 → 그 안의 교재 스프레드시트 목록."""
    found = []
    for teacher in children(TEACHER_ROOT):
        if teacher['mimeType'] != 'application/vnd.google-apps.folder':
            continue
        for st in children(teacher['id']):
            if st['mimeType'] != 'application/vnd.google-apps.folder':
                continue
            m = FOLDER_PAT.match(st['name'])
            if not m:
                print(f"  ⚠️ 이름 규칙에 안 맞는 폴더라 건너뜀: {st['name']}")
                continue
            books = []
            for drama in children(st['id']):
                if drama['mimeType'] != 'application/vnd.google-apps.folder':
                    continue
                for season in children(drama['id']):
                    if season['mimeType'] != 'application/vnd.google-apps.folder':
                        continue
                    for f in children(season['id']):
                        if f['mimeType'] == 'application/vnd.google-apps.spreadsheet':
                            books.append({'id': f['id'], 'name': f['name']})
            found.append({'teacher': m.group(1), 'eng': m.group(2), 'kor': m.group(3),
                          'books': books})
    return found


def first_episode(file_id):
    """교재 파일에서 첫 회차 탭 이름. ONF_ 로 시작하는 내부 탭은 회차가 아니다."""
    d = gws(['sheets', 'spreadsheets', 'get'],
            {'spreadsheetId': file_id, 'fields': 'sheets.properties.title'})
    for s in d.get('sheets', []):
        t = s['properties']['title']
        if not t.startswith('ONF_'):
            return t
    return ''


def book_title(name):
    """파일명에서 학생 부분을 떼고 사람이 읽을 제목만 남긴다."""
    m = re.match(r'^ONF_.+?_.+?\(.+?님\)_(.+)$', name)
    return (m.group(1) if m else name).replace('_', ' ')


def read_roster():
    d = gws(['sheets', 'spreadsheets', 'values', 'get'],
            {'spreadsheetId': ROSTER_ID, 'range': f'{ROSTER_TAB}!A2:J'})
    return d.get('values', [])


def main():
    write = '--write' in sys.argv
    notion = notion_students()
    drive = drive_students()
    existing = read_roster()

    # 기존 토큰 재사용 — 한 학생은 교재가 몇이든 토큰 하나.
    #   ⛔ 기준은 **노션 행 ID**(I열). 이름은 바뀌지만 행 ID 는 안 바뀐다.
    #   옛 줄엔 행 ID 가 비어 있을 수 있어 폴백을 둘 둔다(이행용):
    #     ① (한글이름, 영어이름) — 동명이인도 가른다
    #     ② 한글이름 단독 — ⛔ **그 이름에 토큰이 하나뿐일 때만.**
    #        동명이인이면 앞사람 토큰을 뒷사람에게 물려줘 둘이 같은 토큰을 갖게 된다.
    by_row, by_pair, by_name = {}, {}, {}
    toks_of_name = {}
    for r in existing:
        tok = r[0] if len(r) >= 1 else ''
        if not tok:
            continue
        kor = r[1] if len(r) >= 2 else ''
        eng = r[2] if len(r) >= 3 else ''
        if len(r) >= 9 and r[8]:
            by_row.setdefault(r[8], tok)
        if kor and eng:
            by_pair.setdefault((kor, eng), tok)
        if kor:
            toks_of_name.setdefault(kor, set()).add(tok)
    for kor, ts in toks_of_name.items():
        if len(ts) == 1:
            by_name[kor] = next(iter(ts))

    by_row_before = dict(by_row)          # 쓰기 직전 대조용 — 여기 있던 토큰은 절대 안 바뀐다

    def token_for(row_id, kor, eng):
        return (by_row.get(row_id) or by_pair.get((kor, eng))
                or by_name.get(kor) or new_token())

    today = datetime.now(timezone(timedelta(hours=9))).strftime('%Y-%m-%d')
    rows, skipped = [], []

    for st in drive:
        info, why = match_notion(notion, st['kor'], st['eng'])
        if not info:
            skipped.append(f"{st['kor']}: {why}")
            continue
        tok = token_for(info['rowId'], st['kor'], info['eng'] or st['eng'])
        by_row[info['rowId']] = tok
        by_pair[(st['kor'], info['eng'] or st['eng'])] = tok
        if info['status'] in BLOCKED:
            skipped.append(f"{st['kor']}: 수강상태 '{info['status']}' — 명부엔 싣되 교재는 막힌다")
        elif info['status'] not in ACTIVE:
            skipped.append(f"{st['kor']}: 처음 보는 수강상태 '{info['status']}' — 안전하게 열어 둔다")
        eng = info['eng'] or st['eng']
        if not st['books']:
            rows.append([tok, st['kor'], eng, st['teacher'], info['status'],
                         '', '', '', info['rowId'], today])
            continue
        for b in st['books']:
            rows.append([tok, st['kor'], eng, st['teacher'], info['status'],
                         b['id'], first_episode(b['id']), book_title(b['name']),
                         info['rowId'], today])

    # 노션엔 있는데 드라이브 폴더가 없는 학생 — 교재 없이 줄만 만든다(홈은 열려야 한다).
    #   ⛔ 기준이 **행 ID** 다. 이름으로 세면 동명이인 중 한 명만 폴더가 있을 때
    #     나머지 한 명이 "이미 처리됨"으로 걸려 **줄 자체가 안 만들어졌다.**
    seen = {r[8] for r in rows if r[8]}
    for row_id, info in notion.items():
        if row_id in seen:
            continue
        tok = token_for(row_id, info['kor'], info['eng'])
        rows.append([tok, info['kor'], info['eng'], '', info['status'],
                     '', '', '', row_id, today])
        skipped.append(f"{info['kor']}: 드라이브 학생 폴더 없음 (교재 없이 줄만 만듦)")

    print(f"명부에 넣을 줄 {len(rows)}개")
    for r in rows:
        print('  ', ' | '.join(x if x else '-' for x in r[:8]))
    if skipped:
        print('건너뛰거나 주의할 것:')
        for s in skipped:
            print('  ', s)

    # ⛔ 마지막 그물. 이 스크립트의 실패는 **되돌릴 수 없는 종류**(토큰 재발급 = 학생 링크 영구 사망)다.
    #   ⚠️ [2026-08-11] 그물을 `--write` 앞으로 옮겼다 — 뒤에 있으면 **미리보기는 "괜찮다"고 하고
    #     실제 쓰기에서만 터진다.** 미리보기의 존재 이유가 그걸 미리 보는 것인데 정작 못 봤다.
    if not rows:
        raise SyncError('명부에 넣을 줄이 0개예요 — 시트를 비우지 않으려고 멈춥니다.')

    # ⛔ [2026-08-11] 이 그물이 이 파일에서 가장 중요하다 — **토큰 하나 = 학생 하나**.
    #   토큰이 서로 다른 두 학생에게 붙으면 주소를 아는 쪽이 상대의 교재를 연다(주소가 곧 신분증).
    #   위 매칭 규칙이 나중에 어떻게 바뀌든, 그게 깨지면 **시트에 닿기 전에** 여기서 멈춘다.
    owner = {}
    for r in rows:
        tok, rid, kor = r[0], r[8], r[1]
        if tok in owner and owner[tok][0] != rid:
            raise SyncError(
                f"토큰 {tok} 이 서로 다른 학생 둘에게 붙었어요 — 멈춥니다.\n"
                f"   {owner[tok][1]}({owner[tok][0][:8]}…) 와 {kor}({rid[:8]}…)\n"
                "   (그대로 쓰면 한쪽 주소로 다른 학생의 교재가 열립니다.)")
        owner[tok] = (rid, kor)

    # ⛔ 이미 발급된 토큰은 **절대 안 바뀐다.** 종전 그물은 '전원 새 토큰'만 잡아서
    #   한두 명만 바뀌는 부분 재발급은 그대로 통과했다 — 그 한 명의 링크는 영구히 죽는다.
    moved = [f"{r[1]}: {by_row_before[r[8]]} → {r[0]}"
             for r in rows if r[8] and r[8] in by_row_before and by_row_before[r[8]] != r[0]]
    if moved:
        raise SyncError('이미 발급된 토큰이 바뀌려 했어요 — 멈춥니다. '
                        '(학생이 저장해 둔 홈 링크가 죽어요)\n   ' + '\n   '.join(moved[:5]))

    if existing and len(existing) > 1:
        old_tokens = {r[0] for r in existing if r and r[0]}
        fresh = {r[0] for r in rows} - old_tokens
        if fresh and len(fresh) == len({r[0] for r in rows}):
            raise SyncError(
                f'기존 명부에 줄이 {len(existing)}개 있는데 **전원 새 토큰**이 나가려 했어요 — 멈춥니다.\n'
                '   (명부를 못 읽은 채 다시 쓰려는 신호예요. 그대로 쓰면 학생이 저장해 둔 홈 링크가 전부 죽어요.)')

    if not write:
        print('\n✅ 안전 검사 통과. 미리보기만 했다 — 실제로 쓰려면 --write')
        return

    gws(['sheets', 'spreadsheets', 'values', 'clear'],
        {'spreadsheetId': ROSTER_ID, 'range': f'{ROSTER_TAB}!A2:J'}, body={})
    gws(['sheets', 'spreadsheets', 'values', 'update'],
        {'spreadsheetId': ROSTER_ID, 'range': f'{ROSTER_TAB}!A1:J{len(rows) + 1}',
         'valueInputOption': 'RAW'},
        body={'values': [HEADERS] + rows})
    print('\n명부 시트에 썼다.')


if __name__ == '__main__':
    # ⛔ 트레이스백을 내보내지 않는다 — 봇은 stderr 앞 400자만 슬랙에 싣는다.
    #   트레이스백이면 그 400자가 파일 경로로 다 차서 **원인이 한 글자도 안 보인다**(실제로 그랬다).
    try:
        main()
    except SyncError as e:
        print(f'❌ {e}', file=sys.stderr)
        sys.exit(1)
