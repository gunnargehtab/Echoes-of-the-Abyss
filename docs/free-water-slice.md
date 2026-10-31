# Free Water — Crater and Kelp Slice

**Status: implementation contract for #1694, authored in #1705; not a shipped map.**
The owner asked for Homeworld-like fleet command inside a Subnautica-like ocean,
easy ascent/descent, full six-degree camera freedom including roll, and one integrated
crater/kelp-jungle slice with wildlife. Those are the approved goals, not approval of
every input or asset below. Direct rise/dive shipped in #1709; flight, the independent
destination preview and this world remain to be built.

## 1. Decision and boundary

Two delivery options were considered:

- **Retrofit a shipped map.** Reuse Kelp Labyrinth, its population and its controls, with
  existing contact-only wildlife; changing its ground would change competitive play.
- **Isolated slice (recommended, taken for this contract).** Author a development-only
  crater, opt-in flight and explicit-depth preview, plus bounded public decorative life;
  retain shipped maps, the orbit default and every gameplay-fauna disclosure rule.

The recommendation is taken unattended and remains reviewable in the #1705 pull request.
Its input and decorative-life choices are specified below, not attributed to the owner.
Merge of the contract is the prerequisite for #1706 and the remaining #1707 work.
This is not a new faction, campaign mission, competitive map or visual reboot.

The planned entry is `?study=free-water`, accepted only by a development client and a
development server, selecting the authored `free-water-slice` fixture. Both ends must
refuse it in production, rather than silently starting another map. One predicate owns
the client gate; it defaults off, including after reload without the parameter. The
server still runs a normal authoritative match and publishes only legal player state.
No server debug snapshot, omniscience toggle or client-side simulation is part of it.
Before the fixture lands, `?freeWaterControls=1` enables only the camera/order study on
an existing development map. The same client predicate owns both entry modes; the
controls-only mode never adds scenery or selects a different map. Promotion to normal
play requires a separate decision.

**Reference.** The approved models, survey plates and shared Abyss Render Stack in
[art-direction.md](art-direction.md) are the visual sources. The owner's two game
references describe command freedom and inhabited water, not a licence to copy assets,
add sunlight or replace the palette. Retain the current 0.22 vertical display scale and
canonical hull metres; changing either would be another design call.

## 2. Player decision and information

The emotion is curiosity above a drop, then commitment below it: the fleet is small
inside living water, and the quiet way home takes time. Beauty gives the player a reason
to lower the eye; the depth readout gives them a reason not to lower every hull.

| Fact and channel | Player decision | Cost and feedback |
| --- | --- | --- |
| Public ground: kelp terrace, crater and roofed cut | Stay at 300 m on the long outside route, or dive through the southern cut | The depth preview names the ceiling, floor and target; the server still refuses impassable movement |
| Own snapshot: selection depth, target, PR, SIG and queue | Dive the Corvette while the scout stays on the terrace | Normal descent/ascent and pressure costs; target, travel direction and course remain readable while the camera rolls |
| Public thermocline at 1,200 m | Cross into the deeper acoustic layer | Unchanged cross-layer attenuation; own SIG is not a guarantee of what an enemy hears |
| Earned contacts | Investigate a return, or stay quiet | Tier 1/2 never identifies animal versus navy; no scenic model reveals a hidden participant |
| Public decoration, independently authored | Look closely, then command past it | No reaction, target, resource, collision or acoustic effect; it is not a tactical tell |

Keep stats, prices, yields, combat, AI, progression, PR, sour exposure, sonar and
fauna behaviour unchanged. Normal descent is 45 m/s with its SIG floor of 72; normal
ascent is 15 m/s. Existing modifiers still apply. Looking is free; ordering a dive is not.
There is no win-rate target, harvest demonstration or balance baseline refresh.

