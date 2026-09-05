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
- **No interpolation below Tier 4.** The server sends positions at 5 Hz; smoothing a Tier-2 blob between snapshots invents a velocity the player was never told. Tier 4 may interpolate, because at Tier 4 heading is known. The player's **own** hulls are not contacts and are drawn gliding between the last two snapshots (§12) — nothing is invented by drawing a hull where it must have been between two positions the player was told in full.
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
sent. The Echo Marks layer is drawn too (#213), over the terrain and under everything the
player earned — the own force as well as the returns — in the same ink the world view uses,
so residue cannot change colour between the two views a player reads the same water in. It
goes under the own force and not merely under the returns because residue is ground and own
force is fact: this instrument's promise is own force at full clarity, and a stain drawn
over a hull dot dulls the one thing on the scope the player has fully earned. Three things the scope settles differently. A stain has a
**floor of 3 px**, because a mark legible in the world and invisible on the scope has not
been drawn, and the opacity it lost to the shrink comes back capped at **0.15 a disc** —
solved from the Tier-1 haze's 0.22 so no residue ever out-inks the faintest return.
**Torpedo wakes keep their line.** A wake dot is sized at a quarter of
`ECHO_MARKS.MERGE_RADIUS_M`, the span inside which two marks of one kind reinforce instead
of accumulating and therefore the closest two distinct wake marks can ever be: half the gap
between them stays open at every zoom, so a run reads as the dotted track it is rather than
the bar a floored stain would smear it into. Where even that dot cannot hold its gap, wakes
are dropped rather than drawn — a scope that smears is worse than one that stays quiet.

### Attention on the scope

The interface epic (#187) asks the scope to *call for the player's attention*, and the
scope may — under the same law as everything else it draws: attention is a return, and a
return is something the server actually sent.

- **The exposure strike lands on the scope too.** §11's screen-edge flash gets a
  scope-space twin: a wedge on the scope's rim at the same bearing, decaying over the same
  two seconds. On the rim and never at a position, because the server sent a bearing and
  nothing else.
- **A hull losing hull is a fact about your own force**, which the snapshot carries in
  full — so the scope pulses at that hull's position when violence lands on it, and the
  contact log records the first blow of an engagement rather than every round of it: a
  hull hit again within ten seconds is the same fight (`PERSISTENCE.UNDER_FIRE_REARM_S`).
  Violence means a gun, ordnance, or fauna — never crush attrition or the shallow bleed,
  which are §8's to draw, and never a hazard, which announces itself. What no cue may
  ever do is point back at the shooter: the hit is yours to know; the firer is still only
  whatever tier your listeners earned.
- **A harvester with nothing to do is a chore, not a threat**, and the scope says so in
  the interface's own ink: a dim breathing marker on the hull while the stall lasts, and
  one log row naming the reason the server actually has — the water is mined out, or no
  yard is left to land the load. A harvester the player *throttled* or parked raises
  nothing, because a chosen quiet is not a stall. Its notice speaks on the ui bus and
  claims no precedence rung: a chore may not duck the water.
- **No player-to-player markers, yet.** There are no allies in the water to signal — and
  when team play exists, a marker is a message, and messages will be server state for §9's
  reason exactly: two clients watching one slot cannot disagree about what was marked.

Every cue here is a server-sent event, never a client inference — a falling hp number
cannot tell a shell from crush attrition. The wedge is the one that needed no new sound:
it is the exposure strike's own mark moved onto the scope, and that strike has been the
loudest thing in the game since §11's flash. The two genuinely new facts — a blow landing
and a harvester stalling — each shipped with their audio half in the same change, because
§1.3 says the ear leads. Under reduced motion the wedge holds, the pulse becomes a steady
ring, and the idle marker stops breathing; each still says what it said.

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
- **The Lid is drawn as what it is** — the ribbon's top 150 m carries a threat-red hatch ([systems-depth.md](systems-depth.md) §2, [world.md](world.md)): sour water, priced for everyone. A selected hull inside it shows its sour state on the card — `SOUR 12s` counting down the grace in amber, then `SOUR — BLEEDING` in threat red once the water starts keeping the hull. The countdown is the player's own timer on their own hull; it reveals nothing about anyone else.
- **Floor-following reads as a mode, not a depth** — a hull under the standing order shows `FOLLOWING FLOOR` on its card and keeps its ribbon marker, because the marker reports where the hull *is* while the mode explains why that keeps changing. Disengaging at the PR edge (§2's rule) flips the card to the PR badge's warning register, so a hull that stopped following says why it stopped.

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
| Right click | Context order — move, attack a contact, or work a field. With a yard and nothing else selected: its rally point, where every hull it launches goes first |
| `Shift` + right click | Queue the order behind the unit's current plan |
| `W`, then click | Attack-move: go there, and stop to fight whatever is met on the way, then carry on. The one order that advances a force into water it cannot hear — which is most of it. `Esc` disarms; `Shift` + click queues it |
| `X` | Stop: drop the plan, the route, the chase and the posture, and stand. A depth order is a commitment and is left alone |
| `H` | Hold position: fire at what comes into range, chase nothing, go nowhere. Any move releases it |
| `1`–`9` | Recall control group; `Ctrl` + digit assigns; `Shift` + digit adds the selection; recall twice to centre |
| `0` | Select the army — every hull that fights, wherever it is |
| Middle drag | Pan |
| Arrows, screen edge | Pan. Edge scrolling is a setting (§14), because a trackpad makes the edge a place the pointer lands by accident |
| Wheel | Zoom about the cursor |
| `Space` | Toggle Silent Running for the selection |
| `P` | Active sonar ping from the first selected unit |
| `D` / `A` | Dive / rise one depth band |
| `S` | Toggle floor-following — hug the seabed at station keeping ([systems-depth.md](systems-depth.md) §2) |
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
| `0`–`9` | Control groups have no alternative route; production has the UNITS tab. `0` is the army |
| Arrows | Pan, with the screen edge; a rebind that took an arrow would take half the camera |
| `Shift` | Queues an order, and adds to a selection |
| `Ctrl` | Subtracts from a selection, and assigns a control group |
| `Esc` | Drops a pending build, and is handled before every other key; with nothing left to drop, it opens the esc menu (§9.5) |

The point is not tidiness. Each of those loses to a *mouse* interaction, so a player who
rebound one would not find a key that stopped working — they would find that clicking had
quietly changed meaning, with nothing to press and notice.

### The one-handed layout

§11 owes a one-handed layout, and the default is not one: `P`, `N`, `M`, `B` and `H` sit under
a right hand that is on the mouse, and `X` is the mine's once `M` has moved. The alternative
layout moves exactly those and leaves the rest alone, because a layout that also shuffles the
keys a player knows is a worse layout.

| Action | Standard | One-handed |
| --- | --- | --- |
| Stop | `X` | `` ` `` — `X` is the mine's in this layout |
| Hold position | `H` | `Tab` |
| Active sonar | `P` | `Q` |
| Harvest throttle | `V` | `E` |
| Noisemaker | `N` | `Z` |
| Mine | `M` | `X` |
| Faction structure | `B` | `V` |

Everything else — `Space`, `W`, `A`, `D`, `S`, `C`, `R`, `F`, `T`, `G` and `Alt` — is unchanged.
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

## 9.5 The Esc Menu

In-match chrome, and the one piece of it that is about the player rather than the water
(#187). It is numbered 9.5 for §10.5's reason exactly: §10 and §11 are cited by number
from other documents, and renumbering them would break those citations to no purpose.

**`Esc` opens it only when `Esc` has nothing left to cancel.** §9 fixes the key as the way
out of a pending thing, handled before every other key, and the menu does not change that:
the first press drops a pending build, the next abandons a live box select, and only a
press with nothing to cancel opens the menu. One key, one meaning — the way out — applied
to the nearest thing that can be gotten out of. Inside the menu the same key steps back the
way it came: controls to settings, settings to the menu, the menu to the water. A player
mashing `Esc` ends up in the water with nothing pending, never somewhere surprising.

**The key is a door, not the door.** A touchscreen has no `Esc`, and this client plays on
one ([SETUP-ANDROID.md](../SETUP-ANDROID.md)) — so the command bar carries a `MENU` button
at its far end, because the bar is how a finger reaches anything at all. Same menu, two
doors, and neither is the menu's name for itself.

**There is no pause.** The simulation is one shared clock on the server
([tech-stack.md](tech-stack.md)), and a menu that stopped it for one commander would have
to stop it for every commander — so the menu does not pretend otherwise. It floats on glass
over a live match, the world still visible and the mix still audible, and it says so on its
face: *the water does not wait*. That is §1.5 read in the other direction — a player who
opens a menu believing the game is paused is paying a cost they were never shown.

**While it is open, the water cannot hear the keyboard.** Every game binding is suspended —
a slider adjusted mid-match must not also ping — and pointer input dies on the menu's own
glass. The fleet is not suspended with it: order queues are server state (§9), so the plan
the player already bought keeps executing while they are in the menu.

The entries:

| Entry | What it does |
| --- | --- |
| **Return to the water** | Closes the menu. Autofocused — the cheapest exit is the default one |
| **Settings** | §14's screen, the same one, opened over the match. Every control applies live: the settings subscription does not care which door a write came through |
| **Controls** | The rebinder (§11), likewise live — a binding you cannot try is a binding you cannot judge |
| **Return to port** | Leaves the match. Armed, never instant — see below |

**Return to port is armed, never instant.** A seat left on purpose is not held (§14,
"Resume"): the token is cleared, and there is no banner to come back to. That is a real
cost, and §1.5 forbids paying it by accident — so the first press arms the entry and names
the cost, the second press leaves, and arming moves focus to **Stay**, so the `Enter` that
armed it cannot also be the `Enter` that leaves. The result screen's own "Return to port"
stays un-armed, because a resolved match has already spent everything the button could
cost.

The menu is DOM, for §10's reasons — a modal dialog, focus moved into it, every entry
reachable by keyboard, and everything under its glass made inert so focus cannot wander
back out onto a live control. And it is available in every phase of the match screen, the
ready room included: until it existed, the ready room had no exit at all except closing
the tab, which is not an exit so much as an evacuation.

Two things outrank it, and both close it. **A lost signal**: the reconnect overlay is
information the player must see, so the menu steps aside and will not open until the
signal returns. **A result**: a match resolving while the menu is up closes it, because an
outcome must be seen the moment it exists. Opened again over the result, the menu drops
the arming from Return to port and stops claiming the water is running — a resolved match
has already spent everything the button could cost, and §1.5 cuts both ways: a confirmation
for a cost that no longer exists is the same lie as no warning for one that does.

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

The `you were pinged` row is implemented (#206, alongside the own-force rows it shares a
shape with): it writes from the server-sent exposure flag at the fidelity sent — a bearing, never a position — under the `---` tier the log
reserves for events that are not detections. The log also carries the own-force rows §5
licenses, in the same form: `Corvette under fire`, `Harvester idle — mined out`, each
focusable because the hull is the player's own. Tier-3 rows currently name the hull and
faction rather than estimating a count, because the Echo Layer does not model counts.

The `MARK` row is implemented (#214), and the one thing it had to settle is that a mark is
not an event. Every other line here has a moment, and `T+` is when it happened; residue is
simply present on the wire, then fainter, then gone. So the log derives the event by
diffing the mark set by id, which fixes two readings on purpose rather than by accident:

- **`T+` on a `MARK` row means "when you first heard it", not "when it happened".** Residue
  a scout swims into is minutes old and logs as new. That is the honest reading — the log
  is a record of what *you* heard, which is the only thing that makes *"when did they hear
  me"* analysis mean anything.
- **A mark is logged once per id per match.** Residue re-enters audibility whenever a hull
  leaves and returns, and a row on every re-entry would turn the log into a proximity meter
  pointed at the player's own movement.

The row names the residue in [systems-echo.md](systems-echo.md) §7's own words — `battle
site`, `destroyed structure`, `industrial hum`, `torpedo wake` — and never who left it,
because §7's first rule is that a mark reports that something happened and never what or to
whom. It focuses like any other row, since the stain's position is already drawn in the
world view and on the scope. It spends the range column on `decaying` rather than a
distance: how far away a stain is says little, while its intensity falling is the reading —
for the hum, that fade is an economy winding down. And it takes the residue layer's dim
ink rather than a rung of the tier ramp, because §5's *past and present must never share an
ink* holds in the log exactly as it does on the scope.

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
| **Hull impact** — a blow on your own plating, once per engagement | **Scope pulse on the hull that was hit** and a log row for the first blow; the world view already carries the health bar |
| **Idle notice** — two soft taps in the interface's voice, on the ui bus | The dim scope marker holding on the stalled harvester, and its log row naming the reason |

Three rows are genuinely *new* information in the mix — the Tier-4 lock tone, the exposure strike, and the hull impact — and each ships with the visual half in the same change. The idle notice is the odd one out in the other direction: the interface speaking rather than the water, and the first sound the ui bus has ever carried. Everything else restates something the renderer already draws. That is the intended ratio.

The exposure strike is the harder of the two, and [audio-direction.md](audio-direction.md) §5 says why: "there is no visual equivalent that arrives sooner." Sooner is not the same as never. The flash arrives *with* the sound rather than before it, on the same bearing and the same two-second decay, and it is drawn in screen space rather than world space on purpose — a world-space marker would sit at a position, which is exactly what the server did not send.

**Mono is a rendering choice, never a loss.** Collapsing every pan to centre costs the convenience of hearing where something is; bearing remains in the contact log and on the sonar scope, so nothing becomes unknowable.

---

## 12. Latency and Feedback

- The client predicts **its own units only** — its own movement, its own SIG, its own detection rings. `packages/shared/src/echo.ts` exists so the client can compute those honestly with the same maths the server uses.
- Own hulls are drawn **interpolated, one Echo interval behind the server**: each glides from its previous reported position to its latest, arriving as the next snapshot is due (`ownMotion.ts`). The conn view and every chart mark about a hull — selection ring, SIG tick, health bar, route — read the same interpolated position, so nothing drifts off the hull it captions. A jump no hull can make in one interval (a mission lift, a respawn) snaps rather than glides. Interpolation rather than extrapolation on purpose: a predicted hull has to be walked back after a stop the client did not see coming, and a hull that reverses is a lie the interpolated one never tells.
- The client **never** extrapolates or interpolates a contact. Not for smoothness, not for feel.
- Detection arrives at 5 Hz and the UI shows that rhythm rather than hiding it. Freshness fade is permitted because it represents decaying confidence; positional smoothing of a contact is not, because it represents knowledge.
- Order feedback is immediate and local while the result is server-confirmed: a right-click paints a contracting ring at the point ordered, and the route line to it, before the server has heard the order; the server's own plan replaces the local one within two snapshots. Input latency is never traded for information honesty — the marker says what was *asked*, and only the snapshot says what the hull is doing.

---

## 12.5 Faction Dress

The interface epic (#187) asks for individual design for each faction, and most of the
answer is already law scattered through this document; this section gathers it so nobody
re-answers it faction by faction.

**The instrument does not change. The hand holding it does.** Layout, meter geometry, tier
encoding, binding defaults and the chrome grammar — cyan tells you, magenta asks you, red
warns you ([style-neon-noir.md](style-neon-noir.md)) — are identical across the four
navies. §7 already says it for one case: no faction reads a different UI. It generalises
because it must. The tier scale survives colour vision deficiency by shape and alpha
before hue (§11), and it survives faction choice the same way — a player who has learned
to read the water on one navy has learned it for all four. Asymmetry belongs in the
simulation, where every faction trait argues sound or depth
([game-identity.md](game-identity.md)); an amber-riveted SIG meter argues neither.

Where faction identity *does* reach the interface, it already has its places:

- **Ink** — each navy's primary, accent and glow ([factions.md](factions.md), transcribed
  into `palette.ts` and re-derived per colour-vision palette), carried by hulls,
  structures and Tier-3+ contacts — never alone: the glyph rides beside it (§11, #207).
  It is drawn from Tier 3 up — at Tier 3 because the mark is otherwise a dot wearing a
  colour, and at Tier 4 because the silhouette a track earns names the *hull class* and
  not the navy: every faction sails the same five shapes, so without the glyph the fill
  colour would be the only thing saying whose it is. Its geometry never moves with the
  colour-vision palette, because shape is what survives one, and it carries a minimum size
  in screen space so a pulled-back camera cannot shrink it back into hue alone.
- **Silhouette** — rectangles and cylinders, leaves and seed-pods, chitin, blades: the
  hull is the faction sprite ([factions.md](factions.md), "Visual identity").
- **Timbre** — the Tier-3 drive signature and the faction voicing of the mix
  ([audio-direction.md](audio-direction.md)).
- **Register** — authored text is spoken in the speaker's own voice, verbatim (§10.5):
  the court says *the flight stays under twenty*, and no template flattens four navies
  into one sentence.

What remains open, and stays open until somebody makes the argument in sound or depth: a
faction accent on the selection card or the command bar's rule line. That is licensed
dress — ink on chrome, never a moved panel or a re-shaped meter — and it is not owed. If
it ships, it ships under this section's law.

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
| Sonar-scope minimap | Implemented — terrain, tier-fidelity returns, Echo Marks under them, sweep, range rings |
| Contact log | Implemented — DOM, live region, click-to-focus, every row including `MARK` (#214) |
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
| The shell — title, browse, setup, briefing, settings, credits | Implemented (§14) |
| Mission runtime and the prologue | Implemented (#190) — one mission when it shipped, thirteen now; the campaign entry is a live door onto the board (#374) rather than the disabled placeholder it was |
| The campaign board | Implemented (#374) — twenty-nine slots in three states, the prologue lane spanning four columns of seven, one tab stop with a roving `tabindex`, and every unbuilt slot `aria-disabled` and announced with its teaching target. The slot titles and teaching lines are transcribed from [campaign.md](campaign.md) §1 and §4–§7; which slots open is read off the shipped mission catalogue rather than written down, so a mission lights its own slot. `played` reads the progression record (#371, [campaign.md](campaign.md) §11) through a lookup the board is handed |
| Objectives panel | Implemented (§10.5) — DOM, `role="status"`, focusable rows, own-force counters only |
| Settings persistence and per-bus volume | Implemented (§14) — `localStorage`, applied at match mount |
| Match browser, private rooms, join by code | Implemented (#193) — a listing names the water and the seat count and nothing else; solo and missions are private |
| Menu music | Implemented (#194) — the port's own bed on the `music` bus, a different piece from the score |
| The esc menu | Implemented (§9.5, #187) — settings and the rebinder open over a live match; leaving is armed |
| Attention on the scope | Implemented (§5, #206, #209) — exposure wedge, under-fire pulse, idle marker, each with its audio half and its reduced-motion equivalent |
| Faction glyphs | Implemented (§12.5, #207) — one glyph per navy beside the mark's ink at Tier 3 and Tier 4, in the world view; the scope names no faction, so it owes none |
| The match clock | Implemented (#208) — the log's T+ axis live in the top strip, from the server tick both share |
| Own-force log rows | Implemented (§10, #206, #209) — `you were pinged`, `under fire`, `idle — mined out` |
| The log's `MARK` row | Implemented (§10, #214) — residue derived by diffing the mark set by id, once per mark per match |
| Priced buttons, and the reason a greyed one gives | Implemented (#351) — a button carries its whole price from the sum the server charges (`SUB 260+80c`), greys when any account falls short, and a press on it says which — *Abyssal Submersible: 80 crystal short* — on the hint bar, the way a locked key does (§7). Biomass is the third column ([economy.md](economy.md) §8); nothing is priced in it yet |

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
title ──▶ setup (solo) ────────────────▶ match (in-room lobby ▶ playing ▶ result)
  │  ▲                                       │
  │  ├── browse ──▶ setup (host) ────────────┤   └── "Return to port" ▶ title
  │  │       └──── join a listing, or a code ┤
  │  ├── settings · credits · controls ── back
  │  ├── campaign ──▶ briefing ─────────▶ mission (playing ▶ result)
  │  │       └─────▶ record ◀───────────────────────────────┘ "The record"
  │  ├── tutorial ──▶ briefing ─────────▶ mission (playing ▶ result)
  └── resume banner ────────────────────▶ match (seat resumed)
```

One more door exists mid-match and is deliberately absent from the chart: the esc menu
(§9.5) opens Settings and Controls over a live match — the same screens, on the water's
glass rather than the port's void, and without leaving the room.

`briefing` sits on two lines for the reason `setup` does: one screen, two doors into it.
Tutorial opens it on the prologue directly, and the campaign board opens it on whichever
slot was activated. On the prologue's own slot those are the same content behind two doors,
because a separate tutorial would be a second first mission ([campaign.md](campaign.md) §3,
§10).

The screen state is a plain discriminated union in `App.tsx` — no router, no history
integration. Browser back mid-match would mean "leave the match" as an accident, and §1.5
forbids exactly that class of accident. Two deep links exist and both are kept: `?map=<id>`
boots straight into a match, and `?mission=<id>` boots straight into a mission the same way,
past the briefing. That is what keeps the headless harness and dev muscle memory working,
and it is a machine's door rather than a player's — a player reaches a mission through the
title screen, and reads the briefing on the way in.

- **Title** — the vertical logo lockup from [naming.md](naming.md) (mark, wordmark, one
  tagline), and the entries:
  Resume (only while a seat is held, see below), Campaign, Solo Game, Multiplayer,
  Tutorial, Settings, Credits. There is no Quit; this is a browser.
- **Campaign** — the board of four campaigns and their slots. A board rather than a list
  because the order is free after the prologue ([campaign.md](campaign.md) §1): a list
  would assert a sequence the campaign refuses to have, and mission ids are namespaced by
  campaign precisely so that nothing implies a mission 2. It is the one screen in the port
  that renders progression, and both halves of that now exist: the record
  ([campaign.md](campaign.md) §11) and the screen that reads it (#374). Specified in full
  there. Beside the board is **the chart** — Plate VII, with every slot drawn on the ground
  its mission is played on — and under the board is the door to **the record**, the setting
  read between missions; both are specified below.
- **Setup** — shared by Solo and hosting: a commander-name field and one card per map
  archetype (name, doctrine line, seats), from the shared catalogue. Faction choice and AI
  opponents stay in the in-room ready room, because faction uniqueness is enforced by the
  room and a pick is a request the room may refuse ([tech-stack.md](tech-stack.md)) — the
  shell does not promise what the server may deny. Hosting adds one control the solo path
  does not have: whether the room is **listed or private**. Solo has no such choice, because
  a solo game is always private (see below).
- **Browse** — the multiplayer door. Open rooms, a field for a room code, and a button to
  host one. A row says **the water and the seat count, and nothing else**: not who is in
  there, not which navies they hold, not their names
  ([tech-stack.md](tech-stack.md), "Finding a match"). Quick match is still there and still
  the fastest way in — picking a map is picking a queue — but it is now one of three doors
  rather than the only one. Rooms that have started are absent rather than greyed out,
  because a started room is not a thing you can ask to join.
- **Briefing** — a mission's own setup: its name, its premise, and the briefing text read
  verbatim in the register of whoever is speaking it
  ([mission-sorrowgate.md](mission-sorrowgate.md) §12). It is a screen and not an overlay on
  the match, because the match opens a socket and a simulation and a briefing has no
  business holding either. The shell does hold an audio context of its own now (#194), but
  it is the shell's and it is released on the way in — the briefing is still in the port,
  and it still sounds like it. It commits with the same "Descend" the setup screen uses. The
  screen names **who is reading it, and in which register** — the court for the prologue,
  the faction's own word for itself everywhere else — see "Who is speaking" below.
- **Settings** — see below.
- **Credits** — static, and honest: the technology roll from
  [tech-stack.md](tech-stack.md) and a note that every sound is synthesised. No invented
  names.

**Disabled entries are visible, with the reason attached.** Tutorial is no longer one of
them: it launches the prologue, *Sorrowgate*
([mission-sorrowgate.md](mission-sorrowgate.md)), which is the same content the campaign's
first slot will launch — one mission behind two doors, because a separate tutorial would be
a second first mission teaching the same four systems ([campaign.md](campaign.md) §10).
Campaign is no longer one of them either, and this screen now has none. Dimming it was
always a statement about the build rather than about the game — it waited first on a
mission runtime and then on the missions themselves — and neither is what a *board* waits
on. The board exists, so Campaign is a live entry onto it, and the twenty-eight doors that
do not open say so on their own faces below. That is the same rule doing the same work one
screen further in, where the reasons are specific instead of one line covering
twenty-eight. Its note line is [campaign.md](campaign.md)'s own subtitle, `Four wars, one
question`, because a note that counted what was finished would be a number to maintain in
two places. The shape of the finished game is still on screen; a menu that hid its missing
rooms would still misrepresent the build.

### The campaign board

**The shape is [campaign.md](campaign.md) §1's table, rendered rather than restated.** One
prologue lane across the top, and four columns of seven beneath it — *The Ledger*, *The
Second Seeding*, *The Attending*, *The Second Chord*. Twenty-nine slots, which is the count
that document gives. Slots inside a column carry the numbers §4–§7 give them, 1 to 7; the
columns carry no number against each other, because nothing orders them.

The prologue is one slot spanning the four rather than a first slot repeated in each,
because that is what it is: §1 lists it as a part of the campaign in its own right, and §3
has the title screen's Tutorial entry and the campaign's first slot launching the same
content. Drawing it four times would draw a mission that does not exist three times.

A column head names its campaign, carries its commander line from §4–§7, and takes its
navy's ink and glyph. That is the licensed dress of §12.5 — ink on chrome, on a screen that
is not the instrument — and it is the only place a faction colour appears here. The slots
themselves stay cyan and magenta, or the board becomes four boards.

**What a slot shows** is its number, its mission title, and one line. The line is quoted
from material that already exists — the teaching target from §4–§7 for a slot that cannot
be opened, the mission's own premise for one that can — and is never written for the board.
Missions introduce themselves in the voice of whoever is speaking ([campaign.md](campaign.md)
§10, "Briefings are in-register"), so a board that summarised twenty-nine of them in one
template voice would flatten the thing the briefing exists to protect.

#### The three states a slot can be in

| State | When a slot is in it | Treatment |
| --- | --- | --- |
| **Available** | the mission exists and the runtime can launch it | Full ink, magenta bevel, magenta halo on hover and focus — it is asking |
| **Played** | available, and the record says this mission has been finished | Available's treatment, plus one cyan registration tick in the corner. Cyan tells you; a played mission stays playable, so it keeps the ask as well |
| **Unbuilt** | there is no mission behind the door | Desaturated and dimmed to 40% per the disabled rule in [style-neon-noir.md](style-neon-noir.md) — a dead console still has phosphor in it — with the reason attached |

**Three states, not four.** A slot with a document of record and no mission definition, and
a slot that is still a title, a teaching target and a beat, are the same object to a player:
a door that does not open. (Which of the twenty-eight are which is
[campaign.md](campaign.md) §11's count to keep, not this section's to copy.) The difference
between them is a fact about this repository, and §13 is where facts about this repository
go. Putting
the build's filing system on a player's screen would be the confusion this game's
[CLAUDE.md](../CLAUDE.md) target emotion rules out — dread is partial information you can
reason about, and *specified but unbuilt* is not something a player can do anything with.

**The reason line has to be true**, which is the same rule the title screen's Campaign entry
already obeys with `Awaits the faction campaigns`. On a board where twenty-eight of
twenty-nine slots are unbuilt, the reason lines are most of the text on screen, so each is
the mission's own teaching target rather than one sentence repeated twenty-eight times. A
board that said `Not yet built` twenty-eight times would read as a loading screen for a game
that is not loading.

**Dimmed is not unreachable, and this is where the board differs from the title screen.**
The title screen carries its one disabled entry on a DOM `disabled` button, which is
survivable there because five live entries surround it. A board cannot: `disabled` takes an
element out of the tab order and out of most of what a screen reader will let a user do with
it, so twenty-eight of twenty-nine slots would vanish for exactly the players §10 and §11
put this whole shell in the DOM for. **On the board a slot is `aria-disabled="true"` and
never `disabled`** — focusable, announced with its reason, inert on activation. "Visible with
the reason attached" has to mean audible too, or the rule only serves the people who can see
the phosphor.

**No new motion.** The board inherits the port's chrome and adds nothing to it. Twenty-nine
cards each carrying a halo is precisely the bloom-everything failure mode
[style-neon-noir.md](style-neon-noir.md) names, so the halo belongs to hover and focus, one
slot at a time. Nothing on this screen needs a reduced-motion equivalent, because nothing on
it moves.

#### What commits, and what comes back

Activating an available slot commits to the **briefing**, never to a match. §14 above is
explicit that a player reaches a mission through the briefing and that `?mission=` skipping
it is a machine's door; the board is one more door of the player's kind, so it opens onto the
same screen. *Descend* is the briefing's word and stays there.

The briefing returns to whatever opened it — the title screen when Tutorial did, the board
when the board did. That is one field on the `briefing` arm of the union in `App.tsx`, not
history: the no-router rule holds, and browser back is still not a door.

#### What the board reads, and what it must not decide

Two of the three states are static. `available` and `unbuilt` are properties of what has
shipped, and the board can settle both from the mission catalogue the shell already holds.
`played` is not: it is the only thing on this screen that is a fact about the player, and
**the record it reads now exists** ([campaign.md](campaign.md) §11).

So the board **consumes** a progression record it does not define, and that record was
designed to the shape specified here rather than the other way round. Where it lives was not
this screen's ruling and was settled by the progression work: a third `localStorage` key,
`echoes.progression`, beside the settings the commander name persists in and apart from the
reconnection token, which stays per-tab because a seat is neither a preference nor a memory.
The board asks it one question — has this mission ever been finished — and any of the three
readings answers yes, because all three of them happened.

The record also answers the second question the board has, which is which slots may be
opened at all: §1's unlock rule is one rung, the prologue, and after it nothing is locked. A
slot that is `unbuilt` is refused by not having a mission behind it, never by being locked,
so the two are independent and the board never has to render a fourth state.

The board now renders all twenty-nine slots against a mission that exists. For a while it
rendered twenty-eight, with the twenty-ninth — *Standing Wave*, the Order's second — against
nothing, which was the state the `unbuilt` rendering was written for and had never actually
been asked to show mixed in among live ones. What that proved is the thing worth having: the
dimming is a property of the slot rather than of the board's emptiness, so a campaign column
with one hole in the middle of it reads correctly without a fourth state — and when the hole
closed (#382) the slot lit itself off the catalogue, with nothing on this screen touched.

#### Keyboard

The board is two-dimensional, so its traversal is: **one tab stop for the whole board**, with
a roving `tabindex` inside it. Left and Right move between columns, Up and Down between slots
in a column, Home and End to the ends of one. A column head is not a stop — it names a
campaign, it does not open one. Tab leaves the board for the back control rather than walking
twenty-nine slots to reach it, which is the reason the board is one stop and not twenty-nine.

Entering the board lands on the first available slot — the prologue, today — because the
first thing a keyboard reaches should be a door that opens. Every other slot is still
reachable with an arrow key and still announces why it will not.

#### The chart

**The board sits beside Plate VII** ([world-map.md](world-map.md), the chart that document
calls the canonical map of the setting), and every one of the twenty-nine slots is drawn on
it as a mark, on the ground its mission is played on. The table says which mission; the chart
says **where in the Rift, how deep, and in whose water**, which is what a player choosing a
mission had no way to know — the board was built from campaign and ordinal alone, and none of
the bible's geography reached it.

What is drawn is the plate's anatomy, transcribed from its own paths rather than redrawn to
resemble it: the Lid hatched across the top, the valley's five contours narrowing from the
shallow north to the Mouth, the thermocline at 1,200 m as a dashed contour, the old transit
line through the drowned city, the Mouth's rings, and the plate's depth rail down the right
margin with its own ticks. The plate's survey text is *not* transcribed — at a board's scale
it would be noise — so the chart carries the six region names and nothing else, and reads the
ground of the lit slot in DOM text under it at a reading size: the place, the depth, and whose
water, as *Sorrowgate, the drowned city · 1,500 m · nobody's water — all four deny using it*.
The place, its depth and its water are all [world-map.md](world-map.md) §3's — the depth is
the *place's*, the reading a player would give the ground, and not the map's base floor from
the mission document's §11, which differs on eight grounds and is what the mission is played
over rather than what the chart names (#422; `riftChart.test.ts` holds every row to §3). A mission on a ground the chart does not know fails a
test rather than drawing nowhere.

**Whose water and whose mission are two facts, and the chart keeps them apart.** A region is
labelled in the ink of the navy whose water it is, as the plate does — faction accents only
where the world itself is that faction's — and a mark is inked in its **campaign's** navy,
the same ink as its column head. A Directorate slot on the Kell Shoulder is a red mark on the
plateaus' country, which is that mission in one glance; the prologue's mark is chrome, because
the court is nobody's. Five missions share the Rim and two share Marr Plateau, so marks on one
ground are fanned in a small ring around it rather than drawn on top of one another. Inks are
`FACTION_PALETTE`'s glow, read at render so the colour-vision palettes apply; every other
stroke is chrome from the tokens. No new hexes. The chart's language is
[art-direction.md](art-direction.md)'s Pressure Cartography, because it *is* the plate.

**One mark is lit at a time** — the hovered slot, else the focused one — with a halo in its
ink and a tick on the depth rail at its depth, so the keyboard and the mouse read the same
chart and the pointer's last position never pins it. Pressing a mark moves the board's focus
to its slot; it does not open anything, because the chart is a reading of the board and not a
second board. The halo belongs to the one lit mark for the reason the slot halo belongs to one
slot, and nothing else on the chart moves.

**The chart is decorative to a screen reader, and loses nothing by it.** Every fact on it is
also in the slot's accessible name, after the state: *Available · The Kell Shoulder · 340 m ·
the plateaus' water*. Hiding two hundred SVG paths costs nobody a fact; announcing them would
gain nobody one. Below the width the chart and four readable columns need, the chart goes
above the board rather than beside it and stops holding its place, so it never covers the
slots it is meant to sit beside.

Review screenshots live in `docs/screenshots/issue-410/`: the board with the chart beside it,
and the chart lit on the Kell Shoulder and on the Rim.

### Who is speaking

The briefing names its reader. About 28,000 words of authored prose ship across the campaign's
briefings, readings and lines, every one in-register ([campaign.md](campaign.md) §10), and
until #410 the briefing screen rendered the text under a fixed heading with no attribution at
all — so a player never learned whose voice the prologue is in, though
[characters.md](characters.md) says Halloran is heard at length exactly once, there.

**The header of the briefing carries two things**: the register, in the faction's own word for
itself — *the concern*, *the plateaus*, *the cohorts*, *the Order*, *the court*
([culture.md](culture.md) §3) — and the reading's attribution, quoted from the mission
document's §12: *Read into the record by Arbiter Mosk Halloran, 214 PC*; *Tidespeaker Ysolde
Marr, at dawn tide*; *The recovery writ, read to the column. Signed for the Ninth Board*. It is
the same hail [audio-direction.md](audio-direction.md) §13 gives the `say` channel, on the
screen instead of the bus: the register first, then whose. A writ signed for the Board has no
single reader and is attributed to the concern, exactly as an unnamed `say` line is the
register's chorus.

The register takes its navy's ink and glyph, which is §12.5's licensed dress on a screen that
is not the instrument; the court has no navy and takes chrome, because it is the one voice in
the Rift that is not heard through water. The "already seen" variant is attributed identically
and stays unmarked, as [campaign.md](campaign.md) §1 requires: the reader does not change with
what the player has already witnessed, only the reading.

**Both facts are on the public header, never on the room.** `MissionHeader.speaker` is a
`MissionSpeaker` and `spokenBy` the quoted line; the register is derived, and the shared test
holds every briefing's speaker to its campaign's register — the court for the prologue, and
Halloran nowhere else. A fact about authored text the player is about to read discloses
nothing about the water.

Review screenshots: `docs/screenshots/issue-410/` has the prologue's briefing in the court's
register and *Tend*'s in the plateaus'.

### The record

**A surface in the fifth register, between missions.** The bible answers every question the
world asks — why humanity is underwater, why nobody goes back, where the Rift is and who holds
it — and none of it reached the player: the campaign's text, by design, uses only the
registers' self-descriptions, so a campaign player is never told there are four powers or what
they are called, and *the Sounding*, *Halvard*, *Sector Kell*, *the Salinity Collapse* and *the
Lid* had zero occurrences in player-facing text. The record is where those words are said.

It is read in the court's voice ([culture.md](culture.md) §3), the one register built to
describe a room without joining it: third person, perfect tense, named parties at stated times,
the count read aloud and left to sit. That register is what makes the surface possible without
breaking [campaign.md](campaign.md) §2 rule 3. **This is not a codex.** The Mouth is on the
record as it is in [timeline.md](timeline.md)'s anomaly log — a cycle measured at forty-three
hours and then thirty-nine, a reply that came forty-one seconds early, thirty-six years of text
nobody can read — and no line on it says what the Mouth is. The court enters what was filed
and does not say what it means; it does not say who was right, because the court never does.
Every line was held to §6's register test, and the test is also the constraint list: the
surface is *before*, not *above* (nothing on any page wants the water to clear); every fact
is public canon from [world.md](world.md) and [timeline.md](timeline.md), never match state.

**One page per era of [timeline.md](timeline.md)** — the Surface Age, Year 0, the Descent, the
Settlement, the Long Arrangement, the Present Crisis — **entered as the campaign is played.**
The record derives what it reads from the progression record and stores nothing of its own:

| Page | Entered when |
| --- | --- |
| The Surface Age · Year 0 · The Descent | the prologue has been finished — the drowned city is the Surface Age's, and the player has stood in it |
| The Settlement | one mission of any faction campaign has been finished — the player has been one of the four powers |
| The Long Arrangement | missions in two campaigns have been finished — parity was four powers each able to hear the other, and the player has stood on two sides |
| The Present Crisis | any mission on the Rim has been finished — 214 PC is the rim week |

The pages need not be entered in order. A Ledger player who reaches the rim has the Present
Crisis and not the Long Arrangement, and the gap is shown rather than closed: a page not yet
entered keeps the disabled rule the board keeps — dimmed to 40%, never removed, its condition
attached in the register (*Not yet entered. Entered when a second party has appeared — missions
finished in two campaigns.*). The count is read at the top: *Six pages. Three entered.*

**Two doors in, one door out.** The record is reached from the board's footer and from a
mission's result screen, beside *Return to port*; Back returns to the board either way,
because the board is where the next mission is chosen and the record is what sits between two
of them. The result screen it may have come from is gone with the room by then, and the title
is not where a player between missions is. No new storage key, no new state on the union
beyond the screen itself.

Review screenshots: `docs/screenshots/issue-410/` has the record read to a history of three
missions, with the Long Arrangement withheld and its reason attached.

### Rooms, and who may see them

A room is listed unless it says otherwise, and two kinds always say otherwise. **A solo game
is private** — until this shipped it used the same matchmaking multiplayer did, so choosing
Solo could drop you into a stranger's lobby and a stranger into yours. **A mission is
private** for the same structural reason: it seats one commander and writes its own
opposition. Neither offers a toggle, because neither has a question to ask.

The host's room code is shown in the ready room, and only there: it is the one piece of a
private room worth handing to somebody, and the ready room is where the host is standing
when they want to.

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
| Music · World · Self · Speech · UI | 0 dB max | Per-bus trims ([audio-direction.md](audio-direction.md) §11 — independent buses; Speech is the voice in the water, §13) |
| Contacts | up to **+12 dB** | The one boostable bus, per the same section; the boost trades headroom for audibility and is capped so the true-peak target survives |
| Mono audio | toggle | The mix's existing mono spatialisation — a rendering choice, never a loss (§11) |
| Visual-first | toggle | Removes the §1.3 fade-in delay so marks arrive at ≤ 30 ms (§11) |
| Colour vision | standard · deuteranopia · protanopia · tritanopia | The four palettes in [style-neon-noir.md](style-neon-noir.md); tier *shape* never moves, only its ink (§11) |
| UI scale | 75–200% | A transform on the HUD layer and the DOM panels, never on the world (§11) |
| Reduced motion | toggle | Static equivalents for the scope sweep, the exposure flash and the crush badge — same information, no movement (§11) |
| Edge scrolling | toggle | The camera pans while the pointer rests on an edge of the water (§9). On by default; off for the trackpad player whose pointer lands there by accident. The arrows and the middle button pan either way |

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
- **[campaign.md](campaign.md)** — the twenty-nine missions §14's board is a rendering of
- **[tech-stack.md](tech-stack.md)** — why the client is allowed so little
