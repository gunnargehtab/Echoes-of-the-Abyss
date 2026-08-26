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

Implemented: terrain wash, tier-fidelity returns, the sweep, the two range rings, and the
camera viewport. Returns are sized *inversely* to tier — a Tier-1 return is the largest and
softest mark on the scope, because its size is the uncertainty rather than the contact,
while a Tier-4 track is a tight point. They were previously uniform dots, which drew a
Tier-1 haze as crisply as a Tier-4 track: the scope asserting precision the server never
sent. The Echo Marks layer waits on the marks themselves.

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
- Weapon, shield, repair, mine and build actions grey out **with a reason attached** (`disabled — silent running`, or `disabled — silence order` where a mission rule is what withholds them), never silently.
- The selection panel shows the live speed penalty as a number, and shows the Commune's reduced penalty as the same number, differently — no faction reads a different UI.
- Issuing an attack order to a silent unit raises a **break-silence confirmation** the first three times per match, showing the +40 SIG spike it will produce. After that it is trusted and the confirmation stops.

---

## 8. Depth and Pressure

The vertical axis needs permanent, glanceable representation ([systems-depth.md](systems-depth.md)).

- **Depth ribbon** — a vertical strip on the left showing Shelf / Mid-Water / Abyssal, band boundaries at 400 m and 1,800 m, the **thermocline** at 1,200 m with its duct shaded around it, and a marker per selected unit. The layer is not a fourth band and must not read as one: bands are about pressure and what a hull survives, the thermocline is about who can hear whom, so it takes the cyan passive-readout ink rather than the magenta the band hairlines use (§11, [style-neon-noir.md](style-neon-noir.md)). Drawing it reveals nothing — the boundary is a published constant, identical on every map — but the *factor* may never be drawn, because it depends on the listener's depth, which is the enemy's.
- **PR badge** — each unit carries its Pressure Rating; when it is under-rated for its current depth the badge inverts and pulses.
- **Hull the deep keeps must not look like damage.** Crush attrition below a unit's Pressure Rating, and the shallow-water poisoning that costs the Directorate 15% above 400 m, both ignore repair, so they render differently: the lost portion of the health bar is hatched and does not refill, making the permanence visible rather than discovered later. One hatch for both, because the player asks one question of it — how much of this bar is gone for good.
- **Descent and ascent** — descending shows the SIG cost as a live spike on the meter; ascending shows a time-to-surface estimate, because the ascent is the part players underestimate.

Implemented in the client scaffold: the ribbon runs down the left edge with a marker per
selected hull and a ghost marker at its ordered depth; the PR badge sits in the selection
card and shows a Sounding Spire's grant as `PR2+1` so a rented rating reads as rented; the
unrecoverable portion of the health bar is hatched, and its texture rather than its hue is
what distinguishes it, so it survives colour-vision differences (§11). Depth orders step rung to
rung — `D` dives, `A` rises — and the rungs are the three band stations plus the thermocline,
because sound with both ends inside the duct carries 1.2× further than open water and until the
duct became a rung no order a player could give could buy it. The readout names the selection's
own zone when it is somewhere other than the default: `DUCT` inside the layer, `UNDER` below it.

The duct is a fixed 6.67% of the strip, so on a short window it collapses to a few pixels; below
that it is drawn as its centre line alone rather than as a smear pretending to have width.

---

## 9. Selection, Orders, Controls

Implemented in the client scaffold today (`packages/frontend/src/game/EchoRenderer.ts`):

| Input | Action |
| --- | --- |
| Left click | Select nearest own unit; `Shift` adds, `Ctrl` subtracts |
| Left drag | Box select own units; `Shift` adds, `Ctrl` subtracts |
| Double click | Select every visible unit of that class (`Alt`-click does the same) |
| Right click | Context order — move, attack a contact, or work a field |
| `Shift` + right click | Queue the order behind the unit's current plan |
| `1`–`9` | Recall control group; `Ctrl` + digit assigns; recall twice to centre |
| Middle drag | Pan |
| Wheel | Zoom about the cursor |
| `Space` | Toggle Silent Running for the selection |
| `P` | Active sonar ping from the first selected unit |
| `D` / `A` | Dive / rise one depth band |
| `R` / `F` / `T` / `B` | Arm a Refinery / Foundry / Turret / faction structure |
| Hold `Alt` | Ping-cost preview rings |

Still planned: a repeat-last-order binding, and ping-at-cursor — which needs a key that is
not `F`, since that arms the Foundry.

