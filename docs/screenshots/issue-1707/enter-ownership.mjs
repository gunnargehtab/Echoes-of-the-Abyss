import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// SETTINGS_JSON={"bindingLayout":"custom","bindings":{"toggleNav":"Enter"}}
export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const hull = (await units()).find((unit) => unit.depthM >= 300 && unit.screen);
  assert.ok(hull);
  await page.evaluate((unit) => {
    window.__perspectiveCamera(unit.xM, unit.zM, 200, { pitchDeg: 12, focusDepthM: unit.depthM });
  }, hull);
  await page.waitForTimeout(350);
  await page.mouse.click(720, 450);
  await page.getByRole('button', { name: 'MOVE 3D', exact: true }).click();
  await page.getByRole('button', { name: 'PIN POSITION', exact: true }).click();
  const depth = Math.round(hull.depthM - 150);
  await page.getByLabel('Destination depth (m)').fill(String(depth));
  await page.mouse.click(900, 450);
  await page.keyboard.press('Enter');
  await page.getByText('CAMERA NAV — FLEET SHORTCUTS SUSPENDED').waitFor();
  await page.waitForTimeout(1000);
  const duringNav = (await units()).find((unit) => unit.id === hull.id);
  assert.equal(duringNav.depthM, hull.depthM, 'the saved NAV binding sent no move');
  await shot('legacy-enter-nav');
  await page.keyboard.press('Enter');
  assert.equal(await page.getByText('CAMERA NAV — FLEET SHORTCUTS SUSPENDED').count(), 0);
  await page.getByLabel('Destination depth (m)').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'MOVE 3D', exact: true }).waitFor();
  await page.waitForTimeout(12000);
  const arrived = (await units()).find((unit) => unit.id === hull.id);
  assert.ok(Math.abs(arrived.depthM - depth) <= 2);
  const dir = dirname(await shot('field-confirmed-arrival'));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Controls/i }).click();
  await page.getByRole('button', { name: /^Camera NAV:/i }).click();
  await page.keyboard.press('Enter');
  assert.match(await page.getByRole('alert').innerText(), /reserved.*MOVE 3D/);
  await shot('reserved-enter-conflict');
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({ hull, duringNav, depth, arrived }, null, 2));
};
