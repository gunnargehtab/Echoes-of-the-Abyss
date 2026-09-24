/**
 * The Abyssal Directorate — the Listening's shape language.
 *
 * "Spiked, insectoid, segmented crustacean forms — asymmetric, yet
 * regimented. Chitinous shell with red photophore biolights in asymmetric
 * deep-sea patterns" (docs/asset-prompts-3d.md, Block 2); "nothing is
 * symmetrical; everything is regimented" (docs/factions.md).
 *
 * The vocabulary is read off the Dredge, the Precentor and the Chorister,
 * whose node names are the parts list:
 *
 *   Dredge     tergite_0..4 · tergite_ridge_0..4 · tergite_spine_0..4 · telson ·
 *              tail_spine_p/s · scoop · scoop_lip · mandible_p/s ·
 *              mandible_root_p/s · gullet · claw_arm · claw_forearm ·
 *              claw_tip_a/b · dredge_boom · dredge_tooth_0..2 · hopper ·
 *              hopper_rim · hopper_throat · photophore_p_ij / s_ij / dorsal_i
 *   Precentor  tergite_0..3 · tergite_seam_0..3 · rostrum · telson · array_boom ·
 *              array_boom_sleeve · hydrophone_s0..5 / p0..4 · boom_tip_p/s ·
 *              dome · dome_spine_0..5 · dome_aft · dorsal_spine_0..3 ·
 *              limb_p0..2 / s0..2 · photophore_0..3
 *   Chorister  tergite_0..2 · tergite_seam_0..2 · bladder_dome · rostrum ·
 *              telson · tail_spine_p/s · dorsal_spine_0..2 · limb_p0..2 / s0..2 ·
 *              spine_gun · spine_gun_mount · photophore_s0..3 / p0 (the export
 *              wrote its row `_p`; its port turned the names round, #642 / #649)
 *   Verger     tergite_0..5 · tergite_seam_0..5 · rostrum · dome · dome_spine_0..5 ·
 *              dome_aft · dome_crown · dorsal_spine_0..3 · hatch_s0 / p1 / s2 / p3
 *              (_collar, _door, _rim, _dog_0..1) · keel · ballast_tank_0..1 ·
 *              drive_duct · drive_hub · drive_vane_0..2 · photophore_0..3 — built
 *              here rather than read off an export (#783), the first of them
 *   Acolyte    tergite_0..2 · tergite_seam_0..2 · rostrum · telson · dome ·
 *              dome_spine_0..5 · dorsal_spine_0..2 · limb_s0..2 / p0..2 (_hip,
 *              _femur, _knee, _tibia, _foot) · photophore_s0..2 / p0..2 — built
 *              (#784), the second
 *   Thurible   tergite_0..5 · tergite_ridge_0..4 · rostrum · telson · rim_spine_s0..1 /
 *              p0..1 · limb_s0..3 / p0..3 · spine_gun · spine_gun_mount · keel ·
 *              keel_rib_0..6 · cell_s0..3 / p0..2 (_collar, _well, _lid, _hinge) ·
 *              photophore_rim_s0..4 / p0..3 · photophore_tail_s0..3 / p0..1 — built
 *              (#785), the third
 *   Lure       tergite_0..6 · tergite_ridge_0..3 · tergite_seam_4..6 · rostrum ·
 *              bladder_dome · dorsal_spine_0..2 · limb_s0..2 / p0..2 · keel ·
 *              keel_rib_0..5 · file_ridge · plectrum_hip / _femur / _knee / _tibia /
 *              _wrist · plectrum · telson (_plate, _rib) · fan_s0..1 / p0..1 (_plate,
 *              _rib) · edge_row_6_s0..2 / p0..2 · edge_row_5_s0..3 / p0..2 ·
 *              edge_row_4_s0..2 / p0..1 · photophore_s0..2 / p0..2 ·
 *              photophore_tail_s0..1 / p0..1 — built (#786), the fourth
 *   Succentor  tergite_0..7 · tergite_ridge_0..1, 7 · tergite_spine_0..1 · rostrum ·
 *              telson · tail_spine_s/p · dome · dome_spine_0..5 · dome_aft ·
 *              cradle_s0..2 / p0..1 (_floor, _coaming, _sill, _mandible_0..1,
 *              _clasp_0..1) · rim_spine_s0..1 / p0..2 · limb_s0..3 / p0..3 ·
 *              photophore_rim_s0..7 / p0..5 — built (#840), with its craft
 *   Treble     tergite_0..2 · tergite_ridge_0..2 · rostrum · telson · spine_gun ·
 *              spine_gun_mount · dorsal_spine_0..1 · clasp_lug_s/p ·
 *              photophore_s0 / p0 — whose body (`trebleBody`) both are cut from
 *
 * Three rules fall out of those, and they are what this module holds rather
 * than any one hull:
 *
 * - **The body is a segment series.** Every Directorate hull is a run of
 *   overlapping tergites — squashed orbs, alternating bruise violet and
 *   abyssal red, each with a dark lip where the next plate overlaps it and a
 *   spine off it — with a rostrum ahead and a telson astern. Nothing here is
 *   lathed: a carapace is plates, and the seams between them are the shape.
 * - **Asymmetric, yet regimented.** The spines rake the same way and alternate
 *   sides; the limbs fold at one angle in two matched ranks; the photophores
 *   run in ranks at a fixed pitch — starboard three to a plate, port two on
 *   every other plate — and the Precentor's starboard hydrophone rank is one
 *   longer than its port. (Until #650 the Dredge's block put the claw to
 *   starboard and the boom to port, and the Precentor's put the longer rank
 *   to port; neither block pins the photophores to a side. The approved
 *   models were named and read with +z as port, #642 turned that reading
 *   round, and the prose was amended to the models.) The *rule* is regular
 *   and the *result* never mirrors, so the builders that place light refuse
 *   a mirrored pair outright.
 * - **Light is a photophore, and it lies flat — or on a dome's own slope, the Thurible's rim (#785) —.** A photophore is a small flat
 *   box in `biolight_crimson` on an upward face — of the carapace, or of a
 *   limb's knee standing clear of it, as the Acolyte's six are (#784) —
 *   because the maps are top-down (kit.mjs); the gullet and the hopper
 *   throat are the same thing writ large. The Directorate's listed SIGs are baseline figures,
 *   so its light is spread along the plates, not thrown forward.
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
  plan,
  loft,
  bothSides,
  polar,
  part,
  drawn,
  segmentSeries as series,
  capsule,
  group,
  sidedPost,
  eulerXYZ,
  zLong,
  xLong,
  seat,
  pierced,
} from '../kit.mjs';

/**
 * The Directorate's palette: one table, one factory a material *name*, so
 * that re-finishing the navy is one edit here (#888, Phase 6 of #540).
 *
 * The carapace section's values are the Dredge's own materials — the four
 * tokens of docs/art-direction.md, and, where an approved model needed a
 * colour the docs do not name, that model's hex, exactly (kit.mjs `hex`);
 * the shared kinds' and the Submersible's sections below carry their own
 * exports' values under names of their own. Exactly,
 * because the first transcription rounded each linear channel to two
 * decimals and trench black came out `[0, 0, 0.01]`: red and green zeroed,
 * blue doubled, a 3.4× drop in the luminance the bake ships (#630, F2).
 *
 * One name, one value, across the navy (docs/asset-prompts-3d.md Block 2b,
 * rule 3). The recolour discards every hue and keeps the *ratio* between a
 * model's materials (rosterModels.ts `recolor`), so a name at two values is
 * two greys on two models a player sees side by side. Until #888 this module
 * held a table per approved export — `structureInk`, `settlementInk`,
 * `scoutInk`, `submersibleInk`, `worksInk` — each copying its file's values
 * as a port must, which is how `weld_steel` came to be #27313B on the r184
 * structure passes against #3A3F4A here, and `biolight_crimson`'s base
 * #2C0A12 on the turret and #3A0D16 on the settlement pass against #1A0810
 * here. The hull value is canonical (Block 2b, "One name, one value — held
 * since #888"), every name below carries it, and what a name replaced is
 * said at the name.
 *
 * A lamp's strength is not part of its value: it is that model's resting
 * loudness, approved at intake against its SIG band and carried straight
 * into the conn view (`recolor` keeps emissive luminance × strength exactly).
 * So every lamp factory takes `intensity` and each script passes its
 * model's own; the default is the kit's 1, which the tergite hulls burn at.
 */
export const ink = {
  // --- The carapace: the Dredge's, which every hull and structure built
  // from the tergite vocabulary wears. `trench_black` clads the ridges, the
  // spines, the mandible roots and the hopper.
  chitinViolet: () => clad('chitin_violet', hex('#2D1B3D'), 0.1, 0.62),
  /**
   * The same violet for an *open patch*: the Cantor's three shell plates,
   * windows of a sphere that the approved export drew two-sided, kept so
   * here so that the approved render holds rather than deciding a finish
   * in a port. Not because a single side would show holes: the plates
   * span 30–49° from the zenith, so at the conn view's 55° pitch every
   * plate face points at the camera, and a scratch bake with them
   * single-sided gave byte-identical maps; the back face shows only at
   * grazing angles below about 49° of pitch. Two-sided is part of a finish
   * (`diff.mjs`, #646), so the patch takes a name of its own rather than
   * making `chitin_violet` two-sided navy-wide — every other violet part in
   * the navy is a closed orb, cone or frustum with no second face to show,
   * and paying the culling on all of them for three plates on one
   * structure is the wrong trade. The Cantor's export had turned the one
   * material two-sided for its base tier and twenty-seven spines as well;
   * #888 put those closed parts back on `chitin_violet`.
   */
  chitinVioletOpen: () => {
    const m = clad('chitin_violet_open', hex('#2D1B3D'), 0.1, 0.62);
    m.side = THREE.DoubleSide;
    return m;
  },
  chitinRed: () => clad('chitin_red', hex('#7A1B2E'), 0.14, 0.52),
  /**
   * The Sentinel Turret's red. A turret is "nearly black — an ambush
   * predator, navigation marks only until it fires" (docs/asset-prompts-3d.md,
   * the Sentinel Turret block), and `chitin_red` at #7A1B2E is not that. A
   * name of its own rather than a dimming factor on `chitinRed`, because the
   * four navies dim differently — the Order dulls a metal, this navy darkens
   * a body colour, the Consortium banks its one `amber_lamp` to 2.4 — and one
   * factor would be overridden three times in four (factions/hadron.mjs
   * makes the same argument). The approved turret's own value (#639).
   */
  chitinRedDark: () => clad('chitin_red_dark', hex('#4E1220'), 0.14, 0.55),
  trenchBlack: () => clad('trench_black', hex('#0A0710'), 0.32, 0.42),
  /**
   * #3A3F4A, the hulls' value, on every model since #888. The r184 structure
   * passes carried #27313B — the turret first (#639), then the Bastion, the
   * Cantor, the Foundry and the Refinery copying it (#652) — the same finish
   * a shade darker, which Block 2b ("One name, one value — held since #888")
   * records and #888 brought onto the hull's. The turret's own value was the
   * one material of its five that set its register: with `chitin_red_dark` at
   * #4E1220 the steel is its brightest colour, so the whole turret sits a
   * step lower in the conn view now than its export did — and that is the
   * right step. With the navy's steel as its anchor the turret's shared names
   * render within 2% of the same names everywhere else in the navy (violet
   * 0.0987 against 0.0976, the crimson base 0.0753 against 0.0750), where
   * before they rendered brighter than on every other model. Only its own
   * `chitin_red_dark` drops (0.1352 → 0.1076), which is nearer its block's
   * "nearly black".
   */
  weldSteel: () => clad('weld_steel', hex('#3A3F4A'), 0.38, 0.44),
  /**
   * The photophore: the crimson token in `emissive` over a near-black base,
   * #1A0810, the hulls' value on every model since #888. The turret's base
   * was #2C0A12 (#639) and the settlement pass's — the Bastion, the Cantor,
   * the Foundry, the Refinery — #3A0D16 (#652): three values under one
   * name, the split Block 2b records, and a base is the part of a lamp the
   * recolour reads as cladding, so the three were three greys. The emissive
   * colour was #C2465E on all of them and did not move, so no strength
   * moved with it: the Bastion still burns at 3.323, the Cantor at 3.6, the
   * Foundry at 2.277, the Refinery at 2.6, the turret at 0.905.
   *
   * The shared kinds' `red_photophore` — the Light Scout's, the Corvette's,
   * the Harvester's and the Cruiser's — and the Submersible's `photophore`
   * are this lamp since #891. Both carried the token in `color` too, and
   * the recolour sets a model's register by its brightest material, lamp
   * bases included (rosterModels.ts `recolor`), so that base — 0.1666
   * linear against `abyssal_red`'s 0.0512 — was the anchor on all five:
   * the red rendered at 0.096 where the tergite hulls, whose brightest
   * colour is `chitin_red` at the same 0.0512, put theirs at the 0.160
   * ceiling, and the violet at 0.077 for their 0.098. The five sit where
   * the tergite hulls do now, the Submersible anchored on `edge_red`, the
   * same 0.0512. What the two names had left on this base was 0.35 rough
   * on the Submersible's, which under an emissive is not a second
   * fixture, so both folded here rather than onto a second near-black. On
   * the chart the photophores go near-black, as the Consortium's and the
   * Commune's shared-kind lamps and the Order's four `crystal_seam` hulls
   * did with #888; the Order's Cruiser and the two Submersibles that
   * still sat on a token moved with this one. The emissive did not move
   * and no strength did: 2.6, 2.6, 2.4, 6 and 2.2, each file's own.
   */
  biolightCrimson: (intensity = 1) =>
    lamp('biolight_crimson', hex('#C2465E'), hex('#1A0810'), 0.4, intensity),
  /**
   * The photophore family's *unlit* finish: `biolight_crimson`'s base, at the
   * hulls' value, with no emissive and the lamp's own finish (metalness 0,
   * roughness 0.4). A part the block lights only in a later band is built
   * and clad in this, never lit (docs/models-plan.md §3.2, rule 2) — the
   * Verger's bay hatches, which "glow through their hatches while they are
   * occupied" and are dark at rest. One name, one value (asset-prompts-3d.md
   * Block 2b, rule 3); it recolours to near-black under any flag.
   */
  biolightUnlit: () => clad('biolight_unlit', hex('#1A0810'), 0, 0.4),
  gulletGlow: (intensity = 1) =>
    lamp('gullet_glow', hex('#E0506A'), hex('#2A0C14'), 0.4, intensity),
  /**
   * The works' lights, one model each: `forge_light` is the Foundry's line
   * and launch glow, "the forge light across the bay and at its mouth",
   * "flooding from the bay when producing"; `floodlight_hot` the
   * Refinery's stack tips, gantry lights, intake mouth and flood lamps,
   * "floodlit working surfaces, visible machinery light" — one lamp
   * colour on one base, polished to 0.3, each at its file's own strength
   * (3.698 and 3.476). The approved files' own values (#652). The
   * Refinery's maw wore it too until #907 made the maw an aperture on
   * `gullet_glow` (`crusherMaw`).
   */
  forgeLight: (intensity = 1) =>
    lamp('forge_light', hex('#E07A8C'), hex('#40141C'), 0.3, intensity),
  floodlightHot: (intensity = 1) =>
    lamp('floodlight_hot', hex('#E07A8C'), hex('#40141C'), 0.3, intensity),

  // --- The shared kinds' earlier authoring pass (#649): the Light Scout,
  // the Corvette, the Harvester and the Cruiser name the tokens as
  // docs/art-direction.md names them — bruise violet, abyssal red, trench
  // chitin — at a finish of their own. Not a split: the four agree on
  // everything. Their photophore was the crimson token through and
  // through under a name of its own, `red_photophore`, and #888 left it
  // as the four exports' brightest colour; #891 put it on
  // `biolight_crimson` (above). The cladding names are what the models
  // *are* and stay; the values are the exports'.
  bruiseViolet: () => clad('bruise_violet', hex('#2D1B3D'), 0.15, 0.5),
  abyssalRed: () => clad('abyssal_red', hex('#7A1B2E'), 0.12, 0.48),
  trenchChitin: () => clad('trench_chitin', hex('#0A0710'), 0.18, 0.42),

  // --- The Abyssal Submersible's, from the same pass and finished its own
  // way: a harder, glossier chitin for the one PR-3 hull of the shared
  // kinds (0.25 / 0.38 and 0.22 / 0.32 against the scout's 0.18 / 0.42 and
  // 0.15 / 0.5), and `edge_red`, a *lit cladding* — abyssal red at
  // metalness 0.15 with its own colour as emissive, at 0.12 on the file —
  // so the plate rims, the tail joints, the rostrum and the limb claws all
  // glow faintly. Its `photophore`, the token through and through polished
  // to 0.35 and burning at 2.2, is `biolight_crimson` since #891 (above).
  // One model each; the values are the export's own (#649).
  chitinTrench: () => clad('chitin_trench', hex('#0A0710'), 0.25, 0.38),
  plateViolet: () => clad('plate_violet', hex('#2D1B3D'), 0.22, 0.32),
  edgeRed: (intensity = 1) => {
    // `lamp` sets metalness 0; this one is a metal that glows.
    const m = clad('edge_red', hex('#7A1B2E'), 0.15, 0.42);
    m.emissive = new THREE.Color(...hex('#7A1B2E'));
    m.emissiveIntensity = intensity;
    return m;
  },
};

/**
 * The Listening's facet rule and panel bands (docs/asset-prompts-3d.md Block
 * 2c, #919; `tools/hull-models/facets.mjs` is the measure). A facet is a
 * segment of shell, two metres: the Dredge's mandibles and claw and the
 * Precentor's dome are cut at 1.7–2.2 m a facet, and the median unlit part
 * on a hull here is 2.0 m on a side. Odd counts only — step two from one: a
 * regular polygon with an odd count has no facet opposite a facet and mirror
 * lines only through a vertex and the far edge's middle, so laid on the
 * hull's axis with a vertex to starboard, as the kit's `cyl` lays it, it
 * mirrors crown to keel and never port to starboard, the law's own axis —
 * "asymmetric, yet regimented" in one shape (the pass lays every odd ring so,
 * never turned a quarter facet, which would put a vertex on the crown and
 * mirror it across the keel line) — and both approved hulls with a dorsal
 * rank cut every spine five-sided (`dorsalSpines`). Five is the floor.
 * Twenty-one is the ceiling: a judgement on silhouette, set between the
 * Consortium's sixteen and the Commune's twenty-four because a chitin shell
 * is rounder at the rim than rolled plate and harder than a pod, on the odd
 * lattice. The one section is five, and a section keeps a count and not a
 * shape: it keeps every five-sided spike at any size — the spine is a
 * pentagon the way the Order's spar is a diamond, where the lattice alone
 * would cut the Bastion's anchor claws at seven metres of base to twenty-one
 * — and with them nine pentagonal torus rings and tubes on the structures
 * (the Bastion's seam rings, lips and pipes, the Turret's collar, the
 * Foundry's launch mouth), which pass as pentagons. Four is not a section
 * any more: what it kept was two dozen square-section torus seams and cables
 * on the r184 structures and the shared kinds' rostra, none of them this
 * module's — its own rostrum is six-sided — and the Verger's hatch dogs and
 * the Lure's plectrum re-cut to five are more the navy than they were. The
 * keels' seven is a builder's default on four hulls and not a section, and
 * the pass re-cuts it to the rule; so are the plates' twelve, one count on
 * every size of tergite, and an even one.
 *
 * Panels: one to three metres, from what the measure counts, which is unlit
 * parts. The navy's unlit vocabulary is plates and seams — wide — and
 * spines, limbs, dogs and teeth — a spine 2–3 m on a side from above, a limb
 * about two — and "spiked, insectoid, many-limbed" is three words of the
 * law's four for the small parts against one, "segmented", for the wide. A
 * hull whose median unlit part is under three metres carries at least as
 * many spikes and limbs as plates and seams; one whose median is a plate is
 * the segmented half of the law without the spiked half. The Dredge, this
 * rule's own facet reference, reads 5.2 m: its block asks for five wide
 * tergites and it has them, with five spines, a claw and a boom and no
 * limbs, so under Block 2 it gains limbs or spines at the pass — its lit
 * points are livery, which the metric drops. A structure's band is the
 * hull's at the chart's ratio of densities, 4 to 1.5 px/m, rounded to the
 * half metre — a judgement, and Block 2c says what it rests on.
 */
export const facets = { chordM: 2, min: 5, max: 21, step: 2, offset: 1, sections: [5] };
export const panels = { hull: [1, 3], structure: [2.5, 8] };

/** A carapace orb: a low-facet sphere the caller squashes into a plate. */
const orb = (w = 12, h = 6) => new THREE.SphereGeometry(1, w, h);
/** A spine: a faceted cone, apex at +Y until the caller rakes it. */
const spike = (r, length, facets = 6) => cyl(0, r, length, facets);

/**
 * Refuse a mirrored pair: nothing on this navy is symmetrical. `tol` is
 * half a metre in the frame the spots are given in — the kit's metres for
 * a hull built in them, and a hull's own units for a shared-kind export
 * built in *its* frame, where the Submersible draws 95 m in 4.53 units and
 * half a unit is ten metres (#649).
 */
function refuseMirror(what, spots, tol = 0.5) {
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++) {
      const [, ax, ay, az] = spots[i];
      const [, bx, by, bz] = spots[j];
      if (Math.abs(ax - bx) < tol && Math.abs(ay - by) < tol && Math.abs(az + bz) < tol)
        throw new Error(`${what}: ${spots[i][0]} and ${spots[j][0]} mirror — nothing here does`);
    }
}

/**
 * Stations for a run of tergites: the kit's `segmentSeries` with the
 * Directorate's section — plates wider than they are long and far wider
 * than tall, the Dredge's 17 × 10 × 26 — so a hull passes only its length
 * and its count. Stern first, which is the order the Dredge and the
 * Precentor number them in.
 */
export const segmentSeries = (opts) => series({ section: [0.6, 1.5], ...opts });

/**
 * The tergites: a squashed orb per `[x, sx, sy, sz]` station, alternating
 * violet and red from the stern, with a lip and a spine each.
 *
 * `lip` is where the plates overlap. `'seam'` is the Chorister's and the
 * Precentor's: a smaller dark orb sunk at the forward end, reading as the
 * shadow line under the plate ahead. `'ridge'` is the Dredge's: a dark orb at
 * the aft edge standing *proud* of the plate, the raised trailing lip of a
 * heavier carapace. `'none'` for a hull whose plates butt.
 *
 * `spines` puts one spine off each plate — alternating sides from starboard,
 * alternating between the two `lengths`, all raked forward by `rake`, each
 * `offsets[0]` metres off the keel on the even plates and `offsets[1]` on the
 * odd — which is the regimented asymmetry the navy is built on. Two constant
 * offsets rather than a fraction of each plate's beam: the Dredge's stand 5 m
 * and 6 m out on plates that run from 17 m to 26 m of half-beam, so a spine
 * is not further out on a wider plate (#630 F5). Omit for a smooth back.
 *
 * `seam` shapes the `'seam'` lip: its centre `at` of the half-length forward
 * of the plate's, and its `size` as fractions of the plate's `[sx, sy, sz]`.
 * The defaults are the Chorister's seam as its approved binary carries it.
 * The Precentor's approved plates carry a heavier one — 0.35 long at 0.8 and
 * 0.7 tall, a lip that stands a little proud of its plate above and below
 * rather than shading under the plate ahead — and the hull passes it (#638).
 * That 0.7 is of the *half-beam*, which is what `tallOf: 'beam'` says: read
 * the height fraction against `sz` rather than `sy`. It was written as
 * `0.7 / 0.65` against `sy` instead, exact only while every station on that
 * hull keeps `sy = 0.65 · sz` — true of all four today, and silently wrong
 * the first time one of them is redrawn (#646).
 *
 * `ridge` shapes the `'ridge'` lip the same way: its centre `at` of the
 * half-length from the plate's (aft when negative), its `size` as fractions
 * of `[sx, sy, sz]`, and its `lift` above the hull axis in metres. The
 * defaults are the Dredge's ridge exactly, so the Dredge passes nothing. The
 * Thurible's trailing lip is the same orb drawn lower — 0.8 of the plate's
 * height rather than 1.125 — because a lip that tops the dome behind it is
 * a collar, not an edge (#785).
 *
 * `first` numbers the plates from somewhere other than 0, so a hull whose
 * plates are at two scales — the Thurible's shield over its tail — can draw
 * the series in two or three calls with different lips and keep one run of
 * names and one violet-red alternation. Stern first, still.
 *
 * A station is the orb's *scale*, not its bounding box. A low-facet sphere
 * never reaches its radius on every axis — an `orb(14, 7)` stops at 0.975 of
 * sx and 0.950 of sz — so a station read off a box is a few percent short,
 * and every fraction hung on it then comes out a few percent long (#630,
 * the second pass).
 */
