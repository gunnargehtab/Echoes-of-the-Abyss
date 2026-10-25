// #1593: the prologue's orders panel once Tender Two loads at 13:40, in real
// time, with the panel's overflow read off `.objectives-body`. Nothing is
// ordered, so the flight stays compliant and the panel holds four rows and the
// withheld list, open, as a newcomer who never folded it would see it.
export default async ({ page, shot }) => {
  await page.waitForFunction(
    () => document.querySelector('.objectives')?.textContent?.includes('Tender Two is loaded'),
    undefined,
    { timeout: 20 * 60 * 1000, polling: 1000 }
  );
  await page.waitForTimeout(3000);
  const fit = await page.$eval('.objectives-body', (body) => ({
    overflowPx: body.scrollHeight - body.clientHeight,
    clientHeight: body.clientHeight,
    listShown: !body.querySelector('.objectives-lock-list')?.hidden,
  }));
  console.log(`fit: ${JSON.stringify(fit)}`);
  await shot('tender-two');
};
