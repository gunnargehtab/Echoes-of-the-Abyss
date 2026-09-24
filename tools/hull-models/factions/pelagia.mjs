/**
 * The Pelagia Commune — the Veil's shape language.
 *
 * "Organic, curved, asymmetric — silhouettes read as leaves, seed-pods and
 * swimming things. Grown chitin-and-algae composite hull with growth rings and
 * living bioluminescent veins; nothing is painted" (docs/asset-prompts-3d.md,
 * Block 2).
 *
 * The vocabulary is read off the Sower, the Spinner and the Harvester, whose
 * node names are the parts list:
 *
 *   Sower      bloom_bed · bed_underside · rib_0..6 · rib_vein_0..6 · bladder ·
 *              bladder_ring_0..1 · bud · seed_pod_0..5 · pod_cap_0..5 · stem ·
 *              stem_ring_0..2 · stem_keel · caudal_p/s · leaf_tip ·
 *              edge_light_p0..2/s0..2 · stem_light
 *   Spinner    pod_body · growth_ring_0..2 · mine_sac_0..3 · sac_bud_0..3 ·
 *              pectoral_p/s · fluke_p/s · dorsal_blade · spinneret · nav_bow ·
 *              nav_dorsal · dorsal_vein
 *   Harvester  hull · cargo_lobe_port/starboard · growth_ring_1..5 ·
 *              baleen_plate_1..7 · feed_tendril_* · paddle_* · tail_fluke_*
 *
 * Three rules fall out of those, and they are what this module holds rather
 * than any one hull:
 *
 * - **Beam is body, not wing.** Where the Order carries its width in a planar
 *   wing off a spar, the Commune's width *is* the hull — a pod swollen at the
 *   waist, a leaf spread flat — and every body is squashed, wider than it is
 *   tall (the Spinner's pod is 16.8 m across and 11.8 m tall; the Sower's
 *   bladder 18 m by 9). A round section reads as a machine; a flattened one as
 *   a swimming thing. `squash` is therefore a parameter on every body here.
 * - **Grown, so nothing is quite regular.** Rings and pods differ in size from
 *   one to the next; pods sit where they grew, never in a rank; the
 *   Harvester's growth rings each tilt a few degrees off square. The series
 *   are still loops — they just carry a wobble, and the builders refuse a
 *   mirrored pair where the model shows the navy growing each side its own way.
 * - **Light is a vein, not a lamp.** The Commune has the lowest SIG in the
 *   game, so its lit parts are a thread along a rib, one bud at the node, a
 *   nav mark: flat strips on upward faces, because the maps are top-down
 *   (kit.mjs). The Sower's whole resting light is seven strips and a bud.
 *
 * Pod and ring facet counts are the approved models' own and stay low: the
 * style asks for something grown and faceted, not a smooth render.
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
  sweep,
  uvAlike,
  bothSides,
  polar,
  part,
  drawn,
  capsule,
  group,
  pointLight,
  sidedPost,
  xLong,
  zLong,
  eulerXYZ,
} from '../kit.mjs';

/**
 * The Commune's palette: one factory a material name, for every model of
 * the navy (#888, Phase 6 of #540). The recolour throws a model's hue away
 * and keeps the ratio between its materials and the metalness and
 * roughness they were authored at (rosterModels.ts `recolor`, gate 4), so
 * one name at two finishes is two different surfaces on two hulls a player
 * sees side by side — "one name, one value, across a navy",
 * docs/asset-prompts-3d.md Block 2b rule 3, which finishes.mjs measures
 * over the committed files. Until #888 this module held a table per
 * authoring pass — `scoutInk`, `fleetInk`, `structureInk`, `bastionInk`,
 * `worksInk`, `veilInk`, `submersibleInk` — each a copy of its export's own
 * values, and eight names split. Re-finishing the navy is one edit here
 * now, and check.mjs compares the finish under the name, so an edit here
 * that is not re-run through every script fails.
 *
 * The values are the hulls' — the Sower's pass, which fourteen models
 * carried — and where a name was split the other passes were brought onto
 * them (Block 2b, "One name, one value — held since #888": "the hull value
 * is canonical"):
 *
 * - `chitin_hull`, `growth_ridge`, `algae_membrane`: the Corvette, the
 *   Cruiser and the Harvester carried a glossier r184 finish — chitin at
 *   0.2 metal and 0.28 rough, the ridge #14332A at 0.12 and 0.45, the
 *   membrane at 0.15 and 0.32 — and the Light Scout a third: 0.05 and
 *   0.55, #14332A at 0.03 and 0.7, 0.04 and 0.5. All four now carry the
 *   Sower's.
 * - `algae_membrane` is single-sided. Those four had it two-sided, and no
 *   membrane part on any of them is an open sheet: every blade, pectoral,
 *   paddle and fluke is a `membranes` extrusion, 0.028 to 0.035 units thick
 *   with both caps, so one side shows no hole (#878 is the open-sheet
 *   case). The fourteen others were single-sided already, so the value the
 *   hulls carry is also the one the geometry needs.
 * - `bio_light` sits on the navy's near-black base, #0A1A08 at 0.4 rough
 *   (kit.mjs `lamp`). Those four carried the token as its own base,
 *   #8FE36B at 0.35, which made a lamp's *base* the brightest colour on the
 *   Harvester and the Scout and so the anchor the conn view set their
 *   whole cladding register by; the membrane is now, as on the Spinner,
 *   the Glider, the Drifter and the Weaver, the other four hulls with no
 *   spore pod, whose register the two now match exactly (the Sower and
 *   eight more hulls anchor on `spore_pod`, and the Submersible with them
 *   since #891). The light is untouched: same emissive, each model's own
 *   strength. Since #891 it is the token's lamp on every model but for
 *   the Cruiser's frill: the structures' `biolight_green` (#14351A at
 *   0.35), the Submersible's `biolum-vein` (#14301A), the Veil's
 *   `bio-vein` and `bio-vein-dim` (#0F2A12 at 0.45 and 0.5) and the
 *   Cruiser's `bio_vein_lit` (#2A4A20, a green rather than a near-black)
 *   were one light on four bases under five names, and are this one on its
 *   hull base, each file's strength kept — the Veil carries it at 2.2 on
 *   the breathing lines and 0.9 on the stalk tips, the Cruiser at 1.6 on
 *   the buds and 1.5 on the lit rings and flank veins: one fixture at two
 *   loudnesses in one file.
 * - `algae_hull` is a structure name on no hull. The Bastion, the Foundry
 *   and the Refinery carry the algae token #1FA67A at 0.08 and 0.6; the
 *   Sentinel Turret carried #14664C at 0.62, a shade the docs do not name.
 *   Three models against one and the token against a derived shade: the
 *   turret moved. Their lamp, `biolight_green`, was the same story on a
 *   #14351A base against the turret's #123018, settled the same way; it
 *   is `bio_light` since #891 (above).
 * - `algae-teal` and `spore-pale` were two of the ten hyphenated names
 *   the r184 pass gave the Abyssal Submersible and the Spore Veil, and the
 *   two that split: #888 brought the Veil onto the Submersible's 0.1 / 0.7
 *   and 0.05 / 0.65 and left the ten their names, a fold being a finish
 *   decision of its own. #891 made it. Every one of the ten that shares
 *   its hex with a name of the navy's is that name, at the hulls' value or
 *   the structures' where the structures have a name of their own:
 *   the Submersible's `chitin-hull`, `algae-teal`, `spore-pale` and
 *   `biolum-vein` are `chitin_hull`, `algae_membrane`, `spore_pod` and
 *   `bio_light`; the Veil's `deep-chlorophyll` and `algae-teal` are the
 *   structures' `deep_chlorophyll` and `algae_hull`, its `spore-pale` is
 *   `spore_pod`, and its `bio-vein` and `bio-vein-dim` are `bio_light`
 *   (`bio-vein` was never `bio_vein`, the token against the Sower's
 *   #5FAE42 — it was `bio_light` under another name). Three keep their
 *   value and lose the hyphen: `growth_ring_dark` and `algae_teal_dark`,
 *   hexes of their own (the rings' #123C2E sits a shade off `growth_ridge`'s
 *   #14382C and stays, the rule being by hex), and `spore_haze`, a fixture
 *   of its own whose hex is `bio_light`'s light. In the same
 *   change `spore_pale`, the structures' name for the spore token at
 *   exactly `spore_pod`'s value, folded onto it.
 *
 * No lamp changed colour, so no strength moved. Every lamp takes
 * `intensity`, the `KHR_materials_emissive_strength` the file carries, and
 * each script passes its model's own: it is the one knob that reaches the
 * conn view — the bake calibrates a map's energy onto E(SIG) whatever the
 * file says, but the conn view keeps a lamp's authored strength as its
 * resting one (rosterModels.ts `applyLiveGlow`) — so a hull the block calls
 * *faint* has to be faint in the file. The default is the kit's 1, which
 * the Sower's pass burns at; the Drifter's seams and the Glider's wing vein
 * burn at 0.2, the shared kinds at 0.9 to 1.6, the Submersible at 2.2 and
 * the structures at 0.35 (the Veil's haze) to 3.84 (the Foundry's forge).
 *
 * The four tokens are docs/art-direction.md's; where a model needed a
 * colour the docs do not name, that model's own hex, exactly (kit.mjs
 * `hex`). `bio_vein`'s #5FAE42 is the Sower's own — a hue of its own, not
 * the biolight token dimmed (its linear channels are 0.42, 0.55 and 0.37
 * of the bud's) — which is the difference between a thread along a rib and
 * a bud. `bio_vein_unlit` is the vein family's *unlit* finish: `bio_vein`'s
 * base worn as cladding, at the lamp's own roughness, by a part the block
 * lights only in a later band — the Glider's tail veins, which light only
 * while the drive turns and are built with it cut. A lamp dark at rest is
 * a lamp this pipeline never shows (docs/models-plan.md §3.2), so the part
 * carries the family's base and no emissive, as the Directorate's
 * `biolight_unlit` does on the Verger's bay doors (#783).
 *
 * The structures carry their own names rather than a dimming factor on
 * the hulls', because "nearly black — an ambush predator, navigation marks
 * only until it fires" (the Sentinel Turret block) is not the same
 * darkening in each navy: `deep_chlorophyll` is the chitin hex at 0.1 and
 * 0.65 and `grown_steel` the fitted things — collars, pipes, tanks. The
 * works' two lamps of the spore token, `forge_light` ("interior forge
 * light spilling from the bay") and `floodlight_pale` ("floodlit working
 * surfaces"), are polished to 0.3. The Cruiser's `sensor_frill_lit` is its
 * own: a lit membrane on a green of its own, two-sided like the sheet it
 * is, so a lit sheet rather than a lamp on a base. The Veil's `spore_haze`
 * is the one translucent material on any Commune model — the token as its
 * own base at 0.16 opacity, blended, rough 1, "exhaling a faint haze" —
 * and keeps that base, being a glow with nothing under it rather than a
 * lamp on a base: the one lamp in the navy whose base is its own light,
 * left so on purpose where #891 moved every lamp that sat on a token
 * (Block 2b records it).
 */
export const ink = {
  // The hulls — the Sower's pass, on eighteen models.
  chitinHull: () => clad('chitin_hull', hex('#0B241E'), 0.08, 0.6),
  growthRidge: () => clad('growth_ridge', hex('#14382C'), 0.1, 0.65),
  algaeMembrane: () => clad('algae_membrane', hex('#1FA67A'), 0.05, 0.55),
  sporePod: () => clad('spore_pod', hex('#E8F0A3'), 0.05, 0.5),
  bioVein: (intensity = 1) => lamp('bio_vein', hex('#5FAE42'), hex('#061206'), 0.4, intensity),
  bioVeinUnlit: () => clad('bio_vein_unlit', hex('#061206'), 0, 0.4),
  // The token's lamp, on every model since #891 (the header).
  bioLight: (intensity = 1) => lamp('bio_light', hex('#8FE36B'), hex('#0A1A08'), 0.4, intensity),
  // The Cruiser's own (the header).
  sensorFrillLit: (intensity = 1) => {
    const m = lamp('sensor_frill_lit', hex('#8FE36B'), hex('#3F6B2E'), 0.4, intensity);
    m.side = THREE.DoubleSide;
    return m;
  },
  // The structures: the turret, the Bastion and the two works.
  deepChlorophyll: () => clad('deep_chlorophyll', hex('#0B241E'), 0.1, 0.65),
  grownSteel: () => clad('grown_steel', hex('#22302C'), 0.35, 0.45),
  algaeHull: () => clad('algae_hull', hex('#1FA67A'), 0.08, 0.6),
  forgeLight: (intensity = 1) =>
    lamp('forge_light', hex('#E8F0A3'), hex('#2E3A16'), 0.3, intensity),
  floodlightPale: (intensity = 1) =>
    lamp('floodlight_pale', hex('#E8F0A3'), hex('#3A3F1E'), 0.3, intensity),
  // What the r184 pass's names left once #891 folded the rest (the
  // header): the Abyssal Submersible's dark growth rings and the Spore
  // Veil's dark teal and its haze — hexes nothing else in the navy carries,
  // at the files' values, without the hyphens.
  growthRingDark: () => clad('growth_ring_dark', hex('#123C2E'), 0.1, 0.85),
  algaeTealDark: () => clad('algae_teal_dark', hex('#11563F'), 0.05, 0.8),
  sporeHaze: (intensity = 1) => {
    const m = lamp('spore_haze', hex('#8FE36B'), hex('#8FE36B'), 1, intensity);
    m.transparent = true;
    m.opacity = 0.16;
    return m;
  },
};

/** A grown orb: few facets, and squashed by the caller — never round in section. */
const orb = (w = 12, h = 6) => new THREE.SphereGeometry(1, w, h);

/**
 * A growth ring as the approved Sower and Spinner carry every one of theirs:
 * a ridge lathed round the length axis, from `shoulder` up to `crown` and
 * back over ±`halfWidth`, `facets` round — not a torus. A torus of the same
 * crown reads the same from a sprite away and carries twice the triangles
 * and twice the surface; the first port of these hulls drew toruses, and
 * `diff.mjs` against the approved binaries is what caught it (#639). The
 * Vent Tap's `bladderHead` below lathes its rings the same way.
 *
 * Two option shapes in this module end here — `ring`, a rise over the station
 * radius the builder already knows, and `band`, the four radii in metres for
 * a run of rings all one size — and handing it the other one lathed a profile
 * of `NaN`: three writes that out as a part with no vertices and no bounds,
 * and every gate downstream counts it as a part that agrees (#646). So it
 * refuses rather than lathing it.
 */
const ridgeRing = ({ crown, shoulder, halfWidth, facets }) => {
  for (const [k, v] of Object.entries({ crown, shoulder, halfWidth, facets }))
    if (!Number.isFinite(v))
      throw new Error(`ridgeRing: ${k} is ${v} — a ridge is crown, shoulder, halfWidth, facets`);
  return loft(
    [
      [-halfWidth, shoulder],
      [0, crown],
      [halfWidth, shoulder],
    ],
    facets
  );
};

/**
 * A blade standing on a back — the Spinner's dorsal blade, the Sower's stem
 * keel: a plan rectangle from `from` to `to`, `t` across, raised `height`
 * and centred on y = 0. An extrusion rather than a box because that is what
 * both approved exports are: the same eight vertices, but an extrusion cuts
 * its two caps on one diagonal and its walls from its first corner, where a
 * box cuts opposite faces opposite ways, and `diff.mjs` reads a box in an
 * extrusion's place as ten of twelve triangles re-cut (#639). The corners
 * run from the fore end's port side, the start the exports were cut from.
 */
const blade = (from, to, height, t) =>
  plan(
    [
      [to, -t / 2],
      [to, t / 2],
      [from, t / 2],
      [from, -t / 2],
    ],
    height
  );

/** Refuse a mirrored pair: the Commune grows each side its own way. */
function refuseMirror(what, items, key) {
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (key(items[i]) === key(items[j]))
        throw new Error(`${what}: ${i} and ${j} are a matched pair — grown things do not mirror`);
}

/**
 * The pod body: a spindle swollen at `waist` (a fraction of the length from
 * the stern, between 0.34 and 0.66), pointed at both ends, and squashed to
 * `squash` of its beam in height. The Spinner's is 55 m on a 16.8 m beam,
 * squashed 0.7. This is the swimming-thing body every Commune hull that is
 * not a leaf starts from.
 *
 * The stations either side of the waist are the approved Spinner's own, and
 * they are symmetric about it: the profile draws in to a point at the same
 * rate forward and aft, and `waist` alone says which end the swelling favours.
 * The first transcription of this builder was fuller amidships and asymmetric
 * by a station, which is the kind of drift a vocabulary with no consumers
 * cannot notice — building the Spinner from it is what noticed.
 *
 * `profile` replaces those stations with the hull's own `[x, r]` list. The
 * fractions above are the Spinner's stations rounded to three places, and
 * rounding moves its ±24 m rings two centimetres and closes its ends to a
 * point where the export leaves them 0.2 m open; a port passes the stations
 * as the binary carries them (#639).
 */
export function podBody(root, mat, opts) {
  const { bow, stern, maxR, waist = 0.5, squash = 0.7, facets = 12, name = 'pod_body' } = opts;
  const { profile } = opts;
  const L = bow - stern;
  const at = (t) => stern + L * t;
  return add(
    root,
    name,
    loft(
      profile ?? [
        [at(0), 0],
        [at(0.064), maxR * 0.19],
        [at(0.209), maxR * 0.536],
        [at(waist - 0.109), maxR * 0.905],
        [at(waist), maxR],
        [at(waist + 0.109), maxR * 0.905],
        [at(0.791), maxR * 0.536],
        [at(0.936), maxR * 0.19],
        [at(1), 0],
      ],
      facets
    ),
    mat,
    [0, 0, 0],
    [0, 0, 0],
    [1, squash, 1]
  );
}

/**
 * Growth rings around a body: a torus at each `[x, r]` station, squashed with
 * the body. `wobble` (radians) tilts each ring a little off square, in a
 * pattern fixed by its index so a rebuild is a rebuild — the Harvester's rings
 * lean up to five degrees, and it is the one thing that makes them read as
 * grown rather than turned.
 *
 * `ring` = `{ rise, facets, halfWidth? }` says how each one is lathed
 * (`ridgeRing`): the crown at `r + tube`, the shoulders `rise` below it,
 * `halfWidth` (the tube, unless said) either side. The Spinner's three are
 * 0.7 m ridges on eighteen facets, which is what its approved export holds.
 * It is not optional, and the torus this builder first drew is gone with it:
 * every ring on every approved Commune hull is a ridge, so a torus here was
 * a default no model has and only the caller's `ring` kept out of the file.
 */
export function growthRings(root, mat, opts) {
  const { stations, squash = 0.72, tube = 0.9, wobble = 0, name = 'growth_ring', ring } = opts;
  stations.forEach(([x, r], i) =>
    add(
      root,
      `${name}_${i}`,
      ridgeRing({
        crown: r + tube,
        shoulder: r + tube - ring.rise,
        halfWidth: ring.halfWidth ?? tube,
        facets: ring.facets,
      }),
      mat,
      [x, 0, 0],
      [wobble * Math.sin(1 + i * 2.4), wobble * Math.cos(2 + i * 1.7), 0],
      [1, squash, 1]
    )
  );
}

