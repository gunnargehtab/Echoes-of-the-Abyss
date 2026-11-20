"""The mill before the vent stand's light, off the Close frame (#1856).

    python3 docs/screenshots/issue-1856/crop.py

Writes software/close-crop.png, the stand at twice its size, and prints how
dark a body reads there, in luma out of 255. The frame is read against
#1837's at the same camera, which holds the same water without the mill:
both are taken under reduced motion, so the stand, its light and the hulls
frame alike. A body is a pixel of the mill's box at least 20 darker than the
water it covers. Marine snow differs a capture, and a mote that was there
and is not reads as a body too, so the medians are what to read.
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FRAME = os.path.join(HERE, 'software', '07-high-close.png')
BEFORE = os.path.join(HERE, '..', 'issue-1837', 'software', '07-high-close.png')
# The stand and its light in a 1920 x 1080 Close frame.
CROP = (960, 480, 1560, 800)
# The mill: every body of the stream at its loop's start, and no hull's ring.
BOX = (1040, 555, 1450, 695)


def luma(path):
    image = Image.open(path).convert('RGB').crop(BOX)
    return [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in image.get_flattened_data()]


if __name__ == '__main__':
    crop = Image.open(FRAME).convert('RGB').crop(CROP)
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    crop.save(os.path.join(HERE, 'software', 'close-crop.png'))
    now, was = luma(FRAME), luma(BEFORE)
    bodies = sorted((n, w) for n, w in zip(now, was) if n <= w - 20)
    middle = len(bodies) // 2
    water = sorted(w for _, w in bodies)[middle]
    share = sorted(n / w for n, w in bodies)[middle]
    print(f'{len(bodies)} px of body, {len(bodies) / len(now) * 100:.1f}% of the box')
    print(f'a body {bodies[middle][0]:.0f} at its median, {bodies[0][0]:.0f} at its darkest')
    print(f'the water it covers {water:.0f} at its median; a body is {share:.2f} of it')
