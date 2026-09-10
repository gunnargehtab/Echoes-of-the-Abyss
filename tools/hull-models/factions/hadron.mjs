/**
 * The Hadron Knights — the Order's shape language.
 *
 * "Precise bilateral symmetry (the only faction with it); blade-like,
 * crystalline silhouettes — instruments and blades. Polished pale alloy with
 * violet resonance crystal, mirror facets" (docs/asset-prompts-3d.md, Block 2).
 *
 * The vocabulary is read off the Clarion, which is the approved model every
 * later Order hull answers to — its own node names are the parts list, and its
 * proportions are the rule that matters most:
 *
 *   blade_hull   75 m long, 8 m tall, **8 m in beam**
 *   wing_p/s     30 m long, **0.9 m thick**, reaching to 17 m each side
 *   canard_p/s   12 m long, 0.7 m thick, forward
 *   dorsal_fin   5 m ·  keel 3 m ·  drive_prism at the stern
 *
 * So an Order hull is a **narrow faceted spar with thin planar wings**, and its
 * beam is wing rather than body. A wide flat extrusion reads as a slab from
 * above and is the one silhouette this navy must never have.
 *
 * Every Order hull's *listed* SIG is a cone figure (docs/systems-echo.md §8), so
 * light goes forward: the bow array is the bright thing, the spine a thread to
 * it, the flanks unlit at every posture.
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
  octa,
  plate,
  plan,
  loft,
  strut,
  bothSides,
} from '../kit.mjs';

/**
 * The Order's palette, as the Clarion's own materials carry it: the four
 * tokens of docs/art-direction.md, and — where the approved model needed a
 * colour the docs do not name — that model's own hex, exactly (kit.mjs `hex`).
 */
export const ink = {
  shadowIndigo: () => clad('shadow_indigo', hex('#3B2E5A'), 0.35, 0.45),
  paleAlloy: () => clad('pale_alloy', hex('#E6E9F2'), 0.85, 0.22),
  resonanceCrystal: () => clad('resonance_crystal', hex('#8B5CF6'), 0.4, 0.18),
  crystalSeam: () => lamp('crystal_seam', hex('#C9A6FF'), hex('#1A1030')),
  // The node's glow is not the crystal-glow token: it is the Clarion's own,
  // a shade bluer, and every Order hull since has carried it.
  resonanceNode: () => lamp('resonance_node', hex('#A77CFF'), hex('#2A1A50')),
};

/**
 * The blade hull: a faceted spar, full forward and narrowing aft to almost
 * nothing. `maxR` is the half-section amidships — keep it near a tenth of the
 * length, as the Clarion's 4 m on 75 m is.
 *
 * The rung's three are drawn on their own `profile` instead — the approved
 * models' `[x, r]` stations, four facets laid `flat` (`spar` below) — because
 * a port transcribes, and none of them is the fraction-of-length swell here.
 */
export function bladeBody(root, mat, { bow, stern, maxR, facets = 10, profile = null, flat }) {
  if (profile) return spar(root, 'blade_hull', mat, { profile, facets, flat });
  const L = bow - stern;
  const at = (t) => stern + L * t;
  // Fine point aft, swelling a little forward of amidships, drawn down to a
  // narrow nose where the array takes over. The Clarion's own proportion.
  add(
    root,
    'blade_hull',
    loft(
      [
        [at(0), 0.0],
        [at(0.06), maxR * 0.3],
        [at(0.2), maxR * 0.62],
        [at(0.4), maxR * 0.9],
        [at(0.58), maxR],
        [at(0.76), maxR * 0.94],
        [at(0.9), maxR * 0.72],
        [at(1), maxR * 0.42],
      ],
      facets
    ),
    mat
  );
}

/**
 * The spine: a raised ridge along the back, its inlay, and the lit thread.
 *
 * Given a `profile` it is the rung's spine instead: a four-facet ridge lathed
 * on its own stations (`spar`), the inlay another (`spineInlay`) — drawn here
 * when `inlay` is given, or by the hull itself when something comes between
 * the two in the approved order, as the Reciter's lance does.
 */
