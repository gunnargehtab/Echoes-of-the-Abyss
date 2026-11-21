"""The far bloom in the frames (#1859): what README.md quotes of it, and the
crops it shows.

    python3 docs/screenshots/issue-1859/bloom.py docs/screenshots/issue-1859/software

It reads the folder's High frames at Home, gate 6's low camera and Survey
against `main-high/`, the same three cameras taken on `main` before the step,
with the same module and the same held motion. A pixel is the river's where
the frame stands `LIFT` or more of 255 over `main`'s in luma and is pink: red
and blue each `PINK` or more over green. Marine snow, which drifts between two
takes, is pale cyan and fails the second test. The floor is the same test
with the two frames changed over, the pixels where `main` stands pink over the
step, which no river explains: it is printed beside each count.

Luma is Pillow's `L`, out of 255. It writes `bloom-<camera>.png` beside the
frames: the camera's crop of `main` above the same crop of the step, enlarged.
"""
import glob
import os
import sys

from PIL import Image, ImageChops

LIFT = 8
PINK = 10

# The camera, the crop the page shows (x0, y0, x1, y1), and how far it is enlarged.
CROPS = {
    'home': ((1300, 290, 1920, 600), 2),
    'low': ((60, 300, 1500, 500), 1),
    'survey': ((790, 440, 1090, 620), 4),
    'close': ((1100, 380, 1920, 560), 1),
}
# The five jellies' lips at Home, by eye off the frame, for the same reading.
NEAR = [(848, 592), (1188, 591), (890, 712), (673, 738)]


def frame(folder, name):
    found = glob.glob(os.path.join(folder, f'*-high-{name}.png'))
    assert len(found) == 1, f'{len(found)} frames named *-high-{name}.png in {folder}'
    return Image.open(found[0]).convert('RGB')


def river_mask(now, before):
    lift = ImageChops.subtract(now.convert('L'), before.convert('L'))
    r, g, b = now.split()
    pink = ImageChops.darker(ImageChops.subtract(r, g), ImageChops.subtract(b, g))
    return ImageChops.darker(
        lift.point(lambda v: 255 if v >= LIFT else 0), pink.point(lambda v: 255 if v >= PINK else 0)
    )


def read(folder):
    for name, (box, scale) in CROPS.items():
        now = frame(folder, name)
        before = frame(os.path.join(folder, 'main-high'), name)
        assert now.size == before.size == (1920, 1080), 'a frame is not 1920 x 1080'
        mask = river_mask(now, before)
        reach = mask.getbbox()
        count = mask.histogram()[255]
        print(f'{name}: {river_mask(before, now).histogram()[255]} pixels pass the test the other way round')
        if reach is None:
            print(f'{name}: no pixel of the river')
        else:
            luma = now.convert('L')
            lit = Image.new('L', now.size, 0)
            lit.paste(luma, mask=mask)
            levels = sorted(v for v in lit.tobytes() if v > 0)
            spots = ((x, y) for y in range(reach[1], reach[3]) for x in range(reach[0], reach[2]))
            where = now.getpixel(max(spots, key=lit.getpixel))
            print(
                f'{name}: {count} pixels of the river, x {reach[0]} to {reach[2] - 1}, '
                f'y {reach[1]} to {reach[3] - 1}; luma {levels[len(levels) // 2]} at the median, '
                f'{levels[int(len(levels) * 0.99)]} at the 99th percentile, {levels[-1]} at most, '
                f'where the frame is #{where[0]:02X}{where[1]:02X}{where[2]:02X}'
            )
        if name == 'home':
            peaks = [
                max(now.convert('L').crop((x - 14, y - 14, x + 14, y + 14)).tobytes())
                for x, y in NEAR
            ]
            print(f'home: the four near lanterns clear of the stand peak at {peaks}')
        a, b = before.crop(box), now.crop(box)
        w, h = a.size
        sheet = Image.new('RGB', (w * scale, h * scale * 2 + 4), (255, 255, 255))
        sheet.paste(a.resize((w * scale, h * scale), Image.LANCZOS), (0, 0))
        sheet.paste(b.resize((w * scale, h * scale), Image.LANCZOS), (0, h * scale + 4))
        path = os.path.join(folder, f'bloom-{name}.png')
        sheet.save(path)
        print(f'wrote {path}')


if __name__ == '__main__':
    read(sys.argv[1])
