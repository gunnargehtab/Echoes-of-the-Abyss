# Sorrowgate Arch Study — Brief and Shot Specification

## 1. Status and decision

**Decisions taken, the arch authored and the study built behind its flag; production unchanged.** This is the next deliverable for
[#1637](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637),
not a replacement for the accepted [retained-geometry slice](visual-reboot.md).
On 26 October the owner took the four decisions the first revision left open (§5) and asked
for the documents authoring needs first: the dimensioned fit (§6), the placement contract
(§7), the light and motion licence (§8) and the asset block in
[asset-prompts-3d.md](asset-prompts-3d.md#block-4b--public-landmarks-authored-no-faction-no-sig).
This revision writes them. On 27 October the owner approved the asset block by name, which
commissions the arch model inside §6's fit (§10). On 28 October, with the model authored, the
owner loosened the ruined skirt's ceiling from 5 m to 15 m (§6). The study has since been
built behind its flag (#1669). On 29 October the owner approved its normal-view refinement
target and a new round cap (§11).

On 26 October the owner selected **monumental civic infrastructure: heavy masonry,
exposed structural ribs and damaged transit fittings**, with four priorities: layered
water and convincing scale, purposeful surface lighting, tactile construction, and
restrained signs of habitation and activity. The
[scope record](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637#issuecomment-6423260670)
also retains the owner's instruction: no code yet.

The proposed study is **one arch and its immediate setting, around the existing escort
flight**. The emotional target is a vast place built for permanence, still serving a
small human purpose, above water nobody in the flight can safely follow down.
The flight is the first read, the arch the second, and the depth beyond the third.
The service lock must remain an understandable way out.

### Alternatives

| Option | What it buys and costs | Status |
| --- | --- | --- |
| Refine the generated stone-arch boards | A recognisable layout, but their thin structure and nearly uniform dark surfaces are not the desired finish | Not selected as the finish |
| Replace the court with an industrial gate | Strong engineering cues, but it risks making neutral Surface Age civic works look like a navy's installation | Not selected |
| Monumental civic infrastructure, tested in one live scene | Combines the designed civic place in [habitats.md §4](habitats.md#4-sorrowgate--the-city-nobody-lives-in) with visible construction; requires an approved landmark asset and placement contract | **Selected as the study direction**; §6–§8 are its contract |

## 2. What the references mean

The [earlier artwork](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637#issuecomment-6411025740)
is an inspiration reference for material separation, purposeful highlights, overlapping
depth planes and convincing scale. Transfer those qualities, not its fleet, creatures,
large luminous ring, particle density or camera. Its cinematic view is not a live-frame
performance claim or a licence for extra light sources.

The [three later directions](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637#issuecomment-6411069938)
were described by the owner as lifeless. The subsequent elevated and low-angle arch
boards reviewed in the session are layout studies, not an approved finish. Their cyan
court lamps, exaggerated height, tiled expanse and repeated coral clusters do not become
requirements because they were drawn. Their HUD is not an authority for today's client.

The old *in-game* reference is the
[tutorial opening](screenshots/issue-979/final/03-opening.png), with its
[close](screenshots/issue-979/final/04-escorts.png),
[low](screenshots/issue-979/final/05-court.png) and
[survey](screenshots/issue-979/final/06-survey.png) companions. These are historical
evidence, not a current before set. The
[25 October capture record](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637#issuecomment-6402617373)
names a later baseline at `5b39a0a5`; its local images were not visually reviewed.
The future study must capture a fresh before set at its actual base commit.

### Current implementation audit

Audited at `9688b5f393ff40683424eb635e358f3a8a0a1e01` and re-checked at
`293221930f2ecdd7950c011ec69052fe08371179` for this revision. These are starting facts,
not claims that the proposed study exists.

| Subject | Existing implementation | Consequence for the study |
| --- | --- | --- |
| Arch | `packages/backend/src/sim/missions/sorrowgate.ts` defines the named marker and the collapse region; `environment.ts` has ruin blocks and dome shards but no arch prop entry | A chart label and a ground change do not supply the proposed landmark model |
| Arch row | Row 8 under the marker, columns 9–11, is the Districts' 1,600 m floor; the chamber's 1,500 m begins at row 9. The court's array stands in the chamber at (2550, 2750), not on the span | The arch's foot is 100 m deeper than the flight's floor, and the array is nowhere in its plan |
| Ground | `packages/shared/src/ground.ts` owns `SORROWGATE_GROUND`; the backend map imports it | A prettier composition cannot relocate the gate, basin or lock |
| Drawn heights | `perspectiveTerrain.ts` draws depth at 0.22 world metres a metre (`DEPTH_VISUAL_M_PER_M`); hulls and props draw at true metres, hulls up to 2.3× at the survey station (`readability.ts`) | Every height in §6 is a drawn height, never a depth |
| Rock | Rock and a roof top out at 190 m depth, the Concourse's 340 m less `ROCK_RISE_ABOVE_SHALLOWEST_M`, drawn about 310 m over a 1,600 m floor: the lock's roof from tick 0, the whole span row from 10:40 | After the collapse the wall covers anything still standing in row 8 |
| Own force | `rosterModels.ts` resolves `light-scout-pelagia.glb` and `harvester-pelagia.glb`; there is no `cantor-pelagia.glb` | Retain six hull models and the array's sanctioned sprite fallback |
| Surfaces and light | `tutorialLook.ts` selects the mission surface profile; `PerspectiveView.ts` uses the shared model rig, ACES and `modelLighting.ts`'s public-water environment | Improve through the actual pipeline, not an unrelated beauty renderer |
| Dressing | `environment.ts` places registry props deterministically from public ground and published resource fields; `environmentLayer.ts` instances them. The prologue's look stands 186 props and 49,244 triangles before 10:40, 198 and 50,356 after | A fixed civic landmark is a placement decision, not an excuse for a one-off scene object; the 120,000-triangle reservation has room for one |

## 3. The proposed visual target

### Construction and material

The arch must have depth through its opening, substantial supports and a readable
structural relationship to the fallen dome. Exposed ribs belong to that construction;
they are not a second decorative frame. Missing cladding exposes a different substrate.
Fractures interrupt otherwise deliberate joints. Sediment accumulates in sheltered
recesses and at foundations rather than coating every face with the same noise.

At gameplay distance, the opening and the two supporting masses must read before fine
surface detail. At close distance, the masonry, exposed structure and existing Pelagia
laminate must respond differently to light. Keep the escorts' grown, asymmetric
silhouettes; do not turn them into the industrial vessel in the inspiration image.
Construction detail is not a new hull outline, faction palette or emissive seam.

The impression of scale comes from known hulls against thick construction and from the
public ground's vertical section. §6 is the dimensioned fit: 150 m drawn, the concept's
low end, written against the actual cells. The 350 m chart ring is an objective radius,
not a model footprint.

### Light and water

**Quiet is low emission, not a requirement to erase surface form.** Readability comes
first from geometry, normals, roughness and the existing model-lighting path. Four lamps
on the arch's south face now light its own stone (§8): small pools that explain the
masonry's curvature and fracture. They must not turn the arch into a beacon or the
flight into luminous outlines, and their light reaches nothing but the arch. No global
exposure lift, new bloom, sunlight, god rays, coloured water or scene light is licensed
by this brief. §11 adds a bounded court bounce on the arch's own materials.

Retain the depth-graded water and acoustic veil from
[art-direction.md](art-direction.md#reading-the-water), with §11's distance grade. Layered depth means a near
support, the flight and arch, then public distant forms receding into water. It does
not mean hiding navigable chart information behind a black curtain. The Commit still
has its authored floor; darkness must not imply an invented bottomless opening.

### A place in use, not a busy city

Transit fittings and selective wear explain the former use. The actual flight and
tenders explain the present use, and the four lamps say the court still keeps a station.
This is still the city nobody settles: no new civilian traffic, fish schools, gameplay
fauna, swaying stone or machinery animation. Only the arch moves, in four bounded ways:
silt sifting down, hung fittings swaying, lamps guttering, and the collapse seen as it
arrives (§8). The scatter stays still, and sinking marine snow, camera parallax and a
player-ordered escort movement still supply most of the motion. Reduced motion holds
all four and keeps the same information readable.

### Bounded asset and surface sheet

| Subject | Proposed treatment | Boundary |
| --- | --- | --- |
| Civic arch | `env-ruin-transit-arch`: one landmark assembly, intact and ruined states on one origin; integral foundations, ribs and damaged transit fittings; four lamps and up to six hung fittings on the intact state | Commissioned by name on 27 October (§10); no separate rail network, surrounding city kit or second landmark |
| Immediate ground | Existing court edge, public drop and retained ruin/coral kit; the scatter stands nothing on open ground inside the arch's plan | No repainted gameplay cells, enlarged existing props, new scatterer or density increase |
| Four escorts | Retain `light-scout-pelagia.glb`; court-refitted PR-2, SIG 6 idle / 12 cruise | Keep geometry, canonical size, lamps and SIG curve; improve surface readability only. The arch's lamps never light them |
| Two tenders | Retain `harvester-pelagia.glb` and their mission restrictions | No mining demonstration, remodel or added work lights |
| Court array | Retain the sanctioned Cantor sprite while granted | No substitute faction model or newly commissioned array |
| Materials | `stone_dark` masonry, a new `structure_rib` substrate, `silt_drift` sediment and a new `civic_lamp` glass ([style-neon-noir.md](style-neon-noir.md#the-props-the-seabeds-furniture)); retain the existing hull laminate family | Start with the tutorial look's existing surface texture; an extra map requires a dimensions/channels/colour-space/mips/bytes/lifetime ledger before approval |

The two arch states are one bounded commission, not permission for urns, niche walls,
tables, tactile paving, lamp props or enlarged dome ribs from the concept's asset list.
The silhouette and exact modelling solution belong to the model-of-record author inside
§6's bounds, not to this brief. New geometry still needs its prompt block, script, intake
and separate hull review under [graphics-standards.md](graphics-standards.md#the-pipeline-of-record).

## 4. The game and the ground stay fixed

The player's decision remains where to place the flight's ears, then how to escort the
tenders out while keeping quiet. The cost is sound and depth, not a new scenic hazard.
Keep stats, prices, yields, AI, mission text, timing, progression, controls and outcomes.
Sonar, weapons and construction remain locked; no new economy or balance work.

Public terrain owns the architecture and the basin. The own snapshot owns hull
position, state and motion. Earned contacts own every fact about other parties.
Received public ground changes own the arch's state transition. No renderer reads
unresolved occupants, the future mission schedule or a hidden creature to dress the
scene; a local timer must not anticipate the collapse.

### Plan and section

All coordinates below are mission-local metres; north is decreasing map Y. The
perspective camera calls that horizontal axis Z. Screen-left is not a compass direction.

| Element | Authored relationship | Visual obligation |
| --- | --- | --- |
| Start | Escorts at X 2400–2700, Y 2280–2430, depth 1450 m, over the chamber's 1,500 m floor in row 9; arch marker at (2550, 2125) | Frame the flight at the south face; do not move it into the collapsing row |
| Arch span | Row 8 of the 250 m grid, Y 2000–2250, across all 20 columns | The landmark is a local part of the span, not a 5 km arch model |
| Arch row under the landmark | Row 8's columns 9–11 keep the Districts' 1,600 m floor until 10:40 | The arch's foot stands 100 m below the flight's floor; nothing is repainted to level it |
| Service lock | X 1750–2250, Y 1750–2500: columns 7–8, rows 7–9; floor 1500 m, ceiling 1300 m | Preserve the roofed route west of the flight and its passage north through row 8 |
| Chamber and Commit | Gate floor 1500 m; the southern basin begins at Y 3000 and reaches 2400 m | Show the existing descent, without adding a navigable bridge, new cliff or false shortcut |
| Exit | North through the lock to the Descent's 900 m floor, then the Upper Concourse at 340 m; thermocline at 1200 m | The ascent remains the commitment and acoustic separation; do not move the basin to make one camera prettier |

Before 10:40, the opening must not visually block traversable water. At the authored
transit the span goes solid and the two lock columns are cut back through it: see
[mission-sorrowgate.md §9](mission-sorrowgate.md#the-arch-as-ground).
The ruined state must no longer advertise the intact opening as a route north.
Preserve the existing rule that a hull caught in changed ground can leave it.
The lock is the surviving route, not a hole an artist may relocate. The rock tops out at
190 m depth across the whole row, drawn about 310 m over the arch's origin, so the new wall
covers whatever stood in it; the collapse reads at its south face (§8).

The West Approach's Thermal Vein and the Commit's Abyssal Trench keep their existing
surfaces and acoustic meaning. Only the local Coral Ruins landmark is proposed for
new geometry; no biome becomes a palette choice.

## 5. Decisions of 26 October

The owner took all four decisions the first revision asked for. The recommendation stays
on the record beside each.

| Question | Recommended | Owner's decision | Governing text |
| --- | --- | --- | --- |
| Fixed landmark placement | An authored public-landmark extension to the shared registry, written document-first | **The extension** | [graphics-standards.md](graphics-standards.md#1-model-backed-or-deliberately-procedural--no-third-path) gate 1, [maps.md](maps.md#how-a-map-is-written); §7 |
| Lighting | Retain the rig; failing that, civic lamps on the arch as points only | **Lamps that light the stone** | [style-neon-noir.md](style-neon-noir.md#the-arch-studys-licence); §8 |
| Restricted activity | Retain existing motion; failing that, the sift alone | **Sifting sediment, swaying hung fittings, the collapse sequence and lamp flicker** | [habitats-art-brief.md §5](habitats-art-brief.md#5-sorrowgate--the-city-nobody-lives-in), style-neon-noir; §8 |
| Study isolation | A development-only, mission-scoped study | **The isolated study** | §7, "Isolation" |

Two decisions went past the recommendation, so the governing documents carry licences
rather than stretched rules. Lit stone is the first exception to world light's rule 1,
"never area glow", and it is held to the arch's own surfaces. A hull lit by a world lamp
would read louder than its SIG (gate 3), and lit seabed would break the 5–10 % floor.
Motion on the ground breaks Sorrowgate's "stillest habitat". It is held to the arch, and
every motion sinks or states no bearing, because a current is a mechanic. Both hold behind
the study's flag; production keeps the old rules until a written decision promotes them.

If the licensed light still cannot carry the result, bring paired evidence and a specific
amendment back to the owner. Do not secretly increase emission, relabel a key-art light as
surface lighting, or call an unreadable result successful. The cyan court lamps stay key
art ([habitats-art-brief.md §5](habitats-art-brief.md#5-sorrowgate--the-city-nobody-lives-in)).

## 6. Dimensioned fit

Plan figures are mission-local metres. Heights are drawn world metres above the model's
origin. The origin is pinned to the anchor cell's floor in the map literal, 1,600 m, drawn at
−352 m, in both states and every session. Neither the received ground nor the relief moves
it, so the wall that rises under the anchor at 10:40 does not lift the ruin onto its top.
The conn view draws depth at 0.22 world metres a metre and hulls and props at true metres,
so no height here is a depth. In model space +Y is up, +X east and +Z south, the flight's
side.

| Item | Value | Reason |
| --- | --- | --- |
| Anchor | (2550, 2125), yaw 0, scale 1 | The `arch` marker, over the escorts' seats; the span runs east–west along row 8 |
| Anchor cells | Row 8, columns 9–11: X 2250–3000, Y 2000–2250 | The cells whose state is the arch's (§7) |
| Intact plan | X 2265–2835, Y 2045–2205; model X ±285 m, Z ±80 m | Centred on the anchor, 15 m clear of the lock's cells at X 2250; the south face stands 75 m short of the nearest seat |
| Opening | X 2365–2735, 370 m clear | Holds the flight's 300 m spread, X 2400–2700, with 35 m to spare each side |
| Piers | Two, 100 m each, 35 % of the span | Two masses that read before detail; no screen, gate or rubble wall between them |
| Ruined plan | X 2265–2835, Y 2240–2275; model Z +115 to +150 m | What the wall leaves in view. Its drawn south face runs from Z +62.5 at its top to Z +125 at its foot, at about Z +117 where it is 60 m up, so everything north of Z +115 is inside rock. 25 m into row 9 and none into the lock's columns |

| Level | Height above the origin | What it is |
| --- | --- | --- |
| Foundations | −30 m | Under the plan the drawn ground lies between −13.2 m (Coral Ruins relief, ±60 m) and about +27 m (relief over the chamber's and the lock's blend; the authored floor is 1,538 m at (2265, 2205)), so no pier floats |
| Chamber floor | +22 m | 1,500 m, the floor the flight sits over in row 9 |
| Escorts' seats | +33 m | 1,450 m, drawn at −319 m against the origin's −352 m |
| Lamps | +20 to +40 m | Level with the flight: low over the court |
| Lock ceiling | +66 m | 1,300 m |
| Thermocline | +88 m | 1,200 m; drawn as survey ink, never as a line in the water |
| Hung fittings' lowest point | at least +60 m | 27 m over the seated flight |
| Crown soffit | at least +110 m | Clears the seated flight by 77 m |
| Top | +150 m | Within 4 m of the Descent's 900 m lip (+154), two rows north |
| Lock roof, and the span after 10:40 | about +310 m | The rock top, at 190 m depth |

The wall swallows the piers: every stump at a pier's place would stand inside the drawn rock,
so the ruined state models none. It is what heaps against the face: broken pier mass and
fallen courses between Z +115 and +150, no higher than +60 m. South of Y 2250 (Z +125) nothing
rises more than 15 m over the drawn floor, which keeps the debris under the escorts' hulls at
their seats, 75 m further south at +33 m. The rule was 5 m until 28 October: with the face
sloping north as it rises, 5 m left the heap a wedge no thicker than 8 m at its top, which
read as a facing on the rock rather than fallen masonry, and the owner loosened it. No piece
spans the piers' old line or frames a void, and every debris piece comes to rest inside the
ruined plan.

At the opening station (2,600 m dolly, 1,080 px tall, 40° field of view) the arch spans
about 325 px and a scout about 34 px, both at true scale. At C (420 m) the arch overfills
the frame and a lamp pool is about 140 px across. At S (6,500 m) the arch is about 130 px,
still at true scale, while the readability scale draws the hulls at 2.3×.

The drawn opening is a picture of the row, not a gauge. Before 10:40 a hull may cross row 8
at any depth. One between about 1,100 m and 920 m crosses the span's own masonry, and one at
X 2265–2365 or 2735–2835 crosses a pier. Both are render-only interpenetrations of the kind
every prop already allows, and the study neither fades the arch nor moves a hull for them.

[mission-radicals.md](mission-radicals.md) names the chamber's southern lip at
(2625, 3000) "the arch's foot". That place is outside this plan, and the study changes
nothing in Radicals.

## 7. Placement contract

[graphics-standards.md](graphics-standards.md#1-model-backed-or-deliberately-procedural--no-third-path)
gate 1 now admits a *public landmark* ([glossary.md](glossary.md)), and
[maps.md](maps.md#how-a-map-is-written) says where one is written. For the arch the
contract reads:

| Term | The arch |
| --- | --- |
| Where it is written | A shared table of public landmarks keyed by map id, beside `SORROWGATE_GROUND` in `packages/shared/src/ground.ts` but outside it, since `MapGround` holds ground alone by its own comment. It names the slug, the anchor (2550, 2125), yaw 0, the anchor cells and the origin's floor, 1,600 m. Public map data, identical for every client and every mission on the ground. The client imports it; the backend never does, so the simulation cannot read it |
| State | Intact while all three anchor cells are water; ruined once any is rock in the published grid. Nothing else switches it |
| Join | A session whose first ground already holds the collapse, such as a reload after 10:40, draws the ruined state from its first frame and plays no sequence |
| Baseline | Every layer that stands the map's props stands the arch too, in the state its own cells give: the region's baseline detail, on the board and in travel, stands it intact from the literal, and the session's layer from the received ground. The join trades like for like ([world-map.md](world-map.md) §7.6, #1488). On the board the 570 m arch draws about 29 px, at canonical scale |
| Locality | Both states stay inside the anchor cells and the one-cell ring a ground delta re-shades. A delta elsewhere never touches the arch |
| Budget | One instance from the prop reservation, spent after the fields and before the scatter: four calls standing, 12,000 triangles at most. With the look's 50,356, that is 62,356 of 120,000 |
| Scatter | Nothing on open ground whose footprint meets the plan of the state drawn. Today that removes nothing: on the literal no placement meets the intact plan, and after 10:40 none on open ground meets the ruined one; a crag on the wall's top stands on rock, outside the rule (held by `archStudy.test.ts`, both grids) |
| Runtime | One registry row, read by slug. A layer draws any map's landmark list, so no code names Sorrowgate |

The baseline row took a decision. Drawing the arch in the session's layer alone would make
it appear at the join and vanish at the swap, the defect #1488 removed for every other prop.

**Isolation.** The study sits behind a development URL flag of its own, read by one
predicate (`seabedDetailEnabled` is the shape), and draws only on the prologue's mission
look. With the flag off, the tutorial is today's. With it on, Radicals on the same ground,
every other mission and every skirmish draw no landmark, no arch light and no new motion,
and re-entering one after the tutorial inherits nothing from it. Promoting the study is
one line and a written decision.

## 8. Light and motion licence

The licence lives in [style-neon-noir.md](style-neon-noir.md#the-arch-studys-licence) for
light and suspended matter, in [habitats-art-brief.md §5](habitats-art-brief.md#5-sorrowgate--the-city-nobody-lives-in)
for motion, and in [graphics-standards.md](graphics-standards.md#6-performance-one-world-scene-on-measured-budgets)
gate 6 for cost. Its numbers:

| What | Bound | Reduced motion |
| --- | --- | --- |
| Lamps | Four, on the intact state's south face, two on each pier, +20 to +40 m, at least 40 m apart; `civic-lamp` glass at an effective emissive luminance of at most 0.11, under the ember's 0.18. None on the ruined state | Held at their steady level |
| Lamp pools | Each lamp lights the arch's own stone within 20 m, falling to nothing there, so no two pools overlap. The brightest lit stone stays under its lamp, under a vent ember's mean breath, and under the escorts' brightest lamp pixel in the same frame, so the flight stays the first read. Nothing else takes the light; no scene light, shadow or halo | Steady with their lamps |
| Flicker | A lamp dips to 60 % for one or two 200 ms buckets, at most once in any 2 s; no two lamps dip in one bucket; never above the steady level | No dips |
| Sift | At most 8 sites on the intact state and 4 on the ruined; at most 256 motes; sinks only, at no more than twice the marine snow's rate, stepping on the 5 Hz grid as the field haze does; the silt colour, capped at 0.10 of it | Held still |
| Sway | At most six hung fittings, at most 1.5 m at the free end, periods 9–14 s; each fitting's axis is its own, spread over at least 120° across the set | Held at rest |
| Collapse | Starts on the received ground change. Lamps dark on the first bucket; the ruined state's debris down the new wall's south face for at most 4 s; a cloud of at most 384 motes in the silt colour, at most 40 m out and 30 m up, settled by 14 s | A cut to the ruined state, with no cloud |

Before 10:40 the lamps mark the station the flight holds. After it the Upper Concourse's
lamps are again the one warm thing in the frame, which is the way up (#1533). The
collapse dresses the ground change; it never delays, precedes or replaces it.

## 9. Shot specification

**Planned evidence, not captured results.** Use the real client through
Tutorial → briefing → Descend, with both canvases and the current HUD.
Use fresh matched sessions, default palette, default water/halo settings and 100% HUD
scale at 1920 × 1080, DPR 1. Keep ordinary idle poses and no selection for opening
comparisons. Wait for all six hull models; name the array fallback rather than counting
it as a seventh model.

The opening quartet is captured at T+00:30, within one second, one fresh session per
station if needed. This precedes the delegations' 04:00 move to their stations; it does
not promise an empty contact log. Keep only server-resolved contacts, without adding
or suppressing parties for composition.
If loading misses that window, repeat the session; never stop or accelerate the server
clock. Record the actual mission tick and camera pose for every frame.

| Shot | Camera specification | What the owner judges |
| --- | --- | --- |
| H — gameplay opening, primary | Actual unmodified opening camera; save its focus, distance, pitch and yaw in the before record and reproduce them exactly after | Flight → arch → depth; meaningful improvement at the player's real opening view, without HUD concealment |
| C — construction and escorts | Focus (2550, 2200), depth 1450 m; distance 420; pitch 35°, yaw 25° | Physical thickness, distinct materials, lamp pools on stone only, foundations and unchanged hull silhouette/emission |
| L — low court | Focus (2550, 2750), depth 1450 m; distance 650; pitch 12°, yaw 0° | Arch and distant public ground occupy different depth planes; no floating supports or obstructive facade |
| S — survey | Focus (2500, 2000), on seabed; distance 6500; pitch 55°, yaw 0° | Route and basin remain readable; detail does not turn into a second chart grid |
| T — transit pair | H's horizontal focus, distance and angles; capture at 10:35 and 10:55, recording any ground-driven focus clamp | Intact/ruined continuity, loss of the arch route, readable lock, lamps dark; compare before/after implementations at each matching beat |

C and S start from the [existing capture recipe](screenshots/issue-979/capture.mjs);
L deliberately lowers the pitch to cover the difficult end of the camera range.
These are proposed stations, not a claim that an unbuilt arch fits them. Resolve any
framing problem on the baseline, record the revised pose, and recapture both sides.
Never give only the after image a more flattering angle. Camera distances are capture
inputs, not new gameplay or asset dimensions.

Supply an unedited 12-second clip at C: four seconds held, a short ordinary horizontal
move by one selected escort within the court, then Stop and the settling view.
Show the live flight reading and existing wake; no dive or unlock. Repeat the clip with
reduced motion. It must read as a quiet occupied place, not a still made lively by
post-processing. Demonstrate sonar and construction refusal separately, with their real
feedback, rather than triggering either to improve the frame.

Supply a second 12-second clip at C with no input: the sift, the sway and the lamps alone.
Repeat it with reduced motion, where all three hold. Then supply an unedited clip at H's
pose from 10:38 to 10:56 of the authored clock: the received change, the debris and cloud,
and the settled ruin. Repeat it with reduced motion, which cuts to the ruin with no cloud.
Record the tick the ground change arrived and the frame the sequence began. Reload the page
after 10:40 and show the ruin standing from the first frame, with no sequence.

Pair C and L with the study on and off, at the same tick. Read the brightest lamp-glass
pixel, the brightest lit-stone pixel and the frame's dark fraction, then a vent ember's
mean breath at a C-matched station on the West Approach's nearest chimney. The lit stone
must sit under both and under the escorts' brightest lamp pixel in the same frame, and the
frame inside the 85–90 % darkness budget. One escort's pixels at the same SIG must not
change between the pair.

The non-target control is the standard `ventfront-divide` match with the study requested,
compared with it off. Also return from the tutorial to that standard path and inspect
material/cache isolation. Repeat H and C with the supported colour-vision palettes and
reduced motion; do not accept a direction that only works in the default palette.

### Evidence record and budgets

Every pair names base/candidate commits, mission/time, entry route, study on/off,
viewport, DPR, palette, motion and water settings, requested and actual camera poses,
model/fallback counts and the actual GPU/renderer. Keep the current HUD, captions
outside the image, and raw PNGs alongside any annotated comparison. A drawing or
paint-over is labelled as such and never occupies the in-engine evidence column.

The future prototype must remain within [gate 6](graphics-standards.md#6-performance-one-world-scene-on-measured-budgets):
150 calls and 400,000 triangles across the whole frame, including the prop layer's
existing reservation of roughly 30 calls / 120,000 triangles and 600 instances.
The arch's own share is gate 6's study line: four calls and 12,000 triangles standing,
one `Points` for the sift, and one for the cloud while it lives. There is no other new
budget or presumed headroom. Measure at least 240 frames per station;
report both painters' CPU work, frame interval, texture/target memory and every pass.
GPU cost needs a named desktop GPU, unpaced and queued measurements at DPR 1 and 1.5;
software-rasteriser timing is not acceptance evidence. Read C's GPU time with the pools
on and off.

Run those performance stations separately from the time-matched stills when necessary.
No build runs during capture. Cover first load, pending-load rebuild, the received
ground delta, the collapse sequence, reduced motion, re-entry and teardown. Shape
acceptance additionally requires neutral-light intake and an independent hull reviewer;
the integrated scene requires a fresh loop critic. Neither substitutes for the owner's
visual judgement.

## 10. Approval and stop

The owner approved the placement route and the prototype's boundaries on 26 October (§5).
On 27 October the owner approved the asset commission by name: the arch's block in
[asset-prompts-3d.md](asset-prompts-3d.md#block-4b--public-landmarks-authored-no-faction-no-sig),
inside §6's fit, recorded on the pull request that carries it. Model and code work for the
study start from these documents once they are on `main`. Production remains unchanged while
that work is reviewed. Any further approval the study needs is named the same way; a merged
documentation pull request, silence or an image score is never one.

The eventual prototype succeeds only if the owner can accept all of the following in
the paired evidence:

- H reads as a substantial civic place, with the flight first and the arch second,
  without relying on a close-up, extra glow or explanatory labels to supply its volume.
- C distinguishes masonry, exposed structure, sediment and the retained hull laminate;
  surface detail is subordinate at S and does not shimmer during camera movement.
- The lamp pools light only the arch's stone, under their lamps, a vent ember's mean and
  the escorts' own lamps; the frame keeps its darkness budget, and no hull reads brighter
  with the study on.
- L conveys layered water and the authored drop; H/S still let a player understand
  the court and route without changing map geometry or revealing other parties.
- T agrees with the received collapse, preserves the lock and leaves no intact false
  opening or lit lamp; the prototype changes neither mission timing nor movement.
- The sift only sinks, the sway states no bearing, and the collapse begins on the
  received change and never on a reload.
- The motion clips remain restrained and readable with reduced motion; controls,
  palettes, non-target rendering and the existing graphics gates still hold.

No beauty score replaces that decision. A close-up that passes while H fails is a
failed study. A missing light permission, placement contract or affordable geometry
is a reported blocker, not a licence to bypass a gate. Later implementation uses one
development loop with its existing three-round cap; this brief spends no implementation
round and authorizes no game-wide rollout. #1669 spent that loop, and §11 grants one more.

## 11. The normal-view refinement

On 29 October the owner reviewed [#1676](https://github.com/gunnargehtab/Echoes-of-the-Abyss/pull/1676)'s
frames ([issue-1674](screenshots/issue-1674/README.md)) and approved one further refinement,
for [#1683](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1683). H shows a real
landmark, but it reads as a dark slab in a sparse court. C does not separate masonry, ribs
and sediment, and L and S lack depth separation. Those were visual findings. This section
records what was measured behind them, what the owner permitted, its bounds and the cap
([#1682](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1682)).

### What the frames show

- **The rig lights the far side.** The conn view's key stands at (−1400, 2600, −900) and its
  rim at (0, 900, −3000), both north of the arch (`PerspectiveView.ts`). The arch's working
  face is +Z, south. A south face takes the ambient and the environment and no key or rim; a
  top takes 0.84 of the key. Read by hand on boxes over `d-H-on-H-030s.png`, H draws the
  model in two tones: the deck at about sRGB 21/30/40, the span's south face 13/19/25, the
  court floor 12/19/22, the floor inside the opening 11/18/22 and the pier faces 5/7/10. The
  piers read darker than the floor, as holes rather than masses, and the opening matches the
  court.
- **The materials sit at one dark matte value.** After the prop ceiling (style-neon-noir's
  "The runtime owns value") the arch's diffuse is 0.060 silt, 0.041 masonry and 0.025 ribs,
  all at roughness 0.9–1 and metalness 0. Under the ambient and the environment alone, ribs
  and masonry at C sit within 10 of 255 of each other. The 0.06 ceiling sits under the
  darkest faction's lifted cladding, 0.067 (`rosterModels.ts`), so a prop never reads as a
  contact.
- **H, L and S are darker than the budget.** Near-black, luma under 25.5, is 98.7 % of H with
  the study on and 99.5 % off, 98.1 % of L and 99.1 % of S. Only C, at 86.8 %, is inside the
  85–90 % budget.
- **The relief is below a pixel's reach at H.** H draws 0.57 px a metre, so the 7 m recess,
  ribs 3.5 m deep and 1.5 m drum setbacks draw 1–4 px. The twelve deck-ledge drifts, the brightest
  material on lit tops, read as warm dashes at H and S, the second chart grid §9 warns of.
- **L has no plane between the arch and the wall.** The arch's south face and the Descent's
  wall 447 m behind it face the same way under the same ambient, with no grade between.
- **No surface map can land yet.** The model's buffers carry no UV0, so a course map needs the
  script to lay UVs and §3's map ledger first.

The shape reading is the model-of-record author's, taken read-only for this section.

### Decisions of 29 October

| Question | Recommended | Owner's decision |
| --- | --- | --- |
| Light and material | Reflected court light and material contrast on the landmark alone, behind the flag. Retaining today's limits leaves shape alone to act, which the author expects to give "a slab on two supports". Moving the shared rig relights every hull and prop, a production change | **As recommended** |
| Shape | Proud piers, real drum setbacks and fewer drifts; deeper ribs buy nothing at H | **All four, deeper ribs included** |
| Water at L | Unchanged, expecting the bounce to lift the arch off the unlit wall | **A study-only distance grade** |
| Further rounds | One new development loop of three rounds | **As recommended** |

The water decision went past the recommendation, so
[art-direction.md](art-direction.md#reading-the-water) carries it as a licence, as
[style-neon-noir.md](style-neon-noir.md#the-arch-studys-licence) carries the light.

### Permitted changes and their bounds

Every change holds behind the study's flag, on the prologue's look (§7, "Isolation").

| Change | Bound |
| --- | --- |
| Court bounce | A diffuse term on the landmark's own materials, as from the court floor: from the south and 30° below level, so the south faces and the soffit take it and the deck does not. At full incidence at most the rig's ambient again, `MODEL_LIGHTING.AMBIENT` in its colour, so a south face takes at most twice its ambient today; no hue of its own. The board's still copy takes none, as it takes no pool |
| Diffuse ceiling | The landmark's brightest material at most 0.10 linear diffuse luminance, up from the props' 0.06; the materials keep their tokens' hues and ratios. This crosses the 0.067 cladding floor, so "H, order" below bounds it against the escorts' cladding. The board's still copy takes it too, since it is a material value |
| Roughness | `structure_rib` 0.55–0.7, so the frame takes a sheen from the existing environment; `stone_dark` and `silt_drift` stay 0.9–1; metalness 0 throughout. The board's still copy takes it too |
| Distance grade | Public ground beyond the focus fades further into the water it stands in. The measure is a fragment's range from the camera less the camera's distance to its focus. The fog factor is production's plus 0.35 × that excess over the reach, clamped to 0–0.35 extra and to 1 in all, linear between, and the extra is multiplied by `waterDensity`, so 0 draws none. The reach is 0.58 of the dolly, 1,500 m at the opening's 2,600 m, so it breathes with the dolly as the falloff does. Terrain and props only: the landmark keeps production's falloff, so at L, whose reach is 377 m, the Descent wall takes the full 0.35 and the arch none. The arch takes none at C either; C's far ground takes the grade, so C's darkness is read with it on. Never a hull, contact, glow, lamp, survey ink or HUD. No hue and no new pass |
| Proud piers | The span's south face set back from Z +72 to no further north than Z +45, the plinth and footings staying where they are. The rail bed, brackets and catenary move with the face or onto the capitals; the hung fittings stay six at most, each still at least +60 m at its lowest |
| Drum setbacks | On the piers' south faces only: drum 0 stays at Z +76, so the lamps on it do not move; drums 1 and 2 each step back 5–6 m from the one below, from 1.5 m, and the capital stands proud again at about Z +75. Each drum's core steps back with it, so the cladding stays 8–11 m thick, the fallen-cladding recesses keep their depth and the ribs follow the core. The east and west faces stay, so §6's 370 m opening holds |
| Ribs | At most 8 m deep, from 3.5 m, inside a recess at most 12 m deep, from 7 m, whose back moves with the span face. A rib is never proud of the face around its recess: its depth and its stand-off together are at most that recess's depth |
| Drifts | Five or six on the deck's ledges, from twelve, on ridged plans; silt stays banked in recesses and at foundations |

The shape changes sit inside §6's plan and levels and
[Block 4b](asset-prompts-3d.md#block-4b--public-landmarks-authored-no-faction-no-sig)'s
text, so neither is amended. The ruined state, the lamps, the node names and gate 6's
study line, four calls and 12,000 triangles a state, are unchanged: the model was 2,412
triangles intact and 732 ruined before the refinement, and is 2,624 and 732 after it (#1683).
The author builds them; intake and the hull reviewer grade them before the integrated loop
critic does.

Unchanged too: §8's lamps and pools, every hull's pixels and SIG, hidden information, the
gameplay ground, the flight, the HUD, the shared rig, exposure, bloom, the acoustic veil and
every non-target render. No surface map is licensed this round.

### Acceptance at the opening

These are necessary, never sufficient: §10's criteria still hold, and the owner's visual
judgement decides. Each is read on §9's matched frames, before and after. A window is a
square centred on a model-space point projected through the frame's recorded camera, as the
probe already projects `lamp_N`: 16 × 16 px at H and 8 × 8 px at L. A mask is the probe's
per-material render of the same frame, a material's pixels outside the pools. No such render
exists yet: #1683 first adds a development-only per-material mask read to the probe, as the
lamp mask was added. The probe changes nothing in the scene, so the before set is captured
with it over the base commit's scene. The before readings are taken on #1683's before set
by the same windows and masks, and each window is
drawn on that before frame to show where it fell. The points, in model metres:

| Window | Point |
| --- | --- |
| Pier mass, west and east, at H | (∓235, +100, +76): the capital over the fallen-cladding recess |
| Court floor, west and east, at H | (∓235, +12, +130): the floor ramping into the chamber, 50 m south of each pier |
| Opening floor, at H | (0, 0, 0): the anchor |
| Span face, at L | (0, +136, +72), moving with the face |
| Descent wall, at L | (0, +60, −375): the Descent's wall two rows north, seen through the opening |

Under the full bounds a pier's south face gains at most about 3.3× in linear light (2× from
the bounce, 1.67× from the ceiling). On the measured 5/7/10 that is about 16/20/26, luma
about 19.5 against the floor's 17.7: above the floor, short of the 5 luma the criterion
asks. The pier criterion therefore leans on the proud piers' lit capitals, which the window
takes in over the fallen-cladding recess.

- **H, masses.** Each pier's window reads at least 5 luma brighter, by mean, than the court
  floor's beside it, and the opening floor's at least 5 darker than both piers'. The
  capitals and the drum bands draw as separate lit bands at least 2 px tall.
- **H, order.** The flight stays the first read: an escort's pixels do not change with the
  study on, no arch pixel outside a pool is brighter than the escorts' brightest lamp pixel
  or a vent ember's mean breath (§9), and no arch window outside a pool reads brighter, by
  mean, than the escorts' laminate mask in the same frame.
- **H, darkness.** Near-black falls from 98.7 % and stays at or above 85 %, as at every station.
- **C.** The `structure_rib` and `stone_dark` masks differ by at least 5 luma, by mean, and
  the capitals' south faces read above near-black.
- **L.** The span face's window and the Descent wall's differ by at least 5 luma, by mean.
- **S.** No drift line reads as a chart mark, and no surface shimmers in motion.

The evidence is §9's whole set: H, C, L and S at T+00:30, the transit pair, the motion clips,
reduced motion, the palettes, the `ventfront-divide` control, and GPU time with the bounce and
grade on and off on a named desktop GPU, the grade read at L and S, where most ground is on
screen. The before set is today's study at the
refinement's base commit, beside the study off.

### The cap

The owner granted #1683 one new development loop of three rounds. Reaching it is a stall:
the pull request stays open with its findings listed, and there is no reset and no fourth
round without a new written grant. Production is unchanged; promotion remains a separate
written decision (§5).

## Related

- [Existing Sorrowgate visual slice](visual-reboot.md)
- [Sorrowgate mission](mission-sorrowgate.md)
- [Habitat art](habitats-art-brief.md)
- [Art direction](art-direction.md)
- [Graphics standards](graphics-standards.md)
- [World light and prop tokens](style-neon-noir.md)
- [How a map is written](maps.md#how-a-map-is-written)
- [The placed world and its baseline](world-map.md)
- [Environment asset pipeline](asset-prompts-3d.md#block-4--environment-props-no-faction-no-sig)
- [Map visual hierarchy](map-visuals.md)
- [UI and accessibility](ui-ux.md)
- [Glossary](glossary.md)
