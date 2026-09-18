/**
 * The Tocsin — the Order's siege hull, 105 m (docs/units.md, "Tocsin
 * (Slipway)").
 *
 * "The bell, 105 m — an energy gun with 1,400 m of reach that fires only
 * while stationary, and stationary it is the loudest thing in the water
 * short of a ping: outranged by nothing, caught by anything that reaches it
 * (SIG 22 idle; 55 cruise ahead, 19.3 on the beam, 5.5 astern; 88 firing
 * ahead, 30.8 on the beam, 8.8 astern; a 70-damage gun that does 200 to a
 * structure at 1,400 m; 340 hull; 55 m/s; 340 nodules and 40 Resonance
 * Crystal). A bell in plan, bilaterally symmetric, laid on its side with
 * the crown forward and the mouth astern. The barrel stands out of the
 * crown: a faceted emitter rail on the centreline, a third of the length,
 * ending in a crystal muzzle collar. Behind it the whole hull is the bell —
 * a faceted skirt of pale alloy widening in one unbroken flare from the
 * crown's shoulders to a lip astern that is the widest beam on any Order
 * hull, a violet crystal spine down its back from breech to lip, and at
 * the lip's two corners brace blades that swing out and down when the hull
 * stops, and lock; in the mouth of the bell, the drive prism, dark, because
 * a hull that is firing is a hull that is not moving. No guard wings, no
 * crossguard, no canards — nothing of the Lance's chevron or the Reciter's
 * needle: the barrel is thin and the hull is wide, and neither is anything
 * without the other. The model is the hull braced and firing, which is the
 * only state it fires in; under way the blades fold flat along the skirt
 * and the prism is lit. Dim at rest but for the crystal in the collar and
 * the one mark astern; under way, sustained glow up the rail and along the
 * crown's ridge seams, thrown forward, faint on the beam and dark astern
 * but for that mark; firing, burning bright — the rail lit from breech to
 * muzzle, the crystal spine lit down the skirt, heat-shimmer about the
 * collar — with the mouth of the bell still dark, because the quarter it
 * is loud in is the quarter it fires into." (docs/asset-prompts-3d.md,
 * Block 3, the siege hulls, as #786 amended it)
 *
 * Built, not ported (#786, off #540 Phase 4): drawn from the module's
 * vocabulary with no approved binary behind it, so every number here is a
 * decision, and this header says which ones the block did not make.
 * Metre-true at 105 with no root scale: the collar's lip is the bow at
 * x 52.5 and the skirt's lip the stern at −52.5 (`metreTrue` asserts it).
 * Built in a state (models-plan.md §3.5): braced and firing — the blades
 * swung out and locked, the prism dark — because that is the only state it
 * fires in and the track an enemy sees while it does.
 *
 * Three things in the block's order, and the plan reads as all three:
 *
 * - **The barrel** (`emitterRail`, new in the module) stands out of the
 *   crown's apex at x 17.5 and runs to the bow: 35 m in the open, a third
 *   of the length to the metre. It is a four-facet spar 39 m long from
 *   inside the crown at x 12 to inside the collar at 51.2, r 3.0 pressed to
 *   0.45 by 1.2 — 5.1 m wide and 1.9 m tall, a flat bar and not a tube,
 *   which is the Order's cut for a rail (`railGun`'s "a straight
 *   instrument, vaned in crystal, not a tube") and the width that survives
 *   the track: a first cut at 2.7 m came out of `outlines.mjs` at ±0.013 of
 *   the length, under a pixel at chart scale. The rail proper is a second
 *   four-facet spar let into the barrel's top, 30.8 m from the breech
 *   collar to the muzzle, 0.85 m wide and 0.3 m proud, in the seam
 *   family's unlit finish (`ink.crystalSeamUnlit`) for the reason below.
 *   A breech collar caps the crown's open apex where the barrel enters it:
 *   a six-facet ring 3 m long, 8.3 m across, in shadow indigo. The muzzle
 *   collar is the Lance's exactly — a six-facet crystal ring lathed bore
 *   and all, 2.2 m long from x 50.3 to the bow, r 3.4 aft to 3.9 at the
 *   lip on a bore of 2.8, a vertex on the crown pressed to 0.9 — 6.8 m
 *   across and 7.0 m tall at the lip, wider than the barrel by a third so
 *   the bow reads as a mouth, and the barrel's end stands 1.3 m inside it.
 * - **The bell** (`bell`, new) is two six-facet lathes pressed to 0.3 by 1
 *   that share a ring at the shoulders, x 10, so the skin is unbroken
 *   across it. The skirt runs 62.5 m from the lip at r 27.7 — 48.0 m in
 *   beam, 16.6 m tall — forward to the shoulders at r 8.5, 14.7 by 5.1 m,
 *   on eight stations, and the widening accelerates the whole way: the
 *   half-beam grows 6.1 m over the 34 m from the shoulders to x −24, 4.5 m
 *   over the next 18, and 6.0 m over the last 10.5 — a bell's sound-bow,
 *   not a cone. The crown is the last 7.5 m, one straight faceted cone from
 *   the shoulders to the apex at r 3.8, 6.6 m across, and its four shoulder
 *   ridges each carry a seam 6.9 m long, 0.4 by 0.3 in section, laid along
 *   the ridge and half proud of it (`alongFrame`): the two upper ones show
 *   from above at the crown's plan edge and the two lower ones only from
 *   the conn view, as three of the Clarion's six horn seams show from
 *   nowhere. The mouth is a mouth: the skirt's profile turns in at the lip
 *   and runs a bore 14.5 m forward to a bulkhead at x −38, the wall about
 *   1.3 m thick, drawn in the order that makes a lathe's inside face in —
 *   from astern the conn view sees a hollow with a floor, not through a
 *   shell. The drive prism sits in it: a four-facet point 10 m long, r 4.5,
 *   its base on the bulkhead and its apex 4.5 m inside the lip. The crystal
 *   spine is the Order's diamond section swept down the crown ridge
 *   (kit.mjs `sweep`) from inside the breech collar at x 17.2 to the lip,
 *   69.7 m, 0.8 m wide at the breech and 1.2 at the lip, 0.8 tall, bedded
 *   0.25 m into the ridge — `spineInlay` is a lathe at one height and this
 *   back rises 7.2 m from breech to lip. At 48.0 m the lip is the widest
 *   beam on any Order hull by either measure: the Antiphon's 46.0 m at
 *   ±0.208 of its length was, and this is ±0.229; the Order's Light Scout
 *   is 0.43 of its 60 m and this is 0.457.
 * - **The brace blades** (`braceBlades`, new) hang from the lip's two
 *   corners. Each is one plane of the Order's wing thickness, 0.9 m, hinged
 *   along the flank's last segment — the 5.5 m of skin from x −48 to the
 *   lip, which runs 35.5° off the keel in plan — so the hinge is the skin's
 *   own edge and a blade folded flat would lie against it, span up the
 *   flat. Root chord 6 m along the hinge about x −49.7, span 14 m to a
 *   point with the bevel at 11.5, and the whole plane turned 40° down about
 *   the hinge: out and down in one motion, which is what one hinge gives.
 *   The tips stand at z ±31.0 and y −9.0, 0.7 m below the keel of the lip,
 *   and 9 m forward of it — the span is perpendicular to a hinge that is
 *   not fore-and-aft, so a swung blade points out and a little forward, and
 *   nothing on the hull stands aft of the lip. A six-facet pin 5 m long,
 *   r 0.6, lies in each hinge line half in the skin, and a crystal strip
 *   0.6 m wide rides each blade's forward edge from the root to 1.4 m short
 *   of the tip, clad and cold. No wing, no canard, no fin: the two blades
 *   are the hull's vertical blades, and a dorsal fin on a back that carries
 *   the spine and is already 8.9 m tall at the lip would stand on the one
 *   ridge the block gives to something else.
 *
 * WHAT THE BLOCK, AS FIRST WRITTEN, DID NOT SAY — decided here, and the
 * first written into it in #786:
 *
 * - **The stern mark is a resting lamp.** The block put "dark astern but
 *   for one mark" in its under-way clause only, as the Herald's and the
 *   Lance's did before #784 and #785 amended them; the band table's floor
 *   row is "navigation marks only", which licenses a mark at every band,
 *   and the plan's §4 bullet names "navigation marks as the band table
 *   licenses at every band" among the resting lamps. The block now says so
 *   in both clauses, as theirs do. It sits on the spine's ridge at
 *   x −46, 1.0 by 0.4 by 0.8, pitched 9° to the ridge's own slope
 *   (`drive`'s `mark.pitch`, new for this hull) so it lies on the crystal
 *   rather than floating off one end of it, and the drive prism's apex
 *   is 2 m astern of it and 7.5 m under.
 * - **What is unlit, and in what finish.** The rail, the crown's ridge
 *   seams and the crystal spine are lamps the block lights under way or
 *   firing, and never at rest; the prism is lit under way and the block
 *   calls it dark in the state that is modelled. All four are built as
 *   parts and carry the seam family's unlit finish (`ink.crystalSeamUnlit`),
 *   never a lamp — models-plan.md §3.2 rules 2 and 4, the Herald's tine
 *   seams and the Lance's runners before them. So the "violet crystal
 *   spine" is a near-black run in the resting bake: Block 2b's rule is
 *   that a hue never reaches a pixel and a value ratio does, and a dark
 *   line down a pale back is the ratio the resting state has. The brace
 *   edges are the only clad crystal on the hull, because the block lights
 *   nothing on the blades in any band.
 * - **The collar is the lamp, whole.** "The crystal in the collar" is read
 *   as the Lance's block was: the collar is crystal and lit, one whole
 *   lamp, not the gun hulls' clad crystal with a lit core (`bowArray`),
 *   which the Antiphon's review settled is an idiom for a hull whose block
 *   names an array. This block names a collar and a rail.
 * - **`railGun` is the idiom and not the builder.** The plan bullet names
 *   it; it is the Sentinel Turret's barrel in a Z-long export's frame,
 *   named `r`/`l`, ending in a pyramid tip and a sphere pip. The hull's
 *   barrel ends in a collar, is named for its sides the kit's way, and is
 *   `emitterRail` in the module, in `railGun`'s register.
 * - **The bell is pressed like a blade.** The block says faceted and says
 *   nothing of height. Six facets with a vertex on the crown is the Order's
 *   horn cut, and the pressing is what keeps a 48 m mouth from reading as
 *   a drum: 0.3 tall by 1 wide makes the lip 16.6 m tall, which the
 *   Responsory's rings (21.6 m) and the Order's Cruiser (24.5 m) both
 *   stand over.
 * - **What the track shows.** `outlines.mjs` cuts the widest thing at
 *   every station, so the mouth's recess between the lip's corners — the
 *   hand-drawn outline's notch — is not a shape it can write, as the
 *   Herald's slot was not. The generated outline is: the collar ±0.032 of
 *   the length across at the bow, the barrel drawn straight at ±0.024 to
 *   x 0.188, the crown's shoulders at ±0.072 at x 0.088, the flare as one
 *   edge out to ±0.172 at x −0.400, a step out to the blades' ±0.291 at
 *   x −0.412, and back to the lip's ±0.236 at the stern — against the
 *   hand-drawn ±0.07, ±0.045, ±0.09 at x 0.1, ±0.15 at −0.2, ±0.24 at −0.42
 *   and ±0.3 at −0.5 with its notch to ±0.14. Still a bell on its side,
 *   thinnest at the bow and widest at the very stern, and the pointed end
 *   still leads.
 *
 * Resting light, on the axis and forward, and the kit's audit clean: the
 * muzzle collar, 14.2 m² facing up, and the stern mark on the spine,
 * 0.75 m² — nothing on the flanks, nothing on the skirt, nothing on the
 * blades. 14.9 m² on 2,117 m² of plan (the bake's 8,468 mask px at 2 px/m).
 * On the shipped emissive at 4 px/m the collar is a patch of about 9 by 27
 * pixels at the bow and the mark one of 4 by 3 astern. The bake at
 * E(9.9) = 0.913 — the compass average of the idle 22, as every Order row
 * bakes (models-plan.md §3.3) — reads raw E 7.12 and dims by ×0.128 onto
 * 0.913, eight times above the ×1/64 floor the quiet end has to stay clear
 * of (the Lance's ×0.076, the Herald's ×0.073) and nowhere near the ×64
 * ceiling. 19 parts, 528 triangles, bounds x ±52.5, y −9.3..8.9, z ±32.7
 * as three's boxes measure a turned plate (the blades' vertices reach
 * ±31.0).
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 105;
const BOW = L / 2;
const STERN = -L / 2;

/** The bell's pressing: a six-facet lathe at 0.3 tall by 1 wide, flatter than the rung's blade. */
const BELL = [0.3, 1];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const unlit = hadron.ink.crystalSeamUnlit();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_tocsin';

