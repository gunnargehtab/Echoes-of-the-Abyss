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
  louvres,
  bothSides,
  polar,
  part,
  drawn,
  eulerXYZ,
  group,
  flanks,
  pointLight,
  sidedPost,
  strut,
} from '../kit.mjs';

/**
 * The Klaxon's palette — every material name the navy's twenty-four models
 * carry, one factory a name and one value a name (docs/asset-prompts-3d.md
 * Block 2b, rule 3). The four tokens of docs/art-direction.md as the
 * Bulwark's own materials carry them, and — where an approved model needed
 * a colour the docs do not name — that model's own hex, exactly (kit.mjs
 * `hex`). The vent is the amber banked down, the flood is it thrown wide
 * open.
 *
 * Until #888 this module held a table per authoring pass — `structureInk`,
 * `scoutInk`, `cruiserInk`, `submersibleInk`, `bargeInk` — each copying its
 * approved export's finishes to the value, which is how `hull_black` came
 * to be carried at 0.25/0.85 on nineteen models and 0.3/0.45 on three.
 * Re-finishing the navy is now one edit here. Where a name was split, the
 * hulls' value won — "the hull value is canonical" (Block 2b, "One name,
 * one value — held since #888") — and the factory's docstring says what it
 * replaced and on which models.
 *
 * A lamp's `intensity` is the glTF emissive strength: how loud the fixture
 * is at rest, each model's own, approved at intake against its SIG band
 * and carried straight into the conn view (rosterModels.ts `recolor`). It
 * is not part of the value — finishes.mjs compares every field but it — so
 * every lamp factory takes it and a script passes its model's own. The
 * default of 1 writes no strength, as the kit's `lamp` does.
 */
