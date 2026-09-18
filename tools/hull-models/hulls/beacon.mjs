/**
 * The Beacon — the Consortium's scout, 70 m (docs/units.md, "The scouts";
 * #784, off #540 Phase 4).
 *
 * "The picket that shouts, 70 m — a cheap active sonar fired every 20 s at
 * SIG 80, and nothing else (SIG 30 idle, 42 cruise; no weapon; HYD 55). A
 * riveted box hull over a pressure-cylinder body with the transducer drum
 * standing athwartships amidships in a bolted cradle: a banded cylinder
 * wider than the hull and proud of both flanks, hoop flanges, a dogged
 * inspection hatch, a stub lamp mast over it; a dogged crew hatch on the
 * foredeck, ballast blisters low on the hull, one prop tunnel in a square
 * stern, plate patchworked older-under-newer. Dim amber running lights
 * along the hull line and the drum's hoop lamps at rest, the hoops
 * brightening to a sustained glow under way; the drum floods bright for the
 * instant of a ping, once every twenty seconds, and is dim again between —
 * the cadence is the light." (docs/asset-prompts-3d.md, UNIT — Beacon, as
 * #784 amended it)
 *
 * Built to that block and not ported from a binary, like the Freighter
 * before it (docs/models-plan.md §3.1), so every number here is a decision
 * and this header says which ones the block did not make. Metre-true at 70
 * with no root scale: the nose of the box is the bow at x 35 and the
 * transom and the prop hub are the stern at −35; port is −z (#642).
 *
 * The body is the navy's two shapes, one on the other. The pressure body is
 * the Submersible's `bandedHull` — a sixteen-facet drum 62 m long and 9 m
 * across on the hull axis, four reinforcement bands, a cap at each end with
 * its core and a ring of twelve bolts — and the box is the Tender's
 * `boxHull` over it, 5 m deep and 16.8 m across its parallel flanks, its
 * deck plate a metre and a half inside its rim. The box sits on the drum's
 * upper half: below its underside the drum's belly and both caps show, and
 * the ballast blisters lie in the armpits between the two. The plan is the
 * hand-drawn outline this model replaces (silhouettes.ts, "a box with a
 * drum: near-parallel riveted flanks, a square stern, and the transducer
 * drum standing athwartships amidships, proud of both sides"): flanks at
 * ±8.4 from x 28 to −31, a 7 m chamfer to a 7 m bow face, a 4 m chamfer to
 * a 12.6 m transom, and nothing on the flanks more than 0.6 m proud, which
 * is under the 1.05 m `outlines.mjs` folds into one line at this length.
 * Square-edged, as the Freighter is: a box, not a casting.
 *
 * What the script decided that the block, as first written, did not say —
 * the block was amended with the first two in #784:
 *
 * - **The hoop lamps are lit at rest.** The block's first draft read "dim
 *   amber running lights along the hull line at rest, the drum's hoop lamps
 *   a sustained glow under way", which docs/models-plan.md §3.2 rule 2
 *   would make cladding; but its own last clause has the drum "dim again
 *   between" pings, which is a drum that is dim rather than dark, and §4's
 *   Beacon bullet lists the hoop lamps among the resting lamps. The
 *   pipeline draws one lighting state and scales every lamp by
 *   E(live) / E(rest) in `applyLiveGlow` (§3.2), so "a sustained glow under
 *   way" is these same lamps at E(42) / E(30) = 2.36 times their resting
 *   strength — the 16–35 band's "dim" at idle and the 36–60 band's
 *   "sustained glow" at cruise, from one set of lamps. Two lit hoops, one a
 *   side outboard of the outer flange, in `amber_vent` — the amber banked
 *   down, the navy's machinery light — where the running lights and the mast
 *   lamp are `amber_lamp`, the navigation fixture.
 * - **A crew hatch on the foredeck.** The block names the drum's inspection
 *   hatch and no way into the hull. A dogged hatch forward of the drum,
 *   to port of the centreline, in the same `doggedHatch` the drum's crown
 *   carries; the Freighter's foredeck hatch is the precedent.
 * - **The drum is let into the box.** "Standing … in a bolted cradle" gives
 *   no height. The drum's axis is 2.5 m above the deck and its radius 5.5,
 *   so it sinks 3 m through the deck plate into the box and its underside
 *   hangs 2.5 m below the deck edge outboard of both flanks; the cradle is
 *   the bed plate under it and a chock fore and aft, bolted down. A drum
 *   standing whole on the deck would put its crown at 18 m and the mast at
 *   22 on a 70 m hull, and a cradle is what a drum sits *in*.
 * - **The heads are dished.** Each end of the drum is a frustum drawn in
 *   from 5.5 to 3.4 m over 2 m, in newer grey where the drum is black — a
 *   pressure head, and the reason the plan bump has chamfered corners.
 * - **The hatch is on the crown, to port.** "A dogged inspection hatch"
 *   places it nowhere; the crown is where the chart sees a hatch and the
 *   wheel, and to port because the Klaxon puts nothing where its opposite
 *   is (the patches say the same).
 * - **The prop tunnel is notched into the transom.** The Tender's stern
 *   idiom, one tunnel wide: a 7.6 m notch in the box's stern between the
 *   quarters with the shroud lying in it on the hull axis, so the tunnel is
 *   *in* the square stern rather than under it. The outline keeps its
 *   square corners because the cutter keeps each station's extremes.
 * - **No stack, no vents, no bow lamp.** The block names none, and a scout
 *   that is "a cheap active sonar … and nothing else" carries nothing the
 *   block does not give it. The mast lamp is the navigation mark the band
 *   table's floor row licenses at every band, and the one emitter here
 *   that nothing occludes. The ping flood is a transient (§3.2 rule 3) and
 *   is not modelled; nothing on the hull is clad in an unlit lamp finish
 *   because nothing on it is a lamp only in a later band.
 * - **Three patches and a stencil.** The navy's patchwork (Block 2): older
 *   plate on the foredeck and on the drum's crown to starboard, newer on
 *   the bare port flank under the drum; the asset number on the foredeck.
 *
 * The resting light, as the export's audit counts it from above: the two
 * hoop lamps at 9.0 m² each, eight running lights on the rim of the deck at
 * four stations a side at 0.75 m² each, and the mast lamp at 1.0 m² —
 * eleven lit parts, 25.0 m² facing up on a 1,328 m² plan, no part hidden.
 * The intake bake at 70 m reads raw E 11.56 against the target
 * E(30) = 3.84 and dims by ×0.335 — inside the ×1/64 .. ×64 window, and on
 * the same side of it as the Freighter's ×0.527, the navy's other SIG-30
 * hull, so the conn view's lamps, which take the model's own intensity and
 * never the bake's gain (rosterModels.ts), sit near the band the chart
 * shows. 143 parts, 3,756 triangles, six materials; the file spans x
 * −35 .. 35 and z −15 .. 15 to the centimetre, so the bake neither rescales
 * nor rotates.
 *
 * The outline `outlines.mjs` cuts from this file: a 7 m bow face, flanks at
 * 0.127 of the length from x 0.4 to −0.425 — the plates and the seam, 0.6 m
 * proud, folded into the box's 0.12 — the drum's bump from x ±0.088 out to
 * ±0.214 with the heads' chamfer on its corners, and a square stern at
 * 0.09–0.097. That is the hand-drawn outline's 0.12 flank and 0.22 tip; the
 * bump is narrower than it was drawn there, ±0.088 against ±0.18, because
 * a drum 11 m across is 11 m across in plan. The cut's bow and stern points
 * land a few thousandths off the centreline and its bump keeps a vertex
 * more on one side than the other — both the simplifier's and not the
 * model's, as the Freighter's header says of its cut.
 *
 * Every part comes from `factions/bathyarch.mjs`; `transducerDrum` and
 * `doggedHatch` were written for this hull there, beside the Freighter's
 * family. The pressure body's parts carry the Submersible export's
 * hyphenated names (`pressure-hull`, `end-cap-fore`) because `bandedHull`
 * is that model's builder and the names are the builder's; everything else
 * is named as the Tender and the Freighter name theirs.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts). Drawn at it: bow face at +35, transom and prop hub at −35. */
