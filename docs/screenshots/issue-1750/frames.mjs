// The §9 frames for the crater walls (docs/free-water-slice.md §9, "Crater
// walls" and "Frames and the last gate"), as a run-game steps module. The four
// §9 poses, then three of this issue's own: the bowl from a steep orbit, the
// kind of pose the owner's baseline was judged from; the southern wall's north
// face and the cut's mouth from inside the bowl; and the west rim's ramp from
// over the bowl. Each frame's probe reading lands beside it, with the ground's
// shaping switch. Timings are not read here: the GPU rows come from
// docs/screenshots/issue-1713/gpu.mjs on named hardware.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1750/after --steps docs/screenshots/issue-1750/frames.mjs
//
// FRAMES=low,survey limits the poses. CONTROL=1 drives the unchanged Kelp
// Labyrinth control instead (`?map=kelp-labyrinth`), where the shaping is off.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['home', 542, 1958, 2600, 0, 55, null],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
  // The whole bowl from a steep north-up orbit, as the owner's baseline was.
  ['bowl', 2000, 2000, 4500, 0, 70, null],
  // The southern wall's north face and the mouth of the cut, from E, looking
  // south from inside the bowl at the height of the wall's top.
  ['wall', 2125, 2875, 700, 180, 14, 900],
  // The west rim's 600 m to 1,500 m ramp beside START, looking west across it.
  ['rim', 1000, 1875, 700, 90, 14, 900],
];

export default async ({ page, shot }) => {
  const control = process.env.CONTROL === '1';
  if (control) {
    await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 1, null, {
      timeout: 120000,
    });
  } else {
    await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184, null, {
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
      ground: p.ground ?? null,
      pitchDeg: p.pitchDeg,
      yawDeg: p.yawDeg,
      focus: p.focus,
      eye: p.eye,
      distance: p.distance,
      waterReachM: p.waterReachM,
      calls: p.drawCalls,
      triangles: p.triangles,
      propTriangles: p.propTris,
      instances: p.fixtureAssets,
      passes: p.passes,
      sway: p.sway,
      gpuTimer: p.gpuTimer,
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
  if (process.env.PAN !== '0' && (!only || only.includes('wall')) && !control) {
    // Motion, not stills (§7): a continuous middle-drag pan along the wall
    // while the match runs, one frame per step of the drag, with the page
    // clock and the camera's focus beside each.
    const [, x, z, distance, yawDeg, pitchDeg, focusDepthM] = POSES[5];
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
      await page.mouse.move(720 - 40 * step, 420, { steps: 3 });
      const at = await page.evaluate(() => {
        const p = window.__perspectiveProbe();
        return { tMs: Math.round(performance.now()), focus: p.focus, eye: p.eye };
      });
      strip.push(at);
      await shot(`wall-pan-${step}`);
    }
    await page.mouse.up({ button: 'middle' });
    readings.push({ name: 'wall-pan', strip });
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
