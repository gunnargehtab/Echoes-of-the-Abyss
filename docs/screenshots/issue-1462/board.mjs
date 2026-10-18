// #1462: the board with the world behind it, a launch's travel, the arrival.
export default async ({ page, shot }) => {
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForSelector('.campaign-board');
  // The world arrives behind a board already drawn.
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  await shot('board');
  const probe = await page.evaluate(() => window.__perspectiveProbe?.());
  console.log(JSON.stringify({ board: { calls: probe?.drawCalls, triangles: probe?.triangles } }));
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.waitForTimeout(1500);
  await shot('briefing');
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.waitForSelector('.travel-bar', { timeout: 5000 });
  await page.waitForTimeout(900);
  await shot('travel');
  await page.waitForSelector('.game-host canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot('arrived');
};
