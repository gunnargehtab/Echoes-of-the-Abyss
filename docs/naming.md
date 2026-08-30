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

Decided, 2026-08. The mark is a **sonar return swallowed by depth**: the game's
whole argument — emitting anything is how you are found — drawn as one picture.
The alternates considered and set aside are recorded at the end of this section.

### The mark

Concentric rings on a 200 × 200 construction grid, centre 100,100:

- **Four rings**, radii 28 / 52 / 76 / 96, in `neon-cyan`, each return dimmer
  than the last (opacity 0.95 → 0.35): a decaying echo.
- **The fade.** Every ring fades downward (full strength at the top, ~12 % at
  the bottom edge) — the abyss swallowing the echo. Depth is always below
  ([style-neon-noir.md](style-neon-noir.md)); the fade is the identity's one
  non-negotiable move and survives every reduction.
- **The emitter**: a filled cyan dot at centre — you, at the centre of what you
  can hear.
- **The contact**: one small return in `neon-red` at bearing 135°, low in the
  fade, with a faint bearing line back to the emitter. Red is the ink that
  warns, and the tagline is the caption: in the abyss, every echo is a warning.
- **Registration ticks** at north, west and east only — survey marks from the
  Pressure Cartography plates. No south tick: the bottom edge belongs to the
  fade.
- **Glow** follows the recipe in [style-neon-noir.md](style-neon-noir.md)
  exactly: core stroke plus one blurred halo, two layers, never more.

### The wordmark

- **ECHOES** — condensed industrial grotesque (the display voice of
  [style-neon-noir.md](style-neon-noir.md); the shell ships **Big Shoulders
  Display**, vendored), weight 700, uppercase, tracking 0.06em, in
  `text-bright` with a cyan halo.
- **OF THE ABYSS** — same face at weight 600, uppercase, tracking 0.5em, in
  `neon-cyan`, flanked by two hairline rules.
- **Tagline** (optional third line) — the data voice: monospace, uppercase,
  tracking 0.16em, `text-dim`.

### Lockups

| Lockup | Use |
| --- | --- |
| Vertical (mark over wordmark) | Title screen, key art, splash |
| Horizontal (mark left of wordmark) | Banners, store headers, docs |
| Mark alone | Favicon, app icon, avatars — at 48 px and below drop to two rings + contact, and below that the contact alone may carry the corner |
| Silent running (monochrome `text-bright`, no glow) | Contexts that forbid colour; the logo running quiet is on-doctrine |
| One-colour print (`#0E1418` on pale paper) | Print, one-colour partners |

### Rules

- The contact is always `neon-red` and there is always exactly one. Two
  contacts is a different story; none is a screensaver.
- The rings are always cyan on the dark lockups — the mark speaks in the
  interface voice, never in a faction's colour.
- The fade is never removed, flipped, or rotated: depth is below.
- Backgrounds come from the blacks of
  [style-neon-noir.md](style-neon-noir.md) (`abyss-void` gradient downward);
  the mark never sits on blue.

The shell transcribes this section: the mark is
`packages/frontend/src/menu/SonarMark.tsx`, the lockup is the title screen's
masthead, and the favicon is the mark-alone reduction. When this section and
that code disagree, one of them is wrong — say which one you are changing
and why.

### Considered and set aside

- **Pressure gauge** — a survey-instrument gauge with the needle in the crush
  band. Kept as a motif for loading and settings chrome; too quiet to be the
  brand.
- **The Mouth** — concentric violet banding narrowing to a throat. Set aside
  because violet is reserved for the *unresolved*
  ([style-neon-noir.md](style-neon-noir.md)), and a logo would spend that
  reservation everywhere.

## Related

- [style-neon-noir.md](style-neon-noir.md) — the tokens, glow recipe and
  typography the logo is built from
- [art-direction.md](art-direction.md) — the wider visual identity the logo
  fronts
- [ui-ux.md](ui-ux.md) — §14, the shell that carries the lockup
- [game-identity.md](game-identity.md) — what the name and mark are promising