/**
 * The tergite ridge as the Dredge draws it: an orb `at` of the plate's
 * half-length from its centre, `size` of the plate's [sx, sy, sz], stood
 * `lift` up. One value, read by `tergites` to build the ridge and by
 * `plateEdgePhotophores` to keep a lamp out from under it (#890).
 */
export const TERGITE_RIDGE = { at: -0.75, size: [0.25, 1.125, 0.92], lift: 0.5, facets: [10, 6] };

export function tergites(root, { violet, red, black }, opts) {
  const { segments, lip = 'seam', seam = {}, ridge = {}, spines, facets = [12, 6], first = 0 } = opts;
  const { at: seamAt = 0.85, size: seamSize = [0.3, 0.95, 0.9], tallOf = 'height' } = seam;
  const {
    at: ridgeAt,
    size: ridgeSize,
    lift: ridgeLift,
    facets: ridgeFacets,
  } = { ...TERGITE_RIDGE, ...ridge };
  if (tallOf !== 'height' && tallOf !== 'beam')
    throw new Error(`tergites: seam.tallOf is '${tallOf}' — 'height' (sy) or 'beam' (sz)`);
  segments.forEach(([x, sx, sy, sz], k) => {
    const i = first + k;
    add(root, `tergite_${i}`, orb(...facets), i % 2 ? red : violet, [x, 0, 0], [0, 0, 0], [sx, sy, sz]);
    if (lip === 'seam')
      add(root, `tergite_seam_${i}`, orb(10, 6), black, [x + seamAt * sx, 0, 0], [0, 0, 0], [
        seamSize[0] * sx,
        seamSize[1] * (tallOf === 'beam' ? sz : sy),
        seamSize[2] * sz,
      ]);
    else if (lip === 'ridge')
      add(root, `tergite_ridge_${i}`, orb(...ridgeFacets), black, [x + ridgeAt * sx, ridgeLift, 0], [0, 0, 0], [
        ridgeSize[0] * sx,
        ridgeSize[1] * sy,
        ridgeSize[2] * sz,
      ]);
    if (spines) {
      const { lengths = [7, 10], r = 1.2, rake = -0.3, offsets = [5, 6] } = spines;
      const sgn = i % 2 ? -1 : 1;
      add(root, `tergite_spine_${i}`, spike(r, lengths[i % lengths.length]), black, [
        x + 2,
        sy + 2,
        sgn * offsets[i % offsets.length],
      ], [0, 0, rake]);
    }
  });
}

/** The rostrum: a faceted cone ahead of the first plate, apex at `tip`. */
export function rostrum(root, red, { tip, r, length, facets = 6 }) {
  add(root, 'rostrum', spike(r, length, facets), red, [tip - length / 2, 0, 0], [0, 0, -Math.PI / 2]);
}

/**
 * The telson: a cone astern with its base ring at `tip` — the sternmost
 * point of the hull — and its apex `length` forward, buried in the last
 * plate, so the stern is a blunt transom `2r` across; and the pair of tail
 * spines off it, each centred at `[x, y, ±z]` with its base aft and outboard
 * and its point forward and inboard, `splay` radians off the keel.
 *
 * Both cones go base-aft, point-forward: `cyl(0, r, …)` puts the apex at +X
 * after the −π/2 roll, as `rostrum` does. The first transcription had both
 * the other way round — the point at the stern — and every gate passed,
 * because a cone's bounding box is the same end for end; the approved Dredge
 * and Precentor both draw them this way (#630, beyond F1–F5).
 */
export function telson(root, { violet, black }, opts) {
  const { tip, r, length, facets = 6, tailSpines } = opts;
  add(root, 'telson', cyl(0, r, length, facets), violet, [tip + length / 2, 0, 0], [0, 0, -Math.PI / 2]);
  if (tailSpines) {
    const { x, y = 1, z, r: sr, length: sl, splay = 0.4 } = tailSpines;
    bothSides((side, sgn) =>
      add(root, `tail_spine_${side}`, cyl(0, sr, sl, 5), black, [x, y, sgn * z], [0, sgn * splay, -Math.PI / 2])
    );
  }
}

/**
 * Walking limbs, folded under the flanks: two ranks of `weld_steel` legs at
 * `xs`, athwartships and folded down by `fold` radians. Matched ranks are
 * this navy's regimentation, and the one place a mirrored pair is the rule.
 *
 * `r` is one radius or `[root, tip]`: the Precentor's approved limbs taper
 * from 0.7 m at the flank to 0.5 m at the tip over 7 m (#638) — a taper a
 * bounding box cannot show, as `claw` says of the Dredge's; the first port
 * matched their boxes to the centimetre with a straight 6.9 m leg at a
 * shallower fold and a sixth more surface.
 *
 * The tip is the cylinder's +Y end, laid athwartships by a quarter turn
 * about X and folded forward by `fold` about Z. The port rank is the
 * starboard rank's mirror across the keel, and the mirror of an XYZ Euler
 * across the XY plane negates its X and Y angles and keeps Z (`flank` in
 * kit.mjs says the same of the export's x) — so it is the quarter turn that
 * changes sign a side, and the fold does not. The approved exports had it
 * the other way about, `[π/2, 0, ∓fold]`: the same six lines in plan, so
 * nothing at 4 px/m showed it, but the port rank's taper ran backwards —
 * roots outboard, tips at the flank — the starboard rank turned over
 * rather than mirrored. Both ports reproduced that, as a port must; #645
 * corrected it here, in the builder, so the module cannot draw a pair that
 * does not mirror.
 *
 * `rim(x, y)`, when given, seats each limb's root `sink` inside the flank
 * it finds there instead of reading `z` — the Thurible's shield is 16 m of
 * half-beam under one limb station and 22 under the next, and one `z`
 * roots a limb in water at one end of the rank or buries it whole at the
 * other (#785). The Chorister and the Precentor pass none and are
 * unchanged.
 */
export function limbs(root, steel, { xs, y, z, r = 0.6, length = 6, fold = 0.45, rim, sink = 0.8 }) {
  const [rootR, tipR] = Array.isArray(r) ? r : [r, r];
  // A limb's centre is `x`; its root, half a length back along the fold,
  // is where the flank is asked. `rim` given, `z` is not read.
  const centreZ = (x) => {
    if (!rim) return z;
    const flank = rim(x - (length / 2) * Math.sin(fold), y);
    if (flank <= sink) throw new Error(`limb: no shell to root in at x = ${x}, y = ${y}`);
    return flank - sink + (length / 2) * Math.cos(fold);
  };
  bothSides((side, sgn) =>
    xs.forEach((x, i) =>
      add(root, `limb_${side}${i}`, cyl(tipR, rootR, length, 6), steel, [x, y, sgn * centreZ(x)], [
        (sgn * Math.PI) / 2,
        0,
        -fold,
      ])
    )
  );
}

/**
 * Dorsal spines along the back, `[x, y, z, length]` each, all raked forward
 * by `rake`. The hull alternates their sides; the builder holds the rake.
 * `facets` is the cone's cut, and five is the default because five is what
 * both approved hulls with a dorsal rank have — the Precentor and the
 * Chorister — and this builder has no third caller to want six (#638, #646).
 */
export function dorsalSpines(root, black, { spines, r = 0.7, rake = -0.3, facets = 5 }) {
  refuseMirror('dorsal_spine', spines.map((s, i) => [i, ...s]));
  spines.forEach(([x, y, z, length], i) =>
    add(root, `dorsal_spine_${i}`, spike(r, length, facets), black, [x, y, z], [0, 0, rake])
  );
}

/**
 * Photophores: flat crimson boxes, one each at `[name, x, y, z]`, on an
 * upward face. A mirrored pair is refused — a pattern that repeats on
 * neither side is the Block 2 rule, and the Chorister's four-and-one is it.
 *
 * A fifth element, `[a, b, c]`, is the mark's own XYZ Euler in place of
 * the rank's `yaw` — for a mark laid on a slope rather than a crown, as
 * `rimPhotophores` lays the Thurible's on its shield's flank (#785). A
 * spot without one lies flat, as every rank before it did.
 *
 * `rest` names the parts the marks lie on — the Dredge's plates and
 * ridges — and with it each spot's height is a seed rather than a station:
 * the mark is dropped onto whichever of those parts is on top under its
 * (x, z), its bottom face on the facet and tilted with it (kit.mjs `seat`,
 * `drop`), so a mark whose file put it a metre and a half over its plate
 * comes down onto the plate (#894). A spot's own Euler is then the facet's.
 * `sink` runs the mark's underside that far into the facet — the rim
 * rule's 0.15, which `rimPhotophores` passes with `rest` (#907) — and is
 * nothing by default, the Dredge's lamps lying on their plates. Without
 * `rest` the marks lie where the spots say, as every rank before the
 * Dredge's still does.
 */
export function photophores(root, crimson, opts) {
  const { spots, size = 1.1, h = 0.4, depth, yaw = 0, rest, sink = 0 } = opts;
  refuseMirror('photophore', spots);
  spots.forEach(([name, x, y, z, rot]) => {
    const on = rest && seat(root, rest, [x, y, z], { stand: h / 2, sink, drop: true });
    add(
      root,
      name,
      box(size, h, depth ?? size),
      crimson,
      on ? on.at : [x, y, z],
      on ? on.rot : (rot ?? [0, yaw, 0])
    );
  });
}

/**
 * The Dredge's rule for a lit carapace: a rank of photophores along every
 * plate's edge, each rank starting `start` of the plate's half-length from
 * its centre and running aft-to-forward at `pitch` of it, sitting at `y` of
 * the plate's height and `z` of its beam — on the shell where it faces up.
 * Starboard carries `starboard.count` on every plate; port `port.count` on
 * every `port.every`-th plate only. Regimented, and never symmetric.
 *
 * The station is where a lamp is *sought*, not where it is put. The plate
 * is a low-facet orb, and `y` of its height at `z` of its beam is on its
 * ideal ellipsoid only at one station along it — the approved file laid
 * every lamp at those fractions, and of the eighteen the ridge rule left
 * alone, twelve stood 0.17 to 1.71 m over the facet under them and six
 * were sunk up to a decimetre into it, since the shell falls away from
 * the ellipsoid toward each plate's ends (#894, from #890's review). So
 * each lamp is dropped onto the shell at its station: the facet straight
 * under it, of whichever plate or ridge is on top there (`first` numbers
 * them as `tergites` does), the lamp's bottom face laid on that facet
 * and tilted with it, half its height proud (kit.mjs
 * `seat`, `drop`). The rank still runs the plate's edge at the file's
 * stations and beams, and every lamp in it rests on the shell — the
 * first of plate 4's starboard rank on plate 3, which stands over that
 * station.
 *
 * Plates overlap, and the plate ahead carries a raised ridge over its aft
 * end that can stand over the last lamp of the rank behind it — three of
 * the Dredge's twenty-one sat so, and a top-down map never saw them.
 * `ridge` is that ridge as `tergites` draws it (`TERGITE_RIDGE`, any field
 * overridable): given it, a lamp whose station falls under the ridge ahead
 * rides on that ridge's crown instead, at the lamp's own beam, so the row
 * still runs the plate's edge and every lamp in it faces up
 * (docs/models-plan.md §3.2 rule 5, #890). The test is the ridge's own
 * ellipsoid at the lamp's station; the lamp keeps its name and its size,
 * and is seated on `tergite_ridge_{i+1}` the same way — on the facet it
 * stands on, since the ridge is a low-facet orb too and a lamp set on its
 * ideal surface floats half a metre over the chord (#890). Without `ridge`
 * the rank is laid on the plates as the file laid it, lamps under ridges
 * and all.
 */
export function plateEdgePhotophores(root, crimson, opts) {
  const {
    segments,
    starboard = { count: 3, start: -0.5, pitch: 0.45 },
    port = { count: 2, start: -0.3, pitch: 0.55, every: 2 },
    y = 0.72,
    z = 0.66,
    size = 1.4,
    ridge,
    first = 0,
  } = opts;
  const h = 0.4;
  const ahead = ridge && { ...TERGITE_RIDGE, ...ridge };
  // The carapace as a whole: plates overlap, and at a station where the
  // plate behind stands over this one's aft end the lamp rests on the one
  // that is on top, still at its own station.
  const shell = segments.flatMap((_, k) => [
    `tergite_${first + k}`,
    ...(ahead ? [`tergite_ridge_${first + k}`] : []),
  ]);
  segments.forEach(([x, sx, sy, sz], k) => {
    const i = first + k;
    const rank = (side, sgn, { count, start, pitch }) => {
      for (let j = 0; j < count; j++) {
        let seed = [x + (start + pitch * j) * sx, y * sy, sgn * z * sz];
        let on = shell;
        if (ahead && k + 1 < segments.length) {
          const [nx, nsx, nsy, nsz] = segments[k + 1];
          const cx = nx + ahead.at * nsx;
          const [a, b, c] = [ahead.size[0] * nsx, ahead.size[1] * nsy, ahead.size[2] * nsz];
          const u = ((seed[0] - cx) / a) ** 2 + (seed[2] / c) ** 2;
          if (u < 1 && ahead.lift + b * Math.sqrt(1 - u) > seed[1] - h / 2) {
            seed = [cx, seed[1], seed[2]];
            on = `tergite_ridge_${i + 1}`;
          }
        }
        const { at, rot } = seat(root, on, seed, { stand: h / 2, drop: true });
        add(root, `photophore_${side}_${i}${j}`, box(size, h, size), crimson, at, rot);
      }
    };
    rank('s', 1, starboard);
    if (i % (port.every ?? 1) === 0) rank('p', -1, port);
  });
}

/**
 * The bladder dome: the pressure bladder showing through the middle plate as
 * a paler dome — off the centreline, as the Chorister's is, because a grown
 * thing is not centred.
 */
export function bladderDome(root, violet, { x, y, z, r, squash = 0.64, stretch = 1.1 }) {
  add(root, 'bladder_dome', orb(), violet, [x, y, z], [0, 0, 0], [r, r * squash, r * stretch]);
}

/**
 * The listening dome: a studded red orb — `studs.count` spines in a ring at
 * `studs.ring` of its radius, each tilted outward by `studs.tilt` — with a
 * smaller violet dome behind it. The Precentor's ears, and the Cantor's.
 *
 * `ry` is the dome's half-height in metres and `aft.ry` the aft dome's;
 * `studs.radius` and `studs.lift` place the ring in metres, out from the
 * dome's centre and up from it. All three are typed numbers because the
 * approved dome's are: 5.5 m by 4.2 m with six spines 3.2 m out and 3.4 m
 * up, and an aft dome 2.6 m by 2.2 m. The fractions of `r` that once stood
 * behind them — squash 0.76, ring 0.58, height 0.81 — are gone: they were
 * a back-solve from this one dome, they missed it, and the hull passed the
 * metres over the top of them (#638, #646). `studs.facets` is the spines'
 * cut, five as the approved dome cuts them.
 *
 * `crown` lights the dome: `dome_crown`, a squashed orb in `crimson` of
 * `crown.r` across and `crown.ry` tall, seated `crown.sink` into the dome's
 * top so its upper half stands proud — a lit boss on the crown, facing
 * straight up where the chart's bake can see it. The Verger's (#783), whose
 * block lights "the dome" at rest and which needs one unoccluded upward
 * emitter (docs/models-plan.md §3.2, rule 5); the Precentor's dome is dark
 * and passes none, and its output is unchanged.
 */
export function listeningDome(root, { red, violet, black, crimson }, opts) {
  const { x, y, z = 0, r, ry, studs = {}, aft, crown } = opts;
  const { count = 6, tilt = 0.5, length = 3.2, r: sr = 0.5, phase = 0.4 } = studs;
  const { facets = 5, radius, lift } = studs;
  add(root, 'dome', orb(14, 7), red, [x, y, z], [0, 0, 0], [r, ry, r]);
  for (let i = 0; i < count; i++) {
    const a = phase + (i * 2 * Math.PI) / count;
    add(root, `dome_spine_${i}`, spike(sr, length, facets), black, [
      x + radius * Math.cos(a),
      y + lift,
      z + radius * Math.sin(a),
    ], [tilt * Math.sin(a), 0, -tilt * Math.cos(a)]);
  }
  if (aft)
    add(root, 'dome_aft', orb(10, 6), violet, [aft.x, aft.y, aft.z], [0, 0, 0], [
      aft.r,
      aft.ry ?? aft.r * 0.85,
      aft.r,
    ]);
  if (crown) {
    const { r: cr, ry: cry = cr * 0.4, sink = 0.3 } = crown;
    add(root, 'dome_crown', orb(10, 5), crimson, [x, y + ry - sink, z], [0, 0, 0], [cr, cry, cr]);
  }
}

/**
 * The hydrophone array athwartships: a boom across the beam at `[x, y]`
 * with a sleeve where it passes the body, a rank of hydrophone spines each
 * side stepping outward at `pitch` — alternating between the two `lengths`,
 * each in its socket, canted outward — and a tip spike at each end. `port`
 * and `starboard` are the rank sizes and must differ: the Precentor's
 * starboard rank is one longer, and a hull whose ranks match is not this
 * navy's.
 *
 * The tip spike stands *beyond* `halfSpan` rather than straddling it, so the
 * array's span is the boom plus both tips: the Precentor's 36 m boom and its
 * two 4 m spikes are the 44 m the prompt block calls for, and seating the
 * spikes on the boom's end instead would cost the hull 4 m of beam — enough
 * to move a plan outline, on a hull whose plan is a cross.
 *
 * `seat` lifts the hydrophones' centres above the boom's axis, in metres,
 * alternating as `lengths` do, and `sleeveR` is the sleeve's radius. Both are
 * given rather than ruled, because the rules that stood behind them missed
 * the only model there is: the approved rank sits at 3 m and 3.7 m — the
 * short spine's base on the boom's axis, the long one's 5 cm under it, which
 * is not the socket's height plus half the spine — round a sleeve of exactly
 * 1.9, which `r · 1.46` transcribed 2 mm short (#638, #646). The socket is a
 * 1.6 m square box 1.2 m tall, as that model has it; the drum this builder
 * first drew had no caller left.
 */
export function arrayBoom(root, { steel, black, red }, opts) {
  const { x, y, halfSpan, r = 1.3, starboard = 6, port = 5, z0 = 5, pitch = 2.6 } = opts;
  const { lengths = [6, 7.5], hr = 0.9, cant = 0.25, tip = 4, seat, sleeveR } = opts;
  if (port === starboard)
    throw new Error(`array_boom: ${port} hydrophones a side — the ranks never match`);
  add(root, 'array_boom', cyl(r, r, halfSpan * 2, 8), steel, [x, y, 0], [Math.PI / 2, 0, 0]);
  add(root, 'array_boom_sleeve', cyl(sleeveR, sleeveR, 6, 8), black, [x, y, 0], [Math.PI / 2, 0, 0]);
  bothSides((side, sgn) => {
    const count = sgn > 0 ? starboard : port;
    for (let j = 0; j < count; j++) {
      const len = lengths[j % lengths.length];
      const z = sgn * (z0 + pitch * j);
      const lift = y + seat[j % seat.length];
      add(root, `hydrophone_${side}${j}`, spike(hr, len), red, [x, lift, z], [
        sgn * cant,
        0,
        0.15,
      ]);
      add(root, `hydrophone_socket_${side}${j}`, box(1.6, 1.2, 1.6), steel, [x, y + 0.9, z]);
    }
    add(root, `boom_tip_${side}`, spike(r, tip), black, [x, y, sgn * (halfSpan + tip / 2)], [
      sgn * Math.PI / 2,
      0,
      0,
    ]);
  });
}

/**
 * The spine-gun: one short barrel off the centreline, on its mount.
 *
 * `r` is one radius or `[breech, muzzle]`: the approved Chorister's barrel
 * tapers from 0.7 m at the breech to 0.5 m at the muzzle over 9 m, as its
 * limbs taper (`limbs` above), and a straight barrel matches its box and
 * not its shape. `mount` places the mount block by its own `x`, `y`, `z`
 * where given, in place of the rule — half the barrel aft of the barrel's
 * centre, 0.2 m under it — which the Chorister's approved file does not
 * follow: its mount sits at x = 15 under a barrel centred at 20, 0.5 m
 * further aft than the rule puts it (#649).
 */
export function spineGun(root, { steel, black }, { x, y, z, r = 0.7, length = 9, mount = {} }) {
  const [breech, muzzle] = Array.isArray(r) ? r : [r, r];
  add(root, 'spine_gun', cyl(muzzle, breech, length, 6), steel, [x, y, z], [0, 0, -Math.PI / 2]);
  const { x: mx = x - length / 2, y: my = y - 0.2, z: mz = z } = mount;
  add(root, 'spine_gun_mount', box(2.4, 1.6, 2), black, [mx, my, mz]);
}

/**
 * The scoop bow: a plate from a plan outline with a steel lip over it, a
 * mandible each side converging on the tip, and the gullet — a lit patch
 * lying flat in the scoop's mouth, which is the loud thing on the Dredge.
 *
 * `bevel` chamfers the scoop's rim (kit.mjs `plan`), which the Dredge's has and
 * its lip does not: a mouth that eats the seabed is rounded where it meets it,
 * and the lip over it is sheet steel with an edge.
 */
export function scoopBow(root, { red, steel, black, gullet }, opts) {
  const { outline, y, depth, bevel = 0, lip, mandibles, gullet: g } = opts;
  add(root, 'scoop', plan(outline, depth, bevel), red, [0, y, 0]);
  if (lip) add(root, 'scoop_lip', plan(lip.outline, lip.depth, lip.bevel ?? 0), steel, [0, lip.y, 0]);
  if (mandibles) {
    const { x, y: my = 0.5, z, r = 2.2, length = 16, pinch = 0.12 } = mandibles;
    bothSides((side, sgn) => {
      add(root, `mandible_${side}`, spike(r, length), steel, [x, my, sgn * z], [0, sgn * pinch, -Math.PI / 2]);
      add(root, `mandible_root_${side}`, box(4, 4, 4), black, [x - length / 2, my, sgn * (z + 0.5)]);
    });
  }
  if (g) add(root, 'gullet', box(g.w, 0.5, g.d), gullet, [g.x, g.y, g.z ?? 0]);
}

/**
 * One great folded claw off one beam: an arm along the hull from `x`, a
 * forearm folded `fore.bend` radians *inboard* — back in toward the keel —
 * off its end, and two tips off the forearm's end closing on each other:
 * `tips.a` on the outboard side turning in by `close`, `tips.b` on the
 * inboard side turning out (a negative `close`), each a cone with its point
 * forward. `side` is 'p' or 's' and there is no pair — the Dredge's is to
 * port.
 *
 * The arm is placed from `x`; the forearm and both tips are placed by their
 * centres, `at`, because that is how the approved model placed them: no rule
 * off the arm's length and the bend lands the forearm on (36, 2, −29), and
 * the one the first transcription derived did not (#630 F3). That one also
 * folded the forearm *outboard* by the same 0.25 rad — its comment said
 * inboard; the sign said otherwise — which made the forearm the widest thing
 * on the hull and grew the beam by a metre, and it pointed both tips aft.
 * The fold's direction and the tips' are what this builder holds; every
 * number is the hull's.
 *
 * `arm.r` and `fore.r` are `[root, end]`: both limbs *taper* toward the tips
 * — the Dredge's arm from 2.4 m to 1.8 m, its forearm from 1.8 m to 1.4 m —
 * which a bounding box cannot show, since only the fat end reaches it, and
 * which the first transcription did not carry. A scalar is a straight limb.
 */
