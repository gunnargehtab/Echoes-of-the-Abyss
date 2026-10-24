// #1585: the prologue's orders panel at T+0, once Tender One loads at 11:20,
// and once Tender Two loads at 13:40, in real time. Tender One's row is
// pressed between the last two, which sends the camera to the Concourse.
const loaded = (page, text) =>
  page.waitForFunction(
    (t) => document.querySelector('.objectives')?.textContent?.includes(t),
    text,
    {
      timeout: 15 * 60 * 1000,
      polling: 1000,
    }
  );

export default async ({ page, shot }) => {
  await page.waitForTimeout(8000);
  await shot('station');
  await loaded(page, 'Tender One is loaded');
  await page.waitForTimeout(3000);
  await shot('tender-one');
  await page.locator('button.objectives-row', { hasText: 'Tender One is loaded' }).click();
  await page.waitForTimeout(3000);
  await shot('concourse');
  await loaded(page, 'Tender Two is loaded');
  await page.waitForTimeout(3000);
  await shot('tender-two');
};
