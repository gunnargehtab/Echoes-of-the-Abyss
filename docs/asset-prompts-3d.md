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
3. **One model for the whole run, and for this series it is Fable 5.1.** That holds
   whichever door a model comes through, and there are two. Every GLB approved in
   `docs/concept-art/models/` to date was authored under Opus 5; anything authored under
   Fable 5.1 is a new series, and the break is *deliberate* rather than an exception to
   the rule.

   **Generated** — a prompt in the Claude Design picker, which is how the roster to date
   was made; in roster terms the move to Fable 5.1 lands from the scout wave on. Do not
   switch mid-series: a model switch is a second source of style drift, and that is the
   reason this note exists. The first hull generated under Fable 5.1 is iterated and
   approved as that series' reference (rule 4) — held against the approved Opus 5 models
   on the consistency checklist, so the break is a known quantity rather than a drift —
   before any other hull is batched. Nothing moves back and forth between the two pickers
   to match an older model: if a Fable 5.1 hull will not converge on the series look, the
   fix is the prompt or the reference, never the picker.

   **Built** — a script under `tools/hull-models/` composing its navy's shape vocabulary,
   run to produce the GLB, described in [graphics-standards.md](graphics-standards.md)
   § "Where the GLB comes from". The Derrick and the Responsory took this path, and #540
   is making it the path for everything, so it is the one a hull authored from here on
   should be expected to take. There is no picker, so the series reference does not gate
   it. A **port** — a script reproducing a model already approved — is not a series break
   at all: it matches its GLB part for part, `npm run check:models` fails on any drift,
   and that ties it to the old series harder than a consistency checklist could, so a
   shape decision taken inside a port is a bug rather than a judgement call. A **new**
   hull built this way is a series break like any other, and its script and its block
   below are one author's work (#540).

   Either way this is *shape*, which is what the `fable-5.1` label routes
   ([CONTRIBUTING.md](../CONTRIBUTING.md)), and either way the gates are unchanged and
   stay adversarial to whoever authored the model: `hull-intake`, the glow calibration,
   the screenshot review.
4. **Approve a reference unit first — on the generated path.** Generate one unit, iterate
   until it is right, declare it the series reference, then batch the rest. Fixing one
   model is cheaper than re-converging five diverged ones. A built hull has no batch to
   diverge and no picker to converge, so it answers to its block and to the round-trip
   check instead.
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

**Where the light sits matters as much as how much of it there is**, and the 36–60 row is
where that first bit. "Lit ports" asks for exactly what the phrase says — a window in a
wall — and a window in a wall is a vertical face; the Consortium's Tender carries ten down
its deckhouse, each boxed out past the eave so that it also shows a top face. A UNIT block
is a description of a hull, not a light budget, and two renderers draw the hull:

- **The conn view draws the mesh**, at a 55° tilt, so a vertical face reads there too, and
  this is where most of a player's time is spent.
- **The chart's sprite bake is straight down**, so only unoccluded upward-facing area
  reaches it. A hull whose light budget is all vertical reads as unlit on the chart — the
  layer that tells a player how loud something is at a glance.

So write a UNIT block to name the light the **chart** reads first, and build every lamp it
names where the chart can see it. A lamp the chart cannot see is a light-audit warning
(`lightAudit` in `tools/hull-models/kit.mjs`), and a named lamp that cannot face up — a
keel run, a lamp sealed inside another part — is recorded in its script's header as a
residual audit line, with the reason. Every hull needs at least one unoccluded upward
emitter — a deck flood, a vent grille in the top plate, a lit hatch — whatever else it
carries.

A lamp also has to *rest on the hull*. The conn view draws the mesh, so a bud hung a metre
off a flank or a photophore standing half a metre over its plate is a light in the water,
and the same audit names every lit part more than 0.2 m from any other solid part of the
model. The kit's `seat` is the placement that answers it: the lamp on the nearest skin, or
on the plate straight under its station. A haze is not a surface — a part blended at
under half opacity neither hides a lamp from the chart nor holds one up.

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

## Block 2b — the derived palette, and why it is not a palette

Block 2's four values a navy are the brief. Counted the way
`node tools/hull-models/finishes.mjs --hexes` counts them — every base colour and every
emissive on a model named for a navy, as sRGB hex, the environment props aside — the
approved models carry 48 distinct values between them, and 32 of those appear in no table
in this repository; the other sixteen are Block 2's tokens, every one of which appears.
That looks like a breach of gate 4 in [graphics-standards.md](graphics-standards.md) —
"never introduce an unlisted hex value" — and it is not one. The reason is worth stating once, because it
decides what a model author owes the palette and what they do not.

**A model's hue never reaches a pixel.** Gate 4 says so itself: dressing a model in a
faction's palette is a generation convenience, so its hue is "not shippable". Both
renderers act on that, and both discard it completely. The chart's sprite bake takes each
material's luminance and multiplies it into the owning faction's primary
(`bake.ts`), then flattens the emissive map to one alpha channel and paints the faction's
glow through it. The conn view does the same to the mesh (`rosterModels.ts`): every
material's colour is replaced by the faction primary's chromaticity, every emissive by the
glow ink's. A Commune corvette authored in teal and a Directorate one authored in crimson
render through the same two lines of code.

So what an author picks for `algae_hull` is an authoring value, like a placeholder name in
code. What survives into the game is the **ratio** between one material and the next — the
panel against the ridge, the ridge against the lamp base — because that ratio is what the
recolour preserves and what a player reads as form.

That is the rule, and it is the whole rule:

1. **Derive freely, within the navy's language.** A dimmed alloy, a warmer vent, a
   near-black base for a lamp to sit on: all licensed, and none needs a token, because none
   of them ships as itself.
2. **Never rely on a derived hue being seen.** A part that only reads because it is a
   different colour from its neighbour will read as one flat colour in both renderers. If
   it must be distinguishable, separate it in *value*, not in hue.
3. **One name, one value, across a navy.** This is the one that bites, and the only one the
   render can tell you got wrong. Two parts called `weld_steel` at two different values are
   two different greys after the recolour, on two hulls that a player sees side by side.

The registry below exists for rule 3 — so the next author copies rather than re-derives —
and for nothing else. It is not a palette table and nothing in it is a token.

### What the approved models derived

Lamp bases are the near-black a `lamp()` puts in `color` for its emissive to sit on
(`kit.mjs`); emissives are that lamp's light; cladding is a `clad()` surface.

| Navy | Role | Values |
| --- | --- | --- |
| Consortium | emissive | `#B07A1E` `amber_vent` · `#FFD070` `amber_flood` |
| Consortium | cladding | `#1C1F22` `baffle_foam` (the Baffle Barge) · `#1A1408` `amber_lamp_unlit` (the lamp's base worn as cladding by a part the block lights only in a later band — the Furnace's burner nozzles, bow floods, ladder strips and manifold strip, lit only cutting) |
| Consortium | lamp base | `#1A1408` · `#120E06` · `#2A2210` |
| Commune | cladding | `#14382C` `growth_ridge` · `#123C2E` `growth_ring_dark` · `#1FA67A` `algae_hull` (the token's hex under a second name) · `#11563F` `algae_teal_dark` · `#22302C` `grown_steel` · `#061206` `bio_vein_unlit` (the vein's base worn as cladding by a part the block lights only in a later band — the Glider's tail veins, dark with the drive cut, the Weaver's and the Blight's stem veins, and the Rootstock's node-to-node vein, lit under way) |
| Commune | emissive | `#5FAE42` `bio_vein` (at strength 1 on the Sower and the Spinner, 0.2 on the Drifter's seams and the Glider's wing vein — a strength survives the recolour as a finish does) · `#E8F0A3` `forge_light` / `floodlight_pale` (the spore token as a light) |
| Commune | lamp base | `#061206` · `#0A1A08` · `#2E3A16` · `#3A3F1E` · `#3F6B2E` (`sensor_frill_lit`, a lit membrane) |
| Directorate | cladding | `#3A3F4A` `weld_steel` · `#4E1220` `chitin_red_dark` · `#1A0810` `biolight_unlit` (the lamp base worn as cladding by a part the block lights only in a later band — the Verger's bay doors, and the Lure's fan ribs and tergite-edge rows) |
| Directorate | emissive | `#E0506A` `gullet_glow` · `#E07A8C` `forge_light` / `floodlight_hot` |
| Directorate | lamp base | `#1A0810` `biolight_crimson` · `#2A0C14` `gullet_glow` · `#40141C` `forge_light` / `floodlight_hot` |
| Knights | cladding | `#1C2230` `dark_steel` (the Offertory's cradle floors, its first hull) · `#8A8FA3` `alloy_dim` · `#E6E9F2` `alloy_white` (the token's hex under a second name) · `#1A1030` `crystal_seam_unlit` (the seam's lamp base worn as cladding by a part the block lights only in a later band — the Herald's tine seams, the Lance's guard edges and rail, and the Tocsin's rail, crown seams and crystal spine, lit under way or firing, and its drive prism, lit under way and dark in the firing state it is built in; the Offertory's fore inlay and guard edges, and the Versicle's guard edges, lit under way) |
| Knights | emissive | `#9B6CF9` `crystal_panel_glow` · `#A77CFF` `resonance_node` |
| Knights | lamp base | `#1A1030` · `#1E1038` · `#241744` · `#2A1A50` · `#3A2560` |

### One name, one value — held since #888

Until #888 the approved binaries broke rule 3 nineteen times inside their own navies: four
names split on a cladding's hex (`growth_ridge`, `algae_hull`, `weld_steel`,
`shadow_indigo`), and fifteen more on metalness and roughness, on a lamp's base or light
(`biolight_crimson`'s and `biolight_green`'s bases among them), or on two-sidedness. Nearly every split ran the same way, a
structure pass or the four shared kinds' older series against the hulls of its own navy,
which says those passes were authored without the hull modules open rather than that
anyone disagreed. The ports had to keep them, since a port matches its approved binary
finish for finish.

Phase 6 of #540 took them all, on the rule that settles every split: **the hull value is
canonical.** A name carries the value its hulls carry, and where no hull carries it, the
value most of its structures do. Each navy's module holds one `ink` table, so re-finishing a
fleet is one edit; and where a lamp's name split with one value sitting on its own token,
lit through and through, it went onto the name's near-black base. Where one name was
two things it became two names: the Cantor's three open shell plates are
`chitin_violet_open`, double-sided, and the Knights' lit settlement crystal joined
`resonance_crystal_dim`. `npm run check:models` fails on a name at two values inside a navy,
and on a model file that is neither an `env-` prop nor named `-<navy>.glb`;
`node tools/hull-models/finishes.mjs` lists the splits.