**What the current simulation can actually do.** `sim/pathfinding.ts` plans in two
dimensions at the hull's current depth. `Terrain.admitsCell` checks one floor/ceiling
interval per cell; it cannot represent two independent water layers at the same plan
position. Movement reconsiders routes as depth changes but does not plan a climb/dive
detour. `systems/separation.ts` separates hulls in plan, and structure footprints block
at every depth: the drawn height of a Bastion does not create a fly-over route.
Terrain may lift a hull already below its floor; it never automatically dives a hull
under a roof. Explicit depth orders and floor-following are distinct
([systems-depth.md](systems-depth.md) §2).

Those are retained limits, not problems this art slice secretly fixes. Do not stage a
shot of stacked overlapping fleets, fly-over structures or an automatically routed
tunnel as proof of volumetric navigation. The authored exercise below needs none.

## 3. Authored ground: two readings of one map

This is an unnamed eroded pocket on the Rift's north-to-south descent, borrowing the
Plateaus' grown edge and empty southern drop, not a new named settlement or Sorrowgate.
It is a 4,000 by 4,000 m fixture, 16 by 16 cells of 250 m. North is decreasing map `y`;
depth is positive downward. Paint the following rows in order. Rectangles give
`x, y, width, height`; ellipses give the same bounding box. Membership is by cell centre,
as in [maps.md](maps.md), not by the rendered edge.

| Order / region | Shape and bounds, metres | Biome | Floor / ceiling, metres |
| --- | --- | --- | --- |
| 0 / outside rim | Rectangle 0, 0, 4,000, 4,000 | Coral Ruins | 600 / 0 |
| 1 / eroded bowl | Ellipse 1,000, 1,000, 2,500, 2,500 | Kelp Forest | 1,500 / 0 |
| 2 / deep pocket | Ellipse 1,500, 1,500, 1,500, 1,500 | Abyssal Trench | 2,400 / 0 |
| 3 / northern garden | Rectangle 1,000, 500, 2,000, 1,000 | Kelp Forest | 400 / 0 |
| 4 / southern wall | Rectangle 1,000, 3,000, 2,000, 500 | Coral Ruins | 200 / 3,000 (solid) |
| 5 / roofed cut | Rectangle 1,750, 3,000, 500, 500 | Abyssal Trench | 1,500 / 800 |
| 6 / exit pool | Rectangle 1,000, 3,500, 2,000, 500 | Coral Ruins | 1,500 / 0 |

PF uses the existing biome rules: kelp 0.55, coral 0.80 and trench 1.60; no new regional
multiplier. The normal 1,200 m thermocline and its duct remain. No resources, hazards,
structures, progression grants or terrain-change beats are authored in this fixture.
The lack of economy and objectives is deliberate: it is a command/movement study.

### Top-down routes

```text
                         NORTH
              garden (400 m floor)
              A -------- B -------- C

    START                 D         bowl (1,500 m)
    outside rim       deep pocket   (2,400 m)
                          E
              ##########  |  ##########  southern wall
                          F               roofed cut
              G --------- H               exit pool
                         SOUTH
```

The diagram is a reading aid; the table and these cell centres are the coordinates.
All waypoints refer to hull centres, and none promises passage through a structure.

| Mark | Map x / y, metres | Exercise depth | Purpose |
| --- | --- | --- | --- |
| START | 625 / 1,875 | 300 m | Own fleet, outside the crater |
| A | 1,125 / 1,125 | 300 m | Enter garden clearing |
| B | 2,125 / 1,125 | 300 m | Watch the forest from hull height |
| C | 3,125 / 1,125 | 300 m | Eastern end of the shallow alternative |
| D | 2,125 / 2,125 | 900 m, then 1,350 m | Dive in open water and cross the thermocline |
| E | 2,125 / 2,875 | 1,000 m | Deliberately rise before entering the cut |
| F | 2,125 / 3,125 | 1,000 m | Below the 800 m roof, above the 1,500 m floor |
| H | 2,125 / 3,625 | 1,000 m, then 300 m | Clear the roof before climbing |
| G | 1,125 / 3,625 | 300 m | Return via 875 / 3,625 and 875 / 1,875 |

