import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// drive.mjs --entry tutorial --url http://localhost:5173/?dream-loop=1
export default async function ({ page, shot }) {
  await page.evaluate(async () => {
    const { PerspectiveView } = await import('/src/game/PerspectiveView.ts');
    const original = PerspectiveView.prototype.applySnapshot;
    PerspectiveView.prototype.applySnapshot = function (snapshot) {
      window.__compatibilityView = this;
      return original.call(this, snapshot);
    };
  });
  const readings = [];
  const capture = async (name, expectedLook, expectedStudy) => {
    await page.waitForFunction((look) => {
      const p = window.__perspectiveProbe?.();
      return p?.look === look && p.modelBacked > 0 && p.props > 0;
    }, expectedLook);
    await page.waitForFunction(() => window.__compatibilityView);
    await page.evaluate((label) => window.__perspectiveStation(label), name);
    await page.waitForFunction(() => {
      const p = window.__perspectiveProbe();
      return p.stationFrames >= 240 && p.overlayFrames >= 240;
    });
    const result = await page.evaluate(async () => {
      const { DREAM_LOOP } = await import('/src/game/dreamLoop.ts');
      const v = window.__compatibilityView;
      const keys = new Set();
      for (const group of [v.unitGroup, v.structureGroup]) {
        group.traverse((o) => {
          if (!o.material) return;
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            keys.add(m.customProgramCacheKey());
          }
        });
      }
      return {
        flag: DREAM_LOOP,
        study: v.dreamStudy,
        cover: v.dreamCover !== null,
        halos: v.dreamLights !== null,
        snowStudy: v.snow.dreamStudy,
        snowCount: v.snow.points.geometry.getAttribute('position').count,
        lampStudy: [...keys].some((key) => key.includes('dream-lamp-1')),
        materialKeys: [...keys],
        lights: v.scene.children.filter((o) => o.isLight).map((o) => o.intensity),
        probe: window.__perspectiveProbe(),
      };
    });
    assert.equal(result.flag, true, 'the control must really enable the development study');
    for (const key of ['study', 'cover', 'halos', 'snowStudy', 'lampStudy']) {
      assert.equal(result[key], expectedStudy, `${name}: ${key}`);
    }
    assert.equal(result.snowCount, expectedStudy ? 1200 : 7000);
    assert.deepEqual(result.lights, expectedStudy ? [0.75, 1.2, 1.3] : [0.75, 1.8, 1.6]);
    assert.equal(result.probe.look, expectedLook);
    assert.ok(result.probe.drawCalls <= 150 && result.probe.triangles <= 250000);
    readings.push({ name, ...result });
    return shot(name);
  };
  await capture('flagged-tutorial', 'sorrowgate', false);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Return to port/ }).click();
  await page.getByRole('button', { name: 'Abandon the water', exact: true }).click();
  await page.getByRole('button', { name: /^Campaign/ }).click();
  await page.getByRole('button', { name: /^1 Tend/ }).click();
  await page.getByRole('button', { name: 'Descend', exact: true }).click();
  const file = await capture('flagged-standard-tend', 'standard', true);
  writeFileSync(join(dirname(file), 'readings.json'), JSON.stringify({ complete: true, readings }, null, 2));
}