export function spine(root, { alloy, crystal, seam }, opts) {
  const { from, to, y, thread = true, profile = null, flat, inlay = null } = opts;
  if (profile) {
    spar(root, 'blade_spine', alloy, { profile, y, flat });
    if (inlay) spineInlay(root, crystal, inlay);
    return;
  }
  const L = to - from;
  const c = (from + to) / 2;
  add(root, 'blade_spine', box(L, 1.6, 2.4), alloy, [c, y, 0]);
  add(root, 'spine_inlay', box(L * 0.94, 0.5, 0.9), crystal, [c, y + 0.9, 0]);
  if (thread)
    add(root, 'spine_thread', box(L * 0.7, 0.25, 0.35), seam, [c - L * 0.05, y + 1.22, 0]);
}

/**
 * The bow array: a faceted horn, its lip, the emitter crystal and its core —
 * and the standing glow, which rides the horn's *top* so the top-down bake can
 * see it. A glow inside the cone is invisible to gate 3.
 */
export function bowArray(root, { alloy, crystal, seam, node }, opts) {
  const { from, to, r, y = 0, horn = null, lip = null, ridges = true, emitter = null } = opts;
  const L = to - from;
  // The Clarion's array is the Responsory's said in the rung's forms: a horn
  // and a lip that are six-facet lathes on their own stations with a vertex on
  // the crown (`spar`), a lip that is lit, no ridges — its ring of `hornSeams`
  // is drawn after this — and an emitter that is a crystal `point` rather
  // than a stood-up octahedron. Each is an option so that, given none, the
  // Responsory's array is exactly what it was.
  if (horn) spar(root, 'array_horn', alloy, { facets: 6, y, ...horn });
  else
    add(
      root,
      'array_horn',
      cyl(r, r * 0.28, L, 6),
      alloy,
      [from + L / 2, y, 0],
      [0, 0, -Math.PI / 2]
    );
  if (lip) spar(root, 'array_lip', lip.mat ?? crystal, { facets: 6, y, ...lip });
  else
    add(
      root,
      'array_lip',
      cyl(r * 1.16, r * 1.16, 1.6, 6),
      crystal,
      [to - 0.8, y, 0],
      [0, 0, Math.PI / 2]
    );
  if (ridges) {
    add(root, 'array_ridge', box(L * 0.9, 0.5, 1.6), seam, [from + L / 2, y + r * 0.86, 0]);
    bothSides((side, sgn) =>
      add(root, `array_ridge_${side}`, box(L * 0.9, 0.4, 0.5), seam, [
        from + L / 2,
        y + r * 0.78,
        sgn * 1.5,
      ])
    );
  }
  if (emitter) {
    point(root, 'emitter_crystal', crystal, { y, ...emitter });
    point(root, 'emitter_core', node, { y, ...emitter.core });
    return;
  }
  add(
    root,
    'emitter_crystal',
    octa(r * 0.5),
    crystal,
    [to + r * 0.5, y, 0],
    [0, 0, Math.PI / 2],
    [1.4, 1, 1]
  );
  add(
    root,
    'emitter_core',
    octa(r * 0.25),
    node,
    [to + r * 0.5, y, 0],
    [0, 0, Math.PI / 2],
    [1.4, 1, 1]
  );
}

/**
 * A thin swept wing, port and starboard, with a lit outboard edge.
 *
 * `plate` lands an outline's second coordinate on **-z** (kit.mjs), so the
 * outline is drawn at `-sgn` to put the port plate at +z beside the port
 * edge. Written without the sign, `wing_p` and `wing_edge_p` sat on opposite
 * sides of the hull: invisible on a symmetric pair, and the Reciter's
 * three-part wing is where a bounds comparison stops agreeing (#586).
 *
 * The rung's wings are given as an `outline` — the port half's plan, `[x, z]`
 * with z positive, drawn through `plan` so the side is the side it names —
 * rather than parametrised, because each is a swept quadrilateral no
 * aft/chord/span form can say, and its `edge` is a second plan hugging the
 * tip rather than a box. `y` centres the plate. A `lamp` (the Reciter's) or a
 * `canard` (the Clarion's) is drawn *inside* each side's group, because the
 * approved files write `wing_p wing_edge_p canard_p` before the starboard
 * three and `check.mjs` compares in order; `name` and `edgeName` are for the
 * Cantus, whose wings are guard blades. Given no outline, the Responsory's
 * wing is exactly what it was.
 */
