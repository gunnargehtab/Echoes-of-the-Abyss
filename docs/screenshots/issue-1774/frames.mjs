// The crater as ground from above (#1774, docs/free-water-slice.md §9,
// "Crater walls", and docs/map-visuals.md §4, the study's clause), as a
// run-game steps module. §9's survey and low poses; the bowl from a steep
// north-up orbit, the kind of pose the owner's baseline was judged from; the
// southern wall's north face and the cut's mouth from inside the bowl, where
// the roof holds the cell edges; and the west rim's ramp beside START. Each
// frame's probe reading lands beside it, with the ground's switch.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1774/after --steps docs/screenshots/issue-1774/frames.mjs
//
// FRAMES=survey,low limits the poses. PROPS=291 is the study's prop count
// since #1777. CONTROL=1 drives the unchanged Kelp Labyrinth control instead
// (`?map=kelp-labyrinth`), at the low and survey poses alone. Unless PAN=0,
// the study's run ends on motion: a continuous middle-drag pan across the
// bowl pose while the match runs, a frame a step of the drag.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['survey', 2000, 2000, 10000, 0, 88, null],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['bowl', 2000, 2000, 4500, 0, 70, null],
  ['wall', 2125, 2875, 700, 180, 14, 900],
  ['rim', 1000, 1875, 700, 90, 14, 900],
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
      calls: p.drawCalls,
      triangles: p.triangles,
      // The rest of free-water-slice §7's record: instances, the passes
      // drawn, the textures the renderer holds and the targets' bytes.
      instances: p.fixtureAssets,
      passes: p.passes,
      textures: p.textures,
      targetBytes: { halo: p.haloBytes, split: p.splitBytes, environment: p.environmentBytes },
    });
    dir = dirname(await shot(name));
  }
  if (process.env.PAN !== '0' && (!only || only.includes('bowl')) && !control) {
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
      await page.mouse.move(720 - 40 * step, 420, { steps: 3 });
      const at = await page.evaluate(() => {
        const p = window.__perspectiveProbe();
        return { tMs: Math.round(performance.now()), focus: p.focus, eye: p.eye };
      });
      strip.push(at);
      await shot(`bowl-pan-${step}`);
    }
    await page.mouse.up({ button: 'middle' });
    readings.push({ name: 'bowl-pan', strip });
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
