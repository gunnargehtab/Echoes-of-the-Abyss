"""Side-by-side critique sheet + tone metrics for two renders of the same frame.

    python3 tools/compare.py renders/a.jpg renders/b.jpg renders/cmp-a-b.jpg

Top row: full frames. Bottom row: 2x crop of the Directorate pack (lower right).
Prints luminance percentiles for the whole frame and for the pack region.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

PACK = (0.5, 0.5, 1.0, 1.0)  # x0, y0, x1, y1 as fractions of the frame


def lum(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def stats(img):
    L = lum(img)
    h, w = L.shape
    p = L[int(h * PACK[1]):int(h * PACK[3]), int(w * PACK[0]):int(w * PACK[2])]
    q = lambda x, v: float(np.percentile(x, v))
    return {'frame p2/p50/p98': (q(L, 2), q(L, 50), q(L, 98)), 'pack p5/p50/p95': (q(p, 5), q(p, 50), q(p, 95))}


def sheet(a, b, labels):
    w, h = a.size
    out = Image.new('RGB', (w * 2, h * 2), 'black')
    for i, img in enumerate((a, b)):
        out.paste(img, (i * w, 0))
        box = tuple(int(v) for v in (w * PACK[0], h * PACK[1], w * PACK[2], h * PACK[3]))
        out.paste(img.crop(box).resize((w, h), Image.LANCZOS), (i * w, h))
        d = ImageDraw.Draw(out)
        d.rectangle((i * w + 6, 6, i * w + 12 + 7 * len(labels[i]), 24), fill='black')
        d.text((i * w + 10, 9), labels[i], fill='white')
    return out


if __name__ == '__main__':
    pa, pb, dest = sys.argv[1:4]
    a, b = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
    sheet(a, b, (pa.split('/')[-1], pb.split('/')[-1])).save(dest, quality=90)
    for name, img in ((pa, a), (pb, b)):
        s = stats(img)
        print(name.split('/')[-1].ljust(28), '  '.join(f'{k}: ' + '/'.join(f'{v:.3f}' for v in vals) for k, vals in s.items()))
