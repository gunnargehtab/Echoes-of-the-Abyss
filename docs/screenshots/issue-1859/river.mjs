// What each camera holds of the far bloom (#1859): the numbers
// docs/free-water-slice.md §5, "A far bloom over the bowl", and
// docs/art-direction.md, "A far bloom of lanterns", print. Arithmetic on the
// river's own slots, after `npm run build:shared`:
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1859/river.mjs
//
// The slots are freeWaterDecoration.ts's, over the crater the server paints,
// and a lantern stands where `decorationPose` puts it. The cameras are the
// frame module's, and the water's reach is water.ts's free-water curve.
import { PerspectiveCamera, Vector3 } from 'three';
import { FREE_WATER_HIGH_LIFE, HIGH_GRAPHICS } from '../../../packages/shared/dist/index.js';
import { terrainFor } from '../../../packages/backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../../packages/backend/src/sim/maps/freeWaterSlice.ts';
import { propSpec } from '../../../packages/frontend/src/game/environment.ts';
import {
  decorationPose,
  freeWaterPlacements,
} from '../../../packages/frontend/src/game/freeWaterDecoration.ts';
import { CONN_FOV_DEG } from '../../../packages/frontend/src/game/readability.ts';
import { waterReachM, waterTransmittance } from '../../../packages/frontend/src/game/water.ts';
import { depthToWorldY } from '../../../packages/frontend/src/game/perspectiveTerrain.ts';

const [VIEW_W, VIEW_H] = [1920, 1080];
const { BLOOM, JELLIES } = FREE_WATER_HIGH_LIFE;
const { at, RADII_M, SPAN_DEG, COUNT, depthM, STATION, MOTION } = BLOOM;
const { STRANDS, HALO } = HIGH_GRAPHICS.LIFE.JELLY;
const { MIN_PX, LANTERN } = HIGH_GRAPHICS.LIFE.GLOW;
const BELL_M = propSpec('env-drift-jelly').footprintM;

const crater = terrainFor(FREE_WATER_SLICE).serialize();
const RIVER = freeWaterPlacements(crater, true, true).filter((p) => p.far === true);
/** Where a lantern's bell hangs at a match time: its mid-height, which its depth places. */
const bellAt = (slot, timeS, out) => {
  const pose = decorationPose(slot, timeS * 1000, () => 0);
  return out.set(pose.x, pose.y + slot.motion.axisM, pose.z);
};

// docs/screenshots/issue-1799/README.md, Cameras, gate 6's low, and the frame
// module's own three: the focus in plan, the dolly, yaw and pitch in degrees,
// the focus depth.
const POSES = {
  home: [709, 1710, 1200, -34, 15, 300],
  close: [542, 1958, 420, -60, 2, 300],
  low: [2000, 2000, 1600, 0, 12, 850],
  survey: [2000, 2000, 10000, 0, 88, 0],
  river: [1200, 1930, 400, -70, 5, 160],
  field: [1550, 1930, 1100, 0, 20, 200],
};
const cameraOf = ([fx, fz, dolly, yawDeg, pitchDeg, focusDepthM]) => {
  const camera = new PerspectiveCamera(CONN_FOV_DEG, VIEW_W / VIEW_H, 10, 60000);
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const flat = dolly * Math.cos(pitch);
  const focus = new Vector3(fx, depthToWorldY(focusDepthM), fz);
  camera.position.set(
    fx + Math.sin(yaw) * flat,
    focus.y + dolly * Math.sin(pitch),
    fz + Math.cos(yaw) * flat
  );
  camera.lookAt(focus);
  camera.updateMatrixWorld();
  return camera;
};
const pxPerM = VIEW_H / 2 / Math.tan((CONN_FOV_DEG * Math.PI) / 360);
const fmt = (n, d = 0) => n.toFixed(d);
const sorted = (list) => [...list].sort((a, b) => a - b);
const median = (list) => sorted(list)[Math.floor(list.length / 2)];
const toScreen = (camera, point) => {
  const ndc = point.clone().project(camera);
  return [((ndc.x + 1) / 2) * VIEW_W, ((1 - ndc.y) / 2) * VIEW_H, ndc];
};

