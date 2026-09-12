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

| Row | Frames |
| --- | --- |
| **Today** | The baseline: what the client draws now, transcribed rather than flattered |
| **A · Ring** | At rest · giving orders · production |
| **B · Console** | At rest · giving orders · production |
| **C · Improved** | At rest · giving orders · production |

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

Right-hold, or long-press on glass, and a ring of what the current selection can do opens
at the pointer. Release on a wedge commits; release on the dead centre cancels. There is
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

One full-width console in fixed blocks: scope, selection with its stat block, group
roster, a 4 × 3 command card, the production line. Nothing is behind a tab, and the twelve
cells are always in the same twelve places.

**Keeps.** Every information law untouched. Faction ink stays on hulls and contacts and
never reaches chrome (§12.5); the roster counts own force only and never a hostile total
(§10.5).

**Breaks §2's 22% chrome cap** — the console plus the strip is about 30% of a 1080p frame.

**What the break buys.** Permanence, which is the genre's oldest argument and still its
best one. The roster makes a group countable at a glance, the production block makes a
queue readable without selecting anything, and a command card is the one layout muscle
memory genuinely works on, because a cell never moves.

**Costs.** It is the least interesting of the three to look at, the worst fit for a phone,
and it gives a fifth of a dark ocean away to instrumentation.

## C · Improved — the leading candidate

Same topology as today: strip, ribbon, scope, log, panel, bar. Nothing has moved, so
anyone who knows the client already knows this. Four changes, one per fault.

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