A value is everything a finish carries **except its emissive strength**. Strength is a
lamp's resting loudness, each model's own, approved against its SIG band and carried into
the conn view as it stands (`rosterModels.ts`), so `biolight_crimson` at 2.4 on one hull and 6
on another is one fixture at two loudnesses. Where a lamp's light moved onto its name's
value, its strength moved the other way so the resting luminance held: the Consortium
Cruiser's `amber_vent` burns at 3.516 on `#B07A1E` where it burned at 2.2 on `#F28A1E`.
Metalness and roughness survive the recolour where a hue does not, so the finish moves are
the visible ones, in the conn view; the chart's bake reads base colour and light alone.

### Two names, one fixture — folded in #891

The rule is by name, so two names for one fixture passed it, and #888 left them as a
finish decision of their own. #891 made it, on the same rule — the hull value is canonical,
and a name is the family's where the value is:

- **No lamp but the Veil's haze sits on its token.** `recolor` (`rosterModels.ts`) sets a model's register
  by its brightest material, lamp bases included, and seven lamps carried a token as their
  base — five the same token as their light, and the Knights' panel glow and sheath the
  crystal-glow token under lights of their own. On the Consortium's Bastion, Refinery and Turret
  (`work_lamp`, `port_glow`) that base was the anchor at 2.2× `iron_grey`, so the grey
  rendered at 0.109 where the ceiling is 0.160; on the Directorate's Light Scout, Corvette,
  Harvester, Cruiser and Submersible (`red_photophore`, `photophore`) it was the anchor at
  3.25× the red beside it (`abyssal_red`, or `edge_red` on the Submersible), so the red
  rendered at 0.096 where the tergite hulls put theirs at 0.160. The Knights' three
  (`crystal_core_glow`, `crystal_panel_glow`, `heat_shimmer`) anchored nothing under the
  Cruiser's `pale_alloy` and the Spire's `alloy_white`, and moved for the rule. Each went onto its family's near-black, and where
  nothing but a roughness under an emissive was left to tell two names apart, the family's
  name took it: `amber_lamp`, `biolight_crimson`, `crystal_seam`. The panel glow keeps its
  name for its own light, the sheath for its six percent. No strength moved — which puts
  one name on two materials inside a file for the first time, the Bastion's and the
  Refinery's `amber_lamp` at 2.4 and 1.1, the Veil's `bio_light` at 2.2 and 0.9 and the
  Commune Cruiser's at 1.6 and 1.5: one fixture at two loudnesses, which every consumer groups by material rather than by name
  (`recolor`, `mergeByMaterial`, `check.mjs`), and which `parts.mjs` cannot tell apart.
  The Submersibles' and the Barge's heavier finishes went with their names: the Consortium
  Submersible's grey keeps 0.68 of its colour as diffuse where it kept 0.40, its black 0.75
  where it kept 0.45, and the specular a lower metalness loses gives most of that back — the
  Barge, carrying the same move, reads about five percent lighter in the conn view
  (`891-structures-before-after.png`, the 55° row).
- **The hyphenated names folded.** The Submersibles', the Baffle Barge's and the Spore
  Veil's r184 names went onto the names that share their hex, at the hulls' value or the
  structures' where the structures have a name of their own —
  `hull-black` onto `hull_black` and so on down the Consortium's five (the running light
  shared `amber_lamp`'s emissive and took its base), `chitin-hull` onto
  `chitin_hull`, `spore-pale` onto `spore_pod`, `algae-teal` onto `algae_membrane` on the
  hull and `algae_hull` on the structure, `deep-chlorophyll` onto `deep_chlorophyll`, `biolum-vein`, `bio-vein` and `bio-vein-dim`
  onto `bio_light` — and four kept their value and lost the hyphen only: `baffle_foam`,
  `growth_ring_dark` and `algae_teal_dark`, hexes of their own, and `spore_haze`, a fixture
  of its own.
- **The Commune's pairs.** `biolight_green` was `bio_light` on a second near-black, and is
  `bio_light`; so was the Cruiser's `bio_vein_lit`, on a green (`#2A4A20`), and it is
  `bio_light` at its 1.5; `spore_pale` was `spore_pod` to the value, and is `spore_pod`.

What stayed, and why. The Knights' structures light a polished fixture of their own, the
crystal-glow token over `#3A2560` at 0.2, under three names — `forge_light` and
`floodlight_glow` because three navies name their Foundry's light `forge_light` and their
Refinery's `floodlight_<own>` (the Consortium's works light `amber_lamp`), and `crystal_glow`
on the Bastion and the Spire — with the
turret's `nav_light` over `#241744` at 0.3: a family polished past the hulls' 0.4, as
`alloy_white` is to `pale_alloy`, and one value under three names because the works' names
onto `crystal_glow` would part the Order's Foundry from the other two and `crystal_glow`
onto a works' name would misname the settlement's lamp. `growth_ring_dark` (`#123C2E`) sits a
shade off `growth_ridge` (`#14382C`) and stays, the rule being by hex. `deep_chlorophyll`
and `algae_hull` are the Commune's
structures' names beside the hulls' `chitin_hull` and `algae_membrane`, a step of finish
apart on purpose (`factions/pelagia.mjs` says why); `spore_haze`'s base is the token at
0.16 opacity — a glow with nothing under it, and the one lamp left on its token; the
Directorate's `edge_red` is a lit cladding, the abyssal-red token glowing faintly at 0.12,
and where it anchors the Submersible it does so at the red's own 0.0512, exactly where
`chitin_red` anchors every tergite hull; and the Commune Cruiser's `sensor_frill_lit` is a
lit membrane, two-sided like the sheet it is, on a green of its own (`#3F6B2E`, in the
registry above) under `spore_pod`, anchoring nothing. The Drifter's four `bay_valve_*`,
open quarter-shells in single-sided `algae_membrane`, were checked at 12° of pitch from
eight bearings against a two-sided render of the same file: nothing differs but a
one-pixel silhouette fringe that rings the closed chitin orbs too, and a 3-px see-through
at the bow tip where the pod's lathe is open at its point — no valve, and older than this
change. A valve's one open edge is its equator, facing down, so no camera above the
waterline sees in, and the membrane stays single-sided.

One correction landed with the #649 ports and belongs here rather than in a module comment:
`#5FAE42` was described as the biolight token at half strength. It is not a scaling of
`#8FE36B` at all — its linear channels are 0.42, 0.55 and 0.37 of it — but a hue of its
own, the Sower's.

## Block 2c — facets and panels, one rule a navy

Block 1 asks for "low-to-mid poly with crisp facets", and until #919 no navy could say what
that meant in a number. Every round part carried whatever count its first author picked —
Phase 3 ported each faithfully and Phase 4 built beside it — so on `9502d0e` a Consortium
cylinder ran from four sides to twenty-eight and a Commune ring from four to a hundred and
twenty-six, with no rule a reader could state. This section is the rule: **one facet edge
a navy**, so that a part's count falls out of its size and re-faceting a fleet is one
number in its module. `tools/hull-models/facets.mjs` is the measure, and its header says
how a ring is read; each navy's module exports `facets` and `panels` beside its `ink` table,
and the measure names every ring off the rule and every model outside its band.

**The chord rule.** A round part of radius *r* carries
`n = offset + step · round((2πr / edge − offset) / step)` facets, held between a floor and a
ceiling: the count whose facet is nearest the navy's edge, on the lattice `offset + k · step`
— every count at step 1, the even ones at step 2, the odd ones at step 2 from 1. A *ring* is
any closed run of facets round an axis — a cylinder's or a lathe's rim, a torus's ring and
its tube, a capsule's round, and a sphere's parallels **and its meridians**, which are rings
under the same rule. A ring that closes in a fraction of a turn is held to that fraction of
the rule's count, so a sphere is `(n, round(n / 2))` — never the `(32, 16)` three.js defaults
to — and an odd rule does not call every orb wrong for closing its meridians in half a turn.
A part scaled flat is read at the radius its widest facet is a chord of, so a squashed
tergite is judged as the wide thing it is.

**A section keeps a count, not a shape.** A four-sided spar is a square, a five-sided spine
a pentagon, a six-sided horn a hexagonal crystal: a shape the navy cuts at any size, listed
in its `sections`, and the rule never rounds it. But the measure cannot tell a six-facet
horn from a six-facet silo, so a listed count keeps *every* prism, pipe, ring and tube at
that count in the navy, and a navy lists one only where every ring at it is its own — each
paragraph below names what its sections keep. A section never exempts an orb or a
capsule, which are round by what they are: a six-round lamp bud is a coarse circle, not a
hexagon, and the rule judges it.

**Panels** are the other axis: how finely the chart sees a surface divided from above. The
measure takes every unlit part that owns at least a quarter of a square metre of plan at the
maps' four cells a metre and reports the edge of the median one, `√(median area)`; a lamp is
light, not panel. The edge rather than a count per area, because a count per area is a
statement about size — the Consortium's 20 m Spark reads 28.7 panels a hundred square metres
and its Bastion 0.03, for the same riveted plate — where the median edge holds across a
hull's length and reads as its navy. It counts parts, so a plate split into coplanar pieces
of one finish lowers the median and changes nothing the chart sees: the pass moves a median
only with a division that shows, a seam that reads in value or relief or a fitting that
stands proud. Each navy bands it twice, hulls and structures, because a structure's pads are
not a hull's plates. The structure band is the hull band at the chart's ratio of densities,
4 px/m to 1.5 px/m ([graphics-standards.md](graphics-standards.md) §6), rounded to the half
metre — the same grain on the chart. That is a judgement and not a derivation: 1.5 px/m
was chosen for a structure's memory class (`tools/hull-maps/build.mjs`), and in the conn
view a structure's parts are drawn at the same metres as a hull's, so the ratio says a
structure is dressed 2.7× coarser than a hull, taken because it is the one number in the
law that relates the two classes and the one the pass can argue against with a screenshot.

