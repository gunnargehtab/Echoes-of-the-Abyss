# Every mission's markers, named on the chart

Evidence for [#1617](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1617): one
frame for each of the 27 missions with markers other than Sorrowgate, which #1611 framed,
showing a named marker's ring and name at 1,440 × 900 in headless Chromium (SwiftShader),
driven by `frames.mjs`:

```bash
FRAME_OUT=docs/screenshots/issue-1617 FRAME_NAME=<id> \
  node .claude/skills/run-game/scripts/drive.mjs \
  --url "http://localhost:5173/?mission=<id>" --out <dir> \
  --steps docs/screenshots/issue-1617/frames.mjs
```

Each drive waits for the first open row with a marker, presses it so the camera goes there,
and saves `<id>.jpg`. A row that opens late is waited for in real time. So each frame shows
one mission's first named marker, not every name: a marker whose row opens later, such as
Deep Furrow's *The furrows* at 15:30, is held by `missions.test.ts` and not framed. `ROW`
picks a later open row, `ZOOM_OUT` wheels out for a ring too wide for the focused view, and
`SETTLE_MS` shortens the wait before the press.

| Mission | Name in the frame | Settings |
| --- | --- | --- |
| `ledger-asset-recovery` | The Rail Head | |
| `ledger-shift-change` | The rail transfer | |
| `ledger-baffle` | The Deep Yard | |
| `ledger-exposure` | The worked ground | `ZOOM_OUT=8` |
| `ledger-tolerance` | The root aperture | `ROW=1`: the pour is met within seconds |
| `ledger-prospect` | The terraces | `ZOOM_OUT=12` |
| `ledger-item-nine` | The rail of the chamber | |
| `seeding-tend` | The Holdfast | |
| `seeding-thin-water` | The Holdfast Gate | |
| `seeding-deep-furrow` | The second furrow | |
| `seeding-in-writing` | The Foot | |
| `seeding-radicals` | The far water | |
| `seeding-second-seeding` | The lip | |
| `seeding-convocation` | The east gardens, the walk's live row | |
| `attending-attendance` | The axis | |
| `attending-intake` | The ascent | Opens at 19:00 |
| `attending-the-dome` | The mouth | Opens at 19:00 |
| `attending-shallow` | The Kell Slope | Opens at 18:00 |
| `attending-conclave` | The axis | Opens at 17:00 |
| `attending-first-arrival` | The terraces | Opens at 19:00; `ZOOM_OUT=12` |
| `chord-nineteen` | The Rest | `ZOOM_OUT=8` |
| `chord-conclave` | Descant | Opens at 13:30; `SETTLE_MS=2000`, since an idle run is lost at 14:30 |
| `chord-the-three` | The sealed room | |
| `chord-rim-deposits` | The Staging line | |
| `chord-second-chord` | The Chord | |
| `chord-aptitude` | The outer formations | `ZOOM_OUT=8` |
| `chord-standing-wave` | The Fifth | |

A ring is cut where the map's rim cuts it, as in `seeding-radicals.jpg`, because a rung-6
mark ends at the rim ([map-visuals.md](../../map-visuals.md) §5).

Three names sit on something at the ring's north edge: the player's hulls in
`ledger-exposure.jpg`, a Sounding Spire in `chord-second-chord.jpg`, and the Bastion in
`chord-standing-wave.jpg`. The name was placed above the ring, so a hull standing on the
ring's far side was under it. [ui-ux.md](../../ui-ux.md) §10.5 promised it never sat on the
hulls the ring is drawn round, which held for hulls inside the ring only. Since #1662 the
name keeps off them: [issue-1662](../issue-1662/README.md) has the same frames after it.
