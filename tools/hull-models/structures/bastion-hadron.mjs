/**
 * The Bastion, Hadron Knights — 440 m of footprint (2 × `radiusM` 220,
 * packages/shared/src/structures.ts), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). The Order's answer is a
 * pressure dome under an apex lantern with `_r`/`_l` everything, and it
 * shares nothing with the other three navies' Bastions, so every builder is
 * `factions/hadron.mjs`'s own.
 *
 * A port of the approved export (docs/concept-art/models/bastion-hadron.glb
 * at f7cce0f), part for part in its order, every number the export's own
 * (#652, off #540 Phase 3). Fifty-eight parts, 3,788 triangles: a sphere of
 * a dome drawn 0.52π down from its pole and pressed to 0.92, a crystal
 * lantern and a lit finial on the pole in four prongs, four mirrored pairs
 * of ribs that are 0.52π of a four-sided ring stood on end and yawed round
 * the dome, an equator band and a plinth band that are full rings, an
 * eight-facet plinth turned an eighth, twelve port lights on one six-by-five
 * orb, two docks each a frame of its own — throat, lip, lit mouth, two fins
 * — four five-sided conduits that are 0.9 rad of a ring, two standpipes with
 * flanges, two capsules of ballast tank, and four mirrored pairs of anchor
 * blades stood off one circle.
 *
 * THE FRAME: an X-long r184 export, 20.90 by 19.34 in plan by the measure
 * the bake takes (intake `rawSize`; three's `Box3.setFromObject`, each
 * part's box through its node — the yawed plinth's overhangs its vertices,
 * and so do the leaned blades'), so nothing goes through `drawn`: every
 * part is placed at the file's own translation, XYZ Euler and scale, and
 * `fitFootprint` holds that 20.90 at 440 m on the root, which is what makes
 * intake report ×1.000, no Z→X rotation, and bake the maps where the
 * approved export's were. The ground is at y = 0, the plinth's foot, as the
 * file has it. `DRAWN` is asserted after the fit, the way `metreTrue`
 * asserts its length, so a mistyped station fails here.
 *
 * One thing about this file's bake is worth knowing before its maps are
 * read. Intake measures the approved export at 20.900000047683715 raw and
 * scales it ×21.052631530915423, and that product lands one ulp over 440
 * (440.00000000000006), which `Math.ceil(size × ppm)` turns into a pixel:
 * the approved intake is 881 px wide at 2 px/m and the shipped structure
 * maps 661 at 1.5, for a model that is 440 m wide. This port carries the
 * same root scale, and intake's own rescale of it lands back on 440 exactly
 * (`scaleApplied` 0.9999999999999999, printed ×1.000), so it bakes 880 and
 * 660 wide, one column narrower. The camera frames the same 440 m either
 * way, so the difference is a sub-pixel horizontal resample of the whole
 * map — 0.4994 m a pixel against 0.5000 — not an empty column: on the
 * emissive map the lit span runs 61..819 of 881 before and 61..818 of 880
 * after, 754 of 880 column sums are identical, and gate 3's raw E reads
 * 11.747 against the approved 11.849 (#652 review). None of it is shape
 * (`diff.mjs` below). A root scale one ulp larger
 * (`root.scale.multiplyScalar(1 + Number.EPSILON)`) lands intake's product
 * on 440.00000000000006 again and re-bakes the approved maps, the way
 * structures/vent-tap-hadron.mjs carries intake's tie on a square plan; it
 * is not done here, because it would write intake's rounding into a
 * script, and the 660 px the port bakes is what `ceil(440 × 1.5)` gives
 * every one of its 27 sibling structure maps. The Sounding Spire's product
 * lands on 140 exactly and its maps re-bake byte for byte.
 *
 * SIDES. Every pair is the export's `_r`/`_l` (`hadron.pair`), and the file
 * mirrors them across two planes. The port lights, the x prongs, the
 * conduits, the anchor blades, the standpipes and the ballast tanks mirror
 * across x, the `_r` at +x — which on an unyawed X-long file is the bow
 * axis and neither beam (the conduits' `fore` and `aft` are each other's
 * z-mirror, `fore` toward −z) — except that `anchorBlades` seeds each pair
 * from a bearing, and blades 2 and 3 sit past π/2, so their `_r` lands at
 * −x (−51.6 and −154.3 m) with the `_l` opposite; the pairs still mirror. The four rib pairs mirror across z: every
 * rib `_r` foots at +z, which is starboard (kit.mjs `bothSides`, #642),
 * every `_l` at −z. The two docks are named `starboard` and `port` and sit at +x
 * and −x — `dock_starboard` at x +7.5 with its throat pointing +x,
 * `dock_port` at x −7.5 pointing −x — on the bow axis, where neither #642's
 * relabel rule (port is −z) nor its exception applies by the letter, so the
 * names are carried as the file has them. Nothing is relabelled and nothing
 * is mirrored.
 *
 * ODDITIES kept, because a port is not where a shape gets decided:
 * - each dock's lip is a ring stood edge-on to its throat (no rotation on
 *   its node), not laid round the mouth (`hadron.dockingCollar`);
 * - the ribs are pressed to 0.92 on their own y, which after the quarter
 *   turn is the world's x-z, so a rib is a quarter-ellipse 5.41 out by 6.05
 *   up against a dome 5.99 out by 5.51 up (`hadron.reinforceRibs`);
 * - the `_l` conduits are the `_r` mirrored with the tube's section turned
 *   over — proper rotations, written as parts.mjs decomposes them, (±π,
 *   yaw, roll − π) (`hadron.conduits`);
 * - the two lamps burn at 2.000036651280468 and 2.6000523589720967, the
 *   file's floats, not the 2 and 2.6 they plainly started as (#639 review,
 *   N1);
 * - the z prongs are the x prongs' box turned across and drawn twice, where
 *   the x pair shares one buffer; every rib, conduit, blade and dock part is
 *   its own buffer, and the lights, standpipes, flanges and tanks share one
 *   a pair. As the file has them.
 *
 * `diff.mjs bastion-hadron f7cce0f`: unchanged beyond the root scale and
 * shift — every part is where it was. Light audit: `port_light_0_r` and
 * `port_light_0_l`, the equator pair tucked furthest under the dome's skirt,
 * show under a cell from above and `exportGlb` says so; the approved binary
 * earns the same two, and they stay.
 */
