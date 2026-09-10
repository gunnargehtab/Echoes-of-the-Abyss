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
import { THREE, clad, lamp, hex, add, box, cyl, torus, plate, plan, bothSides } from '../kit.mjs';

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
 * a side, port first (the Bulwark's `turret_ring … muzzle_s`). The barrels
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

/** A rank of engine vents across the transom: lit boxes, numbered (`engine_vent_0..n`). */
export function engineVents(root, vent, { x, y, z, size }) {
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
 * deck and a rank of lamp housings outboard of it, the port strip and its
 * lamps before starboard's (`flood_strip_p · flood_lamp_p0..7 · …`).
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
 * above it (the Bulwark's `keel_skid_p · pipe_p`). Written as a whole port
 * group then a whole starboard group, which is how both approved files
 * order them. `ballastAndKeel` above is the Derrick's lighter pair with one
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
 * `[from, to]` at mid-cell, port row then starboard row, each a box.
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
 * port and newer to starboard, and not the same size, because the Klaxon
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
  for (const side of ['p', 's']) {
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
 * A derrick a side over the work deck (`derrick_mast_p … derrick_floodlamp_p`,
 * then starboard): a tapered mast standing on the deck with a hazard-amber
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
