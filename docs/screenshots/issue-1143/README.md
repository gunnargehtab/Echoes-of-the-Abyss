# Issues 1143 and 1154 — The Fourth Trench and The Fourth's Foot drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, with the HUD hidden: The Fourth
Trench on `?mission=ledger-baffle`, The Fourth's Foot on `?mission=attending-the-dome`. The
client and server are `main` at `63784b64`. The "after" frames swap this branch's
`fourthTrench.ts` and `fourthFoot.ts` into the running server and change nothing else, since a
map is server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [baffle-survey-before](baffle-survey-before.png) | Map centre, 88°, dolly 8,000 m | Both walls as boxes to the map's south edge |
| [baffle-survey-after](baffle-survey-after.png) | Same | Each wall's seaward end on a slant back to the map edge, the margin reaching north along the yard's flanks |
| [baffle-oblique-before](baffle-oblique-before.png) | Map centre, 50°, dolly 5,500 m | The walls' square ends in perspective |
| [baffle-oblique-after](baffle-oblique-after.png) | Same | The slanted ends meeting the margin |
| [dome-survey-before](dome-survey-before.png) | Map centre, 88°, dolly 9,600 m | Square wall ends, a full-width Fan, a boxed Foot |
| [dome-survey-after](dome-survey-after.png) | Same | The same slanted wall ends, the Fan spreading from the yard's mouth with shelf corners, the Foot's corners cut |
| [dome-oblique-before](dome-oblique-before.png) | Map centre, 50°, dolly 6,600 m | The same boxes in perspective |
| [dome-oblique-after](dome-oblique-after.png) | Same | The same shapes in perspective |

```bash
SHOOT_MAP=3000,5000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-baffle' \
  --out <dir> --steps docs/screenshots/issue-1143/shoot.mjs
SHOOT_MAP=3000,6000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=attending-the-dome' \
  --out <dir> --steps docs/screenshots/issue-1143/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
