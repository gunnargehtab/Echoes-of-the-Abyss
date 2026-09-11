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
 * vertices it is square to the millimetre; by the bake's measure it is
 * square to 3e-14, and the bake's rule is "yaw when Z is longer". The
 * approved binary lands on the long side of that tie, so intake yaws it a
 * quarter turn and says so, and that is the frame the shipped maps were
 * baked in. The port keeps the approved file's own placement to the bit —
 * the same tie, the same yaw, the same maps — rather than turn the root to
 * silence the warning, because a quarter turn on the root would leave every
 * later `diff.mjs` of this file reporting seventy-odd moved parts against
 * the binary it ports. The warning is the approved binary's own.
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

fitFootprint(root, L);
await exportGlb(root, 'vent-tap-hadron.glb');
