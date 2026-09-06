# 3D Asset Prompt Kit — Units, Structures & Environment

*(Copy-paste prompts for generating style-consistent 3D models of the prototype roster
and the environment prop set in Claude Design — claude.ai/design, "3D object" mode. This
doc transcribes the visual law already set in [art-direction.md](art-direction.md),
[factions.md](factions.md) and [style-neon-noir.md](style-neon-noir.md); if a prompt
here disagrees with those docs, the prompt is the bug.)*

## What these models are for

Approved models in `docs/concept-art/models/` are shipped game assets now: the conn view
loads roster GLBs at runtime for the player's *own* force, and the offline bake renders
their sprite maps for the loading fallback and the sonar scope (the pipeline of record in
[graphics-standards.md](graphics-standards.md)). Environment models from Block 4 ship as
instanced world meshes through the same pipeline's environment branch. So a model
generated from this kit is:

1. **A canonical concept reference** — the first style-correct look at the thing, and
2. **The shipped geometry**, once it clears hull-intake and review.

Nothing here weakens the Asymmetric Fidelity Law: full-detail unit and structure models
describe *own-force* rendering only, and no prompt in this kit generates fauna — animals
are contacts, drawn at earned fidelity, never world meshes
([bestiary.md](bestiary.md) §3).

## Workflow rules

1. **Assemble every prompt as STYLE + FACTION + UNIT** — the three blocks below, pasted
   together. The STYLE block is the design system for this run; never generate without it.
2. **One Claude Design conversation per roster run.** Session context reinforces
   consistency; tell it "same series, same materials and lighting as the previous model"
   on every follow-up.
3. **One model for the whole run, and for this series it is Fable 5.1.** Hull generation
   moves to Fable 5.1 in the Claude Design picker from the scout wave (#506) on; every GLB
   approved in `docs/concept-art/models/` before it was generated under Opus 5. Do not
   switch mid-series — a model switch is a second source of style drift, and that is the
   reason this note exists: the move to Fable 5.1 is a *deliberate series break*, not an
   exception to the rule. Everything generated under Fable 5.1 is a new series, and the
   first hull generated under it is iterated and approved as that series' reference (rule
   4) — held against the approved Opus 5 models on the consistency checklist, so the break
   is a known quantity rather than a drift — before any other hull is batched. Nothing
   moves back and forth between the two pickers to match an older model: if a Fable 5.1
   hull will not converge on the series look, the fix is the prompt or the reference, never
   the picker.
4. **Approve a reference unit first.** Generate one unit, iterate until it is right,
   declare it the series reference, then batch the rest. Fixing one model is cheaper
   than re-converging five diverged ones.
5. **Skip the "Design system" attachment.** That Claude Design feature carries UI tokens
   (typography, components); it does not steer 3D-object generation. For UI mockups it
   *is* the right tool — feed it [style-neon-noir.md](style-neon-noir.md).

## Glow encodes loudness

Neon-noir rule 3 ([style-neon-noir.md](style-neon-noir.md)): the brighter a hull burns,
the louder it is in the Echo Layer. Set each unit's glow from its idle/cruise SIG in
[units.md](units.md), and mention firing-burst light only as a transient:

| SIG band | Glow language for the prompt |
| --- | --- |
| 0–15 | "Nearly black; navigation marks only, barely visible" |
| 16–35 | "Dim accent-colour running lights along the hull line" |
| 36–60 | "Sustained glow from vents, sensor arrays and lit ports" |
| 61+ | "Burning bright; floodlit working surfaces, visible machinery light" |

## Block 1 — STYLE (every prompt starts with this)

```text
STYLE (use for every model in this series — "Echoes of the Abyss" unit roster):
Deep-sea RTS unit, a single 3D model on a near-black abyssal background
(#03080E). Dieselpunk-meets-abyssal-sci-fi: welded steel, pipes, ballast
tanks, pressure-scarred hulls. Lighting: one hard cyan rim light (#35E0FF),
soft volumetric fog, running lights in the faction accent colour; darkness is
the default — the model reads as a strong silhouette with neon edge
information, never a fully lit showroom shot. Exaggerated readable shapes
(RTS readability over realism), low-to-mid poly with crisp facets. Slight
top-down 3/4 camera, as seen in an RTS. No text, no logos, no water
surface — this vessel is deep underwater.
```

The 3/4 camera is a *generation pose* — it makes concept renders and review shots read
the way the game feels. The shipped projection is pure top-down plan view, with the
three-quarter effect painted by per-pixel relief lighting: see "Camera & Projection" in
[art-direction.md](art-direction.md).

