"""ray-loop.png: the rim ray in every frame loop.mjs shot, before above after,
each frame cropped at three times and at 1:1 around the ray's projected point
(readings.json `screen`), labelled with its match time, loop angle, the share of
its plan the eye sees and its distance (#1780).

    python -I docs/screenshots/issue-1780/sheet.py docs/screenshots/issue-1780
"""

import glob
import json
import os
import sys

from PIL import Image, ImageDraw

root = sys.argv[1]


def frames(folder):
    data = json.load(open(os.path.join(folder, "readings.json"), encoding="utf-8"))
    files = {os.path.basename(f).split("-", 1)[1][:-4]: f for f in glob.glob(os.path.join(folder, "*.png"))}
    return [(row, files[row["name"]]) for row in data["rows"] if "name" in row]


sets = [("Before", frames(os.path.join(root, "before"))), ("After", frames(os.path.join(root, "after")))]
half, zoom = 24, 3
cell = 2 * half * zoom
strip = 90
label = 30
band = label + cell + strip + 14
sheet = Image.new("RGB", (110 + len(sets[1][1]) * (cell + 8), 22 + 2 * band), (18, 18, 18))
draw = ImageDraw.Draw(sheet)
draw.text((6, 4), "The rim ray in the opening pose, GPU, DPR 1: a 3x crop and a 1:1 crop per frame", fill=(235, 235, 235))
for i, (name, shots) in enumerate(sets):
    y0 = 22 + i * band
    draw.text((6, y0 + label + cell // 2 - 6), name, fill=(235, 235, 235))
    draw.text((6, y0 + label + cell + strip // 2 - 6), "1:1", fill=(170, 170, 170))
    for j, (row, path) in enumerate(shots):
        image = Image.open(path).convert("RGB")
        cx, cy = row["screen"]
        x0 = 110 + j * (cell + 8)
        zoomed = image.crop((cx - half, cy - half, cx + half, cy + half)).resize((cell, cell), Image.NEAREST)
        sheet.paste(zoomed, (x0, y0 + label))
        sheet.paste(image.crop((cx - cell // 2, cy - strip // 2, cx + cell // 2, cy + strip // 2)), (x0, y0 + label + cell + 4))
        draw.text((x0 + 2, y0), f"T+{row['matchS']} s, loop {row['loopDeg']}", fill=(220, 220, 220))
        draw.text((x0 + 2, y0 + 13), f"plan {row['planShown']:.2f}, {row['distanceM']} m", fill=(160, 160, 160))
sheet.save(os.path.join(root, "ray-loop.png"))
