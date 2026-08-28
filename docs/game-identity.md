# Echoes of the Abyss — Game Identity

## Genre

Real-time strategy (RTS) set in a deep-sea dystopian world.

## Core Fantasy

Command powerful underwater factions fighting for survival in the Pelagion Rift — in a game where you cannot see, only listen, and every action you take tells the enemy where you are.

## High-Level Pitch

Echoes of the Abyss is a browser-native RTS with no line-of-sight fog of war. Instead, every unit emits an Acoustic Signature and listens passively for everyone else's — detection is graded across five resolution tiers, from "something is out there" to a full track. Four factions battle across geothermal vents, kelp forests, abyssal trenches, and resonance fields, and each is a different answer to the same problem: noise.

Everything in the design descends from two systems:

1. **[The Echo Layer](systems-echo.md)** — acoustic fog of war. Active sonar reveals everything within 900 m, and reveals *you* to everything within 2,400 m.
2. **[Depth](systems-depth.md)** — the axis of commitment. Value increases with depth; so does the cost of being there.

## Match Structure

The skeleton is the classic RTS loop — Command & Conquer with submarines. Every match runs
the same four beats, each one filtered through the Echo Layer:

1. **Harvest** — send harvesters to nodule fields and haul cargo home. Mining is loud, and
   its loudness follows the throttle you set ([economy.md](economy.md) §3): income is a
   continuous broadcast you choose the volume of.
2. **Build** — commission structures near your base. Construction sites broadcast at full
   volume for their whole build time, and a finished refinery never stops humming
   ([economy.md](economy.md) §4). Expanding your base expands your signature.
3. **Produce** — queue units at the Foundry, harvesters at the Bastion. A running
   production line is audibly running.
4. **Destroy** — the win condition is the oldest one in the genre: kill the enemy
   **Bastion**. Losing yours is elimination. There is exactly one per player and it cannot
   be rebuilt, so the whole match is a conversation about where it is and who has heard it.
   That is the rule for a *match*: a campaign mission ([campaign.md](campaign.md)) concludes
   on its own authored terms — a count read into the record, water reached — and does not go
   through the Bastion rule at all. A commander can also leave a match without their Bastion
   falling, by scuttling — see below.

### Scuttling — the other way a commander leaves

A Bastion is the stake, and killing one is how a match is *meant* to end. But a commander
can be finished long before the last Bastion falls: the harvesters are gone, the bank is
empty, nothing is on the slipway, and somewhere else on the map a rival's mining is still
audible. Attrition from there is one-way. Every hull they still hold is the last one they
will ever have, and a Bastion is 5,000 HP behind a fleet that replaces its losses.

The Abyss does not do last stands. A crew in that position **scuttles**: the commander is
eliminated exactly as a lost Bastion eliminates them, and the match goes on without them.

The test is acoustic, because economy in this game *is* noise ([economy.md](economy.md) §3).
A commander scuttles when, continuously for 60 seconds of match time, all of the following
hold:

- **Nothing in the water** — not one harvester left alive. The mining loop is gone, not
  merely quiet: a commander running on Trickle or Idle is making a choice, and a choice is
  never a concession.
- **Nothing on the slipway** — no hull in any production queue, and no construction site
  rising.
- **No way back into one** — not the price of a harvester in the bank. The bar is a
  harvester and not the cheapest hull on the list, because the question is whether they can
  mine again, not whether they can afford one more scout. A commander who can still buy a
  harvester has a move, and the rule leaves them to make it.
- **Nothing coming in** — no stockpile of theirs rose at all during the window. This is what
  keeps the rule honest for the Knights, whose tithe ([economy.md](economy.md) §6) pays them
  for existing: the Order's floor is income, so a Knight with a Bastion still standing does
  not scuttle. It is the one economy that cannot be taken off the map.
- **Somebody else has the guns and the money** — at least one other commander still standing
  banked something during the window *and* fields at least as many armed hulls. This is the
  clause that makes the position unwinnable rather than merely poor: attrition against a
  commander who replaces their losses is one-way when you cannot replace yours. A table where
  nobody can pay for anything is a stalemate, not a defeat, and a broke commander who is
  still the strongest fleet on the map is not beaten — the rule refuses to call either one a
  loss.

Sixty seconds because the position has to be a state rather than an instant: a commander who
has just spent their last nodules is not beaten, and one who has not banked a thing in a
minute with nothing in the water is.

The rule is automatic and cannot be invoked. There is no *offer* of surrender to accept or
refuse — a concession an opponent could decline would be a negotiation, and nobody down here
is talking. Walking out of a live match is still a resignation
([tech-stack.md](tech-stack.md)), which is a different thing: that is a player leaving, this
is a position ending.

*Beats* above means these four phases of the loop. The word does two other jobs in this
bible — [campaign.md](campaign.md)'s mission tables head a column *Beat* for what a mission
is dramatically about, and a mission's schedule ([mission-sorrowgate.md](mission-sorrowgate.md)
§9) calls its tick-keyed events beats — and none of the three is being renamed, so this line
is the record that the collision was seen rather than inherited.

## Pillars

1. **Listening, not looking** — partial information is the normal state; the target emotion is dread, not confusion
2. **Every advantage has a noise cost** — you cannot be strong and quiet for free
3. **Depth is commitment** — raids go in loud and come out slow
4. **The map is alive and can be killed** — a simulated ecosystem responds to noise, hunger, and over-extraction
5. **Asymmetry that means something** — mechanics *are* worldview (see [factions.md](factions.md))
6. **No villains** — every faction is correct from inside; all four campaign endings are coherent, costly, and irreconcilable
