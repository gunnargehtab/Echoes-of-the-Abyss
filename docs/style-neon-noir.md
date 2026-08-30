# Echoes of the Abyss — Neon-Noir Style Guide

*(The presentation layer's visual register: black water as the canvas, neon as
information, dread as the mood. This doc is the source of every chrome colour —
`packages/frontend` transcribes it.)*

## Why neon-noir

Every mechanic in this game is an argument about **sound**. Neon-noir is that
argument made visible: in a lightless ocean, *emitting anything* — light, noise,
a ping — is how you are found. So the style rule is the game rule:

1. **Darkness is the default state.** Near-black fills roughly 85–90 % of any
   frame. The ocean is not "dark blue"; it is black with blue memory.
2. **Neon is information, never decoration.** A glowing edge means a live
   system, a contact, a warning, a player choice. If a glow carries no data,
   cut it.
3. **Glow intensity encodes loudness.** The brighter something burns, the
   louder it is in the Echo Layer — a flank-speed sub streaks light, a silent
   runner is a black shape against black water. Detail is something you *own*
   (see the Asymmetric Fidelity Law in [art-direction.md](art-direction.md)).
4. **Noir means consequence.** Hard rim light, deep shadow, flicker under
   damage, rain-on-glass reflection on every panel. The HUD is a pressure hull
   with instruments, not a website.

The reference plates: the four Pressure Cartography survey plates
(I–IV) establish the dark-paper / neon-linework language, and the two
presentation plates (V–VI) establish the saturated neon register for key art
and the command UI:

| Plate | Subject | Register |
| --- | --- | --- |
| [I — Depth Strata](concept-art/plate-01-depth-strata.png) | Survey cross-section | Cartographic: near-black paper, thin accent linework |
| [II — Four Powers](concept-art/plate-02-four-powers.png) | Faction shape language | Cartographic |
| [III — The Echo Layer](concept-art/plate-03-echo-layer.png) | Resolution tiers | Cartographic |
| [IV — The Mouth](concept-art/plate-04-the-mouth.png) | The anomaly | Cartographic |
| [V — Submarine Classes](concept-art/plate-05-submarine-classes.png) | Hull line-up, surfaced at night | Neon-noir key art: magenta/cyan signage over black water |
| [VI — Build Menu UI](concept-art/plate-06-build-menu-ui.jpg) | Command panel mock | Neon-noir UI: glass cards, magenta bevels, cyan headers |

The painterly faction posters (`conceptart2.png`, `Copilot_*.png`) are a third
register — ember-lit propaganda art for campaign and marketing. They keep their
magma palette; neon-noir governs the **interface and in-game presentation**,
not the paintings.

## Core palette

Tokens, not suggestions. Anything drawing chrome uses these names.

### The blacks (the canvas)

| Token | Hex | Use |
| --- | --- | --- |
| `abyss-void` | `#03080E` | Deepest background — open water, app background |
| `abyss-floor` | `#070E1A` | Panel-adjacent background, minimap water |
| `abyss-panel` | `#0A1424` | HUD panel fill (before glass alpha) |
| `abyss-glass` | `#0D1C28` | Inset wells, code/readout backgrounds |

Backgrounds gradient *downward into black*, never upward into blue:
`abyss-floor → abyss-void → #000`. Depth is always below.

### The neons (the signal)

| Token | Hex | Carries |
| --- | --- | --- |
| `neon-cyan` | `#35E0FF` | Interface voice: headers, holographic overlays, own-force data, sonar linework |
| `neon-magenta` | `#FF3DA6` | Chrome voice: panel bevels, selection, focus, build-menu framing (plate VI) |
| `neon-violet` | `#8B5CF6` | The Mouth, resonance, Hadron territory — the *unexplained* |
| `neon-amber` | `#F2B233` | Economy and loudness: costs, SIG mid-band, construction |
| `neon-red` | `#FF3B30` | Threat: ping reveal radius, crush-depth warnings, SIG high band |
| `neon-teal` | `#5FD0C0` | Friendly units and structures on the scope |

Assignment rule: **cyan tells you, magenta asks you, red warns you.** Passive
readouts are cyan; anything interactive (buttons, selection, drag states) is
magenta; anything that will get you killed is red. Violet is reserved — it
appears only where the design says "unresolved", so that seeing it means
something.

