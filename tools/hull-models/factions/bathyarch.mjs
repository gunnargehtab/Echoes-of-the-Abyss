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
import { THREE, clad, lamp, add, box, cyl, plate, bothSides } from '../kit.mjs';

/** The Klaxon's palette, as the Bulwark's own materials carry it. */
export const ink = {
  hullBlack: () => clad('hull_black', [0.0, 0.01, 0.01], 0.25, 0.85),
  ironGrey: () => clad('iron_grey', [0.26, 0.23, 0.19], 0.32, 0.72),
  oxideRust: () => clad('oxide_rust', [0.05, 0.02, 0.01], 0.1, 0.95),
  hazardAmber: () => clad('hazard_amber', [0.89, 0.45, 0.03], 0.15, 0.6),
  amberLamp: () => lamp('amber_lamp', [0.89, 0.45, 0.03]),
  amberVent: () => lamp('amber_vent', [0.43, 0.19, 0.01]),
  amberFlood: () => lamp('amber_flood', [1.0, 0.63, 0.16]),
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

export { THREE };