export function wings(root, { alloy, crystal, seam }, opts) {
  const { aft, fwd, inner, outer, tipChord = 8.5, t = 0.9 } = opts;
  const { outline = null, y = t, edge, lamp = null, canard = null, name = 'wing' } = opts;
  const { edgeName = `${name}_edge` } = opts;
  bothSides((side, sgn) => {
    if (outline) {
      plane(root, `${name}_${side}`, alloy, { outline, t, y }, sgn);
      plane(root, `${edgeName}_${side}`, crystal, edge, sgn);
      if (lamp)
        add(root, `${name}_lamp_${side}`, box(...lamp.size), seam, [lamp.x, lamp.y, sgn * lamp.z]);
      if (canard) plane(root, `canard_${side}`, alloy, canard, sgn);
      return;
    }
    add(
      root,
      `wing_${side}`,
      plate(
        [
          [aft, -sgn * inner],
          [aft, -sgn * outer],
          [aft + tipChord, -sgn * outer],
          [fwd, -sgn * inner],
        ],
        t
      ),
      alloy
    );
    add(root, `wing_edge_${side}`, box(tipChord * 0.95, t * 1.5, 0.8), crystal, [
      aft + tipChord / 2,
      0,
      sgn * (outer - 0.4),
    ]);
  });
}

/** A small forward wing — the Clarion's canard, smaller and unlit. Drawn at `-sgn`, as `wings` is. */
export function canards(root, alloy, { from, to, inner, outer, t = 0.7 }) {
  bothSides((side, sgn) =>
    add(
      root,
      `canard_${side}`,
      plate(
        [
          [to, -sgn * inner],
          [to, -sgn * outer],
          [from, -sgn * (outer - 1.5)],
          [from, -sgn * inner],
        ],
        t
      ),
      alloy,
      [0, 0, 0]
    )
  );
}

/** The vertical blades: a dorsal fin above and, but for the Cantus, a keel below; `t` is the blade's thickness. */
export function finAndKeel(root, alloy, { fin, keel = null, t = 0.6 }) {
  add(root, 'dorsal_fin', box(fin.length, fin.height, t), alloy, [fin.x, fin.y, 0]);
  if (keel) add(root, 'keel', box(keel.length, keel.height, t), alloy, [keel.x, keel.y, 0]);
}

/**
 * The stern: the drive, its crystal ring, and the one mark astern.
 *
 * The Responsory's drive is a six-sided shadow-indigo frustum with a ring —
 * the defaults. The rung's three end in a crystal point instead: four
 * `facets`, no `taper`, no `ring`, cut in `mat` crystal — and each marks its
 * stern in its own way (`mark`: a name, a material, a size and a place) or,
 * the Cantus, not at all (`mark: null`).
 */
export function drive(root, { shadow, crystal, node }, opts) {
  const { x, r, facets = 6, taper = 0.34, length = r * 3.4, mat = shadow, ring = true } = opts;
  const { mark = {} } = opts;
  add(root, 'drive_prism', cyl(r, r * taper, length, facets), mat, [x, 0, 0], [0, 0, Math.PI / 2]);
  if (ring)
    add(
      root,
      'drive_ring',
      cyl(r * 1.1, r * 1.1, 1, 6),
      crystal,
      [x + r * 1.6, 0, 0],
      [0, 0, Math.PI / 2]
    );
  if (mark) {
    const { name = 'stern_mark', mat: lit = node, size = [0.6, 0.6, 1.4] } = mark;
    const { x: markX = x - r * 0.6, y: markY = r * 1.4 } = mark;
    add(root, name, box(...size), lit, [markX, markY, 0]);
  }
}

/**
 * A resonator ring in its cradle — the Responsory's own part, kept here
 * because it is an Order form (a tuned instrument, bilaterally paired) and the
 * next Order hull that listens across the beam should reuse it rather than
 * redraw it.
 */
