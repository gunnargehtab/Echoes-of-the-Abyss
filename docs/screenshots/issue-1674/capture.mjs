/**
 * #1674's captures of the arch study's §9 stations, as a run-game `--steps`
 * module: stations at matched mission times, each in a fresh tutorial session.
 *
 *   VIEW_W=1920 VIEW_H=1080 SHOTS=C@30 TAG=d-C-on \
 *     node .claude/skills/run-game/scripts/drive.mjs --entry tutorial \
 *     --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1674/capture.mjs
 *
 * SHOTS lists `<station>@<mission seconds>`, comma-separated, taken in order
 * (`H@635,H@655` is the transit pair). The station is posed once the six hull
 * models stand, well before its time. The server clock is never stopped or
 * accelerated (docs/sorrowgate-arch-study.md §9), so a session that reaches a
 * time before it is posed fails rather than shooting late. H is the unmodified
 * opening camera; an H past the first minute re-applies the pose the session
 * opened on, and the reading records where the ground's focus clamp put it.
 *
 * The frame is a CDP capture, not Playwright's `page.screenshot`: on the
 * container's SwiftShader a 1920 × 1080 frame takes about 1.8 s to draw, the
 * Playwright call spent 11 s waiting on frames, and the CDP one about 3 s. Its
 * image is a frame drawn about when the call lands: a call at the time drew
 * that second on the HUD clock in the first session for 16 of #1674's 18
 * frames, and the other two (one a second late, one a second early) were
 * retaken. LEAD_S moves the call, and the JSON records it. The HUD's own clock
 * in the image is the frame's time; `captureTicks`, the wall clock at the call
 * and a tick read after it, only approximates it.
 *
 * The readings: a hook armed before the call reads the conn canvas and the
 * probe in one animation frame, the first whose tick is at or past the time,
 * after the game's own callback drew it (tools/render-stack/halo.mjs's
 * method), and records that tick (`readingTick`). Two sessions' readings can
 * so differ by up to a frame; §9 pairs C and L "at the same tick", and #1674
 * L and S, so a half whose `readingTick` differs is retaken until they match.
 *
 * Writes `<TAG>.json` beside the frames: the ticks, LEAD_S, the requested and
 * actual pose, the probe, and the conn canvas's near-black share (luma under
 * 10 %), brightest pixel and a 28 px window round each lamp the probe projects.
 *
 * With the study on, the same frame also carries #1683's readings
 * (docs/sorrowgate-arch-study.md §11, "Acceptance at the opening"): each of
 * §11's model-space points projected through the frame's camera and read as a
 * square, 8 px at L and 16 px elsewhere, and each material's pixels outside
 * the pools, read through the view's per-material mask (archMask.ts). SPAN_Z
 * moves the span face's point with the face (§11: Z +72 before the
 * refinement). `<file>-windows.png` is the frame with each square drawn where
 * it fell. The masks are read with the study off too, for the escorts; the
 * capitals' faces, a luma profile down each pier, the veil's shade on the arch
 * and the study's switches are #1683's second round.
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TICK_HZ = 60;
const LEAD_S = Number(process.env.LEAD_S ?? 0);
const STATIONS = {
  C: [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }],
  L: [2550, 2750, 650, { pitchDeg: 12, yawDeg: 0, focusDepthM: 1450 }],
  S: [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }],
};
const LAMP_WINDOW = 28;
const SPAN_Z = Number(process.env.SPAN_Z ?? 72);
/** §11's windows, model metres: where each falls is the frame's camera's business. */
const ARCH_POINTS = {
  pierW: [-235, 100, 76],
  pierE: [235, 100, 76],
  floorW: [-235, 12, 130],
  floorE: [235, 12, 130],
  opening: [0, 0, 0],
  span: [0, 136, SPAN_Z],
  wall: [0, 60, -375],
  // #1683's capitals: a window centred on each south face. At H it takes
  // in the lit top too, so "H, capitals" is read on FACES' rows instead.
  capW: [-235, 105, 75],
  capE: [235, 105, 75],
};
const FACES = {
  // #1683's faces: the rows between each face's top and bottom edges
  // projected through the frame's camera, so a capital's reading leaves out
  // its lit top (round 2's finding). A face set behind the one above it is
  // partly hidden, and those rows are the nearer face's. Model metres.
  capW: [
    [-235, 110, 75],
    [-235, 100, 75],
  ],
  capE: [
    [235, 110, 75],
    [235, 100, 75],
  ],
  // Drum 2 stands 10 m behind the capital: from H its top edge projects
  // above the capital's, so its upper rows are the capital's own and its
  // reading is not drum 2's alone (#1683, round 3).
  drum2W: [
    [-235, 100, 65],
    [-235, 80, 65],
  ],
  drum2E: [
    [235, 100, 65],
    [235, 80, 65],
  ],
  drum1W: [
    [-235, 80, 70.5],
    [-235, 45, 70.5],
  ],
  drum1E: [
    [235, 80, 70.5],
    [235, 45, 70.5],
  ],
  drum0W: [
    [-235, 45, 76],
    [-235, 12, 76],
  ],
  drum0E: [
    [235, 45, 76],
    [235, 12, 76],
  ],
};
/** #1683's band columns: five a pier, every 20 m across it, from the capital top's north edge to the plinth's foot (round 4). */
const BAND_COLUMNS = Object.fromEntries(
  [195, 215, 235, 255, 275].flatMap((x) => [
    [
      `west${x}`,
      [
        [-x, 113, -75],
        [-x, 0, 80],
      ],
    ],
    [
      `east${x}`,
      [
        [x, 113, -75],
        [x, 0, 80],
      ],
    ],
  ])
);
/**
 * #1683's profiles: a column down each pier, from the capital top's north edge
 * to the plinth's front foot, 5 px wide and one mean luma a row, so §11's
 * "separate lit bands at least 2 px tall" is read row by row.
 */
