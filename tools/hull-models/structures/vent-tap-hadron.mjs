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
 * seam, a crystal spine and a buttress blade, from `factions/hadron.mjs`.
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

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'vent_tap_hadron';

// The wellhead in shadow indigo, the manifold in pale alloy, the mouth a node.
ventWellhead(root, { rock: shadow, mouth: node, steel: alloy });

// Four arms on the diagonals, each with the Order's exchanger on its end.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a) => {
  ventDrawArm(root, { rock: shadow, steel: alloy, deck: alloy, lamp: seam, flood: node }, { bearing: a });
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
      seam: { size: [18, 0.4, 0.9], y: 16.2 },
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
fitFootprint(root, L);
await exportGlb(root, 'vent-tap-hadron.glb');
