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
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({
    look: p.look, props: p.props, propTriangles: p.propTris,
    decorativePhotophores: p.decorativePhotophores, fixtureAssets: p.fixtureAssets,
    calls: p.drawCalls, triangles: p.triangles, textures: p.textures,
    environmentBytes: p.environmentBytes, haloBytes: p.haloBytes, splitBytes: p.splitBytes,
  }, null, 2) + '\n');
};
