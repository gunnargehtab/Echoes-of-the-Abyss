# #1002 — the Knights' Bastion with its baked occlusion map

The first model to carry a baked occlusion map
([art-direction.md](../../art-direction.md#bevels-and-baked-occlusion--spec)), seen the
three ways the loop looks at a model. The client at the branch's head, headless Chromium on
SwiftShader through `drive.mjs`, 1440×900; the Knights' card taken in the lobby before
readying, so the pre-built Bastion on screen is `bastion-hadron.glb`.

| Frame | What it shows |
| --- | --- |
| `bastion-hadron-inspect-before-after.png` | `node tools/hull-renders/inspect.mjs bastion-hadron --before origin/main`: the bare file on the left, the baked one on the right, four cameras. The dome darkens under its ribs and conduits and round the lantern's foot; nothing else differs, since no vertex moved |
| `bastion-hadron-occlusion-atlas.png` | The 512² map itself, as the file carries it: 744 charts, the dome's cap the largest, the gutters filled from their charts |
| `bastion-hadron-conn-opening.png` | The opening of a solo match on Ventfront as the Knights, the home camera |
| `bastion-hadron-conn-close.png` | The same, six wheel notches in: the Bastion drawn by `rosterModels.ts` from the baked file, the rib contacts reading on the dome, the console clean |

The lit sheet is the before-and-after; the conn frames are the after only, since the client
draws the committed file and a before would mean checking out `main`. Intake's four maps of
the baked file are byte for byte the bare file's, so there is no frame of those to show.
