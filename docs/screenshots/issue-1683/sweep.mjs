/**
 * #1683's sweep, a run-game `--steps` module: in one tutorial session with the
 * study on, set the study's switches (environmentLayer.ts `setStudySwitches`)
 * to each entry of GAINS, `bounce:ceiling:grade` with grade 1 or 0, wait 4 s
 * and read §11's windows (SIDE px, 16 by default, 8 at L) and the masks off
 * one frame. POSE poses a station first (`__perspectiveCamera`'s arguments);
 * without it the opening, H. Not timed to T+00:30: a sweep compares gains in
 * one session, and the stations' frames are capture.mjs's.
 *
 *   GAINS=7:0.1:1,10:0.1:1 TAG=sweep-H VIEW_W=1920 VIEW_H=1080 \
 *     node .claude/skills/run-game/scripts/drive.mjs --entry tutorial \
 *     --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1683/sweep.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const GAINS = (process.env.GAINS ?? '7:0.1:1').split(',').map((g) => {
  const [b, c, d] = g.split(':');
  return { gain: Number(b), ceiling: Number(c ?? 0.1), grade: (d ?? '1') === '1' };
});
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);
const FACES = {
  // #1683's faces: each one's own rows, between its top and bottom edges
  // projected through the frame's camera, so a window cannot take in the
  // lit top above a face (round 2's finding). Model metres, south faces.
  capW: [
    [-235, 110, 75],
    [-235, 100, 75],
  ],
  capE: [
    [235, 110, 75],
    [235, 100, 75],
  ],
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
const POSE = process.env.POSE ? JSON.parse(process.env.POSE) : null;
const SIDE = Number(process.env.SIDE ?? 16);
const POINTS = {
  span: [0, 136, 45],
  wall: [0, 60, -375],
  capW: [-235, 105, 75],
  capE: [235, 105, 75],
  pierW: [-235, 100, 76],
  pierE: [235, 100, 76],
  floorW: [-235, 12, 130],
  floorE: [235, 12, 130],
  opening: [0, 0, 0],
};
export default async ({ page }) => {
  await page.evaluate(async () => {
    for (;;) {
      const p = window.__perspectiveProbe?.();
      if (p && p.modelBacked === 6) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  if (POSE) await page.evaluate((p) => window.__perspectiveCamera(...p), POSE);
  const rows = [];
  for (const { gain, ceiling, grade } of GAINS) {
    await page.evaluate(
      ([g, c, d]) => window.__archStudy({ bounce: g, ceiling: c, grade: d }),
      [gain, ceiling, grade]
    );
    await page.waitForTimeout(4000);
    const r = await page.evaluate(
      ({ POINTS, SIDE, FACES }) =>
        new Promise((done) =>
          requestAnimationFrame(() => {
            const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
            const w = gl.drawingBufferWidth,
              h = gl.drawingBufferHeight;
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            const L = (i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            const names = Object.keys(POINTS);
            const at = window.__archStudyPoints(names.map((n) => POINTS[n]));
            const win = {};
            at.forEach((p, k) => {
              const cx = Math.round(p.x),
                cy = Math.round(p.y);
              let s = 0,
                n = 0;
              const r = SIDE / 2;
              for (let y = cy - r; y < cy + r; y++)
                for (let x = cx - r; x < cx + r; x++) {
                  s += L(((h - 1 - y) * w + x) * 4);
                  n++;
                }
              win[names[k]] = +(s / n).toFixed(2);
            });
            const box = (x0, y0, x1, y1) => {
              let s = 0,
                n = 0;
              for (let y = y0; y < y1; y++)
                for (let x = x0; x < x1; x++) {
                  if (x < 0 || y < 0 || x >= w || y >= h) continue;
                  s += L(((h - 1 - y) * w + x) * 4);
                  n++;
                }
              return n === 0 ? null : s / n;
            };
            const faces = {};
            for (const [face, ends] of Object.entries(FACES)) {
              const ats = window.__archStudyPoints(ends);
              const x = Math.round((ats[0].x + ats[1].x) / 2);
              const top = Math.round(Math.min(ats[0].y, ats[1].y));
              const bottom = Math.round(Math.max(ats[0].y, ats[1].y));
              const rows = [];
              for (let y = top + 1; y < bottom; y++) rows.push(box(x - 8, y, x + 8, y + 1));
              const valid = rows.filter((v) => v !== null);
              faces[face] = {
                top,
                bottom,
                rows: rows.map((v) => (v === null ? null : +v.toFixed(1))),
                meanLuma: valid.length
                  ? +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)
                  : null,
              };
            }
            let under = 0;
            for (let i = 0; i < w * h * 4; i += 4) if (L(i) < 25.5) under++;
            const mask = window.__archStudyMask();
            const m = {};
            for (const [name, code] of Object.entries({
              stone: 1,
              rib: 2,
              silt: 3,
              laminate: 5,
              hullLamp: 6,
            })) {
              let n = 0,
                s = 0,
                mx = -1;
              for (let i = 0; i < w * h * 4; i += 4) {
                if (mask.pixels[i] !== code || mask.pixels[i + 1] !== 0) continue;
                const l = L(i);
                n++;
                s += l;
                if (l > mx) mx = l;
              }
              m[name] = [n, n ? +(s / n).toFixed(2) : null, +mx.toFixed(1)];
            }
            done({
              tick: window.__echoClock(),
              win,
              nearBlack: +((under / (w * h)) * 100).toFixed(2),
              m,
              faces,
            });
          })
        ),
      { POINTS, SIDE, FACES }
    );
    rows.push({
      gain,
      ceiling,
      grade,
      shade: await page.evaluate(() => window.__archStudyShade()),
      ...r,
    });
    const { win } = r;
    const face = (k) => `${r.faces[k].meanLuma}(${r.faces[k].rows.length})`;
    console.log(
      `bounce ${gain} c ${ceiling} g ${grade ? 1 : 0} span ${win.span} wall ${win.wall} capFace ${face('capW')}/${face('capE')} drum2 ${face('drum2W')}/${face('drum2E')} drum1 ${face('drum1W')}/${face('drum1E')} drum0 ${face('drum0W')}/${face('drum0E')} | nb ${r.nearBlack}% pier ${win.pierW}/${win.pierE} floor ${win.floorW}/${win.floorE} opening ${win.opening} | masses ${(win.pierW - win.floorW).toFixed(2)} ${(win.pierE - win.floorE).toFixed(2)} | lam ${r.m.laminate[1]} archmax ${Math.max(r.m.stone[2], r.m.rib[2], r.m.silt[2])}`
    );
  }
  writeFileSync(join(OUT, `${process.env.TAG ?? 'sweep'}.json`), JSON.stringify(rows, null, 2));
};
