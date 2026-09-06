/**
 * The gate-6 review drive, as a `--steps` module (#286).
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --out /tmp/stations \
 *     --steps .claude/skills/run-game/scripts/stations.mjs
 *
 * Every conn-view frame-time number in the Phase 1/2/5 records measures
 * SwiftShader in a container, which is the software rasteriser and not the
 * scene. The numbers gate 6 actually wants come from a machine with a real GPU
 * and from an Android device under Termux, and they are read **per station**:
 * the shipped frame is composited from two painters, and the remedies gate 6
 * might reach for act on one of them.
 *
 * So this script does not decide anything. It stands the client in each of the
 * five stations the issue names, holds still long enough for the probe's
 * average to mean something, and prints a table ready to paste into
 * docs/graphics-standards.md and docs/three-layer-ocean.md.
 *
 * Dwell defaults to six seconds — 240 frames at 60 fps is four, and the
 * average's window is 240 — and `STATION_SECONDS` raises it, which the Termux
 * floor needs: at 20 fps a windowful is twelve seconds, and a station that
 * ends early reports an average over fewer frames than it looks like. The
 * table prints `frames` and `avg over` side by side so that is visible rather
 * than assumed.
 *
 * On a device where Playwright will not run — which includes most Termux
 * setups — drive the same five stations by hand in the browser and read the
 * same two calls from the console:
 *
 *   window.__perspectiveStation('marquee');   // begin, zeroing the counters
 *   // ... hold the station ...
 *   window.__perspectiveProbe();              // read it
 */

const DWELL_MS = Number(process.env.STATION_SECONDS ?? 6) * 1000;

/** Where the friendly cluster sits on drive.mjs's 1440×900 viewport. */
const CENTRE = { x: 720, y: 450 };

const rows = [];

/**
 * Hold one station and record it.
 *
 * `__perspectiveStation(label)` is the boundary: it zeroes the three frame
 * series and hands back the station it just closed. Reading happens after the
 * dwell, through `__perspectiveProbe()`, so nothing in `setUp` — the drag, the
 * wheel, the keypress — is charged to the station it was setting up.
 */
async function station(page, label, note, setUp) {
  if (setUp !== undefined) await setUp();
  await page.evaluate((name) => window.__perspectiveStation(name), label);
  await page.waitForTimeout(DWELL_MS);
  const probe = await page.evaluate(() => window.__perspectiveProbe());
  rows.push({ label, note, probe });
  return probe;
}

/**
 * Drag a box over the base and take everything in it.
 *
 * The travel is stepped because a left drag is only a marquee past a pointer
 * travel threshold; a single jump from corner to corner arrives as a click and
 * selects one hull.
 */
async function marquee(page) {
  await page.mouse.move(CENTRE.x - 260, CENTRE.y - 190);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(CENTRE.x - 260 + i * 65, CENTRE.y - 190 + i * 48);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
}

