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
 * light goes forward: the bow array is the bright thing, the spine at most a
 * thread to it, the flanks unlit at every posture.
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
  sweep,
  bothSides,
  polar,
  part,
  drawn,
  group,
  capsule,
  sidedPost,
  zLong,
  xLong,
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
  /**
   * The seam's base worn as cladding: a part the block lights only in a
   * later band — the Herald's tine seams, lit under way and dark at rest —
   * is built as a part and carries the lamp family's *unlit* finish, never
   * a lamp (docs/models-plan.md §3.2, rule 2; the Directorate's
   * `biolightUnlit` is the same rule for its bay doors). It is `crystal_seam`'s
   * own base, `#1A1030`, at the lamp's metalness and roughness, so the seam
   * lit and the seam dark are one value apart and nothing else (Block 2b,
   * rule 3); it recolours to near-black under any flag.
   */
  crystalSeamUnlit: () => clad('crystal_seam_unlit', hex('#1A1030'), 0, 0.4),
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
 * The spine: a raised ridge along the back, its inlay, and — for a hull whose
 * block lights its spine at rest — the lit thread. `thread` is asked for,
 * never assumed, since #775: a lamp is a claim about SIG (gate 3), and the one
 * hull that inherited a thread from this option's old default drew it for two
 * passes against a block that puts its thread under way (the Responsory's
 * header). No Order hull lights its spine at rest today.
 *
 * Given a `profile` it is the rung's spine instead: a four-facet ridge lathed
 * on its own stations (`spar`), the inlay another (`spineInlay`) — drawn here
 * when `inlay` is given, or by the hull itself when something comes between
 * the two in the approved order, as the Reciter's lance does. `name` is for
 * a hull whose spine is interrupted — the Antiphon's landing deck cuts its
 * back in two, and the after ridge cannot be a second `blade_spine`.
 */
