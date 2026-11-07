"""Gate 6's table from gpu.mjs's readings (#1777, #1780): per station, calls and
triangles before -> after, and the mean of the two runs' GPU and queued ms at
DPR 1 and at 1.5, before -> after.

    python -I docs/screenshots/issue-1780/table.py docs/screenshots/issue-1780/gpu no-ray level-ray
"""

import json
import os
import sys

# Windows consoles default to cp1252, which has no arrow.
sys.stdout.reconfigure(encoding="utf-8")
root, before, after = sys.argv[1], sys.argv[2], sys.argv[3]


def runs(label, dpr):
    out = []
    for run in (1, 2):
        path = os.path.join(root, label, f"dpr-{dpr}", f"run-{run}.json")
        out.append({r["name"]: r for r in json.load(open(path, encoding="utf-8"))["readings"]})
    return out


def mean(rs, station, key):
    return sum(r[station][key] for r in rs) / len(rs)


print("| Station | Calls | Triangles | DPR 1 GPU / queued ms | DPR 1.5 GPU / queued ms |")
print("| --- | --- | --- | --- | --- |")
for station in ("opening-pose", "home", "survey"):
    cells = []
    for dpr in ("1", "1.5"):
        b, a = runs(before, dpr), runs(after, dpr)
        cells.append(
            f"{mean(b, station, 'gpuMs'):.2f} / {mean(b, station, 'queuedGpuMs'):.2f} → "
            f"{mean(a, station, 'gpuMs'):.2f} / {mean(a, station, 'queuedGpuMs'):.2f}"
        )
    b1, a1 = runs(before, "1")[0][station], runs(after, "1")[0][station]
    print(
        f"| {station} | {b1['calls']} → {a1['calls']} | {b1['triangles']:,} → {a1['triangles']:,} "
        f"| {cells[0]} | {cells[1]} |"
    )