export default async ({ page, shot }) => {
  const exposed = await page.evaluate(() => typeof window.__perspectiveStation === 'function');
  if (!exposed) {
    throw new Error(
      '__perspectiveStation is missing: this client predates the per-station probe (#286), ' +
        'so its avg/worst are since-page-load and cannot be read per station.'
    );
  }

  // 1. The base opening. The view the player gets for free, and the floor
  //    every other station is read against.
  await station(page, 'base', 'the opening view, own base centred');
  await shot('station-base');

  // 2. A marquee selection with detection rings up. Selecting the fleet puts a
  //    signature ring on every hull and blocked ground under them, all of it
  //    sampled vertex by vertex onto the terrain.
  await station(page, 'marquee', 'fleet selected, signature rings conforming', () => marquee(page));
  await shot('station-marquee');

  // 3. The ping preview. The worst case for projected polylines: Alt adds the
  //    900 m reveal and the 2,400 m self-reveal to every selected hull, so the
  //    ring count roughly triples while the key is down.
  await station(page, 'ping-preview', 'Alt held: two extra rings per selected hull', async () => {
    await page.keyboard.down('Alt');
    await page.waitForTimeout(400);
  });
  await shot('station-ping-preview');
  await page.keyboard.up('Alt');

  // 4. The survey zoom. Fewer pixels per metre and more world on screen: the
  //    station where CIRCLE_SEGMENTS is being spent on rings a few pixels
  //    across, which is the second remedy on gate 6's list.
  await station(page, 'survey-zoom', 'dollied out, whole theatre on screen', async () => {
    await page.mouse.move(CENTRE.x, CENTRE.y);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(600);
  });
  await shot('station-survey-zoom');

  // 5. A fight. Everything above is a still scene, and a still scene is the
  //    overlay's cheap case: the layer stamps hold the force ink until
  //    something changes. Ordnance in the water, gliding hulls and live
  //    contacts put it back on the frame cadence, which is the case the
  //    budget has to survive.
  await station(page, 'fight', 'own ordnance in the water, freshly pinged', async () => {
    // Back to a working distance first — a ping fired from survey zoom lights
    // up contacts too small to draw much.
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(80);
    }
    await marquee(page);
    // A noisemaker and a mine, which is what actually puts own ordnance in the
    // water: instanced bodies and lamps below, and marks above that pulse and
    // so hold the force layer on the frame cadence for as long as they are
    // there. Both deploy at the hull and need no target, unlike the torpedo —
    // a station that depends on hitting a contact under the cursor is one that
    // quietly stages nothing on the run where the aim misses.
    await page.keyboard.press('KeyN');
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(300);
    await page.mouse.click(CENTRE.x + 210, CENTRE.y - 150, { button: 'right' });
    await page.waitForTimeout(400);
    // The ping goes last, so the station opens on the freshest contacts it
    // will ever have: a return decays, and a long dwell outlives it. The
    // ordnance above is what keeps this the frame-cadence case after they go.
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(600);
  });
  await shot('station-fight');

  const cell = (value) => String(value).padStart(9);
  console.log('');
  console.log(`gate-6 review drive — ${DWELL_MS / 1000}s per station`);
  console.log(
    '| station | frames | avg over | fps | frame avg/worst ms | conn avg/worst | overlay avg/worst | calls | tris | ordnance |'
  );
  console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const { label, probe: p } of rows) {
    console.log(
      `| ${label} | ${p.stationFrames} | ${p.avgFrames} | ${p.fps} | ` +
        `${p.avgFrameMs} / ${p.worstFrameMs} | ${p.avgConnMs} / ${p.worstConnMs} | ` +
        `${p.avgOverlayMs} / ${p.worstOverlayMs} | ${p.drawCalls} | ${p.triangles} | ${p.ordnance} |`
    );
  }
  console.log('');
  for (const { label, note, probe: p } of rows) {
    console.log(`${label.padEnd(13)} ${cell(p.avgFrameMs)} ms avg — ${note}`);
    if (p.overlayFrames === 0) {
      console.log(`${''.padEnd(13)} WARNING: the overlay reported no frames at this station.`);
    }
    if (label === 'fight' && p.ordnance === 0) {
      console.log(
        `${''.padEnd(13)} WARNING: no own ordnance in the water — this station staged a ` +
          'still scene and is not the frame-cadence case it is here to measure.'
      );
    }
    if (p.avgFrames < p.stationFrames) {
      console.log(
        `${''.padEnd(13)} note: the station outran the average's window ` +
          `(${p.avgFrames} of ${p.stationFrames} frames); the average is its tail.`
      );
    } else if (p.stationFrames < 60) {
      console.log(
        `${''.padEnd(13)} note: only ${p.stationFrames} frames — raise STATION_SECONDS ` +
          'before quoting this average.'
      );
    }
  }
  console.log('');
  console.log(JSON.stringify(rows, null, 2));
};
