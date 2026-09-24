# The Surveyed Sea — Map Visuals Revision

> The Rift is a place nobody has seen and everybody has measured. The map should look like
> that: dark ground, and on it the lines a survey drew.

This document turns September 2026 owner feedback ([#807]) into a plan. The feedback asks for a
beautiful underwater world, and names four things a focused pass should deliver:

> - Clearer terrain and biome silhouettes at strategic zoom levels.
> - Stronger visual hierarchy between navigable space, hazards, resources, and acoustic ranges.
> - Consistent map color, lighting, and depth cues that support the Echo Layer without
>   revealing unresolved information.
> - A cohesive visual language for authored map layouts and future biome variants.

It came with two references: a screenshot of the old plan view (rectangular biome patches, a
cyan current, dotted fauna blobs) and a p5.js study of stipple jellyfish — bells and tentacles
drawn as clouds of pale dots on black.

The lineage is [three-layer-ocean.md](three-layer-ocean.md), which gave the ground a shape, and
[free-camera.md](free-camera.md), which gave the water a body. This revision gives the ground a
*reading*.

[#807]: https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/807

---

## 1. The feedback, restated as goals

| # | Goal | Source in the feedback |
| --- | --- | --- |
| V1 | Terrain and biome shapes read at survey zoom, not only up close | "clearer terrain and biome silhouettes at strategic zoom levels" |
| V2 | Everything drawn on the map has a place on one loudness ladder | "stronger visual hierarchy" |
| V3 | One grammar for colour, light and depth, and none of it leaks | "consistent … without revealing unresolved information" |
| V4 | A new biome or map arrives with its visual contract already written | "a cohesive visual language for … future biome variants" |
| V5 | The water is inhabited, and beautiful to look at | the stipple-jellyfish reference |

## 2. What already exists

Most of V3 shipped with the last two revisions. The gap is V1 and V2, and it shows in a
screenshot from the survey dolly.

| Goal | What the build already has | Where |
| --- | --- | --- |
| V1 | A sculpted heightfield, a per-biome detail relief and mottle, a stone ramp for rock, cliff shadows. All of it is *shading*, and all of it sits at 5–10% luminance by rule | [art-direction.md](art-direction.md) "Reading the Sea Floor", `seabed.ts`, `perspectiveTerrain.ts` |
| V1 — the gap | **Nothing on the ground is a line.** At an 11 km dolly, a 700 m plateau beside a 2,600 m plain is one dark rectangle next to another. The relief that reads at 1 km is sub-pixel, and the fills are too close in value to carry a shape | the survey frame of any skirmish map |
| V2 | Contacts, rings and glyphs are loud; terrain is quiet; blocked ground is cyan and shown only while a hull is selected | [art-direction.md](art-direction.md), [graphics-standards.md](graphics-standards.md) gate 7 |
| V2 — the gap | The order is right but unwritten, so nothing stops a new layer landing on the wrong rung | — |
| V3 | Depth is luminance on the ground and in the water. Hue belongs to the biome. Three world-light families. The veil is a drain, not a blackout | [art-direction.md](art-direction.md), [style-neon-noir.md](style-neon-noir.md) "World light" |
| V4 | Six biomes, each with a fill, a relief row, a prop set and at most one light family, spread across four docs and three files | §7 below collects them |
| V5 | Tetherjelly fields and Lampfry shoals are public chart data, drawn as stipple in the water since Phase 3 (§10). Classified fauna are stipple shapes since Phase 4 | `faunaStipple.ts`, `faunaAgentStipple.ts` |

The one-line version: *the ground has a shape and a skin, but no survey on it.*

## 3. The idea: the survey is the view

[Art-direction.md](art-direction.md)'s concept plates are **Pressure Cartography**: "the
discipline of measuring things that resist measurement". Plate VII draws the whole Rift as thin
contour lines on black. Nobody in this setting has *seen* the Rift, because there is no light to
see it by. Everybody has *sounded* it.

So the answer to V1 is not brighter ground. The fills stay at 5–10%, the darkness budget stands,
and the shape comes from **survey ink**: thin, neutral lines that the chart already owns,
drawn on the sculpted seabed through the one camera. That keeps the rule that light belongs to
agents and instruments ([style-neon-noir.md](style-neon-noir.md)). Ink is not light. It is what
a survey wrote down.

## 4. Survey ink — SPEC

Two kinds of line, both drawn in the terrain's own fragment shader so they cost no draw call
(gate 6). `packages/frontend/src/game/surveyInk.ts` transcribes this section. The colour is the
`survey-ink` token in [style-neon-noir.md](style-neon-noir.md). Its strengths are SPEC by
reference, the way `WATER_RAMP` is: the values are TUNABLE, the shape is not.

- **Isobaths** are depth contours of the **authored floor**. A minor line every 100 m, and a
  major line at each boundary of the ruleset's depth bands — 400 m (Shelf / Mid-Water) and
  1,800 m (Mid-Water / Abyssal), read from `DEPTH_BANDS` rather than restated. A stack of
  isobaths is how a cliff reads from 11 km. Where the lines fall closer than the eye can split
  them, they are drawn as their average, which is a band of ink along the scarp.
- **Coastlines** are drawn **exactly on the cell edges** where the ground changes kind: solid
  where water meets rock, dashed where one biome meets another. The biome is the propagation
  factor, and a coastline that rounded a corner would draw a PF boundary that is not there.
  Edges on the map's own perimeter are the rim's, not the coast's.

Seven rules ride with the ink, and each is a review question:

1. **Ink traces the authored floor, never the texture.** The detail relief is render-only
   texture; contouring it would dress noise up as measurement. The floor the isobaths read is
   the same bilinear upsample the heightfield uses, minus the detail field.
2. **Ink reveals nothing a client does not already hold.** The floor, the ceiling and the biome
   of every cell are public map data. Ink reads nothing else — no contact, no field, no veil.
3. **Ink is hue-neutral.** One colour, near-grey with the canvas's blue memory, no more
   saturated than the stone ramp. Hue belongs to the biome, and a tinted line would be read as
   one. The four kinds of line differ in strength and width, never in colour.
4. **Ink has a constant screen width.** Lines are measured in pixels at every zoom the camera
   allows, so the survey is as legible at 11 km as at 1 km. That is what makes it the V1 answer.
5. **Ink is not drained by the veil.** The acoustic veil drains what a player can *hear*; the
   survey is what both navies *own*. Gate 7 already asks that the veil's floor still carry the
   ridges and the biome boundaries, and ink is how it does.
6. **Ink fades into the water like the ground it lies on.** It is drawn before the fog, so the
   reach rule in "Reading the Water" governs it with no second rule.
7. **Rock takes no isobaths.** Rock has no floor to measure. It is outlined by its coastline and
   otherwise speaks in stone.

The isobaths are drawn from the smoothed floor, so a contour rounds a cell corner that the
simulation keeps square. That is the same half-cell licence the heightfield already takes
([three-layer-ocean.md](three-layer-ocean.md) §5). A visual slope never opens a route the grid
refuses. Coastlines take no such licence, because they mark sound rather than shape.

## 5. The loudness ladder — SPEC

V2's answer is one ladder. Every mark on the map sits on exactly one rung, and each rung is
quieter than every rung above it. A new layer names its rung before it lands.

*Quieter* means floor against floor. A rung's floor is its quietest steady outline, at its
quietest alpha, in its quietest colour, and it lifts the ground less than the floor of the rung
above, over the darkest and the palest ground, in all four palettes. Nothing is asked of a
rung's loud marks: a live hazard's rim may out-shout a detection ring. The owner settled this
on #866.

| Rung | What sits on it | Voice |
| --- | --- | --- |
| 1 — Water | The depth ramp, marine snow | Luminance only, one blue ([art-direction.md](art-direction.md) "Reading the Water") |
| 2 — Stone | Rock faces, cliff shadows | `rock-face` / `rock-shadow`, below every biome fill |
| 3 — Ground | Biome fills, relief, mottle, props | 5–10% luminance, hue by biome |
| 4 — Survey ink | Isobaths, coastlines | Hue-neutral, thin, constant width (§4) |
| 5 — Map furniture | Hazard sites, resource fields, currents, tunnel routes, Tetherjelly fields, Lampfry shoals, the map rim, acoustic residue | Public, or your own heard residue; conforming, each in its own token |
| 6 — Instruments | Range rings, ping preview, blocked ground, selection, the loudness collar | The interface voice: cyan tells, magenta asks, red warns |
| 7 — Agents | Own hulls and structures, contacts at every tier, ordnance | Loudest; glow is loudness (gate 3) |

**World light stands outside the ladder.** A vent ember is a point of additive light, and it
outshines any line on the map by design: a vent field with no embers is not a vent field. It
is capped by its own five rules instead ([style-neon-noir.md](style-neon-noir.md) "World
light"): points and seams only, the ember as the ceiling, static or on the 5 Hz grid.

**A mark is weighed by its outline, never by its interior.** A kelp field's faint fill and an
inert hazard site's hatching are texture inside a mark whose rim already speaks for it. A
ladder that weighed them would rank the grain of a mark rather than the mark.

**An edgeless haze is not weighed per pixel against a line.** Below Tier 3 a contact is its
column and nothing else: nested ribbons with no edge anywhere
([art-direction.md](art-direction.md) "Camera & Projection"). A fresh Tier-1 column's core is
about 0.12 of its tier colour, so per pixel it lifts the ground about as much as a line of ink
does: 0.044–0.053 over black, against the ink's 0.043–0.051. It is a different kind of mark,
and the metric cannot rank the two. A haze spans hundreds of metres of
water and a line is a pixel or two wide, so the eye reads a haze by its extent and a line by its
edge. The per-pixel metric compares lines with lines; a haze answers to gate 7's glance test.
The owner settled this on #865.

**A fading mark is weighed at its steady peak**, the moment it is fully present. A contact is
weighed at its fresh alpha, not while it fades in or as a ghost. The lock brackets, the
break-silence ring and an order's acknowledgement are weighed at their peak alpha.

**A rimless mark is weighed by its loudest crisp element**, a dot, a hatch line or a dash, at
its peak, as if it were an outline. Soft fills stay unweighed, as the haze does. Blocked
ground is weighed by its hatch. A Tetherjelly field's bells are a mark of their own rather
than its rim's interior, and so is a Lampfry shoal's mote cloud, formed or scattered. A
classified animal is its species' shape in dots (§8), weighed by one dot. Residue's dashed arc
is its outline, weighed at its peak; its three soft rings are fills. The owner settled both
rules on #866. Which peak weighs residue is still open, because the server gives it no single
one (§10).

The ladder is measured, not just stated. A stroke's weight is how far it lifts the pixel under
it, in encoded luminance, which is how a screenshot measures it. The ink blends in encoded
space, the way the mark layer's strokes do, so an ink line and a furniture rim over the same
ground compare exactly. So do a classified animal's dots. Public life's stipple adds instead: a
dot is the fauna colour in linear light times its gain, encoded and added to the pixel, so it
lifts every ground alike. `packages/frontend/src/game/ladder.ts` weighs both. It holds every
outline rungs 5 and 6 draw, and every one rung 7 draws on the chart. Four of rung 5's are its
floor: the quietest outline in each of its three quiet colours — a kelp field's rim while it is
not gripping, a Tetherjelly field's rim, and a simulated hazard's rim while it is dormant — and
an inert hazard site's rim, which the outline rule above leans on. Every other rung-5 mark, the
stipple included, lifts more than the least of them in every palette, and a test holds that near
the eye: the conn view's tunnel routes and map rim fade with the water's fog, so a far one lifts
less. Which is quietest depends on the palette. The draw sites take their alphas from there. The
tests hold every ink stroke below the least of them, over the darkest and the palest ground, in
all four palettes. When furniture gets quieter, the ink has to follow it down. Residue's arc is
the one exception, and the tests record it rather than move the ink: it clears the four at the
scale's ceiling, and falls under them and under the ink at a faint mark's own peak (§10).

**The ink also sits under your own detection ring.** A hull's ring while you have not selected
it is your own exposure ([ui-ux.md](ui-ux.md) §3.5): a line of seabed that out-shouted it
would bury the one reading a quiet navy lives by. `ladder.ts` holds its alpha, the draw site
takes it from there, and the tests hold every ink stroke under it in both colours it is drawn
in. The owner chose the ink coming down on #865, over raising the ring. The ring came up
anyway on #866, from 0.18 to 0.27, to clear rung 5's floor, and the coast stayed at 9.5%. In
tritanopia at mid SIG the ring now lifts the kelp fill by 0.065, which would cap the coast near
14.9%. Rung 5's floor binds first, near 13.3%, in deuteranopia over the same fill.

**The tests hold rungs 4 to 6, and record where rungs 5 and 7 break.** Rung 4 sits under rung
5's floor and under that ring. Rung 5's floor is the least of its four quiet outlines, unless
residue is weighed at a faint mark's own peak, which would put rung 5's floor under rung 4's.
Rung 6's floor is the unselected ring in the standard and tritanopia palettes, and blocked
ground's hatch in the two red-green palettes, whose mid-SIG ring is amber. It lifts every
ground more than rung 5's four quiet outlines in all four. Rung 7's floor on the chart does not
clear rung 6's: a Tier-3 contact's ring and glyph, in its navy's colour, lift some ground less
than rung 6's floor in every palette. The tests pin where, and §10 records it. Rungs 1 to 3 are
the ground every lift is measured over. What rung 7 draws in the conn view cannot be weighed
without a GPU, and §10 says why.

Two consequences worth naming:

- **Acoustic ranges are instruments, not ground.** A ring is rung 6 because it is a
  measurement the player asked for. It conforms to the terrain like paint and outranks the
  terrain it lies on.
- **Fauna splits across two rungs.** A public field is furniture (rung 5); a classified animal
  is an agent (rung 7). They must never share a look, or a Tetherjelly field would read as a
  contact. Both are stipple in `FAUNA_COLOR`, so form holds them apart: an agent's dot is
  larger, hard, blended normally and still, where a public dot is soft, additive and pulsing
  (§10, Phase 4).

## 6. Colour, light and depth — one grammar

V3 is mostly already law. This section collects it, so that the next revision cites one place.

- **Depth is luminance**, on the ground and in the water, and never hue.
- **Hue is biome**, and biome is propagation factor. Nothing else on the ground carries a hue:
  not stone, not ink, not water.
- **Light is loudness.** Agents glow with SIG. The ground emits only through the three world-light
  families, statically or on the 5 Hz grid.
- **Ink is knowledge.** It draws what the survey knows — public map data — and nothing the Echo
  Layer resolved.
- **The ground answers only your own ears.** The acoustic veil drains it where your hulls
  cannot hear and gives it back where they can ([ui-ux.md](ui-ux.md) §4.5). World light steps
  on the 5 Hz grid. Nothing else moves it. It never answers another navy's activity, occupancy
  or presence: a thing on the map that brightens when somebody else is near it is an
  instrument, and instruments live on the HUD.

What must never leak: an unresolved contact, a depth below Tier 3, an animal below Tier 3
(bestiary §3), and anything the veil's field is computed from. None of the ground's layers
reads any of those, and the survey ink reads less than the ground does.

## 7. A biome's visual contract

V4's answer. Every biome supplies the same six things, and a new biome is not drawable until
it supplies all six. The Crystal Convergence and the Sunken Metropolis are made from these
biomes, so they need no new row: their silhouettes come from their floors and their coasts.

| Biome | PF | Fill (`BIOME_COLOR`) | Relief character | World light | Props | Admits public life |
| --- | --- | --- | --- | --- | --- | --- |
| Open Water | 1.0 | `#07131E` | Gentle, 40 m | None | Boulders | Yes |
| Thermal Vein | 0.45 | `#2C130A` | Broken, 95 m | Vent ember | Chimneys, basalt | No — the Ashgrazer's ground alone |
| Kelp Forest | 0.55 | `#0A1E18` | Rolling, 65 m | Flora biolight | Kelp, coral towers, growth | Yes |
| Abyssal Trench | 1.6 | `#040609` | Pressure-smoothed, 40 m | None | Spires, slabs | Yes |
| Resonance Field | 0.7 | `#1A132A` | Faceted, 60 m | Crystal seam | Crystals, pylons | Yes |
| Coral Ruins | 0.8 | `#111A1E` | Terraced, 60 m | Flora biolight | Ruin blocks, dome shards, growth | Yes |

The relief numbers are `BIOME_RELIEF` in `seabed.ts`. PF is `PROPAGATION_FACTOR` in shared
constants. The table restates neither as a source. It collects them so a new row can be
checked against its neighbours.

"Public life" is the Tetherjelly and the Lampfry, the two species drawn as chart data. The
bestiary names their habitats ([bestiary.md](bestiary.md) §4), but the seeder does not place
by habitat. It admits either one on any ground that is not a Thermal Vein and is deep enough
for its working depth (`faunaGroundAdmits` in `packages/backend/src/sim/match.ts`). So what a
biome decides is only whether it admits them.

The six things a new biome supplies:

1. **A PF**, in [systems-echo.md](systems-echo.md) first.
2. **A fill** inside 5–10% luminance, distinct from its neighbours in value as well as hue,
   in all four colour-vision palettes.
3. **A relief row**: amplitude, roughness, blockiness, mottle.
4. **A world-light family, or an explicit "none"**. A fourth family amends
   [style-neon-noir.md](style-neon-noir.md) first.
5. **A prop set** from the environment branch of the pipeline of record
   ([graphics-standards.md](graphics-standards.md) gate 1).
6. **Whether it admits public life** (§8), which the seeder is told, not the renderer.

A new *map* supplies nothing visual. Its look is its floors, ceilings and biomes, because
the survey ink draws the shape the author wrote. An authored layout is legible by
construction or it is a layout problem, not a rendering one.

## 8. The life in the water — stipple

V5's reference is a study in dots: bells and tentacles as clouds of pale points, pulsing,
trailing. That is also what a sonar return *is* — a scatter of points where something gave
sound back. So the game's life is drawn in stipple, and the density of the dots is how much
the Echo Layer knows.

- **Public life is stipple furniture (rung 5).** A Tetherjelly field is drawn as a slow
  pulsing bloom of stipple bells at its public position, inside its true 250 m radius and at
  its public working depth. A Lampfry shoal is a stipple mote cloud. Both were public as discs
  and motes before Phase 3. Stipple changed how they look, never what they say.
- **Pulse in place; never drift sideways.** A bell may contract and relax, and tentacles may
  trail with it. A field may not travel across the chart. Lateral motion states a current, and
  a current is a real mechanic ([hazards.md](hazards.md)). This is the marine-snow argument
  again.
- **Classified animals are stipple agents (rung 7).** At Tier 3 a fauna contact is drawn as its
  species' shape in dots. Tier 4 draws the same shape denser, so more dots means more knowledge.
- **Below Tier 3 there is no stipple.** A fauna contact at Tier 1 or 2 goes through the same haze
  and column as a hull ([bestiary.md](bestiary.md) §3). No dot pattern may make it
  recognisable early. This is rule 2 of §4 applied to animals.
- **Fauna colours stay the palette's.** `FAUNA_COLOR` in all four palettes. The reference's
  cyan and ember options do not transfer: cyan is the interface's voice and ember is the vents'.

The budget is gate 6's, and the two kinds spend it differently. Public life is conn geometry:
one Points draw per kind, a dot cap per field, and the pulse on the GPU. Classified animals are
overlay ink, because gate 5 keeps the enemy out of the conn scene at every tier: no draw call
and no triangle, a fixed dot count per species and tier, and nothing built per frame. Public
life landed as stipple in Phase 3 and classified animals in Phase 4 (§10).

## 9. Gates — what changes, what does not

- **Gate 7 gains a question.** Besides "can you still route through the cold corner?", a
  reviewer asks at the survey dolly: *can you name the plateau, the trench and the rock from the
  ink alone?*
- **Gate 3 is untouched.** Ink does not glow and does not carry loudness.
- **Gate 4 is untouched.** Ink carries no hue, so it cannot contradict a faction's.
- **Gate 6** prices the ink in the terrain's own shader: no new draw call, no new triangle.
- **The art PR checklist keeps its screenshot rule.** A map-visuals change shows the home
  frame, the survey dolly, and one low angle.

## 10. Migration plan

| Phase | Delivers | Touches |
| --- | --- | --- |
| **D — Docs** | This document, and the rows in [README.md](README.md) and the docs it relates | docs |
| **1 — Survey ink** | §4: isobaths and coastlines in the terrain shader, with the ladder test of §5 | frontend |
| **2 — The ladder audit** | §5 applied to every existing layer: each draw site names its rung, and the rest of the rung-5 outline alphas join the four already in `ladder.ts` | frontend |
| **3 — Public stipple** | §8's furniture: Tetherjelly fields and Lampfry shoals as stipple in the water column | frontend |
| **4 — Classified stipple** | §8's agents: Tier 3 and Tier 4 fauna as stipple shapes | frontend |

Phases D and 1 ship together, because a direction nobody can look at is not reviewable.

### Phases D and 1 — landed

`surveyInk.ts` draws §4 in the terrain's own shader, and `ladder.ts` holds §5's rung-5
floor and the unselected ring. The Ventfront at the survey dolly [before](screenshots/issue-807/01-before-survey-55.png)
and [after](screenshots/issue-807/02-after-survey-55.png): the plateaus, the trench and the
tunnel blocks read as shapes. At 18° [before](screenshots/issue-807/03-before-low-18.png) and
[after](screenshots/issue-807/04-after-low-18.png), the ground reads as a sounding. The home
frame [after](screenshots/issue-807/07-after-home-55.png), the Rift Corridor
[at 18°](screenshots/issue-807/05-after-rift-low-18.png) and the Kelp Labyrinth
[from above](screenshots/issue-807/06-after-kelp-top-85.png) complete the set.

Two things the first draft got wrong. It drew the ink as absolute colours, and an absolute
line is loudest over the darkest ground: over a black trench its coast out-shouted a kelp rim.
Blending the ink at an alpha in encoded space, as the mark layer does, is what made §5 a
comparison the tests can hold. And it weighed only two rims. The dormant hazard rim is the
quietest outline in three of the four palettes. Then the unselected detection ring was found
under the ink, and the owner chose to bring the ink down: the coast is 9.5% and the band lines
9%. That is the ladder working: at the survey dolly the ink is quiet, because it has to be.

### Phase 2 — landed

Every draw site in `EchoRenderer.ts` and `PerspectiveView.ts` names its rung, or records that
§5 gives it none. `ladder.ts` holds the alpha of every outline rungs 5 and 6 draw, the
public stipple's dot gains, the share a Tier-3 contact's ring takes and a construction
scaffold's alpha, and the draw sites take them from there. The audit first moved no alpha: it
pinned two breaks and left three questions open. The owner ruled on all five on #866, and one
alpha moved.

The rulings:

- **Quieter means floor against floor** (§5). A live hazard's rim may out-shout a detection
  ring, so the rung-5 outlines that lift black ground more than the ring stop being a break.
- **The ring comes up.** The unselected detection ring goes from 0.18 to 0.27. Tritanopia's
  mid-SIG ring needs more than 0.266 to clear rung 5's floor over the kelp fill, and
  [ui-ux.md](ui-ux.md) §3.5 keeps it under the selected ring's 0.35. Rung 6's floor now clears
  rung 5's in all four palettes, by 0.0010 in tritanopia over the kelp fill. No other alpha
  moved, and the ink did not.
- **A fading mark is weighed at its steady peak** (§5). A contact fresh; the lock brackets,
  the break-silence ring and an order's acknowledgement at their peak.
- **Acoustic residue is rung 5**, your own heard residue beside the furniture. Its dashed arc
  is its outline, weighed at its peak, and its three soft rings are fills. Which peak is open,
  below.
- **A rimless mark is weighed by its loudest crisp element** (§5). Blocked ground by its
  hatch, and the bells and each shoal cloud as marks of their own, by their loudest dot. The
  bells and both clouds lift the ground more than four times as much as rung 5's floor. The
  hatch clears that floor too, and is rung 6's floor in the two red-green palettes.

What stays recorded, for the owner. The tests pin each break and fail if it moves.

- **Residue has no one peak.** The owner ruled its arc weighed at its peak, and the server
  gives it none. A mark is born at its event's intensity, a merge adds the next event's, and
  the sum is capped at 1. A lone torpedo wake is born at 0.05, a lone shot's battle site at
  0.09, a detonation's at 0.35 and a destroyed structure at 1. A hum is born at what its
  delivery carried, so a partial load's can be as faint as the 0.02 below which the server
  drops a mark. Read as the scale's ceiling, the arc clears rung 5's floor in every palette.
  Read as a mark's own peak, a lone wake or shot lifts black by 0.017–0.018, under the minor
  isobath's 0.043. A detonation's lifts it by 0.071: over the ink, and still under rung 5's
  floor there (0.080–0.094). In battle red, the quietest of its four colours, the arc clears
  the coast only from intensity 0.27, and rung 5's floor only from 0.40–0.50 by palette. Under
  that reading rung 5's floor is residue's, and it sits under rung 4's. The tests weigh the arc
  at the ceiling and at 0.02, and pin the break. Neither the arc nor the ink moved.
- **Rung 7 sits under rung 6 on the chart**, in every palette. A Tier-3 contact's ring and
  glyph wear its navy's colour, and the darkest primaries, the Directorate's crimson and the
  Hadron's deep blue and dark teal, sit at 0.17–0.19 luminance. At 0.33 the ring lifts the kelp
  fill by 0.024–0.030: under rung 6's floor there (0.065–0.103), and under the survey ink's
  coast (0.042). A Tier-4 contact's glyph and health bar fall under rung 6's floor too in the
  three palettes that draw the Hadron dark, in tritanopia by less than 0.0001. Ordnance's disc
  does not: the server names no navy for ordnance, so it wears the Track tier's colour. Nor
  does a classified animal. Phase 4 made it dots, weighed by one dot at its tier's alpha, and
  that clears rung 6's floor in every palette. A Tier-3 Sounder's halo fell under it in the two
  red-green palettes until then, and went with the halo.
- **Rung 7 in the conn view is not weighed.** Own hulls and structures are lit models, or
  baked sprites until the model loads, and own ordnance is a lit body with a lamp. What lands
  on a pixel depends on the lights, the texture and the view, and no number for it can be
  taken without a GPU. Gate 3 still sets a quiet hull near black. Tier 1 and Tier 2 contacts
  are the column, a haze, and stay unweighed by the #865 ruling.
- **The palest ground is the palest fill.** The water ramp's shallowest stop, `#0C2A34`, is
  paler (0.143 against 0.099), and the fog carries a far shallow floor toward it. Over it the
  tritanopia ring lifts 0.054 and the dormant eruption rim 0.055. The tests take the fill, as
  the owner's 0.266 was measured.
- **The collar's halos are read as glow.** Gate 3's recipe draws the loudness collar's core at
  full opacity under two halo layers. The audit weighs the core and the dial, and reads the
  halos as the core's glow rather than as outlines of their own.
- **Some placements are the audit's, not §5's.** §5's rows do not name these, and each draw
  site says why it was placed where it is. On rung 6: order routes and their markers, the
  lock flash, the crush and break-silence rings, the ink about own ordnance, a yard's rally
  course, and the health and build bars. On rung 7: a contact's glyph and health bar, a
  construction scaffold, and own depth cues. On rung 1: the skirt at the map's edge.

### Phase 3 — landed

`faunaStipple.ts` draws §8's furniture in the conn view. A Tetherjelly field is nine bells,
each a dome, a rim and trailing tentacles in dots, spread over the field's true 250 m and
hung at its public working depth. A Lampfry shoal is a mote cloud at its public depth: tight
while formed, flung to 120 m and dimmed while scattered. Two `Points` draws in all, a fixed
dot count per field, and the pulse in the vertex shader. A frame writes uniforms and never a
buffer. The buffers are rewritten only when a public layer changes: a field or shoal is born
or dies, or a shoal scatters or reforms.

The six review frames are in [one sheet](screenshots/issue-867/stipple-six-frames.png): the
home frame, the survey dolly, a low angle at 12°, a close look at the bells, and one shoal
formed and then scattered.

What stayed on the chart painter is the field's rim, one of rung 5's floor outlines, and a
scattered shoal's 300 m ring. The disc, the five motes and the halo went. The rim still lies
on the ground while the bells hang in the water. The −0.10 PF is a plan radius, so the rim is
the field's footprint and the bells are the life above it. From an oblique camera the bloom
stands above its rim, not inside it. The owner ruled on #866 that the bloom, like a shoal's
cloud, is a mark of its own, weighed by its loudest dot (§5).

Four choices a reviewer should see:

- **A bell is a figure, not a measurement.** It is drawn at its own shape in world units, like
  a hull model, not squashed by the column's 0.22. Its *position* says the depth. It was
  reviewed on the Ventfront Divide, where duct clusters hang over deep water. On a shallow
  map, such as Marr Plateau's canopy band, the tentacles may reach the seabed; that frame is
  unchecked.
- **Every motion is a scale about a fixed axis.** A bell contracts and relaxes, its tentacles
  follow with a lag, and a shoal breathes and twinkles. Each group of dots that scales
  together averages to its axis, and no term exceeds 1 on the plan, so nothing travels at any
  phase and no dot passes the 250 m.
- **The water fades it, and the veil does not.** Dots dim with distance by the same reach as
  everything else in the water, and the water setting can only reveal them. The veil leaves
  them alone, because it touches ground only ([ui-ux.md](ui-ux.md) §4.5).
- **Reduced motion holds the pulse** and keeps the dots ([ui-ux.md](ui-ux.md) §11).

### Phase 4 — landed

`faunaAgentStipple.ts` draws §8's agents in the overlay's contact symbols, rung 7. Each
species has one template of dots, made from the parts of the silhouette it replaces at the
same `lengthM / 2`. Tier 3 draws the first half and Tier 4 all of it. The first half is every
part's first dots, so a Tier-3 creature is the whole shape, sparse:

| Species | Tier 3 | Tier 4 |
| --- | ---: | ---: |
| Ashgrazer | 20 | 40 |
| Draymaw | 12 | 24 |
| Sounder | 36 | 72 |
| Rasp | 16 | 32 |
| Lampfry | 12 | 24 |
| Tetherjelly | 16 | 32 |
| Hollow | 16 | 32 |

A full roster tracked at Tier 4 is 1,536 dots. The count is fixed per species and tier: no
hp thins a creature, and a Rasp's dots are not a count of the swarm. A dot is 3 CSS px, hard,
solid, blended normally and still, tinted `FAUNA_COLOR` at the contact's own alpha. Below
Tier 3 nothing is drawn, and a test forges a Tier-1 and a Tier-2 payload carrying `fauna` to
show each draws exactly what a hull at its tier draws.

The patterns are shared, built once per species, tier and zoom bucket, so a dot stays about
3 px at every zoom. A frame picks one and writes a tint and an alpha. The conn scene gains
nothing: with 48 creatures tracked at Tier 4 it draws the same calls and triangles as with
none. The five-station drive reads the same calls and triangles before and after, but its
fight station stages no classified animal, so that test is the counted proof. Real-GPU
milliseconds are still owed.

The six review frames are in [one sheet](screenshots/issue-868/classified-stipple-frames.png),
taken on the Ventfront Divide: a Tier-4 Tetherjelly after a ping, on its own field; one Lampfry
at Tier 3 from passive listening and at Tier 4 after a ping, from the same camera; the home
frame; the survey dolly; and a low angle at 14°.

**Weighed under the owner's rulings on #866.** A rung is weighed floor against floor, a fading
mark at its steady peak, and a rimless mark by its loudest crisp element. So a classified
animal is weighed by one dot, fresh and fully arrived, at its tier's alpha in `FAUNA_COLOR`,
blended normally as it is drawn. `ladder.ts` weighs that dot at Tier 3 and Tier 4 with the
rest of rung 7, in place of the silhouette's edge, halo, tethers, ring and motes (Phase 2).
The Tier-3 dot, the quieter, lifts both grounds by at least twice rung 5's floor and twice
rung 6's, in all four palettes. The least margin is in deuteranopia and protanopia over the
palest ground: 0.232 against rung 6's 0.103, blocked ground's hatch.

**Recorded, not held: a public dot can out-lift an agent's.** A formed shoal's brightest dot
is additive light, and at its peak it adds nearly its own colour to any ground. It lifts
0.562 in the standard palette, 0.497 in deuteranopia and protanopia, and 0.459 in
tritanopia. A Tier-4 agent dot lifts 0.531, 0.470 and 0.434 over black, and 0.441, 0.380
and 0.345 over the palest ground. A Tier-3 dot lifts 0.324, 0.287 and 0.265 over black.
Floor against floor allows this, because rung 5's floor is its quiet rims and not its
loudest dot. Both kinds are `FAUNA_COLOR` in all four palettes, so what keeps them apart is
form, and a test holds five axes of it:

- **Size.** An agent dot is 3 px; a public dot is at most 2.4.
- **Edge.** An agent dot is hard; a public dot is soft at its rim.
- **Blend.** An agent dot is blended normally; a public dot adds light.
- **Motion.** An agent dot is still; a public dot pulses.
- **Scale.** A Tetherjelly is 16 m long and a Lampfry 14 m, beside a bell of 22 m radius and
  a shoal of 40 m.

Four choices a reviewer should see:

- **The overlay, not the conn scene.** Gate 5 says the enemy is never geometry in the conn
  view, and the smoke test's assertion on that does not move. §8's budget sentence named one
  Points draw per kind and a dot cap per field. It was read as written for public life, the
  only thing with a field, and is now scoped to say so.
- **A ghost keeps its density.** Density follows the tier, which is knowledge, and brightness
  follows the ghost clock. A ghosted Tier-4 creature keeps its Tier-4 dots and dims. The
  dots carry no light, so gate 5's rule that a lit sprite claims a present tense does not
  bite.
- **The shapes face screen-right**, as the silhouettes did. A fauna contact never carries a
  heading, so the Draymaw's wedge and the Hollow's gape point nowhere in particular. No shape
  shows a behaviour, because none crosses the wire.
- **No screen-size floor.** The shapes are true metres and the dots a constant 3 px. At the
  opening 4,000 m dolly on a 900 px view a Draymaw is under 4 px across, so Tier 3 and Tier 4
  look alike there. The silhouettes had no floor either.

## 11. Open questions

- **The thermocline isobath.** The 1,200 m layer decides who can hear whom, which makes it the
  most tactical depth on the map. "Reading the Water" draws no line at it *in the water*, and
  that stands. Whether the *ground* should carry a major isobath there is left open. Phase 1
  draws band boundaries only.
- **Coastline style under the colour-vision palettes.** The dash is the only thing telling a
  biome coast from a rock coast. It should hold, because the dash is shape rather than hue.
  It is unmeasured.

---

## Related

- **[art-direction.md](art-direction.md)**: "Reading the Sea Floor" and "Reading the Water", the
  laws this revision draws inside; the Pressure Cartography plates it takes its language from
- **[three-layer-ocean.md](three-layer-ocean.md)**: the revision that gave the ground a shape
- **[free-camera.md](free-camera.md)**: the revision that gave the water a body, and put
  the survey dolly in reach
- **[graphics-standards.md](graphics-standards.md)**: gates 3, 4, 6 and 7
- **[style-neon-noir.md](style-neon-noir.md)**: the stone ramp, the world-light families, and the
  rule that light belongs to agents and instruments
- **[environments.md](environments.md)**: the biomes §7 collects
- **[bestiary.md](bestiary.md)**: the animals §8 draws, and §3's tier rule
- **[maps.md](maps.md)**: how the floors and coasts the ink draws are authored
