// #1462 slice 5: every way back reopens the board on the slot left from, with
// focus (docs/ui-ux.md §14, "Keyboard"; docs/world-map.md §7.6 step 4), on the GPU.
// The pointer is parked off the board after every click, so the lit slot is the
// board's focus rather than a hover. Ways back: a briefing's Back, a travel's
// Cancel, a refused join's Back, and Return to port from the Esc menu.
// Run: drive.mjs --headed --channel chrome, minus its title steps.
export default async ({ page, shot }) => {
  let refuse = false;
  await page.route('**/matchmake/**', (route) => (refuse ? route.abort('failed') : route.continue()));
  // Off the board and the chart: the title band's left edge.
  const park = () => page.mouse.move(4, 4);
  const read = async (name) => {
    const r = await page.evaluate(() => ({
      lit: document.querySelector('.campaign-chart-title')?.textContent ?? null,
      focused: document.activeElement?.classList.contains('campaign-slot')
        ? document.activeElement.querySelector('.campaign-slot-title')?.textContent ??
          document.activeElement.textContent?.slice(0, 40)
        : `${document.activeElement?.tagName}.${document.activeElement?.className}`,
    }));
    console.log(JSON.stringify({ name, ...r }));
  };
  const prologue = () => page.locator('.campaign-slot').first();
  const descend = async () => {
    await page.getByRole('region', { name: 'Briefing' }).waitFor();
    await page.getByRole('button', { name: 'Descend' }).click();
  };
  const settle = async (name) => {
    await park();
    await page.waitForTimeout(4000);
    await shot(name);
    await read(name);
  };

  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, {
    timeout: 30000,
  });
  await settle('entry');

  // A briefing's Back, from the first Ledger slot.
  await page.locator('.campaign-slot').nth(1).click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Back' }).click();
  await settle('briefing-back');

  // A travel's Cancel, pressed by Esc as the bar says.
  await prologue().click();
  await descend();
  await page.waitForSelector('.travel-bar');
  await page.keyboard.press('Escape');
  await settle('travel-cancel');

  // A refused join's Back.
  refuse = true;
  await prologue().click();
  await descend();
  await page.getByRole('button', { name: 'Retry' }).waitFor({ timeout: 60000 });
  refuse = false;
  await page.getByRole('button', { name: 'Back' }).click();
  await settle('join-back');

  // Return to port, from the Esc menu.
  await prologue().click();
  await descend();
  await page.waitForSelector('.travel-bar', { state: 'detached', timeout: 60000 });
  await page.waitForTimeout(8000);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Return to port/ }).click();
  await page.getByRole('button', { name: /Abandon the water/ }).click();
  await settle('return-to-port');
};
