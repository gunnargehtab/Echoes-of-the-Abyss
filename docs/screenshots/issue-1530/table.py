"""Table #1530's gate-6 readings: queued avgGpuMs per station, before and after,
two runs each, with calls and triangles. Reads the run directory gate6.sh
wrote (default .dev-loop/g6-1530) and writes table.md into it.

    python -I docs/screenshots/issue-1530/table.py [run-dir]"""
import io, json, os, sys
from collections import defaultdict

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join('.dev-loop', 'g6-1530')
rows = defaultdict(lambda: defaultdict(list))  # (map, station, dpr) -> rev -> [(q, u, calls, tris)]
problems = []
for d in sorted(os.listdir(ROOT)):
    p = os.path.join(ROOT, d)
    if not os.path.isdir(p):
        continue
    name, rev, dpr, run = d.split('-')
    dpr = dpr[3:]
    if name == 'fight':
        f = os.path.join(p, 'fight.json')
        if not os.path.exists(f):
            problems.append(d); continue
        r = json.load(io.open(f, encoding='utf-8'))
        if 'GTX 1070' not in r['renderer']:
            problems.append(d + ' renderer')
        q, u = r['queued'], r['unqueued']
        rows[('ventfront', 'fight', dpr)][rev].append((q['gpuMs'], u['gpuMs'], q['calls'], q['triangles']))
        continue
    f = os.path.join(p, 'readings.json')
    if not os.path.exists(f):
        problems.append(d); continue
    r = json.load(io.open(f, encoding='utf-8'))
    if r.get('software') or not r.get('unpaced') or 'GTX 1070' not in r['renderer']:
        problems.append(d + ' not a gpu reading')
    if r.get('overBudget'):
        problems.append(d + ' over budget')
    for s in r['readings']:
        pr, q = s['probe'], s.get('queued') or {}
        rows[(name, s['name'], dpr)][rev].append(
            (q.get('gpuMs'), pr['avgGpuMs'], pr['drawCalls'], pr['triangles']))

def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None

def fmt(xs):
    return ' / '.join('—' if x is None else f'{x:.2f}' for x in xs)

out = ['| Map | Station | Ratio | Queued ms before | Queued ms after | Δ mean | Calls b→a | Triangles b→a |',
       '| --- | --- | --- | --- | --- | --- | --- | --- |']
order = {'home': 0, 'close': 1, 'low': 2, 'survey': 3, 'fight': 4}
for key in sorted(rows, key=lambda k: (k[0] != 'ventfront', order.get(k[1], 9), k[2])):
    b, a = rows[key].get('before', []), rows[key].get('after', [])
    qb, qa = [x[0] for x in b], [x[0] for x in a]
    mb, ma = mean(qb), mean(qa)
    delta = '—' if mb is None or ma is None else f'{ma - mb:+.2f}'
    cb = sorted({x[2] for x in b}); ca = sorted({x[2] for x in a})
    tb = sorted({round(x[3] / 1000) for x in b}); ta = sorted({round(x[3] / 1000) for x in a})
    out.append(f'| {key[0].capitalize()} | {key[1]} | {key[2]} | {fmt(qb)} | {fmt(qa)} | {delta} | '
               f'{"/".join(map(str, cb))} → {"/".join(map(str, ca))} | '
               f'{"/".join(map(str, tb))} k → {"/".join(map(str, ta))} k |')
out.append('')
out.append('Unqueued ms (before / after, mean):')
for key in sorted(rows, key=lambda k: (k[0] != 'ventfront', order.get(k[1], 9), k[2])):
    b, a = rows[key].get('before', []), rows[key].get('after', [])
    ub, ua = mean([x[1] for x in b]), mean([x[1] for x in a])
    out.append(f'- {key[0]} {key[1]} {key[2]}: {ub if ub is None else round(ub, 2)} / {ua if ua is None else round(ua, 2)}')
out.append('')
out.append('Problems: ' + (', '.join(problems) if problems else 'none'))
io.open(os.path.join(ROOT, 'table.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('written', len(rows), 'rows;', len(problems), 'problems')
