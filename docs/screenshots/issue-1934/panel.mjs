// The free-water camera panel in NAV at one UI scale (#1934, docs/ui-ux.md
// §11), as a run-game steps module. It latches NAV, so every row the panel
// can hold is up, and prints the panel's computed type, a motion button's,
// the held scale and the panel's rect in window px before the frame.
//
//   SETTINGS_JSON='{"uiScale":2}' VIEW_H=1200 \
//     node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?study=free-water' \
//     --out <dir> --steps docs/screenshots/issue-1934/panel.mjs
//
// VIEW_H 1200 because §11 holds the scale to what the window carries: 200%
// needs 1,168 px of height.
export default async ({ page, shot }) => {
  await page.waitForSelector('.flight-panel', { timeout: 120000 });
  // The models decode in the background; the frame is for the panel, but a
  // swap mid-shot is noise in a before/after.
  await page.waitForTimeout(6000);
  await page.keyboard.press('F9');
  await page.waitForTimeout(1500);
  const reading = await page.evaluate(() => {
    const el = document.querySelector('.flight-panel');
    const box = el.getBoundingClientRect();
    return {
      fontSize: getComputedStyle(el).fontSize,
      buttonSize: getComputedStyle(el.querySelector('.flight-motion button')).fontSize,
      uiScale: getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale'),
      rect: [box.left, box.top, box.width, box.height].map(Math.round),
    };
  });
  console.log('panel:', JSON.stringify(reading));
  await shot('nav');
};
