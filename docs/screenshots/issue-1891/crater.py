"""The crater from above in the frames (#1891): what README.md quotes of the
Survey frame, and the crops it shows.

    python3 docs/screenshots/issue-1891/crater.py docs/screenshots/issue-1891/software

It reads the folder's `*-high-survey.png` and `*-low-survey.png` against
`main/`, the same camera taken on `main` before the step with the same module
and the same held motion. The Survey camera looks straight down from 10 km
with north up, so a place on the map is a place in the frame: the map's
4,000 m square is found by its rim line, and each floor is read as the mean
luma of a 12 px square about one of its cell centres
(docs/free-water-slice.md §3). Luma is Rec. 709 on the encoded bytes, out of
255, as a screenshot gate measures it.

It prints the table, and writes `crater-survey.png` beside the frames: the
map's crop of `main` at High, then the step's, side by side.
"""
import glob
import os
import sys

from PIL import Image

# The floors, each at a cell centre in map metres: name, x, y, authored floor.
PLACES = [
    ('Outside rim, west', 375, 2875, 600),
    ('Northern garden', 2125, 875, 400),
    ('Bowl, west ring', 1375, 2375, 1500),
    ('Bowl, east ring', 3125, 2125, 1500),
    ('Deep pocket', 2125, 2125, 2400),
    ('Southern wall', 1375, 3125, None),
    ('Exit pool', 1375, 3625, 1500),
]
MAP_M = 4000
HALF_PX = 6


def luma(im):
    return im.convert('RGB').convert('L', (0.2126, 0.7152, 0.0722, 0))


def map_box(im):
    """The map's square in the frame, by its magenta rim line.

    The HUD strokes its panels in the same hue, so the rim is told by its
    length, in the world area between the top strip and the console: its west
    and east sides are the only magenta there hundreds of pixels tall, and its
    north side the only one as long as they are apart. The line rides the
    ground's edge, so a side is counted over three columns. The camera looks
    2 degrees off plumb, so the square's height is its width to a pixel, which
    gives the south side the console's buttons break.
    """
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    top, bottom = int(h * 60 / 1080), int(h * 860 / 1080)

    def rim(x, y):
        r, g, b = px[x, y]
        return r > 60 and r > g * 1.8 and b > g * 1.2

    columns = [sum(rim(x, y) for y in range(top, bottom)) for x in range(w)]
    tall = (bottom - top) * 0.4
    sides = [x for x in range(1, w - 1) if sum(columns[x - 1 : x + 2]) > tall]
    if not sides:
        raise SystemExit('no rim line found: is this the Survey camera?')
    x0, x1 = sides[0], sides[-1]
    rows = [sum(rim(x, y) for x in range(x0, x1 + 1)) for y in range(top, bottom)]
    long = (x1 - x0) * 0.5
    tops = [y for y in range(1, len(rows) - 1) if sum(rows[y - 1 : y + 2]) > long]
    if not tops:
        raise SystemExit('the rim has no north side in the frame')
    y0 = top + tops[0]
    return x0, y0, x1, y0 + (x1 - x0)


def read(path, box):
    im = luma(Image.open(path))
    x0, y0, x1, y1 = box
    out = []
    for _name, xm, ym, _floor in PLACES:
        cx = x0 + (x1 - x0) * xm / MAP_M
        cy = y0 + (y1 - y0) * ym / MAP_M
        region = im.crop((int(cx - HALF_PX), int(cy - HALF_PX), int(cx + HALF_PX), int(cy + HALF_PX)))
        hist = region.histogram()
        out.append(sum(i * c for i, c in enumerate(hist)) / sum(hist))
    # Open water beside the map, 300 m west of its edge.
    cx = x0 - (x1 - x0) * 300 / MAP_M
    cy = (y0 + y1) / 2
    region = im.crop((int(cx - HALF_PX), int(cy - HALF_PX), int(cx + HALF_PX), int(cy + HALF_PX)))
    hist = region.histogram()
    out.append(sum(i * c for i, c in enumerate(hist)) / sum(hist))
    return out


def one(folder, pattern):
    found = sorted(glob.glob(os.path.join(folder, pattern)))
    if not found:
        raise SystemExit(f'no {pattern} in {folder}')
    return found[-1]


def main(folder):
    step_high = one(folder, '*-high-survey.png')
    step_low = one(folder, '*-low-survey.png')
    main_high = one(os.path.join(folder, 'main'), '*-high-survey.png')
    main_low = one(os.path.join(folder, 'main'), '*-low-survey.png')
    box = map_box(Image.open(step_high))
    columns = [read(p, box) for p in (main_low, step_low, main_high, step_high)]
    print(f'map square in the frame: {box}')
    print('| Place, and its floor | Low on `main` | Low now | High on `main` | High now |')
    print('| --- | --- | --- | --- | --- |')
    names = [(n, f) for n, _x, _y, f in PLACES] + [('Open water beside the map', None)]
    for i, (name, floor) in enumerate(names):
        label = name if floor is None else f'{name}, {floor:,} m'
        print(f'| {label} | ' + ' | '.join(f'{c[i]:.1f}' for c in columns) + ' |')

    pad = 40
    crop = (box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad)
    before = Image.open(main_high).convert('RGB').crop(crop)
    after = Image.open(step_high).convert('RGB').crop(crop)
    sheet = Image.new('RGB', (before.width * 2 + 8, before.height), (10, 14, 20))
    sheet.paste(before, (0, 0))
    sheet.paste(after, (before.width + 8, 0))
    out = os.path.join(folder, 'crater-survey.png')
    sheet.save(out)
    print(f'wrote {out}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'software'))
