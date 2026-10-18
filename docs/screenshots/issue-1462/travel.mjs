// #1462 round 2: board, mid-travel, the join, settled play; counts at each.
export default async ({ page, shot }) => {
  const counts = async (name) => {
    const p = await page.evaluate(() => ({ ...window.__perspectiveProbe?.(), dpr: window.devicePixelRatio }));
    return { name, calls: p.drawCalls, triangles: p.triangles, focus: p.focus, dpr: p.dpr };
  };
  const rows = [];
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  rows.push(await counts('board'));
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.waitForSelector('.travel-bar', { timeout: 5000 });
  await page.waitForTimeout(900);
  rows.push(await counts('mid-travel'));
  await shot('travel');
  await page.waitForSelector('.travel-bar', { state: 'detached', timeout: 60000 });
  await shot('joining');
  await page.waitForSelector('.game-overlay', { state: 'detached', timeout: 45000 });
  await page.waitForTimeout(800);
  rows.push(await counts('joined'));
  await shot('joined');
  await page.waitForTimeout(5000);
  rows.push(await counts('playing'));
  await shot('playing');
  console.log(JSON.stringify(rows));
};
