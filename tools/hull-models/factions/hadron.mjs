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
 *   blade_hull   75 m long, 4.4 m tall, **11.9 m in beam** — a four-facet
 *                lathe laid flat and pressed to 0.55 × 1.5 (hulls/clarion.mjs)
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
  bothSides,
  polar,
  part,
  drawn,
  group,
  capsule,
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
 * outline is drawn at `-sgn` to put the starboard plate at +z beside the
 * starboard edge. Written without the sign, `wing_p` and `wing_edge_p` sat
 * on opposite sides of the hull: invisible on a symmetric pair, and the
 * Reciter's three-part wing is where a bounds comparison stops agreeing
 * (#586).
 *
 * The rung's wings are given as an `outline` — the starboard half's plan,
 * `[x, z]` with z positive, drawn through `plan` so the side is the side it
 * names —
 * rather than parametrised, because each is a swept quadrilateral no
 * aft/chord/span form can say, and its `edge` is a second plan hugging the
 * tip rather than a box. `y` centres the plate. A `lamp` (the Reciter's) or a
 * `canard` (the Clarion's) is drawn *inside* each side's group, because the
 * approved files write the +z three — `wing_s wing_edge_s canard_s`, since
 * #642 turned the names round — before the port three and `check.mjs`
 * compares in order; `name` and `edgeName` are for the
 * Cantus, whose wings are guard blades. Given no outline, the Responsory's
 * wing is exactly what it was.
 *
 * The Chorister's guards and canards are the same pairs without an edge —
 * `edge` left out draws none — and `seated` (see `plane`) stands each plate
 * on its node's height as the early pass did; the canard takes its own
 * `seated` if it says so, and the wing's otherwise (#649).
 */
export function wings(root, { alloy, crystal, seam }, opts) {
  const { aft, fwd, inner, outer, tipChord = 8.5, t = 0.9 } = opts;
  const { outline = null, y = t, edge = null, lamp = null, canard = null, name = 'wing' } = opts;
  const { edgeName = `${name}_edge`, seated = false } = opts;
  bothSides((side, sgn) => {
    if (outline) {
      plane(root, `${name}_${side}`, alloy, { outline, t, y, seated }, sgn);
      if (edge) plane(root, `${edgeName}_${side}`, crystal, edge, sgn);
      if (lamp)
        add(root, `${name}_lamp_${side}`, box(...lamp.size), seam, [lamp.x, lamp.y, sgn * lamp.z]);
      if (canard) plane(root, `canard_${side}`, alloy, { seated, ...canard }, sgn);
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

/**
 * The vertical blades: a dorsal fin above and, but for the Cantus, a keel
 * below; `t` is the blade's thickness. Given `fin.outline` — its plan,
 * `[x, z]` in the file's own order — the fin is instead a plate stood on
 * its base and extruded `fin.height` up from `fin.y` (`plane`, seated): the
 * early pass's Chorister raised its fin from a plan rather than boxing it,
 * twelve unshared triangles where a box has twelve indexed, and a port keeps
 * the buffer (chorister-hadron.glb, #649).
 */
export function finAndKeel(root, alloy, { fin, keel = null, t = 0.6 }) {
  if (fin.outline) {
    const { outline, height, y } = fin;
    plane(root, 'dorsal_fin', alloy, { outline, t: height, y, seated: true }, 1);
  } else add(root, 'dorsal_fin', box(fin.length, fin.height, t), alloy, [fin.x, fin.y, 0]);
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
 *
 * `x` places the spar along the hull. The rung's three draw every station
 * absolute and leave it at 0; the Chorister's three segments are one spar
 * drawn at three stations, its own profile about its own middle, and each
 * node carries the station (chorister-hadron.glb, #649).
 */
export function spar(root, name, mat, { profile, facets = 4, x = 0, y = 0, flat = [1, 1] }) {
  const geo = loft(profile, facets, Math.PI / facets);
  return add(root, name, geo, mat, [x, y, 0], [0, 0, 0], [1, flat[0], flat[1]]);
}

/**
 * A crystal point: a four-sided pyramid `length` long on a square base of
 * half-diagonal `r`, laid along the hull with its tip forward. The rung's
 * emitter and its core, the muzzle, the bow prism and the drive are all this
 * shape; the Cantus's apex is the same pyramid stood on its base.
 *
 * `tipUp` is the early pass's cut of the same point: born with its apex on
 * +y (`cyl(0, r, …)`) and laid forward by -π/2, where the rung's three are
 * born apex-down and laid by +π/2. The eight triangles land on the same
 * vertices with the same winding either way — only the buffer's order
 * differs — and the Chorister's bow and drive prisms keep the file's
 * (chorister-hadron.glb, #649), because a port reproduces the buffer.
 */
export function point(root, name, mat, { x, y = 0, r, length, tipUp = false }) {
  if (tipUp) return add(root, name, cyl(0, r, length, 4), mat, [x, y, 0], [0, 0, -Math.PI / 2]);
  return add(root, name, cyl(r, 0, length, 4), mat, [x, y, 0], [0, 0, Math.PI / 2]);
}

/**
 * A thin plane from its starboard plan `outline`, `t` thick, centred at `y`,
 * drawn on `sgn`'s side. `seated` stands it on y = 0 instead — the slab from
 * 0 to `t` — which is where the early pass left the Chorister's five plates,
 * their node carrying the height (chorister-hadron.glb, #649). The mirrored
 * side comes out exactly as that file has it, and for a reason worth
 * knowing: `plan` closes its path, so the outline reaches ExtrudeGeometry
 * with its first point repeated, and a mirrored outline — now
 * counter-clockwise — is reversed *before* that duplicate is dropped, so the
 * `_p` contour keeps the `_s` contour's first point and walks the other
 * way. The approved plates were built through the same call, and a port
 * that wrote the mirrored points by hand would re-cut every lid.
 */
function plane(root, name, mat, { outline, t, y, seated = false }, sgn) {
  const geo = plan(
    outline.map(([x, z]) => [x, sgn * z]),
    t
  );
  if (seated) geo.translate(0, t / 2, 0);
  return add(root, name, geo, mat, [0, y, 0]);
}

/**
 * Lit seams ringing the bow horn: `count` boxes of `length` by `section`
 * (`[height, width]`) on an ellipse `halfHeight` by `halfBeam` about the
 * horn's axis at `x`, `y`. Seam 0 sits `phase` radians round from the crown
 * toward starboard and the rest follow at equal steps the other way — the order
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
 * four. Values are the approved turret's own — its `shadow_indigo` included,
 * which is not the Clarion's `ink.shadowIndigo` but a shade darker and duller
 * (#2C2244 at 0.25 against #3B2E5A at 0.35), and the emissive strength of its
 * two lamps, banked below the token at 0.8 and 0.9 (`intensity`; the default
 * of 1 writes no strength, as before) (#639).
 */
export const structureInk = {
  shadowIndigo: () => clad('shadow_indigo', hex('#2C2244'), 0.25, 0.45),
  darkSteel: () => clad('dark_steel', hex('#1C2230'), 0.4, 0.4),
  alloyDim: () => clad('alloy_dim', hex('#8A8FA3'), 0.35, 0.32),
  crystalDim: (intensity = 1) =>
    lamp('resonance_crystal_dim', hex('#8B5CF6'), hex('#1E1038'), 0.15, intensity),
  navLight: (intensity = 1) => lamp('nav_light', hex('#C9A6FF'), hex('#241744'), 0.3, intensity),
};

/**
 * The exchanger on the end of a Vent Tap's draw arm, on `bearing` (#608): a
 * crystal prism square in section with pyramid ends, the alloy frame bar
 * over it, the lit seam between them, the crystal spine — a slim pyramid —
 * standing off the top, and the buttress blade wedged between the platform and the exchanger
 * — an instrument, not a vessel, and the one head of the four whose every
 * part is a straight edge. Distances are metres out along the bearing, as
 * the kit's `ventDrawArm` takes them.
 *
 * The prism and the frame are four-facet lofts turned an eighth about their
 * axis, so a flat face is up rather than an edge (kit.mjs `loft`). The
 * approved seam lies inside the frame's section, under its top face, where
 * the top-down bake has never seen it; `exportGlb`'s light audit says so on
 * every arm, and it is carried across rather than lifted (#540).
 */
export function exchangerHead(root, { crystal, alloy, seam }, opts) {
  const { bearing: a, at, prism, frame, seam: strip, spine: crest, buttress: blade } = opts;
  const yaw = [0, -a, 0];
  add(root, 'exchanger_prism', loft(prism.profile, 4, Math.PI / 4), crystal, polar(a, at, prism.y), yaw);
  add(root, 'exchanger_frame', loft(frame.profile, 4, Math.PI / 4), alloy, polar(a, at, frame.y), yaw);
  add(root, 'exchanger_seam', box(...strip.size), seam, polar(a, at, strip.y), yaw);
  // A four-sided pyramid, not an octahedron: the approved file's eight
  // triangles are four faces on a square base with a vertex at its centre
  // (three r169 draws `cyl(0, r, …)` as 2n triangles). The two share a
  // bounding box and differ by a twelfth of their area.
  add(root, 'crystal_spine', cyl(0, crest.r, crest.h, 4), crystal, polar(a, at, crest.y));
  // A triangle in plan — base across the arm at `blade.at`, point reaching
  // `blade.reach` back toward the wellhead — stood on its base rather than
  // centred, which is how the approved file carries it.
  const wedge = plan(
    [
      [-blade.halfBase, 0],
      [blade.halfBase, 0],
      [0, blade.reach],
    ],
    blade.t
  );
  wedge.translate(0, blade.t / 2, 0);
  add(root, 'buttress', wedge, alloy, polar(a, blade.at, blade.y), [0, -(a + Math.PI / 2), 0]);
}

/** A mirrored pair, tagged `r` and `l` — the Order's exact bilateral symmetry. */
export function pair(fn) {
  fn('r', -1);
  fn('l', 1);
}

/**
 * The export's own `_r` placement, on `sgn`'s side of a `pair`: x negated
 * for the `_l`, and the y and z angles with it, which is the mirror of an XYZ
 * Euler across the export's x. The approved turret's every pair decomposes
 * exactly so (#639).
 */
const sided = (sgn, [x, y, z], [a = 0, b = 0, c = 0] = []) =>
  drawn([-sgn * x, y, z], [a, -sgn * b, -sgn * c]);

/**
 * The emplacement: a faceted frustum on the ground, a collar where the head
 * turns, and skirt blades raking outward from it.
 *
 * Every number is the approved turret's own (#639), through kit.mjs `drawn`:
 * the frustum's centre and its `yaw` on the node — the approved octagon is turned an eighth
 * there, and the bake measures the turned box (kit.mjs `fitFootprint`) —
 * `collar.facets` round, and `blades` an object: each blade a four-sided
 * pyramid of radius `r` with its own `[bearing, length]` (radians from +X
 * toward +Z), stood on the `anchor` circle `[radius, y]`, its axis the outward
 * radial with `lift` added to y before normalising, its centre `seat` of its
 * length out along that axis, and turned onto the axis by the one rotation
 * that carries +Y there. That construction regenerates the approved node
 * matrices to the sixth decimal; each pair's `_l` mirrors its `_r` in x, which
 * puts the third pair's `_r` at -x, as the file has it.
 */
export function emplacement(root, { shadow, steel, dim }, opts) {
  const { at, yaw = 0, r, rTop = r * 0.84, height, collar, blades } = opts;
  part(root, 'base_frustum', cyl(rTop, r, height, 8), shadow, drawn(at, [0, yaw, 0]));
  // A torus is born in the XY plane; a collar lies flat, so it is laid down.
  const ring = torus(collar.r, collar.t, 5, collar.facets ?? 16);
  part(root, 'base_collar', ring, steel, drawn([at[0], collar.y, at[2]], [Math.PI / 2, 0, 0]));
  const up = new THREE.Vector3(0, 1, 0);
  blades.each.forEach(([bearing, length], i) => {
    const out = new THREE.Vector3(Math.cos(bearing), 0, Math.sin(bearing));
    const axis = out.clone().setY(blades.lift).normalize();
    const c = out
      .multiplyScalar(blades.anchor[0])
      .setY(blades.anchor[1])
      .addScaledVector(axis, blades.seat * length);
    const q = new THREE.Quaternion().setFromUnitVectors(up, axis);
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    pair((tag, sgn) =>
      part(
        root,
        `skirt_blade_${i}_${tag}`,
        cyl(0, blades.r, length, 4),
        i % 2 ? dim : steel,
        sided(sgn, c.toArray(), [e.x, e.y, e.z])
      )
    );
  });
}

/**
 * The head: a wedge that trains, its visor, the crest above it, and the pair
 * of struts that take the recoil back into the collar. The crest is the one
 * part of an Order structure that stands proud of everything else, which is
 * what makes the kind readable from above at 120 m.
 *
 * Every number is the approved turret's own (#639), through kit.mjs `drawn`,
 * and in the file's order: the two struts first — five-facet rods, `r` `[top,
 * bottom]` by `length`, the `_l` mirroring the `_r` placement in x — on the
 * root, then a `turret_head` node at `at` carrying the wedge (a six-facet
 * frustum, `r` `[top, bottom]` by `height`, its node scaled `scale`), the
 * visor box and the crest, a four-sided pyramid. Returns the head node, which
 * is where `railGun` hangs the rail.
 *
 * The wedge is six-sided rather than square. "Blade-like, crystalline
 * silhouettes" (docs/asset-prompts-3d.md, Block 2) is a facet count as much
 * as a proportion, and a rectangle is the one plan shape this navy never has.
 */
export function gunHead(root, { shadow, steel, dim }, { at, wedge, visor, crest, struts }) {
  pair((tag, sgn) =>
    part(
      root,
      `recoil_strut_${tag}`,
      cyl(struts.r[0], struts.r[1], struts.length, 5),
      steel,
      sided(sgn, struts.at, struts.rot)
    )
  );
  const head = group(root, 'turret_head', drawn(at));
  const wedgeGeo = cyl(wedge.r[0], wedge.r[1], wedge.height, 6);
  part(head, 'head_wedge', wedgeGeo, dim, drawn([0, 0, 0], [0, 0, 0], wedge.scale));
  part(head, 'head_visor', box(...visor.size), shadow, drawn(visor.at, visor.rot));
  part(head, 'head_crest', cyl(0, crest.r, crest.length, 4), steel, drawn(crest.at, crest.rot));
  return head;
}

/**
 * The rail: root, mid and tip in one straight run from `from` to `to`, with a
 * crystal vane each side of the mid section and the muzzle pip on the end.
 *
 * A rail rather than a barrel because the Order's weapons are instruments —
 * and because a straight run is the shape a top-down map can still read once
 * the emplacement below it has gone dark.
 *
 * Every number is the approved turret's own (#639): a `barrel_group` node
 * under `parent` — the head node `gunHead` returns — at `at`, pitched `pitch`
 * about x, and inside it, each at its own `z` along the group: the root and
 * mid bars (`size`), a vane box each side at ±`x`, the tip — a four-sided
 * pyramid `r` by `length`, stood on its base — and the pip, a sphere of five
 * by four segments. Returns the group.
 */
export function railGun(parent, { steel, dim, vane, pip }, opts) {
  const { at, pitch, root: bar, mid, vanes, tip, pip: dot } = opts;
  const g = group(parent, 'barrel_group', drawn(at, [pitch, 0, 0]));
  part(g, 'rail_root', box(...bar.size), steel, drawn([0, 0, bar.z]));
  part(g, 'rail_mid', box(...mid.size), dim, drawn([0, 0, mid.z]));
  pair((tag, sgn) =>
    part(g, `rail_vane_${tag}`, box(...vanes.size), vane, sided(sgn, [vanes.x, 0, vanes.z]))
  );
  const stood = drawn([0, 0, tip.z], [Math.PI / 2, 0, 0]);
  part(g, 'rail_tip', cyl(0, tip.r, tip.length, 4), steel, stood);
  part(g, 'muzzle_pip', new THREE.SphereGeometry(dot.r, 5, 4), pip, drawn([0, 0, dot.z]));
  return g;
}

/**
 * Magazines abaft the emplacement, a feed pipe from each into the collar.
 *
 * Every number is the approved turret's own (#639), in the file's order —
 * both pipes, then both pods: each pipe a six-facet rod, `r` `[top, bottom]`;
 * each pod a capsule of radius `r` and `waist` with three-step caps and seven
 * facets, laid out as three r184 lays a capsule (kit.mjs `capsule`); the `_l`
 * of each mirroring the `_r` placement in x.
 */
export function magazine(root, steel, { pods, pipe }) {
  pair((tag, sgn) =>
    part(
      root,
      `feed_pipe_${tag}`,
      cyl(pipe.r[0], pipe.r[1], pipe.length, 6),
      steel,
      sided(sgn, pipe.at, pipe.rot)
    )
  );
  pair((tag, sgn) =>
    part(
      root,
      `ammo_pod_${tag}`,
      capsule(pods.r, pods.waist, 3, 7),
      steel,
      sided(sgn, pods.at, pods.rot)
    )
  );
}

/**
 * Navigation marks, flat on an upward face — the only light a turret shows
 * until it fires. Named rather than numbered, because the Order places them
 * in mirrored pairs and a bare index would hide which pair is which. They are
 * the approved turret's spheres of `r` on five by four segments at the
 * export's own `[x, y, z]`, the `_r` at +x (#639).
 */
export function navMarks(root, light, { marks, r }) {
  for (const [name, x, y, z] of marks)
    pair((tag, sgn) =>
      part(root, `nav_mark_${name}_${tag}`, new THREE.SphereGeometry(r, 5, 4), light, sided(sgn, [x, y, z]))
    );
}

/* --------------------------------------------------------------------------
 * Shared kinds. The Light Scout is the first of the six kinds every navy
 * models (#588, off #540 Phase 3), and the Order's is blades: a fore blade
 * and an aft one, four-sided crystal prisms drawn to a point and edged in
 * pale alloy, a canopy, guard wings, four fins and a drive — the same prism
 * fourteen times — and a lit seam on the spine that is its whole resting
 * light. The builders take the approved export's own numbers (kit.mjs
 * `drawn`); hulls/light-scout-pelagia.mjs states the scale decision the
 * shared kinds follow.
 * ------------------------------------------------------------------------ */

/**
 * The Light Scout's palette: the Clarion's three claddings to the value, and
 * a seam that is the crystal-glow token through and through, burning at 1.6
 * — not `ink`'s near-black-based lamp. Values are the approved export's own.
 */
export const scoutInk = {
  shadowIndigo: () => clad('shadow_indigo', hex('#3B2E5A'), 0.35, 0.45),
  paleAlloy: () => clad('pale_alloy', hex('#E6E9F2'), 0.85, 0.22),
  resonanceCrystal: () => clad('resonance_crystal', hex('#8B5CF6'), 0.4, 0.18),
  crystalSeam: () => lamp('crystal_seam', hex('#C9A6FF'), hex('#C9A6FF'), 0.3, 1.6),
};

/**
 * A crystal prism: a four-sided spar along the length, `fore` and `aft` its
 * two end radii — a blade when one end is drawn to a point, a fin when it is
 * short and stood on end, a nozzle when it tapers astern — squashed flat by
 * its node's scale. "Blade-like, crystalline silhouettes" (Block 2) is a
 * facet count, and on this hull the count is four.
 *
 * The four Z-long kinds behind the scout (#649) are the same prism at their
 * own sizes, with two more readings of it. `facets` is eight on the
 * Submersible's pressure hull — its three lengths of hull, four pressure
 * bands and bow tip are one drum drawn rounder, and "heavy segmented
 * pressure carapace" said the Order's way is a faceted tube — and four
 * everywhere else. `upright` leaves the prism standing on the export's y
 * exactly as its buffer holds it, and `fore` is then the +y end: the guard
 * wings of the Corvette and the Cruiser, and their edges, were drawn as
 * struts between two points — a cylinder born on y and carried to the tip
 * by a full three-axis Euler on the node — and a port keeps the buffer and
 * the node rather than turning the one to simplify the other.
 */
export function prism(root, mat, opts) {
  const { name, fore, aft, length, facets = 4, upright = false, ...placement } = opts;
  const geo = cyl(fore, aft, length, facets);
  return part(root, name, upright ? geo : geo.rotateX(Math.PI / 2), mat, placement);
}

/**
 * The Submersible's palette: the scout's three claddings to the value, and
 * the same crystal-glow seam banked to 1.1 — the one resting light on a hull
 * that idles at SIG 22 and is "born to crush depth" (docs/asset-prompts-3d.md,
 * the Abyssal Submersible block, read with the Hadron FACTION block). Values
 * are the approved export's own (abyssal-submersible-hadron.glb, #649).
 */
export const submersibleInk = {
  ...scoutInk,
  crystalSeam: () => lamp('crystal_seam', hex('#C9A6FF'), hex('#C9A6FF'), 0.3, 1.1),
};

/**
 * The Cruiser's palette: the scout's two claddings, and two lamps of its own
 * on the crystal-glow base — a core glow that is the token through and
 * through at 4.5, on the dorsal and ventral spines, the fork crystals of
 * the hydrophone masts and the drive, and a panel glow a shade deeper
 * (#9B6CF9) at 3.2 on the eight facet panels along the flanks. "Sustained
 * glow from vents, sensor arrays and lit ports — this is a loud ship and it
 * looks it" (the Cruiser block); these are the strongest lamps on any Order
 * hull, and the bake caps both at 1 (kit.mjs `lamp`). Values are the
 * approved export's own (cruiser-hadron.glb, #649).
 */
export const cruiserInk = {
  shadowIndigo: scoutInk.shadowIndigo,
  paleAlloy: scoutInk.paleAlloy,
  crystalCoreGlow: () => lamp('crystal_core_glow', hex('#C9A6FF'), hex('#C9A6FF'), 0.3, 4.5),
  crystalPanelGlow: () => lamp('crystal_panel_glow', hex('#9B6CF9'), hex('#C9A6FF'), 0.3, 3.2),
};

/**
 * The mirrored pair as the four Z-long shared-kind exports draw one — `_p`
 * first, at the export's +x, and `_s` its mirror across it — is the kit's
 * `flanks`/`flank` (#649): it was written here first, the Consortium's
 * module grew the same one, and two copies of a side rule is what #642 was
 * about. Re-exported so the Order's hulls read as one vocabulary.
 */
export { flanks, flank } from '../kit.mjs';

/**
 * The Chorister's cage: four struts of alloy holding the bladder's segments
 * in line — "grown chitin over a pressure bladder" (the Chorister block)
 * said the Order's way is a bladder held in a frame. Each is a four-facet
 * rod tapering from `r[0]` at its head to `r[1]` at its foot, `length`
 * long, born standing on y, at ±`at[0]` along the hull and ±`at[2]` across
 * it at height `at[1]`, leaned `lean` about x toward the centreline —
 * numbered aft first and the +z one of each pair first, which is how the
 * approved file counts them (chorister-hadron.glb, #649). An X-long export,
 * so nothing here is yawed.
 */
export function cage(root, alloy, { r, length, at, lean }) {
  [
    [-1, 1],
    [-1, -1],
    [1, 1],
    [1, -1],
  ].forEach(([sx, sz], i) =>
    add(
      root,
      `cage_strut_${i}`,
      cyl(r[0], r[1], length, 4),
      alloy,
      [sx * at[0], at[1], sz * at[2]],
      [-sz * lean, 0, 0]
    )
  );
}

export { THREE };