**Every key in that table is a default, not a fact.** §11 owes full rebinding, and the
bindings are data (`packages/frontend/src/input/bindings.ts`) that the Controls screen
edits — so the table above is what a player starts with rather than what they are stuck
with. Four things are deliberately *not* rebindable, and each is the resolved half of a
conflict this document settled:

| Fixed | Why it cannot move |
| --- | --- |
| `1`–`9` | Control groups have no alternative route; production has the UNITS tab |
| `Shift` | Queues an order, and adds to a selection |
| `Ctrl` | Subtracts from a selection, and assigns a control group |
| `Esc` | Drops a pending build, and is handled before every other key |

The point is not tidiness. Each of those loses to a *mouse* interaction, so a player who
rebound one would not find a key that stopped working — they would find that clicking had
quietly changed meaning, with nothing to press and notice.

### The one-handed layout

§11 owes a one-handed layout, and the default is not one: `P`, `N`, `M` and `B` sit under a
right hand that is on the mouse. The alternative layout moves exactly those four and leaves
the nine that were already within reach alone, because a layout that also shuffles the keys
a player knows is a worse layout.

| Action | Standard | One-handed |
| --- | --- | --- |
| Active sonar | `P` | `Q` |
| Harvest throttle | `V` | `E` |
| Noisemaker | `N` | `Z` |
| Mine | `M` | `X` |
| Faction structure | `B` | `V` |

Everything else — `Space`, `A`, `D`, `C`, `R`, `F`, `T`, `G` and `Alt` — is unchanged.
Control groups are the one thing this cannot fix: the digits are fixed for the reason above,
and `6`–`9` are out of reach. That is a real limitation of playing one-handed rather than
something the layout is hiding.

**Two bindings this table settles, because the document previously specified both sides of
a conflict.** Order queueing and the ping-cost preview were both assigned to `Shift`;
queueing keeps it, as the RTS convention and by far the more frequent action, and the
preview moved to `Alt`. Control groups and unit production were both assigned to the digits;
control groups keep them, because production also has the command bar's UNITS tab and
control groups have no alternative route at all.

Every added binding must respect §1.5 — no destructive-to-information action lands on a
single unmodified click.

**Order queues are server state.** A queued route is a *plan about sound* — the player is
buying quiet with travel time — so it lives in the simulation rather than the renderer: a
reconnecting player gets their plan back, and two clients watching one slot cannot disagree
about what a fleet is doing. Each queued order is drawn at the position it was *issued* at.
For a queued attack that matters: the player is entitled to where they saw the contact when
they gave the order, not to a live feed of where it is now.

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

**The log is DOM, not canvas, and that is a design decision rather than an implementation
detail.** §11 makes it the accessible mirror of the audio channel and the line above makes
it copy-pasteable; a Pixi-drawn log could be neither, because canvas text is not selectable
and not reachable by a screen reader. It is marked up as an `aria-live` log region so
detections are announced as they happen, and it follows the tail only while the player has
not scrolled up to read something.

An entry is written when a contact is first heard and again whenever its tier *changes* —
not every 5 Hz tick, which would bury the events that matter. Entries are never rewritten:
a log that sharpened its own history when a better resolution arrived would let a player
reconstruct positions they never earned, and would destroy what the log is for.

Two rows in the sample above are not yet implemented, and are blocked rather than skipped:
`you were pinged` needs the server-sent exposure flag that the audio work introduces, and
`MARK` needs Echo Marks to exist. Tier-3 rows currently name the hull and faction rather
than estimating a count, because the Echo Layer does not model counts.

---

## 10.5 The Objectives Panel

It sits here, next to the log, because it is the log's argument applied a second time; and
it is numbered 10.5 rather than 11 because §10, §11 and the rest are cited by number from
other documents ([audio-direction.md](audio-direction.md),
[playtest-checklist.md](playtest-checklist.md)) and renumbering them would break those
citations to no purpose.

A mission states what it wants of the player ([campaign.md](campaign.md) §10), and the panel
is where it says so. It is in-match chrome, present only while a mission is running: a
skirmish has no objectives and draws no empty box for them.

**DOM, not Pixi, for §10's reasons exactly.** A canvas objective is not selectable and not
reachable by a screen reader, and an objective the player cannot copy into a bug report or
have read aloud is worse than no objective at all. Where the contact log is a `role="log"`
region because its entries *append*, the panel is `role="status"` with `aria-live="polite"`,
because its rows change **in place** — a status going pending to met is one row saying
something new, and a log role would re-announce the whole panel every time a counter moved.

- **Rows are focusable, and focusing one recentres the camera on its marker** — the same
  gesture click-to-focus already teaches in the log. A marker is an authored place (the
  Concourse, the service lock), never an entity, so the camera moves to somewhere the mission
  named and never to something the player has not detected.
