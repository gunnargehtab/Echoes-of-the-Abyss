// The free-water MOVE 3D preview, armed, at one UI scale (#1969, docs/ui-ux.md
// §11), as a run-game steps module. It clicks the window centre, where the
// study's hull sits, arms the preview so every row it can hold is up, and prints its computed type, a
// button's, the held scale and the rects of it and the camera panel in window
// px before the frame.
//
//   SETTINGS_JSON='{"uiScale":2}' VIEW_H=1200 \
//     node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?study=free-water' \
//     --out <dir> --steps docs/screenshots/issue-1969/panel.mjs
//
// VIEW_H 1200 because §11 holds the scale to what the window carries: 200%
// needs 1,168 px of height.
export default async ({ page, shot }) => {
  await page.waitForSelector('.move-preview', { timeout: 120000 });
  await page.waitForTimeout(6000);
  const probe = await page.evaluate(() => window.__perspectiveProbe?.());
  console.log('probe:', JSON.stringify(probe?.ownCentre ?? null));
  const { innerWidth: w, innerHeight: h } = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  }));
  await page.mouse.click(w / 2, h / 2);
  await page.waitForTimeout(500);
  await page.click('.move-preview button');
  await page.waitForTimeout(1000);
  const reading = await page.evaluate(() => {
    const rect = (el) => {
      if (el === null) return null;
      const box = el.getBoundingClientRect();
      return [box.left, box.top, box.width, box.height].map(Math.round);
    };
    const el = document.querySelector('.move-preview');
    return {
      armed: el.querySelector('strong')?.textContent ?? null,
      fontSize: getComputedStyle(el).fontSize,
      buttonSize: getComputedStyle(el.querySelector('button')).fontSize,
      uiScale: getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale'),
      rect: rect(el),
      scroll: [el.scrollHeight, el.clientHeight],
      cameraPanel: rect(document.querySelector('.flight-panel')),
    };
  });
  console.log('panel:', JSON.stringify(reading));
  await shot('armed');
};
