// #1463: the continuous-world pilot, accepted in one drive (docs/world-map.md §7).
//
// Board -> briefing -> travel -> join, then the mission played past the arch's
// fall at 10:40 with the HUD visible: escort movement, locked keys, a click
// refused outside the border, the corners, the collapse and the service lock,
// a lost signal and its reconnection, Return to port, and two more entries and
// exits. Every held view is a gate-6 station: the frame's calls and triangles,
// GPU time unqueued and queued, the props drawn and §7.5's held regions. Each
// transition is a station too, with the most calls, triangles, textures, held
// regions and requests in flight any of its frames drew: an entry from Descend
// through the travel, the join and the fade's 0.8 s ramp-in to the first
// second at full strength, and a return from Abandon to the board's frame.
//
// Run on the named GPU, unpaced, at both ratios (VIEW_DPR=1 and 1.5):
//   UNPACED=1 VIEW_DPR=1 READINGS=<dir>/readings.json node .dev-loop/drive-board-tmp.mjs \
//     --headed --channel chrome --url http://localhost:5173/ --out <dir> \
//     --steps docs/screenshots/issue-1463/world.mjs
// drive-board-tmp.mjs is not committed: it is the run-game skill's drive.mjs
// (.claude/skills/run-game/scripts/) with its title, Solo and lobby steps
// removed, so the module starts on the title screen. Copy it and delete
// those steps to reproduce the run. About 16 minutes a run: the arch
// falls at 10:40 of the match, and the mission has no faster clock.
import { writeFileSync } from 'node:fs';

const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
/** Match seconds the drive waits for after the join: 10:40 and the ground's send. */
const COLLAPSE_S = Number(process.env.COLLAPSE_S ?? 10 * 60 + 40 + 8);
/** Entries after the first, for the repeated-entry resources. */
const REPEATS = Number(process.env.REPEATS ?? 2);

