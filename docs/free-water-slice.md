# Free Water — Crater and Kelp Slice

**Status: implementation contract for #1694, authored in #1705; not a shipped map.**
The owner asked for Homeworld-like fleet command inside a Subnautica-like ocean,
easy ascent/descent, full six-degree camera freedom including roll, and one integrated
crater/kelp-jungle slice with wildlife. Those are the approved goals, not approval of
every input or asset below. Direct rise/dive shipped in #1709, flight in #1706 and the
independent destination preview in #1707. The development fixture is integrated in
issue #1713; its acceptance matrix and hardware evidence are recorded
[beside the captures](screenshots/issue-1713/README.md).
The owner then rejected the slice's feel on 4 November 2026; §9 is the approved target for
the pass that answers it.

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

The entry is `?study=free-water`, accepted only by a development client and a
development server, selecting the authored `free-water-slice` fixture. Both ends must
refuse it in production, rather than silently starting another map. One predicate owns
the client gate; it defaults off, including after reload without the parameter. The
server still runs a normal authoritative match and publishes only legal player state.
No server debug snapshot, omniscience toggle or client-side simulation is part of it.
`?freeWaterControls=1` enables only the camera/order study on
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

Those were retained limits, not problems this art slice secretly fixed. The owner lifted
all three on the crater's ground, for the study and the two-player fight alike (§9,
"Toward a vertical multiplayer match"): separation in three dimensions, routes that climb and dive, and
structures with a height. The one-interval-per-cell terrain stays. Shipped maps keep
every limit above.

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
shared lighting, ACES and view-owned PMREM. No new render targets or bespoke composer
are commissioned, and one texture only: since #1774 the survey ink contours the study's
rounded floor from a 512 × 512 float texture of the seabed bake's floors, 1,048,576
bytes, released with the ground (§9, "Crater walls"). Added target memory is zero. The
owner approved that texture in session on 8 November 2026, recorded in #1787. New shape
templates use the existing environment loader/cache ownership; per-view instances and animation
state are released with the view. Pending loads cannot repopulate a disposed view.
No cloned material may lose its fog, instancing, sway or glow-preservation hooks.

## 5. Place-to-kit sheet and wildlife licence

