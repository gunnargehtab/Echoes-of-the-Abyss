// #1105: the Ventfront Divide's west flanking tunnel, a slot bored through a
// coral divider (cols 9–11, rows 15–16; ceiling 520 m over a 1,400 m floor),
// from above and low into its west mouth.
//
//   node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
//     --steps docs/screenshots/issue-1105/slot.mjs
export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(5000);
  const camera = (x, z, d, aim) =>
    page.evaluate(({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim), { x, z, d, aim });
  await camera(2625, 4000, 1600, { pitchDeg: 55, yawDeg: 0, focusDepthM: null });
  await page.waitForTimeout(1500);
  await shot('slot-home');
  await camera(2250, 4000, 1000, { pitchDeg: 12, yawDeg: 270, focusDepthM: 900 });
  await page.waitForTimeout(1500);
  await shot('slot-mouth-low');
};