| Navy | Facet edge | Floor | Ceiling | Step | Sections | Hull panel | Structure panel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 2.5 m | 6 | 16 | 2 | 4 | 0.75–2 m | 2–5.5 m |
| Commune | 1.5 m | 5 | 24 | 1 | — | 1.5–5 m | 4–13.5 m |
| Directorate | 2.0 m | 5 | 21 | 2 from 1 | 5 | 1–3 m | 2.5–8 m |
| Knights | 3.0 m | 4 | 12 | 2 | 4, 6 | 2–6 m | 5.5–16 m |

What the rule yields, facets a turn at the radii a hull is made of:

| Radius | 0.5 m | 1 m | 1.5 m | 2 m | 3 m | 4 m | 5 m | 6 m | 10 m |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 6 | 6 | 6 | 6 | 8 | 10 | 12 | 16 | 16 |
| Commune | 5 | 5 | 6 | 8 | 13 | 17 | 21 | 24 | 24 |
| Directorate | 5 | 5 | 5 | 7 | 9 | 13 | 15 | 19 | 21 |
| Knights | 4 | 4 | 4 | 4 | 6 | 8 | 10 | 12 | 12 |

Read across, the table is four languages, and the first thing it says is the law's own
ranking of the four navies' curves. "Organic, curved" is the roundest; a chitin shell is
round but hard; "no curve unless a pressure vessel demanded it" is boxes with a few
cylinders; the Order is planes. So the edges are a ladder — a metre and a half, two, two
and a half, three — that runs from the navy that grows to the navy that polishes, and from
two metres of radius up the yields table ranks them so: the Commune carries the most
facets and the Order the fewest, with the Directorate and the Consortium between them in
that order. Under two metres every navy sits on its floor, where the Consortium's six is
over the grown navies' five, because a floor is what a drum needs to read as a drum and not
where a navy stands on curves. The steps are
four lattices: the Consortium and the Order build in pairs, on a jig or against a mirror,
and carry even counts only; the Commune grows, and a grown ring has however many segments
it grew; the Directorate grows regimented, and carries odd counts only — the one lattice on
which no facet has a facet opposite it. The ceilings are judgements on one criterion — the
coarsest polygon a navy's largest bodies may show in silhouette at the rim — ordered as the
edges are, 12, 16, 21, 24, every one under three's default of 32 radial segments, which is
the smooth render Block 1 refuses; the law names no angle, and none is claimed. The floors
are what the smallest parts land on, since at a metre and a half of edge or more the rule
rounds everything under half a metre of radius to the floor: a six-plate drum, a five-fold
stalk, a five-sided spine, a four-facet blade.

**What the two views see.** The conn view shades three's primitives smooth, so a facet
shows there as silhouette and not as a face: the count is what the eye reads at the rim of
a drum or a pod, at every size, and it is what the edges and ceilings above are argued on.
The chart bakes the geometry into a height map and its relief draws a facet as a band of
its own shade, but only where the band spans cells: at the maps' 4 px/m a hull's facet
under half a metre is two pixels and a gradient, and at 1.5 px/m only a structure's facet
over about 1.3 m registers ([graphics-standards.md](graphics-standards.md) §6). So the
chart is what the panel bands answer to, and the floors sit where its smallest parts land.

**Consortium.** "No curve unless a pressure vessel demanded it" ([factions.md](factions.md))
ranks the Klaxon's curves third of four — rounder only than the Order's planes — so its
edge is the third rung, two and a half metres, and its detail is on its boxes rather than
in its curves. At the rim a Consortium drum is a rectangle bent round in a few flat plates,
and that is what the approved Bulwark shows: its turret ring is sixteen-sided at 12 m of
radius and its shrouds twelve at 5 m, and this edge keeps both, brings its ballast from
twelve to ten, and cuts its guns and stacks — ten-sided at 1.7–2.6 m, the finest thing on
the hull and a finer plate than the rest of it carries — to the six-plate drum a small
vessel is. Six is the least a drum reads as a drum rather than a box, and the Klaxon's
boxes are boxes. Sixteen is the ceiling, a judgement like the other three: a sixteen-gon is
still a polygon at the rim, and it is what the Bulwark's turret ring and the Derrick's
barbette carry. The approved drums above it are the shared kinds' pressure vessels — the
Corvette's and the Cruiser's cylinders and caps at twenty-eight on 3.5–4.4 m of radius, the
Light Scout's hull at twenty — their ballast drums at eighteen and twenty, the Corvette's
and the Cruiser's shrouds and the Derrick's deck scuff at twenty-four, the Foundry's tanks
at eighteen and the Bastion's dome ribs at thirty-six, every one of them the pass's to
bring to sixteen or under. Plates go on in pairs, so the step is two: on an even count the crown and the
keel are alike — both the middle of a plate at 6, 10 and 14, both a seam at 8, 12 and 16 —
and the two flanks mirror; on an odd count neither is the middle of anything and the drum
reads as leaning, which is the Directorate's language and not this one. The hulls' drums
carry 6, 8, 10, 12, 14 and 16 and no odd count (the Bulwark 8, 10, 12 and 16; the Tender 6
to 12); the odd counts are the r184 structure passes' — nine on the Bastion's ballast
drums, the Refinery's silos, caps and ballast and the Turret's mount drum, seven on the
Refinery's crusher stack — and a few five-sided wheel tubes and cables under 0.2 m of
radius. The one section is four, a square: it keeps the wedge noses of the Spark and the
shared kinds (`kit.mjs` `cyl`, "the Klaxon's nose") and five cables on the Gantry, the
Bastion and the Slipway, which at 0.3–1 m of radius read the same at four as at six.
Panels run from three-quarters of a metre to two. A rivet head reads 0.6–0.8 m from above
and a cable or a dog wheel less, and the Klaxon rivets its plates rather than building a
hull out of rivets, so a median part under three-quarters of a metre is a hull of fittings
and no plate; and a plate two metres on a side is the largest a patch is before a seam
crosses it. "Riveted, patchworked" is half the unlit parts on a hull being fittings under
two metres — rivets, knuckles, dogging wheels, seams, ports — and "over-engineered" is the
plates over them being small too.

**Commune.** "Grown, so nothing is quite regular" (`factions/pelagia.mjs`); "organic,
curved"; "growth rings". A grown thing adds the same increment whatever its size — a growth
ring is the width it is on a bud and on a bladder — which is exactly what a chord rule says,
so this is the navy where the rule is most literally the law, and the roundest navy takes
the finest edge, a metre and a half: the Sower's ribs, bud, stem and seed pods and the
Spinner's sacs are cut between one and two metres a facet, and its bladder and pod carry
the same counts on a bigger body at two to three and a half, which is the count language
the rule replaces. Any count, so the step is one: no jig closes a grown ring in pairs, and
the Bower's and the Blight's stalks are seven-sided on purpose. Five is the floor, the
living number — five petals, five arms, the Harvester's tendrils — the count a stalk shares
with a Directorate spine under a metre and a third of radius, the lattice above it being
where the two part. Twenty-four is the ceiling, the roundest rim in the roster, and it is
twenty-four rather than thirty for gate 6 ("What the rule costs", below). No sections,
because nothing grown is a prism; a quill is a thorn, cut on the floor. The rule does not
reach a table: the Light Scout's, the Corvette's, the Harvester's and the Cruiser's bodies
are `grownBody` orbs whose every vertex is their export's own, and re-cutting one is a
different hull with a screenshot of its own (`factions/pelagia.mjs`), so the measure names
them and the pass leaves them; the Bower's is a formula in the kit's frame and regenerates
at the rule's count. Panels run a metre and a half to five: a Commune hull is few, large
parts — a leaf is one plate, a pod one orb, a fin one membrane — so its median part from
above is bigger than its facet says. The two grown navies swap places between the facet
column and the panel column, and that is the difference between a pod and a crab.

**Directorate.** "Spiked, insectoid, segmented crustacean forms"; "nothing is symmetrical;
everything is regimented" ([factions.md](factions.md)). The facet is a segment of shell,
two metres — the second rung, a shell being rounder than plate and harder than a pod — and
the Dredge's mandibles and claw and the Precentor's dome are cut at 1.7–2.2 m a facet. Odd
counts only, so the step is two from one: a regular polygon with an odd count has no facet
opposite a facet and mirror lines only through a vertex and the far edge's middle, so laid
on the hull's axis with a vertex to starboard, as the kit's `cyl` lays it, it mirrors crown
to keel and never port to starboard, the law's own axis — "asymmetric, yet regimented" in
one shape — and both approved hulls with a dorsal rank cut every spine five-sided. The pass
lays every odd ring so and never turns one a quarter facet, which would put a vertex on
the crown and mirror it across the keel line. Five is the floor. Twenty-one is the ceiling,
set between the Consortium's sixteen and the Commune's twenty-four on the odd lattice. The
one section is five, and it keeps a count: every five-sided spike at any size — the spine
is a pentagon the way the Order's spar is a diamond, where the lattice alone would cut the
Bastion's anchor claws at seven metres of base to twenty-one — and with them nine
pentagonal torus rings and tubes on the structures, the Bastion's seam rings, lips and
pipes, the Turret's collar and the Foundry's launch mouth, which pass as pentagons. Four is
not a section here, and that is a call still open (#919), so this is what it costs.
Dropping it re-cuts 118 rings: the shared kinds' three rostra (the module's own are six-
and eight-sided), the Cruiser's sixteen dorsal spikes and the Submersible's nine, the
Harvester's fourteen teeth, seven skirt tips and two claw tips and the Refinery's eight
teeth, eight mandibles, the Verger's eight hatch dogs, seven ridges, four nubs, the Lure's
plectrum, the Cruiser's head shield, the Turret's three antennae, the Foundry's four
finials and three cables — and twenty-eight square tubes on seams, collars, barbs and
flanges. Under the rule a four-sided spike or beak becomes a five-sided one at the floor, a
near-round point rather than a square-section one, and that is the change to weigh. Three
readings: keep four as a section, round 1's table, which keeps the seam tubes and cables
with it; drop it, this table, on which the Verger's dogs and the Lure's plectrum at five
are more the navy than they were; or a section keyed by count and by part — four on a
rostrum, a spike, a tooth, a mandible, a dog, and on nothing else — which `keeps` does not
read yet and would take a dozen lines. The owner picks before the pass builds the
Directorate. The keels' seven is a builder's default on four hulls and not a
section; the plates' twelve is one count on every size of tergite, and an even one; both
are the rule's to re-cut. Panels run one to three metres, argued from what the measure
counts, which is unlit parts. The navy's unlit vocabulary is plates and seams, which are
wide, and spines, limbs, dogs and teeth — a spine 2–3 m on a side from above, a limb about
two — and "spiked, insectoid, many-limbed" is three of the law's four words for the small
parts against one, "segmented", for the wide. A hull whose median unlit part is under three
metres carries at least as many spikes and limbs as plates and seams; one whose median is a
plate is the segmented half of the law without the spiked half. The Dredge, this rule's own
facet reference, reads 5.2 m: its block asks for five wide overlapping tergites and it has
them, with five spines, a claw and a boom and no limbs, so under Block 2 it gains limbs or
spines at the pass — its rows of small points are photophores, livery
([style-neon-noir.md](style-neon-noir.md)), which the metric drops.

