"""Lay frames.mjs's before and after sets beside each other, one sheet a quality.

    python3 docs/screenshots/issue-1854/sheet.py <before-dir> <after-dir> <out-dir>

Each of <before-dir> and <after-dir> holds one folder a map, as frames.mjs
wrote it. A row is a family on a map; the columns are the standard palette,
then deuteranopia before and after, then protanopia before and after. Each
cell is the middle of its frame, where frames.mjs aims the family, so the
light itself is large enough to judge. The standard column is the after
set's; `control` below says how far it stands from the before set's.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

CROP = (560, 350)
COLUMNS = [
    ("standard", "after", "standard"),
    ("deuteranopia", "before", "deuteranopia, before"),
    ("deuteranopia", "after", "deuteranopia, after"),
    ("protanopia", "before", "protanopia, before"),
    ("protanopia", "after", "protanopia, after"),
]


def frame(root: Path, name: str) -> Image.Image:
    (path,) = root.glob(f"*-{name}.png")
    image = Image.open(path).convert("RGB")
    w, h = image.size
    left, top = (w - CROP[0]) // 2, (h - CROP[1]) // 2
    return image.crop((left, top, left + CROP[0], top + CROP[1]))


def main() -> None:
    before, after, out = (Path(arg) for arg in sys.argv[1:4])
    out.mkdir(parents=True, exist_ok=True)
    sets = {"before": before, "after": after}
    control = {}
    for quality in ("low", "high"):
        rows = []
        for map_dir in sorted(p for p in after.iterdir() if p.is_dir()):
            readings = json.loads((map_dir / "readings.json").read_text())
            for pose in readings["poses"]:
                rows.append((map_dir.name, pose["family"]))
        label_h = 22
        sheet = Image.new(
            "RGB",
            (CROP[0] * len(COLUMNS), (CROP[1] + label_h) * len(rows)),
            (8, 12, 18),
        )
        draw = ImageDraw.Draw(sheet)
        for r, (map_name, family) in enumerate(rows):
            for c, (palette, which, title) in enumerate(COLUMNS):
                cell = frame(sets[which] / map_name, f"{quality}-{palette}-{family}")
                x, y = c * CROP[0], r * (CROP[1] + label_h)
                sheet.paste(cell, (x, y + label_h))
                draw.text((x + 6, y + 5), f"{family} · {map_name} · {title}", fill=(214, 230, 240))
            # The non-target control: the standard palette, before against after.
            a = frame(before / map_name, f"{quality}-standard-{family}")
            b = frame(after / map_name, f"{quality}-standard-{family}")
            diff = ImageChops.difference(a, b)
            changed = sum(1 for px in diff.getdata() if max(px) > 8)
            control[f"{quality}-{map_name}-{family}"] = {
                "maxChannelDifference": max(hi for _, hi in diff.getextrema()),
                "pixelsOver8": changed,
                "pixels": CROP[0] * CROP[1],
            }
        sheet.save(out / f"{quality}-beside.png", optimize=True)
    (out / "control.json").write_text(json.dumps(control, indent=2) + "\n")
    print(json.dumps(control, indent=2))


if __name__ == "__main__":
    main()
