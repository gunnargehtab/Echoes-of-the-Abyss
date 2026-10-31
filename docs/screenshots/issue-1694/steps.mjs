import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

export default async function ({ page, shot }) {
  await page.waitForTimeout(6000);
  const read = () => page.evaluate(() => window.__perspectiveLamps());
  const first = (await read()).units.find((unit) => unit.depthM >= 300 && unit.screen);
  assert.ok(first, 'a modelled own hull must be present');
  await page.evaluate((unit) => {
    window.__perspectiveCamera(unit.xM, unit.zM, 900, {
      pitchDeg: 35,
      focusDepthM: unit.depthM,
    });
  }, first);
  await page.waitForTimeout(1000);
  await page.mouse.click(720, 450);
  await page.waitForTimeout(400);
  await shot('depth-controls');
  const rig = () => page.evaluate(() => {
    const p = window.__perspectiveProbe();
    return { eye: p.eye, focus: p.focus, pitch: p.pitchDeg, yaw: p.yawDeg };
  });
  const camera = await rig();
  const before = (await read()).units.find((unit) => unit.id === first.id);
  await page.mouse.click(950, 450, { button: 'right' });
  await page.keyboard.press('KeyS');
  await page.keyboard.press('KeyS');
  await page.waitForTimeout(3500);
  const rising = (await read()).units.find((unit) => unit.id === first.id);
  assert.ok(rising.depthM < before.depthM - 15, 'rise must reach the server and move the hull');
  assert.ok(
    Math.hypot(rising.xM - before.xM, rising.zM - before.zM) > 1,
    'the horizontal move must continue during the rise'
  );
  assert.deepEqual(await rig(), camera, 'unit rise must not move the camera');
  await shot('rising-on-course');
  await page.keyboard.press('KeyD');
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(600);
  const diving = (await read()).units.find((unit) => unit.id === first.id);
  assert.ok(diving.depthM > rising.depthM, 'dive must reverse the vertical travel');
  assert.ok(diving.sig >= 72, 'a dive must retain its documented loudness');
  assert.deepEqual(await rig(), camera, 'unit dive must not move the camera');
  await shot('diving-on-course');
  const fields = (unit) => ({
    id: unit.id, name: unit.name, xM: unit.xM, zM: unit.zM, depthM: unit.depthM, sig: unit.sig,
  });
  const result = { camera, before: fields(before), rising: fields(rising), diving: fields(diving) };
  writeFileSync(new URL('./readings.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
