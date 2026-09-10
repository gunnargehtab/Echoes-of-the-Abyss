/**
 * The Bathyarch Consortium — the Klaxon's shape language.
 *
 * "Boxy, riveted, over-engineered rectangles and cylinders; no curve unless a
 * pressure vessel demanded it. Visibly patchworked repairs, older armour showing
 * through newer plate" (docs/asset-prompts-3d.md, Block 2).
 *
 * The vocabulary is read off the Bulwark and the Tender, whose node names are
 * the parts list:
 *
 *   Bulwark   hull_slab · armour_tier_1..3 · flank_plate_p0..p3 · flank_seam_p
 *   Tender    hull_lower · deck · strake_p/s · ballast_p · ballast_cap_pf/pa
 *             workshop · workshop_roof
 *
 * Where the Order is a spar with wings, the Klaxon is a **slab with plate on
 * it** — a flat-sided box that carries its beam in the body, patched in tiers.
 * That is the one place these two modules disagree by design, and it is why the
 * silhouette rule for one navy is the failure mode for the other.
 *
 * Light is machinery light: louvres, stack throats, deck floods, lit gratings —
 * and it goes on *upward* faces, because the maps are top-down (see kit.mjs).
 */
import { THREE, clad, lamp, hex, add, box, cyl, torus, plate, bothSides } from '../kit.mjs';

/**
 * The Klaxon's palette, as the Bulwark's own materials carry it: the four
 * tokens of docs/art-direction.md, and — where the approved model needed a
 * colour the docs do not name — that model's own hex, exactly (kit.mjs `hex`).
 * The vent is the amber banked down, the flood is it thrown wide open.
 */
export const ink = {
  hullBlack: () => clad('hull_black', hex('#0E1418'), 0.25, 0.85),
  ironGrey: () => clad('iron_grey', hex('#8C8378'), 0.32, 0.72),
  oxideRust: () => clad('oxide_rust', hex('#3D2B1F'), 0.1, 0.95),
  hazardAmber: () => clad('hazard_amber', hex('#F2B233'), 0.15, 0.6),
  amberLamp: () => lamp('amber_lamp', hex('#F2B233'), hex('#1A1408')),
  amberVent: () => lamp('amber_vent', hex('#B07A1E'), hex('#120E06')),
  amberFlood: () => lamp('amber_flood', hex('#FFD070'), hex('#2A2210')),
};

/** The body: a flat-sided slab from a plan outline, with a bow face and transom. */
export function hullSlab(root, { black, grey, amber }, { outline, lengthM, depth, bow, stern }) {
  add(
    root,
    'hull_slab',
    plate(
      outline.map(([x, y]) => [x * lengthM, y * lengthM]),
      depth
    ),
    black,
    [0, -depth / 2, 0]
  );
  add(root, 'bow_plate', box(2.5, depth * 0.8, 22), grey, [bow - 2, 0, 0]);
  add(root, 'rubbing_strake', box(1.2, 1.4, 24.5), amber, [bow - 0.8, 1.5, 0]);
  add(root, 'transom_plate', box(2, depth * 0.85, 30), grey, [stern + 1.3, -0.5, 0]);
}

/** Patchworked flank plate, older under newer, with its seam and rivet rows. */
export function flankPlates(root, { grey, rust }, { z, plates, seamLength, rivets }) {
  bothSides((side, sgn) => {
    plates.forEach(([x, len, h, y, old], i) =>
      add(root, `flank_plate_${side}${i}`, box(len, h, 1.2), old ? rust : grey, [x, y, sgn * z])
    );
    add(root, `flank_seam_${side}`, box(seamLength, 0.5, 1.4), rust, [0, 2.2, sgn * z]);
    for (const [tag, y] of rivets) {
      for (let i = 0; i < 14; i++) {
        const x = -seamLength / 2 + 4 + ((seamLength - 8) * i) / 13;
        add(root, `rivet_${side}${tag}_${i}`, new THREE.SphereGeometry(0.45, 6, 4), grey, [
          x,
          y,
          sgn * (z + 0.6),
        ]);
      }
    }
  });
}

