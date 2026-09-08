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
  add,
  box,
  cyl,
  torus,
  octa,
  plate,
  loft,
  strut,
  bothSides,
} from '../kit.mjs';

/** The Order's palette, as the Clarion's own materials carry it. */
export const ink = {
  shadowIndigo: () => clad('shadow_indigo', [0.04, 0.03, 0.1], 0.35, 0.45),
  paleAlloy: () => clad('pale_alloy', [0.79, 0.81, 0.89], 0.85, 0.22),
  resonanceCrystal: () => clad('resonance_crystal', [0.26, 0.11, 0.92], 0.4, 0.18),
  crystalSeam: () => lamp('crystal_seam', [0.58, 0.38, 1.0], [0.01, 0.01, 0.03]),
  resonanceNode: () => lamp('resonance_node', [0.39, 0.2, 1.0], [0.02, 0.01, 0.08]),
};

/**
 * The blade hull: a faceted spar, full forward and narrowing aft to almost
 * nothing. `maxR` is the half-section amidships — keep it near a tenth of the
 * length, as the Clarion's 4 m on 75 m is.
 */
export function bladeBody(root, mat, { bow, stern, maxR, facets = 10 }) {
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

/** The spine: a raised ridge along the back, its inlay, and the lit thread. */
export function spine(root, { alloy, crystal, seam }, { from, to, y, thread = true }) {
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
export function bowArray(root, { alloy, crystal, seam, node }, { from, to, r, y = 0 }) {
  const L = to - from;
  add(
    root,
    'array_horn',
    cyl(r, r * 0.28, L, 6),
    alloy,
    [from + L / 2, y, 0],
    [0, 0, -Math.PI / 2]
  );
  add(
    root,
    'array_lip',
    cyl(r * 1.16, r * 1.16, 1.6, 6),
    crystal,
    [to - 0.8, y, 0],
    [0, 0, Math.PI / 2]
  );
  add(root, 'array_ridge', box(L * 0.9, 0.5, 1.6), seam, [from + L / 2, y + r * 0.86, 0]);
  bothSides((side, sgn) =>
    add(root, `array_ridge_${side}`, box(L * 0.9, 0.4, 0.5), seam, [
      from + L / 2,
      y + r * 0.78,
      sgn * 1.5,
    ])
  );
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

/** A thin swept wing, port and starboard, with a lit outboard edge. */
export function wings(
  root,
  { alloy, crystal },
  { aft, fwd, inner, outer, tipChord = 8.5, t = 0.9 }
) {
  bothSides((side, sgn) => {
    add(
      root,
      `wing_${side}`,
      plate(
        [
          [aft, sgn * inner],
          [aft, sgn * outer],
          [aft + tipChord, sgn * outer],
          [fwd, sgn * inner],
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

/** A small forward wing — the Clarion's canard, smaller and unlit. */
export function canards(root, alloy, { from, to, inner, outer, t = 0.7 }) {
  bothSides((side, sgn) =>
    add(
      root,
      `canard_${side}`,
      plate(
        [
          [to, sgn * inner],
          [to, sgn * outer],
          [from, sgn * (outer - 1.5)],
          [from, sgn * inner],
        ],
        t
      ),
      alloy,
      [0, 0, 0]
    )
  );
}

/** The vertical blades: a dorsal fin above and a keel below. */
export function finAndKeel(root, alloy, { fin, keel }) {
  add(root, 'dorsal_fin', box(fin.length, fin.height, 0.6), alloy, [fin.x, fin.y, 0]);
  add(root, 'keel', box(keel.length, keel.height, 0.6), alloy, [keel.x, keel.y, 0]);
}

/** The stern: a prism drive, its crystal ring, and the one mark astern. */
export function drive(root, { shadow, crystal, node }, { x, r }) {
  add(root, 'drive_prism', cyl(r, r * 0.34, r * 3.4, 6), shadow, [x, 0, 0], [0, 0, Math.PI / 2]);
  add(
    root,
    'drive_ring',
    cyl(r * 1.1, r * 1.1, 1, 6),
    crystal,
    [x + r * 1.6, 0, 0],
    [0, 0, Math.PI / 2]
  );
  add(root, 'stern_mark', box(0.6, 0.6, 1.4), node, [x - r * 0.6, r * 1.4, 0]);
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
  darkSteel: () => clad('dark_steel', [0.012, 0.016, 0.03], 0.4, 0.4),
  alloyDim: () => clad('alloy_dim', [0.25, 0.27, 0.37], 0.35, 0.32),
  crystalDim: () => lamp('resonance_crystal_dim', [0.26, 0.11, 0.92], [0.01, 0.01, 0.04]),
  navLight: () => lamp('nav_light', [0.58, 0.38, 1.0], [0.02, 0.01, 0.06]),
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
