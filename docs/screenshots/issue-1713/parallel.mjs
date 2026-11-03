import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked === 3);
  const units = () => page.evaluate(() => window.__perspectiveLamps().units.map((u) => ({
    id: u.id, x: u.xM, z: u.zM, depth: u.depthM,
    depthOrder: u.depthOrder, queuedOrders: u.queuedOrders,
  })));
  const before = await units();
  await page.evaluate(() => window.__perspectiveCamera(625, 2125, 500, {
    pitchDeg: 15, focusDepthM: 300,
  }));
  await page.waitForTimeout(300);
  const screen = await page.evaluate(() =>
    window.__perspectiveLamps().units.find((u) => u.name === 'Corvette').screen);
  await page.mouse.click((screen.x0 + screen.x1) / 2, (screen.y0 + screen.y1) / 2);
  await page.getByRole('button', { name: 'MOVE 3D', exact: true }).click();
  await page.getByLabel('Map x (m)').fill('2125');
  await page.getByLabel('Map y (m)').fill('2125');
  await page.getByRole('button', { name: 'PIN POSITION', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'CONFIRM', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'UNPIN', exact: true }).click();
  await page.getByRole('button', { name: 'NAV', exact: true }).click();
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.mouse.move(950, 450);
  const orientation = await page.evaluate(() => window.__perspectiveProbe().orientation);
  const [x, y, z, w] = orientation;
  const forwardY = 2 * (w * x - y * z);
  assert.ok(Math.abs(forwardY) < 1e-10, 'centre-row ray is parallel to the command plane');
  await page.getByText('NO WATER TARGET', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'CONFIRM', exact: true }).isEnabled(), false);
  await page.mouse.click(950, 450);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  assert.deepEqual(await units(), before, 'invalid confirmation leaves the fleet and orders unchanged');
  await page.getByRole('button', { name: 'CONFIRM', exact: true }).scrollIntoViewIfNeeded();
  const dir = dirname(await shot('parallel-ray-refused'));
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({
    forwardY, orientation, reason: 'NO WATER TARGET', confirmDisabled: true,
    fleetUnchanged: true, before, after: await units(),
  }, null, 2) + '\n');
};
