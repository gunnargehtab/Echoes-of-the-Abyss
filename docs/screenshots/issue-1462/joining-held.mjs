// #1462: a travelled entry's wait for its room, held over the frame the travel
// ended on. The matchmaking request is delayed 6 s so the wait can be seen.
export default async ({ page, shot }) => {
  await page.route('**/matchmake/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue();
  });
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.waitForSelector('.travel-bar', { state: 'detached', timeout: 60000 });
  await page.waitForSelector('.game-overlay-held', { timeout: 5000 });
  await page.waitForTimeout(1500);
  await shot('joining-held');
};