export default async ({ page, shot }) => {
  const rows = [];
  const log = (row) => {
    rows.push(row);
    console.log(JSON.stringify(row));
  };
  const probe = () => page.evaluate(() => window.__perspectiveProbe?.() ?? null);

  /** The probe's gate-6 fields, plus what the page holds (repeated entry). */
  const summary = async (p) => {
    const held = await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      heapMB:
        performance.memory === undefined
          ? null
          : Math.round(performance.memory.usedJSHeapSize / 1048576),
    }));
    return {
      calls: p?.drawCalls,
      triangles: p?.triangles,
      passes: p?.passes,
      props: p?.props,
      propTris: p?.propTris,
      textures: p?.textures,
      pixelRatio: p?.pixelRatio,
      gpuTimer: p?.gpuTimer,
      focus: p?.focus,
      eye: p?.eye,
      distance: p?.distance,
      pitchDeg: p?.pitchDeg,
      world: p?.world,
      units: p?.units,
      ...held,
    };
  };

  /** A held view: 3 s unqueued, then 4 s behind the queue load (gate 6). */
  const station = async (name) => {
    await page.evaluate((label) => window.__perspectiveStation?.(label), name);
    await page.waitForTimeout(3000);
    const plain = await page.evaluate(() => window.__perspectiveStation?.('queued'));
    await page.evaluate((steps) => window.__perspectiveGpuQueue?.(steps), QUEUE_STEPS);
    await page.waitForTimeout(4000);
    const queued = await page.evaluate(() => window.__perspectiveStation?.('after'));
    await page.evaluate(() => window.__perspectiveGpuQueue?.(0));
    log({
      station: name,
      avgGpuMs: plain?.avgGpuMs,
      worstGpuMs: plain?.worstGpuMs,
      queuedGpuMs: queued?.avgGpuMs,
      queue: queued?.gpuQueue,
      avgFrameMs: plain?.avgFrameMs,
      avgConnMs: plain?.avgConnMs,
      ...(await summary(plain)),
    });
  };

  /**
   * A transition: every frame's calls and triangles sampled in the page while
   * `run` drives it, and the station's GPU time over the whole of it.
   */
  const transition = async (name, run) => {
    await page.evaluate((label) => {
      const s = {
        maxCalls: 0,
        maxTris: 0,
        frames: 0,
        maxTextures: 0,
        maxResident: 0,
        maxPending: 0,
        on: true,
        long: [],
      };
      window.__sample1463 = s;
      const t0 = performance.now();
      let last = t0;
      const tick = (now) => {
        if (!s.on) return;
        const p = window.__perspectiveProbe?.();
        if (p) {
          s.frames += 1;
          s.maxCalls = Math.max(s.maxCalls, p.drawCalls);
          s.maxTris = Math.max(s.maxTris, p.triangles);
          s.maxTextures = Math.max(s.maxTextures, p.textures);
          // §7.5's bounds bind while the camera moves: two regions, two requests.
          s.maxResident = Math.max(s.maxResident, p.world?.detailResident?.length ?? 0);
          s.maxPending = Math.max(s.maxPending, p.world?.detailPending ?? 0);
        }
        // Where in the transition a long frame lands: the camera's dolly says
        // whether it was moving, `sessionGround` whether the room had joined.
        if (now - last > 50) {
          s.long.push({
            atMs: Math.round(last - t0),
            ms: Math.round(now - last),
            distance: p?.distance,
            sessionGround: p?.world?.sessionGround,
            travelBar: document.querySelector('.travel-bar')?.textContent?.slice(0, 60) ?? null,
          });
        }
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      window.__perspectiveStation?.(label);
    }, name);
    const t0 = Date.now();
    await run();
    const ms = Date.now() - t0;
    const r = await page.evaluate(() => {
      const s = window.__sample1463;
      s.on = false;
      return { sample: s, station: window.__perspectiveStation?.('after') };
    });
    log({
      station: name,
      transition: true,
      ms,
      sampledFrames: r.sample.frames,
      maxCalls: r.sample.maxCalls,
      maxTriangles: r.sample.maxTris,
      maxTextures: r.sample.maxTextures,
      maxResident: r.sample.maxResident,
      maxPending: r.sample.maxPending,
      longFrames: r.sample.long,
      avgGpuMs: r.station?.avgGpuMs,
      worstGpuMs: r.station?.worstGpuMs,
      worstFrameMs: r.station?.worstFrameMs,
      gpuTimer: r.station?.gpuTimer,
      pixelRatio: r.station?.pixelRatio,
    });
  };

  const openBoard = async () => {
    await page.waitForSelector('.campaign-board', { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, {
      timeout: 30000,
    });
  };

  /**
   * Slot -> briefing -> Descend -> travel -> join -> the fade's ramp-in. The
   * window stays open until the session's force is drawn with the fade at full
   * strength, and a second after, so the frames that draw the overview and the
   * session together are inside it.
   */
  const enter = async (tag) => {
    await page.locator('.campaign-slot').first().click();
    await page.getByRole('region', { name: 'Briefing' }).waitFor();
    await transition(`entry${tag}`, async () => {
      await page.getByRole('button', { name: 'Descend' }).click();
      await page.waitForSelector('.travel-bar', { timeout: 10000 }).catch(() => {});
      if (tag === '') {
        await page.waitForTimeout(1200);
        await shot('travel-mid');
      }
      await page.waitForFunction(
        () => {
          const p = window.__perspectiveProbe?.();
          return p?.world?.sessionGround === true && p.units > 0 && p.world.borderStrength === 1;
        },
        null,
        { timeout: 60000 }
      );
      await page.waitForTimeout(1000);
    });
    return Date.now();
  };

  /** Esc -> Return to port -> the ramp-out and the travel back to the board. */
  const leave = async (tag) => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Return to port/ }).click();
    await transition(`return${tag}`, async () => {
      await page.getByRole('button', { name: /Abandon the water/ }).click();
      await openBoard();
      // The ramp-out (0.8 s) and the travel back (2.5 s), and a margin.
      await page.waitForTimeout(4500);
    });
  };

  const camera = (args) => page.evaluate((a) => window.__perspectiveCamera(...a), args);
  /**
   * The drawn seabed across the arch's span (y 2,000-2,250, the whole width)
   * and in the service lock (x 1,750-2,250): the fall reads as a number, since
   * a frame of the court at 1,500 m is too dark to show it by eye.
   */
  const arch = async (when) =>
    log({
      arch: when,
      spanM: await page.evaluate(() =>
        [500, 1250, 2750, 4500].map((x) => Math.round(window.__perspectiveSeabedM?.(x, 2125) ?? NaN))
      ),
      lockM: await page.evaluate(() => Math.round(window.__perspectiveSeabedM?.(2000, 2125) ?? NaN)),
    });

  // ---- The board and the briefing (§7.6 step 1) ------------------------------
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await openBoard();
  await page.waitForTimeout(8000);
  await shot('board');
  await station('board');
  // The world behind the board's glass, the glass hidden for one frame.
  const glass = await page.addStyleTag({ content: '.menu-screen { visibility: hidden !important; }' });
  await page.waitForTimeout(500);
  await shot('board-world');
  await glass.evaluate((node) => node.remove());
  log({ resources: 'board-first', ...(await summary(await probe())) });

  // ---- Travel and join (§7.6 steps 2-3) --------------------------------------
  const joinedAt = await enter('');
  await page.waitForTimeout(2500);
  await shot('arrival');
  await station('arrival');
  await arch('standing');

  // ---- Escort movement --------------------------------------------------------
  // Top-down over the flight, box-select it, and order it a little north.
  const centre = (await probe()).ownCentre;
  await camera([centre.x, centre.z, 2600, { yawDeg: 0, pitchDeg: 88, focusDepthM: null }]);
  await page.waitForTimeout(1500);
  const units = await page.evaluate(() => window.__perspectiveLamps().units.filter((u) => u.screen));
  const xs = units.flatMap((u) => [u.screen.x0, u.screen.x1]);
  const ys = units.flatMap((u) => [u.screen.y0, u.screen.y1]);
  const pad = 40;
  await page.mouse.move(Math.min(...xs) - pad, Math.min(...ys) - pad);
  await page.mouse.down();
  await page.mouse.move(Math.max(...xs) + pad, Math.max(...ys) + pad, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const view = page.viewportSize();
  await page.mouse.click(view.width / 2, view.height / 2 - 120, { button: 'right' });
  await page.waitForTimeout(2500);
  await shot('escorts-moving');
  await station('escorts-moving');

  // ---- Locked keys: ping and noisemaker are locked at the arch (§9) ----------
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(400);
  await shot('locked-ping');
  await page.keyboard.press('KeyN');
  await page.waitForTimeout(400);
  await shot('locked-noisemaker');

  // ---- The border: the close, low and survey views, a refused click, corners --
  await camera([centre.x, centre.z, 1800, { yawDeg: 0, pitchDeg: 55, focusDepthM: null }]);
  await page.waitForTimeout(1500);
  await shot('close');
  await station('close');
  await camera([centre.x, centre.z, 3500, { yawDeg: 0, pitchDeg: 12, focusDepthM: null }]);
  await page.waitForTimeout(1500);
  await shot('low');
  await station('low');
  await camera([2500, 2000, 16000, { yawDeg: 0, pitchDeg: 88, focusDepthM: null }]);
  await page.waitForTimeout(2000);
  await shot('survey');
  await station('survey');
  // A right click on the exterior, about 5 km west of the map's middle and
  // 3 km past its edge in the survey frame, with the flight still selected:
  // refused on the client (§7.4 rule 3).
  // The pick is dropped before it is an order, so nothing is said: the proof
  // is that no route is drawn and the flight stays where it was.
  const flight = () =>
    page.evaluate(() =>
      window.__perspectiveLamps().units.map((u) => [u.id, Math.round(u.xM), Math.round(u.zM)])
    );
  const before = await flight();
  await page.mouse.click(250, view.height / 2, { button: 'right' });
  await page.waitForTimeout(400);
  await shot('refused-outside');
  await page.waitForTimeout(3000);
  log({ refusedOutside: { before, after: await flight() } });
  // The focus asked for past each corner, and where the clamp held it (§7.4 rule 1).
  for (const [name, x, z, yawDeg, pitchDeg] of [
    ['corner-se', 9000, 9000, 45, 35],
    ['corner-nw', -4000, -4000, 225, 20],
  ]) {
    await camera([x, z, 4200, { yawDeg, pitchDeg, focusDepthM: null }]);
    await page.waitForTimeout(2000);
    await shot(name);
    await station(name);
  }

  // ---- The arch falls at 10:40 (§9), and the service lock stays --------------
  const wait = joinedAt + COLLAPSE_S * 1000 - Date.now();
  log({ waitingForCollapseS: Math.round(wait / 1000) });
  if (wait > 0) await page.waitForTimeout(wait);
  await camera([2000, 2125, 2800, { yawDeg: 0, pitchDeg: 50, focusDepthM: null }]);
  await page.waitForTimeout(2500);
  await shot('collapse');
  await station('collapse');
  await arch('fallen');

  // ---- A lost signal after the fall: the world kept, the ground re-sent ------
  // The browser's offline event is what the Colyseus client drops a room on.
  await page.context().setOffline(true);
  await page.waitForTimeout(3000);
  await shot('signal-lost');
  log({ resources: 'signal-lost', ...(await summary(await probe())) });
  await page.context().setOffline(false);
  await page.waitForSelector('.game-overlay', { state: 'detached', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await camera([2000, 2125, 2800, { yawDeg: 0, pitchDeg: 50, focusDepthM: null }]);
  await page.waitForTimeout(2000);
  await shot('reconnected');
  await station('reconnected');
  await arch('after-reconnect');

  // ---- Return to port (§7.6 step 4) ------------------------------------------
  await leave('');
  await shot('board-returned');
  await station('board-returned');
  log({ resources: 'board-after-1', ...(await summary(await probe())) });

  // ---- Repeated entry and exit ------------------------------------------------
  for (let i = 2; i <= REPEATS + 1; i += 1) {
    await enter(`-${i}`);
    await page.waitForTimeout(4000);
    log({ resources: `joined-${i}`, ...(await summary(await probe())) });
    await leave(`-${i}`);
    log({ resources: `board-after-${i}`, ...(await summary(await probe())) });
  }
  await shot('board-final');

  const out = process.env.READINGS;
  if (out) writeFileSync(out, JSON.stringify(rows, null, 2) + '\n');
};
