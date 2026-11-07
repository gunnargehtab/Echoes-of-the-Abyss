// The study's kelp out of its rows (#1773, docs/free-water-slice.md §5, "No
// rows"), as a run-game steps module. First the frame the study opens on,
// whose top right holds the garden's canopy; then §9's garden-close pose,
// looking west along the clearing; a pose across the north flank from the
// clearing, where #1751's three rows stood one behind another; the garden
// from straight above, the plan the rows were laid in; §9's low pose, whose
// top third is the garden with the south band nearest; and §9's survey.
// Beside the frames, readings.json carries each probe's pose, prop count,
// draw calls and triangles.
//
//   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
//     --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1773/after --steps docs/screenshots/issue-1773/frames.mjs
//
// PROPS=291 is the study's prop count since #1777, which #1773 keeps.
// FRAMES=garden-close,north-flank limits the explicit poses, and MOTION=1
// shoots each again ten seconds of match later: the stands' sway, which
// turns with each stand's heading, and the life's loops. Seeded with
// SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}', the
// same pair shows both held.
// CONTROL=1 drives the Kelp Labyrinth control instead (`?map=kelp-labyrinth`):
// its opening, then its own force from 3,000 m at 60 degrees, where the
// registry's kelp scatter, which #1773 leaves alone, fills the frame.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  // From the clearing's middle, the eye south of the focus, looking north
  // into the flank's depth.
  ['north-flank', 2000, 900, 500, 0, 25, 300],
  // The whole garden, 2,000 by 1,000 m, under the camera's 60 degrees across.
  ['garden-above', 2000, 1000, 2400, 0, 88, null],
  // §9's low pose: its top third is the garden, the south band nearest.
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
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
      modelBacked: p.modelBacked,
      props: p.props,
      calls: p.drawCalls,
      triangles: p.triangles,
    });
  };

  // The frame the match opens on, the camera as the first sight of the force
  // left it, with the match running.
  await settle();
  await read('opening');
  dir = dirname(await shot('opening'));
  if (control) {
    const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
    await aim(['overview', centre.x, centre.z, 3000, 0, 60, null]);
    await read('overview');
    await shot('overview');
  } else {
    const only = process.env.FRAMES?.split(',');
    for (const pose of POSES) {
      if (only !== undefined && !only.includes(pose[0])) continue;
      await aim(pose);
      await read(pose[0]);
      await shot(pose[0]);
      if (process.env.MOTION === '1') {
        await page.waitForTimeout(10000);
        await settle();
        await read(`${pose[0]}-later`);
        await shot(`${pose[0]}-later`);
      }
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
