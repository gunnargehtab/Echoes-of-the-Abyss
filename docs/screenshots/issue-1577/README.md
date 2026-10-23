# The first-run path, walked as a newcomer

Evidence for [#1577](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1577), under
[#1574](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1574): the two first-run
paths, played from the screen alone at `1254d8bde`, headless at 1,440 × 900. Each step
was chosen from the frame before it. The docs were opened only to sort a gap from a choice,
and after the step.

Both paths reached a result:

| Path | Route | Result |
| --- | --- | --- |
| 1 | Title → Tutorial → briefing → the prologue | T+20:00, **one tender through**: the partial result in [mission-sorrowgate.md](../../mission-sorrowgate.md) §8 |
| 2 | Title → Solo game → The Ventfront Divide → a Recruit Commune | T+12:01, **victory**: a ten-hull push onto the Recruit's Bastion |

## How it was driven

`walk.cjs` keeps one browser open and takes one batch of inputs per request, so each frame is
read before the next input is chosen. Two aids were used, and neither chose a move:

- The walk's first version had no drag, so two box selects were dispatched as pointer events
  on the HUD canvas. `walk.cjs` now has `drag`, `down` and `up`, added after the walk and not
  exercised by it.
- From T+08:55 in path 2, `window.__perspectiveCamera` aimed the view at the fleet and at the
  north-east spawn.

## Which frame shows which

| Frame | Clock | What it shows |
| --- | --- | --- |
| `01-title.png` | — | First-run focus on Solo game, not Tutorial |
| `02-briefing.png` | — | The briefing: in-fiction prose, "stays under twenty" with no unit |
| `03-two-sig-readings.png` | T+01:38 | Meter `SIG 018 / 100` against orders `flight SIG 006 / 020`; `BERTHS 6/0` in red |
| `04-tender-reads-harvester.png` | T+12:00 | Tender One's inspector reads `HARVESTER`, hint bar `cargo`, `V throttle` |
| `05-concourse-jump.png` | T+13:59 | An order row clicked: the camera on the Concourse, which has no label |
| `06-went-loud-under-ceiling.png` | T+12:41 | "Light Scout went loud" twice, the ceiling order still MET |
| `07-silence-debt.png` | T+16:29 | A plain move order: "The flight owes the court a silence" |
| `08-prologue-result.png` | T+20:00 | The result card, partial |
| `09-solo-setup.png` | — | Map cards in design shorthand |
| `10-lobby-veteran.png` | — | READY primary; the added AI defaults to Veteran |
| `11-foundry-codes.png` | T+01:43 | Twelve unit codes, no tooltip, the harvester only just put to work |
| `12-victory.png` | T+12:01 | The skirmish result card |

## Gaps, and where each went

| Gap | Frames | Issue |
| --- | --- | --- |
| The escort half never says to order the tenders, or where | 04, 05 | [#1585](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1585) |
| The strip and the log contradict the orders panel's SIG | 03, 06, 07 | [#1586](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1586) |
| The shell's defaults lead away from the tutorial, into a hard or empty match | 01, 09, 10 | [#1587](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1587) |
| A skirmish never states its goal, and a losing player has no way to a result | 11 | [#1588](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1588) |
| Nothing teaches building, harvesting or production before Solo game | 11 | [#1589](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1589) |

## What the screen already answers

- **The briefing's "twenty".** The orders panel says it on arrival: "Keep every escort under
  SIG 20 — the reading in this panel's header".
- **Why a tender will not move.** Its inspector and hint bar name the hold: `held — not
  released yet`, then `held — no ears in range`.
- **What each strip readout is.** A hover gives the line [ui-ux.md](../../ui-ux.md) §2 asks for.
- **Both results.** Each card says what happened and offers the way on.
- **What the opponent knows.** The lobby says it: "it hears exactly what you hear".

## Dropped

A right-click on the scope during the prologue seemed to send the escorts away from the
Concourse. The scope is north-up and centred on the Bastion ([ui-ux.md](../../ui-ux.md) §5),
and the world camera was not north-up, so the frames cannot say which way the hulls went. It
is not filed.

## Related

[#1574](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1574) ·
[playtest-checklist.md](../../playtest-checklist.md) ·
[mission-sorrowgate.md](../../mission-sorrowgate.md) · [ui-ux.md](../../ui-ux.md)
