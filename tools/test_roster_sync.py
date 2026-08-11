#!/usr/bin/env python3
"""roster-sync 의 되돌릴 수 없는 부분만 테스트한다 — 토큰 배정.

⛔ 여기가 틀리면 학생 링크가 영구히 죽거나(재발급), 남의 교재가 열린다(토큰 공유).
   네트워크는 안 탄다 — 노션/드라이브/시트는 전부 손으로 만든 값이다.

    python3 test_roster_sync.py
"""
import importlib.util, pathlib, sys

_p = pathlib.Path(__file__).with_name('roster-sync.py')
_spec = importlib.util.spec_from_file_location('roster_sync', _p)
rs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rs)

FAIL = []


def check(name, cond, extra=''):
    print(('  ✅ ' if cond else '  ❌ ') + name + (('  → ' + extra) if extra and not cond else ''))
    if not cond:
        FAIL.append(name)


def notion(*people):
    """people: (rowId, kor, eng, status)"""
    return {r: {'kor': k, 'eng': e, 'status': s, 'rowId': r} for r, k, e, s in people}


print('\n[match_notion — 드라이브 폴더를 노션 행에 잇기]')

N1 = notion(('r1', '홍길동', 'Gil', '수강'))
info, why = rs.match_notion(N1, '홍길동', 'Gil')
check('이름이 유일하면 찾는다', info and info['rowId'] == 'r1')

# ⚠️ 실물에 `ONF_Peter_(홍길동님)` 처럼 영문 자리가 빈 폴더가 있다.
info, why = rs.match_notion(N1, '홍길동', '')
check('이름이 유일하면 영문이 비어도 찾는다(홈이 죽으면 안 된다)', info and info['rowId'] == 'r1')
info, why = rs.match_notion(N1, '홍길동', 'Gill')
check('이름이 유일하면 영문이 달라도 찾는다', info and info['rowId'] == 'r1')

N2 = notion(('r1', '홍길동', 'Gil', '수강'), ('r2', '홍길동', 'Dong', '수강'))
a, _ = rs.match_notion(N2, '홍길동', 'Gil')
b, _ = rs.match_notion(N2, '홍길동', 'Dong')
check('동명이인은 영문으로 갈린다', a and b and a['rowId'] == 'r1' and b['rowId'] == 'r2',
      f'{a and a["rowId"]} / {b and b["rowId"]}')

N3 = notion(('r1', '홍길동', 'Gil', '수강'), ('r2', '홍길동', 'Gil', '수강'))
info, why = rs.match_notion(N3, '홍길동', 'Gil')
check('영문까지 같으면 ⛔ 추측하지 않고 건너뛴다', info is None)
check('  그리고 왜 건너뛰는지 사람 말로 말한다', '2명' in why and '영어 이름' in why, why)

info, why = rs.match_notion(N1, '없는사람', 'Nobody')
check('노션에 없으면 없다고 한다', info is None and '없음' in why, why)


print('\n[토큰 배정 — 되돌릴 수 없는 자리]')


def assign(existing_rows, notion_map, drive_folders):
    """main() 의 토큰 배정 부분만 그대로 재현한다(네트워크 없이)."""
    by_row, by_pair, by_name, toks_of_name = {}, {}, {}, {}
    for r in existing_rows:
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

    def token_for(row_id, kor, eng):
        return (by_row.get(row_id) or by_pair.get((kor, eng))
                or by_name.get(kor) or rs.new_token())

    out = []
    for kor, eng in drive_folders:
        info, why = rs.match_notion(notion_map, kor, eng)
        if not info:
            continue
        tok = token_for(info['rowId'], kor, info['eng'] or eng)
        by_row[info['rowId']] = tok
        by_pair[(kor, info['eng'] or eng)] = tok
        out.append({'tok': tok, 'kor': kor, 'rowId': info['rowId']})
    return out


OLD = [['TOKEN_GIL', '홍길동', 'Gil', 'Peter', '수강', 'f1', 'E1', 'B', 'r1', '2026-08-01']]

r = assign(OLD, N1, [('홍길동', 'Gil')])
check('기존 학생은 토큰을 그대로 쓴다', r[0]['tok'] == 'TOKEN_GIL', r[0]['tok'])

r = assign(OLD, N1, [('홍길동', '')])
check('폴더 영문이 비어도 토큰을 그대로 쓴다', r[0]['tok'] == 'TOKEN_GIL', r[0]['tok'])

# ⛔ 이게 이 파일이 존재하는 이유다.
r = assign([], N2, [('홍길동', 'Gil'), ('홍길동', 'Dong')])
check('⛔ 동명이인 둘이 서로 다른 토큰을 받는다', len({x['tok'] for x in r}) == 2,
      str([x['tok'] for x in r]))
check('  그리고 서로 다른 노션 행에 붙는다', len({x['rowId'] for x in r}) == 2)

# 옛 줄(행 ID 없음)에 동명이인이 섞이면 이름 폴백이 앞사람 토큰을 물려주면 안 된다
OLD_NOID = [['TOKEN_A', '홍길동', 'Gil', 'Peter', '수강', 'f1', 'E1', 'B', '', '2026-08-01'],
            ['TOKEN_B', '홍길동', 'Dong', 'Peter', '수강', 'f2', 'E1', 'C', '', '2026-08-01']]
r = assign(OLD_NOID, N2, [('홍길동', 'Gil'), ('홍길동', 'Dong')])
check('⛔ 행 ID 없는 옛 줄도 (이름,영문) 으로 각자 토큰을 되찾는다',
      {x['tok'] for x in r} == {'TOKEN_A', 'TOKEN_B'}, str([x['tok'] for x in r]))

# 이름 단독 폴백은 그 이름에 토큰이 하나뿐일 때만 산다
r = assign([['TOKEN_A', '홍길동', '', 'Peter', '수강', 'f1', 'E1', 'B', '', '2026-08-01']],
           N1, [('홍길동', 'Gil')])
check('이름이 유일하면 이름 단독 폴백이 산다(옛 줄 이행)', r[0]['tok'] == 'TOKEN_A', r[0]['tok'])


print('\n[쓰기 직전 그물]')


def net(rows, before):
    owner = {}
    for r in rows:
        tok, rid = r[0], r[8]
        if tok in owner and owner[tok] != rid:
            return '토큰공유'
        owner[tok] = rid
    if [r for r in rows if r[8] and r[8] in before and before[r[8]] != r[0]]:
        return '토큰변경'
    return 'ok'


check('토큰 하나가 두 학생에게 붙으면 멈춘다',
      net([['T', '홍길동', '', '', '', '', '', '', 'r1', ''],
           ['T', '홍길동', '', '', '', '', '', '', 'r2', '']], {}) == '토큰공유')
check('이미 발급된 토큰이 바뀌려 하면 멈춘다',
      net([['NEW', '홍길동', '', '', '', '', '', '', 'r1', '']], {'r1': 'OLD'}) == '토큰변경')
check('정상이면 통과한다',
      net([['A', '홍길동', '', '', '', '', '', '', 'r1', ''],
           ['A', '홍길동', '', '', '', '', '', '', 'r1', ''],
           ['B', '김철수', '', '', '', '', '', '', 'r2', '']], {'r1': 'A'}) == 'ok')

print()
if FAIL:
    print(f'❌ {len(FAIL)}개 실패: ' + ', '.join(FAIL))
    sys.exit(1)
print('✅ 전부 통과')