import { THREE, fitFootprint, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 440;
const DRAWN = 20.9;

const alloy = hadron.ink.alloyWhite();
// The two strengths are the approved export's own floats (#639 review, N1).
// The lit crystal is `resonance_crystal_dim`, the turret's fixture, since
// #888: the approved export lit it under the cladding's name
// `resonance_crystal`, over #2A1650 at metalness 0.1, and a name that is a
// cladding on the hulls and a lamp here is two names. The emissive did not
// move, so the strength is the file's. `shadow_indigo` is at the hulls'
// metalness of 0.35 for the same reason; the export had the turret's 0.25.
const crystal = hadron.ink.resonanceCrystalDim(2.000036651280468);
const glow = hadron.ink.crystalGlow(2.6000523589720967);
const shadow = hadron.ink.shadowIndigo();
const steel = hadron.ink.darkSteel();

const root = new THREE.Group();
root.name = 'bastion_hadron';

// The dome's seat: every part that climbs it — dome, ribs, conduits — sits
// on this node height and carries this press.
const dome = { at: [0, 1.9, 0], scale: [1, 0.92, 1] };

// The dome, 0.52π of a sphere, its lantern and finial, and the four prongs.
hadron.pressureDome(
  root,
  { alloy, crystal, glow, shadow },
  {
    dome: { r: 6, segments: [12, 6], theta: Math.PI * 0.52, ...dome },
    lantern: { r: 1.15, at: [0, 8.12, 0], scale: [0.8, 1.6, 0.8] },
    finial: { r: 0.4, at: [0, 9.72, 0], scale: [0.55, 1.8, 0.55] },
    prongs: { size: [0.18, 2.4, 0.32], y: 8.12, reach: 0.85, splay: 0.12 },
  }
);

// Four pairs of ribs, 0.52π of a ring each, yawed round the dome.
hadron.reinforceRibs(
  root,
  { alloy, shadow },
  {
    r: 5.88,
    t: 0.17,
    radial: 4,
    tubular: 18,
    angle: Math.PI * 0.52,
    yaws: [0.35, 1.05, 2.09, 2.79],
    ...dome,
  }
);

// The equator band, the plinth and its band.
hadron.ring(root, 'equator_band', steel, {
  r: 5.94,
  t: 0.22,
  radial: 4,
  tubular: 24,
  at: [0, 2.5, 0],
});
hadron.plinth(root, 'plinth', steel, { rTop: 6.7, r: 7.4, h: 1.2, y: 0.6 });
hadron.ring(root, 'plinth_band', alloy, {
  r: 6.8,
  t: 0.15,
  radial: 5,
  tubular: 24,
  at: [0, 1.25, 0],
});

// Twelve port lights — "sustained glow from ports" — three pairs on the
// equator and three up the dome.
hadron.lightPairs(root, glow, {
  name: 'port_light',
  r: 0.12,
  at: [
    [5.7, 2.5, 1.6],
    [4.9, 2.5, 3.4],
    [5.95, 2.5, -0.9],
    [3.9, 5.5, 2.2],
    [4.6, 4.8, -1.8],
    [2.2, 7, 0.6],
  ],
});

// The two docks, `starboard` at +x and `port` at −x (see the header), each
// rolled so its throat points outboard.
for (const [name, x, roll] of [
  ['starboard', 7.5, -Math.PI / 2],
  ['port', -7.5, Math.PI / 2],
])
  hadron.dockingCollar(
    root,
    { alloy, shadow, crystal },
    {
      name,
      at: [x, 1.8, 0],
      roll,
      throat: { rTop: 1.3, r: 1.7, h: 2.6 },
      lip: { r: 1.38, t: 0.22, y: 1.35 },
      mouth: { r: 1, t: 0.18, y: 1.4 },
      fins: { r: 0.18, length: 1.5, y: 0.5, z: 1.85, cant: 0.4 },
    }
  );

// Four conduits, 0.9 rad of a five-sided ring each, laid over the dome's crown.
hadron.conduits(root, steel, {
  r: 5.4,
  t: 0.14,
  radial: 5,
  tubular: 14,
  angle: 0.9,
  lean: Math.PI / 2 - 0.55,
  at: [0, 1.6, 0],
  scale: dome.scale,
});

// The standpipes with their flanges, and the ballast tanks, abaft.
hadron.standpipes(
  root,
  { steel, shadow },
  {
    at: [5.2, 1.6, -4.2],
    pipe: { rTop: 0.2, r: 0.24, h: 3.2 },
    flange: { r: 0.27, t: 0.06, radial: 5, tubular: 10, y: 2.6 },
  }
);
hadron.ballastTanks(root, steel, { r: 0.7, waist: 1.9, at: [2.6, 1.15, -6.4] });

// Four pairs of anchor blades stood off one circle round the plinth's foot.
hadron.anchorBlades(
  root,
  { shadow, alloy },
  {
    r: 0.3,
    length: 2.1,
    anchor: [7.3, 0.6],
    lift: 0.5,
    seat: 0.8,
    bearings: [0.45, 1.35, 1.9, 2.75],
  }
);

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-3 || size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} × ${size.z.toFixed(4)}; the header says ${DRAWN} X-long`
  );
await exportGlb(root, 'bastion-hadron.glb');
