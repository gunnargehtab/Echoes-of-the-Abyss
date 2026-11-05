// The §9 frames for the water medium (docs/free-water-slice.md §9, "Frames and
// the last gate"), as a run-game steps module. Four poses, a fifth on the fleet
// for the lamps through the medium, the low pose again after a 200 m pan, a
// strip of frames through a continuous middle-drag pan at the garden close and
// the low pose, and the probe's reading of each frame beside them. Timings are
// not read here: the GPU rows come from docs/screenshots/issue-1713/gpu.mjs on
// named hardware. Last, a strip at the low pose with no input and the sway on:
// the near motes may only sink between its frames.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1749/after --steps docs/screenshots/issue-1749/frames.mjs
//
// FRAMES=low,survey limits the poses. CONTROL=1 drives the unchanged Kelp
// Labyrinth control instead (`?map=kelp-labyrinth`), where no study prop stands.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['home', 542, 1958, 2600, 0, 55, null],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
  // The fleet from a low orbit at hull depth, the lamp/SIG reading: the three
  // hulls sit about a dolly from the eye, in the water the study thickens.
  ['fleet', 542, 1958, 1200, 0, 12, 300],
];

/** How much of a subject one dolly out the water takes, and how much of a
 * lamp's halo survives it (lampHaloPass.ts raises the fog's transmittance to
 * 2.2), from the probe's reach. */
const medium = (p) => {
  const tau = Math.exp(-((p.distance / p.waterReachM) ** 2));
  return { fogAtDolly: Number((1 - tau).toFixed(3)), haloAtDolly: Number((tau ** 2.2).toFixed(3)) };
};

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
      pitchDeg: p.pitchDeg,
      yawDeg: p.yawDeg,
      focus: p.focus,
      eye: p.eye,
      distance: p.distance,
      waterReachM: p.waterReachM,
      snow: p.snow,
      subject: medium(p),
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
    if (control && (name === 'garden-close' || name === 'home')) continue;
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
    await read(name);
    dir = dirname(await shot(name));
    if (name === 'low') {
      // The parallax pair: the same pose panned 200 m east. Motes near the
      // eye cross more of the frame than the floor does.
      await page.evaluate(
        ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
          window.__perspectiveCamera(x + 200, z, distance, { yawDeg, pitchDeg, focusDepthM });
        },
        { x, z, distance, yawDeg, pitchDeg, focusDepthM }
      );
      await settle();
      await read('low-panned');
      await shot('low-panned');
    }
    if (process.env.PAN !== '0' && (name === 'garden-close' || name === 'low')) {
      // Motion, not stills (§7): a continuous middle-drag pan across the
      // playfield while the match runs, one frame per step of the drag, with
      // the page clock and the camera's focus beside each.
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
      for (let step = 0; step < 6; step++) {
        await page.mouse.move(720 - 30 * step, 420, { steps: 3 });
        const at = await page.evaluate(() => {
          const p = window.__perspectiveProbe();
          return { tMs: Math.round(performance.now()), focus: p.focus, eye: p.eye };
        });
        strip.push(at);
        await shot(`${name}-pan-${step}`);
      }
      await page.mouse.up({ button: 'middle' });
      readings.push({ name: `${name}-pan`, strip });
    }
  }
  if (process.env.PAN !== '0' && (!only || only.includes('low'))) {
    const [, x, z, distance, yawDeg, pitchDeg, focusDepthM] = POSES[2];
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
    const strip = [];
    for (let step = 0; step < 4; step++) {
      if (step > 0) await page.waitForTimeout(2500);
      const at = await page.evaluate(() => {
        const p = window.__perspectiveProbe();
        return { tMs: Math.round(performance.now()), focus: p.focus, eye: p.eye, sway: p.sway };
      });
      strip.push(at);
      await shot(`low-rest-${step}`);
    }
    readings.push({ name: 'low-rest', strip });
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
