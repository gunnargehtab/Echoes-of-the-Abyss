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
 * The four `exchanger_vent` gratings sit inside the hazard band's slab on
 * each exchanger's roof, where no bake sees them, and the audit warned on
 * all four; #890 clad them in `amber_lamp_unlit`, in place and at size,
 * because the block's resting clause — "the vent's ember mouth under the
 * manifold, floodlit working platforms around the wellhead, lamps along
 * every pipe run" — names the exchangers nowhere, and the resting clause
 * is what the model lights (docs/models-plan.md §3.2 rule 1). The mouth,
 * the platform floods, the pipe lamps and the wellhead floods are lit and
 * face up.
 *
 * The frame is the approved export's own: drawn 137.18 across, hazard band
 * corner to hazard band corner, and priced at 180 m by the table, so the root
 * carries that one scale (as hulls/sower.mjs does) — taken by the measure the
 * bake and the runtime take (kit.mjs `fitFootprint`), which is what lands the
 * maps exactly where the approved bake put them. The arms sit on the
 * diagonals, 45° and every quarter turn from it, as the approved file has
 * them; the wellhead floods start on +X.
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

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lamp = bathyarch.ink.amberLamp();
const flood = bathyarch.ink.amberFlood();
// The exchanger gratings' finish: named in no band, so unlit (header).
const unlit = bathyarch.ink.amberLampUnlit();

const root = new THREE.Group();
root.name = 'vent_tap_bathyarch';

// The wellhead in rust, the manifold in iron, the ember mouth flood-lit.
ventWellhead(root, { rock: rust, mouth: flood, steel: grey });

// Four arms on the diagonals, each with the Klaxon's exchanger on its end.
radialSeries({ count: 4, phase: Math.PI / 4 }, (a) => {
  ventDrawArm(root, { rock: rust, steel: grey, deck: black, lamp, flood }, { bearing: a });
  bathyarch.exchangerHead(
    root,
    { black, grey, rust, amber, vent: unlit },
    {
      bearing: a,
      at: 74,
      y: 7,
      size: [26, 14, 18],
      fins: { count: 5, from: 66, pitch: 4, size: [1.2, 16, 20], y: 7 },
      band: { size: [27, 0.8, 19], y: 14.5 },
      stack: { at: 80, r: [2, 2.4], h: 14, y: 20, band: { r: 2.6, h: 1, y: 25 } },
      grating: { at: 70, size: [6, 0.4, 6], y: 14.3 },
      foot: { at: 88, size: [8, 4, 8], y: 0 },
      rivets: { count: 4, from: -10, pitch: 6.5, stagger: 7, size: [1.2, 0.8, 1.2], y: 14.2 },
    }
  );
});

// Eight floods round the manifold — with the platform floods and the mouth,
// the "burning bright" of a structure at SIG 55.
wellheadFloods(root, flood);

fitFootprint(root, L);
await exportGlb(root, 'vent-tap-bathyarch.glb');