export function claw(root, { steel, black }, opts) {
  const { side = 'p', x, y = 1, z, arm, fore, tips } = opts;
  const sgn = side === 'p' ? -1 : 1;
  // A cylinder is born along Y with `rTop` at +Y; rolled onto X, +Y is the
  // far end, and a yaw about Y turns that end toward −Z. Inboard is +Z to
  // port and −Z to starboard, so `inboard` radians toward the keel is a yaw
  // of `sgn · inboard`.
  const turn = (inboard) => [0, sgn * inboard, -Math.PI / 2];
  const limb = (r, length) => {
    const [root, end] = Array.isArray(r) ? r : [r, r];
    return cyl(end, root, length, 8);
  };
  add(root, 'claw_arm', limb(arm.r, arm.length), steel, [x + arm.length / 2, y, z], turn(0));
  add(root, 'claw_forearm', limb(fore.r, fore.length), steel, fore.at, turn(fore.bend));
  add(root, 'claw_tip_a', spike(tips.a.r, tips.a.length, 5), black, tips.a.at, turn(tips.a.close));
  add(root, 'claw_tip_b', spike(tips.b.r, tips.b.length, 5), black, tips.b.at, turn(tips.b.close));
}

/** The dredge boom off the other beam: a spar along the hull with teeth stepped along it. */
export function dredgeBoom(root, { steel, black }, opts) {
  const { side = 's', x, y = 0.5, z, r = 1.2, length = 30, teeth = 3 } = opts;
  const sgn = side === 'p' ? -1 : 1;
  add(root, 'dredge_boom', cyl(r, r, length, 8), steel, [x, y, z], [0, 0, -Math.PI / 2]);
  for (let i = 0; i < teeth; i++)
    add(root, `dredge_tooth_${i}`, box(2.2, 2.2, 3), black, [
      x - length / 3 + (length / 3) * i,
      y,
      z + sgn * 2,
    ]);
}

/** The hopper amidships: a bin, its rim, and the throat lit around it — facing up. */
export function hopper(root, { black, steel, gullet }, { x, y, z = 0, w = 18, h = 6, d = 14 }) {
  add(root, 'hopper', box(w, h, d), black, [x, y, z]);
  add(root, 'hopper_rim', box(w + 1, 0.8, d + 1), steel, [x, y + h / 2 + 0.2, z]);
  add(root, 'hopper_throat', box(w * 0.67, 0.3, d * 0.57), gullet, [x, y + h / 2 + 0.7, z]);
}

/* --------------------------------------------------------------------------
 * The Verger (#783, off #540 Phase 4): the cohort transport, the first hull
 * built here rather than ported, so the first whose numbers are a design
 * and not a transcription. What it adds to the vocabulary is what a hold
 * needs that no hull before it had — a hatch, a keel, a ducted drive — and
 * one rule the ports never needed: where the carapace *is* at a point, so a
 * part can be seated on the shell rather than typed onto it.
 * ------------------------------------------------------------------------ */

/**
 * The carapace's height at `(x, z)` in plan: the highest of the tergite
 * orbs and their seam orbs there, or `-Infinity` where nothing is. The
 * seams are taken as `tergites` draws them (`lip: 'seam'`, the same `seam`
 * options), because a seam stands proud of its plate above and below on
 * the Precentor's rule and a mark laid on the plate's crown alone can end
 * up under a rib the audit then names. A hull that seats its spines, its
 * marks and its dome by this cannot type a number the shell does not reach.
 *
 * `seam.lift` is the lip orb's centre above the hull axis, for a hull that
 * asks after a `'ridge'` lip instead — the Thurible seats a rim spine on
 * its shield's trailing lip, which `tergites` draws half a metre up (#785).
 * Pass `null` for a series drawn with no lip at all.
 */
export function tergiteCrown(segments, x, z, seam = {}) {
  const {
    at: seamAt = 0.85,
    size: seamSize = [0.3, 0.95, 0.9],
    tallOf = 'height',
    lift = 0,
  } = seam ?? {};
  const top = (cx, sx, sy, sz, cy = 0) => {
    const u = (x - cx) / sx;
    const w = z / sz;
    const d = 1 - u * u - w * w;
    return d > 0 ? cy + sy * Math.sqrt(d) : -Infinity;
  };
  let y = -Infinity;
  segments.forEach(([cx, sx, sy, sz]) => {
    y = Math.max(y, top(cx, sx, sy, sz));
    if (seam)
      y = Math.max(
        y,
        top(
          cx + seamAt * sx,
          seamSize[0] * sx,
          seamSize[1] * (tallOf === 'beam' ? sz : sy),
          seamSize[2] * sz,
          lift
        )
      );
  });
  return y;
}

/**
 * Pressure hatches on the flanks: the cohort bays' doors, one a plate,
 * `hatch_${side}${i}` each — a frame seated on its plate's flank at `y`
 * below the hull axis and `dx` along it, its axis the ellipsoid's own
 * normal there (outboard, and canted down by however far below the axis it
 * sits: 14–17° at two metres on the Verger's plates), holding in that
 * frame a `_collar`, a steel frustum `r` at the mouth and 1.15 `r` at the
 * root running from `sink` inside the shell to `proud` outside it; a
 * `_door`, the pressure face, a drum 0.9 `r` across in the lamp family's
 * unlit finish (`ink.biolightUnlit`); a `_rim`, the lit lip, a torus of
 * `r` and `tube` stood on the collar's mouth; and two `_dog_k`, black
 * four-sided spines hooked over the door from either side, their points on
 * its face — the two `dogs.lengths` by turns, so the pair on one door does
 * not mirror. `hatches` is `[{ side, plate, dx }]`, and the module's rule
 * places them: a mirrored pair across the keel is refused.
 *
 * Why the rim is the light and the door is not: the block lights "the
 * hatch rims" at rest and the bays "through their hatches while they are
 * occupied" — a later band, which this pipeline draws by cladding, never
 * by a lamp (docs/models-plan.md §3.2). Why a torus: the chart bakes
 * straight down and the conn view looks down at 55°, and a door canted
 * under the belly is seen well by neither — but a ring has a face at every
 * angle, so its top arc stands outboard of the plate's widest beam where
 * the bake counts it (2.6 m outboard of the shell at 1.8 m proud and 16°
 * down: `lightAudit` reads each rim at three to four square metres) and
 * its outboard arc reads from the conn view on either side. The Verger's
 * first pass seated them 3 m down at 1.4 m proud, and from the conn pitch
 * that was a lit lug under the silhouette line, not a door on a flank.
 */
export function pressureHatches(root, { collar, door, rim, black }, opts) {
  const {
    segments,
    y = -3,
    r = 2.8,
    proud = 1.4,
    sink = 0.8,
    tube = 0.3,
    facets = 8,
    dogs = { r: 0.28, lengths: [2.4, 2], reach: 0.8, hook: 0.25 },
    hatches,
  } = opts;
  const up = new THREE.Vector3(0, 1, 0);
  const seat = ({ side, plate, dx = 0 }) => {
    const [cx, sx, sy, sz] = segments[plate];
    const sgn = side === 'p' ? -1 : 1;
    const u = dx / sx;
    const v = y / sy;
    const w = Math.sqrt(1 - u * u - v * v);
    const at = [cx + dx, y, sgn * sz * w];
    const n = new THREE.Vector3(u / sx, v / sy, (sgn * w) / sz).normalize();
    const e = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(up, n),
      'XYZ'
    );
    return { at, rot: [e.x, e.y, e.z] };
  };
  const seats = hatches.map(seat);
  refuseMirror(
    'hatch',
    hatches.map((h, i) => [`hatch_${h.side}${i}`, ...seats[i].at])
  );
  hatches.forEach(({ side }, i) => {
    const name = `hatch_${side}${i}`;
    const frame = group(root, name, seats[i]);
    add(frame, `${name}_collar`, cyl(r, r * 1.15, proud + sink, facets), collar, [
      0,
      (proud - sink) / 2,
      0,
    ]);
    add(frame, `${name}_door`, cyl(r * 0.9, r * 0.9, 0.4, facets), door, [0, proud + 0.2, 0]);
    add(frame, `${name}_rim`, torus(r, tube, 5, 14).rotateX(Math.PI / 2), rim, [0, proud, 0]);
    // A cone's apex is +Y; a roll of ±(π/2 + hook) about Z lays it across
    // the face toward the centre and dips the point onto the door.
    [1, -1].forEach((s, k) =>
      add(frame, `${name}_dog_${k}`, spike(dogs.r, dogs.lengths[k % dogs.lengths.length], 4), black, [
        s * dogs.reach * r,
        proud + 0.5,
        0,
      ], [0, 0, s * (Math.PI / 2 + dogs.hook)])
    );
  });
}

/**
 * A heavy keel: one spar under the belly, `radii` [fore, aft] over
 * `length` with `facets` sides, laid along the hull at `[x, y]` and
 * squashed `squash` across the beam — narrower than it is tall, as the
 * Submersible's is (0.75, `drums`). A keel is a side-elevation feature and
 * shows on no map; it is here because the block names it and the conn view
 * sees it under the plates' rise at either end.
 *
 * `ribs` hoops it: `{ count, mat, tube, proud, inset }` puts `count`
 * `keel_rib_i` rings round the spar, evenly from `inset` inside one end to
 * `inset` inside the other, each `proud` of the keel's radius at its own
 * station and `tube` thick, in `mat` (the keel's own unless given). The
 * Thurible's "ribbed pressure keel" (#785); the Verger passes none and is
 * unchanged.
 */
export function keel(root, mat, opts) {
  const { x, y, z = 0, radii, length, facets = 7, squash = 0.8, ribs } = opts;
  add(root, 'keel', cyl(radii[0], radii[1], length, facets), mat, [x, y, z], [0, 0, -Math.PI / 2], [
    1,
    1,
    squash,
  ]);
  if (!ribs) return;
  const { count, mat: ribMat = mat, tube = 0.35, proud = 0.25, inset = 0.5 } = ribs;
  // `count` hoops from `inset` of the length inside each end, each a ring
  // round the spar at the keel's own radius there plus `proud`, squashed as
  // the spar is. The cone's +X is its `radii[0]` end (the -π/2 roll above).
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const rx = x + (length / 2 - inset) * (1 - 2 * t);
    const r = radii[0] + (radii[1] - radii[0]) * (rx - (x + length / 2)) / -length;
    add(root, `keel_rib_${i}`, torus(r + proud, tube, 5, 14).rotateY(Math.PI / 2), ribMat, [rx, y, z], [
      0,
      0,
      0,
    ], [1, 1, squash]);
  }
}

/**
 * A single ducted drive astern: `drive_duct`, a hollow faceted ring of
 * `r` outside and `r - wall` inside running `length` forward from `stern`
 * — one closed profile through the kit's `loft`, so the inner wall and
 * both caps face the right way without a second material — with
 * `drive_hub` inside it, a cone base-aft and point-forward on the telson's
 * rule (`telson` above: the stern is a blunt face, and the apex is buried
 * forward), and `vanes.count` `drive_vane_i` bars from hub to duct at
 * `vanes.phase` plus equal turns — three, so no vane answers another
 * across the keel.
 */
export function ductedDrive(root, { duct: ductMat, hub: hubMat, vane: vaneMat }, opts) {
  const { stern, length, r, wall = 0.6, facets = 10, hub, vanes = {} } = opts;
  const { count = 3, phase = 0.5, chord = 2.5, t = 0.4, x: vx = stern + length / 2 } = vanes;
  const inner = r - wall;
  add(
    root,
    'drive_duct',
    loft(
      [
        [stern, inner],
        [stern, r],
        [stern + length, r],
        [stern + length, inner],
        [stern, inner],
      ],
      facets
    ),
    ductMat
  );
  add(root, 'drive_hub', cyl(0, hub.r, hub.length, hub.facets ?? 8), hubMat, [
    hub.tip + hub.length / 2,
    0,
    0,
  ], [0, 0, -Math.PI / 2]);
  // The hub's radius where the vanes cross it, at `vx` along a cone that
  // tapers from `hub.r` at its base to a point `hub.length` forward.
  const hubAt = (hub.r * (hub.tip + hub.length - vx)) / hub.length;
  const span = inner - hubAt + 0.4;
  const rc = (hubAt + inner) / 2;
  for (let i = 0; i < count; i++) {
    const a = phase + (i * 2 * Math.PI) / count;
    add(root, `drive_vane_${i}`, box(chord, span, t), vaneMat, [vx, rc * Math.cos(a), rc * Math.sin(a)], [
      a,
      0,
      0,
    ]);
  }
}

/* --------------------------------------------------------------------------
 * The Acolyte (#784, off #540 Phase 4): the scout that sits still, the
 * second Directorate hull built here rather than ported. What it adds is
 * what a hull that *stands* needs and no hull before it had — where the
 * carapace's flank is, so a limb can be rooted on the shell, and a limb
 * walked out and planted rather than folded under it.
 * ------------------------------------------------------------------------ */

/**
 * The carapace's half-beam at `(x, y)` in elevation: the widest of the
 * tergite orbs and their seam orbs there, or 0 where nothing is — the
 * flank, as `tergiteCrown` is the crown. The seams are taken as
 * `tergites` draws them for the same reason: a seam is 0.9 of its plate's
 * beam at a station where the plate itself has drawn in to half, so around
 * a plate's forward end the seam is the flank. A hull that seats its limbs
 * by this roots them in the shell rather than beside it.
 */
export function tergiteFlank(segments, x, y, seam = {}) {
  const {
    at: seamAt = 0.85,
    size: seamSize = [0.3, 0.95, 0.9],
    tallOf = 'height',
    lift = 0,
  } = seam ?? {};
  const side = (cx, sx, sy, sz, cy = 0) => {
    const u = (x - cx) / sx;
    const v = (y - cy) / sy;
    const d = 1 - u * u - v * v;
    return d > 0 ? sz * Math.sqrt(d) : 0;
  };
  let z = 0;
  segments.forEach(([cx, sx, sy, sz]) => {
    z = Math.max(z, side(cx, sx, sy, sz));
    if (seam)
      z = Math.max(
        z,
        side(
          cx + seamAt * sx,
          seamSize[0] * sx,
          seamSize[1] * (tallOf === 'beam' ? sz : sy),
          seamSize[2] * sz,
          lift
        )
      );
  });
  return z;
}

/**
 * A bone: a steel frustum `[root, tip]` in radius laid from `a` to `b`,
 * the rotation the minimal one taking +Y onto that line, as `aimedSpikes`
 * lays the Cruiser's antennae. The node sits at the midpoint and the
 * length is the distance, so a script holds joints and never a length.
 */
function bone(root, name, mat, [rootR, tipR], a, b, facets) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    d.clone().normalize()
  );
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  const mid = A.clone().add(B).multiplyScalar(0.5).toArray();
  return add(root, name, cyl(tipR, rootR, d.length(), facets), mat, mid, [e.x, e.y, e.z]);
}

/**
 * Hydrophone limbs walked out and planted: the Acolyte's array, built in
 * the stance it hears at 85 in (docs/models-plan.md §3.5). Each limb is
 * five parts, `limb_${side}${i}_hip`, `_femur`, `_knee`, `_tibia`, `_foot`:
 * a black hip orb of `hip.r` rooted on the flank `tergiteFlank` finds at
 * `hip.y`, its centre `hip.sink` inside the shell; a steel femur from the
 * hip `femur.reach` outboard and `femur.rise` up to a black knee orb of
 * `knee.r`; a steel tibia from the knee `tibia.reach` further out and
 * `tibia.drop` down to the ankle; and from the ankle a red six-sided
 * spike, `foot.r` by `foot.length`, planted point-down — a hydrophone on
 * the Precentor's rule (`arrayBoom`), which is what the limb is. Bones
 * are `[root, tip]` in radius, and every limb is drawn from the one set
 * of numbers: regimented.
 *
 * `segments` and `seam` are the shell as `tergites` drew it, which is
 * where the hips are seated. `limbs` is `[{ side, x, rake }]` — each
 * limb's own station along the hull and its rake in plan, radians ahead
 * of athwartships, astern when negative. The reach is read *along the raked line*, so a raked limb
 * stands a little nearer the keel than a square one and reaches further
 * along the hull, as a crab's fore and hind legs do. The hips are seated
 * on the shell rather than typed: a station whose flank the plates do not
 * reach is refused, because a limb rooted in water is a limb the conn view
 * shows floating.
 *
 * A mirrored pair of hips is refused. `limbs` above lets its folded ranks
 * match, because they carry no light; these carry the hull's whole light
 * budget at their knees, and a knee that answers another across the keel
 * is a photophore that does. A stance is a stride, and a stride has a
 * phase — the Acolyte's is a hexapod's tripod, fore and hind a side
 * planted together and the middle one a half-stride the other way.
 * Returns the joints, `[{ side, i, hip, knee, ankle }]`, numbered a side
 * in the order given, so the hull can seat its light on them.
 */
export function plantedLimbs(root, { steel, black, red }, opts) {
  const {
    segments,
    seam,
    hip = { y: -0.8, sink: 0.5, r: 1.1 },
    femur = { r: [1.1, 0.9], reach: 5, rise: 3.2 },
    knee = { r: 1.3 },
    tibia = { r: [0.9, 0.7], reach: 4, drop: 6 },
    foot = { r: 0.8, length: 2.4 },
    facets = 6,
    limbs: list,
  } = opts;
  const count = { p: 0, s: 0 };
  const joints = list.map(({ side, x, rake = 0 }) => {
    if (side !== 'p' && side !== 's')
      throw new Error(`limb_${side}: side is '${side}' — 'p' (port, -z) or 's' (starboard, +z)`);
    const i = count[side]++;
    const sgn = side === 'p' ? -1 : 1;
    const flank = tergiteFlank(segments, x, hip.y, seam);
    if (flank <= hip.sink)
      throw new Error(`limb_${side}${i}: no shell to root on at x = ${x}, y = ${hip.y}`);
    const out = [Math.sin(rake), 0, sgn * Math.cos(rake)];
    const from = ([px, py, pz], reach, lift) => [
      px + out[0] * reach,
      py + lift,
      pz + out[2] * reach,
    ];
    const at = [x, hip.y, sgn * (flank - hip.sink)];
    const kneeAt = from(at, femur.reach, femur.rise);
    const ankle = from(kneeAt, tibia.reach, -tibia.drop);
    return { side, i, hip: at, knee: kneeAt, ankle };
  });
  refuseMirror(
    'limb',
    joints.map(({ side, i, hip: at }) => [`limb_${side}${i}`, ...at])
  );
  joints.forEach(({ side, i, hip: at, knee: kneeAt, ankle }) => {
    const name = `limb_${side}${i}`;
    add(root, `${name}_hip`, orb(8, 5), black, at, [0, 0, 0], [hip.r, hip.r, hip.r]);
    bone(root, `${name}_femur`, steel, femur.r, at, kneeAt, facets);
    add(root, `${name}_knee`, orb(8, 5), black, kneeAt, [0, 0, 0], [knee.r, knee.r, knee.r]);
    bone(root, `${name}_tibia`, steel, tibia.r, kneeAt, ankle, facets);
    // A cone's apex is +Y; a half turn about X plants it point-down, its
    // base ring on the ankle.
    add(
      root,
      `${name}_foot`,
      spike(foot.r, foot.length, facets),
      red,
      [ankle[0], ankle[1] - foot.length / 2, ankle[2]],
      [Math.PI, 0, 0]
    );
  });
  return joints;
}

/* --------------------------------------------------------------------------
 * The Thurible (#785, off #540 Phase 4): the censer, the third Directorate
 * hull built here. What it adds is what a hull that carries its ordnance on
 * its *back* needs and no hull before it had — a rack of open wells let
 * into the shell — and two ways of dressing a carapace's *rim* rather than
 * its crown: spines off the edge, and photophore rows along it. All three
 * seat their parts by functions the hull supplies, `crown(x, z)` and
 * `rim(x, y)`, because the Thurible's shell is three series drawn with
 * three lips and no one `tergiteCrown` call knows all of them.
 * ------------------------------------------------------------------------ */

/**
 * Spines off a carapace's rim, `rim_spine_${side}${i}` each: a black
 * five-sided spike whose base ring is `sink` inside the shell's flank at
 * `(x, y)` — `rim(x, y)` gives the half-beam there — canted outboard by
 * `cant` and raked forward by `rake`, one cant and one rake for the rank
 * because the rule is regular and only the stations vary. A dorsal spine
 * stands off the crown and reads from above as a dot; a rim spine lies out
 * past the edge and reads as a spike in plan, which is the navy's tell on
 * a hull whose back is a rack. `spines` is `[{ side, x, y, length }]`,
 * each at its own signed side — port −z (#642) — and a mirrored pair is
 * refused: "spines off the shield's rim at different stations each side"
 * (docs/asset-prompts-3d.md, the Thurible block).
 */
export function rimSpines(root, black, opts) {
  const { rim, spines, r = 0.9, rake = -0.25, cant = 1.0, sink = 0.8, facets = 5 } = opts;
  const count = { p: 0, s: 0 };
  const placed = spines.map(({ side, x, y = 1, length }) => {
    if (side !== 'p' && side !== 's')
      throw new Error(`rim_spine_${side}: side is '${side}' — 'p' (port, -z) or 's' (starboard, +z)`);
    const i = count[side]++;
    const sgn = side === 'p' ? -1 : 1;
    const half = rim(x, y);
    if (half <= sink) throw new Error(`rim_spine_${side}${i}: no shell to root in at x = ${x}`);
    // Euler XYZ is Rx · Ry · Rz: the rake about Z first, then the cant about
    // X, so the apex of a +Y cone lands on (−sin rake, cos rake · cos cant,
    // ±cos rake · sin cant) — forward, up, and out past the rim.
    const dir = [-Math.sin(rake), Math.cos(rake) * Math.cos(cant), sgn * Math.cos(rake) * Math.sin(cant)];
    const reach = length / 2 - sink;
    const at = [x + dir[0] * reach, y + dir[1] * reach, sgn * half + dir[2] * reach];
    return { name: `rim_spine_${side}${i}`, at, rot: [sgn * cant, 0, rake], length };
  });
  refuseMirror('rim_spine', placed.map(({ name, at }) => [name, ...at]));
  placed.forEach(({ name, at, rot, length }) =>
    add(root, name, spike(r, length, facets), black, at, rot)
  );
}

/**
 * Photophore rows along a carapace's rim, `${name}_${side}${j}` each: a
 * rank a side, `ranks.s` and `ranks.p` as `{ from, pitch, count }` — its
 * first mark at station `from` and the rest `pitch` metres aft of it, one
 * after another — every mark seated on the shell where it is, `at` of the
 * rim's half-beam there (`rim(x, 0)`) and on the crown `crown(x, z)` finds
 * at that point, laid on the shell's own slope with its underside `sink`
 * into it. The two ranks carry their own `from`, `pitch` and `count`, and
 * the module's rule refuses the one pair the two rules could still
 * produce: regimented, and never symmetric.
 *
 * Beside `plateEdgePhotophores`, which is the Dredge's rule: that rank is
 * a fraction of each *plate*, at a fixed fraction of the plate's height,
 * and is right on a series of near-equal plates that overlap by a third.
 * On the Thurible's shield the two plates overlap by two thirds and a rank
 * on each collides with the other's, and a fixed `y` on a dome 27 m across
 * is under the shell at one station and a metre above it at the next —
 * so the rank here is along the hull rather than per plate, and the shell
 * is asked where it is (#785).
 *
 * The crown asked is the ideal ellipsoid, and the plate is a low-facet
 * orb inside it: between meridians the shell falls short of the crown by
 * up to half a metre on a plate 50 m across, so a mark seated on the
 * crown by this rule stood off its facet by whatever the chord sagged
 * there — the Thurible's by 0.26 to 0.56 m, the Succentor's by 0.21 to
 * 0.47, the Lure's by 0.31 to 0.45 (#894's resting measure; #907). `rest`
 * names the shell parts the rank lies on, and with it every mark in the
 * rank is dropped from its crown station onto the facet under it, its
 * underside `sink` into that facet as the rule always meant (`photophores`
 * `rest`, kit.mjs `seat`): the same stations, the same beams, the facet's
 * slope in place of the crown's. Without `rest` the rank lies on the
 * crown, as the Treble's and the Lure's dark edge rows still do.
 */
