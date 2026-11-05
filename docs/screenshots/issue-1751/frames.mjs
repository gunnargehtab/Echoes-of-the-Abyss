// The §9 frames for the kelp (docs/free-water-slice.md §9, "Kelp" and "Frames
// and the last gate"), as a run-game steps module. The four §9 poses, then
// three of this issue's own: an opening pose of the kind #1752 will set, low
// behind the fleet looking toward A; the clearing from its west end looking
// east, the mirror of garden close; and the whole bowl from a steep orbit, the
// kind of pose the owner's baseline was judged from. Each frame's probe
// reading lands beside it, with the prop count and the prop triangles.
// Timings are not read here: the GPU rows come from
// docs/screenshots/issue-1713/gpu.mjs on named hardware.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1751/after --steps docs/screenshots/issue-1751/frames.mjs
//
// PROPS=184 waits for the base commit's list instead of this one's 200.
// FRAMES=low,survey limits the poses. PAN=0 skips the drag. CONTROL=1 drives
// the unchanged Kelp Labyrinth control instead (`?map=kelp-labyrinth`), where
// no study prop stands.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['home', 542, 1958, 2600, 0, 55, null],
  // Of #1752's kind: the focus on the centroid-to-A line ahead of the hulls at
  // their 300 m, pitched 15 degrees, heading toward A. Offset and dolly are
  // this issue's: a dolly that keeps the eye in the water (4 m) with the
  // garden's south flank in frame beyond the scout; #1752 sets them.
  ['opening', 760, 1650, 240, -34, 15, 300],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  // The same clearing from its west end, looking east: the flank the west
  // stands hide from garden close.
  ['garden-east', 1375, 1125, 250, -90, 12, 275],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
  // The whole bowl from a steep north-up orbit, as the owner's baseline was.
  ['bowl', 2000, 2000, 4500, 0, 70, null],
];

export default async ({ page, shot }) => {
  const control = process.env.CONTROL === '1';
  const props = Number(process.env.PROPS ?? 200);
  if (control) {
    await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 1, null, {
      timeout: 120000,
    });
  } else {
    await page.waitForFunction((n) => window.__perspectiveProbe?.().props === n, props, {
      timeout: 120000,
    });
  }
  const only = process.env.FRAMES?.split(',');
  const readings = [];
  let dir;
  const settle = async () => {
    // Several frames, not a timer: the software rasteriser here draws a frame
    // in a few hundred milliseconds, and a shot before the pose has been drawn
    // shows the pose before it.
    await page.evaluate(() => window.__perspectiveStation('settle'));
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 6, null, {
      timeout: 120000,
    });
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
      waterReachM: p.waterReachM,
      calls: p.drawCalls,
      triangles: p.triangles,
      props: p.props,
      propTriangles: p.propTris,
      instances: p.fixtureAssets,
      photophores: p.decorativePhotophores,
      passes: p.passes,
      sway: p.sway,
      ownCentre: p.ownCentre,
    });
    return p;
  };
  for (const [name, x, z, distance, yawDeg, pitchDeg, focusDepthM] of POSES) {
    if (only && !only.includes(name)) continue;
    if (control && !['low', 'survey'].includes(name)) continue;
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
    await read(name);
    dir = dirname(await shot(name));
  }
  if (process.env.PAN !== '0' && (!only || only.includes('garden-close')) && !control) {
    // Motion, not stills (§7): a continuous middle-drag pan along the clearing
    // while the match runs, one frame per step of the drag, with the page
    // clock and the camera's focus beside each.
    const [, x, z, distance, yawDeg, pitchDeg, focusDepthM] = POSES[2];
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
    await page.mouse.move(720, 420);
    await page.mouse.down({ button: 'middle' });
    const strip = [];
    for (let step = 0; step < 4; step++) {
      await page.mouse.move(720, 420 + 40 * step, { steps: 3 });
      const at = await page.evaluate(() => {
        const p = window.__perspectiveProbe();
        return { tMs: Math.round(performance.now()), focus: p.focus, eye: p.eye };
      });
      strip.push(at);
      await shot(`clearing-pan-${step}`);
    }
    await page.mouse.up({ button: 'middle' });
    readings.push({ name: 'clearing-pan', strip });
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
        reducedMotion: process.env.SETTINGS_JSON?.includes('"reducedMotion":true') === true,
        readings,
      },
      null,
      2
    ) + '\n'
  );
};
