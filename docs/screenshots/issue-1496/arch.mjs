// #1496: the arch's fall and a lost signal after it, read as drawn seabed.
// Trimmed from docs/screenshots/issue-1463/world.mjs: board -> Descend -> join,
// wait for 10:40, read, drop the signal, reconnect, read again.
import { writeFileSync } from 'node:fs';

const COLLAPSE_S = Number(process.env.COLLAPSE_S ?? 10 * 60 + 40 + 8);

export default async ({ page, shot }) => {
  const rows = [];
  const log = (row) => {
    rows.push(row);
    console.log(JSON.stringify(row));
  };
  const camera = (args) => page.evaluate((a) => window.__perspectiveCamera(...a), args);
  const read = async (when) => {
    const r = await page.evaluate(() => {
      const at = (x, y) => Math.round(window.__perspectiveSeabedM?.(x, y) ?? NaN);
      const grid = [];
      for (let y = 250; y < 5000; y += 500) for (let x = 250; x < 5000; x += 500) grid.push([x, y, at(x, y)]);
      return {
        spanM: [500, 1250, 2750, 4500].map((x) => at(x, 2125)),
        lockM: at(2000, 2125),
        grid,
      };
    });
    log({ when, ...r });
    return r;
  };

  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await page.waitForSelector('.campaign-board', { timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.locator('.campaign-slot').first().click();
  await page.getByRole('region', { name: 'Briefing' }).waitFor();
  await page.getByRole('button', { name: 'Descend' }).click();
  await page.waitForFunction(
    () => {
      const p = window.__perspectiveProbe?.();
      return p?.world?.sessionGround === true && p.units > 0 && p.world.borderStrength === 1;
    },
    null,
    { timeout: 90000 }
  );
  const joinedAt = Date.now();
  await page.waitForTimeout(1500);
  const standing = await read('standing');

  const wait = joinedAt + COLLAPSE_S * 1000 - Date.now();
  log({ waitingForCollapseS: Math.round(wait / 1000) });
  if (wait > 0) await page.waitForTimeout(wait);
  await camera([2000, 2125, 2800, { yawDeg: 0, pitchDeg: 50, focusDepthM: null }]);
  await page.waitForTimeout(2500);
  await shot('fallen');
  const fallen = await read('fallen');

  await page.context().setOffline(true);
  await page.waitForTimeout(3000);
  await shot('signal-lost');
  await page.context().setOffline(false);
  await page.waitForSelector('.game-overlay', { state: 'detached', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await camera([2000, 2125, 2800, { yawDeg: 0, pitchDeg: 50, focusDepthM: null }]);
  await page.waitForTimeout(2000);
  await shot('reconnected');
  const back = await read('after-reconnect');

  const moved = (a, b) =>
    a.grid.filter(([, , m], i) => Number.isFinite(m) && m !== b.grid[i][2]).map(([x, y, m], i) => [x, y, m, b.grid[i][2]]);
  log({
    summary: {
      standingToFallen: moved(standing, fallen).length,
      fallenToReconnected: moved(fallen, back),
      gridPoints: back.grid.filter(([, , m]) => Number.isFinite(m)).length,
    },
  });
  if (process.env.READINGS) writeFileSync(process.env.READINGS, JSON.stringify(rows, null, 2));
};