export function rimPhotophores(root, crimson, opts) {
  const { rim, crown, ranks, name = 'photophore', at = 0.84, size = 1.2, h = 0.4, sink = 0.15 } = opts;
  const { rest } = opts;
  const up = new THREE.Vector3(0, 1, 0);
  const step = 0.3;
  const spots = [];
  for (const side of ['s', 'p']) {
    const rank = ranks[side];
    if (!rank) continue;
    const sgn = side === 'p' ? -1 : 1;
    for (let j = 0; j < rank.count; j++) {
      const x = rank.from - rank.pitch * j;
      const half = rim(x, 0);
      if (half <= 0) throw new Error(`${name}_${side}${j}: no shell at x = ${x}`);
      const z = sgn * at * half;
      const y = crown(x, z);
      if (!Number.isFinite(y)) throw new Error(`${name}_${side}${j}: no crown at x = ${x}, z = ${z}`);
      // The shell's normal there, off the crown's own slope, and the mark
      // laid on the tangent plane with its underside `sink` into it: a
      // flat box seated at its centre's height on a 30° slope buries its
      // uphill corner half a metre and bakes as a triangle.
      const gx = (crown(x + step, z) - crown(x - step, z)) / (2 * step);
      const gz = (crown(x, z + step) - crown(x, z - step)) / (2 * step);
      const n = new THREE.Vector3(-gx, 1, -gz).normalize();
      const e = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromUnitVectors(up, n),
        'XYZ'
      );
      const lift = h / 2 - sink;
      spots.push([
        `${name}_${side}${j}`,
        x + n.x * lift,
        y + n.y * lift,
        z + n.z * lift,
        [e.x, e.y, e.z],
      ]);
    }
  }
  photophores(root, crimson, { spots, size, h, rest, sink });
}

/**
 * The charge rack: open-topped cells let into the shell's back, in ranks,
 * `cell_${side}${i}` each and four parts to a cell. A `_collar`, a steel
 * ring `r` outside and `r - wall` inside standing `proud` of the crown at
 * the cell's centre and running `sink` into it — one closed profile
 * through the kit's `loft`, stood on end, as `ductedDrive`'s duct is, so
 * the well has an inside; a `_well`, the floor, a black drum across the
 * bore `depth` under the collar's top, which is the dark the chart sees
 * down the bore — and `proud - depth` is the metre it stands *above* the
 * crown at the cell's centre, because the shell is a dome and not a deck:
 * a floor let into the plate is a floor the plate's own surface covers on
 * the uphill side of the bore, and the first run drew seven rings with
 * chitin showing through every one; a `_lid`, a steel disc of the collar's radius hinged at
 * the collar's aft edge and standing `lid.open` radians up from shut —
 * open forward and upward, because up is the way the rack fires; and a
 * `_hinge`, a black pin along the hinge line. `cells` is `[{ side, x, z }]`,
 * `z` unsigned and the side signing it (port −z, #642), each seated on
 * `crown(x, z)`; a mirrored pair across the keel is refused.
 *
 * A rack and not a tube: nothing here has a muzzle and no face of it
 * points along the hull. The cells carry no lamp (docs/models-plan.md
 * §3.2, rule 4) — the light of a charge is the charge's, above the hull —
 * so the well's floor is trench black and the lids and collars the
 * spine-gun's steel: ordnance is machinery let into a grown shell, as the
 * Chorister's gun is bolted to its plate.
 */
export function chargeRack(root, { steel, black }, opts) {
  const {
    crown,
    cells,
    r = 2.8,
    wall = 0.55,
    proud = 2.2,
    sink = 1.2,
    depth = 1.2,
    floor = 0.3,
    lid = { t: 0.25, open: 1.35 },
    hinge = { r: 0.22, length: 0.85 },
    facets = 10,
  } = opts;
  const count = { p: 0, s: 0 };
  const placed = cells.map(({ side, x, z }) => {
    if (side !== 'p' && side !== 's')
      throw new Error(`cell_${side}: side is '${side}' — 'p' (port, -z) or 's' (starboard, +z)`);
    const i = count[side]++;
    const sgn = side === 'p' ? -1 : 1;
    const y = crown(x, sgn * z);
    if (!Number.isFinite(y)) throw new Error(`cell_${side}${i}: no shell at x = ${x}, z = ${sgn * z}`);
    return { name: `cell_${side}${i}`, at: [x, y, sgn * z] };
  });
  refuseMirror('cell', placed.map(({ name, at }) => [name, ...at]));
  const inner = r - wall;
  placed.forEach(({ name, at: [x, y, z] }) => {
    const top = y + proud;
    add(
      root,
      `${name}_collar`,
      loft(
        [
          [0, inner],
          [0, r],
          [proud + sink, r],
          [proud + sink, inner],
          [0, inner],
        ],
        facets
      ),
      steel,
      [x, y - sink, z],
      [0, 0, Math.PI / 2]
    );
    add(root, `${name}_well`, cyl(inner, inner, floor, facets), black, [x, top - depth - floor / 2, z]);
    // The lid turns about the hinge at the collar's aft edge: a roll of
    // `open` about Z lifts a flat disc's forward edge, and its centre swings
    // with it round the pin.
    const { t, open } = lid;
    add(root, `${name}_lid`, cyl(r, r, t, facets), steel, [
      x - r + r * Math.cos(open),
      top + t / 2 + r * Math.sin(open),
      z,
    ], [0, 0, open]);
    add(root, `${name}_hinge`, cyl(hinge.r, hinge.r, 2 * r * hinge.length, 6), black, [x - r, top, z], [
      Math.PI / 2,
      0,
      0,
    ]);
  });
}

/* --------------------------------------------------------------------------
 * The Lure (#786, off #540 Phase 4): the song, the fourth Directorate hull
 * built here. What it adds is what a hull that is an instrument needs and
 * no hull before it had — a tail that is a fan of broad plates rather than
 * a spike, a file down the back, and one limb raised *over* the shell
 * rather than folded under it or planted beside it. All three seat their
 * parts by the functions the hull supplies, `crown(x, z)` and `rim(x, y)`,
 * as the Thurible's do.
 * ------------------------------------------------------------------------ */

/**
 * A sounding plate's outline in its own frame: the root at the origin, the
 * blade running aft along −x, `root` and `tip` its half-widths at the root
 * and at the squared end, the widening done by `shoulder` of the length,
 * and the end's two corners cut back `chamfer` — a broad paddle with a
 * squared end rather than a spine, which is the outline note's own phrase
 * for it (silhouettes.ts, the Lure). Symmetric about its own axis, so a
 * port plate is the starboard one at the opposite yaw.
 */
const paddle = ({ length, root, tip, shoulder = 0.7, chamfer }) => [
  [0, root],
  [-shoulder * length, tip],
  [-length + chamfer, tip],
  [-length, tip - chamfer],
  [-length, chamfer - tip],
  [-length + chamfer, -tip],
  [-shoulder * length, -tip],
  [0, -root],
];

/**
 * The sounding fan: five chitin plates opened wide astern, two a side about
 * a telson — a tail fan of the kind a lobster carries, the telson in the
 * middle and two broad uropods a side, which is the count the block gives
 * and the shape the outline note draws. Each plate is a frame of its own
 * (`telson`, `fan_${side}${i}`, i = 0 the inner pair and 1 the outer)
 * placed at the fan's root `at` — `dx` along the hull and `y` up from it,
 * and the pairs `dz` off the keel at their own signed z, port negative
 * (#642), yawed `spread` radians out from the keel on their own side —
 * holding a `_plate`, the kit's `plan` of `paddle` above `t` thick with a
 * `bevel` chamfer all round, because chitin has an edge and not a sheet's
 * corner; and a `_rib`, a bar of `rib.w` by `rib.h` down the plate's own
 * centreline from `rib.from` to `rib.to` of its length, sunk `rib.sink`
 * into the top face, in `ribMat`. The plates alternate through `skins`
 * from the telson outward.
 *
 * The ribs are the fan's light and the fan lights only singing — "each
 * plate of the fan lit along its rib" is the block's third band — so a
 * hull passes the lamp family's unlit finish (`ink.biolightUnlit`) and
 * never a lamp (docs/models-plan.md §3.2, rule 2). The telson is a plate
 * here and not `telson`'s cone: the block says the plates fold "into a
 * telson" under way, and a telson that is the middle plate of the fan is
 * what they fold into. Nothing on the fan points and nothing on it fires.
 *
 * The pairs are matched: "two a side about a telson" is the block's own
 * count, and an instrument is tuned symmetric. They are one of the Lure's
 * two licensed pairs — `limbs`' folded ranks are the other — and neither
 * carries light. Composed as docs/models-plan.md §3.6 asks all the same:
 * each plate placed on its own side at its own signed z and its own yaw,
 * never through `bothSides`, so the match is a result and not a mirror.
 */
export function soundingFan(root, { skins, rib: ribMat }, opts) {
  const {
    at: [ax, ay] = [0, 0],
    t = 0.7,
    bevel = 0.35,
    rib = { w: 0.7, h: 0.4, from: 0.08, to: 0.92, sink: 0.1 },
    telson: tl,
    pairs,
  } = opts;
  const blade = (frame, name, shape, skin) => {
    add(frame, `${name}_plate`, plan(paddle(shape), t, bevel), skin);
    const ribLength = (rib.to - rib.from) * shape.length;
    add(frame, `${name}_rib`, box(ribLength, rib.h, rib.w), ribMat, [
      -(rib.from * shape.length + ribLength / 2),
      t / 2 + bevel + rib.h / 2 - rib.sink,
      0,
    ]);
  };
  const frame = group(root, 'telson', { at: [ax + (tl.dx ?? 0), ay + (tl.y ?? 0), 0] });
  blade(frame, 'telson', tl, skins[0]);
  pairs.forEach((p, i) => {
    // A yaw of +a about Y carries the plate's own −x onto (−cos a, +sin a):
    // aft and to starboard; the port plate takes −a.
    for (const side of ['s', 'p']) {
      const sgn = side === 'p' ? -1 : 1;
      const name = `fan_${side}${i}`;
      const f = group(root, name, {
        at: [ax + (p.dx ?? 0), ay + (p.y ?? 0), sgn * p.dz],
        rot: [0, sgn * p.spread, 0],
      });
      blade(f, name, p, skins[(i + 1) % skins.length]);
    }
  });
}

/**
 * The file ridge: one black fin down the abdomen's back at `z`, from
 * station `from` aft to `to`, `t` thick across the beam — a stridulating
 * file, a row of `teeth` along a crest. The crest is a straight line from
 * `top[0]` at `from` to `top[1]` at `to`, each tooth `tooth` tall above it
 * with its point `rake` of the pitch back from the tooth's forward foot,
 * so the teeth lean the way the navy's spines do; the fin's underside
 * follows the shell, `crown(x, z)` sampled twice a tooth and sunk `sink`
 * into it, so the ridge is rooted in every plate and every lip it crosses
 * and rides over the joints rather than following them. A crest line that
 * comes within `base` of the shell anywhere along the run is refused: a
 * file whose teeth are buried is a seam.
 *
 * One `ExtrudeGeometry` in the hull's own x–y plane, extruded across the
 * beam and centred on `z` — the kit's `plate` and `plan` lay an outline
 * flat, and a ridge stands on edge.
 */
export function fileRidge(root, black, opts) {
  const {
    crown,
    z,
    from,
    to,
    teeth,
    top: [yFrom, yTo],
    tooth = 0.8,
    rake = 0.3,
    sink = 0.8,
    base = 0.3,
    t = 0.7,
    name = 'file_ridge',
  } = opts;
  const pitch = (from - to) / teeth;
  const line = (x) => yFrom + ((yTo - yFrom) * (from - x)) / (from - to);
  const shape = new THREE.Shape();
  shape.moveTo(from, line(from));
  for (let i = 0; i < teeth; i++) {
    const foot = from - i * pitch;
    const crest = foot - rake * pitch;
    shape.lineTo(crest, line(crest) + tooth);
    shape.lineTo(foot - pitch, line(foot - pitch));
  }
  const n = teeth * 2;
  for (let k = 0; k <= n; k++) {
    const x = to + ((from - to) * k) / n;
    const y = crown(x, z);
    if (!Number.isFinite(y)) throw new Error(`${name}: no shell at x = ${x}, z = ${z}`);
    if (line(x) - y < base)
      throw new Error(
        `${name}: the crest at x = ${x} stands ${(line(x) - y).toFixed(2)} m over the shell` +
          ` — under the ${base} it needs`
      );
    shape.lineTo(x, y - sink);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -t / 2);
  add(root, name, geo, black, [0, 0, z]);
}

/**
 * The plectrum limb: one limb raised over the back, `${name}_hip`,
 * `_femur`, `_knee`, `_tibia`, `_wrist` and the pick itself, `${name}`.
 * The joints are given — `hip` on the flank, `knee` above the shell,
 * `wrist` over the file, the pick's `tip` just clear of its teeth — and
 * the bones are drawn between them on `plantedLimbs`' rule (`bone`): a
 * steel frustum `femur` and `tibia` in `[root, tip]` radius, a black orb
 * at each joint of `joints`' radii. The pick is a black four-sided cone
 * from the wrist to the tip, its base square `pick.r` in radius and
 * pressed to `pick.flat` of that across the beam, so its broad face lies
 * in the plane of the stroke — along the hull — and its edge across the
 * file's teeth. Its frame is built rather than taken from the minimal
 * rotation: +Y onto the aim, the beam axis kept as near the hull's beam
 * as the aim allows, and the third axis their cross — a cone aimed by the
 * minimal rotation lands its flat at whatever angle the rotation's axis
 * leaves it.
 *
 * The one limb on the hull that stands up, and a limb and not a spine:
 * it is jointed and it holds a tool. The block's "raised" is the state it
 * is built in (docs/models-plan.md §3.5); under way it lies flat.
 */
export function plectrumLimb(root, { steel, black }, opts) {
  const {
    hip,
    knee,
    wrist,
    tip,
    joints = { hip: 1.3, knee: 1.15, wrist: 0.85 },
    femur = [1.0, 0.85],
    tibia = [0.85, 0.65],
    pick = { r: 1.2, flat: 0.3 },
    facets = 6,
    name = 'plectrum',
  } = opts;
  const joint = (n, at, r) => add(root, `${name}_${n}`, orb(8, 5), black, at, [0, 0, 0], [r, r, r]);
  joint('hip', hip, joints.hip);
  bone(root, `${name}_femur`, steel, femur, hip, knee, facets);
  joint('knee', knee, joints.knee);
  bone(root, `${name}_tibia`, steel, tibia, knee, wrist, facets);
  joint('wrist', wrist, joints.wrist);
  const W = new THREE.Vector3(...wrist);
  const T = new THREE.Vector3(...tip);
  const aim = T.clone().sub(W);
  const yAxis = aim.clone().normalize();
  const beam = new THREE.Vector3(0, 0, 1);
  const zAxis = beam.sub(yAxis.clone().multiplyScalar(beam.dot(yAxis))).normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
  const e = new THREE.Euler().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis),
    'XYZ'
  );
  const mid = W.clone().add(T).multiplyScalar(0.5).toArray();
  add(root, name, cyl(0, pick.r, aim.length(), 4, Math.PI / 4), black, mid, [e.x, e.y, e.z], [
    1,
    1,
    pick.flat,
  ]);
}

/* --------------------------------------------------------------------------
 * Structures. A settlement is the same architecture grown four ways, so the
 * base / mount / head / barrel family lives here beside the hull vocabulary
 * rather than in any one structure script (#553, off #540 Phase 3).
 *
 * The Directorate's structures are the carapace laid down: a mound plated in
 * scutes instead of tergites, a browed head, and a segmented stinger for a
 * gun. Asymmetric, yet regimented — the rule that places the scutes is
 * regular and the result never mirrors, so `photophores` refuses a mirrored
 * pair on this navy's turret exactly as it does on its hulls.
 * ------------------------------------------------------------------------ */

/**
 * The exchanger on the end of a Vent Tap's draw arm, on `bearing` (#608),
 * grown as a carapace: a squashed orb in `skin`, the dark seam orb where it
 * meets the pipe, three spines raked off its back, four photophores in
 * `crimson` lying on its upper face, and the claw that grips the ground
 * beyond. The script passes `skin` violet on the even arms and red on the
 * odd, as the tergites alternate along a hull. Distances are metres out
 * along the bearing, as the kit's `ventDrawArm` takes them.
 *
 * Two things are the approved file's and are carried across rather than
 * corrected (#540): the spines rake toward *global* +x on every arm, not out
 * along their own; and the spines and the photophores stagger either side of
 * their rank in global z, so no two arms carry the same pattern. The file's
 * third oddity is not: it set the photophores at y 8 and 9, inside the
 * shell, where the top-down bake never saw them. They are the last lamps
 * of the pipe run — "lamps along every pipe run", one reading for all
 * four navies (#890 review, ruling 5) — so each stud now sits on the
 * carapace's surface at its own station: `count` studs at `from` and
 * `pitch` along the arm, staggered `stagger` in global z as the file has
 * them, each seated on whichever of the two orbs — the carapace or the
 * seam — stands higher where its plan position meets them, and laid to
 * that surface's slope there, half its height proud along the normal. A
 * station neither orb covers — the first two arms' global-z stagger
 * carries one stud past the nose — is drawn back along the arm to `reach`
 * of the carapace's extent at that beam, and says nothing else; the same
 * stagger carries one stud onto the seam, and it sits there, on the run's
 * side of the shell. The seat is the *built* face, not the ideal orb: the
 * shells are low-facet (`scute(12, 6)` and `scute(8, 6)`), their faces lie
 * inside the ellipsoid by up to a third of a stud's height, and a stud
 * set on the ellipsoid floats (#890 round 3, F1). So each station is ray
 * cast straight down onto the two meshes as built, and the stud is laid
 * on the face the ray hits, its underside in that face's plane, tilted to
 * the face's own normal — taken from the face's three vertices in world
 * space, since a scaled orb's `face.normal` is in its own frame and the
 * scale is not uniform. The lift along the normal moves a centre a few
 * tenths of a metre in plan where the face slopes. The photophores are
 * `photophores` below, each with its own rotation, so the no-mirrored-pair
 * rule holds on the tap as it does on a hull.
 */
export function carapaceHead(root, { skin, black, steel, crimson }, opts) {
  const { bearing: a, at, carapace, seam, spines, photophores: rank, claw } = opts;
  const shells = [
    add(root, 'carapace', scute(12, 6), skin, polar(a, at, carapace.y), [0, -a, 0], carapace.r),
    add(root, 'carapace_seam', scute(8, 6), black, polar(a, seam.at, seam.y), [0, -a, 0], seam.r),
  ];
  spines.lengths.forEach((length, i) => {
    const [x, y, z] = polar(a, at + (spines.from + spines.pitch * i), spines.y);
    add(root, `spine_${i}`, spike(spines.r, length, 5), black, [x, y, z + spines.stagger[i]], [
      0,
      0,
      spines.rake,
    ]);
  });
  // `reach` 0.75 lands the drawn-back stud mid-facet on a 12 × 6 scute
  // (0.8 put it on a facet corner, and a corner of it hung 0.9 m over the
  // neighbouring face).
  const { count = 4, from, pitch, stagger, size, h, reach = 0.75 } = rank;
  const along = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const across = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
  const up = new THREE.Vector3(0, 1, 0);
  const yawQ = new THREE.Quaternion().setFromAxisAngle(up, -a);
  const origin = new THREE.Vector3(...polar(a, at, 0));
  // The built face under a station: the highest hit of a ray straight down
  // onto the two shells as they stand, and that face's normal from its own
  // three vertices. Nothing where neither shell is under the station.
  root.updateMatrixWorld(true);
  const caster = new THREE.Raycaster();
  const seatAt = (u, v) => {
    const s = origin.clone().addScaledVector(along, u).addScaledVector(across, v);
    caster.set(new THREE.Vector3(s.x, 1e3, s.z), new THREE.Vector3(0, -1, 0));
    const hit = caster.intersectObjects(shells, false)[0];
    if (!hit) return null;
    const pos = hit.object.geometry.attributes.position;
    const [p0, p1, p2] = [hit.face.a, hit.face.b, hit.face.c].map((k) =>
      new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(hit.object.matrixWorld)
    );
    const n = p1.sub(p0).cross(p2.sub(p0)).normalize();
    return { point: hit.point, n: n.y < 0 ? n.negate() : n };
  };
  const spots = [];
  for (let i = 0; i < count; i++) {
    // The station in the shell's frame: along the arm, and across it from
    // the file's global-z stagger.
    const d = new THREE.Vector3(...polar(a, at + from + pitch * i, 0))
      .sub(origin)
      .add(new THREE.Vector3(0, 0, i % 2 ? stagger : -stagger));
    const v = d.dot(across);
    let u = d.dot(along);
    let seat = seatAt(u, v);
    if (!seat) {
      const [A, , C] = carapace.r;
      const extent = reach * A * Math.sqrt(Math.max(0, 1 - (v / C) ** 2));
      u = Math.max(-extent, Math.min(extent, u));
      seat = seatAt(u, v);
    }
    const q = new THREE.Quaternion().setFromUnitVectors(up, seat.n).multiply(yawQ);
    const e = new THREE.Euler().setFromQuaternion(q);
    const p = seat.point.clone().addScaledVector(seat.n, h / 2);
    spots.push([`photophore_${i}`, p.x, p.y, p.z, [e.x, e.y, e.z]]);
  }
  photophores(root, crimson, { size, h, spots });
  // Laid along the arm as the draw pipe is, then raised `claw.raise` radians
  // toward vertical: the approved file's lean is π/2 − 0.8 to the bit.
  add(root, 'anchor_claw', spike(claw.r, claw.length, 5), steel, polar(a, claw.at, claw.y), [
    0,
    -a,
    claw.raise - Math.PI / 2,
  ]);
}

/** A carapace plate: a low-facet orb the caller squashes and lays on the mound. */
const scute = (w = 10, h = 6) => new THREE.SphereGeometry(1, w, h);

/**
 * A carapace shell: an orb of `r` and `facets` [round, down] that may stop
 * short of a full turn (`round`, the fraction of one it goes round) or short
 * of the bottom pole (`down`, the fraction of a half-turn it comes down from
 * the crown). The approved turret's mound is an orb cut off 0.42 of the way
 * down; its brow a shell open 0.55 of a turn and 0.48 deep. `scute` above is
 * the closed unit case.
 */
const shell = (r, [w, h], { round = 1, down = 1 } = {}) =>
  new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2 * round, 0, Math.PI * down);

/**
 * The mound: a chitinous dome, the collar the head turns in, and the skirt
 * where the dome meets the ground.
 *
 * As the approved turret draws it — `mound`, `collar` and `skirt`, each with
 * its own numbers and its `drawn` placement, built in the file's order
 * (mound, collar, skirt): the mound a `shell` of radius `r` cut `down` of the
 * way to the pole, the collar and the skirt toruses of `R` and `tube` with
 * `facets` [radial, tubular].
 */
export function carapaceMound(root, { violet, black, steel }, { mound, collar, skirt }) {
  part(root, 'base_mound', shell(mound.r, mound.facets, mound), violet, mound);
  part(root, 'base_collar', torus(collar.R, collar.tube, ...collar.facets), steel, collar);
  part(root, 'mound_skirt', torus(skirt.R, skirt.tube, ...skirt.facets), black, skirt);
}

/**
 * Scutes plated round the mound, alternating through `skins`. The rank is
 * regular in rule and never regular in result — the sizes are the plates'
 * own.
 *
 * As the approved turret draws them: an orb each of its own `r` and the
 * shared `facets`, squashed to a plate and laid on the flank by its own node
 * (`drawn`, with the plate's scale) — yawed near its bearing, pitched down the
 * slope and rolled a little, each its own way.
 */
export function baseScutes(root, skins, { scutes, facets = [7, 5] }) {
  scutes.forEach((s, i) =>
    part(root, `base_scute_${i}`, shell(s.r, facets), skins[i % skins.length], s)
  );
}

/**
 * The head: a pod that trains, the brow shelved over it, the antennae raked
 * off the brow, and the counter-spike that balances the stinger astern.
 *
 * As the approved turret draws it, the head is a frame of its own — the
 * file's `turret_head` node, trained 0.3 rad off the mound's axis — and every
 * part carries its numbers in that frame: `pod` an orb of `r` and `facets`,
 * `brow` a `shell` open `round` of a turn and `down` deep, `antennae` cones
 * `r` at the foot and `length` tall, each by its own node. The placement at
 * the top of `opts` is the frame's (kit.mjs `group`), and the frame is
 * returned so the stinger can be grown in it, as the file hangs
 * `barrel_group` off `turret_head`; the counter-spike is `counterSpike`
 * below, because the file grows it *after* the stinger and the order is part
 * of what the model is (check.mjs compares in order).
 */
