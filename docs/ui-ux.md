# UI/UX — Reading the Echo Layer

> [systems-echo.md](systems-echo.md) §9 lists five non-negotiables and defers the rest here. This document is the rest.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. Principles

1. **Fidelity law — pixel precision equals information precision.** A Tier-1 return is drawn as a haze because a haze is genuinely what the server sent. Any UI that renders a low tier crisply is telling a lie on the server's behalf.
2. **The client cannot know more than the player earned.** Detection is server-authoritative and per-player ([tech-stack.md](tech-stack.md)); the client never holds enemy state it is not rendering. The UI has no hidden layer to leak.
3. **Ear leads eye.** Visual marks fade in on a delay so audio always arrives first ([audio-direction.md](audio-direction.md) §2), and every audio-only cue has a visual mirror (§11).
4. **Own loudness is always on screen.** Never a submenu, never a toggle.
5. **Nothing that costs you information may be an accident.** The ping is previewed before commit, always.

---

## 2. Screen Layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────┐                                    ┌────────────┐ │
│ │ SIG  42 / 100    │                                    │  CONTACT   │ │
│ │ ███████░░░░░░░░  │                                    │    LOG     │ │
│ │ 3 units · 2 loud │            world view              │ T+04:12 …  │ │
│ └──────────────────┘                                    │ T+04:09 …  │ │
│ ┌──┐                                                    └────────────┘ │
│ │D │  depth ribbon                                                     │
│ │E │  (vertical, shows                                                 │
│ │P │   band + selection                                                │
│ │T │   + PR warning)                                                   │
│ │H │                                                                   │
│ └──┘                                                                   │
│                                                                        │
│ ┌───────────────┐  ┌─────────────────────────┐  ┌────────────────────┐ │
│ │ SONAR SCOPE   │  │  selection / orders      │  │ PING  [P]         │ │
│ │  (minimap)    │  │  silent-running state    │  │ cooldown 00:12    │ │
│ └───────────────┘  └─────────────────────────┘  └────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

The world view is the whole screen; every panel floats on it as glass ([art-direction.md](art-direction.md) "UI Direction"). Chrome never occupies more than 22% of screen area at 1080p, and the centre 60% is always clear — contacts appear in the world, not in a list.

---

## 3. The SIG Meter

The permanent element. Top-left, 240 × 12 px at 1080p, above a two-line readout.

| Property | Spec |
| --- | --- |
| Value shown | **Peak SIG across the player's units**, not the average — the loudest unit is the one that gets you found |
| Numeric readout | `SIG 042 / 100`, monospaced, zero-padded so the digit count never shifts |
| Colour stops | 0–29 `#3FA86A` · 30–64 `#F2B233` · 65–100 `#E0452F` |
| Transition | Snap at the boundary, do not blend. A threshold crossing is an event and must read as one |
| Spikes | Firing and ping bursts render as a lighter overlay bar that decays over the burst duration, so the player sees the transient separately from their baseline |
| Second line | `n units · m loud` where *loud* means SIG > 60 — the number that predicts trouble |

When a unit crosses into the red band, the meter flashes once and the contact log records it. Players must be able to answer *"why did they find me?"* after the fact.

---

## 4. Contacts

The rendering contract, matching `TIER_STYLE` in the client scaffold:

| Tier | Mark | Colour | Alpha | Radius | Never drawn |
| --- | --- | --- | --- | --- | --- |
| **1 — Contact** | Soft filled haze with a faint rim | `#4A7A8C` | 0.18 | 90 m | Any edge sharp enough to point at |
| **2 — Bearing** | Filled blob at the blurred position | `#6FA8BF` | 0.32 | 46 m | Unit type, count, faction colour |
| **3 — Classification** | Dot plus outer count ring, faction-coloured | `#A8D0E0` → faction | 0.55 | 26 m | Health, facing |
| **4 — Track** | Crisp dot, heading line, health bar | `#FF6B5B` → faction | 0.90 | 16 m | — |

Rules that apply to all tiers:

- **Ghosts fade, they do not vanish.** Contacts decay over 20 s with alpha tracking freshness. A stale contact is still information — just less of it ([systems-echo.md](systems-echo.md) §4).
- **No interpolation below Tier 4.** The server sends positions at 5 Hz; smoothing a Tier-2 blob between snapshots invents a velocity the player was never told. Tier 4 may interpolate, because at Tier 4 heading is known.
- **Faction colour is earned at Tier 3.** Below that, contacts are scope-blue for everyone, because the player does not know whose they are.
- **Count is an estimate and must look like one.** Tier 3 renders `~4`, never `4`.

