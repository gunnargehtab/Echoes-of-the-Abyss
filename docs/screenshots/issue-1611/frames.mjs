// #1611 evidence: the arch named and counted down, gone at 10:40, the Concourse at 11:20.
// Synced to the panel's own DOM rather than to wall time, so a slow frame cannot misplace a shot.
const LONG = { timeout: 15 * 60 * 1000 };

export default async ({ page, shot }) => {
  const text = (sel) => page.$eval(sel, (el) => el.textContent ?? '').catch(() => '');
  await page.waitForSelector('.objectives-clock', { timeout: 30000 });
  await page.waitForTimeout(25000); // ~T+0:30, models decoded
  await shot('01-arch-home');
  console.log('clock:', await text('.objectives-clock'));
  // The station row is now a marker button: it sends the camera to the arch.
  const station = await page.$('button.objectives-row');
  if (station === null) throw new Error('the station row is not a button');
  await station.click();
  await page.waitForTimeout(2500);
  await shot('02-arch-focused');
  console.log('probe:', JSON.stringify(await page.evaluate(() => window.__perspectiveProbe?.())));

  // 10:40: the arch falls, the station goes met, the ring goes with it.
  await page.waitForFunction(
    () => [...document.querySelectorAll('.objectives-row')].some(
      (row) => row.classList.contains('met') && /arch/.test(row.textContent ?? '')
    ),
    null,
    LONG
  );
  await page.waitForTimeout(5000);
  await shot('03-arch-fallen');

  // 11:20: Tender One's row arrives; it sends the camera to the Concourse.
  await page.waitForFunction(
    () => /Tender One/.test(document.querySelector('.objectives-body')?.textContent ?? ''),
    null,
    LONG
  );
  await page.waitForTimeout(8000);
  const rows = await page.$$('button.objectives-row');
  for (const row of rows) {
    if (/Tender One/.test((await row.textContent()) ?? '')) await row.click();
  }
  await page.waitForTimeout(2500);
  await shot('04-concourse');
};
