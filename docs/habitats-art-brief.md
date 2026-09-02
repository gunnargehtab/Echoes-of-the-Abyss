# The Rift's Beauty — An Art Brief per Habitat

> [habitats.md](habitats.md) says what each city is like to live in and what each culture calls
> beautiful. This document is the art-side half of that: for every inhabited place, the one
> thing that is beautiful about it, the key image that carries it, and how that beauty is
> allowed to appear on screen inside the game's own laws — the darkness budget, the three
> world-light families, the palettes that already exist, and the rule that glow is loudness.
> It briefs environment dressing, mission-map authoring, key art and plates. It moves no
> number and licenses no new hex.

Two audiences, one document. **In-engine**, a habitat is a mission map's ground and the
player's own structures on it, rendered through the 55° conn view under every gate in
[graphics-standards.md](graphics-standards.md). **In key art** — a survey plate, a neon-noir
presentation plate, a briefing panel — the same place can be drawn for what it is, with the
budget the engine will not spend. Each brief below says which lane a thing belongs in, because
the failure mode of "make it beautiful" is a seabed that shouts and a terrain that glows.

---

## 1. What Beauty Is Down Here

Five theses, and everything below is an application of them.

**Beauty is inhabited darkness.** Near-black fills 85–90 % of any frame
([style-neon-noir.md](style-neon-noir.md)), and that is not the constraint the beauty has to
survive — it is the beauty. A lit thing in the Rift means a thing that is *on*: the row is
growing, the air is running, the crystal is in tune, the return came back. Darken the
neighbourhood before you brighten the subject.

**Beauty arrives by ear first.** A place is its sound ([world-map.md](world-map.md)), and a
habitat is established by its ambient bed before its first pixel: the turn-of-tide bell, the
hum that means the air is on, the chord, the hush deepening. The image confirms what the mix
has already said. A frame that would be beautiful with the sound off is a frame from another
game.

**Beauty is something you own.** Detail is owned, never shown ([art-direction.md](art-direction.md),
*The Asymmetric Fidelity Law*). A player sees their *own* city at full fidelity and somebody
else's as contacts in black water. So a habitat's beauty is written for the faction that lives
there — and the same ground, seen by the enemy, is a dark map with returns on it. Both are
correct, and only one of them is lovely.

**Four cultures, four beauties, none of them shared.** The Commune's is anything that grows
without being told to. The Consortium's is *orderly* — a wall of lit numbers, all accounted for.
The Order's is *in tune*. The Directorate's is *sufficient*. The court has none
([habitats.md](habitats.md)). A frame that is beautiful in a way its owners would not recognise
has failed the habitat test before the register test gets to it.

**Nothing is lit from above.** The only light from overhead in the whole setting is the Lid's
glow on the plateaus at midday, and it is the poison. Every other light is a point or a seam
someone made or something alive, and every frame reads that way: no sunbeams, no god-rays, no
ambient blue wash from a surface nobody has seen. Depth is luminance, downward, into black.

---

## 2. The Laws This Brief Works Inside

Nothing here is new; the table exists so a habitat scene can be reviewed against the same
gates as a hull.

| Law | What it means for a habitat | Owner |
| --- | --- | --- |
| **Darkness budget** — 85–90 % near-black, seafloor luminance floor 5–10 % | A city is a few lit things in a dark place, not a lit place | [style-neon-noir.md](style-neon-noir.md) |
| **World light is three families, points and seams, `vent-ember` the ceiling** | The *ground* of a habitat may carry `#E06A2B` embers (vents), `#2E8C74` flora tips (kelp, living coral), `#5B4A8C` crystal seams — and nothing else. A fourth family is a doc amendment first | [style-neon-noir.md](style-neon-noir.md) *World light* |
| **Glow encodes loudness** | A habitat's lit *structures* burn at their SIG on the gate-3 curve. A quiet city is a dark city, and that is the Directorate's beauty, not a bug | [graphics-standards.md](graphics-standards.md) gate 3 |
| **Hue belongs to the faction constant** | Every colour in a habitat traces to its faction's four hexes, a neon-noir token, or a world-light family. No new hex to make a city pop | gate 4 |
| **Texture, not information** | Relief, mottle and props darken and dress; they never say anything the map does not already declare. The relief figures quoted below are today's TUNABLE values from `packages/frontend/src/game/seabed.ts`, cited for character, not pinned | [art-direction.md](art-direction.md) *Reading the Sea Floor* |
| **Props are dressing for what a cell already is** | A kelp cluster stands only in kelp; a ruin block only in ruins. There is no "city prop" — a habitat's built fabric is faction structures, or cut ground authored as Coral Ruins | gate 1; [habitats.md](habitats.md) §8 |
| **Asymmetric fidelity** | Own-force full; enemy at earned tier. The enemy's city is never rendered as a city | gate 5 |
| **One camera** | 55° pitch, north-locked, zoom about the cursor. A habitat is composed for that frame at every zoom the dolly allows | gate 8 |

