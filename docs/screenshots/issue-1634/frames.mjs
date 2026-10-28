// #1634: the prologue's orders panel once Tender Two loads at 13:40, in real
// time, read at four screens and five UI scales. Nothing is ordered, so the
// panel holds four rows and the withheld list, open, as in #1593's drive. Each
// case reads the scale the HUD drew at, the body's overflow, the type the
// panel settled on as drawn on screen, and its foot against the hint line.
const SCREENS = [
  [1440, 900],
  [1366, 768],
  [1920, 1080],
  [1280, 720],
];
const SCALES = [1, 1.25, 1.5, 1.75, 2];
const SHOTS = new Set(['1440x900@1.5', '1366x768@1.25', '1920x1080@2']);

export default async ({ page, shot }) => {
  await page.waitForFunction(
    () => document.querySelector('.objectives')?.textContent?.includes('Tender Two is loaded'),
    undefined,
    { timeout: 20 * 60 * 1000, polling: 1000 }
  );
  await page.waitForTimeout(3000);
  for (const [width, height] of SCREENS) {
    await page.setViewportSize({ width, height });
    for (const scale of SCALES) {
      await page.evaluate(async (uiScale) => {
        const store = await import('/src/settings/store.ts');
        store.saveSettings({ uiScale });
      }, scale);
      await page.waitForTimeout(600);
      const fit = await page.evaluate(() => {
        const s = Number(
          getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale')
        );
        const panel = document.querySelector('.objectives');
        const body = panel.querySelector('.objectives-body');
        const type = Number(getComputedStyle(panel).getPropertyValue('--panel-type'));
        return {
          drawnScale: Number(s.toFixed(2)),
          overflowPx: body.scrollHeight - body.clientHeight,
          typeOnScreen: Number((type * s).toFixed(2)),
          footPx: Math.round(panel.getBoundingClientRect().bottom),
          hintTopPx: Math.round(innerHeight - 232 * s),
          listShown: !panel.querySelector('.objectives-lock-list')?.hidden,
        };
      });
      console.log(`fit ${width}x${height}@${scale}: ${JSON.stringify(fit)}`);
      if (SHOTS.has(`${width}x${height}@${scale}`))
        await shot(`tender-two-${width}x${height}-${scale * 100}`);
    }
  }
};
