/**
 * The Vent Tap, Pelagia Commune — 180 m of footprint (2 × `radiusM` 90,
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
 * Commune's ink: chitin for the rock, growth ridge for the pipework, a
 * membrane deck, and the mouth lit as a vein rather than a flood. What is the
 * Commune's is the exchanger: a ringed bladder with a pale bud, one vein, and
 * three roots leaning into the ground, from `factions/pelagia.mjs`.
 *
 * The frame is the approved export's own: drawn 142.29 across by the measure
 * the bake takes — the roots lean, and a leaning part measures wider than its
 * vertices (kit.mjs `fitFootprint`); 141.96 until their count changed — and
 * priced at 180 m by the table, so the root carries that one scale, as
 * hulls/sower.mjs does. The arms sit on the diagonals, 45° and every
 * quarter turn from it, as the approved file has them.
 *
 * FACETS (#919). The Commune's rule is one facet edge of 1.5 m
 * (docs/asset-prompts-3d.md Block 2c; pelagia.mjs `cut`), asked at the
 * fitted footprint's scale (`DRAWN`), and the pass re-cut what was off it:
 * the chimney sixteen at 38 m of radius, where the kit's files share ten;
 * the five basalt lobes sixteen round and sixteen a turn down, where they
 * were eight by twelve; the ember sixteen at 15 m, drawn at the rim's own
 * 12 so it closes the mouth (below), where it was twelve at 11.5; the four
 * draw pipes fourteen at 3.3 m, where they were eight, with their lamps
 * sunk to the crown's flat (below); the risers and the twelve roots
 * thirteen at 3 m, where they were eight and six; the four bladders and
 * their buds sixteen by sixteen, where they were twelve by twelve and eight
 * by twelve, and their twelve rings sixteen, where they were twelve. The
 * apron, the clamp and the manifold rings keep the sixteen the rule gives
 * them; the four valve stems and the eight platform legs ask the rule
 * through kit.mjs `ventDrawArm` since the pass, five and nine where the kit
 * drew six. 98 parts and 3,360 triangles become 98 and 5,824.
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
import * as pelagia from '../factions/pelagia.mjs';

const L = 180;
/** The plan's side as built: the exchangers' leaning roots, box to box (kit.mjs `fitFootprint`). */
const DRAWN = 142.2947;
// The Commune's facet rule at this file's scale (pelagia.mjs `cut`, #919):
// the model is drawn 142.29 across and priced at 180 m, and the rule is a
// chord in metres. Asserted after the fit, since the fit is what sets the
// scale.
const cut = pelagia.cut(L / DRAWN);
/** The kit's basalt lobes are unit orbs pressed to this, so the rule is asked for them so pressed. */
const LOBE = [14, 6, 10];

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const vein = pelagia.ink.bioVein();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'vent_tap_pelagia';

// The wellhead in chitin, the manifold in growth ridge, the mouth a vein —
// every round part on the rule's count at its own radius (kit.mjs `asked`,
// #919): sixteen on the chimney, the apron and the two rings, where the
// four files share ten and sixteen; the lobes as the rule reads them
// pressed to the kit's own 14 × 6 × 10. The ember is the lid in the
// chimney's mouth, a disc of 11.5 inside a rim of 12: against the kit's
// ten-sided chimney its corners passed through the rim's flats and it
// rested there, and inside a sixteen-sided rim cut to the same corners it
// rests on nothing, 0.63 m clear all round. It is drawn at the rim's own
// 12, corner to corner, so the lid closes the mouth — the Klaxon's and the
// Order's answer on their taps (vent-tap-bathyarch.mjs, vent-tap-hadron.mjs).
ventWellhead(
  root,
  { rock: chitin, mouth: vein, steel: ridge },
  {
    chimney: { facets: cut.round },
    lobes: { size: LOBE, facets: () => cut.orb(1, { scale: LOBE }) },
    ember: { r: 12, facets: cut.round },
    apron: { facets: cut.round },
    clamp: { facets: cut.round },
    manifold: { facets: cut.round },
  }
);

// The draw pipe at the rule's count — fourteen at 3.3 m, where the kit's
// eight had a vertex on the crown (kit.mjs `ventDrawArm`). A cylinder laid
// along the bearing by a quarter turn about Z carries a vertex onto its
// crown only at a count that is a multiple of four; at fourteen the crown
// is the middle of a flat, an apothem in, and the three lamp housings the
// kit saddles on it at the pipe's radius would float 0.08 m off that flat
// (bathyarch.mjs `crownOnX` is the same reckoning). So each housing sinks
// the kit's 0.05 plus the apothem's shortfall, and straddles the crown as
// the kit means it to.
const PIPE_R = 2.6;
const pipeN = cut.round(PIPE_R);
const crownDrop = pipeN % 4 === 0 ? 0 : PIPE_R * (1 - Math.cos(Math.PI / pipeN));

// Four arms on the diagonals, each with the Commune's bladder on its end.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a) => {
  ventDrawArm(
    root,
    { rock: chitin, steel: ridge, deck: membrane, lamp: light, flood: light },
    {
      bearing: a,
      pipe: { r: PIPE_R, facets: cut.round },
      riser: { facets: cut.round },
      // The kit's own valve and legs, asked for the rule's count (kit.mjs `ventDrawArm`, #919).
      valve: { at: 30, block: 6, stem: { r: 0.8, h: 6, y: 25, facets: cut.round } },
      legs: { spread: 6, r: [0.9, 1.1], h: 10, y: 2.5, facets: cut.round },
      lamps: { from: 24, pitch: 12, count: 3, size: [2, 0.6, 2], sink: 0.05 + crownDrop },
    }
  );
  pelagia.bladderHead(
    root,
    { membrane, ridge, spore, vein },
    {
      cut,
      bearing: a,
      at: 74,
      bladder: { y: 6, r: [15, 9, 11] },
      rings: {
        from: 68,
        pitch: 6,
        stations: [
          [10.2, 9.5],
          [9.7, 9],
          [9.2, 8.5],
        ],
        halfWidth: 0.8,
        squash: 0.85,
      },
      bud: { at: 76, y: 14.5, r: [3.5, 2.5, 3.5] },
      vein: { size: [20, 0.4, 1.2], y: 14.6 },
      roots: { at: 86, y: -2, across: [6, 0, -6], r: [1.2, 2.4], length: 14, raise: 0.9 },
    }
  );
});

// Eight floods round the manifold — with the platform floods and the mouth,
// the "burning bright" of a structure at SIG 55, in biolight.
wellheadFloods(root, light);

const size = fitFootprint(root, L);
if (Math.abs(Math.max(size.x, size.z) - DRAWN) > 1e-3)
  throw new Error(`${root.name}: drawn ${Math.max(size.x, size.z)}, DRAWN says ${DRAWN}`);
await exportGlb(root, 'vent-tap-pelagia.glb');
