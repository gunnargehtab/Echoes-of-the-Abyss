// #1462 slice 2: Return to port from a board launch (docs/world-map.md §7.6 step 4).
// Board -> briefing -> travel -> join; the camera moved off home; Esc, Return to
// port, Abandon the water; then frames through the ramp-out, the travel back and
// the board, each with the probe's world reading and the camera frame.
// HIDE_BOARD=1 hides the board's glass after the exit, so the world is seen;
// REDUCED=1 turns reduced motion on before it.
// Run on the GPU: drive.mjs --headed --channel chrome, minus its title steps.
export default async ({ page, shot }) => {
  const read = async (name) => {
    const r = await page.evaluate(() => {
      const p = window.__perspectiveProbe?.();
      return { world: p?.world, calls: p?.drawCalls, tris: p?.triangles, cam: p?.camera };
    });
    console.log(JSON.stringify({ name, t: Date.now() - t0, ...r }));
  };
  let t0 = Date.now();
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, { timeout: 30000 });
  await page.waitForTimeout(4000);
  await shot('board-before');
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.waitForSelector('.travel-bar', { state: 'detached', timeout: 60000 });
  await page.waitForSelector('.mission-panel, .objectives', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(8000);
  // Away from home, as a player would leave it: over the court, turned, lower.
  await page.evaluate(() => window.__perspectiveCamera(2400, 2300, 1800, { yawDeg: 40, pitchDeg: 42 }));
  await page.waitForTimeout(2500);
  await shot('in-match');
  await read('in-match');
  if (process.env.REDUCED === '1') {
    await page.evaluate(async () => {
      const store = await import('/src/settings/store.ts');
      store.saveSettings({ ...store.loadSettings(), reducedMotion: true });
    });
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Return to port/ }).click();
  await page.getByRole('button', { name: /Abandon the water/ }).click();
  t0 = Date.now();
  if (process.env.HIDE_BOARD === '1') {
    await page.addStyleTag({ content: '.menu-screen { visibility: hidden !important; }' });
  }
  await shot('ramp-out');
  await read('ramp-out');
  await page.waitForTimeout(Math.max(0, 1500 - (Date.now() - t0)));
  await shot('travel-back');
  await read('travel-back');
  await page.waitForTimeout(Math.max(0, 2600 - (Date.now() - t0)));
  await shot('travel-late');
  await read('travel-late');
  await page.waitForTimeout(Math.max(0, 6000 - (Date.now() - t0)));
  await shot('board-after');
  await read('board-after');
};