export function resonatorRing(root, { shadow, alloy, crystal, node }, { x, y, z, r, cant }) {
  bothSides((side, sgn) => {
    add(root, `ring_cradle_${side}`, box(r * 1.7, 1.5, r * 0.9), shadow, [
      x,
      y - 1.9,
      sgn * z * 0.72,
    ]);
    add(root, `cradle_lip_${side}`, box(r * 1.8, 0.4, r * 1.0), alloy, [
      x,
      y - 1.1,
      sgn * z * 0.72,
    ]);
    add(
      root,
      `resonator_ring_${side}`,
      torus(r, r * 0.15, 8, 28),
      alloy,
      [x, y + r * 0.7, sgn * z],
      [sgn * cant, 0, 0]
    );
    add(
      root,
      `ring_inner_${side}`,
      torus(r * 0.74, 0.35, 6, 28),
      crystal,
      [x, y + r * 0.7, sgn * z],
      [sgn * cant, 0, 0]
    );
    add(
      root,
      `ring_core_${side}`,
      torus(r * 0.74, 0.18, 5, 28),
      node,
      [x, y + r * 0.7, sgn * z],
      [sgn * cant, 0, 0]
    );
    add(
      root,
      `ring_stay_${side}`,
      cyl(0.35, 0.35, r * 0.9, 6),
      alloy,
      [x, y + r * 0.1, sgn * (z - 1.3)],
      [sgn * cant, 0, 0]
    );
  });
}

/** Tight ceramic panel seams — "the Order builds nothing bare". */
export function panelSeams(root, alloy, { from, to, count, halfBeam }) {
  bothSides((side, sgn) => {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      add(root, `panel_seam_${side}${i}`, box(0.3, 2.2, 0.3), alloy, [
        from + (to - from) * t,
        0,
        sgn * halfBeam * (1 - t * 0.35),
      ]);
    }
  });
}

/* --------------------------------------------------------------------------
 * The rung's three — the Clarion, the Cantus and the Reciter (#586). Their
 * approved models share a construction the Responsory does not use: every
 * body, spar and crystal is an open lathe of few facets laid flat (`spar`),
 * every point is a four-sided pyramid (`point`), and every wing is its own
 * plan. The builders below are read off those three binaries and take their
 * numbers as parameters; the next Order hull composes from them.
 * ------------------------------------------------------------------------ */

/**
 * A faceted lathe along X — the section every Order spar and crystal is cut
 * to. `profile` is the approved model's own `[x, r]` stations; `facets` sides
 * with the first seam half a facet round from the beam (kit.mjs `loft`), so
 * four facets sit on a flat and six carry a vertex on the crown; `flat` is
 * `[height, beam]` as multiples of the lathe radius. `[0.55, 1.5]` is a square
 * on its corner pressed into the blade every rung hull is, and the reason
 * none of them reads as a tube from above.
 */
export function spar(root, name, mat, { profile, facets = 4, y = 0, flat = [1, 1] }) {
  const geo = loft(profile, facets, Math.PI / facets);
  return add(root, name, geo, mat, [0, y, 0], [0, 0, 0], [1, flat[0], flat[1]]);
}

/**
 * A crystal point: a four-sided pyramid `length` long on a square base of
 * half-diagonal `r`, laid along the hull with its tip forward. The rung's
 * emitter and its core, the muzzle, the bow prism and the drive are all this
 * shape; the Cantus's apex is the same pyramid stood on its base.
 */
export function point(root, name, mat, { x, y = 0, r, length }) {
  return add(root, name, cyl(r, 0, length, 4), mat, [x, y, 0], [0, 0, Math.PI / 2]);
}

/** A thin plane from its port plan `outline`, `t` thick, centred at `y`, drawn on `sgn`'s side. */
function plane(root, name, mat, { outline, t, y }, sgn) {
  const geo = plan(
    outline.map(([x, z]) => [x, sgn * z]),
    t
  );
  return add(root, name, geo, mat, [0, y, 0]);
}

/**
 * Lit seams ringing the bow horn: `count` boxes of `length` by `section`
 * (`[height, width]`) on an ellipse `halfHeight` by `halfBeam` about the
 * horn's axis at `x`, `y`. Seam 0 sits `phase` radians round from the crown
 * toward port and the rest follow at equal steps the other way — the order
 * the approved Clarion numbers its own. Each is rolled to lie flat on its
 * facet and then turned `skew` radians about its own radial axis, so the ring
 * spirals a little and dives into the horn toward the lip; the approved model
 * does exactly that, and a port keeps it.
 */
export function hornSeams(root, mat, opts) {
  const { x, y = 0, length, section, halfHeight, halfBeam, count = 6, phase = 0, skew = 0 } = opts;
  for (let i = 0; i < count; i++) {
    const a = phase - (i * 2 * Math.PI) / count;
    add(
      root,
      `horn_seam_${i}`,
      box(length, section[0], section[1]),
      mat,
      [x, y + halfHeight * Math.cos(a), halfBeam * Math.sin(a)],
      [a, skew, 0]
    );
  }
}

