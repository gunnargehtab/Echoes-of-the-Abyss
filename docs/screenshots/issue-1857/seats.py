"""How a deep fish reads from the pocket eye (#1857): the peak of each of the
ring's six fish in a frame of pocket.mjs's, as luma of 255, and the water
between them.

    python3 docs/screenshots/issue-1857/seats.py <frame.png> [<frame.png> ...]

With `--beside <out.png>` it also writes the ring of every frame named, side by
side at four times its size. Reduced motion holds each fish at its loop's start,
so the six stand at the same pixels in every 1920 x 1080 frame from that eye.

    python3 docs/screenshots/issue-1857/seats.py --near x0,y0,x1,y1 <out.png> <frame.png> ...

reads one fish in a flight frame instead: the peak inside the box named, how
many of its pixels stand over the Corvette's lamp, and the box of every frame
side by side at twelve times its size."""
import sys

from PIL import Image

# Where the ring's six fish stand, and the box the ring fills.
FISH = [(930, 433), (1025, 450), (878, 521), (1078, 560), (911, 632), (980, 649)]
RING = (840, 400, 1120, 680)
REACH = 8


def luma(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


# docs/screenshots/issue-1837/README.md: the Corvette's lamp at SIG 28, at Close.
CORVETTE_LAMP = 165

args = sys.argv[1:]
if args and args[0] == '--near':
    box = tuple(int(v) for v in args[1].split(','))
    crops = []
    for path in args[3:]:
        image = Image.open(path).convert('RGB')
        px = image.load()
        lumas = [luma(px[x, y]) for x in range(box[0], box[2]) for y in range(box[1], box[3])]
        over = sum(1 for v in lumas if v > CORVETTE_LAMP)
        print(f'{path}: one fish peaks at {round(max(lumas))}, {over} px over {CORVETTE_LAMP}')
        crops.append(image.crop(box).resize(((box[2] - box[0]) * 12, (box[3] - box[1]) * 12), Image.NEAREST))
    gap = 12
    sheet = Image.new('RGB', (sum(c.width for c in crops) + gap * (len(crops) - 1), crops[0].height), (40, 40, 40))
    x = 0
    for crop in crops:
        sheet.paste(crop, (x, 0))
        x += crop.width + gap
    sheet.save(args[2])
    sys.exit(0)

beside = None
if '--beside' in args:
    at = args.index('--beside')
    beside = args[at + 1]
    del args[at : at + 2]

crops = []
for path in args:
    image = Image.open(path).convert('RGB')
    px = image.load()
    peaks = sorted(
        round(
            max(
                luma(px[x, y])
                for x in range(fx - REACH, fx + REACH + 1)
                for y in range(fy - REACH, fy + REACH + 1)
            )
        )
        for fx, fy in FISH
    )
    x0, y0, x1, y1 = RING
    near = lambda x, y: any(abs(x - fx) <= 2 * REACH and abs(y - fy) <= 2 * REACH for fx, fy in FISH)
    water = sorted(luma(px[x, y]) for x in range(x0, x1) for y in range(y0, y1) if not near(x, y))
    print(f'{path}: six fish peak {peaks}, the water between at its median {round(water[len(water) // 2])}')
    crops.append(image.crop(RING).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.NEAREST))

if beside is not None:
    gap = 8
    sheet = Image.new('RGB', (sum(c.width for c in crops) + gap * (len(crops) - 1), crops[0].height), (40, 40, 40))
    x = 0
    for crop in crops:
        sheet.paste(crop, (x, 0))
        x += crop.width + gap
    sheet.save(beside)
