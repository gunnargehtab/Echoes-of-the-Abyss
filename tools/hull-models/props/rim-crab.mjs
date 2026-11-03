/**
 * The rim crab — 2 m of footprint across the legs, the garden-floor body
 * docs/free-water-slice.md §5 commissions for #1694's crater fixture
 * (#1711): "`env-rim-crab` | 2 m across | 16 / 400 | Garden floor; slow,
 * closed crawling loops inside its public patch". Public decoration under
 * Block 4's public-microfauna variant of ENV STYLE, not an animal of the
 * bestiary: no SIG, no entity, no collision, nothing lit.
 *
 * "Crater garden floor | env-rim-crab | 2 m | 0.60 m | ≤ 400 | none"
 * (docs/asset-prompts-3d.md, Block 4). Two materials, `carapace` on the
 * shell, the claws and the eyestalks and `stone_dark` on the eight legs;
 * 316 triangles; 0.60 m tall at its 2 m by intake's measure (`sizeM`),
 * which takes `--max-tris 400` for this row and no `--world-light`: the
 * file carries no emissive.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * nodule bed and the kelp stand have none (#1555, #1712). Every number
 * below is drawn from one seeded stream (seabed.mjs `seeded`, seed 1711)
 * in the order the parts are built, so the file is the same on every
 * machine and `npm run check:models` holds the script to it. The whole is
 * built at its own size, centred on its plan, its tips on the ground and
 * held at the footprint before the bake (seabed.mjs `settle`), ×0.9497,
 * so the root is an identity and seabed.mjs `stand` finds ×1.000; the
 * figures below are the nominal ones the stream draws from, and the
 * file's are those times the fit (1.48 m long, 2 m across, 0.60 m tall).
 *
 * What it is made of, and why this shape. The one of the four that stands
 * — "this stands on the seabed" holds for the crab alone (the variant) —
 * on eight legs that climb from under the shell to a knee above its rim and
 * come down to a point on the floor, the arch a spider crab's legs make,
 * which is what reads as crab from the conn camera and not as a stone with
 * legs: the shell is half the span (0.97 of the 2 m in the file) and the
 * legs are the rest of the silhouette.
 * Everything is the swimmers' grammar (seabed.mjs, "The microfauna"): the
 * shell a `shaft` stood on end, each leg and claw arm a shaft along a bent
 * axis, each claw's hand and finger a `blade`. Nothing of the bestiary's
 * classified three — no coil, no jaw, no colossus (bestiary.md §4) — and
 * nothing manufactured. Head on +x: the claws reach forward and the
 * eyestalks rise off the front of the rim.
 *
 * - `carapace`, in `carapace`: a shaft of three ten-cornered rings stood on
 *   end — nominally a lower ring 0.60 by 0.80 m at 0.30 m up, the rim 0.80
 *   by 1.08 m at 0.37, a top ring 0.52 by 0.68 m at 0.49, which the fit and
 *   the corners' push make a shell 0.73 m long by 0.97 across at its widest
 *   in the file — wider across than long,
 *   fanned down to a point under its middle and up to a crown 0.55 m up
 *   set a little forward; every corner pushed in or out by up to 5, 6 and
 *   8 % of its radius and lifted or dropped by up to 1 and 1.5 cm, so the
 *   shell is knuckled rather than turned. 60 triangles.
 * - `leg_p1..p4` / `leg_s1..s4`, in `stone_dark`: eight shafts of three
 *   three-cornered rings, a ridge up, from a hip under the shell's lower
 *   ring — a ring 6 cm in radius, about 10 cm across, half-buried: its top
 *   corner inside the shell, its two lower corners and its flat cap
 *   1.2–3.1 cm under the shell's underside, where nothing above the rim sees
 *   them, as the claw shoulders are (two of four corners inside) and the
 *   eyestalk bases (one or two of four) — out and up to a knee 0.54 m over
 *   the floor and 0.32 m out, down to an ankle 0.26 m further out at
 *   0.26 m, and to a point on the floor 0.12 m beyond, 6 cm in radius at
 *   the hip to 3.5 at the ankle; on bearings 55°, 80°, 105° and 130° from
 *   the head on each side, every reach, height and bearing drawn ±10 %
 *   and ±4°. 16 each, 128 in all; the eight tips are the eight parts on
 *   y = 0 and the two widest are what makes the crab 2 m.
 * - `claw_p` / `claw_s`, in `carapace`: the arms, shafts of three four-
 *   cornered rings from a shoulder under the shell's front, out to an
 *   elbow 0.22 m forward-out and raised, and in to a wrist 0.18 m further
 *   forward turned toward the middle; 20 each. `claw_hand_p` / `_s`, the
 *   propodus with its fixed finger: a six-cornered blade 0.30 m long and
 *   0.11 m deep, 6 cm thick, out of the wrist in a plane turned 25° inward
 *   and tipped to show its broad face to the camera; 20 each.
 *   `claw_finger_p` / `_s`, the dactyl: a four-cornered blade 0.15 m long
 *   hinged through the hand's upper forward corner and held open at 17°;
 *   12 each. The starboard claw is 1.15× the port, as a crab's are.
 * - `eyestalk_p` / `eyestalk_s`, in `carapace`: two shafts of two four-
 *   cornered rings rising forward and up off the rim's front at ±14°,
 *   9 cm long, capped at both ends. 12 each. Dark: no eye that glows.
 *
 * Port is −z. Every leg's hip and every arm's shoulder pierces the shell's
 * underside, each hand roots in its wrist and each finger in its hand —
 * the sweep lists those pairs and nothing else — so nothing floats. The root is
 * `env_rim_crab`, an identity, the plan's box centred on the origin and the
 * eight tips on y = 0.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 2;
const MAX_TRIS = 400;
const SEED = 1711;

const shell = seabed.ground.carapace();
const dark = seabed.ground.stoneDark();

const crab = new THREE.Group();
crab.name = 'env_rim_crab';

const draw = seabed.seeded(SEED);
const rad = (deg) => (deg * Math.PI) / 180;

// --- the shell ------------------------------------------------------------------
// Rings from the underside up: semi-axes along x and z, height, and how far
// a corner may be pushed (of its radius) and lifted (metres).
const SHELL = [
  { a: 0.3, b: 0.4, y: 0.3, push: 0.05, lift: 0.01 },
  { a: 0.4, b: 0.54, y: 0.37, push: 0.06, lift: 0.01 },
  { a: 0.26, b: 0.34, y: 0.49, push: 0.08, lift: 0.015 },
];
const CORNERS = 10;
const rings = SHELL.map(({ a, b, y, push, lift }) =>
  Array.from({ length: CORNERS }, (_, k) => {
    const t = (2 * Math.PI * k) / CORNERS;
    const p = 1 + draw.between(-push, push);
    return [a * p * Math.cos(t), y + draw.between(-lift, lift), b * p * Math.sin(t)];
  })
);
add(crab, 'carapace', seabed.shaft(rings, { start: [0.02, 0.27, 0], end: [0.04, 0.55, 0] }), shell);
/** The lower ring's radius on a bearing, before the push. */
const under = (t) => {
  const { a, b } = SHELL[0];
  return (a * b) / Math.hypot(b * Math.cos(t), a * Math.sin(t));
};

