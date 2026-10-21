// #1513 evidence, as a run-game --steps module: one Lampfry shoal framed
// formed, part-way through its burst, scattered, and part-way through its
// gather, in a real match.
//
//   node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
//     --url 'http://localhost:5173/?map=<id>' --steps docs/screenshots/issue-1513/burst.mjs
//
// Two things here are the harness's, not the game's, and the README says so.
// SwiftShader takes longer over a frame than the 0.6 s burst lasts, so the
// burst clock is pinned at each moment shot: `update` runs as it does, then
// `uBurstS` is set to the moment. And the scatter is the stipple's own
// `setLife` told the shoal is scattered, rather than a hull sailed within
// 300 m of it: what it draws from there is the code under review.
export default async ({ page, shot }) => {
  await page.evaluate(async () => {
    // The dev server hands the page the module the app already imported, so
    // patching its prototype reaches the live conn view's stipple.
    const { FaunaStipple } = await import('/src/game/faunaStipple.ts');
    const setLife = FaunaStipple.prototype.setLife;
    FaunaStipple.prototype.setLife = function (jellies, shoals) {
      window.__life = this;
      window.__shoals = shoals;
      const forced = window.__scatter;
      return setLife.call(
        this,
        jellies,
        forced == null ? shoals : shoals.map((s) => (s.id === forced ? { ...s, scattered: true } : s))
      );
    };
    const update = FaunaStipple.prototype.update;
    FaunaStipple.prototype.update = function (frame) {
      update.call(this, frame);
      if (window.__pinS != null) this.shoals.uniforms.uBurstS.value = window.__pinS;
    };
  });
  await page.waitForFunction(() => (window.__shoals ?? []).some((s) => !s.scattered), null, {
    timeout: 30000,
  });
  const shoal = await page.evaluate(() => {
    const centre = window.__perspectiveProbe().ownCentre;
    const formed = window.__shoals.filter((s) => !s.scattered);
    formed.sort(
      (a, b) =>
        Math.hypot(a.x - centre.x, a.y - centre.z) - Math.hypot(b.x - centre.x, b.y - centre.z)
    );
    return formed[0];
  });
  console.log('shoal', shoal);
  await page.evaluate(
    ({ x, y, depth }) =>
      window.__perspectiveCamera(x, y, 520, { pitchDeg: 40, focusDepthM: depth }),
    shoal
  );
  const pin = async (s, name) => {
    await page.evaluate((v) => (window.__pinS = v), s);
    await page.waitForTimeout(1500);
    await shot(name);
  };
  const startOf = () => page.evaluate((id) => window.__life.bursts.get(id).startS, shoal.id);

  await page.waitForTimeout(3000);
  await shot('formed');
  await page.evaluate((id) => (window.__scatter = id), shoal.id);
  await page.waitForFunction(
    (id) => window.__life.bursts.get(id)?.to[0] > 1,
    shoal.id,
    { timeout: 10000 }
  );
  const burst = await startOf();
  await pin(burst + 0.1, 'burst-0.1s');
  await pin(burst + 0.25, 'burst-0.25s');
  await pin(burst + 0.6, 'scattered');
  await page.evaluate(() => (window.__scatter = null));
  await page.waitForFunction(
    (id) => window.__life.bursts.get(id)?.to[0] === 1,
    shoal.id,
    { timeout: 10000 }
  );
  const gather = await startOf();
  await pin(gather + 0.6, 'gather-0.6s');
  await pin(gather + 3, 'formed-again');
  await page.evaluate(() => (window.__pinS = null));
};
