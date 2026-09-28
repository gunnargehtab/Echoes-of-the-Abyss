import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Observational stations for the first checkpoint, not interaction acceptance.
export default async function ({ page, shot }) {
  await page.waitForFunction(() => {
    const p = window.__perspectiveProbe?.();
    return p && p.units === 6;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log('initial probe:', await page.evaluate(() => window.__perspectiveProbe()));
  const readings = [];
  const capture = async (name, camera) => {
    if (camera) {
      await page.evaluate((args) => window.__perspectiveCamera(...args), camera);
    }
    await page.evaluate((label) => window.__perspectiveStation(label), name);
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 240);
    const p = await page.evaluate(() => window.__perspectiveProbe());
    assert.ok(p.overlayFrames > 0);
    assert.ok(p.drawCalls <= 150);
    assert.ok(p.triangles <= 250000);
    const file = await shot(name);
    readings.push({ name, file, ...p });
    return file;
  };
  const first = await capture('opening');
  await capture('escorts', [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }]);
  await capture('court', [2550, 2750, 650, { pitchDeg: 20, yawDeg: 0, focusDepthM: 1500 }]);
  await capture('survey', [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }]);
  const renderer = await page.evaluate(() => {
    for (const canvas of document.querySelectorAll('canvas')) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) continue;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    }
    return 'unavailable';
  });
  writeFileSync(join(dirname(first), 'readings.json'), JSON.stringify({ renderer, readings }, null, 2));
  console.log(JSON.stringify({ renderer, readings }));
}
