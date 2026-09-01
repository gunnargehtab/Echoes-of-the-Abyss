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
3. **One model for the whole run.** Use the most capable model in the picker (Opus 5 at
   time of writing; a stronger tier if offered) and do not switch mid-series — a model
   switch is a second source of style drift.
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

Every row of this table is on disk today as the output of `tools/env-props/build.mjs`,
the generator that stands in for the Claude Design batch
([graphics-standards.md](graphics-standards.md), "The environment branch"). A model
generated from the prompts above replaces its row's file directly: run intake with the
row's footprint, cap and light, commit the GLB over the generated one, and update the
registry row's triangle count from the intake report. The environment registry, the
placement rules and the kelp sway read the file, not its author.

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