---

## 5. The Minimap Is a Sonar Scope

Not a map with markers on it. A scope.

- **Sweep** — a slow rotating sweep line, one revolution per 4 s, purely cosmetic and clearly out of phase with the 5 Hz detection tick so no player ever believes the sweep is what finds things.
- **Range rings** — concentric, labelled at 900 m and 2,400 m, the ping's two radii. The two numbers that matter are permanently drawn.
- **Terrain** — biome wash only, at the desaturated fills in `palette.ts`. No structures, no roads, no detail that competes with returns.
- **Returns** — same tier fidelity as the world view, scaled down. A Tier-1 haze on the scope is a large soft smear, and a player must not be able to click one to select it.
- **Echo Marks** — a separate dimmer layer, drawn beneath returns, in a colder hue. Past and present must never share an ink.
- **No fog.** There is no explored/unexplored state anywhere in this game. Terrain is always fully drawn; what is hidden is *occupancy*, and occupancy is drawn only as returns. Any "unexplored black" would be the wrong game.

---

## 6. Active Sonar

The one interaction the UI is allowed to be pushy about.

| Stage | UI |
| --- | --- |
| **Hover / preview** | Two rings on the terrain at the emitting unit: 900 m reveal in friendly cyan, 2,400 m self-reveal in threat-red `#FF3B30`, plus a live count of enemy contacts currently known inside the outer ring |
| **Commit** | Explicit press. Never bound to a bare click on the world; never fires from a double-tap of another ability |
| **Transmit** | 1.5 s emission: the SIG meter pegs to 95 and glows, the outer ring stays drawn for the duration |
| **Reveal** | 3 s of Tier-4 rendering for everything inside 900 m, with a hard countdown ring so the player can see their knowledge expiring |
| **After** | Every revealed contact drops to its earned tier and begins normal ghost decay. The drop is instant and visible — the player must watch certainty end |
| **Being pinged** | Screen-edge flash on the emitter's bearing, log entry, and the SIG meter's frame turns red for 2 s. You always know you were lit |

**Preview is mandatory.** A ping that happened by accident is the single worst UX failure available in this design, and the outer ring exists to make the cost impossible to not-see.

---

## 7. Silent Running

Silent Running trades away most of what a unit can do ([systems-echo.md](systems-echo.md) §6), so its state must be unmissable and its cost must be legible at the moment of the trade.

- Silent units render at **0.45 alpha** — quiet is a visible state.
- Weapon, shield, repair, mine and build actions grey out **with a reason attached** (`disabled — silent running`), never silently.
- The selection panel shows the live speed penalty as a number, and shows the Commune's reduced penalty as the same number, differently — no faction reads a different UI.
- Issuing an attack order to a silent unit raises a **break-silence confirmation** the first three times per match, showing the +40 SIG spike it will produce. After that it is trusted and the confirmation stops.

---

## 8. Depth and Pressure

The vertical axis needs permanent, glanceable representation ([systems-depth.md](systems-depth.md)).

- **Depth ribbon** — a vertical strip on the left showing Shelf / Mid-Water / Abyssal, band boundaries at 400 m and 1,800 m, and a marker per selected unit.
- **PR badge** — each unit carries its Pressure Rating; when it is under-rated for its current depth the badge inverts and pulses.
- **Crush attrition must not look like damage.** It ignores repair, so it renders differently: the lost portion of the health bar is hatched and does not refill, making the permanence visible rather than discovered later.
- **Descent and ascent** — descending shows the SIG cost as a live spike on the meter; ascending shows a time-to-surface estimate, because the ascent is the part players underestimate.

Implemented in the client scaffold: the ribbon runs down the left edge with a marker per
selected hull and a ghost marker at its ordered depth; the PR badge sits in the selection
card and shows a Sounding Spire's grant as `PR2+1` so a rented rating reads as rented; the
crushed portion of the health bar is hatched, and its texture rather than its hue is what
distinguishes it, so it survives colour-vision differences (§11). Depth orders step band to
band — `D` dives, `A` rises — because the bands are what the player reasons about.

---

## 9. Selection, Orders, Controls

