"""The rim ray's drawn body in each frame loop.mjs shot (#1780).

Within 20 px of the ray's projected point (readings.json `screen`), the largest
8-connected group of pixels whose luminance stands more than 10 levels above the
crop's median, snow excluded by its blue cast; with --dark, more than 8 levels
under it, for the near side's silhouette. Prints its pixel count, its box, and
its mean luminance against the median's.

    python -I docs/screenshots/issue-1780/body.py docs/screenshots/issue-1780/after [--dark]
"""

import glob
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image


def largest(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = []
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            queue = deque([(y, x)])
            seen[y, x] = True
            group = []
            while queue:
                a, b = queue.popleft()
                group.append((a, b))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = a + dy, b + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            queue.append((yy, xx))
            if len(group) > len(best):
                best = group
    return best


folder = sys.argv[1]
dark = "--dark" in sys.argv
data = json.load(open(os.path.join(folder, "readings.json"), encoding="utf-8"))
files = {os.path.basename(f).split("-", 1)[1][:-4]: f for f in glob.glob(os.path.join(folder, "*.png"))}
for row in data["rows"]:
    if "name" not in row:
        continue
    image = np.asarray(Image.open(files[row["name"]]).convert("RGB")).astype(float)
    cx, cy = row["screen"]
    crop = image[cy - 20 : cy + 20, cx - 20 : cx + 20]
    lum = 0.2126 * crop[..., 0] + 0.7152 * crop[..., 1] + 0.0722 * crop[..., 2]
    median = float(np.median(lum))
    if dark:
        body = largest(lum < median - 8)
    else:
        body = largest((lum > median + 10) & ((crop[..., 2] - crop[..., 0]) < 40))
    mean = float(np.mean([lum[p] for p in body])) if body else 0.0
    ys = [p[0] for p in body] or [0]
    xs = [p[1] for p in body] or [0]
    print(
        f"{row['name']}: T+{row['matchS']} s, loop {row['loopDeg']}, plan {row['planShown']:.2f}:"
        f" {len(body)} px, {max(xs) - min(xs) + 1} x {max(ys) - min(ys) + 1},"
        f" {mean:.1f} on {median:.1f} ({mean / median:.2f}x)"
    )