/** Ballast blisters low on the hull, and the keel under them. */
export function ballastAndKeel(root, { black, rust }, { z, x, length, r, keel }) {
  bothSides((side, sgn) =>
    add(
      root,
      `ballast_${side}`,
      cyl(r, r, length, 10),
      black,
      [x, -4.5, sgn * z],
      [0, 0, Math.PI / 2]
    )
  );
  add(root, 'keel', box(keel.length, 1.5, 2), rust, [keel.x, keel.y, 0]);
}

/** Twin prop tunnels in the transom: a shroud ring and a hub each side. */
export function propTunnels(root, { grey, rust }, { x, z, r }) {
  bothSides((side, sgn) => {
    add(
      root,
      `prop_shroud_${side}`,
      cyl(r, r, 3.6, 14),
      rust,
      [x, -1.5, sgn * z],
      [0, 0, Math.PI / 2]
    );
    add(
      root,
      `prop_hub_${side}`,
      cyl(r * 0.29, r * 0.29, 4, 8),
      grey,
      [x, -1.5, sgn * z],
      [0, 0, Math.PI / 2]
    );
  });
}

/**
 * A riveted machinery house: louvred sides, a lit roof grating, and a stack
 * lit at the throat. The grating is the light that the top-down bake can see —
 * the louvres are vertical faces and contribute nothing to gate 3.
 */
export function machineryHouse(root, { black, grey, rust, amber, vent, flood }, opts) {
  const { x, y, length, height, beam, louvres = 5, gratings = 6, stack } = opts;
  add(root, 'machinery_house', box(length, height, beam), black, [x, y, 0]);
  add(root, 'house_roof', box(length + 1, 1, beam + 1), grey, [x, y + height / 2 + 0.3, 0]);
  for (let i = 0; i < gratings; i++)
    add(root, `roof_grating_${i}`, box(1.6, 0.4, beam * 0.77), vent, [
      x - length * 0.39 + (length * 0.77 * i) / (gratings - 1),
      y + height / 2 + 1,
      0,
    ]);
  bothSides((side, sgn) => {
    for (let i = 0; i < louvres; i++)
      add(root, `louvre_${side}${i}`, box(length * 0.73, 0.7, 0.6), vent, [
        x,
        y - height / 2 + 2.3 + i * 1.6,
        sgn * (beam / 2 + 0.3),
      ]);
  });
  if (stack) {
    add(root, 'stack', cyl(2.4, 2.8, 12, 12), rust, [stack.x, stack.y, stack.z]);
    add(root, 'stack_band', cyl(2.7, 2.7, 1.2, 12), amber, [stack.x, stack.y + 4, stack.z]);
    add(root, 'stack_throat', cyl(2.6, 2.3, 2.0, 12), flood, [stack.x, stack.y + 6.8, stack.z]);
  }
}

/**
 * An open riveted lattice frame carried out over both beams, braced in X, with
 * work floods along the top beams. The Klaxon's answer to "it does not hide".
 */
export function lattice(root, { grey, rust, flood }, { fwd, aft, z, deck, height, floods = 3 }) {
  const top = deck + height;
  const legs = [
    [aft, z],
    [fwd, z],
    [aft, -z],
    [fwd, -z],
  ];
  legs.forEach(([x, lz], i) => {
    add(root, `frame_leg_${i}`, box(1.6, height, 1.6), grey, [x, deck + height / 2, lz]);
    add(root, `frame_foot_${i}`, box(4, 1, 4), rust, [x, deck + 0.5, lz * 0.7]);
  });
  bothSides((side, sgn) => {
    add(root, `frame_beam_${side}`, box(fwd - aft, 1.4, 1.4), grey, [
      (fwd + aft) / 2,
      top,
      sgn * z,
    ]);
    for (let i = 0; i < floods; i++)
      add(root, `work_flood_${side}${i}`, box(4.5, 0.5, 2.2), flood, [
        aft + 2 + ((fwd - aft - 4) * i) / (floods - 1),
        top + 1.2,
        sgn * z,
      ]);
  });
  add(root, 'frame_cross_fwd', box(1.4, 1.4, z * 2), grey, [fwd, top, 0]);
  add(root, 'frame_cross_aft', box(1.4, 1.4, z * 2), grey, [aft, top, 0]);
  return { top, fwd, aft, z, deck };
}

