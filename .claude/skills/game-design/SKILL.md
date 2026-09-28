---
name: game-design
description: Define the player decisions and mechanical boundaries of an Echoes change. Use for game-design briefs, mission redesign or a visual slice that must preserve play. Anchor every proposal to sound or depth and distinguish a mechanic change from prohibited balance tuning.
---

# Protecting the game inside the picture

Read `CLAUDE.md`'s balance freeze, `docs/game-identity.md`, the relevant sound/depth
sections, and the mission specification. Then read its implementation. An issue's
description of what used to happen is not evidence of today's behaviour.

## Produce the decision contract

State the player emotion, what is known, the decision, the cost and the feedback.
Name which channel owns every fact: public map, own snapshot, earned contact or
authored mission view. No visual can know more than its channel.

List what the slice keeps and what it changes. For a visual reboot, explicitly retain
stats, prices, yields, AI, timing, progression, controls and mission outcomes unless
the user approved a separate mechanical change.

The first application is `docs/visual-reboot.md` §2. The tutorial has four unarmed
escorts, two tenders and no economy. It cannot demonstrate mining or a player-fired
ping merely because the earlier visual proposal used a skirmish as its example.

## Resolve design calls in the open

Write options and a recommendation before changing the bible. A correctness fix,
a new mechanic and a balance adjustment are different things; the last remains frozen.
Do not relax the information boundary or turn a presentation experiment into a
simulation debug flag.

Pass unit roles to [unit design](../unit-design/SKILL.md), route commitments to
[map design](../map-design/SKILL.md), and the shared exclusions to
[art direction](../art-direction/SKILL.md).

## Check the experience

Exercise a legitimate player action and its feedback, including a refused action with
its reason. For Sorrowgate, move an escort and observe the flight reading; transmit
and construction remain locked. Do not script around those locks for a prettier image.

Run the relevant mission regression when the slice relies on its beats or ground
changes, even when the mechanic itself is deliberately unchanged. Screenshots cannot
prove escort release conditions, and headless mission tests cannot prove readable water.

Return the decision contract and evidence, not an unsupported claim that the new look
is balanced or that a still-image score proves a playable game.

## Related

- [Visual reboot brief](../../../docs/visual-reboot.md)
- [Game identity](../../../docs/game-identity.md)
- [Sorrowgate](../../../docs/mission-sorrowgate.md)
- [Development loop](../dev-loop/SKILL.md)
