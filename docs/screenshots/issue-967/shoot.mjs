// Shoots the dream-loop frame from the running game: the Consortium seat on the
// Ventfront Divide, 55° pitch, yaw north, seabed focus, dolly 1500, HUD hidden.
// The same frame as baseline.png and target.png (#967).
//
//   .claude/skills/run-game/scripts/dev.sh start
//   VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --out .dream-loop/shots --steps docs/screenshots/issue-967/shoot.mjs
export default async ({ page, shot }) => {
  await page.waitForTimeout(7000); // GLBs swap in over the baked sprites
  await page.evaluate(() =>
    window.__perspectiveCamera(1340, 1300, 1500, { yawDeg: 0, pitchDeg: 55, focusDepthM: null })
  );
  await page.waitForTimeout(2500);
  // No HUD toggle exists, so hide the Pixi canvas and every DOM overlay.
  // The first canvas is the three.js world.
  await page.evaluate(() => {
    [...document.querySelectorAll('canvas')].slice(1).forEach((c) => (c.style.visibility = 'hidden'));
    document.querySelectorAll('body *:not(canvas)').forEach((el) => {
      if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
  });
  await page.waitForTimeout(2500);
  await shot('frame');
};
