"""The far bloom in the frames (#1859): what README.md quotes of it, and the
crops it shows.

    python3 docs/screenshots/issue-1859/bloom.py docs/screenshots/issue-1859/software

It reads the folder's High frames at Home, gate 6's low camera and Survey
against `main-high/`, the same three cameras taken on `main` before the step,
with the same module and the same held motion. A pixel is the river's where
the frame stands `LIFT` or more of 255 over `main`'s in luma and is pink: red
and blue each `PINK` or more over green. Marine snow, which drifts between two
takes, is pale cyan over dark water and fails the second test; over the vent
stand's amber light it can pass it. So the test is asked only inside the box
river.mjs prints for the camera, grown by `PAD` for a lantern's strands, and
its floor is the same test with the two frames changed over, the pixels where
`main` stands pink over the step, which no river explains: it is printed
beside each count.

Luma is Pillow's `L`, out of 255. It writes `bloom-<camera>.png` beside the
frames: the camera's crop of `main` above the same crop of the step, enlarged.

The staged pair, `*-low-mark.png` and `*-high-mark.png`, is the Corvette sent
out under the river and picked, at Home's camera. Its selection ring is the
one near-white circle in `MARK_BOX`: the script fits it, counts the pink
pixels inside it at each quality, reads the ring's own stroke at both, and
writes `bloom-mark.png`, Low above High.

The other staged pair, `*-field.png` and `*-field-home.png`, is a Tetherjelly
field stood inside the river's loop. A pixel is a dot of the field's where the
Low frame, which holds the field and no river, is the fauna colour's pale
green and stands `DOT` over its own blurred surroundings. The script counts
them, reads those same pixels at High, counts the pink pixels of each crop at
both qualities, and writes `bloom-field.png` and `bloom-field-home.png`, Low
above High.
"""
import glob
import os
import sys

from PIL import Image, ImageChops, ImageFilter

LIFT = 8
PINK = 10

# The camera, the crop the page shows (x0, y0, x1, y1), and how far it is enlarged.
CROPS = {
    'home': ((1300, 290, 1920, 600), 2),
    'low': ((60, 300, 1500, 500), 1),
    'survey': ((790, 440, 1090, 620), 4),
    'close': ((1100, 380, 1920, 560), 1),
}
# Where river.mjs stands the river's bells in each camera's frame at the
# match's start, and how far a lantern's glow and strands reach past them.
RIVER = {
    'home': (1444, 361, 1903, 517),
    'low': (181, 355, 1124, 452),
    'survey': (833, 479, 981, 585),
    'close': (1170, 443, 1919, 484),
}
PAD = 40
# The staged frame's crop: the water the Corvette is sent to, from Home's eye.
MARK_BOX = (1280, 300, 1780, 620)
# The staged field's crops, at its own camera and at Home's, and how far each
# is enlarged; and what a dot of the field stands over its surroundings by.
FIELD_BOXES = {'field': ((380, 370, 1560, 800), 1), 'field-home': ((1300, 300, 1920, 620), 2)}
DOT = 12
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


def staged(folder, quality):
    found = glob.glob(os.path.join(folder, f'*-{quality}-mark.png'))
    assert len(found) == 1, f'{len(found)} frames named *-{quality}-mark.png in {folder}'
    return Image.open(found[0]).convert('RGB').crop(MARK_BOX)


def mark(folder):
    low, high = staged(folder, 'low'), staged(folder, 'high')
    # The selection ring: near-white, and nothing else in the crop is.
    white = lambda im: [
        (x, y)
        for y in range(im.height)
        for x in range(im.width)
        if min(im.getpixel((x, y))) >= 150 and max(im.getpixel((x, y))) - min(im.getpixel((x, y))) <= 40
    ]
    stroke = white(low)
    xs, ys = [x for x, _ in stroke], [y for _, y in stroke]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    radius = ((max(xs) - min(xs)) + (max(ys) - min(ys))) / 4
    print(
        f'mark: the ring is {len(stroke)} pixels at Low, centred {MARK_BOX[0] + cx:.0f}, '
        f'{MARK_BOX[1] + cy:.0f}, {radius:.0f} px in radius'
    )
    for quality, im in (('low', low), ('high', high)):
        inside = pink = 0
        for y in range(im.height):
            for x in range(im.width):
                if (x - cx) ** 2 + (y - cy) ** 2 > (radius - 4) ** 2:
                    continue
                inside += 1
                r, g, b = im.getpixel((x, y))
                pink += r - g >= PINK and b - g >= PINK and (r + g + b) / 3 >= 40
        lumas = sorted(im.convert('L').getpixel(at) for at in stroke)
        print(
            f'mark, {quality}: {pink} pink pixels of the {inside} inside the ring; the '
            f"ring's own pixels read {lumas[len(lumas) // 2]} at the median, {lumas[0]} at the least"
        )
    w, h = low.size
    sheet = Image.new('RGB', (w * 2, h * 4 + 4), (255, 255, 255))
    sheet.paste(low.resize((w * 2, h * 2), Image.LANCZOS), (0, 0))
    sheet.paste(high.resize((w * 2, h * 2), Image.LANCZOS), (0, h * 2 + 4))
    path = os.path.join(folder, 'bloom-mark.png')
    sheet.save(path)
    print(f'wrote {path}')


