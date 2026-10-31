import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  const probe = () => page.evaluate(() => {
    const p = window.__perspectiveProbe();
    return { eye: p.eye, orientation: p.orientation, flight: p.flight, hullScale: p.hullScale };
  });
  const units = await page.evaluate(() => window.__perspectiveLamps().units);
  const hull = units.find((unit) => unit.depthM >= 300 && unit.screen);
  assert.ok(hull);
  const entries = [];
  for (const distance of [1000, 18000]) {
    await page.evaluate(({ hull, distance }) => {
      window.__perspectiveCamera(hull.xM, hull.zM, distance, { focusDepthM: hull.depthM });
    }, { hull, distance });
    await page.keyboard.press('F9');
    await page.waitForTimeout(350);
    const entry = await probe();
    assert.equal(entry.hullScale, 1, 'flight never inherits saved orbit enlargement');
    entries.push({ distance, ...entry });
    await shot(`entry-${distance}`);
    await page.keyboard.press('Home');
  }
  await page.evaluate((hull) => {
    window.__perspectiveCamera(hull.xM, hull.zM, 200, { pitchDeg: 12, focusDepthM: hull.depthM });
  }, hull);
  await page.keyboard.press('F9');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyD');
  await shot('snow-follows-eye');
  const beforeMenu = await probe();
  await page.keyboard.down('KeyD');
  await page.mouse.click(1404, 704);
  await page.getByRole('button', { name: /Return to the water/i }).waitFor();
  await page.keyboard.up('KeyD');
  await shot('menu-from-nav');
  await page.getByRole('button', { name: /Return to the water/i }).click();
  const resumed = await probe();
  await page.waitForTimeout(300);
  assert.deepEqual((await probe()).eye, resumed.eye, 'MENU released the held motion');
  assert.equal(await page.getByText('CAMERA NAV — FLEET SHORTCUTS SUSPENDED').count(), 0);
  const dir = dirname(await shot('resumed'));
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({ entries, beforeMenu, resumed }, null, 2));
};
