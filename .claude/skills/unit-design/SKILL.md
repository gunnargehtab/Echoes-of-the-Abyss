---
name: unit-design
description: Translate an approved Echoes unit or structure role into a coherent visual treatment. Use for roster look development and visual redesign. Reuse the hull author/intake/reviewer pipeline; never let a material pass silently redesign a silhouette or a visual brief change stats.
---

# Designing the force the player actually owns

Read the shared art brief, the mission's force literal, `docs/units.md`,
`docs/factions.md`, and the applicable block in `docs/asset-prompts-3d.md`.
Read `rosterModels.ts` and the approved files before promising that every kind has a
model in every faction.

## Produce a role-to-asset sheet

For each visible own kind, record:

- Its role, faction, canonical size, idle/cruise SIG, PR and mission restrictions.
- Its approved GLB or sanctioned fallback, plus the authoring script if it has one.
- The silhouette and working parts that must survive lights-off, close and survey views.
- Whether this slice retains its shape, changes its runtime surface, or commissions a
  new shape. Explain the choice.

The first worked sheet is `docs/visual-reboot.md` §3. Sorrowgate's escorts are
Commune-built scouts, its tenders use Harvester hulls, and its borrowed array is not a
newly invented neutral faction.

## Choose the right lane

**Retained shape:** hand the sheet to [material design](../material-design/SKILL.md).
Do not edit the GLB, hull length, outline, lamp placement or approved resting emission.
Verify that the runtime still uses the same buffers and bounding box.

**New or changed shape:** hand the approved block to
[hull-designer](../../agents/hull-designer.md), under the model-of-record rule. It owns
the prompt, script and model, not the stats. Run `npm run check:models`, use
[hull-intake](../hull-intake/SKILL.md), and provide the diff, lit sheet and contact sweep
to [hull-reviewer](../../agents/hull-reviewer.md). Do not substitute your own approval
or silently change models when an agent cannot start.

Neither lane creates full-detail enemy meshes or fauna. A shape that would require
another ability, pressure rating or silhouette doctrine is a decision for the brief,
not a correction to slip into an export.

## Return to the shared brief

Return the role-to-asset sheet, changed files, retained geometry evidence, and the
close/home/survey frames. Let [art direction](../art-direction/SKILL.md) integrate it
with the same map and materials rather than creating a separate unit beauty target.

## Related

- [Visual reboot brief](../../../docs/visual-reboot.md)
- [Prompt kit](../../../docs/asset-prompts-3d.md)
- [Graphics gates](../../../docs/graphics-standards.md)
