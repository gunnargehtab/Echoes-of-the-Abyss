// #1557: the issue's own camera, cut (this branch) and uncut (inkHidden forced
// to false on the live conn view's prototype, which is main's behaviour). The
// camera is nudged a metre and back after the patch, so every cached layer of
// the chart redraws under it.
const CAMS = {
  'ventfront-divide': [
    [1900, 1450, 1800, { pitchDeg: 55 }],
    [1900, 1450, 900, { pitchDeg: 55 }],
  ],
};
export default async ({ page, shot }) => {
  const map = new URL(page.url()).searchParams.get('map');
  await page.waitForTimeout(6000);
  const aimAt = (cam, nudge = 0) =>
    page.evaluate(
      ({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim),
      { x: cam[0] + nudge, z: cam[1], d: cam[2], aim: cam[3] }
    );
  for (const [i, cam] of CAMS[map].entries()) {
    await aimAt(cam);
    await page.waitForTimeout(3000);
    await shot(`${map}-${i}-cut`);
  }
  await page.evaluate(async () => {
    const { PerspectiveView } = await import('/src/game/PerspectiveView.ts');
    PerspectiveView.prototype.inkHidden = () => false;
  });
  for (const [i, cam] of CAMS[map].entries()) {
    await aimAt(cam, 1);
    await page.waitForTimeout(500);
    await aimAt(cam);
    await page.waitForTimeout(3000);
    await shot(`${map}-${i}-uncut`);
  }
};
