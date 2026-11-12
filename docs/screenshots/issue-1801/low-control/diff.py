"""Mean, over the world area, of each pixel's largest channel difference (0-255),
as docs/screenshots/issue-1800/README.md reads a pair; and a map painting a
pixel red where any channel moved by more than 2."""
import sys
from PIL import Image, ImageChops

def world(im):
    # The world area: under the top strip, over the console (1920x1080 capture).
    w, h = im.size
    return im.crop((0, int(h * 52 / 1080), w, int(h * 870 / 1080)))

def read(a_path, b_path, out=None):
    a = world(Image.open(a_path).convert('RGB'))
    b = world(Image.open(b_path).convert('RGB'))
    d = ImageChops.difference(a, b)
    r, g, bl = d.split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), bl)
    hist = m.histogram()
    n = sum(hist)
    mean = sum(i * c for i, c in enumerate(hist)) / n
    over = sum(hist[3:]) / n
    if out:
        mask = m.point(lambda v: 255 if v > 2 else 0)
        red = Image.new('RGB', a.size, (255, 0, 0))
        base = a.point(lambda v: v // 2)
        base.paste(red, mask=mask)
        base.save(out)
    return mean, over

if __name__ == '__main__':
    mean, over = read(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    print(f'{mean:.2f} mean, {over * 100:.2f}% of pixels moved by more than 2')