/**
 * The bloom bed: a broad flat leaf from a plan outline, `depth` thick and
 * centred on `y`, with a smaller chitin plate under it where the membrane is
 * backed. The Sower's is the one hull in the roster wider at the bow than at
 * the waist, and its whole 54 m beam is this plate — beam as body.
 *
 * `bevel` chamfers the leaf's margin (kit.mjs `plan`), and the Sower's is a
 * metre: the margin is where a leaf reads as grown rather than cut, and it is
 * also the part of this hull a scope sees most of. The backing plate takes no
 * bevel — it is under the membrane and nothing looks at its rim.
 */
export function bloomBed(root, mats, opts) {
  const { membrane, chitin } = mats;
  const { outline, y = 0, depth, bevel = 0, underside } = opts;
  add(root, 'bloom_bed', plan(outline, depth, bevel), membrane, [0, y, 0]);
  if (underside)
    add(root, 'bed_underside', plan(underside.outline, underside.depth), chitin, [
      0,
      underside.y,
      0,
    ]);
}

/**
 * Ribs radiating from a node across a leaf, each with its lit vein riding on
 * top. `midrib` runs straight forward from the node; `flank` lists the ribs
 * down one flank as `[length, yaw]`, yaw in radians off the midrib, and the
 * other flank is mirrored — the Sower's ribs are the one Commune series that
 * is bilateral, because a leaf's venation is. Numbered as the Sower numbers
 * them: the midrib is rib_0, then the starboard ribs, then the port.
 *
 * `r` is a rib's radius where it springs from the node and `tip` its radius
 * at the far end — the approved Sower's taper from 1.1 m to 0.5 m, as a
 * leaf's ribs do, and the defaults here. Drawn untapered, as the first port
 * read them, each rib carries a third again the surface and its centroid
 * three metres further out (#639).
 */
export function ribFan(root, { ridge, vein }, opts) {
  const { node, y, midrib, flank, r = 1.1, tip = 0.5, veinFrac = 0.8, lift = 1.15 } = opts;
  const [nx, nz] = node;
  const ribs = [[midrib, 0]];
  for (const [len, yaw] of flank) ribs.push([len, -Math.abs(yaw)]);
  for (const [len, yaw] of flank) ribs.push([len, Math.abs(yaw)]);
  ribs.forEach(([len, yaw], i) => {
    const cx = nx + (len / 2) * Math.cos(yaw);
    const cz = nz - (len / 2) * Math.sin(yaw);
    add(root, `rib_${i}`, cyl(tip, r, len, 6), ridge, [cx, y, cz], [0, yaw, -Math.PI / 2]);
    add(
      root,
      `rib_vein_${i}`,
      box(len * veinFrac, 0.2, 0.5),
      vein,
      [cx, y + lift, cz],
      [0, yaw, 0]
    );
  });
}

/**
 * The pressure bladder at a leaf's node, ringed. A squashed orb — `squash`
 * is height over beam, and the Sower's is 0.5, the flattest body in the
 * navy — with growth rings at `rings` = `[dx, r]` offsets along it. `ring`
 * is `growthRings`' option and means the same here, torus and all gone the
 * same way: each ring a lathed ridge cresting at `r + 0.8`, its shoulders
 * `rise` below, `halfWidth` 0.8 unless said — the Sower's two are 0.7 m
 * ridges on sixteen facets.
 *
 * `name` and `z` are the Blight's: its spore sac is this orb sunk into
 * the back amidships in the `spore_pod` finish rather than chitin, a
 * little off the centreline, ringless and unlit (hulls/blight.mjs;
 * docs/models-plan.md §3.2 rule 4). The Sower's stays `bladder` on the
 * keel line.
 */
export function bladder(root, { chitin, ridge }, opts) {
  const { name = 'bladder', x, y, z = 0, r, squash = 0.5, rings = [], ring } = opts;
  const tube = 0.8;
  add(root, name, orb(16, 8), chitin, [x, y, z], [0, 0, 0], [r, r * squash, r]);
  rings.forEach(([dx, rr], i) =>
    add(
      root,
      `bladder_ring_${i}`,
      ridgeRing({
        crown: rr + tube,
        shoulder: rr + tube - ring.rise,
        halfWidth: ring.halfWidth ?? tube,
        facets: ring.facets,
      }),
      ridge,
      [x + dx, y, z],
      [0, 0, 0],
      [1, squash, 1]
    )
  );
}

/**
 * The one lit bud at the node: a squashed orb in `bio_light`, facing up.
 * `squash` is height over beam, and the default is the approved Sower's bud
 * — 1.4 m tall on 2.6 m across. `name` and `facets` are the Chorister's
 * `bladder_bud` — the bladder showing through the middle segment as a paler
 * dome, a ten-by-six orb in spore pale rather than a lamp
 * (hulls/chorister-pelagia.mjs), and squashed its own way.
 */
export function bud(root, light, opts) {
  const { name = 'bud', facets = [12, 6], x, y, z = 0, r, squash = 1.4 / 2.6 } = opts;
  add(root, name, orb(...facets), light, [x, y, z], [0, 0, 0], [r, r * squash, r]);
}

/**
 * Pods grown on a body: a squashed orb with a smaller cap on top, one each at
 * `[x, y, z, r]`. Every pod is its own size and sits where it grew — a
 * matched pair is refused. The Sower's seed pods and the Spinner's mine sacs
 * are the same construction with different proportions and names, so both
 * are exported from one builder below. Everything that differs between them
 * is a default on the export rather than on this shared body, `facets`
 * included — the pod orb's `[widthSegments, heightSegments]`, ten by six on
 * a seed pod and twelve by six on the Spinner's sacs, whose export carries a
 * vertex on both beams of the equator and so a hundred and twenty triangles
 * to a seed pod's hundred.
 */
function grownPods(root, { skin, cap }, opts) {
  const { pods, names, squash, capR, capLift, capSquash, facets } = opts;
  refuseMirror(names[0], pods, ([, , , r]) => r);
  pods.forEach(([x, y, z, r], i) => {
    add(root, `${names[0]}_${i}`, orb(...facets), skin, [x, y, z], [0, 0, 0], [r, r * squash, r]);
    add(
      root,
      `${names[1]}_${i}`,
      orb(8, 6),
      cap,
      [x, y + capLift * r, z],
      [0, 0, 0],
      [capR * r, capR * r * capSquash, capR * r]
    );
  });
}

/**
 * Seed pods on a bloom bed: pale `spore_pod` skin, a ridge cap. The numbers
 * are the approved Sower's — a cap 0.45 of its pod across and two thirds of
 * that tall, on a ten-by-six orb.
 */
export const seedPods = (root, mats, opts) =>
  grownPods(root, mats, {
    names: ['seed_pod', 'pod_cap'],
    squash: 0.7,
    capR: 0.45,
    capLift: 0.6,
    capSquash: 2 / 3,
    facets: [10, 6],
    ...opts,
  });

/**
 * Mine sacs at a pod's waist: membrane skin, a ridge bud — fuller than a seed
 * pod. The numbers are the approved Spinner's, twelve-facet orbs included.
 */
export const mineSacs = (root, mats, opts) =>
  grownPods(root, mats, {
    names: ['mine_sac', 'sac_bud'],
    squash: 0.8,
    capR: 0.4,
    capLift: 0.7,
    capSquash: 0.75,
    facets: [12, 6],
    ...opts,
  });

/**
 * The grown stem aft of a leaf: a squashed lathe of the hull's own `[x, r]`
 * stations, ringed at `rings`.
 *
 * `profile` is those stations and there is no parametric body behind it. The
 * approved Sower's stem is open at both ends — 0.3 m at the tail, 4.2 m where
 * it meets the node — on fourteen facets, which is the default cut; the body
 * the first port drew instead was closed to a point at both ends on eight,
 * and the numbers it was swelled from (`from`, `to`, `r`) went with it.
 *
 * `band` is the ring, lathed as a ridge (`ridgeRing`) in place of the torus
 * that stood there: `{ crown, shoulder, halfWidth, facets }` in **absolute
 * metres**, because a stem's rings are all one size and it has no per-station
 * radius to hang a fraction on. That is the other option shape in this module
 * and the reason it is not called `ring`: `growthRings` and `bladder` take a
 * `ring` that is a rise over the station radius they already know, and the
 * two were one name until #646.
 */
export function stem(root, { chitin, ridge }, opts) {
  const { profile, facets = 14, y = 0, squash = 0.8, rings = [], band } = opts;
  add(root, 'stem', loft(profile, facets), chitin, [0, y, 0], [0, 0, 0], [1, squash, 1]);
  rings.forEach((x, i) =>
    add(root, `stem_ring_${i}`, ridgeRing(band), ridge, [x, y, 0], [0, 0, 0], [1, squash, 1])
  );
}

/**
 * The keel blade on a stem's back: a `blade` (above) from `from` to `to`,
 * `height` tall and `t` thick, centred at `y`. Its own builder because the
 * approved Sower exports it *after* the caudal pair and `check.mjs` compares
 * in order — the first port drew it in the stem's turn and read as three
 * parts changed (#639).
 */
export function stemKeel(root, ridge, { from, to, height, y, t = 0.8 }) {
  add(root, 'stem_keel', blade(from, to, height, t), ridge, [0, y, 0]);
}

/**
 * Membrane fins, port and starboard: thin plates in `algae_membrane` lying
 * flat, mirrored about the keel. Each entry is `[name, corners, opts]`, the
 * corners four `[x, z]` in perimeter order on the **starboard** side; `opts.t` is
 * the thickness (0.4 m on the Spinner's flukes, 0.5 m on its pectorals and on
 * the Sower's caudals) and `opts.y` the height, defaulting to the call's.
 * Pectorals, flukes, caudals and paddles are all this.
 *
 * Four corners rather than a chord and a taper, because not one approved fin
 * is a symmetric trapezoid: the Sower's caudal trails five metres aft of its
 * root, the Spinner's pectoral rakes forward and its fluke aft. A taper about
 * the chord's centreline can draw a fin that is *pointed* and never one that
 * is *swept*, and a Commune fin that is not swept reads as a wing — the one
 * thing this navy's beam is not.
 *
 * `bySide` exports every starboard fin before any port one — pectoral_s,
 * fluke_s, pectoral_p, fluke_p, which is the order the approved Spinner
 * carries (+z first; the names turned round with #642); the default goes
 * pair by pair.
 *
 * `stand` is the Chorister's: the early pass extruded its fins and never
 * re-centred them, so each plate stands *on* its node's height, from y = 0
 * up to `t`, rather than straddling it as `plan` lays a slab. The approved
 * export carries them so (hulls/chorister-pelagia.mjs), and a port
 * reproduces the file.
 */
export function fins(root, membrane, { y = 0, pairs, bySide = false, stand = false }) {
  const fin = ([name, corners, { t = 0.5, y: fy = y } = {}], side, sgn) => {
    const geo = plan(
      corners.map(([x, z]) => [x, sgn * z]),
      t
    );
    if (stand) geo.translate(0, t / 2, 0);
    return add(root, `${name}_${side}`, geo, membrane, [0, fy, 0]);
  };
  if (bySide) bothSides((side, sgn) => pairs.forEach((pair) => fin(pair, side, sgn)));
  else pairs.forEach((pair) => bothSides((side, sgn) => fin(pair, side, sgn)));
}

/**
 * The grown point at the bow — the Sower's `leaf_tip`, the Spinner's
 * `spinneret`: a faceted cone whose apex is at `tip`. `z` is off the keel
 * line: the Chorister's `spine_gun` is the same cone, five-sided, two units
 * to port of it (hulls/chorister-pelagia.mjs), and its `stem_tail` is one
 * with the apex *forward*, buried in the last lobe, so that the stern is a
 * transom — the approved export's own, kept.
 */
export function nose(root, mat, { name = 'leaf_tip', tip, y = 0, z = 0, r, length, facets = 6 }) {
  add(root, name, cyl(0, r, length, facets), mat, [tip - length / 2, y, z], [0, 0, -Math.PI / 2]);
}

/**
 * A dorsal blade standing on the back, `height` above `y` (`blade` above).
 * `stand` is `fins`' — the Chorister's `dorsal_leaf` is the same plate with
 * its foot at its node rather than its middle.
 */
export function dorsalBlade(root, mat, opts) {
  const { name = 'dorsal_blade', from, to, y, height, t = 1, stand = false } = opts;
  const geo = blade(from, to, height, t);
  if (stand) geo.translate(0, height / 2, 0);
  add(root, name, geo, mat, [0, stand ? y : y + height / 2, 0]);
}

/**
 * Navigation marks: flat `bio_light` strips, one each at `[name, x, y, z]`,
 * `w` by `h` by `d`. The Spinner's bow mark is the default half-metre tall;
 * its dorsal mark and the Sower's stem light are 0.4.
 */
export function navMarks(root, light, { marks, w = 1.2, h = 0.5, d = 0.9 }) {
  marks.forEach(([name, x, y, z = 0]) => add(root, name, box(w, h, d), light, [x, y, z]));
}

/**
 * Edge lights along a leaf's margin, mirrored — the Sower's are the one lit
 * series that is bilateral, for the same reason its ribs are.
 */
export function edgeLights(root, light, { y, spots, w = 1.6, d = 0.8 }) {
  bothSides((side, sgn) =>
    spots.forEach(([x, z], i) =>
      add(root, `edge_light_${side}${i}`, box(w, 0.4, d), light, [x, y, sgn * z])
    )
  );
}

/** A vein: a thread of `bio_vein` along the back, barely there. */
export function vein(root, veinMat, { name = 'dorsal_vein', from, to, y, z = 0, w = 0.34 }) {
  add(root, name, box(to - from, 0.2, w), veinMat, [(from + to) / 2, y, z]);
}

/**
 * Cargo lobes slung under the flanks, `[side, x, y, z, rx, ry, rz, roll]`
 * each — the Harvester's are different sizes and sit at different heights,
 * and a matched pair is refused for it.
 *
 * As the approved Harvester draws them (hulls/harvester-pelagia.mjs): an
 * entry is `{ side, ...placement }` through kit.mjs `drawn`, the orb ten by
 * seven rather than the first reading's ten by six — `facets` — and the
 * roll and the three radii in the node, as the file carries them. The array
 * form above still builds what it built, on the same ten-by-six orb unless
 * `facets` says otherwise — the Drifter's bays are twelve by six, so that
 * the valves over them (`bayValves`) can be cut on half their facets and
 * nest (#783).
 */
export function cargoLobes(root, chitin, { lobes, facets = [10, 6] }) {
  if (!Array.isArray(lobes[0])) {
    refuseMirror('cargo_lobe', lobes, (l) => l.scale.join());
    lobes.forEach(({ side, ...placement }) =>
      part(root, `cargo_lobe_${side}`, orb(...facets), chitin, placement)
    );
    return;
  }
  refuseMirror('cargo_lobe', lobes, ([, , , , rx, ry, rz]) => `${rx},${ry},${rz}`);
  lobes.forEach(([side, x, y, z, rx, ry, rz, roll = 0]) =>
    add(root, `cargo_lobe_${side}`, orb(...facets), chitin, [x, y, z], [0, 0, roll], [rx, ry, rz])
  );
}

/**
 * A rank of baleen plates across an intake, athwartships at `x`, each yawed
 * `splay` further than the last and all raked `rake` about the beam.
 *
 * `rank` is the rank as the approved Harvester draws it, in the export's
 * own frame through kit.mjs `drawn` (hulls/harvester-pelagia.mjs): `count`
 * plates `pitch` apart across the beam about `at`, each `t` thick and `d`
 * deep, `h` tall at the middle and `taper` shorter for every plate out from
 * it, all raked `rake` about the beam and each *rolled* `splay` further than
 * the last about the keel — the file's splay is a roll, where the first
 * reading above yawed the plates — and numbered from `first`. The form
 * above still builds what it built.
 */
export function baleen(root, ridge, opts) {
  if (opts.rank) {
    const { count, pitch, at, t, h, taper, d, rake, splay, first = 1 } = opts.rank;
    const [x, y, z] = at;
    for (let i = 0; i < count; i++) {
      const k = i - (count - 1) / 2;
      part(
        root,
        `baleen_plate_${first + i}`,
        box(t, h - taper * Math.abs(k), d),
        ridge,
        drawn([x + k * pitch, y, z], [rake, 0, k * splay])
      );
    }
    return;
  }
  const { x, y, z = 0, count, pitch, h, d, splay = 0.045, rake = -0.35, t = 0.4 } = opts;
  for (let i = 0; i < count; i++) {
    const k = i - (count - 1) / 2;
    add(
      root,
      `baleen_plate_${i}`,
      box(t, h, d),
      ridge,
      [x, y, z + k * pitch],
      [0, k * splay, rake]
    );
  }
}

/**
 * Feed tendrils: soft tubes hung from an anchor, sagging by `sag` of their
 * length and trailing aft. `[name, [x, y, z], length, r, sag]` each.
 *
 * As the approved Harvester grows them (hulls/harvester-pelagia.mjs), an
 * entry is `{ name, x, droop, phase, length }` and the tendril is a tube of
 * `steps` along a centripetal Catmull-Rom through `knots` stations forward
 * from `z0` over `length`, in the export's own frame: at the k-th, t =
 * k/(knots − 1), it sits at x + 0.1·sin(3t + phase) across, hangs to
 * −0.45 − droop·t + 0.12·sin(4t + phase), and lies at z0 + length·t — one
 * wobble each way and a phase of its own, which is what makes three
 * tendrils hang three ways. Every constant is the file's, recovered to the
 * float and checked against all sixty-three tube stations (the three
 * curves' 21 each). The array form above still builds what it built.
 */
export function tendrils(root, ridge, opts) {
  const { tendrils: list } = opts;
  if (!Array.isArray(list[0])) {
    const { r = 0.045, steps = 20, facets = 5, z0 = 1.35, knots = 6 } = opts;
    list.forEach(({ name, x, droop, phase, length }) => {
      const through = [];
      for (let k = 0; k < knots; k++) {
        const t = k / (knots - 1);
        through.push([
          x + 0.1 * Math.sin(3 * t + phase),
          -0.45 - droop * t + 0.12 * Math.sin(4 * t + phase),
          z0 + length * t,
        ]);
      }
      feeler(root, ridge, {
        name: `feed_tendril_${name}`,
        through: through.map((p) => drawn(p).at),
        r,
        steps,
        facets,
      });
    });
    return;
  }
  list.forEach(([name, [x, y, z], length, r, sag = 0.5]) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x - length * 0.35, y - length * sag, z),
      new THREE.Vector3(x - length * 0.8, y - length * 0.55, z)
    );
    add(root, `feed_tendril_${name}`, new THREE.TubeGeometry(curve, 6, r, 5, false), ridge);
  });
}

/* --------------------------------------------------------------------------
 * Structures. A settlement is the same architecture grown four ways, so the
 * base / mount / head / barrel family lives here beside the hull vocabulary
 * rather than in any one structure script (#553, off #540 Phase 3).
 *
 * The Commune's structures are grown, not built: a mound holds the ground
 * with roots rather than bolts, the head is a pod under a cowl, and the gun
 * is a limb that thickens at the joint. Nothing here is a matched pair, for
 * the same reason nothing on a Commune hull is.
 * ------------------------------------------------------------------------ */

