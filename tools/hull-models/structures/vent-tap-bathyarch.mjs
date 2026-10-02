/**
 * The Vent Tap, Bathyarch Consortium — 180 m of footprint (2 × `radiusM` 90,
 * packages/shared/src/structures.ts), SIG 55 idle.
 *
 * "The power source, bolted to a hydrothermal vent on Thermal Vein ground and
 * never quiet (SIG 55 idle, 75 at full draw — loud precisely where the ground
 * is quiet). A basalt chimney at the centre with a wellhead clamp and a draw
 * manifold over its mouth, four radial draw pipes running out to heat
 * exchangers on the corners, anchor feet into the scorched ground. Burning
 * bright: the vent's ember mouth under the manifold, floodlit working
 * platforms around the wellhead, lamps along every pipe run"
 * (docs/asset-prompts-3d.md, STRUCTURE — Vent Tap). One prompt block, four
 * scripts, and the per-navy difference is the exchanger alone.
 *
 * The chimney, the clamp, the manifold, the four arms and the eight floods
 * are the kit's `ventWellhead`, `ventDrawArm` and `wellheadFloods` — the
 * faction-neutral skeleton every navy bolts on the same way (#608) — in the
 * Klaxon's ink. What is the Klaxon's is the exchanger: a finned black box
 * with a hazard band, a stack, a vent grating, an anchor foot and a rank of
 * rivets, from `factions/bathyarch.mjs`.
 *
 * The four `exchanger_vent` gratings sat inside the hazard band's slab on
 * each exchanger's roof, where no bake sees them, and the audit warned on
 * all four. An exchanger's lamp is the last lamp of its pipe run — "lamps
 * along every pipe run", the block's resting clause, read the same way on
 * all four navies' taps (#890, review rulings, ruling 5) — so each stays lit in its
 * `amber_vent` and stands on the hazard band's top face at the same
 * station, as the Order's `exchanger_seam` stands on its frame's top; the
 * fin at that station pokes a tenth up through it. The mouth, the platform
 * floods, the pipe lamps and the wellhead floods were already lit and
 * facing up.
 *
 * The frame is the approved export's own: drawn 137.18 across, hazard band
 * corner to hazard band corner, and priced at 180 m by the table, so the root
 * carries that one scale (as hulls/sower.mjs does) — taken by the measure the
 * bake and the runtime take (kit.mjs `fitFootprint`), which is what lands the
 * maps exactly where the approved bake put them. The arms sit on the
 * diagonals, 45° and every quarter turn from it, as the approved file has
 * them; the wellhead floods start on +X.
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`;
 * kit.mjs `asked`), asked at this file's scale, and the pass re-cut the
 * kit's wellhead to it: the chimney, the apron, the clamp and manifold
 * rings and the ember mouth fourteen at 15–84 m, where the files share ten,
 * sixteen and twelve; the five basalt lobes orbs of fourteen by seven, where
 * they were eight by six. The ember is drawn at the rim's 12 so it rests in
 * the mouth (below); the draw pipes, risers and the exchangers' stacks were
 * the rule's eight already. 122 parts and 2,528 triangles become 122 and
 * 2,984.
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
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 180;
/** Drawn across by the measure the fit takes (header); the facet rule is asked at this scale and the fit is asserted against it. */
const DRAWN = 137.1787;
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919;
// kit.mjs `asked`): the kit's wellhead and arms are handed the file's units
// and the rule is a chord in metres. Asserted after the fit, since the fit
// is what sets the scale.
const cut = bathyarch.cut(L / DRAWN);

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lamp = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const flood = bathyarch.ink.amberFlood();

const root = new THREE.Group();
root.name = 'vent_tap_bathyarch';

// The wellhead in rust, the manifold in iron, the ember mouth flood-lit.
// The kit's skeleton at the Klaxon's counts (#919): every round part of it
// asks the rule at its own radius — fourteen on the chimney, the apron and
// the two rings, where the four files share ten and sixteen; the lobes
// fourteen by seven; the draw pipes and risers the kit's own eight, which
// is what the rule gives 3.4 and 3.1 m — and the numbers stay the kit's,
// but one. The eight wellhead floods are seated on the manifold ring
// (kit.mjs `wellheadFloods`), so they came down 0.03–0.14 m with its
// re-cut rim and are not placed here.
// The ember is the lid in the chimney's mouth, a disc of 11.5 inside a rim
// of 12: against the kit's ten-sided chimney its corners passed through
// the rim's flats and it rested there, and inside a fourteen-sided rim cut
// to the same corners it rests on nothing, 0.66 m clear all round. It is
// drawn at the rim's own 12, corner to corner, so the lid closes the mouth
// — the Order's answer on its tap (vent-tap-hadron.mjs).
ventWellhead(
  root,
  { rock: rust, mouth: flood, steel: grey },
  {
    chimney: { facets: cut.round },
    lobes: { facets: cut.orb },
    ember: { r: 12, facets: cut.round },
    apron: { facets: cut.round },
    clamp: { facets: cut.round },
    manifold: { facets: cut.round },
  }
);

// Four arms on the diagonals, each with the Klaxon's exchanger on its end.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a) => {
  ventDrawArm(
    root,
    { rock: rust, steel: grey, deck: black, lamp, flood },
    { bearing: a, pipe: { facets: cut.round }, riser: { facets: cut.round } }
  );
  bathyarch.exchangerHead(
    root,
    { black, grey, rust, amber, vent },
    {
      bearing: a,
      at: 74,
      y: 7,
      size: [26, 14, 18],
      fins: { count: 5, from: 66, pitch: 4, size: [1.2, 16, 20], y: 7 },
      band: { size: [27, 0.8, 19], y: 14.5 },
      stack: { at: 80, r: [2, 2.4], h: 14, y: 20, band: { r: 2.6, h: 1, y: 25 } },
      // On the band's top (14.9), where the file had it at 14.3 inside the band (header).
      grating: { at: 70, size: [6, 0.4, 6], y: 15.1 },
      foot: { at: 88, size: [8, 4, 8], y: 0 },
      rivets: { count: 4, from: -10, pitch: 6.5, stagger: 7, size: [1.2, 0.8, 1.2], y: 14.2 },
      cut,
    }
  );
});

// Eight floods round the manifold — with the platform floods and the mouth,
// the "burning bright" of a structure at SIG 55.
wellheadFloods(root, flood);

const size = fitFootprint(root, L);
if (Math.abs(Math.max(size.x, size.z) - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${Math.max(size.x, size.z).toFixed(4)} across; the facet rule was asked at ${DRAWN}`
  );
await exportGlb(root, 'vent-tap-bathyarch.glb');