const PIER_COLUMNS = {
  west: [
    [-235, 110, -75],
    [-235, 0, 80],
  ],
  east: [
    [235, 110, -75],
    [235, 0, 80],
  ],
};
/** The mask's codes (archMask.ts `MASK_CODE`). */
const MASK_CODES = {
  stone_dark: 1,
  structure_rib: 2,
  silt_drift: 3,
  civic_lamp: 4,
  laminate: 5,
  hullLamp: 6,
};

const shots = (process.env.SHOTS ?? 'H@30').split(',').map((s) => {
  const [name, at] = s.split('@');
  return { name, seconds: Number(at) };
});
const TAG = process.env.TAG ?? 'capture';
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

/**
 * Luma statistics over a rectangle of a bottom-up RGBA buffer, in top-down
 * coordinates. Self-contained, because its source runs in the page.
 */
function stats(px, w, h, x0 = 0, y0 = 0, x1 = w, y1 = h) {
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let max = -1;
  let at = null;
  let sum = 0;
  let under = 0;
  let n = 0;
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    const row = (h - 1 - y) * w;
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const i = (row + x) * 4;
      const l = luma(px[i], px[i + 1], px[i + 2]);
      sum += l;
      n++;
      if (l < 25.5) under++;
      if (l > max) {
        max = l;
        at = { x, y, rgb: [px[i], px[i + 1], px[i + 2]] };
      }
    }
  }
  if (n === 0) return null;
  return {
    maxLuma: Number(max.toFixed(1)),
    brightest: at,
    meanLuma: Number((sum / n).toFixed(2)),
    under10: Number((under / n).toFixed(4)),
    pixels: n,
  };
}

