"""#1683's escort pair: two pair.mjs frames compared per pixel on the hulls.

Own units carry a session's own ids, so the halves pair them in order, the
name and position held equal. For each unit on screen in both, the box is
the union of its two screen boxes (CSS pixels times the frame's ratio),
clamped to the frame. Inside it only hull pixels count, where either half's
`-hulls.png` (the study's per-material mask) is set: the box also holds the
ground behind the hull, which takes the study's grade. The reading is the
hull pixels that differ and the largest channel difference among them.

    python -I compare.py <dir> e-C-on e-C-off
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops

root, on_tag, off_tag = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
on = json.loads((root / f"{on_tag}.json").read_text(encoding="utf-8"))
off = json.loads((root / f"{off_tag}.json").read_text(encoding="utf-8"))
a = Image.open(root / on["frame"]).convert("RGB")
b = Image.open(root / off["frame"]).convert("RGB")
assert a.size == b.size
diff = ImageChops.difference(a, b)
hull_a = Image.open(root / on["hulls"]).convert("L")
hull_b = Image.open(root / off["hulls"]).convert("L")
dpr = on["dpr"]


def read(box):
    d = diff.crop(box).tobytes()
    ha = hull_a.crop(box).tobytes()
    hb = hull_b.crop(box).tobytes()
    either = both = changed = changed_both = top = 0
    for i in range(len(ha)):
        if not (ha[i] or hb[i]):
            continue
        either += 1
        delta = max(d[3 * i], d[3 * i + 1], d[3 * i + 2])
        if delta > 0:
            changed += 1
            top = max(top, delta)
        if ha[i] and hb[i]:
            both += 1
            if delta > 0:
                changed_both += 1
    return {
        "box": list(box),
        "hullPixels": either,
        "hullPixelsInBoth": both,
        "changed": changed,
        "changedInBoth": changed_both,
        "maxDiff": top,
    }


assert len(on["units"]) == len(off["units"])
rows = []
for u, v in zip(on["units"], off["units"]):
    assert u["name"] == v["name"] and abs(u["xM"] - v["xM"]) < 1 and abs(u["zM"] - v["zM"]) < 1, (u, v)
    if u["screen"] is None or v["screen"] is None:
        continue
    s, t = u["screen"], v["screen"]
    box = tuple(
        round(c * dpr)
        for c in (min(s["x0"], t["x0"]), min(s["y0"], t["y0"]), max(s["x1"], t["x1"]), max(s["y1"], t["y1"]))
    )
    box = (max(0, box[0]), max(0, box[1]), min(a.width, box[2]), min(a.height, box[3]))
    if box[0] >= box[2] or box[1] >= box[3]:
        continue
    rows.append({"ids": [u["id"], v["id"]], "name": u["name"], "restSig": [u["restSig"], v["restSig"]], **read(box)})

print(
    json.dumps(
        {
            "on": on_tag,
            "off": off_tag,
            "ticks": [on["readingTick"], off["readingTick"]],
            "motes": [on["motes"], off["motes"]],
            "renderer": on["renderer"],
            "units": rows,
        },
        indent=2,
    )
)