Implemented in the client scaffold today (`packages/frontend/src/game/EchoRenderer.ts`):

| Input | Action |
| --- | --- |
| Left click | Select nearest own unit; shift to add |
| Right click | Move order for the selection |
| Middle drag | Pan |
| Wheel | Zoom about the cursor |
| `Space` | Toggle Silent Running for the selection |
| `P` | Active sonar ping from the first selected unit |
| Hold `Shift` | Ping-cost preview rings |

Planned, and specified here so the scaffold has a target: box select, control groups `1`–`9`, double-click select-all-of-type, `F` for ping-at-cursor, order queueing with `Shift`, and a repeat-last-order binding. Every added binding must respect §1.5 — no destructive-to-information action lands on a single unmodified click.

---

## 10. The Contact Log

A scrolling, timestamped feed of every detection event at the fidelity earned. It is a first-class UI element, not a debug view, and it is the accessible mirror of the audio channel.

```text
T+04:12  TIER 1  contact          bearing unknown
T+04:09  TIER 3  ~4 Consortium    bearing 118°   ~2,100 m
T+04:07  ---     you were pinged  bearing 070°
T+03:58  TIER 2  contact          bearing 245°   ~1,400 m
T+03:51  MARK    industrial hum   bearing 310°   decaying
```

Entries are click-to-focus (camera moves to the last known position) and copy-pasteable, because post-match analysis of *"when did they hear me"* is a real activity this game should support.

---

## 11. Accessibility

Audio carries primary information, so accessibility here is a correctness requirement, not a feature tier. The full audio-side commitments are in [audio-direction.md](audio-direction.md) §11; the UI owes:

- **Full playability muted** — the contact log plus tier marks carry everything the mix carries.
- **Visual-first preset** — one toggle removes the fade-in delay from §1.3 so marks arrive at ≤ 30 ms.
- **Tier encoding is never hue-alone.** Tiers differ in size, alpha, edge hardness and shape before they differ in colour, so the whole scale survives any colour vision deficiency. Three additional palettes ship regardless: deuteranopia, protanopia, tritanopia.
- **Faction colour is never the only identifier.** Tier-3+ contacts carry a faction glyph as well as a colour.
- **UI scale** 75%–200%, independent of world zoom, with the SIG meter and ping preview scaling first.
- **Full rebinding**, including a one-handed layout, and no timing-critical chords.
- **Motion and flash limits** — a reduced-motion mode replaces the sonar sweep, screen-edge exposure flash and meter pulse with static equivalents that carry the same information.

---

## 12. Latency and Feedback

- The client predicts **its own units only** — its own movement, its own SIG, its own detection rings. `packages/shared/src/echo.ts` exists so the client can compute those honestly with the same maths the server uses.
- The client **never** extrapolates a contact. Not for smoothness, not for feel.
- Detection arrives at 5 Hz and the UI shows that rhythm rather than hiding it. Freshness fade is permitted because it represents decaying confidence; positional smoothing is not, because it represents knowledge.
- Order feedback is immediate and local (the order marker appears on click) while the result is server-confirmed. Input latency is never traded for information honesty.

---

## 13. Scaffold Status

What the current client implements against this spec, so nobody re-implements what exists or assumes what does not:

| Requirement | Status |
| --- | --- |
| SIG meter, peak value, colour stops | Implemented |
| Tier-graded contact rendering, ghost decay | Implemented |
| Selected-unit detection ring | Implemented |
| Ping preview rings, ping commit | Implemented (hold `Shift`, `P`) |
| Silent-running dimming | Implemented |
| Depth ribbon, PR badge, crush hatching | Implemented (`D` dive, `A` rise; hold `Shift` to preview the dive cost) |
| Sonar-scope minimap | Implemented — terrain and own force; contact fidelity still to audit against §5 |
| Contact log | Not started |
| Accessibility presets and palettes | Not started |
| Box select, control groups, order queue | Not started |

---

## Related

- **[systems-echo.md](systems-echo.md)** — the five non-negotiables this document expands
- **[audio-direction.md](audio-direction.md)** — the other half of the information channel
- **[art-direction.md](art-direction.md)** — glass panels, palette, and the visual language
- **[systems-depth.md](systems-depth.md)** — depth bands and pressure, as surfaced in §8
- **[tech-stack.md](tech-stack.md)** — why the client is allowed so little