// The bands, off the mask's blue channel (archMask.ts `MASK_BAND`): down a
// 16 px column, each row's most common band tag and the
// mean luma of those pixels, then consecutive rows with one tag as a run.
function bandRuns(mask, px, w, h, ends) {
  const ats = window.__archStudyPoints?.(ends) ?? null;
  if (ats === null) return null;
  const x = Math.round(((ats[0].x + ats[1].x) / 2) * devicePixelRatio);
  const y0 = Math.round(Math.min(ats[0].y, ats[1].y) * devicePixelRatio);
  const y1 = Math.round(Math.max(ats[0].y, ats[1].y) * devicePixelRatio);
  const L = (i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
  const runs = [];
  for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
    const tally = new Map();
    for (let xx = Math.max(0, x - 8); xx < Math.min(w, x + 8); xx++) {
      const i = ((h - 1 - y) * w + xx) * 4;
      const code = mask.pixels[i + 2];
      if (code === 0) continue;
      const t = tally.get(code) ?? { n: 0, sum: 0 };
      t.n++;
      t.sum += L(i);
      tally.set(code, t);
    }
    let code = 0;
    let best = { n: 0, sum: 0 };
    for (const [c, t] of tally) if (t.n > best.n) [code, best] = [c, t];
    const last = runs[runs.length - 1];
    if (last !== undefined && last.code === code) {
      last.rows++;
      last.sum += best.sum;
      last.n += best.n;
    } else runs.push({ code, top: y, rows: 1, sum: best.sum, n: best.n });
  }
  return {
    x,
    runs: runs.map(({ code, top, rows, sum, n }) => ({
      code,
      top,
      rows,
      meanLuma: n === 0 ? null : Number((sum / n).toFixed(2)),
    })),
  };
}

/**
 * Arm the reading: from the next animation frame on, the first frame whose
 * tick reaches `tick` reads the conn canvas and the probe and leaves both on
 * `window.__captureReading`. Arming waits on the frame in hand, so it is done
 * well before the capture call, never just ahead of it.
 */