The short southern route is D-E-F-H. The shallow alternative goes around the west wall,
through 875 / 2,875 and 875 / 3,625 to G-H, entirely at 300 m. The garden detour is
START-A-B-C, with open water between it and D. Keep the garden's entire 250 m row
`y=1,000..1,250` free of tall props, and the southern cut free of decorative blockers.
Public model bounds, not just their origins, must stay outside these clearings.

### Vertical section, x = 2,125 m

| North-to-south sample | Water interval | Reading |
| --- | --- | --- |
| B, y=1,125 | 0..400 m | Kelp garden; the scout can stay at 300 m |
| D, y=2,125 | 0..2,400 m | Empty water above a deep floor; 1,200 m is an acoustic boundary, 1,800 m a PR boundary |
| E, y=2,875 | 0..2,400 m | Open approach: establish 1,000 m before F |
| F, y=3,125 | 800..1,500 m | One roofed interval, not an open lane above a tunnel |
| H, y=3,625 | 0..1,500 m | Open exit: rise here before returning to the 600 m outside rim |

A Corvette remains PR-2 on the normal exercise. An optional, explicitly warned order to
2,000 m at D demonstrates crush, not a required sacrifice or a reward. The irreversible
part is hull lost to pressure; the unavoidable cost of returning from depth is ascent
time. Test the painted cells and both route choices against the actual terrain builder
when the fixture is implemented. Stop at each depth checkpoint until it is attained:
a queued horizontal leg does not promise to wait for vertical arrival.

## 4. Force and retained surfaces

Use three own Pelagia hulls, heading east at 300 m, with no refits or mission stat
overrides: scout at START, Corvette at 625 / 2,125 and Harvester at 375 / 1,875.
The study owns the spawn list, not a new roster. Existing orders keep running while the
camera moves; no harness may freeze the simulation to make a moving shot.

| Kind / role | Length; idle / cruise SIG; effective PR | Approved asset and silhouette to retain |
| --- | --- | --- |
| Light Scout / quiet terrace observer | 60 m; 6 / 12; PR-1 | `light-scout-pelagia.glb`: grown listening hull and its existing lamp sites |
| Corvette / dive and route exercise | 80 m; 28 / 28; PR-2 | `corvette-pelagia.glb`: broader armed hull, bow and working parts distinct from the scout |
| Harvester / scale and mixed-selection control | 75 m; 18 / 40; PR-2 | `harvester-pelagia.glb`: working hull, not a replacement fish or a scenic tender |

The files exist in `docs/concept-art/models/`, with same-slug scripts under
`tools/hull-models/hulls/`; `rosterModels.ts` maps all three kind/faction pairs.
Sizes and SIG above are the current `shared/src/units.ts` values, not new tuning.
Effective PR uses that module's faction-baseline rule. The Harvester has nothing to
harvest here; production, resource payouts and fabricated mining effects are absent.

Retain all three GLBs, outlines, scales, lamp placement and glow curves. Reuse the
Pelagia laminate/trim treatment, existing coral stone and kelp material families,
shared lighting, ACES and view-owned PMREM. No new textures, render targets or bespoke
composer are commissioned: added texture/target memory is zero. New shape templates
use the existing environment loader/cache ownership; per-view instances and animation
state are released with the view. Pending loads cannot repopulate a disposed view.
No cloned material may lose its fog, instancing, sway or glow-preservation hooks.

## 5. Place-to-kit sheet and wildlife licence

The northern pocket is an untended edge, not a city: holdfasts, cut-back stone and a
water-polished rim. Forty-metre kelp and dim living tips recall the Plateaus. No civic
lamp, vent chimney, glowing sky or overhead light is licensed here. The bowl remains
mostly empty, so the forest ends rather than dissolving into props at every depth.