/** The inlay alone: the crystal run let into the spine's top, a four-facet lathe like the spine it rides. */
export function spineInlay(root, crystal, { profile, y, flat }) {
  return spar(root, 'spine_inlay', crystal, { profile, y, flat });
}

/**
 * The lance: the Reciter's forward run, and the one Order weapon that is not
 * a cone. The `needle` is a four-facet spar drawn out to a point, the `rail` a
 * lit bar let into its top, the `crystal` a second spar amidships along it,
 * the `seams` a lit pair either side, and the `muzzle` a crystal point on the
 * end. It lives here rather than in the hull because the next Knight hull is
 * the Lance, whose block asks for "nothing of the Lance's chevron or the
 * Reciter's needle" — the two are told apart by construction only if the
 * needle is a shape the module draws.
 */
export function lance(root, ink, { needle, rail, crystal, seams, muzzle }) {
  spar(root, 'lance', ink.alloy, needle);
  add(root, 'lance_rail', box(rail.length, rail.section[0], rail.section[1]), ink.seam, [
    rail.x,
    rail.y,
    0,
  ]);
  spar(root, 'lance_crystal', ink.crystal, crystal);
  bothSides((side, sgn) =>
    add(root, `lance_seam_${side}`, box(seams.length, seams.section[0], seams.section[1]), ink.seam, [
      seams.x,
      seams.y,
      sgn * seams.z,
    ])
  );
  point(root, 'muzzle', ink.node, muzzle);
}

/** The four quadrants of a hull as `[sx, sz]`, in the order the approved Cantus numbers its cradle. */
const QUADRANTS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A resonance node standing on the hull in a four-legged cradle — the Cantus,
 * "a resonance node on a hull" (docs/asset-prompts-3d.md, Block 3). Two
 * flattened lozenges (`lower`, `upper`: four-facet spars) make the crystal, a
 * point stands at its `apex`, and four legs run down to feet on the flanks,
 * strut then foot a quadrant at a time — each a six-facet rod tapering from
 * `r[0]` at the node to `r[1]` at the foot. Two lit `spineSeams` sit on the
 * spine fore and aft of it, and four lit `ridges` run down its shoulders
 * last — the order the approved model writes and the order `check.mjs` holds.
 *
 * Three things here are the approved binary's own geometry, transcribed and
 * not corrected, because a port is not where a shape gets decided (#594
 * straightened the first of them to bilateral, and that was the decision
 * that closed it): the legs lean as Euler angles, `lean` about X and then
 * about Z, so none lands on a diagonal; each ridge is turned `yaw` about Y
 * and then dipped `pitch` (Y then X), which is not a diagonal either; and the
 * aft pair carries that pitch with its sign reversed, so where the forward
 * ridges fall outboard from the apex the aft ones *rise* toward the flank.
 */
export function resonanceNode(root, ink, { lower, upper, apex, cradle, spineSeams, ridges }) {
  spar(root, 'node_lower', ink.crystal, lower);
  spar(root, 'node_upper', ink.crystal, upper);
  add(root, 'node_apex', cyl(0, apex.r, apex.length, 4), ink.seam, [0, apex.y, 0]);
  QUADRANTS.forEach(([sx, sz], i) => {
    add(
      root,
      `cradle_strut_${i}`,
      cyl(cradle.r[0], cradle.r[1], cradle.length, 6),
      ink.alloy,
      [sx * cradle.at[0], cradle.at[1], sz * cradle.at[2]],
      [-sz * cradle.lean, 0, sx * cradle.lean]
    );
    add(root, `cradle_foot_${i}`, box(...cradle.foot.size), ink.shadow, [
      sx * cradle.foot.at[0],
      cradle.foot.at[1],
      sz * cradle.foot.at[2],
    ]);
  });
  for (const [name, sgn] of [
    ['seam_fore', 1],
    ['seam_aft', -1],
  ])
    add(
      root,
      name,
      box(spineSeams.length, spineSeams.section[0], spineSeams.section[1]),
      ink.seam,
      [sgn * spineSeams.x, spineSeams.y, 0]
    );
  QUADRANTS.forEach(([sx, sz], i) => {
    const ridge = add(root, `node_ridge_${i}`, box(...ridges.size), ink.node, [
      sx * ridges.at[0],
      ridges.at[1],
      sz * ridges.at[2],
    ]);
    const yaw = sx * (sz > 0 ? ridges.yaw : Math.PI - ridges.yaw);
    ridge.rotation.set(sx * ridges.pitch, yaw, 0, 'YXZ');
  });
}

