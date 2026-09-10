# The Directorate's four leads, re-read from a seat-balanced batch

#600 offered four leads for the Directorate's breach of
[economy.md](../../../docs/economy.md) §9 — Biomass income, depth, losses, and the
commander — and said of all four that they were "starting points, not conclusions". All
four were read off a batch that seated the Directorate in slot 2 and nobody else there, and
[seat-rotation.md](seat-rotation.md) then measured that the chair is worth more on this map
than any doctrine on the table. So each lead carried the same confound, and none of them had
been tested rather than merely stated.

This file is the same four leads read off [four-faction-rotated.md](four-faction-rotated.md),
where each navy sits in each chair for thirty matches and the pool is balanced.

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights \
  --matches 30 --seed 4000 --max-minutes 25 --rotate-seats \
  --title 'Four-faction baseline, seating rotated' \
  --out tools/balance/baselines/four-faction-rotated.md
```

**It reproduces `seat-rotation.md`'s hand-assembled pool exactly** — 49 decided, Directorate
57%, Knights 31%, Commune 10%, Consortium 2%, and 29% / 12% / 43% / 16% by chair. That
table was built by hand out of four batches' JSON siblings; this is the same numbers out of
one command, which is the check that `--rotate-seats` rotates what the file rotated.

## The breach survives the balancing

| | Single seating | Pooled over four |
| --- | --- | --- |
| Decided matches | 20 | 49 |
| Directorate | **75%** | **57%** |
| Knights | 15% | 31% |
| Commune | 10% | 10% |
| Consortium | 0% | 2% |

§9's bar is 50% of a four-seat batch. 57% is over it, so the rail still breaches and #600 is
still a defect rather than an artefact — but by seven points rather than by twenty-five.

The pool is balanced by construction and not by outcome, and that is worth one caveat: each
navy sits in each chair for thirty matches, but the four seatings decide 20, 8, 5 and 16 of
them, so the pooled ratio still leans on the seatings that resolve. Weighting the four
seatings equally instead gives the Directorate 59%, the Knights 27%, the Commune 9% and the
Consortium 5% — the same ordering and the same verdict, so the conclusion does not turn on
the choice.

## Lead 1 — Biomass income. Survives, halved, and is itself a chair reading

| | Single seating | Pooled |
| --- | --- | --- |
| Directorate | 16.5/min | 12.2/min |
| Commune | 4.4/min | 6.2/min |
| Consortium | 3.2/min | 2.7/min |
| Knights | 1.0/min | 1.1/min |

The Directorate still earns twice the next navy's Biomass and is still the only navy whose
roster is priced deep in the account ([systems-flora.md](../../../docs/systems-flora.md) §6),
so the lead is real. But the ratio falls from 3.8x to 2.0x, and the reason is that the
Directorate's own Biomass income is chair-dependent:

| Directorate in | Biomass | Win rate |
| --- | --- | --- |
| slot 2 | 16.5/min | 75% (n=20) |
| slot 3 | 13.9/min | 31% (n=16) |
| slot 0 | 11.0/min | 80% (n=5) |
| slot 1 | 7.5/min | 50% (n=8) |

**The two do not track each other.** Read only the two seatings with a rail-legal sample:
moving the Directorate from slot 2 to slot 3 costs it 44 points of win rate and 2.6 of
Biomass per minute. A win rate that swings by forty-four points on an account that swings by
sixteen percent of itself is not being driven by that account, and the two chairs that break
the ordering outright — slot 0 wins most on the second-lowest income, slot 1 wins more than
slot 3 on the lowest — say the same thing from the other side, at samples too small to rule.

So the lead is downgraded rather than killed: Biomass is where this navy's advantage is
*priced*, and it is not what makes the chair worth what the chair is worth.

## Lead 2 — Depth. Survives, narrower

Share of hull-time under the thermocline: Directorate 11%, Knights 8%, Consortium 4%,
Commune 1%. Still the deepest navy of the four, down from 15% on the single seating. Per
chair the Directorate reads 15% / 8% / 11% / 11% against win rates of 75% / 50% / 80% / 31%,
which is the same non-correspondence Biomass shows.

Being unheard and being ahead are the same fact in this game
([systems-echo.md](../../../docs/systems-echo.md)), so depth remains the lead that is hardest
to separate from simply winning — a navy that is winning can afford to be deep. Nothing here
separates them, and nothing here needed to.

## Lead 3 — Losses. Dead

The issue's reading was "they trade well — fewer hulls lost per match than the Commune, by a
wide margin". Pooled, that is true and it is not the fact it looked like:

| | Losses per match | Win rate |
| --- | --- | --- |
| Knights | 15.0 | 31% |
| Consortium | 19.3 | 2% |
| Directorate | 27.9 | 57% |
| Commune | 37.7 | 10% |

Losses do not order with the win rate in either direction. The navy that trades best is the
Knights, and it wins at half the Directorate's rate; the Directorate loses nearly twice what
the Knights lose and wins nearly twice as often. Across the Directorate's own four chairs its
losses barely move at all — 24.4 / 34.0 / 28.3 / 25.1 — against a win rate spanning 31% to
80%.

The Commune comparison the lead rested on is the Commune's problem, not the Directorate's
advantage: 37.7 hulls a match at a 10% win rate is a navy feeding hulls into the water, and
it belongs to whatever issue is opened about the Commune rather than to this one.

## Lead 4 — The commander. Still open, and narrowed

`seat-rotation.md` established that the chair effect is not the commander: it survives with
one doctrine in all four seats and one commander playing all four, and with fauna off the
same mirror draws. That rules the commander out as the cause of the *chair* spread. It does
not touch the question the lead actually asks, which is whether the residual 57% is a
doctrine that is stronger or an AI that plays the Directorate better than it plays the other
three.

Nothing in this batch can answer that — every seat in the harness is an AI, which is the
limitation §9 states about itself. What has changed is the size of the thing to be explained:
seven points over the bar rather than twenty-five, on 49 decided matches.

## What this leaves

Reading the four leads together: **the account the Directorate's advantage is priced in is
not the account that varies when its win rate varies.** Biomass, depth and losses all move
far less across the four chairs than the win rate does, and losses do not even order with it
across navies. So the residual seven points are not obviously attributable to any of the
three measured accounts, and tuning one of them would be tuning the thing that is easiest to
see rather than the thing that is doing the work.

Three things follow, and none of them is a tuning decision this file is entitled to make.

**A before/after on the Biomass account still cannot be run through the harness.** The
constants live under `FLORA`, which is not in `cli.ts`'s allowlist of tunable roots, and the
two that would matter — `FULL_CROP_BIOMASS` and `REACTOR_BIOMASS_PER_MIN` — are tagged
**SPEC**. The allowlist is per-root and exists precisely to keep SPEC numbers out of it, so
making the override runnable is a documentation change to
[economy.md](../../../docs/economy.md) first and a code change second.

**The Consortium is the more robust finding on this table.** 2% pooled, one win in 49, and
0% in three of the four seatings. That is worse than the Directorate's lead is good, and it
is steadier under the seating than the Directorate's lead is. §9 has a rail for a navy that
runs away and none for a navy that never arrives.

**Seventy-one of the 120 matches timed out.** The pooled sample is 49 decided out of 120, and
per seating it is 20, 8, 5 and 16 — two of the four below the ten a rail may rule on. Whether
that is the cap, the concession rule, or four commanders that cannot finish each other is a
separate question from this one, and it bounds how sharp any answer here can be.

Related: [README.md](../README.md) · [seat-rotation.md](seat-rotation.md) ·
[four-faction-rotated.md](four-faction-rotated.md) ·
[four-faction-baseline.md](four-faction-baseline.md) ·
[economy.md](../../../docs/economy.md) §9