## Block 2 — FACTION (pick one)

Palettes and silhouette law are quoted from [factions.md](factions.md).

```text
FACTION — Bathyarch Consortium: boxy, riveted, over-engineered rectangles
and cylinders; no curve unless a pressure vessel demanded it. Visibly
patchworked repairs, older armour showing through newer plate. Palette:
hazard amber #F2B233, iron grey #8C8378, oxide brown #3D2B1F, hull black
#0E1418.
```

```text
FACTION — Pelagia Commune: organic, curved, asymmetric — silhouettes read as
leaves, seed-pods and swimming things. Grown chitin-and-algae composite hull
with growth rings and living bioluminescent veins; nothing is painted.
Palette: algae teal #1FA67A, bioluminescent green #8FE36B, spore pale
#E8F0A3, deep chlorophyll #0B241E.
```

```text
FACTION — Abyssal Directorate: spiked, insectoid, segmented crustacean
forms — asymmetric, yet regimented. Chitinous shell with red photophore
biolights in asymmetric deep-sea patterns. Palette: abyssal red #7A1B2E,
bruise violet #2D1B3D, trench black #0A0710, biolight crimson #C2465E.
```

```text
FACTION — Hadron Knights: precise bilateral symmetry (the only faction with
it); blade-like, crystalline silhouettes — instruments and blades. Polished
pale alloy with violet resonance crystal, mirror facets, heat-shimmer around
active crystal. Palette: resonance violet #8B5CF6, alloy white #E6E9F2,
shadow indigo #3B2E5A, crystal glow #C9A6FF.
```

## Block 3 — UNIT (one per generation)

Stats cited from [units.md](units.md). The Light Scout and Abyssal Submersible are
faction-bound; the other hulls compose with any faction block.

```text
UNIT — Light Scout (pair with Pelagia): tiny, very fast recon vessel,
fragile and nearly silent (SIG 6 idle). Sleek darting silhouette built for
kelp and thermal-vein cover; nearly black, navigation marks only.
```

```text
UNIT — Corvette (any faction): small fast-attack skirmisher (SIG 28
cruise). Compact aggressive silhouette, visible torpedo hardpoints; dim
accent running lights along the hull line.
```

```text
UNIT — Cruiser (any faction): heavy fleet anchor and command vessel (SIG 55
sustained with systems live). Large layered hull, prominent sensor arrays
and fixed hydrophone masts; sustained glow from vents, sensor arrays and
lit ports — this is a loud ship and it looks it.
```

```text
UNIT — Abyssal Submersible (pair with Directorate): mid-size deep-raiding
hull born to crush depth (Pressure Rating 3, SIG 22 idle). Heavy segmented
pressure carapace, folded manipulator limbs, dim red photophores.
```

```text
UNIT — Harvester (any faction): industrial nodule-mining vessel (SIG 18
idle; mining follows the throttle, up to 68 at Overdrive). Wide cargo body,
external intake dredge gear; dim at rest, with floodlit mining machinery
that reads as its loud state.
```

```text
UNIT — Chorister (pair with Directorate): the cohort hull, 50 m — the
shortest and cheapest hull in the roster, grown chitin over a pressure
bladder (SIG 16 idle, 24 cruise). Three overlapping segments with the
bladder showing through the middle one as a paler dome, a rostrum, a
telson, folded walking limbs, one small dorsal spine-gun off the
centreline. Dim: a short row of photophores along one flank and one on the
other, in a pattern that repeats on neither side.
```

The Chorister carries no faction lock, so a navy rendering for one fields it in its own
shape language: the same cohort plan — three segments over the bladder, the rostrum, the
spine-gun, the limbs — composed with that navy's FACTION block, with only the light kept
dim.

```text
UNIT — Clarion (pair with Hadron Knights): the line hull, 90 m — the cone
made a ship, a longer hull built around a bow array (SIG 62 ahead, 6
astern; an energy weapon). A faceted blade hull, widest aft, bilaterally
symmetric, flaring at the bow into a six-facet horn with an emitter crystal
standing in its mouth; canards at the bow, swept guard wings with crystal
edges aft, a crystal inlay along the spine. Lit at the horn's lip and along
its ridge seams, dark astern but for one mark — louder than a Corvette in
front, quieter behind.
```

### The rung's roster — one hull a navy at the Foundry, one behind the Slipway

