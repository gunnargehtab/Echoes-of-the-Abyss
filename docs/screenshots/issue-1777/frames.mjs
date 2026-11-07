// The §9 frames with the ray placed for the opening (#1777), after #1771's life
// (docs/free-water-slice.md §5, "Life in the frames"), as a run-game steps
// module. First the frame the study opens on, untouched, then the four §9
// poses with the HUD on. Beside each frame, readings.json carries the probe's
// reading and, per decorative kit, how many bodies stand in the world's band
// of the window (under the top bar, over the console) and how wide each draws:
// its canonical length at its distance, through the probe's own eye and focus.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1777/after --steps docs/screenshots/issue-1777/frames.mjs
//
// PROPS=290 reads a revision before #1777 (its list placed 290 props; this
// one 291). FRAMES=low,survey limits the explicit poses. MOTION=1 shoots
// the opening pose again ten seconds of match later. CONTROL=1 drives the
// unchanged Kelp Labyrinth control instead (`?map=kelp-labyrinth`): its
// opening frame and the low and survey poses.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['opening-pose', 709, 1710, 1200, -34, 15, 300],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
];

// Canonical sizes (asset-prompts-3d.md Block 4), the conn camera's 40° field
// (readability.ts) and the world's band at 1440×900: under the 52 px top bar,
// over the console's top edge at 692.
const SIZE_M = {
  'env-rim-crab': 2,
  'env-shoal-fry': 0.5,
  'env-outer-fish': 4,
  'env-deep-fish': 2,
  'env-rim-ray': 18,
};
const DEPTH_VISUAL_M_PER_M = 0.22;
const BAND = { top: 52, bottom: 692 };

/** Each kit's bodies in the world's band, and the width they draw at, in px. */
function lifeIn(probe, positions, width, height) {
  const life = {};
  for (const slug of Object.keys(SIZE_M)) life[slug] = { placed: 0, inFrame: 0, px: null };
  if (probe.focus.depthM === null) {
    for (const q of positions) if (q.slug in life) life[q.slug].placed++;
    return { life, note: 'seabed focus: not projected' };
  }
  const world = (p) => [p.xM, -p.depthM * DEPTH_VISUAL_M_PER_M, p.zM];
  const eye = world(probe.eye);
  const focus = world(probe.focus);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a) => a.map((v) => v / Math.hypot(...a));
  const forward = unit(sub(focus, eye));
  const right = unit([-forward[2], 0, forward[0]]);
  const up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  const focal = height / 2 / Math.tan((20 * Math.PI) / 180);
  for (const q of positions) {
    const row = life[q.slug];
    if (row === undefined) continue;
    row.placed++;
    const d = sub([q.x, q.y, q.z], eye);
    const z = dot(d, forward);
    if (z <= 1) continue;
    const sx = width / 2 + (dot(d, right) / z) * focal;
    const sy = height / 2 - (dot(d, up) / z) * focal;
    if (sx < 0 || sx >= width || sy < BAND.top || sy >= BAND.bottom) continue;
    row.inFrame++;
    const px = (SIZE_M[q.slug] * focal) / z;
    row.px = row.px === null ? [px, px] : [Math.min(row.px[0], px), Math.max(row.px[1], px)];
  }
  for (const row of Object.values(life))
    if (row.px !== null) row.px = row.px.map((v) => Math.round(v * 10) / 10);
  return { life };
}

export default async ({ page, shot }) => {
  const control = process.env.CONTROL === '1';
  const props = Number(process.env.PROPS ?? 291);
  if (control) {
    await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 1, null, {
      timeout: 120000,
    });
  } else {
    await page.waitForFunction((n) => window.__perspectiveProbe?.().props === n, props, {
      timeout: 180000,
    });
  }
  const only = process.env.FRAMES?.split(',');
  const readings = [];
  let dir;
  const settle = async () => {
    await page.evaluate(() => window.__perspectiveStation('settle'));
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 6, null, {
      timeout: 120000,
    });
  };
  const read = async (name) => {
    const p = await page.evaluate(() => window.__perspectiveProbe());
    const [width, height] = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
    const positions = control
      ? []
      : await page.evaluate(() => window.__freeWaterDecoration?.().positions ?? []);
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
      sway: p.sway,
      ...(control ? {} : lifeIn(p, positions, width, height)),
    });
  };
  // The frame the study opens on: the camera as the first sight of the force
  // left it, with the match running.
  await settle();
  await read('opening');
  dir = dirname(await shot('opening'));
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
    // The same pose ten seconds of match later, for motion: the ray along its
    // loop, nothing reacting to the camera.
    if (process.env.MOTION === '1' && name === 'opening-pose') {
      await page.waitForTimeout(10000);
      await settle();
      await read(`${name}-later`);
      await shot(`${name}-later`);
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
        reducedMotion: process.env.SETTINGS_JSON?.includes('"reducedMotion":true') === true,
        readings,
      },
      null,
      2
    ) + '\n'
  );
};
