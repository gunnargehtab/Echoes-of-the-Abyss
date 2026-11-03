import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184);
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const opening = await units();
  const corvette = opening.find((u) => u.xM === 625 && u.zM === 2125);
  const scout = opening.find((u) => u.xM === 625 && u.zM === 1875);
  assert.ok(corvette && scout);
  const dir = dirname(await shot('opening'));
  await page.evaluate((u) => window.__perspectiveCamera(u.xM, u.zM, 300, {
    pitchDeg: 55, focusDepthM: u.depthM,
  }), corvette);
  await page.waitForTimeout(300);
  await page.mouse.click(720, 450);
  const arm = async (x, y, depth, queue = false) => {
    await page.getByRole('button', { name: 'MOVE 3D', exact: true }).click();
    await page.getByLabel('Map x (m)').fill(String(x));
    await page.getByLabel('Map y (m)').fill(String(y));
    await page.getByLabel('Destination depth (m)').fill(String(depth));
    await page.getByRole('button', { name: 'PIN POSITION', exact: true }).click();
    if (queue) await page.getByLabel('Queue after current orders').check();
  };
  await arm(1125, 3125, 300);
  assert.equal(await page.getByRole('button', { name: 'CONFIRM', exact: true }).isEnabled(), false);
  await shot('solid-column-refused');
  await page.getByRole('button', { name: 'CANCEL', exact: true }).click();
  await arm(2125, 2125, 300);
  await page.getByRole('button', { name: 'CONFIRM', exact: true }).click();
  await page.mouse.click(720, 450);
  await page.keyboard.press('d');
  await page.waitForTimeout(1300);
  const diving = (await units()).find((u) => u.id === corvette.id);
  assert.ok(diving.xM > corvette.xM && diving.xM < 2125);
  assert.ok(diving.depthM > 300, JSON.stringify(diving));
  assert.equal((await units()).find((u) => u.id === scout.id).depthM, 300);
  await shot('diving-on-course');
  await page.keyboard.press('s');
  await page.waitForTimeout(1300);
  const rising = (await units()).find((u) => u.id === corvette.id);
  assert.ok(rising.xM > diving.xM && rising.xM < 2125);
  assert.ok(rising.depthM < diving.depthM);
  await shot('rising-on-course');
  await arm(2125, 2125, 2000, true);
  await shot('queued-pressure-warning');
  assert.ok(await page.getByText(/CRUSH RISK/).count() > 0);
  const pinned = await page.getByLabel('Map x (m)').inputValue();
  await page.getByRole('button', { name: 'NAV', exact: true }).click();
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Roll left', exact: true }).click();
  await shot('rolled-pinned-preview');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByLabel('Map x (m)').inputValue(), pinned);
  await page.getByLabel('Destination depth (m)').focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Home');
  const recovered = await page.evaluate(() => window.__perspectiveProbe());
  assert.equal(recovered.flight.flying, false);
  assert.equal(recovered.pitchDeg, 55);
  await shot('home-recovery');
  // Use the ordinary flight dolly to approach true-metre wildlife, not a model scale override.
  const wildlife = [];
  for (const slug of ['env-rim-crab', 'env-shoal-fry', 'env-outer-fish', 'env-deep-fish']) {
    await page.keyboard.press('Home');
    const at = await page.evaluate((slug) =>
      window.__freeWaterDecoration().positions.find((p) => p.slug === slug), slug);
    await page.evaluate((at) => window.__perspectiveCamera(at.x, at.z, 250, {
      pitchDeg: 12, focusDepthM: -at.y / 0.22,
    }), at);
    await page.keyboard.press('F8');
    await page.mouse.move(900, 450);
    for (let step = 0; step < 12; step++) {
      await page.mouse.wheel(0, -180);
      await page.waitForTimeout(35);
    }
    await page.waitForTimeout(350);
    wildlife.push({ slug, at, camera: await page.evaluate(() => window.__perspectiveProbe().eye) });
    await shot(slug);
  }
  const lifecycle = await page.evaluate(async () => {
    const { EnvironmentLayer } = await import('/src/game/environmentLayer.ts');
    const { ENVIRONMENT_PROPS } = await import('/src/game/environment.ts');
    const { whenEnvTemplatesReady, resetEnvironmentModels } = await import('/src/game/environmentModels.ts');
    const { terrain } = window.__freeWaterDecoration();
    const layer = new EnvironmentLayer('free-water');
    layer.rebuild(terrain, () => -88);
    const before = layer.group.children.filter((m) => m.name === 'env-kelp-stand');
    const matrices = before.map((m) => Array.from(m.instanceMatrix.array));
    const changed = structuredClone(terrain);
    changed.ceiling[36] = 3000;
    layer.rebuild(changed, () => -88);
    const after = layer.group.children.filter((m) => m.name === 'env-kelp-stand');
    const retained = before.every((m, i) => m === after[i]);
    const distantUnchanged = before.every((m, i) =>
      JSON.stringify(Array.from(m.instanceMatrix.array).slice(32)) === JSON.stringify(matrices[i].slice(32)));
    layer.setReducedMotion(true);
    layer.tick(1000, 1000, 1000);
    const held = JSON.stringify(layer.decorationReading());
    layer.tick(20000, 1000, 20000);
    const reducedMotion = held === JSON.stringify(layer.decorationReading());
    const palette = await import('/src/game/palette.ts');
    const originalPalette = palette.ACTIVE_PALETTE.name;
    const dots = layer.group.children.find((child) => child.isPoints);
    const paletteColors = {};
    for (const name of palette.PALETTE_NAMES) {
      palette.setActivePalette(name);
      layer.setDecorationFrame({
        now: 0, eye: layer.group.position, reachM: 1000, waterDensity: 1,
        projectionScalePx: 100, pixelRatio: 1,
      });
      paletteColors[name] = {
        drawn: dots.material.uniforms.uColor.value.getHex(), expected: palette.FAUNA_COLOR,
      };
    }
    palette.setActivePalette(originalPalette);
    const stats = layer.stats();
    const calls = layer.group.children.length;
    layer.reset();
    const reset = layer.group.children.length === 0;
    layer.rebuild(terrain, () => -88);
    const rejoined = layer.stats().props;
    layer.destroy();
    const destroyed = layer.group.children.length === 0;
    resetEnvironmentModels();
    const pending = new EnvironmentLayer('free-water');
    pending.rebuild(terrain, () => -88);
    pending.rebuild(changed, () => -88);
    pending.destroy();
    await whenEnvTemplatesReady(ENVIRONMENT_PROPS.filter((p) =>
      ['env-kelp-stand', 'env-kelp-cluster', 'env-rim-crab', 'env-shoal-fry', 'env-outer-fish', 'env-deep-fish'].includes(p.slug)),
      'free-water');
    return { retained, distantUnchanged, reducedMotion, paletteColors, stats, calls, reset, rejoined, destroyed,
      lateLoadStayedDestroyed: pending.group.children.length === 0 };
  });
  for (const key of ['retained', 'distantUnchanged', 'reducedMotion', 'reset', 'destroyed', 'lateLoadStayedDestroyed'])
    assert.equal(lifecycle[key], true, key);
  assert.equal(lifecycle.stats.props, 182);
  assert.equal(lifecycle.rejoined, 184);
  assert.ok(lifecycle.calls <= 30);
  for (const color of Object.values(lifecycle.paletteColors)) assert.equal(color.drawn, color.expected);
  const views = [];
  for (const [name, distance, pitchDeg, depth] of [
    ['low', 1600, 12, 850], ['survey', 10000, 88, null],
  ]) {
    await page.keyboard.press('Home');
    await page.evaluate(({ distance, pitchDeg, depth }) => {
      window.__perspectiveCamera(2000, 2000, distance, { yawDeg: 0, pitchDeg, focusDepthM: depth });
    }, { distance, pitchDeg, depth });
    await page.waitForTimeout(500);
    const p = await page.evaluate(() => window.__perspectiveProbe());
    assert.ok(p.drawCalls <= 150 && p.triangles <= 720000);
    views.push({ name, calls: p.drawCalls, triangles: p.triangles });
    await shot(name);
  }
  writeFileSync(join(dir, 'readings.json'),
    JSON.stringify({ opening, diving, rising, wildlife, lifecycle, views }, null, 2) + '\n');
};
