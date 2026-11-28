// The frames for #1988, on The Ventfront Divide at the Low graphics quality,
// headless Chromium's software rasteriser: home (4,000 m, 55 degrees), survey
// (10,000 m, 88 degrees) and low (2,500 m, 20 degrees), each on the own fleet.
// node .claude/skills/run-game/scripts/drive.mjs --out <dir> --steps docs/screenshots/issue-1988/frames.mjs
export default async ({ page, shot }) => {
  await page.waitForTimeout(2000);
  const p = await page.evaluate(() => window.__perspectiveProbe());
  const c = p.ownCentre;
  await page.evaluate(([x, z]) => window.__perspectiveCamera(x, z, 4000, { pitchDeg: 55 }), [c.x, c.z]);
  await page.waitForTimeout(1500);
  await shot('home-4000');
  await page.evaluate(([x, z]) => window.__perspectiveCamera(x, z, 10000, { pitchDeg: 88 }), [c.x, c.z]);
  await page.waitForTimeout(1500);
  await shot('survey-10000');
  await page.evaluate(([x, z]) => window.__perspectiveCamera(x, z, 2500, { pitchDeg: 20 }), [c.x, c.z]);
  await page.waitForTimeout(1500);
  await shot('low-2500');
};
