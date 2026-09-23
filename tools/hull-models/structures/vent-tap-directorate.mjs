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
 * THE LIGHT the top-down maps could not see. The export lit the sixteen
 * exchanger photophores at y 8 and 9, inside their carapace orbs — the
 * light audit named fourteen at nothing from above, and only `photophore_3`
 * on the first two arms ever showed, and that one because it hung in the
 * air past the shell's nose. They are the last lamps of each pipe run —
 * "lamps along every pipe run", one reading for all four navies, as the
 * Knights' `exchanger_seam` (#890 review, ruling 5) — so all sixteen stay
 * lit in `biolight_crimson` and every one now sits on its exchanger's upper
 * face: each rank keeps the file's stagger, 8 either side of the arm in
 * global z, and its stations along the arm, and `carapaceHead` seats each
 * stud on the built face under that station — a ray cast onto the shells
 * as they stand, not the ideal orb, whose faces lie inside it — laid to
 * that face's slope with its underside in the face's plane. The lift
 * along the face's normal moves every centre 0.17 to 0.23 m off its old
 * plan position. Two stations on each of the first two arms fall off the
 * carapace: `photophore_0` lands on the seam orb and sits there, at its
 * own station, 0.23 m from its old spot; `photophore_3` falls past the
 * nose over nothing and is the one stud drawn back along the arm, 5.2 m
 * in plan, to three quarters of the shell's reach at that beam. Every stud
 * shows from above, 4.1 to 4.4 m² each. A stud is a flat box on a convex
 * faceted shell, so where its station lies near a facet edge one corner
 * hangs over the neighbouring face, by up to 0.5 m; its centre and the
 * corners on its own face touch.
 *
 * The frame is the approved export's own: drawn 142.84 across by the measure
 * the bake takes — a yawed orb measures wider than its vertices (kit.mjs
 * `fitFootprint`) — and priced at 180 m by the table, so the root carries
 * that one scale, as hulls/sower.mjs does. By its vertices the approved file
 * was 1.3 longer on Z than on X — the photophores' global-z stagger, which
 * reached past the shells — and #608 expected intake to yaw it on that; by
 * the measure intake actually takes it is square, the four carapaces
 * setting every edge, and the approved bake did not yaw it. Neither does
 * this file, and since #890 seated the studs on the shells its vertices are
 * square too: 166.77 m on both axes at 180 m, the four anchor claws setting
 * every edge. The arms sit on the diagonals, 45° and every quarter turn
 * from it, as the approved file has them.
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
// even arms, red on the odd, as the tergites alternate along a hull; the
// carapace's four photophores on its upper face, the run's last lamps (#890,
// the header).
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
      photophores: { from: -8, pitch: 5.5, count: 4, stagger: 8, size: 1.6, h: 0.5 },
      claw: { at: 88, y: 0, r: 2.4, length: 16, raise: 0.8 },
    }
  );
});

// Eight floods round the manifold — with the platform floods and the mouth,
// the "burning bright" of a structure at SIG 55, in the gullet's glow.
wellheadFloods(root, gullet);

fitFootprint(root, L);
await exportGlb(root, 'vent-tap-directorate.glb');