- **Objective text is authored per mission and rendered verbatim.** Never templated. The
  court says *the flight stays under twenty* ([mission-sorrowgate.md](mission-sorrowgate.md)
  §12); a shared string would say "maintain SIG below 20", which is a sentence no faction in
  this setting speaks, and three of the four would have to be broken to make one template fit.
- **A locked ability shows its reason**, in the §7 form and in the panel as well as on the
  affordance: `disabled — silence order`. The lock is continuous state, not a reply to a
  click — the player learns the rule before pressing, because a refusal delivered afterwards
  teaches nothing and §1.5 forbids finding out what something cost by paying it.

**The panel may only ever show the player's own force and what they have resolved.** A row
reading `3 of 5 hostiles remaining` is a maphack in a numeral: it is precisely the map-wide
unit count that opaque contact handles exist to withhold ([tech-stack.md](tech-stack.md)),
handed over in a friendlier font. Progress counters are computed from the observer's own
resolved snapshot and from nothing else, which is why an objective may say *get both tenders
out* and may never say how many of anybody else's hulls are left.

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

### Audible cue to visual equivalent

The parity table. Every row is a claim that the mix tells the player nothing the screen does not, and it is the artefact to check when a cue is added — an audible fact with no row here is a bug, not a backlog item.

| Audible cue | Visual equivalent |
| --- | --- |
| Tier-1 thump — mono, centred, level-locked | Directionless haze drawn on the *listener's* position, and a contact-log row reading `bearing unknown` |
| Tier-2 wash, panned at partial authority | Blurred blob at the reported position; log row carries bearing and approximate range |
| Tier-3 faction drive signature | Faction-coloured mark with its glyph; log row names the faction and unit class |
| Tier-4 full drive loop | Resolved silhouette with heading; log row in threat colour |
| **Tier-4 lock tone** — one short tone on acquisition | **Acquisition brackets** that close onto the contact over 700 ms, once per acquisition, plus the log row for the tier change |
| A voice fading as its contact goes stale | Ghost marker fading on the same clock, `PERSISTENCE.GHOST_MARKER_DECAY_S` |
| A voice snapping back to full level | The marker returning to full alpha on the same tick |
| Biome colouring of a return | Biome tint under the contact, and the propagation overlay on the player's own units |
| Self-noise bed rising with your SIG | The SIG meter, plus a band label naming what the plant is doing (`DRIVE HUM`, `FULL PLANT`) |
| The world bus giving way to your own noise | `– masking` beside that label: you are drowning yourself out, and it says so |
| Silent Running's inversion — the world opening up | `SILENT RUNNING – open`, and the dimmed hulls already drawn for the mode |
| **Exposure strike** — you have been lit | **Screen-edge flash on the bearing of the emitter**, decaying over the same two seconds as the tail |
| Being tracked, continuously | `TRACKED ×n` in the top bar — how well you are seen, never by whom |
| Breaking silence to fire | An expanding ring on the hull that broke it, so the player knows *which* one gave the ambush away |
| Active sonar transmit and its returns | The ping wavefront already drawn, expanding on the same clock |
| Echo Mark beds — the sound of the past | Residue stains on the seabed, sized and faded by intensity |
| Industrial hum in the mix | The same stain in a cooler colour and a wider radius, so an economy reads differently from a fight at a glance |

Two rows are genuinely *new* information in the mix — the Tier-4 lock tone and the exposure strike — and both ship with the visual half in the same change. Everything else restates something the renderer already draws. That is the intended ratio.

The exposure strike is the harder of the two, and [audio-direction.md](audio-direction.md) §5 says why: "there is no visual equivalent that arrives sooner." Sooner is not the same as never. The flash arrives *with* the sound rather than before it, on the same bearing and the same two-second decay, and it is drawn in screen space rather than world space on purpose — a world-space marker would sit at a position, which is exactly what the server did not send.