export function browHead(root, { red, black, violet }, opts) {
  const head = group(root, 'turret_head', opts);
  const { pod, brow, antennae } = opts;
  part(head, 'head_pod', shell(pod.r, pod.facets), red, pod);
  part(head, 'head_brow', shell(brow.r, brow.facets, brow), black, brow);
  antennae.forEach((a, i) =>
    part(head, `brow_antenna_${i}`, spike(a.r, a.length, a.facets ?? 4), violet, a)
  );
  return head;
}

/**
 * The counter-spike on the head's frame, as the approved turret draws it: a
 * cone `r` at the foot and `length` tall with `facets` sides, laid by its own
 * node — pitched back 1.9 rad and yawed 0.5 in the file. Its own builder
 * rather than a line of `browHead`, because the file grows it after the
 * stinger.
 */
export function counterSpike(head, violet, opts) {
  part(head, 'counter_spike', spike(opts.r, opts.length, opts.facets ?? 5), violet, opts);
}

/**
 * The gun as a stinger: `segments` tapering along the run from `from` to
 * `to`, each barbed on its upper shoulder, closing on the tip and its one
 * lit pip.
 *
 * Segmented rather than lathed, for the reason the tergites are: a carapace
 * is plates, and the seams between them are the shape.
 *
 * As the approved turret draws it, the stinger is a frame off the head — the
 * file's `barrel_group`, placed by the top of `opts` — and `segments` is the
 * list of them: each a frustum of `radii` [tip end, root end], `length` and
 * `facets` at its own station up the frame's Y, alternating steel and violet
 * from the root, with its `barb` — a torus of `R`, `tube` and `facets` — at
 * its foot; then `tip`, a cone, and `pip`, an orb.
 */
export function stingerBarrel(root, { steel, violet, black, pip }, opts) {
  const g = group(root, 'barrel_group', opts);
  opts.segments.forEach(({ barb, ...s }, i) => {
    const skin = i % 2 ? violet : steel;
    part(g, `barrel_seg_${i}`, cyl(s.radii[0], s.radii[1], s.length, s.facets), skin, s);
    part(g, `barrel_barb_${i}`, torus(barb.R, barb.tube, ...barb.facets), black, barb);
  });
  const { tip, pip: pp } = opts;
  part(g, 'stinger_tip', spike(tip.r, tip.length, tip.facets), black, tip);
  part(g, 'muzzle_pip', new THREE.SphereGeometry(pp.r, ...pp.facets), pip, pp);
  return g;
}

/**
 * Claw grips on the seabed. The `index` is given rather than counted because
 * the approved turret's rank runs 0, 1, 2, 4, 5 — a gap where a claw was never
 * grown, and "asymmetric, yet regimented" is exactly what a rank with a hole
 * in it is.
 *
 * As the approved turret draws them: a cone each, `r` at the foot and
 * `length` tall with `facets` sides, laid by its own node so that its point
 * rises out and up from a base near the mound. Skins alternate by the claw's
 * *number*, so the gap leaves 4 red beside 5 black — the file's rule, which a
 * count along the list gets the other way round.
 *
 * `name` is the rank's stem where a file names it otherwise — the Bastion's
 * `anchor_claw_0..7` (2 and 6 never grown) and the Cantor's `skirt_claw_0..9`
 * (3 and 7) — and a grip given its own `skin` wears it in place of the rule:
 * both of those files skin their claws by no rule a count can recover (the
 * Bastion's run red, black, red, black, black, black along 0, 1, 3, 4, 5, 7).
 * The placement is `drawn` on a Z-long export and `laid` on an X-long one
 * (`place`, below the structures).
 */
export function clawGrips(root, skins, { grips, facets = 5, name = 'claw_grip' }) {
  grips.forEach((c) =>
    place(
      root,
      `${name}_${c.index}`,
      spike(c.r, c.length, facets),
      c.skin ?? skins[c.index % skins.length],
      c
    )
  );
}

/**
 * The magazine on one flank, its feed, and the flange into the collar.
 *
 * As the approved turret draws it, in the file's order — `pipe`, `pod`,
 * `flange`: the feed a straight frustum of `radii`, `length` and `facets`,
 * leaned by its node; the pod a capsule (kit.mjs `capsule`, `facets` [cap,
 * radial]); the flange a torus.
 */
export function magazine(root, { steel, red }, { pipe, pod, flange }) {
  part(root, 'feed_pipe', cyl(pipe.radii[0], pipe.radii[1], pipe.length, pipe.facets), steel, pipe);
  part(root, 'ammo_pod', capsule(pod.r, pod.length, ...pod.facets), steel, pod);
  part(root, 'feed_flange', torus(flange.R, flange.tube, ...flange.facets), red, flange);
}

/* --------------------------------------------------------------------------
 * The Slipway (#652): the Directorate's yard on the kit's skeleton (kit.mjs
 * `slipwayBed`, `slipwayGantry`, `slipwayHeadGate`). What is the
 * Directorate's is the hull on the blocks — a squashed carapace orb in
 * red — the posts, which lean: a steel cone of a leg with a black claw
 * hooked over the beam, a red cone of a pylon leaning in at the head; and
 * the hall, a run of seven tergites laid along the slip, violet and red by
 * turns, each with its dark seam, a spine raked off its back and, on every
 * other one, a photophore; a black lip along the slip's edge with six
 * photophores, six steel claws into the ground along the outer wall, and
 * a mandible at the mouth. Every number is the approved
 * slipway-directorate.glb's own and is the default.
 * ------------------------------------------------------------------------ */

/** A gantry leg: a six-facet steel cone 44 m tall, 32 m out, leaning 0.15 outward. */
export const slipwayLeg = (steel) =>
  sidedPost({
    name: 'gantry_leg',
    geo: () => cyl(2, 3.4, 44, 6),
    mat: steel,
    y: 22,
    spread: 32,
    lean: 0.15,
  });

/** The claw on a leg: a black five-facet spike hooked 1.1 outward over the beam's end. */
export const slipwayClaw = (black) =>
  sidedPost({
    name: 'gantry_claw',
    geo: () => spike(2.4, 10, 5),
    mat: black,
    y: 46,
    spread: 24,
    lean: 1.1,
  });

/** A head pylon: a red six-facet cone 54 m to its point, 34 m out, leaning 0.12 in. */
export const slipwayPylon = (red) =>
  sidedPost({
    name: 'head_pylon',
    geo: () => spike(6, 54, 6),
    mat: red,
    y: 27,
    spread: 34,
    lean: -0.12,
  });

/**
 * The hull in progress on the keel blocks: a carapace orb in red pressed
 * to 112 m long and 12 m tall, with a slim violet deck on it. The kit's
 * `slipwayBed` calls this between the last block and the sill.
 */
export function slipwayHull(root, { hull: red, deck: violet }, opts = {}) {
  const {
    body = { facets: [14, 7], at: [-50, 7, 0], r: [56, 6, 10] },
    deck = { size: [60, 1, 8], at: [-60, 12, 0] },
  } = opts;
  add(root, 'hull_in_progress', orb(...body.facets), red, body.at, [0, 0, 0], body.r);
  add(root, 'hull_in_progress_deck', box(...deck.size), violet, deck.at);
}

/**
 * One hall flanking the slip, on `sgn`'s side, built into `hall` (the
 * `hall_s` or `hall_p` frame the script makes): seven tergites 44 m apart,
 * violet on the even and red on the odd, each with its black seam orb
 * behind it, a spine raked toward +x and leaned `sgn` outward — 16 m and
 * 22 m by turns, stepping 5 m further out every plate and back — and, on
 * the even plates, one photophore on the inner shoulder; then the black
 * lip along the slip's edge with six photophores along it, six steel
 * anchor claws along the outer wall, and the steel mandible at the mouth,
 * laid along the slip and yawed `sgn` outward.
 *
 * The plate photophore is dropped onto its tergite from its station —
 * `dx` along the plate and `z` across, `y` the seed's height for the
 * record — its underside on the facet under it and tilted with it (kit.mjs
 * `seat`, `drop`, inside the hall's frame; #907). The file hung all eight,
 * four a hall, 0.47 m over the shoulder they mark by #894's resting
 * measure: the plate is a 14 × 7 orb and the station's crown was read off
 * the ideal one. Same name, size and skin, and the facet decides the rest.
 *
 * The claws are the approved file's own and are carried across rather
 * than mirrored (#540): each is a cone laid across by π/2 about X and
 * then turned `sgn · raise`, which on the +z hall hangs it point-down and
 * leaning out into the ground, and on the −z hall stands it point-up,
 * leaning toward the slip. A mirror would negate the whole angle; the
 * file adds to it. Everything else in the hall is the +z hall's mirror to
 * the digit.
 */
export function slipwayHall(hall, { violet, red, black, steel, crimson }, opts) {
  const {
    sgn,
    z = 54,
    tergites: plates = { count: 7, from: -132, pitch: 44, facets: [14, 7], y: 6, r: [28, 16, 30] },
    seams = { facets: [10, 6], dx: 24, y: 5, r: [7, 15, 29] },
    spines = { dx: 4, y: 26, out: 6, step: 5, r: 2.4, lengths: [16, 22], lean: 0.3, rake: -0.25 },
    photophores: dots = { dx: -8, y: 21.5, z: 45, size: [2.5, 0.6, 2.5] },
    lip = { size: [320, 3, 8], y: 1.5, z: 27 },
    lipLights = { count: 6, from: -125, pitch: 50, size: [3, 0.5, 3], y: 3.2 },
    claws = { count: 6, from: -125, pitch: 50, r: 2.6, length: 20, y: 0, z: 88, raise: 1.35 },
    mandible = { r: 5, length: 40, at: [-170, 4, 36], yaw: 0.2 },
  } = opts;
  for (let i = 0; i < plates.count; i++) {
    const x = plates.from + plates.pitch * i;
    add(
      hall,
      `tergite_${i}`,
      orb(...plates.facets),
      i % 2 ? red : violet,
      [x, plates.y, sgn * z],
      [0, 0, 0],
      plates.r
    );
    add(
      hall,
      `tergite_seam_${i}`,
      orb(...seams.facets),
      black,
      [x + seams.dx, seams.y, sgn * z],
      [0, 0, 0],
      seams.r
    );
    add(
      hall,
      `tergite_spine_${i}`,
      spike(spines.r, spines.lengths[i % spines.lengths.length]),
      black,
      [x + spines.dx, spines.y, sgn * (z + spines.out + spines.step * (i % 3))],
      [sgn * spines.lean, 0, spines.rake]
    );
    if (i % 2 === 0) {
      const station = [x + dots.dx, dots.y, sgn * dots.z];
      const lie = { stand: dots.size[1] / 2, drop: true };
      const { at, rot } = seat(hall, `tergite_${i}`, station, lie);
      add(hall, `photophore_${i}`, box(...dots.size), crimson, at, rot);
    }
  }
  add(hall, 'slip_lip', box(...lip.size), black, [0, lip.y, sgn * lip.z]);
  for (let i = 0; i < lipLights.count; i++)
    add(hall, `lip_photophore_${i}`, box(...lipLights.size), crimson, [
      lipLights.from + lipLights.pitch * i,
      lipLights.y,
      sgn * lip.z,
    ]);
  for (let i = 0; i < claws.count; i++)
    add(
      hall,
      `anchor_claw_${i}`,
      spike(claws.r, claws.length, 5),
      steel,
      [claws.from + claws.pitch * i, claws.y, sgn * claws.z],
      [Math.PI / 2 + sgn * claws.raise, 0, 0]
    );
  const [mx, my, mz] = mandible.at;
  add(
    hall,
    'launch_mandible',
    spike(mandible.r, mandible.length, 6),
    steel,
    [mx, my, sgn * mz],
    [0, -sgn * mandible.yaw, -Math.PI / 2]
  );
}

/* --------------------------------------------------------------------------
 * The Bastion and the Cantor (#652, the last of #540 Phase 3): the HQ and
 * the listening dome, two r184 exports of the settlement pass, read off
 * their node names as the turret's vocabulary was:
 *
 *   Bastion  carapace_tier_0..3 · seam_ring_0..3 · carapace_crown · apex_boss ·
 *            apex_light · reinforce_rib_0..5 (rib_plate_i_0..2, rib_spike_i) ·
 *            crown_spine_0..6 (4 never grown) · dock_main / dock_small
 *            (_throat, _lip, _mouth, _mandible_0..1) · hull_pipe_0..1 ·
 *            standpipe_0..2 / standpipe_flange_0..2 · ballast_tank_0..1 ·
 *            anchor_claw_0..7 (2 and 6 never grown) · photophore_0..15 ·
 *            dock_worklight
 *   Cantor   base_tier_low / base_tier_high · weld_collar · dome_shell ·
 *            shell_plate_0..2 · hydrophone_spine_0..41 · primary_quill
 *            (quill_seg_0..2, quill_tip_light) · apex_boss · photophore_0..18 ·
 *            photophore_base_0..2 · skirt_claw_0..9 (3 and 7 never grown) ·
 *            ballast_pipe_0..1 / pipe_flange_0..1
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed" and "listening dome
 * — a grown, chitinous hemispherical shell studded with hydrophone spines"
 * (docs/asset-prompts-3d.md, the Bastion and Cantor blocks), said the
 * Directorate's way: the dome is carapace tiers stepping in under a crown,
 * each tier yawed a little further than the one below it and welded to it
 * with a seam ring; the ribs are plates stood on the flank; the collars are
 * throats with mandibles; and every spine, claw and rib on both files leans
 * *out along its own bearing* — the rule `leaning` holds, checked against
 * all sixty-eight to the last bit of a double.
 *
 * One of the two is X-long. The Bastion was exported bow-on-X like the
 * Choristers and the Vent Taps, and its approved bake did not yaw it, so it
 * builds in the export's own frame with no yaw (kit.mjs `add`); the Cantor
 * is Z-long and builds through `drawn` like the turret. The builders below
 * take a *placement* either way and put it through `place`, which reads
 * which frame it is in off the placement itself — `laid` for the export's
 * own frame, `drawn` for the yawed one — so that `clawGrips` and
 * `photophoreDomes` serve both files without a second copy.
 * ------------------------------------------------------------------------ */

/**
 * A placement in an X-long export's own frame — the file's translation, XYZ
 * Euler and scale, no yaw — as `drawn` is one in a Z-long export's. The
 * Bastion is the first r184 structure exported bow-on-X, and the builders
 * that served the Z-long turret through `part` needed a way to serve it
 * without a second copy: `place` below reads the flag. Faction-neutral, and
 * a kit candidate (kit.mjs is frozen for #652).
 */
export const laid = (t = [0, 0, 0], e = [0, 0, 0], s = [1, 1, 1]) => ({
  at: t,
  rot: e,
  scale: s,
  laid: true,
});

/**
 * A part placed in whichever frame its placement names: `laid` through
 * the kit's `xLong`, the geometry as built; anything else through `zLong`,
 * the geometry turned once onto +X (the frames landed in the kit with the
 * Foundry builders in the same change; `laid` is the placement-side way of
 * naming one). Every builder below goes through this, and so do
 * `clawGrips`, `photophoreDomes` and `photophoreMarks` above, so the
 * Bastion can use them in its own frame.
 */
function place(root, name, geo, mat, p = {}) {
  return (p.laid ? xLong : zLong).place(root, name, geo, mat, p);
}

/**
 * The one rule every spine, claw and rib on both files follows: a cone at
 * `polar(bearing, rho, y)` leaning `tilt` radians out of vertical *along
 * that same bearing*, placed by the minimal rotation from +Y onto that
 * direction — three's `Quaternion.setFromUnitVectors`, as the Cruiser's
 * `aimedSpikes` found its thirteen. Every one of the Bastion's twelve
 * spikes and six claws and the Cantor's forty-two spines and eight claws
 * decomposes so, to 1e-16 in the rotation matrix and with the direction's
 * bearing equal to the position's — and two of the tilts turn out to be
 * numbers somebody typed: the crown spines lean `atan(0.8)`, the crown's
 * own y-squash, and the rib spikes `atan(1 / 1.35)`. Returns the export's
 * `[translation, XYZ Euler]` for `drawn` or `laid` to place.
 */
export function leaning(bearing, rho, y, tilt) {
  const dir = new THREE.Vector3(
    Math.sin(tilt) * Math.cos(bearing),
    Math.cos(tilt),
    Math.sin(tilt) * Math.sin(bearing)
  );
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [polar(bearing, rho, y), [e.x, e.y, e.z]];
}

/** A patch of a sphere: `r`, `facets` [round, down], and the window it fills, `phi` and `theta` each [start, length]. */
const patch = (r, [w, h], { phi, theta }) =>
  new THREE.SphereGeometry(r, w, h, phi[0], phi[1], theta[0], theta[1]);

/** An arc of a torus: kit `torus` with three's fifth argument, the angle it goes round. */
const torusArc = (R, tube, rs, ts, arc) => new THREE.TorusGeometry(R, tube, rs, ts, arc);

/**
 * Carapace tiers: the dome as the Directorate builds one — frusta stepping
 * in, each in its own `skin`, each yawed a little further than the one
 * below, and welded to the tier above by a `ring`, a flat torus on its top
 * edge. Every tier is `{ name, skin, radii: [top, bottom], length, facets,
 * ...placement }` and its ring, where it has one, `{ name, skin, R, tube,
 * facets: [radial, tubular], ...placement }`, drawn straight after it as
 * the files order them: the Bastion's four tiers each with a `seam_ring`,
 * the Cantor's two with the one `weld_collar` after the second.
 *
 * The numbers are the scripts' because the two files' rules differ: the
 * Bastion's tiers narrow to 0.86 of their foot, ring at 0.88 of it with a
 * 0.14 tube, and turn 0.22 rad a tier; the Cantor's narrow to 0.88 and
 * 0.874, its collar sits at 0.8815 of the upper foot, and its two yaws are
 * 0.16 and 0.42.
 */
export function carapaceTiers(root, { tiers }) {
  tiers.forEach(({ name, skin, radii, length, facets, ring, ...placement }) => {
    place(root, name, cyl(radii[0], radii[1], length, facets), skin, placement);
    if (ring) {
      const { name: rn, skin: rs, R, tube, facets: rf, ...rp } = ring;
      place(root, rn, torus(R, tube, ...rf), rs, rp);
    }
  });
}

/**
 * The dome shell: a half-orb of `r` and `facets` [round, down] on the tiers
 * — the Cantor's `dome_shell`, 5.4 by 16 × 9, and the Bastion's
 * `carapace_crown`, 3.25 by 10 × 5 squashed to 0.8 in height by its node —
 * and, on the Cantor, three `shell_plate`s: patches of a slightly larger
 * sphere (5.53, 5.531 and 5.532 — a millimetre apart each, so none fights
 * the one under it) at the same centre, each a window `phi` and `theta`
 * [start, length] wide, 16 × 3, in `chitin_violet_open` — the two-sided
 * violet the approved export drew them in (`ink` says why it stays).
 */
export function domeShell(root, { shell: shellMat, plate: plateMat }, opts) {
  const { name = 'dome_shell', r, facets, plates = [], ...placement } = opts;
  place(root, name, shell(r, facets, { down: 0.5 }), shellMat, placement);
  plates.forEach(({ r: pr, facets: pf, phi, theta, ...pp }, i) =>
    place(root, `shell_plate_${i}`, patch(pr, pf, { phi, theta }), plateMat, pp)
  );
}

/**
 * The apex boss: the cap at the crown of the dome, off-centre as a grown
 * thing is — a drum (`radii` [top, bottom], `length`, `facets`) on the
 * Bastion with `apex_light`, an orb of `r` and `facets` [round, down],
 * over it; a half-orb (`r`, `facets`) on the Cantor with no light, because
 * the Cantor's light is the quill's tip.
 */
export function apexBoss(root, { boss: bossMat, light: lightMat }, { boss, light }) {
  const { radii, r, length, facets, ...bp } = boss;
  place(
    root,
    'apex_boss',
    radii ? cyl(radii[0], radii[1], length, facets) : shell(r, facets, { down: 0.5 }),
    bossMat,
    bp
  );
  if (light) {
    const { r: lr, facets: lf, ...lp } = light;
    place(root, 'apex_light', new THREE.SphereGeometry(lr, ...lf), lightMat, lp);
  }
}

/** The Bastion's rib, as its file draws every one: three plates up the flank and a spike off the top. */
const RIB_PLATES = [
  { size: [0.35, 1.4, 0.5], rho: 6.2, y: 1.5, roll: 0.42, skin: 'black' },
  { size: [0.3, 1.2, 0.5], rho: 5.4, y: 3.5, roll: 0.36, skin: 'red' },
  { size: [0.26, 1, 0.5], rho: 4.3, y: 5.5, roll: 0.3, skin: 'black' },
];
const RIB_SPIKE = { r: 0.2, rho: 4.1, y: 6.6, tilt: Math.atan(1 / 1.35), facets: 5, skin: 'violet' };

/**
 * "Visible reinforcement ribs": `ribs.length` of them, each a frame of its
 * own (`reinforce_rib_i`, at the origin) holding three `rib_plate_i_j` —
 * boxes stood on the flank at `plates[j].rho` out and `y` up on the rib's
 * `bearing`, turned to face it (a yaw of π/2 − bearing lays the box's depth
 * radial) and rolled `roll` about that radial, black, red, black — and one
 * `rib_spike_i`, a violet cone off the top of the rib at `spike.rho` and
 * `y`, leaning out `spike.tilt` along the bearing (`leaning`), each spike its
 * own length. The defaults are the Bastion's own numbers; the six bearings
 * and six lengths are the script's.
 *
 * Three things are the file's and are carried across: the ribs cluster on
 * the back of the dome — bearings from 2.16 to 4.11 rad, a third of a turn
 * across the side away from the main dock — rather than round it; the
 * plates' roll is about their *radial* axis, so a plate tilts sideways
 * along the flank rather than leaning back against the tier's slope; and
 * the file wrote ribs 3 to 5 under a flipped Euler, (π, y, −(π − roll)),
 * which is the same rotation as (0, π − y, roll) and is written so here.
 * `frame` is `laid` on the Bastion; `drawn` would serve a Z-long file.
 */
export function reinforceRibs(root, mats, opts) {
  const { ribs, plates = RIB_PLATES, spike: sp = RIB_SPIKE, frame = drawn } = opts;
  ribs.forEach(({ bearing, spike: length }, i) => {
    const rib = group(root, `reinforce_rib_${i}`);
    plates.forEach((p, j) =>
      place(
        rib,
        `rib_plate_${i}_${j}`,
        box(...p.size),
        mats[p.skin],
        frame(polar(bearing, p.rho, p.y), [0, Math.PI / 2 - bearing, p.roll])
      )
    );
    place(
      rib,
      `rib_spike_${i}`,
      spike(sp.r, length, sp.facets),
      mats[sp.skin],
      frame(...leaning(bearing, sp.rho, sp.y, sp.tilt))
    );
  });
}

/**
 * Spines studded over a shell, each by its own placement — "studded with
 * hydrophone spines", the Cantor's forty-two `hydrophone_spine`s in four
 * rings down the dome (seven of 0.115, ten of 0.1, eleven of 0.09, fourteen
 * of 0.08), and the Bastion's `crown_spine`s at seven stations of 2π/7 from
 * a phase of 0.5 rad round the apex, the fifth never grown. Every spine is
 * `{ n, skin, r, length, ...placement }`: its own number, its own skin (the
 * Cantor's twenty-seven violet and fifteen black fall by no rule a count
 * recovers), its own length, and a `leaning` placement.
 */
export function shellSpines(root, { name, facets = 5, spines }) {
  spines.forEach(({ n, skin, r, length, ...placement }) =>
    place(root, `${name}_${n}`, spike(r, length, facets), skin, placement)
  );
}