export const ink = {
  /*
   * The three claddings, at the hulls' finish. The Sentinel Turret, the
   * Bastion and the Refinery carried the same three hexes a shade more
   * metal and a good deal less rough — 0.3/0.45, 0.3/0.52 and 0.1/0.75, an
   * earlier authoring pass's, kept to the value by their ports (#639,
   * #652) — and #888 brought them onto these. Metalness and roughness
   * survive the recolour where a hue does not, so that was the one split in
   * this navy a player could have seen.
   */
  hullBlack: () => clad('hull_black', hex('#0E1418'), 0.25, 0.85),
  ironGrey: () => clad('iron_grey', hex('#8C8378'), 0.32, 0.72),
  oxideRust: () => clad('oxide_rust', hex('#3D2B1F'), 0.1, 0.95),
  hazardAmber: () => clad('hazard_amber', hex('#F2B233'), 0.15, 0.6),
  /**
   * The amber lamp: the token in `emissive` on the kit's near-black base —
   * the navy's plain amber fixture, on nineteen models, hull or structure:
   * ports, floods, seams, strips, mast and running lights. The Light Scout,
   * the Corvette, the Cruiser, the Harvester and the Foundry carried it
   * amber through and through — the token in `color` as well — at 3.5
   * (#588, #649); #888 brought the base onto this one and left the 3.5, the
   * emissive unmoved.
   *
   * That is the change of the re-finish that shows on the chart as well as
   * the conn view, and it is meant. A base's hue never reaches a pixel; its
   * value does. The chart bakes v = 0.22 + 0.3 · luma (bake.ts), so these
   * parts fell from 0.435 to 0.244 — the Foundry's whole forge floor from
   * the brightest cladding on the hall to near-black — and the conn view's
   * cladding target from 0.160 to 0.069 (rosterModels.ts `recolor`), which
   * shows whenever live SIG dims the lamps towards `GLOW_FACTOR_MIN`. A
   * near-black base is the kit's convention (kit.mjs `lamp`), and here is
   * why it is right: a dimmed lamp reads dark, so the hull still reads as a
   * black shape against black water when running silent — the consistency
   * checklist's fourth row — and the Foundry's bay reads "Dim at rest", as
   * its STRUCTURE block asks. The strength stayed because it is the lit
   * state, and the lit state did not move.
   *
   * Not renamed to `work_lamp`. That would have parted the Foundry from its
   * sibling the Slipway, whose gantry work lights already carry this name on
   * this base; and `work_lamp` is token-through at 0.35 rough, so the split
   * would only have moved onto that name. Every one of the five
   * carries `hazard_amber` at the same #F2B233, so the brightest colour the
   * recolour sets its register by is where it was.
   */
  amberLamp: (intensity = 1) =>
    lamp('amber_lamp', hex('#F2B233'), hex('#1A1408'), 0.4, intensity),
  /**
   * The vent: the amber banked down to #B07A1E, on #120E06. The Cruiser's
   * four engine vents carried #F28A1E on an amber-through base, 0.5 rough,
   * at 2.2 (#649); #888 brought them here. The light moved, so the strength
   * moves with it — the Cruiser passes 3.516, which is 2.2 × 0.371479 /
   * 0.232429, the linear luminances of the two emissives — and luminance
   * × strength holds at 0.817, the resting glow the conn view keeps.
   */
  amberVent: (intensity = 1) =>
    lamp('amber_vent', hex('#B07A1E'), hex('#120E06'), 0.4, intensity),
  amberFlood: (intensity = 1) =>
    lamp('amber_flood', hex('#FFD070'), hex('#2A2210'), 0.4, intensity),
  /**
   * The lamp family's *unlit* finish: `amber_lamp`'s base, #1A1408, at the
   * lamp's own metalness and roughness and with no emissive — worn as
   * cladding by a part the block lights only in a later band
   * (docs/models-plan.md §3.2 rule 2): the Furnace's burner nozzles, bow
   * floods, ladder strips and manifold strip, every one of them lit only
   * cutting and built dark. The Derrick's louvres and bridge ports, the
   * Bulwark's transom vents and bow lamp and the Foundry's roof seams and
   * crane floods wore it from #890 to #893 — lamps the audit could not see
   * from above, clad rather than moved; #893 relit every one of them where
   * the chart can see it and named them in their blocks. The Directorate's
   * `biolight_unlit`, the Commune's `bio_vein_unlit` and the Order's
   * `crystal_seam_unlit` are the same rule in the other three navies. One
   * name, one value (asset-prompts-3d.md Block 2b, rule 3); it recolours to
   * near-black under any flag.
   */
  amberLampUnlit: () => clad('amber_lamp_unlit', hex('#1A1408'), 0, 0.4),
  /**
   * The work lamp of a static mount — every `work_lamp` on the Sentinel
   * Turret, the Bastion and the Refinery — amber through and through: the
   * same #F2B233 as `amber_lamp` in `emissive`, and the token in `color`
   * too rather than a near-black, at 0.35 rough, so it reads as a fixture
   * in the albedo map (#639). All three pass 2.4 — quieter than the 3.5 the
   * shared kinds' `amber_lamp` burns at, not louder. One value on the three
   * models that carry it, so not a split, and left as approved.
   */
  workLamp: (intensity = 1) =>
    lamp('work_lamp', hex('#F2B233'), hex('#F2B233'), 0.35, intensity),
  /**
   * The Refinery's and the Bastion's second lamp (#652): the token through
   * and through like the work lamp, a shade rougher at 0.4 — the lit ports
   * of a dome that "can never run silent", the belt lines on the conveyors,
   * the crusher's intake. Both pass 1.1; the default was 1.1 until #888 and
   * is the kit's 1 now, like every lamp here, so the output did not move.
   * One value on both, and left.
   */
  portGlow: (intensity = 1) =>
    lamp('port_glow', hex('#F2B233'), hex('#F2B233'), 0.4, intensity),
  /*
   * The Abyssal Submersible's and the Baffle Barge's finishes, hyphenated as
   * those two exports name them (#649, #652): the three tokens in a heavier
   * finish than the hulls' — the black 0.55/0.82 against 0.25/0.85, the
   * grey 0.6/0.7 against 0.32/0.72, the brown named for what it is at
   * 0.25/0.95 — and a running light on the near-black #1A1206, at 2.6 on
   * both. The same hex under a second name at a second finish is not a
   * split rule 3 can see, since the rule is keyed on the name, and #888 left
   * it: bringing `hull-black` onto `hull_black` is a finish move on two
   * models that no name asked for, and a decision for its own change.
   */
  hullBlackHeavy: () => clad('hull-black', hex('#0E1418'), 0.55, 0.82),
  ironGreyHeavy: () => clad('iron-grey', hex('#8C8378'), 0.6, 0.7),
  oxideBrown: () => clad('oxide-brown', hex('#3D2B1F'), 0.25, 0.95),
  runningLight: (intensity = 1) =>
    lamp('amber-running-light', hex('#F2B233'), hex('#1A1206'), 0.4, intensity),
  /*
   * The Baffle Barge's own two (#652): the acoustic foam of its vanes and
   * pads, #1C1F22, a near-black nothing in the docs names, rougher than
   * anything else in the navy; and the hazard amber as paint rather than
   * plate, at 0.4 metal.
   */
  baffleFoam: () => clad('baffle-foam', hex('#1C1F22'), 0.1, 0.98),
  hazardPaint: () => clad('hazard-amber-paint', hex('#F2B233'), 0.4, 0.6),
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
 * export put them (#587). The seam is centred on x 0 unless `seam.x` says
 * otherwise, and its rivets go with it: every hull before the Furnace had
 * its parallel flank about the origin, and the Furnace's runs from x 30
 * aft, so a seam centred on 0 stood 7 m past its bow corner with nothing
 * behind it (#786 review).
 */
export function flankPlates(root, { grey, rust }, opts) {
  const { z, plates, plateT = 1.2, seamLength, seam = {}, rivets = [] } = opts;
  const { x: seamX = 0, y: seamY = 2.2, h: seamH = 0.5, t: seamT = 1.4, z: seamZ = z } = seam;
  bothSides((side, sgn) => {
    plates.forEach(([x, len, h, y, old], i) =>
      add(root, `flank_plate_${side}${i}`, box(len, h, plateT), old ? rust : grey, [x, y, sgn * z])
    );
    add(root, `flank_seam_${side}`, box(seamLength, seamH, seamT), rust, [
      seamX,
      seamY,
      sgn * seamZ,
    ]);
    for (const [tag, y] of rivets) {
      for (let i = 0; i < 14; i++) {
        const x = seamX - seamLength / 2 + 4 + ((seamLength - 8) * i) / 13;
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
 * lit at the throat.
 *
 * The louvred side is a raked hood: a well of hull black leaning from the
 * deck up to the wall (`louvre_well_s/p`), and `louvres.count` blades
 * stepped down its face, each `blade[1]` wide and `blade[0]` thick running
 * the house's length, canted up `tilt` radians — its outer edge the high
 * one — with its inner edge in the well. Blade `i` stands at `y + i ·
 * pitch` and `(count − 1 − i) · step` further outboard than the top one,
 * whose centre is `z`; the well's top face is the line through the blades'
 * inner edges, slope `pitch / step`, from where it meets the deck (`deck`)
 * to where it meets the wall, and the well is `well.t` thick under that
 * face. Its ends are buried in the slab and the house whatever the
 * thickness; its underside is buried only if `well.t` reaches the corner
 * where the deck meets the wall, which lies under the face's midpoint —
 * 1.73 m on the Derrick, so a 1 m well left a hollow of triangular
 * section open at both ends under the whole hood (#893 round 3) — and the
 * builder throws on a thickness that would leave that hollow. The form is
 * `exhaustLouvres` below — slats over a well of hull black — stood against
 * a wall rather than laid on a deck, and the well is what makes it a
 * louvred side rather than a slat screen in the air (#893 round 2). A
 * vertical louvre panel shows nothing from above, and the Derrick's slats
 * were five bars flat on the wall under the roof's eave from #531 to
 * #890, which clad them; stepped, every blade shows its `step` of plan
 * width past the one over it and the top one what stands past the eave,
 * and since the step is the whole of what shows, the chart reads the hood
 * as one lit band down each flank, `(count − 1) · step` plus the top
 * blade's reach past the eave wide — 2.4 m on the Derrick. The gratings
 * on the roof are the rest of the light.
 */
export function machineryHouse(root, { black, grey, rust, amber, vent, flood }, opts) {
  const { x, y, length, height, beam, louvres, gratings = 6, stack } = opts;
  add(root, 'machinery_house', box(length, height, beam), black, [x, y, 0]);
  add(root, 'house_roof', box(length + 1, 1, beam + 1), grey, [x, y + height / 2 + 0.3, 0]);
  for (let i = 0; i < gratings; i++)
    add(root, `roof_grating_${i}`, box(1.6, 0.4, beam * 0.77), vent, [
      x - length * 0.39 + (length * 0.77 * i) / (gratings - 1),
      y + height / 2 + 1,
      0,
    ]);
  const { count = 5, y: ly, pitch, z: lz, step, tilt, blade, deck, well } = louvres;
  const [bt, bw] = blade;
  // The well, in section (z out, y up) on the starboard side. Blade 0 is the
  // lowest and outermost; its inner edge and the slope give the face's line,
  // cut at the deck (A) and the wall (B). The box is centred half its
  // thickness under the face's midpoint along the outward-up normal `n`,
  // and turned about X so its local +y lies on `n`; a tenth of a metre of
  // extra length sinks each end past the deck and into the wall.
  const ez = lz + (count - 1) * step - (bw / 2) * Math.cos(tilt);
  const ey = ly - (bw / 2) * Math.sin(tilt);
  const slope = pitch / step;
  const A = [ez + (ey - deck) / slope, deck];
  const B = [beam / 2, ey + slope * (ez - beam / 2)];
  const run = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const n = [(B[1] - A[1]) / run, (A[0] - B[0]) / run];
  // The deck/wall corner's depth under the face: the well must be at least
  // this thick or its underside stands clear of both, a hollow the conn
  // view sees end-on (docstring).
  const hollow = (beam / 2 - A[0]) * n[0] + (deck - A[1]) * n[1];
  if (well.t < -hollow)
    throw new Error(
      `machineryHouse: well.t ${well.t} leaves a hollow under the hood; the deck/wall ` +
        `corner lies ${(-hollow).toFixed(2)} m under the face`
    );
  const C = [(A[0] + B[0]) / 2 - (n[0] * well.t) / 2, (A[1] + B[1]) / 2 - (n[1] * well.t) / 2];
  const rake = Math.atan2(n[0], n[1]);
  // Canting a blade about X drops its +z edge, so starboard (+z) takes the
  // negative angle and port the positive one: the outer edge rises on both.
  // The well's rake goes the other way for the same reason.
  bothSides((side, sgn) => {
    add(
      root,
      `louvre_well_${side}`,
      box(length * 0.73, well.t, run + 0.1),
      black,
      [x, C[1], sgn * C[0]],
      [sgn * rake, 0, 0]
    );
    for (let i = 0; i < count; i++)
      add(
        root,
        `louvre_${side}${i}`,
        box(length * 0.73, bt, bw),
        vent,
        [x, ly + i * pitch, sgn * (lz + (count - 1 - i) * step)],
        [-sgn * tilt, 0, 0]
      );
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
    // On the beam: the beam's top face is 0.7 over `top`, and the flood's
    // underside meets it. The first cut had them a quarter of a metre over
    // it, which is a flood in the water (#894).
    for (let i = 0; i < floods; i++)
      add(root, `work_flood_${side}${i}`, box(4.5, 0.5, 2.2), flood, [
        aft + 2 + ((fwd - aft - 4) * i) / (floods - 1),
        top + 0.95,
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

/**
 * Deck floods, facing up — the light gate 3 actually measures. `deck` is the
 * face they stand a tenth above, and it has to be the slab's *top*: the
 * Derrick passed its mid-slab datum from #531 until #890 and its six floods
 * sat inside `hull_slab`, which is the case `lightAudit` was written on.
 */
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
 * A rank of engine vents across the transom: boxes in `vent`, numbered
 * (`engine_vent_0..n`). Given `at`, a list of the export's own positions, it
 * is the Cruiser's four through kit.mjs `drawn` — two a side in the quarter,
 * not a rank across the stern (#649). `vent` is the hull's vent lamp: the
 * Cruiser's are gratings let into its lower deck, lit ("sustained glow from
 * vents"); the Bulwark's six stand in the transom with their tops a metre
 * proud of the after deck, where the chart can see them — they sat buried
 * in the slab until #890 clad them, and #893 raised and relit them.
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

/**
 * One rank of rivets, on one side only: `rivetRows` above for a face that
 * has no twin — the outer eave of a Slipway hall carries one rank and the
 * inner eave none (#652). Same pitch rule, same numbering: from
 * `numberFrom`, the root's own child count unless said, which is how the
 * approved Slipway numbers each hall's rank from 39 — the count of parts
 * already in that hall — in both halls alike.
 */
export function rivetRow(root, mat, opts) {
  const { from, to, count, y, z, size, numberFrom = root.children.length } = opts;
  for (let i = 0; i < count; i++)
    add(root, `rivet_${numberFrom + i}`, box(...size), mat, [
      from + ((to - from) * (i + 0.5)) / count,
      y,
      z,
    ]);
}

/**
 * The bow stencil, painted flat on the foredeck, and the bow lamp —
 * separate, because the two hulls write them in opposite orders. Every
 * hull's bow lamp stands on the foredeck where the chart can see it; the
 * Bulwark's sat inside the bow under the plough until #890 clad it, and
 * #893 lifted it onto the deck over the plough and relit it.
 */
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
 * the eaves, a rank of lit ports a side, and the skylight in the roof. The
 * ports are boxes, `ports.size` deep: the Tender's stand 0.6 m proud of the
 * hazard band's eave so their top faces reach the top-down bake, where the
 * approved export's 0.4 m panels sat under it (#890). `machineryHouse` above
 * is the Derrick's louvred engine house; a workshop carries a workshop's
 * fittings.
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

/**
 * Gas bottles in a rank on the deck: eight-facet cylinders `pitch` apart
 * (`gas_bottle_0..n`). `tag` names the rank when a hull carries more than
 * one (`gas_bottle_s0..`), and `band` — `{ mat, r, h, dy }` — rings each
 * bottle with a reinforcement band `dy` above its centre, written after
 * its bottle (`gas_band_s0`), which is what "banded gas cylinders" (UNIT —
 * Furnace) are. The Tender passes neither and draws as it always did.
 */
export function gasBottles(root, amber, { x, y, z, count, pitch, r, h, tag = '', band }) {
  for (let i = 0; i < count; i++) {
    add(root, `gas_bottle_${tag}${i}`, cyl(r, r, h, 8), amber, [x + i * pitch, y, z]);
    if (band)
      add(root, `gas_band_${tag}${i}`, cyl(band.r, band.r, band.h, 8), band.mat, [
        x + i * pitch,
        y + band.dy,
        z,
      ]);
  }
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
 * The Freighter's own (#783, off #540 Phase 4): the parts of "the armoured
 * hold" that neither the Bulwark nor the Tender had a word for — hold doors
 * along the flank, crane gantries at hull scale, a skeg with the screws in
 * it — plus a plated bow and a cargo hatch, written the way the family
 * above is written: every number the hull's, none a default. Nothing here
 * is a lamp except the door seams, and those are the whole of what the
 * block lights at rest (docs/asset-prompts-3d.md, UNIT — Freighter).
 * ------------------------------------------------------------------------ */

/**
 * The plated bow: the plate across the bow face and the hazard band over
 * it (`bow_plate · bow_band`). The Derrick's `hullSlab` above writes the
 * same two parts at the Derrick's own sizes (its band named
 * `rubbing_strake`); a box hull with a bluff bow takes its own.
 */
export function bowPlate(root, { grey, amber }, { plate, band }) {
  add(root, 'bow_plate', box(...plate.size), grey, plate.at);
  add(root, 'bow_band', box(...band.size), amber, band.at);
}

/**
 * Hold doors along the flank, a side at a time (starboard first, as every
 * `bothSides` family here is written): each door a plate standing proud of
 * the flank in newer grey or older rust (`[x, length, old]`), a hazard
 * stripe painted across its face, the hinge rail along its bottom edge with
 * its knuckles, dogging wheels on the face — a rim and a hub each — and the
 * lit seams: one along the top edge, lying on the deck edge where the
 * straight-down bake can count it, and one up each end, standing the door's
 * own depth proud so its top shows from above (`hold_door_s0 ·
 * door_stripe_s0 · hinge_rail_s0 · hinge_knuckle_s0_0.. · dog_wheel_s0_0 ·
 * dog_hub_s0_0 .. · door_seam_s0_top · door_seam_s0_f · door_seam_s0_a ·
 * hold_door_s1 …`).
 *
 * The door is hinged at the bottom — it drops as a ramp, which is what six
 * berths of hull drive off — so the three edges that open are the three
 * that leak light, and the hinge edge carries the rail and no lamp. A
 * hinge rail and its knuckles are the one kind of part here that stands
 * outside the door's plan; the seam bars stand inside it, in x, beyond the
 * door's ends.
 */
export function holdDoors(root, { grey, rust, amber, lampM }, opts) {
  const { doors, height, y, z, t, stripe, hinge, wheels, seams } = opts;
  const onX = [0, 0, Math.PI / 2];
  const onZ = [Math.PI / 2, 0, 0];
  bothSides((side, sgn) => {
    doors.forEach(([x, length, old], i) => {
      const tag = `${side}${i}`;
      add(root, `hold_door_${tag}`, box(length, height, t), old ? rust : grey, [x, y, sgn * z]);
      add(root, `door_stripe_${tag}`, box(length - stripe.inset, stripe.h, stripe.t), amber, [
        x,
        stripe.y,
        sgn * stripe.z,
      ]);
      add(root, `hinge_rail_${tag}`, cyl(hinge.r, hinge.r, length, 8), rust, [x, hinge.y, sgn * hinge.z], onX);
      hinge.knuckles.forEach((dx, k) =>
        add(
          root,
          `hinge_knuckle_${tag}_${k}`,
          cyl(hinge.knuckle.r, hinge.knuckle.r, hinge.knuckle.length, 8),
          grey,
          [x + dx, hinge.y, sgn * hinge.z],
          onX
        )
      );
      wheels.at.forEach((dx, k) => {
        add(root, `dog_wheel_${tag}_${k}`, torus(wheels.r, wheels.rim, 5, 10), grey, [
          x + dx,
          wheels.y,
          sgn * wheels.z,
        ]);
        add(
          root,
          `dog_hub_${tag}_${k}`,
          cyl(wheels.hub.r, wheels.hub.r, wheels.hub.length, 8),
          rust,
          [x + dx, wheels.y, sgn * wheels.hub.z],
          onZ
        );
      });
      add(root, `door_seam_${tag}_top`, box(length, seams.top.h, seams.top.w), lampM, [
        x,
        seams.top.y,
        sgn * seams.top.z,
      ]);
      for (const [end, s] of [
        ['f', 1],
        ['a', -1],
      ])
        add(
          root,
          `door_seam_${tag}_${end}`,
          box(seams.jamb.w, seams.jamb.h, seams.jamb.t),
          lampM,
          [x + s * (length / 2 + seams.jamb.w / 2), seams.jamb.y, sgn * seams.jamb.z]
        );
    });
  });
}

/**
 * The skeg: a heavy block under the stern (`skeg`) and a rank of prop
 * tunnels through its after face, port to starboard, named `0..n` as the
 * Bulwark's three are (`propTunnel` above, shroud and hub each).
 */
export function skeg(root, { rust, grey, black }, { block, tunnels }) {
  add(root, 'skeg', box(...block.size), rust, block.at);
  tunnels.z.forEach((z, i) =>
    propTunnel(root, { grey, black }, {
      name: `${i}`,
      at: [tunnels.x, tunnels.y, z],
      r: tunnels.r,
      length: tunnels.length,
      hub: tunnels.hub,
    })
  );
}

/**
 * Crane gantries over a deck at hull scale: a rail a side along the deck
 * edges, then each gantry — a leg a side standing on the deck, the beam
 * across them, the trolley under the beam run out to its own side, the
 * fall hanging plumb from it and the hook on the end (`crane_rail_s · _p ·
 * gantry_0_leg_s · _p · gantry_0_beam · gantry_0_trolley · gantry_0_cable ·
 * gantry_0_hook · gantry_1_…`). A gantry is `[x, trolleyZ]`. The Derrick's
 * `lattice` is the same navy's frame carried out *over* both beams; a
 * gantry stays inside the hull's, so the plan outline is still the slab's.
 */
export function deckGantries(root, { grey, rust, black }, opts) {
  const { rails, gantries, legs, beam, trolley, cable, hook } = opts;
  bothSides((side, sgn) =>
    add(root, `crane_rail_${side}`, box(...rails.size), rust, [rails.x, rails.y, sgn * rails.z])
  );
  gantries.forEach(([x, tz], i) => {
    bothSides((side, sgn) =>
      add(root, `gantry_${i}_leg_${side}`, box(...legs.size), grey, [x, legs.y, sgn * legs.z])
    );
    add(root, `gantry_${i}_beam`, box(...beam.size), grey, [x, beam.y, 0]);
    add(root, `gantry_${i}_trolley`, box(...trolley.size), black, [x, trolley.y, tz]);
    add(root, `gantry_${i}_cable`, cyl(cable.r, cable.r, cable.length, 6), black, [x, cable.y, tz]);
    add(root, `gantry_${i}_hook`, box(...hook.size), rust, [x, hook.y, tz]);
  });
}

/**
 * A cargo hatch in the deck: the coaming in older plate and the cover
 * plate on it (`hatch_coaming · hatch_cover`) — what the gantries lift
 * through.
 */
export function cargoHatch(root, { grey, rust }, { coaming, cover }) {
  add(root, 'hatch_coaming', box(...coaming.size), rust, coaming.at);
  add(root, 'hatch_cover', box(...cover.size), grey, cover.at);
}

/* --------------------------------------------------------------------------
 * The Beacon (#784, off #540 Phase 4): the picket that shouts. What the
 * Freighter's family above has no call for — the transducer drum lying
 * across the beam in its bolted cradle, and the dogged hatch the drum's
 * crown and the foredeck share. Built, not ported: the numbers are the
 * hull script's and nothing here transcribes a binary.
 * ------------------------------------------------------------------------ */

/**
 * Athwartships: a drum born on Y laid across the beam by a quarter turn
 * about X, top to starboard. `ALONG_KEEL` below is the same turn on a
 * Z-long export's node; this is the kit's own frame, and the beam is Z.
 */
const ATHWART = [Math.PI / 2, 0, 0];

/**
 * A dogged hatch: a round coaming standing on Y, `facets` round, and the
 * dogging wheel lying flat on it — a torus turned onto the horizontal,
 * `wheel.dy` above the coaming's centre. Named `<name>` and `<name>_wheel`.
 * The hold doors above carry their wheels on a vertical face
 * (`holdDoors`); a hatch is dogged from above, where the top-down maps see
 * the wheel as a ring.
 */
export function doggedHatch(root, { hatch: hatchMat, wheel: wheelMat }, opts) {
  const { name, at, r, h, facets = 8, wheel } = opts;
  add(root, name, cyl(r, r, h, facets), hatchMat, at);
  add(
    root,
    `${name}_wheel`,
    torus(wheel.R, wheel.t, 6, 12),
    wheelMat,
    [at[0], at[1] + wheel.dy, at[2]],
    ATHWART
  );
}

/**
 * The transducer drum, athwartships amidships in its bolted cradle — the
 * Beacon's whole argument, "a banded cylinder wider than the hull and proud
 * of both flanks, hoop flanges, a dogged inspection hatch, a stub lamp mast
 * over it" (docs/asset-prompts-3d.md, UNIT — Beacon).
 *
 * In the file's order: the cradle first — the bed plate on the deck, a
 * chock fore and aft of the drum, and the hex bolts along each chock's
 * outboard foot (`drum_bed · drum_chock_f · cradle_bolt_f0..n ·
 * drum_chock_a · cradle_bolt_a0..n`) — then the drum, then a starboard
 * group and a port group each of the dished head (a frustum drawn in to
 * `heads.tipR`, its small end outboard), the hoop flanges at `hoops.z`
 * and the one lit hoop at `hoopLamps.z` (`transducer_drum · drum_head_s ·
 * drum_hoop_s0..n · hoop_lamp_s · drum_head_p …`), then the hatch on the
 * crown with its wheel, and the mast standing on the crown with the lamp
 * on its head (`drum_hatch · drum_hatch_wheel · drum_mast · mast_lamp`).
 *
 * The heads are a dished pressure head, not a flat end: `outlines.mjs`
 * cuts the widest thing at every station, and a frustum gives the plan
 * bump the chamfered corners the hand-drawn outline drew, where a flat end
 * would give it square ones. The lit hoop is a raised band `hoopLamps.r`
 * round the drum, wider than the drum and narrower than the flange beside
 * it, so its whole width is on top where the maps read it and its rim
 * shows from the beam where the conn view does. The mast lamp is the one
 * emitter on the hull that nothing can occlude.
 */
export function transducerDrum(root, { black, grey, rust, lampM }, opts) {
  const { at, r, length, facets = 16, cradle, heads, hoops, hoopLamps, hatch, mast } = opts;
  const [x, y, z] = at;
  const bolt = cyl(cradle.bolts.r, cradle.bolts.r, cradle.bolts.h, 6);
  add(root, 'drum_bed', box(...cradle.bed.size), grey, [x, cradle.bed.y, z]);
  for (const [tag, sgn] of [
    ['f', 1],
    ['a', -1],
  ]) {
    add(root, `drum_chock_${tag}`, box(...cradle.chock.size), rust, [
      x + sgn * cradle.chock.x,
      cradle.chock.y,
      z,
    ]);
    cradle.bolts.z.forEach((bz, i) =>
      add(root, `cradle_bolt_${tag}${i}`, bolt, rust, [
        x + sgn * cradle.bolts.x,
        cradle.bolts.y,
        z + bz,
      ])
    );
  }
  add(root, 'transducer_drum', cyl(r, r, length, facets), black, at, ATHWART);
  const head = cyl(heads.tipR, r, heads.length, facets);
  const hoop = cyl(hoops.r, hoops.r, hoops.width, facets);
  const lit = cyl(hoopLamps.r, hoopLamps.r, hoopLamps.width, facets);
  bothSides((side, sgn) => {
    // The frustum's small end is its top, and the turn carries the top to
    // +z on the starboard side and -z on the port: outboard both times.
    add(
      root,
      `drum_head_${side}`,
      head,
      grey,
      [x, y, z + sgn * (length / 2 + heads.length / 2)],
      [(sgn * Math.PI) / 2, 0, 0]
    );
    hoops.z.forEach((hz, i) =>
      add(root, `drum_hoop_${side}${i}`, hoop, grey, [x, y, z + sgn * hz], ATHWART)
    );
    add(root, `hoop_lamp_${side}`, lit, lampM, [x, y, z + sgn * hoopLamps.z], ATHWART);
  });
  doggedHatch(
    root,
    { hatch: rust, wheel: grey },
    {
      name: 'drum_hatch',
      at: [x, y + r + hatch.h / 2 - hatch.sink, z + hatch.z],
      r: hatch.r,
      h: hatch.h,
      wheel: hatch.wheel,
    }
  );
  add(root, 'drum_mast', cyl(mast.rTop, mast.r, mast.h, 8), grey, [
    x,
    y + r + mast.h / 2 - mast.sink,
    z,
  ]);
  add(root, 'mast_lamp', new THREE.SphereGeometry(mast.lamp.r, 8, 6), lampM, [
    x,
    y + r + mast.h - mast.sink + mast.lamp.dy,
    z,
  ]);
}

/**
 * The tube casings outside the hull — the Broadside's whole argument, "four
 * casings, two a side in tandem along each flank: each a banded pressure
 * cylinder toed a few degrees outboard so the aft tube fires clear of the
 * forward casing's tail, a hinged muzzle door on its forward face, a dogged
 * breech door at its tail, so the plan is a box with two teeth a side and
 * the teeth are the count" (docs/asset-prompts-3d.md, UNIT — Broadside).
 *
 * A casing is the Submersible's `bandedHull` family — a faceted drum with
 * flat reinforcement bands round it, not `bandedTank`'s torus, which is a
 * structure's tank lying where it was dropped — laid along its own toed
 * axis rather than the keel, and doored at both ends. Every part is placed
 * by `t`, metres along that axis from the breech face, so a casing is one
 * number to move and one to lengthen. Starboard casings first, then port,
 * each written whole (`casing_s0 · casing_band_s0_0..n · tail_flange_s0 ·
 * breech_door_s0 · breech_hub_s0 · breech_wheel_s0 · hoop_lamp_s0 ·
 * muzzle_flange_s0 · muzzle_door_s0 · muzzle_hinge_s0 · casing_saddle_s0f ·
 * casing_saddle_s0a · casing_s1 …`).
 *
 * The toe: a drum laid on X by a quarter turn about Z and then yawed about
 * Y — an XYZ Euler of `[0, −sgn·toe, π/2]` — carries its muzzle outboard on
 * both sides; the wheel, a torus born facing Z, takes the same yaw after a
 * quarter turn about Y. `toe` is the hull's clearance arithmetic and the
 * hull script states it: the aft tube's path runs parallel to the forward
 * casing's axis at (length + gap) · tan(toe) outboard of it, so it clears
 * when that exceeds the casing's radius and the torpedo's together.
 *
 * The breech door's hoop is the lit part: a raised band `hoopLamp.r` round
 * the casing just ahead of the tail flange, wider than the drum and as wide
 * as a reinforcement band, so its whole width is on top where the maps read
 * it and its rim shows from the beam — the Beacon's `hoop_lamp`, one a
 * casing. The muzzle door is cladding: it floods only for the instant of a
 * launch, a transient, and a transient is not a lamp (docs/models-plan.md
 * §3.2). The hinge is a knuckle standing up the door's outboard edge, so
 * the door swings out and clear of the hull; the breech wheel faces aft on
 * its hub. The saddles are the bolting: a block a quarter-length in from
 * each end, run from the flank to the casing's axis and buried in the drum
 * where the two meet, so the toe's widening gap is filled where it is
 * carried.
 */
export function tubeCasings(root, { black, grey, rust, lampM }, opts) {
  const { r, y, flank, gap, toe, facets = 16, casings, bands, tail, hoopLamp, muzzle, saddles } =
    opts;
  bothSides((side, sgn) => {
    // The axis runs from the breech face at `breech` outboard by `toe`; `at`
    // is a point `t` metres along it, `out` the same point carried outboard
    // across it.
    const dir = [Math.cos(toe), 0, sgn * Math.sin(toe)];
    const perp = [-Math.sin(toe), 0, sgn * Math.cos(toe)];
    const along = [0, -sgn * toe, Math.PI / 2];
    const facing = [0, -sgn * toe + Math.PI / 2, 0];
    casings.forEach(({ tag, breech, length }) => {
      const name = `${side}${tag}`;
      const zb = sgn * (flank + r + gap);
      const at = (t, dy = 0) => [breech + t * dir[0], y + dy, zb + t * dir[2]];
      const out = (t, d) => [breech + t * dir[0] + d * perp[0], y, zb + t * dir[2] + d * perp[2]];
      add(root, `casing_${name}`, cyl(r, r, length, facets), black, at(length / 2), along);
      bands.t.forEach((t, k) =>
        add(root, `casing_band_${name}_${k}`, cyl(bands.r, bands.r, bands.width, facets), grey, at(t), along)
      );
      // The tail: the flange the door dogs against, the door on it, the
      // wheel's hub through the door and the wheel on the hub.
      add(root, `tail_flange_${name}`, cyl(tail.flange.r, tail.flange.r, tail.flange.width, facets), rust, at(tail.flange.width / 2), along);
      add(root, `breech_door_${name}`, cyl(tail.door.r, tail.door.r, tail.door.h, facets), grey, at(-tail.door.h / 2), along);
      add(root, `breech_hub_${name}`, cyl(tail.hub.r, tail.hub.r, tail.hub.length, 8), black, at(-tail.door.h - tail.hub.length / 2 + tail.hub.sink), along);
      add(root, `breech_wheel_${name}`, torus(tail.wheel.R, tail.wheel.t, 6, 12), grey, at(-tail.door.h - tail.wheel.stand), facing);
      add(root, `hoop_lamp_${name}`, cyl(hoopLamp.r, hoopLamp.r, hoopLamp.width, facets), lampM, at(hoopLamp.t), along);
      // The muzzle: its flange, the door on the forward face, the knuckle
      // up the door's outboard edge.
      add(root, `muzzle_flange_${name}`, cyl(muzzle.flange.r, muzzle.flange.r, muzzle.flange.width, facets), rust, at(length - muzzle.flange.width / 2), along);
      add(root, `muzzle_door_${name}`, cyl(muzzle.door.r, muzzle.door.r, muzzle.door.h, facets), grey, at(length + muzzle.door.h / 2), along);
      add(root, `muzzle_hinge_${name}`, cyl(muzzle.hinge.r, muzzle.hinge.r, muzzle.hinge.h, 8), rust, out(length + muzzle.door.h / 2, muzzle.hinge.inset));
      for (const [end, t] of [
        ['f', saddles.t[1]],
        ['a', saddles.t[0]],
      ]) {
        const [x, , z] = at(t);
        const reach = Math.abs(z) - flank;
        add(root, `casing_saddle_${name}${end}`, box(saddles.size[0], saddles.size[1], reach), rust, [
          x,
          y + saddles.dy,
          sgn * (flank + reach / 2),
        ]);
      }
    });
  });
}

/* --------------------------------------------------------------------------
 * The Furnace (#786, off #540 Phase 4): the cutters. What the Tender's gas
 * plant and the Derrick's frame have no word for — a boxed gantry frame on
 * the foredeck, three lattice cutter ladders run out through it ahead of
 * the bow with a hooded burner head at each tip and the gas lines strapped
 * along them, the manifold those lines run back to, and the racks the gas
 * plant's cylinders stand in under their lamps. Built, not ported: the
 * numbers are the hull script's, and every part the block lights only
 * cutting is clad in `ink.amberLampUnlit` and never lit
 * (docs/models-plan.md §3.2 rule 2).
 * ------------------------------------------------------------------------ */

/**
 * The boxed gantry frame at the bow the cutter ladders run out through —
 * "a boxed gantry frame" (docs/asset-prompts-3d.md, UNIT — Furnace). Four
 * legs on foot plates at the frame's two stations, a top beam a side and a
 * cross beam at each station over them, a guide sill at each station at
 * ladder height with a keeper over every ladder, one diagonal brace a
 * side from the after foot to the forward beam, and the bow floods on the
 * forward cross beam — clad, not lit, because the block floods the bow
 * only cutting. The Derrick's `lattice` above is the same navy's frame
 * carried out over both beams with its floods lit; this one stays inside
 * the deck edge, so the flanks are bare and the plan outline is the box's,
 * and lights nothing (`frame_leg_0..3 · frame_foot_0..3 · frame_beam_s/p ·
 * frame_cross_a/f · frame_sill_a/f · ladder_keeper_a_<tag>.. ·
 * ladder_keeper_f_<tag>.. · frame_brace_s/p · bow_flood_s/p`). Legs are
 * numbered starboard aft, starboard forward, port aft, port forward, as the
 * Derrick's are.
 */
export function cutterGantry(root, { grey, rust, unlit }, opts) {
  const { fwd, aft, z, deck, top, leg, foot, beam, sill, keepers, brace, floods } = opts;
  const stations = [
    [aft, 'a'],
    [fwd, 'f'],
  ];
  [
    [aft, z],
    [fwd, z],
    [aft, -z],
    [fwd, -z],
  ].forEach(([x, lz], i) => {
    add(root, `frame_leg_${i}`, box(leg.t, top - deck, leg.t), grey, [x, (top + deck) / 2, lz]);
    add(root, `frame_foot_${i}`, box(foot.size, foot.h, foot.size), rust, [x, deck + foot.h / 2, lz]);
  });
  bothSides((side, sgn) =>
    add(root, `frame_beam_${side}`, box(fwd - aft + beam.t, beam.t, beam.t), grey, [
      (fwd + aft) / 2,
      top,
      sgn * z,
    ])
  );
  for (const [x, tag] of stations)
    add(root, `frame_cross_${tag}`, box(beam.t, beam.t, 2 * z + beam.t), grey, [x, top, 0]);
  for (const [x, tag] of stations)
    add(root, `frame_sill_${tag}`, box(sill.t, sill.t, 2 * z + sill.t), rust, [x, sill.y, 0]);
  for (const [x, tag] of stations)
    for (const [ktag, kz] of keepers.at)
      add(root, `ladder_keeper_${tag}_${ktag}`, box(...keepers.size), rust, [x, keepers.y, kz]);
  bothSides((side, sgn) =>
    strut(
      root,
      `frame_brace_${side}`,
      [aft, deck + foot.h, sgn * z],
      [fwd, top - beam.t / 2, sgn * z],
      grey,
      brace.t
    )
  );
  bothSides((side, sgn) =>
    add(root, `bow_flood_${side}`, box(...floods.size), unlit, [fwd, floods.y, sgn * floods.z])
  );
}

/**
 * The cutter ladders run out ahead of the bow — "three cutter ladders run
 * out ahead of the bow from a boxed gantry frame, one on the keel and one
 * either side: each a lattice boom with a hooded burner head at its end
 * and gas lines strapped along it back to the manifold, so the plan is a
 * box with three prongs at the bow and the prongs are the count" (UNIT —
 * Furnace). Each ladder is `[tag, z]`, written whole in the order given —
 * starboard, keel, port — and the three are not a mirrored pair with one
 * between: the keel ladder is the count's middle term and is placed at its
 * own z like the others. A ladder is four chord rails along X; the lacing,
 * a zig-zag of struts across each side face and across the top, `bays` a
 * face, none on the underside nothing looks at; the light strip along the
 * top chords; the head at the tip — the coupling block, the hood's top
 * plate and two cheeks, the nozzle under them; the two gas lines along the
 * lower chords outboard of them with the straps that hold them; and the
 * feed drop at the aft end from each line to the manifold's height
 * (`ladder_chord_s_0..3 · ladder_lace_s_s0.. · ladder_lace_s_p0.. ·
 * ladder_lace_s_t0.. · ladder_strip_s · burner_block_s · burner_hood_s ·
 * burner_cheek_s_s/p · burner_nozzle_s · gas_line_s_s/p · gas_strap_s_0.. ·
 * gas_feed_s_s/p · ladder_chord_keel_0 …`).
 *
 * The strip and the nozzle are cladding in the lamp family's unlit finish,
 * because the block lights them — "the three burner heads the brightest
 * thing on the hull … the ladders and manifolds lit along their length" —
 * only cutting (docs/models-plan.md §3.2 rule 2). The hood is what makes
 * "a nozzle under a hood, not a muzzle": open ahead and below, its top
 * plate the prong's tip in plan and its lip proud of the nozzle's face, so
 * nothing on the ladder points the way a tube points. The prong's tip is
 * the hood's forward edge, and the hull script puts it on the bow.
 */
export function cutterLadders(root, { grey, rust, unlit }, opts) {
  const { ladders, aft, tip, y, half, chord, bays, lace, strip, head, lines, straps, feed } = opts;
  const length = tip - aft;
  const xc = (tip + aft) / 2;
  const onX = [0, 0, Math.PI / 2];
  const bay = length / bays;
  for (const [tag, z] of ladders) {
    [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].forEach(([sy, sz], j) =>
      add(root, `ladder_chord_${tag}_${j}`, box(length, chord, chord), grey, [
        xc,
        y + sy * half,
        z + sz * half,
      ])
    );
    // Side faces lace up and down between the lower and upper chords;
    // the top face laces across between the two upper chords.
    for (const [face, fz] of [
      ['s', 1],
      ['p', -1],
      ['t', 0],
    ])
      for (let i = 0; i < bays; i++) {
        const x0 = aft + i * bay;
        const s = i % 2 ? -1 : 1;
        const a = fz ? [x0, y - s * half, z + fz * half] : [x0, y + half, z - s * half];
        const b = fz ? [x0 + bay, y + s * half, z + fz * half] : [x0 + bay, y + half, z + s * half];
        strut(root, `ladder_lace_${tag}_${face}${i}`, a, b, grey, lace);
      }
    add(root, `ladder_strip_${tag}`, box(length - strip.inset, strip.h, strip.w), unlit, [
      xc,
      y + half + chord / 2 + strip.h / 2,
      z,
    ]);
    add(root, `burner_block_${tag}`, box(...head.block.size), rust, [tip + head.block.dx, y, z]);
    add(root, `burner_hood_${tag}`, box(head.length, head.plate, head.width), grey, [
      tip + head.length / 2,
      y + head.height / 2 - head.plate / 2,
      z,
    ]);
    bothSides((side, sgn) =>
      add(root, `burner_cheek_${tag}_${side}`, box(head.length, head.height, head.plate), grey, [
        tip + head.length / 2,
        y,
        z + sgn * (head.width / 2 - head.plate / 2),
      ])
    );
    add(
      root,
      `burner_nozzle_${tag}`,
      cyl(head.nozzle.r, head.nozzle.r, head.nozzle.length, 8),
      unlit,
      [tip + head.nozzle.dx, y + head.nozzle.dy, z],
      onX
    );
    bothSides((side, sgn) =>
      add(root, `gas_line_${tag}_${side}`, cyl(lines.r, lines.r, length, 8), rust, [
        xc,
        y + lines.dy,
        z + sgn * lines.dz,
      ], onX)
    );
    straps.x.forEach((sx, i) =>
      add(root, `gas_strap_${tag}_${i}`, box(...straps.size), rust, [sx, y + straps.dy, z])
    );
    bothSides((side, sgn) =>
      add(root, `gas_feed_${tag}_${side}`, cyl(lines.r, lines.r, feed.h, 8), rust, [
        feed.x,
        feed.y,
        z + sgn * lines.dz,
      ])
    );
  }
}

/**
 * The manifold the gas lines run back to: a header pipe lying across the
 * manifold house's forward face at the feed drops' height, on a post a
 * side where it runs past the house, a valve on it under each ladder — a
 * hub standing forward off the header and the wheel on it facing the bow
 * — and the sight strip along its top in the unlit finish, lit only
 * cutting with the ladders (§3.2 rule 2) (`manifold_header ·
 * manifold_post_s/p · valve_hub_<tag> · valve_wheel_<tag> .. ·
 * manifold_strip`).
 */
export function gasManifold(root, { rust, grey, unlit }, opts) {
  const { header, posts, valves, strip } = opts;
  add(root, 'manifold_header', cyl(header.r, header.r, header.length, 8), rust, header.at, ATHWART);
  bothSides((side, sgn) =>
    add(root, `manifold_post_${side}`, cyl(posts.r, posts.r, posts.h, 8), rust, [
      posts.x,
      posts.y,
      sgn * posts.z,
    ])
  );
  for (const [tag, z] of valves.at) {
    add(
      root,
      `valve_hub_${tag}`,
      cyl(valves.hub.r, valves.hub.r, valves.hub.length, 8),
      grey,
      [valves.hub.x, header.at[1], z],
      [0, 0, Math.PI / 2]
    );
    add(
      root,
      `valve_wheel_${tag}`,
      torus(valves.wheel.R, valves.wheel.t, 6, 12),
      grey,
      [valves.wheel.x, header.at[1], z],
      [0, Math.PI / 2, 0]
    );
  }
  add(root, 'manifold_strip', box(...strip.size), unlit, strip.at);
}

/**
 * The gas plant's racks — "two ranks of banded gas cylinders in racks on
 * the deck" and "the gas plant's lamps" (UNIT — Furnace). For each rank,
 * `[tag, z]`: the sill the bottles stand in, the bottles through
 * `gasBottles` with their bands, a post at each end of the rank and the
 * rail across them, and the plant's lamps on the rail — lit housings in
 * the machinery light, their tops to the chart, which is the resting light
 * the block names second and the one with plan area (`rack_sill_s ·
 * gas_bottle_s0 · gas_band_s0 .. · rack_post_s_a · rack_post_s_f ·
 * rack_rail_s · rack_lamp_s0.. · rack_sill_p …`).
 */
export function gasRacks(root, { grey, rust, amber, lampM }, opts) {
  const { ranks, bottles, band, sill, posts, rail, lamps } = opts;
  for (const [tag, z] of ranks) {
    add(root, `rack_sill_${tag}`, box(...sill.size), rust, [sill.x, sill.y, z]);
    gasBottles(root, amber, { ...bottles, z, tag, band: { mat: grey, ...band } });
    for (const [end, x] of [
      ['a', posts.xa],
      ['f', posts.xf],
    ])
      add(root, `rack_post_${tag}_${end}`, box(...posts.size), grey, [x, posts.y, z]);
    add(root, `rack_rail_${tag}`, box(...rail.size), grey, [rail.x, rail.y, z]);
    lamps.x.forEach((x, i) =>
      add(root, `rack_lamp_${tag}${i}`, box(...lamps.size), lampM, [x, lamps.y, z])
    );
  }
}

/* --------------------------------------------------------------------------
 * The Caisson (#787, off #540 Phase 4): the box of plate, the plant on its
 * back, and the two tubes in its bow face. Four families the navy had no
 * word for — the Bulwark's `armouredSlab` is a hull carrying its beam in
 * tiers, and this hull's plate is a *separate box bolted over the forward
 * two thirds* whose after edge is the step in the plan; `bandedTank` is a
 * structure's tank lying where it was dropped, one torus round it and flat
 * ends, and this one lies fore-and-aft on a hull's spine with dished heads
 * and saddles under it; `tubeCasings` bolts its tubes to the flank, and
 * these are let into the bow face; and the kit's `louvres` draws one bank
 * where a hull wants the pair. Built, not ported: every number is the hull
 * script's.
 * ------------------------------------------------------------------------ */

/**
 * The caisson: "a box of heavier plate bolted over the forward two thirds,
 * riveted, patchworked older-under-newer, its after edge standing proud of
 * the drive hull as a shoulder" (docs/asset-prompts-3d.md, UNIT — Caisson).
 *
 * In the file's order: the box itself — a square-edged plan, blunt at the
 * bow with a chamfer to each corner — then the plate courses laid on its
 * back, older first and the newer over it so the older shows round its
 * edges; the shoulder plate across its after face; the plough plate
 * standing proud of the bow face on the centreline with the hazard band
 * across the crown behind it; and a row of bolt heads down each flank,
 * starboard then port, which is what "bolted over" looks like at arm's
 * length (`caisson · caisson_course_0..n · caisson_shoulder · plough_plate
 * · plough_band · caisson_bolt_s0..n · caisson_bolt_p0..n`).
 *
 * The step is the whole point and `outlines.mjs` has to keep it: the box is
 * the widest thing on the hull at every station it covers, the drive hull
 * behind it is bare, and nothing on a flank — blister, strake — reaches
 * past the box's own half-beam but the bolt heads, which stand 0.2 m proud
 * of it and set the file's beam. A tier that stood proud of it
 * would read as one hull with a bulge rather than two boxes, which is the
 * Furnace's seam-on-the-flank fault (#786 review) in the other direction.
 */
export function caissonBox(root, mats, opts) {
  const { slab, courses = [], shoulder, plough, band, bolts } = opts;
  add(root, 'caisson', plan(slab.outline, slab.depth), mats[slab.mat ?? 'black'], [0, slab.y, 0]);
  courses.forEach((c, i) =>
    add(root, `caisson_course_${i}`, plan(c.outline, c.depth), mats[c.mat ?? 'grey'], [0, c.y, 0])
  );
  add(root, 'caisson_shoulder', box(...shoulder.size), mats.rust, shoulder.at);
  add(root, 'plough_plate', plan(plough.outline, plough.depth, plough.bevel ?? 0), mats.grey, [
    0,
    plough.y,
    0,
  ]);
  add(root, 'plough_band', box(...band.size), mats.amber, band.at);
  bothSides((side, sgn) => {
    for (let i = 0; i < bolts.count; i++)
      add(
        root,
        `caisson_bolt_${side}${i}`,
        cyl(bolts.r, bolts.r, bolts.h, 6),
        mats.grey,
        [bolts.from + ((bolts.to - bolts.from) * (i + 0.5)) / bolts.count, bolts.y, sgn * bolts.z],
        ATHWART
      );
  });
}

/**
 * "The Corvette's two torpedo tubes let into the bow face either side of
 * the plough plate, with hinged muzzle doors" — the Broadside's door idiom
 * moved off the flank and into the bow.
 *
 * A tube a side, starboard first, each written whole: the socket the tube
 * is let into, sunk back behind the bow face; the flange on the face; the
 * door shut on the flange; and the hinge knuckle standing up its outboard
 * edge, so the door swings out and clear of the hull (`bow_tube_s ·
 * tube_flange_s · tube_door_s · tube_hinge_s · bow_tube_p …`).
 *
 * Built loaded, like the Broadside (docs/models-plan.md §3.5): both doors
 * shut, so the bore is what the door is. Every part is cladding — the
 * muzzle flood is the instant of a launch, and a transient is not a lamp
 * (§3.2 rule 3) — and nothing points outboard: the tubes lie along the
 * keel and only the doors show.
 */
export function bowTubes(root, { black, grey, rust }, opts) {
  const { x, y, z, facets = 16, socket, flange, door, hinge } = opts;
  const onX = [0, 0, Math.PI / 2];
  bothSides((side, sgn) => {
    const at = (dx) => [x + dx, y, sgn * z];
    add(root, `bow_tube_${side}`, cyl(socket.r, socket.r, socket.depth, facets), black, at(-socket.depth / 2), onX);
    add(root, `tube_flange_${side}`, cyl(flange.r, flange.r, flange.width, facets), rust, at(flange.width / 2), onX);
    add(root, `tube_door_${side}`, cyl(door.r, door.r, door.h, facets), grey, at(flange.width + door.h / 2), onX);
    add(root, `tube_hinge_${side}`, cyl(hinge.r, hinge.r, hinge.h, 8), rust, [
      x + flange.width + door.h / 2,
      y,
      sgn * (z + hinge.out),
    ]);
  });
}

/**
 * The plant's pressure cylinder: "a riveted pressure cylinder lying
 * fore-and-aft along the spine with dished heads".
 *
 * The drum on the centreline, the reinforcement bands round it — flat
 * bands like `tubeCasings`', not `bandedTank`'s torus — a dished head at
 * each end, fore then aft as `ballastBlisters` orders its caps, and the
 * saddles it sits on (`plant_cylinder · plant_band_0..n · plant_head_f ·
 * plant_head_a · plant_saddle_0..n`). The drum is hull black under grey
 * bands and oxide heads, not plate grey: it stands on a grey deck, and a
 * grey cylinder on it is the one part of the plant the top-down albedo
 * cannot tell from the deck it sits on.
 *
 * The heads are frusta drawn in to `heads.tipR`, so the plan bump they add
 * has the chamfered corners a dished pressure head reads as from above and
 * not the square ones a flat end would give — the Beacon's drum heads, the
 * same reason (`transducerDrum`). A cylinder laid on X by a quarter turn
 * about Z carries its `rTop` onto −X, so the fore head is `cyl(r, tipR)`
 * and the after one `cyl(tipR, r)`.
 */
export function plantCylinder(root, { black, grey, rust }, opts) {
  const { at, r, length, facets = 16, bands, heads, saddles } = opts;
  const [x, y, z] = at;
  const onX = [0, 0, Math.PI / 2];
  add(root, 'plant_cylinder', cyl(r, r, length, facets), black, at, onX);
  bands.x.forEach((bx, i) =>
    add(root, `plant_band_${i}`, cyl(bands.r, bands.r, bands.width, facets), grey, [bx, y, z], onX)
  );
  for (const [end, cx, rTop, rBottom] of [
    ['f', x + length / 2 + heads.length / 2, r, heads.tipR],
    ['a', x - length / 2 - heads.length / 2, heads.tipR, r],
  ])
    add(root, `plant_head_${end}`, cyl(rTop, rBottom, heads.length, facets), rust, [cx, y, z], onX);
  saddles.x.forEach((sx, i) =>
    add(root, `plant_saddle_${i}`, box(...saddles.size), rust, [sx, saddles.y, z])
  );
}

/**
 * "A rank of exhaust louvres down each side that have no shutters, because
 * there is nothing aboard to throttle": the kit's `louvres` a side, laid on
 * the deck rather than hung on a wall, over a well of hull black that the
 * gaps between the slats show (`louvre_well_s · louvre_s_0..n ·
 * louvre_well_p · louvre_p_0..n`).
 *
 * The kit's builder draws one bank and this navy's hulls are bilateral, so
 * the pair is here, and the port rank's tilt mirrors the starboard rank's,
 * as every pair on this hull mirrors: §3.6's one-side-at-a-time rule is
 * the Commune's and the Directorate's, and a plate navy is not it. Every slat presents `slat·cos(tilt)` of plan width, which is
 * why this is the one light on the hull that the top-down bake sees whole
 * (kit.mjs `louvres`). `machineryHouse` above is the same form stood
 * against a wall: the Derrick's well is raked from the deck up to the
 * house side and its blades step down the rake (#893).
 */
export function exhaustLouvres(root, { black, flood }, opts) {
  const { x, y, z, length, well, slats } = opts;
  bothSides((side, sgn) => {
    add(root, `louvre_well_${side}`, box(...well.size), black, [x, well.y, sgn * z]);
    louvres(root, `louvre_${side}`, flood, {
      ...slats,
      x,
      y,
      z: sgn * z,
      length,
      tilt: sgn * (slats.tilt ?? 0.5),
    });
  });
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

/*
 * The structures' palette was `structureInk` until #888: the turret's own
 * three claddings, less rough than the hulls', and `work_lamp`. The lamp is
 * `ink.workLamp` now — the fixture the approved turret named, the token
 * through and through at 0.35 rough where `amber_lamp` sits on a near-black
 * base; the same amber, at 2.4 — and the three claddings are `ink`'s, at
 * the hulls' finish, one value a name.
 */

/**
 * The heat exchanger on the end of a Vent Tap's draw arm, on `bearing`
 * (#608): a black box with five iron fins through it, the hazard band round
 * its roof, a stack behind it banded amber, the vent grating on the roof, the
 * anchor foot beyond, and a rank of four rivets. Distances are metres out
 * along the bearing, as the kit's `ventDrawArm` takes them.
 *
 * One thing is the approved file's and is carried across rather than
 * corrected (#540): the rivets stagger `rivets.stagger` either side of their
 * rank in *global* z on every arm, not across the arm, so the rank leans one
 * way on two arms and the other way on the other two. The grating is the
 * exchanger's lamp, the last lamp of its pipe run ("lamps along every pipe
 * run"), in `vent`, at `grating.y`: the export set it inside the hazard
 * band's slab, where the top-down bake never saw it, and since #890 the
 * Klaxon's tap stands it on the band's top face, as the Order's
 * `exchanger_seam` stands on its frame's. The Klaxon's tap is this
 * builder's one caller; the Order's calls `hadron.exchangerHead`.
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
 * Every number is the approved turret's own (#639), through kit.mjs `drawn`:
 * the raft an eight-facet frustum, `rTop` over `r` — eight-sided rather than
 * square, because an octagon is what reads as *plate cut and welded* from
 * above — and on each of the four diagonal bearings, π/4 + n·π/2 round from
 * +X toward +Z, which is the numbering above, a foot at `foot.radius` yawed
 * by minus its bearing so its long side lies tangential, and its bolt
 * outboard at `bolt.radius`, both standing on the ground.
 */
export function anchoredRaft(root, { black, rust, grey }, opts) {
  const { at, r, rTop = r, height, foot, bolt } = opts;
  const [cx, cy, cz] = at;
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
}

/**
 * The mount: a drum on the raft, its ring, a rank of rivets round it at a
 * fixed pitch, one patch of older plate showing through, and the feed pipe
 * standing beside it.
 *
 * The rivets are a rank rather than a scatter — the Klaxon repairs in
 * straight lines even when the thing repaired is round.
 *
 * Every number is the approved turret's own (#639), through kit.mjs `drawn`:
 * `r` is `[top, bottom]` and the drum a frustum of `facets`, the ring a torus
 * of five by `ring.facets`, the rivets spheres of `rivets.segments` from
 * `rivets.from` *radians* round from +X toward +Z, the patch a box at
 * `patch.at` turned `patch.rot` — and no feed: the approved file writes that
 * after the gun (`feedPipe` below).
 */
export function mountDrum(root, { black, grey, rust }, opts) {
  const { at, r, height, ring, rivets, patch, facets = 10 } = opts;
  const [cx, , cz] = at;
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
}

/**
 * The feed pipe beside the mount: a six-facet pipe of radius `r` stood
 * between two points of the export's frame — at their midpoint, turned by
 * the one rotation that carries +Y onto the run (three's
 * `setFromUnitVectors`), which is exactly the node matrix the approved file
 * holds for (0.5, 0.4, -0.45) to (0.2, 0.95, -0.25). The pipe runs from the
 * drum's foot up toward the housing, leaning two ways to do it, and the file
 * writes it after the gun rather than with the drum — which is why it is its
 * own builder and not a line of `mountDrum` (#639).
 */
export function feedPipe(root, rust, { from, to, r, facets = 6 }) {
  // The same rule stands every pipe on the Refinery and the Bastion (#652),
  // so the arithmetic lives once, in `pipeBetween` below.
  pipeBetween(root, alongZ, rust, { name: 'feed_pipe', from, to, r, facets });
}

/**
 * The housing that trains, its glacis, and the patch riveted over its roof.
 *
 * Every number is the approved turret's own (#639), through kit.mjs `drawn`:
 * the gun is trained `bearing` radians off the export's +Z toward +X, so the
 * housing and the roof patch are yawed by it where they stand (`at`), and the
 * glacis sits `along` the bearing at height `y`, pitched `pitch` about its
 * own beam and yawed with them.
 *
 * The glacis's turn is written in YXZ order — the yaw, then the pitch about
 * the axis the yaw carried its beam onto (kit.mjs `eulerXYZ`). The approved
 * file wrote the same two numbers in XYZ, which pitches about the export's
 * own X after the yaw and so rolled the plate 0.16 rad out of the housing's
 * plane, one end of it 4 m lower than the other at 120 m. That is the slip
 * the gun's tubes carry too (`heavyBarrel` below), and it comes out in the
 * same pass (#645, off #540 Phase 6).
 */
export function turretHouse(root, { black, grey, rust }, { housing, glacis, roofPatch, bearing }) {
  part(root, 'turret_housing', box(...housing.size), black, drawn(housing.at, [0, bearing, 0]));
  const at = [glacis.along * Math.sin(bearing), glacis.y, glacis.along * Math.cos(bearing)];
  const trained = eulerXYZ([glacis.pitch, bearing, 0], 'YXZ');
  part(root, 'turret_glacis', box(...glacis.size), grey, drawn(at, trained));
  const roof = box(...roofPatch.size);
  part(root, 'turret_roof_patch', roof, rust, drawn(roofPatch.at, [0, bearing, 0]));
}

/**
 * A short thick gun on a static mount: breech, barrel, jacket, muzzle brake,
 * the recoil cylinder alongside and the counterweight astern.
 *
 * The gun is one axis. It is trained `bearing` radians off the export's +Z
 * toward +X and runs through the breech's centre and the brake's, both where
 * the approved turret has them (#639) — `along` the bearing at height `y` —
 * so its pitch is the file's own droop, 0.055 rad down from breech to
 * muzzle, and not a number chosen here. The barrel and the jacket sit on
 * that axis at their own `along`; the recoil cylinder keeps its own `y`
 * under the breech and lies parallel; the counterweight is a box yawed by
 * the bearing, astern. The five tubes are eight-facet frusta, `r` `[top,
 * bottom]` by `length` (the recoil cylinder six-facet), each laid along the
 * axis in YXZ order — the yaw, then a quarter turn less the pitch about the
 * beam the yaw carried the tube's X onto (kit.mjs `eulerXYZ`).
 *
 * The approved file turned each tube `[π/2 − 0.06, bearing, 0]` in three's
 * XYZ order, which yaws *before* it lays the tube down, so every tube lay
 * parallel to the export's +Z with only its centre out on the bearing:
 * breech, jacket, barrel and brake staggered across the line of fire, each
 * on its own axis, the brake 17 m off the barrel's at 120 m, and all of them
 * pitched 0.06 up while their centres stepped down. The port carried that
 * (#639), as a port must; this is the pass it deferred it to (#645, off #540
 * Phase 6). Against the file the jacket comes 0.44 m and the barrel 0.17 m
 * onto the axis, under a pixel at the 1.5 px/m a structure bakes at; the
 * breech, the brake and the recoil cylinder stand where they stood, turned
 * onto the axis with the rest, and the counterweight does not move at all.
 */
export function heavyBarrel(root, { black, grey, rust }, opts) {
  const { breech, barrel, jacket, brake, recoil, counterweight, bearing } = opts;
  const pitch = Math.atan2(brake.y - breech.y, brake.along - breech.along);
  const at = (p) => [p.along * Math.sin(bearing), p.y, p.along * Math.cos(bearing)];
  const onAxis = (p) => ({ ...p, y: breech.y + (p.along - breech.along) * Math.tan(pitch) });
  const laid = eulerXYZ([Math.PI / 2 - pitch, bearing, 0], 'YXZ');
  const tube = (name, p, mat, facets = 8) =>
    part(root, name, cyl(p.r[0], p.r[1], p.length, facets), mat, drawn(at(p), laid));
  tube('barrel_breech', breech, grey);
  tube('barrel', onAxis(barrel), black);
  tube('barrel_jacket', onAxis(jacket), rust);
  tube('muzzle_brake', brake, grey);
  tube('recoil_cylinder', recoil, grey, 6);
  const weight = box(...counterweight.size);
  part(root, 'counterweight', weight, rust, drawn(at(counterweight), [0, bearing, 0]));
}

/**
 * The one work lamp on its bracket — the turret's whole resting light budget,
 * flat on an upward face because the maps are top-down (kit.mjs). Every
 * number is the approved turret's own (#639): a sphere of `r` on `segments`
 * at `at` with the bracket box under it, through kit.mjs `drawn`.
 */
export function baseLamp(root, { lampMat, black }, { at, bracket, r, segments = [6, 4] }) {
  part(root, 'base_lamp', new THREE.SphereGeometry(r, ...segments), lampMat, drawn(at));
  part(root, 'base_lamp_bracket', box(...bracket.size), black, drawn(bracket.at));
}

/* --------------------------------------------------------------------------
 * The Slipway (#652): the Klaxon's yard on the kit's skeleton (kit.mjs
 * `slipwayBed`, `slipwayGantry`, `slipwayHeadGate`). What is the Klaxon's
 * is the hull on the blocks, the posts — a square iron column with a rust
 * brace collar, a black square pylon — and the hall: a riveted shed in
 * "boxy, riveted, over-engineered rectangles and cylinders". Every number
 * is the approved slipway-bathyarch.glb's own and is the default.
 * ------------------------------------------------------------------------ */

/** A gantry leg: a square iron column, 44 m tall, 32 m out from the slip's centre. */
export const slipwayLeg = (grey) =>
  sidedPost({ name: 'gantry_leg', geo: () => box(6, 44, 6), mat: grey, y: 22, spread: 32 });

/** The collar on a leg: a rust brace plate round the column at 30 m. */
export const slipwayBrace = (rust) =>
  sidedPost({ name: 'gantry_leg_brace', geo: () => box(8, 3, 8), mat: rust, y: 30, spread: 32 });

/** A head pylon: a black square column, 50 m tall, 34 m out. */
export const slipwayPylon = (black) =>
  sidedPost({ name: 'head_pylon', geo: () => box(12, 50, 12), mat: black, y: 25, spread: 34 });

/**
 * The hull in progress on the keel blocks: an iron box 110 m long with a
 * rust deck on it, laid a third of the way down the slip toward the mouth.
 * The kit's `slipwayBed` calls this between the last block and the sill.
 */
export function slipwayHull(root, { hull: grey, deck: rust }, opts = {}) {
  const {
    body = { size: [110, 8, 22], at: [-50, 8, 0] },
    deck = { size: [60, 1, 18], at: [-60, 12.5, 0] },
  } = opts;
  add(root, 'hull_in_progress', box(...body.size), grey, body.at);
  add(root, 'hull_in_progress_deck', box(...deck.size), rust, deck.at);
}

/**
 * One hall flanking the slip, on `sgn`'s side, built into `hall` (the
 * `hall_s` or `hall_p` frame the script makes): the black shed body with
 * its iron roof and rust ridge, eight iron pilasters through it each with
 * a rust roof vent over its outer eave, three black stacks banded amber,
 * two roof patches, the hazard stripe along the inner eave, the iron slip
 * apron along the floor's edge with six floods on it, four iron tanks laid
 * along the outer wall, and a rank of rivets down the outer eave.
 *
 * Every z here is `sgn` times the file's, so the −z hall is the +z hall's
 * mirror to the digit — which the approved file is; nothing on the Klaxon
 * refuses a matched pair. The rivets take their numbers from the hall's
 * own child count (`rivetRow`): 39 parts precede them, so they run
 * `rivet_39..62` in both halls, as the approved file has them.
 */
export function slipwayHall(hall, { black, grey, rust, amber, flood }, opts) {
  const {
    sgn,
    z = 54,
    body = { size: [300, 30, 50], y: 15 },
    roof = { size: [302, 3, 54], y: 31 },
    ridge = { size: [296, 3, 8], y: 34 },
    pilasters = { count: 8, from: -140, pitch: 40, size: [6, 32, 54], y: 16 },
    vents = { size: [4, 2.5, 4], y: 33.5, z: 66 },
    stacks = { xs: [-100, -10, 80], y: 42, z: 68, r: 4.2, rTop: 3.5, height: 26 },
    bands = { y: 50, r: 4.4, h: 2 },
    patches = [
      { size: [40, 3.2, 16], at: [-60, 32.6, 46], mat: rust },
      { size: [24, 3.2, 12], at: [90, 32.6, 64], mat: grey },
    ],
    stripe = { size: [296, 0.6, 2], y: 32.6, z: 30 },
    apron = { size: [320, 2, 8], y: 1, z: 27 },
    floods = { count: 6, from: -125, pitch: 50, size: [10, 0.5, 5], y: 2.1 },
    tanks = { xs: [-120, -40, 40, 120], y: 3, z: 90, r: 6, length: 40 },
    rivets = { from: -145, to: 145, count: 24, y: 32.7, z: 78, size: [2.2, 1.32, 2.2] },
  } = opts;
  add(hall, 'hall_body', box(...body.size), black, [0, body.y, sgn * z]);
  add(hall, 'hall_roof', box(...roof.size), grey, [0, roof.y, sgn * z]);
  add(hall, 'hall_ridge', box(...ridge.size), rust, [0, ridge.y, sgn * z]);
  for (let i = 0; i < pilasters.count; i++) {
    const x = pilasters.from + pilasters.pitch * i;
    add(hall, `pilaster_${i}`, box(...pilasters.size), grey, [x, pilasters.y, sgn * z]);
    add(hall, `roof_vent_${i}`, box(...vents.size), rust, [x, vents.y, sgn * vents.z]);
  }
  stacks.xs.forEach((x, i) => {
    stack(hall, black, {
      name: `stack_${i}`,
      at: [x, stacks.y, sgn * stacks.z],
      r: stacks.r,
      rTop: stacks.rTop,
      height: stacks.height,
    });
    stackBand(hall, amber, {
      name: `stack_band_${i}`,
      at: [x, bands.y, sgn * stacks.z],
      r: bands.r,
      h: bands.h,
    });
  });
  patches.forEach(({ size, at: [x, y, pz], mat }, i) =>
    add(hall, `patch_${'ab'[i]}`, box(...size), mat, [x, y, sgn * pz])
  );
  add(hall, 'hazard_stripe', box(...stripe.size), amber, [0, stripe.y, sgn * stripe.z]);
  add(hall, 'slip_apron', box(...apron.size), grey, [0, apron.y, sgn * apron.z]);
  for (let i = 0; i < floods.count; i++)
    add(hall, `apron_flood_${i}`, box(...floods.size), flood, [
      floods.from + floods.pitch * i,
      floods.y,
      sgn * apron.z,
    ]);
  // A tank is born on Y and laid along the wall by −π/2 about Z, as the file has it.
  tanks.xs.forEach((x, i) =>
    add(
      hall,
      `tank_${i}`,
      cyl(tanks.r, tanks.r, tanks.length, 10),
      grey,
      [x, tanks.y, sgn * tanks.z],
      [0, 0, -Math.PI / 2]
    )
  );
  rivetRow(hall, grey, { ...rivets, z: sgn * rivets.z });
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

/*
 * The shared kinds' palette was `scoutInk` until #888: the Bulwark's four
 * claddings to the value, and an `amber_lamp` that was the token through
 * and through at 3.5. The five scripts that read it — the Light Scout, the
 * Corvette, the Cruiser, the Harvester and the Foundry — read `ink` now and
 * pass the 3.5; the base moved to the navy's near-black (`ink.amberLamp`).
 */

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

/*
 * The Cruiser's vent was `cruiserInk.amberVent` until #888: #F28A1E on an
 * amber-through base, 0.5 rough, at 2.2, the approved export's own. It is
 * `ink.amberVent` now, at 3.516 for the luminance the light lost on the way
 * (the arithmetic is on the factory).
 */

/**
 * Running lights along the hull line — "dim accent running lights along the
 * hull line" (docs/asset-prompts-3d.md, UNIT — Corvette): the same rank as
 * `flankRivets`, one shared box a side at fixed stations, in a lamp. Named
 * `runlight_<side><i>` on the Corvette and `marker_<side><i>` on the
 * Harvester. Since #890 both ranks are pads on the deck edge rather than
 * dots on the flank — the Corvette's on its deck plate outboard of the deck
 * pipes, the Harvester's on its gunwale tops — so each shows its top face to
 * the bake (docs/models-plan.md §3.2 rule 5).
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
 * length of each hull tier, the port run written first and the starboard
 * run sharing its boxes, then the one across the stern (`lightline_low_p ·
 * _mid_p · _up_p · _low_s … · lightline_stern`). The export hung each
 * strip on the tier's flank under its deck plate, where the bake saw
 * nothing; since #890 the same box lies flat on the deck plate's outer
 * edge, its 0.5 across and 0.18 tall, and the strip is the tier's lit rim.
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
 * and its palette is `ink`'s hyphenated set (`hullBlackHeavy`,
 * `ironGreyHeavy`, `oxideBrown`, `runningLight`), which was `submersibleInk`
 * until #888.
 * ------------------------------------------------------------------------ */

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
  // `running.at` names a light out of its rank — `{ 'stb-4': [x, y, z] }` —
  // for the one the Submersible remounts over a repair patch (#890); the
  // rank itself is unmoved and the Barge passes none.
  const moved = running.at ?? {};
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ])
    running.stations.forEach((x, i) =>
      add(
        root,
        `running-light-${side}-${i + 1}`,
        box(...running.size),
        lampM,
        moved[`${side}-${i + 1}`] ?? [x, running.y, sgn * running.z]
      )
    );
  // The Baffle Barge's six running lights are this rank in this order and
  // nothing else of it (#652), so the strip and the beacon are optional.
  if (strip) add(root, 'tower-light-strip', box(...strip.size), lampM, strip.at);
  if (beacon) add(root, 'aft-beacon', cyl(beacon.rTop, beacon.r, beacon.h, 8), lampM, beacon.at);
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

/* --------------------------------------------------------------------------
 * The Foundry, the Nodule Refinery, the Bastion and the Baffle Barge (#652,
 * off #540 Phase 3): the Klaxon's four remaining approved structures. The
 * first three are the earlier authoring pass the Sentinel Turret came from
 * and share nothing with the other navies' Foundries, Refineries and
 * Bastions — the turret's bolted raft and riveted drum grown into a riveted
 * hall with gantry cranes, a rank of silos with a crusher, a ribbed dome
 * with docking collars; the fourth is the navy's own signature structure.
 * Two of the four are Z-long exports (the Foundry and the Bastion) and two
 * are X-long (the Refinery and the Barge), and one vocabulary — a banded
 * tank, a pipe stood between two points, a work lamp on a post — sits on
 * both kinds of file, so every builder here takes a `put` that says which
 * frame it lands in, and is written once. Every number is the approved
 * export's own, read off parts.mjs, and every oddity is carried across
 * rather than corrected (#540); the builder that carries one says so.
 * ------------------------------------------------------------------------ */

/**
 * The frame a structure builder lands its parts in, as `put(root, name,
 * geo, mat, t, e, s)` with every argument the export's own — translation,
 * XYZ Euler and scale. `alongZ` is a Z-long export's: kit `part` and
 * `drawn`, the one yaw, the way the Sentinel Turret and the shared kinds
 * are built. `inFrame` is an X-long export's: kit `add` in the file's own
 * frame, nothing turned, the way the Submersible and the Choristers are.
 */
export const alongZ = (root, name, geo, mat, t, e, s) => part(root, name, geo, mat, drawn(t, e, s));
export const inFrame = (root, name, geo, mat, t, e, s) => add(root, name, geo, mat, t, e, s);

/** The work lamp these three structures hang everywhere: a six-by-four orb, as the turret's `base_lamp` is. */
const lampOrb = (r) => new THREE.SphereGeometry(r, 6, 4);

/*
 * The Baffle Barge's palette was `bargeInk` until #888: the Submersible's
 * four hyphenated finishes and two of its own, the foam and the hazard
 * paint. All six are `ink`'s now (`baffleFoam`, `hazardPaint`).
 */

/**
 * A pipe stood between two points of the export's frame: at their
 * midpoint, `length` their distance, turned by the one rotation that
 * carries +Y onto the run (three's `setFromUnitVectors`) — the turret's
 * `feed_pipe` rule, which every pipe on the Refinery and the Bastion
 * follows, each from a round point to a round point. The export's own
 * midpoints and lengths fall out of the same arithmetic, to the bit.
 */
export function pipeBetween(root, put, mat, { name, from, to, r, facets = 6 }) {
  const A = new THREE.Vector3(...from);
  const B = new THREE.Vector3(...to);
  const run = B.clone().sub(A);
  const e = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), run.clone().normalize()),
    'XYZ'
  );
  const mid = A.clone().add(B).multiplyScalar(0.5).toArray();
  put(root, name, cyl(r, r, run.length(), facets), mat, mid, [e.x, e.y, e.z]);
}

/**
 * A ballast tank with a reinforcing band round it: a nine-facet drum and,
 * where the file fits one, a five-by-ten torus of `band.R` by `band.t` at
 * the same point under the same turn (`ballast · ballast_band` on the
 * Refinery, `ballast_a · ballast_a_band` on the Bastion, whose `ballast_b`
 * has none). `ballastBlisters` and `ballastPair` above are hulls' pairs
 * along the keel; a structure's tank lies where it was dropped.
 */
export function bandedTank(root, put, { tank, band: bandMat }, opts) {
  const { name, at, r, length, facets = 9, rot, band } = opts;
  put(root, name, cyl(r, r, length, facets), tank, at, rot);
  if (band) put(root, `${name}_band`, torus(band.R, band.t, 5, 10), bandMat, at, rot);
}

/* -- The Foundry: "unit production hall with a recessed launch bay and
 *    gantry cranes" — a Z-long export, every builder through `alongZ`. -- */

/**
 * The foundation: the slab on the seabed, the step it stands on in older
 * plate, and an anchor pylon at each corner — fore then aft, port then
 * starboard (`foundation_slab · foundation_step · anchor_pylon_pf · _sf ·
 * _pa · _sa`). The step is wider than the slab and sinks a tenth into the
 * ground.
 */
export function foundationSlab(root, put, { black, rust }, { slab, step, pylons }) {
  put(root, 'foundation_slab', box(...slab.size), black, slab.at);
  put(root, 'foundation_step', box(...step.size), rust, step.at);
  for (const [end, z] of [
    ['f', pylons.fore],
    ['a', pylons.aft],
  ])
    flanks((side, sgn) =>
      put(root, `anchor_pylon_${side}${end}`, box(...pylons.size), rust, [
        sgn * pylons.x,
        pylons.y,
        z,
      ])
    );
}

/**
 * The production hall: the body on its plinth under its roof and ridge,
 * the gable closing the bay end, the lintel over the bay mouth, and a rank
 * of ribs down each flank — port then starboard at every station, which is
 * how the file interleaves them (`hall_body · hall_plinth · hall_roof ·
 * hall_roof_ridge · hall_gable · bay_lintel · rib_p0 · rib_s0 · rib_p1 …`).
 * A box each; nothing shared.
 */
export function productionHall(root, put, { grey, black }, opts) {
  const { body, plinth, roof, ridge, gable, lintel, ribs } = opts;
  put(root, 'hall_body', box(...body.size), grey, body.at);
  put(root, 'hall_plinth', box(...plinth.size), black, plinth.at);
  put(root, 'hall_roof', box(...roof.size), black, roof.at);
  put(root, 'hall_roof_ridge', box(...ridge.size), grey, ridge.at);
  put(root, 'hall_gable', box(...gable.size), grey, gable.at);
  put(root, 'bay_lintel', box(...lintel.size), black, lintel.at);
  ribs.stations.forEach((z, i) =>
    flanks((side, sgn) =>
      put(root, `rib_${side}${i}`, box(...ribs.size), black, [sgn * ribs.x, ribs.y, z])
    )
  );
}

/**
 * The hall's two stacks: a twelve-facet frustum in older plate with the
 * hazard band ringed round it, and a second, shorter, in black with no band
 * (`stack_a · stack_a_band · stack_b`). `stack` and `stackBand` above are
 * the Tender's and the Bulwark's ten-facet ones in the X-long frame.
 */
export function hallStacks(root, put, { rust, amber, black }, { a, band, b }) {
  put(root, 'stack_a', cyl(a.radii[0], a.radii[1], a.h, 12), rust, a.at);
  put(root, 'stack_a_band', cyl(band.r, band.r, band.h, 12), amber, band.at);
  put(root, 'stack_b', cyl(b.radii[0], b.radii[1], b.h, 12), black, b.at);
}

/** Two roof vents, a box each, one older plate and one black (`roof_vent_a · roof_vent_b`). */
export function roofVents(root, put, { rust, black }, { a, b }) {
  put(root, 'roof_vent_a', box(...a.size), rust, a.at);
  put(root, 'roof_vent_b', box(...b.size), black, b.at);
}

/**
 * "Visibly patchworked repairs, older armour showing through newer plate":
 * a rank of patches, `[name, plate, size, at]` each, a thin box in the
 * plate named — older under newer, none the size of its opposite, on the
 * flanks, the roof and the gable as the file scatters them.
 */
export function repairPatches(root, put, mats, { patches }) {
  for (const [name, plate, size, at] of patches) put(root, name, box(...size), mats[plate], at);
}

/**
 * "A recessed launch bay … the forge light across the bay and at its
 * mouth": the bay walls a side and the wall closing it aft, the sill
 * across its mouth, an apron a side with a hazard stripe along it, the lit
 * forge floor and back wall, a lit rim strip along each wall and one across
 * the front, a lit seam down each eave of the hall roof, and the strip
 * under the gable — in that order, the file's (`bay_wall_p · _s · _aft ·
 * bay_sill · apron_p · _s · apron_stripe_p · _s · forge_floor ·
 * forge_backwall · bay_rim_strip_p · _s · _fwd · roof_seam_p · _s ·
 * gable_strip`). The roof seams are the hall's and the file writes them
 * with the bay's light, so this does. Every lamp is `amber_lamp` at 3.5,
 * the scout's; the forge floor faces up and is most of what the bake sees
 * of SIG 25.
 */
export function launchBay(root, put, { grey, black, amber, lampM }, opts) {
  const { walls, aft, sill, aprons, stripes, floor, backwall, rim, seams, gableStrip } = opts;
  flanks((side, sgn) =>
    put(root, `bay_wall_${side}`, box(...walls.size), grey, [sgn * walls.x, walls.y, walls.z])
  );
  put(root, 'bay_wall_aft', box(...aft.size), black, aft.at);
  put(root, 'bay_sill', box(...sill.size), black, sill.at);
  flanks((side, sgn) =>
    put(root, `apron_${side}`, box(...aprons.size), black, [sgn * aprons.x, aprons.y, aprons.z])
  );
  flanks((side, sgn) =>
    put(root, `apron_stripe_${side}`, box(...stripes.size), amber, [
      sgn * stripes.x,
      stripes.y,
      stripes.z,
    ])
  );
  put(root, 'forge_floor', box(...floor.size), lampM, floor.at);
  put(root, 'forge_backwall', box(...backwall.size), lampM, backwall.at);
  flanks((side, sgn) =>
    put(root, `bay_rim_strip_${side}`, box(...rim.side.size), lampM, [
      sgn * rim.side.x,
      rim.side.y,
      rim.side.z,
    ])
  );
  put(root, 'bay_rim_strip_fwd', box(...rim.fwd.size), lampM, rim.fwd.at);
  // The seams run along the eaves, flush against the roof slab's edge at its
  // own height, where the chart sees their whole length. The approved file
  // had them inside the slab, where no bake sees them, and #890 clad them;
  // #893 moved them to the eave and relit them.
  flanks((side, sgn) =>
    put(root, `roof_seam_${side}`, box(...seams.size), lampM, [sgn * seams.x, seams.y, seams.z])
  );
  put(root, 'gable_strip', box(...gableStrip.size), lampM, gableStrip.at);
}

/**
 * "Gantry cranes": a rail a side along the bay aprons, then each crane in
 * turn — a leg a side, the bridge across them, its chord, the trolley and
 * the hook under it at the trolley's own station, the hazard stripe on the
 * bridge's bay face and the flood patch under the bridge (`crane_rail_p ·
 * _s · crane_fwd_leg_p · _s · crane_fwd_bridge · _bridge_chord · _trolley ·
 * _hook · _stripe · _floodpatch · crane_aft_…`). The forward trolley is
 * run out to starboard and the after one to port, as the file has them.
 * `derrickRig` above is the Tender's swung boom; a gantry bridges.
 */
export function gantryCranes(root, put, { grey, black, rust, amber, lampM }, opts) {
  const { rails, cranes, legs, bridge, chord, trolley, hook, stripe, flood } = opts;
  flanks((side, sgn) =>
    put(root, `crane_rail_${side}`, box(...rails.size), grey, [sgn * rails.x, rails.y, rails.z])
  );
  for (const { tag, z, trolley: tx } of cranes) {
    flanks((side, sgn) =>
      put(root, `crane_${tag}_leg_${side}`, box(...legs.size), grey, [sgn * legs.x, legs.y, z])
    );
    put(root, `crane_${tag}_bridge`, box(...bridge.size), grey, [0, bridge.y, z]);
    put(root, `crane_${tag}_bridge_chord`, box(...chord.size), black, [0, chord.y, z]);
    put(root, `crane_${tag}_trolley`, box(...trolley.size), black, [tx, trolley.y, z]);
    put(root, `crane_${tag}_hook`, box(...hook.size), rust, [tx, hook.y, z]);
    put(root, `crane_${tag}_stripe`, box(...stripe.size), amber, [0, stripe.y, z + stripe.proud]);
    // The flood patch is the crane's lamp: a lit bar the bridge's length
    // laid along the top of its chord, where the chart sees it. The
    // approved file hung it under the bridge, where nothing did, and #890
    // clad it; #893 raised it onto the chord and relit it.
    put(root, `crane_${tag}_floodpatch`, box(...flood.size), lampM, [0, flood.y, z]);
  }
}

/**
 * The tanks along the hall's flanks: two to port, one over the other in
 * black and older plate, strapped twice; one to starboard in older plate
 * with a black cap drawn in on its forward end (`tank_p1 · tank_p2 ·
 * tank_strap_a · tank_strap_b · tank_s1 · tank_s_cap`). Eighteen-facet
 * drums laid along the export's z by the same quarter turn the shared
 * kinds put on a keel drum. No pair on this hall matches its opposite.
 */
export function sideTanks(root, put, { black, rust, grey }, { p1, p2, straps, s1, sCap }) {
  put(root, 'tank_p1', cyl(p1.r, p1.r, p1.length, 18), black, p1.at, ALONG_KEEL);
  put(root, 'tank_p2', cyl(p2.r, p2.r, p2.length, 18), rust, p2.at, ALONG_KEEL);
  for (const [tag, z] of [
    ['a', straps.a],
    ['b', straps.b],
  ])
    put(root, `tank_strap_${tag}`, box(...straps.size), grey, [straps.x, straps.y, z]);
  put(root, 'tank_s1', cyl(s1.r, s1.r, s1.length, 18), rust, s1.at, ALONG_KEEL);
  put(
    root,
    'tank_s_cap',
    cyl(sCap.radii[0], sCap.radii[1], sCap.length, 18),
    black,
    sCap.at,
    ALONG_KEEL
  );
}

/**
 * The hall's pipework: a run a side laid across the export's x — a
 * twelve-facet pipe rolled a quarter turn about z, `[name, plate, r,
 * length, at]` each, port in older plate and starboard in black, neither
 * at the other's height or station — then the down pipe standing beside the
 * gable and the elbow at its foot (`pipe_p_run · pipe_s_run ·
 * pipe_gable_down · pipe_gable_elbow`).
 */
export function hallPipes(root, put, mats, { runs, down, elbow }) {
  for (const [name, plate, r, length, at] of runs)
    put(root, name, cyl(r, r, length, 12), mats[plate], at, [0, 0, Math.PI / 2]);
  put(root, 'pipe_gable_down', cyl(down.r, down.r, down.h, 12), mats.rust, down.at);
  put(root, 'pipe_gable_elbow', box(...elbow.size), mats.rust, elbow.at);
}

/* -- The Nodule Refinery: "a rank of upright silos with conveyor and
 *    crusher machinery" — an X-long export, every builder through
 *    `inFrame`. -- */

/**
 * The platform: the slab, the skirt under it in older plate, the working
 * apron beside it, two lit stripes across the apron and the pad between
 * them (`platform · platform_skirt · apron · apron_stripe_1 · _2 ·
 * apron_pad`). The stripes are `work_lamp`, the turret's fixture, laid
 * flat where the bake can count them — "floodlit working surfaces".
 */
export function refineryPlatform(root, put, { black, rust, grey, lampM }, opts) {
  const { platform, skirt, apron, stripes, pad } = opts;
  put(root, 'platform', box(...platform.size), black, platform.at);
  put(root, 'platform_skirt', box(...skirt.size), rust, skirt.at);
  put(root, 'apron', box(...apron.size), grey, apron.at);
  stripes.x.forEach((x, i) =>
    put(root, `apron_stripe_${i + 1}`, box(...stripes.size), lampM, [x, stripes.y, stripes.z])
  );
  put(root, 'apron_pad', box(...pad.size), black, pad.at);
}

/**
 * "A rank of upright silos": each a nine-facet frustum standing on the
 * platform top (`base`), its cap a cone to a point sat `cap.lift` above
 * the silo's top, a five-by-ten torus of a band round it `band.at` of its
 * height up, and a work lamp `lamp.above` its top — silo by silo in the
 * file's order, then the one patch of older plate on the second (`silo_1 ·
 * silo_cap_1 · silo_band_1 · silo_lamp_1 · silo_2 … · silo_patch`). The
 * heights alternate short, tall, short, tall; each cap's base sits 0.005
 * into its silo's top.
 */
export function siloRank(root, put, { grey, black, rust, lampM }, opts) {
  const { silos, z, base, radii, facets = 9, cap, band, lamp, patch } = opts;
  silos.forEach(({ x, h }, i) => {
    const n = i + 1;
    put(root, `silo_${n}`, cyl(radii[0], radii[1], h, facets), grey, [x, base + h / 2, z]);
    put(root, `silo_cap_${n}`, cyl(0, cap.r, cap.h, facets), black, [x, base + h + cap.lift, z]);
    put(
      root,
      `silo_band_${n}`,
      torus(band.R, band.t, 5, 10),
      rust,
      [x, base + band.at * h, z],
      [Math.PI / 2, 0, 0]
    );
    put(root, `silo_lamp_${n}`, lampOrb(lamp.r), lampM, [x, base + h + lamp.above, z]);
  });
  put(root, 'silo_patch', box(...patch.size), rust, patch.at);
}

/**
 * "Crusher machinery": the hall, its roof in older plate, the lit intake
 * on its face with a rank of teeth above and below, the stack leaning
 * `stack.lean` off plumb — a seven-facet frustum — and the lamp at its
 * throat (`crusher_hall · crusher_roof · crusher_intake · crusher_teeth_top
 * · crusher_teeth_bot · crusher_stack · crusher_stack_lamp`). The intake is
 * `port_glow`, `intake.size` deep from the hall's face: the export drew it
 * a tenth deep, a panel the bake never saw, and the Refinery draws it 0.4
 * since #890, a lit throat whose top face shows past the upper teeth.
 */
export function crusherHall(root, put, { black, rust, glow, grey, lampM }, opts) {
  const { hall, roof, intake, teeth, stack, lamp } = opts;
  put(root, 'crusher_hall', box(...hall.size), black, hall.at);
  put(root, 'crusher_roof', box(...roof.size), rust, roof.at);
  put(root, 'crusher_intake', box(...intake.size), glow, intake.at);
  put(root, 'crusher_teeth_top', box(...teeth.size), grey, [teeth.x, teeth.top, teeth.z]);
  put(root, 'crusher_teeth_bot', box(...teeth.size), grey, [teeth.x, teeth.bot, teeth.z]);
  put(root, 'crusher_stack', cyl(stack.radii[0], stack.radii[1], stack.h, 7), rust, stack.at, [
    0,
    0,
    stack.lean,
  ]);
  put(root, 'crusher_stack_lamp', lampOrb(lamp.r), lampM, lamp.at);
}

/**
 * A conveyor: the belt, a box as long as the run from `from` to `to`, at
 * their midpoint and turned by three's `lookAt` so its +z looks up the
 * belt — not `setFromUnitVectors`: the file keeps the belt's width level
 * — and the lit line down it, `line.frac` of the length and `line.width`
 * of the width, `line.lift` straight up (`conveyor_<name> ·
 * conveyor_<name>_line`). The apron belt climbs to the crusher and the
 * silo belt from it; each writes its midpoint from its ends, so the
 * export's own 0.14999999999999997 falls out.
 */
export function conveyorRun(root, put, { belt, line: lineMat }, opts) {
  const { name, from, to, width, t = 0.14, line = {} } = opts;
  const { frac = 0.96, width: wf = 0.4, t: lt = 0.04, lift = 0.09 } = line;
  const A = new THREE.Vector3(...from);
  const B = new THREE.Vector3(...to);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const length = A.distanceTo(B);
  // Object3D.lookAt for a non-camera is Matrix4.lookAt(target, position, up).
  const look = new THREE.Matrix4().lookAt(B, mid, new THREE.Vector3(0, 1, 0));
  const e = new THREE.Euler().setFromRotationMatrix(look, 'XYZ');
  const rot = [e.x, e.y, e.z];
  put(root, `conveyor_${name}`, box(width, t, length), belt, mid.toArray(), rot);
  put(
    root,
    `conveyor_${name}_line`,
    box(width * wf, lt, length * frac),
    lineMat,
    [mid.x, mid.y + lift, mid.z],
    rot
  );
}

/** The conveyors' legs: a box each, `[at, height]`, numbered from one (`leg_1..3`). */
export function conveyorLegs(root, put, grey, { width, legs }) {
  legs.forEach(([at, h], i) => put(root, `leg_${i + 1}`, box(width, h, width), grey, at));
}

/**
 * A flood mast: a five-facet post and the lamp bank on its head, turned
 * to look where the file points it (`flood_<tag>_mast · flood_<tag>_bank`).
 * The silo mast writes its bank before its post, alone of the four
 * (`bankFirst`); that is the file's order and the port keeps it. Three of
 * the banks look down and out at 0.5 of pitch and the fourth at 0.4; two
 * are yawed past a right angle, which parts.mjs prints as the wrapped
 * triple and three composes to the same turn.
 */
export function floodMast(root, put, { black, lampM }, opts) {
  const { tag, at, mast, bank, bankFirst = false } = opts;
  const [x, , z] = at;
  const post = () =>
    put(root, `flood_${tag}_mast`, cyl(mast.radii[0], mast.radii[1], mast.h, 5), black, [
      x,
      mast.y,
      z,
    ]);
  const lamp = () =>
    put(root, `flood_${tag}_bank`, box(...bank.size), lampM, [x, bank.y, z], bank.rot);
  if (bankFirst) {
    lamp();
    post();
  } else {
    post();
    lamp();
  }
}

/** A row of work lamps along a line: `count` orbs of `r` from `from` at `pitch` along x (`apron_lamp_1..5`). */
export function lampRow(root, put, lampM, { name, r, from, pitch, count, y, z }) {
  for (let i = 0; i < count; i++)
    put(root, `${name}_${i + 1}`, lampOrb(r), lampM, [from + pitch * i, y, z]);
}

/* -- The Bastion: "a large pressure dome with visible reinforcement ribs,
 *    docking collars and external pipework" — a Z-long export, every
 *    builder through `alongZ`. -- */

/**
 * The dome: the ten-facet foundation and skirt, the dome itself — a
 * twelve-by-seven hemisphere squashed `dome.squash` in height and yawed
 * `dome.yaw` on its foot so no seam lies on an axis — `ribs.count` ribs
 * over it, each a half torus stood on end and yawed its share of a half
 * turn, squashed with the dome; the cap on the crown in older plate and the
 * beacon over it, an eight-by-five orb of the work lamp (`foundation ·
 * dome_skirt · dome · dome_rib_1..6 · dome_cap · beacon`). A rib's outer
 * radius is 2.51 against the dome's 2.4, and it is centred 0.02 higher.
 */
export function ribbedDome(root, put, { black, grey, rust, lampM }, opts) {
  const { foundation, skirt, dome, ribs, cap, beacon } = opts;
  put(root, 'foundation', cyl(foundation.radii[0], foundation.radii[1], foundation.h, 10), black, [
    0,
    foundation.y,
    0,
  ]);
  put(root, 'dome_skirt', cyl(skirt.radii[0], skirt.radii[1], skirt.h, 10), grey, [0, skirt.y, 0]);
  put(
    root,
    'dome',
    new THREE.SphereGeometry(dome.r, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    grey,
    [0, dome.y, 0],
    [0, dome.yaw, 0],
    [1, dome.squash, 1]
  );
  for (let i = 0; i < ribs.count; i++)
    put(
      root,
      `dome_rib_${i + 1}`,
      new THREE.TorusGeometry(ribs.R, ribs.t, 5, 18, Math.PI),
      black,
      [0, ribs.y, 0],
      [0, (i * Math.PI) / ribs.count, 0],
      [1, dome.squash, 1]
    );
  put(root, 'dome_cap', cyl(cap.radii[0], cap.radii[1], cap.h, 8), rust, [0, cap.y, 0]);
  put(root, 'beacon', new THREE.SphereGeometry(beacon.r, 8, 5), lampM, [0, beacon.y, 0]);
}

/**
 * "Sustained glow from ports": `count` portholes round the skirt at radius
 * `r`, from `phase` radians, each a six-facet disc of `port_glow` turned
 * `[π/2, 0, π/2 − a]` (`porthole_1..10`). That Euler is the file's and it
 * is odd: in three's XYZ order it stands the disc's axis on (−cos a, 0,
 * sin a), the radial mirrored across z, which is 2a off the radial folded
 * into a right angle — so the two ports nearest ±z face out and the other
 * eight face 0.62 to 1.27 radians off their bearings. Carried across, not
 * squared up (#540). `bearings` re-cuts a port by its number — `{ 5: π }` —
 * for the one the quarters module was built over (#890): it keeps its
 * radius and height and takes the bearing given, and its turn follows the
 * bearing by the file's rule, `π/2 − a`, so at π the disc's axis is (1, 0,
 * 0) and the port faces square out along its radial, as ports 3 and 8 do;
 * the other seven face 0.62 to 1.27 off theirs.
 */
export function portholes(root, put, glow, { count, phase, r, y, disc, bearings = {} }) {
  for (let i = 0; i < count; i++) {
    const a = bearings[i + 1] ?? phase + (i * 2 * Math.PI) / count;
    put(root, `porthole_${i + 1}`, cyl(disc.r, disc.r, disc.h, 6), glow, polar(a, r, y), [
      Math.PI / 2,
      0,
      Math.PI / 2 - a,
    ]);
  }
}

/**
 * "Docking collars": on each of `bearings` — three, at 0.4, 2.3 and 4.4
 * radians, spaced in nothing — an eight-facet collar at radius `r`, its
 * ring `ring.out` further out, a five-by-ten torus faced radially, and the
 * work lamp `lamp.out` out and up (`dock_collar_1 · dock_ring_1 ·
 * dock_lamp_1 · dock_collar_2 …`). The collar carries the portholes' Euler
 * and the same mirrored axis, so the three lie 0.80, 1.46 and 0.62 radians
 * off the rings they are meant to feed. Carried across (#540).
 */
export function dockingCollars(root, put, { grey, rust, lampM }, opts) {
  const { bearings, r, y, collar, ring, lamp } = opts;
  bearings.forEach((a, i) => {
    const n = i + 1;
    put(
      root,
      `dock_collar_${n}`,
      cyl(collar.radii[0], collar.radii[1], collar.h, 8),
      grey,
      polar(a, r, y),
      [Math.PI / 2, 0, Math.PI / 2 - a]
    );
    put(root, `dock_ring_${n}`, torus(ring.R, ring.t, 5, 10), rust, polar(a, r + ring.out, y), [
      0,
      Math.PI / 2 - a,
      0,
    ]);
    put(root, `dock_lamp_${n}`, lampOrb(lamp.r), lampM, polar(a, r + lamp.out, lamp.y));
  });
}

/**
 * The modules round the dome — the refinery, the quarters, the store — a
 * box each yawed its own way with, where the file fits one, a patch of
 * older plate on its face yawed with it; then the lit windows, `port_glow`
 * boxes of one size at the file's own points, unyawed (`module_refinery ·
 * module_refinery_patch · module_quarters · module_quarters_patch ·
 * module_store · win_refinery_1 · _2 · win_quarters_1 · _2`). The windows
 * do not turn with their modules; the file's, and kept.
 */
export function bastionModules(root, put, mats, { modules: list, windows }) {
  for (const { name, plate, size, at, yaw, patch } of list) {
    put(root, `module_${name}`, box(...size), mats[plate], at, [0, yaw, 0]);
    if (patch)
      put(root, `module_${name}_patch`, box(...patch.size), mats.rust, patch.at, [0, yaw, 0]);
  }
  for (const [name, at] of windows.at)
    put(root, `win_${name}`, box(...windows.size), mats.glow, at);
}

/**
 * The jib crane on the dome's flank: the mast, the jib pitched `jib.pitch`
 * up off it, the counterweight astern, the fall — a four-facet cable — and
 * the hook under the jib's head, and the work lamp on the head
 * (`crane_mast · crane_jib · crane_counter · crane_cable · crane_hook ·
 * crane_lamp`). The Foundry's are gantries; this one swings.
 */
export function jibCrane(root, put, { grey, rust, black, lampM }, opts) {
  const { mast, jib, counter, cable, hook, lamp } = opts;
  put(root, 'crane_mast', box(...mast.size), grey, mast.at);
  put(root, 'crane_jib', box(...jib.size), grey, jib.at, [jib.pitch, 0, 0]);
  put(root, 'crane_counter', box(...counter.size), rust, counter.at);
  put(root, 'crane_cable', cyl(cable.r, cable.r, cable.h, 4), black, cable.at);
  put(root, 'crane_hook', box(...hook.size), rust, hook.at);
  put(root, 'crane_lamp', lampOrb(lamp.r), lampM, lamp.at);
}

/**
 * The perimeter: `count` posts round the foundation's edge at radius `r`
 * from `phase` radians, each a five-facet post with a work lamp on it,
 * post then lamp (`perimeter_post_1 · perimeter_lamp_1 · …_8`) — the ring
 * of light the settlement's "constant hum" shows from above. `lift` makes a
 * post taller by its number — `{ 4: 0.52, 8: 0.82 }` — foot where it was,
 * lamp raised by the same: the two the modules were built over stand up
 * through their roofs, and the lamp shows where the post does not (#890).
 */
export function perimeterPosts(root, put, { black, lampM }, opts) {
  const { count, phase, r, post, lamp, lift = {} } = opts;
  for (let i = 0; i < count; i++) {
    const a = phase + (i * 2 * Math.PI) / count;
    const up = lift[i + 1] ?? 0;
    put(
      root,
      `perimeter_post_${i + 1}`,
      cyl(post.radii[0], post.radii[1], post.h + up, 5),
      black,
      polar(a, r, post.y + up / 2)
    );
    put(root, `perimeter_lamp_${i + 1}`, lampOrb(lamp.r), lampM, polar(a, r, lamp.y + up));
  }
}

/* -- The Baffle Barge: "moored noise-masking support barge, boxy and
 *    over-engineered, ringed with baffle vanes and acoustic dampening
 *    panels" — an X-long export, hyphenated like the Submersible, every
 *    builder through `inFrame`. -- */

/**
 * The barge: the hull box at the origin with no transform of its own, the
 * skirt under it in older plate, the deck plate on it and a gunwale a side,
 * port first (`barge-hull · hull-skirt · deck-plate · gunwale-port ·
 * gunwale-stb`). "Boxy and over-engineered": the hull is a box, and that
 * is the whole of it.
 */
export function bargeHull(root, put, { black, brown, grey }, { hull, skirt, deck, gunwales }) {
  put(root, 'barge-hull', box(...hull.size), black);
  put(root, 'hull-skirt', box(...skirt.size), brown, skirt.at);
  put(root, 'deck-plate', box(...deck.size), grey, deck.at);
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ])
    put(root, `gunwale-${side}`, box(...gunwales.size), grey, [0, gunwales.y, sgn * gunwales.z]);
}

/** The Barge's four corners in the file's order for its pontoons and domes: aft port, aft starboard, fore port, fore starboard. */
const CORNERS = [
  ['ap', -1, -1],
  ['as', -1, 1],
  ['fp', 1, -1],
  ['fs', 1, 1],
];

/**
 * A pontoon at each corner: the ten-facet drum, the cap on it in older
 * plate, the foot drawn in under it, and six bolts round the cap at
 * `bolts.radius`, from +x round toward +z a sixth of a turn apart
 * (`pontoon-ap · pontoon-cap-ap · pontoon-foot-ap · pontoon-bolt-ap-1..6 ·
 * pontoon-as …`). Every bolt a buffer of its own, as the file has them.
 */
export function pontoons(root, put, { grey, brown, black }, opts) {
  const { x, z, y, r, h, cap, foot, bolts } = opts;
  for (const [tag, sx, sz] of CORNERS) {
    const [cx, cz] = [sx * x, sz * z];
    put(root, `pontoon-${tag}`, cyl(r, r, h, 10), grey, [cx, y, cz]);
    put(root, `pontoon-cap-${tag}`, cyl(cap.r, cap.r, cap.h, 10), brown, [cx, cap.y, cz]);
    put(root, `pontoon-foot-${tag}`, cyl(foot.radii[0], foot.radii[1], foot.h, 10), black, [
      cx,
      foot.y,
      cz,
    ]);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      put(root, `pontoon-bolt-${tag}-${k + 1}`, cyl(bolts.r, bolts.r, bolts.h, 6), black, [
        cx + bolts.radius * Math.cos(a),
        bolts.y,
        cz + bolts.radius * Math.sin(a),
      ]);
    }
  }
}

/**
 * "Ringed with baffle vanes": six foam vanes down each flank at
 * `flank.stations`, each yawed `flank.yaw` outboard, and the rail they
 * hang from in older plate — port then starboard — then three across the
 * stern and three across the bow, yawed the other way round
 * (`baffle-vane-port-1..6 · vane-rail-port · baffle-vane-stb-1..6 ·
 * vane-rail-stb · baffle-vane-stern-1..3 · baffle-vane-bow-1..3`). The end
 * vanes have no rail.
 */
export function baffleVanes(root, put, { foam, brown }, { flank, rail, ends }) {
  for (const [side, sgn] of [
    ['port', -1],
    ['stb', 1],
  ]) {
    flank.stations.forEach((x, i) =>
      put(
        root,
        `baffle-vane-${side}-${i + 1}`,
        box(...flank.size),
        foam,
        [x, flank.y, sgn * flank.z],
        [0, sgn * flank.yaw, 0]
      )
    );
    put(root, `vane-rail-${side}`, box(...rail.size), brown, [0, rail.y, sgn * rail.z]);
  }
  for (const [end, sgn] of [
    ['stern', -1],
    ['bow', 1],
  ])
    ends.stations.forEach((z, i) =>
      put(
        root,
        `baffle-vane-${end}-${i + 1}`,
        box(...ends.size),
        foam,
        [sgn * ends.x, ends.y, z],
        [0, -sgn * ends.yaw, 0]
      )
    );
}

/**
 * "Acoustic dampening panels": foam pads, two on the deck — the second
 * yawed a tenth — and one on each flank, port then starboard, none the
 * size of another (`pad-deck-1 · pad-deck-2 · pad-flank-p · pad-flank-s`);
 * `[name, size, at, yaw]` each.
 */
export function dampeningPads(root, put, foam, { pads }) {
  for (const [name, size, at, yaw = 0] of pads)
    put(root, name, box(...size), foam, at, [0, yaw, 0]);
}

/**
 * Three patch plates, `[plate, size, at, yaw]` each: older plate on the
 * deck, newer grey on the starboard flank, hazard paint low on the port
 * bow (`patch-plate-1..3`).
 */
export function patchPlates(root, put, mats, { plates }) {
  plates.forEach(([plate, size, at, yaw = 0], i) =>
    put(root, `patch-plate-${i + 1}`, box(...size), mats[plate], at, [0, yaw, 0])
  );
}

/**
 * The emitter mast amidships: the base, the trunk — an eight-facet frustum
 * — the collar round it, the ten-facet emitter drum at its head, eight foam
 * fins out from the drum at `fins.r`, each yawed back by its bearing so it
 * stands radial, and the beacon on top, the running light's lit frustum
 * (`mast-base · mast-trunk · mast-collar · emitter-drum · emitter-fin-1..8
 * · mast-beacon`). The collar sits below the trunk's middle; the file's.
 */
export function emitterMast(root, put, { grey, brown, black, foam, lampM }, opts) {
  const { x, base, trunk, collar, drum, fins, beacon } = opts;
  put(root, 'mast-base', box(...base.size), grey, [x, base.y, 0]);
  put(root, 'mast-trunk', cyl(trunk.radii[0], trunk.radii[1], trunk.h, 8), brown, [x, trunk.y, 0]);
  put(root, 'mast-collar', cyl(collar.r, collar.r, collar.h, 8), grey, [x, collar.y, 0]);
  put(root, 'emitter-drum', cyl(drum.r, drum.r, drum.h, 10), black, [x, drum.y, 0]);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    put(
      root,
      `emitter-fin-${k + 1}`,
      box(...fins.size),
      foam,
      [x + fins.r * Math.cos(a), fins.y, fins.r * Math.sin(a)],
      [0, -a, 0]
    );
  }
  put(root, 'mast-beacon', cyl(beacon.radii[0], beacon.radii[1], beacon.h, 8), lampM, [
    x,
    beacon.y,
    0,
  ]);
}

/**
 * The deck gear, in the file's order: the winch house and its drum laid
 * across the beam; two vent stacks and the elbow on the first; a capstan
 * fore and aft; the pipe run along the port deck edge rolled onto x, an
 * elbow at each end and the riser off the forward one (`winch-house ·
 * winch-drum · vent-stack-1 · _2 · vent-elbow-1 · capstan-f · capstan-a ·
 * pipe-main · pipe-elbow-a · pipe-riser · pipe-elbow-b`). Eight facets
 * throughout. `deckPipework` above is the Submersible's run with its drop;
 * this one has a riser.
 */
export function deckGear(root, put, { brown, grey }, { winch, vents, capstans, pipe }) {
  put(root, 'winch-house', box(...winch.house.size), brown, winch.house.at);
  put(root, 'winch-drum', cyl(winch.drum.r, winch.drum.r, winch.drum.h, 8), grey, winch.drum.at, [
    Math.PI / 2,
    0,
    0,
  ]);
  vents.stacks.forEach(({ radii, h, at }, i) =>
    put(root, `vent-stack-${i + 1}`, cyl(radii[0], radii[1], h, 8), grey, at)
  );
  put(root, 'vent-elbow-1', box(...vents.elbow.size), brown, vents.elbow.at);
  for (const [end, x] of [
    ['f', capstans.fore],
    ['a', capstans.aft],
  ])
    put(root, `capstan-${end}`, cyl(capstans.radii[0], capstans.radii[1], capstans.h, 8), grey, [
      x,
      capstans.y,
      capstans.z,
    ]);
  put(root, 'pipe-main', cyl(pipe.r, pipe.r, pipe.length, 8), grey, pipe.at, [0, 0, Math.PI / 2]);
  put(root, 'pipe-elbow-a', box(...pipe.elbow.size), brown, pipe.elbowA);
  put(root, 'pipe-riser', cyl(pipe.r, pipe.r, pipe.riser.h, 8), grey, pipe.riser.at);
  put(root, 'pipe-elbow-b', box(...pipe.elbow.size), brown, pipe.elbowB);
}

/**
 * "Moored": at each corner a chain — a six-facet cylinder from a point
 * under the pontoon down to the anchor block — and the block on the seabed
 * beyond it; aft port, fore port, aft starboard, fore starboard, which is
 * not the order the pontoons come in (`mooring-chain-ap · anchor-block-ap
 * · mooring-chain-fp · …`).
 *
 * Two things here are the file's. The chain is not stood by
 * `setFromUnitVectors` like every pipe on the Refinery and the Bastion: it
 * is three's `lookAt` at the anchor, then a quarter turn about its own x,
 * which keeps the cylinder's x horizontal and rolls its facets differently
 * — the one rule that reproduces all four matrices. And the four anchor
 * blocks are all yawed 0.4 the same way, not mirrored corner to corner.
 */
export function moorings(root, put, { brown, black }, { chain, block }) {
  for (const [tag, sx, sz] of [
    ['ap', -1, -1],
    ['fp', 1, -1],
    ['as', -1, 1],
    ['fs', 1, 1],
  ]) {
    const A = new THREE.Vector3(sx * chain.from[0], chain.from[1], sz * chain.from[2]);
    const B = new THREE.Vector3(sx * chain.to[0], chain.to[1], sz * chain.to[2]);
    const hang = new THREE.Object3D();
    hang.position.copy(A).add(B).multiplyScalar(0.5);
    hang.lookAt(B);
    hang.rotateX(Math.PI / 2);
    put(
      root,
      `mooring-chain-${tag}`,
      cyl(chain.r, chain.r, A.distanceTo(B), 6),
      brown,
      hang.position.toArray(),
      [hang.rotation.x, hang.rotation.y, hang.rotation.z]
    );
    put(
      root,
      `anchor-block-${tag}`,
      box(...block.size),
      black,
      [sx * block.x, block.y, sz * block.z],
      [0, block.yaw, 0]
    );
  }
}

/**
 * A dome light on each pontoon cap, an eight-facet lit frustum, in the
 * pontoons' corner order (`corner-dome-ap · -as · -fp · -fs`). With the
 * six running lights and the beacon, the "dim amber running lights" of a
 * barge that idles at SIG 30.
 */
export function cornerDomes(root, put, lampM, { x, z, y, radii, h }) {
  for (const [tag, sx, sz] of CORNERS)
    put(root, `corner-dome-${tag}`, cyl(radii[0], radii[1], h, 8), lampM, [sx * x, y, sz * z]);
}

/* --------------------------------------------------------------------------
 * The Bio-Reactor (#788, off #540 Phase 4). The bed and the three intake
 * arms are the kit's (`reactorBed`, `reactorIntakeArm`) and identical on all
 * four navies; what is a navy's is the vessel that stands on the slab and
 * the outflow off it, which is these two builders.
 * ------------------------------------------------------------------------ */

/**
 * The render vessel, Bathyarch Consortium: a riveted digester tank. A banded
 * cylinder on the footprint slab, a bolted crown with a rank of rivets round
 * its rim, a work hatch and the run mark laid on it, dark roof ports, and the
 * vent stack standing off-centre — "a render vessel standing over the
 * holdfast on a low footprint slab" (docs/asset-prompts-3d.md, STRUCTURE —
 * Bio-Reactor), in the one navy whose answer to a vessel is plate rolled and
 * welded.
 *
 * The stack is off-centre on purpose and the decision is older than this
 * model: the procedural silhouette this replaces draws "the vent stack,
 * off-centre: a reactor is not a symmetrical building"
 * (packages/frontend/src/game/silhouettes.ts), and a script that centred it
 * would lose the one thing the schematic said about the kind.
 *
 * `mark` is the vessel's one lamp. The roof ports and the stack mouth carry
 * the amber lamp's *unlit* finish instead, because the block lights them
 * only while crop is coming in (docs/models-plan.md §3.2 rule 2).
 */
export function reactorVessel(root, { black, grey, rust, lampM, unlit }, opts) {
  const { tank, bands, crown, rivets, hatch, mark, ports, stack } = opts;
  add(root, 'reactor_vessel', cyl(tank.r[0], tank.r[1], tank.h, tank.facets), black, [
    0,
    tank.y,
    0,
  ]);
  bands.ys.forEach((y, i) =>
    add(root, `vessel_band_${i}`, cyl(bands.r, bands.r, bands.h, tank.facets), grey, [0, y, 0])
  );
  add(root, 'vessel_crown', cyl(crown.r[0], crown.r[1], crown.h, tank.facets), grey, [
    0,
    crown.y,
    0,
  ]);
  // A rank round the rim, not a scatter: the Klaxon repairs in straight
  // lines even when the thing repaired is round (`mountDrum` above).
  for (let i = 0; i < rivets.count; i++) {
    const a = ((2 * Math.PI) / rivets.count) * i;
    add(root, `crown_rivet_${i}`, box(...rivets.size), grey, polar(a, rivets.r, rivets.y), [
      0,
      -a,
      0,
    ]);
  }
  add(root, 'crown_hatch', box(...hatch.size), rust, hatch.at, [0, hatch.yaw, 0]);
  add(root, 'crown_mark', box(...mark.size), lampM, mark.at, [0, mark.yaw ?? 0, 0]);
  ports.at.forEach(([a, r], i) =>
    add(root, `roof_port_${i}`, cyl(ports.r, ports.r, ports.t, 8), unlit, polar(a, r, ports.y))
  );
  add(root, 'vent_stack', cyl(stack.r[0], stack.r[1], stack.h, 8), black, stack.at);
  const [sx, , sz] = stack.at;
  add(root, 'stack_band', cyl(stack.band.r, stack.band.r, stack.band.h, 8), rust, [
    sx,
    stack.band.y,
    sz,
  ]);
  add(root, 'stack_mouth', cyl(stack.mouth.r, stack.mouth.r, stack.mouth.t, 8), unlit, [
    sx,
    stack.mouth.y,
    sz,
  ]);
}

/**
 * The Biomass outflow, Bathyarch Consortium: a flanged trunk off the tank on
 * `bearing`, over a bolted dispatch hopper with its lip and the chute down
 * into it — "the Biomass outflow off the vessel to a dispatch hopper". Bolted
 * rather than grown, and square rather than round, which is the whole of this
 * navy's argument about a container.
 *
 * Distances are metres out along the bearing, as the kit's
 * `reactorIntakeArm` takes them; the chute is the amber lamp's unlit finish
 * for the same reason the roof ports are.
 */
export function reactorOutflow(root, { black, grey, rust, unlit }, opts) {
  const { bearing: a, trunk, flanges, hopper, lip, chute } = opts;
  const laid = [0, -a, -Math.PI / 2];
  add(
    root,
    'outflow_trunk',
    cyl(trunk.r, trunk.r, trunk.to - trunk.from, 8),
    grey,
    polar(a, (trunk.from + trunk.to) / 2, trunk.y),
    laid
  );
  flanges.at.forEach((d, i) =>
    add(
      root,
      `outflow_flange_${i}`,
      cyl(flanges.r, flanges.r, flanges.t, 8),
      rust,
      polar(a, d, trunk.y),
      laid
    )
  );
  add(root, 'outflow_hopper', box(...hopper.size), black, polar(a, hopper.at, hopper.y), [
    0,
    -a,
    0,
  ]);
  add(root, 'hopper_lip', box(...lip.size), grey, polar(a, hopper.at, lip.y), [0, -a, 0]);
  add(
    root,
    'hopper_chute',
    cyl(chute.r[0], chute.r[1], chute.h, 8),
    unlit,
    polar(a, chute.at, chute.y)
  );
}

/* --------------------------------------------------------------------------
 * The Gantry and the Spark (#840, off #838): the Consortium's carrier and
 * the craft its deck builds. The carrier is the Slipway's line carried to
 * sea, and it is built from the Slipway's own words — kit.mjs `slipwayBed`
 * for the slip and its line lights, `slipwayGantry` for the crane, and
 * `slipwayHall` above for the two shops that flank the slip — at a hull's
 * numbers. What is here is only what a yard on a drive needs that a yard on
 * the seabed does not: the knees under a deck laid wider than its hull, the
 * rails the gantry walks on, an A-frame leg and the bogie under it, the
 * lifting beam and the cab, the berths cut to the craft, and the gate across
 * the mouth. The craft is the navy's two shapes and nothing else: a banded
 * cell (`plantCylinder`, the Caisson's plant) in a riveted lifting frame, a
 * square wedge of a nose, a drive box with its louvres and an open screw,
 * and one gun on a ring. Built, not ported: every number is a hull script's
 * or the craft's plan below.
 * ------------------------------------------------------------------------ */

/**
 * The Spark in plan, which two scripts read: hulls/spark.mjs builds the
 * craft to it and hulls/gantry.mjs cuts the berths to it, so a cradle and
 * the thing it holds cannot drift apart. The craft's own frame, metres, bow
 * on +X and the hull axis at y 0: the stations of the frame's corner posts
 * and their beam (the cradle's chocks stand outboard of them, and the
 * gantry's lifting beam is as long as they are apart); the skids under the
 * frame rails, which sit the cradle's ways, and how far below the axis
 * their soles are; and the outline the berth's rim is painted round — the
 * craft's plan with about a metre's margin, bow first down the starboard
 * side, a chamfered nose and a square stern.
 */
export const sparkPlan = {
  length: 20,
  posts: { x: [5.6, -8.0], z: 3.0 },
  skids: { from: -8.6, to: 6.0, z: 2.8, sole: -3.0 },
  rim: [
    [10.9, 2.2],
    [6.4, 4.5],
    [-9.0, 4.5],
    [-10.9, 3.0],
    [-10.9, -3.0],
    [-9.0, -4.5],
    [6.4, -4.5],
    [10.9, -2.2],
  ],
};

/**
 * The knees under a deck laid wider than the hull it stands on: at each
 * station a strut up and out from the hull's flank to the deck's underside
 * at its edge, the starboard rank then the port (`deck_knee_s0.. ·
 * deck_knee_p0..`). They are what says, from the beam, that the deck is
 * carried on the hull rather than being the hull — the Gantry's yard, a
 * yard's worth of deck on a drive's worth of hull.
 */
export function deckKnees(root, mat, { x: stations, foot, head, t }) {
  bothSides((side, sgn) =>
    stations.forEach((x, i) =>
      strut(root, `deck_knee_${side}${i}`, [x, foot.y, sgn * foot.z], [x, head.y, sgn * head.z], mat, t)
    )
  );
}

/**
 * The rails a gantry walks on, one along each deck edge, starboard first
 * (`crane_rail_s · crane_rail_p`) — the Freighter's `deckGantries` rails on
 * a deck whose crane straddles it rather than standing inside it.
 */
export function craneRails(root, rust, { x, y, z, size }) {
  bothSides((side, sgn) => add(root, `crane_rail_${side}`, box(...size), rust, [x, y, sgn * z]));
}

/**
 * A gantry leg for a crane that has to read as a crane from the beam: an
 * A-frame a side where the Slipway stands one square column — two posts
 * from the bogie's ends, `foot.dx` either way of the frame's station, up to
 * the girder's underside `head.dx` either way of it, and a tie across the
 * two at `tie.y` (`gantry_leg_s_f · gantry_leg_s_a · gantry_tie_s`).
 * Returns the `(parent, { tag, sgn, x })` builder kit.mjs `slipwayGantry`
 * calls once a side, as `sidedPost` returns one.
 */
export const craneLeg =
  ({ mat, spread, foot, head, t, tie }) =>
  (parent, { tag, sgn, x }) => {
    for (const [end, s] of [
      ['f', 1],
      ['a', -1],
    ])
      strut(
        parent,
        `gantry_leg_${tag}_${end}`,
        [x + s * foot.dx, foot.y, sgn * spread],
        [x + s * head.dx, head.y, sgn * spread],
        mat,
        t
      );
    const k = (tie.y - foot.y) / (head.y - foot.y);
    const dx = foot.dx + (head.dx - foot.dx) * k;
    add(parent, `gantry_tie_${tag}`, box(2 * dx + t, tie.h, t), mat, [x, tie.y, sgn * spread]);
  };

/** The bogie a leg stands on, riding the rail (`gantry_bogie_s`) — `slipwayGantry`'s ornament. */
export const craneBogie = ({ mat, size, y, spread }) =>
  sidedPost({ name: 'gantry_bogie', geo: () => box(...size), mat, y, spread });

/**
 * The lifting beam hung on the gantry's fall: a bar along the keel as long
 * as the craft's corner posts are apart, a cross-head at each end as wide as
 * they are, and a hook under each corner — the spreader that takes a craft
 * by its four lifting eyes (`spreader_beam · spreader_head_f · _a ·
 * spreader_hook_0..3`). `craft` is the craft's plan (`sparkPlan`); the beam
 * is centred on the fall, so it is the posts' spacing and not their
 * stations that it carries.
 */
export function liftingBeam(root, { grey, rust }, { x, y, craft, bar, hook }) {
  const [xf, xa] = craft.posts.x;
  const half = (xf - xa) / 2;
  const across = 2 * craft.posts.z + bar.t;
  add(root, 'spreader_beam', box(2 * half + bar.t, bar.t, bar.t), grey, [x, y, 0]);
  for (const [end, s] of [
    ['f', 1],
    ['a', -1],
  ])
    add(root, `spreader_head_${end}`, box(bar.t, bar.t, across), grey, [x + s * half, y, 0]);
  let n = 0;
  for (const s of [1, -1])
    bothSides((side, sgn) =>
      add(root, `spreader_hook_${n++}`, box(...hook.size), rust, [
        x + s * half,
        y - bar.t / 2 - hook.size[1] / 2,
        sgn * craft.posts.z,
      ])
    );
}

/**
 * The operator's cab slung off the girder, against one of its faces: the
 * cab, its roof, and a rank of ports along its inboard face, each standing
 * proud of the face so its top shows from above (`crane_cab · cab_roof ·
 * cab_port_0..n`). The cab is
 * crewed where the craft is not; its ports are the one lit window over the
 * slip.
 */
export function craneCab(root, { black, grey, lampM }, { at, size, roof, ports }) {
  add(root, 'crane_cab', box(...size), black, at);
  add(root, 'cab_roof', box(size[0] + roof.over, roof.h, size[2] + roof.over), grey, [
    at[0],
    at[1] + size[1] / 2 + roof.h / 2,
    at[2],
  ]);
  ports.x.forEach((dx, i) =>
    add(root, `cab_port_${i}`, box(...ports.size), lampM, [at[0] + dx, ports.y, ports.z])
  );
}

/**
 * A berth on the slip, empty, cut to the craft it holds (`craft`, the
 * craft's plan — `sparkPlan`) and turned by `facing` (−1 lays the craft
 * bow-aft, toward the mouth it leaves by). In the file's order: the rim
 * painted round the craft's plan in hazard amber, a strip an edge, lying on
 * the slip floor at `y`; the two ways its skids sit on, run on `runOut`
 * metres past its bow end where the berth launches, so the after berth's
 * ways reach the sill; the four chocks the frame's corner posts stand
 * inboard of, starboard pair then port; and the stop across the stern end
 * (`berth_rim_<tag>0.. · berth_way_<tag>_s · _p · berth_chock_<tag>_s0 ..
 * · berth_stop_<tag>`).
 *
 * The deck is built empty, because a craft aboard is counted and not drawn
 * (docs/systems-combat.md §15) and a craft in the water is its own entity:
 * modelled into the berth, it would be drawn twice whenever the flight was
 * out. What the berth shows is where a craft goes and which way it leaves.
 */
export function craftBerth(root, { amber, grey, rust, black }, opts) {
  const { tag, x: cx, y, facing = 1, craft, rim, ways, chocks, stop, runOut = 0 } = opts;
  const X = (lx) => cx + facing * lx;
  craft.rim.forEach(([ax, az], i) => {
    const [bx, bz] = craft.rim[(i + 1) % craft.rim.length];
    const A = [X(ax), az];
    const B = [X(bx), bz];
    const dx = B[0] - A[0];
    const dz = B[1] - A[1];
    add(
      root,
      `berth_rim_${tag}${i}`,
      box(Math.hypot(dx, dz) + rim.w, rim.h, rim.w),
      amber,
      [(A[0] + B[0]) / 2, y + rim.h / 2, (A[1] + B[1]) / 2],
      [0, Math.atan2(-dz, dx), 0]
    );
  });
  const { from, to, z } = craft.skids;
  const aft = X(from - ways.over);
  const bow = X(to + ways.over + runOut);
  bothSides((side, sgn) =>
    add(root, `berth_way_${tag}_${side}`, box(Math.abs(bow - aft), ways.h, ways.w), grey, [
      (aft + bow) / 2,
      y + ways.h / 2,
      sgn * z,
    ])
  );
  bothSides((side, sgn) =>
    craft.posts.x.forEach((px, i) =>
      add(root, `berth_chock_${tag}_${side}${i}`, box(...chocks.size), rust, [
        X(px),
        y + chocks.size[1] / 2,
        sgn * (craft.posts.z + chocks.out),
      ])
    )
  );
  add(root, `berth_stop_${tag}`, box(...stop.size), black, [X(stop.x), y + stop.size[1] / 2, 0]);
}

/**
 * The gate across the slip's mouth, hinged at its foot so it drops outboard
 * as the ramp a craft leaves by — the Freighter's hold door (`holdDoors`)
 * turned athwartships. The gate, standing shut on the slip floor; the
 * hazard stripe along its top edge, where the chart sees it; the hinge rail
 * along its foot on the outboard face and the knuckles on it; and the
 * dogging wheels on its inboard face, a rim and a hub each (`launch_gate ·
 * gate_stripe · gate_hinge · gate_knuckle_0.. · gate_wheel_0.. ·
 * gate_hub_0..`). Cladding throughout: the gate drops and the slip floods
 * only for the instant of a launch, which is a transient and not a lamp
 * (docs/models-plan.md §3.2 rule 3).
 */
export function launchGate(root, { grey, rust, amber }, opts) {
  const { x, y, size, stripe, hinge, wheels } = opts;
  const [t, h, w] = size;
  add(root, 'launch_gate', box(t, h, w), grey, [x, y + h / 2, 0]);
  add(root, 'gate_stripe', box(t + stripe.over, stripe.h, w), amber, [x, y + h + stripe.h / 2, 0]);
  const outboard = x - t / 2 - hinge.r;
  add(root, 'gate_hinge', cyl(hinge.r, hinge.r, w, 8), rust, [outboard, y + hinge.r, 0], ATHWART);
  hinge.knuckles.forEach((kz, i) =>
    add(
      root,
      `gate_knuckle_${i}`,
      cyl(hinge.knuckle.r, hinge.knuckle.r, hinge.knuckle.length, 8),
      grey,
      [outboard, y + hinge.r, kz],
      ATHWART
    )
  );
  const inboard = x + t / 2;
  wheels.z.forEach((wz, i) => {
    add(root, `gate_wheel_${i}`, torus(wheels.R, wheels.rim, 5, 10), grey, [
      inboard + wheels.stand,
      wheels.y,
      wz,
    ], [0, Math.PI / 2, 0]);
    add(root, `gate_hub_${i}`, cyl(wheels.hub.r, wheels.hub.r, wheels.hub.length, 8), rust, [
      inboard + wheels.hub.length / 2,
      wheels.y,
      wz,
    ], [0, 0, Math.PI / 2]);
  });
}

/**
 * The craft's lifting frame — "a riveted lifting frame" (UNIT — Spark): a
 * rail down each side, a crossbar at each end on the corner posts'
 * stations, a skid under each rail that sits the carrier's way, and at each
 * corner a post with a hazard cap on its head and the eye the gantry's
 * spreader takes standing on the cap (`frame_rail_s · _p · frame_bar_f ·
 * _a · skid_s · _p · frame_post_s0 · post_cap_s0 · lift_eye_s0 · … ·
 * frame_post_p1 · post_cap_p1 · lift_eye_p1`). `craft` is the plan
 * (`sparkPlan`): the posts' stations and beam, the skids' run and beam, and
 * the skids' sole, which is the craft's lowest point and the height the
 * cradle's ways meet it at.
 */
export function liftFrame(root, { grey, rust, amber }, { craft, rail, bar, skid, post, cap, eye }) {
  const [xf, xa] = craft.posts.x;
  const zr = craft.posts.z;
  bothSides((side, sgn) =>
    add(root, `frame_rail_${side}`, box(rail.to - rail.from, rail.h, rail.w), grey, [
      (rail.from + rail.to) / 2,
      rail.y,
      sgn * zr,
    ])
  );
  for (const [end, x] of [
    ['f', xf],
    ['a', xa],
  ])
    add(root, `frame_bar_${end}`, box(bar.t, rail.h, 2 * zr + rail.w), grey, [x, rail.y, 0]);
  const { from, to, z, sole } = craft.skids;
  bothSides((side, sgn) =>
    add(root, `skid_${side}`, box(to - from, skid.h, skid.w), rust, [
      (from + to) / 2,
      sole + skid.h / 2,
      sgn * z,
    ])
  );
  bothSides((side, sgn) =>
    craft.posts.x.forEach((x, i) => {
      add(root, `frame_post_${side}${i}`, box(post.t, post.top - post.foot, post.t), grey, [
        x,
        (post.top + post.foot) / 2,
        sgn * zr,
      ]);
      add(root, `post_cap_${side}${i}`, box(cap.size, cap.h, cap.size), amber, [
        x,
        post.top + cap.h / 2,
        sgn * zr,
      ]);
      add(root, `lift_eye_${side}${i}`, torus(eye.R, eye.t, 5, 10), rust, [
        x,
        post.top + cap.h + eye.R,
        sgn * zr,
      ]);
    })
  );
}

/**
 * The craft's drive — "a riveted drive box aft with the exhaust louvres
 * laid on its roof and an open four-bladed screw behind it, no shroud and no
 * cowl" (UNIT — Spark): the box, its roof, the louvres on the roof in the
 * vent — the kit's `louvres`, laid on a roof where the chart counts them —
 * the shaft out of the box's after face, the hub, and the blades, plates
 * through the hub a half-turn apart over `blades.count`, so two plates are
 * four blades (`drive_box · drive_roof · drive_louvre_0.. · screw_shaft ·
 * screw_hub · screw_blade_0 · _1`). No ring round the screw: "no shroud" is
 * the loud kind, on a craft whose argument is being heard.
 */
export function craftDrive(root, { black, grey, rust, vent }, opts) {
  const { box: body, roof, louvres: lv, shaft, hub, blades } = opts;
  const onX = [0, 0, Math.PI / 2];
  add(root, 'drive_box', box(...body.size), black, body.at);
  add(root, 'drive_roof', box(...roof.size), grey, roof.at);
  louvres(root, 'drive_louvre', vent, lv);
  add(root, 'screw_shaft', cyl(shaft.r, shaft.r, shaft.length, 8), rust, shaft.at, onX);
  // Laid on X by a quarter turn about Z, a cylinder's top lands on −X: the
  // hub's tip radius is the geometry's `rTop`, so it draws in astern.
  add(root, 'screw_hub', cyl(hub.rTip, hub.r, hub.length, 8), grey, hub.at, onX);
  for (let i = 0; i < blades.count; i++)
    add(root, `screw_blade_${i}`, box(...blades.size), grey, blades.at, [(i * Math.PI) / blades.count, 0, 0]);
}

/**
 * One short thick gun on an open ring, no shield — the Derrick's `barbette`
 * at a craft's scale, which that builder cannot reach because its cradle and
 * barrel are the Derrick's to the metre: the seat plate on the crown, the
 * ring it trains on in hazard amber, the drum, the cradle, the barrel laid
 * forward and drawn in toward its mouth, and the collar at the muzzle
 * (`gun_seat · gun_ring · gun_drum · gun_cradle · gun_barrel · gun_muzzle`).
 * Nothing on it is lit: the muzzle flares for the instant of a shot, a
 * transient and not a lamp.
 */
export function craftGun(root, { black, grey, rust, amber }, opts) {
  const { x, seat, ring, drum, cradle, barrel, muzzle } = opts;
  const onX = [0, 0, Math.PI / 2];
  add(root, 'gun_seat', box(...seat.size), grey, [x, seat.y, 0]);
  add(root, 'gun_ring', cyl(ring.r, ring.r, ring.h, 12), amber, [x, ring.y, 0]);
  add(root, 'gun_drum', cyl(drum.rTop, drum.r, drum.h, 12), grey, [x, drum.y, 0]);
  add(root, 'gun_cradle', box(...cradle.size), black, [x + cradle.dx, cradle.y, 0]);
  // Rolled onto its side by a quarter turn about Z, a cylinder's top lands
  // on −X, so the breech radius is the geometry's `rTop`.
  add(root, 'gun_barrel', cyl(barrel.rBreech, barrel.rMuzzle, barrel.length, 10), grey, [
    barrel.breech + barrel.length / 2,
    barrel.y,
    0,
  ], onX);
  add(root, 'gun_muzzle', cyl(muzzle.r, muzzle.r, muzzle.length, 10), rust, [
    barrel.breech + barrel.length + muzzle.length / 2 - muzzle.sink,
    barrel.y,
    0,
  ], onX);
}

export { THREE };
