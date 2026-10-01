---
name: art-direction
description: Direct a staged visual change in Echoes of the Abyss. Use for a visual reboot, a shared look-development brief, or coordinating unit, material, map and world design. Own the approved target and one production review loop, not six independent art styles.
---

# Directing one playable slice

Start with `CLAUDE.md`, `docs/art-direction.md`, `docs/graphics-standards.md` and the
mission or screen being changed. `docs/visual-reboot.md` is the first worked brief:
the tutorial is Sorrowgate, not a skirmish with a tutorial label. The second is
game-wide: `docs/art-direction.md`'s "Shared model lighting — Abyss Render Stack" gives
every production match Sorrowgate's rig, ACES and a static water environment, ranks the
upgrades its follow-ups start from, and rules out the Dream Loop study as the reference.

## Author the shared brief

Before code, write the following into the applicable design document:

- The player's emotion, the sound/depth argument, and the exact mission or screen.
- The approved visual reference and what transfers from it. A still's accumulated
  lighting is not a real-time performance claim.
- What changes, what stays, and how the change is gated. Record alternatives and the
  chosen recommendation whenever the existing bible is changed.
- The visual hierarchy at close, home and survey views; faction, palette, SIG, contact
  fidelity, motion and GPU constraints.
- A bounded asset list and an evidence matrix. Name the old frame as well as the target.

Read the live implementation before calling any current behaviour a fact. A borrowed
mission structure may have only a sprite fallback; a prop loader may never have loaded.
Do not grade the picture the document says exists.

## Use the specialists, in order

1. [Game design](../game-design/SKILL.md) fixes the player's decisions and exclusions.
2. [Map design](../map-design/SKILL.md) records the authored acoustic and vertical ground.
3. [World design](../world-design/SKILL.md) chooses the inhabited place and approved kit.
4. [Unit design](../unit-design/SKILL.md) identifies the fleet and its visual roles.
5. [Material design](../material-design/SKILL.md) implements the shared surface treatment.

These are workflows, not a requirement to launch five agents. Each returns its concrete
output into the same brief. An unchanged mechanic or retained model is a valid decision
with a reason, not permission to skip the role or asset audit.

## Integrate and stop

Use [run-game](../run-game/SKILL.md) for the real client, with the HUD present. A screenshot
of a standalone scene does not prove a playable slice. Compare the same cameras before
and after, and include a non-target control: a mission outside the slice or, for a
game-wide change, the path it must leave alone (#974's was the baked chart and overlay).

The coordinator runs **one** [dev-loop](../dev-loop/SKILL.md), with its three-round cap
and fresh independent critic. Specialists do not start nested loops or approve their own
outputs. Any GLB change also goes through the separate hull-reviewer.

Stop on the brief's written criteria, not on a beauty score. Report measured GPU work
and the hardware that produced timings. The probe's conn and overlay milliseconds are CPU
time and its frame time an interval. Its GPU milliseconds are a timer query over every pass
of the conn view's frame, read on a GPU and refused on a software rasteriser
([run-game](../run-game/SKILL.md) says how), so shading cost is a reading, not a guess.
Render-stack work is accepted on desktop (gate 6).

## Related

- [Visual reboot brief](../../../docs/visual-reboot.md)
- [Graphics gates](../../../docs/graphics-standards.md)
- [Agentic loop](../../AGENTIC-LOOP.md)
