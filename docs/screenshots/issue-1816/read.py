"""Read a Close set (docs/screenshots/issue-1816/frames.mjs): what a mark's
plate takes from the open water, and what that water shows at High beside
Low. Writes the plates' difference, twelve times amplified.

  python3 read.py software/after after

The horizon at the Close camera is near row 500 of 1080, open water above
it. A drop is the bare frame less the plated one, averaged over nine pixels
square: the two are four seconds apart, and the marine snow moves. WATER is a
box of open water no mark crosses, at the frame's centre, clear of the
vignette. CAP is the left hull's disc where it rises over the water, and
ABOVE the water just over it.
"""
import sys
from PIL import Image
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

HORIZON = 500
WATER = (1050, 150, 1400, 400)
CAP = (200, 300, 264, 330)
ABOVE = (200, 240, 264, 270)


def luminance(path):
    x = np.asarray(Image.open(path).convert('RGB')).astype(float)
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def read(folder, name):
    low = luminance(f'{folder}/01-low-close.png')
    plates = luminance(f'{folder}/02-high-close-plates.png')
    bare = luminance(f'{folder}/03-high-close-bare.png')
    k = low.shape[0] / 1080
    box = lambda m, b: np.median(m[int(b[1] * k):int(b[3] * k), int(b[0] * k):int(b[2] * k)])
    drop = bare - plates
    water = sliding_window_view(drop[int(52 * k):int(HORIZON * k)], (9, 9)).mean(axis=(2, 3))
    print(f'{name}: {int((water > 1).sum())} open-water pixels held by over 1 of 255')
    print(f'{name}: the left disc\'s upper edge steps {box(plates, ABOVE):.1f} to '
          f'{box(plates, CAP):.1f} with plates, {box(bare, ABOVE):.1f} to {box(bare, CAP):.1f} '
          f'bare, {box(low, ABOVE):.1f} to {box(low, CAP):.1f} at Low')
    print(f'{name}: the water box shows {box(low, WATER):.1f} at Low, '
          f'{box(bare, WATER):.1f} at High')
    Image.fromarray(np.clip(np.abs(drop) * 12, 0, 255).astype('uint8')).save(f'{folder}/plates-diff.png')


if __name__ == '__main__':
    read(sys.argv[1], sys.argv[2])
