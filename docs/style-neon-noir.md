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
  not colour.
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
  *agents and instruments*.
- No violet outside the Mouth/resonance/Hadron contexts.
- No full-saturation fills — neon is edges, strokes, glyphs, and points, never
  a filled rectangle.
- No white UI. The brightest steady element is `text-bright`; pure white is
  reserved for one-frame cores (ping front, commit flash).
- No stacking halos, no bloom slider. Two glow layers per element, hard cap.

## Transcription targets

- `packages/frontend/src/index.css` / `App.css` — CSS custom properties for
  the tokens above; the DOM shell (overlays, future menus) uses only tokens.
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
