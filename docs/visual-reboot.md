# Staged Visual Reboot — Sorrowgate First

## 1. Decision and target

The staged visual reboot is approved: preserve the sound-and-depth RTS and rebuild its
presentation one playable slice at a time. The first slice is **the tutorial,
Prologue: Sorrowgate**, through both its title-screen and campaign doors. It is not the
Bathyarch base proposed during ideation. The tutorial's own force, court and quiet
opening are the target, not an imported skirmish.

The key-art scene in [issue #975](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/975)
is a material and composition reference: physical surfaces, layered water, purposeful
light and convincing scale. Its supplied scene was authored before the isolated viewer.
Neither its 64-sample still accumulation nor its image-matching verdict is a production
performance or art approval. [Issue #979](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/979)
tracks this first production slice separately.

**Options considered.** Replacing the whole roster first would obscure whether the
runtime can carry the new look; importing the still renderer would exceed the live
budget and bypass the contact language. The chosen first increment retains approved
geometry and develops the live material and world path on the actual tutorial.
Replacement shapes remain a later, individually approved stage, not a requirement to
discard working models before their material pipeline is proved.

The direction is **inhabited darkness**: a drowned public building, Commune-built
escorts and freight under a silence order. Close views describe construction and wear;
home and survey views describe the fleet, the route and the depth. No new neon,
sunlight, cinematic blur or full-detail enemy fleet is licensed by this decision.

## 2. Game-design contract

[Sorrowgate](mission-sorrowgate.md) remains canonical for every mechanic and line.
The player commands four court-refitted Light Scouts, two Harvester-hull tenders and
the court's borrowed Cantor array while the array is granted. The flight is unarmed;
weapons, countermeasures, active sonar and construction stay locked. There is no economy.
The first decision remains where to put the flight's ears, not what to build or shoot.

The player's intended feeling is an inhabited place becoming untenable while they can
only listen and escort. Better surfaces must not make the six-SIG escorts look loud or
make the basin's danger visible before detection earns it. The existing mission beats,
escort holds, silence debt, collapse, routes, text, camera controls and outcomes stay
unchanged. The balance freeze is not lifted.

The profile is selected by **mission identity**, not map identity, a development URL
flag, or a global material switch. Another mission using Sorrowgate's map retains the
standard look. Re-entering a standard mission after the tutorial must not inherit its
cached materials.

## 3. Unit and structure sheet

| Subject | Existing asset and role | This increment |
| --- | --- | --- |
| Escort One through Four | Pelagia Light Scout; four struck, PR-2 hulls; SIG 6 idle / 12 cruise | Retain the approved segmented silhouette, fins, proportions and navigation lamps. Give opaque cladding a restrained overlapping laminate surface, not industrial rivets |
| Tender One and Two | Pelagia Harvester hulls, held until their authored releases; the court's freight | Retain the broader cargo silhouette and approved lamps. Use the same laminate family with the existing part and finish differences |
| Court array | Borrowed Cantor; no approved Pelagia Cantor GLB exists | Keep the sanctioned baked sprite. Do not silently substitute another navy's structure or claim it is model-backed |

The six hulls use `light-scout-pelagia.glb` and `harvester-pelagia.glb`. The GLBs,
authoring scripts, outlines, lengths and intake-approved resting emissions do not move.
Other navies are not recoloured into this family. Faction hues still come from the active
palette, including the three colour-vision alternatives.

## 4. Map and world sheet

The map literal and the [mission's map table](mission-sorrowgate.md#11-the-map) do not
change. Top-down, the flight holds at the arch north of the chamber, with the service
lock to the west; the exit is the Upper Concourse to the north. In section, the chamber
lies below the thermocline, the Descent and Concourse rise above it, and the Commit
falls below the escorts' pressure rating. None of these relations comes from a texture.

| Public ground | Material and approved kit | What must remain legible |
| --- | --- | --- |
| Coral Ruins: court and districts | Broken civic paving, sediment in joints, coral-set stone; ruin blocks, dome shards and coral growth from the existing registry | The floor steps and service-lock route. No decorative seam becomes a navigation mark |
| West Approach: Thermal Vein | Scoured basalt with the existing chimney and basalt kit | Its distinct biome fill and licensed ember points, not a new area light |
| Commit: Abyssal Trench | Pressure-eroded stone and the existing trench slabs/spires | The darker, deeper basin. No modelled Sounder or extra ambient fauna |
| Ground after the arch collapse | Surface and props rebuilt from the received cells | Solid ground is still solid; the service lock remains the only northern opening |

Terrain detail is deterministic, hue-preserving and darken-only. It runs beneath survey
ink and the normal water treatment, never in place of them. At distance it fades out
instead of becoming a second map grid. Relief, floors, ceilings, collision and PF remain
the authored simulation's, and no surface reads enemy state or future mission beats.

The world kit must actually arrive. The baseline tutorial rendered zero props despite
80 placements from the existing registry. Completion must reach a replacement layer or
rebuild that subscribed while an asset was already loading; a correct placement count
alone does not prove an inhabited scene. Restoring the already-approved kit is not a
new prop-density choice.

## 5. Runtime material contract

One reusable linear-data surface texture supplies mottling, micro-height and roughness.
It is generated deterministically, uses repeat wrapping and mipmaps, and is shared by
the tutorial's templates rather than baked every frame or copied per hull.
`SORROWGATE_LOOK` in `packages/shared/src/constants.ts` owns its rendering parameters.

| Parameter | First-slice value |
| --- | --- |
| Surface texture | 128 x 128 RGBA8; 65,536 base bytes, 87,380 with the complete mip chain |
| Hull texture repeat | 12 m, attached to canonical model metres rather than the far-view scale |
| Ground/stone texture repeat | 48 m |
| Hull laminate interval | 7 m |
| Civic paving interval | 24 m |
| Minimum cosmetic diffuse multiplier | 0.72 on hulls; 0.62 on stone and ground |
| Detail fade | Full through 1 m/pixel, gone by 6 m/pixel on hulls; 3 to 18 m/pixel on ground |
| Normal-only surface height | 0.12 m on hulls; 0.3 m on props; no geometry displacement |
| Roughness variation and texture filtering | 0.12 amplitude; anisotropy 4 |
| Shared model light rig | Ambient 0.75, key 1.8, rim 1.6; existing light colours and directions |

These are presentation parameters, not simulation tuning. Surface normals and roughness
describe existing geometry; there is no displacement or extra geometry. Emissive
materials are excluded, so lamp colour, placement, resting energy and the live-SIG curve
are unchanged. The shared rig remains a readability light, not fictional sunlight.

Shader patches compose with the existing survey, water fog, veil, instancing and sway.
Template keys include the selected look and, for hulls, the active palette. The standard
path retains its existing material and light settings. The data texture is a bounded
page-lifetime cache like the approved model templates, not a new texture per match.

## 6. Evidence and exit

The first slice is accepted on a real, interactive tutorial, not a standalone beauty
frame. Capture the opening, close escorts, the court at low pitch, and the full route at
survey distance using the same cameras before and after. Keep the HUD visible. Exercise
selection and movement, the flight's idle/cruise reading, and refusal of active sonar and
construction; do not bypass the mission locks.

Hold the existing [graphics gates](graphics-standards.md): at most 150 world draw calls
and 250,000 triangles, with props inside their existing reservation. Count at least 240
rendered frames per measured station, report both canvases' work and name the GPU.
Check the non-target path, a palette switch, reduced motion, a ground delta and teardown.
No phone timing is inferred from a desktop result.

The role sheets above are the concrete outputs of the game, map, world and unit design
workflows; the runtime surface, cache and shader evidence exercise material design.
Art direction coordinates one development loop and its independent critic. New source
models, extra mechanics and a whole-roster rollout are outside this increment.

### First checkpoint, not acceptance

The first live captures use the prologue deep link at 1920 x 1080 on a GTX 1070,
through headed Edge's ANGLE/D3D11 renderer. Each station contains at least 240 rendered
frames with both canvases active. The [capture steps](screenshots/issue-979/capture.mjs)
are observational, not the interaction acceptance harness.

| Station | Baseline | First surface pass |
| --- | --- | --- |
| Opening | [34 calls / 26,170 triangles](screenshots/issue-979/baseline/01-opening.png) | [45 / 47,422](screenshots/issue-979/first-look/01-opening.png) |
| Close escorts | [25 / 19,430](screenshots/issue-979/baseline/02-escorts.png) | [36 / 40,682](screenshots/issue-979/first-look/02-escorts.png) |
| Low court | [35 / 26,170](screenshots/issue-979/baseline/03-court.png) | [46 / 47,422](screenshots/issue-979/first-look/03-court.png) |
| Survey | [34 / 26,170](screenshots/issue-979/baseline/04-survey.png) | [45 / 47,422](screenshots/issue-979/first-look/04-survey.png) |

The [baseline readings](screenshots/issue-979/baseline/readings.json) and
[first-pass readings](screenshots/issue-979/first-look/readings.json) preserve the camera,
frame and submission measurements; their `file` fields name the original local capture
paths. Both runs sit near the display's 60 Hz ceiling, not evidence of a speedup.
The latter restores all 80 approved prop placements, adding 21,252 triangles, and
reports six model-backed hulls plus the array's intentional sprite fallback.

The slice is **not accepted** at this checkpoint. It still needs focused regression
coverage, title-screen tutorial entry and interaction evidence, accessibility and
non-target controls, and an independent critic. The surface change is restrained;
the existing full-screen HUD grain still crosses the world. Any decision to alter that
grain or the opening camera must amend its governing design first; neither changes in
this checkpoint. The phone floor remains unmeasured.

### Regression coverage

The retained profile now has focused tests in
`packages/frontend/test/tutorialLook.test.mjs`,
`packages/frontend/test/tutorialLoading.test.mjs` and
`packages/frontend/test/gameCanvas.test.ts`. They hold mission-only selection,
deterministic texture bytes and filtering, canonical geometry and scale, all four
palettes, untouched lamps, shader composition, the ground-before-survey order, shared
texture ownership and standard-profile re-entry.

The loader tests let Vite expand the real model manifests, then control only GLTF decode
completion. They cover pending subscribers, a superseding terrain rebuild, destroyed
layers, reset generations, explicit decode warnings and look-separated caches. This
found a real race: switching palettes while a hull loaded could put the new ink in the
old palette's cache entry. Template construction now uses the palette captured with
the requesting key, while the raw parsed model remains shared and unmodified.

The mission contract is also exercised by `missions.test.ts`, `missionRuntime.test.ts`,
`missionHold.test.ts`, `silenceReadout.test.ts` and `terrainChange.test.ts` in the backend.
No mission literal, timing, balance number, source model or protocol changes with this
coverage. The HUD grain and opening camera remain as authored; making them different is
not a prerequisite for this retained-geometry increment.

### Completed live pass

The [acceptance drive](screenshots/issue-979/acceptance.mjs) starts from
[Tutorial](screenshots/issue-979/final/01-title.png), reads the
[briefing](screenshots/issue-979/final/02-briefing.png), and presses Descend.
It observes the real client methods without injecting snapshots or issuing orders
through them. Selection and movement use the pointer; Stop, sonar and construction use
their normal keys. [Cruise](screenshots/issue-979/final/07-cruise-sig-12.png) and
[Stop](screenshots/issue-979/final/08-stopped-sig-6.png) show the flight's 6 → 12 → 6
reading; [sonar](screenshots/issue-979/final/09-sonar-refused.png) and
[construction](screenshots/issue-979/final/10-construction-refused.png) answer with their
authored refusal reasons.

| Station | Frame | Calls / triangles | Textures | Conn / overlay average ms |
| --- | --- | --- | --- | --- |
| Opening | [Home](screenshots/issue-979/final/03-opening.png) | 45 / 47,422 | 7 | 0.65 / 0.56 |
| Escorts | [Close](screenshots/issue-979/final/04-escorts.png) | 36 / 40,682 | 7 | 0.69 / 0.59 |
| Court | [Low pitch](screenshots/issue-979/final/05-court.png) | 46 / 47,422 | 7 | 0.72 / 0.78 |
| Route | [Survey](screenshots/issue-979/final/06-survey.png) | 45 / 47,422 | 7 | 0.61 / 0.57 |
| Stopped escort | [Selected](screenshots/issue-979/final/08-stopped-sig-6.png) | 36 / 40,682 | 7 | 0.55 / 0.83 |
| Deuteranopia, reduced motion | [Close](screenshots/issue-979/final/11-accessible-escorts.png) | 36 / 40,682 | 7 | 0.59 / 0.85 |
| Arch collapse | [Changed ground](screenshots/issue-979/final/12-arch-collapse.png) | 46 / 46,846 | 7 | 0.70 / 0.82 |
| Campaign door | [Tutorial again](screenshots/issue-979/final/13-campaign-tutorial.png) | 45 / 47,422 | 5 | 0.81 / 0.56 |
| Standard-profile control | [Tend](screenshots/issue-979/final/14-non-target-tend.png) | 35 / 50,916 | 2 | 1.12 / 0.64 |

The [raw readings](screenshots/issue-979/final/readings.json) retain every station's
camera, both painters' 240 frames, timings and texture count, plus the observed own
snapshots and public ground delta. The GPU is a GTX 1070 through headed Edge
ANGLE/D3D11, at 1920 × 1080. Tutorial averages sit at approximately 60 fps; the largest
recorded tutorial frame interval is 26.7 ms. Tend's first-live station includes a
112.1 ms worst frame and averages 59 fps: the record does not hide that outlier or claim
a speedup. The phone floor remains unmeasured.

The collapse is the server's unaccelerated 10:40 beat: twenty arch cells become solid,
then the two Service Lock cells reopen with a 1,500 m floor and 1,300 m roof. The array
disappears; the layer still holds 80 props, now costing 20,680 triangles rather than
21,252. Exiting destroys the world canvas and removes its probe. Campaign → Sorrowgate
recreates the tutorial profile; exiting again and entering Tend in the same page keeps
the standard profile and renders 93 approved props. This last count includes the
shared pending-delivery repair; it is not a claim that the formerly empty standard
scenery remains empty.

The Settings door applies Deuteranopia through its keyboard-activated control and
reduced motion through its labelled checkbox, then restores both settings. No browser
console errors occurred, including shader compilation. The source-model tests cover
the other two colour-vision palettes and confirm unchanged lamp energy.

One pre-existing display defect is deliberately not hidden by the screenshots:
the selected court-refitted scout says PR1 and CRUSHING while its hull remains whole.
The HUD derives the base rating from kind and faction rather than the mission's refit.
It is recorded under [the unrelated-defects epic](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/746#issuecomment-5873717868);
neither that HUD calculation nor the mission's PR-2 literal changes in this slice.

To reproduce on Windows, start the usual development servers and run from the root:

```powershell
$env:VIEW_W='1920'; $env:VIEW_H='1080'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --entry tutorial --out .dev-loop\issue-979\replay --steps docs\screenshots\issue-979\acceptance.mjs
```

Allow eleven minutes for the authored clock, and do not run a build during capture.
`readings.json` is marked `complete: true` only after the final control succeeds.

## Related

- [Art direction](art-direction.md)
- [Sorrowgate](mission-sorrowgate.md)
- [Graphics standards](graphics-standards.md)
- [Map visuals](map-visuals.md)
- [Habitat art brief](habitats-art-brief.md)