/** An open barbette and a short thick gun — no shield, this navy does not hide. */
export function barbette(root, { black, grey, rust, amber }, { x, deck, r, barrel }) {
  add(root, 'barbette_ring', cyl(r, r * 1.07, 2.2, 16), amber, [x, deck + 0.9, 0]);
  add(root, 'barbette', cyl(r * 0.74, r * 0.74, 3.2, 16), grey, [x, deck + 2.1, 0]);
  add(root, 'gun_cradle', box(7, 3, 6), black, [x + 2, deck + 4.1, 0]);
  add(
    root,
    'barrel',
    cyl(1.6, 1.9, barrel.length, 12),
    grey,
    [barrel.x, deck + 4.7, 0],
    [0, 0, Math.PI / 2]
  );
  add(
    root,
    'muzzle',
    cyl(2.2, 2.2, 1.6, 12),
    rust,
    [barrel.x + barrel.length / 2 + 0.7, deck + 4.7, 0],
    [0, 0, Math.PI / 2]
  );
  add(root, 'deck_scuff', cyl(r * 1.36, r * 1.36, 0.3, 24), rust, [x, deck + 0.2, 0]);
}

/** Deck floods, facing up — the light gate 3 actually measures. */
export function deckFloods(root, lampMat, { deck, spots }) {
  spots.forEach(([x, z], i) =>
    add(root, `deck_flood_${i}`, box(7, 0.6, 2.6), lampMat, [x, deck + 0.4, z])
  );
}

/* --------------------------------------------------------------------------
 * Structures. A settlement is the same architecture grown four ways, so the
 * base / mount / head / barrel family lives here beside the hull vocabulary
 * rather than in any one structure script (#553, off #540 Phase 3).
 *
 * The Klaxon's is the one that does not share the other three's skeleton. Its
 * approved Sentinel Turret is from an earlier authoring pass and speaks a
 * different vocabulary entirely — a bolted raft, a riveted drum, a housing
 * and a glacis where the other navies grow a mound, a collar and a head. The
 * port keeps that, because it *is* the Klaxon's language: "boxy, riveted,
 * over-engineered rectangles and cylinders". A change to what it looks like
 * is a separate PR with its own screenshot (#540).
 * ------------------------------------------------------------------------ */

/**
 * The structure palette: the one fixture a turret needs that no hull did.
 *
 * `amber_lamp` is a navigation light on a moving hull; a static mount carries
 * a work lamp, brighter and warmer, and the approved turret names it. The
 * structures carry their own names rather than a shared dimming factor
 * applied to `ink` — see `structureInk` in factions/hadron.mjs for the
 * argument. The value is the approved turret's own.
 */
export const structureInk = {
  // The approved turret's lamp is amber through and through — its base is the
  // token, not a near-black — so it reads as a fixture in the albedo map too.
  workLamp: () => lamp('work_lamp', hex('#F2B233'), hex('#F2B233'), 0.35),
};

/**
 * The raft: a bolted slab on the seabed with a foot at each corner and a bolt
 * through each foot. Feet are numbered 1..4 from the forward-starboard corner
 * round, which is the approved turret's own order.
 */
export function anchoredRaft(root, { black, rust, grey }, opts) {
  const { at, r, height, foot, bolt } = opts;
  const [cx, cy, cz] = at;
  // Eight-sided rather than square: the approved turret's raft is a faceted
  // drum, and an octagon is what reads as *plate cut and welded* from above.
  add(root, 'base_raft', cyl(r, r, height, 8), black, [cx, cy, cz]);
  const corners = [
    [1, 1, -1],
    [2, 1, 1],
    [3, -1, 1],
    [4, -1, -1],
  ];
  for (const [n, sx, sz] of corners) {
    const fx = cx + sx * foot.inset[0];
    const fz = cz + sz * foot.inset[1];
    // Yawed a quarter turn: the approved turret's feet are plate cut on the
    // diagonal, and a square one reads as a bolted-on box from above.
    add(
      root,
      `anchor_foot_${n}`,
      box(foot.size[0], foot.size[1], foot.size[2]),
      rust,
      [fx, cy - height / 2 + foot.size[1] / 2, fz],
      [0, foot.yaw ?? 0, 0]
    );
    add(root, `anchor_bolt_${n}`, cyl(bolt.r, bolt.r, bolt.height, 6), grey, [
      fx + sx * bolt.offset[0],
      cy - height / 2 + bolt.height / 2,
      fz + sz * bolt.offset[1],
    ]);
  }
}