| Place / purpose | Retained or commissioned kit | Boundary |
| --- | --- | --- |
| Garden flanks / close jungle | Retain `env-kelp-cluster`; commission `env-kelp-stand`, a denser stand of 40 m stalks within a 120 m footprint | No giant rescaling of the approved cluster; no plants in the central clearing, roofed cut or deep pocket |
| Rim / worn ground | Current terrain material and surveyed wall; no extra stone/coral instances in the first fixture | No new walls, cover or PF; no apparent solid prop across a traversable route |
| Crater / distance | Existing authored-floor relief and water | Bare drop, no illuminated floor, false cave mouth or copy of Sorrowgate's arch |
| Small life / close inspection | The four shapes below, public decoration | No dependency on own or enemy positions, contacts, occupancy, fauna AI or future events |

Two placement options were considered:

- **Fixture scatter.** Add density/exclusion rules to the registry; valid, but counts
  depend on candidate placement.
- **Authored slots (recommended, taken).** Use explicit fixture slots and existing
  batches; a longer list buys exact counts and clearance.

**Placement is an authored list, not the biome scatter.** For this fixture, disable
the registry's automatic biome placement, including its existing kelp, coral and trench
rows. Feed the slots below through the existing template, instancing and lifecycle
machinery under a fixture-specific look key; never draw both placement paths. The list
has no position or scale jitter and no budget-driven truncation. Other maps retain their
ordinary registry scatter. The opening list has exactly these counts, provided every
asset loaded; a missing model is a failed acceptance row, not a quieter forest.

| Kit | Authored placement list, map metres | Opening count |
| --- | --- | --- |
| New kelp stands | Cell origins `x=1,000,1,250,...,2,750` at each of `y=500,750`, plus `x=1,000,1,250,2,500,2,750` at `y=1,250`; two slots per cell at offsets `(62.5,125)` and `(187.5,125)` | 40 |
| Retained kelp clusters | Cell origins `x=1,500,1,750,2,000,2,250`, `y=1,250`; four slots per cell at every pair of offsets from `{62.5,187.5}` | 16 |
| Rim crabs | Four floor patches centred on `(1,625,1,375)`, `(1,875,1,375)`, `(2,125,1,375)`, `(2,375,1,375)`; each patch has a 25 m radius and four crabs | 16 |
| Fry shoals | Centres `(1,375,875)`, `(1,875,875)`, `(2,375,875)`, `(2,875,875)`; each school stays within 25 m horizontally and 250..300 m depth | 4 schools / 96 fish |
| Outer fish | Every pair of `x=1,750,2,000,2,250,2,500` and `y=1,750,2,500`; each path stays within 40 m horizontally and 700..1,000 m depth | 8 |
| Deep fish | Every pair of `x=1,875,2,125,2,375,2,625` and `y=2,125,2,375`; each path stays within 25 m horizontally and 1,900..2,100 m depth | 8 |
| All other dressing | No automatic rock, coral, resource, trench, civic or fauna placement | 0 |

Plant roots use the public rendered floor. A stand's plan envelope is at most 120 m
across; each slot leaves it wholly inside its 250 m cell. Retained clusters stay at
their approved 18 m footprint. The clearing row receives neither plant list. Animals'
closed paths, phases and poses are authored within their listed patches in #1713,
checked against public ground, and cannot migrate to another patch. No deep-pocket
plants or bowl-wide kelp are inherited just because those cells have a kelp biome.

**The wildlife choice is an explicit, narrow extension of the bible.** Keeping only
the existing stipples would preserve today's presentation but not the requested close
wildlife. Converting gameplay fauna into public fish would disclose hidden state and is
not an option. The chosen alternative is public microfauna decoration, only in this
opt-in fixture, independent of the bestiary's simulated roster. These are descriptive
asset names, not new gameplay species; no statistics or ecological powers are implied.