// The loop: its length, by walking it, and the eddy's pace on the river's own
// line, a lantern that keeps on it and does not wander.
let lengthM = 0;
for (let i = 0; i < 3600; i++) {
  const [a, b] = [i, i + 1].map((k) => (k * Math.PI) / 1800);
  lengthM += Math.hypot(
    RADII_M[0] * (Math.cos(b) - Math.cos(a)),
    RADII_M[1] * (Math.sin(b) - Math.sin(a))
  );
}
console.log(`loop: ${fmt(lengthM)} m round, ${COUNT} lanterns over ${SPAN_DEG} degrees of it`);
const line = {
  ...RIVER[0],
  motion: {
    ...RIVER[0].motion,
    phase: Math.PI,
    eddy: { ...RIVER[0].motion.eddy, acrossM: 0, wanderM: 0 },
  },
};
const lap = Array.from({ length: 2700 }, (_, step) => {
  const timeS = (MOTION.periodS * step) / 2700;
  const [now, next] = [timeS, timeS + 1].map((t) => decorationPose(line, t * 1000, () => 0));
  return { now, mps: Math.hypot(next.x - now.x, next.z - now.z), east: next.x - now.x };
});
const north = lap.reduce((a, b) => (b.now.z < a.now.z ? b : a));
const south = lap.reduce((a, b) => (b.now.z > a.now.z ? b : a));
const paces = lap.map((one) => one.mps);
console.log(
  `pace on the river's line: ${fmt(north.mps, 2)} m/s at the north point, running ` +
    `${north.east > 0 ? 'east' : 'west'}; ${fmt(south.mps, 2)} at the south point, running ` +
    `${south.east > 0 ? 'east' : 'west'}; ${fmt(Math.max(...paces), 2)} at the fastest, ` +
    `${fmt(Math.min(...paces), 2)} at the slowest, ${fmt(lengthM / MOTION.periodS, 2)} mean; ` +
    `a drifting jelly ${fmt((2 * Math.PI * JELLIES.MOTION.radiusM) / JELLIES.MOTION.periodS, 2)} m/s`
);
// The band every lantern sweeps in a lap, station, spread and wander with it,
// and how near it comes to where a hull starts (docs/free-water-slice.md §4).
const FLEET = { 'Light Scout': [625, 1875], Corvette: [625, 2125], Harvester: [375, 1875] };
const band = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], north: 0, south: 0 };
let nearest = { m: Infinity, hull: '' };
for (const slot of RIVER) {
  const still = {
    ...slot,
    motion: { ...slot.motion, eddy: { ...slot.motion.eddy, acrossM: 0, wanderM: 0 } },
  };
  for (let step = 0; step < 1350; step++) {
    const ms = (MOTION.periodS * 1000 * step) / 1350;
    const pose = decorationPose(slot, ms, () => 0);
    band.x = [Math.min(band.x[0], pose.x), Math.max(band.x[1], pose.x)];
    band.y = [Math.min(band.y[0], pose.z), Math.max(band.y[1], pose.z)];
    const on = decorationPose(still, ms, () => 0);
    const off = Math.hypot(pose.x - on.x, pose.z - on.z);
    if (on.z < at[1] - RADII_M[1] * 0.95) band.north = Math.max(band.north, off);
    if (on.z > at[1] + RADII_M[1] * 0.95) band.south = Math.max(band.south, off);
    for (const [hull, [hx, hy]] of Object.entries(FLEET)) {
      const m = Math.hypot(pose.x - hx, pose.z - hy);
      if (m < nearest.m) nearest = { m, hull };
    }
  }
}
console.log(
  `band: x ${fmt(band.x[0])}..${fmt(band.x[1])}, y ${fmt(band.y[0])}..${fmt(band.y[1])}, ` +
    `${depthM - STATION.depthM}..${depthM + STATION.depthM} m deep; a lantern stands up to ` +
    `${fmt(band.north)} m off the line by the north point and ${fmt(band.south)} m by the south`
);
console.log(
  `the band's nearest point to a hull's start, in plan: ${fmt(nearest.m)} m, the ${nearest.hull}'s`
);
const wanders = RIVER.map((slot) => MOTION.periodS / slot.motion.eddy.wanderLaps);
console.log(
  `a lantern wanders ${fmt(Math.min(...RIVER.map((slot) => slot.motion.eddy.wanderM)))} to ` +
    `${fmt(Math.max(...RIVER.map((slot) => slot.motion.eddy.wanderM)))} m either way, once in ` +
    `${fmt(Math.min(...wanders))} to ${fmt(Math.max(...wanders))} s`
);
const depths = RIVER.map((slot) => slot.motion.depthM);
console.log(
  `the lanterns hang ${fmt(Math.min(...depths))} to ${fmt(Math.max(...depths))} m deep; ` +
    `a bell is ${BELL_M} m across, a bead ${STRANDS.SIZE_M} m at the lip`
);
console.log(
  `the crater stands ${JELLIES.SLOTS.length + COUNT} jellies: ` +
    `${(JELLIES.SLOTS.length + COUNT) * 594} triangles of membrane, ` +
    `${(JELLIES.SLOTS.length + COUNT) * (1 + 6 + STRANDS.COUNT * STRANDS.BEADS)} points; ` +
    `the river's ${COUNT} are ${COUNT * 594} and ${COUNT * (1 + 6 + STRANDS.COUNT * STRANDS.BEADS)} of them`
);

