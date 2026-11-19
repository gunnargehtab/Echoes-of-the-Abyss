"""The hull's shadow, as the difference between the shadow frame and its control
(#1842): `high-shadow-pool` against `high-shadow-pool-empty`, the same pose with
the Harvester sent off the pool. A pool's own edge and a shadow's look alike in
one frame; in the pair the shadow is the light the first frame lacks.

    python3 docs/screenshots/issue-1836/pairdiff.py docs/screenshots/issue-1836/gpu

It reads the two frames and `readings.json` from the folder a run of frames.mjs
wrote, prints the figures README.md quotes, and writes
`diff-shadow-pool-vs-empty.png` there: the control dimmed, red where the frame
with the hull is darker, cyan where it is brighter.

Luma is Pillow's `L`, out of 255. The world area is ../issue-1801/low-control/
diff.py's: under the top strip, over the console. The window is the Harvester's
model box in the shadow frame, from `readings.json`, grown by half its size on
every side: the hull, the ground under it and the ground behind it down the
beam. Outside the window none of the hull's shadow falls. What the pair differs
by there is noise and any mark that went with the hull, and it is the floor the
figures inside stand on.

A pair is clean only where the camera stood still between its two frames: the
software run holds the sway and the snow (reduced motion), and `control.sway`
in `readings.json` says whether a run did.
"""
import glob
import json
import os
import sys

from PIL import Image, ImageChops

# Luma the control must stand over the shadow frame by to count as shadow, and
# the loss the map paints at full red.
COUNTED = 8
FULL = 66


def world_rows(height):
    return int(height * 52 / 1080), int(height * 870 / 1080)


def one(folder, suffix):
    found = glob.glob(os.path.join(folder, f'*-high-shadow-{suffix}.png'))
    assert len(found) == 1, f'{len(found)} frames named *-high-shadow-{suffix}.png in {folder}'
    return Image.open(found[0]).convert('RGB')


def read(folder):
    lit = one(folder, 'pool')
    empty = one(folder, 'pool-empty')
    assert lit.size == empty.size, 'the two frames are not one size'
    with open(os.path.join(folder, 'readings.json')) as f:
        record = json.load(f)
    frame = next(r for r in record['readings'] if r['state'] == 'shadow' and r['name'] == 'pool')
    box = next(h for h in frame['hulls'] if h['name'] == 'Harvester')['screen']
    k = lit.width / record['viewport']['width']
    top, bottom = world_rows(lit.height)
    w, h = (box['x1'] - box['x0']) * k, (box['y1'] - box['y0']) * k
    window = (
        max(0, int(box['x0'] * k - w / 2)),
        max(top, int(box['y0'] * k - h / 2)),
        min(lit.width, int(box['x1'] * k + w / 2)),
        min(bottom, int(box['y1'] * k + h / 2)),
    )

    # Light the frame with the hull lacks, and light it adds: each clamped at 0.
    lost = ImageChops.subtract(empty.convert('L'), lit.convert('L'))
    gained = ImageChops.subtract(lit.convert('L'), empty.convert('L'))

    inside = lost.crop(window)
    counted = inside.point(lambda v: 255 if v >= COUNTED else 0)
    reach = counted.getbbox()
    print(f'window: x {window[0]} to {window[2]}, y {window[1]} to {window[3]}')
    print(f"Harvester's model box: x {box['x0']} to {box['x1']}, y {box['y0']} to {box['y1']}")
    if reach is None:
        print(f'shadow: no pixel of the control stands {COUNTED} over the shadow frame')
    else:
        print(
            f'shadow: the control stands {COUNTED} or more of 255 over the shadow frame on '
            f'{sum(inside.histogram()[COUNTED:])} pixels, '
            f'x {window[0] + reach[0]} to {window[0] + reach[2] - 1}, '
            f'y {window[1] + reach[1]} to {window[1] + reach[3] - 1}, '
            f'by {inside.getextrema()[1]} at most'
        )

    # The README's measure of a pair, over the world area outside the window.
    r, g, b = ImageChops.difference(lit, empty).split()
    largest = ImageChops.lighter(ImageChops.lighter(r, g), b)
    largest.paste(0, window)
    total = sum(i * c for i, c in enumerate(largest.crop((0, top, lit.width, bottom)).histogram()))
    area = lit.width * (bottom - top) - (window[2] - window[0]) * (window[3] - window[1])
    print(f'outside the window: {total / area:.2f} of 255, mean largest channel difference')

    scale = lambda v: min(255, max(0, (v - COUNTED + 2) * 255 // (FULL - COUNTED + 2)))
    out = empty.point(lambda v: v * 35 // 100)
    out.paste(Image.new('RGB', out.size, (255, 40, 40)), mask=lost.point(scale))
    out.paste(Image.new('RGB', out.size, (40, 220, 255)), mask=gained.point(scale))
    path = os.path.join(folder, 'diff-shadow-pool-vs-empty.png')
    out.crop((0, top, lit.width, bottom)).save(path)
    print(f'wrote {path}')


if __name__ == '__main__':
    read(sys.argv[1])