def field(folder):
    for name, (box, scale) in FIELD_BOXES.items():
        pair = {}
        for quality in ('low', 'high'):
            found = glob.glob(os.path.join(folder, f'*-{quality}-{name}.png'))
            assert len(found) == 1, f'{len(found)} frames named *-{quality}-{name}.png in {folder}'
            pair[quality] = Image.open(found[0]).convert('RGB').crop(box)
        low, high = pair['low'], pair['high']
        # The field's dots, off Low: pale green, and over the water round them.
        luma = low.convert('L')
        over = ImageChops.subtract(luma, luma.filter(ImageFilter.GaussianBlur(6)))
        r, g, b = low.split()
        green = ImageChops.darker(ImageChops.subtract(g, r), ImageChops.subtract(g, b))
        dots = ImageChops.darker(
            over.point(lambda v: 255 if v >= DOT else 0), green.point(lambda v: 255 if v >= 4 else 0)
        )
        count = dots.histogram()[255]

        def at_dots(im):
            held = Image.new('L', im.size, 0)
            held.paste(im.convert('L'), mask=dots)
            levels = sorted(v for v in held.tobytes() if v > 0)
            return levels[len(levels) // 2] if levels else 0

        def pink(im):
            r, g, b = im.split()
            both = ImageChops.darker(ImageChops.subtract(r, g), ImageChops.subtract(b, g))
            bright = im.convert('L').point(lambda v: 255 if v >= 40 else 0)
            mask = ImageChops.darker(both.point(lambda v: 255 if v >= PINK else 0), bright)
            held = Image.new('L', im.size, 0)
            held.paste(im.convert('L'), mask=mask)
            return sorted(v for v in held.tobytes() if v > 0)

        lanterns = pink(high)
        print(
            f"{name}: {count} pixels of the field's dots; they read {at_dots(low)} at the median "
            f'at Low and {at_dots(high)} at High; pink pixels in the crop: {len(pink(low))} at Low, '
            f'{len(lanterns)} at High, reading {lanterns[len(lanterns) // 2]} at the median, '
            f'{lanterns[int(len(lanterns) * 0.99)]} at the 99th percentile and {lanterns[-1]} at most'
        )
        w, h = low.size
        sheet = Image.new('RGB', (w * scale, h * scale * 2 + 4), (255, 255, 255))
        sheet.paste(low.resize((w * scale, h * scale), Image.LANCZOS), (0, 0))
        sheet.paste(high.resize((w * scale, h * scale), Image.LANCZOS), (0, h * scale + 4))
        path = os.path.join(folder, f'bloom-{name}.png')
        sheet.save(path)
        print(f'wrote {path}')


def read(folder):
    mark(folder)
    field(folder)
    for name, (box, scale) in CROPS.items():
        now = frame(folder, name)
        before = frame(os.path.join(folder, 'main-high'), name)
        assert now.size == before.size == (1920, 1080), 'a frame is not 1920 x 1080'
        x0, y0, x1, y1 = RIVER[name]
        held = (max(0, x0 - PAD), y0 - PAD, min(now.width, x1 + PAD), y1 + PAD)

        def boxed(mask):
            inside = Image.new('L', mask.size, 0)
            inside.paste(mask.crop(held), held[:2])
            return inside

        mask = boxed(river_mask(now, before))
        reach = mask.getbbox()
        count = mask.histogram()[255]
        floor = boxed(river_mask(before, now)).histogram()[255]
        print(f'{name}: {floor} pixels pass the test the other way round')
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
