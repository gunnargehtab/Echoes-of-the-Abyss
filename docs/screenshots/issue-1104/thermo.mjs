// Frames a 1,200 m floor crossing at several cameras. FOCUS_X / FOCUS_Z pick the point.
const x = Number(process.env.FOCUS_X ?? 2000);
const z = Number(process.env.FOCUS_Z ?? 1875);
export default async ({ page, shot }) => {
  await page.waitForTimeout(5000);
  for (const [name, distance, pitchDeg] of [
    ['close', 1500, 55],
    ['mid', 4000, 55],
    ['low', 3500, 15],
    ['survey', 18000, 88],
  ]) {
    await page.evaluate(
      ({ x, z, distance, pitchDeg }) =>
        window.__perspectiveCamera(x, z, distance, { yawDeg: 0, pitchDeg, focusDepthM: null }),
      { x, z, distance, pitchDeg }
    );
    await page.waitForTimeout(2500);
    await shot(name);
  }
};