**Knights.** "Hard geometric facets and mirror-finish surfaces that catch light no other
faction produces"; "crystalline"; "the only faction with true bilateral symmetry"
([art-direction.md](art-direction.md)). Planes are the least curved of the four, so the
Order's edge is the top rung, three metres: the Responsory's blade lathes ten facets of
2.8 m at 4.6 m of radius and the Clarion's drive and emitter are cut at 2.8–3.1. Even
counts only, so the step is two: a regular polygon with an even count has a mirror line
every half facet, through opposite vertices and opposite edges alike, so laid on the hull's
axis it mirrors port to starboard — the law's own axis — however the kit turns its first
vertex, and crown to keel besides; an odd ring mirrors on one axis only. Four is the floor,
the blade's diamond. Four and six are the sections, and each keeps a count: four keeps
every spar, point and prism in the navy, and six every hexagonal prism — the horns, lips
and drives (the Clarion's horn carries 5.5 m faces and keeps), the stays, struts, pins,
pipes, masts and legs at 0.35–1.9 m of radius where the lattice would say four, and on the
structures the Refinery's silos at 18–27 m of radius, the Foundry's wing halls at 33–40, the
Bio-reactor's cistern and the Tocsin's bell and collars. That is by design: quartz is a
hexagonal prism at a millimetre and at a metre, and a resonance tower is a crystal the size
of a building. On the Order, then, the rule is mostly its sections — a hull here is
diamonds and hexagons almost through — and the chord governs what is neither: the rings,
the pips and the structures' drums. Twelve is the ceiling, a dodecagon at the rim, a cut
stone; past it a ring is a wheel, and the Responsory's and the Antiphon's twenty-eight-facet
resonator rings are the pass's first cut. Panels run two to six metres: planes — a wing, a
fin, a spar — and the seams "the Order builds nothing bare" adds, centred on the Clarion's
3.9.

**What the rule costs.** Gate 6 ([graphics-standards.md](graphics-standards.md) §6) allows
the own force on screen — five hulls and a dozen structures — 250 k triangles, and an orb's
triangles go as the square of its count. Estimated by scaling each round part's triangles
by its new count over its old, ring by ring, the table costs: Consortium hulls 53 k → 41 k
and structures 17 k → 21 k; Commune hulls 48 k → 66 k and structures 35 k → 108 k;
Directorate hulls 30 k → 50 k and structures 27 k → 52 k; Order hulls 10 k → 8 k and
structures 16 k → 13 k.
The Commune's ceiling is the one number that moved for it: at thirty its eight structures
came to about 144 k, the Foundry alone 7 k → 32 k, which with a dozen on screen is the whole
gate; at twenty-four they are 108 k. Nothing else moves for the budget, and the pass
measures the real figure with the probe rather than this estimate.

**The baseline, and the pass.** Measured by `node tools/hull-models/facets.mjs` on
`9502d0e`, before any of it is applied (the ring totals below are the measure's before it
read capsules; it reads them since `a36b87e`):

| Navy | Rings | Distinct counts a turn | 1.5–4 m radius: median (range) | Hull panel edge | Structure panel edge |
| --- | --- | --- | --- | --- | --- |
| Consortium | 1,119 | 15 | 10 (4–28) | 1.1 m | 8.2 m |
| Commune | 1,182 | 35 | 8 (4–22) | 2.9 m | 8.0 m |
| Directorate | 1,404 | 24 | 6 (4–14) | 2.0 m | 7.2 m |
| Knights | 598 | 16 | 4 (4–10) | 3.9 m | 9.4 m |

The table above was derived from the law and the reference hulls, never from that baseline
— where a paragraph above quotes a reference hull's cut, it is corroboration — and where the
two disagree the law wins. So the rule names 789 of the Consortium's 1,119 rings off it —
581 of the 787 on hulls, the drums that carry one count on every radius — 1,092 of the
Commune's 1,240 (456 of the 526 on hulls, seven of them the four ported `grownBody` bodies
the pass leaves), 1,068 of the Directorate's 1,418 (569 of the 681 on hulls), and 251 of
the Order's 616, fourteen of them on hulls, since an Order hull is sections almost through.
Outside the bands: eight Consortium hulls (the five shared kinds, the Chorister and the
Tender at 2.3–3.9 m, and the Beacon at 0.5) and five structures; two Commune hulls (the
Bower at 0.8 m, the Submersible at 7.3) and three structures; three Directorate hulls (the
Verger, the Submersible and the Dredge, 4.0–5.2 m) and four structures; five Order hulls
(the Versicle at 1.5 m; the Reciter, the Responsory, the Antiphon and the Offertory at
6.1–7.2 — the Responsory's block asks for fine ceramic panelling, so its 6.4 is a finding
and not a doubt about the band, and the Reciter, at 6.1 m over eleven parts, is within one
part of the edge) and three structures — every Bastion among them, and three of the four
Foundries.
The pass that applies the table — the second half of #919 — is what brings those to zero,
one navy at a time, each under a `hull-reviewer` pass of its own; the table itself moves no
GLB.

