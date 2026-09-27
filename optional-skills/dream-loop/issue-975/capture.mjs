import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Same CommonJS/global-package resolution and headed GPU policy as run-game/drive.mjs.
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      return require(name);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  const globalRoot = execFileSync(
    process.platform === 'win32' ? process.env.ComSpec : 'npm',
    process.platform === 'win32' ? ['/c', 'npm root -g'] : ['root', '-g'],
    { encoding: 'utf8' }
  ).trim();
  for (const name of ['playwright', 'playwright-core']) {
    try {
      return require(join(globalRoot, name));
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error(
    'Playwright is missing. Use the run-game browser setup; no browser download is needed.'
  );
}

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://127.0.0.1:4175/' },
    out: { type: 'string', default: '.dream-loop/issue-975/capture' },
    headed: { type: 'boolean', default: false },
    channel: { type: 'string' },
    measure: { type: 'boolean', default: false },
    verify: { type: 'boolean', default: false },
  },
});
const out = resolve(values.out);
await mkdir(out, { recursive: true });
const response = await fetch(values.url);
if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`);
const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  headless: !values.headed,
  ...(values.channel ? { channel: values.channel } : {}),
  args: [
    '--no-sandbox',
    ...(values.headed ? ['--disable-features=CalculateNativeWinOcclusion'] : []),
  ],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  const requests = new Set();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.add(request.url()));
  const started = Date.now();
  await page.goto(values.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__rendered || window.__renderError, null, {
    timeout: 180_000,
  });
  const info = await page.evaluate(() => {
    if (window.__renderError) throw new Error(window.__renderError);
    const canvas = document.getElementById('art');
    const gl = canvas.getContext('webgl2');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      width: canvas.width,
      height: canvas.height,
      dpr: devicePixelRatio,
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      probe: window.__keyArt?.probe() ?? null,
    };
  });
  const readyMs = Date.now() - started;
  const lockedFrame = await page.screenshot({ path: join(out, 'frame.png') });
  if (values.verify) {
    await page.evaluate(() => {
      const canvas = document.getElementById('art');
      const gl = canvas.getContext('webgl2');
      window.__capturePixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(
        0,
        0,
        canvas.width,
        canvas.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        window.__capturePixels
      );
    });
  }
  const measurement = values.measure
    ? await page.evaluate(async () => {
        if (!window.__keyArt) throw new Error('This page does not expose the render measurement');
        return window.__keyArt.measure(10_000);
      })
    : null;
  let verification = null;
  if (values.verify) {
    await page.waitForFunction(() => window.__rendered, null, { timeout: 180_000 });
    const initial = await page.evaluate(() => window.__keyArt.probe());
    assert.equal(initial.samples, 64);
    assert.equal(info.width, 1920);
    assert.equal(info.height, 1080);
    assert.equal(initial.inventory.BathyarchDreadnought, 1);
    assert.equal(initial.inventory.fishSchool, 2);
    assert.equal(initial.inventory.ctenophore, 46);
    assert.ok(initial.work.triangles > 3_000_000, 'The scene must render actual geometry');
    await page.waitForTimeout(400);
    const idle = await page.evaluate(() => window.__keyArt.probe());
    assert.equal(idle.work.frame, initial.work.frame, 'A settled still must not keep rendering');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.__rendered, null, { timeout: 180_000 });
    const drifted = await page.evaluate(() => window.__keyArt.probe());
    assert.ok(drifted.camera.yaw > 0, 'Arrow keys must move the actual camera');
    const driftFrame = await page.screenshot({ path: join(out, 'drift.png') });
    assert.ok(!driftFrame.equals(lockedFrame), 'The drifted image must change');
    await page.keyboard.press('r');
    await page.waitForFunction(() => window.__rendered, null, { timeout: 180_000 });
    await page.screenshot({ path: join(out, 'restored.png') });
    const resetPixels = await page.evaluate(() => {
      const canvas = document.getElementById('art');
      const gl = canvas.getContext('webgl2');
      const pixels = new Uint8Array(window.__capturePixels.length);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let max = 0,
        sum = 0,
        changed = 0;
      for (let i = 0; i < pixels.length; i++) {
        if (i % 4 === 3) continue;
        const delta = Math.abs(pixels[i] - window.__capturePixels[i]);
        max = Math.max(max, delta);
        sum += delta;
        if (delta) changed++;
      }
      delete window.__capturePixels;
      return {
        maxChannelDelta: max,
        meanChannelDelta: sum / (canvas.width * canvas.height * 3),
        changedChannels: changed,
      };
    });
    // Half-float blending can round a few channels by one 8-bit step on a second render.
    assert.ok(
      resetPixels.maxChannelDelta <= 1 && resetPixels.meanChannelDelta <= 0.001,
      `Reset changed rendered content: ${JSON.stringify(resetPixels)}`
    );
    const downloaded = page.waitForEvent('download');
    await page.keyboard.press('s');
    const download = await downloaded;
    await download.saveAs(join(out, 'export.png'));
    const exported = await readFile(join(out, 'export.png'));
    assert.equal(exported.readUInt32BE(16), 1920);
    assert.equal(exported.readUInt32BE(20), 1080);
    await page.setViewportSize({ width: 900, height: 1200 });
    const portrait = await page.locator('#art').boundingBox();
    assert.equal(portrait.width, 900);
    assert.ok(Math.abs(portrait.height - (900 * 9) / 16) < 1);
    assert.ok(Math.abs(portrait.y - (1200 - portrait.height) / 2) < 1);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const invalid = await context.newPage();
    const invalidUrl = new URL(values.url);
    invalidUrl.searchParams.set('frames', '0');
    await invalid.goto(invalidUrl.href);
    await invalid.waitForFunction(() => window.__renderError, null, { timeout: 15_000 });
    assert.match(await invalid.locator('#error').innerText(), /frames must be an integer/);
    await invalid.close();
    const origin = new URL(values.url).origin;
    assert.ok([...requests].every((url) => new URL(url).origin === origin));
    assert.ok([...requests].every((url) => !new URL(url).pathname.endsWith('.png')));
    verification = {
      passed: true,
      idleStopsRendering: true,
      keyboardMovesCamera: true,
      resetPixels,
      pngExport: '1920x1080',
      portraitLetterbox: portrait,
      invalidInputVisible: true,
      allRequestsLocal: true,
      noImageBackdrop: true,
    };
  }
  const result = {
    url: values.url,
    capturedAt: new Date().toISOString(),
    readyMs,
    ...info,
    measurement,
    verification,
    requests: [...requests],
    errors,
  };
  await writeFile(join(out, 'metrics.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) throw new Error(`${errors.length} browser errors; see metrics.json`);
} finally {
  await browser.close();
}
