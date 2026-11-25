// Life by depth band (#1858), as a run-game steps module: the Close and Home
// cameras of docs/screenshots/issue-1799/README.md at High, the fleet at rest,
// reduced motion holding every body at its loop's start. Run it once a side,
// `after` on the branch and `before` with packages/shared/src/constants.ts at
// the base (README.md, Reproduce):
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1858/software/after --steps docs/screenshots/issue-1858/frames.mjs
//
// It writes probe.json beside the frames: the eye and focus each was taken from,
// which labels.mjs's cameras must match for a label to land on its body.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, plan x, plan z, dolly, yaw, pitch, focus depth: issue-1799's poses.
const POSES = [
  ['close', 542, 1958, 420, -60, 2, 300],
  ['home', 709, 1710, 1200, -34, 15, 300],
];

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
  const drawn = await page.evaluate(() => window.__perspectiveQuality('high'));
  if (drawn !== 'high') throw new Error(`the view draws ${drawn}, asked high`);
  await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
    timeout: 180000,
  });
  // High's own bodies decode after the switch: the lanterns, the manta and the river.
  await page.waitForFunction(
    () => {
      const p = window.__perspectiveProbe();
      return (
        (p.fixtureAssets['env-drift-jelly'] ?? 0) > 0 &&
        (p.jellyLights ?? 0) > 0 &&
        (p.fixtureAssets['env-rim-manta'] ?? 0) > 0 &&
        (p.farLanterns ?? 0) > 0
      );
    },
    null,
    { timeout: 180000 }
  );
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
      return { eye: p.eye, focus: p.focus, yawDeg: p.yawDeg, pitchDeg: p.pitchDeg };
    });
    const file = await shot(name);
    dir = dirname(file);
    readings.push({ name, pose: [x, z, distance, yawDeg, pitchDeg, focusDepthM], probe });
  }
  writeFileSync(join(dir, 'probe.json'), JSON.stringify(readings, null, 2) + '\n');
};