// --- a limb: a shaft of rings along a polyline ---------------------------------------
/**
 * Rings of `sides` corners round each joint of `joints` — `[x, y, z, r]` —
 * all in the vertical plane across `bearing`, a corner straight up on a
 * three-cornered section and the diagonal up on a four, each corner's
 * radius drawn ±8 %; then the shaft from the first joint, capped flat, to
 * `tip`, a point, or capped if none.
 */
function limb(joints, bearing, sides, tip = null) {
  const across = [-Math.sin(bearing), 0, Math.cos(bearing)];
  const rings = joints.map(([x, y, z, r]) =>
    Array.from({ length: sides }, (_, k) => {
      const a = Math.PI / 2 + (2 * Math.PI * k) / sides + (sides === 4 ? Math.PI / 4 : 0);
      const rr = r * (1 + draw.between(-0.08, 0.08));
      return [
        x + across[0] * rr * Math.cos(a),
        y + rr * Math.sin(a),
        z + across[2] * rr * Math.cos(a),
      ];
    })
  );
  return seabed.shaft(rings, { end: tip });
}

// --- the legs ---------------------------------------------------------------------
const LEGS = [55, 80, 105, 130];
const tips = [];
for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
])
  LEGS.forEach((deg, i) => {
    const t = side * rad(deg + draw.between(-4, 4));
    const out = (r) => [r * Math.cos(t), r * Math.sin(t)];
    const hipR = 0.95 * under(t);
    const knee = hipR + 0.32 * draw.between(0.9, 1.1);
    const ankle = knee + 0.26 * draw.between(0.9, 1.1);
    const tipR = ankle + 0.12 * draw.between(0.9, 1.1);
    const kneeY = 0.54 + draw.between(-0.05, 0.05);
    const ankleY = 0.26 + draw.between(-0.04, 0.04);
    const [hx, hz] = out(hipR);
    const [kx, kz] = out(knee);
    const [ax, az] = out(ankle);
    const [tx, tz] = out(tipR);
    const name = `leg_${tag}${i + 1}`;
    add(
      crab,
      name,
      limb(
        [
          [hx, 0.31, hz, 0.06],
          [kx, kneeY, kz, 0.05],
          [ax, ankleY, az, 0.035],
        ],
        t,
        3,
        [tx, 0, tz]
      ),
      dark
    );
    tips.push(name);
  });

