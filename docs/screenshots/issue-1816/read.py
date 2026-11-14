"""Read a Close set (docs/screenshots/issue-1816/frames.mjs): what a mark's
plate takes from the frame, over the open water and over the rest, and what
the open water shows at High beside Low. Writes the plates' difference,
twelve times amplified.

  python3 read.py software/after after

The horizon at the Close camera is row 560 of 1080: open water above it, the
rim below. WATER is a box of open water no mark crosses.
"""
import sys
from PIL import Image
import numpy as np

HORIZON = 560
WATER = (60, 150, 560, 400)


def luminance(path):
    x = np.asarray(Image.open(path).convert('RGB')).astype(float)
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def read(folder, name):
    low = luminance(f'{folder}/01-low-close.png')
    plates = luminance(f'{folder}/02-high-close-plates.png')
    bare = luminance(f'{folder}/03-high-close-bare.png')
    h = low.shape[0]
    k = h / 1080
    top, horizon, bottom = int(52 * k), int(HORIZON * k), int(870 * k)
    drop = bare - plates
    for label, rows in (('open water', slice(top, horizon)), ('the rim', slice(horizon, bottom))):
        part = drop[rows]
        held = part > 1
        print(f'{name}, {label}: {int(held.sum())} pixels held by over 1 of 255, '
              f'the most {part.max():.1f}, their median {np.median(part[held]) if held.any() else 0:.1f}')
    x0, y0, x1, y1 = (int(v * k) for v in WATER)
    print(f'{name}, the water box: Low {np.median(low[y0:y1, x0:x1]):.1f}, '
          f'High {np.median(bare[y0:y1, x0:x1]):.1f} of 255')
    Image.fromarray(np.clip(np.abs(drop) * 12, 0, 255).astype('uint8')).save(f'{folder}/plates-diff.png')


if __name__ == '__main__':
    read(sys.argv[1], sys.argv[2])