// The skin's stations, lip forward to the apex the barrel stands out of,
// and the mouth's, from the bulkhead's centre aft to the lip's inner edge
// (the header). The lip is the stern at x −52.5.
const OUTER = [
  [STERN, 27.7],
  [-48, 24.0],
  [-42, 20.8],
  [-34, 18.0],
  [-24, 15.6],
  [-12, 13.2],
  [0, 10.8],
  [10, 8.5],
  [17.5, 3.8],
];
const BORE = [
  [-38, 0.001],
  [-38, 17.9],
  [-42, 19.3],
  [-48, 22.5],
  [STERN, 26.2],
];

// The bell: skirt and crown sharing the shoulder ring at x 10, four seams
// on the crown's shoulder ridges, and the crystal spine swept down the
// crown ridge from inside the breech collar to the lip — the seams and the
// spine in the unlit finish (the header).
hadron.bell(
  root,
  { alloy, unlit },
  {
    outer: OUTER,
    bore: BORE,
    shoulder: 10,
    flat: BELL,
    seams: { from: 10.8, to: 16.7, section: [0.4, 0.3] },
    spine: {
      stations: [17.2, 10, 0, -12, -24, -34, -42, -48, STERN],
      halfBeam: [0.4, 0.6],
      halfHeight: 0.4,
      lift: 0.15,
    },
  }
);