/**
 * A grown shell: an orb of `r` and `facets` [round, down] that may stop
 * short of a full turn (`round`, the fraction of one it goes round) or short
 * of the bottom pole (`down`, the fraction of a half-turn it comes down from
 * the crown). The approved turret's mound is an orb cut off 0.42 of the way
 * down; its cowl a half-shell open 0.525 of a turn. `orb` above is the closed
 * case, and a shell with both at 1 is one.
 */
const shell = (r, [w, h], { round = 1, down = 1 } = {}) =>
  new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2 * round, 0, Math.PI * down);

/**
 * The exchanger on the end of a Vent Tap's draw arm, on `bearing` (#608),
 * grown as a bladder: a squashed orb ringed three times, the pale bud on its
 * crown, the one vein along its back, and three roots leaning out into the
 * ground beyond. The rings are lofts round the arm's own axis, squashed with
 * the bladder — the same shoulder–crown–shoulder ridge `ridgeRing` lathes for
 * the Sower's `bladder` rings, turned to the pipe's axis. Distances are
 * metres out along the bearing, as the kit's `ventDrawArm` takes them;
 * `roots.across` are metres to the right of it, looking out.
 */
export function bladderHead(root, { membrane, ridge, spore, vein }, opts) {
  const { bearing: a, at, bladder: body, rings, bud: crown, vein: thread, roots } = opts;
  add(root, 'bladder', orb(12, 6), membrane, polar(a, at, body.y), [0, -a, 0], body.r);
  rings.stations.forEach(([r, shoulder], i) =>
    add(
      root,
      `bladder_ring_${i}`,
      loft(
        [
          [-rings.halfWidth, shoulder],
          [0, r],
          [rings.halfWidth, shoulder],
        ],
        12
      ),
      ridge,
      polar(a, rings.from + rings.pitch * i, body.y),
      [0, -a, 0],
      [1, rings.squash, 1]
    )
  );
  add(root, 'bud', orb(8, 6), spore, polar(a, crown.at, crown.y), [0, 0, 0], crown.r);
  add(root, 'bladder_vein', box(...thread.size), vein, polar(a, at, thread.y), [0, -a, 0]);
  // Each root is laid along the arm as the draw pipe is, then raised
  // `roots.raise` radians toward vertical: the approved file's lean is
  // π/2 − 0.9 to the bit.
  roots.across.forEach((d, i) => {
    const [x, y, z] = polar(a, roots.at, roots.y);
    add(
      root,
      `root_${i}`,
      cyl(roots.r[0], roots.r[1], roots.length, 6),
      ridge,
      [x + d * Math.sin(a), y, z - d * Math.cos(a)],
      [0, -a, roots.raise - Math.PI / 2]
    );
  });
}

/**
 * The mound: a grown dome, the collar the head turns in, and the growth ring
 * where the dome meets the ground.
 *
 * As the approved turret draws it — `mound`, `collar` and `ring`, each with
 * its own numbers and its `drawn` placement, built in the file's order
 * (mound, collar, ring): the mound a `shell` of radius `r` cut `down` of the
 * way to the pole, the collar and the ring toruses of `R` and `tube` with
 * `facets` [radial, tubular].
 */
export function grownMound(root, { body, ring, collar }, opts) {
  const { mound, collar: c, ring: g } = opts;
  part(root, 'base_mound', shell(mound.r, mound.facets, mound), body, mound);
  part(root, 'base_collar', torus(c.R, c.tube, ...c.facets), collar, c);
  part(root, 'mound_ring', torus(g.R, g.tube, ...g.facets), ring, g);
}

/**
 * Root grips: swollen holdfasts on the seabed round the mound, no two alike —
 * a matched pair is refused, because the Commune grows each root its own size
 * and a turret that came out rotationally regular would read as a machine.
 *
 * As the approved turret draws them: a capsule each (kit.mjs `capsule`,
 * `facets` [cap, radial]), `r` thick and `length` between its caps, placed by
 * its own node — laid over 0.13 rad short of flat and yawed each its own way,
 * which puts every root *across* the mound's radius rather than out along it.
 * That is where the file has them, and a port reproduces the file. Skins
 * alternate from the first grip.
 */
export function rootGrips(root, skins, { grips, facets = [3, 6] }) {
  refuseMirror('root_grip', grips, ({ r, length }) => `${r},${length}`);
  grips.forEach((g, i) =>
    part(root, `root_grip_${i}`, capsule(g.r, g.length, ...facets), skins[i % skins.length], g)
  );
}

/**
 * The head: a pod that trains, a cowl grown over it, and the quills along the
 * cowl's crown. The cowl sits off-centre because a grown thing is not
 * centred on what it covers.
 *
 * As the approved turret draws it, the head is a frame of its own — the
 * file's `turret_head` node, trained 0.3 rad off the mound's axis — and every
 * part carries its numbers in that frame: `pod` an orb of `r` and `facets`,
 * `cowl` a half-`shell` open `round` of a turn, `quills` cones `r` at the
 * foot and `length` tall, each by its own node. The placement at the top of
 * `opts` is the frame's (kit.mjs `group`), and the frame is returned so the
 * gun can be grown in it, as the file hangs `barrel_group` off `turret_head`.
 */
export function grownHead(root, { pod, cowl }, opts) {
  const head = group(root, 'turret_head', opts);
  const { pod: p, cowl: c, quills } = opts;
  part(head, 'head_pod', shell(p.r, p.facets), pod, p);
  part(head, 'head_cowl', shell(c.r, c.facets, c), cowl, c);
  quills.forEach((q, i) =>
    part(head, `cowl_quill_${i}`, cyl(0, q.r, q.length, q.facets ?? 4), cowl, q)
  );
  return head;
}

/**
 * The gun as a grown limb: root, mid and tip thickening at each joint along
 * the run from `from` to `to`, ribs banding the root, and the iris and its
 * one lit pip at the muzzle.
 *
 * A limb rather than a tube: the Commune's weapons come out of the body the
 * way a claw does, so the joints are where it swells rather than where it
 * steps.
 *
 * As the approved turret draws it, the limb is a frame off the head — the
 * file's `barrel_group`, placed by the top of `opts` — and each part is its
 * own primitive at its own station up the frame's Y: `root`, `mid` and `tip`
 * frusta of `radii` [muzzle end, breech end], `length` and `facets`; `iris`
 * and each of `ribs` a torus of `R`, `tube` and `facets`; `pip` an orb. The
 * ribs are clad in `rib`, which the file has in the cowl's ink and not the
 * steel's.
 */
export function grownBarrel(root, mats, opts) {
  const { rootMat, mid, tip, iris, pip, rib: ribMat = rootMat } = mats;
  const g = group(root, 'barrel_group', opts);
  const seg = (name, s, mat) =>
    part(g, name, cyl(s.radii[0], s.radii[1], s.length, s.facets), mat, s);
  seg('barrel_root', opts.root, rootMat);
  seg('barrel_mid', opts.mid, mid);
  seg('barrel_tip', opts.tip, tip);
  const { iris: ir, pip: pp, ribs } = opts;
  part(g, 'muzzle_iris', torus(ir.R, ir.tube, ...ir.facets), iris, ir);
  part(g, 'muzzle_pip', new THREE.SphereGeometry(pp.r, ...pp.facets), pip, pp);
  ribs.forEach((rb, i) =>
    part(g, `recoil_rib_${i}`, torus(rb.R, rb.tube, ...rb.facets), ribMat, rb)
  );
  return g;
}

/**
 * The magazine: a grown pod on the flank, the feed running up from it, and
 * the flange where it enters the collar. One pod, never a pair — the
 * Commune's turret feeds from the side it grew on.
 *
 * As the approved turret draws it, in the file's order — `pipe`, `pod`,
 * `flange`: the feed a straight frustum of `radii`, `length` and `facets`,
 * leaned by its node; the pod a capsule (kit.mjs `capsule`, `facets` [cap,
 * radial]); the flange a torus.
 */
export function magazine(root, { pipe: pipeMat, pod: podMat, flange }, { pipe, pod, flange: f }) {
  part(
    root,
    'feed_pipe',
    cyl(pipe.radii[0], pipe.radii[1], pipe.length, pipe.facets),
    pipeMat,
    pipe
  );
  part(root, 'ammo_pod', capsule(pod.r, pod.length, ...pod.facets), podMat, pod);
  part(root, 'feed_flange', torus(f.R, f.tube, ...f.facets), flange, f);
}

/* --------------------------------------------------------------------------
 * The Slipway (#652): the Commune's yard on the kit's skeleton (kit.mjs
 * `slipwayBed`, `slipwayGantry`, `slipwayHeadGate`). What is the
 * Commune's is the hull on the blocks — a squashed orb in membrane — the
 * posts, which are grown: a ridge stalk of a leg leaning out with a
 * chitin knuckle where it meets the beam, and a tall chitin orb of a
 * pylon at the head; and the hall, six husk lobes along the slip, each
 * ringed twice in membrane with a pale bud on its crown, five knuckles
 * between them, a ridge lip along the slip's edge with five veins lit
 * along it, six roots into the ground along the outer wall and three
 * ballast bladders beyond. Every number is the approved
 * slipway-pelagia.glb's own and is the default.
 * ------------------------------------------------------------------------ */

/** A gantry leg: an eight-facet ridge stalk 44 m tall, 32 m out, leaning 0.18 outward. */
export const slipwayLeg = (ridge) =>
  sidedPost({
    name: 'gantry_leg',
    geo: () => cyl(2.4, 4.2, 44, 8),
    mat: ridge,
    y: 22,
    spread: 32,
    lean: 0.18,
  });

/** The knuckle on a leg: a chitin orb 8 m across where the stalk meets the beam. */
export const slipwayKnuckle = (chitin) =>
  sidedPost({
    name: 'gantry_knuckle',
    geo: () => orb(8, 6),
    mat: chitin,
    y: 44,
    spread: 27,
    scale: [4, 3, 4],
  });

/** A head pylon: a chitin orb drawn 56 m tall, 34 m out. */
export const slipwayPylon = (chitin) =>
  sidedPost({
    name: 'head_pylon',
    geo: () => orb(10, 6),
    mat: chitin,
    y: 24,
    spread: 34,
    scale: [6, 28, 6],
  });

/**
 * The hull in progress on the keel blocks: an orb in membrane pressed to
 * 112 m long and 12 m tall, with a slim chitin deck on it. The kit's
 * `slipwayBed` calls this between the last block and the sill.
 */
export function slipwayHull(root, { hull: membrane, deck: chitin }, opts = {}) {
  const {
    body = { facets: [14, 7], at: [-50, 7, 0], r: [56, 6, 10] },
    deck = { size: [60, 1, 8], at: [-60, 12, 0] },
  } = opts;
  add(root, 'hull_in_progress', orb(...body.facets), membrane, body.at, [0, 0, 0], body.r);
  add(root, 'hull_in_progress_deck', box(...deck.size), chitin, deck.at);
}

/**
 * One hall flanking the slip, on `sgn`'s side, built into `hall` (the
 * `hall_s` or `hall_p` frame the script makes): six husk lobes 50 m apart,
 * ridge on the even and chitin on the odd, no two the same size — 17, 19
 * and 21 m tall by turns, 26 and 30 m across by turns — each with two
 * membrane rings lathed round it (`ridgeRing`, cresting at 0.8 of the
 * lobe's half-beam and shouldered at 0.9 of that, squashed 0.62 with the
 * lobe) and a spore bud on its crown; five chitin knuckles between the
 * lobes; the ridge lip along the slip's edge with five veins along it;
 * six ridge roots along the outer wall; three membrane ballast bladders
 * beyond them.
 *
 * The roots are the approved file's own and are carried across rather
 * than mirrored (#540): each is a stalk laid across by π/2 about X and
 * then turned `sgn · raise`, which on the +z hall dives it into the ground
 * leaning out, and on the −z hall stands it up, leaning toward the slip.
 * A mirror would negate the whole angle; the file adds to it. Everything
 * else in the hall is the +z hall's mirror to the digit.
 */
export function slipwayHall(hall, { chitin, ridge, membrane, spore, vein }, opts) {
  const {
    sgn,
    z = 54,
    lobes = {
      count: 6,
      from: -125,
      pitch: 50,
      facets: [14, 7],
      y: 8,
      sx: 30,
      sy: [17, 19, 21],
      sz: [26, 30],
    },
    rings = { dx: [-12, 8], crown: 0.8, shoulder: 0.9, halfWidth: 1.5, facets: 14, squash: 0.62 },
    buds = { dx: 6, rise: 9, out: 6, facets: [8, 6], r: [4, 3, 4] },
    knuckles = { count: 5, from: -100, pitch: 50, facets: [10, 6], y: 6, r: [12, 9, 14] },
    lip = { size: [320, 3, 8], y: 1.5, z: 27 },
    veins = { count: 5, from: -120, pitch: 60, size: [24, 0.4, 1.4], y: 3.1 },
    roots = {
      count: 6,
      from: -130,
      pitch: 52,
      r: [1.5, 3.5],
      length: 22,
      y: -3,
      z: 86,
      raise: 1.2,
    },
    bladders = { count: 3, from: -90, pitch: 90, facets: [10, 6], y: 2, z: 88, r: [12, 6, 7] },
  } = opts;
  for (let i = 0; i < lobes.count; i++) {
    const x = lobes.from + lobes.pitch * i;
    const sy = lobes.sy[i % lobes.sy.length];
    const sz = lobes.sz[i % lobes.sz.length];
    add(
      hall,
      `husk_lobe_${i}`,
      orb(...lobes.facets),
      i % 2 ? chitin : ridge,
      [x, lobes.y, sgn * z],
      [0, 0, 0],
      [lobes.sx, sy, sz]
    );
    rings.dx.forEach((dx, j) =>
      add(
        hall,
        `lobe_ring_${i}_${j}`,
        ridgeRing({
          crown: rings.crown * sz,
          shoulder: rings.shoulder * rings.crown * sz,
          halfWidth: rings.halfWidth,
          facets: rings.facets,
        }),
        membrane,
        [x + dx, lobes.y, sgn * z],
        [0, 0, 0],
        [1, rings.squash, 1]
      )
    );
    add(
      hall,
      `lobe_bud_${i}`,
      orb(...buds.facets),
      spore,
      [x + buds.dx, sy + buds.rise, sgn * (z + buds.out)],
      [0, 0, 0],
      buds.r
    );
  }
  for (let i = 0; i < knuckles.count; i++)
    add(
      hall,
      `husk_knuckle_${i}`,
      orb(...knuckles.facets),
      chitin,
      [knuckles.from + knuckles.pitch * i, knuckles.y, sgn * z],
      [0, 0, 0],
      knuckles.r
    );
  add(hall, 'slip_lip', box(...lip.size), ridge, [0, lip.y, sgn * lip.z]);
  for (let i = 0; i < veins.count; i++)
    add(hall, `lip_vein_${i}`, box(...veins.size), vein, [
      veins.from + veins.pitch * i,
      veins.y,
      sgn * lip.z,
    ]);
  for (let i = 0; i < roots.count; i++)
    add(
      hall,
      `root_anchor_${i}`,
      cyl(roots.r[0], roots.r[1], roots.length, 6),
      ridge,
      [roots.from + roots.pitch * i, roots.y, sgn * roots.z],
      [Math.PI / 2 + sgn * roots.raise, 0, 0]
    );
  for (let i = 0; i < bladders.count; i++)
    add(
      hall,
      `ballast_bladder_${i}`,
      orb(...bladders.facets),
      membrane,
      [bladders.from + bladders.pitch * i, bladders.y, sgn * bladders.z],
      [0, 0, 0],
      bladders.r
    );
}

/* --------------------------------------------------------------------------
 * The Bastion, the Spore Veil, the Foundry and the Refinery (#652, off #540
 * Phase 3) — the Commune's HQ, its signature structure and its two works.
 * All four approved exports are r184; the Bastion, the Veil and the
 * Refinery are drawn along X and the Foundry along Z, so every builder here
 * takes the export's own numbers and places them through a kit frame —
 * `xLong` (no yaw, the default) or `zLong` (`drawn` and `part`, one yaw;
 * the Foundry's) — or, on the Veil's X-long-only builders, through
 * `verbatim` and `placed` (the Submersible's X-long twins, defined with the
 * shared kinds below). The one scale is the script's `fitFootprint` or
 * `metreTrue`.
 *
 * The Bastion "shares nothing" across the four navies (#652): "a large
 * pressure dome with visible reinforcement ribs, docking collars and
 * external pipework, anchored to the seabed" (docs/asset-prompts-3d.md,
 * STRUCTURE — Bastion), grown the Commune's way — a dome ringed where it
 * grew, ribbed, veined, held down by root buttresses, its collars, pipes and
 * tanks in grown steel. The Veil is the Commune's own — "a low, breathing
 * spore bed grown into the seabed: broad overlapping lobes, paired gill
 * organs with vent slits exhaling a faint haze, slender spore stalks
 * swaying above" (STRUCTURE — Spore Veil). Where a part is one of the
 * module's orbs, cones or hoops it is built through those (`grownOrbs`,
 * `grownCones`, `grownHoops`); what is new here is the rule behind each
 * series — a ring's station on the dome, a slit's place on a gill, a
 * stalk's proportions, a vein ring's segments — recovered from the file to
 * the float as the #649 ports did, so the script holds the decision and not
 * the arithmetic. None of the four files carries a table: every buffer
 * `parts.mjs` could not name is a partial sphere or an r184 capsule.
 *
 * The Foundry and the Refinery share their bay, cranes, launch mouth,
 * ballast tanks, pipes, crusher, stacks, conveyor, hopper and flood masts
 * with the other navies through the kit's Foundry and Refinery vocabulary
 * (kit.mjs, #652), and the Bastion's tanks and standpipes are the same
 * `ballastTanks` and `flangedPipes`; what is the Commune's — husk lobes
 * ringed where they grew, knuckles, outrigger lobes, a stern pod, lit
 * veins, silos capped, ringed, budded and veined, root anchors — is here.
 * ------------------------------------------------------------------------ */

/**
 * A grown dome: a `shell` stopped `down` of a half-turn short of its pole,
 * placed by `frame` (kit.mjs `xLong` or `zLong`) from the export's own
 * `at`, `rot` and `scale`. The Bastion's `pressure_dome` is an 18 × 10 orb
 * of 6.2 stopped at 0.56, squashed 0.88 tall and 1.12 across and rolled
 * 0.06 by its node; its `crown_pod` a 12 × 7 of 2.3 stopped at 0.6; the
 * Foundry's eight husk lobes are unit 10 × 7 orbs stopped at 0.62
 * (`huskFlanks`). None is a table: the counts `parts.mjs` could not name
 * are a partial sphere's, w·(2h − 1) triangles where a closed orb has
 * 2w(h − 1).
 */
export function grownDome(root, mat, opts) {
  const { name = 'pressure_dome', r, facets, down, frame = xLong, at, rot, scale } = opts;
  frame.part(root, name, shell(r, facets, { down }), mat, at, rot, scale);
}

