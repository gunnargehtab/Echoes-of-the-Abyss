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
import {
  THREE,
  clad,
  lamp,
  hex,
  add,
  box,
  cyl,
  torus,
  plate,
  plan,
  bothSides,
  polar,
  part,
  drawn,
  group,
  flanks,
  pointLight,
} from '../kit.mjs';

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

/**
 * Patchworked flank plate, older under newer, with its seam and rivet rows.
 *
 * The Derrick's flank is the default: 1.2 m plate, the seam a 0.5 × 1.4 m bar
 * at y 2.2 on the plates' own z, and a rivet row per `rivets` entry. The
 * Bulwark's is the same family in a heavier gauge — `plateT` 2.4 and the seam
 * given outright as `{ y, h, t, z }` — and carries no rivets *here*: its
 * sixty-four are `rivetRows` at the tail of the file, where the approved
 * export put them (#587).
 */
export function flankPlates(root, { grey, rust }, opts) {
  const { z, plates, plateT = 1.2, seamLength, seam = {}, rivets = [] } = opts;
  const { y: seamY = 2.2, h: seamH = 0.5, t: seamT = 1.4, z: seamZ = z } = seam;
  bothSides((side, sgn) => {
    plates.forEach(([x, len, h, y, old], i) =>
      add(root, `flank_plate_${side}${i}`, box(len, h, plateT), old ? rust : grey, [x, y, sgn * z])
    );
    add(root, `flank_seam_${side}`, box(seamLength, seamH, seamT), rust, [0, seamY, sgn * seamZ]);
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
 * The Bulwark's and the Tender's own families (#587). The builders above
 * were read off those two hulls and written down; these were built *against*
 * them, part for part, and every one takes the approved model's numbers as
 * parameters rather than carrying them as defaults, so the Freighter, the
 * Caisson and the Baffle Barge can call the same vocabulary with their own.
 *
 * Positions are `at: [x, y, z]` in metres and boxes are `size: [x, y, z]`;
 * anything built a side takes scalar `x, y, z` and mirrors z. Facet counts
 * are the two hulls' own, and they agree: a pressure vessel or a prop shroud
 * is a twelve-facet drum, a stack or a gun ten, a pipe eight, a fall six.
 * ------------------------------------------------------------------------ */

/**
 * The armoured body: the slab, then the tiers stepped up it (the Bulwark's
 * `hull_slab · armour_tier_1..3`). Each is a plan outline in absolute
 * metres, cut `depth` thick and centred on `y` (kit.mjs `plan`). The slab's
 * rim carries a chamfer, `bevel`, so the caps sit at the outline and the
 * waist a bevel proud of it; the tiers are square-edged. A tier is new
 * `grey` plate unless it names `'black'` — the hull's own, showing through
 * where an older tier was never replated.
 */
export function armouredSlab(root, mats, { slab, tiers }) {
  add(root, 'hull_slab', plan(slab.outline, slab.depth, slab.bevel ?? 0), mats.black, [
    0,
    slab.y,
    0,
  ]);
  tiers.forEach((t, i) =>
    add(root, `armour_tier_${i + 1}`, plan(t.outline, t.depth), mats[t.mat ?? 'grey'], [0, t.y, 0])
  );
}

/**
 * The ram: a plough plate driven out past the slab — a chamfered plan like
 * the slab, so it reads as one casting rather than a box on a box — a rank
 * of teeth across its face and the hazard band painted behind them (the
 * Bulwark's `ram_plate · ram_tooth_0..4 · bow_band`).
 */
export function ramBow(root, { grey, rust, amber }, { plough, teeth, band }) {
  add(root, 'ram_plate', plan(plough.outline, plough.depth, plough.bevel ?? 0), grey, [
    0,
    plough.y,
    0,
  ]);
  teeth.z.forEach((z, i) =>
    add(root, `ram_tooth_${i}`, box(...teeth.size), rust, [teeth.x, teeth.y, z])
  );
  add(root, 'bow_band', box(...band.size), amber, band.at);
}

/**
 * The forward twin turret: the ring it trains on, the drum drawn in toward
 * its top, the face plate and the hatch, then a barrel and its muzzle collar
 * a side, starboard first (the Bulwark's `turret_ring … muzzle_p`). The barrels
 * lie along +X and taper from `r` at the breech to `rMuzzle` at the mouth —
 * a cylinder's top lands on −X once it is rolled onto its side, so the
 * breech radius is the geometry's `rTop`.
 */
export function twinTurret(root, { black, grey, rust, amber }, opts) {
  const { x, ring, drum, face, hatch, barrel } = opts;
  add(root, 'turret_ring', cyl(ring.r, ring.r, ring.h, 16), rust, [x, ring.y, 0]);
  add(root, 'turret', cyl(drum.rTop, drum.r, drum.h, 12), black, [x, drum.y, 0]);
  add(root, 'turret_face', box(...face.size), grey, face.at);
  add(root, 'turret_hatch', box(...hatch.size), amber, hatch.at);
  bothSides((side, sgn) => {
    add(
      root,
      `barrel_${side}`,
      cyl(barrel.r, barrel.rMuzzle, barrel.length, 10),
      grey,
      [barrel.x, barrel.y, sgn * barrel.z],
      [0, 0, Math.PI / 2]
    );
    add(
      root,
      `muzzle_${side}`,
      cyl(barrel.muzzle.r, barrel.muzzle.r, barrel.muzzle.length, 10),
      rust,
      [barrel.muzzle.x, barrel.y, sgn * barrel.z],
      [0, 0, Math.PI / 2]
    );
  });
}

/**
 * The bridge citadel aft: the block, the top it carries, the visor plate on
 * its forward face, a rank of lit ports along each flank, and the bridge
 * ports across the top's forward face (the Bulwark's `citadel …
 * bridge_port_3`). The ports are lamps on vertical faces, which the top-down
 * bake barely sees — they are the citadel's resting light, not its floods.
 */
export function citadel(root, { black, grey, rust, lampM }, opts) {
  const { block, top, visor, ports, bridgePorts } = opts;
  add(root, 'citadel', box(...block.size), black, block.at);
  add(root, 'citadel_top', box(...top.size), grey, top.at);
  add(root, 'citadel_visor', box(...visor.size), rust, visor.at);
  bothSides((side, sgn) => {
    for (let i = 0; i < ports.count; i++)
      add(root, `citadel_port_${side}${i}`, box(...ports.size), lampM, [
        ports.x + i * ports.pitch,
        ports.y,
        sgn * ports.z,
      ]);
  });
  bridgePorts.z.forEach((z, i) =>
    add(root, `bridge_port_${i}`, box(...bridgePorts.size), lampM, [bridgePorts.x, bridgePorts.y, z])
  );
}

/**
 * A stack — a ten-facet drum standing on Y, drawn in toward the top — and,
 * separately, the hazard band ringed round it. Separate because the two
 * hulls order them differently (the Bulwark each band after its stack, the
 * Tender both stacks and then both bands) and name them differently
 * (`stack_band_0` against `stack_a_band`); the hull script spells both.
 */
export function stack(root, mat, { name, at, r, rTop, height }) {
  add(root, name, cyl(rTop, r, height, 10), mat, at);
}

export function stackBand(root, mat, { name, at, r, h }) {
  add(root, name, cyl(r, r, h, 10), mat, at);
}

/**
 * A rank of engine vents across the transom: lit boxes, numbered
 * (`engine_vent_0..n`). Given `at`, a list of the export's own positions, it
 * is the Cruiser's four through kit.mjs `drawn` — two a side in the quarter,
 * not a rank across the stern (#649).
 */
export function engineVents(root, vent, { x, y, z, size, at }) {
  if (at) {
    at.forEach((p, i) => part(root, `engine_vent_${i}`, box(...size), vent, drawn(p)));
    return;
  }
  z.forEach((vz, i) => add(root, `engine_vent_${i}`, box(...size), vent, [x, y, vz]));
}

/**
 * Floodlit deck: flat lamps laid on the armour tiers (`flood_deck_<tag>`) —
 * the Bulwark's resting light, the loudest in the roster, and every square
 * metre of it on an upward face where gate 3 can count it.
 */
export function floodDecks(root, flood, { patches }) {
  for (const [tag, at, size] of patches) add(root, `flood_deck_${tag}`, box(...size), flood, at);
}

/**
 * The rows of floods along both deck edges: a lit strip the length of the
 * deck and a rank of lamp housings outboard of it, the starboard strip and
 * its lamps before port's (`flood_strip_s · flood_lamp_s0..7 · …`).
 */
export function floodStrips(root, { flood, lampM }, { strip, lamps }) {
  bothSides((side, sgn) => {
    add(root, `flood_strip_${side}`, box(...strip.size), flood, [strip.x, strip.y, sgn * strip.z]);
    for (let i = 0; i < lamps.count; i++)
      add(root, `flood_lamp_${side}${i}`, box(...lamps.size), lampM, [
        lamps.x + i * lamps.pitch,
        lamps.y,
        sgn * lamps.z,
      ]);
  });
}

/**
 * Ballast blisters low on both flanks — a twelve-facet drum along X a side
 * — with what the hull hangs on each: end caps (the Tender's
 * `ballast_cap_pf/pa`, fore then aft), a keel skid under it and a pipe run
 * above it (the Bulwark's `keel_skid_p · pipe_p`). Written as a whole
 * starboard group then a whole port group — +z first, which is how both
 * approved files order them; the names turned round with #642.
 * `ballastAndKeel` above is the Derrick's lighter pair with one
 * keel on the centreline; this exists because neither of these hulls has
 * that keel.
 */
export function ballastBlisters(root, { grey, rust }, opts) {
  const { x, y, z, r, length, caps, skid, pipe } = opts;
  const onX = [0, 0, Math.PI / 2];
  bothSides((side, sgn) => {
    add(root, `ballast_${side}`, cyl(r, r, length, 12), grey, [x, y, sgn * z], onX);
    // The caps are nose cones, not drums: each tapers from the blister's radius
    // to `caps.tipR` away from the hull, so the fore cap's small end faces +X
    // and the aft cap's -X. A drum has the same bounds and the same triangle
    // count as the frustum, which is how the first port shipped one past
    // every gate (#587 review, F1); diff.mjs now compares surface area too.
    if (caps) {
      const tipR = caps.tipR ?? r;
      for (const [end, cx, rTop, rBottom] of [
        ['f', caps.fore, r, tipR],
        ['a', caps.aft, tipR, r],
      ])
        add(
          root,
          `ballast_cap_${side}${end}`,
          cyl(rTop, rBottom, caps.length, 12),
          rust,
          [cx, y, sgn * z],
          onX
        );
    }
    if (skid) add(root, `keel_skid_${side}`, box(...skid.size), rust, [skid.x, skid.y, sgn * skid.z]);
    if (pipe)
      add(
        root,
        `pipe_${side}`,
        cyl(pipe.r, pipe.r, pipe.length, 8),
        rust,
        [pipe.x, pipe.y, sgn * pipe.z],
        onX
      );
  });
}

/** A riser: an eight-facet pipe standing on Y, named by the caller (`pipe_riser_a`, `pump_riser`). */
export function riser(root, rust, { name, at, r, h }) {
  add(root, name, cyl(r, r, h, 8), rust, at);
}

/**
 * One prop tunnel in the transom: a twelve-facet shroud ring on X with an
 * eight-facet hub through it and — where the hull shows its screw — blade
 * plates on the hub a half-turn apart between them, and the engine vent
 * beside it. Named by the caller: the Tender has one a side
 * (`prop_shroud_p`), the Bulwark a rank of three (`prop_shroud_0..2`).
 * `propTunnels` above is the Derrick's pair in one call; this is the single
 * tunnel the other two hulls compose.
 */
export function propTunnel(root, { grey, black, vent }, opts) {
  const { name, at, r, length, hub, blades, vent: ev } = opts;
  const onX = [0, 0, Math.PI / 2];
  add(root, `prop_shroud_${name}`, cyl(r, r, length, 12), grey, at, onX);
  add(root, `prop_hub_${name}`, cyl(hub.r, hub.r, hub.length, 8), black, at, onX);
  if (blades)
    for (let i = 0; i < blades.count; i++)
      add(
        root,
        `prop_blade_${name}${i}`,
        box(...blades.size),
        grey,
        [at[0] + blades.dx, at[1], at[2]],
        [(i * Math.PI) / blades.count, 0, 0]
      );
  if (ev) add(root, `engine_vent_${name}`, box(...ev.size), vent, ev.at);
}

/** The rudder: one plate on the centreline astern of the screws. */
export function rudder(root, grey, { at, size }) {
  add(root, 'rudder', box(...size), grey, at);
}

/**
 * A row of rivet heads along each flank — `count` of them spread over
 * `[from, to]` at mid-cell, starboard row then port row, each a box.
 *
 * Numbered by their index in the file, not from zero: the approved exports
 * named each rivet by the running part count, so the Bulwark's run
 * `rivet_96 … rivet_159` and the Tender's `rivet_72 … rivet_99`, and
 * check.mjs holds those names. `numberFrom` is that count and defaults to
 * the root's own child count, which is exactly what the approved files did.
 */
export function rivetRows(root, mat, opts) {
  const { from, to, count, y, z, size, numberFrom = root.children.length } = opts;
  let n = numberFrom;
  bothSides((side, sgn) => {
    for (let i = 0; i < count; i++) {
      const x = from + ((to - from) * (i + 0.5)) / count;
      add(root, `rivet_${n++}`, box(...size), mat, [x, y, sgn * z]);
    }
  });
}

/** The bow stencil, painted flat on the foredeck, and the bow lamp — separate, because the two hulls write them in opposite orders. */
export function bowStencil(root, amber, { at, size }) {
  add(root, 'stencil_bow', box(...size), amber, at);
}

export function bowLamp(root, lampM, { at, size }) {
  add(root, 'bow_lamp', box(...size), lampM, at);
}

/**
 * The Tender's body (`hull_lower · deck · strake_p/s`): a chamfered plan
 * with the stern notched between the prop tunnels, the deck plate laid on
 * it a metre or two inside its rim, and a rubbing strake along each flank.
 * `hullSlab` above is the Derrick's — square-edged, with a bow plate and a
 * transom of its own — and this is the working box hull the prompt
 * describes, which has neither.
 */
export function boxHull(root, { black, grey, rust }, { hull, deck, strakes }) {
  add(root, 'hull_lower', plan(hull.outline, hull.depth, hull.bevel ?? 0), black, [0, hull.y, 0]);
  add(root, 'deck', plan(deck.outline, deck.depth), grey, [0, deck.y, 0]);
  bothSides((side, sgn) =>
    add(root, `strake_${side}`, box(...strakes.size), rust, [strakes.x, strakes.y, sgn * strakes.z])
  );
}

/**
 * The riveted workshop deckhouse amidships (`workshop … roof_skylight`): the
 * house, its roof and ridge, one patch of repair a side — older plate to
 * starboard and newer to port, and not the same size, because the Klaxon
 * repairs what broke rather than what would match — the hazard band under
 * the eaves, a rank of lit ports a side, and the skylight in the roof, which
 * is the one of those lights the top-down bake can see. `machineryHouse`
 * above is the Derrick's louvred engine house; a workshop carries a
 * workshop's fittings.
 */
export function workshop(root, { black, grey, rust, amber, lampM, vent }, opts) {
  const { house, roof, ridge, patches, band, ports, skylight } = opts;
  add(root, 'workshop', box(...house.size), black, house.at);
  add(root, 'workshop_roof', box(...roof.size), grey, roof.at);
  add(root, 'workshop_ridge', box(...ridge.size), rust, ridge.at);
  for (const side of ['s', 'p']) {
    const patch = patches[side];
    add(root, `workshop_patch_${side}`, box(...patch.size), patch.old ? rust : grey, patch.at);
  }
  add(root, 'hazard_band', box(...band.size), amber, band.at);
  bothSides((side, sgn) => {
    for (let i = 0; i < ports.count; i++)
      add(root, `port_${side}${i}`, box(...ports.size), lampM, [
        ports.x + i * ports.pitch,
        ports.y,
        sgn * ports.z,
      ]);
  });
  add(root, 'roof_skylight', box(...skylight.size), vent, skylight.at);
}

/**
 * The open work deck forward (`work_deck · weld_bay_p/s · hull_plate_in_repair`):
 * a plate laid on the deck, a lit welding bay each side of the centreline,
 * and the job in hand between them — the light that is the Tender's +12
 * while welding, and the whole of its glow forward.
 */
export function workDeck(root, { black, flood, rust }, { deck, bays, job }) {
  add(root, 'work_deck', box(...deck.size), black, deck.at);
  bothSides((side, sgn) =>
    add(root, `weld_bay_${side}`, box(...bays.size), flood, [bays.x, bays.y, sgn * bays.z])
  );
  add(root, 'hull_plate_in_repair', box(...job.size), rust, job.at);
}

/**
 * A derrick a side over the work deck (`derrick_mast_s … derrick_floodlamp_s`,
 * then port): a tapered mast standing on the deck with a hazard-amber
 * head, the boom — a tube tapering to its tip — swung up `pitch` and in
 * `yaw` toward the centreline, the fall hanging plumb to its hook, and a
 * flood lamp on the head looking down at the work. The Caisson and the
 * Baffle Barge are the same navy's lifting gear.
 *
 * The boom is placed by its centre under Euler (0, ±yaw, pitch − π/2): laid
 * along +X, raised, then swung inboard — the approved rig's own frame, which
 * is why its eight facets land where they do. The tip is the geometry's top.
 */
export function derrickRig(root, { grey, amber, black, lampM }, opts) {
  const { mast, head, boom, fall, hook, lamp: flood } = opts;
  bothSides((side, sgn) => {
    add(root, `derrick_mast_${side}`, cyl(mast.rTop, mast.r, mast.height, 8), grey, [
      mast.x,
      mast.y,
      sgn * mast.z,
    ]);
    add(root, `derrick_head_${side}`, box(...head.size), amber, [mast.x, head.y, sgn * mast.z]);
    add(
      root,
      `derrick_boom_${side}`,
      cyl(boom.rTip, boom.r, boom.length, 8),
      grey,
      [boom.x, boom.y, sgn * boom.z],
      [0, sgn * boom.yaw, boom.pitch - Math.PI / 2]
    );
    add(root, `derrick_cable_${side}`, cyl(fall.r, fall.r, fall.length, 6), black, [
      fall.x,
      fall.y,
      sgn * fall.z,
    ]);
    add(root, `derrick_hook_${side}`, box(...hook.size), amber, [fall.x, hook.y, sgn * fall.z]);
    add(root, `derrick_floodlamp_${side}`, box(...flood.size), lampM, [
      flood.x,
      flood.y,
      sgn * flood.z,
    ]);
  });
}

/**
 * The spare-plate rack: plates stacked on the deck, each narrower than the
 * one under it, older plate between newer (`spare_plate_0..n`), each given
 * as `[y, size, old]`.
 */
export function spareRack(root, { grey, rust }, { x, z, plates }) {
  plates.forEach(([y, size, old], i) =>
    add(root, `spare_plate_${i}`, box(...size), old ? rust : grey, [x, y, z])
  );
}

/** Gas bottles in a rank on the deck: eight-facet cylinders `pitch` apart (`gas_bottle_0..n`). */
export function gasBottles(root, amber, { x, y, z, count, pitch, r, h }) {
  for (let i = 0; i < count; i++)
    add(root, `gas_bottle_${i}`, cyl(r, r, h, 8), amber, [x + i * pitch, y, z]);
}

/** A pipe run along each side of the deck (`pipe_run_p/s`): an eight-facet tube on X. */
export function pipeRuns(root, rust, { x, y, z, r, length }) {
  bothSides((side, sgn) =>
    add(root, `pipe_run_${side}`, cyl(r, r, length, 8), rust, [x, y, sgn * z], [0, 0, Math.PI / 2])
  );
}

/** The pump house and the riser standing out of it (`pump_house · pump_riser`). */
export function pumpHouse(root, { grey, rust }, { house, riser: up }) {
  add(root, 'pump_house', box(...house.size), grey, house.at);
  riser(root, rust, { name: 'pump_riser', ...up });
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
 * The structure palette: the one fixture a turret needs that no hull did, and
 * the turret's own three claddings.
 *
 * `amber_lamp` is a navigation light on a moving hull; a static mount carries
 * a work lamp, brighter and warmer, and the approved turret names it. The
 * structures carry their own names rather than a shared dimming factor
 * applied to `ink` — see `structureInk` in factions/hadron.mjs for the
 * argument. The values are the approved turret's own: its plate is the
 * Bulwark's to the hex but not to the value — a shade more metal and a good
 * deal less rough, the black 0.3/0.45 against `ink`'s 0.25/0.85 — and its
 * lamp burns at an emissive strength of 2.4 (`intensity`; the default of 1
 * writes no strength, as before) (#639).
 */
export const structureInk = {
  hullBlack: () => clad('hull_black', hex('#0E1418'), 0.3, 0.45),
  ironGrey: () => clad('iron_grey', hex('#8C8378'), 0.3, 0.52),
  oxideRust: () => clad('oxide_rust', hex('#3D2B1F'), 0.1, 0.75),
  // The approved turret's lamp is amber through and through — its base is the
  // token, not a near-black — so it reads as a fixture in the albedo map too.
  workLamp: (intensity = 1) =>
    lamp('work_lamp', hex('#F2B233'), hex('#F2B233'), 0.35, intensity),
};

/**
 * The heat exchanger on the end of a Vent Tap's draw arm, on `bearing`
 * (#608): a black box with five iron fins through it, the hazard band round
 * its roof, a stack behind it banded amber, the vent grating on the roof, the
 * anchor foot beyond, and a rank of four rivets. Distances are metres out
 * along the bearing, as the kit's `ventDrawArm` takes them.
 *
 * Two things are the approved file's and are carried across rather than
 * corrected (#540). The rivets stagger `rivets.stagger` either side of their
 * rank in *global* z on every arm, not across the arm, so the rank leans one
 * way on two arms and the other way on the other two. And the grating sits
 * inside the hazard band, under its roof, where the top-down bake has never
 * seen it; `exportGlb`'s light audit says so on every arm.
 */
export function exchangerHead(root, { black, grey, rust, amber, vent }, opts) {
  const { bearing: a, at, y, size, fins, band, stack, grating, foot, rivets } = opts;
  const yaw = [0, -a, 0];
  add(root, 'exchanger', box(...size), black, polar(a, at, y), yaw);
  for (let i = 0; i < fins.count; i++)
    add(root, `fin_${i}`, box(...fins.size), grey, polar(a, fins.from + fins.pitch * i, fins.y), yaw);
  add(root, 'hazard_band', box(...band.size), amber, polar(a, at, band.y), yaw);
  add(root, 'stack', cyl(stack.r[0], stack.r[1], stack.h, 8), black, polar(a, stack.at, stack.y));
  add(
    root,
    'stack_band',
    cyl(stack.band.r, stack.band.r, stack.band.h, 8),
    amber,
    polar(a, stack.at, stack.band.y)
  );
  add(root, 'exchanger_vent', box(...grating.size), vent, polar(a, grating.at, grating.y), yaw);
  add(root, 'anchor_foot', box(...foot.size), rust, polar(a, foot.at, foot.y), yaw);
  for (let i = 0; i < rivets.count; i++) {
    const [x, ry, z] = polar(a, at + (rivets.from + rivets.pitch * i), rivets.y);
    add(
      root,
      `rivet_${i}`,
      box(...rivets.size),
      grey,
      [x, ry, z + (i % 2 ? rivets.stagger : -rivets.stagger)],
      yaw
    );
  }
}

/**
 * The raft: a bolted slab on the seabed with a foot at each corner and a bolt
 * through each foot. Feet are numbered 1..4 from the forward-starboard corner
 * round, which is the approved turret's own order.
 *
 * Given `foot.radius` it is the approved turret's own (#639), through kit.mjs
 * `drawn`: the raft an eight-facet frustum, `rTop` over `r`, and on each of
 * the four diagonal bearings — π/4 + n·π/2 round from +X toward +Z, which is
 * the numbering above — a foot at `foot.radius` yawed by minus its bearing so
 * its long side lies tangential, and its bolt outboard at `bolt.radius`, both
 * standing on the ground. Given `foot.inset` it is the #553 draft's.
 */
export function anchoredRaft(root, { black, rust, grey }, opts) {
  const { at, r, rTop = r, height, foot, bolt } = opts;
  const [cx, cy, cz] = at;
  if (foot.radius !== undefined) {
    part(root, 'base_raft', cyl(rTop, r, height, 8), black, drawn(at));
    const ground = cy - height / 2;
    for (let n = 1; n <= 4; n++) {
      const a = Math.PI / 4 + ((n - 1) * Math.PI) / 2;
      const [dx, dz] = [Math.cos(a), Math.sin(a)];
      const footAt = [cx + foot.radius * dx, ground + foot.size[1] / 2, cz + foot.radius * dz];
      part(root, `anchor_foot_${n}`, box(...foot.size), rust, drawn(footAt, [0, -a, 0]));
      const boltAt = [cx + bolt.radius * dx, ground + bolt.height / 2, cz + bolt.radius * dz];
      part(root, `anchor_bolt_${n}`, cyl(bolt.r, bolt.r, bolt.height, 6), grey, drawn(boltAt));
    }
    return;
  }
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
 *
 * Given `r` as `[top, bottom]` it is the approved turret's own (#639), through
 * kit.mjs `drawn`: the drum a frustum of `facets`, the ring a torus of five by
 * `ring.facets`, the rivets spheres of `rivets.segments` from `rivets.from`
 * *radians* round from +X toward +Z, the patch a box at `patch.at` turned
 * `patch.rot` — and no feed: the approved file writes that after the gun
 * (`feedPipe` below). Given a scalar `r` it is the #553 draft's.
 */
export function mountDrum(root, { black, grey, rust }, opts) {
  const { at, r, height, ring, rivets, patch, feed, facets = 10 } = opts;
  const [cx, cy, cz] = at;
  if (Array.isArray(r)) {
    part(root, 'mount_drum', cyl(r[0], r[1], height, facets), black, drawn(at));
    const collar = torus(ring.r, ring.t, 5, ring.facets ?? 18);
    part(root, 'mount_ring', collar, grey, drawn([cx, ring.y, cz], [Math.PI / 2, 0, 0]));
    const [w, h] = rivets.segments ?? [6, 5];
    for (let i = 0; i < rivets.count; i++) {
      const a = rivets.from + ((2 * Math.PI) / rivets.count) * i;
      const head = new THREE.SphereGeometry(rivets.r, w, h);
      const [dx, dz] = [rivets.radius * Math.cos(a), rivets.radius * Math.sin(a)];
      part(root, `rivet_${i + 1}`, head, grey, drawn([cx + dx, rivets.y, cz + dz]));
    }
    part(root, 'mount_patch', box(...patch.size), rust, drawn(patch.at, patch.rot));
    return;
  }
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

/**
 * The feed pipe beside the mount: a six-facet pipe of radius `r` stood
 * between two points of the export's frame — at their midpoint, turned by
 * the one rotation that carries +Y onto the run (three's
 * `setFromUnitVectors`), which is exactly the node matrix the approved file
 * holds for (0.5, 0.4, -0.45) to (0.2, 0.95, -0.25). The pipe runs from the
 * drum's foot up toward the housing, leaning two ways to do it, and the file
 * writes it after the gun rather than with the drum — so it is its own
 * builder, and `mountDrum` draws the #553 draft's upright one only when given
 * `feed` (#639).
 */
export function feedPipe(root, rust, { from, to, r, facets = 6 }) {
  const A = new THREE.Vector3(...from);
  const B = new THREE.Vector3(...to);
  const run = B.clone().sub(A);
  const up = new THREE.Vector3(0, 1, 0);
  const e = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(up, run.clone().normalize()),
    'XYZ'
  );
  const mid = A.clone().add(B).multiplyScalar(0.5).toArray();
  part(root, 'feed_pipe', cyl(r, r, run.length(), facets), rust, drawn(mid, [e.x, e.y, e.z]));
}

/**
 * The housing that trains, its glacis, and the patch riveted over its roof.
 *
 * Given `bearing` it is the approved turret's own (#639), through kit.mjs
 * `drawn`: the gun is trained `bearing` radians off the export's +Z toward
 * +X, so the housing and the roof patch are yawed by it where they stand
 * (`at`), and the glacis sits `along` the bearing at height `y`, pitched
 * `pitch` and yawed with them. Otherwise the #553 draft's three axis-aligned
 * boxes.
 */
export function turretHouse(root, { black, grey, rust }, opts) {
  const { housing, glacis, roofPatch, bearing = null } = opts;
  if (bearing !== null) {
    part(root, 'turret_housing', box(...housing.size), black, drawn(housing.at, [0, bearing, 0]));
    const at = [glacis.along * Math.sin(bearing), glacis.y, glacis.along * Math.cos(bearing)];
    part(root, 'turret_glacis', box(...glacis.size), grey, drawn(at, [glacis.pitch, bearing, 0]));
    const roof = box(...roofPatch.size);
    part(root, 'turret_roof_patch', roof, rust, drawn(roofPatch.at, [0, bearing, 0]));
    return;
  }
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
 * Given `bearing` it is the approved turret's own (#639), through kit.mjs
 * `drawn`: every part sits at its own round distance `along` the bearing the
 * gun is trained on (radians off the export's +Z toward +X) at height `y`;
 * the five tubes are eight-facet frusta, `r` `[top, bottom]` by `length`
 * (the recoil cylinder six-facet), each node turned `[π/2 − tilt, bearing,
 * 0]`; the counterweight a box yawed by the bearing. That Euler, in three's
 * XYZ order, yaws *before* it lays the tube down, so every tube ends up
 * parallel to the export's +Z rather than along the bearing its centre was
 * put on: the approved model's breech, jacket, barrel and brake are staggered
 * across its line of fire, each on its own axis, and the brake stands 17 m
 * off the barrel's at 120 m. That is the approved shape and it is carried
 * across, not straightened — a change to it is a separate PR with its own
 * screenshot (#540). Given `barrel.from` it is the #553 draft's, which kept
 * only the brake off the axis.
 */
export function heavyBarrel(root, { black, grey, rust }, opts) {
  const { breech, barrel, jacket, brake, recoil, counterweight, bearing = null, tilt = 0 } = opts;
  if (bearing !== null) {
    const at = (p) => [p.along * Math.sin(bearing), p.y, p.along * Math.cos(bearing)];
    const laid = [Math.PI / 2 - tilt, bearing, 0];
    const tube = (name, p, mat, facets = 8) =>
      part(root, name, cyl(p.r[0], p.r[1], p.length, facets), mat, drawn(at(p), laid));
    tube('barrel_breech', breech, grey);
    tube('barrel', barrel, black);
    tube('barrel_jacket', jacket, rust);
    tube('muzzle_brake', brake, grey);
    tube('recoil_cylinder', recoil, grey, 6);
    const weight = box(...counterweight.size);
    part(root, 'counterweight', weight, rust, drawn(at(counterweight), [0, bearing, 0]));
    return;
  }
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
 * flat on an upward face because the maps are top-down (kit.mjs). Given `r`
 * it is the approved turret's own (#639): a sphere of `segments` at `at` with
 * the bracket box under it, through kit.mjs `drawn`; given `size`, a box.
 */
export function baseLamp(root, { lampMat, black }, { at, size, bracket, r, segments = [6, 4] }) {
  if (r !== undefined) {
    part(root, 'base_lamp', new THREE.SphereGeometry(r, ...segments), lampMat, drawn(at));
    part(root, 'base_lamp_bracket', box(...bracket.size), black, drawn(bracket.at));
    return;
  }
  add(root, 'base_lamp', box(size[0], size[1], size[2]), lampMat, at);
  add(
    root,
    'base_lamp_bracket',
    box(bracket.size[0], bracket.size[1], bracket.size[2]),
    black,
    bracket.at
  );
}

/* --------------------------------------------------------------------------
 * Shared kinds. The Light Scout is the first of the six kinds every navy
 * models (#588, off #540 Phase 3), and the Klaxon's is a pressure vessel
 * with the fittings bolted on: a twenty-sided drum and its cap, a square
 * wedge for a nose, a boxed sensor head with two whips, a spine plate and a
 * skid, three patches and twelve rivets, a shrouded screw, four fins, two
 * stencils and the amber that is its whole resting light. The builders take
 * the approved export's own numbers (kit.mjs `drawn`);
 * hulls/light-scout-pelagia.mjs states the scale decision the shared kinds
 * follow.
 * ------------------------------------------------------------------------ */

/**
 * The Light Scout's palette: the Bulwark's four claddings to the value, and
 * a lamp that is the hazard-amber token through and through, burning at
 * 3.5 — the fixture `structureInk.workLamp` also is, not `ink`'s
 * near-black-based navigation light. Values are the approved export's own.
 */
export const scoutInk = {
  hullBlack: () => clad('hull_black', hex('#0E1418'), 0.25, 0.85),
  ironGrey: () => clad('iron_grey', hex('#8C8378'), 0.32, 0.72),
  oxideRust: () => clad('oxide_rust', hex('#3D2B1F'), 0.1, 0.95),
  hazardAmber: () => clad('hazard_amber', hex('#F2B233'), 0.15, 0.6),
  amberLamp: () => lamp('amber_lamp', hex('#F2B233'), hex('#F2B233'), 0.4, 3.5),
};

/**
 * A drum: a closed cylinder, `radii` [top, bottom] as drawn and laid along
 * the keel by its node, `facets` round — the one curve a pressure vessel
 * demanded. The hull, the cap that closes it astern, and the screw's hub.
 */
export function drum(root, mat, { name, radii, length, facets = 20, ...placement }) {
  return part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement);
}

/**
 * A square wedge: a four-sided frustum stood on its corners, so its section
 * is a square rather than a diamond — plate cut and welded, which is what
 * the Klaxon's nose is. `squash` stretches the section `[across, tall]`
 * after the turn, the way the Cruiser's bow wedge is drawn 1.9 times as
 * wide as it is tall and the Harvester's bow apron 2.6 (#649): the buffer's
 * first vertex then reads at atan2(across, −tall) rather than 3π/4, which
 * is what parts.mjs prints for those two.
 */
export function squareWedge(root, mat, opts) {
  const { name = 'nose_wedge', radii, length, squash = [1, 1], ...placement } = opts;
  const geo = cyl(radii[0], radii[1], length, 4, Math.PI / 4).rotateX(Math.PI / 2);
  if (squash[0] !== 1 || squash[1] !== 1) geo.scale(squash[0], squash[1], 1);
  return part(root, name, geo, mat, placement);
}

/**
 * Standing pipes: thin cylinders on Y, `[name, r, length, placement]` each,
 * `facets` round — the scout's two whip aerials off its sensor head, at
 * their own heights and off the centreline each its own way; the Corvette's
 * two masts and the Harvester's one; the Cruiser's three hydrophones (#649).
 * A riser or a vent in its own plate is `drum` with no turn on its node.
 */
export function whips(root, mat, { whips: list, facets = 8 }) {
  list.forEach(([name, r, length, placement]) =>
    part(root, name, cyl(r, r, length, facets), mat, placement)
  );
}

/**
 * Flank rivets: a rank of square-headed rivets along each flank at fixed
 * `stations` along the length, one box shared by all — the Klaxon repairs in
 * straight lines even when the thing repaired is round. Named
 * `rivet_<side><i>` in station order; `z` is the flank's beam in the kit's
 * frame, which for the export's `_p` rank is the -z its +x lands on. Not
 * `rivetRows` above: that one numbers a running rank the way the Bulwark and
 * the Tender count theirs (`rivet_96..159`), this one names a side.
 *
 * `running` numbers one rank straight through instead — `rivet_0..33` down
 * the Corvette's two rows a side, `rivet_0..39` the Harvester's, `rivet_0..19`
 * the Cruiser's, which is how those three exports count theirs (#649); a row
 * may then carry its own `y`, since the lower rank sits on the hull and the
 * upper on the deck edge. `size` as a triple is the box the Corvette's and
 * the Harvester's running lights share (`runningLights` below).
 */
export function flankRivets(root, mat, { name = 'rivet', size = 0.14, y, rows, running = false }) {
  const head = Array.isArray(size) ? box(...size) : box(size, size, size);
  let n = 0;
  rows.forEach(({ side, z, stations, y: rowY = y }) =>
    stations.forEach((x, i) =>
      part(root, running ? `${name}_${n++}` : `${name}_${side}${i}`, head, mat, {
        at: [x, rowY, z],
      })
    )
  );
}

/** The screw's shroud: a ring of `tube` section on radius `R`, across the keel once turned. */
export function shroud(
  root,
  mat,
  { name = 'prop_shroud', R, tube, facets = [10, 20], ...placement }
) {
  return part(root, name, torus(R, tube, ...facets), mat, placement);
}

/**
 * Screw blades: `count` flat blades of one `size` fanned `pitch` apart about
 * the shaft, all at `at`, numbered from the one that stands upright —
 * `prop_blade_<side><i>`, the side empty on a single screw and `p`/`s` on
 * the Cruiser's pair. The scout's three share one box; the Corvette's and the
 * Cruiser's exports carry a box a blade (`shared: false`), and a port keeps
 * the file's buffers as it keeps its names (#649).
 */
export function screwBlades(root, mat, opts) {
  const { name = 'prop_blade', side = '', size, at, count = 3, pitch = Math.PI / 3, shared = true } = opts;
  const blade = shared ? box(...size) : null;
  for (let i = 0; i < count; i++)
    part(root, `${name}_${side}${i}`, blade ?? box(...size), mat, { at, rot: [i * pitch, 0, 0] });
}

/**
 * Navigation domes: lit orbs of one radius, `[name, placement]` each, one
 * geometry shared — on the mast and one each side, which is the light gate 3
 * measures on this hull.
 */
export function domes(root, light, { r, facets = [8, 6], domes: list }) {
  const dome = new THREE.SphereGeometry(r, ...facets);
  list.forEach(([name, placement]) => part(root, name, dome, light, placement));
}

/* --------------------------------------------------------------------------
 * The Corvette, the Harvester and the Cruiser (#649, off #540 Phase 3): the
 * three Z-long exports behind the Light Scout, in its vocabulary — a
 * pressure drum with the fittings bolted on, patched and riveted — plus the
 * families the scout has no call for: ballast, torpedo racks, holds, the
 * dredge gear, sensor towers, light lines. Every builder takes the export's
 * own numbers through kit.mjs `drawn`, and every pair is written port then
 * starboard, because that is how all three files order theirs: `_p` is
 * drawn at the export's +x, which `drawn` lands on -z, port (#642).
 * ------------------------------------------------------------------------ */

/**
 * The one turn these exports put on every drum laid along the keel: born on
 * Y, pitched onto the export's Z by its node.
 */
export const ALONG_KEEL = [Math.PI / 2, 0, 0];

// Port then starboard, with the sign of the export's x — the order every
// Z-long pair is written in — is the kit's `flanks` (#649); the Order's
// module grew the same helper, and one copy is the rule.

/**
 * The Cruiser's vent: `scoutInk`'s amber-through lamp base with the light
 * itself banked to #F28A1E, burning at 2.2 and a shade rougher — not
 * `ink.amberVent`, the Bulwark's near-black-based fixture at 1. Values the
 * approved export's own; the other five of its materials are `scoutInk`'s.
 */
export const cruiserInk = {
  amberVent: () => lamp('amber_vent', hex('#F28A1E'), hex('#F2B233'), 0.5, 2.2),
};

/**
 * Running lights along the hull line — "dim accent running lights along the
 * hull line" (docs/asset-prompts-3d.md, UNIT — Corvette): the same rank as
 * `flankRivets`, one shared box a side at fixed stations, in a lamp. Named
 * `runlight_<side><i>` on the Corvette and `marker_<side><i>` on the
 * Harvester.
 */
export function runningLights(root, lampM, { name = 'runlight', ...opts }) {
  flankRivets(root, lampM, { name, ...opts });
}

/**
 * Ballast blisters, the shared-kind way: a drum a side laid along the keel,
 * then a fore cap a side — a frustum drawn in to `cap.tipR` forward, and no
 * aft cap on any of the three exports — then, on the Harvester, two straps a
 * side, a box each (`ballast_p · ballast_s · ballast_cap_pf · ballast_cap_sf ·
 * ballast_strap_p1 …`). `ballastBlisters` above is the Tender's and the
 * Bulwark's, capped both ends and written a whole side at a time; these
 * files write each family across both sides before the next.
 */
export function ballastPair(root, { blister, cap: capMat, strap }, opts) {
  const { x, y, z, r, length, facets, cap, straps } = opts;
  flanks((side, sgn) =>
    drum(root, blister, {
      name: `ballast_${side}`,
      radii: [r, r],
      length,
      facets,
      ...drawn([sgn * x, y, z], ALONG_KEEL),
    })
  );
  flanks((side, sgn) =>
    drum(root, capMat, {
      name: `ballast_cap_${side}f`,
      radii: [cap.tipR, r],
      length: cap.length,
      facets,
      ...drawn([sgn * x, y, cap.z], ALONG_KEEL),
    })
  );
  if (straps)
    flanks((side, sgn) =>
      straps.z.forEach((sz, i) =>
        part(root, `ballast_strap_${side}${i + 1}`, box(...straps.size), strap, drawn([sgn * x, straps.y, sz]))
      )
    );
}

/**
 * Torpedo racks — "visible torpedo hardpoints" (UNIT — Corvette). A frame
 * plate a rack standing off the flank with the tubes racked on it: one
 * cylinder shared by every tube, each laid along the keel by its node at
 * its own height and stand-off (`tubes`, `[x, y]` as the +x rack carries
 * them; a rack's `side` is the sign of its x), rack by rack in the file's
 * order. Then, where the export fits them, a collar fore and aft of every
 * tube, one ring shared, numbered straight through the tubes
 * (`torp_collar_0f · torp_collar_0a · …`). The Corvette racks four of three
 * with collars; the Cruiser two of three without. `tubeName` spells a tube:
 * `torp_p1_0` on the one, `torp_p0` on the other.
 */
export function torpedoRacks(root, { frame: frameMat, tube: tubeMat, collar: collarMat }, opts) {
  const { racks, frame, tubes, tube, collar, tubeName = (tag, i) => `torp_${tag}_${i}` } = opts;
  const bore = cyl(tube.r, tube.r, tube.length, tube.facets ?? 14);
  const placed = [];
  for (const { tag, side, z } of racks) {
    part(root, `rack_frame_${tag}`, box(...frame.size), frameMat, drawn([side * frame.x, frame.y, z]));
    tubes.forEach(([tx, ty], i) => {
      const at = [side * tx, ty, z];
      part(root, tubeName(tag, i), bore, tubeMat, drawn(at, ALONG_KEEL));
      placed.push(at);
    });
  }
  if (!collar) return;
  const ring = cyl(collar.r, collar.r, collar.length, tube.facets ?? 14);
  placed.forEach(([x, y, z], k) => {
    part(root, `torp_collar_${k}f`, ring, collarMat, drawn([x, y, z + collar.stand], ALONG_KEEL));
    part(root, `torp_collar_${k}a`, ring, collarMat, drawn([x, y, z - collar.stand], ALONG_KEEL));
  });
}

/**
 * A cargo hold — "wide cargo body" (UNIT — Harvester): four walls standing
 * on the deck, the two sides then the fore and aft ends `reach` either way
 * of the hold's centre, and a hazard stripe along the outside of each side
 * wall (`hold_<tag>_wall_p · _s · _f · _a · hold_<tag>_stripe_p · _s`). The
 * Harvester has one forward and one aft with a divider between.
 */
export function cargoHold(root, { grey, amber }, { tag, y, z, side, ends, stripe }) {
  flanks((s, sgn) =>
    part(root, `hold_${tag}_wall_${s}`, box(...side.size), grey, drawn([sgn * side.x, y, z]))
  );
  part(root, `hold_${tag}_wall_f`, box(...ends.size), grey, drawn([0, y, z + ends.reach]));
  part(root, `hold_${tag}_wall_a`, box(...ends.size), grey, drawn([0, y, z - ends.reach]));
  flanks((s, sgn) =>
    part(root, `hold_${tag}_stripe_${s}`, box(...stripe.size), amber, drawn([sgn * stripe.x, y, z]))
  );
}

/**
 * The bucket wheel — "external intake dredge gear" (UNIT — Harvester): the
 * wheel and its hub, drums turned across the beam by a quarter turn about
 * the export's z, and `count` buckets round the rim at `buckets.r` — a box
 * each, stood at its bearing from the bow round over the crown and turned
 * back by that bearing on its node, so every bucket's mouth faces the way
 * the wheel turns. parts.mjs prints the bearings past a half turn wrapped
 * into (−π, π]; they are the same rotations.
 */
export function bucketWheel(root, { black, rust, grey }, { at, wheel, hub, buckets }) {
  const [x, y, z] = at;
  const acrossBeam = [0, 0, Math.PI / 2];
  drum(root, black, {
    name: 'dredge_wheel',
    radii: [wheel.r, wheel.r],
    length: wheel.width,
    facets: 12,
    ...drawn(at, acrossBeam),
  });
  drum(root, rust, {
    name: 'dredge_hub',
    radii: [hub.r, hub.r],
    length: hub.width,
    facets: 10,
    ...drawn(at, acrossBeam),
  });
  for (let i = 0; i < buckets.count; i++) {
    const a = (i * 2 * Math.PI) / buckets.count;
    part(
      root,
      `bucket_${i}`,
      box(...buckets.size),
      grey,
      drawn([x, y + buckets.r * Math.sin(a), z + buckets.r * Math.cos(a)], [-a, 0, 0])
    );
  }
}

/**
 * The conveyor from the wheel up to the crusher: the ramp pitched up on its
 * node with a rail a side pitched with it, `count` ribs across it climbing
 * `rise` and running `run` a rib from the first, and a leg a side under the
 * top (`conveyor_ramp · conveyor_rail_p · _s · conveyor_rib_0..3 ·
 * conveyor_leg_p · _s`). Numbers the Harvester's own.
 */
export function conveyor(root, { black, grey, rust }, { ramp, rails, ribs, legs }) {
  const pitched = [ramp.pitch, 0, 0];
  part(root, 'conveyor_ramp', box(...ramp.size), black, drawn(ramp.at, pitched));
  flanks((side, sgn) =>
    part(root, `conveyor_rail_${side}`, box(...rails.size), grey, drawn([sgn * rails.x, rails.y, rails.z], pitched))
  );
  for (let i = 0; i < ribs.count; i++)
    part(root, `conveyor_rib_${i}`, box(...ribs.size), rust, drawn([0, ribs.y + i * ribs.rise, ribs.z + i * ribs.run]));
  flanks((side, sgn) =>
    part(root, `conveyor_leg_${side}`, box(...legs.size), grey, drawn([sgn * legs.x, legs.y, legs.z]))
  );
}

/**
 * A sensor tower — "prominent sensor arrays and fixed hydrophone masts"
 * (UNIT — Cruiser): four legs, port fore, port aft, starboard fore,
 * starboard aft, `reach` either way of the tower's station; a brace low and
 * high; the platform; and the floodlight laid flat on it, which is where the
 * top-down bake can count it. The Cruiser stands one forward under the dish
 * and one aft under the hydrophones.
 */
export function sensorTower(root, { grey, rust, lampM }, { tag, z, legs, braces, platform, flood }) {
  flanks((side, sgn) =>
    [
      ['f', legs.reach],
      ['a', -legs.reach],
    ].forEach(([end, dz]) =>
      part(root, `tower_${tag}_leg_${side}${end}`, box(...legs.size), grey, drawn([sgn * legs.x, legs.y, z + dz]))
    )
  );
  part(root, `tower_${tag}_brace_lo`, box(...braces.lo.size), rust, drawn([0, braces.lo.y, z]));
  part(root, `tower_${tag}_brace_hi`, box(...braces.hi.size), rust, drawn([0, braces.hi.y, z]));
  part(root, `tower_${tag}_platform`, box(...platform.size), grey, drawn([0, platform.y, z]));
  part(root, `tower_${tag}_floodlight`, box(...flood.size), lampM, drawn([0, flood.y, z]));
}

/**
 * Light lines — "sustained glow from vents, sensor arrays and lit ports —
 * this is a loud ship and it looks it" (UNIT — Cruiser): a lit strip the
 * length of each hull tier along the flank, the port run written first and
 * the starboard run sharing its boxes, then the one across the stern
 * (`lightline_low_p · _mid_p · _up_p · _low_s … · lightline_stern`).
 */
export function lightLines(root, lampM, { lines, stern }) {
  const strips = lines.map((l) => box(...l.size));
  flanks((side, sgn) =>
    lines.forEach((l, i) =>
      part(root, `lightline_${l.tag}_${side}`, strips[i], lampM, drawn([sgn * l.x, l.y, l.z]))
    )
  );
  part(root, 'lightline_stern', box(...stern.size), lampM, drawn(stern.at));
}

/* --------------------------------------------------------------------------
 * The Abyssal Submersible (#649). "Heavy segmented pressure carapace, folded
 * manipulator limbs" (docs/asset-prompts-3d.md, UNIT — Abyssal Submersible)
 * said the Klaxon's way: a banded pressure drum bolted shut at both ends, a
 * conning tower, two ballast tanks strapped on, four riveted patches, two
 * manipulator arms in frames of their own, and running lights. The export
 * is X-long, hyphenates every name and carries its own finishes, so its
 * builders place with kit `add` in the file's own frame — nothing is yawed —
 * and its palette is the set below.
 * ------------------------------------------------------------------------ */

/**
 * The Submersible's palette: the Klaxon's three tokens in a heavier finish
 * than `ink` — the black 0.55/0.82 against 0.25/0.85, the grey 0.6/0.7, the
 * brown named for what it is at 0.25/0.95 — and a running light on the
 * near-black base #1A1206 burning at 2.6. Values the approved export's own.
 */
export const submersibleInk = {
  hullBlack: () => clad('hull-black', hex('#0E1418'), 0.55, 0.82),
  ironGrey: () => clad('iron-grey', hex('#8C8378'), 0.6, 0.7),
  oxideBrown: () => clad('oxide-brown', hex('#3D2B1F'), 0.25, 0.95),
  runningLight: () => lamp('amber-running-light', hex('#F2B233'), hex('#1A1206'), 0.4, 2.6),
};

/**
 * Every drum on the Submersible is born on Y and laid along the keel by a
 * quarter turn about Z on its node, top astern.
 */
const LAID = [0, 0, Math.PI / 2];

/**
 * The pressure hull: the drum, a reinforcement band at each of `bands.x`,
 * and at each end the cap, its core, and a ring of `bolts.count` bolts at
 * `bolts.radius`, numbered from the crown round through starboard
 * (`pressure-hull · reinforcement-band-1..5 · end-cap-fore ·
 * end-cap-fore-core · bolt-fore-1..12 · end-cap-aft …`). Every part is a
 * buffer of its own, as the export carries them.
 */
export function bandedHull(root, { black, grey, brown }, { hull, bands, caps, bolts }) {
  add(root, 'pressure-hull', cyl(hull.r, hull.r, hull.length, hull.facets), black, [0, 0, 0], LAID);
  bands.x.forEach((x, i) =>
    add(root, `reinforcement-band-${i + 1}`, cyl(bands.r, bands.r, bands.width, hull.facets), grey, [x, 0, 0], LAID)
  );
  for (const [end, sgn] of [
    ['fore', 1],
    ['aft', -1],
  ]) {
    add(root, `end-cap-${end}`, cyl(caps.r, caps.r, caps.width, hull.facets), grey, [sgn * caps.x, 0, 0], LAID);
    add(
      root,
      `end-cap-${end}-core`,
      cyl(caps.core.r, caps.core.r, caps.core.width, caps.core.facets),
      black,
      [sgn * caps.core.x, 0, 0],
      LAID
    );
    for (let k = 0; k < bolts.count; k++) {
      const a = (k * 2 * Math.PI) / bolts.count;
      add(
        root,
        `bolt-${end}-${k + 1}`,
        cyl(bolts.r, bolts.r, bolts.h, 6),
        brown,
        [sgn * bolts.x, bolts.radius * Math.cos(a), bolts.radius * Math.sin(a)],
        LAID
      );
    }
  }
}

/**
 * The conning tower: base, tower and cap stacked; the dome light on the cap,
 * a short lit frustum facing up; the periscope mast and its head; and the
 * snorkel mast (`tower-base · tower · tower-cap · tower-dome-light ·
 * periscope-mast · periscope-head · snorkel-mast`).
 */
export function conningTower(root, { black, grey, brown, lampM }, opts) {
  const { base, tower, cap, dome, periscope, snorkel } = opts;
  add(root, 'tower-base', box(...base.size), black, base.at);
  add(root, 'tower', box(...tower.size), grey, tower.at);
  add(root, 'tower-cap', box(...cap.size), brown, cap.at);
  add(root, 'tower-dome-light', cyl(dome.rTop, dome.r, dome.h, 8), lampM, dome.at);
  add(root, 'periscope-mast', cyl(periscope.r, periscope.r, periscope.h, 8), grey, periscope.at);
  add(root, 'periscope-head', box(...periscope.head.size), brown, periscope.head.at);
  add(root, 'snorkel-mast', cyl(snorkel.r, snorkel.r, snorkel.h, 8), brown, snorkel.at);
}

/**
 * Ballast tanks: a ten-facet drum a side laid along the keel at `z` either
 * beam, each with a cap fore and aft and a strap aft and fore, port first
 * (`ballast-tank-port · ballast-cap-fore-port · ballast-cap-aft-port ·
 * tank-strap-port-a · tank-strap-port-f · …-stb`).
 */
export function ballastTanks(root, { brown, grey, black }, { z, y, tank, caps, straps }) {
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ]) {
    add(root, `ballast-tank-${side}`, cyl(tank.r, tank.r, tank.length, 10), brown, [tank.x, y, sgn * z], LAID);
    add(root, `ballast-cap-fore-${side}`, cyl(caps.r, caps.r, caps.width, 10), grey, [caps.fore, y, sgn * z], LAID);
    add(root, `ballast-cap-aft-${side}`, cyl(caps.r, caps.r, caps.width, 10), grey, [caps.aft, y, sgn * z], LAID);
    for (const [end, x] of [
      ['a', straps.aft],
      ['f', straps.fore],
    ])
      add(root, `tank-strap-${side}-${end}`, cyl(straps.r, straps.r, straps.width, 10), black, [x, y, sgn * z], LAID);
  }
}

/**
 * The pipework over the hull: a main run laid along the keel to an elbow, a
 * drop off its after end leaning `drop.lean` about Z, and a second run to a
 * second elbow on the other side of the tower, in the file's order
 * (`pipe-main · pipe-elbow-a · pipe-drop · pipe-main-2 · pipe-elbow-b`).
 */
export function deckPipework(root, { grey, brown }, { main, elbowA, drop, main2, elbowB }) {
  add(root, 'pipe-main', cyl(main.r, main.r, main.length, 8), grey, main.at, LAID);
  add(root, 'pipe-elbow-a', box(...elbowA.size), brown, elbowA.at);
  add(root, 'pipe-drop', cyl(drop.r, drop.r, drop.length, 8), grey, drop.at, [0, 0, drop.lean]);
  add(root, 'pipe-main-2', cyl(main2.r, main2.r, main2.length, 8), grey, main2.at, LAID);
  add(root, 'pipe-elbow-b', box(...elbowB.size), brown, elbowB.at);
}

/**
 * A riveted patch on the hull: the plate, a box turned `roll` about X on its
 * node, and four six-facet rivets turned with it — aft-port, fore-port,
 * aft-starboard, fore-starboard — each `rivet.inset.x` in from the plate's
 * ends and, along its depth, `inset.p` in from the port edge and `inset.s`
 * from the starboard, placed in the plate's own frame and carried through
 * its roll (`patch-1 · patch-1-rivetap · -rivetfp · -rivetas · -rivetfs`).
 *
 * Two things here are the export's and are kept because the approved model
 * does them. The plate's roll is its bearing round the hull *plus a quarter
 * turn*: the patch centre sits on the hull at radius 1.02, but the box
 * stands on edge, its depth radial and its thin face tangential, on all
 * four patches. And the rivets are not centred on the plate — the port pair
 * sits 0.07 in from its edge and the starboard pair 0.13, on every patch;
 * the insets are read off the four exports' sixteen rivets and reproduce
 * them to the fifth decimal.
 */
export function rivetedPatch(root, { plate, rivet: rivetMat }, { name, size, at, roll, rivet }) {
  add(root, name, box(...size), plate, at, [roll, 0, 0]);
  const [w, , d] = size;
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  for (const [tag, lz] of [
    ['p', -(d / 2 - rivet.inset.p)],
    ['s', d / 2 - rivet.inset.s],
  ])
    for (const [end, lx] of [
      ['a', -(w / 2 - rivet.inset.x)],
      ['f', w / 2 - rivet.inset.x],
    ])
      add(
        root,
        `${name}-rivet${end}${tag}`,
        cyl(rivet.r, rivet.r, rivet.h, 6),
        rivetMat,
        [at[0] + lx, at[1] - lz * s, at[2] + lz * c],
        [roll, 0, 0]
      );
}

/**
 * A manipulator arm, folded: a frame at the shoulder (`manipulator-<side>`)
 * holding the shoulder block at its origin, the pin through it, the upper
 * arm rolled back along the hull, the elbow, the forearm rolled the other
 * way, the wrist, and the two claws yawed apart — every part placed inside
 * the frame by the export's own numbers, which are the same numbers on both
 * arms: the port arm is not the starboard one's reflection but the same arm
 * hung at −z. The exporter writes the frame back out under its name, which
 * is where the approved file has it. "Folded manipulator limbs".
 */
export function manipulator(root, { grey, brown, black }, opts) {
  const { side, at, shoulder, pin, upperArm, elbow, forearm, wrist, claws } = opts;
  const frame = group(root, `manipulator-${side}`, { at });
  const hinge = [Math.PI / 2, 0, 0];
  add(frame, `shoulder-${side}`, box(...shoulder.size), grey);
  add(frame, `shoulder-pin-${side}`, cyl(pin.r, pin.r, pin.length, 8), brown, pin.at, hinge);
  add(frame, `upper-arm-${side}`, box(...upperArm.size), black, upperArm.at, [0, 0, upperArm.roll]);
  add(frame, `elbow-${side}`, cyl(elbow.r, elbow.r, elbow.length, 8), grey, elbow.at, hinge);
  add(frame, `forearm-${side}`, box(...forearm.size), black, forearm.at, [0, 0, forearm.roll]);
  add(frame, `wrist-${side}`, box(...wrist.size), brown, wrist.at);
  add(frame, `claw-a-${side}`, box(...claws.size), grey, claws.a, [0, claws.yaw, 0]);
  add(frame, `claw-b-${side}`, box(...claws.size), grey, claws.b, [0, -claws.yaw, 0]);
}

/**
 * The screw: a six-by-twelve torus of a shroud yawed across the keel, the
 * hub drawn in astern, and four blades of a box each, a quarter turn apart
 * about the keel and every one pitched `blades.pitch` about Y (`prop-shroud
 * · prop-hub · prop-blade-1..4`). parts.mjs prints the fourth blade's
 * three-quarter turn as −π/2; it is the same rotation.
 */
export function submersibleScrew(root, { grey, brown, black }, { at, shroud, hub, blades }) {
  add(root, 'prop-shroud', torus(shroud.R, shroud.tube, 6, 12), grey, at, [0, Math.PI / 2, 0]);
  add(root, 'prop-hub', cyl(hub.radii[0], hub.radii[1], hub.length, 8), brown, at, LAID);
  for (let i = 0; i < blades.count; i++)
    add(root, `prop-blade-${i + 1}`, box(...blades.size), black, at, [
      (i * 2 * Math.PI) / blades.count,
      blades.pitch,
      0,
    ]);
}

/** Dive planes: an aft plane and a fore plane a side, port first, each pair its own size and plate. */
export function divePlanes(root, { grey, brown }, { aft, fore }) {
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ]) {
    add(root, `dive-plane-aft-${side}`, box(...aft.size), grey, [aft.x, aft.y, sgn * aft.z]);
    add(root, `dive-plane-fore-${side}`, box(...fore.size), brown, [fore.x, fore.y, sgn * fore.z]);
  }
}

/** Landing skids: a runner a side under the tanks on a fore and an aft leg, port first. */
export function skids(root, { brown, black }, { z, skid, legs }) {
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ]) {
    add(root, `skid-${side}`, box(...skid.size), brown, [skid.x, skid.y, sgn * z]);
    add(root, `skid-leg-f-${side}`, box(...legs.size), black, [legs.fore, legs.y, sgn * z]);
    add(root, `skid-leg-a-${side}`, box(...legs.size), black, [legs.aft, legs.y, sgn * z]);
  }
}

/**
 * The lights: four running lights a side along the hull line, port first, a
 * box each; the strip on the tower's starboard face; and the aft beacon, a
 * lit frustum standing on the stern. With the nose viewport and the tower
 * dome, the whole light of a hull that idles at SIG 22.
 */
export function hullLights(root, lampM, { running, strip, beacon }) {
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ])
    running.stations.forEach((x, i) =>
      add(root, `running-light-${side}-${i + 1}`, box(...running.size), lampM, [x, running.y, sgn * running.z])
    );
  add(root, 'tower-light-strip', box(...strip.size), lampM, strip.at);
  add(root, 'aft-beacon', cyl(beacon.rTop, beacon.r, beacon.h, 8), lampM, beacon.at);
}

/**
 * Two point lights the export carries as `KHR_lights_punctual` nodes, one
 * either beam (`glow-port · glow-stb`). No mesh, so nothing any gate reads —
 * but the file has them and a loader instantiates them, so the port writes
 * them back with the colour, intensity and range the export's own. r169's
 * exporter writes a `PointLight` exactly as r184 wrote these.
 */
export function glowLamps(root, { color, intensity, range, lamps }) {
  for (const [name, at] of lamps) pointLight(root, { name, color, intensity, range, at });
}

/* --------------------------------------------------------------------------
 * The Chorister (#649): the cohort hull — "three overlapping segments over a
 * pressure bladder" (docs/asset-prompts-3d.md, UNIT — Chorister) said the
 * Klaxon's way: three riveted cans on a keel, the middle one the fattest and
 * in newer plate, a bow block with a ram, a stern block with the screw in
 * its shroud, and a spine-gun off the centreline. An r169 export of the
 * early pass, X-long like the Tender's, so its builders place with kit
 * `add` in the file's own frame and nothing is yawed; every one of its
 * cylinders is born on Y and laid along +X by −π/2 about Z on its node, top
 * to the bow.
 * ------------------------------------------------------------------------ */

const TO_BOW = [0, 0, -Math.PI / 2];

/**
 * The cans: a twelve-facet drum each, centred at `x` on the keel in its own
 * plate, capped fore and aft with a frustum in older plate drawn in to
 * `cap.tip` of the can's radius and standing `cap.proud` past the can's
 * end, and five rivets along its crown at `pitch`, `rivet.proud` above the
 * plate — numbered by their place in the file, the way the Bulwark and the
 * Tender count theirs (`can_0 · can_cap_0f · can_cap_0a · rivet_3..7 ·
 * can_1 …`), a box each.
 */
export function cans(root, { rust, grey }, { cans: list, cap, rivet }) {
  list.forEach(({ mat, x, r, length, pitch }, i) => {
    add(root, `can_${i}`, cyl(r, r, length, 12), mat, [x, 0, 0], TO_BOW);
    const reach = length / 2 + cap.proud;
    add(root, `can_cap_${i}f`, cyl(cap.tip * r, r, cap.length, 12), rust, [x + reach, 0, 0], TO_BOW);
    add(root, `can_cap_${i}a`, cyl(r, cap.tip * r, cap.length, 12), rust, [x - reach, 0, 0], TO_BOW);
    for (let k = -2; k <= 2; k++)
      add(root, `rivet_${root.children.length}`, box(...rivet.size), grey, [x + k * pitch, r + rivet.proud, 0]);
  });
}

/** Pipe runs laid along the keel, `[name, r, length, at]` each, six-facet — two, neither where the other is. */
export function keelPipes(root, mat, { pipes, facets = 6 }) {
  pipes.forEach(([name, r, length, at]) => add(root, name, cyl(r, r, length, facets), mat, at, TO_BOW));
}

/** The ram: a six-facet cone drawn to a point ahead of the bow block (`bow_ram`). */
export function ramCone(root, mat, { r, length, at, facets = 6 }) {
  add(root, 'bow_ram', cyl(0, r, length, facets), mat, at, TO_BOW);
}

/** The tail screw: a ten-facet shroud and a six-facet hub on one axis astern (`prop_shroud · prop_hub`). */
export function tailScrew(root, { grey, black }, { at, shroud, hub }) {
  add(root, 'prop_shroud', cyl(shroud.r, shroud.r, shroud.length, 10), grey, at, TO_BOW);
  add(root, 'prop_hub', cyl(hub.r, hub.r, hub.length, 6), black, at, TO_BOW);
}

/**
 * The spine-gun: its mount block on the crown and the gun, a six-facet tube
 * drawn in toward the muzzle, laid forward off it (`gun_mount · gun`).
 */
export function spineGun(root, { grey, black }, { mount, gun }) {
  add(root, 'gun_mount', box(...mount.size), grey, mount.at);
  add(root, 'gun', cyl(gun.radii[0], gun.radii[1], gun.length, 6), black, gun.at, TO_BOW);
}

export { THREE };
