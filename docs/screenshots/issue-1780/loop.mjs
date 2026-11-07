// The rim ray through §9's opening pose for most of a loop (#1780), as a
// run-game steps module: the opening pose held, a frame at each of TIMES
// seconds of match, and beside the frames readings.json with the ray's loop
// angle, the share of its plan the eye sees, its distance and its span on
// screen, and the probe's calls and triangles. The probe carries no match
// clock, so the time is read off the ray: its loop angle less its start, at
// 1.2 degrees a second (FREE_WATER_LIFE.RAY, 360 over 300 s).
//
//   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
//     --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1780/after --steps docs/screenshots/issue-1780/loop.mjs
//
// START_DEG=157 reads a revision before #1780, whose start was seeded
// (propHash of 1713, 735 and 2,210 puts it at 157.0 degrees). TIMES=0 HOLD_S=10
// with SETTINGS_JSON's reducedMotion reads the pose reduced motion holds, twice.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DV = 0.22;
const START_DEG = Number(process.env.START_DEG ?? 300);
const TIMES = (process.env.TIMES ?? '15,30,60,120,170,240').split(',').map(Number);
const HOLD_S = Number(process.env.HOLD_S ?? 0);
const CENTRE = [735, 2210];
const AXIS_M = 0.76;

// Through the probe's own eye and focus, as issue-1777/frames.mjs projects.
function reading(p, q, width, height) {
  const world = (o) => [o.xM, -o.depthM * DV, o.zM];
  const eye = world(p.eye);
  const focus = world(p.focus);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a) => a.map((v) => v / Math.hypot(...a));
  const forward = unit(sub(focus, eye));
  const right = unit([-forward[2], 0, forward[0]]);
  const up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  const focal = height / 2 / Math.tan((20 * Math.PI) / 180);
  const axis = [q.x, q.y + AXIS_M, q.z];
  const d = sub(axis, eye);
  const z = dot(d, forward);
  // The body's back: up, rolled by the bank toward the loop's centre.
  const toCentre = unit([CENTRE[0] - q.x, 0, CENTRE[1] - q.z]);
  const bank = q.roll ?? 0;
  const back = [toCentre[0] * Math.sin(bank), Math.cos(bank), toCentre[2] * Math.sin(bank)];
  return {
    loopDeg: Math.round(((Math.atan2(q.z - CENTRE[1], q.x - CENTRE[0]) * 180) / Math.PI + 360) % 360),
    bankDeg: Math.round((bank * 180) / Math.PI),
    planShown: Math.round(dot(back, unit(sub(eye, axis))) * 100) / 100,
    screen: [Math.round(width / 2 + (dot(d, right) / z) * focal), Math.round(height / 2 - (dot(d, up) / z) * focal)],
    distanceM: Math.round(Math.hypot(...d)),
    spanPx: Math.round(((18 * focal) / z) * 10) / 10,
  };
}

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 291, null, {
    timeout: 180000,
  });
  await page.evaluate(() =>
    window.__perspectiveCamera(709, 1710, 1200, { yawDeg: -34, pitchDeg: 15, focusDepthM: 300 })
  );
  const [width, height] = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  const ray = () =>
    page.evaluate(() =>
      window.__freeWaterDecoration().positions.find((r) => r.slug === 'env-rim-ray')
    );
  const matchS = (q) => {
    const deg = (Math.atan2(q.z - CENTRE[1], q.x - CENTRE[0]) * 180) / Math.PI;
    return (((deg - START_DEG) % 360) + 360) % 360 / 1.2;
  };
  const rows = [];
  let dir;
  const frame = async (t, name) => {
    await page.evaluate(() => window.__perspectiveStation('settle'));
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 6, null, {
      timeout: 60000,
    });
    const p = await page.evaluate(() => window.__perspectiveProbe());
    const q = await ray();
    dir = dirname(await shot(name));
    rows.push({
      t,
      name,
      matchS: Math.round(matchS(q)),
      ...reading(p, q, width, height),
      calls: p.drawCalls,
      triangles: p.triangles,
      props: p.props,
    });
  };
  const first = matchS(await ray());
  for (const t of TIMES) {
    if (t > 0) {
      if (matchS(await ray()) > t + 2) {
        rows.push({ t, missed: `the page was ready ${Math.round(first)} s in` });
        continue;
      }
      await page.waitForFunction(
        ({ t, start }) => {
          const q = window.__freeWaterDecoration().positions.find((r) => r.slug === 'env-rim-ray');
          const deg = (Math.atan2(q.z - 2210, q.x - 735) * 180) / Math.PI;
          return (((deg - start) % 360) + 360) % 360 / 1.2 >= t;
        },
        { t, start: START_DEG },
        { timeout: (t + 30) * 1000, polling: 250 }
      );
    }
    await frame(t, `t${String(t).padStart(3, '0')}`);
  }
  // Reduced motion holds the ray where it starts: the same pose HOLD_S seconds
  // of wall time later, whose box a pixel diff compares.
  if (HOLD_S > 0) {
    await page.waitForTimeout(HOLD_S * 1000);
    await frame(TIMES.at(-1), 'held');
  }
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context').loseContext();
    return name;
  });
  writeFileSync(
    join(dir, 'readings.json'),
    JSON.stringify(
      {
        renderer,
        viewport: [width, height],
        dpr: Number(process.env.VIEW_DPR ?? 1),
        startDeg: START_DEG,
        reducedMotion: process.env.SETTINGS_JSON?.includes('"reducedMotion":true') === true,
        rows,
      },
      null,
      2
    ) + '\n'
  );
};
