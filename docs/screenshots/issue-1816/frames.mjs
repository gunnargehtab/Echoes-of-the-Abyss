// A mark's plate over open water (#1816), as a run-game steps module: the
// Close camera of docs/screenshots/issue-1799/README.md in the free-water
// crater, where each hull's disc stands half over the bowl's open water. One
// page and one moment: Low, then High with the marks' plates and without.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1816/software/after --steps docs/screenshots/issue-1816/frames.mjs
//
// `__perspectivePlates` is the development switch beside
// `__perspectiveQuality`; a player has no such setting. read.py reads a set.
import assert from 'node:assert/strict';

// Plan x, plan z, dolly, yaw, pitch, focus depth: the Close pose.
const CLOSE = [542, 1958, 420, -60, 2, 300];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 120000,
  });
  const [x, z, distance, yawDeg, pitchDeg, focusDepthM] = CLOSE;
  await page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
    { x, z, distance, yawDeg, pitchDeg, focusDepthM }
  );
  const quality = async (asked) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), asked);
    assert.equal(drawn, asked, `the view draws ${drawn}, asked ${asked}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForTimeout(6000);
  };
  await quality('low');
  await shot('low-close');
  await quality('high');
  for (const plates of [true, false]) {
    const held = await page.evaluate((on) => window.__perspectivePlates(on), plates);
    assert.equal(held, plates);
    await page.waitForTimeout(4000);
    await shot(`high-close-${plates ? 'plates' : 'bare'}`);
  }
  await page.evaluate(() => window.__perspectivePlates(true));
  const probe = await page.evaluate(() => window.__perspectiveProbe());
  console.log(
    `plates drawn: ${probe.graphicsQuality.plates} bands and discs · passes: ${probe.passes?.join(' ')}`
  );
};
