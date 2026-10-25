// #1622: the orders panel's fit in the states that grow it without a reveal.
//
// panelFit.mjs read each panel once, at a moment chosen in advance. A silence debt, a
// stalled walk and the commander's bell come and go, so this samples `.objectives-body`
// every second while a hold counts down, with the countdown shown and hidden in the same
// layout pass, and keeps the worst reading for each combination of states it saw. The
// states were staged for the drive that recorded the README's table (it says how).
//
// SWEEP_S     seconds to sample after the first countdown row (default 120).
// SWEEP_BELL_S seconds after it to press the commander's act, if the panel offers one.
export default async ({ page, shot }) => {
  await page.waitForSelector('.objectives-clock', { timeout: 17 * 60 * 1000 });
  const sweepS = Number(process.env.SWEEP_S ?? 120);
  const bellS = Number(process.env.SWEEP_BELL_S ?? NaN);
  await page.addStyleTag({
    content: '.fit-hide-clock .objectives-clock { display: none !important; }',
  });
  const worst = new Map();
  const start = Date.now();
  let rung = false;
  while (Date.now() - start < sweepS * 1000) {
    const elapsed = (Date.now() - start) / 1000;
    if (!rung && Number.isFinite(bellS) && elapsed >= bellS) {
      rung = true;
      await page.click('.objectives-act-button').catch(() => console.log('bell: no button'));
    }
    const sample = await page.evaluate(() => {
      const body = document.querySelector('.objectives-body');
      if (body === null) return null;
      const text = body.textContent ?? '';
      const read = () => ({
        overflowPx: body.scrollHeight - body.clientHeight,
        heightPx: body.scrollHeight,
      });
      const shown = read();
      document.documentElement.classList.add('fit-hide-clock');
      const hidden = read();
      document.documentElement.classList.remove('fit-hide-clock');
      return {
        clock: document.querySelector('.objectives-clock [aria-hidden]')?.textContent ?? null,
        state: [
          document.querySelector('.objectives-debt') !== null ? 'debt' : null,
          // convocation.ts' `stallText`, the one reading a stalled walk swaps in.
          /come round again/.test(text) ? 'stall' : null,
          document.querySelector('.objectives-act-running') !== null ? 'bell' : null,
        ]
          .filter(Boolean)
          .join('+') || 'none',
        shown,
        hidden,
      };
    });
    if (sample !== null && sample.clock !== null) {
      const prior = worst.get(sample.state);
      if (prior === undefined || sample.shown.heightPx > prior.shown.heightPx) {
        worst.set(sample.state, sample);
        await shot(`${sample.state}-${sample.shown.heightPx}`);
      }
    }
    await page.waitForTimeout(1000);
  }
  for (const [state, s] of worst) {
    console.log(
      `sweep: ${JSON.stringify({ url: page.url(), state, clock: s.clock, shown: s.shown, hidden: s.hidden })}`
    );
  }
};