/**
 * Growth rings round a dome, where it grew: each a torus lying flat at the
 * height of the dome's surface at polar angle `t` from the crown — y = cy +
 * squash·R·cos t — cresting `lift` beyond the dome's radius there, R·sin t +
 * lift, `tube` thick on `facets` [radial, tubular], with the dome's beam
 * scale on its node. The Bastion's four sit at t = 0.32, 0.62, 0.88 and
 * 1.12 on its 6.2 dome, 0.1 proud, thinning 0.3, 0.24, 0.2, 0.16 down the
 * dome; the rule reproduces all four buffers and heights to the float.
 */
export function domeRings(root, mat, opts) {
  const { name = 'growth_ring', centre, R, squash, lift, rings, facets = [5, 26], scale } = opts;
  const [cx, cy, cz] = centre;
  rings.forEach(({ t, tube }, i) =>
    placed(
      root,
      `${name}_${i}`,
      torus(R * Math.sin(t) + lift, tube, ...facets),
      mat,
      verbatim([cx, cy + squash * R * Math.cos(t), cz], [Math.PI / 2, 0, 0], scale)
    )
  );
}

/**
 * Arcs of torus, each born in the XY plane and placed by its node — round a
 * dome's centre, all at `centre` with one `scale` on their nodes, rolled
 * `roll` about the keel and yawed `yaw` about the crown: the Bastion's five
 * reinforce ribs ("visible reinforcement ribs" — a quarter turn each, 6.076
 * by 0.18 on 4 × 22, rolled π/2), its three lit veins (6.231 by 0.07 on
 * 4 × 18, each its own arc a little over 0.9 and its own roll, 0.35, 0.47
 * and 0.59 short of π/2) and its two hull pipes ("external pipework" —
 * 6.324 by 0.16 and 0.13 on 5 × 16, arcs 0.9 and 1.15, yawed 3.9 and 4.5);
 * or each on a station of its own, `at` and `rot` — the Foundry's four
 * `hull_vein`s climbing its flanks, each its own radius and arc. `arcs`
 * lists each one's `yaw` (or `rot`) and whatever of `R`, `arc`, `tube`,
 * `roll`, `at` differs from the defaults at the top; `frame` is the kit's
 * `xLong` or `zLong`. The Bastion's file writes eight of its ten rotations
 * in three's other XYZ form of the same matrix, (±π, b, c − π); they are
 * written as (0, π − b, c), which is the form the other two are in and the
 * one that shows the pipes' yaws to be round.
 */
export function domeArcs(root, mat, opts) {
  const { name, first = 0, frame = xLong, centre, scale, R, tube, facets, arc, roll, arcs } = opts;
  arcs.forEach((a, i) =>
    frame.part(
      root,
      `${name}_${first + i}`,
      new THREE.TorusGeometry(a.R ?? R, a.tube ?? tube, ...facets, a.arc ?? arc),
      mat,
      a.at ?? centre,
      a.rot ?? [0, a.yaw, a.roll ?? roll],
      scale
    )
  );
}

/**
 * Lit ports round a dome — "sustained glow from ports and working lights":
 * orbs of `r` on `facets` in the lamp, one buffer shared by all as the file
 * has it, each where the export put it. The Bastion's eight sit a little
 * above the dome's waist at eight radii between 6.23 and 6.31 from its
 * centre, on no rule the port could find, so the places are the file's.
 */
export function portLights(root, mat, { name = 'port_light', r, facets = [6, 5], at }) {
  const geo = new THREE.SphereGeometry(r, ...facets);
  at.forEach((p, i) => placed(root, `${name}_${i}`, geo, mat, verbatim(p)));
}

/**
 * Root buttresses — "anchored to the seabed", grown: capsules (kit.mjs
 * `capsule`, `facets` [cap, radial]) each its own girth and length, laid
 * over `roll` about the keel and yawed each its own way, skinned alternately
 * from the first, placed by `frame`. A matched pair is refused, as
 * `rootGrips` refuses one on the turret. The Bastion's seven
 * (`root_buttress`, on 3 × 7) lie 0.18 short of flat and roughly along the
 * dome's radius, where the turret's five lie across it; the Foundry's five
 * and the Refinery's six `root_anchor`s are the turret's 3 × 6 capsules
 * laid 0.14 and 0.15 short of flat. On every file some of the rotations are
 * written in three's (π, b, −roll) form and the rest in (0, yaw, roll), the
 * same matrix, and all are written here in the second.
 */
export function rootButtresses(root, skins, opts) {
  const { name = 'root_buttress', frame = xLong, roll, facets = [3, 7], grips } = opts;
  refuseMirror(name, grips, ({ r, length }) => `${r},${length}`);
  grips.forEach(({ r, length, at, yaw }, i) =>
    frame.part(root, `${name}_${i}`, capsule(r, length, ...facets), skins[i % skins.length], at, [
      0,
      yaw,
      roll,
    ])
  );
}

/**
 * A docking collar: the collar, a frustum laid on its side — a quarter turn
 * about the keel — and yawed out `yaw`; the lip round its mouth, a torus
 * stood on edge at π/2 + yaw; and the lit mouth, a thin drum in the collar's
 * own attitude and facet count. Exported collar, lip, mouth, as the file
 * has them, under `docking_<part>_<tag>`. The Bastion's `main` (1.5 to 1.9
 * by 2.6 on 9 facets, yawed −0.4 off the +x flank) and `small` (0.95 to
 * 1.25 by 2 on 8, yawed 0.75, aft and to starboard). The lip's and the
 * mouth's places are the file's and not a distance along the collar's axis
 * — each sits a few centimetres off it.
 */
export function dockingCollar(root, mats, opts) {
  const { collar: collarMat, lip: lipMat, mouth: mouthMat } = mats;
  const { tag, yaw, collar, lip, mouth } = opts;
  const attitude = [0, yaw, Math.PI / 2];
  placed(
    root,
    `docking_collar_${tag}`,
    cyl(collar.radii[0], collar.radii[1], collar.length, collar.facets),
    collarMat,
    verbatim(collar.at, attitude)
  );
  placed(
    root,
    `docking_lip_${tag}`,
    torus(lip.R, lip.tube, ...lip.facets),
    lipMat,
    verbatim(lip.at, [0, Math.PI / 2 + yaw, 0])
  );
  placed(
    root,
    `docking_mouth_${tag}`,
    cyl(mouth.r, mouth.r, mouth.t, collar.facets),
    mouthMat,
    verbatim(mouth.at, attitude)
  );
}

/**
 * A gill organ — "paired gill organs with vent slits exhaling a faint
 * haze": a frame of its own (the file's `gill-organ-<side>`, placed
 * verbatim) holding the mound, an orb squashed to `mound.scale` and rolled
 * `mound.roll`; `slits.count` vent slits, each with its "faint
 * bioluminescent breathing line" lit beside it; and the haze, a cone
 * standing over the top in the translucent ink. The slits are one rule,
 * recovered from the file to the float: the k-th yaws `yaw0 + k·pitch`
 * about the mound's crown, sits at (0.72·sin yaw, 0.28, 0.28·cos yaw − 0.14)
 * pitched 0.5 forward, and its breathing line at (0.78·sin yaw, 0.3, the
 * same z) in the same attitude. Port is −z (#642): the file's `-port` frame
 * is at z −0.35 and its `-stb` at +0.35, and the two are not a mirrored
 * pair — the starboard organ sits where the port one lands turned half a
 * turn about the crown, with its yaw and its rolls merely negated, so each
 * is grown its own way and the script says which by `side`.
 *
 * Two things a *hull* carrying these needs and the structure does not.
 * `haze` is optional: the Bower's cloud is drawn around the hull by the
 * renderer and never on it (docs/asset-prompts-3d.md, UNIT — Bower), so a
 * caller that passes none gets an organ with no fog geometry. It is
 * present on the Veil and stays, so the structure's file is unchanged.
 * `sep` is the separator between the parts of a name — `-` here, as every
 * Veil part is hyphenated, and `_` for a hull, whose parts are not — and
 * `prefix` the stem of the name, `gill`. Defaults leave
 * `gill-organ-port`, `gill-mound-port`, `gill-slit-port-1`,
 * `gill-breath-line-port-1` and `gill-haze-port` exactly as the approved
 * export has them.
 *
 * `lines` places the breathing lines by their own rule instead of beside
 * their slits (#890, the light axis of #540). Beside the slits they are
 * inside the mound and under the haze cone — every slit and line the
 * approved Veil carries sits below the mound's skin, and the cone's top
 * disc owns every top-down cell beneath it — so a line there is a lamp no
 * map sees. "Breathing lines *around* the gills" is the block's phrase,
 * and this rule draws that: the k-th line stands on the mound's upper skin
 * at plan bearing `bearings[k]` (yawed about the organ's crown, +z at 0)
 * and plan reach `reach` from it, its long axis laid tangent round the
 * mound, sunk `sink` below the skin at its middle and leaned `lean`
 * radians outward about that axis so its foot is in the mound and its head
 * in the open — a broken ring of light round the gill's shoulder, outside
 * the haze's footprint where the caller puts the reach past the cone's
 * top radius. The skin height is the rolled mound's own, solved on the
 * ellipsoid, so a line follows the mound whatever its squash and roll. The
 * Veil's eight are the only caller; the Bower passes none and its lines
 * stay beside their slits, clad (hulls/bower.mjs).
 */
export function gillOrgan(root, mats, opts) {
  const { mound: moundMat, slit: slitMat, breath: breathMat, haze: hazeMat } = mats;
  const { side, at, yaw, mound, slits, haze, lines, prefix = 'gill', sep = '-' } = opts;
  const n = (...w) => [prefix, ...w].join(sep);
  const organ = group(root, n('organ', side), verbatim(at, [0, yaw, 0]));
  placed(
    organ,
    n('mound', side),
    new THREE.SphereGeometry(1, ...mound.facets),
    moundMat,
    verbatim([0, 0, 0], [0, 0, mound.roll], mound.scale)
  );
  const { count = 4, yaw0 = -0.5, pitch = 0.34, tilt = 0.5, slit, breath } = slits;
  const { y = [0.28, 0.3], reach = [0.72, 0.78], lift = 0.28, sink = 0.14 } = slits;
  // The mound's upper skin at plan (x, z): the unit orb scaled `mound.scale`
  // and rolled `mound.roll` about z, un-rolled and solved for y — the upper
  // root of the quadratic the ellipsoid gives.
  const skin = (x, z) => {
    const [sx, sy, sz] = mound.scale;
    const c = Math.cos(mound.roll);
    const s = Math.sin(mound.roll);
    const A = (s / sx) ** 2 + (c / sy) ** 2;
    const B = 2 * x * c * s * (1 / sx ** 2 - 1 / sy ** 2);
    const C = ((x * c) / sx) ** 2 + ((x * s) / sy) ** 2 + (z / sz) ** 2 - 1;
    const D = B * B - 4 * A * C;
    if (D < 0) throw new Error(`${n('breath', 'line', side)}: (${x}, ${z}) is off the mound`);
    return (-B + Math.sqrt(D)) / (2 * A);
  };
  for (let k = 0; k < count; k++) {
    const a = yaw0 + pitch * k;
    const z = lift * Math.cos(a) - sink;
    placed(
      organ,
      n('slit', side, k + 1),
      box(...slit),
      slitMat,
      verbatim([reach[0] * Math.sin(a), y[0], z], [tilt, a, 0])
    );
    if (lines) {
      const b = lines.bearings[k];
      const lx = lines.reach * Math.sin(b);
      const lz = lines.reach * Math.cos(b);
      placed(
        organ,
        n('breath', 'line', side, k + 1),
        box(...breath),
        breathMat,
        // XYZ: the roll about the box's own long axis first, then the yaw
        // that lays that axis tangent at bearing `b` — which carries the
        // box's local −x, the way the roll tipped its head, onto +radial.
        verbatim([lx, skin(lx, lz) - lines.sink, lz], [0, b + Math.PI / 2, lines.lean])
      );
    } else
      placed(
        organ,
        n('breath', 'line', side, k + 1),
        box(...breath),
        breathMat,
        verbatim([reach[1] * Math.sin(a), y[1], z], [tilt, a, 0])
      );
  }
  if (haze)
    placed(
      organ,
      n('haze', side),
      cyl(haze.radii[0], haze.radii[1], haze.h, haze.facets),
      hazeMat,
      verbatim([0, haze.y, 0], [0, 0, haze.roll])
    );
  return organ;
}

/**
 * A vein ring round a lobe: a frame of the file's name at the origin
 * holding `count` boxes, the k-th at bearing `centre − span/2 +
 * (k + ½)·span/count` on a circle of `r` about `at` = [cx, y, cz], laid
 * tangent (yawed −(bearing + π/2)) and cut r·(span/count)·`overlap` long
 * by `section` [tall, wide] — the segments overlap by 8 % so the arc reads
 * as one line. The Veil's four: `vein-ring-core`, nine on 1.35 about the
 * crown over 2.2 rad centred on 1.5; `vein-ring-core-2`, eight on 1.75
 * over 2.0 on 4.3; `vein-ring-west`, seven on 0.95 about the west lobe
 * over 2.2 on 2.3; `vein-ring-east`, seven on 0.9 about the east over 2.1
 * on −0.75. The rule reproduces all thirty-one nodes to the double;
 * sixteen of them the file writes in three's (π, b, π) form of the XYZ
 * Euler, the plain yaw of the same matrix here.
 *
 * The first port read these as the block's "faint bioluminescent
 * breathing lines" and lit them; they are not (#890, the light axis of
 * #540). The Veil's lighting clause names "breathing lines around the
 * gills and dim lit tips on the stalks", and these ring the lobes — every
 * one of the thirty-one lies inside the lobe it circles, on the approved
 * file's own numbers — so no band names them, and a hidden lamp named in
 * no band is clad in its family's unlit finish, which the caller hands in
 * (docs/models-plan.md §3.2 rule 1; #890, review rulings, ruling 4 for
 * the finish). The rings are still built: they are parts, and the
 * breathing lines are `gillOrgan`'s. Whether the block should name them
 * is #893.
 */
export function veinRing(root, mat, opts) {
  const { name, at, r, centre, span, count, section = [0.045, 0.06], overlap = 1.08 } = opts;
  const [cx, y, cz] = at;
  const frame = group(root, name);
  const step = span / count;
  for (let k = 0; k < count; k++) {
    const a = centre - span / 2 + (k + 0.5) * step;
    placed(
      frame,
      `${name}-seg-${k + 1}`,
      box(r * step * overlap, ...section),
      mat,
      verbatim([cx + r * Math.cos(a), y, cz + r * Math.sin(a)], [0, -(a + Math.PI / 2), 0])
    );
  }
  return frame;
}

/**
 * How far up-stalk a spore stalk's upper stem leans across, per unit of
 * its height: 0.0298876264947198 on all six of the Veil's, identical to
 * fifteen places, and no expression in the stalk's two leans (0.06 and
 * 0.16) or its proportions that the port could find reproduces it — so it
 * is carried as the file's number rather than a guess at its origin. The
 * pod and its tip sit 1.4 times as far across, exactly.
 */
const STALK_SWAY = 0.0298876264947198;

/**
 * A spore stalk — "slender spore stalks swaying above ... dim lit tips on
 * the stalks only": a frame of its own (`stalk-<n>`, placed verbatim, each
 * leaned its own way off the bed) holding a two-piece stem, the pod and its
 * lit tip, all one rule of the stalk's height `H`: the lower stem 0.55H
 * tall, 0.075 to 0.05 across on 7 facets, centred 0.27H up and leaned 0.06
 * about the keel; the upper 0.45H tall, 0.05 to 0.032, centred 0.75H up
 * and `STALK_SWAY`·H across, leaned 0.16; the pod a 7 × 5 orb of 0.13
 * drawn 1.35 tall at 0.98H up and 1.4 times as far across; the tip a 6 × 4
 * orb of 0.07 drawn 1.2 tall, 0.16 above the pod. The Veil's six stand 2.3,
 * 2.7, 2, 1.8, 3.1 and 1.5 tall; the rule reproduces all twenty-four nodes
 * to the double.
 *
 * Every dimension above is absolute in the stalk's own frame, which is what
 * makes the rule reproduce the file — so a *hull* growing these smaller
 * takes them down by the frame's own `scale` rather than by `H` alone,
 * or the stem stays 0.15 across however short it gets (hulls/bower.mjs).
 * `sep` is `gillOrgan`'s: `-` for the Veil's hyphenated parts, `_` for a
 * hull's.
 */
export function sporeStalk(root, mats, opts) {
  const { lower: lowerMat, upper: upperMat, pod: podMat, tip: tipMat } = mats;
  const { name, H, sway = STALK_SWAY, sep = '-', ...placement } = opts;
  const stalk = group(root, name, placement);
  placed(
    stalk,
    `${name}${sep}stem${sep}lower`,
    cyl(0.05, 0.075, 0.55 * H, 7),
    lowerMat,
    verbatim([0, 0.27 * H, 0], [0, 0, 0.06])
  );
  placed(
    stalk,
    `${name}${sep}stem${sep}upper`,
    cyl(0.032, 0.05, 0.45 * H, 7),
    upperMat,
    verbatim([sway * H, 0.75 * H, 0], [0, 0, 0.16])
  );
  placed(
    stalk,
    `${name}${sep}pod`,
    new THREE.SphereGeometry(0.13, 7, 5),
    podMat,
    verbatim([1.4 * sway * H, 0.98 * H, 0], [0, 0, 0], [1, 1.35, 1])
  );
  placed(
    stalk,
    `${name}${sep}pod${sep}tip`,
    new THREE.SphereGeometry(0.07, 6, 4),
    tipMat,
    verbatim([1.4 * sway * H, 0.98 * H + 0.16, 0], [0, 0, 0], [1, 1.2, 1])
  );
  return stalk;
}

/**
 * Root flares — the bed "grown into the seabed": cones of `radii` [tip,
 * foot] by `length` on `facets` round the bed's edge, sunk to `y`, the k-th
 * yawed `yaw0 − k·2π/count` and leaned `lean` on the even ones, `lean +
 * leanStep` on the odd. The lean is about the frame's own x *before* the
 * yaw — an XYZ Euler — so every flare tips the same way, toward +z, and
 * the yaw only spins each cone about its own axis: the file's rotation,
 * kept, and worth knowing before the bake is read. The Veil's seven lean
 * 0.6847 and π/3 more by turns, on bearings a wobble off their yaws at
 * seven radii between 2.08 and 2.53 from the crown, so their places are the
 * file's.
 */
export function rootFlares(root, mat, opts) {
  const { name = 'root-flare', radii, length, facets = 6, y, lean, leanStep = Math.PI / 3 } = opts;
  const { yaw0, at } = opts;
  at.forEach(([x, z], k) =>
    placed(
      root,
      `${name}-${k + 1}`,
      cyl(radii[0], radii[1], length, facets),
      mat,
      verbatim([x, y, z], [lean + (k % 2) * leanStep, yaw0 - (k * 2 * Math.PI) / at.length, 0])
    )
  );
}

