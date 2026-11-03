import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184);
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const opening = await units();
  const corvette = opening.find((u) => u.xM === 625 && u.zM === 2125);
  const scout = opening.find((u) => u.xM === 625 && u.zM === 1875);
  const harvester = opening.find((u) => u.xM === 375 && u.zM === 1875);
  assert.ok(corvette && scout && harvester);
  assert.equal(typeof corvette.unhealableDamage, 'number');
  const dir = dirname(await shot('opening'));
  const readings = { opening, checkpoints: [], turns: [] };
  const save = () => writeFileSync(join(dir, 'readings.json'), JSON.stringify(readings, null, 2) + '\n');
  const record = async (name) => {
    const live = await units();
    assert.equal(live.find((u) => u.id === scout.id).depthM, 300, 'scout stays shallow');
    readings.checkpoints.push({ name, units: live });
    save();
    console.log(`checkpoint: ${name}`);
  };
  const frame = async (id, pitchDeg = 55) => {
    const unit = (await units()).find((u) => u.id === id);
    assert.ok(unit, `own hull ${id} survived`);
    await page.evaluate(({ unit, pitchDeg }) => window.__perspectiveCamera(unit.xM, unit.zM, 500, {
      pitchDeg, focusDepthM: unit.depthM,
    }), { unit, pitchDeg });
    await page.waitForTimeout(150);
  };
  const select = async (id, add = false) => {
    await frame(id);
    const { screen } = (await units()).find((u) => u.id === id);
    assert.ok(screen);
    if (add) await page.keyboard.down('Shift');
    await page.mouse.click((screen.x0 + screen.x1) / 2, (screen.y0 + screen.y1) / 2);
    if (add) await page.keyboard.up('Shift');
  };
  const type = async (value) => {
    await page.keyboard.press('Control+A');
    await page.keyboard.type(String(value));
  };
  // From the focusable action onwards, the whole preview uses only the keyboard.
  const order = async (x, y, depth, { queue = false, hulls = 1, warning = false } = {}) => {
    await page.getByRole('button', { name: 'MOVE 3D', exact: true }).focus();
    await page.keyboard.press('Space');
    assert.ok(await page.getByText(`MOVE 3D · ${hulls} hulls · FIXED DEPTH`, { exact: true }).count());
    await page.getByLabel('Map x (m)').focus();
    await type(x);
    await page.keyboard.press('Tab');
    await type(y);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await type(depth);
    if (warning) {
      assert.ok(await page.getByText(/CRUSH RISK/).count());
      await shot('deliberate-crush-warning');
    }
    // Depth -> raise -> lower -> queue -> confirm.
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    if (queue) await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'CONFIRM');
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'MOVE 3D', exact: true }).waitFor();
    await page.locator('canvas').last().focus();
  };
  const arrived = async (id, x, z, depth, reach = 20) => {
    try {
      await page.waitForFunction(({ id, x, z, depth, reach }) => {
        const u = window.__perspectiveLamps().units.find((u) => u.id === id);
        return u && Math.hypot(u.xM - x, u.zM - z) < reach &&
          Math.abs(u.depthM - depth) < 3 && !u.queuedOrders?.length;
      }, { id, x, z, depth, reach }, { timeout: 180000 });
    } catch (error) {
      console.error(JSON.stringify(await units()));
      throw error;
    }
  };

  await select(corvette.id);
  await select(harvester.id, true);
  await order(875, 2125, 450, { hulls: 2 });
  await order(875, 2375, 450, { hulls: 2, queue: true });
  await page.waitForFunction(() => window.__perspectiveLamps().units.filter((u) =>
    u.queuedOrders?.some((o) => o.depth === 450)).length === 2);
  await page.keyboard.press('KeyS');
  await page.waitForFunction(() => window.__perspectiveLamps().units.filter((u) =>
    u.depthOrder === 300 && u.queuedOrders?.some((o) => o.depth === 450)).length === 2);
  await record('mixed-rise-preserves-queued-depth');
  await arrived(corvette.id, 875, 2375, 450, 110);
  await arrived(harvester.id, 875, 2375, 450, 110);
  await record('mixed-queued-leg-completed');
  await shot('mixed-queued-leg-completed');

  // The one-handed layout keeps S/D and moves ping from P to Q.
  await select(corvette.id);
  await page.keyboard.press('KeyQ');
  await page.waitForFunction((id) =>
    window.__perspectiveLamps().units.find((u) => u.id === id)?.sig >= 90, corvette.id);
  readings.oneHandedPing = true;
  await order(875, 2375, 300);
  await arrived(corvette.id, 875, 2375, 300, 110);

  for (const [name, x, z, depth] of [
    ['A', 1125, 1125, 300], ['B', 2125, 1125, 300], ['C', 3125, 1125, 300],
    ['D-shallow', 2125, 2125, 300], ['D-900', 2125, 2125, 900],
    ['D-1350', 2125, 2125, 1350],
  ]) {
    await order(x, z, depth);
    if (name === 'B') {
      await frame(corvette.id, 12);
      await page.keyboard.press('F9');
      const before = (await units()).find((u) => u.id === corvette.id);
      await page.keyboard.down('KeyS');
      await page.waitForTimeout(700);
      await page.keyboard.up('KeyS');
      const after = (await units()).find((u) => u.id === corvette.id);
      assert.ok(Math.hypot(after.xM - before.xM, after.zM - before.zM) > 1);
      assert.equal(after.depthM, before.depthM, 'NAV S cannot rise the fleet');
      await shot('low-moving-camera-and-fleet');
      await page.keyboard.press('Home');
    }
    await arrived(corvette.id, x, z, depth);
    await record(name);
  }
  await frame(corvette.id, 12);
  await order(2125, 2125, 2000, { warning: true });
  await arrived(corvette.id, 2125, 2125, 2000);
  await record('D-crush-incurred');
  const crushed = (await units()).find((u) => u.id === corvette.id);
  assert.ok(crushed.unhealableDamage > 0 && crushed.hp < crushed.maxHp);
  await shot('crush-incurred');
  await order(2125, 2125, 1000);
  await arrived(corvette.id, 2125, 2125, 1000);
  const recovered = (await units()).find((u) => u.id === corvette.id);
  assert.ok(recovered.unhealableDamage >= crushed.unhealableDamage);
  await record('D-pressure-loss-persists');
  for (const [name, x, z] of [['E', 2125, 2875], ['F', 2125, 3125]]) {
    await order(x, z, 1000);
    await arrived(corvette.id, x, z, 1000);
    await frame(corvette.id);
    await record(name);
  }
  await page.keyboard.press('KeyS');
  await page.keyboard.press('KeyS');
  await arrived(corvette.id, 2125, 3125, 800);
  await page.waitForTimeout(1200);
  await record('F-roof-holds-ascent');
  await shot('roof-holds-ascent');
  await order(2125, 3125, 1000);
  await arrived(corvette.id, 2125, 3125, 1000);
  for (const [name, x, z, depth] of [
    ['H-deep', 2125, 3625, 1000], ['H-shallow', 2125, 3625, 300],
    ['G', 1125, 3625, 300], ['west-south', 875, 3625, 300],
    ['west-north', 875, 1875, 300],
  ]) {
    await order(x, z, depth);
    await arrived(corvette.id, x, z, depth);
    await record(name);
  }
  await frame(corvette.id);
  await shot('returned-via-shallow-route');

  await page.keyboard.press('F9');
  for (const action of ['Look left', 'Look up', 'Roll left']) {
    for (let i = 1; i <= 24; i++) {
      await page.getByRole('button', { name: action, exact: true }).click();
      const p = await page.evaluate(() => window.__perspectiveProbe());
      assert.ok(p.orientation.every(Number.isFinite));
      if ([6, 12, 24].includes(i)) {
        readings.turns.push({ action, degrees: i * 15, orientation: p.orientation, flight: p.flight });
        if (action === 'Roll left' && i === 12) await shot('inverted-after-journey');
      }
    }
  }
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => window.__perspectiveProbe().flight.flying), false);
  await frame(corvette.id, 75);
  await page.keyboard.press('F9');
  await page.getByRole('button', { name: 'Look down', exact: true }).click();
  readings.vertical = await page.evaluate(() => window.__perspectiveProbe().flight);
  assert.equal(readings.vertical.bearingDeg, null);
  await shot('vertical');
  await page.keyboard.press('Home');
  const beforeReload = (await units()).map((u) => ({ id: u.id, x: u.xM, z: u.zM, depth: u.depthM }));
  await page.reload();
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184);
  const afterReload = (await units()).map((u) => ({ id: u.id, x: u.xM, z: u.zM, depth: u.depthM }));
  assert.deepEqual(afterReload, beforeReload, 'socket reconnection preserves the own fleet');
  readings.reconnected = true;
  await shot('reconnected');
  save();
};
