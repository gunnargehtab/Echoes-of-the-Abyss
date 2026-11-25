"""Depth-band labels over a frame of #1858 (README.md, Reproduce).

  python3 labels.py <frame.png> <labels.json> <close|home> <before|after> <out.png>

labels.json is labels.mjs's output for the same side. The boxes stand at hand-placed
positions a camera, chosen on these frames; each leader runs to a body labels.mjs placed.
"""
import json, sys, statistics
from PIL import Image, ImageDraw, ImageFont

shot, labels_path, frame, tag, out = sys.argv[1:6]
L = json.load(open(labels_path))[frame]
img = Image.open(shot).convert('RGB')
d = ImageDraw.Draw(img, 'RGBA')
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f, fb, ft, fs = (ImageFont.truetype(F, 18), ImageFont.truetype(FB, 19),
                 ImageFont.truetype(FB, 17), ImageFont.truetype(F, 15))
SHELF, MID, LID, HULL = (110, 225, 255), (255, 176, 70), (255, 90, 90), (235, 235, 235)
HUD_TOP = 866

def colour_of(lo, hi):
    if lo < 150: return LID, 'reaches into the Lid'
    if hi <= 400: return SHELF, 'Shelf'
    if lo >= 400: return MID, 'Mid-Water'
    return LID, 'crosses 400 m'

def box(x, y, lines, colour, to=None):
    w = max(d.textlength(t, font=fb if i == 0 else f) for i, t in enumerate(lines)) + 16
    h = 24 * len(lines) + 8
    if to:
        cx = min(max(to[0], x), x + w); cy = min(max(to[1], y), y + h)
        d.line([to, (cx, cy)], fill=colour + (220,), width=2)
    d.rectangle([x, y, x + w, y + h], fill=(6, 12, 20, 220), outline=colour + (255,), width=2)
    for i, t in enumerate(lines):
        d.text((x + 8, y + 5 + 24 * i), t, font=fb if i == 0 else f,
               fill=colour if i == 0 else (228, 234, 242))

# Hand-placed boxes: top-left corner of each group's label, and a member to aim at.
POS = {
    'close': {'legend': (420, 62), 'manta': (1290, 205), 'fry': (110, 360),
              'bloom': (1530, 268), 'mill': (620, 690), 'rimfish': (1430, 760)},
    'home': {'legend': (420, 62), 'manta': (110, 610), 'fry': (110, 700),
             'bloom': (1420, 230), 'mill': (1080, 790), 'rimfish': (1440, 690)},
}[frame]
NAMES = {'manta': 'Manta (accepted, unmoved)', 'fry': 'Rim fry stream', 'mill': 'Outer-fish mill (squares)',
         'rimfish': 'Rim outer fish', 'bloom': 'Far bloom, 120 lanterns (+)'}
G = L['groups']

def live(g):
    return [m for m in G[g]['members'] if m['px'][1] < HUD_TOP]

# Legend.
eye = L['eyeDepth']
title = (f"{'BEFORE · main' if tag == 'before' else 'AFTER · PR #1935'}   "
         f"{frame.capitalize()} camera, High, eye {'233 m deep' if eye >= 0 else 'above the water'}")
rows = [(title, (255, 255, 255), fb), ('Lid: above 150 m. Nothing may live here at High', LID, f),
        ('Shelf: 150 to 400 m', SHELF, f), ('Mid-Water: under 400 m', MID, f),
        ('Each depth is a body axis; a lantern tag is its depth in this frame', (195, 200, 210), fs)]
lx, ly = POS['legend']
lw = max(d.textlength(t, font=fo) for t, _, fo in rows) + 20
d.rectangle([lx, ly, lx + lw, ly + 25 * len(rows) + 10], fill=(0, 0, 0, 205), outline=(255, 255, 255, 110))
for i, (t, c, fo) in enumerate(rows):
    d.text((lx + 10, ly + 6 + 25 * i), t, font=fo, fill=c)

# Schools and the river: a dot a body, then one label.
for g in ['fry', 'mill', 'rimfish', 'bloom']:
    ms = live(g)
    if not ms: continue
    lo, hi = G[g]['span']
    c, band = colour_of(lo, hi)
    for m in ms:
        x, y = m['px']
        if g == 'bloom':
            d.line([(x - 5, y), (x + 5, y)], fill=c + (170,), width=1); d.line([(x, y - 5), (x, y + 5)], fill=c + (170,), width=1)
        elif g == 'mill':
            d.rectangle([x - 3, y - 3, x + 3, y + 3], outline=c + (140,), width=1)
        else:
            d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=c + (140,), width=1)
    pts = ms if g != 'bloom' else ([m for m in ms if m['px'][0] > 1500] or ms)
    aim = (statistics.median(m['px'][0] for m in pts), statistics.median(m['px'][1] for m in pts))
    box(*POS[g], [NAMES[g], f"axis {lo:.0f} to {hi:.0f} m · {band}"], c, aim)

# The manta.
for m in live('manta'):
    lo, hi = G['manta']['span']; c, band = colour_of(lo, hi)
    x, y = m['px']; d.ellipse([x - 16, y - 16, x + 16, y + 16], outline=c + (255,), width=3)
    box(*POS['manta'], [NAMES['manta'], f"axis {lo:.0f} to {hi:.0f} m · {band}"], c, (x, y))

tags = []
# The hulls, at their starts, 300 m.
for h, (x, y, front) in L['hullPx'].items():
    if front and 0 <= x <= img.width and 0 <= y < HUD_TOP:
        t = f"{h} · 300 m"
        d.text((x + 12, y + 4), t, font=fs, fill=HULL, stroke_width=3, stroke_fill=(0, 0, 0))
        tags.append((x + 10, y + 2, x + 14 + d.textlength(t, font=fs), y + 24))
# The five lanterns by the fleet: a ring and a tag each.
for m in sorted(live('lantern'), key=lambda m: m['px'][0]):
    x, y = m['px']; depth = m['depthNow']
    c = LID if depth < 150 else SHELF
    d.ellipse([x - 13, y - 13, x + 13, y + 13], outline=c + (255,), width=3)
    t = f"Lantern {depth:.0f} m" + (' · Lid' if depth < 150 else '')
    w = d.textlength(t, font=ft) + 12
    top = y - 50
    while any(not (x + w / 2 < a or x - w / 2 > b or top + 24 < u or top > v) for a, u, b, v in tags):
        top -= 28
    tags.append((x - w / 2, top, x + w / 2, top + 24))
    d.line([(x, y - 13), (x, top + 24)], fill=c + (255,), width=2)
    d.rectangle([x - w / 2, top, x + w / 2, top + 24], fill=(6, 12, 20, 225), outline=c + (255,), width=2)
    d.text((x - w / 2 + 6, top + 3), t, font=ft, fill=c)

img.save(out)
print(out)
