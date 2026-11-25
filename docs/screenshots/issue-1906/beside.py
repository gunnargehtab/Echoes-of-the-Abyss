import sys, json
from PIL import Image, ImageDraw
before, after, out = sys.argv[1:4]
W, H = 480, 300
CX, CY = 840, 220
def crop(p):
    im = Image.open(p).convert('RGB')
    x0 = CX - W // 2; y0 = CY - H // 2
    return im.crop((x0, y0, x0 + W, y0 + H))
b, a = crop(before), crop(after)
sheet = Image.new('RGB', (W * 2 + 8, H + 24), (0, 0, 0))
sheet.paste(b, (0, 24)); sheet.paste(a, (W + 8, 24))
d = ImageDraw.Draw(sheet)
d.text((6, 6), 'before (main)', fill=(255, 255, 255)); d.text((W + 14, 6), 'after', fill=(255, 255, 255))
sheet.save(out)
def stats(im):
    px = list(im.get_flattened_data())
    lum = [0.2126*r+0.7152*g+0.0722*bb for r,g,bb in px]
    i = max(range(len(px)), key=lambda k: lum[k])
    return {'brightest': px[i], 'meanLuma': round(sum(lum)/len(lum), 2), 'saturated': sum(1 for p in px if max(p) >= 250)}
print(json.dumps({'before': stats(b), 'after': stats(a)}))