const L = 70;
const BOW = L / 2;
const STERN = -L / 2;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();

const root = new THREE.Group();
root.name = 'consortium_beacon';

// The pressure body on the hull axis: a sixteen-facet drum from x −31 to 31,
// four bands, and at each end the cap, its core and twelve bolts round it.
// The caps sit under the box's overhangs — the fore cap under the bow
// chamfer, the aft cap ahead of the prop tunnel.
bathyarch.bandedHull(
  root,
  { black, grey, brown: rust },
  {
    hull: { r: 4.5, length: 62, facets: 16 },
    bands: { r: 4.75, width: 1.2, x: [-22, -8, 8, 22] },
    caps: { x: 31.5, r: 4.7, width: 1, core: { x: 32.3, r: 3.2, width: 1.2, facets: 12 } },
    bolts: { x: 32.2, radius: 4.0, count: 12, r: 0.28, h: 0.5 },
  }
);

// The box over it: a plan in absolute metres, bow first down the starboard
// side and back up the port, 5 m deep from y 1.5 to 6.5 — its underside on
// the drum's upper half. Flanks parallel at ±8.4 from x 28 to −31, a 7 m
// chamfer to the 7 m bow face, a 4 m chamfer to the transom, and the prop
// tunnel's notch cut into the stern between the quarters. The deck plate
// lies on it a metre and a half inside the rim, notched with it, and a
// rubbing strake runs each flank along the box's lower edge.
bathyarch.boxHull(
  root,
  { black, grey, rust },
  {
    hull: {
      outline: [
        [BOW, 3.5],
        [28, 8.4],
        [-31, 8.4],
        [STERN, 6.3],
        [STERN, 3.8],
        [-31.5, 3.8],
        [-31.5, -3.8],
        [STERN, -3.8],
        [STERN, -6.3],
        [-31, -8.4],
        [28, -8.4],
        [BOW, -3.5],
      ],
      depth: 5,
      y: 4,
    },
    deck: {
      outline: [
        [33.6, 2.9],
        [27.6, 6.9],
        [-30.6, 6.9],
        [-33.5, 5.4],
        [-33.5, 5.3],
        [-30, 5.3],
        [-30, -5.3],
        [-33.5, -5.3],
        [-33.5, -5.4],
        [-30.6, -6.9],
        [27.6, -6.9],
        [33.6, -2.9],
      ],
      depth: 0.5,
      y: 6.75,
    },
    strakes: { x: -1.5, y: 1.9, z: 8.4, size: [58, 0.6, 1.0] },
  }
);

