# Issue #1754: the crater's two-seat fight

Two headless Chromium clients on one development server, taken on 28 November 2026.
**Software rasteriser (SwiftShader) frames**: they show what the instruments say, not
how the crater looks, and are not offered as a look.

The fleets were staged for the drive by [`stage.py`](stage.py), which edits
`free-water-duel`'s opening fleet while the server runs and is restored after; the
staging is never committed. Seat 0's Corvette sits at 300 m over the pocket and its
Cruiser at 550 m over seat 1's Bastion; seat 1's Abyssal Submersible sits at 2,000 m in
the pocket. [`duel.mjs`](duel.mjs) drives both clients:
`python stage.py`, `npm run dev`, then
`node docs/screenshots/issue-1754/duel.mjs .dev-loop/duel`, then `python stage.py restore`.

| Frame | Seat | What it shows |
| --- | --- | --- |
| [01-lobby-A.png](01-lobby-A.png) | 0 | The private lobby with its room code, both commanders seated, no AI offered |
| [03-opening-A.png](03-opening-A.png) | 0 | The match live: "Destroy the enemy Bastion", with the enemy Bastion, Cruiser and Abyssal Submersible tracked in the contact log |
| [07-B-sub-in-pocket.png](07-B-sub-in-pocket.png) | 1 | The Submersible at 2,000 m: edge marks read ABOVE 1,450 m and ABOVE 500 m, and the depth rail sits in the Abyssal band |
| [10-A-cruiser-over-enemy-bastion.png](10-A-cruiser-over-enemy-bastion.png) | 0 | The Cruiser over the enemy Bastion's contact, drawn clear of its roof |
| [11-B-own-bastion-contact-above.png](11-B-own-bastion-contact-above.png) | 1 | The same Cruiser seen from seat 1, a contact over its own Bastion |

Frames 10 and 11 hold the Cruiser at 550 m, clear of the Bastion's drawn roof, which for
a Cruiser is about 620 m over the 1,500 m floor. The `volumetricGround.test.ts` cases
hold the same rule in numbers.

Related: [free-water-slice.md](../../free-water-slice.md) §9
