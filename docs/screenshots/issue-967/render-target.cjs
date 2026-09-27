// Renders a Claude Design export (IN, default target.html) to OUT (default target.png) at
// 1920x1080, DPR 1. Claude Design has no PNG export; this is how target.png was made (#967).
//   node docs/screenshots/issue-967/render-target.cjs
const { execSync } = require('node:child_process');
const path = require('node:path');
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
let pw;
for (const c of ['playwright', path.join(root, 'playwright'), 'playwright-core', path.join(root, 'playwright-core')]) {
  try { pw = require(c); break; } catch {}
}
(async () => {
  const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, process.env.IN ?? 'target.html'));
  await page.waitForFunction(() => !document.getElementById('__bundler_thumbnail') && !document.getElementById('__bundler_loading'), null, { timeout: 60000 }).catch(() => errors.push('bundler overlay never cleared'));
  await page.waitForTimeout(Number(process.env.SETTLE_MS ?? 8000));
  const info = await page.evaluate(() => ({
    canvases: [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height} @ ${JSON.stringify(c.getBoundingClientRect())}`),
    text: document.body.innerText.slice(0, 300),
  }));
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: path.resolve(__dirname, process.env.OUT ?? 'target.png') });
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
