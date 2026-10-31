import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const probe = () => page.evaluate(() => {
    const p = window.__perspectiveProbe();
    return {
      eye: p.eye, focus: p.focus, orientation: p.orientation, flight: p.flight,
      drawCalls: p.drawCalls, triangles: p.triangles,
    };
  });
  const hull = (await units()).find((unit) => unit.depthM >= 300 && unit.screen);
  assert.ok(hull, 'a visible own hull is required');
  await page.evaluate((unit) => {
    window.__perspectiveCamera(unit.xM, unit.zM, 200, {
      pitchDeg: 12, focusDepthM: unit.depthM,
    });
  }, hull);
  await page.waitForTimeout(500);
  await page.mouse.click(720, 450);
  const before = (await units()).find((unit) => unit.id === hull.id);
  await shot('orbit-control');
  const enabled = await page.getByRole('button', { name: 'FLIGHT', exact: true }).count();
  if (!enabled) {
    await page.mouse.click(950, 450, { button: 'right' });
    await page.keyboard.press('KeyS');
    await page.waitForTimeout(1800);
    const after = (await units()).find((unit) => unit.id === hull.id);
    assert.ok(after.depthM < before.depthM, 'ordinary fleet Rise remains live');
    const dir = dirname(await shot('non-target-rising'));
    writeFileSync(join(dir, 'readings.json'), JSON.stringify({ before, after, camera: await probe() }, null, 2));
    return;
  }
  await page.keyboard.press('F8');
  const entry = await probe();
  assert.equal(entry.flight.flying, true);
  await shot('flight-entry');
  await page.mouse.click(950, 450, { button: 'right' });
  await page.keyboard.press('F9');
  const motions = [];
  for (const key of ['KeyF', 'KeyR', 'KeyD', 'KeyA', 'KeyS', 'KeyW']) {
    const from = await probe();
    await page.keyboard.down(key);
    await page.waitForTimeout(120);
    await page.keyboard.up(key);
    const to = await probe();
    assert.notDeepEqual(to.eye, from.eye, `${key}: camera translates`);
    motions.push({ key, from: from.eye, to: to.eye });
  }
  // Twelve focusable steps are exactly 180 degrees, independent of frame pacing.
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Roll left', exact: true }).click();
  const rolled = await probe();
  assert.equal(rolled.flight.inverted, true);
  await shot('inverted-nav');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByText('CAMERA NAV — FLEET SHORTCUTS SUSPENDED').count(), 0);
  // Click the projected hull in the rolled view, then give a queued ordinary order.
  const live = (await units()).find((unit) => unit.id === hull.id);
  assert.ok(live.screen);
  const x = (live.screen.x0 + live.screen.x1) / 2;
  const y = (live.screen.y0 + live.screen.y1) / 2;
  await page.mouse.click(x, y);
  await page.keyboard.press('KeyS');
  await page.waitForTimeout(2000);
  const rising = (await units()).find((unit) => unit.id === hull.id);
  assert.ok(rising.depthM < before.depthM, `rolled selection and Rise reach the server: ${JSON.stringify({
    before: before.depthM, rising: rising.depthM,
  })}`);
  assert.ok(Math.hypot(rising.xM - before.xM, rising.zM - before.zM) > 1, 'fleet moves during NAV');
  // A later queued leg legitimately brings its own depth; sample the rise first.
  await page.keyboard.down('Shift');
  await page.mouse.click(x + 150, y, { button: 'right' });
  await page.keyboard.up('Shift');
  await shot('rolled-fleet-order');
  await page.keyboard.press('F9');
  for (let i = 0; i < 24; i++) await page.getByRole('button', { name: 'Look up', exact: true }).click();
  const pitchTurn = await probe();
  assert.ok(pitchTurn.orientation.every(Number.isFinite));
  for (let i = 0; i < 24; i++) await page.getByRole('button', { name: 'Look left', exact: true }).click();
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Roll left', exact: true }).click();
  await shot('full-turns');
  await page.keyboard.press('Home');
  const home = await probe();
  assert.equal(home.flight.flying, false);
  const dir = dirname(await shot('home-recovery'));
  await page.evaluate((unit) => {
    window.__perspectiveCamera(unit.xM, unit.zM, 250, { pitchDeg: 75, focusDepthM: unit.depthM });
  }, hull);
  await page.keyboard.press('F9');
  await page.getByRole('button', { name: 'Look down', exact: true }).click();
  const vertical = await probe();
  assert.equal(vertical.flight.bearingDeg, null);
  await shot('vertical');
  await page.keyboard.press('Home');
  const fields = (unit) => ({
    id: unit.id, name: unit.name, xM: unit.xM, zM: unit.zM, depthM: unit.depthM, sig: unit.sig,
  });
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({
    entry, motions, rolled, pitchTurn, home, vertical,
    before: fields(before), rising: fields(rising),
  }, null, 2));
};