The eight faction-locked hulls of [units.md](units.md) "The rung, and two hulls a navy"
(#436, #461). Each is one navy's and never another's, so each prompt names its faction
block — there is no "any faction" here — and each transcribes the entry's argument about
sound or depth, which is what the silhouette has to say at RTS distance: the Bulwark is a
slab that survives three torpedoes, the Precentor is only ears, the Cantus is a resonance
node on a hull, the Reciter is the Clarion's spine drawn out further still.

```text
UNIT — Tender (pair with Consortium): the repair hull, 85 m — a floating
workshop, not a warship (SIG 48 idle, +12 while welding; no weapon). Box
hull with an open work deck forward under two derricks, a riveted workshop
deckhouse amidships, spare-plate racks, gas bottles, pump houses and pipe
runs, twin prop tunnels notched into the stern. Sustained glow from the
welding bay, the workshop's lit ports and the stern vents; floodlit when it
works.
```

```text
UNIT — Bulwark (pair with Consortium): the heavy, 150 m — the loudest hull
in the game (SIG 70 idle, 75 cruise) and the widest beam in the roster. A
slab: blunt ram bow with a plough plate and teeth, blunt stern, three
stepped armour tiers, flank plates patchworked older-under-newer, one
enormous forward twin turret (an 800 m gun), a bridge citadel aft, four
stacks and three prop shrouds. Burning bright: floodlit deck surfaces and
rows of floods along both deck edges — the loud state is the resting state.
```

```text
UNIT — Spinner (pair with Pelagia): the mine-layer, 55 m — a seed pod
(SIG 8 idle: quieter running than a Light Scout idling; no weapon). A
spindle swollen at the waist by the four mine sacs it carries, growth rings,
leaf pectorals and tail flukes, a spinneret at the bow. Nearly black:
navigation marks only and a dorsal vein that barely shows.
```

```text
UNIT — Sower (pair with Pelagia): the terraformer, 90 m — a leaf, the one
hull in the roster wider at the bow than at the waist (SIG 20 idle, 45
while seeding; no weapon; PR 2, grown for the water it plants). A broad flat
bloom-bed forward with radial ribs and pale seed pods, a pressure bladder
at the node, a narrow grown stem aft with a caudal fin. Dim accent veins
along the ribs and one lit bud at the node; the bloom flares when it seeds.
```

```text
UNIT — Precentor (pair with Directorate): the ears on the move, 60 m — a
hull that is only ears (SIG 12 idle; HYD 95, the cap; no weapon). Short
segmented body carrying a hydrophone array athwartships, so the plan is a
cross and the hull is broader than it is long amidships: ranks of spines
along the boom, the port rank one longer, a studded listening dome, folded
walking limbs. Nearly black: four photophores in a pattern that repeats on
neither side.
```

```text
UNIT — Dredge (pair with Directorate): the hull for the floor of the map,
120 m — the roster's only PR-4 entry (SIG 40 idle, 52 cruise). The Abyssal
Submersible's deep body with the Directorate's armour grown over it: five
wide overlapping tergites with a spine off each, a scoop bow with mandibles
and a glowing gullet, one great folded claw to starboard and the dredge
boom to port, a hopper amidships lit around its throat. Sustained glow:
rows of photophores along every plate edge.
```

```text
UNIT — Cantus (pair with Hadron Knights): a resonance node on a hull, 80 m
— the Sounding Spire's grant made mobile (SIG 10 moving; 80 singing, in
every quarter; no weapon). A faceted lozenge blade, bilaterally symmetric,
carrying an octahedral crystal amidships in a four-strut alloy cradle;
guard blades aft, a dorsal fin, drive prism astern. Nearly black at rest —
the node's four ridges barely marked — because the node is the light when
it sings, and dark when it does not.
```

```text
UNIT — Reciter (pair with Hadron Knights): the precise one, 100 m — the
Clarion's forward spine drawn out further still into a lance (SIG 90 ahead,
9 astern; a 1,000 m gun). A long faceted blade hull with swept guard wings
aft, a crystal inlay along the spine and the gun rail running the length of
the lance to a muzzle crystal. Lit from the bow back and dark astern: the
quarter it is loud in is the quarter it faces, and the rail is the light.
```

### The transports — one a navy, and a hold

The four transports of [units.md](units.md) "The transports" (wave 1 of
[roster-plan.md](roster-plan.md), #501). What a transport's silhouette has to say at RTS
distance is *volume*: each is a hold with a drive, sized to the berths it carries, and the
lighting clause is the empty figure — a hold is heard as load, +3 SIG a berth, and the glow
budget is for the hull running home empty. None carries a weapon.

```text
UNIT — Freighter (pair with Consortium): the armoured hold, 160 m — six berths
of hull moved slowly and loudly and very hard to sink (SIG 30 idle, 50 cruise,
68 with a full hold; no weapon; 1,800 hull). A long slab-sided box hull with
the Bulwark's riveted plate, a raised bridge castle aft, two great hold doors
along the flank with hinge rails and dogging wheels, crane gantries over the
foredeck, ballast blisters low on the hull, and four prop tunnels in a heavy
skeg. Lit along the hold-door seams and the bridge ports, and floodlit when
the doors open.
```

```text
UNIT — Drifter (pair with Commune): the quiet way in, 62 m — two berths of hull
at 90 m/s and SIG 10 (4 idle; 10 cruise; 16 with a full hold; no weapon; 300
hull). A slim seed-pod hull of grown shell, the two berths as a pair of
swelling bays amidships under a membrane that opens like a bivalve, a single
muscle-drive fin astern and trim vanes rather than planes. Almost dark: a
faint bioluminescent seam along each bay, brightening only as it opens.
```

```text
UNIT — Verger (pair with Abyssal Directorate): the cohort's way down, 100 m —
four berths of hull taken below the Shelf line at PR-3 (SIG 14 idle, 26 cruise,
38 with a full hold; no weapon; 800 hull). A deep-pressure hull, ribbed and
domed like the Precentor's, with four cohort bays set into its belly behind
pressure hatches, a listening dome forward, ballast tanks flanking a heavy keel,
and a single ducted drive. Lit low and cold at the hatch rims and the dome;
the bays glow through their hatches while they are occupied.
```

```text
UNIT — Antiphon (pair with Hadron Knights): the Order's way of arriving, 110 m
— three berths of hull, and what it lands, lands with +1 PR for twenty seconds
(SIG 12 idle, 35 cruise ahead, 3.5 astern; 44 ahead with a full hold; no
weapon; 700 hull). A faceted blade hull in the Clarion's family with a wide
three-bay landing deck let into its back, a crystal resonator ring around the
deck that is the grant made visible, swept guard wings, and the drive in the
spine. Lit from the bow back like every Order hull and dark astern; the
resonator ring flares when the deck opens.
```

### The scouts — one a navy, and two ways of not being heard

The four scouts of [units.md](units.md) "The scouts" (wave 2 of
[roster-plan.md](roster-plan.md), #506). None carries a gun — the Light Scout is the scout
that also shoots — so what a scout's silhouette has to say at RTS distance is its *sensor
argument*, how this navy finds things: the Beacon pings, the Acolyte plants its ears, the
Herald points its horn and runs. Two of the four are a *state* made into geometry, and the
model is generated in that state: the Glider with its drive cut and its wing spread, the
Herald with the cone's mouth open. The lighting clause is the idle/cruise pair as ever; the
Beacon's ping is the one transient, and the Herald's cruise figure is a cone figure, lit
ahead and dark astern like every Order hull.

```text
UNIT — Beacon (pair with Consortium): the picket that shouts, 70 m — a cheap
active sonar fired every 20 s at SIG 80, and nothing else (SIG 30 idle, 42
cruise; no weapon; HYD 55). A riveted box hull over a pressure-cylinder body
with the transducer drum standing athwartships amidships in a bolted
cradle: a banded cylinder wider than the hull and proud of both flanks, hoop
flanges, a dogged inspection hatch, a stub lamp mast over it; ballast
blisters low on the hull, one prop tunnel in a square stern, plate
patchworked older-under-newer. Dim amber running lights along the hull line
at rest, the drum's hoop lamps a sustained glow under way; the drum floods
bright for the instant of a ping, once every twenty seconds, and is dim
again between — the cadence is the light.
```

```text
UNIT — Glider (pair with Pelagia): the quiet way out, 55 m — a hull that cuts
its drive and coasts, still under way at 35 of its 105 m/s (SIG 8 idle, 16
cruise, 1.8 gliding; no weapon; HYD 45). A winged seed, and the one plan in
the roster not mirrored across its keel: a slim grown seed body on the
centreline, one broad wing swept aft off the starboard flank with growth
rings across its blade and a stiffening vein along its leading edge, a
short trim vane to port, and the muscle-drive tail folded flat along the
stem — the model is the hull with its drive cut, which is the state it was
grown for. Nearly black: navigation marks only, the wing vein barely
showing, and the tail's veins unlit, because they light only while the
drive turns.
```

```text
UNIT — Acolyte (pair with Directorate): the ears that sit still, 58 m — the
Listening made a hull that holds a chokepoint rather than driving past it
(SIG 10 idle, 20 cruise; no weapon; HYD 60 under way, 85 stationary; PR 2,
3 under the Directorate's baseline; 40 m/s; 90 nodules and 15 Biomass). A
squat three-tergite carapace, wider in its limbs than in its shell, with
six hydrophone limbs walked out and planted — three a side, stout and
jointed, the forward pair raked ahead and the aft pair astern — a short
rostrum, a telson, and a listening dome sunk low into the middle tergite.
The limbs are the array and the model shows them down, which is the posture
it hears at 85 in; under way they fold flat under the shell. Nearly black: a
photophore at each limb's joint, in a pattern that repeats on neither side.
```

The Acolyte carries no faction lock — the Biomass is the lock, as the Chorister's is — so a
navy rendering for one fields the same plan, the squat shell, the six planted limbs and the
sunk dome, composed with its own FACTION block, with the light kept nearly black.

```text
UNIT — Herald (pair with Hadron Knights): the scout that scouts by leaving,
65 m — the cone with its mouth open (SIG 14 idle; 45 cruise ahead, 15.8 on
the beam, 4.5 astern; no weapon; HYD 55; 100 m/s). A short faceted blade
hull, bilaterally symmetric, forked at the bow into two crystal-edged tines
with an emitter crystal standing in the throat between them — the fork is
the horn and the slot is the cone's mouth — widest just abaft the fork and
drawn aft to a flat transom with the drive prism in the spine: no guard
wings, no canards, nothing astern to hear. Nearly black at rest but for the
crystal in the throat; under way, sustained glow along the tines' inner
edges, thrown forward out of the fork, and dark astern but for one mark —
the quarter it is loud in is the quarter it faces, and the quarter it shows
you is the one it runs in.
```

### The ordnance hulls — one a navy, and one corner of the triangle each

The four ordnance hulls of [units.md](units.md) "The ordnance hulls" (wave 3 of
[roster-plan.md](roster-plan.md), #507), one on each corner of
[systems-combat.md](systems-combat.md) §2's triangle. What an ordnance hull's silhouette has
to say at RTS distance is *what it carries and how much of it*: four tubes are countable, a
magazine of one reads as a single committed weapon, a decoy rack is not a gun, and a charge
rack is not a tube. Two of the four are a cycle made into geometry — the Broadside is a box
that four tubes are bolted to, so a spent one is four open doors on a bare deck, and the
Lance is a rail for one weapon with the weapon's nose for a bow, so a spent one is a hilt
with no blade. The lighting clause is the idle/cruise pair as ever: the Broadside's launches
are its one transient, the Thurible's 85 belongs to the charge and not the hull, the Weaver's
light is what it leaves behind rather than what it carries, and the Lance's cruise figure is
a cone figure, lit ahead and dark astern like every Order hull.

```text
UNIT — Broadside (pair with Consortium): the alpha strike, 120 m — four tubes
and a magazine of four, and no gun at all: twelve seconds of ordnance, then
ninety of sailing home empty (SIG 42 idle, 58 cruise, +25 at each of the four
launches; no gun; 700 hull; 40 m/s). A long riveted box hull, narrower than
the Freighter's slab, carrying its four tubes outside the hull as four
casings, two a side in tandem along each flank: each a banded pressure
cylinder toed a few degrees outboard so the aft tube fires clear of the
forward casing's tail, a hinged muzzle door on its forward face, a dogged
breech door at its tail, so the plan is a box with two teeth a side and the
teeth are the count. A chamfered ram bow, a square stern with two prop
tunnels, a low bridge citadel aft, ballast blisters under the casings, plate
patchworked older-under-newer. Between the casings the deck is bare plate —
no turret, no crane, no mount: the hull is a box four tubes are bolted to,
and once the four doors have opened there is nothing on it that points at
anything. Sustained amber glow from the bridge ports, the hoop lamps at each
breech door and the stern vents; each muzzle door floods for the instant of
a launch, four times in twelve seconds, and is dark again after.
```

```text
UNIT — Weaver (pair with Pelagia): the lie, 70 m — three noisemakers in a
magazine, laid on the move ahead of an approach, and no weapon on the hull
itself (SIG 12 idle, 22 cruise; each laid decoy 45 for 25 s, astern of it; no
weapon; 320 hull; 75 m/s). A grown stem with three decoy pods strung along it
like seeds on a stalk: a fine nose, a slim seed body with growth rings, then
three bulbs in a row down the aft two thirds, each a smooth bladder the same
size as the one before it, so the plan is a beaded thread and the beads are
the count; the aftmost sits at an open lay port in the tail, a muscle-drive
fluke behind it, a pair of leaf trim vanes forward. The pods are not the
Spinner's sacs and not tubes: each is a whole bladder that leaves the hull,
and the stem is what stays. Nearly black at rest, navigation marks only;
under way a dim vein along the stem, and the pods dark, because a decoy is
dark until it is laid and loud after — the light this hull makes is behind
it in the water, never on it.
```

```text
UNIT — Thurible (pair with Directorate): the censer, 105 m — a PR-3 hull that
bombs upward, depth charges fused above itself into water the Listening does
not own, and a modest gun so it is not helpless between racks (SIG 16 idle,
28 cruise; 85 at every detonation, and that is the charge's, a band above; a
45-damage gun at 500 m; 620 hull; 42 m/s; 300 nodules and 40 Biomass). A
horseshoe crab: a rostrum, then a broad domed carapace forward that steps
down sharply at its trailing edge to a narrow jointed abdomen and a telson,
so the plan is a shield over a tail; the charge rack let into the shield's
back as open-topped cells in two ranks, each a round well with a hinged lid,
the lids standing open upward because up is the way this hull fires — a
rack, not a tube, and no muzzle faces forward; one small spine-gun off the
centreline ahead of the rack, spines off the shield's rim at different
stations each side, folded walking limbs, a ribbed pressure keel under all
of it. Dim: rows of photophores along the shield's rim and down the abdomen
in a pattern that repeats on neither side, the cells dark; nothing on the
hull flares when it fires, because the light and the 85 are the charge's,
above it.
```

The Thurible carries no faction lock — the Biomass is the lock, as the Chorister's and the
Acolyte's are — so a navy rendering for one fields the same plan, the shield over the tail,
the open-lidded rack on its back and the one spine-gun, composed with its own FACTION block,
with the light kept dim.

```text
UNIT — Lance (pair with Hadron Knights): the committed shot, 95 m — one
torpedo, a magazine of one, and a tube that refuses any bearing outside the
hull's own cone, so it can only fire at what it faces, and a hull facing you
is at its loudest (SIG 20 idle; 50 cruise ahead, 17.5 on the beam, 5 astern;
no gun; 380 hull; 65 m/s; 320 nodules and 40 Resonance Crystal). A lance in
plan, bilaterally symmetric: a spike, a crossguard and a grip. The spike is
an open faceted rail the length of the forward third with the one torpedo
lying in it, its nose standing in a crystal muzzle collar as the bow — the
weapon is the point of the ship, and with it fired the hull is a hilt with
no blade. The crossguard is two crystal-edged guard blades amidships opened
to a right angle, their leading edges at 45° to the keel: the cone's own 90°
drawn as the guard, and the tube launches only between them. The grip is a
narrow faceted shaft aft to a flat transom with the drive prism in the
spine — no canards, no guard wings astern, nothing behind the guard to hear,
and nothing of the Reciter's needle. Dim at rest but for the crystal in the
collar; under way, sustained glow along the guard's leading edges and up the
rail to the collar, thrown forward, faint on the beam and dark astern but
for one mark — the quarter it is loud in is the quarter it can fire into.
```

## Block 3b — STRUCTURE (one per generation)

Architecture anchors from the Rendering Target and Base Identity sections of
[art-direction.md](art-direction.md); SIG from [units.md](units.md). Replace "vessel"
framing: these are anchored to the seabed.

```text
STRUCTURE — Bastion (any faction): the HQ — a large pressure dome with
visible reinforcement ribs, docking collars and external pipework, anchored
to the seabed (SIG 35 sustained, the settlement's constant hum). Sustained
glow from ports and working lights; the one building that can never run
silent.
```

```text
STRUCTURE — Nodule Refinery (any faction): a rank of upright silos with
conveyor and crusher machinery, seabed-anchored (SIG 65 sustained — the
loudest permanent thing a player owns). Burning bright: floodlit working
surfaces, visible machinery light.
```

```text
STRUCTURE — Foundry (any faction): unit production hall with a recessed
launch bay and gantry cranes (SIG 25 idle, 55 with the line running). Dim
at rest; interior forge light spilling from the bay when producing.
```

```text
STRUCTURE — Sentinel Turret (any faction): compact static-defence mount and
barrel on a reinforced base (SIG 12 idle). Nearly black — an ambush
predator, navigation marks only until it fires.
```

```text
STRUCTURE — Baffle Barge (pair with Consortium): moored noise-masking
support barge, boxy and over-engineered, ringed with baffle vanes and
acoustic dampening panels (SIG 30 idle). Dim amber running lights.
```

```text
STRUCTURE — Spore Veil (pair with Pelagia): the Veil Mother — a low,
breathing spore bed grown into the seabed: broad overlapping lobes, paired
gill organs with vent slits exhaling a faint haze, slender spore stalks
swaying above (SIG 20 idle — the cloud itself is silent). Nearly dark;
faint bioluminescent breathing lines around the gills and dim lit tips on
the stalks only.
```

```text
STRUCTURE — Cantor (pair with Directorate): listening dome — a grown,
chitinous hemispherical shell studded with hydrophone spines (SIG 35 idle).
Dim red photophore constellation across the dome.
```

```text
STRUCTURE — Sounding Spire (pair with Hadron Knights): tall crystalline
resonance spire, bilaterally symmetrical, pale alloy frame around a violet
crystal core (SIG 80 when active, directional). Burning bright along the
crystal when active; heat-shimmer distortion.
```

```text
STRUCTURE — Vent Tap (any faction): the power source, bolted to a
hydrothermal vent on Thermal Vein ground and never quiet (SIG 55 idle, 75
at full draw — loud precisely where the ground is quiet). A basalt chimney
at the centre with a wellhead clamp and a draw manifold over its mouth,
four radial draw pipes running out to heat exchangers on the corners,
anchor feet into the scorched ground. Burning bright: the vent's ember
mouth under the manifold, floodlit working platforms around the wellhead,
lamps along every pipe run.
```

```text
STRUCTURE — Slipway (any faction): the second yard, the rung — a longer
hall than the Foundry (340 m to its 320) with the slip cut through its
whole length and open at both ends, so a hull is laid at the head gate,
walked down the line under three gantries, and launched out of the mouth
(SIG 30 idle, 70 while the line runs — the loudest line in the base). Two
halls flank the slip, each grown in the navy's own architecture; a keel on
blocks two thirds down the slip. Dim at rest: the line lights along the slip
floor, the gantry working lights and the launch sill; floodlit when a hull
is on the line.
```

## Block 4 — ENVIRONMENT (props: no faction, no SIG)

Environment props dress the biomes the terrain grid already declares — they are world
geometry, not agents, so the STYLE block changes: no faction palette, no running lights,
no glow-by-loudness. A prop's light, where it has any at all, comes from the three
world-light families in [style-neon-noir.md](style-neon-noir.md) "World light", and
intake fails a prop with any other emissive (gate 2's inverted rule).

Every environment prompt is **ENV STYLE + one row of the prop table**, the row expanded
into a sentence or two. Same workflow rules as the roster: one Claude Design conversation
per batch, approve a reference prop first, then generate its biome-mates in the same
session.

```text
ENV STYLE (use for every model in this series — "Echoes of the Abyss"
environment set): Deep-sea terrain prop, a single 3D model on a near-black
abyssal background (#03080E). Natural or ruined form — stone, coral, kelp,
crystal — pressure-scarred and ancient; nothing manufactured, no machinery,
no faction markings. Desaturated, dark, low-luminance materials: this object
is scenery in a lightless ocean and must read darker and quieter than any
vessel. Lighting: one hard cyan rim light (#35E0FF) for the review render
only — the model itself carries no lights and no emissive unless the prompt
says so. Strong readable silhouette from a high 55-degree RTS camera;
low-poly with crisp facets, at most two materials. No text, no water
surface — this stands on the seabed, deep underwater.
```

The prop table — one row per asset, with the numbers intake and the registry check.
`Footprint` is the canonical scale hull-intake sizes against (`--footprint-m`);
`Height` is the vertical silhouette the 55° camera actually reads; `Tris` is the
per-instance budget; `Light` names the licensed world-light family, `none` meaning any
emissive fails intake:

| Biome | Slug | Footprint | Height | Tris | Light |
| --- | --- | --- | --- | --- | --- |
| Thermal Veins | `env-vent-chimney` | 12 m | 25–40 m | ≤ 800 | `vent-ember`, tip only |
| Thermal Veins | `env-vent-basalt` | 15 m | 8 m | ≤ 400 | none |
| Kelp Forest | `env-kelp-cluster` | 18 m | 60–80 m | ≤ 400 | `flora-biolight`, tip points |
| Kelp Forest | `env-coral-tower` | 15 m | 25–35 m | ≤ 600 | none |
| Abyssal Trench | `env-trench-spire` | 20 m | 40–60 m | ≤ 600 | none |
| Abyssal Trench | `env-trench-slab` | 25 m | 10 m | ≤ 300 | none |
| Resonance Field | `env-resonance-crystal` | 12 m | 18–30 m | ≤ 600 | `crystal-seam` |
| Resonance Field | `env-resonance-pylon` | 10 m | 25 m | ≤ 500 | none |
| Coral Ruins | `env-ruin-block` | 25 m | 15–25 m | ≤ 400 | none |
| Coral Ruins | `env-ruin-dome-shard` | 40 m | 20 m | ≤ 600 | none |
| Coral Ruins | `env-coral-growth` | 12 m | 8 m | ≤ 400 | none |
| Rock (any biome) | `env-rock-crag-a` / `-b` | 30 m | 30–50 m | ≤ 500 | none |
| Open Water | `env-open-boulder` | 12 m | 6 m | ≤ 300 | none |

Shape cues, so the prompts land in each biome's materials brief
([environments.md](environments.md)): vent props are basalt and magma glass, cracked
and heat-scorched; kelp props are the forty-metre columns of
[world-map.md](world-map.md)'s terraces, with `env-coral-tower` as living coral stone;
trench props are blackened, pressure-eroded, knife-edged; resonance props are faceted
crystal and the toppled remains of older instruments; ruin props carry the geometric
patterns of [art-direction.md](art-direction.md)'s "Environmental Shapes" — right
angles, terraces, a civilisation's worth of coral growth over them. Crags are the
jagged-rock vocabulary for mesa edges anywhere on the map.

Naming is `env-<biome-word>-<thing>.glb`, flat in `docs/concept-art/models/` beside the
roster. Props ship as meshes, not baked maps, so the sprite-density contract
(4 / 1.5 px/m) does not apply to them — the triangle column above is their density
contract.

Every row of this table is filled by a Claude Design model from the Block 4 batch; the
deterministic generator that stood in for the batch was retired when the last row
landed ([graphics-standards.md](graphics-standards.md), "The environment branch"). A
model generated from the prompts above replaces its row's file directly: run intake with
the row's footprint, cap and light, commit the GLB over the current one, and update the
registry row's triangle count from the intake report. The environment registry, the
placement rules and the kelp sway read the file, not its author.

Two things the first batch taught about Claude Design's export, both mechanical and
both fixed by intake's `prep-env-glb.mjs` rather than by re-prompting: it hands back one
material per named part (a holdfast and its stalks arrive as two, which is the whole
cap), and it puts UVs on some parts and not others, which stops the runtime merging a
material's parts into one draw. Ask for untextured flat colours and a single material
for everything that is not the licensed light, and expect to merge anyway.

A third, from the luminance retune that followed the batch: the runtime owns a prop's
*value*. `environmentModels.ts` normalises every prop so its brightest material sits at
`ENV_LUMINANCE_CEILING` and its other materials keep their ratio to it, so the "dark,
low-luminance" line in ENV STYLE is a hue-and-saturation brief, not a brightness
target — an export at any brightness lands in the same register. What survives from the
export is the ratio between its materials (stone under coral growth, basalt under an
ember mouth) and the emissive, which is licensed at intake and passes through untouched.

## Consistency checklist (before accepting a model)

For units and structures:

- Faction readable from silhouette alone, at RTS camera distance?
- Glow intensity matches the unit's SIG band, in the faction accent colour?
- Background near-black, single hard cyan rim light, no water surface?
- Would it still read as a black shape against black water when running silent?

For environment props (Block 4):

- Silhouette readable at RTS camera distance, from the 55° pitch — does the height
  column actually show?
- Darker and quieter than any vessel — desaturated, no manufactured surfaces, nothing
  that could be mistaken for a structure or a contact?
- Emissive only where the table licenses a world-light family, and dim within it?
- At most two materials, inside the row's triangle budget?

## Related

- [art-direction.md](art-direction.md) — silhouette law, rendering target, Asymmetric Fidelity Law
- [graphics-standards.md](graphics-standards.md) — the shipping gates a generated model must clear
- [factions.md](factions.md) — full faction visual identity sheets these blocks quote
- [style-neon-noir.md](style-neon-noir.md) — glow rules and palette tokens
- [units.md](units.md) — the roster and the SIG/PR numbers cited here
- [glossary.md](glossary.md) — SIG, PF, HYD, PR definitions