/**
 * The husk flanks either side of the Foundry's bay — the Commune's "unit
 * production hall", grown: on each flank (`{ name, n, lobes }`,
 * `husk_lobe_${name}_${i}`) a rank of lobes, each an orb of `facets`
 * stopped `down` of the way to its pole (`grownDome`) and squashed by its
 * own `scale`, pitched a little its own way and rolled outboard by its
 * `rot`; and round each, `lobe_ring_${n}_${i}_${j}`, growth rings where it
 * grew — a unit torus of `ring.facets` and its own `tube` at fraction `f`
 * up the lobe's own axis, scaled to the lobe's section there,
 * [sx·√(1 − f²), sz·√(1 − f²), 1], lying flat and rolled with the lobe.
 * The rule reproduces all twenty rings' nodes to the double; the fractions
 * and tubes are the file's, no two alike. In the file's order: each lobe
 * then its rings, the +x flank first — which a Z-long port names port
 * (#642; see structures/foundry-pelagia.mjs).
 */
export function huskFlanks(root, { skin, ring: ringMat }, opts) {
  const { frame = zLong, facets = [10, 7], down = 0.62, ring = { facets: [4, 20] }, flanks } = opts;
  for (const { name, n, lobes } of flanks)
    lobes.forEach(({ at, rot, scale, rings }, i) => {
      grownDome(root, skin, {
        name: `husk_lobe_${name}_${i}`,
        r: 1,
        facets,
        down,
        frame,
        at,
        rot,
        scale,
      });
      const roll = rot[2];
      const [sx, sy, sz] = scale;
      rings.forEach(({ f, tube }, j) => {
        const g = Math.sqrt(1 - f * f);
        frame.part(
          root,
          `lobe_ring_${n}_${i}_${j}`,
          torus(1, tube, ...ring.facets),
          ringMat,
          [at[0] - Math.sin(roll) * sy * f, at[1] + Math.cos(roll) * sy * f, at[2]],
          [Math.PI / 2, 0, roll],
          [sx * g, sz * g, 1]
        );
      });
    });
}

/**
 * Husk knuckles: orbs of `facets` in the ridge ink where the lobes meet,
 * three a flank, each its own radius — `husk_knuckle_${i}`, `[r, at]`
 * each. A matched pair is refused.
 */
export function huskKnuckles(root, mat, { frame = zLong, facets = [7, 5], knuckles }) {
  refuseMirror('husk_knuckle', knuckles, ([r]) => r);
  knuckles.forEach(([r, at], i) =>
    frame.part(root, `husk_knuckle_${i}`, new THREE.SphereGeometry(r, ...facets), mat, at)
  );
}

/**
 * The outrigger lobes off the Foundry's corners: the big one with a growth
 * ring round it, the small one with a pale bud on it — `outrigger_lobe_big`,
 * `outrigger_ring_big`, `outrigger_lobe_small`, `outrigger_bud`, in that
 * order. The lobes are orbs of `r` on `facets`, squashed and yawed by their
 * nodes; the ring a torus of `R` and `tube` lying flat; the bud an orb.
 */
export function outriggerLobes(root, { skin, ring: ringMat, bud: budMat }, opts) {
  const { frame = zLong, big, ring, small, bud } = opts;
  const orbOf = (o) => new THREE.SphereGeometry(o.r, ...o.facets);
  frame.part(root, 'outrigger_lobe_big', orbOf(big), skin, big.at, big.rot, big.scale);
  frame.part(
    root,
    'outrigger_ring_big',
    torus(ring.R, ring.tube, ...ring.facets),
    ringMat,
    ring.at,
    ring.rot,
    ring.scale
  );
  frame.part(root, 'outrigger_lobe_small', orbOf(small), skin, small.at, small.rot, small.scale);
  frame.part(root, 'outrigger_bud', orbOf(bud), budMat, bud.at);
}

/**
 * The stern pod closing the Foundry's blind end: a squashed orb with a
 * growth ring lying flat round it and a pale bud on its shoulder —
 * `stern_pod`, `stern_ring`, `stern_bud`.
 */
export function sternPod(root, { skin, ring: ringMat, bud: budMat }, opts) {
  const { frame = zLong, pod, ring, bud } = opts;
  frame.part(
    root,
    'stern_pod',
    new THREE.SphereGeometry(pod.r, ...pod.facets),
    skin,
    pod.at,
    pod.rot,
    pod.scale
  );
  frame.part(
    root,
    'stern_ring',
    torus(ring.R, ring.tube, ...ring.facets),
    ringMat,
    ring.at,
    ring.rot,
    ring.scale
  );
  frame.part(root, 'stern_bud', new THREE.SphereGeometry(bud.r, ...bud.facets), budMat, bud.at);
}

/**
 * The Refinery's silos — "a rank of upright silos", grown: each a drum of
 * `facets` tapering to `taper` of its radius `R` at the top, `h` tall,
 * stood at `at` = [x, z] and turned by a YXZ Euler of its own `lean`, `yaw`
 * and the same `lean` again — which is how all four files' nodes decompose,
 * to the double; a hemisphere cap of `cap.of`·R on `cap.facets`, squashed
 * `cap.squash`, on its top; growth rings round it, `silo_ring_${n}_${j}`,
 * each a torus of its own `R` and `tube` lying flat at its own `y`; a pale
 * bud of `bud.r` `bud.lift`·R above the top on the silos that grew one
 * (`bud: true` — two of the Refinery's four); and a lit vein, a torus of
 * `vein.of`·R and `vein.tube` over `vein.arc` (0.65 of a half-turn),
 * `vein.at` of the height up, rolled `vein.roll` and yawed its own way. In
 * the file's order: silo, cap, rings, bud, vein. The drum wears `skin`
 * unless the silo says otherwise (the Refinery's fourth is chitin where
 * the rest are algae); the cap is always `cap`'s.
 *
 * That upright vein is a lamp the maps barely see (#890, the light axis
 * of #540): its plane holds the silo's axis, so all but the last few
 * degrees of its arc run inside the drum, and the nub that does emerge
 * sits at mid-height under the next ring up — two of the Refinery's four
 * showed under a cell from above, the other two a few square metres.
 * `vein.lay: 'flat'` lays it round the silo instead: a hoop of `vein.hug`
 * times the wall's corner radius at `vein.at` of the height, centred on
 * the leaned axis there, tilted `vein.tilt` off level with its `arc` on
 * the rising side and yawed the silo's own way, so what the block calls
 * "visible machinery light" is a band a top-down map sees whole. The
 * drum is a nine-sided prism whose flats lie at 0.94 of its corner
 * radius, so a `hug` a little under 1 — the Refinery's 0.97 — runs the
 * wall through the tube's core at corners and flats alike; a hug over 1
 * leaves the tube floating off the drum, which is what the first cut did
 * at 1.09 (review, F1). The caller puts `at` above the highest ring,
 * where nothing wider stands over it. Upright stays the default, as the
 * file has it.
 */
export function silos(root, mats, opts) {
  const { skin: skinMat, cap: capMat, ring: ringMat, bud: budMat, vein: veinMat } = mats;
  const {
    frame = xLong,
    facets = 9,
    taper = 0.72,
    cap = { of: 0.74, facets: [9, 5], squash: 0.75 },
    ring = { facets: [4, 18] },
    bud = { r: 0.5, facets: [7, 5], lift: 0.62 },
    vein = {
      of: 0.92,
      tube: 0.06,
      facets: [4, 14],
      arc: Math.PI * 0.65,
      at: 0.55,
      roll: Math.PI / 2 - 0.5,
    },
    silos: list,
  } = opts;
  for (const s of list) {
    const { n, R, h, lean, yaw } = s;
    const [x, z] = s.at;
    const stance = eulerXYZ([lean, yaw, lean], 'YXZ');
    frame.part(
      root,
      `silo_${n}`,
      cyl(taper * R, R, h, facets),
      s.skin ?? skinMat,
      [x, h / 2, z],
      stance
    );
    frame.part(
      root,
      `silo_cap_${n}`,
      shell(cap.of * R, cap.facets, { down: 0.5 }),
      capMat,
      [x, h, z],
      [0, 0, 0],
      [1, cap.squash, 1]
    );
    s.rings.forEach(({ y, R: rr, tube }, j) =>
      frame.part(
        root,
        `silo_ring_${n}_${j}`,
        torus(rr, tube, ...ring.facets),
        ringMat,
        [x, y, z],
        [Math.PI / 2, 0, 0]
      )
    );
    if (s.bud)
      frame.part(root, `silo_bud_${n}`, new THREE.SphereGeometry(bud.r, ...bud.facets), budMat, [
        x,
        h + bud.lift * R,
        z,
      ]);
    if (vein.lay === 'flat') {
      // A silo may carry its hoop at its own height (`s.vein.at`): where
      // its rings stop is where the band above them starts.
      const at = s.vein.at ?? vein.at;
      const wall = R * (1 - (1 - taper) * at);
      // The drum turns about its middle, so at `at` of the height its axis
      // stands (at − ½)·h up the leaned stance from there.
      const off = new THREE.Vector3(0, (at - 0.5) * h, 0).applyEuler(
        new THREE.Euler(...stance, 'XYZ')
      );
      frame.part(
        root,
        `silo_vein_${n}`,
        new THREE.TorusGeometry(vein.hug * wall, vein.tube, ...vein.facets, vein.arc),
        veinMat,
        [x + off.x, h / 2 + off.y, z + off.z],
        // YXZ, as the x, y, z fields of a three Euler (the silo's stance is
        // written the same way): the torus is born about z; π/2 − tilt
        // about x lays it flat with its arc's first half-turn rising, then
        // the silo's own yaw about y.
        eulerXYZ([Math.PI / 2 - vein.tilt, s.vein.yaw, 0], 'YXZ')
      );
      continue;
    }
    frame.part(
      root,
      `silo_vein_${n}`,
      new THREE.TorusGeometry(vein.of * R, vein.tube, ...vein.facets, vein.arc),
      veinMat,
      [x, vein.at * h, z],
      [0, s.vein.yaw, vein.roll]
    );
  }
}

/* --------------------------------------------------------------------------
 * Shared kinds. The Light Scout is the first of the six kinds every navy
 * models (#588, off #540 Phase 3), and the Commune's is a grown pod on a
 * 60 m brief: a displaced orb for a hull, four rings that lean as they grew,
 * a feeler curling forward to its light, five leaf membranes and the five
 * lamps that are its whole resting light. The builders take the approved
 * export's own numbers (kit.mjs `drawn`) and are named for what the export
 * named them; hulls/light-scout-pelagia.mjs is their first consumer and
 * states the scale decision the other shared kinds follow.
 * ------------------------------------------------------------------------ */

/**
 * A grown body: a low-facet orb whose every vertex the approved export
 * pushed by hand — the one part of the four scouts that is a table rather
 * than a construction. `buffer` is the export's own local buffer, its unique
 * points in row order: the top pole, each ring from the top down, the bottom
 * pole. The orb's squash and station come from its node like any other
 * part's. The displacement is partly formulaic — every station is scaled by
 * 1 − 0.06·cos ψ about the length axis, and the waist by
 * 1.093 + 0.07·cos(ψ + 0.7) + 0.06·sin 3ψ — but not wholly, and a port
 * transcribes rather than guesses: the table is the export's, to five
 * decimals, and a formula that nearly fit it would be a different hull.
 *
 * `frame` is which way the buffer is read. The default is the scouts' —
 * `zLong`, the export's own frame, yawed onto +X by `part` — because those
 * four files are ports and their tables are the binaries'. A hull *built*
 * this way has no binary to transcribe and may generate its buffer by
 * formula, in which case it authors it in the kit's frame and passes
 * `xLong`, so the points read bow-on-+X as the script's other stations do
 * (hulls/bower.mjs). The two differ only in the one yaw; the table, the
 * facet counts and the pole rule below are the same either way.
 */
export function grownBody(root, mat, opts) {
  const { name = 'hull', facets = [16, 10], buffer, frame = zLong, ...placement } = opts;
  const [w, h] = facets;
  if (buffer.length !== (h - 1) * w + 2)
    throw new Error(
      `${name}: ${buffer.length} points for a ${w}×${h} orb, want ${(h - 1) * w + 2}`
    );
  const geo = new THREE.SphereGeometry(1, w, h);
  const pos = geo.attributes.position;
  for (let iy = 0; iy <= h; iy++)
    for (let ix = 0; ix <= w; ix++) {
      const p =
        iy === 0
          ? buffer[0]
          : iy === h
            ? buffer[buffer.length - 1]
            : buffer[1 + (iy - 1) * w + (ix % w)];
      pos.setXYZ(iy * (w + 1) + ix, p[0], p[1], p[2]);
    }
  // The last vertex of each pole row is referenced by no triangle, so
  // `computeVertexNormals` leaves it at zero and the exporter writes it as
  // (1, 0, 0) in whatever frame the geometry is authored in — the export's
  // Z-long frame in the approved files, the yawed one here — which is the one
  // normal on a table-built hull that a world-space comparison finds moved
  // (#649 review). Orphans in both files; nothing renders from them.
  geo.computeVertexNormals();
  return frame.place(root, name, geo, mat, placement);
}

/**
 * A lobe grown on the body: an orb squashed to its node's three radii and
 * rolled. The scout's ballast lobe hangs under the belly, rolled 0.22 to one
 * side — there is no second.
 */
export function lobe(root, mat, { name = 'ballast_lobe', facets = [9, 6], ...placement }) {
  return part(root, name, orb(...facets), mat, placement);
}

/**
 * Growth rings as the scout grows them: a unit torus each, `tube` thick,
 * squashed to the body's own profile and leaned a few degrees off square by
 * its node — no two alike, which is the whole difference between grown and
 * turned. One-based, as the export numbers them. `growthRings` above is the
 * Spinner's rule, a wobble from the index; this takes each ring's own.
 *
 * `lit` lights every ring the Cruiser's way (hulls/cruiser-pelagia.mjs): a
 * thinner torus of `lit.tube` on `lit.facets` in `lit.mat` rides each ring
 * at the same station and lean, named `lit.name` with the ring's number and
 * exported straight after it, scaled by the ring's own `vein` — a shade
 * wider than the ridge it lights. "Living bioluminescent veins" as a
 * growth ring.
 */
export function grownRings(
  root,
  mat,
  { name = 'growth_ring', first = 1, facets = [5, 20], rings, lit }
) {
  rings.forEach(({ tube, vein, ...placement }, i) => {
    part(root, `${name}_${first + i}`, torus(1, tube, ...facets), mat, placement);
    if (lit)
      part(
        root,
        `${lit.name ?? 'vein_ring'}_${first + i}`,
        torus(1, lit.tube, ...lit.facets),
        lit.mat,
        { ...placement, scale: vein }
      );
  });
}

/**
 * A feeler: a thin tube along a Catmull-Rom curve `through` points in the
 * kit's frame, out to the light it carries. The tube is laid down in the
 * frame the export laid it in and turned with it (kit.mjs `yawed`), because
 * a TubeGeometry's frames follow which way its tangent leans and an X-long
 * rebuild would twist its facets.
 */
export function feeler(root, mat, opts) {
  const { name = 'sensor_feeler', through, r = 0.03, steps = 16, facets = 5, ...placement } = opts;
  const asDrawn = through.map(([x, y, z]) => new THREE.Vector3(-z, y, x));
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(asDrawn), steps, r, facets, false);
  return part(root, name, tube, mat, placement);
}

/**
 * A leaf membrane's outline: three quadratic curves from the root, over the
 * crown to the tip and back under it, at fixed fractions of a span `L` and
 * a depth `h` — the one leaf every membrane on the scout is cut from, at
 * five sizes.
 */
export function leafOutline(L, h) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.35 * L, h, 0.95 * L, 0.85 * h);
  s.quadraticCurveTo(1.15 * L, 0.45 * h, 0.75 * L, 0.1 * h);
  s.quadraticCurveTo(0.4 * L, -0.05 * h, 0, 0);
  return s;
}

/**
 * Membranes: leaves `thickness` thick, each `[span, depth]` its own size and
 * hung by its own node — the dorsal blade stands, the pectorals rake forward
 * and down, the tail flukes stand above and below the peduncle, the lower
 * one the upper's mirror in its node's scale. None is a matched pair. `fins`
 * above is the Spinner's flat mirrored plan; this is the scout's.
 */
export function membranes(root, mat, { fins, thickness = 0.028, segments = 8 }) {
  fins.forEach(({ name, span, depth, ...placement }) =>
    part(
      root,
      name,
      new THREE.ExtrudeGeometry(leafOutline(span, depth), {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: segments,
      }),
      mat,
      placement
    )
  );
}

/**
 * A stalk: a tapered faceted spar, `radii` [top, bottom] as drawn and laid
 * along the keel by its node — the tail peduncle, seven-sided and leaned
 * 0.08 off the keel line.
 */
export function stalk(root, mat, opts) {
  const { name = 'tail_peduncle', radii, length, facets = 7, ...placement } = opts;
  return part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement);
}

/**
 * Light buds: the scout's lamps, orbs in `bio_light` at `[name, r,
 * placement]` — a feeler tip, two flank marks, a throat and a tail. Five,
 * and that is the resting light of the quietest hull in the roster.
 */
export function lightBuds(root, light, { buds, facets = [8, 6] }) {
  buds.forEach(([name, r, placement]) =>
    part(root, name, new THREE.SphereGeometry(r, ...facets), light, placement)
  );
}

/* --------------------------------------------------------------------------
 * The other five shared kinds (#649, off #540 Phase 3): the Corvette, the
 * Harvester and the Cruiser — one authoring pass, three r184, drawn along
 * Z like the scout and built through kit.mjs `drawn` and `part` like it —
 * and the Abyssal Submersible and the Chorister, which the same pass and an
 * earlier one drew along X, so their builders take the export's numbers
 * verbatim and yaw nothing. hulls/corvette-pelagia.mjs, harvester-,
 * cruiser-, abyssal-submersible- and chorister-pelagia.mjs are the
 * consumers, and each states where its export is odd.
 * ------------------------------------------------------------------------ */

/**
 * A point of glow inside the hull: the `KHR_lights_punctual` point light
 * the r184 exports carry beside their lamps — two on the Corvette and the
 * Harvester, three on the Cruiser, two named ones on the Submersible — at
 * the export's own colour, intensity and range. Neither the bake nor the
 * kit's audit ever sees one (hull-intake's page.html renders every pass
 * unlit; `lightAudit` and `check.mjs` read meshes), and the conn view loads
 * it with the file, so a port carries the file's and chooses none. `at` is
 * in the kit's frame, as `drawn` gives it. The light itself is the kit's
 * `pointLight` (#649) — the Consortium's Submersible carries the same two —
 * and this is the Commune's colour on it.
 */
export function glow(root, { name, color = hex('#8FE36B'), intensity, range, at }) {
  return pointLight(root, { name, color, intensity, range, at });
}

/**
 * A seed launcher — "visible torpedo hardpoints", grown: a frame of its own
 * (the export's `launcher_*` group, rolled out from the flank by its node),
 * a sheath of ridge in it, and a row of pale seeds along the sheath's back.
 * Three on the Corvette, three on the Cruiser, each its own `length` and
 * its own count of `seeds`, and the rest is the export's one rule, which
 * reproduces every node matrix in both files to the double: the sheath is
 * a unit orb scaled [0.32, 0.24, 0.68] of the length; the k-th of n seeds
 * is a seven-by-five orb of radius 0.15·length·(1 − 0.125·|2t − 1|),
 * t = k/(n − 1) — fullest amidships — at z = length·(t − ½) along the
 * sheath, y = 0.14·length above it and x = 0.12·length·sin 2.4k across,
 * so the row wobbles as it grew.
 */
