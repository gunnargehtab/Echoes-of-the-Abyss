// The marks' plates over the world's own light (#1801), as a run-game steps
// module: the three hulls sent into the garden and selected, so their rings,
// collars and detection rings stand over its glow, at the High graphics
// quality with the plates and without them.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1801/software/plates --steps docs/screenshots/issue-1801/plates.mjs
//
// The pair is one page and one moment: `__perspectivePlates` is the
// development switch beside `__perspectiveQuality`, and a player has no such
// setting. TRAVEL_S is how long the hulls are given to reach the garden.
import assert from 'node:assert/strict';

// name, plan x, plan z, dolly, yaw, pitch, focus depth.
const SURVEY = ['survey', 2000, 2000, 10000, 0, 88, null];
// Over the garden's west half, where the order below sends the hulls.
const GARDEN = ['garden', 1300, 1000, 1000, -34, 32, 300];

const aim = (page, [, x, z, distance, yawDeg, pitchDeg, focusDepthM]) =>
  page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
    { x, z, distance, yawDeg, pitchDeg, focusDepthM }
  );

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 120000,
  });
  const drawn = await page.evaluate(() => window.__perspectiveQuality('high'));
  assert.equal(drawn, 'high', `the view draws ${drawn}`);
  await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
    timeout: 120000,
  });

  // At the survey dolly the map is square to the screen, north up, so a plan
  // point is a pixel: the 4,000 m map spans the frame's height less the HUD.
  await aim(page, SURVEY);
  await page.waitForTimeout(4000);
  // Read off the survey frame at 1920 × 1080: the map's west edge is at x 650
  // and its north edge at y 232, 6.45 m to a pixel.
  const view = page.viewportSize();
  const px = (xM, zM) => {
    const k = view.height / 1080;
    return [(650 + xM / 6.45) * k + (view.width - 1920 * k) / 2, (232 + zM / 6.45) * k];
  };

  // Select the three hulls on the west rim, then order them into the garden.
  const [x0, y0] = px(150, 1650);
  const [x1, y1] = px(950, 2300);
  await page.mouse.move(x0, y0);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
  await page.mouse.move(x1, y1, { steps: 4 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(1500);
  const [gx, gy] = px(GARDEN[1], GARDEN[2]);
  await page.mouse.click(gx, gy, { button: 'right' });
  await page.waitForTimeout(Number(process.env.TRAVEL_S ?? 90) * 1000);

  const pair = async (name) => {
    for (const plates of [true, false]) {
      const held = await page.evaluate((on) => window.__perspectivePlates(on), plates);
      assert.equal(held, plates);
      await page.waitForTimeout(3000);
      await shot(`${name}-${plates ? 'plates' : 'bare'}`);
    }
    await page.evaluate(() => window.__perspectivePlates(true));
  };
  await aim(page, GARDEN);
  await page.waitForTimeout(4000);
  await pair('garden');
  await aim(page, SURVEY);
  await page.waitForTimeout(4000);
  await pair('survey');
  const probe = await page.evaluate(() => window.__perspectiveProbe());
  console.log(
    `plates drawn: ${probe.graphicsQuality.plates} bands and discs · passes: ${probe.passes?.join(' ')}`
  );
};