| New asset slug | Canonical rendered size | Maximum instances / triangles per instance | Placement and motion |
| --- | --- | --- | --- |
| `env-rim-crab` | 2 m across | 16 / 400 | Garden floor; slow, closed crawling loops inside its public patch |
| `env-shoal-fry` | 0.5 m long | 4 shoals of 24 / 180 | Garden, 250..300 m depth; fixed looping schools, never proximity scatter |
| `env-outer-fish` | 4 m long | 8 / 600 | Open bowl, 700..1,000 m depth; slow closed swimming paths |
| `env-deep-fish` | 2 m long | 8 / 400 | Deep pocket, 1,900..2,100 m depth; sparse photophore points |

All motion is deterministic from published placement, a fixed seed and shared match
time. It never reacts to a hull, a shot, a ping, damage or the camera. Reduced motion
holds these animations still. Public ground changes remove invalid placements and
rebuild only affected cells, even though the fixture authors no such event. A camera
crossing a cell boundary must not reshuffle life.

Bodies are non-emissive environment geometry, not `FaunaSpecies`, entities, selectable
objects, contacts, Biomass or collision bodies. In the study legend name them
**DECORATIVE LIFE — NO TACTICAL SIGNAL**. They create no scope marks or contact-log rows
and are not a fake Lampfry scatter tell. Their silhouettes must not borrow the bestiary's
classified predator shapes. This is a bounded visual abstraction, not silent replacements
for the animals in [bestiary.md](bestiary.md).

The deep fish's photophores use the existing public-life channel: soft additive dots,
`FAUNA_COLOR` in each accessible palette, at no more than the existing rung-5 furniture
gain ([style-neon-noir.md](style-neon-noir.md), World light). At most six points per fish,
no body emission, bloom halo, point light or smooth brightness pulse. This adds no sixth
ground-light family and does not enter the own-agent lamp halo. Other new animals emit
nothing. The kelp retains `flora-biolight` and its licensed sway.

Gameplay fauna remain unchanged: public Lampfry/Tetherjelly retain their established
disclosures and stipples; classified animals retain species-shaped dots, with no
full-detail mesh in the enemy-track path. The fixture's default gameplay-fauna list is
empty, explicitly authored rather than a global population change. Its disclosure test
variant adds a server-only existing Hollow and an opposing observer in the deep pocket,
using normal detection; decoration must be byte-for-byte independent of that variant's
hidden state. Neither extra participant is exposed by the study entry.

**Shape lane.** The five new slugs, including the kelp stand, are commissions, not
approved files. Environment props have no faction: each shape PR authors
**ENV STYLE + one prop-table row** in [asset-prompts-3d.md](asset-prompts-3d.md) Block 4, including
Footprint, Height, Tris and Light, plus its script, outline, GLB, intake report,
neutral-light review, contact sweep and separate hull-reviewer before integration.
Use that document's design model of record; the contract author does not author or
approve these shapes.

Block 4 currently describes stone, coral, kelp and crystal standing on the seabed.
The #1711 shape PR must first add the scoped public-microfauna variant: the crab may
stand on the floor, while the three swimming slugs may be suspended in the column.
Retain its no-faction, low-luminance, material-count and intake constraints; the exception
is for these four decorative forms, not gameplay fauna or other floating props.
All four rows carry **Light `none`**, including `env-deep-fish`: its GLB has no emissive,
and runtime supplies the separately budgeted rung-5 photophore dots described above.
This preserves the inverted intake light gate. No links to nonexistent exports,
placeholder primitives passed off as finished assets, or one-off fish loader.

## 6. Camera and command contract

### Flight: proposed opt-in controls for #1706

Keep the bounded orbit as the default and non-target control. Flight stores a free eye
and unit quaternion; roll is an orientation, not a screen-space effect. All three
rotation axes are continuous through vertical and inverted views. No Euler pitch clamp,
world-up `lookAt` reset or automatic levelling may undo the player's roll.

