// What the Close eye sees of the manta over one lap (#1867): the numbers
// docs/free-water-slice.md §5, "A manta before the Close eye", prints. Pure
// arithmetic on the constants, after `npm run build:shared`:
//
//   node docs/screenshots/issue-1867/glide.mjs
//
// The pose is freeWaterDecoration.ts `decorationPose`'s and the bank
// `decorationMatrix`'s: a loop clockwise seen from above, the centre to
// starboard, a positive roll lowering the starboard wing into the turn.
import { FREE_WATER_HIGH_LIFE } from '../../../packages/shared/dist/index.js';

const DEPTH_VISUAL_M_PER_M = 0.22; // perspectiveTerrain.ts
const FOV_DEG = 40; // readability.ts CONN_FOV_DEG
const VIEW_H = 1080;
const pxPerTan = VIEW_H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
// docs/screenshots/issue-1799/README.md, Cameras: the focus, the dolly, yaw
// and pitch in degrees, the focus depth. An eye is `dolly` back from its
// focus along the view.
const eyeOf = ([fx, fz, dolly, yawDeg, pitchDeg, depthM]) => {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const flat = dolly * Math.cos(pitch);
  return {
    x: fx + Math.sin(yaw) * flat,
    z: fz + Math.cos(yaw) * flat,
    y: -depthM * DEPTH_VISUAL_M_PER_M + dolly * Math.sin(pitch),
  };
};
const CLOSE = eyeOf([542, 1958, 420, -60, 2, 300]);
const HOME = eyeOf([709, 1710, 1200, -34, 15, 300]);

const { at, startDeg, MOTION } = FREE_WATER_HIGH_LIFE.MANTA;
const SPAN_M = 18;
const bank = (MOTION.bankDeg * Math.PI) / 180;

const poseAt = (phase) => {
  const x = at[0] + Math.cos(phase) * MOTION.radiusM;
  const z = at[1] + Math.sin(phase) * MOTION.radiusM;
  const depthM = MOTION.depthM + Math.sin(phase) * MOTION.depthSwingM;
  // The heading is the loop's tangent; the belly looks down, rolled away
  // from the loop's centre by the bank.
  const out = [Math.cos(phase), 0, Math.sin(phase)];
  const belly = [out[0] * Math.sin(bank), -Math.cos(bank), out[2] * Math.sin(bank)];
  return { x, z, y: -depthM * DEPTH_VISUAL_M_PER_M, depthM, belly };
};
const seenFrom = (eye, pose) => {
  const to = [eye.x - pose.x, eye.y - pose.y, eye.z - pose.z];
  const range = Math.hypot(...to);
  const share = (to[0] * pose.belly[0] + to[1] * pose.belly[1] + to[2] * pose.belly[2]) / range;
  return { range, flat: Math.hypot(to[0], to[2]), up: -to[1], share };
};

const fmt = (n, d = 1) => n.toFixed(d);
console.log(
  `Close eye ${fmt(CLOSE.x)} / ${fmt(CLOSE.z)}, ${fmt(-CLOSE.y / DEPTH_VISUAL_M_PER_M)} m deep`
);
console.log(`loop centre to the Close eye: ${fmt(Math.hypot(at[0] - CLOSE.x, at[1] - CLOSE.z))} m`);
const fry = FREE_WATER_HIGH_LIFE.FRY_STREAM.at;
console.log(
  `loop centre to the fry stream's: ${fmt(Math.hypot(at[0] - fry[0], at[1] - fry[1]))} m`
);
for (const [x, z] of FREE_WATER_HIGH_LIFE.JELLIES.SLOTS) {
  const d = Math.hypot(at[0] - x, at[1] - z);
  console.log(
    `jelly loop ${x} / ${z}: centre ${fmt(d)} m from the manta's, ${fmt(Math.abs(d - MOTION.radiusM))} m from its path`
  );
}

const near = Math.atan2(CLOSE.z - at[1], CLOSE.x - at[0]);
const report = (label, phase) => {
  const pose = poseAt(phase);
  const seen = seenFrom(CLOSE, pose);
  console.log(
    `${label}: phase ${fmt((phase * 180) / Math.PI)} deg, ${fmt(seen.flat)} m out (${fmt(seen.range)} slant), ` +
      `${fmt(pose.depthM)} m deep, ${fmt(seen.up)} m of drawn height over the eye, ` +
      `looked up at ${fmt((Math.atan2(seen.up, seen.flat) * 180) / Math.PI)} deg, belly share ${fmt(seen.share, 2)}, ` +
      `span ${fmt((SPAN_M / seen.range) * pxPerTan, 0)} px broadside`
  );
};
report('near point', near);
report('start', (startDeg * Math.PI) / 180);
// What a level body and the rim ray's bank would show at the near point.
for (const deg of [0, 30]) {
  const b = (deg * Math.PI) / 180;
  const pose = poseAt(near);
  const out = [Math.cos(near), 0, Math.sin(near)];
  pose.belly = [out[0] * Math.sin(b), -Math.cos(b), out[2] * Math.sin(b)];
  console.log(`  a bank of ${deg} deg there shows ${fmt(seenFrom(CLOSE, pose).share, 2)}`);
}

// The lap, a second at a time.
let shown = 0;
let far = 0;
let homeRange = [Infinity, 0];
let depth = [Infinity, 0];
const reach = (SPAN_M / 2) * Math.sin(bank);
for (let t = 0; t < MOTION.periodS; t++) {
  const phase = (startDeg * Math.PI) / 180 + (t / MOTION.periodS) * 2 * Math.PI;
  const pose = poseAt(phase);
  const seen = seenFrom(CLOSE, pose);
  if (seen.share >= 0.5) shown++;
  far = Math.max(far, seen.flat);
  const home = seenFrom(HOME, pose).range;
  homeRange = [Math.min(homeRange[0], home), Math.max(homeRange[1], home)];
  depth = [
    Math.min(depth[0], pose.depthM - reach / DEPTH_VISUAL_M_PER_M),
    Math.max(depth[1], pose.depthM + reach / DEPTH_VISUAL_M_PER_M),
  ];
}
console.log(
  `the Close eye sees half the plan or more for ${shown} s of the ${MOTION.periodS} s lap; farthest ${fmt(far)} m`
);
console.log(
  `wingtips ${fmt(reach)} m of drawn height off the axis: the body spans ${fmt(depth[0], 0)} to ${fmt(depth[1], 0)} m deep`
);
console.log(
  `from Home's eye ${fmt(homeRange[0], 0)} to ${fmt(homeRange[1], 0)} m: ` +
    `${fmt((SPAN_M / homeRange[1]) * pxPerTan, 0)} to ${fmt((SPAN_M / homeRange[0]) * pxPerTan, 0)} px`
);
