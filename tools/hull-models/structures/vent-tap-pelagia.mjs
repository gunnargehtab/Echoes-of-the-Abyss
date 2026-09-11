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
 * The frame is the approved export's own: drawn 141.96 across by the measure
 * the bake takes — the roots lean, and a leaning part measures wider than its
 * vertices (kit.mjs `fitFootprint`) — and priced at 180 m by the table, so
 * the root carries that one scale, as hulls/sower.mjs does. The arms sit on
 * the diagonals, 45° and every quarter turn from it, as the approved file has
 * them.
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

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const vein = pelagia.ink.bioVein();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'vent_tap_pelagia';

// The wellhead in chitin, the manifold in growth ridge, the mouth a vein.
ventWellhead(root, { rock: chitin, mouth: vein, steel: ridge });

// Four arms on the diagonals, each with the Commune's bladder on its end.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a) => {
  ventDrawArm(
    root,
    { rock: chitin, steel: ridge, deck: membrane, lamp: light, flood: light },
    { bearing: a }
  );
  pelagia.bladderHead(
    root,
    { membrane, ridge, spore, vein },
    {
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

fitFootprint(root, L);
await exportGlb(root, 'vent-tap-pelagia.glb');