// What a camera holds of the river at a match time: how many bells stand in
// its frame, how far off, how wide a bell and a bead draw and what the water
// leaves of their light.
const seen = (name, timeS, placeOf = bellAt) => {
  const pose = POSES[name];
  const camera = cameraOf(pose);
  const reachM = waterReachM(pose[2], true);
  const inside = [];
  const point = new Vector3();
  for (const slot of RIVER) {
    placeOf(slot, timeS, point);
    const rangeM = point.distanceTo(camera.position);
    const [sx, sy, ndc] = toScreen(camera, point);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1) continue;
    inside.push({ rangeM, sx, sy, left: waterTransmittance(rangeM, reachM) });
  }
  return { reachM, inside };
};
const report = (name, timeS) => {
  const { reachM, inside } = seen(name, timeS);
  if (inside.length === 0) {
    console.log(`${name} at ${timeS} s: none in the frame; the water reaches ${fmt(reachM)} m`);
    return;
  }
  const of = (key) => inside.map((one) => one[key]);
  const [near, far] = [Math.min(...of('rangeM')), Math.max(...of('rangeM'))];
  const px = (sizeM, rangeM) => (sizeM * pxPerM) / rangeM;
  console.log(
    `${name} at ${timeS} s: ${inside.length} of ${COUNT} in the frame, ` +
      `${fmt(near)} to ${fmt(far)} m off (median ${fmt(median(of('rangeM')))}); ` +
      `a bell ${fmt(px(BELL_M, far), 1)} to ${fmt(px(BELL_M, near), 1)} px, a bead at the lip ` +
      `${fmt(px(STRANDS.SIZE_M, far), 2)} to ${fmt(px(STRANDS.SIZE_M, near), 2)} px against the ` +
      `${MIN_PX} px floor; the water (reach ${fmt(reachM)} m) leaves ` +
      `${fmt(Math.min(...of('left')), 2)} to ${fmt(Math.max(...of('left')), 2)} ` +
      `(median ${fmt(median(of('left')), 2)}); ` +
      `x ${fmt(Math.min(...of('sx')))}..${fmt(Math.max(...of('sx')))}, ` +
      `y ${fmt(Math.min(...of('sy')))}..${fmt(Math.max(...of('sy')))}`
  );
  // What the lanterns' points cost: the fragments of each disc, none drawn
  // narrower than its floor and none counted past the frame's own area. The
  // glow round the bell, the six seats and the beads; the bell's membrane is
  // its own pixels and is not summed here.
  const frame = VIEW_W * VIEW_H;
  const disc = (sizeM, rangeM) =>
    Math.min(frame, (Math.PI / 4) * Math.max(px(sizeM, rangeM), MIN_PX) ** 2);
  let glow = 0;
  let small = 0;
  for (const rangeM of of('rangeM')) {
    glow += disc(HALO.SIZE_M, rangeM);
    small += 6 * disc(LANTERN.SIZE_M, rangeM);
    for (let j = 0; j < STRANDS.BEADS; j++) {
      const t = (j + 1) / STRANDS.BEADS;
      small += STRANDS.COUNT * disc(STRANDS.SIZE_M * (1 - STRANDS.TAPER * t), rangeM);
    }
  }
  console.log(
    `  fragments of the points: ${fmt(glow)} of the glow round the bells and ${fmt(small)} of ` +
      `the seats and beads, ${fmt(((glow + small) / frame) * 100, 1)}% of the frame's ${frame}`
  );
};
for (const name of Object.keys(POSES)) report(name, 0);
// Where a session finds the river later: it drifts, and Home's eye does not.
for (const minutes of [10, 30, 60]) report('home', minutes * 60);

