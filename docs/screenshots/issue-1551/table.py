"""Table #1551's gate-6 readings: queued avgGpuMs per Ventfront station, before and
after #1536, two runs each, with calls and triangles. Reads the run directory
gate6.sh wrote (default .dev-loop/g6-1551) and writes table.md into it.

    python -I docs/screenshots/issue-1551/table.py [run-dir]"""
import io, json, os, sys
from collections import defaultdict

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join('.dev-loop', 'g6-1551')
rows = defaultdict(lambda: defaultdict(list))  # (station, dpr) -> rev -> [(q, u, calls, tris)]
problems = []
for d in sorted(os.listdir(ROOT)):
    p = os.path.join(ROOT, d)
    if not os.path.isdir(p):
        continue
    _, rev, dpr, run = d.split('-')
    dpr = dpr[3:]
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
        rows[(s['name'], dpr)][rev].append(
            (q.get('gpuMs'), pr['avgGpuMs'], pr['drawCalls'], pr['triangles']))

def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None

def fmt(xs):
    return ' / '.join('—' if x is None else f'{x:.2f}' for x in xs)

def span(xs, k=1):
    xs = sorted({round(x / k) for x in xs})
    return str(xs[0]) if len(xs) == 1 else f'{xs[0]}–{xs[-1]}'

out = ['| Station | Ratio | Before | After | Δ mean | Calls | Triangles |',
       '| --- | --- | --- | --- | --- | --- | --- |']
order = {'home': 0, 'close': 1, 'low': 2, 'survey': 3}
keys = sorted(rows, key=lambda k: (order.get(k[0], 9), k[1]))
for key in keys:
    b, a = rows[key].get('before', []), rows[key].get('after', [])
    qb, qa = [x[0] for x in b], [x[0] for x in a]
    mb, ma = mean(qb), mean(qa)
    delta = '—' if mb is None or ma is None else f'{ma - mb:+.2f}'
    calls = f'{span([x[2] for x in b])} → {span([x[2] for x in a])}'
    tris = f'{span([x[3] for x in b], 1000)} k → {span([x[3] for x in a], 1000)} k'
    out.append(f'| {key[0]} | {key[1]} | {fmt(qb)} | {fmt(qa)} | {delta} | {calls} | {tris} |')
out.append('')
out.append('Unqueued ms (before / after, mean):')
for key in keys:
    b, a = rows[key].get('before', []), rows[key].get('after', [])
    ub, ua = mean([x[1] for x in b]), mean([x[1] for x in a])
    out.append(f'- {key[0]} {key[1]}: {ub if ub is None else round(ub, 2)} / {ua if ua is None else round(ua, 2)}')
out.append('')
out.append('Problems: ' + (', '.join(problems) if problems else 'none'))
io.open(os.path.join(ROOT, 'table.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('written', len(rows), 'rows;', len(problems), 'problems')