The environment props (Block 4) carry no rule: "nothing manufactured" is the whole of their
law, a crag's drum is a table under its export's own jittered vertices, and a chord is a
gauge. The measure reads the fourteen and judges none.

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
pressure carapace, folded manipulator limbs, dim red photophores, and a
fainter red along the plate rims, the tail joints, the rostrum and the
claws.
```

```text
UNIT — Harvester (any faction): industrial nodule-mining vessel (SIG 18
idle; mining follows the throttle, up to 68 at Overdrive). Wide cargo body,
external intake dredge gear; dim at rest — running lights or marks along
the hull, the dredge gear dark or marked no brighter — floodlit when it
mines, the same lamps brighter, which reads as its loud state.
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
six seams over the horn's back and shoulders, dark astern but for one
mark — louder than a Corvette in front, quieter behind.
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
runs, twin prop tunnels notched into the stern. Sustained glow from the two
welding bays and a long roof skylight over the workshop, ten lit port boxes
standing proud of the deckhouse walls under the eaves, and a vent grating let
into each stern quarter of the deck over the prop tunnels; floodlit when it
works.
```

```text
UNIT — Bulwark (pair with Consortium): the heavy, 150 m — the loudest hull
in the game (SIG 70 idle, 75 cruise) and the widest beam of the rung. A
slab: blunt ram bow with a plough plate and teeth, blunt stern, three
stepped armour tiers, flank plates patchworked older-under-newer, one
enormous forward twin turret (an 800 m gun), a bridge citadel aft, four
stacks and three prop shrouds. Burning bright: floodlit deck surfaces and
rows of floods along both deck edges, lit ports down the citadel's flanks
and across its bridge, six raised vent gratings lit along the transom's lip
and a bow lamp on the foredeck over the plough — the loud state is the
resting state.
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
along the boom, the starboard rank one longer, a studded listening dome,
folded walking limbs. Nearly black: four photophores in a pattern that
repeats on neither side.
```

```text
UNIT — Dredge (pair with Directorate): the hull for the floor of the map,
120 m — the roster's only PR-4 entry (SIG 40 idle, 52 cruise). The Abyssal
Submersible's deep body with the Directorate's armour grown over it: five
wide overlapping tergites with a spine off each, a scoop bow with mandibles
and a glowing gullet, one great folded claw to port and the dredge boom to
starboard, a hopper amidships lit around its throat. Sustained glow: rows
of photophores along every plate edge.
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
the Bulwark's riveted plate and a plated weather deck inside its rim, a raised
bridge castle aft with two stacks, two great hold doors along each flank hinged
at the sill with hinge rails and dogging wheels, crane gantries over a foredeck
hatch, ballast blisters low on the hull, and four prop tunnels in a heavy skeg.
Lit along the hold-door seams and the bridge ports, and floodlit when the doors
open.
```

```text
UNIT — Drifter (pair with Commune): the quiet way in, 62 m — two berths of hull
at 90 m/s and SIG 10 (4 idle; 10 cruise; 16 with a full hold; no weapon; 300
hull). A slim seed-pod hull of grown shell, the two berths as a pair of
swelling bays amidships under a membrane that opens like a bivalve, a single
muscle-drive fluke astern and trim vanes rather than planes. Almost dark: a
faint bioluminescent seam along each bay, brightening only as it opens, and
one navigation mark at the bow.
```

```text
UNIT — Verger (pair with Abyssal Directorate): the cohort's way down, 100 m —
four berths of hull taken below the Shelf line at PR-3 (SIG 14 idle, 26 cruise,
38 with a full hold; no weapon; 800 hull). A deep-pressure hull, ribbed and
domed like the Precentor's, with four cohort bays set into its belly behind
pressure hatches low on the flanks, a listening dome forward, ballast tanks
flanking a heavy keel, and a single ducted drive. Lit low and cold at the hatch
rims and at a boss on the dome's crown; the doors behind the rims stay dark
until the bays are occupied, when they glow through their hatches.
```

```text
UNIT — Antiphon (pair with Hadron Knights): the Order's way of arriving, 110 m
— three berths of hull, and what it lands, lands with +1 PR for twenty seconds
(SIG 12 idle, 35 cruise ahead, 3.5 astern; 44 ahead with a full hold; no
weapon; 700 hull). A faceted blade hull in the Clarion's family with a wide
three-bay landing deck across its back, the three bays let into it, a crystal
resonator ring lying flat around the deck that is the grant made visible, swept
guard wings framing the deck, and the drive in the spine. Lit from the bow back
like every Order hull — a navigation mark at the bow and on each shoulder of the
deck — and dark astern; the resonator ring flares when the deck opens.
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
flanges, a dogged inspection hatch, a stub lamp mast over it; a dogged crew
hatch on the foredeck, ballast blisters low on the hull, one prop tunnel in
a square stern, plate patchworked older-under-newer. Dim amber running
lights along the hull line and the drum's hoop lamps at rest, the hoops
brightening to a sustained glow under way; the drum floods bright for the
instant of a ping, once every twenty seconds, and is dim again between —
the cadence is the light.
```

```text
UNIT — Glider (pair with Pelagia): the quiet way out, 55 m — a hull that cuts
its drive and coasts, still under way at 35 of its 105 m/s (SIG 8 idle, 16
cruise, 1.8 gliding; no weapon; HYD 45). A winged seed, and a plan not
mirrored across its keel: a slim grown seed body on the
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
The limbs are the array and the model shows them down, planted in a
hexapod's tripod stance — fore and hind together a side, the middle limb a
half-stride the other way — which is the posture it hears at 85 in; under
way they fold flat under the shell. Nearly black: a photophore on each
limb's knee, in a pattern the stance keeps from repeating on either side.
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
crystal in the throat and the one mark astern; under way, sustained glow
along the tines' inner edges, thrown forward out of the fork, and dark
astern but for that mark — the quarter it is loud in is the quarter it
faces, and the quarter it shows you is the one it runs in.
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
forward casing's tail, saddled to the flank, a hinged muzzle door on its
forward face, a dogged breech door at its tail with a lit hoop round the
casing ahead of it, so the plan is a box with two teeth a side and the teeth
are the count. A chamfered ram bow, a square stern with two prop tunnels
notched into it and two lit vents proud of the transom between them, a
low bridge citadel aft, a dogged crew hatch on the foredeck, ballast
blisters under the casings, plate patchworked older-under-newer. Between the
casings the deck is bare plate — no turret, no crane, no mount: the hull is
a box four tubes are bolted to, and once the four doors have opened there is
nothing on it that points at anything. Sustained amber glow from the hoop at
each breech door, the bridge ports and the stern vents, and one mark at the
bow; each muzzle door floods for the instant of a launch, four times in
twelve seconds, and is dark again after.
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
collar and the one mark astern; under way, sustained glow along the guard's
leading edges and up the rail to the collar, thrown forward, faint on the
beam and dark astern but for that mark — the quarter it is loud in is the
quarter it can fire into.
```

### The siege hulls — one a navy, and four answers to a wall

The four siege hulls of [units.md](units.md) "The siege hulls" (wave 4 of
[roster-plan.md](roster-plan.md), #508), each its navy's way of taking a wall down, and only
one of them a gun ([systems-combat.md](systems-combat.md) §9, "A weapon that is not a
weapon"). What a siege hull's silhouette has to say at RTS distance is *what it does to a
wall*: cutters that reach, a seeding arm that does not, a resonator that is an instrument
rather than a weapon, and a barrel with the whole hull braced behind it. Three of the four are
a working state made into geometry, and the model is generated in it, as the Glider was with
its drive cut: the Furnace with its cutter ladders run out, the Lure with its fan spread, the
Tocsin braced and firing. The lighting clause is therefore three bands rather than the
idle/cruise pair — at rest, under way, and working — because the working figure is a band
jump for those three (the Furnace's 55 to 75, the Lure's 24 to 55, the Tocsin's 55 to 88),
and the Tocsin's are cone figures, lit ahead and dark astern like every Order hull. The
Blight is the fourth and the exception on purpose: it has no working figure, nothing on it
brightens when it seeds, and the wall it seeds goes on sounding exactly as it did — the
silence is the design claim, not an omission.

```text
UNIT — Furnace (pair with Consortium): the cutters, 115 m — thermal cutters,
the same tool that opens kelp, turned on plate at 320 m, on a hull that must
stand still at a wall for half a minute while a Bulwark keeps the line off it
(SIG 40 idle, 55 cruise, 75 cutting; cutters that do 100 to a structure and
9 to a hull every two seconds at 320 m, so a Corvette out-trades it four to
one; 900 hull; 32 m/s; 380 nodules). A riveted box hull — the Tender's
workshop turned outward — with three cutter ladders run out ahead of the bow
from a boxed gantry frame, one on the keel and one either side: each a
lattice boom with a hooded burner head at its end and gas lines strapped
along it back to the manifold, so the plan is a box with three prongs at the
bow and the prongs are the count. Behind the frame the manifold house — the
workshop itself, its forward face to the bow with the manifold header lying
across it under the ladders' heels and a valve wheel to each — and behind
that the gas plant, two ranks of banded gas cylinders in racks on the deck
with lamp housings on the rack rails, a pump house and pipe runs between
them; a bridge citadel aft; ballast blisters low on the hull; two prop
tunnels in a square stern; plate patchworked older-under-newer. The flanks
are bare — no casings, no tubes, no turret — because everything this hull
does, it does ahead of itself at arm's length, and a burner head is a nozzle
under a hood, not a muzzle. The model is the hull with its ladders run out,
which is the state it is built for; under way they stow raised against the
frame. Sustained amber glow from the gas plant's lamps — the lamp housings
on the rack rails and the manifold house's skylight, its ports beside them
— then the bridge ports and the stern vents, at rest and under way alike;
cutting, burning bright — the three burner heads the brightest thing on the
hull, the bow floodlit from the frame, the ladders and the manifold lit
along their length, visible machinery light: a siege you can hear being
prepared.
```

```text
UNIT — Blight (pair with Pelagia): the spore, 80 m — a hull that seeds a
Deepbloom strain on a structure at 350 m and leaves, and the strain eats 1%
of the wall's maximum hull a second for 60 s, 60% of it and never the last,
while the wall's own SIG never moves (SIG 10 idle, 20 cruise, and no working
figure; no weapon; 340 hull; 60 m/s; 300 nodules and 60 Resonance Crystal).
A split seed: a slim grown pod with growth rings, widest a little forward of
amidships and never wider at the bow than at the waist, its husk parted at
the bow into two rounded lobes that curl outward, and standing in the cleft
between them the seeding arm — a short jointed stem folded back on itself
with the spore head at its tip, a pale sac under a membrane, reaching no
further than the husk's own lips; one spore sac sunk into the back
amidships, showing through the shell as a paler dome; leaf trim vanes
forward; a muscle-drive fluke astern. The arm does not reach and is not a
boom: this hull seeds by coming close and touching, and the plan is a pod
with a cleft nose, curved everywhere, not a fork. The model is the hull with
its husk open and the arm presented, which is the state it seeds in; under
way the lobes close over it and it is a seed again. Nearly black at rest,
navigation marks only, the sac's dome unlit; under way a dim vein along the
stem. Nothing on it brightens when it seeds — no flare at the arm, no light
in the sac, no change on the wall — because the silence is the weapon: every
other way of taking a wall down announces itself, and this one is a Refinery
whose hull is falling with nothing to hear.
```

```text
UNIT — Lure (pair with Directorate): the song, 100 m — a PR-3 hull that
sings for 60 s and doubles what fauna hear from anything within 500 m of the
point it sang at: the Listening does not knock the wall down, it tells the
Drift where the wall is (SIG 14 idle, 24 cruise, 55 singing; no weapon; HYD
60; 560 hull; 40 m/s; 280 nodules and 50 Biomass). A segmented deep body,
ribbed and domed like the Verger's — a rostrum, three overlapping tergites,
a jointed abdomen, folded walking limbs, a ribbed pressure keel — with the
abdomen's last segment spread into a sounding fan: five chitin plates opened
wide astern, two a side about a telson, a file ridge down the abdomen's back
with a plectrum limb raised over it, and a resonating bladder in the abdomen
forward of the fan, showing through the segment as a paler dome. The fan is
an instrument and not a weapon — nothing on it points and nothing on it
fires — and the plan is a rostrum forward and a fan astern, widest at the
stern, where the sound leaves it. The model is the hull with its fan spread
and the plectrum raised, which is the state it sings in; under way the
plates fold into a telson and the limb lies flat. Nearly black at rest,
photophores in a pattern that repeats on neither side; under way a dim row
along each tergite's edge; singing, sustained glow — the bladder's dome lit
through the shell and each plate of the fan lit along its rib — because the
song is the loudest thing this hull does, and it is still a band short of a
cutter.
```

The Lure carries no faction lock — the Biomass is the lock, as the Chorister's, the
Acolyte's and the Thurible's are — so a navy rendering for one fields the same plan, the
segmented body, the fan spread astern and the raised plectrum, composed with its own FACTION
block, with the light kept nearly black at rest and a band short of a cutter when it sings.

```text
UNIT — Tocsin (pair with Hadron Knights): the bell, 105 m — an energy gun
with 1,400 m of reach that fires only while stationary, and stationary it is
the loudest thing in the water short of a ping: outranged by nothing, caught
by anything that reaches it (SIG 22 idle; 55 cruise ahead, 19.3 on the beam,
5.5 astern; 88 firing ahead, 30.8 on the beam, 8.8 astern; a 70-damage gun
that does 200 to a structure at 1,400 m; 340 hull; 55 m/s; 340 nodules and
40 Resonance Crystal). A bell in plan, bilaterally symmetric, laid on its
side with the crown forward and the mouth astern. The barrel stands out of
the crown: a faceted emitter rail on the centreline, a third of the length,
ending in a crystal muzzle collar. Behind it the whole hull is the bell — a
faceted skirt of pale alloy widening in one unbroken flare from the crown's
shoulders to a lip astern that is the widest beam on any Order hull, a
violet crystal spine down its back from breech to lip, and at the lip's two
corners brace blades that swing out and down when the hull stops, and lock;
in the mouth of the bell, the drive prism, dark, because a hull that is
firing is a hull that is not moving. No guard wings, no crossguard, no
canards — nothing of the Lance's chevron or the Reciter's needle: the barrel
is thin and the hull is wide, and neither is anything without the other. The
model is the hull braced and firing, which is the only state it fires in;
under way the blades fold flat along the skirt and the prism is lit. Dim at
rest but for the crystal in the collar and the one mark astern; under way,
sustained glow up the rail and along the crown's ridge seams, thrown
forward, faint on the beam and dark astern but for that mark; firing,
burning bright — the rail lit from breech to muzzle, the crystal spine lit
down the skirt, heat-shimmer about the collar — with the mouth of the bell
still dark, because the quarter it is loud in is the quarter it fires into.
```

### The line hulls, and the anchor — the Corvette twice, and a bed with a drive

The three hulls of [units.md](units.md) "The line hulls, and the anchor" (wave 5 of
[roster-plan.md](roster-plan.md), #509): the two navies that had been opening, massing and
dying in a hull nobody owns get their own line hull, and the Commune's heavy, which is not a
heavy. What a line hull's silhouette has to say at RTS distance is *whose Corvette this is*,
because the duel is the Corvette's duel — both carry its two hardpoints and its 50 — and
everything that differs is what the doctrine did to the hull around them: the Caisson is the
skirmisher's wedge made in plate and no longer tapering, the Reed the same wedge drawn out to
a stem. The Bower is the third and a state made into geometry, as the Glider was with its
drive cut and the Lure with its fan spread: the model is the hull grown out, because the
anchor is the thing it is for. The lighting clauses are what the numbers give. The Caisson's
is one band at every posture, as the Bulwark's is, because 64 idle and 64 cruise is a plant
with no throttle; the Reed's is the idle/cruise pair as ever; the Bower's is three bands — at
rest, under way and grown out — and its grown-out figure is the Sower's 45, *heard* at 18
because the cloud it grows suppresses everything inside it, itself included. The model's
lamps are the 45, the 36–60 band, and the 18 is the haze over them: the cloud is fog and not
lamps, exactly as the Spore Veil's own prompt has it, so what dims a grown-out Bower is drawn
around it and never on it.

```text
UNIT — Caisson (pair with Consortium): the line hull that cannot hide and
has stopped trying, 90 m — a Corvette with a third more plate, a slower
drive, and a plant that runs at one volume whether or not it is moving,
four above the Klaxon's line at every posture (SIG 64 idle, 64 cruise, +25
firing; the Corvette's gun, 50 at 550 m; 560 hull; 70 m/s; PR 2; 170
nodules). A pressure box: the skirmisher's wedge made in riveted plate and
no longer tapering — a blunt plough bow, a flat plate face with chamfered
corners, flanks parallel from the shoulders aft to the step at two thirds
of the length, then a step in to the bare drive hull and a square stern
with two prop tunnels. The caisson is the step: a box of heavier plate bolted over the
forward two thirds, riveted, patchworked older-under-newer, its after edge
standing proud of the drive hull as a shoulder — the third more plate,
visible in the plan. On its back the plant: a riveted pressure cylinder
lying fore-and-aft along the spine with dished heads, two stacks abreast
of it, and a rank of exhaust louvres down each side that have no shutters,
because there is nothing aboard to throttle. The Corvette's two torpedo
tubes let into the bow face either side of the plough plate, with hinged
muzzle doors; a low bridge citadel abaft the plant; ballast blisters low
on the hull. Nothing aboard is there to quiet it: no baffle, no acoustic
shroud, no cowl on anything. Burning bright at
rest and under way alike — the louvres the brightest thing on the hull,
the stacks lit at the throat, floods along the caisson's edge and the
bridge ports — because the loud state is the only state; the muzzle doors
flood for the instant of a launch. No dim state is drawn: the one quiet
this hull has is Silent Running, and that is the trade stated once — the
quiet or the 12%, never both.
```

```text
UNIT — Reed (pair with Pelagia): the line hull that wins the fight it chose,
70 m — faster, thinner and quieter than the Corvette it replaces, with the
Corvette's gun 130 m shorter, and the fight it loses is any other (SIG 12
idle, 20 cruise at 100 m/s, +25 firing; 50 at 420 m; 340 hull; PR 1, a
reed grows in the shallows; 105 nodules). A reed: a slim grown stem, the
thinnest gun hull in the roster, with a fine nose, growth rings at two
nodes where the stem swells, and a narrow leaf blade off each node swept
aft — one to starboard at the forward node, one to port at the after node,
alternate as a reed's leaves are, so the plan is not mirrored across its
keel and is still balanced. The Corvette's two hardpoints grown into the
stem below the nose as a pair of hollow nodes with lips, one a side, the
seed torpedoes inside them; a narrow deep muscle-drive fluke astern, the
drive of a 100 m/s hull. No wing, no bulbs, no sac, no bloom: a reed is
hollow, and this stem is tubes and drive and nothing else. Nearly black at
rest, navigation marks only; under way a dim vein along the stem from node
to node, the leaves unlit; the two lips flare for the instant of a launch
and the stem is dark again.
```

```text
UNIT — Bower (pair with Pelagia): the anchor a swarm forms around, 105 m —
a Spore Veil with a drive: slow, quiet, no gun, and stationary for 30 s it
grows out a cloud at half the Veil's radius, 175 m, that suppresses
everything inside it, itself included, and it is a nursery for Spinner
magazines within 300 m whether it is moving or not (SIG 10 idle, 16 cruise,
45 grown out and heard at 18; HYD 40, 5 grown out; no weapon; 620 hull;
40 m/s; PR 1; 360 nodules). The Veil Mother's bed with a drive: a broad low
grown body, an oval in plan and the broadest hull the Commune has grown
as one body, its edge made of
overlapping lobes that alternate a side at a time, a blunt grown nose, and
a broad short muscle-drive fluke astern. Paired gill organs let into the
back along each flank with vent slits, exhaling the haze; slender spore
stalks standing off the back in a swaying rank, as the Veil's do; and the
nursery under the lobes along each flank — brood pouches showing through
the shell as rows of paler nubs, where a Spinner's mine regrows. No gun,
no arm, no sac, no bloom-bed: this is the Veil's own bed and not the
Sower's leaf, and nothing on it points at anything. The model is the hull
grown out — lobes spread, stalks standing, gills open and the haze rising
— which is the state it anchors in; under way the lobes fold in over the
bed, the stalks lie flat along the back, the gills close, and it is a seed
again. Nearly black at rest, navigation marks only; under way a dim
breathing line around each gill; grown out, sustained glow — the breathing
lines lit around the gills, the stalk tips lit, the brood nubs faint along
the flanks — and all of it seen through its own haze, because the 45 is
heard as 18 and the cloud is what does that: fog over the light, never
less light, and the haze is drawn around the hull and not on it.
```

### The carriers — one a navy, and a deck built empty

The four carriers of [units.md](units.md) "The carriers" and their four craft, "The craft"
(wave 8 of [roster-plan.md](roster-plan.md), #838; built in #840). No carrier carries a gun,
so what its silhouette has to say at RTS distance is *where its flight comes from*: the deck,
which has to read from straight above at 1 px/m. Every deck is built empty, for a mechanical
reason rather than a doctrinal one. A craft aboard is the deck's count and not an entity
([systems-combat.md](systems-combat.md) §15), and a craft in the water is drawn as itself,
so a craft modelled aboard would be drawn twice whenever the flight is out. Each cradle is
cut to its craft instead, and the craft is drawn by the space it leaves. Three navies' modules
hold the craft's plan once, read by both scripts; the Commune's sheaths are sized to a Runner
with its leaves folded. A craft is a hull nobody crews: no bridge, no hatch, no port. The
lighting clauses are the idle/cruise pair as ever. The +35 of a launch is the one transient
every carrier shares, and the Order's two are cone figures, lit ahead and dark astern.

These eight were authored outside rule 3's model of record, by the owner's decision on #840.
They are a series break like any built hull, and answer to their blocks and the round trip.

```text
UNIT — Gantry (pair with Consortium): the loud deck, 140 m — a yard's
gantry crane with a drive under it, the Slipway's line carried to sea, and
no gun at all: its deck builds two Sparks and launches them out of its
stern, louder than anything else in the water and meant to be (SIG 52
idle, 66 cruise, +35 at every launch; no weapon; HYD 45; a flight of two
Sparks, rebuilt one every 45 s; 1,500 hull; 38 m/s; PR 2). A riveted box
hull, the drive, with a yard deck laid across its after three quarters
and carried out 5 m past both flanks on knees, so the plan is a narrow
chamfered bow and a broad square back. Down the middle of the deck runs
the slip, open at the stern: two long riveted shops flank it — the
Slipway's halls afloat, pilastered, ridged, a hazard stripe along each
inner eave, one banded stack and a rank of louvres over each engine room
aft — and a bridge house spans its head, with a stores hatch and a dogged
crew hatch on the foredeck ahead of it. The two berths lie on the slip in
tandem, both bow-aft to the mouth: each a rim of hazard paint cut to a
Spark's plan, the craft's two ways and four corner chocks inside it, a
stop across its stern end, and nothing on it, because a Spark aboard is
counted and not drawn; the after berth's ways run on to a lit launch sill
and a gate across the mouth hinged at its foot. Over the slip, parked
between the berths and the tallest thing on the hull, the gantry: an
A-frame leg a side on a bogie riding a rail along each deck edge, a box
girder across the whole beam, the trolley under it with its fall and a
lifting beam as long as a Spark's corner posts are apart, the operator's
cab slung off its starboard end. Twin prop tunnels notched into the stern
either side of the mouth, ballast blisters under the deck's overhang,
plate patchworked older-under-newer. No turret, no tube, no mount, no
hydrophone: nothing on this hull points at anything, and the deck is what
it fires. Sustained glow at rest — the line lights down both edges of the
slip, the girder's worklight, the launch sill and the engine-room louvres,
the light the chart reads — with the stack throats, the bridge ports and
the cab's ports for the eye that gets closer; burning bright under way on
the same lamps, because 66 is over the Klaxon's line; the gate drops and
the slip floods for the instant of a launch, and the deck is back to its
glow after.
```

```text
UNIT — Spark (pair with Consortium): the Gantry's craft, 20 m — a cell
with a screw and a gun, built on the Gantry's slip and launched out of its
stern, crewed by nobody, and over the Klaxon's line under way, so its gun
carries the +12% and it is what a torpedo aimed at its carrier hits (SIG
40 idle, 62 cruise; 22 at 350 m on a 2.0 s cycle; 120 hull; 70 m/s; PR 2,
and no depth drive — it holds the band it was launched into; 120 s in the
water before the cell runs out). The Consortium's two shapes and nothing
else: a banded pressure cell lying fore-and-aft, dished at both heads, in
a riveted lifting frame — a rail down each side, a skid under each rail
that sits the Gantry's ways, a post at each corner with a hazard cap and a
lifting eye on its head for the gantry's lifting beam — so the plan is a
rectangle round a cylinder, and the rectangle is the berth's; a square
wedge of a nose bolted to the frame, a bumper plate across its tip with
the hazard band on it; one short thick gun on an open ring on the cell's
crown forward, no shield; a riveted drive box aft with the exhaust louvres
laid on its roof and an open four-bladed screw behind it, no shroud and no
cowl. No dive planes and no ballast, because nothing on it changes depth;
no bridge, no hatch, no port, because nobody rides it. Sustained glow from
the exhaust louvres, the brightest thing on it, and one mark on the nose;
burning bright under way on the same lamps; the muzzle flares for the
instant of a shot.
```

```text
UNIT — Rootstock (pair with Pelagia): the strike nobody hears, 115 m — a
stolon with a drive, putting out Runners the way a plant puts out daughter
shoots: four craft at SIG 4 and no gun on the hull at all (SIG 8 idle, 16
cruise, +35 at every launch — its one loud moment; no gun; HYD 45; 620 hull;
55 m/s; PR 1; 340 nodules; a flight of four Runners, rebuilt one every 30 s).
A long slim grown stem swelling at four nodes, a growth ring girdling each,
closing forward to a rounded growing tip with a fifth ring forming behind it,
and drawn out astern to a peduncle and a short flat muscle-drive fluke, its
port lobe the shorter. At each node, a side at a time — starboard, port,
starboard, port — a budding sheath springs from a knuckle on the flank and
reaches forward and out: a boat-shaped bract of membrane split open along
its top, a broad rounded lip round a deep dark hollow the length and girth
of a Runner, pointed at the end the craft's nose lay in, with one pale scar
at its root where the daughter was attached. Four sheaths, each its own size
and angle, none opposite another, and all four empty: the sheaths are the
count, and a craft aboard is not drawn. From straight above the hull is a
dark stem carrying four pale rims round four dark slots. No gun, no mast, no
dome: nothing on it points at anything. Nearly black at rest, navigation
marks only — one on the crown behind the tip, one on the fluke; under way a
dim vein along the stem from node to node; a sheath's lips flare for the
instant a Runner clears them, and the deck is dark again.
```

```text
UNIT — Runner (pair with Pelagia): the daughter shoot, 14 m — the craft a
Rootstock puts out, the smallest hull the renderer draws and the quietest
thing in the water: nobody builds it, nobody orders it and nobody crews it
(SIG 4 idle, 9 cruise, +10 firing; a gun, 14 at 300 m on a 2.0 s cycle; HYD
20; 70 hull; 95 m/s; PR 1 and no depth drive; 120 s in the water). A
seedling that swims: a small grown seed body, fullest a little forward and
closing to a point at the bow, one growth ring at the node its two seed
leaves spring from — a pair of small membrane leaves swept aft, opposite and
unequal, the starboard the larger — and a narrow deep muscle-drive fluke on
edge astern, the drive of a 95 m/s hull. Its gun is one hollow lipped node
grown under the chin to starboard with a pale seed in it. No cabin, no
hatch, no dome, no mast: nothing on it is for a crew. Aboard it lies in its
carrier's sheath with its leaves folded along its body — the sheath is its
length and girth — and the model is the craft in the water, leaves spread,
the one state in which it is drawn. Nearly black at rest and under way
alike: one navigation mark on the crown and nothing else lit; the node's lip
flares for the instant it fires and is dark again.
```

```text
UNIT — Succentor (pair with Directorate): the deep deck, 130 m — the
precentor's deputy, a carrier that sits in the Abyssal and launches its
flight into the band it is already in. It has no gun of its own; its gun
is five Trebles, somewhere else (SIG 20 idle, 30 cruise, +35 at every
launch; no gun; HYD 60; PR 4, the Dredge's water; 900 hull; 34 m/s; 300
nodules and 60 Biomass). The Dredge's deep carapace drawn out round a
deck. Aft, two small tail plates with the Dredge's raised ridge and a
spine each, a telson and two tail spines. Amidships, five broad low deck
plates, the flattest back the navy grows, with no lip between them. At
the bow, a ridged head plate carrying the Precentor's studded listening
dome at four fifths of its size, with its violet aft dome off the
centreline, and a rostrum. On each deck plate sits one cradle,
alternating sides from the bow as a Dredge's spines alternate: three to
starboard and two to port, the starboard rank one longer. Each cradle is
laid with its bow 30° outboard, so from above the five are ribs swept
forward off a spine, and the count reads at 1 px/m. Each cradle is cut
to the Treble that is not in it: a dark floor in the craft's own plan
with a margin all round, and a steel coaming round it from the stern,
open at the mouth. Past the mouth the floor runs on as a tongue between
two launch mandibles, with a sill across the opening and two clasps
standing open at the craft's waist. The deck is built empty: a craft
aboard is the deck's count, and a craft in the water is drawn as its
own. Spines stand off the deck's rim between the mouths, so each flank
reads mouth, spine, mouth. Walking limbs fold under the deck. Dim: a row
of photophores down each flank of the deck, never answering across the
keel, and a sill lit across every cradle's mouth. Each mouth floods for
the instant of a launch and is dim again after.
```

```text
UNIT — Treble (pair with Directorate): the Succentor's craft, 16 m — a
cohort that does not come home. Very many, cheap and slow, crewed by
nobody, built on a deck and launched into its carrier's band, which it
never leaves (SIG 8 idle, 14 cruise; a 12-damage gun at 320 m on a 2.2 s
cycle; HYD 30; PR 4 like the hull that built it; 90 hull; 45 m/s; no
price and no yard). The Chorister's cohort plan cut down to a craft:
three overlapping tergites, the middle one widest, each with the
Dredge's raised ridge, its carrier's deep armour. A short rostrum, and a
telson closing a blunt transom. One small spine-gun off the centreline
on the fore plate, two dorsal spines on alternate sides, and a steel
clasp lug either side of the waist where a cradle's clasps close. No
bladder dome, no limbs, no listening dome, no hatch: nothing a crew
would need. Its plan is the cradle's, because the Succentor's berths
are cut to this outline. Nearly black: two navigation marks, one on
each side and never opposite, barely visible.
```

```text
UNIT — Offertory (pair with Hadron Knights): the carrier, 120 m — the two
that are brought up: a deck and no gun, whose two craft leave over the bow
or not at all, so an Offertory launching is an Offertory facing the fight
(SIG 18 idle; 48 cruise ahead, 16.8 on the beam, 4.8 astern; +35 on the
hull at every launch; no gun at all; 520 hull; 58 m/s; PR 2; 420 nodules
and 40 Resonance Crystal; a flight of two Versicles). A deck, a guard and a
grip in plan, bilaterally symmetric. The deck is a flight deck laid over
the fore half of the crown, with two cradles let into it side by side, each
an empty well cut to a Versicle's own plan — point forward, a straight
blade, the swept guard, a narrow grip — with a dark floor and a pale alloy
coaming round it, so the craft that fits the cradle is drawn by the space
it leaves; the deck's prow is chamfered either side of a flat nose, a
launch sill lies along each chamfer ahead of its cradle, and a plain alloy
point stands out ahead of the nose, because there is no gun to put there.
Between the cradles a spine runs forward to the prow with a crystal inlay
let into it. The guard is two crystal-edged blades swept out from under
the deck's after corners, their leading edges at 45° to the keel — the
cone's own 90°, and the craft launch only into it — and the widest thing
on the hull. The grip is a narrow faceted shaft aft, a spine along it and
a dorsal fin over it, to the drive prism in the spine, whose base is the
stern: nothing behind the guard to hear. The cradles are built empty: a
craft aboard is the deck's count and not a hull, and a craft in the water
is drawn as itself. Dim at rest but for the two launch sills, a mark on
the deck's nose and one mark astern; under way, sustained glow up the
spine's inlay to the prow and along the guard's leading edges, thrown
forward, faint on the beam and dark astern but for that mark; each cradle
floods for the instant a craft clears it and is dark again — the deck
opening is the one loud thing this hull does, and it does it facing you.
```

```text
UNIT — Versicle (pair with Hadron Knights): the craft, 22 m — the
Offertory's, and the hardest craft in the roster: built by a deck, ordered
by nobody, crewed by nobody, and launched only at what its carrier faces
(SIG 20 idle; 50 cruise ahead, 17.5 on the beam, 5 astern; the energy
class's +10 discharge; 45 at 500 m on a 2.6 s cycle; 150 hull; 80 m/s; PR 2
and no depth drive). A dagger in plan, bilaterally symmetric: a point, a
blade, a guard and a grip. The point is the emitter crystal, standing on
the blade's nose as the bow. The blade is a faceted spar drawn to it along
straight flanks from the guard, a pale alloy ridge down its back with a
crystal fuller let into the ridge. The guard is two swept alloy bars,
crystal-edged, their leading edges at 45° to the keel — the Lance's
crossguard at a fifth of its span — each drawn to a point, and the widest
thing on the craft. The grip is the same spar drawn in behind the guard to
the drive prism, whose base is the flat stern and a hand wider than the
grip, with a small dorsal fin over it and a keel blade under the guard. No
canopy, no hatch, no ports, no marks: nothing on it a crew would need. Its
plan is the Offertory's cradle exactly, less a hand's clearance all round.
Dim at rest but for the emitter crystal at the point; under way, sustained
glow along the guard's leading edges, thrown forward, and dark astern with
no mark; a discharge is a pulse out of the crystal and gone, never a
muzzle flare.
```

## Block 3b — STRUCTURE (one per generation)

Architecture anchors from the Rendering Target and Base Identity sections of
[art-direction.md](art-direction.md); SIG from [units.md](units.md). Replace "vessel"
framing: these are anchored to the seabed.

Two structures have no [units.md](units.md) block, and their figures come from two places
each rather than one: the Vent Tap's working pair from [economy.md](economy.md) §2, the
Bio-Reactor's rendering 50 from [systems-flora.md](systems-flora.md) §2 and §7 — both SPEC
— and each one's *idle* figure from `packages/shared/src/structures.ts`, where it is
TUNABLE. A block below states the pair and cites neither, as the other fifty-one do: a path
is not something a generator can read, and this is the file's one place for saying where a
number came from.

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
at rest: the forge light across the bay and at its mouth, the bay's guide
lights or rim strips, the gantries' lamps, and the navy's own lamps on the
halls and the mouth — running lights, photophores, veins, seams, ridges or
crystals; the same forge light flooding from the bay when producing.
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
faint bioluminescent breathing lines around the gills, a faint glow in the
haze they exhale, faint vein rings round the lobes and dim lit tips on the
stalks only.
```

