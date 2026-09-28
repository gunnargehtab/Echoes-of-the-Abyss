/**
 * #974 paired live-match cameras. Run through run-game/drive.mjs, not standalone.
 * CAPTURE_DIR names the same directory passed to drive's --out.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default async ({ page, shot }) => {
  assert.ok(process.env.CAPTURE_DIR, 'CAPTURE_DIR must match drive --out');
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) throw new Error('WebGL2 unavailable');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  });
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'match must contain an own force');
  const readings = [];
  for (const [name, distance, pitchDeg] of [
    ['home', 6000, 55],
    ['close', 1800, 55],
    ['low', 3500, 12],
    ['survey', 18000, 88],
  ]) {
    await page.evaluate(({ centre, distance, pitchDeg, name }) => {
      window.__perspectiveCamera(centre.x, centre.z, distance, {
        yawDeg: 0, pitchDeg, focusDepthM: null,
      });
      window.__perspectiveStation(name);
    }, { centre, distance, pitchDeg, name });
    await page.waitForFunction(() => {
      const p = window.__perspectiveProbe();
      return p.stationFrames >= 240 && p.overlayFrames >= 240;
    }, null, { timeout: 120000 });
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    assert.ok(probe.drawCalls <= 150, `${name}: draw budget`);
    assert.ok(probe.triangles <= 250000, `${name}: triangle budget`);
    readings.push({ name, probe });
    await shot(name);
  }
  writeFileSync(join(process.env.CAPTURE_DIR, 'readings.json'),
    JSON.stringify({ renderer, readings }, null, 2) + '\n');
  console.log(JSON.stringify({ renderer, readings }));
};