| Action | Flight input and ownership |
| --- | --- |
| Toggle flight | Rebindable `F8`, and a focusable FLIGHT button; entering retains orientation and moves the eye only if needed for legal clearance |
| Look | `Shift` + middle drag, local yaw/pitch; no pitch limit |
| Translate | Middle drag in camera right/up; wheel along camera forward; `Shift` + wheel moves world depth by 150 m |
| Keyboard navigation | Rebindable `F9` or a focusable NAV latch; while latched, W/S forward/back, A/D left/right, R/F local up/down, Q/E roll, arrows yaw/pitch |
| Leave navigation | `F9`, NAV button, or `Escape`; release every held motion key, without sending an order |
| Recover | `Home` always leaves NAV and flight, zeroes roll, restores north/55 degrees/seabed focus at the last command focus and saved orbit dolly |

NAV is a visibly labelled input mode, **CAMERA NAV — FLEET SHORTCUTS SUSPENDED**, not a
simulation pause. It consumes its keys before fleet shortcuts, suppresses clicks on the
world as orders, and leaves existing orders running. Outside NAV the fleet bindings,
including S/D, retain their meaning; the direct controls remain camera-independent.
This explicit latch is chosen over reusing WASD globally, which would steal attack-move,
rise and dive. Provide focusable, labelled motion buttons as the mouse-only alternative;
keyboard look and the latch avoid a mandatory simultaneous mouse/key chord. Bindings
are contextual, validated for conflicts, and exposed in Controls rather than hardcoded
beside the existing binding registry. Home and Escape cannot be rebound away.

Escape has one owner per press: an open menu first; otherwise leave NAV, cancel MOVE 3D,
cancel a pending build, then open the menu, in that order. Leaving NAV preserves a
pending preview, so the next Escape cancels it rather than also doing so on the first
press. Arming MOVE 3D cancels pending build/attack-move placement. Opening a menu leaves
NAV and clears held movement; closing the menu never resumes motion. Focused fields
and menus consume their events before the world handler.

Initial translation speed is 200 rendered metres/s, adjustable in Controls over
50..800; keyboard rotation is 60 degrees/s. These are camera-only TUNABLEs, not unit
speeds. Normalise simultaneous translation axes, use elapsed time, clear input on blur,
menu, mode exit and disconnect, and do not add momentum or automatic camera sway in
flight. No command is generated by a camera gesture's release. Edge scroll is disabled
in flight; menus and text inputs own their events.

The flight eye stays inside the map rectangle and its public rendered water interval,
with 25 m of depth clearance from floor/roof and the surface. Convert that clearance
through the retained display scale. Sweep translations rather than tunnelling through
rock; stop at a blocked boundary without changing orientation. If there is no interval
wide enough, retain the last legal eye and report **NO CAMERA CLEARANCE**. On entry
from an outside/above-water orbit, use the existing legal command focus as the fallback
anchor, clamped to a clear interval, or refuse flight with that reason. This camera
constraint is not a PR cost or a new unit collision rule.

Both painters share the final camera matrix. Audit projection, front/behind clipping,
selection and drag boxes, range arcs, world labels, occlusion, water depth sampling,
snow, culling and sound panning under roll and upward gaze. The north-up scope draws
only a finite forward ground footprint; if there is none, omit the polygon and show
the camera position plus orientation cue, not a huge clamped quadrilateral. A vertical
gaze has no horizontal bearing: say so, rather than inventing north. Positional audio
uses the final camera basis, including roll, only for bearings the player has earned;
directionless Tier-1 sound remains directionless.

Keep the HUD upright. Distinguish **EYE** depth from hull and destination depth, and
show a world-up attitude cue even when inverted. At a pitch pole, mark **VERTICAL**
instead of displaying an unstable horizontal bearing; orientation must never become
NaN or jump the camera back to north.

### Independent destination: recommendation for the rest of #1707

The alternative is keeping all destination depth on the camera focus, as ordinary clicks
do today. The recommended addition is an explicit **MOVE 3D** action, initially unbound
but available beside the depth ribbon, with a rebindable shortcut. It does not replace
ordinary right-click, S/D, or the SQUAD controls and does not displace crowded card orders.

