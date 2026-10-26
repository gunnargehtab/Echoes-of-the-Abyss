# Sorrowgate Arch Study — Brief and Shot Specification

## 1. Status and decision

**For owner review. No implementation or finished visual target is approved.**
This is the next deliverable for [#1637](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637),
not a replacement for the accepted [retained-geometry slice](visual-reboot.md).
It commissions neither a model nor a renderer change. Merging this document records the
proposal; it does not turn its pending decisions into permission to build.

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
| Monumental civic infrastructure, tested in one live scene | Combines the designed civic place in [habitats.md §4](habitats.md#4-sorrowgate--the-city-nobody-lives-in) with visible construction; requires an approved landmark asset and placement contract | **Recommended and selected as the study direction**, not as implementation |

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

Audited at `9688b5f393ff40683424eb635e358f3a8a0a1e01`; these are starting facts,
not claims that the proposed study exists.

| Subject | Existing implementation | Consequence for the study |
| --- | --- | --- |
| Arch | `packages/backend/src/sim/missions/sorrowgate.ts` defines the named marker and the collapse region; `environment.ts` has ruin blocks and dome shards but no arch prop entry | A chart label and a ground change do not supply the proposed landmark model |
| Ground | `packages/shared/src/ground.ts` owns `SORROWGATE_GROUND`; the backend map imports it | A prettier composition cannot relocate the gate, basin or lock |
| Own force | `rosterModels.ts` resolves `light-scout-pelagia.glb` and `harvester-pelagia.glb`; there is no `cantor-pelagia.glb` | Retain six hull models and the array's sanctioned sprite fallback |
| Surfaces and light | `tutorialLook.ts` selects the mission surface profile; `PerspectiveView.ts` uses the shared model rig, ACES and `modelLighting.ts`'s public-water environment | Improve through the actual pipeline, not an unrelated beauty renderer |
| Dressing | `environment.ts` places registry props deterministically from public ground and published resource fields; `environmentLayer.ts` instances them | A fixed civic landmark is a placement decision, not an excuse for a one-off scene object |

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
public ground's vertical section. Do not adopt the concept's 150–200 m height without
a dimensioned fit. Before authoring a model, its footprint, height, clearance and
intact/ruined bounds must be written against the actual cells and approved through the
asset pipeline. The 350 m chart ring is an objective radius, not a model footprint.

### Light and water

**Quiet is low emission, not a requirement to erase surface form.** Readability comes
first from geometry, normals, roughness and the existing model-lighting path. Small
highlights should explain curvature and fracture; they must not turn the arch into a
beacon or the flight into luminous outlines. No global exposure lift, new bloom,
sunlight, god rays or coloured water is licensed by this brief.

Retain the depth-graded water and acoustic veil from
[art-direction.md](art-direction.md#reading-the-water). Layered depth means a near
support, the flight and arch, then public distant forms receding into water. It does
not mean hiding navigable chart information behind a black curtain. The Commit still
has its authored floor; darkness must not imply an invented bottomless opening.

### A place in use, not a busy city

Transit fittings and selective wear explain the former use. The actual flight and
tenders explain the present use. This is still the city nobody settles: no new civilian
traffic, fish schools, gameplay fauna, swaying stone or machinery animation.
Keep ground dressing still. Existing sinking marine snow, camera parallax and a
player-ordered escort movement supply the motion study; do not add a particle system
to manufacture life. Reduced motion keeps the same information readable.

### Bounded asset and surface sheet

| Subject | Proposed treatment | Boundary |
| --- | --- | --- |
| Civic arch | One landmark assembly, with intact and ruined states sharing the same anchors; integral foundations, ribs and damaged fittings | New shape commission only after approval; no separate rail network or surrounding city kit |
| Immediate ground | Existing court edge, public drop and retained ruin/coral kit | No repainted gameplay cells, enlarged existing props, new scatterer or density increase |
| Four escorts | Retain `light-scout-pelagia.glb`; court-refitted PR-2, SIG 6 idle / 12 cruise | Keep geometry, canonical size, lamps and SIG curve; improve surface readability only |
| Two tenders | Retain `harvester-pelagia.glb` and their mission restrictions | No mining demonstration, remodel or added work lights |
| Court array | Retain the sanctioned Cantor sprite while granted | No substitute faction model or newly commissioned array |
| Materials | Separate civic masonry, exposed structural substrate and deposited sediment; retain the existing hull laminate family | Start with existing texture inputs; extra maps require a dimensions/channels/colour-space/mips/bytes/lifetime ledger before approval |

The two arch states are one bounded commission, not permission for urns, niche walls,
tables, tactile paving, lamp props or enlarged dome ribs from the concept's asset list.
The silhouette and exact modelling solution belong to the model-of-record author,
not this brief. New geometry still needs its prompt block, script, intake and separate
hull review under [graphics-standards.md](graphics-standards.md#the-pipeline-of-record).

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
| Start | Escorts at X 2400–2700, Y 2280–2430, depth 1450 m; arch marker at (2550, 2125) | Frame the flight at the south face; do not move it into the collapsing row |
| Arch span | Row 8 of the 250 m grid, Y 2000–2250, across all 20 columns | The landmark is a local part of the span, not a 5 km arch model |
| Service lock | X 1750–2250, Y 1750–2500: columns 7–8, rows 7–9; floor 1500 m, ceiling 1300 m | Preserve the roofed route west of the flight and its passage north through row 8 |
| Chamber and Commit | Gate floor 1500 m; the southern basin begins at Y 3000 and reaches 2400 m | Show the existing descent, without adding a navigable bridge, new cliff or false shortcut |
| Exit | North through the lock to the Descent's 900 m floor, then the Upper Concourse at 340 m; thermocline at 1200 m | The ascent remains the commitment and acoustic separation; do not move the basin to make one camera prettier |

Before 10:40, the opening must not visually block traversable water. At the authored
transit the span goes solid and the two lock columns are cut back through it: see
[mission-sorrowgate.md §9](mission-sorrowgate.md#the-arch-as-ground).
The ruined state must no longer advertise the intact opening as a route north.
Preserve the existing rule that a hull caught in changed ground can leave it.
The lock is the surviving route, not a hole an artist may relocate.

The West Approach's Thermal Vein and the Commit's Abyssal Trench keep their existing
surfaces and acoustic meaning. Only the local Coral Ruins landmark is proposed for
new geometry; no biome becomes a palette choice.

## 5. Decisions required before a prototype

These are proposals for owner review, **not exceptions already taken**.

| Question | Options | Recommendation and approval boundary |
| --- | --- | --- |
| Fixed landmark placement | Keep registry scatter and improve surfaces only; or specify an authored public-landmark extension to the shared registry | The extension serves the named arch, but gate 1 currently permits terrain/resource-driven placement, not one-off decor. Owner approval and a document-first placement contract are prerequisites. It must preserve deterministic placement, public inputs, budgets and ground-delta locality; no per-map renderer bypass |
| Lighting | Retain the current rig and light families; or propose additional local court illumination | Retain them for the first study. Cyan court lamps are key-art permission in [habitats-art-brief.md §5](habitats-art-brief.md#5-sorrowgate--the-city-nobody-lives-in), not in-engine lamps. The warm `civic-lamp` is restricted to shallow Concourse ground by [World light](style-neon-noir.md#world-light--the-terrain-carve-outs); it cannot silently move to the deep court |
| Restricted activity | Retain still dressing and existing water/own-hull motion; or add animated scenery | Retain existing motion. The current water contract permits sinking snow, not lateral current cues; no new fauna or spectacle is needed to test material richness |
| Study isolation | Replace production immediately; or use a development-only, mission-scoped study | Use the isolated study after approval. Off must remain today's tutorial; other missions, including another mission on Sorrowgate ground, must retain their current path |

If the existing light and darkness rules prevent the desired result, bring paired
evidence and a specific amendment back to the owner. Do not secretly increase emission,
relabel a key-art light as surface lighting, or call an unreadable result successful.
An approval must name the placement choice and the bounded asset commission; silence,
a merged documentation PR or an image score is not consent.

## 6. Shot specification

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
| C — construction and escorts | Focus (2550, 2200), depth 1450 m; distance 420; pitch 35°, yaw 25° | Physical thickness, distinct materials, foundations and unchanged hull silhouette/emission |
| L — low court | Focus (2550, 2750), depth 1450 m; distance 650; pitch 12°, yaw 0° | Arch and distant public ground occupy different depth planes; no floating supports or obstructive facade |
| S — survey | Focus (2500, 2000), on seabed; distance 6500; pitch 55°, yaw 0° | Route and basin remain readable; detail does not turn into a second chart grid |
| T — transit pair | H's horizontal focus, distance and angles; capture at 10:35 and 10:45, recording any ground-driven focus clamp | Intact/ruined continuity, loss of the arch route, readable lock; compare before/after implementations at each matching beat |

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
There is no new budget or presumed headroom. Measure at least 240 frames per station;
report both painters' CPU work, frame interval, texture/target memory and every pass.
GPU cost needs a named desktop GPU, unpaced and queued measurements at DPR 1 and 1.5;
software-rasteriser timing is not acceptance evidence.

Run those performance stations separately from the time-matched stills when necessary.
No build runs during capture. Cover first load, pending-load rebuild, the received
ground delta, reduced motion, re-entry and teardown. Shape acceptance additionally
requires neutral-light intake and an independent hull reviewer; the integrated scene
requires a fresh loop critic. Neither substitutes for the owner's visual judgement.

## 7. Approval and stop

The next review is of **this brief and its pending decisions**, not an implementation.
Before any model or code work, the owner approves the bounded prototype and placement
route; the dimensioned fit, asset block and any governing amendments are then required
before authoring. Production remains unchanged while that work is reviewed.

The eventual prototype succeeds only if the owner can accept all of the following in
the paired evidence:

- H reads as a substantial civic place, with the flight first and the arch second,
  without relying on a close-up, extra glow or explanatory labels to supply its volume.
- C distinguishes masonry, exposed structure, sediment and the retained hull laminate;
  surface detail is subordinate at S and does not shimmer during camera movement.
- L conveys layered water and the authored drop; H/S still let a player understand
  the court and route without changing map geometry or revealing other parties.
- T agrees with the received collapse, preserves the lock and leaves no intact false
  opening; the prototype changes neither mission timing nor movement.
- The motion clip remains restrained and readable with reduced motion; controls,
  palettes, non-target rendering and the existing graphics gates still hold.

No beauty score replaces that decision. A close-up that passes while H fails is a
failed study. A missing light permission, placement contract or affordable geometry
is a reported blocker, not a licence to bypass a gate. Later implementation uses one
development loop with its existing three-round cap; this brief spends no implementation
round and authorizes no game-wide rollout.

## Related

- [Existing Sorrowgate visual slice](visual-reboot.md)
- [Sorrowgate mission](mission-sorrowgate.md)
- [Habitat art](habitats-art-brief.md)
- [Art direction](art-direction.md)
- [Graphics standards](graphics-standards.md)
- [Environment asset pipeline](asset-prompts-3d.md#block-4--environment-props-no-faction-no-sig)
- [Map visual hierarchy](map-visuals.md)
- [UI and accessibility](ui-ux.md)
