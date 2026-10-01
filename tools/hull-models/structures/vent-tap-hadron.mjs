/**
 * The Vent Tap, Hadron Knights — 180 m of footprint (2 × `radiusM` 90,
 * packages/shared/src/structures.ts), SIG 55 idle.
 *
 * "The power source, bolted to a hydrothermal vent on Thermal Vein ground and
 * never quiet ... A basalt chimney at the centre with a wellhead clamp and a
 * draw manifold over its mouth, four radial draw pipes running out to heat
 * exchangers on the corners, anchor feet into the scorched ground. Burning
 * bright: the vent's ember mouth under the manifold, floodlit working
 * platforms around the wellhead, lamps along every pipe run"
 * (docs/asset-prompts-3d.md, STRUCTURE — Vent Tap). One prompt block, four
 * scripts, and the per-navy difference is the exchanger alone.
 *
 * The chimney, the clamp, the manifold, the four arms and the eight floods
 * are the kit's `ventWellhead`, `ventDrawArm` and `wellheadFloods` — the
 * faction-neutral skeleton every navy bolts on the same way (#608) — in the
 * Order's ink: shadow indigo for the rock, pale alloy for the pipework and the
 * decks, crystal-seam lamps and the resonance node for the floods. What is
 * the Order's is the exchanger: a crystal prism under an alloy frame, a lit
 * seam along the frame's top, a crystal spine and a buttress blade, from
 * `factions/hadron.mjs`.
 *
 * LIGHT (#890). The block burns the whole structure at rest — one band, SIG
 * 55 idle, "lamps along every pipe run" — so every lamp stays lit; four
 * were hidden from above, and rule 5 of models-plan.md §3.2 moves them:
 * - `exchanger_seam`, one an arm: the approved file set it at y 16.2,
 *   inside the frame's section under its top face (14.88..19.12), where it
 *   showed nothing from above from #608 to #890 and the audit named it on
 *   every arm. It is lifted to y 19.32, its underside on the frame's flat
 *   top — the run's lamps carried to the exchanger at the run's end — and
 *   shows 23.6 m² an arm either side of the spine. `diff.mjs` lists the
 *   four (4.21 m at 180 m) and nothing else.
 *
 * The frame is the approved export's own — drawn 133.45 across by the measure
 * the bake takes (the prisms are yawed, and a yawed part measures wider than
 * its vertices; kit.mjs `fitFootprint`), priced at 180 m by the table, so the
 * root carries that one scale, as hulls/sower.mjs does. The arms sit on the
 * diagonals, 45° and every quarter turn from it, as the approved file has
 * them.
 *
 * One thing about this file is worth knowing before its bake is read. By its
 * vertices it is square to the millimetre; by the bake's measure the approved
 * binary is square to 2.8e-14, on the long-Z side, and the bake's rule is
 * "yaw when Z is longer" — so intake yawed the approved export a quarter
 * turn, and that is the frame the shipped maps were baked in and the frame
 * the conn view has always shown. Built metre-true the file lands on an
 * exact tie and intake would not yaw it, which would turn the five basalt
 * lobes and the chimney's facet phase a quarter turn in the height map and
 * in the conn view inside a port (#608 review, F1). So the root carries that
 * quarter turn explicitly, below, and the shipped maps re-bake pixel for
 * pixel. The cost is on the audit side only: against the un-turned approved
 * binary `diff.mjs` would read every part as moved, which is why it compares
 * a square plan at whichever yaw agrees and says that it did.
 *
 * FACETS (#919). The wellhead and the arms are the kit's skeleton, and its
 * round parts ask the Order's rule here (docs/asset-prompts-3d.md Block 2c;
 * hadron.mjs `cut`; kit.mjs `asked`): the chimney twelve, where the four
 * files share ten; the five lobes twelve round, where they share eight;
 * the apron, the clamp and the manifold twelve, where they share sixteen;
 * the four risers six, where they share eight. The mouth and the draw
 * pipes were on the rule. 82 parts and 1,952 triangles become 82 and
 * 2,088 — the one model the pass makes heavier, by its lobes.
 */
