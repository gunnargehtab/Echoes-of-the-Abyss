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

## Pillars

1. **Listening, not looking** — partial information is the normal state; the target emotion is dread, not confusion
2. **Every advantage has a noise cost** — you cannot be strong and quiet for free
3. **Depth is commitment** — raids go in loud and come out slow
4. **The map is alive and can be killed** — a simulated ecosystem responds to noise, hunger, and over-extraction
5. **Asymmetry that means something** — mechanics *are* worldview (see [factions.md](factions.md))
6. **No villains** — every faction is correct from inside; all four campaign endings are coherent, costly, and irreconcilable
