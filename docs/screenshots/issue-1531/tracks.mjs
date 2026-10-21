// Sail the fleet to the map's centre, pinging, until an enemy hull resolves
// to a live Tier-4 track; then frame it.
export default async ({ page, shot }) => {
  const probe = () => page.evaluate(() => window.__perspectiveProbe());
  const selectAll = async () => {
    await page.mouse.move(250, 140);
    await page.mouse.down();
    await page.mouse.move(1190, 660, { steps: 8 });
    await page.mouse.up();
  };
  const sendTo = async (x, z) => {
    await page.evaluate(([x, z]) => window.__perspectiveCamera(x, z), [x, z]);
    await page.waitForTimeout(300);
    await page.mouse.click(720, 450, { button: 'right' });
  };
  for (let i = 0; i < 100; i++) {
    const p = await probe();
    if (p.tracks > 0) {
      console.log(`track after ${i * 3}s: ${JSON.stringify(p.trackAt)}`);
      const at = p.trackAt;
      await page.evaluate((a) => window.__perspectiveCamera(a.x, a.z, 700), at);
      await page.waitForTimeout(400);
      await shot('track-home');
      const q = await probe();
      console.log(`tracks=${q.tracks} modelMeshes=${q.modelMeshes}`);
      await page.evaluate(
        (a) => window.__perspectiveCamera(a.x, a.z, 400, { pitchDeg: 25, focusDepthM: a.depthM }),
        at
      );
      await page.waitForTimeout(400);
      await shot('track-low');
      return;
    }
    if (i === 0) {
      const c = p.ownCentre;
      await page.evaluate((c) => window.__perspectiveCamera(c.x, c.z, 2500), c);
      await page.waitForTimeout(300);
      await selectAll();
      await sendTo(4000, 4000);
    } else if (i % 5 === 0) {
      await page.evaluate(() => window.__perspectiveCamera(4000, 4000, 4000));
      await page.waitForTimeout(300);
      await selectAll();
      await page.keyboard.press('KeyP');
      if (i % 20 === 0) console.log(`t=${i * 3}s`);
    }
    await page.waitForTimeout(3000);
  }
  console.log('no track');
  await shot('no-track');
};