import {
  THREE,
  exportGlb,
  radialSeries,
  ventWellhead,
  ventDrawArm,
  wellheadFloods,
  fitFootprint,
} from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 180;
/** The plan's side as built: the exchanger prisms' boxes, corner to corner. */
const DRAWN = 133.4508;
// The Order's facet rule at this file's scale (hadron.mjs `cut`, #919): the
// model is drawn 133.45 across and priced at 180 m, and the rule is a chord
// in metres. Asserted after the fit, since the fit is what sets the scale.
const cut = hadron.cut(L / DRAWN);

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'vent_tap_hadron';

// The wellhead in shadow indigo, the manifold in pale alloy, the mouth a node.
// The kit's skeleton at the Order's counts (#919): every round part of it
// asks the rule at its own radius — twelve on the chimney, its lobes, the
// apron and the two rings, where the four files share ten, eight and
// sixteen — and the numbers stay the kit's, but one. The ember is the lid
// in the chimney's mouth, a twelve-gon of 11.5 inside a rim of 12: against
// the kit's ten-sided chimney its corners passed through the rim's flats
// and it rested there, and inside a twelve-sided rim cut to the same
// corners it rests on nothing, 0.67 m clear all round. It is drawn at the
// rim's own 12, corner to corner, so the lid closes the mouth.
ventWellhead(
  root,
  { rock: shadow, mouth: node, steel: alloy },
  {
    chimney: { facets: cut.round },
    lobes: { facets: cut.orb },
    ember: { r: 12, facets: cut.round },
    apron: { facets: cut.round },
    clamp: { facets: cut.round },
    manifold: { facets: cut.round },
  }
);

// Four arms on the diagonals, each with the Order's exchanger on its end.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a) => {
  // The draw pipe is the rule's eight at 3.5 m, as the kit has it, and the
  // riser its six at 3.2 m, where the kit has eight. Not the Order's
  // six-sided pipe (hadron.mjs `PIPE_FACETS`), which its own builders cut:
  // the kit lays this one with a vertex on the crown and saddles three
  // lamps on it, and a hexagon laid the same way has a flat there — all
  // twelve lamps stand 0.4 m off it, measured.
  ventDrawArm(
    root,
    { rock: shadow, steel: alloy, deck: alloy, lamp: seam, flood: node },
    { bearing: a, pipe: { facets: cut.round }, riser: { facets: cut.round } }
  );
  hadron.exchangerHead(
    root,
    { crystal, alloy, seam },
    {
      bearing: a,
      at: 74,
      prism: {
        profile: [
          [-14, 0.2],
          [-8, 9],
          [8, 9],
          [14, 0.2],
        ],
        y: 7,
      },
      frame: {
        profile: [
          [-15, 0.2],
          [-10, 3],
          [10, 3],
          [15, 0.2],
        ],
        y: 17,
      },
      seam: { size: [18, 0.4, 0.9], y: 19.32 },
      spine: { r: 2.2, h: 14, y: 24 },
      buttress: { at: 84, halfBase: 6, reach: 14, t: 4, y: -2 },
    }
  );
});

// Eight floods round the manifold — with the platform floods and the mouth,
// the "burning bright" of a structure at SIG 55, in the node's violet.
wellheadFloods(root, node);

// The quarter turn intake gave the approved export on its one-ulp tie, made
// explicit so the shipped maps and the conn view keep the frame they have
// always had (see the header). Before the fit, so the fit measures the file
// as the bake will.
root.rotation.y = Math.PI / 2;
const size = fitFootprint(root, L);
if (Math.abs(Math.max(size.x, size.z) - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${Math.max(size.x, size.z).toFixed(4)} across; the facet rule was asked at ${DRAWN}`
  );
await exportGlb(root, 'vent-tap-hadron.glb');