/**
 * A docking collar, "docking collars" of the Bastion block: a frame of its
 * own placed by the top of `opts` (the file's `dock_main`, rolled a quarter
 * turn so the throat lies along the flank and yawed 0.26 off it, and
 * `dock_small` the same the other way), holding a `throat` — a frustum of
 * `r` at the mouth and 1.25 `r` at the root, 2.4 long, eight-sided, violet
 * — a `lip`, a steel torus of 1.05 `r` and a 0.2 tube, 5 × 10, at 1.25 up
 * the throat; a `mouth`, the lit disc of 0.72 `r`, 0.18 thick, resting on
 * the throat's end; and two `mandible`s, four-sided black cones 1.3 long
 * at ±1.15 `r` across the mouth, each rolled 0.35 in toward it. The ratios
 * are the file's, exact on both collars (1.4 and 0.9).
 *
 * Two things are the file's and stay: the lip's torus lies in the frame's
 * XY plane, which after the quarter-turn roll is a plane *containing* the
 * throat's axis — the ring stands across the mouth rather than round it;
 * and the mouth and the mandibles sit at the throat's +Y end, which the
 * roll puts at the tier's flank, so the collar's light faces the hull and
 * the throat stands out from it. `frame` is `laid` on the Bastion.
 *
 * One is not: the file wrote the mouth at 1.3, a hundredth past the
 * throat's end at 1.2 plus the disc's half-thickness, and on the Bastion's
 * scale that hundredth is 0.25 m of water between the disc and the
 * throat it is the light of (#894's resting measure; #907). The disc sits
 * on the end now, half its thickness proud — 1.29 on both collars, since
 * the throat's length and the disc's thickness are the same on both — and
 * the small collar's, which rested on a rib plate through the gap, moves
 * with it.
 */
export function dockingCollar(root, { violet, steel, crimson, black }, opts) {
  const { name, r, frame = drawn, ...placement } = opts;
  const dock = group(root, name, placement);
  const throat = 2.4;
  const disc = 0.18;
  place(dock, `${name}_throat`, cyl(r, 1.25 * r, throat, 8), violet, frame());
  place(dock, `${name}_lip`, torus(1.05 * r, 0.2, 5, 10), steel, frame([0, 1.25, 0]));
  place(
    dock,
    `${name}_mouth`,
    cyl(0.72 * r, 0.72 * r, disc, 8),
    crimson,
    frame([0, throat / 2 + disc / 2, 0])
  );
  [1, -1].forEach((sgn, i) =>
    place(
      dock,
      `${name}_mandible_${i}`,
      spike(0.16, 1.3, 4),
      black,
      frame([sgn * 1.15 * r, 1, 0], [0, 0, -sgn * 0.35])
    )
  );
}

/**
 * "External pipework": `hull_pipe_i`, each an arc of a torus — `R` round,
 * `tube` thick, `facets` [radial, tubular], `arc` radians of the way round
 * — born flat and stood up on the flank by its node. The Bastion's two run
 * round at 0.92 of the base tier's foot (R 5.888), 1.1 rad each, tubes of
 * 0.16 and 0.13, rolled up π/2 − 0.5 and π/2 − 0.85 and yawed 0.6 and
 * 1.05. `parts.mjs` offers the buffer as a torus of 16 × 5 among its
 * lathe-family guesses; the rows of seventeen at six tube angles say which.
 */
export function hullPipes(root, steel, { pipes }) {
  pipes.forEach(({ R, tube, facets, arc, ...placement }, i) =>
    place(root, `hull_pipe_${i}`, torusArc(R, tube, ...facets, arc), steel, placement)
  );
}

/**
 * Standpipes: a frustum each (`radii` [top, bottom], `length`, `facets`)
 * with a flat black flange — a torus of `R`, `tube` and `facets` [radial,
 * tubular] — part way up it, pipe then flange in the file's order:
 * `standpipe_i` / `standpipe_flange_i` on the Bastion, `ballast_pipe_i` /
 * `pipe_flange_i` on the Cantor (`name` and `flange` are the stems). The
 * Bastion's three pipes lean a hundredth or two off vertical while their
 * flanges lie dead flat at 0.22 of the pipe's length above its centre; the
 * Cantor's two lean 0.12 and 0.28 / 0.42 and their flanges lean with them.
 * Both are the files' own and both are the script's numbers.
 */
export function standpipes(root, { steel, black }, opts) {
  const { name = 'standpipe', flange: flangeName = 'standpipe_flange', pipes } = opts;
  pipes.forEach(({ radii, length, facets, flange, ...placement }, i) => {
    place(root, `${name}_${i}`, cyl(radii[0], radii[1], length, facets), steel, placement);
    const { R, tube, facets: ff, ...fp } = flange;
    place(root, `${flangeName}_${i}`, torus(R, tube, ...ff), black, fp);
  });
}

/**
 * Ballast tanks: `ballast_tank_i`, a steel capsule each (kit.mjs `capsule`,
 * `r`, `length`, `facets` [cap, radial]) laid on its side by its node. The
 * Bastion's two are 0.75 by 2, three cap rings round nine, rolled a quarter
 * turn and yawed 0.5 and 0.8 on the -z flank.
 */
export function ballastTanks(root, steel, { tanks }) {
  tanks.forEach(({ r, length, facets, ...placement }, i) =>
    place(root, `ballast_tank_${i}`, capsule(r, length, ...facets), steel, placement)
  );
}

/**
 * The primary quill: the Cantor's one tall spine, a frame of its own
 * (`primary_quill`, placed by the top of `opts` — pitched −0.1 and rolled
 * 0.17 off the apex in the file) holding `segments` up its Y, each a
 * frustum of `radii` [top, bottom], `length` and `facets` at its own
 * station, alternating through `skins` from the root (black, red, black),
 * and `quill_tip_light`, the lit orb of `r` and `facets` [round, down] at
 * the tip — the Cantor's brightest point, 8 × 6 where its photophores are
 * 6 × 5. As `stingerBarrel` is the turret's gun, this is the dome's
 * listening mast.
 *
 * The tip light rests on the last segment's end, half its radius sunk
 * into it — a bud on a skin (kit.mjs `seat`, nearest, inside the quill's
 * own frame, so the quill's pitch and roll carry it; #907). `tip.at` is
 * the seed: the Cantor's file stood the orb 0.24 units past the third
 * segment's end, 2.16 m of water between a lamp and its mast by #894's
 * resting measure, and the seed from there finds the end cap. Only the
 * station moves; the orb is round and keeps the file's rotation.
 */
export function primaryQuill(root, { skins, light }, opts) {
  const { segments, tip, ...placement } = opts;
  const quill = group(root, 'primary_quill', placement);
  segments.forEach(({ radii, length, facets, ...sp }, i) =>
    place(quill, `quill_seg_${i}`, cyl(radii[0], radii[1], length, facets), skins[i % skins.length], sp)
  );
  const { r, facets, ...tp } = tip;
  const last = `quill_seg_${segments.length - 1}`;
  const { at } = seat(quill, last, tp.at, { stand: r, sink: r / 2 });
  place(quill, 'quill_tip_light', new THREE.SphereGeometry(r, ...facets), light, { ...tp, at });
}

/* --------------------------------------------------------------------------
 * Shared kinds. The Light Scout is the first of the six kinds every navy
 * models (#588, off #540 Phase 3), and the Directorate's is a carapace of
 * boxes rather than orbs: five butted plates each with a red trailing lip, a
 * squared wedge for a rostrum, two eyes of different sizes, two antennae
 * raked back off their sockets, two folded limbs, two dorsal ridges, a keel,
 * two tail plates, a four-bladed telson and its spike, and three photophore
 * domes that are its whole resting light — nothing on it mirrored. The
 * builders take the approved export's own numbers (kit.mjs `drawn`);
 * hulls/light-scout-pelagia.mjs states the scale decision the shared kinds
 * follow.
 * ------------------------------------------------------------------------ */

/**
 * Plate segments: the scout's carapace, boxes butted along the keel, each
 * in its own `skin` and each trailed by a red lip — a thin box `lip.ratio`
 * of the plate's width and height, `lip.thickness` thick, set `lip.inset`
 * inside the plate's forward face and `lip.lift` above its axis, leaned
 * with the plate it belongs to. One-based and interleaved, seg_1,
 * seg_1_edge, seg_2 …, as the export numbers them; `tergites` above is the
 * Dredge's orb series and this is not it.
 *
 * The same series is every plated back on the shared kinds (#649), under
 * the export's own names: `name` is the plate's stem (the Corvette's
 * `carapace_1..5` and `tail_1..4`, the Cruiser's `plate_rank_0..7`), and
 * `first` its numbering. The lip is `${name}_${n}_edge` unless `lip.name`
 * gives it a stem of its own — the Harvester's `carapace_rim_0..4`, the
 * Cruiser's `plate_rim_0..7`. Those two carry the rim the other way: not a
 * fraction of the plate's height but a fixed `lip.height` (1 and 1.1),
 * seated `lip.seat` above the plate's *bottom* face rather than `lip.lift`
 * above its axis — a rim along the plate's lower edge where the scout's and
 * the Corvette's lip is a trailing face. Both rules are the files' own.
 */
export function plateSegments(root, lipMat, { name = 'seg', first = 1, lip, segments }) {
  segments.forEach(({ skin, size, ...placement }, i) => {
    const n = first + i;
    part(root, `${name}_${n}`, box(...size), skin, placement);
    const [x, y, z] = placement.at;
    const height = lip.height ?? size[1] * lip.ratio[1];
    const lift = lip.seat !== undefined ? lip.seat - size[1] / 2 : lip.lift;
    part(
      root,
      lip.name ? `${lip.name}_${n}` : `${name}_${n}_edge`,
      box(size[0] * lip.ratio[0], height, lip.thickness),
      lipMat,
      {
        ...placement,
        at: [x + size[2] / 2 - lip.inset, y + lift, z],
      }
    );
  });
}

/**
 * A wedge rostrum: a four-sided frustum stood on its corners, `radii` [tip,
 * base] along `length`, and squashed `squash` [x, y] in the geometry itself,
 * as the export has it — wider than it is tall, a beak rather than a spike.
 */
export function wedgeRostrum(root, mat, opts) {
  const { name = 'rostrum', radii, length, squash = [1, 1], ...placement } = opts;
  const geo = cyl(radii[0], radii[1], length, 4, Math.PI / 4).rotateX(Math.PI / 2);
  geo.scale(squash[0], squash[1], 1);
  return part(root, name, geo, mat, placement);
}

/** Eyes: low-facet orbs, `[name, r, placement]` each — two, of different sizes at different heights. */
export function eyes(root, mat, { eyes: list, facets = [6, 4] }) {
  list.forEach(([name, r, placement]) =>
    part(root, name, new THREE.SphereGeometry(r, ...facets), mat, placement)
  );
}

/**
 * Spikes: tapered cones, `radii` [tip, base] along `length` with `facets`
 * sides, each placed by its own node — the antennae (five-sided, raked back
 * off the head), the dorsal ridges (four-sided, leaned) and the telson's
 * spike. Drawn as the export drew them, tip up, and laid over by the node.
 *
 * A spike given `rootOn`, the name of a cone already in the scene, is
 * re-hung with its base centre on that cone's apex — its +Y end, read off
 * the geometry's height through the node's scale and rotation — and
 * turned to aim at where its tip was (`hangOn`), so it grows from the
 * other's point as a claw grows from its femur's end (`walkingLimbs`;
 * #907). The Submersible's rostrum
 * stood 1.96 m off its head by #894's resting measure, and the gap is
 * sideways, not ahead: the file's node runs it 10° across the head's
 * axis from 3 m to port and 1.7 m above the apex, its base 0.75 m past
 * the apex's station and already at the closest its own axis comes to
 * the apex, so no station along that axis meets the head short of its
 * port cheek. Hung from the apex it is the head's point carried on,
 * which is what a rostrum is; a cone that is not in the scene, or a
 * host that is not a cone, is an error.
 */
export function spikes(root, mat, { spikes: list }) {
  list.forEach(({ name, radii, length, facets = 5, rootOn, ...placement }) => {
    const mesh = part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement);
    if (rootOn) hangOn(root, mesh, length, rootOn);
  });
}

/**
 * Hang `mesh`, a cone of `length` on its own Y, from cone `name`'s apex:
 * its base centre on the apex and its axis aimed at where its tip already
 * was, so the tip — the point the chart's outline reads, on the Submersible
 * the bow itself — lands on the line to the file's tip, `length` from the
 * apex (0.36 m short of it on the Submersible, whose apex stands 0.567
 * units from that tip against a 0.55 cone), and only the root moves onto
 * the head. The cone is turned by the one rotation that carries its old
 * axis onto the new, which keeps its roll about that axis and so the
 * facet the file put on the crown. Hung with its rotation kept instead,
 * the rostrum's tip swung 3.4 m to starboard of the head's point and the
 * outline's bow point with it (#907, as first hung).
 */
function hangOn(root, mesh, length, name) {
  const host = root.getObjectByName(name);
  const height = host?.geometry?.parameters?.height;
  if (!height) throw new Error(`spikes: no cone ${name} in ${root.name} for ${mesh.name}`);
  root.updateMatrixWorld(true);
  const apex = host.localToWorld(new THREE.Vector3(0, height / 2, 0));
  const tip = mesh.localToWorld(new THREE.Vector3(0, length / 2, 0));
  const worldQ = mesh.getWorldQuaternion(new THREE.Quaternion());
  const was = new THREE.Vector3(0, 1, 0).applyQuaternion(worldQ);
  const axis = tip.clone().sub(apex).normalize();
  const turn = new THREE.Quaternion().setFromUnitVectors(was, axis);
  const frame = mesh.parent;
  const parentQ = frame.getWorldQuaternion(new THREE.Quaternion());
  mesh.quaternion.copy(parentQ.invert().multiply(turn.multiply(worldQ)));
  mesh.position.copy(frame.worldToLocal(apex.clone().addScaledVector(axis, length / 2)));
}

/**
 * The telson fan: plates of one `size` at one point, each rolled its own way
 * about the tail so they fan rather than cross, alternating through `skins`
 * from `telson_0`. The spike astern of them is a `spikes` entry.
 */
export function telsonFan(root, skins, { name = 'telson', size, blades }) {
  const plate = box(...size);
  blades.forEach((placement, i) =>
    part(root, `${name}_${i}`, plate, skins[i % skins.length], placement)
  );
}

/**
 * Photophore domes: lit orbs of one radius, `[name, placement]` each, one
 * geometry shared — a head, one flank and the tail, three in a pattern that
 * repeats on neither side. A mirrored pair is refused, as `photophores`
 * refuses one.
 *
 * A dome given as `[name, r, placement]` is an orb of its own radius and
 * its own buffer, which is how the Submersible's ten photophores and the
 * Cruiser's seven light domes are drawn — the Cruiser's as unit orbs
 * squashed by their nodes, no two alike (#649). `tolerance` is
 * `refuseMirror`'s, in the frame the placements are in. `frame` is the
 * kit's `zLong` (the default, every placement a `drawn` one) or `xLong`,
 * for the Refinery's four, whose file is X-long and whose placements are
 * the export's own (#652); a placement made by `laid` below names the
 * X-long frame itself, which is how the Bastion's sixteen — drawn the
 * Submersible's way, an orb each of its own radius — go through `place`.
 */
export function photophoreDomes(root, light, opts) {
  const { r = 0.32, facets = [8, 6], domes, tolerance, frame = null } = opts;
  const put = frame ? frame.place : place;
  refuseMirror(
    'photophore_dome',
    domes.map((d) => [d[0], ...d[d.length - 1].at]),
    tolerance
  );
  const dome = new THREE.SphereGeometry(r, ...facets);
  // A placement carrying `on` is a seed: the bud is seated on the nearest
  // of the parts it names, half its radius into the shell, where the file
  // left it standing off (kit.mjs `seat`, #894). Without it the placement
  // is the file's own.
  const rested = (radius, placement) =>
    placement.on
      ? {
          ...placement,
          at: seat(root, placement.on, placement.at, { stand: radius, sink: radius / 2 }).at,
        }
      : placement;
  domes.forEach((d) =>
    d.length === 3
      ? put(root, d[0], new THREE.SphereGeometry(d[1], ...facets), light, rested(d[1], d[2]))
      : put(root, d[0], dome, light, rested(r, d[1]))
  );
}

/* --------------------------------------------------------------------------
 * The other shared kinds (#649, off #540 Phase 3). The Corvette, the
 * Harvester, the Cruiser and the Abyssal Submersible are Z-long exports of
 * the same authoring pass as the Light Scout, drawn at four more arbitrary
 * scales (94.4, 81.0 and 146.3 units, and the Submersible's 4.55 for 95 m);
 * the Chorister is an X-long r169 export of the Dredge's pass and builds
 * from the hull vocabulary at the top of this module, with `spineGun` and
 * `bladderDome` — written for it and never before run — as its first
 * consumer. What the four add to the vocabulary is read off their node
 * names, as the scout's was:
 *
 *   Corvette     carapace_1..5 / _edge · ridge_0..4 · rostrum · rostrum_blade ·
 *                eye_p/s · antenna_p/s · limb_p/s_{shoulder,upper,forearm,claw} ·
 *                dart_p0..5 / s0..3 (+ _socket) · ventral_keel · keel_spur_a/b ·
 *                tail_1..4 / _edge · telson_0..4 · telson_spike ·
 *                photophore_p0..4 / s0..2 / tail
 *   Harvester    cargo_gut · gut_band_a..c · carapace_0..4 / carapace_rim_0..4 ·
 *                dorsal_dome · nub_0..3 · skirt_p0..3 / s0..2 (+ skirt_tip) ·
 *                mill_housing · mill_mouth · mill_tooth_0..5 ·
 *                claw_p/s_{shoulder,arm,hand,finger_up,finger_lo,tip,knuckle} ·
 *                tail_1 / _edge · tail_2..3 · paddle_0..3 · seam_strip_bow/mid/aft ·
 *                flank_strip_p/s · maw_bar · maw_ring · dome_bow/flank_p/tail
 *   Cruiser      body_core · plate_rank_0..7 / plate_rim_0..7 · dspike_p0..7 / s0..7 ·
 *                head_shield · head_crest · eye_p/s · antenna_fore/aft_p/s (+ _tip) ·
 *                whisker_fwd_p0..3 / aft_s0..4 (+ _tip) · dart_p0..6 / s0..4 ·
 *                ventral_keel · light_organ_strip · keel_spur_a/b · tail_1..3 / _edge ·
 *                telson_0..5 · telson_spike · light_band_p/s · band_rib_p/s0..2 ·
 *                dome_p0..3 / s0..2 · gill_p/s0..1 · photophore_head/tail
 *   Submersible  keel · carapace_1..5 / plate_rim_1..5 · head · rostrum ·
 *                mandible_port/starboard · spike_dorsal_1..4 · spike_flank_p1..3 /
 *                s1..2 · limb_port_1..4 / starboard_1..3 (_femur, _claw) ·
 *                tail_seg_1..4 / tail_joint_1..4 · telson_mid/port/starboard ·
 *                photophore_port_1..5 / starboard_1..3 / jaw / tail
 *
 * Every builder below takes the export's own numbers through kit.mjs
 * `drawn` and places the primitive as the file's node does; the rules they
 * hold — a limb's sizes scaled by side, a rim cut from its plate's radius,
 * a spike aimed at its lamp, a tooth's station round the mill — are the
 * files' own, read off them and checked by `diff.mjs` against them.
 * ------------------------------------------------------------------------ */

/**
 * A jointed limb: the boxes and the one cone of a folded manipulator, each
 * placed by its own node under `prefix` — the Corvette's `limb_p` and
 * `limb_s` (shoulder, upper, forearm, claw) and the Harvester's `claw_p` and
 * `claw_s` (shoulder, arm, hand, finger_up, finger_lo, tip, knuckle), in
 * the file's order, cone wherever it falls. `scale` is the side's: both
 * hulls draw the two limbs from one set of base sizes, the port one larger
 * (the Corvette's 1.15 against 0.9, the Harvester's 1.2 against 0.95) —
 * asymmetric, yet regimented. A joint is `{ name, skin, size }` for a box
 * or `{ name, skin, r, length, facets }` for a cone; every dimension is
 * scaled but the cone's 0.02 point, which both files leave at 0.02 on both
 * sides. The placements are the file's own, not mirrored from one side.
 */
export function jointedLimb(root, { prefix, scale = 1, point = 0.02, joints }) {
  joints.forEach(({ name, skin, size, r, length, facets = 4, ...placement }) => {
    const geo = size
      ? box(...size.map((d) => d * scale))
      : cyl(point, r * scale, length * scale, facets);
    part(root, `${prefix}_${name}`, geo, skin, placement);
  });
}

/**
 * Darts: the torpedo hardpoints, "visible torpedo hardpoints" (the Corvette
 * block) — one tapered spar, `radii` [nose, tail] over `length` with
 * `facets` sides, shared by every dart and laid on its rank by its own
 * node, raked forward and canted outboard; with, where the hull mounts
 * them, a `socket` box under each, placed by its node in the file's
 * interleaved order (dart_p0, dart_p0_socket, dart_p1 …). Both hulls that
 * carry them rank more to port than to starboard: the Corvette six to four,
 * the Cruiser seven to five.
 */
export function darts(root, { dart: dartMat, socket: socketMat }, opts) {
  const { radii, length, facets = 6, socket, darts: list } = opts;
  const geo = cyl(radii[0], radii[1], length, facets);
  list.forEach(({ name, socket: socketAt, ...placement }) => {
    part(root, name, geo, dartMat, placement);
    if (socketAt) part(root, `${name}_socket`, box(...socket.size), socketMat, socketAt);
  });
}

/**
 * Photophore marks: the shared kinds' running lights as boxes rather than
 * domes — one box of `size` shared by every mark, `[name, placement]`
 * each, in a rank that repeats on neither side (the Corvette's five to
 * port against three to starboard). A mirrored pair is refused, as
 * `photophores` refuses one; `tolerance` is `refuseMirror`'s.
 */
export function photophoreMarks(root, light, { size, marks, tolerance }) {
  refuseMirror(
    'photophore',
    marks.map(([name, { at }]) => [name, ...at]),
    tolerance
  );
  const mark = box(...size);
  marks.forEach(([name, placement]) => place(root, name, mark, light, placement));
}

/**
 * Carapace orbs: plates that are orbs rather than boxes, each an orb of its
 * own `r` and the shared `facets`, squashed and leaned by its own node —
 * the Submersible's `carapace_1..5` (seven meridians, four stacks, scaled
 * 1.3 × 0.62 × 1.02) and its `tail_seg_1..4`, and the Harvester's
 * `cargo_gut`, one unit orb of ten by seven drawn 23 × 8.4 × 44 by its node.
 * `n` numbers the plate; a plate without one takes `name` alone.
 *
 * `rim` cuts a rim under each plate as the Submersible does: an *open*
 * frustum — no caps — `rim.h` tall with `rim.facets` sides, its radii
 * `rim.ratio` [forward, aft] of the plate's own radius, laid across the
 * keel by its node and named `${rim.name}_${n}`. The plate rims are 1.06
 * and 1.12 of their plate, nine-sided and 0.07 tall; the tail joints 0.92
 * and 0.98, eight-sided and 0.05 tall. `parts.mjs` reads them as an open
 * cylinder first and offers a 3 × 4 displaced orb second; the buffer has
 * two rows at ±h/2, the top at the smaller radius, and is the cylinder.
 */
export function carapaceOrbs(root, { skin, rim: rimMat }, opts) {
  const { name = 'carapace', facets = [7, 4], rim, plates } = opts;
  plates.forEach(({ n, r, rim: rimAt, ...placement }) => {
    part(
      root,
      n === undefined ? name : `${name}_${n}`,
      new THREE.SphereGeometry(r, ...facets),
      skin,
      placement
    );
    if (rim)
      part(
        root,
        `${rim.name}_${n}`,
        new THREE.CylinderGeometry(r * rim.ratio[0], r * rim.ratio[1], rim.h, rim.facets, 1, true),
        rimMat,
        rimAt
      );
  });
}

/**
 * Skirt plates: the Harvester's "external intake dredge gear" — a rank of
 * plates hung off each flank, each a box of one `size` in its own `skin`
 * (alternating violet and chitin down the rank), leaned outboard and down
 * by its node, with a four-sided `tip` spike off its outer edge, placed by
 * its own node; `skirt_${name}` and `skirt_tip_${name}`, interleaved as
 * the file has them. Four to port, three to starboard.
 */