// The Bulwark's flank plate in the Derrick's gauge, 1.2 m: one plate a side
// forward of the drum in newer grey and one aft in older rust riding higher,
// and the seam of older plate along the flank under the deck edge.
bathyarch.flankPlates(
  root,
  { grey, rust },
  {
    z: 8.4,
    plateT: 1.2,
    plates: [
      [17, 16, 3.0, 4.1, false],
      [-19, 16, 2.6, 4.5, true],
    ],
    seamLength: 56,
    seam: { y: 6.05, h: 0.5, t: 1.0, z: 8.4 },
  }
);

// Ballast blisters low on both flanks, in the armpit between the box's
// underside and the pressure drum, capped fore and aft.
bathyarch.ballastBlisters(
  root,
  { grey, rust },
  {
    x: -6,
    y: -0.4,
    z: 6.4,
    r: 2,
    length: 36,
    caps: { length: 3, fore: 13.5, aft: -25.5, tipR: 1.2 },
  }
);

// The one prop tunnel, lying in the stern notch on the hull axis: the
// shroud's after face 0.2 m inside the transom and the hub standing to it
// at −35.
bathyarch.propTunnel(
  root,
  { grey, black },
  {
    name: '0',
    at: [-33.6, 0, 0],
    r: 3.5,
    length: 2.4,
    hub: { r: 1, length: 2.8 },
  }
);

