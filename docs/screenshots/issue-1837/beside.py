"""The target's jelly beside the nearest lantern at Close, at one bell width (#1837).

    python3 docs/screenshots/issue-1837/beside.py

Two panels of 600 x 800: the owner's crop of the target, and frame 07 round the
lantern 190 m from the Close eye, each scaled so its bell is as wide as the
other's. A bell's width is read off the panel itself: the span of the columns
that hold a pink-violet pixel in the rows its bell crosses. It prints both, so
"the same size" is a number and not a judgement.
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PANEL = (600, 800)
# The target's crop is a phone capture of the 2,000 px wide frame, 1.17 times up.
K = 2340 / 2000
TARGET_BOX = (int(560 * K), int(120 * K), int(1040 * K), int(760 * K))
# The nearest lantern's lip in frame 07, and the rows of each panel its bell crosses.
LIP = (641, 331)
BELL_ROWS = (90, 260)


def pink(pixel):
    r, g, b = pixel
    return r > g + 25 and b > g + 25 and r + b > 240


def bell_width(panel):
    px = panel.load()
    cols = [x for x in range(panel.width) if any(pink(px[x, y]) for y in range(*BELL_ROWS))]
    return (max(cols) - min(cols) + 1) if cols else 0


def lantern_panel(frame, scale):
    w, h = PANEL[0] / scale, PANEL[1] / scale
    left = LIP[0] - w / 2
    # The lip sits where the target's does, about a quarter of the way down.
    top = LIP[1] - h * 0.26
    box = tuple(round(v) for v in (left, top, left + w, top + h))
    return frame.crop(box).resize(PANEL, Image.LANCZOS)


target = Image.open(os.path.join(HERE, 'target-jelly.jpg')).convert('RGB')
target = target.crop(TARGET_BOX).resize(PANEL, Image.LANCZOS)
frame = Image.open(os.path.join(HERE, 'software', '07-high-close.png')).convert('RGB')

want = bell_width(target)
scale = 3.0
for _ in range(6):
    got = bell_width(lantern_panel(frame, scale))
    if got == 0:
        break
    scale *= want / got
ours = lantern_panel(frame, scale)

out = Image.new('RGB', (PANEL[0] * 2 + 10, PANEL[1]), (0, 0, 0))
out.paste(target, (0, 0))
out.paste(ours, (PANEL[0] + 10, 0))
out.save(os.path.join(HERE, 'software', 'jelly-beside-target.png'))
print(f"the target's bell {want} px wide, the lantern's {bell_width(ours)} px, drawn {scale:.2f} times up")
