// Side-by-side crops of the vignette off/on frames, and mean luma per region.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { chromium } = require(`${root}/playwright/index.js`);
(async () => {
  const dir = path.resolve(process.argv[2]);
  const on = fs.readFileSync(path.join(dir, '02-vignette-on.png')).toString('base64');
  const off = fs.readFileSync(path.join(dir, '03-vignette-off.png')).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 640 } });
  await page.setContent('<body style="margin:0;background:#000"><canvas id=c width=1440 height=640></canvas></body>');
  const result = await page.evaluate(async ({ on, off }) => {
    const load = (b64) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
    const [a, b] = await Promise.all([load(off), load(on)]);
    const scratch = document.createElement('canvas'); scratch.width = 1440; scratch.height = 900;
    const sctx = scratch.getContext('2d');
    const luma = (img, x, y, w, h) => {
      sctx.drawImage(img, 0, 0);
      const d = sctx.getImageData(x, y, w, h).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / (d.length / 4);
    };
    // World regions between the top bar (52 px) and the command strip (690 px).
    const regions = {
      'centre 400x300': [520, 220, 400, 300],
      'left edge, 60x300 at x=0': [0, 380, 60, 300],
      'right edge, 60x300 at x=1380': [1380, 380, 60, 300],
      'lower-left world corner 120x100': [0, 580, 120, 100],
    };
    const out = {};
    for (const [k, r] of Object.entries(regions)) {
      const lo = luma(a, ...r), lv = luma(b, ...r);
      out[k] = { off: +lo.toFixed(2), on: +lv.toFixed(2), ratio: +(lv / lo).toFixed(3) };
    }
    // Compose: the lower-left 720x320 of the world, off then on.
    const ctx = document.getElementById('c').getContext('2d');
    ctx.drawImage(a, 0, 370, 720, 320, 0, 0, 720, 320);
    ctx.drawImage(b, 0, 370, 720, 320, 720, 0, 720, 320);
    ctx.drawImage(a, 720, 370, 720, 320, 0, 320, 720, 320);
    ctx.drawImage(b, 720, 370, 720, 320, 720, 320, 720, 320);
    ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
    ctx.fillText('vignette off', 10, 20); ctx.fillText('vignette on', 730, 20);
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(720, 0); ctx.lineTo(720, 640); ctx.moveTo(0, 320); ctx.lineTo(1440, 320); ctx.stroke();
    return out;
  }, { on, off });
  await page.locator('#c').screenshot({ path: path.join(dir, 'vignette-pair.png') });
  fs.writeFileSync(path.join(dir, 'vignette-luma.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
