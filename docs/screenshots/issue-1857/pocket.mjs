// The deep fish's photophores as world light (#1857), as a run-game steps
// module: the one eye the cameras of docs/screenshots/issue-1837/frames.mjs
// have not got. That module takes the target's three, gate 6's low camera,
// which looks into the deep fish's pocket from 2 km, and the garden close,
// where none swims. This one stands in the pocket, at the orbit's least dolly
// from a ring of six: Low first, as the control, then High, in the free-water
// crater with the HUD on.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1857/software/pocket --steps docs/screenshots/issue-1857/pocket.mjs
//
// QUALITY=low takes the control alone: the module reads nothing a tree before
// #1857 does not report. CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the
// camera from gate 6's low eye down to the pocket's at High, for the clip.
//
// A software rasteriser's frames are labelled so in readings.json and are
// never offered for acceptance. Reduced motion holds a body at its loop's
// start, so two software runs frame alike.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, plan x, plan z, dolly, yaw, pitch, focus depth. `low` is gate 6's, as
// docs/screenshots/issue-1837/frames.mjs holds it, and only the clip starts
// there. `pocket` looks north at the middle ring of freeWaterDecoration.ts's
// three along the pocket's north edge, at the deep fish's 2,000 m, from the
// 250 m the orbit's dolly stops at.
const LOW = ['low', 2000, 2000, 1600, 0, 12, 850];
const POCKET = ['pocket', 2150, 1630, 250, 0, 10, 2000];
const POSES = [POCKET];
const SEATS = 6;

const aim = (page, [, x, z, distance, yawDeg, pitchDeg, focusDepthM]) =>
  page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
    { x, z, distance, yawDeg, pitchDeg, focusDepthM }
  );

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 120000,
  });
  await page.waitForTimeout(3000);
  const { renderer, viewport } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio } };
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (software) {
    console.log(
      'WARNING: a software rasteriser drew this capture. Its frames may guide a round and ' +
        'are never offered for acceptance; its millisecond fields measure the rasteriser.'
    );
  }
  const hold = software ? 6 : 240;
  const settle = async (label) => {
    await page.evaluate((label) => window.__perspectiveStation(label), label);
    await page.waitForFunction(
      (hold) => {
        const p = window.__perspectiveProbe();
        return p.stationFrames >= hold && (p.gpuTimer !== 'timing' || p.gpuFrames >= hold);
      },
      hold,
      { timeout: 600000 }
    );
    return page.evaluate(() => window.__perspectiveProbe());
  };
  // High's own bodies decode after the switch: a template a quality. A deep
  // fish's seats are the stipple's dots at Low and lights at High, and never
  // both.
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForFunction(
      ({ high, seats }) => {
        const probe = window.__perspectiveProbe();
        const deep = probe.fixtureAssets['env-deep-fish'] ?? 0;
        const fry = probe.fixtureAssets['env-shoal-fry'] ?? 0;
        const dots = probe.decorativePhotophores ?? 0;
        // A tree before #1857 reports no seat lights, which is none.
        const lights = probe.photophoreLights ?? 0;
        if (deep === 0) return false;
        return high
          ? fry > 144 && (probe.lifeGlints ?? 0) === fry && dots + lights === deep * seats
          : fry === 144 && dots === deep * seats && lights === 0;
      },
      { high: quality === 'high', seats: SEATS },
      { timeout: 120000 }
    );
    await page.waitForTimeout(software ? 4000 : 1500);
    return drawn;
  };

  if (process.env.CLIP === '1') {
    await setQuality('high');
    const [from, to] = [LOW, POCKET];
    await aim(page, from);
    await page.waitForTimeout(2000);
    const steps = Number(process.env.CLIP_STEPS ?? 120);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      const pose = from.map((v, k) => (k === 0 ? 'clip' : v + (to[k] - v) * ease));
      await aim(page, pose);
      await page.waitForTimeout(Number(process.env.CLIP_STEP_MS ?? 50));
    }
    await page.waitForTimeout(Number(process.env.CLIP_HOLD_MS ?? 6000));
    await shot('clip-end');
    return;
  }

  const readings = [];
  let dir;
  const write = () =>
    writeFileSync(
      join(dir, 'readings.json'),
      JSON.stringify({ renderer, software, viewport, readings }, null, 2) + '\n'
    );
  const take = async (quality) => {
    for (const pose of POSES) {
      const name = pose[0];
      await aim(page, pose);
      const label = `${quality}-${name}`;
      const probe = await settle(label);
      dir = dirname(await shot(label));
      readings.push({
        name,
        quality,
        passes: probe.passes,
        calls: probe.drawCalls,
        triangles: probe.triangles,
        camera: pose.slice(1),
        eye: probe.eye ?? null,
        sway: probe.sway ?? null,
        life: {
          deepFish: probe.fixtureAssets['env-deep-fish'] ?? 0,
          fry: probe.fixtureAssets['env-shoal-fry'] ?? 0,
          // The stipple channel's dots on a deep fish's seats.
          dots: probe.decorativePhotophores ?? 0,
          // The world pass's lights on them, and a fry's.
          seatLights: probe.photophoreLights ?? 0,
          glints: probe.lifeGlints ?? 0,
        },
        graphicsQuality: probe.graphicsQuality ?? null,
        gpuTimer: probe.gpuTimer,
        avgGpuMs: probe.avgGpuMs,
      });
      write();
    }
  };

  const qualities = (process.env.QUALITY ?? 'low,high').split(',');
  if (qualities.includes('low')) {
    await setQuality('low');
    await take('low');
  }
  if (qualities.includes('high')) {
    await setQuality('high');
    await take('high');
  }
};
