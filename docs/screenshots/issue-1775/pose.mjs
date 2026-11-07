// #1775's evidence (docs/free-camera.md §4, "The study's camera feel"): the
// free-water study camera's pose on every frame through one scripted gesture,
// as a run-game steps module. Each step marks the recording, so readings.json
// reads as a timeline: three wheel notches; a middle-drag pan let go moving,
// then one held still first; a right drag let go moving; a double-click on a
// hull, which is then sent across the water; an arrow pan; Home; and NAV in
// and out again. `summary` measures each step from the rows.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1775/after --steps docs/screenshots/issue-1775/pose.mjs
//
// The same module drives the base commit for the before set, where the study
// camera is instant, a right drag orders, a double-click only selects, and the
// probe has no `feel`. The flicks and the double-click are dispatched in the
// page with a hand's timing, 16 ms a move: here a software-rendered frame can
// take a second or more, and Playwright's input waits on frames, so its moves
// arrive a frame apart, which is a hand held still, and its two clicks land
// past the double-click's 320 ms. CONTROL=1 waits for a shipped map instead of the
// study's props, for the unchanged Kelp Labyrinth control
// (`?map=kelp-labyrinth`), whose camera stays instant and whose right drag
// still orders. Software rendering draws a frame every 100–200 ms here,
// and the study camera steps at most 0.1 s a frame, so its motion runs slower
// than wall time in these rows; the shape of it is the reading, not its speed.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The playfield's middle, above the console. */
const VIEW = { x: 720, y: 360 };