The lanes, stated once: **the engine** shows a habitat's ground, its world light, its props
and the player's own structures. **Key art and plates** may show the rest — the interiors,
the people, the Lid overhead, the wall of lit sector numbers two kilometres down the rock —
in the neon-noir register of Plate V or the Pressure Cartography register of Plates I–IV and
VII ([art-direction.md](art-direction.md), *Concept Art*).

---

## 3. The Plateaus — a garden under a pale sky

*Kelp Forest · PF 0.55 · 200–400 m · Pelagia Commune ([habitats.md](habitats.md) §2)*

**Thesis.** The only place in the Rift a person would call beautiful without being corrected,
and the beauty is *growth under a ceiling*: forty-metre kelp columns swaying in the draw,
farm rows in bioluminescent trail, and the Lid glowing faintly overhead at midday — the closest
thing to a sky, and 150 m of sour water. The frame holds both facts at once and does not
resolve them.

**The key image.** A terrace edge at midday. Kelp columns filling the upper two-thirds of the
frame, swaying, their tips pricked with dim `flora-biolight`; between them, the farm rows as
lines of `#8FE36B` trail on `#0B241E`; three tenders working at 18 SIG, dim running lights,
pigment-lit; and above everything a pale, milky ceiling with no source in it — the Lid, lit by
a sun nobody has stood under. Below the terrace edge, the drop: bare slope falling into black,
the watch's two scouts at its lip, nearly dark. The frame is bright at the top and black at
the bottom, which is the Rift's whole luminance rule drawn as a landscape — and the one place
where "bright at the top" is true.

**Light.** Three sources, ranked. First, the Commune's own pigment: structures and hulls in
`#1FA67A` algae teal and `#8FE36B` bioluminescent green, glow set by SIG — a harvesting
plateau sits in the 16–35 band, *dim accent running lights*, never floodlit. Second,
`flora-biolight` `#2E8C74` on kelp tips and living coral: points and short lines, steady or
5 Hz-stepped, dimmer and greyer than the faction's green so the forest never reads as a fleet.
Third, the Lid's ceiling glow — **key art only**, decided in §9. In-engine the plateau's
beauty is made from the first two, and that is the brief rather than a gap in it.

