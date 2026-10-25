// #1611's fit check: does the orders panel still fit once a hold counts down?
//
// docs/ui-ux.md §10.5 puts a hold's countdown under the row's status word, where it
// costs no line, so the panel should measure the same with it as without it (#1622).
// Fitting is a layout question with real fonts, so it is asked of a browser rather than
// of a headless test. Waits for the first countdown row, then reads `.objectives-body`'s overflow
// with the countdown shown and with it hidden, so an overflow is attributed.
export default async ({ page, shot }) => {
  await page.waitForSelector('.objectives-clock', { timeout: 17 * 60 * 1000 });
  // A panel can grow while its hold runs (Conclave Chord reveals rows at 13:30,
  // a minute before its hold ends), so `FIT_LEFT_S` waits until the countdown reads that many
  // seconds or fewer: the fullest moment, not the first.
  const leftS = Number(process.env.FIT_LEFT_S ?? NaN);
  if (Number.isFinite(leftS)) {
    await page.waitForFunction(
      (limit) => {
        const figure = document.querySelector('.objectives-clock [aria-hidden]')?.textContent;
        const match = /(\d+):(\d+)/.exec(figure ?? '');
        return match !== null && Number(match[1]) * 60 + Number(match[2]) <= limit;
      },
      leftS,
      { timeout: 17 * 60 * 1000, polling: 1000 }
    );
  }
  await page.waitForTimeout(3000);
  const read = () =>
    page.$eval('.objectives-body', (body) => ({
      overflowPx: body.scrollHeight - body.clientHeight,
      clientHeight: body.clientHeight,
    }));
  const shown = await read();
  await shot('panel');
  await page.addStyleTag({ content: '.objectives-clock { display: none !important; }' });
  await page.waitForTimeout(500);
  const hidden = await read();
  console.log(`fit: ${JSON.stringify({ url: page.url(), shown, hidden })}`);
};