```text
STRUCTURE — Cantor (pair with Directorate): listening dome — a grown,
chitinous hemispherical shell studded with hydrophone spines (SIG 35 idle).
Dim red photophore constellation across the dome and round its foot, and a
lamp at the tip of the quill off its apex.
```

```text
STRUCTURE — Sounding Spire (pair with Hadron Knights): tall crystalline
resonance spire, bilaterally symmetrical, pale alloy frame around a violet
crystal core (SIG 80 when active, directional). Dim at rest: the crystal
glowing low from core to apex, the horn tips with it, and running lights
up the frame; burning bright along the crystal when active; heat-shimmer
distortion.
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

```text
STRUCTURE — Bio-Reactor (any faction): the bed's income — the Vent Tap's
argument on living ground, bolted into a kelp holdfast instead of a vent,
and it eats the cover it stands in (SIG 25 idle, 50 rendering). A render
vessel standing over the
holdfast on a low footprint slab, three intake arms reaching out into the
canopy on booms, each ending in a cutter rake and a feed throat that
carries the crop back in; the Biomass outflow off the vessel to a
dispatch hopper; anchor feet driven into the holdfast at the foot of every
arm. Dim at rest: the slab's run lights and one mark on the vessel's
crown. Lit rendering — the three feed throats, the vessel's ports and the
outflow burning while crop is coming in, which is also when the canopy
over it is going. A reactor found quiet has stripped its own bed bare.
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
`Footprint` is the canonical scale hull-intake sizes against (`--footprint-m`) and the
runtime draws at, taken over the parts' own boxes rather than their vertices (#876);
`Height` is the vertical silhouette the 55° camera actually reads, by intake's measure
(`sizeM.height`) at the row's footprint — a single figure is the approved model's to the
metre, a range the band a generated one lands in; `Tris` is the per-instance budget;
`Light` names the licensed world-light family, `none` meaning any emissive fails intake:

