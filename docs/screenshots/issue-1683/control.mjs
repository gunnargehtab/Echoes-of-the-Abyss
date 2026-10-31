/**
 * #1683's non-target control of docs/sorrowgate-arch-study.md §9, as a
 * run-game `--steps` module, at the refined arch: what #1637 read before the
 * refinement (its README, "The non-target control").
 *
 * MODE=control reads the standard `ventfront-divide` match at the home
 * station at AT seconds of the mission clock, with the study requested or not:
 *
 *   TAG=v-on VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
 *     --url 'http://localhost:5173/?map=ventfront-divide&arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1683/control.mjs
 *
 * MODE=return enters the tutorial with the study on (`--entry tutorial`, the
 * flag on the title URL), reads it once the six hull models stand, leaves
 * through the Esc menu's "Return to port", takes the standard solo path to
 * `ventfront-divide` in the same page, and reads that match: nothing of the
 * study may be in use after the return.
 *
 * `<TAG>.json` holds each reading's probe counts; each has a frame beside it.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TICK_HZ = 60;
const MODE = process.env.MODE ?? 'control';
const AT = Number(process.env.AT ?? 60);
const TAG = process.env.TAG ?? MODE;
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

const counts = (page) =>
  page.evaluate(() => {
    const p = window.__perspectiveProbe();
    return {
      tick: window.__echoClock(),
      look: p.look,
      landmarks: p.landmarks,
      landmarkTris: p.landmarkTris,
      siftMotes: p.siftMotes,
      cloudMotes: p.cloudMotes,
      props: p.props,
      propTris: p.propTris,
      drawCalls: p.drawCalls,
      triangles: p.triangles,
      textures: p.textures,
      focus: p.focus,
      distance: p.distance,
    };
  });

export default async ({ page, shot }) => {
  const readings = [];
  const read = async (name) => {
    const file = await shot(`${TAG}-${name}`);
    const c = await counts(page);
    readings.push({ name, file, url: page.url(), ...c });
    console.log(
      `${TAG} ${name}: tick ${c.tick}, look ${c.look}, landmarks ${c.landmarks} (${c.landmarkTris}), sift ${c.siftMotes}, cloud ${c.cloudMotes}, props ${c.props} (${c.propTris}), calls ${c.drawCalls}, triangles ${c.triangles}, textures ${c.textures}`
    );
  };

  if (MODE === 'control') {
    await page.waitForFunction(() => window.__perspectiveProbe?.().active === true, null, {
      timeout: 120000,
    });
    const tick = Math.round(AT * TICK_HZ);
    await page.waitForFunction((t) => window.__echoClock() >= t, tick, { timeout: 5 * 60 * 1000 });
    await read('home');
  } else if (MODE === 'return') {
    await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked === 6, null, {
      timeout: 120000,
    });
    await page.waitForTimeout(3000);
    await read('tutorial');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Return to port' }).click();
    await page.getByRole('button', { name: 'Solo game' }).click();
    await page.waitForSelector('.menu-commit', { timeout: 10000 });
    await page.click('.menu-commit');
    await page.waitForSelector('.game-overlay', { state: 'detached', timeout: 45000 });
    const ready = await page.waitForSelector('.lobby-ready', { timeout: 15000 }).catch(() => null);
    if (ready !== null) await ready.click();
    await page.waitForFunction(
      () => window.__perspectiveProbe?.().active === true && window.__echoClock() > 0,
      null,
      { timeout: 60000 }
    );
    await page.waitForTimeout(6000);
    await read('solo');
    const solo = readings[readings.length - 1];
    assert.equal(solo.look, 'standard', 'the solo match after the return takes the standard look');
  } else {
    throw new Error(`MODE ${MODE}: control or return`);
  }
  writeFileSync(join(OUT, `${TAG}.json`), `${JSON.stringify({ tag: TAG, mode: MODE, readings }, null, 2)}\n`);
};
