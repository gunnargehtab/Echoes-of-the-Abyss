# Models — Phase 4 of the Script-Built Fleet

> Nineteen hulls and one structure have a stat block, a doctrine, a length, a prompt block
> and no model. This is the plan for building them: one script each under
> `tools/hull-models/`, composing its navy's shape vocabulary, run to produce the GLB, and
> through `hull-intake` and the gates exactly as every approved model went.

**Glossary:** See [Glossary](glossary.md) for SIG, PF, HYD, PR and Resolution Tier.

**Status:** in progress — the transports (#783), the scouts (#784) and the ordnance hulls
(#785) are built, the other three boxes are planned. The tracking issue is #540, Phase 4, and its six boxes are filed as
issues #783 (the transports), #784 (the scouts), #785 (the ordnance hulls), #786 (the siege
hulls), #787 (the line hulls and the anchor) and #788 (the Bio-Reactor). Every figure below
is read from the working tree at `19ac7f9`; where it is a stat, [units.md](units.md) and
`packages/shared/src/units.ts` are canonical and this document only repeats them.

---

## 1. Where the models stand

Phases 1 to 3 of #540 are done: every modelled hull and structure is script-built, 63
models, and `npm run check:models` holds each script to its committed GLB. What is left of
the roster is the half [roster-plan.md](roster-plan.md) §5 deliberately let lag — *"a wave
does not wait for its models"* — which is nineteen of the 36 unit kinds and one of the
eleven structure kinds. Each bakes today through the procedural fallback that
[graphics-standards.md](graphics-standards.md) gate 1 sanctions, and each therefore renders
on the chart as a hand-drawn outline and in the conn view as a recoloured sprite.

Every one of the nineteen already carries the whole of a hull except its shape:

| already there | where |
| --- | --- |
| stat block, doctrine, price | [units.md](units.md); `UNIT_STATS` in `packages/shared/src/units.ts` |
| design length | `UNIT_STATS.hullLengthM`, which `HULL_LENGTH_M` in `silhouettes.ts` now reads |
| plan outline, hand-drawn | `HAND_DRAWN_OUTLINE` in `packages/frontend/src/game/silhouettes.ts` |
| plate class | `hullTextures.ts` |
| roster slug | `rosterModels.ts`; the conn view finds `<slug>-<navy>.glb` by filename |
| `UNIT —` block | [asset-prompts-3d.md](asset-prompts-3d.md), one subsection a wave |

What is missing is the model, and — for the outline — a generated entry once there is one.
The Bio-Reactor is the exception in the other direction: it has its stats and its slot in
the client's fallbacks, and no `STRUCTURE —` block at all.

## 2. What one built hull touches

The touch list, from the code as it stands — the model half of
[roster-plan.md](roster-plan.md) §5, which stopped at *"allowed to lag"*.

**Required, or it does not exist.** A script at `tools/hull-models/hulls/<slug>.mjs`,
composing `factions/<navy>.mjs` and `kit.mjs`, run to write
`docs/concept-art/models/<slug>-<navy>.glb`, metre-true at the design length, bow on +X and
port on −z (#642), every material citing its palette token through `hex()`. The
`hull-intake` bake at that length, warning-free, and the kit's `lightAudit` clean. A `UNITS`
row in `tools/hull-maps/models.mjs` — `slug`, `model`, `lengthM`, `sig` — then
`node tools/hull-maps/build.mjs`, which writes the three maps into
`packages/frontend/src/assets/hulls/maps/` and rewrites `hullOutlines.generated.ts`. The
three imports and the `MAP_URL` entry in `hullMaps.ts`. The kind's entry deleted from
`HAND_DRAWN_OUTLINE`, which the type makes a compile error to leave. `npm run check:models`
green, which now covers the new script.

**Already there.** The design length, the plate class, the roster slug and the block. None
of these is Phase 4's to write, and the block is Phase 4's to *amend*: where the script has
to depart from it, the block changes in the same pull request, by the same author, because
the prose is canonical and nothing in CI compares a paragraph to a scene graph (#540). The
script's header says what it did that the block does not.

**Required to be judged.** The `hull-designer` agent builds; the `hull-reviewer` agent
judges, a separate agent on a separate model, because a generator that also grades itself
is not a gate (#540, [graphics-standards.md](graphics-standards.md) §2). Review frames go
under `docs/screenshots/issue-540/` as `<issue>-<group>-maps-before-after.png` beside the
conn-view frames, as every Phase 3 port left them. `npm run gates` is the finish line.

**Needs no work.** The wire, the audio, the tests and the balance harness all read the
roster rather than list it. A model changes nothing a number can see.

**A structure differs in three places.** Scale is held on the footprint diameter
(`lengthM` is 2 × `radiusM`), no outline is generated because a structure renders from its
map, and the maps bake at 1.5 px/m into `packages/frontend/src/assets/structures/maps/`
with the wiring in `structureMaps.ts` and `rosterModels.ts`'s `STRUCTURE_SLUG`.

## 3. Rules that bind every model here

### 3.1 Built, not generated

[asset-prompts-3d.md](asset-prompts-3d.md) rule 3 branches Generated and Built, and Phase 4
takes the built path. A new hull built this way is a series break like any other; there is
no picker, so no series reference gates it, and it answers to its block and to the
round-trip check. The gates are unchanged and stay adversarial to whoever authored the
model.

### 3.2 One glow factor

The pipeline draws one lighting state. The chart bakes the model as it is and calibrates
its total emissive energy onto E(SIG) = 0.45 · e^(SIG/14) from the model table's `sig`;
the conn view then scales every lamp from that resting strength by one factor, E(live) /
E(rest), in `applyLiveGlow`. The intake calibration searches a gain between ×1/64 and ×64
and stops there — past ×64 the light geometry is what is wrong, not its intensity. From
this, five consequences, and #775 is the case that settled them on the Responsory:

1. **The resting clause is what the model lights.** Every `UNIT —` block ends with a
   lighting clause in bands: at rest, under way, sometimes working. The model's lamps are
   the first band's.
2. **A part the block lights only in a later band is clad, not lit.** It is built — it is
   a part — and it carries the lamp material family's *unlit* finish. A lamp dark at rest
   is a lamp this pipeline never shows, so lighting it would contradict the block's rest
   clause for nothing. A light the block names among its lights and never among its parts
   (the Responsory's spine thread) is not built at all.
3. **A transient is not modelled.** A muzzle door flooding for the instant of a launch, a
   drum flooding for a ping, a lip flaring: none of these is a lamp.
4. **A part the block calls dark carries no lamp.** The Weaver's pods, the Thurible's
   cells, the Blight's sac, the Tocsin's prism.
5. **Every hull needs one unoccluded upward emitter.** The chart is straight down, so a
   light budget that is all vertical faces reads as unlit where the player reads loudness
   ([asset-prompts-3d.md](asset-prompts-3d.md), "Glow encodes loudness").

The three-band blocks — the siege hulls and the Bower — are therefore drawn at their
resting band, and the working brightness is the same lamps scaled: the Furnace cutting is
E(75) / E(40), twelve times its resting light, on the lamps it has at rest. If the working
state should be *drawn* — the burner heads, the Tocsin's rail and spine, the Lure's fan
ribs, the Bower's stalk tips — that is a second emissive channel keyed to posture, a
pipeline change, and outside this plan and every shape issue. A resting lamp on a part the
block lights only working is a decision: a sentence in the script header saying why the
block's silence licenses it, and the reviewer's agreement.

The quiet end has its own trap. Thirteen of the nineteen bake under E(15): the Drifter at
E(4) = 0.60 is the quietest hull in the roster. Few, small lamps, so the bake can dim onto
the target without touching its ×1/64 floor. The Caisson, at E(64) = 43.5, has the
opposite problem and needs its lit upward area large.

### 3.3 The Order's figures are cone figures

Every Order hull's SIG is a cone figure ([units.md](units.md), each block), and the model
table bakes the compass average — 0.45 of it, one quarter at 1.00, two at 0.35, one at 0.10
([systems-echo.md](systems-echo.md) §8) — as the Clarion's row bakes 27.9 against a listed
62. So the Antiphon's idle 12 bakes at 5.4, the Herald's 14 at 6.3, the Lance's 20 at 9,
the Tocsin's 22 at 9.9. The light is *placed* forward, where the cone is loud, as the
Clarion's and Responsory's rows already say.

### 3.4 Four kinds carry no lock

The Verger, the Acolyte, the Thurible and the Lure are the Directorate's and faction-locked
by nothing but their Biomass price — the Chorister's rule ([units.md](units.md), each
block's *Faction-locked* line). So they take the Chorister's model rule too: one canonical
Directorate model, `<slug>-directorate.glb`, on the kind's `UNITS` row, which serves every
navy recoloured on the chart; in the conn view the runtime resolves `<slug>-<faction>.glb`,
only the Directorate's exists, and the other navies stay on the sprite until a variant
passes intake. Variants are a later issue, as #649 was for the Chorister.

### 3.5 Built in a state

Ten of the nineteen are a state made into geometry, and the model is built in that state,
because the generated outline is the track an enemy sees and the state is what the hull is
for. The Glider with its drive cut and its wing spread; the Herald with the cone's mouth
open; the Acolyte with its limbs planted; the Furnace with its ladders run out; the Blight
with its husk open and the arm presented; the Lure with its fan spread and the plectrum
raised; the Tocsin braced, blades out and locked; the Bower grown out. The Broadside and
the Lance are a cycle made into geometry and are built loaded — doors shut, torpedo in the
rail — because a spent one is the same hull with its doors open.

### 3.6 Plans that are not mirrored

The Glider's wing is to starboard and its trim vane to port; the Reed's leaves alternate,
starboard at the forward node and port at the after; the Acolyte's and Thurible's
photophores and the Thurible's spines repeat on neither side. These compose one side at a
time — each part placed at its own signed z, port negative (#642), as the Drifter's bays and
vanes are and as the Glider's wing and the Acolyte's limbs are (#784) — and never through
`bothSides`, which mirrors. The kit's `flank` is the Z-long ports' pair placement and an
X-long built hull has no use for it. `outlines.mjs` cuts each station's port and starboard
extremes independently, so an asymmetric plan generates as drawn.

### 3.7 Vocabulary lives in the module

Anything a script cannot reach with its navy's existing builders belongs in
`factions/<navy>.mjs`, or in `kit.mjs` when two navies would share it to the centimetre
(#608, as #652 refined it), and never inlined in one hull. §4 names the builders each hull
starts from and the ones it will need; the names are a starting point, and the module is
where they land.

## 4. The six boxes

Ordered as #540 orders them. The boxes do not depend on each other — all four faction
modules exist — so within a box one `hull-designer` a navy builds in parallel and one
`hull-reviewer` a navy judges after, as #649 and #652 ran, and each box is one pull
request pushed in instalments.

### The transports — #783

[asset-prompts-3d.md](asset-prompts-3d.md) "The transports"; wave 1, #501. Volume: a hold
with a drive, sized to its berths. None carries a weapon.

| hull | navy | length | bake SIG | model |
| --- | --- | ---: | ---: | --- |
| Freighter | Consortium | 160 m | 30 | `freighter-bathyarch.glb` |
| Drifter | Commune | 62 m | 4 | `drifter-pelagia.glb` |
| Verger | Directorate | 100 m | 14 | `verger-directorate.glb` |
| Antiphon | Knights | 110 m | 5.4 | `antiphon-hadron.glb` |

- **Freighter.** From `bathyarch`: `hullSlab` with the Bulwark's `flankPlates`, a raised
  `citadel` aft, `ballastBlisters`, `rivetRows`. New: hold doors along the flank with hinge
  rails and dogging wheels, foredeck crane gantries at hull scale, a heavy skeg carrying
  four `propTunnels`. Resting lamps: the hold-door seams and the bridge ports; the
  doors-open floodlight is a transient.
- **Drifter.** `podBody`, `growthRings`, `cargoLobes` as the two swelling bays under
  `membranes` opening like a bivalve, one muscle-drive fluke, trim vanes. Resting lamps: one
  faint seam a bay, brightening as it opens, and one bow mark. The quietest hull in the
  roster.
- **Verger.** `tergites` ribbed and domed like the Precentor's, `listeningDome` forward,
  `ballastTanks` flanking a heavy keel. New: four cohort bays in the belly behind pressure
  hatches, one ducted drive. Resting lamps: low and cold at the hatch rims and the dome; the
  bays' glow is a state. No lock (§3.4).
- **Antiphon.** `bladeBody` in the Clarion's family, `wings` swept as guards, `drive` in the
  spine, `navMarks`. New: a three-bay landing deck across the back, its bays let into it, with `resonatorRing`
  around it as the grant made visible. Resting lamps: from the bow back, dark astern; the
  ring is cold at rest as the Responsory's rings are, and flares only when the deck opens.

### The scouts — #784

"The scouts"; wave 2, #506. The sensor argument: how this navy finds things.

| hull | navy | length | bake SIG | built | model |
| --- | --- | ---: | ---: | --- | --- |
| Beacon | Consortium | 70 m | 30 | — | `beacon-bathyarch.glb` |
| Glider | Commune | 55 m | 8 | drive cut, wing spread | `glider-pelagia.glb` |
| Acolyte | Directorate | 58 m | 10 | limbs planted | `acolyte-directorate.glb` |
| Herald | Knights | 65 m | 6.3 | mouth open | `herald-hadron.glb` |

- **Beacon.** `boxHull` over a `bandedHull` pressure body, `ballastBlisters`, one
  `propTunnel` in a square stern, `rivetRows` patchworked older-under-newer. New: the
  transducer drum athwartships in a bolted cradle — a banded cylinder wider than the hull
  and proud of both flanks, hoop flanges, a dogged inspection hatch, a stub lamp mast over
  it. Resting lamps: dim amber running lights along the hull line and the drum's hoop
  lamps; the ping flood is a transient.
- **Glider.** `stem` on the centreline; one broad wing swept aft off the starboard flank
  through `flank` — `leafOutline` with `growthRings` across its blade and a stiffening
  `vein` along its leading edge — a short trim vane to port, the muscle-drive tail folded
  flat along the stem. Resting lamps: navigation marks and the wing vein barely showing;
  the tail's veins light only while the drive turns and are clad.
- **Acolyte.** Three squat `tergites`, wider in limb than shell; six hydrophone `limbs`
  walked out and planted, three a side, the forward pair raked ahead and the aft pair
  astern, in a hexapod's tripod stance; `rostrum`, `telson`, `listeningDome` sunk low into
  the middle tergite. Resting lamps: a photophore on each limb's knee, the one joint clear
  of the shell, in a pattern the stance keeps from repeating on either side. No lock.
- **Herald.** A short bilaterally symmetric `bladeBody`, widest just abaft the fork, drawn
  aft to a flat transom with the `drive` prism in the spine; no `wings`, no `canards`. New:
  the forked bow, two crystal-edged tines with the emitter crystal standing in the throat as
  one whole lamp — the Cantus's apex idiom, not `bowPrism`'s alloy point and not the gun
  hulls' `bowArray` — and a transom closing the lathe. Resting lamps: the throat crystal and
  one stern mark; the tines' inner edges light only under way and are clad.

### The ordnance hulls — #785

"The ordnance hulls"; wave 3, #507. What it carries and how much: the count has to read.

| hull | navy | length | bake SIG | model |
| --- | --- | ---: | ---: | --- |
| Broadside | Consortium | 120 m | 42 | `broadside-bathyarch.glb` |
| Weaver | Commune | 70 m | 12 | `weaver-pelagia.glb` |
| Thurible | Directorate | 105 m | 16 | `thurible-directorate.glb` |
| Lance | Knights | 95 m | 9 | `lance-hadron.glb` |

- **Broadside.** `boxHull` narrower than the Freighter's, a chamfered `ramBow`, a low
  `citadel` aft, two `propTunnel`s notched into the stern, `ballastBlisters` under the
  casings, patchwork plate, a `doggedHatch` on the foredeck. New: `tubeCasings` — four
  casings outside the hull, two a side in tandem, each toed 7° outboard, saddled to the
  flank, a hinged muzzle door forward and a dogged breech door aft with a lit hoop ahead
  of it. Bare plate between them. Built loaded. Resting lamps: the hoop at each breech
  door (the chart's light), the bridge ports, the stern `engineVents` proud of the
  transom, a `bowLamp`; the muzzle floods are transients.
- **Weaver.** `nose`, `stem` with `growthRings`, three `decoyPods` in a row down the aft
  two thirds — the Sower's bladder orb at one size, centred on the stem so it threads
  them — the aftmost in an open `layPort` in the tail (new: the stem's skin flared into a
  cup, a ridge lip, the sheath peeled back in sepals), a muscle-drive `driveFluke` hinged
  on a `tailKnuckle` under the lip so the mouth astern stays clear, leaf `trimVanes`
  forward. Not `mineSacs` and not tubes: each pod is a whole bladder that leaves the
  hull. Resting lamps: navigation marks; the stem vein is under way only and clad; the
  pods carry no lamp.
- **Thurible.** `rostrum`, a broad domed carapace forward stepping down sharply to a narrow
  jointed abdomen (`tergites` at two scales, in three calls through `first`: the tail and
  the aft shield plate with the Dredge's `ridge`, the fore plate with none — the aft
  plate's lip is the step), `telson`, one `spineGun` off the centreline ahead of the rack,
  `rimSpines` at different stations a side, `limbs` folded under the shield and rooted on
  its flank, a ribbed pressure `keel`. New: `chargeRack`, the cells let into the shield's
  back, open-topped in two ranks, round wells with hinged lids standing open upward.
  Resting lamps: `rimPhotophores` along the shield's rim and down the abdomen, asymmetric,
  laid on the shell's slope; the cells carry no lamp. No lock.
- **Lance.** Bilaterally symmetric: a spike, a crossguard and a grip. The spike, an open
  faceted rail the length of the forward third (`spike`, new) with the one torpedo (a
  capsule, the `magazine` pods' idiom, drawn by `spike`) lying in it and its nose in a
  crystal muzzle collar as the bow. The crossguard, two crystal-edged guard blades
  amidships opened to a right angle, leading edges at 45° to the keel (`wings`, re-angled,
  the edge in the unlit finish through `edge.mat`). The grip, a narrow faceted `spar` aft
  to a flat transom with the `drive` prism; no `canards`, nothing astern. Built loaded.
  Resting lamps: the collar crystal and one stern mark; the guard edges and the rail light
  under way and are clad.

### The siege hulls — #786

"The siege hulls"; wave 4, #508. What it does to a wall. Three bands in every block but
the Blight's, and §3.2 says which one the model lights.

| hull | navy | length | bake SIG | built | model |
| --- | --- | ---: | ---: | --- | --- |
| Furnace | Consortium | 115 m | 40 | ladders run out | `furnace-bathyarch.glb` |
| Blight | Commune | 80 m | 10 | husk open, arm presented | `blight-pelagia.glb` |
| Lure | Directorate | 100 m | 14 | fan spread, plectrum raised | `lure-directorate.glb` |
| Tocsin | Knights | 105 m | 9.9 | braced, blades locked | `tocsin-hadron.glb` |

- **Furnace.** `boxHull` with the Tender's `workshop` turned outward, `gasBottles` in two
  ranks with `pumpHouse` and `pipeRuns` between them, a `citadel` aft, `ballastBlisters`,
  two `propTunnels`; the flanks bare. New: a boxed gantry frame at the bow and three cutter
  ladders run out ahead of it — `lattice` booms, one on the keel and one either side, with
  hooded burner heads and gas lines strapped along them. Resting lamps: bridge ports, the
  gas plant's lamps, the stern vents. The burner heads, the bow floods and the ladders are
  lit only cutting, and are clad by default.
- **Blight.** `podBody` with `growthRings`, widest a little forward of amidships and never
  wider at the bow than at the waist; one spore sac (`bladder`) sunk into the back as a
  paler dome; leaf trim vanes; a muscle-drive fluke. New: the husk parted at the bow into
  two rounded lobes curling outward, and the seeding arm standing in the cleft — a short
  jointed stem folded back on itself with a pale sac head under a membrane, reaching no
  further than the husk's lips. Curved everywhere; not a fork. Resting lamps: navigation
  marks; the sac's dome carries no lamp; nothing brightens when it seeds, by design.
- **Lure.** `rostrum`, three overlapping `tergites`, a jointed abdomen, folded
  `walkingLimbs`, a ribbed pressure keel, `bladderDome` in the abdomen forward of the fan.
  New: the sounding fan — five chitin plates opened wide astern, two a side about a telson
  (`telsonFan`, widened), a file ridge down the abdomen's back, and a plectrum limb raised
  over it (`jointedLimb`). Resting lamps: photophores in a pattern that repeats on neither
  side; the tergite-edge rows, the fan ribs and the bladder's dome light later and are
  clad. No lock.
- **Tocsin.** A bell on its side, crown forward. The barrel: a faceted emitter rail
  (`railGun`) on the centreline for a third of the length to a crystal muzzle collar. New:
  the bell skirt, faceted pale alloy widening in one unbroken flare from the crown's
  shoulders to a lip astern that is the widest beam on any Order hull, a violet
  `spineInlay` down its back from breech to lip, brace blades at the lip's two corners swung
  out and down and locked; the `drive` prism dark in the mouth. No `wings`, no `canards`.
  Resting lamps: the collar crystal, and navigation marks as the band table licenses at
  every band; the rail, the crown's ridge seams and the spine light under way or firing and
  are clad.

### The line hulls, and the anchor — #787

"The line hulls, and the anchor"; wave 5, #509. Whose Corvette this is.

| hull | navy | length | bake SIG | built | model |
| --- | --- | ---: | ---: | --- | --- |
| Caisson | Consortium | 90 m | 64 | — | `caisson-bathyarch.glb` |
| Reed | Commune | 70 m | 12 | — | `reed-pelagia.glb` |
| Bower | Commune | 105 m | 10 | grown out | `bower-pelagia.glb` |

- **Caisson.** The skirmisher's wedge in plate and no longer tapering: a blunt plough bow
  with a flat plate face and chamfered corners, flanks parallel from the shoulders for two
  thirds of the length, a step in to the bare drive hull, a square stern with two
  `propTunnels`. The caisson is `armouredSlab` bolted over the forward two thirds, riveted
  and patchworked, its after edge proud as a shoulder. On its back the plant: a `bandedTank`
  pressure cylinder lying fore-and-aft with dished heads, two `stack`s abreast, a rank of
  the kit's `louvres` down each side with no shutters. The Corvette's two tubes let into the
  bow face either side of the plough plate with hinged muzzle doors (new), a low `citadel`
  abaft the plant, `ballastBlisters`. No baffle, shroud or cowl. Resting lamps are the only
  lamps: louvres brightest, stacks lit at the throat, floods along the caisson's edge, the
  bridge ports; the muzzle doors flood only for a launch. Phase 4's brightest hull, and the
  one whose lit upward area has to be large.
- **Reed.** `stem` with a fine `nose`, `growthRings` at two nodes where the stem swells, one
  narrow leaf blade off each node swept aft — starboard at the forward node, port at the
  after, through `flank` — and a narrow deep muscle-drive fluke. New: the Corvette's two
  hardpoints grown into the stem below the nose as hollow lipped nodes, one a side, the
  seed torpedoes inside. No wing, bulbs, sac or bloom. Resting lamps: navigation marks; the
  node-to-node vein is under way only and clad; the lips flare only for a launch.
- **Bower.** The Spore Veil's bed with a drive: a broad low `grownBody`, an oval and the
  widest Commune hull, its edge of overlapping `lobe`s alternating a side at a time, a blunt
  grown nose, a broad short fluke. `gillOrgan` pairs along each flank with vent slits and a
  swaying rank of `sporeStalk`s standing off the back — the builders
  `structures/spore-veil-pelagia.mjs` already composes. New: the nursery, brood pouches
  showing through the shell as rows of paler nubs under the lobes along each flank. The haze
  is the cloud, drawn by the renderer around the hull and never on it: no fog geometry.
  Resting lamps: navigation marks; the breathing lines, stalk tips and brood nubs light
  under way or grown out and are clad by default (§3.2).

### The Bio-Reactor — #788

`StructureKind.BioReactor` arrived with #557 and is the one structure kind with no model:
`rosterModels.ts` gives it no slug, `structureTextures.ts` gives it the Refinery's siege
plating, and the chart bakes it procedurally. It also has no `STRUCTURE —` block, so the
order of work is the epic's: the block, then the scripts, then the row — in one pull request
by one author, because the block and the script are one author's work (#540).

| | figure | source |
| --- | --- | --- |
| footprint | 180 m (2 × `radiusM` 90) | `packages/shared/src/structures.ts` |
| SIG idle | 25, TUNABLE | `structures.ts` |
| SIG rendering | 50, SPEC | [systems-flora.md](systems-flora.md) §2 and §7 |
| ground | Kelp Forest only | `requiresBiome` |
| who | any navy | no `faction` field; §2 lets the Commune run one on its own bed |

**The block** is "(any faction)", in the Vent Tap's register: bolted to a bed rather than a
vent. A render vessel over the bed, intake arms drawing crop from the canopy around it, a
Biomass outflow, anchor feet into the holdfast. Its lighting clause is the Foundry's shape,
dim at rest and lit rendering — "SIG 25 idle, 50 rendering" — with §2's tell that a reactor
gone quiet is a stripped bed. It cites [systems-flora.md](systems-flora.md) for its figures;
[units.md](units.md) carries no Bio-Reactor block, as it carries none for the Vent Tap.

**Four scripts**, `tools/hull-models/structures/bio-reactor-<navy>.mjs`: one architecture
grown four ways (#652). A faction-neutral skeleton goes in `kit.mjs` only where the four
would share geometry to the centimetre — the footprint slab and the radial intake arms, a
`radialSeries` as `ventDrawArm` is — and the vessel and its head are each navy's module's: a
riveted tank, a grown bladder (the Commune's "algae reactors",
[factions.md](factions.md)), a carapace mound, a crystal-framed dome.

**Bake and wiring.** The canonical `STRUCTURES` row on the Consortium's model, as every
structure row is, plus three variant rows, at `sig: 25` — the idle figure, as the Foundry's
row bakes at its 25. Scale on the footprint diameter, no outline. Then `build.mjs`, the
`MAP_URL` and three `VARIANT_MAP_URL` entries in `structureMaps.ts`, and `'bio-reactor'`
in `STRUCTURE_SLUG`, whose Partial comment goes. The siege plating stays as the loading
fallback.

**Two decisions this records.** Bake at the idle 25 rather than the SPEC 50, because the
table's rule is the idle figure and no number moves. Four variants rather than one Commune
model, because `structures.ts` gives the kind no `faction`; if the design intent is one
navy's, that is a `structures.ts` change first and outside the shape issue.

## 5. After Phase 4

Every unit kind has a generated outline and `HAND_DRAWN_OUTLINE` is empty; every structure
kind has a model; `npm run check:models` covers 86 scripts. Phase 5 is the fourteen
environment props under the same kit, and Phase 6 the pristine pass that this whole path
was built to make cheap: facet counts, panel density, light placement, one edit a navy.

## 6. Out of scope

Stat blocks, doctrine, `UNIT_STATS`, tests and the balance harness — a hull's SIG is an
argument about sound and its silhouette is not, and the freeze in `CLAUDE.md` covers the
numbers regardless. Facet counts and finish, which are Phase 6's. Variants of the four
lock-free kinds. A per-posture emissive channel, which §3.2 names and this plan does not
build.

## Related

- **[asset-prompts-3d.md](asset-prompts-3d.md)** — the blocks every script here
  transcribes, rule 3's Built branch, and the glow-band table
- **[graphics-standards.md](graphics-standards.md)** — the pipeline of record, the gates,
  and "Where the GLB comes from"
- **[roster-plan.md](roster-plan.md)** — the waves that authored these hulls, and §5's
  touch list this document finishes
- **[units.md](units.md)** — the stat blocks, the SIG figures and each hull's
  *Faction-locked* line
- **[systems-echo.md](systems-echo.md)** — the directional term and its 0.45 compass average
- **[systems-flora.md](systems-flora.md)** — the bio-reactor's radius, rate and SIG
- **[art-direction.md](art-direction.md)** — silhouette law and the Asymmetric Fidelity Law
  the generated outline serves
- **[style-neon-noir.md](style-neon-noir.md)** — rule 3, glow encodes loudness, and the
  palette tokens `hex()` cites