// --- the claws ---------------------------------------------------------------------
for (const [tag, side, scale] of [
  ['p', -1, 1],
  ['s', 1, 1.15],
]) {
  const t0 = side * rad(32);
  const sx = 0.95 * under(t0) * Math.cos(t0);
  const sz = 0.95 * under(t0) * Math.sin(t0);
  const t1 = side * rad(45);
  const ex = sx + 0.22 * Math.cos(t1);
  const ez = sz + 0.22 * Math.sin(t1);
  const t2 = -side * rad(10);
  const wx = ex + 0.18 * Math.cos(t2);
  const wz = ez + 0.18 * Math.sin(t2);
  const r = 0.05 * scale;
  add(
    crab,
    `claw_${tag}`,
    limb(
      [
        [sx, 0.33, sz, r],
        [ex, 0.42, ez, r * 0.95],
        [wx, 0.4, wz, r * 0.9],
      ],
      t1,
      4
    ),
    shell
  );
  // The hand: out of the wrist, turned 25° inward, its broad face tipped
  // up toward the camera; the finger hinged through its upper forward
  // corner and open.
  const in25 = -side * rad(25);
  const along = [Math.cos(in25), 0, Math.sin(in25)];
  const span = [0, 0.94, -side * 0.34];
  const hand = (a, b) => [a * scale, b * scale];
  add(
    crab,
    `claw_hand_${tag}`,
    seabed.fin({
      root: [wx, 0.4, wz],
      along,
      span,
      outline: [
        [-0.03, -0.05],
        [0.14, -0.07],
        [0.27, -0.025],
        [0.27, 0],
        [0.12, 0.05],
        [-0.03, 0.04],
      ].map(([a, b]) => hand(a, b)),
      thickness: 0.06 * scale,
    }),
    shell
  );
  add(
    crab,
    `claw_finger_${tag}`,
    seabed.fin({
      root: [wx, 0.4, wz],
      along,
      span,
      outline: [
        [0.11, 0.04],
        [0.26, 0.085],
        [0.25, 0.105],
        [0.12, 0.075],
      ].map(([a, b]) => hand(a, b)),
      thickness: 0.035 * scale,
    }),
    shell
  );
}

// --- the eyestalks -------------------------------------------------------------------
for (const [tag, side] of [
  ['p', -1],
  ['s', 1],
]) {
  const t = side * rad(14);
  const { a, b } = SHELL[1];
  const rimR = (0.9 * a * b) / Math.hypot(b * Math.cos(t), a * Math.sin(t));
  const bx = rimR * Math.cos(t);
  const bz = rimR * Math.sin(t);
  const len = 0.09;
  add(
    crab,
    `eyestalk_${tag}`,
    limb(
      [
        [bx, 0.38, bz, 0.022],
        [bx + len * Math.cos(rad(50)) * Math.cos(t), 0.38 + len * Math.sin(rad(50)), bz + len * Math.cos(rad(50)) * Math.sin(t), 0.018],
      ],
      t,
      4
    ),
    shell
  );
}

// --- the fit, the checks, then out ------------------------------------------------
const fit = seabed.settle(crab, FOOTPRINT);
const { drawn, k } = seabed.stand(crab, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(crab);
const size = new THREE.Box3().setFromObject(crab).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_rim_crab: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('carapace') || !t.materials.has('stone_dark'))
  throw new Error(`env_rim_crab: materials [${[...t.materials]}], not carapace and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_rim_crab: lowest vertex at ${t.lowest}, not on the floor`);
if (t.onFloor.length !== 8 || tips.some((n) => !t.onFloor.includes(n)))
  throw new Error(`env_rim_crab: on the floor [${t.onFloor}], not the eight legs`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(`env_rim_crab: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`);
crab.traverse((o) => {
  if (o.isMesh && o.material.emissive.getHex() !== 0)
    throw new Error(`env_rim_crab: ${o.name} carries an emissive`);
});
console.log(
  `env_rim_crab: ${t.tris} triangles, fit ×${fit.toFixed(4)}, drawn ${drawn.toFixed(4)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}), ` +
    `${size.x.toFixed(2)} long by ${size.z.toFixed(2)} across by ${size.y.toFixed(2)} m tall, materials ${[...t.materials].join(' + ')}, on the floor: ${t.onFloor.join(', ')}`
);
await exportGlb(crab, 'env-rim-crab.glb');