const armReading = (page, tick, archSide) =>
  page.evaluate(
    ({
      tick,
      window: side,
      statsSrc,
      bandSrc,
      archSide,
      archPoints,
      maskCodes,
      pierColumns,
      faces,
      bandColumns,
    }) => {
      const stats = new Function(`return ${statsSrc}`)();
      const bandRuns = new Function(`return ${bandSrc}`)();
      const faceRows = (ends, read) => {
        const ats = window.__archStudyPoints?.(ends) ?? null;
        if (ats === null) return null;
        const x = Math.round(((ats[0].x + ats[1].x) / 2) * devicePixelRatio);
        const top = Math.round(Math.min(ats[0].y, ats[1].y) * devicePixelRatio);
        const bottom = Math.round(Math.max(ats[0].y, ats[1].y) * devicePixelRatio);
        // The rows strictly between the edges, so neither edge's neighbour counts.
        const rows = [];
        for (let y = top + 1; y < bottom; y++) rows.push(read(x - 8, y, x + 8, y + 1));
        const valid = rows.filter((v) => v !== null);
        const mean = valid.length === 0 ? null : valid.reduce((a, b) => a + b, 0) / valid.length;
        return {
          x,
          top,
          bottom,
          rows: rows.map((v) => (v === null ? null : Number(v.toFixed(1)))),
          meanLuma: mean === null ? null : Number(mean.toFixed(2)),
        };
      };
      window.__captureReading = null;
      const frame = () => {
        if (window.__echoClock() < tick) {
          requestAnimationFrame(frame);
          return;
        }
        const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const probe = window.__perspectiveProbe();
        const windows = {};
        (probe.landmarkLampsPx ?? []).forEach(({ x, y }, i) => {
          const cx = Math.round(x * devicePixelRatio);
          const cy = Math.round(y * devicePixelRatio);
          const r = side / 2;
          windows[`lamp_${i}`] = stats(px, w, h, cx - r, cy - r, cx + r, cy + r);
        });
        // §11's windows and masks, read off the same frame (#1683).
        let arch = null;
        const names = Object.keys(archPoints);
        const projected = window.__archStudyPoints?.(names.map((n) => archPoints[n])) ?? null;
        // The masks are read with the study off as well, where no landmark
        // stands, so the escorts' laminate and lamps compare between halves.
        if (window.__archStudyMask !== undefined) {
          const archWindows = {};
          const profiles = {};
          (projected ?? []).forEach((at, i) => {
            const cx = Math.round(at.x * devicePixelRatio);
            const cy = Math.round(at.y * devicePixelRatio);
            const r = archSide / 2;
            const box = [cx - r, cy - r, cx + r, cy + r];
            archWindows[names[i]] = {
              box,
              pxPerM: Number(at.pxPerM.toFixed(3)),
              visible: at.visible,
              ...stats(px, w, h, ...box),
            };
          });
          for (const [pier, ends] of Object.entries(pierColumns)) {
            const ats = window.__archStudyPoints?.(ends) ?? null;
            if (ats === null) continue;
            const x = Math.round(((ats[0].x + ats[1].x) / 2) * devicePixelRatio);
            const y0 = Math.round(Math.min(ats[0].y, ats[1].y) * devicePixelRatio);
            const y1 = Math.round(Math.max(ats[0].y, ats[1].y) * devicePixelRatio);
            const rows = [];
            for (let y = y0; y <= y1; y++)
              rows.push(stats(px, w, h, x - 2, y, x + 3, y + 1)?.meanLuma);
            profiles[pier] = { x, y0, rows };
          }
          const faceReadings = {};
          for (const [face, ends] of Object.entries(faces)) {
            faceReadings[face] = faceRows(
              ends,
              (...box) => stats(px, w, h, ...box)?.meanLuma ?? null
            );
          }
          const mask = window.__archStudyMask();
          const masks = {};
          if (mask !== null && mask.width === w && mask.height === h) {
            const luma = (i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            for (const [name, code] of Object.entries(maskCodes)) {
              let n = 0;
              let inPools = 0;
              let sum = 0;
              let under = 0;
              let max = -1;
              for (let i = 0; i < w * h * 4; i += 4) {
                if (mask.pixels[i] !== code) continue;
                if (mask.pixels[i + 1] !== 0) {
                  inPools++;
                  continue;
                }
                const l = luma(i);
                n++;
                sum += l;
                if (l < 25.5) under++;
                if (l > max) max = l;
              }
              masks[name] = {
                pixels: n,
                inPools,
                meanLuma: n === 0 ? null : Number((sum / n).toFixed(2)),
                maxLuma: n === 0 ? null : Number(max.toFixed(1)),
                under10: n === 0 ? null : Number((under / n).toFixed(4)),
              };
            }
          }
          arch = {
            side: archSide,
            windows: archWindows,
            masks,
            profiles,
            faces: faceReadings,
            bands:
              mask === null
                ? null
                : Object.fromEntries(
                    Object.entries(bandColumns).map(([pier, ends]) => [
                      pier,
                      bandRuns(mask, px, w, h, ends),
                    ])
                  ),
            shade: window.__archStudyShade?.() ?? null,
            switches: window.__archStudy?.({}) ?? null,
          };
        }
        window.__captureReading = {
          tick: window.__echoClock(),
          conn: { buffer: [w, h], frame: stats(px, w, h), windows },
          arch,
          probe,
        };
      };
      requestAnimationFrame(frame);
    },
    {
      tick,
      window: LAMP_WINDOW,
      statsSrc: String(stats),
      archSide,
      archPoints: ARCH_POINTS,
      maskCodes: MASK_CODES,
      pierColumns: PIER_COLUMNS,
      faces: FACES,
      bandColumns: BAND_COLUMNS,
      bandSrc: String(bandRuns),
    }
  );

/**
 * The frame with §11's squares drawn where they fell, so a reader sees what
 * each window read: drawn in the page on a copy of the PNG, never on the frame.
 */
const drawWindows = async (page, png, windows) => {
  const data = await page.evaluate(
    async ({ png, windows }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const g = canvas.getContext('2d');
      g.drawImage(img, 0, 0);
      g.lineWidth = 1;
      g.font = '12px monospace';
      for (const [name, { box }] of Object.entries(windows)) {
        const [x0, y0, x1, y1] = box;
        g.strokeStyle = '#ff00ff';
        g.strokeRect(x0 - 0.5, y0 - 0.5, x1 - x0 + 1, y1 - y0 + 1);
        g.fillStyle = '#ff00ff';
        g.fillText(name, x1 + 3, y0 + 10);
      }
      return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },
    { png, windows }
  );
  return Buffer.from(data, 'base64');
};

const clock = (page) => page.evaluate(() => window.__echoClock());

const pose = (p) => ({
  focus: p.focus,
  distance: p.distance,
  pitchDeg: p.pitchDeg,
  yawDeg: p.yawDeg,
});

export default async ({ page }) => {
  // One page call does the setup: each call waits on the frame in hand, a
  // second or more here, and the first station is due 30 s in. It waits for
  // the six models, records the opening, and poses the first station.
  const first = shots[0].name === 'H' ? null : STATIONS[shots[0].name];
  const opened = await page.evaluate(async (firstPose) => {
    for (;;) {
      const p = window.__perspectiveProbe?.();
      if (p && p.modelBacked === 6 && typeof window.__echoClock === 'function') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const opening = window.__perspectiveProbe();
    const tick = window.__echoClock();
    if (firstPose !== null) window.__perspectiveCamera(...firstPose);
    let renderer = 'unavailable';
    const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return {
      opening,
      env: {
        url: location.href,
        viewport: [innerWidth, innerHeight],
        dpr: devicePixelRatio,
        settings: localStorage.getItem('echoes.settings'),
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        renderer,
        modelsTick: tick,
      },
      wall: Date.now(),
    };
  }, first);
  // The wall time the mission clock read zero. The page shares the machine's
  // clock, so its own reading beside the tick is exact, within the 5 Hz snapshot.
  const zero = opened.wall - (opened.env.modelsTick / TICK_HZ) * 1000;
  const { env } = opened;
  const openingPose = pose(opened.opening);
  console.log(`six models at tick ${env.modelsTick}`);
  const cdp = await page.context().newCDPSession(page);

  const readings = [];
  for (const { name, seconds } of shots) {
    const tick = Math.round(seconds * TICK_HZ);
    // An H past the opening minute is H's pose re-applied, as §9's T asks.
    const reposed = name !== 'H' || seconds > 60;
    const requested =
      name === 'H'
        ? [
            openingPose.focus.xM,
            openingPose.focus.zM,
            openingPose.distance,
            {
              pitchDeg: openingPose.pitchDeg,
              yawDeg: openingPose.yawDeg,
              focusDepthM: openingPose.focus.depthM,
            },
          ]
        : STATIONS[name];
    // The setup call already posed a first station other than H.
    if (reposed && (name === 'H' || readings.length > 0)) {
      await page.evaluate((args) => window.__perspectiveCamera(...args), requested);
    }
    await armReading(page, tick, name === 'L' ? 8 : 16);
    const callWall = zero + (tick / TICK_HZ - LEAD_S) * 1000;
    if (Date.now() >= callWall) {
      throw new Error(`${name}: posed too late for its time, ${tick}`);
    }
    await page.waitForTimeout(callWall - Date.now());
    // The call's own mission time from the wall clock: a tick read here would
    // wait on the frame in hand and delay the call by up to its 1.8 s.
    const before = Math.round(((Date.now() - zero) / 1000) * TICK_HZ);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      optimizeForSpeed: true,
    });
    const after = await clock(page);
    const file = `${TAG}-${name}-${String(seconds).padStart(3, '0')}s.png`;
    writeFileSync(join(OUT, file), Buffer.from(data, 'base64'));
    console.log(`shot: ${join(OUT, file)}`);
    await page.waitForFunction(() => window.__captureReading !== null, null, { timeout: 60000 });
    const reading = await page.evaluate(() => window.__captureReading);
    if (reading.arch !== null && Object.keys(reading.arch.windows).length > 0) {
      const marked = file.replace(/\.png$/, '-windows.png');
      writeFileSync(join(OUT, marked), await drawWindows(page, data, reading.arch.windows));
      reading.arch.marked = marked;
    }
    const p = reading.probe;
    readings.push({
      name,
      file,
      requestedTick: tick,
      leadS: LEAD_S,
      captureTicks: [before, after],
      readingTick: reading.tick,
      requested: reposed ? requested : 'opening, unmodified',
      actual: pose(p),
      conn: reading.conn,
      arch: reading.arch,
      probe: p,
    });
    console.log(
      `${name}: capture ticks ${before}–${after} (time ${tick}), reading ${reading.tick}, ` +
        `calls ${p.drawCalls}, landmark ${p.landmarks} at ${p.landmarkTris}`
    );
  }
  writeFileSync(
    join(OUT, `${TAG}.json`),
    JSON.stringify({ ...env, openingPose, readings }, null, 2)
  );
};
