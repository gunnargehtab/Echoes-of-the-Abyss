// #1111: one staged Bulwark framed close in the conn view, HUD hidden, the
// probe's calls, triangles and textures saved as close.json beside the frames.
//
//   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
//     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
//     --steps docs/screenshots/issue-1111/close.mjs
//
// With docs/screenshots/issue-1027/staging.patch applied and STAGE_FILE holding
// `Bathyarch Bulwark 4` (README.md).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const VIEWS = [
  ['close', 160, 50, 0],
  ['quarter', 160, 35, 35],
];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    [...document.querySelectorAll('canvas')].slice(1).forEach((c) => (c.style.visibility = 'hidden'));
    document.querySelectorAll('body *:not(canvas)').forEach((el) => {
      if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
  });
  const units = await page.evaluate(() => window.__perspectiveLamps().units);
  const unit = units[0];
  const readings = [];
  let dir;
  for (const [name, d, pitchDeg, yawDeg] of VIEWS) {
    await page.evaluate(
      ({ u, d, pitchDeg, yawDeg }) =>
        window.__perspectiveCamera(u.xM, u.zM, d, { pitchDeg, yawDeg, focusDepthM: u.depthM }),
      { u: unit, d, pitchDeg, yawDeg }
    );
    await page.waitForTimeout(3000);
    dir = dirname(await shot(name));
    const p = await page.evaluate(() => window.__perspectiveProbe());
    readings.push({ name, d, pitchDeg, yawDeg, drawCalls: p.drawCalls, triangles: p.triangles, textures: p.textures });
  }
  const out = { units: units.length, unit, readings };
  writeFileSync(join(dir, 'close.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
};
