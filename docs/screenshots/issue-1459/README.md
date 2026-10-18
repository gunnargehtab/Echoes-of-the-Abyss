# #1459's gate 6 on the named GPU

`tools/render-stack/capture.mjs` on Sorrowgate (`?mission=prologue-sorrowgate`), headed in Edge on the GTX 1070
(ANGLE, Direct3D 11), unpaced, one run each. *Before* is main's frontend (90533251); *after* is this branch at
02aca027. *Fade 0* pins the fade's strength at 0 for the drive (staged), the worst case, with the overview drawn;
*full* lets it ramp to 1, a mission's frame, where the overview is hidden. Milliseconds are the conn view's GPU
time, every pass summed, plain and queued (gate 6). The readings are beside this file.

| Side | Fade | Ratio | Camera | Calls | Triangles | GPU ms | Queued GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before | 0 | 1 | home | 32 | 80,049 | 0.52 | 0.45 |
| before | 0 | 1 | close | 40 | 80,076 | 0.72 | 0.67 |
| before | 0 | 1 | low | 33 | 80,049 | 0.47 | 0.41 |
| before | 0 | 1 | survey | 32 | 80,049 | 0.42 | 0.37 |
| before | 0 | 1.5 | home | 32 | 80,049 | 0.93 | 0.85 |
| before | 0 | 1.5 | close | 40 | 80,076 | 1.51 | 1.41 |
| before | 0 | 1.5 | low | 33 | 80,049 | 0.83 | 0.74 |
| before | 0 | 1.5 | survey | 32 | 80,049 | 0.74 | 0.66 |
| before | full | 1 | home | 32 | 80,049 | 0.52 | 0.47 |
| before | full | 1 | close | 40 | 80,076 | 0.72 | 0.66 |
| before | full | 1 | low | 33 | 80,049 | 0.5 | 0.41 |
| before | full | 1 | survey | 32 | 80,049 | 0.42 | 0.37 |
| before | full | 1.5 | home | 32 | 80,049 | 0.93 | 0.87 |
| before | full | 1.5 | close | 40 | 80,076 | 1.5 | 1.41 |
| before | full | 1.5 | low | 33 | 80,049 | 0.83 | 0.76 |
| before | full | 1.5 | survey | 32 | 80,049 | 0.72 | 0.68 |
| after | 0 | 1 | home | 33 | 108,129 | 0.51 | 0.42 |
| after | 0 | 1 | close | 41 | 108,156 | 0.72 | 0.64 |
| after | 0 | 1 | low | 34 | 108,129 | 0.49 | 0.4 |
| after | 0 | 1 | survey | 33 | 108,129 | 0.51 | 0.36 |
| after | 0 | 1.5 | home | 33 | 108,129 | 0.96 | 0.81 |
| after | 0 | 1.5 | close | 41 | 108,156 | 1.54 | 1.38 |
| after | 0 | 1.5 | low | 34 | 108,129 | 0.89 | 0.75 |
| after | 0 | 1.5 | survey | 33 | 108,129 | 0.86 | 0.69 |
| after | full | 1 | home | 32 | 80,049 | 0.52 | 0.46 |
| after | full | 1 | close | 40 | 80,076 | 0.83 | 0.67 |
| after | full | 1 | low | 33 | 80,049 | 0.48 | 0.41 |
| after | full | 1 | survey | 32 | 80,049 | 0.43 | 0.4 |
| after | full | 1.5 | home | 32 | 80,049 | 0.95 | 0.87 |
| after | full | 1.5 | close | 40 | 80,076 | 1.61 | 1.4 |
| after | full | 1.5 | low | 33 | 80,049 | 0.84 | 0.76 |
| after | full | 1.5 | survey | 32 | 80,049 | 0.79 | 0.68 |
