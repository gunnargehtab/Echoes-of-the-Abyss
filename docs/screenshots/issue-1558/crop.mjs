import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(execSync('npm root -g').toString().trim() + '/playwright/index.js');
import { readFileSync } from 'node:fs';
const dir = process.argv[2];
const files = ['02-home-frame', '03-zoomed-out-70', '04-low-15-focus-600', '05-turned-45-past-corner'];
const imgs = files.map((f) => readFileSync(`${dir}/${f}.png`).toString('base64'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 4 * 480, height: 500 } });
await page.setContent(`<body style="margin:0;background:#fff;display:flex;gap:10px">${imgs
  .map((b, i) => `<div style="width:470px;height:465px;overflow:hidden;position:relative"><img src="data:image/png;base64,${b}" style="position:absolute;left:-${18 * 3}px;top:-${740 * 3}px;width:${1440 * 3}px;image-rendering:pixelated"><span style="position:absolute;bottom:0;left:0;background:#fff;font:14px monospace">${files[i]}</span></div>`)
  .join('')}</body>`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${dir}/scope-boxes.png` });
await browser.close();
