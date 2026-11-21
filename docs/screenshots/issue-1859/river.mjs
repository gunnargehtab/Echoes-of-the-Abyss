// What each camera holds of the far bloom (#1859): the numbers
// docs/free-water-slice.md §5, "A far bloom over the bowl", and
// docs/art-direction.md, "A far bloom of lanterns", print. Arithmetic on the
// constants and the river's own list, after `npm run build:shared`:
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1859/river.mjs
//
// The loop is farBloom.ts's: an ellipse, clockwise seen from above, a lantern
// keeping station on it. The cameras are the frame module's, and the water's
// reach is water.ts's free-water curve.
import { PerspectiveCamera, Vector3 } from 'three';
import { FREE_WATER_HIGH_LIFE, HIGH_GRAPHICS } from '../../../packages/shared/dist/index.js';
import {
  FAR_BLOOM,
  farBloomPlan,
  farLanternAt,
} from '../../../packages/frontend/src/game/farBloom.ts';
import { CONN_FOV_DEG } from '../../../packages/frontend/src/game/readability.ts';
import { waterReachM, waterTransmittance } from '../../../packages/frontend/src/game/water.ts';
import { depthToWorldY } from '../../../packages/frontend/src/game/perspectiveTerrain.ts';

const [VIEW_W, VIEW_H] = [1920, 1080];
const { at, RADII_M, SPAN_DEG, COUNT, periodS, depthM, STATION } = FREE_WATER_HIGH_LIFE.BLOOM;
const { FAR } = HIGH_GRAPHICS.LIFE.JELLY;
const { MIN_PX } = HIGH_GRAPHICS.LIFE.GLOW;