### Text

| Token | Hex | Use |
| --- | --- | --- |
| `text-bright` | `#D6E6F0` | Primary copy, values |
| `text-dim` | `#6F8A9C` | Labels, captions, secondary copy |
| `text-cyan` | `#A8D0E0` | Readout values inside glass wells |

## The glow recipe

A neon element is never a flat colour. It is three layers:

1. **Core** — the token colour at full opacity, 1 px stroke or the glyph itself.
2. **Halo** — the same colour at 35 % opacity, blurred 6–10 px (CSS:
   `text-shadow`/`box-shadow`; Pixi: a second stroke at higher width and low
   alpha — cheap and good enough at RTS zoom).
3. **Reflection** — on key art and menus only: the colour repeated below the
   element at 10–15 % opacity, vertically smeared (plate V's water line).
   In-game, the moving water does this job; do not fake it on the HUD.

Budget: at most **two halo layers per element**, and halos never stack on
adjacent elements — plate VI reads because each card has one magenta bevel
glow and one cyan header glow, nothing more. Bloom-everything is the failure
mode of this style; when in doubt, darken the neighbourhood instead of
brightening the subject.

## Typography

- **Display** (faction names, plate titles, "SUBMARINE UNITS"): condensed
  industrial grotesque, uppercase, tracking normal. Weight carries hierarchy,
  not colour. The shipped face is **Big Shoulders Display** (SPEC — chosen with
  the logo, [naming.md](naming.md)), vendored into the frontend so the shell
  works offline; the fallback stack stays condensed so an unloaded font reads
  narrow rather than wide.
- **Data** (labels, costs, coordinates, everything else on the HUD): monospace,
  uppercase, letter-spaced `0.12–0.16em`, small sizes (11–13 px at 1080p). This
  is the survey-plate voice and the current `game-overlay` voice; keep them the
  same font.
- Numbers get the neon; labels stay `text-dim`. A cost is `COST:` in dim grey
  and `1300` in amber-to-red (red when unaffordable — plate VI renders all
  costs hot red; in the live UI red is reserved for *can't afford*, amber for
  *can*, because red must keep meaning threat).

## UI chrome — the plate VI card

Anatomy of any HUD panel or build button, transcribed from the build-menu
plate:

1. `abyss-panel` fill at 82–90 % opacity over the scene (glass, not opaque).
2. 1 px `neon-magenta` bevel, outer halo per the glow recipe. Inactive panels
   drop the halo and dim the bevel to 40 %.
3. A cyan header band: uppercase mono title, thin `neon-cyan` rule beneath.
4. Corner registration ticks (the plates' survey marks) instead of rounded
   corners; radius stays ≤ 4 px.
5. One diagonal scanline/noise texture at ≤ 4 % opacity across the whole HUD
   layer — one texture for everything, never per-panel.
6. Disabled = desaturate and dim to 40 %, never grey-out: a dead console still
   has phosphor in it.

Selection and focus follow the same voice: hovering a build card raises the
magenta halo; committing flashes the core white for one frame (a cavitation
"pop"), then settles.

## Faction accents on a neon-noir ground

Faction identity (see [factions.md](factions.md) and the palette table in
[art-direction.md](art-direction.md)) rides *on top of* the neutral chrome:
the HUD frame is always cyan/magenta; the faction colour appears in unit
running lights, wireframe silhouettes, and the player-colour trim only.

| Faction | Neon signal | Noir treatment |
| --- | --- | --- |
| Bathyarch Consortium | Hazard amber `#F2B233` | Sodium work-lamps, flicker on damage — industrial light that *labours* |
| Pelagia Commune | Biolight green `#8FE36B` | Soft pulse (~0.5 Hz breathing), no hard edges — glow dims as hull drops |
| Abyssal Directorate | Biolight crimson `#C2465E` | Rows of small points (plate II's eye-lines), never area glow |
| Hadron Knights | Resonance violet `#C9A6FF` | Razor-thin constant lines, mirror speculars — the only faction whose light never flickers |

## Colour-vision palettes

[ui-ux.md](ui-ux.md) §11 commits to three palettes beyond the standard one —
deuteranopia, protanopia, tritanopia — and they ship regardless of whether
anyone asks, because the tier scale is not allowed to depend on hue in the
first place. Tiers already differ in **size, alpha, edge hardness and shape**
before they differ in colour, and a Tier-3 contact carries its faction's glyph
as well as its faction's ink. What these palettes fix is the second-order
work colour still does: telling a quiet plant from a loud one at a glance,
telling four navies apart in a crowded scope, telling an animal from a fleet.

Three rules govern all three:

1. **They move information colours only.** Chrome — `abyss-*`, `neon-cyan`,
   `neon-magenta`, the text ramp — is identical in every palette. "Cyan tells
   you, magenta asks you" survives every deficiency here: under the red-green
   palettes both sit on the preserved blue axis, and under tritanopia cyan
   reads cool and magenta reads warm. A bevel is not information.
2. **Biome fills and Echo Mark residue do not move either.** The seafloor is
   deliberately desaturated to 5–10 % luminance and carries no hue-only
   meaning — propagation is read from the overlay and the numbers, never from
   the tint. Residue is already the quietest layer on the scope and its four
   kinds are told apart by radius and by which layer they sit in before they
   are told apart by hue; a battle stain and an industrial hum keep their
   warm/cool split under every deficiency here.
3. **Four factions cannot be four hues.** Deuteranopia and protanopia leave one
   usable hue *axis* (blue ↔ amber) and tritanopia leaves roughly two hue
   families (red-warm, green-cool) plus neutrals. So each palette spreads the
   four navies across **hue × luminance × saturation**, and the faction glyph
   is what actually resolves identity. The colour is there to make the glyph
   findable, not to replace it.

### Deuteranopia and protanopia — blue and amber

Both are red-green deficiencies and both are solved on the same axis, so the
two tables are deliberately near-identical. They diverge only where red was
carrying luminance: protanopia dims long wavelengths outright, so every hot
colour is lifted and every dark ochre is lifted with it. Inventing more
difference than that would be decoration.

| Role | Standard | Deuteranopia | Protanopia |
| --- | --- | --- | --- |
| Tier 1 contact | `#4A7A8C` | `#3E6E8A` | `#3E6E8A` |
| Tier 2 bearing | `#6FA8BF` | `#63A2C6` | `#63A2C6` |
| Tier 3 classified | `#A8D0E0` | `#AFD6EC` | `#AFD6EC` |
| Tier 4 track | `#FF6B5B` | `#FF8C26` | `#FFB84D` |
| SIG low | `#3FA86A` | `#2F8FD6` | `#2F8FD6` |
| SIG mid | `#F2B233` | `#B87E1A` | `#B87E1A` |
| SIG high | `#E0452F` | `#FFD94A` | `#FFD94A` |
| Threat | `#FF3B30` | `#D94010` | `#E06A00` |
| Friendly | `#5FD0C0` | `#5FD0C0` | `#5FD0C0` |
| Nodules | `#F2B233` | `#F5C542` | `#FFCF5C` |
| Resonance Crystal | `#B98CFF` | `#7FA0F5` | `#7FA0F5` |
| Fauna | `#5FA88A` | `#6E8C84` | `#6E8C84` |
| Bathyarch primary · accent | `#F2B233` · `#8C8378` | `#F5C542` · `#8C8378` | `#FFCF5C` · `#8C8378` |
| Pelagia primary · accent | `#1FA67A` · `#8FE36B` | `#2E9BD6` · `#9BE0FF` | `#2E9BD6` · `#9BE0FF` |
| Directorate primary · accent | `#7A1B2E` · `#C2465E` | `#5E3A0F` · `#A8701C` | `#7A5218` · `#C98A2E` |
| Hadron primary · accent | `#8B5CF6` · `#C9A6FF` | `#2323A0` · `#6660D8` | `#2323A0` · `#6660D8` |

SIG runs cool → warm rather than green → red, and its three bands separate by
**luminance** rather than by hue: deep blue, dark amber, bright amber. Brighter
is louder, which is the reading the meter wants anyway. The green → amber → red
of the standard ramp collapses to two barely distinguishable yellows here — the
mid and high bands land 12–16 ΔE apart under simulation, which is "the same
colour" — so hue alone could not have carried it. The band label (`DRIVE HUM`,
`FULL PLANT`) and the number are beside the bar in every palette.

Green leaves entirely. Pelagia's biolight becomes a sky blue and the Commune's
"soft pulse, no hard edges" carries the identity that the hue used to. Fauna
goes neutral, and the reason is worth stating plainly: the standard palette's
cold organic green sits about 16 ΔE from Pelagia's algae teal to a *normal* eye
and 5–7 ΔE under either red-green deficiency. A colourblind player has never
been able to tell an animal from a Commune hull by colour at all — only by the
organic outline, which is the identifier the bestiary always intended. These
palettes put the colour back to work; they do not change the standard one,
because that is an art-direction decision and this is an accessibility issue. Bathyarch keeps amber, because
hazard amber is doctrine and amber is the one hue these deficiencies keep, and
the Directorate takes the dark end of the same axis — its noir treatment is
"rows of small points, never area glow", which survives being dim.

### Tritanopia — red and green, no yellow, no violet

Tritanopia confuses blue with green and yellow with pink, and leaves the
red-green axis intact — so this palette is nearly the inverse of the two above.
Crimson and algae teal are *already* correct and do not move. Amber and violet
both go.

| Role | Standard | Tritanopia |
| --- | --- | --- |
| Tier 1 contact | `#4A7A8C` | `#2E6A72` |
| Tier 2 bearing | `#6FA8BF` | `#4FA6A8` |
| Tier 3 classified | `#A8D0E0` | `#A6E0E4` |
| Tier 4 track | `#FF6B5B` | `#FF4A4A` |
| SIG low | `#3FA86A` | `#3FA8A0` |
| SIG mid | `#F2B233` | `#9C4634` |
| SIG high | `#E0452F` | `#FF3B30` |
| Threat | `#FF3B30` | `#FF3B30` |
| Friendly | `#5FD0C0` | `#5FD0C0` |
| Nodules | `#F2B233` | `#F0E0C8` |
| Resonance Crystal | `#B98CFF` | `#7FB8FF` |
| Fauna | `#5FA88A` | `#7A7A88` |
| Bathyarch primary · accent | `#F2B233` · `#8C8378` | `#F0E0C8` · `#8C8378` |
| Pelagia primary · accent | `#1FA67A` · `#8FE36B` | `#1FA67A` · `#8FE36B` |
| Directorate primary · accent | `#7A1B2E` · `#C2465E` | `#A02030` · `#E0566B` |
| Hadron primary · accent | `#8B5CF6` · `#C9A6FF` | `#0A3348` · `#1F6EA0` |

Bathyarch's sodium lamps go pale rather than saturated — under tritanopia a
saturated amber reads pink and would collide with both the Directorate's
crimson and the threat red, so the Consortium becomes bone-white work-light and
keeps its iron-grey cladding. Nodules follow it, as they follow Bathyarch's
amber in every other palette: ore is what the Consortium is *about*. Hadron's
resonance violet becomes a deep instrument blue — violet loses its blue channel
and drifts toward the Directorate — and the Knights' "razor-thin constant lines,
mirror speculars" is the half of their identity that was never in the hue.
Resonance Crystal follows Hadron into a cold blue, which is the same argument
the standard palette makes with violet: the resource and the faction that is
made of it should read as the same substance.

Fauna is the hard case here and the table shows it honestly. Tritanopia's usable
hues are red-warm, green-cool and neutral; the Commune already owns green and
the tier ramp already owns teal, so the animals take a cool neutral rather than
a fifth green that would be indistinguishable from both. They are only ever
drawn from Tier 3 and always as organic outlines, so the shape is the identifier
and the colour is what makes it findable.

### What a palette may not do

- It may not change **alpha, radius, edge hardness or shape** on the tier
  scale. Those are the fidelity encoding, they are not colour, and a palette
  that touched them would be re-encoding the Asymmetric Fidelity Law rather
  than recolouring it.
- It may not introduce a hue outside its own table. Gate 4 of
  [graphics-standards.md](graphics-standards.md) applies to all four tables
  equally: these *are* the source of truth, and `packages/frontend/src/game/palette.ts`
  transcribes them.
- It may not make anything invisible to make something else clearer. Every
  entry above keeps the luminance class of the colour it replaces, so a
  palette swap never costs contrast against `abyss-void`.

## Reduced motion

Three animations in the interface are decoration wrapped around information,
and [ui-ux.md](ui-ux.md) §11 requires each to have a static equivalent
"that carries the same information":

| Animation | Static equivalent | What must survive |
| --- | --- | --- |
| The scope sweep (4 s a revolution) | A fixed cyan cross-hair on the scope's anchor, drawn at the same alpha | The sweep never carried information — it is out of phase with the 5 Hz tick on purpose so nobody believes it finds things. The anchor it rotates about *is* information: it is where the ping rings are measured from |
| Screen-edge exposure flash (2 s decay) | A steady wedge on the same bearing, held for the same two seconds, then gone | The bearing, and the fact that it is *live*. A hold-then-cut keeps both without a ramp |
| The crush-depth badge pulse (~0.5 Hz) | A filled badge at constant full alpha, with a hairline rule under it | "This hull is below its Pressure Rating and losing tonnage that will not heal." The pulse said *unrecoverable*; the rule says it without moving |

Reduced motion does **not** touch the ping wavefront, the acquisition brackets,
the mark fade-in, or the contact ghost decay. Those are not decoration: an
expanding ring is the ping's radius over time, brackets closing are the
acquisition, and a fading mark is decaying confidence. Removing them would
remove information, which is the opposite of what the setting is for. The rule
is: **if the motion is the message, it stays.**

## Motion and FX timing

- **Sonar cadence is the heartbeat.** The Echo Layer resolves at 5 Hz
  (`SIM.ECHO_HZ`); contact fade-ins, scope repaints, and HUD pulse animations
  quantise to that 200 ms grid so the interface *feels* like sonar, not video.
- **Ping**: expanding `neon-red` ring with a white core front, 1.5 s to the
  2,400 m radius, leaving a decaying afterimage — the most expensive light in
  the game should look expensive.
- **Damage**: chrome flicker (2–3 dropped frames of bevel glow), cavitation
  distortion per [art-direction.md](art-direction.md) UI FX.
- **Camera**: keep the existing slow sway and vignette; add a barely-visible
  magenta/cyan chromatic split (≤ 1 px) at the frame edges only.

## Don'ts

- No neon on terrain or biomes — the seafloor stays desaturated
  (`BIOME_COLOR` in `packages/frontend/src/game/palette.ts`); light belongs to
  *agents and instruments*. One carved-out exception, spec'd in
  [art-direction.md](art-direction.md) "Reading the Sea Floor": thermal vent
  **ember light**, `#E06A2B`, dim and sparse, flicker quantised to the 5 Hz
  sonar grid. It is world-light, not neon — no UI hue ever touches it, and no
  other biome gets one.
- No violet outside the Mouth/resonance/Hadron contexts.
- No full-saturation fills — neon is edges, strokes, glyphs, and points, never
  a filled rectangle.
- No white UI. The brightest steady element is `text-bright`; pure white is
  reserved for one-frame cores (ping front, commit flash).
- No stacking halos, no bloom slider. Two glow layers per element, hard cap.

## Transcription targets

- `packages/frontend/src/index.css` / `App.css` — CSS custom properties for
  the tokens above plus the two type voices (`--font-display`, `--font-data`);
  the DOM shell (overlays, menus) uses only tokens.
- `packages/frontend/src/menu/SonarMark.tsx` — the logo mark
  ([naming.md](naming.md) "The logo"), inked from the tokens: rings in
  `neon-cyan`, the contact in `neon-red`, glow per the recipe above.
- `packages/frontend/src/game/palette.ts` — already transcribes
  [art-direction.md](art-direction.md); chrome constants there should match
  this doc's tokens (`UI.background` = `abyss-void`, `UI.glass` =
  `abyss-glass`, `UI.threat` = `neon-red`, …).

When this doc and the code disagree, one of them is wrong — say which one you
are changing and why.

## Related

- [art-direction.md](art-direction.md) — world palette, silhouette law, the
  Asymmetric Fidelity Law this style enforces
- [ui-ux.md](ui-ux.md) — HUD layout and Echo Layer readability requirements
- [factions.md](factions.md) — full faction visual identity sheets
- [naming.md](naming.md) — logo and title treatment
- [systems-echo.md](systems-echo.md) — the mechanics the glow rules encode
