/**
 * What each halo route #1001 weighs would cost on the GPU, on its own, before
 * either is built (docs/graphics-standards.md gate 6, "Abyss Render Stack
 * increment"). Not a gate, and not the game: route-cost.html draws a stand-in
 * scene into a 4× MSAA canvas like the conn view's, then times each route's
 * own passes with a timer query, unpaced.
 *
 *   node tools/render-stack/route-cost.mjs [--out <dir>]
 *
 * The full-screen route copies the canvas depth into a full-size
 * DEPTH24_STENCIL8 texture (one blit), draws 250 lamp sites into a full-size
 * half-float source against it, blurs over three mips from half size (twelve
 * full-screen draws) and adds the result onto the canvas. The point route
 * draws 1,024 additive, depth-tested sprites in the canvas pass. Both are
 * timed at 1440×900 and 2160×1350, gate 6's two pixel ratios at the named
 * viewport. Before timing, the copied depth is compared with the same scene's
 * depth drawn single-sampled, since a blit that is legal is not yet a blit
 * whose values are right. Headed Edge, because the named GPU is read through
 * it; the frame is unpaced (vsync and the frame-rate limit off) for the
 * reason docs/screenshots/issue-1001/README.md gives.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const outArg = process.argv.indexOf('--out');
const OUT = resolve(
  outArg === -1 ? join(here, '..', '..', '.dev-loop', 'route-cost') : process.argv[outArg + 1]
);

function playwright() {
  const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
  for (const c of [
    'playwright',
    'playwright-core',
    `${root}/playwright/index.js`,
    `${root}/playwright-core/index.js`,
  ]) {
    try {
      return require(c);
    } catch {
      continue;
    }
  }
  throw new Error('Could not load Playwright; install it globally (`npm i -g playwright`).');
}

const browser = await playwright().chromium.launch({
  channel: 'msedge',
  headless: false,
  args: [
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    '--disable-features=CalculateNativeWinOcclusion',
  ],
});
const results = [];
try {
  for (const [w, h] of [
    [1440, 900],
    [2160, 1350],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const url = pathToFileURL(join(here, 'route-cost.html'));
    url.search = `?w=${w}&h=${h}`;
    await page.goto(url.href);
    const result = await page.evaluate(() => window.__routeCost);
    if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
    results.push(result);
    await page.close();
  }
} finally {
  await browser.close();
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'route-cost.json'), JSON.stringify(results, null, 2) + '\n');
for (const r of results) {
  const line = Object.entries(r.variants).map(
    ([v, { parts }]) =>
      `${v}: ` +
      Object.entries(parts)
        .map(([p, s]) => `${p} ${s.avgMs}`)
        .join(', ')
  );
  console.log(
    `${r.size.width}x${r.size.height} samples ${r.samples} route ${r.routeMiB} MiB, depth check ${JSON.stringify(r.depthCheck)}`
  );
  for (const l of line) console.log(`  ${l}`);
}
console.log(`written: ${join(OUT, 'route-cost.json')}`);