// docs/screenshots/issue-1799/README.md, Cameras, and gate 6's low: the focus
// in plan, the dolly, yaw and pitch in degrees, the focus depth.
const POSES = {
  // An eye inside the river's thickest water, 60 m from its line: the worst a
  // camera can ask of the points.
  inside: [1260, 1930, 60, -90, 0, 160],
  home: [709, 1710, 1200, -34, 15, 300],
  close: [542, 1958, 420, -60, 2, 300],
  low: [2000, 2000, 1600, 0, 12, 850],
  survey: [2000, 2000, 10000, 0, 88, 0],
  river: [1200, 1930, 400, -70, 5, 160],
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

// The loop: its length, by walking it, and its pace.
let lengthM = 0;
for (let i = 0; i < 3600; i++) {
  const [a, b] = [i, i + 1].map((k) => (k * Math.PI) / 1800);
  lengthM += Math.hypot(
    RADII_M[0] * (Math.cos(b) - Math.cos(a)),
    RADII_M[1] * (Math.sin(b) - Math.sin(a))
  );
}
const jelly = FREE_WATER_HIGH_LIFE.JELLIES.MOTION;
console.log(`loop: ${fmt(lengthM)} m round, ${COUNT} lanterns over ${SPAN_DEG} degrees of it`);
console.log(
  `pace: ${fmt((2 * Math.PI * RADII_M[0]) / periodS, 2)} m/s on the long sides, ` +
    `${fmt((2 * Math.PI * RADII_M[1]) / periodS, 2)} round the ends, ` +
    `${fmt(lengthM / periodS, 2)} mean; a drifting jelly ` +
    `${fmt((2 * Math.PI * jelly.radiusM) / jelly.periodS, 2)} m/s`
);
console.log(
  `band: x ${fmt(at[0] - RADII_M[0] - STATION.acrossM)}..${fmt(at[0] + RADII_M[0] + STATION.acrossM)}, ` +
    `y ${fmt(at[1] - RADII_M[1] - STATION.acrossM)}..${fmt(at[1] + RADII_M[1] + STATION.acrossM)}, ` +
    `${depthM - STATION.depthM}..${depthM + STATION.depthM} m deep`
);
// docs/free-water-slice.md §4: where the three hulls start, at 300 m.
const FLEET = { 'Light Scout': [625, 1875], Corvette: [625, 2125], Harvester: [375, 1875] };
let nearest = { m: Infinity, hull: '' };
for (let deg = 0; deg < 360; deg += 0.25) {
  for (const acrossM of [-STATION.acrossM, 0, STATION.acrossM]) {
    const [x, y] = farBloomPlan((deg * Math.PI) / 180, acrossM);
    for (const [hull, [hx, hy]] of Object.entries(FLEET)) {
      const m = Math.hypot(x - hx, y - hy);
      if (m < nearest.m) nearest = { m, hull };
    }
  }
}
console.log(
  `the band's nearest point to a hull's start, in plan: ${fmt(nearest.m)} m, the ${nearest.hull}'s`
);
const widths = FAR_BLOOM.map((slot) => slot.sizeM);
console.log(`a bell's disc: ${fmt(Math.min(...widths), 1)} to ${fmt(Math.max(...widths), 1)} m`);

// What a camera holds of a list of points at a match time: how many stand in
// its frame, how far off, how wide a disc draws and what the water leaves.
const seen = (name, timeS, lanterns = FAR_BLOOM, placeOf = farLanternAt) => {
  const pose = POSES[name];
  const camera = cameraOf(pose);
  const reachM = waterReachM(pose[2], true);
  const inside = [];
  const point = new Vector3();
  for (const slot of lanterns) {
    placeOf(slot, timeS, point);
    const rangeM = point.distanceTo(camera.position);
    const ndc = point.clone().project(camera);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || ndc.z > 1) continue;
    inside.push({
      rangeM,
      px: (slot.sizeM * pxPerM) / rangeM,
      haloPx: (((FAR.HALO.SIZE_M * slot.sizeM) / FAR.SIZE_M) * pxPerM) / rangeM,
      left: waterTransmittance(rangeM, reachM),
      sx: ((ndc.x + 1) / 2) * VIEW_W,
      sy: ((1 - ndc.y) / 2) * VIEW_H,
    });
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
  const floor = inside.filter((one) => one.px < MIN_PX).length;
  console.log(
    `${name} at ${timeS} s: ${inside.length} of ${COUNT} in the frame, ` +
      `${fmt(Math.min(...of('rangeM')))} to ${fmt(Math.max(...of('rangeM')))} m off ` +
      `(median ${fmt(median(of('rangeM')))}); a disc ${fmt(Math.min(...of('px')), 1)} to ` +
      `${fmt(Math.max(...of('px')), 1)} px, ${floor} under the ${MIN_PX} px floor; the water ` +
      `(reach ${fmt(reachM)} m) leaves ${fmt(Math.min(...of('left')), 2)} to ` +
      `${fmt(Math.max(...of('left')), 2)} (median ${fmt(median(of('left')), 2)}); ` +
      `x ${fmt(Math.min(...of('sx')))}..${fmt(Math.max(...of('sx')))}, ` +
      `y ${fmt(Math.min(...of('sy')))}..${fmt(Math.max(...of('sy')))}`
  );
  // What the points cost: the fragments of each disc, a point never drawn
  // narrower than its floor, and no disc counted past the frame's own area.
  const frame = VIEW_W * VIEW_H;
  const disc = (px) => Math.min(frame, (Math.PI / 4) * Math.max(px, MIN_PX) ** 2);
  const bells = of('px').reduce((sum, px) => sum + disc(px), 0);
  const halos = of('haloPx').reduce((sum, px) => sum + disc(px), 0);
  console.log(
    `  fragments: ${fmt(bells)} of the bells' discs and ${fmt(halos)} of their glow, ` +
      `${fmt(((bells + halos) / frame) * 100, 1)}% of the frame's ${frame}; ` +
      `the widest glow ${fmt(Math.max(...of('haloPx')))} px`
  );
};
for (const name of Object.keys(POSES)) report(name, 0);
// Where a session finds the river later: it drifts, and Home's eye does not.
for (const minutes of [10, 30, 60]) report('home', minutes * 60);

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
  'the ellipse taken': { at, radii: RADII_M, startDeg: FREE_WATER_HIGH_LIFE.BLOOM.startDeg },
};
for (const [label, shape] of Object.entries(shapes)) {
  const turn = ((shape.startDeg - FREE_WATER_HIGH_LIFE.BLOOM.startDeg) * Math.PI) / 180;
  const placeOf = (slot, _timeS, out) =>
    out.set(
      shape.at[0] + (shape.radii[0] + slot.acrossM) * Math.cos(slot.phase + turn),
      depthToWorldY(slot.depthM),
      shape.at[1] + (shape.radii[1] + slot.acrossM) * Math.sin(slot.phase + turn)
    );
  const { inside } = seen('home', 0, FAR_BLOOM, placeOf);
  const xs = inside.map((one) => one.sx);
  console.log(
    `${label}: ${inside.length} of ${COUNT} in Home's frame` +
      (inside.length > 0 ? `, x ${fmt(Math.min(...xs))}..${fmt(Math.max(...xs))}` : '')
  );
}
console.log(
  `a lantern: ${FAR.SIZE_M} m at most, level ${FAR.LEVEL}; its glow ${FAR.HALO.SIZE_M} m at ${FAR.HALO.LEVEL}`
);
