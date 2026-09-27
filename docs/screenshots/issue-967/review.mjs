// The locked shot first; then the free-camera and moving-view controls.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import measure from './measure.mjs';

export default async ({ page, shot }) => {
  await measure({ page, shot });
  const readings = [];
  for (const [name, distance, aim] of [
    ['low', 1500, { pitchDeg: 12, yawDeg: 0, focusDepthM: 700 }],
    ['overhead', 1500, { pitchDeg: 88, yawDeg: 0, focusDepthM: null }],
    ['survey', 8000, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }],
  ]) {
    await page.evaluate(({ distance, aim }) => {
      window.__perspectiveCamera(1340, 1300, distance, aim);
    }, { distance, aim });
    await page.waitForTimeout(2000);
    await page.evaluate((name) => window.__perspectiveStation(name), name);
    await page.waitForTimeout(5000);
    const reading = await page.evaluate(() => window.__perspectiveProbe());
    assert.ok(reading.drawCalls <= 150, `${name}: ${reading.drawCalls} draw calls`);
    assert.ok(reading.triangles <= 250000, `${name}: ${reading.triangles} triangles`);
    assert.ok(reading.propTris <= 105000, `${name}: ${reading.propTris} prop triangles`);
    readings.push(reading);
    await shot(name);
  }
  const pan = await page.evaluate(async () => {
    window.__perspectiveCamera(1340, 1300, 1500, {
      pitchDeg: 55, yawDeg: 0, focusDepthM: null,
    });
    window.__perspectiveStation('pan');
    for (let frame = 0; frame < 300; frame++) {
      window.__perspectiveCamera(1340 + 180 * Math.sin(frame / 50), 1300, 1500);
      await new Promise(requestAnimationFrame);
    }
    return window.__perspectiveProbe();
  });
  assert.ok(pan.drawCalls <= 150);
  assert.ok(pan.triangles <= 250000);
  readings.push(pan);
  writeFileSync(
    process.env.DREAM_REVIEW ?? '.dream-loop/review.json',
    JSON.stringify(readings, null, 2)
  );
  console.log(JSON.stringify(readings, null, 2));
};