The northern pocket is an untended edge, not a city: holdfasts, cut-back stone and a
water-polished rim. Forty-metre kelp and dim living tips recall the Plateaus. No civic
lamp, vent chimney, glowing sky or overhead light is licensed here. That is Low, and it
stands. At the High graphics quality the owner licensed one vent stand on the outside rim
on 20 November 2026 (High's own vents, below). The bowl remains mostly empty, so the
forest ends rather than dissolving into props at every depth. At High a river of
lanterns drifts over its north half, in development (#1859, below).

| Place / purpose | Retained or commissioned kit | Boundary |
| --- | --- | --- |
| Garden flanks / close jungle | Retain `env-kelp-cluster`; commission `env-kelp-stand`, a denser stand of 40 m stalks within a 120 m footprint | No giant rescaling of the approved cluster; no plants in the central clearing, roofed cut or deep pocket |
| Rim / worn ground | Current terrain material and surveyed wall; no extra stone/coral instances in the first fixture | No new walls, cover or PF; no apparent solid prop across a traversable route |
| Crater / distance | Existing authored-floor relief and water | Bare drop, no illuminated floor, false cave mouth or copy of Sorrowgate's arch |
| Small life / close inspection | The four small shapes below, public decoration | No dependency on own or enemy positions, contacts, occupancy, fauna AI or future events |
| Large life / the opening | The ray below, one public decorative body of 18 m (#1777) | The same independence; no silhouette of a classified animal, and nothing of the colossus |
| Drifting life / over the fleet's start, High alone | The jelly below, a public decorative medusa of 6 m (#1837) | The same independence. Not the Tetherjelly or its stipple figure: a field's bell is seven times as wide, a figure in dots in the fauna colour with six tentacles, and stands where it is, where a lantern is a lit skin in a hue of its own over eighteen strands, adrift alone. Not the Hollow's crescent. No light in its file |
| Far life / over the bowl, High alone | The jelly again: the far bloom below, 120 of it in one river (#1859) | The same independence, and no file of its own. Not a Tetherjelly field: a lantern is a lit skin 6 m across in a hue of its own, adrift, where a field's bell is a figure in dots seven times as wide, in the fauna colour, and stands where it is. No bell among the hulls' 300 m or under it |
| Large life / before the Close eye, High alone | The manta below, a public decorative body of 18 m (#1867) | The same independence; no silhouette of a classified animal, nothing of a hunter and nothing of the colossus. It is not the rim ray reshaped: that file and its glide stand as they did |
| Deep life / under 400 m over the rim, High alone | The comb jelly below, a public decorative body 3.5 m across and about 5 m tall (#1858) | The same independence. Not the lantern: an upright egg, with no bell, no margin and nothing that trails. Not the Tetherjelly or its stipple figure, and not the Hollow's crescent. No light in its file |

Two placement options were considered:

- **Fixture scatter.** Add density/exclusion rules to the registry; valid, but counts
  depend on candidate placement.
- **Authored slots (recommended, taken).** Use explicit fixture slots and existing
  batches; a longer list buys exact counts and clearance.

**Placement is an authored list, not the biome scatter.** For this fixture, disable
the registry's automatic biome placement, including its existing kelp, coral and trench
rows. Feed the slots below through the existing template, instancing and lifecycle
machinery under a fixture-specific look key; never draw both placement paths. Nothing in
the list is drawn at play time: no position or scale jitter and no budget-driven
truncation. Its plants' irregular positions and headings are the list's own (No rows,
below). Other maps retain their ordinary registry scatter. The opening list has exactly
these counts, provided every asset loaded; a missing model is a failed acceptance row,
not a quieter forest.

In #1713, register all five new rows with `stands: []` and `density: 0`, so only the
fixture's list places them; that PR also adds stand-only allowances of 9,000 triangles
and 120 m footprint to the registry checks, retaining the existing 800/60 bounds for
every other row.

| Kit | Authored placement list, map metres | Opening count |
| --- | --- | --- |
| New kelp stands | 56 authored slots, each a position and a heading (`KELP_STANDS` in `freeWaterDecoration.ts`): 46 north of the clearing, every outline inside `x=1,125..2,875` and `y=625..1,000`, and 10 south of it, inside the same `x` and `y=1,250..1,375`, each back from the clearing by its sway's reach (below) | 56 |
| Retained kelp clusters | 16 authored slots along the garden's north fringe, each a position and a heading (`KELP_CLUSTERS`), centred inside `x=1,011..2,989` and `y=511..614`, so a turned cluster's 9.9 m reach stays on the garden's cells and north of every stand | 16 |
| Rim crabs | Four floor patches among the south flank's stands, centred on `(1,625,1,375)`, `(1,875,1,375)`, `(2,125,1,375)`, `(2,375,1,375)`, and four on the clearing's floor, centred on `(1,900,1,060)`, `(1,880,1,165)`, `(1,800,1,110)`, `(1,760,1,200)`; each patch has a 25 m radius and four crabs | 32 |
| Fry shoals | Centres `(1,375,875)`, `(1,875,875)`, `(2,375,875)`, `(2,875,875)`, each school within 25 m horizontally and 250..300 m depth; and two over the clearing, `(2,035,1,120)` within 105..160 m depth and `(2,010,1,160)` within 120..170 m | 6 schools / 144 fish |
| Outer fish | Every pair of `x=1,750,2,000,2,250,2,500` and `y=1,750,2,500`, each path within 40 m horizontally and 700..1,000 m depth; and two schools of four over the clearing, centred `(1,900,1,150)` and `(1,780,1,080)`, within 45 m horizontally and 200..300 m depth | 16 |
| Deep fish | Every pair of `x=1,875,2,125,2,375,2,625` and `y=2,125,2,375`, and three patches of six along the pocket's north edge, centred `(1,950,1,640)`, `(2,150,1,630)`, `(2,350,1,650)`; each path stays within 25 m horizontally and 1,900..2,100 m depth | 26 |
| Rim ray | One loop centred `(735,2,210)`, over the outside rim south-east of the fleet's start, within 70 m horizontally and 200..300 m depth | 1 |
| All other dressing | No automatic rock, coral, resource, trench, civic or fauna placement | 0 |

Plant roots use the public rendered floor. A plant's plan envelope is its outline at its
heading, measured off its GLB: a stand's is 120 by 69 m, its length down-current, and a
cluster's 18 by 14 m. No two plant envelopes overlap. None need stay inside its own
250 m cell: a public ground change disables every placement whose registry footprint
reaches the changed cell, and the fixture rebuilds its whole list. A stand stands
only on the garden's 400 m tread, whole: the rendered floor interpolates between cell
centres, so every cell centre around a stand's envelope must be a garden centre, which
keeps every stand's outline inside `x=1,125..2,875` and `y=625..1,375`, off the ramps to
the rim, the bowl and the pocket. Across any stand's envelope the eroded floor stays
within 40 m of its root, a stand's height. The clearing's row is bare, and every outline
stands back from its edges by as far as a sway can carry it there: the shader moves a tip
up to 1.35 times the registry's 4 m `swayM` along the plant and 0.4 times across it, so a
plant turned θ from the current reaches 4 × (1.35 |sin θ| + 0.4 |cos θ|) m north or
south, 1.6 m unturned and 4.95 m at 45 degrees. The list stands 46 on the north flank's
tread and 10 on the south flank's, which is one stand deep (§9, Kelp).
Retained clusters stay at their approved 18 m footprint, a fringe along the garden's north
edge behind the stands, on the gentle ramp up to the rim. The clearing row receives
neither plant list. Animals'
closed paths, phases and poses are authored within their listed patches in #1713,
checked against public ground, and cannot migrate to another patch. No deep-pocket
plants or bowl-wide kelp are inherited just because those cells have a kelp biome.

**No rows.** The owner's re-acceptance of 6 November 2026 read the forest as planted in
rows (#1773). Three readings hold that off. No plant stands within 10 m of the line through
two others of its kind when it lies between them, at least a fifth of the way in from
each, and within 260 m of both. Every east-west line across the north flank, from
`y=650` to `970`, meets stand outlines over at least a quarter of the tread's 1,750 m, so
no lane runs between stands. And the south flank, one stand deep, leaves at least four
gaps of 60 m or more between its outlines along its length, so it breaks into clumps
rather than one band. All three are read in plan: the roots stand on one floor, near
enough a plane, and a camera maps a plane to the screen through a homography, which keeps
a line a line, so three roots in line on the floor stand in line in the garden-close and
survey frames alike. Each plant turns at most 45 degrees
from the current, +x in the stand's and the cluster's scripts, so the forest keeps one
prevailing current while its turned plans break the strips. The list was drawn once, by a seeded anneal
from #1751's rows ([issue-1773](screenshots/issue-1773/README.md)), and is held by tests
rather than redrawn.

Swim depths place the **body axis**, not the lowest fin tip (owner decision in #1713).
The approved fry, outer fish, deep fish and ray axes stand 0.06, 0.78, 0.28 and
0.76 rendered metres above their model origins respectively. Subtract that offset after mapping
depth through the retained 0.22 display scale; do not squash or rescale the bodies.

The fixture uses closed circular plan paths: crab radius 20 m over 240 s, fry
radius 20 m over 90 s, outer fish radius 35 m over 180 s, deep fish radius
20 m over 240 s and the ray radius 60 m over 300 s, a walking pace. Within a crab or deep-fish patch, radii range from 40% to 100% of
that radius, with evenly spaced phases; a fixed seed of 1713 offsets each patch.
Every path runs clockwise seen from above. The ray alone takes an authored phase and a
bank (#1780): it stands at `(765, 2,158)` when the match starts, and banks 30 degrees
into its turn, its starboard wing low, rolled about its body axis so the axis keeps its
path and depth (Life in the frames, below).
A school keeps station instead (#1771): its fish share the school's loop, each held
at a fixed seeded offset from the school's own point, at most 1.5 m along the loop,
1 m across it and 4 m of depth for fry, and 12 m, 6 m and 10 m for outer fish. A fry
school is then a knot a few metres across, where evenly spaced phases spread its 24
fish over a spiral up to 40 m wide that read as nothing, and an outer school is a loose
group.
Swimming depth follows the same phase: fry 275 ± 20 m over the north flank and
132 or 145 ± 20 m over the clearing, outer fish 850 ± 130 m over the bowl and
250 ± 35 m over the clearing, deep fish 2,000 ± 80 m, the ray 250 ± 15 m beside
the hulls' 300 m, half the level body's swing, because its bank lifts the high wingtip
7.35 m over its axis, 33 m of depth at the display scale; its whole body then spans 202
to 275 m. Crabs follow the public rendered floor. These smaller envelopes leave room for the full body inside the
licensed bounds.

**Life in the frames.** The owner's re-acceptance of 6 November 2026 found no crabs or
fish in §9's four frames (#1771): #1713's patches lay where no pose reads a body of
canonical size. Measured in the real client at 1,440 by 900, an outer fish reads as a
fish out to about 300 m, 16 px and more, and is gone at 1,190 m; a fry school reads as
a knot of fish within about 100 m and as a smudge at 150 m; a crab's metre-wide shell
is a speck at 220 m; and the deep fish's photophores read as pinpricks at 2 km against
the pocket. So each frame takes the life it can carry, added to #1713's list rather
than moved from it, by the owner's calls of that day:

- **Garden close** looks west along the clearing from 41 m deep. Two fry schools loop
  65 to 140 m from the eye, which only the shallower fry band reaches; two schools of
  outer fish cross the clearing 185 to 385 m out, which is why they are licensed over
  the garden; and four crab patches stand on its floor 220 to 395 m out, as near as the
  floor shows above the console, where a crab is a speck.
- **Low** looks into the pocket over the southern wall, and only its northern part
  clears the console, so its three new deep-fish patches stand along the north edge, as
  rings of photophore pinpricks. That is Low's frame. At High the seats are world light
  and the water takes them from this eye, 2 km off (#1857): the rings read from the
  pocket itself, and from here the pocket is dark.
- **Opening** gets the ray, the one body large enough to project there (#1777, the
  owner's call of 6 November 2026). Its eye stands above the Lid, so no water in the
  frame is nearer than about 550 m, at the console's edge, where a 4 m fish would draw
  9 px; ahead of the hulls, 900 m and more out, it draws about 5 px, and a school placed
  there drew nothing visible, so #1771 placed nothing for it. The ray, 18 m across,
  glides on one loop south-east of the fleet's start, 810 to 930 m from the eye, where
  its span projects 26 to 30 px, in the open water at the lower right between the
  corvette and the legend, 40 px clear of the corvette's ring. Level, it showed that
  eye about a third of its plan down a 21 degree sightline, and where it swam away
  from the eye it drew as a sliver of lit back
  ([issue-1777](screenshots/issue-1777/README.md), "What the frame shows"). So it
  banks into its turn and starts its loop on the far side from the eye (#1780, the
  owner's call of 7 November 2026): through the match's first minute the eye sees
  0.63 to 0.75 of its plan, a pale body against the dark water past the rim's edge,
  where the level ray drew a smaller one against the paler rim floor. The rest of the
  loop is a trade: on the near side it draws as a dark silhouette on the rim floor,
  and where it swims toward or away from the eye it thins to a crescent or a sliver,
  thinner than the level ray drew there
  ([issue-1780](screenshots/issue-1780/README.md)). The pocket
  shows only at the frame's right edge, where two of the low pose's deep-fish patches
  read as photophore pinpricks 2.2 to 2.5 km out. That is Low's frame. No Opening frame
  was taken at High for #1857: from gate 6's low camera, 2 km off, the water takes a
  seat's light there, so none is expected from farther. A nearer opening is §9's call,
  not taken.
- **Survey** keeps decoration below tactical ink; the new deep-fish patches add faint
  pinpricks along the pocket's north edge. That is Low's frame too: at High no seat's
  light reaches an eye 10 km off, and the pocket shows none (#1857).

Life may cross the clearing row although plants may not: a crab, a fry or a fish is
neither a tall prop nor a blocker (§3).

**High's own life (#1837).** *In development with the High graphics quality's third
look step, and not accepted. The owner chose the crater's decorative life as that step's
bodies in session on 20 November 2026.* The list above is Low's, and High draws all of it.
Behind the Graphics quality setting the fixture stands more, where
[the target's](screenshots/issue-1799/README.md) Home and Close cameras read a body:
Home's eye is 840 m and more from the hulls and Close's 350 to 530 m, and #1771's patches
stand a kilometre off in the garden. High's slots follow Low's in the list and never
stand among them, so Low's counts, order and frame do not move.

**Life by depth band (#1858).** *The owner's calls of 24 and 25 November 2026 in #1858.
The placements below keep it, and no frame of it is accepted.* At High each decorative
body keeps its axis inside one of [systems-depth.md](systems-depth.md) §1's bands all lap
long, its swing and station included, so what lives beside a hull says how deep it is,
with no HUD. Water depth is public map data, so the rule tells nothing a match hides.

| Water | Axis depth | What lives there at High |
| --- | --- | --- |
| The Lid | Above 150 m | Nothing: its glow is an empty roof over the lanterns |
| Shelf | 150 to 400 m | The lanterns, in `jelly-lantern`; the fry; the backlit mill; the manta |
| Mid-Water, over the rim | 400 to 600 m | The rim's outer fish; the comb jellies, in `comb-light` |

- **A body is measured by its axis**, as every swim depth here is (#1713). The manta's
  axis keeps 157 to 173 m, so its accepted numbers stand, though a wingtip at its bank
  reaches 131 m.
- **No body crosses a line.** A school that swam across 400 m would blur what the line
  tells, so the rim's outer fish swing 11 m about 430 m, where they swung 40.
- **The deep body's line is 400 m, the Shelf's floor, not the thermocline.** The crater's
  eyes stand at 233 m and higher, and under 1,200 m there is only the pocket, which they
  see dark at High (#1857). The thermocline waits for a camera that sees under it (§9).
- **A hue tells which side of the line.** The lantern lives over it and the comb jelly
  under it, each in a token of its own
  ([style-neon-noir.md](style-neon-noir.md#world-light--the-terrain-carve-outs)), and
  neither ever crosses. In the standard palette pink over a hull's ring is the Shelf and
  lime under it is Mid-Water. The red-green palettes tell them by hue too, a violet over
  a yellow. Tritanopia's pair is one hue to that eye, and is told by lightness, an orchid
  over a dark umber.
- **Low is unchanged**, and High draws Low's list whole. So Low's two fry schools over the
  clearing, 105 to 170 m, stand in the Lid at High too: the rule's one known exception,
  2.1 km from the Close eye, where a 0.5 m fry draws under half a pixel.

`packages/frontend/test/freeWaterDecoration.test.ts` holds every High body to its band
and out of the Lid, and names the exception. Software frames of the Close and Home
cameras, before and after, are in [issue-1858](screenshots/issue-1858/README.md).

A **stream** is schools sharing one loop, evenly round it, each fish keeping station on
its school's own point as #1771's do. A camera held beside the loop then sees fish pass
at any match time, where one school would pass once a lap.

| Stream | Loop centre, radius, period | Depth | Schools and fish | Station: along, across, depth |
| --- | --- | --- | --- | --- |
| Rim fry, `env-shoal-fry` | `(299, 2,098)`, 90 m, 380 s | 228 ± 6 m | 5 of 96 | 7 m, 1.6 m, 5 m |
| Rim outer fish, `env-outer-fish` | `(760, 2,050)`, 75 m, 300 s | 430 ± 11 m | 4 of 12 | 14 m, 6 m, 14 m |
| Backlit outer fish, `env-outer-fish` | `(462, 2,069)`, 34 m, 150 s | 355 ± 25 m | 4 of 30 | 20 m, 3 m, 12 m |

The **drifting bodies** are five `env-drift-jelly`, each alone on its own loop: a 14 m
radius and a lap in 280 s, about a fifth of a fry's pace, rising and sinking 10 m as it
goes, its bell leaning 12 degrees into the turn. Each hangs by its bell's mid-height,
2.76 m over its lowest lobe's tip, at an authored depth from an authored start.

| Jelly | Loop centre, map x / y | Depth | Start, degrees round its loop |
| --- | --- | --- | --- |
| 1 | 305 / 2,041 | 190 m | 0 |
| 2 | 416 / 2,062 | 170 m | 70 |
| 3 | 505 / 2,122 | 200 m | 140 |
| 4 | 509 / 1,909 | 160 m | 210 |
| 5 | 678 / 2,025 | 180 m | 280 |

Over a lap they hang 165 to 534 m from the Close eye, 190 to 526 m at its start, and 23
to 83 m over the eye's own depth, 50 m deeper than #1837 hung them, out of the Lid (Life by
depth band, above), so they stand in the water above the hulls' rings, as
the target's do. A 6 m bell draws 17 to 56 px there, and 10 to 13 from Home's eye.

The **deep bodies** are six `env-comb-jelly` (#1858, the owner's commission of
27 November 2026), each alone on its own loop under the Shelf's 400 m line: a 16 m radius
and a lap in 420 s, three quarters of a lantern's pace, rising and sinking 8 m as it
goes, upright, leaning 8 degrees into the turn. Each hangs by its body's mid-height,
2.51 m over its lowest point, at an authored depth from an authored start.

| Comb jelly | Loop centre, map x / y | Depth | Start, degrees round its loop |
| --- | --- | --- | --- |
| Comb 1 | 340 / 2,000 | 440 m | 225 |
| Comb 2 | 540 / 1,780 | 460 m | 180 |
| Comb 3 | 480 / 1,920 | 440 m | 315 |
| Comb 4 | 440 / 1,960 | 520 m | 45 |
| Comb 5 | 400 / 2,040 | 450 m | 0 |
| Comb 6 | 500 / 1,860 | 550 m | 135 |

Their axes keep 432 to 558 m over a lap, under the line and 30 m of depth and more over
the rim's 600 m floor at their lowest points. Over a lap they hang 222 to 548 m from the
Close eye and 44 to 71 m of drawn height under it, so they stand in the water under the
hulls' rings, where the lanterns stand over them, and left of the vent stand, the
nearest to it at the edge of its light. A 5 m body draws 14 to 35 px there, and 7 to 9
from Home's eye. No two start at one phase,
so no two rise and sink together, and the starts spread the six across that water in the
frame reduced motion holds. Six is the author's count, and the slots are: the Close
frame's water under the rings, between the Harvester's ring and the vent stand, holds
that many 140 px apart and more. They are decoration under every rule of this section,
as the lanterns are. How one is drawn is
[art-direction.md](art-direction.md#a-comb-jelly-is-eight-seams-of-light)'s. The numbers
are TUNABLE in `FREE_WATER_HIGH_LIFE.COMBS` until the owner accepts a frame.

The fry's loop passes 50 m in front of the Close eye, 233 m deep at `(178, 2,168)`, where
a 0.5 m body draws 15 px. A fry school is a ribbon, 14 m long, 3 m across and 2 m deep as
drawn, a body about every metre; over a lap, 288 to 368 of the 480 fry stand inside the
Close frame at any moment. The outer fish cross the water between the Corvette's lamp at
300 m and its pool on the 600 m rim, so at rest a school swims through its beam; 510 to
680 m from the Close eye a 4 m body draws 9 to 12 px, and 6 from Home's. Where a stream's
first school stands when the match starts is authored, as the ray's start is, and reduced
motion holds it there: the fry's at 159 degrees round its loop, 50 m ahead of the Close
eye, and the outer fish's at 90, south of its centre, in the Corvette's beam. Both loops
lie over the outside rim's 600 m floor. They are decoration under every rule of this section: no reaction,
no collision, no tell, the same loop for every client, held still under reduced motion.
The numbers are TUNABLE in `FREE_WATER_HIGH_LIFE` (`packages/shared/src/constants.ts`)
until the owner accepts a frame. How a body is lit there, and the one light a fry
carries, are [art-direction.md](art-direction.md#life-in-the-worlds-light)'s.

**A school before the vent's light (#1856).** *In development, and not accepted.*
[The target's](screenshots/issue-1799/README.md) schools are dark masses against lit
water, and the two streams above read by a light of their own or barely. The third stream
is a mill of outer fish, which carry no light, between the Close eye and the vent stand
below: its loop is centred 300 m from that eye on its line to the stand, and ends 51 m
short of the stand's nearest basalt. All lap long every body on it stands before the
stand's light as that eye sees it, 265 to 338 m out, where a 4 m body draws 18 to 22 px,
and the eye's line through it passes within 58 m of the light's centre, inside its 160 m
reach. A body there hides the light behind it, which is what darkens it against the glow.
It is no black cut-out: the flank it shows still takes the shared rig, the Lid's glow
and a quarter of the stand's pool, less by its height over the floor
([art-direction.md](art-direction.md#life-in-the-worlds-light)). On the software frames
a body reads at 0.65 of the water behind it
([issue-1856](screenshots/issue-1856/README.md)). A silhouette is the aim, and whether
this reads as one is the owner's glance on the named GPU. Two shapes were written for the
loop. **A loop round the stand**, at a 100 m radius, has a fifth of its length before the
light and within those 58 m, so four fifths of its bodies stand elsewhere. **A mill
wholly before the light** is taken. A school is a ribbon 40 m long, so the four fill
160 m of the loop's 214 m, and 57 to 72 of the 120 bodies stand within 40 m of the eye's
line to the light's centre at any moment. The count is this cut's: the target's schools
are hundreds, and 120 is what read as a mass at that size. The loop swims 318 to 392 m deep, under the hulls' 300 m and over
the rim's 600 m floor, 135 m from the Corvette's start. Its south side swims lower than
its north, by up to 25 m either way, which leans the ring down to the right in the Close
frame. Its first school starts at 161 degrees, the loop's nearest point to the Close eye,
broadside across the stand. In that frame the mill stands between the Light Scout's ring
and the Corvette's, and reaches neither. From Home's eye it is 760 to 825 m off, and a
body draws 7 to 8 px. Placement only: no model, material or light is new. The numbers are
TUNABLE in `FREE_WATER_HIGH_LIFE.BACKLIT_STREAM` until the owner accepts a frame.

**A manta before the Close eye (#1867).** *In development, and not accepted. The owner
named [its target](screenshots/issue-1867/README.md) in session on 21 November 2026, a
manta seen from below, and took three calls the same day: the manta is a new model that
High alone stands, it keeps the rim ray's 18 m, and the photograph is committed.* The rim
ray glides where the opening's far eye reads a plan from above, and from the Close eye it
is a chip 900 m off. The target's view is a belly, so the manta glides where the one low
eye of [the three](screenshots/issue-1799/README.md) is under it and close.

| Body | Loop centre, radius, period | Depth | Bank | Start, degrees round its loop |
| --- | --- | --- | --- | --- |
| `env-rim-manta` | `(315, 2,075)`, 70 m, 300 s | 165 ± 8 m | 40 degrees | 130 |

A body banked into its turn shows the outside of that turn its belly, and every loop
here runs clockwise with its centre to starboard. So the loop's centre lies beyond the
manta as the Close eye sees it: 165 m from that eye, so the manta's near side passes
95 m out, over the fry's ribbon 50 m out. There it swims 170 m deep, 14 m of drawn height
over the eye's 233 m, and the eye looks up 8 degrees at a belly turned 40 toward it: it
sees 0.75 of the plan, where a level body would show 0.15. Three shapes were written for
the loop. **The rim ray's bank, 30 degrees** shows 0.62 there. **A level body straight
over the eye** shows a whole belly and is out of the frame: the Close frame's top is 16
degrees over its horizon. **A steeper bank on a loop beyond the body** is taken. The
manta starts 16 degrees short of its near point, 100 m out and coming on, which is where
reduced motion holds it and where a still frame finds it. The eye sees half its plan or
more for 52 s of each 300 s lap. For the rest it turns away, edge on and then back to the
eye, 235 m off at its farthest. From Home's eye it is 643 to 770 m off, where a span
square to the eye would draw 35 to 42 px; at its start that eye, over the Lid, sees a
quarter of its belly past the bank, a pale fleck about 20 px across at the frame's foot.

At that bank a wingtip stands 5.8 m of drawn height off the axis, so its whole body
spans 131 to 199 m deep over the lap, over the outside rim's 600 m floor. Its path
passes 32 m and more from every jelly's loop centre, 18 m clear of a jelly's own 14 m
loop, and 63 m of depth over the fry. It is decoration under
every rule of this section: no reaction, no collision, no tell, the same loop for every
client, held still under reduced motion. Its slot is the last in High's list, so every
slot before it keeps its index. The numbers are TUNABLE in `FREE_WATER_HIGH_LIFE.MANTA`
until the owner accepts a frame, and [glide.mjs](screenshots/issue-1867/glide.mjs)
prints every figure here from them. How it is lit, its skin and its stroke are
[art-direction.md](art-direction.md#a-manta-shows-its-belly)'s.

**A far bloom over the bowl (#1859).** *In development, and not accepted.
[issue-1837](screenshots/issue-1837/README.md) offered it with its frames and did not
build it. The owner took its count, its loop and its procession in session on
22 November 2026, on the frames of a first cut.* From Home's eye the bowl beyond the
fleet was empty water. At High a river of 120 lanterns drifts over it, each a whole
`env-drift-jelly` as the five by the fleet are
([art-direction.md](art-direction.md#a-far-bloom-of-lanterns)). Its slots are the last
of High's list, so every slot before them keeps its index, and Low stands none.

| River | Loop centre, radii east-west and north-south, period | Depth | Lanterns, and the share of the loop they fill | Station: across, depth |
| --- | --- | --- | --- | --- |
| The far bloom, `env-drift-jelly` | `(2,150, 1,930)`, 950 m and 330 m, 13,500 s | 190 m | 120 over 230 degrees of its phase | 60 m, 40 m |

Its loop is an ellipse along the bowl's north half, the one loop of this fixture that is
no circle, clockwise seen from above as every loop here is. The band the river sweeps in
a lap lies over `x=1,120..3,177` and `y=1,545..2,364`: every cell under it is the bowl's
or the pocket's, open to the Lid over a floor of 1,500 m or more, south of the garden's
row and north of the southern wall. A lantern whose loop the ground under it shoals or
roofs over keeps its slot and is not drawn, as any slot here. The river hangs 150 to
230 m deep, a lantern's whole bell over the hulls' 300 m, and its band passes 500 m in
plan from the Light Scout's start at its nearest.

**The loop is an eddy on the stream's south flank** (the author's reading of the
owner's call in session on 22 November 2026, to think of the ocean's currents and its
turbulence). The fixture writes one current, east, which the kelp leans to (No rows,
above), and the kelp stands in the garden, along the bowl's north side. The reading: the
stream runs over the garden, and the water over the bowl south of it is slower. Where a
stream runs beside slower water the two shear, and the shear on the south flank of an
eastward stream turns clockwise seen from above, fastest beside the stream. So the eddy
turns as every loop here does, its north side running east with the stream and its
south side coming back west, slower. Nothing walls it in: the lanterns hang 150 to 230 m
deep, over the garden's 400 m floor and the bowl's alike, where the water is one open
layer. That the loop closes is the author's choice for the frame, since a river that
ran east with the stream and was gone would leave the bowl empty behind it or have to be
fed. Three things make it an eddy and no ring turning:

| What | Constant | Value |
| --- | --- | --- |
| How much faster than the lap's own pace the stream side runs, and slower the far side | `BLOOM.EDDY.SKEW` | 0.3 |
| How much wider the far side is, and narrower the stream side | `BLOOM.EDDY.SPREAD` | 0.4 |
| How far a lantern wanders across the flow, either way, metres: the least and the most | `BLOOM.EDDY.WANDER_M` | 8, 20 |
| How many times a lap it wanders: the least and the most | `BLOOM.EDDY.WANDER_LAPS` | 9, 22 |

The loop is 4,261 m round, so a lap in 13,500 s is 0.32 m/s on the average, against a
drifting jelly's 0.31 m/s on its own loop. On the river's own line that is 0.57 m/s at
the loop's north point and 0.32 at its south, and 0.15 round its two ends. A lantern
keeps up to 57 m off that line by the north point and up to 104 m by the south. It
wanders across the flow once in 10 to 25 minutes, a whole number of times a lap, so a
lap brings it back to where it began.

A lantern stands along the river at a fixed seeded place, and where that is is the sum
of two draws, so the river is thickest at its middle and thins to nothing at its head
and its tail, 115 degrees of the lap's phase either way. Its middle starts at the loop's
west end, `(1,200, 1,930)`, the end nearer Home's eye, which is where reduced motion
holds it and where a still frame finds it. The river is a procession: every lantern
heads where the next second carries it, its strands trailing. Its station across the
flow, up to 60 m at the loop's ends, its depth, up to 40 m off the river's 190 m, its
wander and its lean are each a draw of its own. A lantern of the river keeps its depth
all lap, where one of the five rises and sinks 10 m, and leans up to 12 degrees either
way, where the five lean into their turn. It hangs by its bell's mid-height, 2.76 m over
its lowest lobe's tip, as they do.

What each camera holds of it when the match starts
([river.mjs](screenshots/issue-1859/river.mjs) prints every figure here):

| Camera | Lanterns in the frame, of 120 | How far off | A bell, 6 m across | What the water leaves of its light |
| --- | --- | --- | --- | --- |
| Home | 92 | 1,318 to 2,453 m | 3.6 to 6.8 px | 0.16 to 0.59 |
| Close | 114 | 992 to 2,156 m | 4.1 to 9.0 px | 0.08 at most |
| Low | 120 | 1,289 to 1,994 m | 4.5 to 6.9 px | 0.52 to 0.76 |
| Survey | 120 | 10 km | 0.9 px | 0.91 |

It drifts and Home's eye does not: after 10 minutes that eye holds 98 of them, after 30
minutes 98, and after an hour 55, the river's middle by then far along the loop's north
side and the lanterns that eye holds 1,924 m off at the median. It is decoration under
every rule of this section: no reaction, no collision, no tell, the same river for every
client, held still under reduced motion. The numbers are TUNABLE in
`FREE_WATER_HIGH_LIFE.BLOOM` until the owner accepts a frame.

**High's own vents (#1837).** *In development with the same look step, and not accepted.
The owner chose an authored stand on the rim in session on 20 November 2026, against
frames from another map and against leaving the vents out.* At High the fixture stands
one vent stand, by authored slots as its plants are: two `env-vent-chimney` and three
`env-vent-basalt`, the Thermal Veins' retained kit, each at scale 1. Low stands none of
it.

| Prop | Slots: map x / y, heading |
| --- | --- |
| `env-vent-chimney` | 562 / 2,018 at 20 degrees; 582 / 2,042 at −35 |
| `env-vent-basalt` | 544 / 2,036 at 10 degrees; 598 / 2,016 at −60; 570 / 2,064 at 130 |

Props only. The cells under them stay Coral Ruins at 600 m, so no floor, PF or route
moves, the rim stays a rim, and a hull passes a chimney as it passes any prop: nothing
here blocks, hides or tells (§2). The stand is 109 m north-west of the Corvette's start
and 164 m south of the Light Scout's, on the floor 300 m under both. From the Close eye
it is 421 m off, between those two hulls, and its light reaches both their rings.
[art-direction.md](art-direction.md#the-vents-at-work) has that reading, how the slot was
found and what a chimney breathes there at High. The slots are TUNABLE in
`FREE_WATER_HIGH_VENTS` (`packages/shared/src/constants.ts`) until the owner accepts a
frame.

**The wildlife choice is an explicit, narrow extension of the bible.** Keeping only
the existing stipples would preserve today's presentation but not the requested close
wildlife. Converting gameplay fauna into public fish would disclose hidden state and is
not an option. The chosen alternative is public microfauna decoration, only in this
opt-in fixture, independent of the bestiary's simulated roster. These are descriptive
asset names, not new gameplay species; no statistics or ecological powers are implied.
The ray is the one large body of Low's list, added on #1777 when the opening frame could
read none of the four small ones: 18 m across, under a third of the smallest Sounder, a
grazer of the water and nothing of a hunter. The manta (#1867) is High's, at the same
18 m and under the same line.

| New asset slug | Canonical rendered size | Maximum instances / triangles per instance | Placement and motion |
| --- | --- | --- | --- |
| `env-rim-crab` | 2 m across | 32 / 400 | Garden floor, the clearing's included; slow, closed crawling loops inside its public patch |
| `env-shoal-fry` | 0.5 m long | 6 shoals of 24 / 180 | Garden, 100..300 m depth; fixed looping schools, never proximity scatter |
| `env-outer-fish` | 4 m long | 16 / 600 | Open bowl, 700..1,000 m depth, and the garden clearing, 200..300 m; slow closed swimming paths |
| `env-deep-fish` | 2 m long | 26 / 400 | Deep pocket, 1,900..2,100 m depth; sparse photophore points |
| `env-rim-ray` | 18 m across | 1 / 800 | Outside rim south-east of the start, 200..300 m depth; one slow closed glide, banked 30 degrees into its turn |
| `env-drift-jelly` | 6 m across its bell | 5 / 700 | Over the outside rim by the start, 150..210 m depth, at the High graphics quality alone; each alone on one slow closed drift |
| `env-rim-manta` | 18 m across | 1 / 4,000 | Over the outside rim before the Close eye, 150..180 m depth, at the High graphics quality alone; one slow closed glide, banked 40 degrees into its turn |
| `env-comb-jelly` | 3.5 m across, 5 m tall | 6 / 700 | Over the outside rim before the Close eye, 432..558 m depth, at the High graphics quality alone; each alone on one slow closed loop, leaning 8 degrees into its turn |

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
nothing. The kelp retains `flora-biolight` and its licensed sway. That is Low. At the
High graphics quality a schooling fry carries one point of world light, in a token of its
own (High's own life, above), and its body is still no emitter: its GLB is unchanged. Each
of a deep fish's six seats carries a point of that token there, and no dot of the
public-life channel
([art-direction.md](art-direction.md#life-in-the-worlds-light), #1857). A
jelly is drawn there as a lantern, in a token of its own
([art-direction.md](art-direction.md#a-jelly-is-a-lantern)): a lit membrane over strands
of beads of light, which are the renderer's and not its file's.

Gameplay fauna remain unchanged: public Lampfry/Tetherjelly retain their established
disclosures and stipples; classified animals retain species-shaped dots, with no
full-detail mesh in the enemy-track path. The fixture's default gameplay-fauna list is
empty, explicitly authored rather than a global population change. Its disclosure test
variant adds a server-only existing Hollow and an opposing observer in the deep pocket,
using normal detection; decoration must be byte-for-byte independent of that variant's
hidden state. Neither extra participant is exposed by the study entry.

**Shape lane.** The five new slugs were approved in #1711 and #1712 before integration,
and the ray's answers the same gates in the pull request that places it (#1777). So does
the jelly's (#1837): its designer and its reviewer are separate agents, and the reviewer
passed the model. The manta's (#1867) answers them the same way, and the comb jelly's
(#1858).
Environment props have no faction: each shape PR authors
**ENV STYLE + one prop-table row** in [asset-prompts-3d.md](asset-prompts-3d.md) Block 4, including
Footprint, Height, Tris and Light, plus its script, GLB, intake report,
neutral-light review, contact sweep and separate hull-reviewer before integration.
Use that document's design model of record; the contract author does not author or
approve these shapes.

Block 4 currently describes stone, coral, kelp and crystal standing on the seabed.
The #1711 shape PR must first add the scoped public-microfauna variant: the crab may
stand on the floor, while the three swimming slugs may be suspended in the column.
Retain its no-faction, low-luminance, material-count and intake constraints; the exception
is for these eight decorative forms, the ray under its own large-body clause, the jelly
under its drifting-body clause, the manta under its own and the comb jelly under its
deep-body clause, not gameplay fauna or other floating props.
All eight rows carry **Light `none`**, including `env-deep-fish`: its GLB has no emissive,
and runtime supplies the separately budgeted rung-5 photophore dots described above, or
at High a point of world light a seat. The
jelly's six seats are dark facets too, and are lit at High alone, as world light. So
are the comb jelly's eight comb rows, dark ridges in its file.
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
| Toggle flight | Retired by #1775: NAV enters flight. Entering retains orientation and moves the eye only if needed for legal clearance, gliding it there ([free-camera.md](free-camera.md) §4) |
| Look | `Shift` + middle drag or a right drag, local yaw/pitch; no pitch limit |
| Translate | Middle drag in camera right/up; wheel along camera forward; `Shift` + wheel moves world depth by 150 m |
| Keyboard navigation | Rebindable `F9` or a focusable NAV latch, which enters flight; while latched, W/S forward/back, A/D left/right, R/F local up/down, Q/E roll, arrows yaw/pitch |
| Leave navigation | `F9`, NAV button, or `Escape`; release every held motion key, without sending an order, and glide back to the orbit that NAV left |
| Recover | `Home` always leaves NAV and flight, zeroes roll, restores north/55 degrees/seabed focus at the last command focus and saved orbit dolly |

NAV is a visibly labelled input mode, **CAMERA NAV — FLEET SHORTCUTS SUSPENDED**, not a
simulation pause. It consumes its keys before fleet shortcuts and leaves existing orders
running. It suppressed clicks on the world as orders until #1775 made it the only way
into flight; now it takes the keys but not the mouse, so the keys fly while clicks on the
world, the card and the scopes select and order through the rolled view
([free-camera.md](free-camera.md) §4, "The study's camera feel"). Outside NAV the fleet bindings,
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
Escape in the preview's metre field follows this same chain: leave NAV if active,
otherwise cancel the whole preview, not merely blur the field; the press never also
opens the menu.

Initial translation speed is 200 rendered metres/s, adjustable in Controls over
50..800; keyboard rotation is 60 degrees/s. These are camera-only TUNABLEs, not unit
speeds. Normalise simultaneous translation axes, use elapsed time, clear input on blur,
menu, mode exit and disconnect, and do not add momentum or automatic camera sway in
flight. The orbit's eased steps, coasts and glides
([free-camera.md](free-camera.md) §4, "The study's camera feel", #1775) are the orbit's
alone. No command is generated by a camera gesture's release. Edge scroll is disabled
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
then the ordinary camera (orbit or flight). Outside NAV, `Shift` + wheel over the world edits the pinned
preview's depth and does not move the camera. Inside NAV it moves camera depth and
leaves the preview unchanged. Over the world, unmodified wheel keeps the ordinary
camera action: orbit dolly or flight travel.

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
| Painted map and routing tests | Exact sample intervals above; shallow and cut routes; 300 m cannot enter F; on shipped maps, structure footprints and planar separation remain unchanged (§9 lifts them on the crater) |
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
gate 6's 150 draw calls and DPR of at most 1.5. At the Low graphics quality this study's
frame cap is 720,000 triangles
over every pass rather than gate 6's 400,000, by the owner's decision on #1712
(2 November 2026): the kelp forest is a development slice for map design patterns and may
spend what a shipped map may not; shipped maps keep 400,000. Reserve at most 30 calls /
600,000 triangles for all props and decorative life of the Low list together, raised from 400,000 by
decision 5 on #1748 (§9). The authored list totals at
most 569,728 triangles: 56 new kelp stands at at most 9,000 each (504,000), 16 retained
clusters (6,208), wildlife (59,520: 58,720 since #1771, from 31,680, and the one rim ray's
800 since #1777), and zero other dressing.
The remaining reservation is unused, not permission to fill the bowl. Counts are the
opening list's contract; per-model triangle limits remain ceilings. Share instanced
batches per template/material; no per-fish draw or further relaxation of this study's
caps, 720,000 at Low and 900,000 at High (below).

**At the High graphics quality the frame cap is 900,000 triangles** over every pass, by
the owner's decision in session on 20 November 2026 (#1856). High stands life and a vent
stand that Low does not (§5): its frame stood at up to 720,318 after #1837 and at up to
761,358 with #1856's school, at up to 764,047 with #1867's manta, at up to 835,327
with #1859's river of 120 lanterns, and at up to 851,455 with the ground #1891
draws past the map's edge. #1858's six comb jellies add 4,032, each 672 drawn
triangles without its mouth, so it stands at up to 855,487: a sum on #1891's reading,
since no survey frame was taken with them. Low keeps
720,000, and gate 6's 8 ms of GPU time
still binds High's frame. The 600,000 reservation above binds the Low list alone, by the
owner's decision the same day, against binding High's list too and against a second
reservation for High. It is what `packages/frontend/test/freeWaterDecoration.test.ts`
sums: 551,850 by the registry's budgets. High's list sums to 763,967 by the same
budgets, to 759,923 before #1858's comb jellies, to 688,643 before #1859's river, to
685,954 before #1867 and to 644,914 before #1856. What High alone stands is counted against the
frame's 900,000 and has no reservation of its own.

Record actual whole-frame calls, triangles, instances, texture/target bytes, hardware,
and gate-6 unpaced/queued GPU timing at DPR 1 and 1.5. Exercise motion, not only stills.
CPU frame intervals and software rendering are not GPU evidence; unavailable hardware
leaves that criterion open. No new "AAA" score, beauty score or budget beyond the one
above replaces these checks.

## 8. Follow-up boundaries

| Child | One increment's scope | Prerequisites / finish line |
| --- | --- | --- |
| #1706, six-degree camera | Flight, navigation ownership, recovery, projection/scope/audio consequences; no new models | Merged #1705 contract; real-client movement/roll and non-target evidence |
| #1707, remaining independent destination | Fixed-depth preview, invalid picking, queue/replay intent; direct S/D already shipped | Merged contract; integrate and exercise with #1706's rolled camera before closing |
| #1712, dense kelp stand asset | One new `env-kelp-stand` shape; retained clusters unchanged | Merged contract, owner-applied shape routing; approved script/GLB and independent intake/review |
| #1711, public microfauna kit | Scoped ENV STYLE amendment and four prop-table rows/shapes, no behaviours or stat blocks | Merged contract, owner-applied shape routing; separate model gates for each, no runtime promotion |
| #1713, integrated crater fixture | Authored ground/spawns, gated entry, approved dressing and decorative motion, full evidence matrix | Camera, destination and all five assets merged; no closure on a registry-only or standalone scene |

Asset authorship and runtime integration are different jobs. A shape author may not
approve their own bake. The integrated child may not invent missing models or change
their scale to hide a budget miss. #1694 stays open until the integrated acceptance
matrix is satisfied, not merely until this document or the camera lands.

## 9. Feel pass: the approved look target

**Status: decisions 1–7 approved by the owner on #1748, 4 November 2026, and decision
4's clause for #1774 in session on 7 November 2026, recorded in #1787, with its wandering
edges in session on 10 November 2026.** Three parts
below are the author's, written to carry those decisions out, and await the owner's
review on the pull request that adds this section: the kelp flanks under decision 5, and
the #1753 and #1754 designs under decision 6. The integrated slice passed §7 and still
failed the owner's reading of it: it does not feel like an AAA underwater RTS. The frame
the owner judged is [owner-baseline.png](screenshots/issue-1748/owner-baseline.png), a
steep north-up orbit over the whole bowl; its pose was not recorded. It shows the rim and
the southern wall as boxes under contour ink, no water between the eye and the floor, the
kelp garden as thin strips along the north edge, and the decorative-life legend boxed
over the top of the world. §7 names no feel, by design, so this section is the target the
pass builds against. It changes no gameplay ground, cost, stat or disclosure, and tunes
nothing for balance.

**Overruled in part on 11 November 2026**, by the owner in session
([art-direction.md](art-direction.md#two-layers-two-laws)). Decision 1 stands: no sunlight
below the Lid, so no sunlit shafts and no caustics. At the High graphics quality five
things are released: light shafts from the world's own lights, the water wearing its
biome's hue, a new full-screen pass, glow on terrain, and the retained 5–10% ground. Effects that rotate with
the projection stay refused. This section stays the record of the study as built, which is
the Low quality's.

The owner parked the study's re-acceptance the same day. The merged ground of #1774 stands
and is judged again at High, against
[the target frame](screenshots/issue-1799/README.md). The two-player fight, #1754, waits
until a look is accepted.

| Decision | Taken | Rejected | Child |
| --- | --- | --- | --- |
| 1. Light | Stay inside the canon: no sunlight below the Lid | Sunlit water in the manner of the owner's ocean reference, which would first amend [world.md](world.md) and art direction's "Shallow caustics" | Every child |
| 2. Opening camera | A low orbit behind the fleet at hull depth | Today's opening at Home pitch from 2,600 m; opening in flight, which §6 rules out by keeping the bounded orbit as the default | #1752 |
| 3. Water medium | Reach and near-eye particulate, inside the existing ramp | Light shafts, caustics, hue in the water, or a new full-screen pass | #1749 |
| 4. Crater walls | Reshape the drawn cell transitions, adding nothing at a cell centre; since #1774 rounded and wandered, with the study's ink on them | Changing the rim's biome, which changes its PF; re-cutting the literal; keeping the ink on the cell edges under a rounded floor; leaving straight runs ruled | #1750, #1774 |
| 5. Kelp | The prop reservation may rise to 600,000 triangles; the flanks fill to the clearing, the author's call pending review | Scaling stands up, which breaks canonical scale; stands in the clearing, which breaks §5 | #1751 |
| 6. HUD and vertical command | A one-line legend and the camera panel by the console; vertical instruments, the author's design pending review | Leaving vertical reading to flight | #1752, #1753, #1754 |
| 7. Iteration cap | Five rounds per change, every loop, held in `dev-loop` | The default three | Every child |

Order: #1749, #1750, #1751 and #1753 in any order, one at a time where they share files;
then #1752, which captures the re-acceptance set; then #1754, after that re-acceptance.

### Light: an ocean without a sun

The owner's references describe command freedom and inhabited water, and §1 already
refuses them as a licence to add sunlight. The Lid is milky and the light under it comes
from everywhere above and nowhere in particular
([art-direction.md](art-direction.md#shallow-caustics--spec)). So the ocean is built from
what this one has: water graded by depth, drifting snow at the eye, hull and kelp
silhouettes against the brighter water above them, the five world-light families, and the
deep fish's public-life photophores (§5). The aim is dread rather than spectacle, and
depth stays luminance.

### Opening view (#1752)

Before #1752 the study opened at Home pitch, 55 degrees down from 2,600 m (`HOME_DOLLY_M`)
over the fleet's centroid on the west rim: the opening row's before frame below. Entry
now opens the ordinary orbit, not flight. Its focus sits at the hulls' 300 m depth on the
line from their centroid toward mark A, far enough ahead that the hulls fall in the lower
third, since the orbit aims at its focus. It is pitched 15 degrees, inside the 10–88 degree
band, and heads about 34 degrees east of north, toward A, which is `yawDeg` −34 in the
code. The focus offset and the dolly are TUNABLEs chosen against the opening row
(`FREE_WATER_OPENING` in `packages/shared/src/constants.ts`): the focus 300 m ahead of the
centroid, and a dolly of 1,200 m. The eye is then 1,110 m above the Lid, as the Home frame's
is about 9,100 m above it: the field of view is 40 degrees and the console takes the bottom
quarter of the window, so a nearer eye at this pitch loses the hulls under the console,
and a focus nearer the centroid lifts them to the centre. At this dolly the water reaches
about 1,800 m (§9, Water medium), so the hulls, about 900 m off, read through it, and the
garden's canopy stands beyond them at the top right of the frame. Home is unchanged and still restores north, 55
degrees and the seabed, and keeps this dolly and place as it keeps any.

The legend is one line with no box, in the bottom-right corner, which the study leaves
free because it runs no mission log: on the hint line's row, right-aligned, in the hint's
own dim type, and the hint yields to it alone, trimming a clause at a time as it does for
a narrow window; the panels over the water move no hint. NAV and HOME, with FLIGHT until
issue #1775 retired it, stand beside the console's command block, on the hint
line above it and on the block's left edge, which the shell reads off the console's own
layout, keeping their labels, focus order and shortcuts. The rest of the panel stands with
them and keeps its conditions: the EYE and world-up readout and NO CAMERA CLEARANCE in
flight, and the NAV status line and motion buttons in NAV, growing upward over the water
rather than into the console. The opening asks nothing of the survey ink: it already fades
into the water with the ground under it.

### Water medium (#1749)

Two permitted changes, each study-only and adding no texture or target memory (§4):

1. **Reach.** A study-only curve for how far the water lets you see, in
   `packages/frontend/src/game/water.ts`. The ramp's stops and its single hue stay
   ([art-direction.md](art-direction.md#reading-the-water)).
2. **Particulate.** Denser, nearer marine snow with parallax at the eye, in flight and
   orbit alike.

This brief licenses no new full-screen pass. If reach and particulate cannot meet the
garden-close and low rows below, #1749 stops and puts a pass to the owner, with its
options and cost.

Prohibited: light shafts, caustics, a sun, hue in the water, an effect that rotates with
the projection, and glow on terrain. Retained: the ground's 5–10% luminance, and gate 7's
rule that readability outranks richness ([graphics-standards.md](graphics-standards.md)).

### Crater walls (#1750, #1774)

From a low eye the boxes are the 250 m cell transitions, not the coral texture. Three
mechanisms draw them:

- **Rock.** The southern wall is solid, floor 200 m and ceiling 3,000 m in the map literal,
  so it is drawn as rock: `rockSurfaceDepthM` in `perspectiveTerrain.ts`, its crag from
  `ROCK_RELIEF`.
- **The roof.** The cut's roof is stone that `passages.ts` raises over the passage.
- **Ramps.** Between open cell centres the floor is the bilinear blend of the authored
  depths (`authoredFloorAtM`), so the rim's 600 m and the bowl's 1,500 m meet in straight
  slopes along the cell grid.

The study may reshape the drawn floor, rock faces and roof between cell centres, so that
cell edges read as eroded rock. The override adds nothing to the authored floor at a cell
centre, a solid cell stays rock at its centre, and the drawn floor stays between the
shallowest and the deepest of the cells within a cell of it.
The flight eye already sweeps the drawn triangles, so its clearance follows the override,
and a test in #1750 proves it. No new model: rock props would be a separate `shape-work`
child.

The first pass, #1750, wandered each transition and gave each face a foot and a lip, but
kept every edge on its grid line. From the survey dolly the owner still saw squares on the
floor on 6 November 2026 (#1774). The survey ink drew the cell edges, by the rule this section then
kept. The bowl's ramps climbed a cell at a time. Coral Ruins' blockiness, a 60 m relief
sampled on a 90 m grid (`BIOME_RELIEF` and `BLOCK_M` in `seabed.ts`), terraced the whole
rim in blocks. So since #1774 the study draws its cells rounded (`roundedCells.ts`), and
its ink with them:

- **Rounded edges.** Each kind of ground, rock or one biome at one floor and ceiling, is
  blurred as a share of the map, the shares summing to one, and the kind with the most
  holds each point. The blur spreads 175 m, so a one-cell jog in the staircase reads as
  the curve it stairs, a corner rounds, and where three kinds meet the junction settles
  into a Y rather than one kind spiking into the others. A licence of 115 m, inside half a
  cell, bounds how far an edge moves. Every cell centre stands at least 40 m inside its
  own kind: where the rounding would carry an edge nearer, the edge bends round the centre
  within 110 m of it. Rounded, the bowl's rim lies within 35 m of its authored circle,
  where the cells stair up to 165 m off it.
- **Wandering edges.** Rounding moves a straight run of cells nowhere, so the garden, the
  wall and the pool kept ruled sides and read from the survey dolly as boxes with their
  corners off. The owner chose to wander them, in session on 10 November 2026. The
  rounded ground is read through a slow warp of the plan, 75 m at most, bowing over about
  800 m and broken by a finer 340 m. Every kind reads through the one warp, so an edge
  moves as one line. Its direction is a fixed field of position and its reach is read
  from the cells, so it tells nothing the cells do not. It has only what the licence has
  left: the whole 75 m on a straight run, less wherever the rounding has already moved
  an edge, so no edge moves 115 m. Every centre still stands 40 m inside its kind. The
  warp's seed was picked for this one map: the wander alone carries each long side of
  the garden, the pocket and the bowl across 40 m or more, and the bowl's rim up to
  56 m off its circle. Within 250 m of the roofed cut the wall's and the pool's sides
  stay ruled or nearly, by the hold below.
- **Ramps and faces.** The floor climbs across the rounded edge as a scarp about 80 m
  wide, and a rock face rises from a gentle foot to a steep lip. Within half a cell
  of the roofed cut nothing rounds or wanders, easing in over the next half, because the
  roof's curtains stand on the cell edges; each jamb keeps its step on them.
- **Mesh.** The study draws its ground at 8 vertices a cell, one every 31.25 m, where a
  shipped map keeps 4 ([three-layer-ocean.md](three-layer-ocean.md) §5). An 80 m scarp
  that curves across vertices 62.5 m apart saw-tooths, in its lip and in its isobaths. The
  finer mesh adds 25,984 triangles to a study frame, inside §7's 720,000.
- **Terraces.** Coral's blocks become benches cut in the relief's own depth, so their edges
  wander with the ground rather than marching on the 90 m grid. Every shipped map keeps
  the blocks.
- **Ink and fills.** The coastlines run where the rounded ground changes kind, the isobaths
  contour its floor without the relief, and the fills ease across its edges
  ([map-visuals.md](map-visuals.md) §4, the study's clause). The cells stay the truth the
  simulation plays on and the scope draws.

**At the High graphics quality** the crater is judged again from the survey dolly (#1891),
where it still read as built: panels with outlines, a black pocket and a square edge. That
look is in development and moves no ground. The water over each floor takes its light,
each wall hides the Lid's glow from the floor under it, and the survey ink fades with the
ground it lies on ([art-direction.md](art-direction.md#the-crater-from-above)). The
ground also runs on 2,000 m past the map's edge and falls away to the map's floor: the
edge's own ground read on, with no cell under it, in 15,904 triangles of High's frame
(§7). The roofed cut keeps its ruled sides, by the hold above.

### Kelp (#1751)

The prop reservation rose from 400,000 to 600,000 triangles in #1751; §7 carries the
figure. The study's frame cap of 720,000 triangles, gate 6's 150 calls, the prop layer's
30 calls and DPR of at most 1.5 are unchanged. At the per-model ceilings, 600,000 admits at
most 62 stands of 9,000 beside the 16 retained clusters (6,208) and the wildlife (31,680),
as it stood before #1771.

More stands fill the garden's flanks to the edges of the clearing, north and south, so the
clearing reads as a cut through one forest rather than a lane between two strips. The
clearing row `y=1,000..1,250`, the roofed cut and the deep pocket stay bare (§3, §5). The
owner's approval said stands under the route, which would break §5 and §3's clear row;
filling the flanks instead is the author's call, pending the owner's review. The garden
floor is 400 m and a stand is 40 m tall, so the fleet at its 300 m exercise depth looks
down on a canopy 60 m below it. Hulls among the stalks would need taller stands, which is
`shape-work`, or a deeper exercise, which changes §3; neither is taken here.

The list §5 carries is one forest of 56 stands. Before it, the 40 stands stood one stand
deep in rows at `y=625`, `875` and `1,375`, the two nearest 65 m back from the clearing:
two strips north of it and a half-row south, which is what the owner's frame showed, and
the south row's envelopes already reached the scarp into the bowl. #1751 stood the 56
three rows deep north of the clearing and one row deep south of it, every row at one
125 m pitch, so the canopy was continuous on each flank and the clearing the one gap in
it. The south flank cannot be deeper: its row of cells has about 125 m of tread before
the rendered floor drops toward the bowl, and a stand is one rigid instance, so a second
row there would float over the drop and bury itself in the scarp (measured in #1751's
review). The forest ends short of the garden's east and west edges, whose cells ramp to
the rim and the bowl. Two alternatives were set aside then: two rows on each flank,
mirrored about the clearing, whose south outer row stood on the scarp; and four full rows,
which is 64 stands and over the reservation. The 16 retained clusters, which stood among
the south flank's stands, became the forest's fringe along the garden's north edge, where
the stands do not reach. Six stands' worth of the reservation stayed unused, and #1771's
added life spends three of them (§5, Life in the frames).

The owner's re-acceptance of 6 November 2026 read those rows as planted (#1773). A stand
is 120 m long and 69 m wide, and every one faced down-current with its length along its
row, so the forest drew as four strips with lanes about 55 m wide between them. §5 then
cleared each stand by a 120 m disc kept inside its own 250 m cell, which left every row at
most 6 m of play north or south. Since #1773 the same 56 stand where a seeded anneal from
those rows left them, cleared by their outlines and held to §5's No rows. Four of the
south row's fourteen moved north, the owner's split: 46 north of the clearing and 10
south, so no lane runs through the north flank, the south band opens four gaps instead
of reading as one line, and the clearing is still the one cut through the forest. The
clusters' fringe is scattered the same way. Among the other ways weighed with the owner
on #1773: keeping each outline inside its cell, which drew the cell grid as empty seams;
holding each stand within 40 m of its row slot, which left three wavy rows; fewer stands
under the discs, which gave up the fill above; any heading, which turns each stand's lean
and fronds its own way; and keeping fourteen stands south, a band with no gap in it.

### Vertical command (#1753)

This is the author's design for the owner's amendment to decision 6, pending review. A
three-dimensional order is two two-dimensional readings. The north-up scope already picks
a plan position; a section scope picks a depth. In the world, a foot ring marks where
every hull stands against one plane, and no line is drawn under or over a hull.

- **Command plane.** The lead selected hull's depth, which MOVE 3D already arms with
  (§6). With nothing selected it is a raised focus's depth; with the focus on the seabed
  there is no plane and no foot rings, as [free-camera.md](free-camera.md) §4 says of a
  seabed focus.
- **Foot rings.** Each own hull and each Tier 3+ contact marks the plane with a ring at
  its plan position, in the faction's hue. A hull on the plane wears its ring; one off it
  stands over or under it, and the section scope, which draws the plane and the hulls
  against the column, shows which at any camera angle. A Tier 2 contact carries no depth,
  so it has no ring, and none is inferred.
- **No altitude lines.** No line joins a hull to its ring, and in the study no hull,
  structure, shot or live track hangs on a plumb: each keeps its ground shadow alone.
  The owner asked on 6 November 2026 for the grey lines under the hulls to go
  (#1772). An order's ring and the MOVE 3D preview keep their lines to the ground
  ([ui-ux.md](ui-ux.md) §9), since they mark where a hull is sent rather than a hull.
  Shipped maps keep the plumb ([art-direction.md](art-direction.md), "Depth is drawn,
  not implied").
- **Section scope.** Beside the north-up scope, a vertical slice along the camera's
  horizontal heading through the command focus, as wide as the scope's range. It draws
  the public floor and roof profile, band hairlines at 400 m and 1,800 m, the thermocline
  at 1,200 m in passive cyan, own hulls and Tier 3+ contacts at their depths, and Tier 2
  contacts as ticks spanning the public water interval, marked DEPTH UNKNOWN. At a
  vertical gaze it holds the last heading and says so.
- **Depth picking.** With MOVE 3D pinned, a click in the section sets the destination
  depth: the alternate depth picker, as the north-up scope is the alternate plan picker.
  The preview's rules in §6 apply unchanged.
- **Edge marks.** An earned contact outside the view marks the screen edge. A Tier 3+
  contact says ABOVE or BELOW, with its metres to the plane. With no plane, as after Home,
  it gives the depth in metres it already carries, rather than falling back to bearing
  only. A Tier 2 contact marks its bearing only; a Tier 1 contact marks nothing, since its
  report carries the listener's own position. Nothing behind the eye is mirrored.
- **Looking up.** In the study only, the orbit's SPEC pitch band
  ([free-camera.md](free-camera.md) §4, 10–88 degrees) widens to −60–88. The commander
  can then look up at the water over the fleet while staying in the orbit around its
  focus, with Home and the focus plane's orders unchanged, without entering flight. The
  eye's 25 m clamp raises the eye rather than shortening the dolly, so the full band is
  reachable only at close dollies where the floor lies about 1,000 m or more below the
  focus: for a 300 m focus, over the bowl, the pocket and the exit pool. Over the garden's
  400 m floor a 300 m focus allows only a few degrees of look-up. §4 stops at 10 degrees
  because range rings turn edge-on there; within 10 degrees of level they stay that
  unreadable, so the section scope carries range in that band, as a scale along its top
  edge. Home still restores 55
  degrees, shipped maps keep 10–88, and #1753 proves the band at a bowl pose.

No new order, wire field or simulation change. Everything drawn comes from own state,
public terrain or a contact the client received.

Shipped in #1753 as [ui-ux.md](ui-ux.md) §9 records it, with two calls taken in the open
there: the section scope is a console block beside the plan scope, of the scope's own size,
which at 1,440 px costs the fleet block; and every own hull and contact is placed on the
section by its distance along the heading, while the ground drawn is the slice through
the focus alone. The band is `STUDY_PITCH_MIN_DEG` in `PerspectiveView.ts`
([free-camera.md](free-camera.md) §4, "Looking up in the study"), and the instruments'
frames are in `docs/screenshots/issue-1753/`. #1753 drew each foot ring at the end of a
stalk, a hairline from the hull, solid above the plane and dashed below; #1772 took the
stalks and the plumbs off, and its frames are in `docs/screenshots/issue-1772/`.

### Toward a vertical multiplayer match (#1754)

This is the author's design for the owner's end goal, pending review: a match where
players attack from above or below each other's units. The crater already stages one: the
garden on the Shelf, floor 400 m; the bowl in Mid-Water, to 1,500 m; the pocket in the
Abyssal, to 2,400 m; and the thermocline at 1,200 m deciding who hears whom. The weapons
already argue vertically ([systems-combat.md](systems-combat.md) §8). A depth charge must
cross a band; it falls fast and loud, and rises at a third of the speed with three times
the warning. A torpedo implodes below its launcher's PR, and crush-baiting is intended
play, with its warning.

Issue #1754 seats a second player and tests that with existing weapons only. It succeeds
when each player can tell from the instruments alone which band a Tier 3 enemy holds,
which band a charge must cross, and when an order carries a hull below its PR, without
flight.

Three retained limits from §2 shaped that fight: planar separation, routes planned at
the current depth, and structure footprints that block every depth. The owner lifted all
three for the crater on 28 November 2026, in session on #1754. Each is a mechanic about
depth, and each holds on the crater's ground only, in both its one-seat study and the
two-seat fight. A shipped map keeps §2's limits until its own issue amends
[systems-depth.md](systems-depth.md) §2 first. No new weapon, and no balance tuning.

- **Separation in three dimensions.** Two hulls overlap only when the straight-line
  distance between them, depth included and in true metres, is under the sum of their
  radii. A hull can then hold station directly over or under another. The push stays in
  the plan, just far enough to clear the pair in three dimensions, so a hull's depth
  still has one owner, the depth system, with its rates and its noise. The other option,
  pushing along the axis between the two, would move a hull's depth without an order.
- **Routes that climb and dive.** A hull whose straight course is blocked plans in three
  dimensions over the terrain's one water interval per cell. It enters each cell at the
  depth nearest its last that both cells admit, and holds that depth for the leg. It
  takes the fastest course: every metre of climb or dive is costed at the 15 m/s ascent
  and 45 m/s descent against the hull's own speed, and so is the change of depth still
  owed at the end to reach the order's depth. A dive under a roof to 800 m and the climb
  back to an ordered 300 m cost about 44 seconds, so from the pocket's south rim to the
  exit pool a Cruiser takes the roofed cut and a Corvette goes round the wall. A route's descent is as loud as an
  ordered one and breaks Silent Running as one does. Inside the crater this lifts the rule
  that nothing spends a descent the player never made
  ([systems-depth.md](systems-depth.md) §2), by the owner's choice over a router bounded
  by the order's own depth. One limit stays: a route goes no deeper than the hull's
  Pressure Rating covers, a metre short of the next band, unless the hull or its order is
  already deeper. Crushing a hull stays the player's order, the way floor-following
  disengages at the rating. A route needing more than that ends where the ground allows,
  as an unreachable route does now.
- **Structures with a height.** A structure blocks only from the seabed under it up to
  its top: the height of its model, the tallest of its navies', in canonical metres. A
  hull clear of that by its own radius passes over the footprint, so a hull can stand
  over a base and drop charges on it. A charge's blast still reaches a structure by its
  distance in three dimensions to the depth it stands on, as everywhere
  ([systems-combat.md](systems-combat.md) §8). The column is drawn at 0.22, while
  models are drawn at full scale, so a hull passing over is drawn closer to the roof than
  it is. The section scope draws the true clearance, and the fight's frames show whether
  the world view still reads.

The fight seats each player on a pre-built Bastion on the crater floor, with its own
opening fleet, and no resources. Losing the Bastion is elimination, as in a skirmish
([game-identity.md](game-identity.md), "Match Structure"), so attacking from above has
something to attack. A Bastion is the only structure the crater stages; §3's "no structures" holds
for the one-seat study.

### Frames and the last gate

The low and survey poses come from `docs/screenshots/issue-1713/gpu.mjs`, at yaw 0. The
opening and garden close are new and give their own headings. All four are captured with
the HUD on. The owner's baseline is the failure's record, not a station:
each child's frames answer what it shows.

| Frame | Pose: plan x / y, dolly, pitch, focus depth | Before | Must read as |
| --- | --- | --- | --- |
| Opening | 300 m ahead of the hulls' centroid on the centroid-to-A line, at 300 m; 1,200 m; 15 degrees; heading about 34 degrees east of north (`yawDeg` −34) | [01-home.png](screenshots/issue-1713/dpr-1/01-home.png): 542 / 1,958, 2,600 m, 55 degrees, seabed | The three hulls in the lower third, the ray gliding lower right of them, the garden canopy beyond them, water rather than clear colour above the far rim, and the legend as one line in its corner |
| Garden close | 1,875 / 1,125 in the clearing, 250 m, 12 degrees, 275 m; heading west along it (`yawDeg` 90) | Captured on its base by the first child that touches this row; no committed frame has this pose, and the nearest is [02-garden-close.png](screenshots/issue-1713/dpr-1/02-garden-close.png), the yaw-0 station | Kelp at canonical scale as one forest on both flanks of a bare clearing, with near stands separated from far ones by the water |
| Low | 2,000 / 2,000, 1,600 m, 12 degrees, 850 m | [03-low.png](screenshots/issue-1713/dpr-1/03-low.png) | Water visibly between the eye and the floor, the bowl's drawn edges as eroded rock terraces rather than 250 m boxes under ink that follows them, and depth still darkening downward |
| Survey | 2,000 / 2,000, 10,000 m, 88 degrees, seabed | [04-survey.png](screenshots/issue-1713/dpr-1/04-survey.png) | Decoration below tactical ink, own hulls and contacts readable, and the crater as ground rather than squares: no 250 m staircase in the coastlines, isobaths or fills, no ruled side on the garden, and no 90 m block grid on the rim ([map-visuals.md](map-visuals.md) §4, the study's clause) |

Two pose calls were taken here. For the opening, a focus ahead of the hulls puts them in
the lower third; keeping the focus on their centroid would centre them, because the orbit
aims at its focus. For garden close, a pose along the clearing shows both flanks; the
yaw-0 station looks north from over the clearing, so its south flank is behind the eye.
A survey frame without the cell-edge outline is an ink change. The owner made it for
issue #1774 in session on 7 November 2026, recorded in #1787, with map-visuals.md §4
amended first, and added the wandering edges on 10 November 2026. Since #1771 the garden
close and the low frame also carry life, and since #1777 the opening carries the ray,
18 m across, gliding at the lower right between the corvette and the legend, besides two
of the low pose's deep-fish patches at its right edge as pinpricks (§5, Life in the
frames).

Each child captures the rows it touches before and after, plus motion, reduced motion, an
unchanged Kelp Labyrinth control and GPU readings at DPR 1 and 1.5 on named hardware,
under §7's rules. #1753 adds its instruments to the same four frames. #1752 captures all
four for the owner's re-acceptance on #1694, which is the pass's last gate, and no score
replaces it. #1754 follows that re-acceptance, and #1694 closes only when both are done.

### Iteration cap

The owner set this pass's cap at **five rounds per change, for every loop**: each
`dev-loop` round with its critic, art-direction reviews, and hull-designer and
hull-reviewer passes. It bound #1748 to #1754, attended or not. Since 21 November it is
the cap for every change (#1782), so this pass no longer carries an exception of its own.
The number is held in `dev-loop` itself, so editing this section does not move it.

## Related

- [Free camera](free-camera.md) — shipped orbit and the next camera revision
- [UI and controls](ui-ux.md) — ordinary orders, direct depth and accessibility
- [Depth](systems-depth.md) and [Echo Layer](systems-echo.md) — costs and disclosure
- [Maps](maps.md) — literal ground, cell-centre painting and public terrain
- [World](world.md), [habitats](habitats.md) and [habitat art](habitats-art-brief.md) — the Rift and the Plateaus
- [Bestiary](bestiary.md) — gameplay animals, not decorative replacements
- [Art direction](art-direction.md), [style](style-neon-noir.md) and [graphics gates](graphics-standards.md) — the retained hierarchy and budgets
- [Combat](systems-combat.md) — vertical combat across bands, §8
- [Model prompt kit](asset-prompts-3d.md) — authorship and the model of record