Arming snapshots the lead selected hull's depth into a horizontal command plane.
Pointer movement previews x/y on that plane. A click pins x/y; then a labelled metre
field and +/-150 m buttons choose depth independently of the camera, with `Shift` +
wheel as an optional shortcut. A separate CONFIRM button or Enter commits exactly one
move; Escape cancels without sending. Queue is an explicit toggle in this preview, not
inferred from the wheel's Shift. Unpin returns to plan placement. Camera movement can
continue while previewing; it cannot change a pinned point or the numeric depth.

Wheel ownership is menu/focused field first, then NAV, then a pinned MOVE 3D preview,
then ordinary flight. Outside NAV, `Shift` + wheel over the world edits the pinned
preview's depth and does not move the camera. Inside NAV it moves camera depth and
leaves the preview unchanged. Unmodified wheel remains camera travel in either case.

Show plan position, target depth, terrain interval, vertical tether, pressure warning
and ascent/descent cost. A ray parallel to the command plane, behind the eye or outside
the map has **NO WATER TARGET** and cannot confirm; offer the north-up scope as an
alternate plan picker. Solid cells refuse with **NO WATER COLUMN**. Out-of-interval
targets require an explicit correction, not silent clamping to another destination.
Pressure risk is a warning, not a prohibition. A legal endpoint is not a promise of a
3D path: show **ROUTE AT CURRENT DEPTH — CLIMB/DIVE MANUALLY**.

Three order-semantics options were considered:

- **Fixed-depth preview (recommended, taken).** Keep the numeric depth even within
  100 m of the floor; legacy clicks retain their inference, while the preview's explicit
  intent must survive the wire, queue and replay.
- **Existing inference.** Apply the ordinary 100 m floor-following inference to the
  preview too, but silently reinterpret a numeric depth as a clearance above the floor.
- **Follow-floor toggle.** Add a labelled mode inside the preview; the intent is explicit,
  but it adds another control and a mode to carry through the command.

The chosen preview commits a **fixed-depth** move, even inside the ordinary click's 100 m
floor-following threshold. Carry that explicit intent through server validation,
queue and replay; legacy clicks retain their existing inference. This is an intentional
order-semantics extension, not changed travel costs or an accidental floor-following
regression. Every wire field still belongs in `shared/src/wire.ts`; no second command
channel. Independent direct steps continue to offset each hull's active target and
preserve its course; later queued moves retain their own depth.

## 7. Acceptance and evidence

The contract is done when its canonical cross-links, decisions and scoped follow-ups
are reviewed. That does **not** certify an unbuilt scene. Implementation acceptance
requires the following, in a real authoritative match with the HUD present.

| Evidence | Required observation |
| --- | --- |
| Painted map and routing tests | Exact sample intervals above; shallow and cut routes; 300 m cannot enter F; structure footprints and planar separation remain unchanged |
| Input and projection tests | Continuous yaw/pitch/roll through 90/180/360 degrees; no order from navigation, blur or release; Home recovery; parallel/behind picks refused; no mirrored offscreen contacts |
| Moving fleet | Scout stays shallow while Corvette dives/rises on an existing course; a mixed selection and queued leg retain their documented intent; camera moves independently |
| Refused and costly actions | Invalid column cannot confirm; roof holds ascent; PR warning is visible before a deliberate deep order; incurred crush remains unhealable |
| Close / home / survey / low / rolled frames | Close wildlife and kelp resolve at canonical scale; home prioritises own hulls and earned contacts; survey reduces decoration below tactical ink; a low moving view and 180-degree roll keep HUD, scope and depth readable |
| Information controls | Same public decorative placement/motion with and without hidden opponents/fauna; no new wire exposure; public bestiary tells and Tier-1/2 ambiguity unchanged |
| Lifecycle and accessibility | Real asset arrival counts; pending-load rebuild, local ground delta, palette switch, leave/rejoin and teardown; NAV latch, keyboard-only preview, one-handed fleet layout and reduced motion |
| Non-target | Same camera/match on Kelp Labyrinth with the study off; orbit gestures, ordinary orders, original prop placement, mission holds and fauna presentation unchanged |

