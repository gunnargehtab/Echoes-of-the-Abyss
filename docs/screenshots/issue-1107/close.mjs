// #1107: one of each own Consortium kind in the opening framed close in the
// conn view, HUD hidden, the probe's calls, triangles and textures saved as
// close.json beside the frames.
//
//   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
//     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
//     --steps docs/screenshots/issue-1107/close.mjs
//
// The first client takes the Consortium by default (lobby.ts), so no staging:
// the opening's Light Scout and Caissons and the structures it starts with.
// #1111's close.mjs frames one staged hull; this frames a kind each.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Camera distance by kind: the camera clamps, so a hull frames at 160 m. */
const HULL_M = 160;
const STRUCTURE_M = 700;
const VIEWS = [
  ['close', 50, 0],
  ['quarter', 35, 35],
];

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    [...document.querySelectorAll('canvas')].slice(1).forEach((c) => (c.style.visibility = 'hidden'));
    document.querySelectorAll('body *:not(canvas)').forEach((el) => {
      if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
  });
  const { faction, units, structures } = await page.evaluate(() => window.__perspectiveLamps());
  const pick = (list, d) => {
    const seen = new Map();
    for (const e of list) if (!seen.has(e.name)) seen.set(e.name, { ...e, d });
    return [...seen.values()];
  };
  const subjects = [...pick(units, HULL_M), ...pick(structures, STRUCTURE_M)];
  const readings = [];
  let dir;
  for (const s of subjects) {
    for (const [view, pitchDeg, yawDeg] of VIEWS) {
      await page.evaluate(
        ({ s, pitchDeg, yawDeg }) =>
          window.__perspectiveCamera(s.xM, s.zM, s.d, { pitchDeg, yawDeg, focusDepthM: s.depthM }),
        { s, pitchDeg, yawDeg }
      );
      await page.waitForTimeout(3000);
      dir = dirname(await shot(`${slug(s.name)}-${view}`));
      const p = await page.evaluate(() => window.__perspectiveProbe());
      readings.push({
        name: s.name,
        view,
        d: s.d,
        pitchDeg,
        yawDeg,
        drawCalls: p.drawCalls,
        triangles: p.triangles,
        textures: p.textures,
      });
    }
  }
  const out = {
    faction,
    units: units.map((u) => u.name),
    structures: structures.map((s) => s.name),
    readings,
  };
  writeFileSync(join(dir, 'close.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
};
