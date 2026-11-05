// The §9 frames with the vertical command instruments on them
// (docs/free-water-slice.md §9, "Vertical command" and "Frames and the last
// gate"), as a run-game steps module. First the frame the study opens on,
// then the four §9 poses with the HUD on, then the instruments' own frames:
// stalks above and below a raised focus's plane at the opening pose, the
// section scope picking a pinned MOVE 3D depth, and the bowl look-up pose
// that proves the study's −60° band. Each frame's probe reading lands beside
// it in readings.json.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1753/after --steps docs/screenshots/issue-1753/frames.mjs
//
// FRAMES=low,survey limits the explicit poses. INSTRUMENTS=0 skips the
// instruments' frames, for a before set on the base commit.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const POSES = [
  // name, plan x, plan z, dolly, yaw, pitch, focus depth
  ['opening-pose', 709, 1710, 1200, -34, 15, 300],
  ['garden-close', 1875, 1125, 250, 90, 12, 275],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
];

// The console's blocks at 1440×900 and UI scale 1 (consoleLayout.ts): the
// plan scope's square and the section's beside it, as `minimapRect` and
// `sectionRect` place them. Asserted against the DOM's scale below.
const CONSOLE = { y: 900 - 208 + 24 + 4, h: 208 - 24 - 4 - 8 };
const SQUARE = Math.min(170 - 12, CONSOLE.h - 22 - 12);
const squareAt = (blockX) => ({
  x: blockX + (170 - SQUARE) / 2,
  y: CONSOLE.y + 22 + (CONSOLE.h - 22 - SQUARE) / 2,
  size: SQUARE,
});
const SCOPE = squareAt(10);
const SECTION = squareAt(10 + 170 + 8);

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 200, null, {
    timeout: 120000,
  });
  const only = process.env.FRAMES?.split(',');
  const readings = [];
  let dir;
  const settle = async () => {
    await page.evaluate(() => window.__perspectiveStation('settle'));
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 6, null, {
      timeout: 120000,
    });
  };
  const aim = async ([, x, z, distance, yawDeg, pitchDeg, focusDepthM]) => {
    await page.evaluate(
      ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
      },
      { x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await settle();
  };
  const read = async (name, extra = {}) => {
    const p = await page.evaluate(() => window.__perspectiveProbe());
    const dom = await page.evaluate(() => ({
      uiScale: getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale'),
      preview: document.querySelector('.move-preview')?.textContent ?? null,
      previewDepth: document.querySelector('.move-preview input[type=number]:nth-of-type(1)')
        ? [...document.querySelectorAll('.move-preview input[type=number]')].map((i) => i.value)
        : null,
    }));
    readings.push({
      name,
      look: p.look,
      pitchDeg: p.pitchDeg,
      yawDeg: p.yawDeg,
      focus: p.focus,
      eye: p.eye,
      distance: p.distance,
      flight: p.flight,
      ownCentre: p.ownCentre,
      waterReachM: p.waterReachM,
      calls: p.drawCalls,
      triangles: p.triangles,
      props: p.props,
      propTriangles: p.propTris,
      sway: p.sway,
      dom,
      ...extra,
    });
    return p;
  };
  const click = async (x, y) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
  };

  await settle();
  await read('opening');
  dir = dirname(await shot('opening'));
  for (const pose of POSES) {
    if (only && !only.includes(pose[0])) continue;
    await aim(pose);
    await read(pose[0]);
    await shot(pose[0]);
  }

  if (process.env.INSTRUMENTS !== '0') {
    // Stalks: nothing selected, so the plane is the raised focus. At 600 m the
    // hulls, at their 300 m exercise depth, stand above it and their stalks
    // are solid; at 150 m they stand below it and the stalks are dashed.
    const [, x, z, distance, yawDeg, pitchDeg] = POSES[0];
    await aim(['stalks-above', x, z, distance, yawDeg, pitchDeg, 600]);
    await read('stalks-above');
    await shot('stalks-above');
    await aim(['stalks-below', x, z, distance, yawDeg, pitchDeg, 150]);
    await read('stalks-below');
    await shot('stalks-below');

    // The bowl look-up: over the bowl's western slope, the focus at the
    // fleet's 300 m and the dolly short, pitched to the band's floor and
    // turned west, so the rim wall stands over the eye and the fleet on the
    // rim is above and ahead. The clamp keeps the eye over the slope's floor,
    // and the reach at this dolly decides what of the wall the water shows.
    await aim(['bowl-lookup', 1250, 2250, 300, 90, -60, 300]);
    const p = await read('bowl-lookup');
    if (Math.abs(p.pitchDeg + 60) > 0.2) throw new Error(`the band stopped at ${p.pitchDeg}`);
    await shot('bowl-lookup');
    // Over the garden's 400 m floor a 300 m focus allows only a few degrees
    // of look-up (free-camera.md §4): the rig is pitched to −45°, the clamp
    // holds the eye 25 m over the floor, and the gaze is about 4° up through
    // the stands, which here are within the water's reach.
    await aim(['garden-lookup', 2000, 1400, 400, 180, -45, 300]);
    await read('garden-lookup');
    await shot('garden-lookup');
    // And the same pose at the shipped floor, for the pair.
    await aim(['bowl-level', 1250, 2250, 300, 90, 10, 300]);
    await read('bowl-level');
    await shot('bowl-level');
    // The depth picker: the army selected, MOVE 3D armed, the position pinned
    // on the plan scope's centre, then the section pressed three quarters of
    // the way down, which is 2,250 m.
    await aim(POSES[2]);
    const scale = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale').trim()
    );
    if (Number(scale) !== 1) throw new Error(`the instrument rects assume UI scale 1, got ${scale}`);
    await page.keyboard.press('Digit0');
    await page.click('text=MOVE 3D');
    await click(SCOPE.x + SCOPE.size / 2, SCOPE.y + SCOPE.size / 2);
    await click(SECTION.x + SECTION.size / 2, SECTION.y + SECTION.size * 0.75);
    await settle();
    const depth = await page.evaluate(
      () => [...document.querySelectorAll('.move-preview input[type=number]')].at(-1)?.value
    );
    if (depth !== '2250') throw new Error(`the section picked ${depth}, not 2250`);
    await read('depth-pick', { pickedDepthM: Number(depth) });
    await shot('depth-pick');
    await page.click('text=CANCEL');

  }

  writeFileSync(
    join(dir, 'readings.json'),
    JSON.stringify({ dpr: Number(process.env.VIEW_DPR ?? 1), readings }, null, 2) + '\n'
  );
};
