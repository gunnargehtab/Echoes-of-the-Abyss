// The study's frames with the altitude lines taken off the hulls (#1772,
// docs/free-water-slice.md §9, "Vertical command"), as a run-game steps
// module. First the frame the study opens on, untouched; then §9's opening
// and garden-close poses with the HUD on; then the opening pose under a raised
// focus's plane at 600 m and at 150 m, where #1753's stalks drew their longest
// lines (docs/screenshots/issue-1753, rows 06 and 07). Beside the frames,
// readings.json carries each probe's pose and its draw calls and triangles.
// Every own entity's plumb is one LineSegments (depthCues.ts), so taking the
// plumbs off is one call fewer in each frame that draws own force.
//
//   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
//     --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1772/after --steps docs/screenshots/issue-1772/frames.mjs
//
// PROPS=291 is the study's prop count since #1777. CONTROL=1 drives the Kelp
// Labyrinth control instead (`?map=kelp-labyrinth`): its opening, then the
// fleet from a low orbit at the lead hull's depth, where a shipped map's
// plumbs still hang under every hull.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OPENING_POSE = [709, 1710, 1200, -34, 15];
const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['opening-pose', ...OPENING_POSE, 300],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  // Nothing selected, so the raised focus is the command plane: at 600 m the
  // hulls at their 300 m exercise depth stand above it, at 150 m below it.
  ['rings-above', ...OPENING_POSE, 600],
  ['rings-below', ...OPENING_POSE, 150],
];

export default async ({ page, shot }) => {
  const control = process.env.CONTROL === '1';
  const props = Number(process.env.PROPS ?? 291);
  if (control) {
    await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 1, null, {
      timeout: 120000,
    });
  } else {
    await page.waitForFunction(
      (n) => {
        const p = window.__perspectiveProbe?.();
        return p?.props === n && p.modelBacked >= 3;
      },
      props,
      { timeout: 180000 }
    );
  }
  const readings = [];
  let dir;
  const settle = async () => {
    await page.evaluate(() => window.__perspectiveStation('settle'));
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 6, null, {
      timeout: 120000,
    });
  };
  const aim = async ([, x, z, distance, yawDeg, pitchDeg, focusDepthM]) => {
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
  };
  const read = async (name) => {
    const p = await page.evaluate(() => window.__perspectiveProbe());
    readings.push({
      name,
      look: p.look,
      pitchDeg: p.pitchDeg,
      yawDeg: p.yawDeg,
      focus: p.focus,
      eye: p.eye,
      distance: p.distance,
      ownCentre: p.ownCentre,
      modelBacked: p.modelBacked,
      calls: p.drawCalls,
      triangles: p.triangles,
    });
  };

  // The frame the match opens on: the camera as the first sight of the force
  // left it, with the match running.
  await settle();
  await read('opening');
  dir = dirname(await shot('opening'));
  if (control) {
    // The fleet low and close, the orbit's focus at the lead hull's own depth,
    // so each plumb runs from its hull down the water column to the shadow.
    const lead = await page.evaluate(() => window.__perspectiveLamps().units[0]);
    await aim(['fleet-low', lead.xM, lead.zM, 900, 0, 20, lead.depthM]);
    await read('fleet-low');
    await shot('fleet-low');
  } else {
    for (const pose of POSES) {
      await aim(pose);
      await read(pose[0]);
      await shot(pose[0]);
    }
  }
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context').loseContext();
    return name;
  });
  writeFileSync(
    join(dir, 'readings.json'),
    JSON.stringify(
      {
        renderer,
        software: /swiftshader|llvmpipe|software|basic render/i.test(renderer),
        viewport: await page.evaluate(() => [window.innerWidth, window.innerHeight]),
        dpr: Number(process.env.VIEW_DPR ?? 1),
        readings,
      },
      null,
      2
    ) + '\n'
  );
};
