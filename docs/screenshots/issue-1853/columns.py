"""Read the columns over the Ventfront Divide's middle vent field (#1853).

A live skirmish never frames alike twice: a contact's mark, the log, the fauna
figures, the embers' flicker and the veil all move with the match. So Low's
control is read where the change is, in a box over each column of the target
camera, clear of the marks: the mean, over the box, of each pixel's largest
channel difference out of 255, as docs/screenshots/issue-1800/README.md reads
a pair. At Close a contact's mark crossed the columns in these takes, so its
boxes read the change at High alone.

  python3 docs/screenshots/issue-1853/columns.py docs/screenshots/issue-1853/software

`main/` holds `main`'s frames at the same cameras: Low twice, for the floor,
and High once, which is the steam this step replaces. It also writes
`columns-<camera>.png`: the boxes side by side, High on `main` and High here,
four times life size.
"""
import sys
from PIL import Image, ImageChops, ImageDraw

# Left, top, right, bottom in a 1920 x 1080 frame: the water over a stack,
# from its mouth up. No mark crossed a Field box in any take.
BOXES = {
    'field': [(570, 315, 600, 395), (935, 490, 970, 560), (1150, 430, 1185, 510),
              (1335, 140, 1360, 195), (1650, 590, 1690, 660)],
    'close': [(358, 330, 392, 480), (770, 325, 806, 440), (995, 300, 1030, 470),
              (1150, 345, 1180, 470)],
}
FRAMES = {'field': ('03-low-field', '07-high-field'), 'close': ('04-low-close', '08-high-close')}


def moved(a, b, box):
    d = ImageChops.difference(a.crop(box), b.crop(box))
    r, g, bl = d.split()
    hist = ImageChops.lighter(ImageChops.lighter(r, g), bl).histogram()
    return sum(i * c for i, c in enumerate(hist)) / sum(hist)


def main(root):
    load = lambda name: Image.open(f'{root}/{name}.png').convert('RGB')
    for camera, (low, high) in FRAMES.items():
        low_main, low_again, low_here = load(f'main/{low}'), load(f'main/{low}-second'), load(low)
        high_main, high_here = load(f'main/{high}'), load(high)
        control = camera == 'field'
        print(f'{camera}: box | ' + ('Low main v main | Low main v here | ' if control else '')
              + 'High steam v smoke')
        boxes = BOXES[camera]
        for box in boxes:
            low_pair = (f'{moved(low_main, low_again, box):.2f} | '
                        f'{moved(low_main, low_here, box):.2f} | ') if control else ''
            print(f'  {box} | {low_pair}{moved(high_main, high_here, box):.2f}')
        scale, gap = 4, 8
        tall = max(b[3] - b[1] for b in boxes) * scale
        wide = sum((b[2] - b[0]) * scale * 2 + gap * 2 for b in boxes)
        sheet = Image.new('RGB', (wide, tall + 20), (8, 12, 20))
        x = 0
        for box in boxes:
            for im in (high_main, high_here):
                crop = im.crop(box)
                crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)
                sheet.paste(crop, (x, 20))
                x += crop.width + gap
        ImageDraw.Draw(sheet).text((4, 4), 'each pair: steam on main, smoke here', fill=(220, 220, 220))
        sheet.save(f'{root}/columns-{camera}.png')


if __name__ == '__main__':
    main(sys.argv[1])