export function seedLauncher(root, { sheath, seed }, { name, length, seeds, ...placement }) {
  const frame = group(root, name, placement);
  part(
    frame,
    `${name}_sheath`,
    orb(8, 6),
    sheath,
    drawn([0, 0, 0], [0, 0, 0], [0.32 * length, 0.24 * length, 0.68 * length])
  );
  for (let k = 0; k < seeds; k++) {
    const t = k / (seeds - 1);
    part(
      frame,
      `${name}_seed_${k + 1}`,
      new THREE.SphereGeometry(0.15 * length * (1 - 0.125 * Math.abs(2 * t - 1)), 7, 5),
      seed,
      drawn([0.12 * length * Math.sin(2.4 * k), 0.14 * length, length * (t - 0.5)])
    );
  }
  return frame;
}

/**
 * An intake scoop's outline: a crescent between two quadratic arcs on one
 * chord of ±`w`, the outer sagging to `outer` at its control point and the
 * inner to `inner` — a lip, open toward the chord. The Harvester's is the
 * one the roster has (hulls/harvester-pelagia.mjs).
 */
export function scoopOutline(w, outer, inner) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.quadraticCurveTo(0, -outer, w, 0);
  s.quadraticCurveTo(0, -inner, -w, 0);
  return s;
}

/**
 * The intake scoop: `scoopOutline` extruded `depth` forward along the keel
 * — the mouth of the "external intake dredge gear", hung under the jaw by
 * its node. Eight curve segments, as the export sampled its arcs.
 */
export function intakeScoop(root, mat, opts) {
  const { name = 'intake_scoop', halfWidth, outer, inner, depth, segments = 8 } = opts;
  const { at, rot, scale } = opts;
  return part(
    root,
    name,
    new THREE.ExtrudeGeometry(scoopOutline(halfWidth, outer, inner), {
      depth,
      bevelEnabled: false,
      curveSegments: segments,
    }),
    mat,
    { at, rot, scale }
  );
}

/**
 * Veins along a body — the Cruiser's four, "living bioluminescent veins"
 * drawn the length of the hull (hulls/cruiser-pelagia.mjs): each a tube of
 * `steps` along a centripetal Catmull-Rom through `knots` stations at even
 * intervals of the body's half-length from `from` to `to`, every station on
 * the ellipsoid `lift` times the hull's own scale, round the length axis at
 * an angle of base + 0.3·sin(2.6·z' + phase) — one slow wave down the
 * flank, each vein's own base and phase. The rule is the export's, recovered
 * to the float from all eighty-four stations; the constants are the file's
 * and not a choice here.
 */
export function hullVeins(root, mat, opts) {
  const { hull, lift = 1.1, knots = 21, steps = 56, r = 0.03, facets = 5, veins } = opts;
  const [sx, sy, sz] = hull;
  veins.forEach(({ name, from, to, base, phase }) => {
    const through = [];
    for (let k = 0; k < knots; k++) {
      const z = from + ((to - from) * k) / (knots - 1);
      const a = base + 0.3 * Math.sin(2.6 * z + phase);
      const rr = lift * Math.sqrt(1 - z * z);
      through.push([sx * rr * Math.cos(a), sy * rr * Math.sin(a), sz * z]);
    }
    feeler(root, mat, { name, through: through.map((p) => drawn(p).at), r, steps, facets });
  });
}

/**
 * Hydrophone masts — "fixed hydrophone masts", grown: a tube of `steps`
 * along a centripetal Catmull-Rom through `knots` stations from the back at
 * `from` aft to `to`, rising as y + 0.9t − 0.25t² and swaying across as
 * x + 0.25·sin(phase)·t + 0.08·sin(4t + phase), with a lit bud at its tip
 * — the Cruiser's two, exported mast then tip (hulls/cruiser-pelagia.mjs).
 * The rule is the export's, recovered to the float from both masts.
 */
export function hydrophoneMasts(root, { mast, tip }, opts) {
  const { masts, knots = 7, steps = 24, r = 0.035, facets = 5, tipR = 0.05 } = opts;
  masts.forEach(({ name, x, phase, y, from, to }) => {
    const through = [];
    for (let k = 0; k < knots; k++) {
      const t = k / (knots - 1);
      through.push([
        x + 0.25 * Math.sin(phase) * t + 0.08 * Math.sin(4 * t + phase),
        y + 0.9 * t - 0.25 * t * t,
        from + (to - from) * t,
      ]);
    }
    feeler(root, mast, { name, through: through.map((p) => drawn(p).at), r, steps, facets });
    lightBuds(root, tip, { buds: [[`${name}_tip`, tipR, drawn(through[knots - 1])]] });
  });
}

/**
 * The X-long twins of kit.mjs `drawn` and `part`, for the Submersible and
 * the Chorister, whose exports already run along +X: `verbatim` is a node's
 * translation, XYZ Euler and scale as the file prints them, and `placed`
 * puts the primitive there un-yawed. The same builder signatures as the
 * Z-long ones, so a hull reads the same either way. Navy-neutral, like
 * `glow` above.
 */
export const verbatim = (t = [0, 0, 0], e = [0, 0, 0], s = [1, 1, 1]) => ({
  at: t,
  rot: e,
  scale: s,
});
const placed = (root, name, geo, mat, placement = {}) => {
  const { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = placement;
  return add(root, name, geo, mat, at, rot, scale);
};

/**
 * Grown orbs, placed verbatim: the Submersible's whole body is these — a
 * `seed-hull` of radius 1.5 on twelve by nine, squashed and rolled by its
 * node; a keel, a bulge, a prow tip, three eye sacs, two aft pods and two
 * fins, each an orb of its own radius and facets. `[name, mat, r, facets,
 * placement]` each (hulls/abyssal-submersible-pelagia.mjs).
 */
export function grownOrbs(root, { orbs }) {
  orbs.forEach(([name, mat, r, facets, placement]) =>
    placed(root, name, new THREE.SphereGeometry(r, ...facets), mat, placement)
  );
}

/**
 * Grown cones, placed verbatim: `radii` [top, bottom] as kit `cyl` takes
 * them, `length` between, `facets` round — the Submersible's prow beak and
 * aft nozzle drawn to a point, its nozzle throat open at both ends, and
 * each tendril's tip (hulls/abyssal-submersible-pelagia.mjs). Which way a
 * cone points is its node's: −π/2 about the keel puts the apex forward,
 * +π/2 aft.
 */
export function grownCones(root, { cones }) {
  cones.forEach(([name, mat, [rTop, rBottom], length, facets, placement]) =>
    placed(root, name, cyl(rTop, rBottom, length, facets), mat, placement)
  );
}

/**
 * Hoops round an X-long body, placed verbatim: a torus each of `R` and
 * `tube` on `facets` [radial, tubular], open over `arc` radians when it is
 * less than a turn — the Submersible's six growth rings, its five vein
 * rings (open 4.6, 5.2, 4.4, 5.0 and 3.8 of the way round, each turned its
 * own way about the keel) and the vein along its port fin, a 3.6 rad arc
 * (hulls/abyssal-submersible-pelagia.mjs). `[name, mat, R, tube, facets,
 * arc, placement]` each.
 */
export function grownHoops(root, { hoops }) {
  hoops.forEach(([name, mat, R, tube, [radial, tubular], arc, placement]) =>
    placed(
      root,
      name,
      new THREE.TorusGeometry(R, tube, radial, tubular, arc ?? Math.PI * 2),
      mat,
      placement
    )
  );
}

/**
 * A vein swept along a centripetal Catmull-Rom `through` points in the
 * export's own frame, un-yawed — `feeler` for an X-long file. The
 * Submersible's `spine-vein` runs bow to stern over five stations
 * (hulls/abyssal-submersible-pelagia.mjs).
 */
export function sweptVein(root, mat, { name, through, steps, r, facets = 4 }) {
  const curve = new THREE.CatmullRomCurve3(through.map((p) => new THREE.Vector3(...p)));
  return add(root, name, new THREE.TubeGeometry(curve, steps, r, facets, false), mat);
}

/**
 * The Submersible's tendrils — "folded manipulator limbs", grown as four
 * feelers trailing aft from under the bow, each tipped with a pale cone
 * (hulls/abyssal-submersible-pelagia.mjs). Each is a tube of `steps` along
 * a centripetal Catmull-Rom through `knots` stations from x = `from` back
 * to its own `xEnd`, hanging as −0.95 − 0.25t − 0.35·sin(2.6t + seed) and
 * swaying as z + 0.28·sin(3.2t + 1.7·seed) — one `seed` a tendril, so no
 * two hang alike — and its tip is a six-sided cone 1.4 times the tube's
 * radius across and 0.45 long, apex aft, 0.2 behind the tube's end. The
 * rule is the export's, recovered to the float from all twenty-eight
 * stations, and the tip nodes carry the end stations to the double.
 * Exported tube then tip, as the file has them.
 */
export function abyssalTendrils(root, { tube, tip }, opts) {
  const { tendrils: list, from = 1.6, knots = 7, steps = 20, facets = 5 } = opts;
  list.forEach(({ name, seed, z, xEnd, r }) => {
    const through = [];
    for (let k = 0; k < knots; k++) {
      const t = k / (knots - 1);
      through.push([
        from + (xEnd - from) * t,
        -0.95 - 0.25 * t - 0.35 * Math.sin(2.6 * t + seed),
        z + 0.28 * Math.sin(3.2 * t + 1.7 * seed),
      ]);
    }
    sweptVein(root, tube, { name, through, steps, r, facets });
    const [ex, ey, ez] = through[knots - 1];
    placed(
      root,
      `${name}-tip`,
      cyl(0, 1.4 * r, 0.45, 6),
      tip,
      verbatim([ex - 0.2, ey, ez], [0, 0, Math.PI / 2])
    );
  });
}

/**
 * The cohort segments — "three overlapping segments with the bladder
 * showing through the middle one": three lobes along the keel, each an orb
 * on `facets` squashed to its own three `radii` by its node, in its own
 * `skin` (the middle one membrane, where the bladder shows), and each with
 * a growth ring lathed round it (`ridgeRing`, the Sower's and Spinner's
 * own), `dx` ahead of its centre, cresting at `crown` from `shoulder` over
 * ±`ring.halfWidth`, squashed with the lobe. The Chorister's `lobe_0..2`
 * and `lobe_ring_0..2`, lobe then ring as the file orders them
 * (hulls/chorister-pelagia.mjs). Its rings crest at 0.9 of the lobe's beam
 * radius from a shoulder at 0.82 of it, two units forward — passed as the
 * numbers, which are the export's.
 */
export function cohortLobes(root, ridge, opts) {
  const { lobes, facets = [14, 7], ring: rf = { halfWidth: 0.6, facets: 14 } } = opts;
  lobes.forEach(({ skin, at: [x, y, z], radii: [rx, ry, rz], ring }, i) => {
    add(root, `lobe_${i}`, orb(...facets), skin, [x, y, z], [0, 0, 0], [rx, ry, rz]);
    add(
      root,
      `lobe_ring_${i}`,
      ridgeRing({
        crown: ring.crown,
        shoulder: ring.shoulder,
        halfWidth: rf.halfWidth,
        facets: rf.facets,
      }),
      ridge,
      [x + ring.dx, y, z],
      [0, 0, 0],
      [1, ry / rz, 1]
    );
  });
}

/* --------------------------------------------------------------------------
 * The transports (#783, off #540 Phase 4): the Drifter's bays and tail.
 *
 * The Drifter is the first Commune hull built to its block rather than
 * ported from a binary since the Sower and the Spinner were re-run, so the
 * four builders here answer to docs/asset-prompts-3d.md and to nothing in
 * docs/concept-art/models/. All are X-long in the kit's frame and yaw
 * nothing. hulls/drifter.mjs is the consumer.
 * ------------------------------------------------------------------------ */

/**
 * The bivalve membrane over a bay, shut: two quarter-shells of membrane
 * grown `grow` proud of the lobe they cover, one outboard and one inboard,
 * hinged along the bay's waterline and meeting along its crown — so the
 * seam where they meet is the line that parts when the bay opens, and the
 * light along it (`baySeams`) is what shows first. Each shell is a sector
 * of the same orb as the lobe, cut at the crown meridian and the equator,
 * on half the lobe's facets round and half its rings down, so every vertex
 * lies on one of the lobe's own facet directions and the two nest instead
 * of crossing. Exported outboard then inboard, a bay at a time.
 *
 * `bays` is `[{ side, at: [x, y, z], radii: [rx, ry, rz] }]` — the lobe's
 * own centre and radii, as `cargoLobes` took them — and which way is
 * outboard is the sign of `z`; a bay on the keel line has no outboard and
 * is refused. `bay_valve_outboard_<side>`, `bay_valve_inboard_<side>`.
 */
export function bayValves(root, membrane, { bays, grow = 1.04, facets = [6, 3] }) {
  const [w, h] = facets;
  bays.forEach(({ side, at: [x, y, z], radii: [rx, ry, rz] }) => {
    if (!z) throw new Error(`bay_valve_${side}: a bay on the keel line has no outboard`);
    // three's sphere runs phi from -x through +z to +x, so [0, π) is the +z
    // half of the shell and [π, 2π) the -z half.
    const halves = z > 0 ? [0, Math.PI] : [Math.PI, 0];
    ['outboard', 'inboard'].forEach((which, i) =>
      add(
        root,
        `bay_valve_${which}_${side}`,
        new THREE.SphereGeometry(1, w, h, halves[i], Math.PI, 0, Math.PI / 2),
        membrane,
        [x, y, z],
        [0, 0, 0],
        [rx * grow, ry * grow, rz * grow]
      )
    );
  });
}

/**
 * The seam along a bay where its two valves meet: a bead of vein swept
 * along the valve's crown meridian, `reach` of its `rings` down the shell
 * forward and the same aft, through the shell's own ring stations so the
 * bead lies on the facets rather than floating over their chords, and sunk
 * `sink` into it. "A faint bioluminescent seam along each bay, brightening
 * only as it opens": the seam is a bay's one resting lamp, on the crown
 * where the top-down maps see it, and the Drifter's whole light budget is
 * two of them and a bow mark. `bay_seam_<side>`; `bays` and `grow` are
 * `bayValves`' own.
 */
export function baySeams(root, veinMat, opts) {
  const { bays, grow = 1.04, rings = 3, reach = 2, r = 0.18, sink = 0.08 } = opts;
  const { steps = 16, facets = 5 } = opts;
  bays.forEach(({ side, at: [x, y, z], radii: [rx, ry] }) => {
    const through = [];
    for (let k = -reach; k <= reach; k++) {
      const theta = (k * Math.PI) / 2 / rings;
      through.push([x + rx * grow * Math.sin(theta), y + ry * grow * Math.cos(theta) - sink, z]);
    }
    sweptVein(root, veinMat, { name: `bay_seam_${side}`, through, steps, r, facets });
  });
}

/**
 * Trim vanes rather than planes: small membrane leaves off the hull, each
 * its own size and its own rake — a matched pair would be a submarine's
 * bow planes, and this navy grows each side its own way, so a pair is
 * refused. A vane is `{ side, root: [x, y, z], corners, roll?, t? }`: its
 * plan outline in its own frame as `[x, out]` corners, `x` along the keel
 * from the root and `out` running outboard from it, laid flat, `t` thick,
 * and rolled `roll` radians about the root's own keel-wise axis in the
 * sense that dips a flank vane's tip; which side is outboard is the sign
 * of the root's `z`, and a vane rooted on the crown (`z` 0) at −π/2 stands
 * up as a dorsal. `trim_vane_<side>`.
 */
export function trimVanes(root, membrane, { vanes, t = 0.4 }) {
  refuseMirror('trim_vane', vanes, (v) => v.corners.map((c) => c.join()).join('|'));
  vanes.forEach(({ side, root: [x, y, z], corners, roll = 0, t: vt = t }) => {
    const sgn = Math.sign(z) || 1;
    add(
      root,
      `trim_vane_${side}`,
      plan(
        corners.map(([cx, out]) => [cx, sgn * out]),
        vt
      ),
      membrane,
      [x, y, z],
      [sgn * roll, 0, 0]
    );
  });
}

/**
 * The single muscle-drive fluke astern: one membrane paddle spanning the
 * keel from a plan outline of `[x, z]` in metres, `t` between its faces,
 * bevelled `bevel` and centred at `y`. One plate and not a pair, because
 * a drive is one muscle: the Spinner's flukes are `fins`, a mirrored pair
 * off a peduncle, and a transport's tail is not that. The outline need not
 * be symmetric about the keel and should not quite be. kit.mjs `plan`'s
 * bevel stands the paddle's waist a bevel proud of the outline all round,
 * so an outline drawn to the stern lands the hull's aftmost point a bevel
 * further aft — a caller that wants the file metre-true draws to the
 * design stern less the bevel.
 */
export function driveFluke(root, membrane, opts) {
  const { outline, y = 0, t = 0.4, bevel = 0, name = 'drive_fluke' } = opts;
  add(root, name, plan(outline, t, bevel), membrane, [0, y, 0]);
}

/* --------------------------------------------------------------------------
 * The scouts (#784, off #540 Phase 4): the Glider's wing and its folded tail.
 *
 * Built to its block, as the Drifter's builders above were: nothing here
 * answers to a binary in docs/concept-art/models/. X-long in the kit's
 * frame, yawing nothing. Both compose one side at a time — a wing is on the
 * flank its root's `z` names and has no mirror, which is docs/models-plan.md
 * §3.6's rule for the first plan in the roster not mirrored across its keel.
 * hulls/glider.mjs is the consumer.
 * ------------------------------------------------------------------------ */

/**
 * Where a leaf's outline crosses the station `u` along its span, in its
 * own frame: the depths at which the outline's polyline cuts `u`, least and
 * greatest — the chord a ring across the blade has to wrap. Sampled rather
 * than solved, because the outline is three quadratics and a station near
 * the tip cuts the curl twice.
 */
function leafChord(shape, u, divisions = 48) {
  const pts = shape.getPoints(divisions);
  const cuts = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if ((a.x - u) * (b.x - u) > 0 || a.x === b.x) continue;
    cuts.push(a.y + ((b.y - a.y) * (u - a.x)) / (b.x - a.x));
  }
  if (cuts.length < 2) throw new Error(`leafChord: no chord at ${u} on a leaf ${shape.L} long`);
  return [Math.min(...cuts), Math.max(...cuts)];
}

/**
 * The leading edge of a leaf as a polyline `inset` inside its margin, from
 * the root out along the crown's curve and round the tip to the point
 * furthest along the span — the edge that meets the water first when the
 * leaf lies with its stalk forward. The offset runs along each sample's
 * inward normal, which is to the right of travel because `leafOutline`
 * walks its margin clockwise.
 */
function leafLeadingEdge(shape, inset, divisions = 10) {
  const pts = shape.getPoints(divisions);
  let tip = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].x > pts[tip].x) tip = i;
  const edge = pts.slice(0, tip + 1);
  return edge.map((p, i) => {
    const a = edge[Math.max(0, i - 1)];
    const b = edge[Math.min(edge.length - 1, i + 1)];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return [p.x + (inset * (b.y - a.y)) / d, p.y - (inset * (b.x - a.x)) / d];
  });
}

