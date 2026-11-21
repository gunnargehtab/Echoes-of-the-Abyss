"""The manta's belly, off the Close frame (#1867).

    python3 docs/screenshots/issue-1867/belly.py

Writes software/close-crop.png, the manta at three times its size, and
software/beside-target.png, that crop beside the target, and prints how the
belly reads, in luma out of 255. The frame is read against #1856's at the
same camera, which holds the same water without the manta: both are taken
under reduced motion, so the water, the jellies and the hulls frame alike.
The manta is every pixel of its box that differs from that water by 8 or
more. Marine snow differs a capture, and a mote that came or went reads as
manta too, so the medians are what to read.
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FRAME = os.path.join(HERE, 'software', '07-high-close.png')
BEFORE = os.path.join(HERE, '..', 'issue-1856', 'software', '07-high-close.png')
TARGET = os.path.join(HERE, 'target-manta.jpg')
# The manta at its loop's start in a 1920 x 1080 Close frame.
BOX = (990, 140, 1260, 370)


def luma(image):
    return [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in image.get_flattened_data()]


def median(values):
    values = sorted(values)
    return values[len(values) // 2]


if __name__ == '__main__':
    frame = Image.open(FRAME).convert('RGB')
    crop = frame.crop(BOX)
    big = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
    big.save(os.path.join(HERE, 'software', 'close-crop.png'))
    target = Image.open(TARGET).convert('RGB')
    target = target.resize((round(target.width * big.height / target.height), big.height), Image.LANCZOS)
    beside = Image.new('RGB', (target.width + 12 + big.width, big.height), (8, 12, 18))
    beside.paste(target, (0, 0))
    beside.paste(big, (target.width + 12, 0))
    beside.save(os.path.join(HERE, 'software', 'beside-target.png'))

    now = luma(crop)
    was = luma(Image.open(BEFORE).convert('RGB').crop(BOX))
    body = sorted(n for n, w in zip(now, was) if abs(n - w) >= 8)
    water = median(w for n, w in zip(now, was) if abs(n - w) >= 8)
    # The belly is what stands paler than the water it covers; a mark, a lobe
    # and the tail are what stand darker.
    belly = [n for n in body if n > water]
    marks = [n for n in body if n < water]
    print(f'{len(body)} px of manta, {len(body) / len(now) * 100:.1f}% of its box')
    print(f'the water it covers {water:.0f} at its median')
    print(
        f'the belly {median(belly):.0f} at its median, {belly[-1]:.0f} at its palest, '
        f'{belly[len(belly) * 9 // 10]:.0f} at its ninth decile; {len(belly)} px'
    )
    print(f'a mark, a lobe or the tail {median(marks):.0f} at its median, {marks[0]:.0f} at its darkest; {len(marks)} px')
    print(f'the frame brightest pixel inside the box {max(now):.0f}')
