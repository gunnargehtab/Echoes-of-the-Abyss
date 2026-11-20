"""Where the vent stand's light meets a ring (#1837), read on two sets of frames:
one with the stand and one without, at the same cameras with the fleet at rest.

    python3 docs/screenshots/issue-1837/rings.py <frames with> <frames without>

Along each ring's own circle, 720 samples: the ground 6 px inside and outside
the stroke, and the stroke as the brightest of a 5 px band across it. A lift
is the median of five neighbouring samples, since marine snow differs a
capture and one speck under one sample is not the stand's light. The frames
without the stand are the set at f92e4568 (`git show`, a file each)."""
import math
import sys

from PIL import Image

NOW, WAS = sys.argv[1], sys.argv[2]

# Each ring's centre and radius in a 1920 x 1080 frame, fitted on the frames
# without the stand: the three hulls stand where the fixture starts them.
RINGS = {
    '07-high-close': [
        ('Harvester', (232, 556), 210),
        ('Light Scout', (875, 528), 117),
        ('Corvette', (1636, 542), 175),
    ],
    '06-high-home': [
        ('Harvester', (651, 682), 82),
        ('Light Scout', (992, 608), 61),
        ('Corvette', (1253, 722), 93),
    ],
}
SAMPLES = 720


def luma(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def median(values):
    return sorted(values)[len(values) // 2]


for name, rings in RINGS.items():
    now = Image.open(f'{NOW}/{name}.png').convert('RGB').load()
    was = Image.open(f'{WAS}/{name}.png').convert('RGB').load()
    for label, (cx, cy), r in rings:
        lift, over_now, over_was = [], [], []
        for k in range(SAMPLES):
            a = 2 * math.pi * k / SAMPLES

            def at(img, d):
                return luma(img[int(cx + (r + d) * math.cos(a)), int(cy + (r + d) * math.sin(a))])

            def ground(img):
                return (at(img, 6) + at(img, -6)) / 2

            def stroke(img):
                return max(at(img, d) for d in (-2, -1, 0, 1, 2))

            lift.append(ground(now) - ground(was))
            over_now.append(stroke(now) - ground(now))
            over_was.append(stroke(was) - ground(was))
        smooth = [
            median([lift[(k + j) % SAMPLES] for j in (-2, -1, 0, 1, 2)]) for k in range(SAMPLES)
        ]
        lit = [k for k in range(SAMPLES) if smooth[k] > 10]
        line = (
            f'{name} {label}: ground lifted by more than 10 of 255 on '
            f'{round(100 * len(lit) / SAMPLES)}% of the arc; most {round(max(smooth))}'
        )
        if lit:
            line += (
                f'; the stroke over its ground there: median '
                f'{round(median([over_now[k] for k in lit]))} now, '
                f'{round(median([over_was[k] for k in lit]))} without the stand'
            )
        print(line)
