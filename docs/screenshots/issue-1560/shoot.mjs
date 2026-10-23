// #1560: the issue's two frames, plus a low one, per map given in FRAMES.
export default async ({ page, shot }) => {
  const frames = JSON.parse(process.env.FRAMES);
  await page.waitForTimeout(5000);
  for (const [name, x, z, dist, pitch] of frames) {
    await page.evaluate(
      ([x, z, dist, pitch]) => window.__perspectiveCamera(x, z, dist, { pitchDeg: pitch }),
      [x, z, dist, pitch]
    );
    await page.waitForTimeout(2500);
    await shot(name);
  }
};