/** The Cantus's bow: a plain alloy point where the Clarion has its horn, and one navigation mark abaft it. */
export function bowPrism(root, { alloy, seam }, { x, r, length, mark }) {
  point(root, 'bow_prism', alloy, { x, r, length });
  add(root, 'nav_bow', box(...mark.size), seam, [mark.x, mark.y, 0]);
}

/* --------------------------------------------------------------------------
 * Structures. A settlement is the same architecture grown four ways, so the
 * base / mount / head / barrel family lives here beside the hull vocabulary
 * rather than in any one structure script (#553, off #540 Phase 3).
 *
 * The Order's structures are the hull rules stood on end: bilateral symmetry
 * is exact, the emplacement is a faceted frustum rather than a mound, and the
 * gun is a *rail* — a straight instrument, vaned in crystal, not a tube.
 * ------------------------------------------------------------------------ */

/**
 * The structure palette: the Order's hull ink, dimmed.
 *
 * A Sentinel Turret is "nearly black — an ambush predator, navigation marks
 * only until it fires" (docs/asset-prompts-3d.md, the Sentinel Turret block),
 * and the Clarion's polished `pale_alloy` is the opposite of that. So the
 * structures carry their own names rather than a shared dimming factor
 * applied to `ink`: the dimming is not uniform across the four navies — the
 * Order dulls a *metal*, the Directorate darkens a *body* colour, and the
 * Consortium's `work_lamp` is a different fixture rather than a dimmed
 * `amber_lamp` — so one factor would have to be overridden three times in
 * four. Values are the approved turret's own.
 */
export const structureInk = {
  darkSteel: () => clad('dark_steel', hex('#1C2230'), 0.4, 0.4),
  alloyDim: () => clad('alloy_dim', hex('#8A8FA3'), 0.35, 0.32),
  crystalDim: () => lamp('resonance_crystal_dim', hex('#8B5CF6'), hex('#1E1038'), 0.15),
  navLight: () => lamp('nav_light', hex('#C9A6FF'), hex('#241744'), 0.3),
};

/** A mirrored pair, tagged `r` and `l` — the Order's exact bilateral symmetry. */
export function pair(fn) {
  fn('r', -1);
  fn('l', 1);
}

/**
 * The emplacement: a faceted frustum on the ground, a collar where the head
 * turns, and skirt blades raking outward from it. `blades` are
 * `[degrees, radius, [length, height, width]]` about the frustum's axis and
 * are mirrored, so the emplacement cannot come out lopsided.
 */
export function emplacement(root, { shadow, steel, dim }, opts) {
  const { x = 0, z = 0, r, rTop = r * 0.84, height, collar, blades = [] } = opts;
  add(root, 'base_frustum', cyl(rTop, r, height, 8), shadow, [x, height / 2, z]);
  // A torus is born in the XY plane; a collar lies flat, so it is laid down.
  add(root, 'base_collar', torus(collar.r, collar.t, 5, 16), steel, [x, collar.y, z], [
    Math.PI / 2,
    0,
    0,
  ]);
  blades.forEach(([deg, rad, size], i) => {
    const a = (deg * Math.PI) / 180;
    pair((tag, sgn) =>
      add(
        root,
        `skirt_blade_${i}_${tag}`,
        octa(1),
        i % 2 ? dim : steel,
        [x + rad * Math.cos(a), size[1] / 2 + 3.5, z + sgn * rad * Math.sin(a)],
        [0, sgn * a, 0],
        [size[0] / 2, size[1] / 2, size[2] / 2]
      )
    );
  });
}

/**
 * The head: a wedge that trains, its visor, the crest above it, and the pair
 * of struts that take the recoil back into the collar. The crest is the one
 * part of an Order structure that stands proud of everything else, which is
 * what makes the kind readable from above at 120 m.
 */