// The barrel, and the hull's whole argument (the header): the flat spar
// from inside the crown to inside the collar, the breech collar capping the
// crown's apex, the rail let into the barrel's top in the unlit finish, and
// the muzzle collar whose forward face is the bow at x 52.5 — the resting
// light.
hadron.emitterRail(
  root,
  { alloy, shadow, unlit, node },
  {
    barrel: {
      profile: [
        [12, 2.6],
        [15, 3.0],
        [49, 3.0],
        [51.2, 2.0],
      ],
      facets: 4,
      flat: [0.45, 1.2],
    },
    breech: {
      profile: [
        [16.5, 3.3],
        [16.5, 4.8],
        [19.5, 4.8],
        [19.5, 3.3],
        [16.5, 3.3],
      ],
      flat: [0.45, 1],
    },
    rail: {
      profile: [
        [19.5, 0.6],
        [50.3, 0.6],
      ],
      y: 1.0,
      facets: 4,
      flat: [0.6, 1.0],
    },
    collar: {
      profile: [
        [50.3, 2.8],
        [50.3, 3.4],
        [BOW, 3.9],
        [BOW, 2.8],
        [50.3, 2.8],
      ],
      flat: [0.9, 1],
    },
  }
);

// The brace blades, swung out and locked: hinged along the flank's last
// segment, whose plan runs from (−52.5, 24.0) to (−48, 20.8) — the hinge
// centre at x −49.7 is on that line — and turned 40° down about it. The
// root's after corner stays 0.2 m forward of the lip so nothing stands aft
// of the stern (the header).
hadron.braceBlades(
  root,
  { alloy, crystal, shadow },
  {
    hinge: { at: [-49.7, 21.99], along: [4.5, -3.21] },
    anhedral: (40 * Math.PI) / 180,
    outline: [
      [3, 0],
      [-3, 0],
      [-1.5, 11.5],
      [0, 14],
      [1.5, 11.5],
    ],
    t: 0.9,
    pin: { r: 0.6, length: 5.0 },
    edge: { width: 0.6, short: 1.4, t: 1.2 },
  }
);

// The drive: a four-facet point in the mouth, its base on the bulkhead at
// x −38 and its apex at −48, dark — the unlit finish, no lamp (the header);
// and the one mark astern on the spine's ridge at x −46, laid to the
// ridge's slope of 0.16, the only light on the hull that is not in the
// collar.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: -43,
    r: 4.5,
    facets: 4,
    taper: 0,
    length: 10,
    mat: unlit,
    ring: false,
    mark: { mat: seam, size: [1.0, 0.4, 0.8], x: -46, y: 7.5, pitch: -0.16 },
  }
);

// Metre-true as drawn: 105 from the skirt's lip to the collar's, so the
// scale this returns is 1 and the root carries nothing.
metreTrue(root, L, { drawn: L });

await exportGlb(root, 'tocsin-hadron.glb');
