#!/usr/bin/env python3
"""ONF 학생명부 시트 채우기 — 노션(정본) + 드라이브(교재)를 읽어 명부 시트를 맞춘다.

⛔ 정본은 노션 `재학생 DB` 다. 이 스크립트는 **시트를 노션에 맞추는 한 방향**이다.
   시트를 손으로 고치면 다음 실행에서 덮인다.

⛔ 토큰은 **한 번 발급하면 절대 바꾸지 않는다.** 학생이 이미 홈 화면에 저장한 링크가 죽는다.
   그래서 기존 줄의 토큰은 항상 재사용하고, 없을 때만 새로 만든다.

쓰기 전에 무엇이 바뀌는지 보려면 인자 없이(=미리보기), 실제로 쓰려면 `--write`.
"""
import json, re, secrets, subprocess, sys
from datetime import datetime, timezone, timedelta

ROSTER_ID = '1yPblc_rO1tDcbgpORDNFxqFtxS4X9FJM5n1vNV0eSmo'   # ONF_학생명부 (비공개)
ROSTER_TAB = '명부'
TEACHER_ROOT = '1BB0KWRbsy7xAEx8yzjCGM9ejp8WE1WXz'            # ONF_수업_재학생
STUDENT_DS = '30bd6a62-96ae-8027-82cd-000b946cdac6'           # 노션 재학생 DB
NTNW = '/Users/peter/ONF_SlackBot/bin/ntnw'

# 명부에 넣을 상태. '테스트'·'졸업'·'환불' 등은 뺀다.
ACTIVE = {'수강', '보강', '휴강'}

HEADERS = ['토큰', '한글이름', '영어이름', '담당선생님', '수강상태',
           '교재fileId', '교재시트', '교재제목', '노션행ID', '발급일']

# 헷갈리는 글자(0 O 1 I l)는 뺀다 — 학생이 손으로 옮겨 적을 수도 있다.
ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
FOLDER_PAT = re.compile(r'^ONF_(.+?)_(.+?)\((.+?)님\)(?:_(\d+))?$')


def new_token(n=12):
    return ''.join(secrets.choice(ALPHABET) for _ in range(n))


def gws(args, params=None, body=None):
    cmd = ['gws'] + args
    if params is not None:
        cmd += ['--params', json.dumps(params, ensure_ascii=False)]
    if body is not None:
        cmd += ['--json', json.dumps(body, ensure_ascii=False)]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=120).stdout
    i = out.find('{')
    return json.loads(out[i:]) if i >= 0 else {}


def children(fid):
    q = {'q': f"'{fid}' in parents and trashed=false", 'fields': 'files(id,name,mimeType)'}
    return gws(['drive', 'files', 'list'], q).get('files', [])


def notion_students():
    out = subprocess.run([NTNW, 'api', f'/v1/data_sources/{STUDENT_DS}/query',
                          '-d', '{"page_size":100}'],
                         capture_output=True, text=True, timeout=120).stdout
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
        rows[kor] = {'eng': val('영어 이름'), 'status': val('수강 상태'), 'rowId': p['id']}
    return rows


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

    # 기존 토큰은 학생(한글이름) 기준으로 재사용한다 — 한 학생은 교재가 몇이든 토큰 하나.
    tokens = {}
    for r in existing:
        if len(r) >= 2 and r[0] and r[1]:
            tokens.setdefault(r[1], r[0])

    today = datetime.now(timezone(timedelta(hours=9))).strftime('%Y-%m-%d')
    rows, skipped = [], []

    for st in drive:
        info = notion.get(st['kor'])
        if not info:
            skipped.append(f"{st['kor']}: 노션 재학생 DB 에 없음")
            continue
        if info['status'] not in ACTIVE:
            skipped.append(f"{st['kor']}: 수강상태 '{info['status']}' 라 제외")
            continue
        tok = tokens.get(st['kor']) or new_token()
        tokens[st['kor']] = tok
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
    seen = {r[1] for r in rows}
    for kor, info in notion.items():
        if kor in seen or info['status'] not in ACTIVE:
            continue
        tok = tokens.get(kor) or new_token()
        rows.append([tok, kor, info['eng'], '', info['status'], '', '', '', info['rowId'], today])
        skipped.append(f"{kor}: 드라이브 학생 폴더 없음 (교재 없이 줄만 만듦)")

    print(f"명부에 넣을 줄 {len(rows)}개")
    for r in rows:
        print('  ', ' | '.join(x if x else '-' for x in r[:8]))
    if skipped:
        print('건너뛰거나 주의할 것:')
        for s in skipped:
            print('  ', s)

    if not write:
        print('\n미리보기만 했다. 실제로 쓰려면 --write')
        return

    gws(['sheets', 'spreadsheets', 'values', 'clear'],
        {'spreadsheetId': ROSTER_ID, 'range': f'{ROSTER_TAB}!A2:J'}, body={})
    gws(['sheets', 'spreadsheets', 'values', 'update'],
        {'spreadsheetId': ROSTER_ID, 'range': f'{ROSTER_TAB}!A1:J{len(rows) + 1}',
         'valueInputOption': 'RAW'},
        body={'values': [HEADERS] + rows})
    print('\n명부 시트에 썼다.')


if __name__ == '__main__':
    main()
