# In-match interface — three directions

Ten frames of one moment, comparing three ways to lay out the HUD a player holds
during a mission. It is concept art and a decision aid, not a specification:
[ui-ux.md](../../ui-ux.md) stays the source of every rule cited below, and nothing here
changes one until a direction is chosen and that document is edited to say so.

The live canvas is where these are meant to be read — the artboards pan and zoom
together, and each row carries its argument as a note beside it. The `.dc.html` files in
`artboards/` are that canvas's source; `build.mjs` emits them.

## What is being compared, and what is held still

Every frame draws the same water: the same seabed, the same fleet, the same four contacts
at Tier 1, 2, 3 and 4, the same residue, the same acoustic veil. Only the chrome changes,
because a comparison whose frames disagree about the scene is not one.

Every colour, font, measurement and price is transcribed from `packages/frontend` —
`palette.ts`, `index.css`, and the geometry constants at the head of `EchoRenderer.ts`.
No ink here is invented, so a direction that ships is a layout change rather than a
repaint.

| Row | Frames | Status |
| --- | --- | --- |
| **Today** | The baseline: what the client draws now, transcribed rather than flattered | Reference |
| **B · Console** | At rest · giving orders · production | **Chosen**, and the one still being iterated |
| **A · Ring** | At rest · giving orders · production | Not chosen |
| **C · Improved** | At rest · giving orders · production | Not chosen |

The two unchosen directions are kept rather than deleted. A decision nobody wrote down is
a decision somebody re-argues, and these frames plus their law-breaks are the whole record
of why the console won. On the canvas they sit on a second page so the working view carries
only the chosen direction and its baseline.

## The four faults the directions answer

Named by the repository owner, and reproduced in the baseline frame so they can be
pointed at rather than argued about.

1. **No material.** The in-match panels are hairline boxes on near-black. The plate VI
   card anatomy in [style-neon-noir.md](../../style-neon-noir.md) — glass at 82–90%, one
   magenta bevel with one halo, a cyan header band over a thin rule, corner registration
   ticks instead of a radius, one diagonal grain across the whole HUD layer — is
   implemented in the shell and essentially absent from the match screen.
2. **No hierarchy.** `SIG 40` carries the weight of `NODULES 600`, and ten identical
   rectangles sit in a row with nothing saying which matters now.
3. **Production is buried.** Building anything means finding the UNITS tab, and nothing
   on screen says a yard is running, what it is making, or how long it has left.
4. **The card and the hint line share one strip.** At 1080p they clear each other by a
   few pixels; at 1440 × 900, or at any raised UI scale, the card lands on the hint's
   tail. The repo's own HUD capture shows `A rise` underneath the card.

A fifth, and the one that reshaped the work: the result **looks underwhelming**. Faults 1
and 2 are most of that diagnosis, and the directions are judged on it as much as on
layout.

## A · The ring

Not chosen, and kept as the record of why. Right-hold, or long-press on glass, and a ring
of what the current selection can do opens at the pointer. Release on a wedge commits; release on the dead centre cancels. There is
no command bar at all.

**Keeps.** §3 — own loudness never leaves the screen. §6 — preview before commit, and the
orders frame shows why the fit is good: the ping wedge under the pointer draws both radii
on the water, which is a stronger guarantee than a button that has to be hovered. §11 — a
45° wedge is about 91 px of arc at the label radius, twice the 44 px touch floor, so one
gesture serves a mouse and a finger with no mode switch.

**Breaks §2** — *the centre 60% is always clear*. The ring opens in it.

**What the break buys.** Chrome at rest falls from about 22% of the frame to about 11%,
and the centre is clear the whole time nobody is giving an order. The argument is that §2
was written against resident chrome, and a ring that exists only while a button is held is
a different kind of object.

**Costs.** Eight wedges is the ceiling, so a twelve-command set has to nest or shed. A
ring cannot hold a production queue, so yards still need somewhere to live. And nothing is
visible to learn from until the player already knows to hold the button.

## B · The classical console

**Chosen direction.** One full-width console in fixed blocks: scope, selection, fleet,
a 4 × 3 command card, the production line. Nothing is behind a tab, and the twelve command
cells are always in the same twelve places.

**Keeps.** Every information law untouched. Faction ink stays on hulls and contacts and
never reaches chrome (§12.5); the fleet census counts own force only and never a hostile
total (§10.5).

**Breaks §2's 22% chrome cap** — the console alone is 19.3% of a 1080p frame, and with the
top strip, the log, the objectives panel and the ribbon the whole interface comes to about
30%.

**What the break buys.** Permanence, which is the genre's oldest argument and still its
best one. The fleet block makes a group countable at a glance, the production block makes
every build line readable without selecting anything, and a command card is the one layout
muscle memory genuinely works on, because a cell never moves.

