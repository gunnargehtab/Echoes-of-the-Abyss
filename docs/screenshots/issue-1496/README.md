# #1496 — a reconnect after the arch falls keeps the opening seed

[#1463](../issue-1463/README.md) read Sorrowgate's drawn seabed before and after a lost
signal past the arch's fall, and found every cell's relief moved on the reconnect. The
room sent the fallen ground whole, and the client hashed it into a new noise seed. The
room now sends the ground the match opened on with every write since, and the client
replays them ([tech-stack.md](../../tech-stack.md), "Ground that changes").

**Where and how.** The GTX 1070 and system Chrome of #1463, headed at 1440×900 and ratio 1,
on `claude/issue-1496-join-seed`. [`arch.mjs`](arch.mjs) is #1463's
[`world.mjs`](../issue-1463/world.mjs) trimmed to the join, the fall at 10:40 and a 3 s
offline drop, run through the same `drive-board-tmp.mjs`. It exits 1 for the reconnect
attempts' `ERR_INTERNET_DISCONNECTED` console errors alone.

| When | Span, four points west to east | Service lock |
| --- | --- | --- |
| Standing, at the join | 1,577 · 1,649 · 1,575 · 1,601 m | 1,510 m |
| Fallen, at about 10:50 | 197 · 181 · 200 · 220 m | 1,510 m |
| After the reconnect, 11:07 | 197 · 181 · 200 · 220 m | 1,510 m |
| #1463, after the reconnect | 186 · 198 · 206 · 171 m | 1,513 m |

The first three rows match #1463's to the metre, and the reconnect now reads what the fall
left. The drive also read a 10 × 10 grid at 500 m spacing: three of its 100 points moved
when the arch fell, and none on the reconnect ([readings.json](readings.json)).

| Frame | What it shows |
| --- | --- |
| [fallen](fallen.png) | The court after the fall, over the service lock |
| [reconnected](reconnected.png) | The same camera after the reconnect, the overlay gone |

Related: [#1463's readings](../issue-1463/README.md) ·
[graphics-standards.md](../../graphics-standards.md) gate 6