| Biome | Slug | Footprint | Height | Tris | Light |
| --- | --- | --- | --- | --- | --- |
| Thermal Veins | `env-vent-chimney` | 12 m | 25–40 m | ≤ 800 | `vent-ember`, tip only |
| Thermal Veins | `env-vent-basalt` | 15 m | 8 m | ≤ 400 | none |
| Kelp Forest | `env-kelp-cluster` | 18 m | 60–80 m | ≤ 400 | `flora-biolight`, tip points |
| Kelp Forest | `env-coral-tower` | 15 m | 25–35 m | ≤ 600 | none |
| Abyssal Trench | `env-trench-spire` | 20 m | 40–60 m | ≤ 600 | none |
| Abyssal Trench | `env-trench-slab` | 25 m | 14 m | ≤ 300 | none |
| Resonance Field | `env-resonance-crystal` | 12 m | 18–30 m | ≤ 600 | `crystal-seam` |
| Resonance Field | `env-resonance-pylon` | 10 m | 31 m | ≤ 500 | none |
| Coral Ruins | `env-ruin-block` | 25 m | 15–25 m | ≤ 400 | none |
| Coral Ruins | `env-ruin-dome-shard` | 40 m | 16 m | ≤ 600 | none |
| Coral Ruins | `env-coral-growth` | 12 m | 9 m | ≤ 400 | none |
| Rock (any biome) | `env-rock-crag-a` / `-b` | 30 m | 30–50 m | ≤ 500 | none |
| Open Water | `env-open-boulder` | 12 m | 6 m | ≤ 300 | none |