/**
 * A wing that is a leaf — "a winged seed": one `leafOutline` blade laid flat
 * off a flank with its stalk forward, so its span runs aft along the keel
 * and its crown swells outboard. The margin from the root out and round to
 * the tip is the leading edge, the quick rise at the root what sweeps it,
 * and the curl at the tip the trailing edge, which comes back forward to
 * the flank; the stalk itself sits inside the body. One blade and never a
 * pair: which flank is the sign of the root's `z`, and `side` names it.
 * The blade is the kit's `plan` off the sampled outline, `t` between its
 * faces and bevelled `bevel` (the Sower's bed and the Drifter's fluke are
 * soft-edged the same way), so its waist stands a bevel proud of the
 * outline and the outline is its top face.
 *
 * `rings` are growth rings across the blade, `[{ at, halfWidth, proud,
 * tube, lean }]`: each a ridge lathed round the span axis (`ridgeRing`,
 * every approved Commune ring's cut) at `at` of the span, wrapping the
 * chord the blade has there (`leafChord`) plus `tube` beyond each edge,
 * and pressed flat to the blade so its crest stands `proud` of the top
 * face at mid-chord and its shoulders sink into the blade — a ring around a
 * body that is a membrane, which reads as a rib across it from above and a
 * ridge in the conn view. `lean` yaws it off square in plan, as the
 * Harvester's rings lean. No two alike is the caller's to keep.
 *
 * `vein` is the stiffening vein along the leading edge, a tube of `r`
 * swept `inset` inside the margin from the stalk round to the tip
 * (`leafLeadingEdge`), riding the top face `sink` below its crest — the one
 * lit part a wing carries, in whatever lamp the caller hands it.
 *
 * `<name>_<side>`, then `<name>_ring_<side><i>`, then `<name>_vein_<side>`,
 * `name` being `wing` unless said — the Glider's. The Reed's two blades are
 * this leaf at a third of the chord and pass `leaf_blade`, because its own
 * block says the hull has no wing and a part called one would contradict it
 * (hulls/reed.mjs).
 */
export function leafWing(root, { membrane, ridge, vein: veinMat }, opts) {
  const {
    side,
    root: [x0, y0, z0],
    span,
    depth,
    t = 0.4,
    bevel = 0.15,
    segments = 12,
    name = 'wing',
  } = opts;
  const { rings = [], vein, facets = 14 } = opts;
  if (!z0) throw new Error(`${name}_${side}: a leaf on the keel line has no flank`);
  const sgn = Math.sign(z0);
  const shape = leafOutline(span, depth);
  shape.L = span;
  // Stalk forward, span aft, crown outboard: the leaf's u runs to -x and
  // its v to the flank's own side.
  const toPlan = ([u, v]) => [x0 - u, z0 + sgn * v];
  const pts = shape.getPoints(segments).map((p) => [p.x, p.y]);
  if (pts.length > 2 && pts[0].join() === pts.at(-1).join()) pts.pop();
  add(root, `${name}_${side}`, plan(pts.map(toPlan), t, bevel), membrane, [0, y0, 0]);
  const top = t / 2 + bevel;
  refuseMirror(`${name}_ring_${side}`, rings, (r) => `${r.at}|${r.halfWidth}|${r.proud}`);
  rings.forEach(({ at, halfWidth = 0.6, proud = 0.3, tube = 0.4, lean = 0 }, i) => {
    const u = at * span;
    const [lo, hi] = leafChord(shape, u);
    const crown = (hi - lo) / 2 + tube;
    const [x, z] = toPlan([u, (lo + hi) / 2]);
    add(
      root,
      `${name}_ring_${side}${i}`,
      // The shoulders sink a blade's depth under the face; the crest rides
      // `proud` over it once the ring is pressed flat.
      ridgeRing({ crown, shoulder: crown * (top / (top + proud)) - tube, halfWidth, facets }),
      ridge,
      [x, y0, z],
      [0, lean, 0],
      [1, (top + proud) / crown, 1]
    );
  });
  if (vein) {
    const { r = 0.14, inset = 0.35, sink = 0.05, steps = 36, facets: vf = 5 } = vein;
    const through = leafLeadingEdge(shape, inset).map(([u, v]) => {
      const [x, z] = toPlan([u, v]);
      return [x, y0 + top - sink, z];
    });
    sweptVein(root, veinMat, { name: `${name}_vein_${side}`, through, steps, r, facets: vf });
  }
}

/**
 * The knuckle a tail hinges on: a squashed orb of ridge at `at`, `r`
 * across and `squash` of that tall. The Glider's is the stern its folded
 * tail turns on (`foldedTail`); the Weaver's is the joint its fluke hangs
 * from under an open lay port, where the paddle cannot root on the body
 * because the mouth astern of it has to stay clear (hulls/weaver.mjs).
 * `tail_knuckle`.
 */
export function tailKnuckle(root, ridge, { at, r, squash = 0.85, facets = [10, 6] }) {
  add(root, 'tail_knuckle', orb(...facets), ridge, at, [0, 0, 0], [r, r * squash, r]);
}

/**
 * The muscle-drive tail folded flat along the stem — the Drifter's
 * `driveFluke` with its drive cut: one membrane paddle hinged on a knuckle
 * at the stern and laid forward over the stem's back, `pitch` radians nose
 * up so that a flat blade lies along a crown that falls away astern. The
 * paddle's `outline` is `[x, z]` in the hinge's own frame, `x` forward from
 * the hinge, `t` between its faces and bevelled `bevel` like the fluke it
 * is. `knuckle` is `{ at: [x, y, z], r, squash }`, a squashed orb of ridge
 * the hinge turns on, exported first; the blade and its veins sit in a
 * `tail` frame at `hinge`, pitched, so a vein drawn on the blade's top face
 * stays on it.
 *
 * `veins` are the tail's own, `[[x, z], ...]` polylines on the top face in
 * the same frame, each swept as a tube of `r` (`sweptVein`) — in whatever
 * finish the caller hands in, because on a hull built with its drive cut
 * they are dark: they light only while the drive turns, and a part the
 * block lights in a later band is clad, not lit (docs/models-plan.md §3.2).
 *
 * `tail_knuckle`, then `tail_fluke`, then `tail_vein_<i>`.
 */
export function foldedTail(root, { membrane, ridge, vein: veinMat }, opts) {
  const { hinge, pitch = 0, outline, t = 0.4, bevel = 0.15, knuckle, veins = [] } = opts;
  const { r = 0.12, steps = 12, facets = 5, sink = 0.04 } = opts.vein ?? {};
  if (knuckle) tailKnuckle(root, ridge, knuckle);
  const frame = group(root, 'tail', { at: hinge, rot: [0, 0, pitch] });
  add(frame, 'tail_fluke', plan(outline, t, bevel), membrane);
  const top = t / 2 + bevel - sink;
  veins.forEach((through, i) =>
    sweptVein(frame, veinMat, {
      name: `tail_vein_${i}`,
      through: through.map(([x, z]) => [x, top, z]),
      steps,
      r,
      facets,
    })
  );
}

/* --------------------------------------------------------------------------
 * The ordnance hulls (#785, off #540 Phase 4): the Weaver's decoy pods and
 * the open lay port they leave by.
 *
 * Built to its block, as the Drifter's and the Glider's builders above
 * were: nothing here answers to a binary in docs/concept-art/models/.
 * X-long in the kit's frame, yawing nothing. hulls/weaver.mjs is the
 * consumer.
 * ------------------------------------------------------------------------ */

/**
 * Decoy pods strung along a stem — "three bulbs in a row down the aft two
 * thirds, each a smooth bladder the same size as the one before it, so the
 * plan is a beaded thread and the beads are the count": the Sower's
 * `bladder` orb (sixteen by eight, squashed) at one `r`, once at each `x`
 * of `stations`, centred on the stem's axis at `y` so the stem threads
 * them. Smooth — no cap, no ring, no bud, which is what sets them apart
 * from `mineSacs` and `seedPods` — and no lamp: a decoy is dark until it is
 * laid (docs/models-plan.md §3.2, rule 4).
 *
 * This is the one series in the navy that repeats a size on purpose, and
 * the module's refusal of a matched pair (`refuseMirror`) does not apply
 * to it: the pods are a magazine, the count is the argument, and a bead
 * that differed from the one before it would read as a different thing
 * carried rather than one more of the same. What stays grown is the lean
 * — each pod rolled and pitched its own few degrees off square by its
 * index, as `growthRings`' wobble leans a ring — never the size.
 * `decoy_pod_<i>`.
 */
export function decoyPods(root, chitin, opts) {
  const { name = 'decoy_pod', stations, y = 0, r, squash = 0.72, facets = [16, 8] } = opts;
  const { lean = 0 } = opts;
  stations.forEach((x, i) =>
    add(
      root,
      `${name}_${i}`,
      orb(...facets),
      chitin,
      [x, y, 0],
      [lean * Math.sin(1 + i * 2.4), 0, lean * Math.cos(2 + i * 1.7)],
      [r, r * squash, r]
    )
  );
}

/**
 * The open lay port in a tail — "the aftmost sits at an open lay port in
 * the tail": the stem's skin flared open astern into a cup the last pod
 * sits in with its aft half out of the mouth, and the membrane that
 * sheathed it peeled back off the rim. Three parts in three finishes:
 *
 * - `lay_port`, the cup: a lathe of the caller's `[x, r]` `profile` in
 *   chitin on the stem's `facets` and `squash`, stern to bow as every
 *   lathe profile here runs — the mouth is its first station and the
 *   throat its last, which is the stem's first, so the two lathes meet
 *   skin to skin. Open at both ends as every Commune stem is — the throat
 *   because the stem fills it, the mouth because the port is open. The
 *   caller keeps the cup's radius outside the pod's at every station they
 *   share, or the pod shows through the wall.
 * - `lay_port_lip`, the rim: a ridge (`ridgeRing`) lathed round the mouth
 *   at its radius, `lip` = `{ tube, rise, halfWidth? }` as `growthRings`
 *   takes them.
 * - `lay_sepal_<i>`, the peeled membrane: one ovate leaf each at `sepals`
 *   = `[{ angle, length, width, curl, t? }]`, rooted on the rim `angle`
 *   radians round from starboard (+z) towards the crown (+y), lying aft
 *   over the pod with its width along the rim and pitched `curl` radians
 *   outward at the tip — peeled back along the pod, not spread. Each its
 *   own size and angle, one side at a time (docs/models-plan.md §3.6); a
 *   matched pair is refused.
 *
 * "Port" is the block's word for the aperture, not the −z side: every part
 * here is centred on z, and the side convention stays the `_p`/`_s` suffix
 * (#642).
 */
export function layPort(root, { chitin, ridge, membrane }, opts) {
  const { profile, y = 0, squash = 0.8, facets = 14, lip, sepals = [] } = opts;
  add(root, 'lay_port', loft(profile, facets), chitin, [0, y, 0], [0, 0, 0], [1, squash, 1]);
  const [mx, mr] = profile[0];
  add(
    root,
    'lay_port_lip',
    ridgeRing({
      crown: mr + lip.tube,
      shoulder: mr + lip.tube - lip.rise,
      halfWidth: lip.halfWidth ?? lip.tube,
      facets,
    }),
    ridge,
    [mx, y, 0],
    [0, 0, 0],
    [1, squash, 1]
  );
  refuseMirror('lay_sepal', sepals, (s) => `${s.length}|${s.width}`);
  sepals.forEach(({ angle, length: len, width: w, curl = 0, t = 0.3 }, i) => {
    // The leaf in its own frame: root at the rim, tip `len` aft, its width
    // across z — which the roll about x below turns along the rim.
    const corners = [
      [0, -0.35 * w],
      [0, 0.35 * w],
      [-0.3 * len, 0.5 * w],
      [-0.7 * len, 0.42 * w],
      [-len, 0.08 * w],
      [-len, -0.08 * w],
      [-0.7 * len, -0.42 * w],
      [-0.3 * len, -0.5 * w],
    ];
    // XYZ: the pitch about z lifts the tip off the pod first, then the roll
    // about x carries the leaf's normal from +y round to the rim's radial
    // at `angle`, so it lies flat on the cup's wall at that bearing.
    add(
      root,
      `lay_sepal_${i}`,
      plan(corners, t),
      membrane,
      [mx, y + mr * squash * Math.sin(angle), mr * Math.cos(angle)],
      [Math.PI / 2 - angle, 0, -curl]
    );
  });
}

/* --------------------------------------------------------------------------
 * The siege hulls (#786, off #540 Phase 4): the Blight's parted husk and
 * the seeding arm that stands in it.
 *
 * Built to its block, as the Weaver's builders above were: nothing here
 * answers to a binary in docs/concept-art/models/. X-long in the kit's
 * frame, yawing nothing. Both compose one side at a time — a lobe is on
 * the flank its `z` names and is placed there by itself, never through
 * `bothSides` (docs/models-plan.md §3.6). hulls/blight.mjs is the consumer.
 * ------------------------------------------------------------------------ */

/**
 * Curl a lofted body outboard: every vertex from `from` along x to `to`
 * is carried across z by `reach · t²`, t running 0 to 1 over that span,
 * so the root stays where it was lathed and the tip swings out on a
 * quadratic — a husk lobe peeling away from the seed it covered, bent
 * rather than splayed, which a yaw of the whole lathe would be. x is
 * untouched, so a tip lathed at the bow stays the bow (kit.mjs
 * `metreTrue`). The normals are recomputed, because a bend is not a
 * rigid move and the lathe's were computed straight.
 */
