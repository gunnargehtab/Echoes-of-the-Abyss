// #1488: the baseline detail's props, on the board's frame and the home frame
// before the join, and the same home frame once the room's ground is drawn.
// Gate 6 per station: the whole frame's calls and triangles, and the queued
// GPU reading (drive with UNPACED=1 on a named GPU; VIEW_DPR sets the ratio).
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);

export default async ({ page, shot }) => {
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForSelector('.campaign-board');
  await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, {
    timeout: 30000,
  });
  const hide = await page.addStyleTag({ content: '.menu-screen { visibility: hidden !important; }' });
  await page.waitForTimeout(8000);

  const station = async (name) => {
    await page.evaluate((steps) => window.__perspectiveGpuQueue?.(steps), QUEUE_STEPS);
    await page.evaluate((label) => window.__perspectiveStation?.(label), name);
    await page.waitForTimeout(5000);
    const r = await page.evaluate(() => window.__perspectiveStation?.('after'));
    await page.evaluate(() => window.__perspectiveGpuQueue?.(0));
    console.log(
      JSON.stringify({
        station: name,
        calls: r?.drawCalls,
        triangles: r?.triangles,
        avgGpuMs: r?.avgGpuMs,
        queue: r?.gpuQueue,
        gpuTimer: r?.gpuTimer,
        pixelRatio: r?.pixelRatio,
        props: r?.props,
        detailDrawn: r?.world?.detailDrawn,
        detailProps: r?.world?.detailProps,
        detailPropTris: r?.world?.detailPropTris,
      })
    );
  };

  // The board's own frame (§7.6 step 1), the world alone.
  await shot('board');
  await station('board');

  // The travel's end before the join: home, on the spawn, at 2,600 m.
  await page.evaluate(() =>
    window.__perspectiveCamera(2550, 2150, 2600, { yawDeg: 0, pitchDeg: 55 })
  );
  await page.waitForTimeout(3000);
  await shot('home-baseline');
  await station('home-baseline');

  // Back to the board's frame, then the real launch: the session begins on
  // the frame the travel ended on, so the two home frames compare.
  await page.evaluate(() =>
    window.__perspectiveCamera(2500, 2250, 24000, { yawDeg: 0, pitchDeg: 55 })
  );
  await hide.evaluate((node) => node.remove());
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.waitForSelector('.game-host canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__perspectiveProbe?.()?.world?.sessionGround === true, null, {
    timeout: 30000,
  });
  await page.waitForTimeout(2500);
  await shot('home-joined');
  const p = await page.evaluate(() => window.__perspectiveProbe?.());
  console.log(JSON.stringify({ station: 'home-joined', calls: p?.drawCalls, triangles: p?.triangles, props: p?.props }));
};
