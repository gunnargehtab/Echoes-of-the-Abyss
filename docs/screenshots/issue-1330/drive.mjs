// #1330: the ping preview over a selected group. Every hull that fights is
// selected (the `0` key), the camera stands over them from high enough to
// take in a 2,400 m self-reveal, and Alt is held. Before the fix every selected
// hull wore the two rings; after it only the hull P pings from does.
//
//   node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
//     --steps docs/screenshots/issue-1330/drive.mjs
//
// Writes selection.json beside the frame: which hulls were selected.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const units = await page.evaluate(() => window.__perspectiveLamps().units);
  const army = units.filter((unit) => unit.name !== 'Harvester');
  if (army.length < 2) throw new Error(`only ${army.length} fighting hull(s) to select`);
  const x = army.reduce((sum, unit) => sum + unit.xM, 0) / army.length;
  const z = army.reduce((sum, unit) => sum + unit.zM, 0) / army.length;
  await page.evaluate(
    ({ x, z }) => window.__perspectiveCamera(x, z, 9000, { pitchDeg: 88, yawDeg: 0 }),
    { x, z }
  );
  await page.waitForTimeout(800);
  await page.keyboard.press('Digit0');
  await page.waitForTimeout(400);
  await page.keyboard.down('AltLeft');
  await page.waitForTimeout(900);
  const path = await shot('preview');
  await page.keyboard.up('AltLeft');
  writeFileSync(
    join(dirname(path), 'selection.json'),
    JSON.stringify({ selected: army.map(({ id, name }) => ({ id, name })) }, null, 2) + '\n'
  );
};