// The transducer drum: 11 m across and 26 m between its heads, 30 m over
// them, athwartships on x 0 with its axis 2.5 m over the deck — proud of
// each flank by 6.6 m. The cradle under it, two flanges a side, the lit
// hoop outboard of the outer flange, the hatch on the crown to port, and
// the mast on the crown with its lamp.
bathyarch.transducerDrum(
  root,
  { black, grey, rust, lampM: vent },
  {
    at: [0, 9.5, 0],
    r: 5.5,
    length: 26,
    facets: 16,
    cradle: {
      bed: { size: [15, 0.5, 15], y: 7.25 },
      chock: { size: [2.4, 3.2, 16], x: 5.6, y: 8.6 },
      bolts: { z: [-6, -3, 0, 3, 6], x: 7.2, y: 7.7, r: 0.25, h: 0.4 },
    },
    heads: { length: 2, tipR: 3.4 },
    hoops: { z: [5, 11.5], r: 6.1, width: 1 },
    hoopLamps: { z: 12.6, r: 5.9, width: 0.6 },
    hatch: { z: -6.8, r: 1.2, h: 0.5, sink: 0.15, wheel: { R: 0.55, t: 0.1, dy: 0.35 } },
    mast: { rTop: 0.3, r: 0.4, h: 3, sink: 0.2, lamp: { r: 0.6, dy: 0.3 } },
  }
);
// The mast lamp is a navigation mark and burns as the running lights do.
root.getObjectByName('mast_lamp').material = lampM;

// The crew hatch on the foredeck, to port of the stencil.
bathyarch.doggedHatch(
  root,
  { hatch: rust, wheel: grey },
  {
    name: 'deck_hatch',
    at: [14, 7.25, -3],
    r: 1.3,
    h: 0.5,
    wheel: { R: 0.55, t: 0.1, dy: 0.35 },
  }
);

// The patchwork: older plate on the foredeck and on the drum's crown to
// starboard, newer on the bare port flank under the drum.
bathyarch.repairPatches(
  root,
  bathyarch.inFrame,
  { rust, grey },
  {
    patches: [
      ['patch_deck', 'rust', [5, 0.3, 4], [22, 7.1, 2.5]],
      ['patch_drum', 'rust', [2.4, 0.3, 3], [0, 15.0, 8.5]],
      ['patch_flank_p', 'grey', [4, 1.6, 0.4], [-1, 3.2, -8.5]],
    ],
  }
);

// Rivets: fourteen a side along the deck plate's edge in grey on the rim,
// twelve a side along the strake in black, numbered by their place in the
// file as the Bulwark's and the Tender's are. Then the stencil on the
// foredeck.
bathyarch.rivetRows(root, grey, {
  from: -30,
  to: 27,
  count: 14,
  y: 6.65,
  z: 7.2,
  size: [0.5, 0.3, 0.5],
});
bathyarch.rivetRows(root, black, {
  from: -29,
  to: 26,
  count: 12,
  y: 1.9,
  z: 8.95,
  size: [0.45, 0.45, 0.3],
});
bathyarch.bowStencil(root, amber, { at: [30, 7.1, 0], size: [5, 0.2, 1.2] });

// "Dim amber running lights along the hull line": four a side on the rim
// of the deck, port first, clear of the drum.
bathyarch.runningLights(root, lampM, {
  name: 'runlight',
  size: [0.8, 0.4, 0.8],
  y: 6.7,
  rows: [
    { side: 'p', z: -7.95, stations: [26, 13, -13, -26] },
    { side: 's', z: 7.95, stations: [26, 13, -13, -26] },
  ],
});

await exportGlb(root, 'beacon-bathyarch.glb');
