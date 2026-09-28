import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Run through drive.mjs --entry tutorial. Observers wrap the real client methods;
// all orders below are keyboard/pointer input, never simulation writes.
export default async function ({ page, shot }) {
  await page.evaluate(async () => {
    const { PerspectiveView } = await import('/src/game/PerspectiveView.ts');
    const { EchoRenderer } = await import('/src/game/EchoRenderer.ts');
    const viewSnapshot = PerspectiveView.prototype.applySnapshot;
    const chartSnapshot = EchoRenderer.prototype.applySnapshot;
    const ground = PerspectiveView.prototype.applyGround;
    window.__acceptance = { ground: [], motions: [], view: null, chart: null, snapshot: null };
    PerspectiveView.prototype.applySnapshot = function (snapshot) {
      window.__acceptance.view = this;
      window.__acceptance.snapshot = snapshot;
      return viewSnapshot.call(this, snapshot);
    };
    EchoRenderer.prototype.applySnapshot = function (snapshot) {
      window.__acceptance.chart = this;
      return chartSnapshot.call(this, snapshot);
    };
    PerspectiveView.prototype.applyGround = function (cells) {
      window.__acceptance.ground.push(...cells);
      return ground.call(this, cells);
    };
    const reduced = PerspectiveView.prototype.setReducedMotion;
    PerspectiveView.prototype.setReducedMotion = function (value) {
      window.__acceptance.motions.push(value);
      return reduced.call(this, value);
    };
  });
  await page.waitForFunction(() => window.__acceptance.snapshot && window.__perspectiveProbe().modelBacked === 6);
  const readings = [];
  const observations = {};
  let folder;
  const persist = (complete = false) => {
    if (folder) writeFileSync(join(folder, 'readings.json'),
      JSON.stringify({ complete, renderer, observations, readings }, null, 2));
  };
  const capture = async (name, camera) => {
    if (camera) await page.evaluate((args) => window.__perspectiveCamera(...args), camera);
    await page.evaluate((label) => window.__perspectiveStation(label), name);
    await page.waitForFunction(() => {
      const p = window.__perspectiveProbe();
      return p.stationFrames >= 240 && p.overlayFrames >= 240;
    });
    const p = await page.evaluate(() => window.__perspectiveProbe());
    assert.ok(p.drawCalls <= 150 && p.triangles <= 250000);
    const file = await shot(name);
    folder = dirname(file);
    readings.push({ name, file: basename(file), ...p });
    persist();
  };
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  assert.equal(await page.evaluate(() => window.__perspectiveProbe().look), 'sorrowgate');
  assert.equal(await page.evaluate(() => window.__perspectiveProbe().props), 80);
  await capture('opening');
  await capture('escorts', [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }]);
  await capture('court', [2550, 2750, 650, { pitchDeg: 20, yawDeg: 0, focusDepthM: 1500 }]);
  await capture('survey', [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }]);

  const scout = await page.evaluate(() => window.__acceptance.snapshot.units.find((u) => u.sig === 6));
  assert.ok(scout, 'the court flight is idle at six');
  await page.evaluate((u) => window.__perspectiveCamera(u.x, u.y, 1100, {
    pitchDeg: 55, yawDeg: 0, focusDepthM: u.depth,
  }), scout);
  await page.waitForTimeout(500);
  const point = await page.evaluate((u) => window.__acceptance.view.projectPoint(u.x, u.y, u.depth), scout);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction((id) => window.__acceptance.chart.selected.has(id), scout.id);
  observations.selected = scout.id;
  observations.idle = scout.sig;
  const target = await page.evaluate((u) =>
    window.__acceptance.view.projectPoint(u.x + 180, u.y + 100, null), scout);
  await page.mouse.click(target.x, target.y, { button: 'right' });
  await page.waitForFunction((id) =>
    window.__acceptance.snapshot.units.find((u) => u.id === id)?.sig === 12, scout.id);
  observations.cruise = await page.evaluate((id) =>
    window.__acceptance.snapshot.units.find((u) => u.id === id), scout.id);
  await shot('cruise-sig-12');
  await page.keyboard.press('KeyX');
  await page.waitForFunction((id) =>
    window.__acceptance.snapshot.units.find((u) => u.id === id)?.sig === 6, scout.id);
  observations.stopped = await page.evaluate((id) =>
    window.__acceptance.snapshot.units.find((u) => u.id === id), scout.id);
  assert.ok(Math.hypot(observations.stopped.x - scout.x, observations.stopped.y - scout.y) > 0);
  await capture('stopped-sig-6');
  for (const [key, reason, name] of [
    ['KeyP', 'array was pulled', 'sonar-refused'],
    ['KeyR', 'not yours to build', 'construction-refused'],
  ]) {
    await page.keyboard.press(key);
    await page.waitForFunction((text) => window.__acceptance.chart.refusal?.reason.includes(text), reason);
    observations[name] = await page.evaluate(() => window.__acceptance.chart.refusal.reason);
    await shot(name);
  }
  assert.equal(await page.evaluate((id) =>
    window.__acceptance.snapshot.units.find((u) => u.id === id).sig, scout.id), 6);
  assert.equal(await page.evaluate(() => window.__acceptance.snapshot.structures.length), 1);
  observations.flightChip = await page.locator('.objectives-ceiling').innerText();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Settings/ }).click();
  const alternate = page.getByRole('button', { name: 'Deuteranopia', exact: true });
  await alternate.focus();
  await page.keyboard.press('Enter');
  assert.equal(await alternate.getAttribute('aria-pressed'), 'true');
  await page.getByRole('checkbox', { name: /^Reduced motion/ }).check();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.esc-menu', { state: 'detached' });
  await capture('accessible-escorts', [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }]);
  observations.reducedMotion = await page.evaluate(() => window.__acceptance.motions.at(-1));
  assert.equal(observations.reducedMotion, true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Settings/ }).click();
  await page.getByRole('button', { name: 'Standard', exact: true }).click();
  await page.getByRole('checkbox', { name: /^Reduced motion/ }).uncheck();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.esc-menu', { state: 'detached' });

  // The authored collapse is at 10:40. Wait on the actual server clock.
  await page.evaluate(() => window.__perspectiveCamera(2500, 2000, 6500, {
    pitchDeg: 55, yawDeg: 0, focusDepthM: null,
  }));
  console.log('Waiting for the authored 10:40 ground delta; no clock acceleration.');
  await page.waitForFunction(() => window.__acceptance.ground.length > 0, null, { timeout: 700000 });
  await page.waitForFunction(() => window.__perspectiveProbe().structures === 0);
  observations.ground = await page.evaluate(() => window.__acceptance.ground);
  assert.ok(observations.ground.some((cell) => cell.ceilingM > cell.floorM));
  await capture('arch-collapse');
  const leave = async () => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Return to port/ }).click();
    await page.getByRole('button', { name: 'Abandon the water', exact: true }).click();
    await page.getByRole('button', { name: /^Tutorial/ }).waitFor();
    assert.equal(await page.evaluate(() => typeof window.__perspectiveProbe), 'undefined');
    assert.equal(await page.locator('.perspective-host canvas').count(), 0);
  };
  await leave();
  observations.teardown = true;
  await page.getByRole('button', { name: /^Campaign/ }).click();
  await page.getByRole('button', { name: /Prologue.*Sorrowgate/ }).click();
  await page.getByRole('button', { name: 'Descend', exact: true }).click();
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked === 6);
  await capture('campaign-tutorial');
  assert.equal(readings.at(-1).look, 'sorrowgate');
  await leave();
  await page.getByRole('button', { name: /^Campaign/ }).click();
  await page.getByRole('button', { name: /^1 Tend/ }).click();
  await page.getByRole('button', { name: 'Descend', exact: true }).click();
  await page.waitForFunction(() => {
    const p = window.__perspectiveProbe?.();
    return p?.look === 'standard' && p.modelBacked > 0 && p.props > 0;
  });
  await capture('non-target-tend');
  observations.nonTarget = 'standard';
  persist(true);
  console.log(JSON.stringify({ renderer, observations, readings }));
}
