# Echoes of the Abyss — Naming & Identity

## Final Game Name

**Echoes of the Abyss**

## Why It Works

- Atmospheric
- Mysterious
- Industrial
- Dramatic
- Unique
- Evokes depth, danger, and resonance

## Tagline Concepts

- War reverberates in the deep.
- Pressure shapes all who descend.
- In the abyss, every echo is a warning.
- Four factions. One rift. Endless depth.

The shell uses the third: it is the one that states the game's core rule
([systems-echo.md](systems-echo.md)) as a sentence.

## The logo

Decided, 2026-08. The mark is **the Mouth** — the concentric banding of the
Rift's one unexplained place ([world-map.md](world-map.md), plate IV),
narrowing to a single point of light that is not yours. The game's brand is
the thing everyone in the setting is afraid to listen to. The alternates
considered and set aside are recorded at the end of this section.

Violet is the reserved ink of the *unresolved*
([style-neon-noir.md](style-neon-noir.md)), and the logo is the one piece of
chrome licensed to spend it: the reservation is why the mark reads as the
Mouth and not as decoration. Nothing else in the shell or HUD inherits that
license.

### The mark

Concentric bands on a 240 × 184 construction grid, throat at 120,162:

- **Five downward arcs**, each narrower and deeper than the last, in
  `neon-violet` — spans 200 → 48 units, stroke 1.6 → 2.4, opacity 0.45 → 1.
  Brightness *increases* with depth: the inversion that makes it the Mouth
  and not a sonar return. Depth is below, and the deep end is the lit end.
- **The throat**: one small point in `mouth-glow` (`#C9A6FF`, the crystal
  glow of the resonance contexts in [art-direction.md](art-direction.md)),
  centred under the bands — the one point of light, and it is not yours.
- **Glow** follows the recipe in [style-neon-noir.md](style-neon-noir.md)
  exactly: core stroke plus one blurred halo, two layers, never more.

### The wordmark

- **ECHOES** — condensed industrial grotesque (the display voice of
  [style-neon-noir.md](style-neon-noir.md); the shell ships **Big Shoulders
  Display**, vendored), weight 700, uppercase, tracking 0.07em, in
  `text-bright` with a violet halo.
- **OF THE ABYSS** — same face at weight 600, uppercase, tracking 0.5em, in
  `mouth-glow`.
- **Tagline** (optional third line) — the data voice: monospace, uppercase,
  tracking 0.16em, `text-dim`.

### Lockups

| Lockup | Use |
| --- | --- |
| Vertical (mark over wordmark) | Title screen, key art, splash |
| Horizontal (mark left of wordmark) | Banners, store headers, docs |
| Mark alone | Favicon, app icon, avatars — at 48 px and below drop to three bands + throat; below that the throat alone may carry the corner |
| Silent running (monochrome `text-bright`, no glow) | Contexts that forbid colour; the logo running quiet is on-doctrine |
| One-colour print (`#0E1418` on pale paper) | Print, one-colour partners |

### Rules

- The bands brighten downward, always. Flipping or evening them out turns the
  Mouth back into a generic echo.
- There is exactly one throat light. The mark never gains a second point, a
  contact, or an emitter — nothing in this picture is you.
- The mark's violets are `neon-violet` and `mouth-glow` and nothing else —
  never a faction's colour, and never cyan or magenta, which belong to the
  interface. Outside the logo, violet keeps its reservation untouched.
- Backgrounds come from the blacks of
  [style-neon-noir.md](style-neon-noir.md) (`abyss-void` gradient downward);
  the mark never sits on blue.

The shell transcribes this section: the mark is
`packages/frontend/src/menu/MouthMark.tsx`, the lockup is the title screen's
masthead, and the favicon is the mark-alone reduction. The title screen's
void — and only the title screen's — carries a faint violet rise from the
bottom edge: the Mouth is below. When this section and that code disagree,
one of them is wrong — say which one you are changing and why.

### Considered and set aside

- **Sonar return** — four decaying cyan rings fading downward, one threat-red
  contact answering back. The strongest statement of the *mechanics*; set
  aside because the Mouth says what the game is *about*. Its language lives
  on in the sonar scope itself.
- **Pressure gauge** — a survey-instrument gauge with the needle in the crush
  band. Kept as a motif for loading and settings chrome; too quiet to be the
  brand.

## Related

- [style-neon-noir.md](style-neon-noir.md) — the tokens, glow recipe and
  typography the logo is built from
- [art-direction.md](art-direction.md) — the wider visual identity the logo
  fronts
- [ui-ux.md](ui-ux.md) — §14, the shell that carries the lockup
- [game-identity.md](game-identity.md) — what the name and mark are promising