export default async ({ page, shot }) => {
  // The hull models first; the study also waits for its props, whose count
  // has grown with each child of #1694 (291 at #1775), so any is enough.
  const control = process.env.CONTROL === '1';
  await page.waitForFunction(
    (shipped) => {
      const probe = window.__perspectiveProbe?.();
      return probe !== undefined && probe.modelBacked >= 1 && (shipped || probe.props > 0);
    },
    control,
    { timeout: 120000 }
  );
  await page.waitForTimeout(3000);
  // The double-click aims at a hull's model, so the models must have landed.
  await page.waitForFunction(
    () => window.__perspectiveLamps?.().units.some((unit) => unit.screen !== null),
    null,
    { timeout: 120000 }
  );

  // The recorder: one row per frame, read after both painters have drawn it.
  await page.evaluate(() => {
    const rows = [];
    window.__poseRows = rows;
    window.__poseMark = (label) => rows.push({ t: Math.round(performance.now()), mark: label });
    const loop = () => {
      if (window.__poseStop) return;
      const p = window.__perspectiveProbe();
      const feel = p.feel ?? null;
      const row = {
        t: Math.round(performance.now()),
        yawDeg: p.yawDeg,
        pitchDeg: p.pitchDeg,
        distance: p.distance,
        focus: p.focus,
        eye: p.eye,
        flying: p.flight?.flying ?? false,
      };
      if (feel !== null) {
        row.goalDistance = Math.round(feel.goal.distance);
        row.gliding = feel.gliding;
        row.coasting = feel.coasting;
        row.following = feel.following;
        if (feel.following.length > 0) {
          const hull = window.__perspectiveLamps().units.find((u) => u.id === feel.following[0]);
          if (hull !== undefined) {
            row.hull = { x: Math.round(hull.xM), z: Math.round(hull.zM), depthM: hull.depthM };
          }
        }
      }
      rows.push(row);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // A drag or clicks at a hand's pace, on the HUD canvas that hears the
    // pointer: each event is made, and so timed, when it is dispatched.
    window.__poseGesture = ({ button, path, stepMs, holdMs = 0, clicks = 0 }) => {
      const canvas = document.querySelector('.game-host canvas');
      const mask = { 0: 1, 1: 4, 2: 2 }[button];
      const fire = (type, at, buttons) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: type === 'pointermove' ? -1 : button,
            buttons,
            clientX: at.x,
            clientY: at.y,
          })
        );
      const wait = (ms) => {
        const until = performance.now() + ms;
        while (performance.now() < until);
      };
      if (clicks > 0) {
        for (let i = 0; i < clicks; i++) {
          if (i > 0) wait(stepMs);
          fire('pointerdown', path[0], mask);
          fire('pointerup', path[0], 0);
        }
        return;
      }
      fire('pointerdown', path[0], mask);
      for (const at of path.slice(1)) {
        wait(stepMs);
        fire('pointermove', at, mask);
      }
      wait(holdMs);
      fire('pointerup', path.at(-1), 0);
    };
  });
  const gesture = (spec) => page.evaluate((g) => window.__poseGesture(g), spec);
  const line = (from, dx, dy, steps) =>
    Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + dx * i, y: from.y + dy * i }));
  const mark = (label) => page.evaluate((text) => window.__poseMark(text), label);
  const hold = (ms) => page.waitForTimeout(ms);

  const dir = dirname(await shot('opening'));

  // Rule 3: three notches, which the study eases toward and arrives at.
  await page.mouse.move(VIEW.x, VIEW.y);
  await mark('wheel: three notches in');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -100);
    await hold(30);
  }
  await hold(2500);
  await shot('zoomed');

  // Rules 1 and 2: a pan let go moving coasts; one held still first does not.
  for (const still of [false, true]) {
    await mark(still ? 'pan: held still, then let go' : 'pan: let go moving');
    await gesture({
      button: 1,
      path: line({ x: VIEW.x - 120, y: VIEW.y }, 24, 0, 8),
      stepMs: 16,
      holdMs: still ? 250 : 0,
    });
    await hold(still ? 6000 : 25000);
  }

  // Decision 3: a right drag past the slop orbits, and gives no order.
  await mark('orbit: right drag, let go moving');
  await gesture({ button: 2, path: line(VIEW, 18, 2, 8), stepMs: 16 });
  await hold(25000);
  await shot('orbited');

  // Decision 2: a double-click glides to a hull and follows it; sent across
  // the water, it takes the focus with it.
  const target = await page.evaluate(() => {
    const shown = window.__perspectiveLamps().units.filter((unit) => unit.screen !== null);
    const pick = shown.find((unit) => unit.name === 'Corvette') ?? shown[0];
    if (pick === undefined) return null;
    return {
      id: pick.id,
      name: pick.name,
      x: Math.round((pick.screen.x0 + pick.screen.x1) / 2),
      y: Math.round((pick.screen.y0 + pick.screen.y1) / 2),
    };
  });
  if (target !== null) {
    await mark(`follow: double-click the ${target.name} (${target.id})`);
    await gesture({ button: 0, path: [target], stepMs: 90, clicks: 2 });
    await hold(8000);
    await shot('following');
    await mark('follow: the hull sent across the water');
    await page.mouse.click(VIEW.x + 260, VIEW.y - 60, { button: 'right' });
    await hold(9000);
    await shot('following-moved');
  }

  // Any pan lets go of the hull.
  await mark('follow: an arrow pan lets go');
  await page.keyboard.down('ArrowLeft');
  await hold(500);
  await page.keyboard.up('ArrowLeft');
  await hold(2500);

  // Rule 4: Home glides to north, 55 degrees and the seabed.
  await mark('home');
  await page.keyboard.press('Home');
  await hold(3000);
  await shot('home');

  // Decision 4: NAV flies on the keys, and leaving it glides back to the orbit.
  await mark('nav: in, flying forward');
  await page.keyboard.press('F9');
  await page.keyboard.down('KeyW');
  await hold(1500);
  await page.keyboard.up('KeyW');
  await hold(500);
  await shot('nav');
  await mark('nav: out');
  await page.keyboard.press('F9');
  await hold(3000);
  await shot('nav-left');

  const rows = await page.evaluate(() => {
    window.__poseStop = true;
    return window.__poseRows;
  });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  });
  const out = {
    url: page.url(),
    viewport: page.viewportSize(),
    renderer,
    target,
    summary: summarise(rows),
    rows,
  };
  writeFileSync(join(dir, 'readings.json'), `${JSON.stringify(out, null, 1)}\n`);
  console.log(JSON.stringify(out.summary, null, 2));
};