export function skirtPlates(root, { tip: tipMat }, { size, tip, plates }) {
  plates.forEach(({ name, skin, tip: tipAt, ...placement }) => {
    part(root, `skirt_${name}`, box(...size), skin, placement);
    part(
      root,
      `skirt_tip_${name}`,
      cyl(tip.radii[0], tip.radii[1], tip.length, tip.facets ?? 4),
      tipMat,
      tipAt
    );
  });
}

/**
 * The mill: the Harvester's mining mouth at the bow — `housing`, a box;
 * `mouth`, a drum of `r` and `h` with `facets` sides stood on the housing's
 * face by its node; and `teeth`, `count` four-sided cones in a ring of
 * radius `r` about `at` in the export's bow plane, each at its station
 * `k · 2π / count` anticlockwise from +x, leaned back by `tilt` and rolled
 * to its station (an XYZ Euler of `[tilt, 0, −a]`) — which is the rule the
 * file's six teeth follow to the seventh decimal (mill_tooth_1 at
 * y = 5.2 + 1.7 · sin 60°). The maw's light is the hull's, laid over it.
 */
export function millMouth(root, mats, { housing, mouth, teeth }) {
  part(root, 'mill_housing', box(...housing.size), mats.housing, housing);
  part(root, 'mill_mouth', cyl(mouth.r, mouth.r, mouth.h, mouth.facets ?? 8), mats.mouth, mouth);
  const { count, r, at, tilt, radii, length, facets = 4 } = teeth;
  for (let k = 0; k < count; k++) {
    const a = (k * 2 * Math.PI) / count;
    part(
      root,
      `mill_tooth_${k}`,
      cyl(radii[0], radii[1], length, facets),
      mats.teeth,
      drawn([at[0] + r * Math.cos(a), at[1] + r * Math.sin(a), at[2]], [tilt, 0, -a])
    );
  }
}

/**
 * Drums: frusta that are not spikes — `radii` [top, bottom] over `length`
 * with `facets` sides, each placed by its own node. The Submersible's keel
 * (seven-sided, 0.26 to 0.2, squashed to 0.75 across by its node) and the
 * Harvester's `maw_ring`, the lit collar round the mill's mouth. `spikes`
 * above builds the same primitive; this is the name for one that is a
 * body rather than a point.
 */
export function drums(root, mat, { drums: list }) {
  list.forEach(({ name, radii, length, facets, ...placement }) =>
    part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement)
  );
}

/**
 * Aimed spikes: the Cruiser's four antennae and nine whiskers — "prominent
 * sensor arrays and fixed hydrophone masts" — each a five-sided spike
 * `radii` [tip, root] run `from` a root on the carapace `to` the lamp at
 * its tip, and each carrying that lamp: `tip.name`, a cube of `tip.size` in
 * the light, at `to`.
 *
 * The file draws each one *aimed*: its node sits at the midpoint of root
 * and tip, its length is their distance (the antennae's 20.4424 and the
 * whiskers' 5.8386 are nothing anyone typed), and its rotation is the
 * minimal one taking +Y onto that direction — three's
 * `Quaternion.setFromUnitVectors`, which reproduces every one of the
 * thirteen Eulers the file carries to 6 × 10⁻⁸ rad (#649), where a look-at
 * does not. The roots are round numbers (antenna_fore_p from (5.2, 9.5,
 * 50)); a script holds root and tip, and the builder holds the rule. A
 * lamp given `buffer` shares the box of the named earlier lamp in the same
 * call, as `antenna_tip_as` shares `antenna_tip_fp`'s in the file; a spike
 * given its own `skin` wears it in place of the call's — the aft antennae
 * are chitin where the fore are violet, and the four are one call because
 * of that shared lamp.
 *
 * A lamp's `size` is one number for the cube the file carries, or
 * `[w, h, d]` for a pad — a lamp at the end of a thin spike is a dot from
 * above, and the maps are top-down (docs/models-plan.md §3.2 rule 5, #890).
 * `inset` pulls the lamp's centre back from the point along the spike, so a
 * pad sits under the point with the point standing through it, and reaches
 * no further out than the cube did: the fore-port antenna's cube sets the
 * Cruiser's bow, and `metreTrue` holds it. Both default to the file's own
 * cube at the point.
 */
export function aimedSpikes(root, { spike: spikeMat, tip: tipMat }, { spikes: list }) {
  const tips = new Map();
  const up = new THREE.Vector3(0, 1, 0);
  list.forEach(({ name, skin = spikeMat, radii, facets = 5, from, to, tip }) => {
    const A = new THREE.Vector3(...from);
    const B = new THREE.Vector3(...to);
    const d = B.clone().sub(A);
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    const mid = A.clone().add(B).multiplyScalar(0.5).toArray();
    const placement = drawn(mid, [e.x, e.y, e.z]);
    part(root, name, cyl(radii[0], radii[1], d.length(), facets), skin, placement);
    if (tip) {
      const { size, inset = 0 } = tip;
      const geo = tip.buffer
        ? tips.get(tip.buffer)
        : Array.isArray(size)
          ? box(...size)
          : box(size, size, size);
      tips.set(tip.name, geo);
      const at = inset ? B.clone().addScaledVector(d.clone().normalize(), -inset).toArray() : to;
      part(root, tip.name, geo, tipMat, drawn(at));
    }
  });
}

/**
 * Walking limbs: the Submersible's "folded manipulator limbs" — seven,
 * four to port and three to starboard, `limb_${side}_${n}`, each a femur
 * box and a claw box in `edge_red` so the claws glow faintly. One rule
 * places all seven, read off the file: the femur is `femur` [wide, thick]
 * by the limb's own `length`, at `at` in the export's frame, folded
 * `fold.femur` (pitched 0.35, rolled 1.15 outboard); the claw is `claw`
 * [wide, thick] by `clawRatio` of that length, folded `fold.claw`
 * (pitched back 2.1, yawed 0.25 and rolled 0.35 outboard), and hung from
 * the femur's outboard end. Outboard is +x to port on this export, so a
 * starboard limb's roll and yaw change sign. The lengths and the femur
 * stations are each limb's own.
 *
 * Where the claw hangs is the joint, not a number (#907). The file set
 * each claw's centre at one offset from its femur's — 0.16 outboard, 0.08
 * down, 0.14 forward — which on every limb left the claw's root 0.86 to
 * 1.15 m clear of the femur's end, a manipulator in two pieces by #894's
 * resting measure. The femur's fold carries its −Y end outboard, down and
 * a little aft, and the claw's fold carries its +Y end inboard, down and
 * aft: that end is the one the file's offset put nearest the femur, and
 * it is the claw's root. So the knee is the femur's −Y end, computed from
 * its centre, length and fold, and the claw's centre stands half its
 * length back along its own axis from the knee, so its root meets the
 * femur's end and its fold is the file's. The rule moves each claw 1.5 to
 * 1.8 m, and all seven lie under the belly, where the file folded them
 * (hulls/abyssal-submersible-directorate.mjs, the header).
 */
export function walkingLimbs(root, { chitin, red }, opts) {
  const {
    femur = [0.07, 0.06],
    claw = [0.045, 0.04],
    clawRatio = 0.6,
    fold = { femur: [0.35, 1.15], claw: [-2.1, 0.25, 0.35] },
    limbs: list,
  } = opts;
  // A box's +Y axis under an XYZ Euler, in the export's frame; `drawn`
  // carries the frame, so a point found here lands where the file's would.
  const along = (e) => new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...e, 'XYZ'));
  list.forEach(({ side, n, length, at }) => {
    const sgn = side === 'port' ? 1 : -1;
    const femurRot = [fold.femur[0], 0, sgn * fold.femur[1]];
    const clawRot = [fold.claw[0], sgn * fold.claw[1], sgn * fold.claw[2]];
    const femurGeo = box(femur[0], length, femur[1]);
    part(root, `limb_${side}_${n}_femur`, femurGeo, chitin, drawn(at, femurRot));
    const knee = new THREE.Vector3(...at).addScaledVector(along(femurRot), -length / 2);
    const clawAt = knee.addScaledVector(along(clawRot), -(length * clawRatio) / 2);
    part(
      root,
      `limb_${side}_${n}_claw`,
      box(claw[0], length * clawRatio, claw[1]),
      red,
      drawn(clawAt.toArray(), clawRot)
    );
  });
}

/* --------------------------------------------------------------------------
 * The works — the Foundry and the Nodule Refinery (#652, off #540 Phase 3).
 *
 * Two structures the Directorate shares by name with the Knights and the
 * Commune: the bay, the cranes, the launch mouth, the ballast tanks and
 * the graft pipes of the Foundry, and the crusher, stacks, conveyor gantry,
 * hopper, transfer pipes and flood masts of the Refinery are the kit's
 * (kit.mjs, its last section), called with this navy's numbers. What is
 * the Directorate's alone is read off the two files' node names:
 *
 *   Foundry    tergite_starboard_0..3 / tergite_port_0..3 · tergite_seam_0_0..3 /
 *              _1_0..3 · spine_spike_0_0..2 / _1_0..2 · outrigger_pod_big ·
 *              outrigger_spike · outrigger_pod_small · stern_carapace · stern_seam ·
 *              stern_spike · launch_mandible_0..1 · flank_photophore_0..9 ·
 *              anchor_claw_0..4
 *   Refinery   silo_k_seg_i / silo_k_seam_i · silo_cap_k · silo_tip_light_k ·
 *              silo_spike_k_j · maw_tooth_0..2 · intake_tooth_0..4 ·
 *              anchor_claw_0..3, 5 · photophore_0..3
 *
 * A carapace laid down either side of the bay, as the turret's is laid
 * round its mound: four tergites a flank, each a shell open 0.58 of the way
 * down, yawed a little further along the rank and rolled 0.12 outboard,
 * with a half-torus seam standing on it and a spine off its shoulder — the
 * spines all raked the one way, along (±0.35, 1, 0.1), and the rank on each
 * flank one spine short at the bow. The Refinery's silos are the same
 * carapace stood up: segments alternating red and violet up each, every
 * one twisted 0.3 further round than the one below it, a steel seam between
 * them, a black cap and a crimson tip, and spikes off the flanks in ranks
 * with holes in them. Asymmetric, yet regimented, on both.
 *
 * Every builder here takes the export's own numbers through a kit frame —
 * `zLong` for the Foundry (a Z-long export, every placement through `drawn`)
 * and `xLong` for the Refinery (an X-long one, every placement as the file
 * has it), which is what the two approved files are (#652) — and the rule
 * each holds is the file's, read off it and checked against it.
 * ------------------------------------------------------------------------ */

/**
 * The Refinery's maw as an aperture (#907): the crusher's mouth cut into
 * its dome. #890 read the block's "visible machinery light" as a floodlit
 * apron at the foot of the crusher's face and #894 made the Order's and
 * the Commune's maws one fixture, a lit slab set into the cowl's crown;
 * on a Directorate dome that slab is a lit plate on the outside, which
 * docs/style-neon-noir.md refuses ("An aperture may glow as area, and an
 * aperture is a hole ... recessed, bounded by unlit chitin on every side,
 * and shaped by the geometry it sits in rather than applied to a face").
 * So the Directorate's is a hole, and every piece of it is the cowl's
 * own sphere: `hole.rings` and `hole.quads` name the cells — rings down
 * from the pole, quads round from its −x edge — cut out of the shell
 * (kit `pierced`), on the shoulder that faces the belt's high end, where
 * the nodules come off; the floor is those same cells `recess` nearer
 * the centre, lit; and the throat is the hole's rim dropped to the
 * floor's, a quad a rim segment, in the cowl's chitin. Rim, throat and
 * floor share their vertices, so the mouth is sealed on every side and
 * what shows through it is its lit floor and the throat's walls, nothing
 * beside them — and nothing of the floor stands outside the shell, which
 * the first draft's flat slab did not manage: sized to the hole's chords
 * at the shell plus a margin, so a slanted view saw no gap at the rim,
 * its corners stood outside the shell and showed through the cowl as lit
 * chips beside the mouth. Rule 2 is met by construction; rule 3's place
 * is where the structure eats; rule 4's token is the navy's throat,
 * `gullet_glow`, the Dredge's, the Slipway's and the Vent Tap's. Whether
 * the hopper's lit `intake_mouth`, a floodlit surface and no hole, stands
 * against rules 2 and 3 is the owner's (#907).
 *
 * Every number is in the cowl's own frame — `cowl` is the kit's
 * `crusher` cowl, `{ r, facets, phi, theta, at, rot, scale }` — and all
 * three pieces sit on the cowl's node, so they squash as it does. Returns
 * what `crusher` takes for its `cowl` and `maw`, and the throat to add
 * after them.
 */
export function crusherMaw({ cowl, hole, recess = 0.35 }) {
  const { r, facets: [round, down], phi: phiLength, theta: thetaLength, at, rot, scale } = cowl;
  const dPhi = phiLength / round;
  const dTheta = thetaLength / down;
  // Which cell a centroid is in, on three's sphere: y is cos θ, and φ runs
  // from −x round through +z.
  const cell = (x, y, z) => {
    const rr = Math.hypot(x, y, z);
    return [Math.floor(Math.acos(y / rr) / dTheta), Math.floor(Math.atan2(z, -x) / dPhi)];
  };
  const inHole = (x, y, z) => {
    const [ring, quad] = cell(x, y, z);
    return ring >= hole.rings[0] && ring < hole.rings[1] && quad >= hole.quads[0] && quad < hole.quads[1];
  };
  const sphere = (radius) => new THREE.SphereGeometry(radius, round, down, 0, phiLength, 0, thetaLength);
  const cowlGeo = pierced(sphere(r), (x, y, z) => !inHole(x, y, z));
  const floorGeo = pierced(sphere(r - recess), inHole);

  // The throat: the rim's vertices, three's own formula for them so they
  // land on the shell's, walked round the hole and dropped to the floor's.
  const vertex = (radius, theta, phi) => [
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
  const rim = [];
  const [r0, r1] = hole.rings;
  const [q0, q1] = hole.quads;
  for (let q = q0; q < q1; q++) rim.push([r0 * dTheta, q * dPhi]);
  for (let ring = r0; ring < r1; ring++) rim.push([ring * dTheta, q1 * dPhi]);
  for (let q = q1; q > q0; q--) rim.push([r1 * dTheta, q * dPhi]);
  for (let ring = r1; ring > r0; ring--) rim.push([ring * dTheta, q0 * dPhi]);
  const centre = new THREE.Vector3(...vertex(r - recess / 2, ((r0 + r1) / 2) * dTheta, ((q0 + q1) / 2) * dPhi));
  const tris = [];
  const uvs = [];
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i];
    const b = rim[(i + 1) % rim.length];
    const ao = vertex(r, ...a);
    const bo = vertex(r, ...b);
    const ai = vertex(r - recess, ...a);
    const bi = vertex(r - recess, ...b);
    // Wound to face the mouth's axis, whichever way the walk went.
    const va = new THREE.Vector3(...ao);
    const n = new THREE.Vector3(...bo).sub(va).cross(new THREE.Vector3(...ai).sub(va));
    const inward = n.dot(centre.clone().sub(va)) > 0;
    const quad = inward ? [ao, bo, bi, ai] : [ao, ai, bi, bo];
    const uvQuad = inward ? [a, b, b, a] : [a, a, b, b];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      tris.push(...quad[k]);
      // The sphere's own uv rule, so the throat carries the attributes the
      // shell does and the bake merges them into one draw.
      uvs.push(uvQuad[k][1] / phiLength, 1 - uvQuad[k][0] / thetaLength);
    }
  }
  const throatGeo = new THREE.BufferGeometry();
  throatGeo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  throatGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  throatGeo.computeVertexNormals();

  const placed = (geo) => ({ geo, at, rot, scale });
  return { cowl: placed(cowlGeo), maw: placed(floorGeo), throat: placed(throatGeo) };
}

/**
 * The tergite flanks either side of the Foundry's bay: on each flank
 * (`{ name, n, plates }`, `tergite_${name}_${i}`), a rank of plates,
 * alternating red and violet from the stern, each an orb of `facets` open
 * `down` of the way to the pole and squashed by its own `scale`; over each,
 * `tergite_seam_${n}_${i}`, a half-torus of `seam.tube` in `seam.facets`
 * [radial, tubular] standing `seam.lift` above the plate's centre, scaled
 * `seam.of` [x, y] of the plate's and turned with it; and off each that
 * carries one, `spine_spike_${n}_${i}`, a cone of `spike.r` and its own
 * `length` laid by its own node.
 *
 * As the approved file draws them: a plate's `rot` is a YXZ Euler — a pitch
 * of its own, the rank's yaw (0.12 and 0.05 further each plate) and a roll
 * of 0.12 outboard — and its seam takes the yaw and the roll without the
 * pitch. Each spine's rotation is the minimal one carrying +Y onto
 * (±0.35, 1, 0.1), the one rake for all six, and its foot sits on its
 * plate's shoulder where the file put it; the file's node is transcribed
 * rather than the rule re-derived, since the feet are nowhere a formula
 * reaches. Both ranks are four plates and three spines: the bow plate on
 * each flank carries none.
 */
export function tergiteFlanks(root, { violet, red, black, steel }, opts) {
  const {
    frame = zLong,
    facets = [9, 6],
    down = 0.58,
    seam = { tube: 0.06, facets: [4, 16], of: [0.9, 0.98], lift: 0.15 },
    spike: spk = { r: 0.14, facets: 5 },
    flanks,
  } = opts;
  for (const { name, n, plates } of flanks)
    plates.forEach((p, i) => {
      const [x, y, z] = p.at;
      const [pitch, yaw, roll] = p.rot;
      frame.part(
        root,
        `tergite_${name}_${i}`,
        shell(1, facets, { down }),
        i % 2 ? violet : red,
        p.at,
        eulerXYZ([pitch, yaw, roll], 'YXZ'),
        p.scale
      );
      frame.part(
        root,
        `tergite_seam_${n}_${i}`,
        new THREE.TorusGeometry(1, seam.tube, ...seam.facets, Math.PI),
        steel,
        [x, y + seam.lift, z],
        [0, yaw, roll],
        [seam.of[0] * p.scale[0], seam.of[1] * p.scale[1], 1]
      );
      if (p.spike)
        frame.part(
          root,
          `spine_spike_${n}_${i}`,
          spike(spk.r, p.spike.length, spk.facets),
          black,
          p.spike.at,
          p.spike.rot
        );
    });
}

/**
 * The outrigger pods off the Foundry's flanks: a big violet orb yawed off
 * one corner with a black spike raked off it, and a small red one off the
 * other — `outrigger_pod_big`, `outrigger_spike`, `outrigger_pod_small`,
 * in the file's order. Each orb is its own `r` and `facets`, squashed by
 * its node.
 */
export function outriggerPods(root, { violet, black, red }, opts) {
  const { frame = zLong, big, spike: spk, small } = opts;
  const orbOf = (o) => new THREE.SphereGeometry(o.r, ...o.facets);
  frame.part(root, 'outrigger_pod_big', orbOf(big), violet, big.at, big.rot, big.scale);
  const barb = spike(spk.r, spk.length, spk.facets ?? 5);
  frame.part(root, 'outrigger_spike', barb, black, spk.at, spk.rot);
  frame.part(root, 'outrigger_pod_small', orbOf(small), red, small.at, small.rot, small.scale);
}

/**
 * The stern carapace closing the bay's blind end: a red orb squashed by its
 * node, the steel seam ring lying flat on it — a full torus of `R` and
 * `tube` in `facets` [radial, tubular] — and the black spike raked off its
 * crown: `stern_carapace`, `stern_seam`, `stern_spike`.
 */
export function sternCarapace(root, { red, steel, black }, opts) {
  const { frame = zLong, carapace: c, seam, spike: spk } = opts;
  const orb = new THREE.SphereGeometry(c.r, ...c.facets);
  frame.part(root, 'stern_carapace', orb, red, c.at, c.rot, c.scale);
  const ring = torus(seam.R, seam.tube, ...seam.facets);
  frame.part(root, 'stern_seam', ring, steel, seam.at, seam.rot, seam.scale);
  const barb = spike(spk.r, spk.length, spk.facets ?? 5);
  frame.part(root, 'stern_spike', barb, black, spk.at, spk.rot);
}

/**
 * The mandibles either side of the launch mouth: four-sided cones of one
 * `r` and `length`, `launch_mandible_${n}` each, laid by their own nodes —
 * pitched 0.5 forward and rolled 0.6 outboard, one a hair further out than
 * the other, as the file has them.
 */
export function launchMandibles(root, violet, opts) {
  const { frame = zLong, r, length, facets = 4, mandibles } = opts;
  for (const m of mandibles)
    frame.part(root, `launch_mandible_${m.n}`, spike(r, length, facets), violet, m.at, m.rot);
}

/**
 * Anchor claws on the seabed, `anchor_claw_${index}`: cones of one `r` and
 * `facets` and their own `length`, each laid by its own node so that its
 * point rises out and up from a foot near the hull, skinned through `skins`
 * by the claw's number — as `clawGrips` skins the turret's, with the same
 * hole in the rank: the Refinery's run 0, 1, 2, 3, 5. Every rotation is
 * the minimal one carrying +Y onto the claw's own line, the file's node
 * transcribed. Both works carry them, so the builder takes its `frame`.
 */
export function anchorClaws(root, skins, { frame = zLong, r = 0.28, facets = 5, claws }) {
  for (const c of claws) {
    const skin = skins[c.index % skins.length];
    frame.part(root, `anchor_claw_${c.index}`, spike(r, c.length, facets), skin, c.at, c.rot);
  }
}

/**
 * The Refinery's silos: "a rank of upright silos" (docs/asset-prompts-3d.md,
 * STRUCTURE — Nodule Refinery), grown as carapace stood on end. Each silo
 * `{ n, at: [x, z], r, height, segments, yaw, spikes }` is `segments`
 * eight-sided frusta stacked up from the ground, `silo_${n}_seg_${i}`,
 * alternating red and violet from the foot, each `height / segments` tall
 * and `r · (1 − waist · i / segments)` at its foot and `taper` of that at
 * its crown, yawed `yaw + twist · i`; between them and over the top one,
 * `silo_${n}_seam_${i}`, a steel torus of `seam.of` the segment's foot
 * radius, `seam.tube` thick in `seam.facets` [radial, tubular], lying
 * flat; then `silo_cap_${n}`, a black cone of `cap.of · r` and `cap.h`
 * standing `cap.lift` above the top; `silo_tip_light_${n}`, a crimson orb
 * `tip.lift` above it; and then the silo's spikes, `silo_spike_${n}_${j}`
 * with each `j` its own (the ranks are 1; 0, 2; 0, 1; 0, 1, 2 — holes and
 * all), violet cones of `spike.r` and their own `length` laid by their own
 * nodes, every one the minimal rotation carrying +Y onto a line 0.35 up
 * for every 1 out.
 *
 * Every fraction here is read off the approved file and checked against
 * every segment of every silo: 0.82 for the taper, 0.22 for the waist over
 * a silo's height, 0.85 for the seam, 0.72 for the cap, and 0.3 for the
 * twist, each silo starting half a radian further round than the last.
 */
export function silos(root, { red, violet, steel, black, light }, opts) {
  const {
    frame = xLong,
    facets = 8,
    taper = 0.82,
    waist = 0.22,
    twist = 0.3,
    seam = { of: 0.85, tube: 0.1, facets: [4, 14] },
    cap = { of: 0.72, h: 1.5, lift: 0.7, facets: 8 },
    tip = { r: 0.16, facets: [6, 5], lift: 1.55 },
    spike: spk = { r: 0.13, facets: 5 },
    silos: list,
  } = opts;
  for (const s of list) {
    const [x, z] = s.at;
    const h = s.height / s.segments;
    for (let i = 0; i < s.segments; i++) {
      const rb = s.r * (1 - (waist * i) / s.segments);
      frame.part(
        root,
        `silo_${s.n}_seg_${i}`,
        cyl(taper * rb, rb, h, facets),
        i % 2 ? violet : red,
        [x, h * (i + 0.5), z],
        [0, s.yaw + twist * i, 0]
      );
      frame.part(
        root,
        `silo_${s.n}_seam_${i}`,
        torus(seam.of * rb, seam.tube, ...seam.facets),
        steel,
        [x, h * (i + 1), z],
        [Math.PI / 2, 0, 0]
      );
    }
    frame.part(
      root,
      `silo_cap_${s.n}`,
      cyl(0, cap.of * s.r, cap.h, cap.facets),
      black,
      [x, s.height + cap.lift, z]
    );
    frame.part(
      root,
      `silo_tip_light_${s.n}`,
      new THREE.SphereGeometry(tip.r, ...tip.facets),
      light,
      [x, s.height + tip.lift, z]
    );
    for (const j of s.spikes)
      frame.part(
        root,
        `silo_spike_${s.n}_${j.n}`,
        spike(spk.r, j.length, spk.facets),
        violet,
        j.at,
        j.rot
      );
  }
}