function curlOutboard(geo, { from, to, reach, sgn }) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getX(i) - from) / (to - from)));
    pos.setZ(i, pos.getZ(i) + sgn * reach * t * t);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * The husk parted at the bow — "its husk parted at the bow into two
 * rounded lobes that curl outward": two lobes, each a lathe of its own
 * `[x, r]` `profile` in chitin on `facets`, squashed `squash`, laid along
 * the keel at its own signed `z` (port negative, #642) with its aft
 * stations buried in the body's nose and its fore station the tip, curled
 * outboard by `curl` metres over the run from `from` to that tip
 * (`curlOutboard`), then rolled `roll` radians about its own axis. Rounded
 * because a lathe closes at its tip on whatever the last stations draw and
 * the caller draws them blunt; "not a fork" is the caller's to keep, by
 * holding the lobes' outer edges inside the waist. Two because the block
 * counts two, and each its own profile, curl and roll — a matched pair is
 * refused. `husk_lobe_<side>`.
 */
export function huskLobes(root, chitin, { lobes, facets = 12 }) {
  refuseMirror('husk_lobe', lobes, (l) => `${l.profile.map((s) => s.join()).join('|')}|${l.curl}`);
  lobes.forEach(({ side, z, y = 0, profile, squash = 0.85, curl = 0, from, roll = 0 }) => {
    if (!z) throw new Error(`husk_lobe_${side}: a lobe on the keel line has no side`);
    const sgn = Math.sign(z);
    const tip = profile[profile.length - 1][0];
    const geo = curlOutboard(loft(profile, facets), {
      from: from ?? profile[0][0],
      to: tip,
      reach: curl,
      sgn,
    });
    add(root, `husk_lobe_${side}`, geo, chitin, [0, y, z], [roll, 0, 0], [1, squash, 1]);
  });
}

/**
 * The seeding arm standing in the cleft — "a short jointed stem folded
 * back on itself with the spore head at its tip, a pale sac under a
 * membrane, reaching no further than the husk's own lips". Six parts, in
 * this order: `seed_arm_root`, a squashed orb of ridge half-sunk in the
 * nose's crown at `joints[0]`; `seed_arm_stem_0`, a seven-sided tapered
 * spar from it to the elbow; `seed_arm_knuckle`, the elbow's orb at
 * `joints[1]`; `seed_arm_stem_1`, folded back from the elbow to the wrist
 * at `joints[2]`; `seed_arm_head`, the sac, a squashed orb in the caller's
 * pale finish centred at `head.at`; and `seed_arm_hood` over it, a
 * part-sphere of membrane `hood.grow` of the head's radius, covering the
 * sac's crown and back and open toward +x and below (three's sphere
 * starts its azimuth at −x, so `hood.phi` is the arc it covers, centred
 * aft), pitched `hood.pitch` nose-up about z so the sac presents forward
 * and up, and rolled `hood.roll` its own few degrees off square. The
 * stems are oriented by quaternion between their joints, kit.mjs
 * `strut`'s way, so the fold is whatever the three joints say; the caller
 * keeps every joint inside the lips. No part of it carries a lamp:
 * nothing on this arm brightens when it seeds (docs/models-plan.md §3.2,
 * rule 4).
 */
export function seedingArm(root, { ridge, chitin, sac, membrane }, opts) {
  const { joints, knuckles, stems, head, hood } = opts;
  const [rootAt, elbowAt, wristAt] = joints.map((j) => new THREE.Vector3(...j));
  const knuckle = (name, at, { r, squash = 0.85, facets = [10, 6] }) =>
    add(root, name, orb(...facets), ridge, at.toArray(), [0, 0, 0], [r, r * squash, r]);
  const stem = (name, a, b, { r: [rBase, rTip], facets = 7 }) => {
    const d = b.clone().sub(a);
    const mesh = new THREE.Mesh(cyl(rTip, rBase, d.length(), facets), chitin);
    mesh.name = name;
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    root.add(mesh);
    return mesh;
  };
  knuckle('seed_arm_root', rootAt, knuckles[0]);
  stem('seed_arm_stem_0', rootAt, elbowAt, stems[0]);
  knuckle('seed_arm_knuckle', elbowAt, knuckles[1]);
  stem('seed_arm_stem_1', elbowAt, wristAt, stems[1]);
  const { at, r, squash = 0.85, facets = [12, 6] } = head;
  add(root, 'seed_arm_head', orb(...facets), sac, at, [0, 0, 0], [r, r * squash, r]);
  const { grow = 1.14, phi = 1.1 * Math.PI, theta = 0.6 * Math.PI, pitch = 0, roll = 0 } = hood;
  const R = r * grow;
  add(
    root,
    'seed_arm_hood',
    new THREE.SphereGeometry(1, facets[0], facets[1], -phi / 2, phi, 0, theta),
    membrane,
    hood.at ?? at,
    [roll, 0, pitch],
    [R, R * squash, R]
  );
}

/* --------------------------------------------------------------------------
 * The line hulls, and the anchor (#787, off #540 Phase 4): the Reed's two
 * hardpoints and its standing drive, and the Bower's nursery.
 *
 * Built to their blocks, as the siege hulls' builders above were: nothing
 * here answers to a binary in docs/concept-art/models/. X-long in the kit's
 * frame, yawing nothing. Every one composes a side at a time — a node, a
 * row of nubs, a blade is on the flank its `z` names and is placed there by
 * itself, never through `bothSides` (docs/models-plan.md §3.6).
 * hulls/reed.mjs and hulls/bower.mjs are the consumers.
 * ------------------------------------------------------------------------ */

/**
 * The two hardpoints grown into a stem — "the Corvette's two hardpoints
 * grown into the stem below the nose as a pair of hollow nodes with lips,
 * one a side, the seed torpedoes inside them". Three parts a node, in this
 * order, and the starboard node's three before the port node's:
 *
 * - `seed_node_<side>`, the node: one lathe of the caller's `profile` in
 *   chitin, squashed `squash` and laid along X at its own `at` = [x, y, z],
 *   port negative (#642). It is *hollow* — the profile is a closed wall,
 *   not a skin: it runs aft-to-forward up the outside from the throat
 *   buried in the stem to the mouth, across the rim at one station, and
 *   back aft down the bore to its blind end, so the node has an inside as
 *   well as an outside and the mouth is a hole. Which way round the two
 *   halves are written is load-bearing and not a style: a lathe's faces
 *   wind from its profile's direction, and the outside drawn *aft*-ward
 *   comes out inside-out — nine tenths of the wall back-facing, which a
 *   single-sided chitin renders as a gap in a top-down bake. Outside first.
 * - `seed_node_lip_<side>`, the lip: a ridge (`ridgeRing`) lathed round the
 *   mouth at the profile's widest station, `lip` = `{ tube, rise,
 *   halfWidth? }` as `growthRings` and `layPort` take them. The block's
 *   "with lips", and the thing that flares for the instant of a launch —
 *   which is a transient and carries no lamp (docs/models-plan.md §3.2
 *   rule 3).
 * - `seed_torpedo_<side>`, the seed: a lathe of `seed.profile` in the pale
 *   finish lying in the bore with its point `seed.proud` metres out of the
 *   mouth, so what a scope sees at each lip is a pale nose and not a hole.
 *
 * Two, because the block counts two, and each its own size — a matched pair
 * is refused. This is not `seedLauncher`, the Corvette port's sheath with a
 * row of seeds in it, and there are no tubes: a reed is hollow and its
 * hardpoints are two swellings of the same stem.
 */
export function seedNodes(root, { chitin, ridge, seed: seedMat }, opts) {
  const { nodes, facets = 10 } = opts;
  refuseMirror('seed_node', nodes, (nd) => nd.profile.map((st) => st.join()).join('|'));
  nodes.forEach(({ side, at, profile, squash = 0.85, lip, seed }) => {
    const [x, y, z] = at;
    if (!z) throw new Error(`seed_node_${side}: a hardpoint on the keel line has no side`);
    add(root, `seed_node_${side}`, loft(profile, facets), chitin, at, [0, 0, 0], [1, squash, 1]);
    const mouth = profile.reduce((a, b) => (b[1] > a[1] ? b : a));
    add(
      root,
      `seed_node_lip_${side}`,
      ridgeRing({
        crown: mouth[1] + lip.tube,
        shoulder: mouth[1] + lip.tube - lip.rise,
        halfWidth: lip.halfWidth ?? lip.tube,
        facets,
      }),
      ridge,
      [x + mouth[0], y, z],
      [0, 0, 0],
      [1, squash, 1]
    );
    const nose = seed.profile[seed.profile.length - 1][0];
    add(
      root,
      `seed_torpedo_${side}`,
      loft(seed.profile, seed.facets ?? 8),
      seedMat,
      [x + mouth[0] + seed.proud - nose, y, z],
      [0, 0, 0],
      [1, seed.squash ?? 0.9, 1]
    );
  });
}

/**
 * The muscle-drive fluke stood on edge — "a narrow deep muscle-drive fluke
 * astern": `driveFluke`'s membrane paddle turned a quarter about the keel,
 * so its span is in height and its thickness across the beam. `outline` is
 * `[x, y]` in metres, the blade's own plan in elevation; `t` between its
 * faces, `bevel` as `plan` takes it, and the whole laid at `z` — the keel
 * line unless a hull wants it off.
 *
 * Its own builder because the two flukes are two different drives and the
 * plan is where the difference reads: every Commune tail until now lies
 * flat and is broad — the Drifter's, the Weaver's, the Blight's, the
 * Bower's — and a hull that is 0.07 of its length across cannot carry a
 * broad one and stay a reed. On edge the same muscle is deep instead, and
 * the track keeps a thin stern where the flat flukes give a wide one.
 * kit.mjs `plan`'s bevel stands the paddle proud of the outline all round,
 * so a caller that wants the file metre-true draws its aftmost edge to the
 * design stern less the bevel, and draws it as two points at one x: the
 * miter at a corner of a constant-x edge carries exactly the bevel aft.
 */
export function standingFluke(root, membrane, opts) {
  const { outline, y = 0, z = 0, t = 0.4, bevel = 0, name = 'drive_fluke' } = opts;
  const geo = plan(outline, t, bevel);
  // `plan` lays the outline's second coordinate on world z; a quarter turn
  // about the keel carries it to y and the slab's thickness to z.
  geo.rotateX(-Math.PI / 2);
  add(root, name, geo, membrane, [0, y, z]);
}

/**
 * The nursery — "the nursery under the lobes along each flank: brood
 * pouches showing through the shell as rows of paler nubs, where a
 * Spinner's mine regrows". One row a flank, each nub a squashed orb in the
 * caller's pale finish at `[x, y, z, r]`, half-sunk in the skin so it shows
 * *through* the shell rather than sitting on it — the Blight's spore sac in
 * miniature and repeated, which is the difference between a pouch and a
 * pod. `brood_nub_<side>_<i>`, the starboard row before the port.
 *
 * Counts and sizes differ a side and the two rows cannot be the same row
 * (`refuseMirror`): a brood is grown, not machined. No nub carries a lamp —
 * the block lights them only under way and grown out, so they are clad
 * (docs/models-plan.md §3.2 rule 2), and a row under a lobe is under it in
 * a top-down bake too, which is where the block puts it.
 */
export function broodNubs(root, pale, opts) {
  const { rows, facets = [8, 5], name = 'brood_nub' } = opts;
  // Key on the flank-independent fields: a nub is [x, y, z, r] and its z
  // carries the side's sign, so keying on the raw tuple gave two rows that
  // ARE each other's mirror two different keys and let them through — the
  // one case §3.6 asks this guard to refuse (#787 review).
  refuseMirror(name, rows, (r) =>
    r.nubs.map(([x, y, z, rad]) => `${x}|${y}|${Math.abs(z)}|${rad}`).join('|')
  );
  rows.forEach(({ side, nubs, squash = 0.55 }) =>
    nubs.forEach(([x, y, z, r], i) => {
      if (!z) throw new Error(`${name}_${side}_${i}: a pouch on the keel line has no flank`);
      add(
        root,
        `${name}_${side}_${i}`,
        orb(...facets),
        pale,
        [x, y, z],
        [0, 0, 0],
        [r, r * squash, r]
      );
    })
  );
}

export { THREE };

/* --------------------------------------------------------------------------
 * The Bio-Reactor (#788, off #540 Phase 4). The bed and the three intake
 * arms are the kit's (`reactorBed`, `reactorIntakeArm`) and identical on all
 * four navies; what is a navy's is the vessel that stands on the slab and
 * the outflow off it, which is these two builders.
 * ------------------------------------------------------------------------ */

/**
 * The render vessel, Pelagia Commune: a grown bladder. The navy whose
 * technology is "algae reactors" ([factions.md](factions.md)) is the one navy
 * for which this structure is not a machine bolted onto a bed but a bigger
 * version of what it already grows — so the vessel is the Sower's bladder at
 * settlement scale, a squashed orb ringed three times, held down by root
 * grips biting the slab, with a pale bud on its crown.
 *
 * The grips are the Commune's rule and no two are alike: one size repeated
 * five times would read as a machine, which is the argument the approved
 * turret's `rootGrips` above makes in its own words.
 *
 * `mark` is the vessel's one lamp. The nubs — the block's ports — carry the
 * bio-vein's *unlit* finish, because the block lights them only while crop
 * is coming in (docs/models-plan.md §3.2 rule 2).
 */
export function reactorVessel(root, { chitin, ridge, membrane, spore, lampM, unlit }, opts) {
  const { bladder, rings, grips, bud, mark, nubs } = opts;
  add(root, 'reactor_vessel', orb(12, 8), membrane, [0, bladder.y, 0], [0, 0, 0], bladder.r);
  rings.forEach((g, i) =>
    add(root, `vessel_ring_${i}`, torus(g.r, g.t, 5, 14), ridge, [0, g.y, 0], [Math.PI / 2, 0, 0])
  );
  grips.forEach((g, i) =>
    add(root, `root_grip_${i}`, cyl(g.r[0], g.r[1], g.h, 5), chitin, polar(g.bearing, g.at, g.y), [
      0,
      -g.bearing,
      g.lean,
    ])
  );
  add(root, 'crown_bud', orb(10, 6), spore, bud.at, [0, 0, 0], bud.r);
  add(root, 'crown_mark', box(...mark.size), lampM, mark.at, [0, mark.yaw ?? 0, 0]);
  nubs.at.forEach(([a, r, y], i) =>
    add(root, `vessel_nub_${i}`, orb(8, 6), unlit, polar(a, r, y), [0, -a, 0], nubs.scale)
  );
}

/**
 * The Biomass outflow, Pelagia Commune: a gut off the bladder on `bearing`,
 * ringed as the vessel is, swelling into the dispatch sac at its end —
 * "the Biomass outflow off the vessel to a dispatch hopper", grown rather
 * than bolted, which is why nothing here is square.
 *
 * The gut is one lathe along the bearing (kit.mjs `loft`) rather than a run
 * of pipe: a grown thing is continuous, and the rings are what give it
 * sections. Distances are metres out along the bearing, as the kit's
 * `reactorIntakeArm` takes them; the sac's mouth is the unlit finish for the
 * same reason the nubs are.
 */
export function reactorOutflow(root, { ridge, membrane, unlit }, opts) {
  const { bearing: a, gut, rings, sac, mouth } = opts;
  add(root, 'outflow_gut', loft(gut.profile, gut.facets ?? 8), membrane, [0, gut.y, 0], [0, -a, 0]);
  // A torus is born round +Z, so the turn that lays its axis on the bearing
  // is π/2 − a about Y, not −a: the rings ride the gut rather than stand
  // across it.
  rings.at.forEach((d, i) =>
    add(root, `gut_ring_${i}`, torus(rings.r, rings.t, 5, 12), ridge, polar(a, d, gut.y), [
      0,
      Math.PI / 2 - a,
      0,
    ])
  );
  add(root, 'outflow_sac', orb(10, 6), membrane, polar(a, sac.at, sac.y), [0, -a, 0], sac.r);
  add(root, 'sac_ring', torus(sac.ring.r, sac.ring.t, 5, 14), ridge, polar(a, sac.at, sac.ring.y), [
    Math.PI / 2,
    0,
    0,
  ]);
  add(root, 'sac_mouth', cyl(mouth.r, mouth.r, mouth.t, 8), unlit, polar(a, sac.at, mouth.y));
}

/* --------------------------------------------------------------------------
 * The carriers (#840): the Rootstock's budding sheaths.
 *
 * Built to its block, as every Phase 4 builder above was: nothing here
 * answers to a binary in docs/concept-art/models/. X-long in the kit's
 * frame, yawing nothing but what a site's own `yaw` turns. Every site is
 * placed a side at a time at its own signed z, never through `bothSides`
 * (docs/models-plan.md §3.6). hulls/rootstock.mjs is the consumer; the
 * Runner that fits the sheath is built from the module's existing
 * vocabulary alone (hulls/runner.mjs).
 * ------------------------------------------------------------------------ */

/**
 * A sheath's section: an open U with a broad rounded lip, in unit half-beam
 * `u` and half-height `v`, listed once round the solid — from the lip down
 * the inside, across the floor, up the far inside, over the far lip, down
 * the outside, under the keel and back up. A lathe cannot draw this: it is
 * round in section and closed over the top, and a bract that has shed its
 * bud is open.
 *
 * WHICH WAY ROUND IS LOAD-BEARING. kit.mjs `sweep` winds its faces from the
 * section's order *and* the stations' order, and this builder runs its
 * stations root to tip, +x-ward. Listed that way the section above faces
 * every triangle out of the wall; listed the other way — `CHINE`'s way —
 * the lip's top faces down, a single-sided bake culls it, and the top-down
 * height pass sees the inside of the sheath's keel through it, a hollow
 * with its rim *under* its floor. The first draft shipped that and only the
 * height probe caught it; the albedo looked right. (`CHINE` has no
 * consumer; the Tocsin's crystal spine, `sweep`'s one other caller, runs
 * its stations the other way and faces out — factions/hadron.mjs `bell`.)
 * The lip is 0.46 of a half-beam wide, 1.8 m on a 4 m sheath, because at
 * the 1 px/m the issue sets for reading a deck a rim narrower than two
 * pixels is not there.
 */
const SHEATH_SECTION = [
  [0.88, 0.6],
  [0.7, 0.64],
  [0.54, 0.57],
  [0.5, 0.24],
  [0.43, -0.12],
  [0.25, -0.37],
  [0, -0.45],
  [-0.25, -0.37],
  [-0.43, -0.12],
  [-0.5, 0.24],
  [-0.54, 0.57],
  [-0.7, 0.64],
  [-0.88, 0.6],
  [-1.0, 0.46],
  [-1.03, 0.14],
  [-0.94, -0.26],
  [-0.72, -0.63],
  [-0.38, -0.9],
  [0, -1],
  [0.38, -0.9],
  [0.72, -0.63],
  [0.94, -0.26],
  [1.03, 0.14],
  [1.0, 0.46],
];

/**
 * The lining's section: a thin crescent laid a few centimetres inside the
 * sheath's inner skin, listed the same way round, so its upper face is the
 * floor a top-down bake sees. Separate from the sheath because it is a
 * different tissue: the sheath is membrane, as every Commune leaf, vane and
 * fluke is, and the hollow it opens on is the hull's own dark chitin — the
 * place a bud lay, bared. That difference is a *value* step, the one kind
 * of difference both renderers keep (docs/asset-prompts-3d.md, Block 2b
 * rule 2), and it is what makes an empty sheath read from straight above as
 * a dark slot in a pale rim rather than as one more pale leaf.
 */
const LINING_SECTION = [
  [0.495, 0.55],
  [0.458, 0.245],
  [0.392, -0.095],
  [0.226, -0.325],
  [0, -0.4],
  [-0.226, -0.325],
  [-0.392, -0.095],
  [-0.458, 0.245],
  [-0.495, 0.55],
  [-0.525, 0.55],
  [-0.485, 0.24],
  [-0.415, -0.11],
  [-0.24, -0.35],
  [0, -0.43],
  [0.24, -0.35],
  [0.415, -0.11],
  [0.485, 0.24],
  [0.525, 0.55],
];

/** The lining's floor, in unit half-height: where a scar sits in it. */
const LINING_FLOOR = -0.4;

/**
 * A sheath's girth along its length, `[f, beam, height]` as fractions of
 * its length and of its `halfBeam` and `halfHeight`: closed to a point at
 * both ends, blunt at the root (f = 0, the node) and drawn out long to the
 * tip it opens toward — the shape of what it held, which is a seed body
 * pointed at its nose.
 */
const SHEATH_GIRTH = [
  [0, 0, 0],
  [0.035, 0.5, 0.52],
  [0.1, 0.78, 0.8],
  [0.2, 0.93, 0.94],
  [0.34, 1.0, 1.0],
  [0.5, 1.0, 1.0],
  [0.64, 0.93, 0.94],
  [0.77, 0.78, 0.82],
  [0.88, 0.55, 0.6],
  [0.96, 0.27, 0.32],
  [1, 0, 0],
];

/**
 * The budding sites along a stolon — the carrier's deck, grown: at each
 * node the bract a daughter shoot budded in, split open and *empty*. A
 * craft aboard is not an entity (docs/systems-combat.md §15, the deck
 * counts it) and a craft in the water is drawn as its own, so a Runner
 * modelled into a sheath would be drawn twice whenever the flight was out.
 * What the sheath says instead is the shape of what left it: a trough the
 * craft's length and girth, pointed at the end its nose lay in.
 *
 * Four parts a site, in a frame of its own (`bud_site_<i>`, kit.mjs
 * `group`) at the site's `at` — the sheath's root, where it leaves the
 * stem — yawed `yaw` radians off the keel toward its own flank so the open
 * end reaches forward and out (a lateral shoot grows toward the tip of the
 * axis that bears it) and rolled `roll` so the mouth tips a little
 * outboard:
 *
 * - `bud_node_<i>`, the node: a squashed orb in `knuckle` at `node.at` in
 *   the site's frame, covering the join of sheath and stem.
 * - `bud_sheath_<i>`, the bract: `SHEATH_SECTION` swept along `girth`
 *   (kit.mjs `sweep`) to `length`, `halfBeam` and `halfHeight`, in
 *   `sheath`.
 * - `sheath_lining_<i>`, the hollow: `LINING_SECTION` on the same girth, in
 *   `lining`.
 * - `bud_scar_<i>`, where the daughter was attached: a squashed orb in
 *   `scar` half-sunk in the floor at `scar.at` of the length from the root —
 *   the one pale fleck in a dark slot.
 *
 * No lamp on any of it. A launch is the hull's one loud moment and it is a
 * transient (docs/models-plan.md §3.2 rule 3); at rest the deck is dark,
 * and it reads by value and relief alone. Each site is its own size and
 * its own angle and a matched pair is refused — the navy grows each side
 * its own way. The sweep carries `uvAlike`'s zero UVs, or hull-intake warns
 * that its material cannot merge into one draw.
 */
export function buddingSheaths(root, { sheath, lining, scar, knuckle }, opts) {
  const { sites, girth = SHEATH_GIRTH } = opts;
  refuseMirror(
    'bud_sheath',
    sites,
    (s) => `${s.length}|${s.halfBeam}|${s.halfHeight}|${s.yaw}|${s.roll ?? 0}`
  );
  sites.forEach((site, i) => {
    const { at, yaw, roll = 0, length, halfBeam, halfHeight } = site;
    const { node, scar: bud } = site;
    const z = at[2];
    if (!z) throw new Error(`bud_sheath_${i}: a site on the keel line has no flank`);
    const sgn = Math.sign(z);
    const frame = group(root, `bud_site_${i}`, { at, rot: [sgn * roll, -sgn * yaw, 0] });
    const stations = girth.map(([f, b, h]) => [f * length, b * halfBeam, h * halfHeight, 0]);
    add(
      frame,
      `bud_node_${i}`,
      orb(...(node.facets ?? [10, 6])),
      knuckle,
      node.at,
      [0, 0, 0],
      [node.r, node.r * (node.squash ?? 0.7), node.r]
    );
    add(frame, `bud_sheath_${i}`, uvAlike(sweep(stations, SHEATH_SECTION)), sheath);
    add(frame, `sheath_lining_${i}`, uvAlike(sweep(stations, LINING_SECTION)), lining);
    // The floor's height at the scar's station, off the girth: a scar sits
    // in the hollow's floor, not on the sheath's keel under it.
    const fx = bud.at;
    let h = 0;
    for (let k = 1; k < girth.length; k++)
      if (fx <= girth[k][0]) {
        const [f0, , h0] = girth[k - 1];
        const [f1, , h1] = girth[k];
        h = h0 + ((h1 - h0) * (fx - f0)) / (f1 - f0);
        break;
      }
    const floor = LINING_FLOOR * h * halfHeight;
    add(
      frame,
      `bud_scar_${i}`,
      orb(...(bud.facets ?? [8, 5])),
      scar,
      [fx * length, floor - (bud.sink ?? 0.2) * bud.r, 0],
      [0, 0, 0],
      [bud.r, bud.r * (bud.squash ?? 0.6), bud.r]
    );
  });
}
