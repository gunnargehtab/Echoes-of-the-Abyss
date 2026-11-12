"""Read a plates pair (docs/screenshots/issue-1801/plates.mjs): where the High
frame with its marks' plates differs from the same frame without them, over
the world area, and what the held pixels fall to. Writes the pair's centre
side by side and a map of the difference, twelve times amplified.

  python3 read.py 01-garden-plates.png 02-garden-bare.png garden 820,380,1240,700
"""
import sys
from PIL import Image
import numpy as np

# markPlates.ts PLATE_LEVEL, in bytes: the palest ground the ladder weighs.
LEVEL = 0.11609725490196078 * 255


def luminance(path):
    x = np.asarray(Image.open(path).convert('RGB')).astype(float)
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def read(plates_path, bare_path, name, box):
    plates, bare = luminance(plates_path), luminance(bare_path)
    h = plates.shape[0]
    # The world area: under the top strip, over the console (low-control/diff.py).
    world = np.zeros(plates.shape, bool)
    world[int(h * 52 / 1080) : int(h * 870 / 1080), :] = True
    drop = bare - plates
    held = (drop > 2) & world
    print(f'{name}: {int(held.sum())} of {int(world.sum())} world pixels held '
          f'({100 * held.sum() / world.sum():.2f}%), none brighter: '
          f'{int(((-drop > 2) & world).sum())} rose')
    print(f'  held pixels, median of 255: {np.median(bare[held]):.1f} bare, '
          f'{np.median(plates[held]):.1f} with plates; the level is {LEVEL:.1f}')
    amplified = np.clip(np.abs(drop) * 12, 0, 255).astype('uint8')
    Image.fromarray(amplified).save(f'{name}-diff.png')
    a = Image.open(plates_path).convert('RGB').crop(box)
    b = Image.open(bare_path).convert('RGB').crop(box)
    w, hh = a.size
    pair = Image.new('RGB', (w * 2 + 10, hh))
    pair.paste(a, (0, 0))
    pair.paste(b, (w + 10, 0))
    pair.resize((pair.width * 2, pair.height * 2), Image.LANCZOS).save(f'{name}-zoom.png')


if __name__ == '__main__':
    read(sys.argv[1], sys.argv[2], sys.argv[3], tuple(int(v) for v in sys.argv[4].split(',')))
