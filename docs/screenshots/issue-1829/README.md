# A flat black shape at the near-port camera (#1829)

At High, the Corvette's near-port camera in `?study=free-water` showed a flat black shape
top left: a bar on two legs, with an arm to an octagon. It was two faults.

- **The bar** was a passage roof, drawn blended at full opacity. High's world pass writes
  the water's share into alpha only for an opaque draw, so the roof took no water and drew
  black. #1833 fixed it; the frames at the top of this directory are its software ones.
- **The octagon** was a NaN in the world target, spread by the bloom. It flickered all
  through a swing round the hull. The pull request this `gpu/` set comes with fixes it.

## Where the NaN came from

`echoesDisplayVeil` (`packages/frontend/src/game/veilShading.ts`) encodes a colour with
`mix( c * 12.92, 1.055 * pow( c, … ) - 0.055, step( … ) )`. `mix` runs both branches, and
`pow` of a negative is NaN, which a weight of 0 does not cancel. The world target is
multisampled, and an edge sample can read a colour or a shade past its triangle, below 0.

Read back from the world target at 31 yaws of the swing, 29 held NaN texels, 151 in all.
Each was one channel, on a silhouette edge: 40 of the rays met a passage roof first and
37 the lit ground, both drawn through the veil. The bloom's four levels spread each one
into an octagon. With the bloom's share set to 0 for one swing, no octagon showed.

The fix holds the colour and the shade at 0 before the first `pow`. Only a channel that
was below 0 moves, and to 0.

## On the named GPU

Taken on a GTX 1070 through Edge/ANGLE D3D11 at 1920 × 1080, headed, three r187, on
`main` at c1de6321 and on this branch.

| Reading | `main` | This branch |
| --- | --- | --- |
| Yaws with a NaN texel in the world target, of 31 | 29 | 0 |
| Swing frames with a black octagon, of 121 | 76 | 0 |

- [swing-main-vs-fixed.mp4](gpu/swing-main-vs-fixed.mp4) is the swing, `main` left. The
  same step on its own: [main](gpu/swing-main-f0067.png), [fixed](gpu/swing-fixed-f0067.png).
- [octagon-source-zoom.png](gpu/octagon-source-zoom.png) is one octagon round its source
  pixel at three times the brightness, and
  [octagon-source-zoom-nobloom.png](gpu/octagon-source-zoom-nobloom.png) is the same pixel
  with no bloom: a lone dark texel on a ridge.
- [after/](gpu/after/readings.json) is the six-camera set at High on this branch, and
  [before/04-near-port](gpu/before/04-near-port.png) is the near-port camera with #1833
  taken out: the bar and the octagon both. Calls and triangles match `main`'s.
- [low-after/04-near-port](gpu/low-after/04-near-port.png) is Low's control. Against
  `main` at every camera the mean luma agrees to 0.01 of 255. The 0.6–1.9% of pixels that
  differ by more than 8 are marine snow, which drifts between drives.

## Who captures

On the owner's desktop, with `npm run dev` running, by
[issue-1811](../issue-1811/README.md)'s command into `gpu/after` (`QUALITY=high`) and
`gpu/low-after` (`QUALITY=low`). The swing adds `CLIP=1 CLIP_STEPS=120 CLIP_STEP_MS=80
CLIP_FRAMES=<dir>`, and ffmpeg stacks the two swings' steps side by side.

## Related

- [issue-1811](../issue-1811/README.md): the Corvette's frames, whose swing showed the
  octagon first
- [issue-1814](../issue-1814/README.md): the rim frame the issue was filed from
- [issue-1801](../issue-1801/README.md): the High world pass and its bloom