// The staged frames (frames.mjs). `MARK_AT`: the Corvette sent out at 300 m,
// from Home's eye; bloom.py reads its ring's radius off the frame, and a bell
// within 4 px of that circle is across its stroke. `FIELD_AT`: a Tetherjelly
// field, 250 m in radius, and the lanterns that hang inside its rim in plan.
{
  const camera = cameraOf(POSES.home);
  const RING_PX = 45;
  const [cx, cy] = toScreen(camera, new Vector3(1350, depthToWorldY(300), 1800));
  let inside = 0;
  let across = 0;
  const point = new Vector3();
  for (const slot of RIVER) {
    const [sx, sy] = toScreen(camera, bellAt(slot, 0, point));
    const off = Math.hypot(sx - cx, sy - cy);
    if (off < RING_PX - 4) inside++;
    else if (off <= RING_PX + 4) across++;
  }
  console.log(
    `mark: the Corvette at 1,350 / 1,800 draws at ${fmt(cx)}, ${fmt(cy)} from Home; ` +
      `${inside} bells stand inside a ring of ${RING_PX} px there and ${across} across its stroke`
  );
  const FIELD = { x: 1550, y: 1930, radiusM: 250 };
  const within = RIVER.filter((slot) => {
    bellAt(slot, 0, point);
    return Math.hypot(point.x - FIELD.x, point.z - FIELD.y) <= FIELD.radiusM;
  }).length;
  const ring = RIVER.filter((slot) => {
    bellAt(slot, 0, point);
    const off = Math.hypot(point.x - FIELD.x, point.z - FIELD.y);
    return off > FIELD.radiusM && off <= FIELD.radiusM + 150;
  }).length;
  console.log(
    `field: of the river's ${COUNT}, ${within} hang inside the staged field's 250 m rim in plan ` +
      `and ${ring} within 150 m outside it`
  );
}

// The three shapes written for the loop, by what Home's eye holds of each at
// the match's start: the same list hung on another loop. A circle the bowl
// holds whole, about the crater's centre and in its north-west, and the
// ellipse taken.
const shapes = {
  'a circle about the crater’s centre, 620 m': {
    at: [2250, 2250],
    radii: [620, 620],
    startDeg: 225,
  },
  'a circle in the bowl’s north-west, 600 m': {
    at: [1900, 2200],
    radii: [600, 600],
    startDeg: 250,
  },
  'the ellipse taken': { at, radii: RADII_M, startDeg: BLOOM.startDeg },
};
for (const [label, shape] of Object.entries(shapes)) {
  const turn = ((shape.startDeg - BLOOM.startDeg) * Math.PI) / 180;
  const placeOf = (slot, _timeS, out) => {
    const acrossM = slot.motion.eddy.acrossM;
    return out.set(
      shape.at[0] + (shape.radii[0] + acrossM) * Math.cos(slot.motion.phase + turn),
      depthToWorldY(slot.motion.depthM),
      shape.at[1] + (shape.radii[1] + acrossM) * Math.sin(slot.motion.phase + turn)
    );
  };
  const { inside } = seen('home', 0, placeOf);
  const xs = inside.map((one) => one.sx);
  console.log(
    `${label}: ${inside.length} of ${COUNT} in Home's frame` +
      (inside.length > 0 ? `, x ${fmt(Math.min(...xs))}..${fmt(Math.max(...xs))}` : '')
  );
}