Four heights moved to their approved models (#879): the trench slab from 10 m, the
resonance pylon from 25 m, the dome shard from 20 m to 14 m and the coral growth from
8 m; #883 then moved the shard's again, to its new file's. The
footprint is the scale, and the height follows it. The pylon and the growth were drawn to
the old figures, and the fit to their footprints stretched them (`seabed.mjs` `stand`).
Since #876 the runtime draws at intake's measure, so a row's height is what the game
draws before the registry's scale jitter.

`env-ruin-dome-shard` was a whole closed dome until #883, sixteen meridians round, which
its slug and the checklist's "nothing that could be mistaken for a structure" both refuse.
It is now a broken piece of one: 130° of a 44 m dome's foot, the shell torn to a jagged
top, four ribs that each stop under, past or short of the tear, and its fallen pieces
inside the arc. It is authored as a formula in
`tools/hull-models/props/ruin-dome-shard.mjs` rather than ported from an export, and its
row's height is what that file measures.

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

Every row of this table was filled by a Claude Design model from the Block 4 batch; the
deterministic generator that stood in for the batch was retired when the last row
landed ([graphics-standards.md](graphics-standards.md), "The environment branch").
Each file is now written by a script under `tools/hull-models/props/` (#869) that ports
that model part for part — or, for the dome shard, replaces it (#883) — composed from
`tools/hull-models/seabed.mjs`, and held at the row's footprint. A model generated from the prompts above replaces its row through that
script: port the export into it, run it, run intake with the row's footprint, cap and
light, commit the GLB with the script, and update the registry row's triangle count from
the intake report. The environment registry, the placement rules and the kelp sway read
the file, not its author.

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
Every base colour a prop carries is a token in [style-neon-noir.md](style-neon-noir.md)
"The props", which is also where a new one is added first.

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
- [models-plan.md](models-plan.md) — how the blocks below that have no model yet become scripts (#540, Phase 4)

### The mid-tier — two guns that read SIG

The two hulls of [units.md](units.md) "The mid-tier" (wave 7 of
[roster-plan.md](roster-plan.md), #531): the step between the line hull and the rung's, for
the two navies that had been naming a common Cruiser for it and never building one. What
these silhouettes have to say at RTS distance is **what the hull listens with**, because for
the first time in the roster the gun is aimed by hearing rather than by range — the Derrick
picks the loudest thing in its reach and the Responsory is paid by how loud that thing is. So
both carry a visible listening organ that no other gun hull has, and it is the biggest thing
on each: on the Derrick a lattice, industrial, standing out to both beams as the widest part
of the hull; on the Responsory a pair of resonator shoulders let into the Order's own cone,
breaking a Clarion's clean spine exactly where a Clarion has nothing. The lighting clauses
are what the numbers give, as ever. The Derrick's is a pair — under the Klaxon's line at rest
and over it under way — which is the one Consortium hull whose brightness is a decision
rather than a constant, and the opposite of the Caisson's single band. The Responsory's is
the Order's: dark at rest but not black, the cone lit and the flanks not, and the discharge
is the energy class's +10 rather than a kinetic flash, so it pulses rather than flares.

**These two were built rather than generated, and that is now the path rather than the
exception** (rule 3, "Built"). The approved models in
`docs/concept-art/models/` are all `THREE.GLTFExporter` output — three.js scenes of primitives,
not sculpts — so the Derrick and the Responsory were authored as such, from the prompts below,
and went through the same door as every other export: both cleared `hull-intake` with no
warnings, metre-true, and calibrated onto gate 3's curve with headroom — the Derrick at E 28.3
on its idle 58, the Responsory at E 3.1 on its compass 27. The one thing the bake taught that
the prompts did not say: the maps are top-down, so a louvre flat on a hull's side has no plan
area and a lit feature has to face *up* to count — the Derrick's light is on its deck floods,
its frame beams, its cradle lamp, its stack throat, its roof gratings and, since #893, the
louvres of a raked hood down each side of its machinery house, stepped so that every blade
shows from above, and four bridge ports boxed out past the house's forward eave; the
Responsory's rides the top of its horn.

```text
UNIT — Derrick (pair with Consortium): the gun that aims by ear, 120 m —
a mid-tier gun hull that shoots the loudest thing it can hear rather than
the nearest, under the Klaxon's line at rest and over it the moment the
drive turns (SIG 58 idle, 66 cruise, +30 firing; one heavy shell, 105 at
700 m on a 3.0 s cycle; 1,050 hull; 50 m/s; PR 2; 330 nodules). A pier
under construction, made to swim: a blunt riveted working hull, squared
bow with a rubbing strake across it, parallel flanks, square transom with
two prop tunnels. Standing off both beams amidships and the widest thing
on the hull, the derrick itself — an open riveted lattice frame, four legs
braced in X, carried out over the water a third of the beam each side, and
slung under it in a cradle the listening array: a rank of eight bare
hydrophone drums hanging on cables, no fairing, no shroud, swaying. That
frame is the hull's argument and must read at distance as the biggest
thing on it. The single gun forward of the frame in an open barbette,
short and thick, no shield. Behind the frame a riveted machinery house
with louvred sides and one stack; a pile hammer stowed vertical against
the after leg, head down; deck plating scuffed bare in a ring around the
gun. No baffle, no cowl, no cone: this navy does not hide and does not
point. Sustained glow at rest — six deck floods, work floods along the
frame's top beams, the roof gratings and the louvres of the raked hood
down each side of the house, the stack lit at the throat, four bridge
ports boxed out past the house's forward eave, and a hard lamp in the
cradle throwing the lattice's shadow across the deck; the drums dark — and
burning bright on the same lamps the moment the drive turns, because 66 is
over the Klaxon's line and the loud state is the state this hull is bought
to be in.
```

```text
UNIT — Responsory (pair with Hadron): the reply, 95 m — an Order gun hull
paid by how loud its target is, half again as hard against anything over
the Klaxon's own line and ordinary against everything under it (SIG 60
idle, 78 cruise as cone figures, 35.1 over the compass; the energy class's
+10 discharge; 70 at 750 m on a 2.6 s cycle, ×1.5 above 60; 460 hull;
62 m/s; PR 2; 230 nodules). A Clarion interrupted: the same long forward
spine and the same fall away astern, the faction's shape and not this
hull's — a fine bow array, a hull that narrows to almost nothing at the
transom — broken amidships by a pair of resonator shoulders, one each side,
tuned bronze rings standing proud of the spine in a shallow cradle and
canted outward, listening across the beam where the cone hears nothing.
They are the hull's argument and must read at distance as the one thing a
Clarion does not have. The single energy emitter runs forward along the
spine to the bow array as a slim faired barrel, no muzzle, no doors. Fine
ceramic panelling over the whole hull, seams tight, everything faired —
the Order builds nothing bare. No lattice, no stack, no louvre, no rivet.
Dark at rest but not black: the bow array holding a low standing glow and
the rings cold. Under way the array brightens along its whole length and a
thread runs the spine to the rings, which warm from the inside; the flanks
stay unlit at every posture, because what this hull spends forward it does
not spend abeam. A discharge is a pulse down the spine and out of the
array, held for a beat and gone — not a flash, and never a muzzle flare.
```