**Costs.** It is the worst fit for a phone, where the blocks have to stack or scroll, and
it gives close to a fifth of a dark ocean to instrumentation.

### Iteration 2 — earning the footprint

The first pass took 236 px and filled much of it with air: a roster of fifteen cells that
was empty whenever nothing was selected, a command card drawing five to seven ghost boxes,
a 528 px production block carrying two thin bars, and a portrait box with a small wireframe
floating in it. A console that takes a fifth of the ocean and then shows nothing in the
space loses both arguments at once.

| | Before | After |
| --- | --- | --- |
| Console height | 236 px | 208 px |
| Console share of frame | 21.9% | 19.3% |
| Whole interface | 32.5% | 29.9% |

Three changes, in the order they matter.

1. **The footprint came down**, and every internal metric with it — block padding 7 → 6,
   cell gaps 5 → 4, headers 25 → 22. That is 28 px of water back at no cost to content.
2. **Every block is full in every state.** The roster became a **fleet** block showing the
   control groups, the selected hulls, and a census of what the player owns, so it is never
   a grid of empty squares. Production lists one row per **yard**, each being one build line, and carries a summary
   row under them: berths, Thermal Draw, and where a new hull goes when it launches. The
   selection block trades its empty portrait surround for a six-cell stat grid.
3. **A cell carries three facts, not one.** Every command cell has its hotkey, its label
   and a second line — a price, a state, or what the order does. Genuinely unassigned
   positions keep their place, because muscle memory is the whole argument for a fixed
   card, but they are drawn as registration ticks rather than as boxes: a reserved slot
   should not read as a missing one.

### Iteration 3 — a finger has to be able to use it

The control groups were a list of 15 px rows. On glass that is not a control at all: §11
puts the floor at 44 px, and §9 makes the digits unrebindable — so on a touchscreen, which
has no digits, that row is the *only* way to recall a group. It was the one place the
console had quietly stopped being the single layout that serves a mouse and a finger
equally.

Four 44 px rows do not fit in a 170 px block, so the groups stopped being rows: they are
square chips laid across the width, which is both denser and reachable. Every horizontal
band in the fleet block is now a 44 px touch row, and so is every production line, because
a line row selects the yard running it.

The idle notice changed character in the process. It was a clause in a status line; it is
now the 44 px control you press to go to the stalled harvester, paired with the `I` key on
the command card. The status line it came from is gone: `TRACKED` is already in the top
strip and silence is already the `S` on each chip, so it was restating rather than saying.

Verified by measurement rather than by eye — every bordered control in the console is at
least 44 px on its short edge in all three frames. The one element under it is a health
bar, which is a readout and not something to press.

**Not done, and deliberately:** folding the 54 px top strip into the console. It would give
back the most screen of anything left, but §3 wants own loudness permanently visible and
the console's five blocks are now dense enough that the strip would be competing rather
than fitting.

## C · Improved

Not chosen, and kept as the record of why. Same topology as today: strip, ribbon, scope,
log, panel, bar. Nothing has moved, so anyone who knows the client already knows this. Four
changes, one per fault.

- **Material.** The plate VI card implemented rather than paraphrased.
- **Hierarchy.** §3's meter at the size §3 specifies, with the zero-padded readout, the
  hard colour stops, the transient spike as a lighter overlay, and the `3 units · 1 loud`
  line the shipped strip never grew. Stockpiles shrink to pay for it, because loudness is
  what kills you and the nodule count is bookkeeping.
- **Production in the open.** A yard strip above the bar — one row per line, what it is
  making, how long it has left, what is queued behind — on screen whatever tab is open.
  The UNITS tab stops being where production hides and becomes only where it starts.
- **Orders grouped by cost.** Posture toggles carry their state as light. Dive and rise
  become one control that names the rung between them. Ordnance is priced. The ping is
  pulled out alone in threat red, because §6 calls it the one interaction the UI may be
  pushy about and §1.5 forbids paying its cost by accident.

The card moves into the bar, which is all it takes to fix the collision.

**Breaks §2's 22% cap** — strip, yard strip and bar come to about 24%. The yard strip is
what costs it, and it is the only one of the four changes that spends screen at all.

Everything else in this direction is spec the client already owes and has not paid: §3's
meter, the plate VI card, and §13's priced buttons with the reason a greyed one gives.

## Rebuilding the artboards

```bash
node docs/concept-art/hud-mockups/build.mjs
```

Writes the ten `.dc.html` files and `canvas.json` into `artboards/`. Not a gate, and never
will be — a mockup is an argument, and what settles an argument about this interface is
[ui-ux.md](../../ui-ux.md) and a person looking at the frames. What the script buys is
that all ten draw the same water from the same tokens.

Related: [ui-ux.md](../../ui-ux.md) · [style-neon-noir.md](../../style-neon-noir.md) ·
[art-direction.md](../../art-direction.md) · [graphics-standards.md](../../graphics-standards.md)
