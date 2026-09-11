/**
 * The Vent Tap, Abyssal Directorate — 180 m of footprint (2 × `radiusM` 90,
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
 * Directorate's ink: trench black for the rock, weld steel for the pipework,
 * a red platform, crimson lamps and the gullet glow for the floods. What is
 * the Directorate's is the exchanger: a carapace alternating violet and red
 * arm to arm, its seam, three spines, four photophores and a claw, from
 * `factions/directorate.mjs`.
 *
 * The frame is the approved export's own: drawn 142.84 across by the measure
 * the bake takes — a yawed orb measures wider than its vertices (kit.mjs
 * `fitFootprint`) — and priced at 180 m by the table, so the root carries
 * that one scale, as hulls/sower.mjs does. By its vertices the file is 1.3
 * longer on Z than on X (the photophores' stagger), and #608 expected intake
 * to yaw it on that; by the measure intake actually takes it is square, the
 * four carapaces setting every edge, and the approved bake did not yaw it.
 * Neither does this file. The arms sit on the diagonals, 45° and every
 * quarter turn from it, as the approved file has them.
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
import * as directorate from '../factions/directorate.mjs';

const L = 180;

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();
const gullet = directorate.ink.gulletGlow();

const root = new THREE.Group();
root.name = 'vent_tap_directorate';

// The wellhead in trench black, the manifold in weld steel, the mouth a gullet.
ventWellhead(root, { rock: black, mouth: gullet, steel });

// Four arms on the diagonals, each with a carapace on its end — violet on the
// even arms, red on the odd, as the tergites alternate along a hull.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a, i) => {
  ventDrawArm(
    root,
    { rock: black, steel, deck: red, lamp: crimson, flood: gullet },
    { bearing: a }
  );
  directorate.carapaceHead(
    root,
    { skin: i % 2 ? red : violet, black, steel, crimson },
    {
      bearing: a,
      at: 74,
      carapace: { y: 5, r: [15, 8, 12] },
      seam: { at: 62, y: 5, r: [4, 7.5, 11] },
      spines: { from: -6, pitch: 6, y: 14, r: 1.2, lengths: [8, 10, 12], stagger: [-3, 4, -3], rake: -0.3 },
      photophores: { from: -8, pitch: 5.5, ys: [8, 9, 8, 9], stagger: 8, size: 1.6, h: 0.5 },
      claw: { at: 88, y: 0, r: 2.4, length: 16, raise: 0.8 },
    }
  );
});

// Eight floods round the manifold — with the platform floods and the mouth,
// the "burning bright" of a structure at SIG 55, in the gullet's glow.
wellheadFloods(root, gullet);

fitFootprint(root, L);
await exportGlb(root, 'vent-tap-directorate.glb');
