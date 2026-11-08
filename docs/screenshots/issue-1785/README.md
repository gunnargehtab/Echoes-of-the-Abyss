# #1785 — the five refits on the Slipway's page, and rank chevrons

## The refits

The real client at `bb187321f`, through Solo game → Descend on the Ventfront Divide, seated as
the Bathyarch Consortium at 1440 × 900 and device pixel ratio 1. Each frame is from
`.claude/skills/run-game/scripts/drive.mjs`, with the SLIPWAY tab pressed once the match had
started. The HUD clock reads T+00:18 on the first and T+00:22 on the second.

- [`slipway-page-consortium.png`](slipway-page-consortium.png): the page
  [ui-ux.md](../../ui-ux.md) §9 counts at nine for the Consortium. Its four hulls are first,
  then the five refits: PRS, PLT, DRV, MAG and HLD. Each is priced at the Consortium's ×0.7
  crystal ([systems-progression.md](../../systems-progression.md) §2), so the Plate reads
  250+42c and the Hold 200+28c. Every cell is greyed, because no Slipway stands yet and the
  stockpile holds no crystal.
- [`slipway-hover-hold-refit.png`](slipway-hover-hold-refit.png): the same page with the
  pointer on HLD. The hover line reads "Hold Refit — 200 nodules, 28 crystal".

## Rank chevrons

The real client at `ccb626e9`, on the Ventfront Divide as the Bathyarch Consortium against
the AI opponent, at 1440 × 900 and device pixel ratio 1. The frames come from a scratch copy of
`drive.mjs` that presses ADD OPPONENT before readying. The two opening Caissons were sent on
an attack-move into the Draymaws east of the base, and the camera was put on them at their
670 m depth. The HUD clock reads T+05:45.

- [`rank-chevrons-caissons.png`](rank-chevrons-caissons.png): the left Caisson is whole and
  at rank 1, so it draws no bar and one chevron where the bar would end
  ([systems-progression.md](../../systems-progression.md) §3, [ui-ux.md](../../ui-ux.md) §4).
  The right one is hurt and at rank 2, so its bar shows with two chevrons at its right end.
  The selection card reads HULL 616/616, a Caisson's 560 at rank 1.
- [`rank-chevrons-caissons-crop.png`](rank-chevrons-caissons-crop.png): the same frame,
  cropped round the pair and enlarged four times. Nothing was drawn over it.
