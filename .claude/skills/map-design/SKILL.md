---
name: map-design
description: Design or audit authored Echoes maps and their visual interpretation. Use for routes, depth sections, acoustic geography, mission staging and map readability. Separate simulation literals from render-only relief and dressing; never generate gameplay ground from an image or noise field.
---

# Designing water that can be read and played

Read `docs/maps.md`, the mission's map table, its map literal under
`packages/backend/src/sim/maps/`, and the relevant depth and Echo rules.
The first slice's audited map is Sorrowgate in `docs/visual-reboot.md` §4.

## Produce two views

Record a top-down route reading and a vertical section. Name the start, destination,
alternate route, floor, ceiling, acoustic boundary and irreversible commitment that
matter to the player. Trace the authored rectangles into the actual 250 m cells.

For a visual-only slice, explicitly retain the map literal, spawns, resources, hazards,
PF and traversal. Do not change a rectangle to improve a composition. For an approved
mechanic change, amend the canonical table first and hold the painted cells in tests.

## Keep the two grounds apart

- Gameplay maps are authored literals, never runtime procedural generation.
- Render relief, normal detail and prop scatter describe public ground only. They
  cannot create floors, collisions, cover, propagation or detection.
- Isobaths read authored floors, not noise. Biome borders still mean PF changes.
- A decorative seam is not a route line. Keep it subordinate to the survey and fade
  it at tactical distance.
- A ground delta must update the surface and dressing from the new public cells.
  Test locality: a collapse must not reshuffle the untouched map.
- A mark a prop leaves on the ground, such as a seated stone's scour, comes from the
  registry's own scatter, filtered after it (a spec's index is in its hash), and stays
  inside the prop's cell. Then the rebake of the touched cells and a ring redraws it.

Do not add scenery that visually promises a blocked path is open, or a traversable
route is obstructed. The Service Lock's roof is a route mark, not permission to reveal
who occupies it.

## Return the audit

Return both route readings, retained or changed data, the biome-to-surface mapping,
and evidence at the opening, low pitch and survey distance. Hand the ground vocabulary
to [world design](../world-design/SKILL.md) and the surface to
[material design](../material-design/SKILL.md).

The balance freeze still applies: a route correctness fix is not permission to tune
resource yields or chase a faction's win rate.

## Related

- [Visual reboot brief](../../../docs/visual-reboot.md)
- [Authored maps](../../../docs/maps.md)
- [Depth](../../../docs/systems-depth.md)
- [Map visual hierarchy](../../../docs/map-visuals.md)