/**
 * The mount: a drum on the raft, its ring, a rank of rivets round it at a
 * fixed pitch, one patch of older plate showing through, and the feed pipe
 * standing beside it.
 *
 * The rivets are a rank rather than a scatter — the Klaxon repairs in
 * straight lines even when the thing repaired is round.
 */
export function mountDrum(root, { black, grey, rust }, opts) {
  const { at, r, height, ring, rivets, patch, feed } = opts;
  const [cx, cy, cz] = at;
  add(root, 'mount_drum', cyl(r, r * 0.98, height, 10), black, [cx, cy, cz]);
  add(root, 'mount_ring', torus(ring.r, ring.t, 5, 18), grey, [cx, ring.y, cz], [
    Math.PI / 2,
    0,
    0,
  ]);
  for (let i = 0; i < rivets.count; i++) {
    const a = ((rivets.from + (360 / rivets.count) * i) * Math.PI) / 180;
    add(
      root,
      `rivet_${i + 1}`,
      new THREE.SphereGeometry(rivets.r, 6, 5),
      grey,
      [cx + rivets.radius * Math.cos(a), rivets.y, cz + rivets.radius * Math.sin(a)]
    );
  }
  add(root, 'mount_patch', box(patch.size[0], patch.size[1], patch.size[2]), rust, patch.at);
  add(root, 'feed_pipe', cyl(feed.r, feed.r, feed.height, 8), rust, feed.at);
}

/** The housing that trains, its glacis, and the patch riveted over its roof. */
export function turretHouse(root, { black, grey, rust }, { housing, glacis, roofPatch }) {
  add(root, 'turret_housing', box(housing.size[0], housing.size[1], housing.size[2]), black, housing.at);
  add(root, 'turret_glacis', box(glacis.size[0], glacis.size[1], glacis.size[2]), grey, glacis.at);
  add(
    root,
    'turret_roof_patch',
    box(roofPatch.size[0], roofPatch.size[1], roofPatch.size[2]),
    rust,
    roofPatch.at
  );
}

/**
 * A short thick gun on a static mount: breech, barrel, jacket, muzzle brake,
 * the recoil cylinder alongside and the counterweight astern.
 *
 * `brake.at` is given rather than derived from the barrel's run. The approved
 * turret's brake does not sit on its barrel's axis — it stands about 17 m off
 * it in plan — and this is a port, so the offset is carried across rather
 * than quietly corrected. Straightening it changes what the model looks like,
 * which is a separate PR with its own screenshot (#540).
 */
export function heavyBarrel(root, { black, grey, rust }, opts) {
  const { breech, barrel, jacket, brake, recoil, counterweight } = opts;
  add(root, 'barrel_breech', box(breech.size[0], breech.size[1], breech.size[2]), grey, breech.at);
  add(
    root,
    'barrel',
    cyl(barrel.r, barrel.r * 1.1, barrel.to - barrel.from, 8),
    black,
    [(barrel.from + barrel.to) / 2, barrel.y, barrel.z],
    [0, 0, Math.PI / 2]
  );
  add(
    root,
    'barrel_jacket',
    cyl(jacket.r, jacket.r, jacket.to - jacket.from, 8),
    rust,
    [(jacket.from + jacket.to) / 2, barrel.y, barrel.z],
    [0, 0, Math.PI / 2]
  );
  add(root, 'muzzle_brake', cyl(brake.r, brake.r, brake.length, 8), grey, brake.at, [
    0,
    0,
    Math.PI / 2,
  ]);
  add(
    root,
    'recoil_cylinder',
    cyl(recoil.r, recoil.r, recoil.to - recoil.from, 6),
    grey,
    [(recoil.from + recoil.to) / 2, recoil.y, recoil.z],
    [0, 0, Math.PI / 2]
  );
  add(
    root,
    'counterweight',
    box(counterweight.size[0], counterweight.size[1], counterweight.size[2]),
    rust,
    counterweight.at
  );
}

/**
 * The one work lamp on its bracket — the turret's whole resting light budget,
 * flat on an upward face because the maps are top-down (kit.mjs).
 */
export function baseLamp(root, { lampMat, black }, { at, size, bracket }) {
  add(root, 'base_lamp', box(size[0], size[1], size[2]), lampMat, at);
  add(
    root,
    'base_lamp_bracket',
    box(bracket.size[0], bracket.size[1], bracket.size[2]),
    black,
    bracket.at
  );
}

export { THREE };
