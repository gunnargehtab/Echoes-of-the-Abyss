// #1462: what the travel's end looks like before the room's ground lands.
export default async ({ page, shot }) => {
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, { timeout: 30000 });
  await page.addStyleTag({ content: '.menu-screen { visibility: hidden !important; }' });
  await page.waitForTimeout(6000);
  for (const [name, d] of [['at-6km', 6000], ['at-home', 2600]]) {
    await page.evaluate((dist) => window.__perspectiveCamera(2550, 2150, dist, { yawDeg: 0, pitchDeg: 55 }), d);
    await page.waitForTimeout(1500);
    await shot(`${name}-now`);
    await page.waitForTimeout(8000);
    await shot(`${name}-later`);
    const p = await page.evaluate(() => window.__perspectiveProbe?.());
    console.log(JSON.stringify({ name, calls: p?.drawCalls, tris: p?.triangles, world: p?.world }));
  }
};