export function gunHead(root, { shadow, steel, dim }, opts) {
  const { x, y, wedge, visor, crest, struts } = opts;
  // Six-sided rather than square. "Blade-like, crystalline silhouettes"
  // (docs/asset-prompts-3d.md, Block 2) is a facet count as much as a
  // proportion, and a rectangle is the one plan shape this navy never has.
  add(root, 'head_wedge', cyl(1, 1, 1, 6), dim, [x, y, 0], [0, Math.PI / 6, 0], [
    wedge[0] / 2,
    wedge[1],
    wedge[2] / 2,
  ]);
  add(root, 'head_visor', cyl(1, 1, 1, 6), shadow, [
    x + wedge[0] * 0.22,
    y + wedge[1] * 0.45,
    0,
  ], [0, Math.PI / 6, 0], [visor[0] / 2, visor[1], visor[2] / 2]);
  add(root, 'head_crest', octa(1), steel, [x - wedge[0] * 0.15, y + crest[1] / 2 + 4, 0], [0, 0, 0], [
    crest[0] / 2,
    crest[1] / 2,
    crest[2] / 2,
  ]);
  pair((tag, sgn) =>
    strut(
      root,
      `recoil_strut_${tag}`,
      [struts.from[0], struts.from[1], sgn * struts.from[2]],
      [struts.to[0], struts.to[1], sgn * struts.to[2]],
      steel,
      struts.t
    )
  );
}

/**
 * The rail: root, mid and tip in one straight run from `from` to `to`, with a
 * crystal vane each side of the mid section and the muzzle pip on the end.
 *
 * A rail rather than a barrel because the Order's weapons are instruments —
 * and because a straight run is the shape a top-down map can still read once
 * the emplacement below it has gone dark.
 */
export function railGun(root, { steel, dim, vane, pip }, { from, to, r }) {
  const A = new THREE.Vector3(...from);
  const B = new THREE.Vector3(...to);
  const d = B.clone().sub(A);
  const at = (t) => A.clone().addScaledVector(d, t);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    d.clone().normalize()
  );
  const seg = (name, t0, t1, rad, mat) => {
    const mesh = add(root, name, cyl(rad, rad, len * (t1 - t0), 6), mat);
    mesh.geometry.rotateZ(-Math.PI / 2);
    mesh.position.copy(at((t0 + t1) / 2));
    mesh.quaternion.copy(q);
    return mesh;
  };
  seg('rail_root', 0, 0.42, r, steel);
  seg('rail_mid', 0.38, 0.78, r * 0.62, dim);
  pair((tag, sgn) => {
    const v = add(root, `rail_vane_${tag}`, box(len * 0.36, r * 1.1, r * 0.22), vane);
    v.position.copy(at(0.58)).add(new THREE.Vector3(0, 0, sgn * r * 0.68));
    v.quaternion.copy(q);
  });
  seg('rail_tip', 0.76, 0.98, r * 0.5, steel);
  const p = add(root, 'muzzle_pip', new THREE.SphereGeometry(r * 0.3, 8, 6), pip);
  p.position.copy(at(1));
}

/** Magazines abaft the emplacement, a feed pipe from each into the collar. */
export function magazine(root, steel, { pods, pipe }) {
  pair((tag, sgn) => {
    add(
      root,
      `ammo_pod_${tag}`,
      new THREE.SphereGeometry(1, 10, 6),
      steel,
      [pods.x, pods.y, sgn * pods.z],
      [0, 0, 0],
      [pods.size[0] / 2, pods.size[1] / 2, pods.size[2] / 2]
    );
    strut(
      root,
      `feed_pipe_${tag}`,
      [pipe.from[0], pipe.from[1], sgn * pipe.from[2]],
      [pipe.to[0], pipe.to[1], sgn * pipe.to[2]],
      steel,
      pipe.t
    );
  });
}

/**
 * Navigation marks, flat on an upward face — the only light a turret shows
 * until it fires. Named rather than numbered, because the Order places them
 * in mirrored pairs and a bare index would hide which pair is which.
 */
export function navMarks(root, light, { marks, w = 3.2, d = 3.2 }) {
  for (const [name, x, y, z] of marks)
    pair((tag, sgn) => add(root, `nav_mark_${name}_${tag}`, box(w, 0.6, d), light, [x, y, sgn * z]));
}

export { THREE };