**Mono is a rendering choice, never a loss.** Collapsing every pan to centre costs the convenience of hearing where something is; bearing remains in the contact log and on the sonar scope, so nothing becomes unknowable.

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
| Ping preview rings, ping commit | Implemented (hold `Alt`, `P`) |
| Silent-running dimming | Implemented |
| Depth ribbon, PR badge, unrecoverable-hull hatching | Implemented (`D` dive, `A` rise; hold `Alt` to preview the dive cost) |
| Thermocline on the ribbon, duct as a depth rung | Implemented — cyan line at 1,200 m, duct shaded, `DUCT` / `UNDER` in the readout |
| Sonar-scope minimap | Implemented — terrain, tier-fidelity returns, sweep, range rings; Echo Marks layer pending |
| Contact log | Implemented — DOM, live region, click-to-focus; ping and mark rows pending |
| Contact voices, per-tier | Implemented — pan authority by tier, biome voicing, faction timbre at Tier 3+ |
| Self-noise bed, SIG band label, masking readout | Implemented — server-sent, never inferred |
| Exposure strike and screen-edge flash | Implemented — fires from `EchoSnapshot.selfEvents`, bearing only |
| Active sonar transmit, returns ordered by range | Implemented |
| Break-silence transient and its per-hull ring | Implemented |
| Precedence Law — mark fade-in, ducking chain | Implemented — the visual-first preset is a settings toggle (§14) |
| Echo Mark residue, drawn and voiced | Implemented — server-resolved against HYD, so a client only holds what it could hear |
| Tier-4 acquisition brackets | Implemented — the visual half of the lock tone |
| Accessibility presets and palettes | Implemented (#192) — mono, visual-first, the three colour-vision palettes, UI scale and reduced motion are all settings (§14) |
| Full rebinding, and the one-handed layout | Implemented (#191) — bindings are data, the Controls screen edits them, reserved codes refuse capture |
| Box select, control groups, order queue | Implemented |
| The shell — title, setup, briefing, settings, credits | Implemented (§14) |
| Mission runtime and the prologue | Implemented (#190) — one mission; the campaign entry is still a disabled placeholder |
| Objectives panel | Implemented (§10.5) — DOM, `role="status"`, focusable rows, own-force counters only |
| Settings persistence and per-bus volume | Implemented (§14) — `localStorage`, applied at match mount |

---

## 14. The Shell

Everything before a room is joined and after one is left. The in-match interface above ends
at the hull; the shell is the port. It is DOM and only DOM, for the same reasons §10 gives
for the contact log — focus rings, keyboard traversal, screen readers — and it draws every
colour from the tokens transcribed out of [style-neon-noir.md](style-neon-noir.md): cyan
tells you, magenta asks you, red warns you. The reflection glow that document licenses "on
key art and menus only" belongs to the title screen; the in-match HUD still may not use it.

### Screens

```text
title ──▶ setup (solo | multiplayer) ──▶ match (in-room lobby ▶ playing ▶ result)
  │  ▲                                        │
  │  ├── settings · credits ── back           └── "Return to port" ▶ title
  │  └── briefing ───────────────────────▶ mission (playing ▶ result)
  └── resume banner ─────────────────────▶ match (seat resumed)
```

The screen state is a plain discriminated union in `App.tsx` — no router, no history
integration. Browser back mid-match would mean "leave the match" as an accident, and §1.5
forbids exactly that class of accident. Two deep links exist and both are kept: `?map=<id>`
boots straight into a match, and `?mission=<id>` boots straight into a mission the same way,
past the briefing. That is what keeps the headless harness and dev muscle memory working,
and it is a machine's door rather than a player's — a player reaches a mission through the
title screen, and reads the briefing on the way in.

- **Title** — the game's name, one tagline from [naming.md](naming.md), and the entries:
  Resume (only while a seat is held, see below), Campaign, Solo Game, Multiplayer,
  Tutorial, Settings, Credits. There is no Quit; this is a browser.
- **Setup** — shared by Solo and Multiplayer: a commander-name field and one card per map
  archetype (name, doctrine line, seats), from the shared catalogue. Faction choice and AI
  opponents stay in the in-room ready room, because faction uniqueness is enforced by the
  room and a pick is a request the room may refuse ([tech-stack.md](tech-stack.md)) — the
  shell does not promise what the server may deny.
- **Briefing** — a mission's own setup: its name, its premise, and the briefing text read
  verbatim in the register of whoever is speaking it
  ([mission-sorrowgate.md](mission-sorrowgate.md) §12). It is a screen and not an overlay on
  the match, because the match opens a socket and a simulation and a briefing has no
  business holding either. The shell does hold an audio context of its own now (#194), but
  it is the shell's and it is released on the way in — the briefing is still in the port,
  and it still sounds like it. It commits with the same "Descend" the setup screen uses.
- **Settings** — see below.
- **Credits** — static, and honest: the technology roll from
  [tech-stack.md](tech-stack.md) and a note that every sound is synthesised. No invented
  names.

**Disabled entries are visible, with the reason attached.** Tutorial is no longer one of
them: it launches the prologue, *Sorrowgate*
([mission-sorrowgate.md](mission-sorrowgate.md)), which is the same content the campaign's
first slot will launch — one mission behind two doors, because a separate tutorial would be
a second first mission teaching the same four systems ([campaign.md](campaign.md) §10).
Campaign is still dimmed to 40% per style-neon-noir's disabled rule — a dead console still
has phosphor in it — and its one line now reads `Awaits the faction campaigns`, because the
runtime it used to wait on exists and the twenty-eight missions after the prologue do not.
The shape of the finished game is on screen; a menu that hides its missing rooms would
misrepresent the build.

### Resume

A held seat survives a reload (the reconnection token in `sessionStorage`, inside the
server's grace window), so the title screen surfaces it as its first entry, autofocused —
one keypress back into the match. Resuming is offered, never automatic: the player may be
reloading precisely because they are done. Leaving on purpose — "Return to port" — clears
the token, so a stale banner never offers a seat that is gone.

### The port has a sound

The shell holds an audio context while it is on screen and closes it on the way into a
match, so the two never hold the device at once. What plays on it is the menu bed of
[audio-direction.md](audio-direction.md) §10 — a different piece from the in-game score,
because the score is a function of a match and a menu has none. Nothing sounds before the
first click or keypress, which is autoplay policy rather than a choice.

One consequence is worth naming: the Master and Music sliders below are now audible *while
you move them*, on the screen you move them on. Every other control in the table changes
something you can only hear in the water.

### Settings, v1

Only what wires to behaviour that exists. Each control names its effect in the mix or on
the screen, not a technology.

| Control | Range | Wires to |
| --- | --- | --- |
| Master volume | 0–100% | Master gain, composed under the −18 LUFS / −1 dBTP targets in [audio-direction.md](audio-direction.md) §12 |
| Music · World · Self · UI | 0 dB max | Per-bus trims ([audio-direction.md](audio-direction.md) §11 — independent buses) |
| Contacts | up to **+12 dB** | The one boostable bus, per the same section; the boost trades headroom for audibility and is capped so the true-peak target survives |
| Mono audio | toggle | The mix's existing mono spatialisation — a rendering choice, never a loss (§11) |
| Visual-first | toggle | Removes the §1.3 fade-in delay so marks arrive at ≤ 30 ms (§11) |
| Colour vision | standard · deuteranopia · protanopia · tritanopia | The four palettes in [style-neon-noir.md](style-neon-noir.md); tier *shape* never moves, only its ink (§11) |
| UI scale | 75–200% | A transform on the HUD layer and the DOM panels, never on the world (§11) |
| Reduced motion | toggle | Static equivalents for the scope sweep, the exposure flash and the crush badge — same information, no movement (§11) |

User volume lives on trim nodes *beside* the ducking chain, never on the ducked gains —
the Precedence Law's ducking writes those every tick, and a user slider fighting it would
turn the mix's grammar into noise. The commander name and every setting persist in
`localStorage` as a device preference; the reconnection token stays per-tab, because a seat
is not a preference.

Everything §11 asks for is now on that list. The last three arrived with #192 and are
renderer work rather than mixer work, so each names what it moves:

- **Colour vision** swaps the ink of the tier scale, the four navies, the SIG ramp, the
  resource fields and the fauna colour. It does not swap chrome, biome fills, or any part
  of the fidelity encoding — size, alpha, edge hardness and shape are how a tier is read
  before colour is consulted at all.
- **UI scale** multiplies the HUD layer and the three DOM panels and leaves the world
  transform alone, so zooming the interface never zooms the map or changes what is on
  screen. The scope, the command bar and the depth ribbon re-lay out against the scaled
  viewport rather than sliding off it, and pointer hits are divided back through the same
  factor — a button that has moved must still be where the click lands. §11 names the SIG
  meter and the ping preview as the two to scale first; the meter rides the HUD layer, and
  the preview is the one element that had to be split — its *radii* stay world-space,
  because 2,400 m is a fact about the water and not about the interface, while its strokes
  take the scale like every other line on an instrument.
- **Reduced motion** is an information-parity requirement, so it replaces rather than
  removes: the sweep becomes a fixed cross-hair on the scope's anchor, the exposure flash
  becomes a held wedge on the same bearing for the same two seconds, and the crush badge
  becomes a filled badge with a rule under it. The ping wavefront, the acquisition
  brackets and the ghost decay keep moving, because in those three the motion *is* the
  message.

---

## Related

- **[systems-echo.md](systems-echo.md)** — the five non-negotiables this document expands
- **[audio-direction.md](audio-direction.md)** — the other half of the information channel
- **[art-direction.md](art-direction.md)** — glass panels, palette, and the visual language
- **[systems-depth.md](systems-depth.md)** — depth bands and pressure, as surfaced in §8
- **[tech-stack.md](tech-stack.md)** — why the client is allowed so little
