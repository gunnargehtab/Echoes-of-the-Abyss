import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(5000);
  const p = await page.evaluate(() => window.__perspectiveProbe());
  assert.equal(p.look, 'standard');
  assert.equal(p.decorativePhotophores, 0);
  assert.deepEqual(p.fixtureAssets, {});
  assert.ok(p.props > 0);
  const dir = dirname(await shot('kelp-labyrinth-study-off'));
  const before = await page.evaluate(() =>
    window.__perspectiveLamps().units.find((u) => u.depthM >= 300 && u.screen));
  assert.ok(before);
  await page.evaluate((u) => window.__perspectiveCamera(u.xM, u.zM, 500, {
    pitchDeg: 55, focusDepthM: u.depthM,
  }), before);
  await page.waitForTimeout(300);
  await page.mouse.click(720, 450);
  await page.mouse.click(950, 450, { button: 'right' });
  await page.keyboard.press('KeyS');
  await page.waitForTimeout(1800);
  const after = await page.evaluate((id) =>
    window.__perspectiveLamps().units.find((u) => u.id === id), before.id);
  assert.ok(after.depthM < before.depthM, 'ordinary Rise reaches the server');
  assert.ok(Math.hypot(after.xM - before.xM, after.zM - before.zM) > 1);
  const focusBefore = await page.evaluate(() => window.__perspectiveProbe().focus);
  await page.mouse.move(900, 400);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(980, 420, { steps: 6 });
  await page.mouse.up({ button: 'middle' });
  const focusAfter = await page.evaluate(() => window.__perspectiveProbe().focus);
  assert.notDeepEqual(focusAfter, focusBefore);
  assert.equal(await page.getByRole('button', { name: 'FLIGHT', exact: true }).count(), 0);
  await shot('ordinary-orbit-and-fleet-orders');
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({
    look: p.look, props: p.props, propTriangles: p.propTris,
    decorativePhotophores: p.decorativePhotophores, fixtureAssets: p.fixtureAssets,
    calls: p.drawCalls, triangles: p.triangles, textures: p.textures,
    environmentBytes: p.environmentBytes, haloBytes: p.haloBytes, splitBytes: p.splitBytes,
    before, after, focusBefore, focusAfter,
  }, null, 2) + '\n');
};
