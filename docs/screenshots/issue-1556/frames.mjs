// #1556: the issue's own camera, cut (this branch) and uncut (inkBounds forced
// to null on the live conn view's prototype, which is main's behaviour).
const CAMS = {
  'ventfront-divide': [4000, 700, 3000, { pitchDeg: 40 }],
  'abyssal-rift-corridor': [5000, 3000, 4000, { pitchDeg: 18, focusDepthM: 800 }],
};
export default async ({ page, shot }) => {
  const map = new URL(page.url()).searchParams.get('map');
  const [x, z, d, aim] = CAMS[map];
  await page.waitForTimeout(6000);
  await page.evaluate(({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim), { x, z, d, aim });
  await page.waitForTimeout(3000);
  await shot(`${map}-cut`);
  await page.evaluate(async () => {
    const { PerspectiveView } = await import('/src/game/PerspectiveView.ts');
    PerspectiveView.prototype.inkBounds = () => null;
  });
  await page.waitForTimeout(3000);
  await shot(`${map}-uncut`);
};
