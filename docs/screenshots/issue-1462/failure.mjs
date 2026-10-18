// #1462 slice 3: a load or join failure (docs/world-map.md §7.6), on the GPU.
// MODE=load: the board's prologue, its match code blocked, then Retry unblocked.
// MODE=join: the board's prologue, its join refused, then Retry.
// MODE=back: the board's prologue, its join refused, then Back to the board.
// MODE=tutorial: the Tutorial door, its match code blocked, then Retry unblocked.
// Run: drive.mjs --headed --channel chrome, minus its title steps.
export default async ({ page, shot }) => {
  const mode = process.env.MODE ?? 'load';
  let blocked = true;
  if (mode === 'load' || mode === 'tutorial') {
    await page.route(/\/src\/game\/GameCanvas\.tsx/, (route) =>
      blocked ? route.abort('failed') : route.continue()
    );
  } else {
    await page.route('**/matchmake/**', (route) => (blocked ? route.abort('failed') : route.continue()));
  }
  const read = async (name) => {
    const r = await page.evaluate(() => {
      const p = window.__perspectiveProbe?.();
      return {
        frame: p?.world?.frame,
        bar: document.querySelector('.travel-bar')?.textContent ?? null,
        overlay: document.querySelector('.game-overlay')?.textContent ?? null,
        held: document.querySelector('.game-overlay-held') !== null,
        focused: document.activeElement?.textContent ?? null,
      };
    });
    console.log(JSON.stringify({ name, ...r }));
  };
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  if (mode === 'tutorial') {
    await page.getByRole('button', { name: 'Tutorial' }).click();
    await page.getByRole('button', { name: 'Descend' }).click();
    await page.getByRole('button', { name: 'Retry' }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    await shot('failed');
    await read('failed');
    blocked = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    // A title launch's Retry reloads onto the title.
    await page.waitForSelector('.menu-screen', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await shot('after-retry');
    await read('after-retry');
    return;
  }
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.getByRole('button', { name: 'Retry' }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot('failed');
  await read('failed');
  blocked = false;
  if (mode === 'back') {
    await page.getByRole('button', { name: 'Back' }).click();
    await page.waitForTimeout(1500);
    await shot('back-travelling');
    await read('back-travelling');
    await page.waitForTimeout(4000);
    await shot('back-board');
    await read('back-board');
    return;
  }
  await page.getByRole('button', { name: 'Retry' }).click();
  if (mode === 'load') {
    // Retry reloads the page; the board launch's note reopens the board.
    await page.waitForSelector('.campaign-slot', { timeout: 30000 });
    await page.waitForTimeout(3000);
    await shot('reopened');
    await read('reopened');
    await page.locator('.campaign-slot').first().click();
    await page.getByRole('region', { name: 'Briefing' }).waitFor();
    await page.getByRole('button', { name: 'Descend' }).click();
    await page.waitForSelector('.travel-bar', { state: 'detached', timeout: 60000 });
  }
  await page.waitForTimeout(10000);
  await shot('after-retry');
  await read('after-retry');
};
