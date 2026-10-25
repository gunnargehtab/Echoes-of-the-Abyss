// #1583: #1557's camera on the Ventfront Divide, with each structure's rings
// about its model (this branch) and about its footing (`structureCentre`
// forced to null on the live conn view's prototype, which is main's anchor).
// The camera is nudged a metre and back after the patch, so every cached
// layer of the chart redraws under it.
const CAMS = [
  [1900, 1450, 1800, { pitchDeg: 55 }],
  [1900, 1450, 900, { pitchDeg: 55 }],
];
export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  const aimAt = (cam, nudge = 0) =>
    page.evaluate(
      ({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim),
      { x: cam[0] + nudge, z: cam[1], d: cam[2], aim: cam[3] }
    );
  for (const [i, cam] of CAMS.entries()) {
    await aimAt(cam);
    await page.waitForTimeout(3000);
    await shot(`ventfront-${i}-model`);
  }
  await page.evaluate(async () => {
    const { PerspectiveView } = await import('/src/game/PerspectiveView.ts');
    PerspectiveView.prototype.structureCentre = () => null;
  });
  for (const [i, cam] of CAMS.entries()) {
    await aimAt(cam, 1);
    await page.waitForTimeout(500);
    await aimAt(cam);
    await page.waitForTimeout(3000);
    await shot(`ventfront-${i}-footing`);
  }
};
