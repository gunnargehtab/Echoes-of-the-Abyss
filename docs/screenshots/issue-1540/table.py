"""Table #1540's gate-6 readings beside #1463's: every held view and transition
of docs/screenshots/issue-1463/world.mjs, its calls and triangles, and GPU
time (queued for a held view, the transition's average for a transition), at
ratios 1 and 1.5. Reads readings-1.json and readings-1.5.json from this
directory and #1463's, and writes the tables and the drive's peaks to
.dev-loop/1540-table.md. Run from the repo root.

    python -I docs/screenshots/issue-1540/table.py"""
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(HERE, '..', 'issue-1463')

def load(d, ratio):
    return json.load(io.open(os.path.join(d, f'readings-{ratio}.json'), encoding='utf-8'))

out = []
for ratio in ('1', '1.5'):
    old = {r['station']: r for r in load(OLD, ratio) if 'station' in r}
    new = load(HERE, ratio)
    out += [f'### Ratio {ratio}', '',
            '| Station | Calls, #1463 → now | Triangles, #1463 → now | Props | GPU ms, #1463 → now |',
            '| --- | ---: | ---: | ---: | ---: |']
    peak_calls = peak_tris = 0
    for r in new:
        calls = r.get('maxCalls', r.get('calls'))
        tris = r.get('maxTriangles', r.get('triangles'))
        if calls is not None:
            peak_calls, peak_tris = max(peak_calls, calls), max(peak_tris, tris)
        if 'station' not in r:
            continue
        o = old.get(r['station'], {})
        if r.get('transition'):
            oc, ot = o.get('maxCalls'), o.get('maxTriangles')
            ms = f"{o.get('avgGpuMs')} → {r.get('avgGpuMs')} avg"
            props = ''
        else:
            oc, ot = o.get('calls'), o.get('triangles')
            ms = f"{o.get('queuedGpuMs')} → {r.get('queuedGpuMs')} queued"
            props = f"{o.get('props')} → {r.get('props')}"
        out.append(f"| {r['station']} | {oc} → {calls} | {ot:,} → {tris:,} | {props} | {ms} |"
                   if ot is not None else
                   f"| {r['station']} | {oc} → {calls} | — → {tris:,} | {props} | {ms} |")
    timers = sorted({r.get('gpuTimer') for r in new if r.get('gpuTimer')})
    out += ['', f'Peak over every frame read: {peak_calls} calls, {peak_tris:,} triangles '
            f'(gate 6: 150, 400,000). GPU timers: {", ".join(timers)}.', '']
dest = os.path.join('.dev-loop', '1540-table.md')
io.open(dest, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print('written', dest)