Baseline evidence is the actual pre-flight client in
[02-depth-controls.png](screenshots/issue-1694/02-depth-controls.png),
[03-rising-on-course.png](screenshots/issue-1694/03-rising-on-course.png) and
[readings.json](screenshots/issue-1694/readings.json). The existing dive frame is after
horizontal arrival; do not present it as on-course descent. Capture a matching new
before/after sequence for each implemented camera or world increment, keeping merged
evidence folders unchanged. A standalone model viewer cannot pass the integrated row.

**Budgets are gates, not forecasts.** Retain [graphics-standards.md](graphics-standards.md)
gate 6: at most 150 draw calls and 400,000 triangles over every pass, DPR at most 1.5.
Reserve at most 30 calls / 120,000 triangles for all props and decorative life together:
The authored list totals at most 85,888 triangles: 40 new kelp stands at at most 1,200
each (48,000), 16 retained clusters (6,208), wildlife (31,680), and zero other dressing.
The remaining reservation is unused, not permission to fill the bowl. Counts are the
opening list's contract; per-model triangle limits remain ceilings. Share instanced
batches per template/material; no per-fish draw or relaxation of the whole-frame limit.

Record actual whole-frame calls, triangles, instances, texture/target bytes, hardware,
and gate-6 unpaced/queued GPU timing at DPR 1 and 1.5. Exercise motion, not only stills.
CPU frame intervals and software rendering are not GPU evidence; unavailable hardware
leaves that criterion open. No new "AAA" score, beauty score or relaxed budget replaces
these checks.

## 8. Follow-up boundaries

| Child | One increment's scope | Prerequisites / finish line |
| --- | --- | --- |
| #1706, six-degree camera | Flight, navigation ownership, recovery, projection/scope/audio consequences; no new models | Merged #1705 contract; real-client movement/roll and non-target evidence |
| #1707, remaining independent destination | Fixed-depth preview, invalid picking, queue/replay intent; direct S/D already shipped | Merged contract; integrate and exercise with #1706's rolled camera before closing |
| #1712, dense kelp stand asset | One new `env-kelp-stand` shape; retained clusters unchanged | Merged contract, owner-applied shape routing; approved script/GLB/outline and independent intake/review |
| #1711, public microfauna kit | Scoped ENV STYLE amendment and four prop-table rows/shapes, no behaviours or stat blocks | Merged contract, owner-applied shape routing; separate model gates for each, no runtime promotion |
| #1713, integrated crater fixture | Authored ground/spawns, gated entry, approved dressing and decorative motion, full evidence matrix | Camera, destination and all five assets merged; no closure on a registry-only or standalone scene |

Asset authorship and runtime integration are different jobs. A shape author may not
approve their own bake. The integrated child may not invent missing models or change
their scale to hide a budget miss. #1694 stays open until the integrated acceptance
matrix is satisfied, not merely until this document or the camera lands.

## Related

- [Free camera](free-camera.md) — shipped orbit and the next camera revision
- [UI and controls](ui-ux.md) — ordinary orders, direct depth and accessibility
- [Depth](systems-depth.md) and [Echo Layer](systems-echo.md) — costs and disclosure
- [Maps](maps.md) — literal ground, cell-centre painting and public terrain
- [World](world.md), [habitats](habitats.md) and [habitat art](habitats-art-brief.md) — the Rift and the Plateaus
- [Bestiary](bestiary.md) — gameplay animals, not decorative replacements
- [Art direction](art-direction.md), [style](style-neon-noir.md) and [graphics gates](graphics-standards.md) — the retained hierarchy and budgets
- [Model prompt kit](asset-prompts-3d.md) — authorship and the model of record
