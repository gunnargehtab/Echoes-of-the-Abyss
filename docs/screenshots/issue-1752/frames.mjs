// The §9 frames for the opening view and the study HUD (docs/free-water-slice.md
// §9, "Opening view" and "Frames and the last gate"), as a run-game steps module.
// First the frame the study opens on, untouched: no camera call, the match as
// it stands when the force is first seen. Then Home from it, FLIGHT from the
// opening pose set again, and NAV from the Home pose that leaving flight
// leaves. Then the
// four §9 poses set explicitly, the re-acceptance set. Each frame's probe
// reading lands beside it. Timings are not read here: the GPU rows come from
// docs/screenshots/issue-1713/gpu.mjs on named hardware.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1752/after --steps docs/screenshots/issue-1752/frames.mjs
//
// FRAMES=low,survey limits the explicit poses. HUD=0 skips the three HUD
// states. CONTROL=1 drives the unchanged Kelp Labyrinth control instead
// (`?map=kelp-labyrinth`): its opening frame and the low and survey poses.
// SETTINGS_JSON='{"uiScale":2}' with FRAMES=none HUD=0 shoots the opening at
// the largest UI scale a 900 px window holds (154%), where the hint line
// yields to the legend; each reading carries the hint's and the legend's
// rects in window px.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  // §9's opening pose: the focus 300 m ahead of the fleet's centroid along the
  // heading toward A, at the hulls' 300 m, 15 degrees, a 1,200 m dolly.
  ['opening-pose', 709, 1710, 1200, -34, 15, 300],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
];

export default async ({ page, shot }) => {
  const control = process.env.CONTROL === '1';
  if (control) {
    await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 1, null, {
      timeout: 120000,
    });
  } else {
    await page.waitForFunction(() => window.__perspectiveProbe?.().props === 200, null, {
      timeout: 120000,
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
    const panels = await page.evaluate(() => {
      const rect = (el) => {
        if (el === null) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: el.textContent };
      };
      return {
        flightPanel: rect(document.querySelector('.flight-panel')),
        legend: rect(document.querySelector('.decorative-life')),
        hint: window.__echoHint?.() ?? null,
        uiScale: getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale'),
      };
    });
    readings.push({
      name,
      look: p.look,
      pitchDeg: p.pitchDeg,
      yawDeg: p.yawDeg,
      focus: p.focus,
      eye: p.eye,
      distance: p.distance,
      flight: p.flight,
      ownCentre: p.ownCentre,
      waterReachM: p.waterReachM,
      calls: p.drawCalls,
      triangles: p.triangles,
      props: p.props,
      propTriangles: p.propTris,
      sway: p.sway,
      panels,
    });
    return p;
  };
  // The frame the study opens on: the camera as the first sight of the force
  // left it, with the match running. Then the Home key from it, which restores
  // north, 55 degrees and the seabed and keeps the dolly and the place.
  await settle();
  await read('opening');
  dir = dirname(await shot('opening'));
  if (process.env.HUD !== '0' && !control) {
    await page.keyboard.press('Home');
    await settle();
    await read('home');
    await shot('home');
    // Back on the opening pose, set explicitly: F8 enters flight from it, and
    // F8 again leaves it, homing the camera; F9 then latches NAV.
    const [, x, z, distance, yawDeg, pitchDeg, focusDepthM] = POSES[0];
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
    await page.keyboard.press('F8');
    await settle();
    await read('flight');
    await shot('flight');
    await page.keyboard.press('F8');
    await page.keyboard.press('F9');
    await settle();
    await read('nav');
    await shot('nav');
    // Leaving NAV keeps flight on; Home leaves both, so the poses below are
    // the orbit's.
    await page.keyboard.press('F9');
    await page.keyboard.press('Home');
    await settle();
  }
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
