import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  const url = page.url();
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184);
  const token = await page.evaluate(() => sessionStorage.getItem('echoes.reconnection'));
  assert.ok(token);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Return to port/ }).click();
  await page.getByRole('button', { name: 'Abandon the water', exact: true }).click();
  await page.getByRole('button', { name: /^Solo game/ }).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('echoes.reconnection.study')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('echoes.reconnection')), null);
  assert.equal(await page.evaluate(() => typeof window.__freeWaterDecoration), 'undefined');
  const dir = dirname(await shot('left-study'));
  await page.goto(url);
  await page.waitForFunction(() => {
    const p = window.__perspectiveProbe?.();
    return p?.props === 184 && p.modelBacked === 3;
  });
  const nextToken = await page.evaluate(() => sessionStorage.getItem('echoes.reconnection'));
  assert.ok(nextToken && nextToken !== token, 'reentry creates a fresh room');
  const reading = await page.evaluate(() => {
    const p = window.__perspectiveProbe();
    return { props: p.props, photophores: p.decorativePhotophores, units: p.modelBacked,
      environmentBytes: p.environmentBytes, haloBytes: p.haloBytes, splitBytes: p.splitBytes };
  });
  assert.equal(reading.photophores, 48);
  assert.equal(reading.units, 3);
  await shot('fresh-study-after-leaving');
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({
    leftAndDisposed: true, studyTokenCleared: true, freshRoom: true, reading,
  }, null, 2) + '\n');
};
