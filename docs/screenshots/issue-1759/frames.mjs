// The free-water cut's route line (#1759), as a run-game steps module: the cut
// from overhead, where the line reads against the wall either side of it. From
// inside the bowl the line is too faint to judge a direction by.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1759/after --steps docs/screenshots/issue-1759/frames.mjs
//
// It waits on the study's first prop rather than a count: #1751 changed the
// count, and the line does not depend on it.
const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['overhead', 2000, 3250, 2400, 0, 85, null],
];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().props >= 1, null, {
    timeout: 120000,
  });
  for (const [name, x, z, distance, yawDeg, pitchDeg, focusDepthM] of POSES) {
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    // Several frames, not a timer: a software frame takes hundreds of
    // milliseconds, and a shot before the pose is drawn shows the last one.
    await page.evaluate(() => window.__perspectiveStation('settle'));
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 6, null, {
      timeout: 120000,
    });
    await shot(name);
  }
};