export function spine(root, { alloy, crystal, seam }, opts) {
  const { from, to, y, thread = false, profile = null, flat, inlay = null } = opts;
  const { name = 'blade_spine' } = opts;
  if (profile) {
    spar(root, name, alloy, { profile, y, flat });
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
 *
 * So is a core inside its crystal. The core is the crystal at half size,
 * and drawn on the crystal's own centre it is a lamp sealed in opaque
 * stone: the Responsory's was, from #531 to #645, and the audit named it on
 * every build. `coreLead` is how far the core's *tip* stands proud of the
 * crystal's: the core's centre comes forward by the quarter-radius that
 * levels the two tips and then by the lead, and because the two octahedra
 * are the same shape the core's forward faces then stand proud of the
 * crystal's by exactly the lead — the emitter's forward faces lit, which
 * is where a cone hull's light is, and the Clarion's own idiom: its core
 * (`emitter.core`) is a point 0.9 m proud of its crystal's tip. Left
 * unset, the core sits sealed on the crystal's centre, for a caller that
 * wants it so.
 */
export function bowArray(root, { alloy, crystal, seam, node }, opts) {
  const { from, to, r, y = 0, horn = null, lip = null, ridges = true, emitter = null } = opts;
  const { coreLead = null } = opts;
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
  const coreX = coreLead == null ? to + r * 0.5 : to + r * 0.75 + coreLead;
  add(root, 'emitter_core', octa(r * 0.25), node, [coreX, y, 0], [0, 0, Math.PI / 2], [1.4, 1, 1]);
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
 * Cantus, whose wings are guard blades. `edge.mat` is for an edge the block
 * lights only under way — the Lance's guard edges, which carry the seam's
 * unlit finish (`ink.crystalSeamUnlit`, models-plan.md §3.2 rule 2) — and
 * is the crystal otherwise, as `bowArray`'s `lip.mat` is. Given no outline,
 * the Responsory's wing is exactly what it was.
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
      if (edge) plane(root, `${edgeName}_${side}`, edge.mat ?? crystal, edge, sgn);
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
 * the Cantus, not at all (`mark: null`). `y` lifts the prism off the hull
 * axis, for a drive that sits in the spine rather than in the tail (the
 * Antiphon); every other Order hull leaves it on the axis. `mark.pitch` lays
 * the mark on a crown that slopes — the Tocsin's bell rises 10° toward its
 * lip where the mark sits, and a level box there is buried at one end and
 * floating at the other; every other Order hull's crown is level under its
 * mark and leaves it at 0, which writes the rotation it always had.
 */
export function drive(root, { shadow, crystal, node }, opts) {
  const { x, r, facets = 6, taper = 0.34, length = r * 3.4, mat = shadow, ring = true } = opts;
  const { mark = {}, y = 0 } = opts;
  add(root, 'drive_prism', cyl(r, r * taper, length, facets), mat, [x, y, 0], [0, 0, Math.PI / 2]);
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
    const { name = 'stern_mark', mat: lit = node, size = [0.6, 0.6, 1.4], pitch = 0 } = mark;
    const { x: markX = x - r * 0.6, y: markY = r * 1.4 } = mark;
    add(root, name, box(...size), lit, [markX, markY, 0], [0, 0, pitch]);
  }
}

/**
 * A resonator ring in its cradle — the Responsory's own part, kept here
 * because it is an Order form (a tuned instrument, bilaterally paired) and the
 * next Order hull that listens across the beam should reuse it rather than
 * redraw it.
 *
 * The ring is cold. Its block says so of the resting state — "the bow array
 * holding a low standing glow and the rings cold" — and the resting state is
 * the one the chart bakes and gate 3 calibrates. From #531 to #645 each ring
 * carried a `ring_core` besides: a torus of `resonance_node` at the inner
 * ring's own radius with a tube half the inner ring's, so it lay sealed
 * inside the crystal — 280 triangles a side the kit's light audit scored at
 * no plan area and named on every build, and that the bake's rasteriser
 * still caught a tangent sliver of, seven pixels at 7/255 on each ring of
 * the shipped emissive map: a faint glow on the rings in the resting map,
 * which is the one thing the block refuses. It could not be lifted into
 * view without refusing it outright, so #645 took the two out.
 */
export function resonatorRing(root, { shadow, alloy, crystal }, { x, y, z, r, cant }) {
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

/**
 * A plate in the kit's `plan` frame — centred on y = 0, `[x, z]` as given —
 * with `holes` cut through it, which `plate` and `plan` cannot do. A well
 * let into a deck is a hole with a floor under it, and the Order's landing
 * deck is three of them; a raised coaming would say "landing pad", and the
 * block says "let into". The geometry is `plan`'s own extrude-then-turn, so
 * a hole's outline lands on the same side its points name.
 */
function wellPlate(outline, holes, t) {
  const path = (pts, into) => {
    pts.forEach(([x, z], i) => (i === 0 ? into.moveTo(x, -z) : into.lineTo(x, -z)));
    into.closePath();
    return into;
  };
  const shape = path(outline, new THREE.Shape());
  for (const h of holes) shape.holes.push(path(h, new THREE.Path()));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -t / 2, 0);
  return geo;
}

/**
 * A landing deck let into a hull's back — the Antiphon's, "a wide three-bay
 * landing deck let into its back" (docs/asset-prompts-3d.md, Block 3). One
 * faceted plate, `outline` in plan and `t` thick with its top at `y`, laid
 * over the blade's crown so the crown vanishes under it; each of `bays` is a
 * rectangle `[length, width]` about `[x, z]` cut clean through the plate,
 * with a `floor` plate of its own `t` under the hole at `floor.y`, so the
 * bay is a well `y - floor.y` deep. The deck is the navy's shadow indigo and
 * the floors its pale alloy, because a well has to read at sprite scale by
 * value (Block 2b rule 2) and a lit pad is a state the resting bake never
 * shows (models-plan.md §3.2). A bay named `p` or `s` is placed on that side
 * by its own `z`, and its floor is drawn in `bothSides` order like every
 * other Order pair: starboard first.
 */
export function landingDeck(root, { shadow, alloy }, { outline, y, t, bays, floor }) {
  const rect = ({ x, z, size: [l, w] }) => [
    [x + l / 2, z - w / 2],
    [x + l / 2, z + w / 2],
    [x - l / 2, z + w / 2],
    [x - l / 2, z - w / 2],
  ];
  add(root, 'landing_deck', wellPlate(outline, bays.map(rect), t), shadow, [0, y - t / 2, 0]);
  for (const bay of bays)
    add(root, `bay_floor_${bay.name}`, plan(rect(bay), floor.t), alloy, [0, floor.y, 0]);
}

/**
 * A resonator ring lying flat around a deck — the Antiphon's, "a crystal
 * resonator ring around the deck that is the grant made visible". The
 * Responsory's `resonatorRing` is a mirrored pair of canted shoulders
 * standing off the spine; this is one ring on its side about a vertical
 * axis at `[x, z]`, its underside resting on the deck at `y`: the alloy ring
 * of radius `r` and tube `tube`, and the crystal `inner` inside it, both
 * eight-sided in section and `segments` round. The names are the
 * Responsory's without a side, because a ring on the centreline has none.
 *
 * It is cold for the reason the Responsory's are: the crystal is a `clad`
 * finish, never a lamp, because the block flares the ring "when the deck
 * opens" and the resting bake is the state the chart shows (models-plan.md
 * §3.2, the Responsory's header for the cores that were sealed in it).
 */
export function deckRing(root, { alloy, crystal }, opts) {
  const { x, y, z = 0, r, tube, inner, segments = 28 } = opts;
  const flat = [Math.PI / 2, 0, 0];
  add(root, 'resonator_ring', torus(r, tube, 8, segments), alloy, [x, y + tube, z], flat);
  add(
    root,
    'ring_inner',
    torus(inner.r, inner.tube, 8, segments),
    crystal,
    [x, y + inner.tube, z],
    flat
  );
}

/**
 * A pair of navigation marks on a hull, flat on an upward face — the
 * Responsory's two abaft its rings, as a builder: `crystal_seam` boxes of
 * `size` at `[x, y, ±z]`, starboard first. The one light the band table
 * licenses at every SIG ("navigation marks only"), so the one light a quiet
 * Order hull carries besides its bow. `navMarks`, in the structures section
 * below, is the Sentinel Turret's spheres and is not this.
 */
export function navMarkPair(root, seam, { x, y, z, size = [1.6, 0.3, 0.5] }) {
  bothSides((side, sgn) => add(root, `nav_mark_${side}`, box(...size), seam, [x, y, sgn * z]));
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
 * node carries the station (chorister-hadron.glb, #649). `z` is for a spar
 * off the centreline — the Slipway's two blade halls stand 54 m out either
 * side of the slip (#652); every hull leaves it at 0.
 */
export function spar(root, name, mat, { profile, facets = 4, x = 0, y = 0, z = 0, flat = [1, 1] }) {
  const geo = loft(profile, facets, Math.PI / facets);
  return add(root, name, geo, mat, [x, y, z], [0, 0, 0], [1, flat[0], flat[1]]);
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
 * facet and runs straight along it, so a ring set on mirrored bearings
 * mirrors across the centre plane: the seam at bearing `a` is the seam at
 * `-a` rolled the other way, and one on the crown or the keel is its own
 * mirror. The approved Clarion turned every seam a further 0.17 rad about its
 * own radial axis, the same way round, so the ring spiralled and no seam had
 * a partner — the one part of the three ported Order hulls that broke Block
 * 2's "precise bilateral symmetry" (#640). The prose is canonical, so that
 * yaw is not an option here on purpose: this module is the Order's, and a
 * ring is a thing it cannot draw unmirrored.
 */
export function hornSeams(root, mat, opts) {
  const { x, y = 0, length, section, halfHeight, halfBeam, count = 6, phase = 0 } = opts;
  for (let i = 0; i < count; i++) {
    const a = phase - (i * 2 * Math.PI) / count;
    add(
      root,
      `horn_seam_${i}`,
      box(length, section[0], section[1]),
      mat,
      [x, y + halfHeight * Math.cos(a), halfBeam * Math.sin(a)],
      [a, 0, 0]
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

/**
 * A strip `w` wide hugging the edge `a`→`b` of a plan, on the side of
 * `toward`: the edge line itself, drawn in by `cut` at each end, and the
 * inner line parallel to it, drawn in by `inset` at each end. A strip that
 * hugs an edge all the way to a point has to pull its inner corner back
 * from the point, or it stands outside the plan it edges.
 */
function strip(a, b, w, toward, { cut = [0, 0], inset = [0, 0] } = {}) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const u = [dx / len, dz / len];
  let n = [-u[1], u[0]];
  if ((toward[0] - a[0]) * n[0] + (toward[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]];
  const at = (p, s, o) => [p[0] + s * u[0] + o * n[0], p[1] + s * u[1] + o * n[1]];
  return [at(a, cut[0], 0), at(b, -cut[1], 0), at(b, -inset[1], w), at(a, inset[0], w)];
}

/**
 * The forked bow — the Herald's (#784): "forked at the bow into two
 * crystal-edged tines with an emitter crystal standing in the throat
 * between them — the fork is the horn and the slot is the cone's mouth"
 * (docs/asset-prompts-3d.md, Block 3, the scouts). A cone hull with no
 * array: where the Clarion's horn is a lathe with its emitter in the mouth,
 * this is the horn split open — two planar blades and the slot between —
 * built in the state the hull is for, the mouth open (models-plan.md §3.5).
 *
 * Each tine is one plane in the kit's plan frame, its starboard outline
 * drawn from five points and mirrored by `bothSides`: `tip` at the bow,
 * `shoulder` the widest point — on an Order hull the beam is blade, and
 * with no wing the blade is tine — `heel` where the trailing edge meets the
 * body's flank, `inner` the z of the root edge buried in the body, and
 * `throat` where the inner edge leaves the body and the slot begins. Two
 * strips ride each tine, each a plane of its own so its top faces the
 * bake: the crystal `edge` along the outer edge from shoulder to tip — the
 * Clarion's wing edge, on a blade that points forward — and the `seam`
 * along the inner edge, which is the light the block puts under way and so
 * carries the lamp family's unlit finish (`ink.crystalSeamUnlit`), because
 * a lamp dark at rest is a lamp this pipeline never shows (§3.2, rule 2).
 * `short` on each is how far from the tip its inner line stops, so a strip
 * stays inside a tine that has drawn to a point; `width` is measured
 * inboard from the edge it hugs.
 *
 * The `emitter` is a crystal `point` in the throat, tip forward, and it is a
 * lamp — the resting light the block names — as the Cantus's apex is. Not
 * the gun hulls' clad crystal with a core standing proud (`bowArray`): there
 * is no horn for a core to be sealed in, the block names one crystal, and
 * the hull has no weapon. It stands on the axis at `y` with nothing over it,
 * which is what makes it the unoccluded upward emitter every hull needs
 * (§3.2, rule 5): a lamp in a slot is shadowed from above only if the slot
 * is roofed, and this one is open to the water.
 *
 * Starboard first, tine then edge then seam, then the crystal, in
 * `bothSides` order like every Order pair.
 */
export function forkedBow(root, { alloy, crystal, unlit, node }, opts) {
  const { tip, shoulder, heel, throat, inner, t = 0.8, y = 0, edge, seam, emitter } = opts;
  const outline = [tip, shoulder, heel, [heel[0], inner], [throat[0], inner], throat];
  const toward = outline
    .reduce((c, [x, z]) => [c[0] + x, c[1] + z], [0, 0])
    .map((v) => v / outline.length);
  const edgeOutline = strip(tip, shoulder, edge.width, toward, { inset: [edge.short, 0] });
  const seamOutline = strip(throat, tip, seam.width, toward, {
    cut: [0, seam.short],
    inset: [0, seam.short],
  });
  bothSides((side, sgn) => {
    plane(root, `tine_${side}`, alloy, { outline, t, y }, sgn);
    plane(root, `tine_edge_${side}`, crystal, { outline: edgeOutline, t: edge.t, y }, sgn);
    plane(root, `tine_seam_${side}`, unlit, { outline: seamOutline, t: seam.t, y }, sgn);
  });
  point(root, 'emitter_crystal', node, { y, ...emitter });
}

/**
 * A flat transom: the plate that closes a blade drawn aft to a square stern
 * rather than to a point — the Herald's, "drawn aft to a flat transom with
 * the drive prism in the spine". `bladeBody` is an open lathe, and every
 * other Order hull buries its after end inside the drive prism; a hull that
 * keeps its section to the stern needs the end closed, or the conn view
 * looks in through it. `halfHeight` and `halfBeam` are the section's at the
 * last station with a hand's breadth over; `x` is the stern face and `t`
 * the plate's thickness forward of it.
 */
export function transom(root, mat, { x, t = 0.8, halfHeight, halfBeam, y = 0 }) {
  add(root, 'transom', box(t, 2 * halfHeight, 2 * halfBeam), mat, [x + t / 2, y, 0]);
}

/**
 * The spike — the Lance's forward third (#785): "an open faceted rail the
 * length of the forward third with the one torpedo lying in it, its nose
 * standing in a crystal muzzle collar as the bow — the weapon is the point
 * of the ship" (docs/asset-prompts-3d.md, Block 3, the ordnance hulls).
 * Built loaded (models-plan.md §3.5): the torpedo in the rail, because a
 * spent Lance is the same hull with the rail empty and the loaded one is
 * the track an enemy sees. Not `lance` above, which is the Reciter's
 * needle — a spar drawn to a point with a lit bar let into its top — and
 * which the Lance's block refuses by name: here nothing on the axis is
 * hull, and the thing drawn to a point is the weapon.
 *
 * The `rail` is two runners, `rail_s` and `rail_p`: four-facet spars on
 * their own `[x, r]` stations (`spar`), laid `flat`, at `rail.z` either
 * side of the axis and `rail.y` under it, joined beneath the torpedo by
 * `ribs` — crossbars of `ribs.size` at each x in `ribs.at`, at `ribs.y` —
 * and by nothing else: open above, open at the flanks above the runners,
 * and the torpedo the only thing on the axis. The runners carry the lamp
 * family's unlit finish (`ink.crystalSeamUnlit`), because the block lights
 * the rail under way and a lamp dark at rest is a lamp this pipeline never
 * shows (§3.2, rule 2); the ribs are alloy. The `torpedo` is one capsule
 * (kit.mjs `capsule` — the turrets' ammo-pod idiom, `magazine` below) of
 * `torpedo.r` on `torpedo.length` of straight side, `torpedo.facets`
 * round, laid along X about `torpedo.x` at `torpedo.y`, with a cross of
 * two tail plates at `fins.x` — `fins.chord` along the hull, `fins.span`
 * out from the axis each way, `fins.t` thick. The `collar` is a six-facet
 * ring lathed on its own stations, bore and all, with a vertex on the crown
 * as the Clarion's lip has (`spar`), and it is a lamp — the resting light
 * the block names — whole, as the Herald's emitter is and not the gun
 * hulls' clad crystal with a lit core. Its forward face is the bow, and it
 * stands with nothing over it, which makes it the unoccluded upward emitter
 * every hull needs (§3.2, rule 5).
 *
 * Starboard runner, port runner, the ribs forward in order, the torpedo,
 * its two fin plates, then the collar.
 */
export function spike(root, { alloy, unlit, node }, { rail, ribs, torpedo, collar }) {
  bothSides((side, sgn) => spar(root, `rail_${side}`, unlit, { ...rail, z: sgn * rail.z }));
  ribs.at.forEach((x, i) => add(root, `rail_rib_${i}`, box(...ribs.size), alloy, [x, ribs.y, 0]));
  const { x, y, r, length, facets = 8, fins } = torpedo;
  add(root, 'torpedo', capsule(r, length, 3, facets), alloy, [x, y, 0], [0, 0, -Math.PI / 2]);
  add(root, 'torpedo_fins_lateral', box(fins.chord, fins.t, 2 * fins.span), alloy, [fins.x, y, 0]);
  add(root, 'torpedo_fins_vertical', box(fins.chord, 2 * fins.span, fins.t), alloy, [fins.x, y, 0]);
  spar(root, 'muzzle_collar', node, { facets: 6, ...collar });
}

/** The radius a `[x, r]` polyline has at `x`, read off the segment `x` falls in. */
function radiusAt(stations, x) {
  const pts = [...stations].sort((a, b) => a[0] - b[0]);
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, r0] = pts[i - 1];
    const [x1, r1] = pts[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

/**
 * A swept geometry given the UV set every lathe and box in this module
 * carries. The runtime merges one material's meshes into a draw and three's
 * `mergeGeometries` refuses a bucket whose members disagree on attributes —
 * hull-intake warns on exactly that — and kit.mjs `sweep` writes positions
 * and normals only. Nothing here samples a texture, so the values are zero
 * and the attribute's presence is the point.
 */
function uvAlike(geo) {
  const n = geo.attributes.position.count;
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(2 * n), 2));
  return geo;
}

/**
 * A mesh turned onto a frame: local +x along `X`, local +z along `Z`, and
 * +y their right-handed third — for a part that has to lie along a line no
 * Euler triple names, as the kit's `strut` does with a quaternion. `X` and
 * `Z` need not be perpendicular; `Z` is squared up to `X` first, so the
 * caller says "along this edge, facing that way" and the frame is exact.
 */
function alongFrame(mesh, X, Z) {
  const x = new THREE.Vector3(...X).normalize();
  const z = new THREE.Vector3(...Z);
  z.addScaledVector(x, -z.dot(x)).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  mesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  return mesh;
}

/**
 * The bell — the Tocsin's hull (#786): "a bell in plan, bilaterally
 * symmetric, laid on its side with the crown forward and the mouth astern
 * … a faceted skirt of pale alloy widening in one unbroken flare from the
 * crown's shoulders to a lip astern that is the widest beam on any Order
 * hull, a violet crystal spine down its back from breech to lip"
 * (docs/asset-prompts-3d.md, Block 3, the siege hulls). Not `bladeBody`: a
 * blade is fullest amidships and drawn to both ends, and this widens to its
 * very stern and is open there.
 *
 * Two six-facet lathes (`spar`, a vertex on the crown, both pressed by
 * `flat`) that share the ring at `shoulder`, so the skin is unbroken across
 * it: `bell_skirt` from the lip forward to the shoulder and `bell_crown`
 * from the shoulder to the apex the barrel stands out of. `outer` is the
 * skin's `[x, r]` stations from the lip forward, and `bore` the mouth's from
 * the bulkhead's centre aft to the lip's inner edge; the skirt's profile is
 * the bore drawn aft, the lip's own face, then the skin drawn forward — in
 * that order, because a lathe's faces are wound one way whatever its
 * profile does, and a skin drawn toward +x faces out while a bore drawn
 * toward −x faces in. So the mouth is a mouth: from astern the conn view
 * looks into a hollow with the bulkhead at the back, not through a shell.
 *
 * `seams` are the crown's ridge seams: one box a ridge, laid along the
 * ridge from `seams.from` to `seams.to` on the pressed cone (`alongFrame`,
 * because the pressing gives every ridge its own pitch — the crown rises at
 * a tenth of the rate the flanks spread), centred on the edge so half its
 * `section` stands proud, at each bearing in `seams.bearings` (radians from
 * the crown, starboard positive; the default is the four shoulder ridges,
 * starboard first). The crown ridge carries the spine and the keel ridge
 * nothing anyone sees, which is why six ridges get four seams. They carry
 * the seam family's unlit finish: the block lights them under way and a
 * lamp dark at rest is a lamp this pipeline never shows (models-plan.md
 * §3.2, rule 2).
 *
 * The `spine` is the crystal run down the crown ridge: the Order's diamond
 * section (a square on its corner, `spine.halfBeam` by `spine.halfHeight`)
 * swept along the ridge (kit.mjs `sweep`) at every x in `spine.stations`,
 * its centre `spine.lift` over the skin so its lower vertex is bedded and
 * its upper stands clear. `spineInlay` is a lathe at one height and cannot
 * follow a back that rises 7 m from breech to lip. `halfBeam` may be a pair
 * `[at the first station, at the last]` for a run that widens as the bell
 * does. It is `unlit` for the reason the seams are: the block lights it
 * firing and nowhere earlier.
 *
 * Skirt, crown, the seams in bearing order, then the spine.
 */
export function bell(root, { alloy, unlit }, opts) {
  const { outer, bore, shoulder, flat = [0.3, 1], seams = null, spine = null } = opts;
  const [h, w] = flat;
  const forward = outer.filter(([x]) => x > shoulder);
  const aft = outer.filter(([x]) => x <= shoulder);
  // The bore's last station is the lip's inner edge and `aft`'s first its
  // outer, so the segment between them is the lip's own face.
  spar(root, 'bell_skirt', alloy, { profile: [...bore, ...aft], facets: 6, flat });
  spar(root, 'bell_crown', alloy, {
    profile: [aft[aft.length - 1], ...forward],
    facets: 6,
    flat,
  });
  const onRidge = (x, a) => {
    const r = radiusAt(outer, x);
    return [x, r * h * Math.cos(a), r * w * Math.sin(a)];
  };
  if (seams) {
    const { from, to, section, bearings = [Math.PI / 3, (2 * Math.PI) / 3] } = seams;
    const all = [...bearings, ...bearings.map((a) => -a).reverse()];
    all.forEach((a, i) => {
      const p0 = onRidge(from, a);
      const p1 = onRidge(to, a);
      const mid = p0.map((v, k) => (v + p1[k]) / 2);
      const length = Math.hypot(...p1.map((v, k) => v - p0[k]));
      const seam = add(root, `crown_seam_${i}`, box(length, section[0], section[1]), unlit, mid);
      alongFrame(
        seam,
        p1.map((v, k) => v - p0[k]),
        [0, -Math.sin(a) * w, Math.cos(a) * h]
      );
    });
  }
  if (spine) {
    const { stations, halfBeam, halfHeight, lift } = spine;
    const [b0, b1] = Array.isArray(halfBeam) ? halfBeam : [halfBeam, halfBeam];
    const n = stations.length - 1;
    add(
      root,
      'crystal_spine',
      uvAlike(
        sweep(
          stations.map((x, i) => [
            x,
            b0 + ((b1 - b0) * i) / n,
            halfHeight,
            onRidge(x, 0)[1] + lift,
          ]),
          [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
          ]
        )
      ),
      unlit
    );
  }
}

/**
 * The emitter rail — the Tocsin's barrel (#786): "the barrel stands out of
 * the crown: a faceted emitter rail on the centreline, a third of the
 * length, ending in a crystal muzzle collar" (docs/asset-prompts-3d.md,
 * Block 3, the siege hulls). The turret's `railGun` is the idiom — a
 * straight instrument, not a tube — and not the builder: it is the Z-long
 * export's barrel in its own frame, named `r`/`l`, and it ends in a pyramid
 * and a pip where this ends in a collar. Nor `lance`, the Reciter's needle,
 * a spar drawn to a point with a lit bar let into it, which the Tocsin's
 * block refuses by name; nor `spike`, the Lance's open rail with a torpedo
 * lying in it. This is a closed rail with nothing in it.
 *
 * Four parts on the axis, in order: `emitter_barrel`, a four-facet spar
 * (`spar`) on `barrel`'s stations, alloy, its after end buried in the
 * crown; `breech_collar`, a six-facet ring on `breech`'s stations, bore and
 * all, in the hull's shadow indigo, which caps the crown's open apex and
 * marks where the barrel enters it; `emitter_rail`, a four-facet spar on
 * `rail`'s stations let into the barrel's top, in the seam family's unlit
 * finish — the block lights the rail under way and firing, and a lamp dark
 * at rest is a lamp this pipeline never shows (models-plan.md §3.2, rule
 * 2); and `muzzle_collar`, the Lance's collar exactly — a six-facet crystal
 * ring lathed on `collar`'s stations with a vertex on the crown — and a
 * lamp, whole, the resting light the block names. Its forward face is the
 * bow and nothing stands over it, so it is the unoccluded upward emitter
 * every hull needs (§3.2, rule 5).
 */
export function emitterRail(
  root,
  { alloy, shadow, unlit, node },
  { barrel, breech, rail, collar }
) {
  spar(root, 'emitter_barrel', alloy, barrel);
  spar(root, 'breech_collar', shadow, { facets: 6, ...breech });
  spar(root, 'emitter_rail', unlit, rail);
  spar(root, 'muzzle_collar', node, { facets: 6, ...collar });
}

/**
 * The brace blades — the Tocsin's (#786): "at the lip's two corners brace
 * blades that swing out and down when the hull stops, and lock … under way
 * the blades fold flat along the skirt" (docs/asset-prompts-3d.md, Block 3,
 * the siege hulls). Built swung out and locked (models-plan.md §3.5),
 * because that is the state the hull fires in and the track an enemy sees.
 *
 * Each blade is one plane of the Order's wing thickness hinged along the
 * lip's flank: `hinge.at` is a point `[x, z]` on the starboard flank's
 * surface and `hinge.along` the flank's direction there in plan, pointing
 * forward, so the hinge line is the skin's own edge and a blade folded flat
 * would lie against it. `outline` is the blade's plan in the hinge's frame —
 * `[along, out]`, the root on `out = 0` — and the whole plane is turned
 * `anhedral` radians down about the hinge (`alongFrame`): out and down in
 * one motion, which is what one hinge gives. A `pin` is the hinge itself, a
 * six-facet rod of `pin.r` by `pin.length` lying in the hinge line, half in
 * the skin, in shadow indigo. The `edge` is a crystal strip `edge.width`
 * wide along the blade's forward edge — the outline's first point to its
 * last — stopping `edge.short` short of the bevel (`strip`), a plane of its
 * own stood `edge.t` thick so it rides the blade's face: the Clarion's wing
 * edge on a blade that points down. It is clad and cold: the block lights
 * nothing on the blades in any band.
 *
 * Port is the mirror of starboard through the centre plane, as a rotation:
 * the frame's x and y have their z negated and its z has x and y negated
 * (M·R·M for the reflection M), and the outline is mirrored by `plane`, so
 * the pair is exact to the digit. Starboard first: pin, blade, edge.
 */
export function braceBlades(root, { alloy, crystal, shadow }, opts) {
  const { hinge, outline, t = 0.9, anhedral, pin = null, edge = null } = opts;
  const [hx, hz] = hinge.at;
  const [ax, az] = hinge.along;
  const along = Math.hypot(ax, az);
  const c = Math.cos(anhedral);
  const s = Math.sin(anhedral);
  // Starboard: x along the hinge (forward), z out and down the anhedral.
  const X = [ax / along, 0, az / along];
  const Z = [(-az / along) * c, -s, (ax / along) * c];
  const frame = (mesh, sgn) =>
    alongFrame(mesh, [X[0], X[1], sgn * X[2]], [sgn * Z[0], sgn * Z[1], Z[2]]);
  const toward = outline
    .reduce((acc, [x, z]) => [acc[0] + x, acc[1] + z], [0, 0])
    .map((v) => v / outline.length);
  bothSides((side, sgn) => {
    const at = [hx, 0, sgn * hz];
    if (pin) {
      const rod = cyl(pin.r, pin.r, pin.length, 6);
      rod.rotateZ(-Math.PI / 2);
      frame(add(root, `brace_pin_${side}`, rod, shadow, at), sgn);
    }
    const blade = plane(root, `brace_blade_${side}`, alloy, { outline, t, y: 0 }, sgn);
    blade.position.set(...at);
    frame(blade, sgn);
    if (edge) {
      // The forward edge: from the root's forward corner, the outline's
      // first point, to the forward bevel corner, its last.
      const fore = outline[0];
      const bevel = outline[outline.length - 1];
      const lip = strip(fore, bevel, edge.width, toward, { inset: [0, edge.short] });
      const rim = plane(
        root,
        `brace_edge_${side}`,
        crystal,
        { outline: lip, t: edge.t, y: 0 },
        sgn
      );
      rim.position.set(...at);
      frame(rim, sgn);
    }
  });
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
 * The Slipway (#652): the Order's yard on the kit's skeleton (kit.mjs
 * `slipwayBed`, `slipwayGantry`, `slipwayHeadGate`). What is the Order's
 * is the hull on the blocks — a spar, the blade every Order hull is — the
 * posts, which are pyramids: an alloy leg drawn to a point with a crystal
 * finial standing on it, and a taller alloy pylon at the head; and the
 * hall, a blade laid on its side with a crest along its back, five crystal
 * spines each on a lit seam, a lit lip along the slip, and four alloy
 * buttresses wedged against the outer wall. Bilateral to the digit, as the
 * Order is. Every number is the approved slipway-hadron.glb's own and is
 * the default.
 * ------------------------------------------------------------------------ */

/** A gantry leg: a four-sided alloy pyramid 46 m to its point, 32 m out. */
export const slipwayLeg = (alloy) =>
  sidedPost({ name: 'gantry_leg', geo: () => cyl(0, 4, 46, 4), mat: alloy, y: 23, spread: 32 });

/** The finial on a leg: a smaller crystal pyramid standing on the point. */
export const slipwayFinial = (crystal) =>
  sidedPost({ name: 'gantry_finial', geo: () => cyl(0, 2, 8, 4), mat: crystal, y: 50, spread: 32 });

/** A head pylon: the same pyramid 56 m tall, 34 m out. */
export const slipwayPylon = (alloy) =>
  sidedPost({ name: 'head_pylon', geo: () => cyl(0, 6, 56, 4), mat: alloy, y: 28, spread: 34 });

/**
 * The hull in progress on the keel blocks: an alloy spar 122 m long, full
 * a third of the way along and drawn to a point at both ends, laid flat
 * (`spar`, 0.6 tall), with a slim shadow deck on it. The kit's `slipwayBed`
 * calls this between the last block and the sill.
 */
export function slipwayHull(root, { hull: alloy, deck: shadow }, opts = {}) {
  const {
    body = {
      profile: [
        [-110, 0.2],
        [-90, 7],
        [-40, 9],
        [0, 7],
        [12, 0.2],
      ],
      y: 6,
      flat: [0.6, 1],
    },
    deck = { size: [60, 1, 8], at: [-60, 12, 0] },
  } = opts;
  spar(root, 'hull_in_progress', alloy, body);
  add(root, 'hull_in_progress_deck', box(...deck.size), shadow, deck.at);
}

/**
 * One hall flanking the slip, on `sgn`'s side, built into `hall` (the
 * `hall_s` or `hall_p` frame the script makes): the blade hall — a shadow
 * spar 304 m long laid on its side and pressed wide (1.75 across) — with
 * the alloy crest along its back, five crystal spines standing off it
 * each over a lit seam, the alloy lip along the slip's edge with its lit
 * seam, and four alloy buttresses: triangles in plan stood on their base
 * against the outer wall, reaching outward. Every z is `sgn` times the
 * file's, and the buttress is drawn reaching `sgn` outward, so each hall's
 * wedge is its own buffer, as the approved file has them.
 */
export function slipwayHall(hall, { shadow, alloy, crystal, seam }, opts) {
  const {
    sgn,
    z = 54,
    blade = {
      profile: [
        [-152, 0.2],
        [-140, 12],
        [-60, 16],
        [60, 16],
        [140, 12],
        [152, 0.2],
      ],
      y: 6,
      flat: [1, 1.75],
    },
    crest = {
      profile: [
        [-140, 0.2],
        [-120, 4],
        [120, 4],
        [140, 0.2],
      ],
      y: 22,
      flat: [0.8, 1.6],
    },
    spines = { count: 5, from: -100, pitch: 50, r: 4, h: 22, y: 30 },
    seams = { size: [1.2, 0.5, 14], y: 23.5 },
    lip = { size: [320, 3, 8], y: 1.5, z: 27 },
    lipSeam = { size: [300, 0.4, 1], y: 3.1 },
    buttresses = { xs: [-110, -40, 30, 100], halfBase: 8, reach: 20, t: 6, y: -1, z: 78 },
  } = opts;
  spar(hall, 'blade_hall', shadow, { ...blade, z: sgn * z });
  spar(hall, 'blade_crest', alloy, { ...crest, z: sgn * z });
  for (let i = 0; i < spines.count; i++) {
    const x = spines.from + spines.pitch * i;
    add(hall, `crystal_spine_${i}`, cyl(0, spines.r, spines.h, 4), crystal, [x, spines.y, sgn * z]);
    add(hall, `spine_seam_${i}`, box(...seams.size), seam, [x, seams.y, sgn * z]);
  }
  add(hall, 'slip_lip', box(...lip.size), alloy, [0, lip.y, sgn * lip.z]);
  add(hall, 'lip_seam', box(...lipSeam.size), seam, [0, lipSeam.y, sgn * lip.z]);
  buttresses.xs.forEach((x, i) => {
    const wedge = plan(
      [
        [-buttresses.halfBase, 0],
        [buttresses.halfBase, 0],
        [0, sgn * buttresses.reach],
      ],
      buttresses.t
    );
    wedge.translate(0, buttresses.t / 2, 0);
    add(hall, `buttress_${i}`, wedge, alloy, [x, buttresses.y, sgn * buttresses.z]);
  });
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

/* --------------------------------------------------------------------------
 * The Bastion and the Sounding Spire (#652, off #540 Phase 3) — the two
 * r184 structure exports of the Order's that build in their own frame. Both
 * are X-long files (the Bastion 20.9 by 19.34 in plan, the Spire square to
 * the digit), so nothing below goes through `drawn`: every part is `add`ed
 * at the file's own translation, XYZ Euler and scale, and each script holds
 * its footprint with kit.mjs `fitFootprint`. Every pair is the export's
 * `_r`/`_l` (`pair`), and which side each lands on is a fact about the file,
 * said at each builder: the two files mirror their pairs across two
 * different planes, and on an unyawed X-long file a `_r` at +x is on the
 * bow axis and on neither beam.
 * ------------------------------------------------------------------------ */

/**
 * The Bastion's palette, which the Sounding Spire carries too — the same
 * five names at the same finishes, the two lamps at each file's own
 * strength. Values are the approved files' own (bastion-hadron.glb and
 * sounding-spire-hadron.glb at f7cce0f), and three of the five are a third
 * reading of a name this module already holds twice: `shadow_indigo` is the
 * Block 2 token #3B2E5A, the hulls' colour, at the turret's metalness of
 * 0.25 — neither `ink`'s (0.35) nor `structureInk`'s (#2C2244); `alloy_white`
 * is `pale_alloy`'s hex #E6E9F2 dulled to 0.35 / 0.28 under a name of its
 * own; and `resonance_crystal`, a cladding on every hull, is a lamp here —
 * the crystal-violet token burning over a #2A1650 base at metalness 0.1,
 * which kit.mjs `lamp` cannot say (it writes 0) and which is set after.
 * `dark_steel` is `structureInk`'s to the value. The strengths are the
 * files' floats — 2.000036651280468 and 2.6000523589720967 on the Bastion,
 * 2.1000000006830546 and 3.000000001062529 on the Spire — as the turret's
 * are (#639 review, N1). Neither lamp base (#2A1650, #3A2560) is in a
 * palette table: derived, in Block 2b's sense, and reported on #641.
 */
export const bastionInk = {
  alloyWhite: () => clad('alloy_white', hex('#E6E9F2'), 0.35, 0.28),
  shadowIndigo: () => clad('shadow_indigo', hex('#3B2E5A'), 0.25, 0.45),
  darkSteel: structureInk.darkSteel,
  resonanceCrystal: (intensity) => {
    const m = lamp('resonance_crystal', hex('#8B5CF6'), hex('#2A1650'), 0.15, intensity);
    m.metalness = 0.1;
    return m;
  },
  crystalGlow: (intensity) => lamp('crystal_glow', hex('#C9A6FF'), hex('#3A2560'), 0.2, intensity),
};

/**
 * The Spire's: the Bastion's five and the heat shimmer — "heat-shimmer
 * distortion" (docs/asset-prompts-3d.md, STRUCTURE — Sounding Spire) as a
 * material: a sheath over the core whose *base* is the crystal-glow token
 * #C9A6FF, six percent opaque and alpha-blended, with the crystal-violet
 * emissive under it at 0.55. The one translucent material on any approved
 * Order model; kit.mjs `lamp` has no opacity, so it is set after.
 */
export const spireInk = {
  ...bastionInk,
  heatShimmer: () => {
    const m = lamp('heat_shimmer', hex('#8B5CF6'), hex('#C9A6FF'), 0.1, 0.55);
    m.transparent = true;
    // The file's own float, not the 0.06 it was typed as (#652 review).
    m.opacity = 0.06000000004553697;
    return m;
  },
};

/**
 * A torus drawn part way round: `angle` radians of a ring of radius `r` and
 * tube `t`, `radial` facets round the tube and `tubular` along the arc,
 * starting on the ring's +x and turning toward its +y — three's own `arc`.
 * The Bastion's eight reinforcement ribs are one of these (0.52π, past the
 * equator by a facet, four-sided) and so are its four conduits (0.9 rad,
 * five-sided). Kit `torus` draws only the full ring; a partial one is
 * faction-neutral and is a kit candidate.
 */
export const arc = (r, t, radial, tubular, angle) =>
  new THREE.TorusGeometry(r, t, radial, tubular, angle);

/** A crystal: an octahedron of `r` at `at`, drawn tall by its node's `scale`. */
const crystal = (root, name, mat, { r, at, scale }) =>
  add(root, name, octa(r), mat, at, [0, 0, 0], scale);

/**
 * A ring laid flat at `at`: a torus of `r` and `t`, `radial` by `tubular`,
 * born in the xy-plane, turned `roll` about its own axis and then laid down
 * by a quarter about x — an XYZ Euler of (π/2, 0, roll) applies the z turn
 * first. The Bastion's equator and plinth bands, the Spire's three collars
 * (rolled an eighth) and both files' flanges are all this.
 */
export function ring(root, name, mat, { r, t, radial, tubular, at, roll = 0 }) {
  return add(root, name, torus(r, t, radial, tubular), mat, at, [Math.PI / 2, 0, roll]);
}

/**
 * A plinth: a `facets`-sided frustum of `rTop` over `r`, `h` tall and
 * centred at `y`, turned `yaw` on its node — an eighth on both files, so a
 * flat faces each axis and the yawed box overhangs the vertices, which is
 * the measure the bake takes (kit.mjs `fitFootprint`).
 */
export function plinth(root, name, mat, { rTop, r, h, y, facets = 8, yaw = Math.PI / 8 }) {
  return add(root, name, cyl(rTop, r, h, facets), mat, [0, y, 0], [0, yaw, 0]);
}

/**
 * The pressure dome under its apex lantern — "a large pressure dome with
 * visible reinforcement ribs" (the Bastion block), the Order's. The dome is
 * a sphere of `dome.r` drawn `dome.theta` down from its pole — 0.52π on the
 * file, past the equator by a ring, so its skirt tucks under the band —
 * `dome.segments` `[round, down]`, pressed to `dome.scale` on its node at
 * `dome.at`. The `lantern` and the `finial` are crystals stood on the pole,
 * the finial in the brighter glow, and four `prongs` hold the lantern: a
 * box of `prongs.size` at ±`prongs.reach` along x, `_r` at +x, rolled
 * ∓`prongs.splay` about z so each leans in, and the same box turned across
 * at ±`reach` along z, `_f` at +z, pitched the same way. The x pair shares
 * one buffer; the z pair, the same box with its axes swapped, is drawn
 * twice — the file's.
 */
export function pressureDome(root, { alloy, crystal: lit, glow, shadow }, opts) {
  const { dome, lantern, finial, prongs } = opts;
  add(
    root,
    'pressure_dome',
    new THREE.SphereGeometry(
      dome.r,
      dome.segments[0],
      dome.segments[1],
      0,
      Math.PI * 2,
      0,
      dome.theta
    ),
    alloy,
    dome.at,
    [0, 0, 0],
    dome.scale
  );
  crystal(root, 'apex_lantern', lit, lantern);
  crystal(root, 'apex_finial', glow, finial);
  const { size, y, reach, splay } = prongs;
  const along = box(...size);
  pair((tag, sgn) =>
    add(root, `lantern_prong_x_${tag}`, along, shadow, [-sgn * reach, y, 0], [0, 0, -sgn * splay])
  );
  for (const [tag, sgn] of [
    ['f', 1],
    ['b', -1],
  ])
    add(
      root,
      `lantern_prong_z_${tag}`,
      box(size[2], size[1], size[0]),
      shadow,
      [0, y, sgn * reach],
      [-sgn * splay, 0, 0]
    );
}

/**
 * The reinforcement ribs: `yaws.length` pairs of arcs (`arc` above) stood on
 * end — lathed in the ring's own plane, then turned upright by a quarter
 * about z so the arc runs from the pole down past the equator — and yawed
 * round the dome, the `_r` of pair `i` at +`yaws[i]` and the `_l` at
 * −`yaws[i]`, on the dome's `at` and pressed to its `scale`; alloy on the
 * even pairs, shadow on the odd. A rib's `_r` and `_l` mirror across the
 * beam (the export's xy-plane): every `_r` foots at +z, which is starboard
 * (kit.mjs `bothSides`, #642), every `_l` at −z — unlike the lights and the
 * anchor blades on the same file, whose pairs mirror across x. The yaws are
 * 0.35, 1.05, 2.09 and 2.79 rad; parts.mjs prints the last two pairs as
 * (π, π − yaw, −π/2), the same matrix said the other way. The 0.92 is on the
 * y of the rib's *own* frame, which after the quarter turn is the world's
 * x-z, so a rib is a quarter-ellipse 5.41 out by 6.05 up against a dome
 * 5.99 out by 5.51 up. The file's. Each rib is its own buffer, eight in all.
 */
export function reinforceRibs(root, { alloy, shadow }, opts) {
  const { r, t, radial, tubular, angle, yaws, at, scale } = opts;
  yaws.forEach((yaw, i) =>
    pair((tag, sgn) =>
      add(
        root,
        `reinforce_rib_${i}_${tag}`,
        arc(r, t, radial, tubular, angle),
        i % 2 ? shadow : alloy,
        at,
        [0, -sgn * yaw, Math.PI / 2],
        scale
      )
    )
  );
}

/**
 * Lit marks in mirrored pairs — the Bastion's twelve port lights, "sustained
 * glow from ports and working lights" (the Bastion block), and the Spire's
 * ten running lights. One sphere of `r`, six round by five up, drawn once
 * and placed at each `[x, y, z]` of `at` as `${name}_${i}_r` and, at −x, as
 * `${name}_${i}_l`: the pairs mirror across the export's x, the `_r` toward
 * +x — the bow axis on these X-long files, neither beam. A twin of
 * `navMarks` (the turret's five-by-four orbs through `drawn`) for files that
 * are not yawed; every node shares the one buffer, as both files do.
 */
export function lightPairs(root, light, { name, r, at }) {
  const orb = new THREE.SphereGeometry(r, 6, 5);
  at.forEach(([x, y, z], i) =>
    pair((tag, sgn) => add(root, `${name}_${i}_${tag}`, orb, light, [-sgn * x, y, z]))
  );
}

/**
 * A docking collar — "docking collars and external pipework" (the Bastion
 * block) — as a frame of its own: a `dock_${name}` node at `at`, rolled
 * `roll` about z so its y runs out along the beam, and inside it a throat
 * (an eight-facet frustum of `throat.rTop` over `throat.r`, `throat.h`
 * long, on the node's origin with no transform of its own), a lip, a lit
 * mouth and two fins. The Bastion has two, `starboard` at +x rolled −π/2 and
 * `port` at −x rolled +π/2, each throat pointing outboard along the file's
 * x: the bow axis and not the beam, so neither #642's relabel rule nor its
 * exception applies by the letter, and the names are carried as the file
 * has them.
 *
 * The lip is the file's oddity: a four-sided ring (`lip.r`, `lip.t`, eight
 * round) at `lip.y` up the throat with no rotation on its node, so it stands
 * in the frame's xy-plane — edge-on to the throat, a ring the throat runs
 * through — rather than laid round the mouth. A collar's lip wants the
 * quarter turn about x the export never gave it; a port keeps the buffer
 * where it is. The mouth is a thin drum of `mouth.r` by `mouth.t` at
 * `mouth.y`, lit; the fins are four-sided pyramids of `fins.r` by
 * `fins.length` at `fins.y` and ±`fins.z`, canted ±`fins.cant` about x so
 * each leans outboard, `_0` at +z first.
 */
export function dockingCollar(root, { alloy, shadow, crystal: lit }, opts) {
  const { name, at, roll, throat, lip, mouth, fins } = opts;
  const dock = group(root, `dock_${name}`, { at, rot: [0, 0, roll] });
  add(dock, `dock_${name}_throat`, cyl(throat.rTop, throat.r, throat.h, 8), alloy);
  add(dock, `dock_${name}_lip`, torus(lip.r, lip.t, 4, 8), shadow, [0, lip.y, 0]);
  add(dock, `dock_${name}_mouth`, cyl(mouth.r, mouth.r, mouth.t, 8), lit, [0, mouth.y, 0]);
  [1, -1].forEach((sgn, i) =>
    add(
      dock,
      `dock_${name}_fin_${i}`,
      cyl(0, fins.r, fins.length, 4),
      shadow,
      [0, fins.y, sgn * fins.z],
      [sgn * fins.cant, 0, 0]
    )
  );
  return dock;
}

/**
 * The conduits — "external pipework" — four arcs (`arc` above, five-sided)
 * of a circle of `r` about the dome's `at`, laid over the dome's crown (6.1
 * to 7.0 up on a dome that tops at 7.4) and pressed to its `scale`: `fore_r`
 * at the XYZ Euler (0, `lean`, `lean`), yawed and rolled by the one angle
 * (π/2 − 0.55 on the file), which drapes it from 2.5 out at −z to 1.4 out at
 * +z on the +x side; `aft_r` with the yaw negated, its z-mirror — so `fore`
 * is toward −z and `aft` toward +z, the file's names on an X-long file; and
 * each `_l` its `_r` mirrored across the export's x with the tube's
 * section turned over with it — two reflections, so a proper rotation and
 * not a node scale of −1 — which the file decomposes as (±π, yaw, roll − π),
 * the half turn carrying the yaw's sign, and which is written so, since the
 * matrix is the same to the sixteenth place either way and parts.mjs then
 * reads it back line for line. `fore` before `aft`,
 * `_r` before `_l`; each conduit its own buffer.
 */
export function conduits(root, steel, { r, t, radial, tubular, angle, lean, at, scale }) {
  for (const [name, yaw] of [
    ['fore', lean],
    ['aft', -lean],
  ])
    pair((tag, sgn) =>
      add(
        root,
        `conduit_${name}_${tag}`,
        arc(r, t, radial, tubular, angle),
        steel,
        at,
        sgn < 0 ? [0, yaw, lean] : [Math.sign(yaw) * Math.PI, yaw, lean - Math.PI],
        scale
      )
    );
}

/**
 * Standpipes: a pair of eight-facet pipes of `pipe.rTop` over `pipe.r`,
 * `pipe.h` tall, at ±`at[0]` and `at[1]`, `at[2]`, and a flange each — a
 * ring of `flange.r` and `flange.t`, `flange.radial` by `flange.tubular`,
 * laid flat at `flange.y` — both pipes before both flanges, the `_r` at +x,
 * each pair one buffer. The Spire's `ballastPipes` are the same two pipes
 * drawn a side at a time, leaned, and sharing nothing.
 */
export function standpipes(root, { steel, shadow }, { at: [x, y, z], pipe, flange }) {
  const stem = cyl(pipe.rTop, pipe.r, pipe.h, 8);
  pair((tag, sgn) => add(root, `standpipe_${tag}`, stem, steel, [-sgn * x, y, z]));
  const collar = torus(flange.r, flange.t, flange.radial, flange.tubular);
  pair((tag, sgn) =>
    add(
      root,
      `standpipe_flange_${tag}`,
      collar,
      shadow,
      [-sgn * x, flange.y, z],
      [Math.PI / 2, 0, 0]
    )
  );
}

/**
 * Ballast tanks: a capsule of `r` and `waist`, three-step caps and eight
 * facets, laid along z by a quarter about x at ±`at[0]` — a later three's
 * CapsuleGeometry as the turret's pods are (kit.mjs `capsule`) — one buffer
 * for the pair, the `_r` at +x. Both files carry one pair.
 */
export function ballastTanks(root, mat, { r, waist, at: [x, y, z] }) {
  const tank = capsule(r, waist, 3, 8);
  pair((tag, sgn) =>
    add(root, `ballast_tank_${tag}`, tank, mat, [-sgn * x, y, z], [Math.PI / 2, 0, 0])
  );
}

/**
 * Anchor blades — "anchored to the seabed" — `bearings.length` mirrored
 * pairs of four-sided pyramids of `r` by `length` round the plinth's foot:
 * each stood on the `anchor` circle `[radius, y]` at its bearing (radians
 * from +x toward +z), its axis the outward radial with `lift` added to y
 * before normalising, its centre `seat` out along that axis, and turned onto
 * the axis by the one rotation that carries +y there — the Sentinel Turret's
 * skirt-blade construction (`emplacement`) with the seat a distance rather
 * than a fraction of the length, on a file that is not yawed, so the `_l` of
 * each pair is the `_r` mirrored across x by `sided`'s rule without `drawn`.
 * Shadow on the even pairs, alloy on the odd; every blade its own buffer.
 * From bearings 0.45, 1.35, 1.9 and 2.75 on a circle of 7.3 at 0.6, lifted
 * 0.5 and seated 0.8, that regenerates the approved node matrices to the
 * sixteenth place. Its twin in `emplacement` could be folded onto this; it
 * has not been, because the turret's file is not this issue's.
 */
export function anchorBlades(root, { shadow, alloy }, opts) {
  const { r, length, anchor, lift, seat, bearings } = opts;
  const up = new THREE.Vector3(0, 1, 0);
  bearings.forEach((bearing, i) => {
    const out = new THREE.Vector3(Math.cos(bearing), 0, Math.sin(bearing));
    const axis = out.clone().setY(lift).normalize();
    const c = out.multiplyScalar(anchor[0]).setY(anchor[1]).addScaledVector(axis, seat);
    const q = new THREE.Quaternion().setFromUnitVectors(up, axis);
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    pair((tag, sgn) =>
      add(
        root,
        `anchor_blade_${i}_${tag}`,
        cyl(0, r, length, 4),
        i % 2 ? alloy : shadow,
        [-sgn * c.x, c.y, c.z],
        [e.x, -sgn * e.y, -sgn * e.z]
      )
    );
  });
}

/**
 * The Spire's anchor legs — "bilaterally symmetrical, pale alloy frame" stood
 * on the seabed: four, on the plinth's diagonals in the order (+x,+z),
 * (+x,−z), (−x,+z), (−x,−z), each a box of `leg.size` at `leg.reach` out on
 * both axes and `leg.y` up, yawed to its diagonal — `atan2(sx, sz)`, so its
 * length runs outboard — and pitched `leg.pitch` about the *export's* x
 * (an XYZ Euler puts the x turn outermost), so the two legs at +z rise
 * outboard and the two at −z dip: the file's asymmetry across the beam,
 * kept, its symmetry across x exact. A claw on the end of each, a
 * four-sided pyramid of `claw.r` by `claw.length` at `claw.reach`, yawed the
 * same way and then pitched a quarter and `claw.dip` about its *own* x (YXZ,
 * the turrets' order, kit.mjs `eulerXYZ`) so the point goes outboard and a
 * little down — the other rotation order on the same file. Leg then claw a
 * corner at a time, each its own buffer.
 */
export function anchorLegs(root, { alloy, steel }, { leg, claw }) {
  [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].forEach(([sx, sz], i) => {
    const yaw = Math.atan2(sx, sz);
    add(
      root,
      `anchor_leg_${i}`,
      box(...leg.size),
      alloy,
      [sx * leg.reach, leg.y, sz * leg.reach],
      [leg.pitch, yaw, 0]
    );
    add(
      root,
      `anchor_claw_${i}`,
      cyl(0, claw.r, claw.length, 4),
      steel,
      [sx * claw.reach, claw.y, sz * claw.reach],
      [Math.PI / 2 + claw.dip, yaw, 0, 'YXZ']
    );
  });
}

/**
 * The crystal core — "a violet crystal core", "burning bright along the
 * crystal" (the Sounding Spire block): three octahedra on the axis, each
 * drawn tall by its node — the `core` in resonance crystal, the `throat`
 * inside it in the brighter glow, standing a millimetre off the axis in z
 * (the file's z-fight nudge), and the `apex` above in the same glow.
 */
export function crystalCore(root, { crystal: lit, glow }, { core, throat, apex }) {
  crystal(root, 'crystal_core', lit, core);
  crystal(root, 'crystal_throat', glow, throat);
  crystal(root, 'crystal_apex', glow, apex);
}

/**
 * The frame blades — "pale alloy frame around a violet crystal core": one
 * blade drawn in the export's xy-plane from `outline`, `[x, y]` up the
 * blade — base first, out along the outer edge to the tip and back down
 * the inner — extruded `depth` along z with a one-segment bevel of `bevel`
 * `[thickness, size]` and centred on its depth, standing on `at`; the `_r`
 * as drawn, at +x, and the `_l` the same buffer under a node scale of
 * [−1, 1, 1] — a reflection, written as the file decomposes it and as the
 * scout's drive prism is (#588 review, F1), not as the rotation it is
 * equivalent to. The outline reaches ExtrudeGeometry unclosed: three
 * reverses a counter-clockwise outline and only then drops a repeated first
 * point, so a `closePath` would start the walls one point on from where the
 * file's start (`plane` above says the same of the Chorister's plates).
 */
export function frameBlades(root, alloy, { outline, depth, bevel: [thickness, size], at }) {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  const blade = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: thickness,
    bevelSize: size,
    bevelSegments: 1,
    steps: 1,
  });
  blade.translate(0, 0, -depth / 2);
  add(root, 'frame_blade_r', blade, alloy, at);
  add(root, 'frame_blade_l', blade, alloy, at, [0, 0, 0], [-1, 1, 1]);
}

/**
 * The resonance collars — the tuned rings up the core: one a `[y, r, reach]`
 * of `rings`, a four-sided ring of `t` laid flat at `y` and rolled an eighth
 * first (`ring`), with a vane each side — a four-sided pyramid of `vane.r`
 * by `vane.length` at ±`reach`, rolled ∓π/2 so its point goes outboard
 * along x, the `_r` at +x. Collar, `_r`, `_l` a ring at a time; each collar
 * its own buffer and each vane pair one.
 */
export function resonanceCollars(root, { alloy, shadow }, { rings, t, vane }) {
  rings.forEach(([y, r, reach], i) => {
    ring(root, `resonance_collar_${i}`, alloy, {
      r,
      t,
      radial: 4,
      tubular: 8,
      at: [0, y, 0],
      roll: Math.PI / 8,
    });
    const spike = cyl(0, vane.r, vane.length, 4);
    pair((tag, sgn) =>
      add(
        root,
        `collar_vane_${i}_${tag}`,
        spike,
        shadow,
        [-sgn * reach, y, 0],
        [0, 0, (sgn * Math.PI) / 2]
      )
    );
  });
}

/**
 * The tuning horns — "tall crystalline resonance spire ... directional": a
 * bar of `horn.size` each side of the apex at ±`horn.reach`, `horn.y`, rolled
 * ∓`horn.lean` about z so the pair leans in at the top; a lit tip on each, a
 * four-sided pyramid of `tip.r` by `tip.length` at ±`tip.reach`, `tip.y`,
 * yawed ±`tip.yaw` — an eighth, so a flat faces the beam — and rolled with
 * its horn; and the brace between them, a box of `brace.size` at `brace.y`.
 * Both horns, both tips, the brace; the horns one buffer, the tips one.
 */
export function tuningHorns(root, { alloy, glow, steel }, { horn, tip, brace }) {
  const bar = box(...horn.size);
  pair((tag, sgn) =>
    add(
      root,
      `tuning_horn_${tag}`,
      bar,
      alloy,
      [-sgn * horn.reach, horn.y, 0],
      [0, 0, -sgn * horn.lean]
    )
  );
  const spike = cyl(0, tip.r, tip.length, 4);
  pair((tag, sgn) =>
    add(
      root,
      `tuning_horn_tip_${tag}`,
      spike,
      glow,
      [-sgn * tip.reach, tip.y, 0],
      [0, -sgn * tip.yaw, -sgn * horn.lean]
    )
  );
  add(root, 'horn_brace', box(...brace.size), steel, [0, brace.y, 0]);
}

/**
 * The ballast pipes: a pipe and its flange a side at a time, `_r` then
 * `_l`. The pipe is an eight-facet frustum of `pipe.rTop` over `pipe.r`,
 * `pipe.h` tall, at ±`pipe.at[0]`, rolled ∓`pipe.lean` about z so it leans
 * in at the top; the flange a six-sided ring of `flange.r` and `flange.t`
 * laid flat at ±`flange.at[0]` and turned ∓`pipe.lean` about the vertical
 * — not leaned with its pipe, because the file wrote the roll and the laying
 * in the order that spins the ring instead (`ring`: XYZ puts the z turn
 * first). Four buffers, none shared; the Bastion's `standpipes` are the same
 * two pipes drawn pair-first and sharing.
 */
export function ballastPipes(root, { steel, alloy }, { pipe, flange }) {
  pair((tag, sgn) => {
    add(
      root,
      `ballast_pipe_${tag}`,
      cyl(pipe.rTop, pipe.r, pipe.h, 8),
      steel,
      [-sgn * pipe.at[0], pipe.at[1], pipe.at[2]],
      [0, 0, -sgn * pipe.lean]
    );
    ring(root, `pipe_flange_${tag}`, alloy, {
      r: flange.r,
      t: flange.t,
      radial: 6,
      tubular: 12,
      at: [-sgn * flange.at[0], flange.at[1], flange.at[2]],
      roll: -sgn * pipe.lean,
    });
  });
}

/**
 * The heat shimmer — "heat-shimmer distortion" as a mesh: an octahedron
 * subdivided once, thirty-two faces, round the core in the translucent
 * `heat_shimmer`, stretched by its node to three floats nobody chose —
 * [0.97872, 4.89772, 1.00288] on the file, a pulse caught mid-frame by the
 * look of them — and carried to the digit. Lit and see-through: the one part
 * on any Order model the bake draws blended.
 */
export function shimmerSheath(root, mat, { r, at, scale }) {
  return add(
    root,
    'heat_shimmer_sheath',
    new THREE.OctahedronGeometry(r, 1),
    mat,
    at,
    [0, 0, 0],
    scale
  );
}

/* --------------------------------------------------------------------------
 * The Order's works — its Foundry and its Nodule Refinery (#652 round two),
 * on the kit's Foundry and Refinery builders. What the kit reaches by
 * parameter is composed in the scripts; what it does not — the Foundry's
 * wing halls and launch gate, the Refinery's silos and maw blades, and the
 * raked anchor blades both files carry — is here. Every builder takes the
 * kit's `frame` (`zLong` for the Foundry, which is a Z-long export, `xLong`
 * for the Refinery), and every number is the export's own.
 * ------------------------------------------------------------------------ */

/**
 * The works' palette: the Bastion's five and two lamps of the Foundry's and
 * the Refinery's own — `forge_light` and `floodlight_glow`, which are
 * `crystal_glow`'s finish to the value (the crystal-glow token over #3A2560
 * at roughness 0.2) under a name each, at the files' strengths:
 * 3.7930280838563952 on the Foundry, 4.392641074180667 on the Refinery
 * (#639 review, N1). `resonance_crystal` burns at 2.118362294686672 and
 * 2.996320537090334 on the two, through the same `intensity`.
 */
export const worksInk = {
  ...bastionInk,
  forgeLight: (intensity) => lamp('forge_light', hex('#C9A6FF'), hex('#3A2560'), 0.2, intensity),
  floodlightGlow: (intensity) =>
    lamp('floodlight_glow', hex('#C9A6FF'), hex('#3A2560'), 0.2, intensity),
};

/**
 * The export's own `_r` placement mirrored across its x for the `_l`, on
 * `sgn`'s side of a `pair`: x negated and the y and z angles with it — the
 * rule `sided` applies through `drawn`, here as numbers for any `frame`.
 */
const mirrored = (sgn, [x, y, z], [a = 0, b = 0, c = 0] = []) => [
  [-sgn * x, y, z],
  [a, -sgn * b, -sgn * c],
];

/**
 * The Foundry's halls — "unit production hall" (docs/asset-prompts-3d.md,
 * STRUCTURE — Foundry) said the Order's way: a wing either side of the bay,
 * each a six-facet drum of `hull.r` by `hull.length` laid along the bay by
 * a quarter about x and pressed to `hull.squash` on its own z (the world's
 * height, after the turn), a crest of `crest.size` on its shoulder rolled
 * `crest.roll` in toward the bay, a crystal ridge of `ridge.size` along its
 * inboard edge, a six-facet point of `ends.r` by `ends.length` at each end
 * — the bow's apex forward at +`ends.z`, the stern's aft — under the same
 * press, and three port lights of `lights.r` down its outboard flank at
 * `lights.zs`. A wing at a time, `_r` first at the export's +x, then `_l`
 * its mirror; every part its own buffer, as the file has it. On a Z-long
 * export the `_r` wing lands on the kit's −z, port (kit.mjs `drawn`, #642),
 * as the Sentinel Turret's `_r` does (#639): the export's own name, carried.
 */
export function hallWings(root, { shadow, alloy, crystal: ridgeMat, light }, opts) {
  const { frame = zLong, hull, crest, ridge, ends, lights } = opts;
  const press = [1, 1, hull.squash];
  pair((tag, sgn) => {
    const [hullAt, hullRot] = mirrored(sgn, [hull.x, hull.y, 0], [Math.PI / 2, 0, 0]);
    frame.part(
      root,
      `wing_hull_${tag}`,
      cyl(hull.r, hull.r, hull.length, 6),
      shadow,
      hullAt,
      hullRot,
      press
    );
    const [crestAt, crestRot] = mirrored(sgn, [crest.x, crest.y, 0], [0, 0, crest.roll]);
    frame.part(root, `wing_crest_${tag}`, box(...crest.size), alloy, crestAt, crestRot);
    const [ridgeAt] = mirrored(sgn, [ridge.x, ridge.y, 0]);
    frame.part(root, `wing_ridge_${tag}`, box(...ridge.size), ridgeMat, ridgeAt);
    for (const [end, dir] of [
      ['bow', 1],
      ['stern', -1],
    ]) {
      const [at, rot] = mirrored(sgn, [hull.x, hull.y, dir * ends.z], [(dir * Math.PI) / 2, 0, 0]);
      frame.part(root, `wing_${end}_${tag}`, cyl(0, ends.r, ends.length, 6), alloy, at, rot, press);
    }
    lights.zs.forEach((z, i) => {
      const [at] = mirrored(sgn, [lights.x, lights.y, z]);
      frame.part(
        root,
        `wing_portlight_${tag}_${i}`,
        new THREE.SphereGeometry(lights.r, 6, 5),
        light,
        at
      );
    });
  });
}

/**
 * The launch gate at the bay's open end — the Order's reading of the kit's
 * `launchMouth`, under its own names and shapes: a four-sided pylon of
 * `pylon.r` by `pylon.length` either side, `_r` at +x, on one buffer; the
 * lit threshold of `threshold.size` across the sill; the crossbeam of
 * `crossbeam.size` over the pylons; and the gate crystal, an octahedron of
 * `crystal.r` drawn tall by `crystal.scale`, on the beam. In that order.
 */
export function launchGate(root, { alloy, glow, shadow, crystal: lit }, opts) {
  const { frame = zLong, pylon, threshold, crossbeam, crystal: gem } = opts;
  const post = cyl(0, pylon.r, pylon.length, 4);
  pair((tag, sgn) => {
    const [at] = mirrored(sgn, pylon.at);
    frame.part(root, `gate_pylon_${tag}`, post, alloy, at);
  });
  frame.part(root, 'gate_threshold', box(...threshold.size), glow, threshold.at);
  frame.part(root, 'gate_crossbeam', box(...crossbeam.size), shadow, crossbeam.at);
  frame.part(root, 'gate_crystal', octa(gem.r), lit, gem.at, [0, 0, 0], gem.scale);
}

/**
 * Raked anchor blades — "anchored to the seabed" — along a works' flank:
 * `blades.length` mirrored pairs of four-sided pyramids of `r` by `length`,
 * each stood on its own `anchor` and seated `seat` out along its own
 * `axis` (normalised here), turned onto that axis by the one rotation that
 * carries +y there; the `_l` of each pair the `_r` mirrored across the
 * export's x (`mirrored` above). Shadow on the even pairs, alloy on the
 * odd; every blade its own buffer. The Bastion's `anchorBlades` stand
 * theirs on one circle by bearing; these two files stand each blade where
 * it is: the Foundry's three on one rake, (1, 0.55, 0.1), seated 0.65 from
 * anchors on round numbers; the Refinery's three on axes whose z is 0.4 of
 * their y on every one and whose x is each blade's own — transcribed, since
 * no bearing or rake gives 1.755165, −0.058399 and −1.713778 — seated 0.7.
 * Both regenerate the approved node matrices to the sixteenth place.
 */
export function rakedBlades(root, { shadow, alloy }, opts) {
  const { frame = zLong, r, length, seat, blades } = opts;
  const up = new THREE.Vector3(0, 1, 0);
  blades.forEach(({ anchor, axis: raw }, i) => {
    const axis = new THREE.Vector3(...raw).normalize();
    const c = new THREE.Vector3(...anchor).addScaledVector(axis, seat);
    const q = new THREE.Quaternion().setFromUnitVectors(up, axis);
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    pair((tag, sgn) => {
      const [at, rot] = mirrored(sgn, c.toArray(), [e.x, e.y, e.z]);
      frame.part(
        root,
        `anchor_blade_${i}_${tag}`,
        cyl(0, r, length, 4),
        i % 2 ? alloy : shadow,
        at,
        rot
      );
    });
  });
}

/**
 * "A rank of upright silos" (docs/asset-prompts-3d.md, STRUCTURE — Nodule
 * Refinery), the Order's: each silo a six-facet frustum of `r` at the foot
 * and 0.8 `r` at the head, `h` tall, standing on the ground at `at`
 * `[x, z]`; a crystal seam up its face, 0.22 square and 0.82 `h` tall, 0.88
 * `r` toward +z; a four-sided steel collar of 0.82 `r` and tube 0.12 laid
 * flat at 0.72 `h`; a tip that is an octahedron of 0.55 `r` drawn to
 * [0.7, 1.9, 0.7] at `h` + 0.85 `r`; and a tip light, a sphere of `light.r`
 * six by five, at `h` + 1.9 `r`. Those ratios are the file's: three sizes
 * of silo carry them to the digit. Body and tip alternate alloy and shadow
 * by the silo's `n`, the even silos' bodies in alloy. A silo is drawn once
 * a `tag` — `_c` on the centreline, `_r` at +x and `_l` its mirror — its
 * five parts together, each its own buffer.
 */
export function silos(root, { alloy, shadow, crystal: seamMat, steel, light }, opts) {
  const { frame = xLong, light: lamp = { r: 0.14 }, silos: ranks } = opts;
  for (const {
    n,
    tags,
    r,
    h,
    at: [x, z],
  } of ranks) {
    const [body, tip] = n % 2 ? [shadow, alloy] : [alloy, shadow];
    for (const tag of tags) {
      const sx = tag === 'l' ? -x : x;
      const name = (stem) => `${stem}${n}_${tag}`;
      frame.part(root, name('silo_'), cyl(0.8 * r, r, h, 6), body, [sx, h / 2, z]);
      frame.part(root, name('silo_seam_'), box(0.22, 0.82 * h, 0.22), seamMat, [
        sx,
        h / 2,
        z + 0.88 * r,
      ]);
      frame.part(
        root,
        name('silo_collar_'),
        torus(0.82 * r, 0.12, 4, 12),
        steel,
        [sx, 0.72 * h, z],
        [Math.PI / 2, 0, 0]
      );
      frame.part(
        root,
        name('silo_tip_'),
        octa(0.55 * r),
        tip,
        [sx, h + 0.85 * r, z],
        [0, 0, 0],
        [0.7, 1.9, 0.7]
      );
      frame.part(root, name('silo_tiplight_'), new THREE.SphereGeometry(lamp.r, 6, 5), light, [
        sx,
        h + 1.9 * r,
        z,
      ]);
    }
  }
}

/**
 * The maw blades: a four-sided pyramid of `r` by `length` hung point-down
 * (a half turn about x) either side of the crusher's maw at ±`at[0]`, the
 * `_r` at +x, on one buffer — the Order's teeth, where the Directorate hangs
 * three.
 */
export function mawBlades(root, shadow, { frame = xLong, r, length, at: [x, y, z] }) {
  const tooth = cyl(0, r, length, 4);
  pair((tag, sgn) =>
    frame.part(root, `maw_blade_${tag}`, tooth, shadow, [-sgn * x, y, z], [Math.PI, 0, 0])
  );
}

export { THREE };