**Palette.** `#1FA67A` · `#8FE36B` · `#E8F0A3` · `#0B241E` (the Commune's four); the kelp
biome fill and its relief; `flora-biolight`. Spore pale `#E8F0A3` is the plateau's one
allowed *pale*, reserved for the brightest pigment on the healthiest structure — and, in key
art, for the Lid's glow seen from below, because the plateaus are the only ground it is ever
seen from and it is theirs to borrow.

**Ground and props.** Kelp Forest fill, mid relief (65 m amplitude, 0.3 roughness — rolling
terrace, not broken ground), light mottle. `env-kelp-cluster` at the highest density in the
registry, with **4 m of sway** — the only prop in the game that moves, and the plateau's whole
sense of life; `env-coral-tower` sparse between the columns; `env-coral-growth` low on the
terrace. The southern drop authors as bare slope: kelp stops at the edge, so the eye reads
*garden, then nothing* — the same thing the watch hears.

**Motion.** The sway. Nothing else on the plateau moves that is not a hull, and a hull at
cruise is an event ([habitats.md](habitats.md) §2).

**Sound.** Steep absorption above 2 kHz, a 0.8 s tail: everything sounds close and dead
([audio-direction.md](audio-direction.md) §9). The bed is the hush; the bell is the day.

**In-engine.** A mission on this ground — [mission-tend.md](mission-tend.md) is the model —
is composed with the terrace in the north of the frame and the drop in the south, so the
luminance gradient and the map's danger gradient are the same line. At survey zoom the
plateau reads as a paler green shelf against a dark slope; at combat zoom the kelp closes in
and the rows appear between the columns. A plateau is beautiful at combat zoom and *safe* at
survey zoom, and the map should feel like the second before it shows the first.

**What beauty is not here.** Not lush. The Commune's green is desaturated by the biome fill
and lit only at the tips; a saturated jungle is the outsider's reading and the register's
failure. Not a vista — nobody looks up at the Lid, they work under it.

**Prompt seed** (key art, neon-noir register, Claude Design 2D):

```text
Deep-sea kelp terrace at midday, seen from a low RTS three-quarter angle. Forty-metre
kelp columns sway in a slow current, their tips pricked with dim grey-green
biolight (#2E8C74); between them, farm rows marked as thin lines of bioluminescent
green trail (#8FE36B) on deep chlorophyll ground (#0B241E). Three small organic
harvester hulls in algae teal (#1FA67A) work the rows, dim running lights only.
Above: a pale, milky, sourceless ceiling of poisoned water in spore pale (#E8F0A3),
fading to black at the frame's edges. Below the terrace edge the ground drops into
absolute black. 85% of the frame near-black (#03080E); no sunbeams, no god-rays, no
surface. Quiet, tended, inhabited.
```

---

## 4. Holding One — a city that is a ledger

*West wall · Thermal Vein and cut structure · 350–1,300 m · Bathyarch Consortium
([habitats.md](habitats.md) §3)*

**Thesis.** Order made visible. The Holding's beauty is a wall of lit asset numbers running
two kilometres down the rock, every one of them accounted for, and a hum under it that means
the air is on. The Consortium does not have a word for beauty; *orderly* does the work, and
the frame should be orderly to the point of severity.

**The key image.** The wall face from the water, at the depth where junior berths give way
to Board country. Sector after sector of riveted, patchworked pressure hulls strung to the
rock, older plate showing through newer, each stencilled with its number in `#F2B233` hazard
amber on `#8C8378` iron grey; the thermal grid's pipes and cables as a vertical spine of dull
metal with `vent-ember` points where it taps the rock. The luminance runs the Rift's way —
brighter at the top, darker down — but the *stencils* run the other way: the deepest sectors
carry the cleanest paint and the driest walls, because standing is spent where standing is.
And at the very top of the frame, one sector with no light in it at all. Sector Kell, sealed,
unlit, still numbered.

**Light.** The Consortium is the loud faction and its city burns accordingly: structures in
the 36–60 band, *sustained glow from vents, sensor arrays and lit ports*; the Vein's working
faces at 61+, *floodlit working surfaces*. This is the one habitat where the darkness budget
is spent near its limit, and the discipline is that every lit thing is a *working* thing —
lamps on faces, running lights on freight, stencils under work-light. No decorative light,
no signage that is not an asset number. `vent-ember` `#E06A2B` in the cracked ground of the
vent fields, sparse, flickering on the 5 Hz grid — deliberately redder than the faction's
amber, so a vent never reads as a Consortium lamp.

**Palette.** `#F2B233` · `#8C8378` · `#3D2B1F` · `#0E1418` (the Consortium's four); the
Thermal Vein fill; `vent-ember`; `rock-face` `#11161C` and `rock-shadow` `#080C12` for the
wall itself, which is rock and speaks in stone. Oxide brown `#3D2B1F` is the Holding's
signature — rust bleed under every rivet line, the visible age of a city that repairs and
never replaces.

**Ground and props.** Thermal Vein fill with the roughest relief in the game (95 m
amplitude, 0.5 roughness — broken ground) and the heaviest mottle; `env-vent-chimney`
ember-lit at the mouth, `env-vent-basalt` low and dark. The wall is authored as rock —
mesa-edged with `env-rock-crag-a` / `-b` — and the city's cut interiors (the Underworks, the
Underway) as Coral Ruins ([habitats.md](habitats.md) §8), which gives them their hard acoustic
shadows and their terraced right angles (blockiness 1 in the relief table). Nothing in the
registry is *a berth-sector*: the Holding's built fabric is Consortium structures on a
sculpted wall, and the wall does the work.

**Motion.** Ember flicker; hull traffic; the recoil of working machinery on the faces.
Nothing on the ground sways.

**Sound.** Broadband vent roar, +12 dB noise floor, short chaotic tail — masking that is
*audible as masking* ([audio-direction.md](audio-direction.md) §9), under the shift klaxons
and pump notes of the city itself.

**In-engine.** A mission on the west wall — [mission-shift-change.md](mission-shift-change.md),
[mission-tolerance.md](mission-tolerance.md) — is composed against the wall: rock along one
edge of the frame, working faces and the rail head as the lit band, open water dark beyond.
The Holding's beauty at survey zoom is the *line* of lit structures down the map; at combat
zoom it is the stencils and the rust. The one thing to protect is the hum's honesty: a
Consortium map is loud and the lit surfaces say so, and a player who reads the SIG meter and
the glow should get the same number twice.

**What beauty is not here.** Not grand. No towers, no domes for their own sake, no cathedral
of industry — every structure is a pressure vessel that was demanded. Not warm: work-light is
amber because the palette is, and the water around it is as cold as anywhere.

**Prompt seed:**

```text
A vertical deep-sea city built down a rock wall, seen from open water at a low RTS
three-quarter angle. Stacked riveted pressure-hull sectors strung to the cliff by
pipes and cables, older armour showing through newer plate, rust bleed (#3D2B1F)
under every rivet line. Each sector carries a large stencilled asset number in
hazard amber (#F2B233) on iron grey (#8C8378), under small amber work-lamps. Sparse
red-orange ember points (#E06A2B) in the cracked ground where the wall meets the
vent field. The wall is near-black stone (#11161C) fading to black (#03080E)
downward; the water is dark. Near the top of the frame one sector is unlit and
unnumbered-looking, sealed. Orderly, severe, industrial, cold; no decorative light.
```

---

## 5. Sorrowgate — the city nobody lives in

*Coral Ruins · PF 0.80 occluded · 340–2,400 m · neutral ground ([habitats.md](habitats.md) §4)*

**Thesis.** The one place in the Rift that was *designed* — arches, halls, a terminus with a
vault — and the only one that fell. Its beauty is the beauty of a plan under a civilisation's
worth of coral: right angles the water has spent two centuries softening, and has not
finished. The court is a lit room inside it, and the room is small.

**The key image.** The collapsed transit dome at 1,500 m from inside its arch. The dome's
ribs as broken geometry against black, terraced right angles in `rock-face` stone under coral
growth with dim `flora-biolight` tips where the coral is alive; the chamber floor as the one
level surface in the frame; four unmarked escort hulls at rest on it, nearly dark under a
silence order; and the court's own lamps — few, low, and the only warm thing for a kilometre —
on the table the struck hardpoints are lying on. Beyond the arch, the basin: no floor, just
fog going down. The frame is a small lit interior in a very large dark ruin, and that ratio is
the court.

**Light.** The least of any habitat. The court has no faction, so it has no faction glow; its
lamps are the *interface* voice if anything — a court is an instrument — and in key art they
may be drawn in `neon-cyan` `#35E0FF` at low intensity, the way the HUD tells you things.
In-engine, the court's hulls are Commune-built and carry the Commune's palette at SIG 6 idle
(nearly black, navigation marks only), and the ruin's own light is `flora-biolight` on living
coral, points only. Nothing here burns. The one bright thing that ever happens at Sorrowgate is
the ping ([mission-sorrowgate.md](mission-sorrowgate.md)), and it is threat-red.

**Palette.** The stone ramp `#11161C` / `#080C12` for the fallen structure; the Coral Ruins
fill; `flora-biolight` `#2E8C74`; the blacks. No faction palette owns Sorrowgate — the
delegations bring theirs, and in the prologue's chamber all four are present at once, which is
the only frame in the game where that is true and the reason it is composed dark: four
palettes in one room at full glow would be a lobby, not a court.

**Ground and props.** Coral Ruins fill with blocky relief (blockiness 1: the ground steps in
right angles) — `env-ruin-block`, `env-ruin-dome-shard` at the lowest density in the registry
(a shard is 40 m across and there are not many), `env-coral-growth` low everywhere. The
drowned city is the biome's home ground, and the districts of the Sunken Metropolis archetype
are cut from it ([maps.md](maps.md)). Roofed water — the transit tunnels, the arch — authors as
ceilings, drawn as routes, and the conn view makes a tunnel mouth a real hole under a real
ridge ([three-layer-ocean.md](three-layer-ocean.md) §5).

**Motion.** None on the ground. This is the stillest habitat, and the prologue's whole
dread is a still frame with something loud arriving in it.

**Sound.** Hard occlusion behind geometry, strong early reflections; one step sideways
restores a contact ([audio-direction.md](audio-direction.md) §9). The chamber is under the
thermocline: nothing said in it carries up.

**In-engine.** The prologue is Coral Ruins and static; what degrades in it is a structure,
not the ground ([campaign.md](campaign.md) §10). The mid-match collapse — a dome coming down
and the water behind it turning to ruins at one tick — is specified and built and authored in
no shipped mission yet ([environments.md](environments.md)); when a mission spends it, it is
the one moment a habitat is allowed to *change* on screen, and it should look like a building
failing, never like the seabed misbehaving.

**What beauty is not here.** Not haunted. No drifting particles, no ghost-light in the
colonnades, no cathedral shafts. The court's register gives one compliment, *you were quiet*,
and the frame earns it the same way.

**Prompt seed:**

```text
The interior of a collapsed deep-sea transit dome, seen from under its broken arch at
a low RTS three-quarter angle. Terraced right-angled ruins in near-black stone
(#11161C) under a thick skin of coral, a few dim grey-green biolight tips (#2E8C74)
where the coral is alive. A flat chamber floor holds four small unmarked organic
hulls at rest, nearly dark, and a low table lit by three faint cyan lamps (#35E0FF),
the only steady light in the frame. Beyond the arch the ground ends and fog drops
into black (#03080E). 90% of the frame near-black; no particles, no shafts of light,
no glow on the stone. Still, formal, small light in a very large ruin.
```

---

## 6. The Chapter-Houses — living inside an instrument

*Resonance Field · PF 0.70 scattered · 1,400–2,900 m · Hadron Knights
([habitats.md](habitats.md) §5)*

**Thesis.** A house that is an instrument, and an instrument that is lit from inside. The
Order's beauty is *in tune*: bilateral symmetry — the only faction that has it — cut into a
natural crystal formation that rings under any pressure change, so the whole place looks like
something that is sounding, and is.

**The key image.** The Third Chapter-House from its approach at 1,450 m: a faceted crystal
formation with a house cut into it, the cut faces in `#E6E9F2` alloy white fittings against
`#8B5CF6` resonance violet crystal, the house's lit features — its halls, its chord — glowing
`#C9A6FF` in exact mirror symmetry about a vertical axis; and around it, standing off at
intervals, the six outer formations, unlit but for a dull `crystal-seam` inside each. Heat
shimmer around the active crystal, the one distortion effect the setting owns. The frame is
symmetrical and the ground around it is not, which is the Order in one composition.

**Light.** Two regimes that must never blur. The *house* is a structure with a SIG, and glows
on the gate-3 curve in the faction's crystal glow — Knight SIG is high, so a chapter-house is
bright, and its symmetry makes it bright *in a shape*. The *formations* are terrain, and carry
only `crystal-seam` `#5B4A8C`: a dull internal seam, steady, duller than the Order's glow by
rule 5 of world light, so a crystal never reads as a Knight. On a Resonance Field map the
seams are what make the ground read as *charged* rather than dead — the field sounds faintly
and continuously, and the seams are what that looks like.

**Palette.** `#8B5CF6` · `#E6E9F2` · `#3B2E5A` · `#C9A6FF` (the Order's four); the Resonance
Field fill; `crystal-seam`. Violet is reserved in the interface for the unexplained, and the
Fields are one of its three licensed contexts ([style-neon-noir.md](style-neon-noir.md)) — the
brief's discipline is that the *terrain* violet stays the dull seam, and the faction's violet
stays on the faction.

**Ground and props.** Resonance Field fill, mid-rough relief (60 m, 0.4), `env-resonance-crystal`
with its seam at the registry's higher density, `env-resonance-pylon` — the toppled remains of
older instruments — sparse. Scattered PF (0.70) is *scattered*: the props should not line up,
because bearings lie here and the ground should look like the reason. The house itself is a
Knight structure standing in a formation; the chord, the cells and the hospice at the First
are cut structure authored as Coral Ruins for the shadows ([habitats.md](habitats.md) §8), lit
by the house.

**Motion.** Heat shimmer around active crystal (factions.md: "units hum — visibly"); the
distortion rings of a Standing Wave when one is up ([mission-standing-wave.md](mission-standing-wave.md)).
The seams hold steady. Nothing sways.

**Sound.** Comb filtering, slow phase drift, diffuse and unlocatable; false contacts sound
identical to true ones ([audio-direction.md](audio-direction.md) §9). The ambient bed is
*pitched* — the Fields' chime, and a chapter-house that sounds like a chord — which
[mission-aptitude.md](mission-aptitude.md) §13 names as the first tuned bed the bible asks for.

**In-engine.** A mission in the Fields — [mission-aptitude.md](mission-aptitude.md) is the
model — is composed around the house as the one symmetrical thing on an asymmetrical map,
lit in a shape at the spawn, with the formations as a ring of dull seams around it. At survey
zoom the Fields read as a violet-grey scatter with one bright symmetrical mark; at combat zoom
the facets and the fittings resolve. The beauty is the contrast between the made thing and
the grown thing that made it possible.

**What beauty is not here.** Not magical. No floating shards in-engine (the seabed is
sculpted ground and props stand on it); no lens flares; no crystal that glows like a lamp.
The Order's aesthetic is an instrument-maker's, and instrument-makers do not decorate.

**Prompt seed:**

```text
A deep-sea chapter-house cut into a natural crystal formation, seen from its approach
at a low RTS three-quarter angle. Faceted resonance crystal in dark violet (#3B2E5A)
with dull internal seams (#5B4A8C); the house's cut faces fitted in pale alloy
(#E6E9F2) and lit in crystal glow (#C9A6FF) in exact bilateral symmetry about a
vertical axis, with faint heat-shimmer around the brightest crystal. Six smaller
unlit formations stand off in a loose ring, each with one dull seam. Ground is a
violet-grey scatter of facets; the water is black (#03080E). 85% of the frame
near-black; no lens flare, no floating debris, no glowing terrain. Precise,
courteous, instrument-like.
```

---

## 7. Sufficiency — the city that announces itself by subtraction

*Abyssal Trench and cut structure · PF 1.60 axial · 2,750–3,400 m · Abyssal Directorate
([habitats.md](habitats.md) §6)*

**Thesis.** The most beautiful habitat in the game is the darkest, and the brief has to
believe that. Sufficiency's beauty is *subtraction*: the ambient hush deepens, the fog closes,
and then there are red lights in ordered rows — cells cut into the trench wall, each one lit
the same, none of them brighter than another. Rank is not on the wall. The rows are the
argument.

**The key image.** The head of the Ninth Trench from the axis, at 3,000 m. Trench walls as
knife-edged black stone rising out of frame on both sides; the floor dropping away past the
fog's reach into nothing; and cut into the eastern wall, terrace on terrace, the galleries —
rows of identical openings, each holding one `#C2465E` biolight, in the asymmetric patterns
of real photophores at the scale of a cell and in *perfect* regiment at the scale of a
terrace. Below the last row, the attending galleries open onto the axis: stalls, the
Cantorate's dome standing over them at SIG 35, four hulls holding the water outside, dim.
Down the axis toward the south, the water is simply black, and the frame is composed so the
eye follows the rows down and then keeps going.

**Light.** The quietest faction, and the darkest city: cohort hulls sit in the 16–35 band
(the Abyssal Submersible at 22 idle) and the city's structures with them — *dim accent
running lights*, in `#C2465E` biolight crimson on `#0A0710` trench black. The rule that glow
encodes loudness is the Directorate's aesthetic stated as physics: a Directorate city is dim
because it is silent, and a bright one would be lying. The trench floor carries **no world
light** — the Abyssal Trench has no family, and the registry's trench props are unlit by rule.
The only light in a Sufficiency frame is the Directorate's own, in rows.

**Palette.** `#7A1B2E` · `#2D1B3D` · `#0A0710` · `#C2465E` (the Directorate's four); the
Abyssal Trench fill; the stone ramp for the walls. Bruise violet `#2D1B3D` is the mid-tone —
the chitin of the galleries' cut edges — and it is the one place in the game a violet is not
the Mouth's, which the brief keeps honest by never letting it glow.

**Ground and props.** Abyssal Trench fill with the *smoothest* relief in the game (40 m,
0.15 — pressure-eroded stone) and the lightest mottle: the floor is a plane going down, not
broken ground. `env-trench-spire` knife-edged on the slopes, `env-trench-slab` low on the
floor, both unlit. The walls are rock — `rock-face` at the lip, `rock-shadow` at the base —
and the galleries and cohort halls are cut structure authored as Coral Ruins for a city that
is not ruined ([mission-attendance.md](mission-attendance.md) §11;
[mission-intake.md](mission-intake.md) §11). Where there is no seabed, there is dark
([three-layer-ocean.md](three-layer-ocean.md) §5): the Ninth's axis south of the city is
exactly the ground the conn view is cheapest at, and its dread is free.

**Motion.** The photophore patterns may step on the 5 Hz bucket like any structure glow;
nothing else. A hull under way in a gallery is a shove, and the frame should be still enough
that one hull moving is an event.

**Sound.** Neutral on-axis with long delay taps, 180–400 ms — contacts arrive twice, and the
second arrival is the trench ([audio-direction.md](audio-direction.md) §9). Under it, the
return: every hydrophone in the trench country hears the Mouth's cycle, and the bed carries it
without saying what it is.

**In-engine.** A mission at Sufficiency — [mission-attendance.md](mission-attendance.md),
[mission-intake.md](mission-intake.md) — is composed down the axis: the city's rows as the
lit band along one wall, the axis running south out of the frame into black. At survey zoom
the city is a faint red seam on a black map; at combat zoom the rows resolve into cells. A
Sufficiency map is the one where the darkness budget can be spent at 90 % and the frame still
reads as *inhabited*, and that is the whole point of the brief.

**What beauty is not here.** Not sinister. Red light in a black trench is the outsider's
horror and the register's failure: the rows are warm, the cells are homes, and the people in
them report higher satisfaction than anyone in the Rift. Not a fortress either — the walls
are the trench's, not the Directorate's. Write the frame as a city at rest.

**Prompt seed:**

```text
The head of a deep ocean trench at night, seen down its axis from a low RTS
three-quarter angle. Knife-edged black stone walls (#11161C) rise out of frame on
both sides; the floor falls away into fog and then nothing (#03080E). Cut into one
wall, terrace on terrace, are rows of identical small openings, each holding a single
dim crimson biolight (#C2465E) on bruise-violet chitin edging (#2D1B3D) — perfectly
regimented rows at the scale of the terrace, slightly asymmetric photophore clusters
at the scale of a cell. At the lowest row a wider gallery opens onto the trench, with
one larger dark structure standing over it and four small dark segmented hulls
holding still outside. 90% of the frame near-black; no other light source; nothing on
the ground glows. Warm, regimented, silent, at rest — a home, not a fortress.
```

---

## 8. Halvard — the brief that is an absence

*1,600 m, the west wall · nobody's ([habitats.md](habitats.md) §7)*

There is no key image. The wreck was left exactly as the salvors closed it, it is not entered,
not mined, and not built within a kilometre of, and crews cut engines passing it. If Halvard
is ever on a map, it is authored as rock with nothing standing on it and nothing lit near it
— a dark shape at the wall, `rock-shadow` at its base, no props inside its kilometre, no
world light, no faction glow — and the frame's beauty is that the eye is given nothing there.
The Rift's architecture is the salvors' habit two centuries on: hold what holds, close what
does not. On screen, closing is drawn as an empty place that everything else keeps its
distance from.

---

## 9. The Lid — the one light from above, and why it stays in key art

**Decided: the Lid's ceiling glow does not ship in the conn view.** The plateaus' pale ceiling
is the setting's single overhead light and its most distinctive image, and it is key art
only — by decision, not by omission. The proposal was tried before it was refused, and the
reasons are recorded here so nobody reopens it as a renderer task when it is a style one.

**What was tried.** A prototype film in the conn view: one translucent plane at the 150 m
boundary, spore pale desaturated toward grey, clamped to the map's water with feathered edges,
shot on Marr Plateau (working water 250–320 m) at the same camera as the shipped view, at
survey and combat zoom, at three opacities.

- At 0.18 it washed the void beyond the map rim as well as the water, and flattened the
  fleet: the "area glow on terrain" failure the world-light rules exist to prevent, exactly.
- At 0.06–0.10, clamped, it did the one thing it was for — the plateau read as water under a
  ceiling — and it did it by lifting every Shelf frame to a pale grey-green, spending the
  darkness budget and the hulls' contrast on every frame, all the time, in the one biome whose
  whole beauty is that its light is at the tips and nowhere else.

**Why it stays out.** Three facts, each sufficient:

- **It is area light on terrain.** [style-neon-noir.md](style-neon-noir.md) *World light*
  licenses three families, all points and seams, with `vent-ember` as the ceiling. A haze over
  Shelf-band water is a fourth family and a fill, and the rule that darkness is the default
  state is the style, not a constraint on it (§1).
- **The Lid is already in the game as what it is: a cost.** The sour timer above 150 m is
  built ([systems-depth.md](systems-depth.md) §2) and the mix gives it three sounds for its
  three states ([audio-direction.md](audio-direction.md) §4). A player who climbs into it
  hears the water change and feels the hull start to die; the frame does not need to go pale
  for the Lid to exist.
- **It is the poison.** Whatever a ceiling glow looked like, it would be the one light from
  above in a setting whose writing rule is that the surface is never a goal, a hope or a
  destination ([world.md](world.md)). Not drawing it is the safer reading of that rule.

**Where it lives instead.** In plates and briefing panels — §3's key image and the Plateaus
plate in §10 — where the glow can be drawn for what it is: pale, sourceless, milky rather than
blue, and slightly wrong. In-engine the plateaus are lit from the tips, and that is the brief.

---

## 10. Plates This Brief Asks For

The concept-art series is seven plates: four survey plates in the Pressure Cartography
language, two neon-noir presentation plates, and the Rift chart
([art-direction.md](art-direction.md), *Concept Art*). Five habitat plates would complete the
set, and each brief above is the specification for one. They are named here as plain text,
because a plate that does not exist is not linked:

| Plate | Subject | Register |
| --- | --- | --- |
| The Plateaus | §3's key image: a terrace edge at midday under the Lid | Neon-noir presentation |
| The Holding | §4's key image: the wall face, junior berths to Board country, Sector Kell dark at the top | Neon-noir presentation |
| Sorrowgate | §5's key image: the court from inside its arch | Neon-noir presentation |
| The Third | §6's key image: the house in its formation, the outer six around it | Neon-noir presentation |
| Sufficiency | §7's key image: the Ninth's head, the rows, the axis going south | Neon-noir presentation |

Authored as SVG with the source committed and rendered to the plates' 2000 × 2750 format, per
the precedent Plate VII set, with every colour traced to a documented palette (gate 4 applies
to plates in spirit). A plate is docs-side concept art, not shipped game art, so the pipeline
gates do not apply — but the habitat test does.

---

## 11. Review Checklist for a Habitat Scene

For any map, plate or panel that shows an inhabited place, beside the visual checklist in
[graphics-standards.md](graphics-standards.md):

- [ ] The habitat test passes: with the faction unnamed, a reader hears whose ground it is
  ([habitats.md](habitats.md) §10)
- [ ] The scene's beauty is the one its owners would recognise — growth, order, tuning,
  sufficiency, or quiet — and not an outsider's reading of it
- [ ] Every lit thing is *on*: a structure at its SIG, a world-light family in its biome, or
  a lamp on a working surface. No decorative light
- [ ] Nothing is lit from above, unless it is the Lid in key art, and then it is pale,
  sourceless, and not a sky
- [ ] Near-black holds 85–90 % of the frame, and the seafloor stays under the ceiling
- [ ] Every hex traces to a faction palette, a neon-noir token or a world-light family
- [ ] The ground says nothing the map does not declare; props stand only where their cell is
- [ ] In-engine: composed for the 55° north-locked frame at survey *and* combat zoom, and the
  enemy's version of the same ground is a dark map with returns on it
- [ ] The frame would be worse with the sound off

---

## Related

- **[habitats.md](habitats.md)** — the cities this brief draws, and what each culture calls
  beautiful
- **[art-direction.md](art-direction.md)** — palettes, silhouette law, the seafloor rules, the
  camera, the plate series
- **[style-neon-noir.md](style-neon-noir.md)** — the tokens, the darkness budget, the glow
  recipe, and the three world-light families
- **[graphics-standards.md](graphics-standards.md)** — the gates a habitat scene ships under
- **[asset-prompts-3d.md](asset-prompts-3d.md)** — the prompt kit whose ENV STYLE block the
  seeds above sit beside, and the prop table they cite
- **[environments.md](environments.md)** — the biomes as look, sound and materials
- **[audio-direction.md](audio-direction.md)** — the beds a habitat is heard by before it is seen
- **[three-layer-ocean.md](three-layer-ocean.md)** — the visible seabed, the fog, and the Lid
  as a cost
- **[world-map.md](world-map.md)** — where each of these places is, and its sound
