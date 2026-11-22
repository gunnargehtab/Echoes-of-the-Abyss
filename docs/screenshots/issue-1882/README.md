# A Tetherjelly field's rim, raised to read (#1882)

The rim is a field's 250 m footprint, where PF falls by 0.10
([map-visuals.md](../../map-visuals.md) §10, "Phase 3 — landed"). It was stroked at 0.18 and is
stroked at 0.3 now. Each frame is the field nearest the own fleet on the Ventfront Divide, at
Low, at the home pitch of 55°.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium.

| Distance | Before, 0.18 | After, 0.3 |
| --- | --- | --- |
| 1,100 m | [before](before-1100.png) | [after](after-1100.png) |
| 2,400 m | [before](before-2400.png) | [after](after-2400.png) |

Before, the bells read and the rim is a grey trace beside the range rings. After, the rim is a
pale circle at both distances. The match seed is random, so the two runs drew the field in
different places and over different ground.

## Reproduce

```bash
.claude/skills/run-game/scripts/dev.sh start
VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --out /tmp/issue-1882 --steps docs/screenshots/issue-1882/frames.mjs
```

[frames.mjs](frames.mjs) finds the fields in the client's snapshot and frames the nearest one.

## Related

[map-visuals.md](../../map-visuals.md) §5 · `packages/frontend/src/game/ladder.ts`