/** Each marked step, measured from its rows. */
function summarise(rows) {
  const steps = [];
  let current = null;
  for (const row of rows) {
    if (row.mark !== undefined) {
      current = { mark: row.mark, rows: [] };
      steps.push(current);
    } else if (current !== null) current.rows.push(row);
  }
  return steps.map(({ mark, rows: frames }) => {
    const first = frames[0];
    const last = frames.at(-1);
    if (first === undefined) return { mark, frames: 0 };
    const along = (pick) => frames.map(pick);
    const moves = (values) => values.slice(1).map((v, i) => v - values[i]);
    const planar = frames.slice(1).map((row, i) => {
      const prev = frames[i];
      return Math.hypot(row.focus.xM - prev.focus.xM, row.focus.zM - prev.focus.zM);
    });
    const distance = moves(along((row) => row.distance));
    const yaw = moves(along((row) => row.yawDeg)).map((d) => ((d + 540) % 360) - 180);
    const pitch = moves(along((row) => row.pitchDeg));
    const lastMoving = (deltas) => deltas.reduce((n, d, i) => (Math.abs(d) > 0 ? i + 1 : n), 0);
    const share = (deltas) => {
      const total = deltas.reduce((n, d) => n + Math.abs(d), 0);
      return total === 0 ? null : Number((Math.max(...deltas.map(Math.abs)) / total).toFixed(3));
    };
    const eyeSteps = frames.slice(1).map((row, i) => {
      const prev = frames[i];
      return Math.hypot(row.eye.xM - prev.eye.xM, row.eye.zM - prev.eye.zM, row.eye.depthM - prev.eye.depthM);
    });
    const tracked = frames.filter((row) => row.hull !== undefined && !row.gliding);
    return {
      mark,
      frames: frames.length,
      ms: last.t - first.t,
      // How far each number travelled in the step, and the largest share of
      // that any one frame took: 1 is a cut, small is a glide.
      distance: { from: first.distance, to: last.distance, biggestFrameShare: share(distance) },
      yaw: { from: first.yawDeg, to: last.yawDeg, biggestFrameShare: share(yaw) },
      pitch: { from: first.pitchDeg, to: last.pitchDeg, biggestFrameShare: share(pitch) },
      focus: {
        from: first.focus,
        to: last.focus,
        travelledM: Math.round(planar.reduce((n, d) => n + d, 0)),
        biggestFrameShare: share(planar),
      },
      // The eye too, sway and all: NAV moves the eye and not the orbit's pose.
      eye: {
        travelledM: Math.round(eyeSteps.reduce((n, d) => n + d, 0)),
        biggestFrameShare: share(eyeSteps),
      },
      // Frames until the step's motion stopped, and whether it had by the end.
      settledAfterFrames: Math.max(lastMoving(distance), lastMoving(planar), lastMoving(yaw)),
      stillAtEnd: planar.at(-1) === 0 && distance.at(-1) === 0 && yaw.at(-1) === 0,
      flyingAtEnd: last.flying,
      followingAtEnd: last.following ?? null,
      // With a hull followed and no glide under way: how far the focus sat from
      // the hull's last reported place, which leads the drawn hull by up to
      // one Echo tick's travel.
      followGapM:
        tracked.length === 0
          ? null
          : Math.round(
              Math.max(
                ...tracked.map((row) =>
                  Math.hypot(row.focus.xM - row.hull.x, row.focus.zM - row.hull.z)
                )
              )
            ),
      followDepthGapM:
        tracked.length === 0
          ? null
          : Math.round(
              Math.max(
                ...tracked.map((row) => Math.abs((row.focus.depthM ?? 0) - row.hull.depthM))
              )
            ),
    };
  });
}