/**
 * The maw's teeth: four-sided cones of one `r` and `length` hung point-down
 * over the crusher's maw, `maw_tooth_${n}` each at its own station along
 * the maw's lip, as the file places them.
 */
export function mawTeeth(root, black, opts) {
  const { frame = xLong, r = 0.14, length = 0.8, facets = 4, teeth } = opts;
  for (const t of teeth) {
    const rot = t.rot ?? [Math.PI, 0, 0];
    frame.part(root, `maw_tooth_${t.n}`, spike(r, length, facets), black, t.at, rot);
  }
}

/**
 * The intake's teeth: `count` four-sided cones of `r` and `length` round
 * the hopper's mouth, `intake_tooth_${k}`, each at `radius` out from `at`
 * (the hopper's centre) on bearing `phase + k · 2π / count` anticlockwise
 * from +x, at height `y`, and leaned `lean` radians outward — an XYZ Euler
 * of `[lean · sin a, 0, −lean · cos a]` — which is the rule the file's five
 * teeth follow to the seventh decimal (intake_tooth_0 at x = 13.4 + 1.45 ·
 * cos 0.2). `millMouth` above holds the Harvester's version of the same
 * rule with the teeth in the bow plane; these lie in the ground plane.
 */
export function intakeTeeth(root, black, opts) {
  const { frame = xLong, r = 0.13, length = 0.9, facets = 4, count = 5 } = opts;
  const { at, radius, y, phase = 0, lean } = opts;
  for (let k = 0; k < count; k++) {
    const a = phase + (k * 2 * Math.PI) / count;
    frame.part(
      root,
      `intake_tooth_${k}`,
      spike(r, length, facets),
      black,
      [at[0] + radius * Math.cos(a), y, at[2] + radius * Math.sin(a)],
      [lean * Math.sin(a), 0, -lean * Math.cos(a)]
    );
  }
}

export { THREE };

/* --------------------------------------------------------------------------
 * The Bio-Reactor (#788, off #540 Phase 4). The bed and the three intake
 * arms are the kit's (`reactorBed`, `reactorIntakeArm`) and identical on all
 * four navies; what is a navy's is the vessel that stands on the slab and
 * the outflow off it, which is these two builders.
 * ------------------------------------------------------------------------ */

/**
 * The render vessel, Abyssal Directorate: a carapace mound. The navy that
 * grows a turret's base as a shell grows a digester the same way — an orb
 * pressed down onto the slab, a steel collar round its waist, scutes plated
 * up its flank alternating violet and red as the tergites alternate along a
 * hull, a dark seam across its crown and a rank of spines raked off its
 * back.
 *
 * The spines are on one side only, and they are not there to be symmetrical:
 * this navy's ranks repeat on neither side (docs/models-plan.md §3.6), and
 * the spines are what makes the mound read as a back rather than a dome.
 *
 * `mark` is the vessel's one lamp. The ports carry the biolight's *unlit*
 * finish, because the block lights them only while crop is coming in
 * (docs/models-plan.md §3.2 rule 2).
 */
export function reactorVessel(root, { violet, red, black, steel, lampM, unlit }, opts) {
  const { mound, collar, scutes, seam, spines, mark, ports } = opts;
  add(root, 'reactor_vessel', orb(12, 8), violet, [0, mound.y, 0], [0, 0, 0], mound.r);
  add(
    root,
    'mound_collar',
    torus(collar.r, collar.t, 6, 16),
    steel,
    [0, collar.y, 0],
    [Math.PI / 2, 0, 0]
  );
  const skins = [violet, red];
  scutes.at.forEach(([a, r, y], i) =>
    add(
      root,
      `base_scute_${i}`,
      orb(8, 6),
      skins[i % 2],
      polar(a, r, y),
      [0, -a, scutes.pitch],
      scutes.scale
    )
  );
  add(root, 'mound_seam', orb(10, 6), black, seam.at, [0, seam.yaw, 0], seam.r);
  spines.at.forEach(([a, r, y, length], i) =>
    add(root, `mound_spine_${i}`, spike(spines.r, length, 5), black, polar(a, r, y), [
      0,
      -a,
      spines.rake,
    ])
  );
  add(root, 'crown_mark', box(...mark.size), lampM, mark.at, [0, mark.yaw ?? 0, 0]);
  ports.at.forEach(([a, r, y], i) =>
    add(root, `vessel_port_${i}`, orb(8, 5), unlit, polar(a, r, y), [0, -a, 0], ports.scale)
  );
}

/**
 * The Biomass outflow, Abyssal Directorate: a gullet off the mound on
 * `bearing`, ribbed where it leaves the shell, into a dispatch hopper with
 * its rim and throat — "the Biomass outflow off the vessel to a dispatch
 * hopper", in the vocabulary the Dredge already carries (`hopper` above).
 *
 * The hopper is the Dredge's three parts by name and yawed onto the
 * bearing, which the Dredge's own never has to be — a hull's hopper lies
 * along its keel and this one lies along the gullet that feeds it.
 * Distances are metres out along the bearing, as the kit's
 * `reactorIntakeArm` takes them; the throat is the biolight's unlit finish
 * for the same reason the ports are.
 */
export function reactorOutflow(root, { red, black, steel, unlit }, opts) {
  const { bearing: a, gullet, ribs, hopper: bin, rim, throat } = opts;
  const yaw = [0, -a, 0];
  add(root, 'outflow_gullet', loft(gullet.profile, gullet.facets ?? 8), red, [0, gullet.y, 0], yaw);
  // A torus is born round +Z, so the turn that lays its axis on the bearing
  // is π/2 − a about Y: the ribs ride the gullet rather than stand across it.
  ribs.at.forEach((d, i) =>
    add(root, `gullet_rib_${i}`, torus(ribs.r, ribs.t, 5, 12), steel, polar(a, d, gullet.y), [
      0,
      Math.PI / 2 - a,
      0,
    ])
  );
  add(root, 'outflow_hopper', box(...bin.size), black, polar(a, bin.at, bin.y), yaw);
  add(root, 'hopper_rim', box(...rim.size), steel, polar(a, bin.at, rim.y), yaw);
  add(root, 'hopper_throat', box(...throat.size), unlit, polar(a, bin.at, throat.y), yaw);
}

/* --------------------------------------------------------------------------
 * The Succentor and the Treble (#840): the deep deck and the craft it
 * launches, the Directorate's pair of the carrier wave. What the pair adds
 * is what a carrier needs and no hull before it had — a berth a craft
 * leaves from, cut to the craft that fits it — and the craft's own body,
 * stated once here because two scripts build from it: the Treble is drawn
 * from it, and the Succentor's cradles are cut to it, so the one cannot be
 * re-proportioned without the other moving with it.
 * ------------------------------------------------------------------------ */

/**
 * The Treble's body: three tergites stern first as `tergites` takes them,
 * `[x, half-length, half-height, half-beam]`, the ridge they carry, and the
 * rostrum and telson that close it — metres, bow at +8 and stern at −8, the
 * 16 m of `hullLengthM`. The Dredge's ridge rather than the Chorister's
 * seam, because the craft is PR-4 like the hull that built it and wears the
 * deep armour its carrier's head and tail wear, drawn at a craft's `lift`:
 * the Dredge's half-metre is a quarter of this plate's height.
 *
 * The widest plate is the middle one and the fore plate the shortest, so
 * the plan is a stubby lozenge with a point — "stubby for the Directorate",
 * which is what the hand-drawn outline this retires already said — and a
 * spine-gun off the centreline to port of the fore plate, `gun`, which the
 * plan below counts because its muzzle stands a hand outside the plate's
 * taper. `lugs` is the waist station where a cradle's clasps close.
 */
export const trebleBody = {
  segments: [
    [-3.6, 3, 1.8, 2.7],
    [0, 3.4, 2.2, 3.4],
    [3.4, 2.8, 1.9, 2.8],
  ],
  ridge: { at: -0.75, size: [0.25, 1.1, 0.92], lift: 0.15 },
  rostrum: { tip: 8, r: 1.3, length: 5, facets: 6 },
  telson: { tip: -8, r: 1.1, length: 3, facets: 6 },
  gun: { x: 3.9, z: -0.8, r: [0.3, 0.22], length: 4.4 },
  lugs: { x: 0, z: 3.3, size: [1.4, 0.8, 0.7] },
};

/**
 * A body's half-beam at station `x` in plan: the widest of its plates, its
 * ridges, its rostrum and telson cones and its gun there, or 0 where
 * nothing is. The plates are taken at their full scale — a low-facet orb
 * reaches a little less, so the figure errs outboard, which is the side a
 * berth cut to it should err on. Port and starboard are one figure: the
 * gun is to port and counts on both sides, because a cradle is cut to the
 * craft whichever way round it is laid in.
 */
export function bodyHalfBeam(body, x) {
  const { segments, ridge, rostrum: ro, telson: te, gun } = body;
  const cap = (u, s) => (Math.abs(u) < 1 ? s * Math.sqrt(1 - u * u) : 0);
  let h = 0;
  for (const [cx, sx, , sz] of segments) {
    h = Math.max(h, cap((x - cx) / sx, sz));
    if (ridge) {
      const u = (x - cx - ridge.at * sx) / (ridge.size[0] * sx);
      h = Math.max(h, cap(u, ridge.size[2] * sz));
    }
  }
  if (ro && x >= ro.tip - ro.length && x <= ro.tip)
    h = Math.max(h, (ro.r * (ro.tip - x)) / ro.length);
  if (te && x >= te.tip && x <= te.tip + te.length)
    h = Math.max(h, te.r * (1 - (x - te.tip) / te.length));
  if (gun && Math.abs(x - gun.x) <= gun.length / 2) h = Math.max(h, Math.abs(gun.z) + gun.r[0]);
  return h;
}

/**
 * A body's envelope in plan, grown `grow` metres outboard all round:
 * returns the half-beam at a station as a function of `x`. The plan is
 * swept by a disc of `grow + smooth` — a true offset, which rounds the
 * transom's corners and carries the bow point forward — and then drawn in
 * by `smooth`, which closes every notch narrower than about twice
 * `smooth`: the step where the telson leaves the last plate, the flare of
 * each ridge past its plate. A berth is cut to the craft's envelope, not
 * to its notches; at `smooth` 0 it is the plain offset.
 */
export function bodyEnvelope(body, grow = 0, smooth = 0) {
  const bow = body.rostrum.tip;
  const stern = body.telson.tip;
  const g = grow + smooth;
  const fine = 0.1;
  const raw = [];
  for (let x = stern; x <= bow + 1e-9; x += fine) raw.push([x, bodyHalfBeam(body, x)]);
  return (x) => {
    let h = -Infinity;
    for (const [xp, hp] of raw) {
      const d = Math.abs(x - xp);
      if (d <= g) h = Math.max(h, hp + Math.sqrt(g * g - d * d));
    }
    return Math.max(h - smooth, 0);
  };
}

/**
 * A body's plan as a closed `[x, z]` polygon for the kit's `plan`, off
 * `bodyEnvelope` at `grow` and `smooth`: the transom `grow` astern of the
 * telson's base ring, the starboard side forward at `step`, the bow point
 * `grow` ahead of the rostrum's, and the port side aft. `to` cuts it
 * square at a station short of the bow — the cradle's coaming stops at its
 * mouth — and `side` returns one side only, stern first, for a builder
 * stitching two contours into one outline.
 */
export function bodyPlan(body, grow = 0, { step = 1, to, side, smooth = 0 } = {}) {
  const bow = body.rostrum.tip + grow;
  const stern = body.telson.tip - grow;
  const end = to ?? bow;
  const hb = bodyEnvelope(body, grow, smooth);
  const starboard = [];
  for (let x = stern; x < end - 1e-6; x += step) starboard.push([+x.toFixed(4), hb(x)]);
  starboard.push([end, to === undefined ? 0 : hb(end)]);
  if (side === 's') return starboard;
  if (side === 'p') return starboard.map(([x, z]) => [x, -z]);
  // Bow to stern down the starboard side, then stern to bow up the port.
  const port = starboard.filter(([, z]) => z > 1e-6).map(([x, z]) => [x, -z]);
  return [...[...starboard].reverse(), ...port];
}

/**
 * The craft's spine-gun: the Chorister's barrel at a craft's scale, and the
 * one part of `spineGun` a craft cannot take — its mount, which is 2.4 m of
 * block on a 50 m hull and would be a third of a Treble's beam. So the
 * mount's size and seat are given, and the names are the Chorister's.
 */
export function craftGun(root, { steel, black }, { x, y, z, r, length, mount }) {
  const [breech, muzzle] = r;
  add(root, 'spine_gun', cyl(muzzle, breech, length, 6), steel, [x, y, z], [0, 0, -Math.PI / 2]);
  add(root, 'spine_gun_mount', box(...mount.size), black, mount.at);
}

/**
 * The clasp lugs: two steel blocks at a craft's waist, `x`, standing
 * `size[2]` out of the flank at half-beam `z`, on the hull axis — where a
 * cradle's clasps close on a craft that is aboard. Machinery and unlit, so
 * a matched pair, as `limbs` is.
 */
export function claspLugs(root, steel, { x, y = 0, z, size }) {
  bothSides((side, sgn) =>
    add(root, `clasp_lug_${side}`, box(...size), steel, [x, y, sgn * (z + size[2] / 2 - 0.3)])
  );
}

/** Is `[x, z]` inside the closed polygon `poly`? Even-odd, for sampling a footprint. */
function inside([x, z], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * The cradles: berths on a carapace's back, each cut to `craft` — the
 * body a flight is built from (`trebleBody`) — and built empty, because a
 * craft aboard is not an entity and a craft in the water is drawn as its
 * own (docs/systems-combat.md §15): modelled in, it would be drawn twice
 * whenever the flight is out. The berth says what fits it instead.
 *
 * `cradles` is `[{ side, x, z }]`, `z` unsigned and the side signing it
 * (port −z, #642), each laid with the craft's bow `cant` radians outboard
 * of dead ahead on its own side, so that a rank reads as ribs swept
 * forward; a mirrored pair across the keel is refused. Each is a frame of
 * its own, `cradle_${side}${i}`, and the frame is the **seat**: its origin
 * is where the craft's own origin goes when it is aboard — the centre of
 * its length, on its hull axis — its +X the craft's bow and its +Y the
 * deck's normal, so a craft's GLB placed at the node's transform sits in
 * the berth (the floor is `seat` under the origin, the craft's belly and a
 * hand of water). No runtime reads that today; it is what a renderer that
 * one day draws the deck's count would read, and it costs nothing.
 *
 * Seated on the shell, which is a dome and not a deck: the berth's plane is
 * the least-squares fit of `crown(x, z)` over its footprint, lifted until
 * no sample of the shell stands within `margin` of the floor's top, so the
 * shell never shows through the floor from above — the rack's lesson
 * (`chargeRack`, #785). The floor and the coaming then run down into the
 * shell past the deepest point of the footprint by `bury`, so the conn
 * view's 55° sees a wall and never a gap. A berth that overhangs the shell
 * anywhere is refused.
 *
 * In the frame, seven parts: three, and two pairs. A `_floor`, the craft's
 * plan grown `clearance` all round and closed over its notches by `smooth`
 * (`bodyPlan`, `bodyEnvelope`), in `black` — the dark the chart sees,
 * shaped like the craft that is not in it, and running out ahead of the
 * mouth as a tongue to the rostrum's point. A `_coaming`, a
 * steel U of `coaming.w` round the floor from the mouth aft, standing
 * `coaming.proud` above it and open at the mouth, `mouth` metres forward
 * of the craft's origin — the Slipway's slip, open at the end a hull
 * leaves by. A `_sill` lying on the floor across the mouth in `lamp`, the
 * Slipway's lit launch sill and the berth's one resting light. Two
 * `_mandible_k`, steel cones at the ends of the U's arms laid forward and
 * yawed `mandibles.yaw` outboard, the Slipway's launch mandibles at a
 * berth's scale. Two `_clasp_k`, black spikes standing on the coaming at
 * the craft's waist (`craft.lugs.x`), leaned `clasps.lean` outboard: open,
 * with nothing aboard to close on — the Slipway's gantry claws.
 *
 * The launch itself — the deck opening, the craft clearing it, +35 for
 * the spike — is a transient and is not modelled (docs/models-plan.md
 * §3.2, rule 3); the sill is lit at every posture and is what the chart
 * counts. Returns each berth's seat, `[{ name, at, rot, lift, gap }]`.
 */
export function cradles(root, { black, steel, lamp: lampMat }, opts) {
  const {
    crown,
    craft,
    cradles: list,
    cant = 0.5,
    clearance = 0.6,
    seat: seatGap = 0.1,
    margin = 0.25,
    bury = 1,
    step = 1,
    smooth = 1.2,
    mouth = 4.5,
    coaming = { w: 1.3, proud: 1.3 },
    sill = { d: 0.7, h: 0.3 },
    mandibles = { r: 0.7, length: 4.5, yaw: 0.3 },
    clasps = { r: 0.5, length: 4, lean: 0.75, sink: 0.4 },
  } = opts;
  // The craft's belly: the lowest of its plates and ridges under its axis.
  const { ridge } = craft;
  const belly = Math.max(
    ...craft.segments.map(([, , sy]) => sy),
    ...(ridge ? craft.segments.map(([, , sy]) => ridge.size[1] * sy - ridge.lift) : [])
  );
  const seat = belly + seatGap;
  const floorPlan = bodyPlan(craft, clearance, { step, smooth });
  const outer = bodyPlan(craft, clearance + coaming.w, { step, smooth, to: mouth, side: 's' });
  const inner = bodyPlan(craft, clearance, { step, smooth, to: mouth, side: 's' });
  // The U: the outer contour from the mouth aft round the transom and
  // forward to the mouth on the other side, then the inner the other way.
  const flip = (pts) => pts.map(([x, z]) => [x, -z]);
  const U = [
    ...[...outer].reverse(),
    ...flip(outer),
    ...[...flip(inner)].reverse(),
    ...inner,
  ];
  const footprint = [...floorPlan];
  const hbAt = (x, grow) => bodyEnvelope(craft, grow, smooth)(x);
  // Samples of the footprint in the craft's own frame: every vertex of the
  // floor and of the U, and a metre grid inside the U's outer contour.
  const outerAll = bodyPlan(craft, clearance + coaming.w, { step, smooth });
  const samples = [...floorPlan, ...U];
  const xs = outerAll.map(([x]) => x);
  const zs = outerAll.map(([, z]) => z);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1)
    for (let z = Math.min(...zs); z <= Math.max(...zs); z += 1)
      if (inside([x, z], outerAll)) samples.push([x, z]);

  const count = { p: 0, s: 0 };
  const placed = list.map(({ side, x: xc, z }) => {
    if (side !== 'p' && side !== 's')
      throw new Error(
        `cradle_${side}: side is '${side}' — 'p' (port, -z) or 's' (starboard, +z)`
      );
    const i = count[side]++;
    const sgn = side === 'p' ? -1 : 1;
    const zc = sgn * z;
    const name = `cradle_${side}${i}`;
    const a = sgn * cant;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const across = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const world = ([u, w]) => [xc + u * d.x + w * across.x, zc + u * d.z + w * across.z];
    // Fit the deck's plane over the footprint, as the shell has it.
    const pts = samples.map((s) => {
      const [wx, wz] = world(s);
      const y = crown(wx, wz);
      if (!Number.isFinite(y))
        throw new Error(
          `${name}: no shell under the berth at x = ${wx.toFixed(1)}, z = ${wz.toFixed(1)}`
        );
      return [wx, wz, y];
    });
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n;
    const mz = pts.reduce((s, p) => s + p[1], 0) / n;
    const my = pts.reduce((s, p) => s + p[2], 0) / n;
    let sxx = 0;
    let sxz = 0;
    let szz = 0;
    let sxy = 0;
    let szy = 0;
    for (const [px, pz, py] of pts) {
      const dx = px - mx;
      const dz = pz - mz;
      const dy = py - my;
      sxx += dx * dx;
      sxz += dx * dz;
      szz += dz * dz;
      sxy += dx * dy;
      szy += dz * dy;
    }
    const det = sxx * szz - sxz * sxz;
    const gx = (sxy * szz - szy * sxz) / det;
    const gz = (szy * sxx - sxy * sxz) / det;
    const plane = (px, pz) => my + gx * (px - mx) + gz * (pz - mz);
    const rise = Math.max(...pts.map(([px, pz, py]) => py - plane(px, pz)));
    const lift = rise + margin;
    const gap = Math.max(...pts.map(([px, pz, py]) => plane(px, pz) + lift - py));
    // The seat's frame: +Y the plane's normal, +X the craft's bow laid on
    // the plane, +Z their cross — starboard of the craft, as the kit's is.
    const up = new THREE.Vector3(-gx, 1, -gz).normalize();
    const bowAxis = d.clone().sub(up.clone().multiplyScalar(d.dot(up))).normalize();
    const beamAxis = new THREE.Vector3().crossVectors(bowAxis, up);
    const e = new THREE.Euler().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(bowAxis, up, beamAxis),
      'XYZ'
    );
    const floorTop = [xc, plane(xc, zc) + lift, zc];
    const at = [floorTop[0] + up.x * seat, floorTop[1] + up.y * seat, floorTop[2] + up.z * seat];
    return { name, side, at, rot: [e.x, e.y, e.z], lift, gap, zc, xc };
  });
  refuseMirror('cradle', placed.map(({ name, xc, zc }) => [name, xc, 0, zc]), 2);

  const floorT = (gap) => gap + bury;
  placed.forEach(({ name, at, rot, gap }) => {
    const frame = group(root, name, { at, rot });
    const T = floorT(gap);
    add(frame, `${name}_floor`, plan(footprint, T), black, [0, -seat - T / 2, 0]);
    const Tc = T + coaming.proud;
    add(frame, `${name}_coaming`, plan(U, Tc), steel, [0, -seat + coaming.proud - Tc / 2, 0]);
    const width = 2 * hbAt(mouth, clearance);
    add(frame, `${name}_sill`, box(sill.d, sill.h, width), lampMat, [
      mouth - sill.d / 2,
      -seat + sill.h / 2 - 0.05,
      0,
    ]);
    // The mandibles: a cone's apex is +Y, rolled onto +X by −π/2 about Z
    // (`rostrum`), then yawed outboard — −yaw about Y turns +X toward +Z.
    const armZ = hbAt(mouth, clearance + coaming.w / 2);
    [1, -1].forEach((s, k) => {
      const dir = [Math.cos(mandibles.yaw), 0, s * Math.sin(mandibles.yaw)];
      const half = mandibles.length / 2;
      add(
        frame,
        `${name}_mandible_${k}`,
        spike(mandibles.r, mandibles.length),
        steel,
        [mouth + dir[0] * half, -seat + coaming.proud / 2, s * armZ + dir[2] * half],
        [0, -s * mandibles.yaw, -Math.PI / 2]
      );
    });
    // The clasps: standing on the coaming's crest at the craft's waist and
    // leaned outboard about X — open, with nothing aboard to close on.
    const waist = craft.lugs?.x ?? 0;
    const clampZ = hbAt(waist, clearance + coaming.w / 2);
    [1, -1].forEach((s, k) => {
      const reach = clasps.length / 2 - clasps.sink;
      add(
        frame,
        `${name}_clasp_${k}`,
        spike(clasps.r, clasps.length, 5),
        black,
        [
          waist,
          -seat + coaming.proud + Math.cos(clasps.lean) * reach,
          s * (clampZ + Math.sin(clasps.lean) * reach),
        ],
        [s * clasps.lean, 0, 0]
      );
    });
  });
  return placed.map(({ name, at, rot, lift, gap }) => ({ name, at, rot, lift, gap }));
}
