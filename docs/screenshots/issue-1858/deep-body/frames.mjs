// The deep body (#1858), as a run-game steps module: the Close and Home
// cameras of docs/screenshots/issue-1799/README.md, the fleet at rest, reduced
// motion holding every body at its loop's start. QUALITY picks what is drawn:
// `high`, the default, waits for the comb jellies and their lights; `low` is
// the non-target control, taken on `main` and on the branch (README.md,
// Reproduce):
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1858/deep-body/software/high \
//     --steps docs/screenshots/issue-1858/deep-body/frames.mjs
//
// It writes probe.json beside the frames: the eye and focus each was taken
// from, and what life the layer stood.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, plan x, plan z, dolly, yaw, pitch, focus depth: issue-1799's poses.
const POSES = [
  ['close', 542, 1958, 420, -60, 2, 300],
  ['home', 709, 1710, 1200, -34, 15, 300],
];
const QUALITY = process.env.QUALITY === 'low' ? 'low' : 'high';
// `main` stands no comb jelly: its High frames wait for the lanterns alone.
const COMBS = process.env.COMBS !== '0';

export default async ({ page, shot }) => {
  // A software rasteriser draws the staging camera at seconds a frame.
  page.setDefaultTimeout(300000);
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 180000,
  });
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 180000,
  });
  await page.waitForTimeout(3000);
  const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), QUALITY);
  if (drawn !== QUALITY) throw new Error(`the view draws ${drawn}, asked ${QUALITY}`);
  await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
    timeout: 180000,
  });
  if (QUALITY === 'high') {
    // High's own bodies decode after the switch.
    await page.waitForFunction(
      (combs) => {
        const p = window.__perspectiveProbe();
        return (
          (p.jellyLights ?? 0) > 0 &&
          (p.fixtureAssets['env-rim-manta'] ?? 0) > 0 &&
          (p.farLanterns ?? 0) > 0 &&
          (!combs || ((p.fixtureAssets['env-comb-jelly'] ?? 0) > 0 && (p.combLights ?? 0) > 0))
        );
      },
      COMBS,
      { timeout: 180000 }
    );
  }
  await page.waitForTimeout(6000);
  const readings = [];
  let dir;
  for (const [name, x, z, distance, yawDeg, pitchDeg, focusDepthM] of POSES) {
    await page.evaluate((a) => window.__perspectiveCamera(a.x, a.z, a.distance, a), {
      x,
      z,
      distance,
      yawDeg,
      pitchDeg,
      focusDepthM,
    });
    await page.waitForTimeout(12000);
    const probe = await page.evaluate(() => {
      const p = window.__perspectiveProbe();
      return {
        eye: p.eye,
        focus: p.focus,
        yawDeg: p.yawDeg,
        pitchDeg: p.pitchDeg,
        life: {
          combs: p.fixtureAssets['env-comb-jelly'] ?? 0,
          combLights: p.combLights ?? 0,
          jellyLights: p.jellyLights ?? 0,
          farLanterns: p.farLanterns ?? 0,
        },
      };
    });
    const file = await shot(`${QUALITY}-${name}`);
    dir = dirname(file);
    readings.push({ name, quality: QUALITY, pose: [x, z, distance, yawDeg, pitchDeg, focusDepthM], probe });
  }
  writeFileSync(join(dir, 'probe.json'), JSON.stringify(readings, null, 2) + '\n');
};
