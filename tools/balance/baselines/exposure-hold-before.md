# Exposure hold — before

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Exposure hold — before' --out /home/user/Echoes-of-the-Abyss/tools/balance/baselines/exposure-hold-before.md
```

> **Read the command above with this caveat.** It is what the harness was run with, and it
> is what produced these numbers — but only against the tree this batch was run on, which is
> `main` with `packages/backend/src/ai/commander.ts` and `packages/backend/src/ai/doctrine.ts`
> reverted to commit `c55c8a1`, the last one before the exposure watch of issue #148. Running
> it today gives the *after* numbers, which live in `four-faction-baseline.md`. Everything
> else — the map, the harness, the telemetry — is identical between the two, so the pair
> differs in the commander and in nothing else.

30 matches on `ventfront-divide`, seeds 4000–4029. 27 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 100%, premium 1.4 vs 3.2 (n=3) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 1110 s tracked per match, win 0% (n=3) | **breached** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.1/min, Drift Health median 46 (n=3) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 51 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (1500–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 51 (50–55) |
| Drift Health at the end | 46 (37–57) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 0% | 130 | 0.1 | 59 | 1110 | 0% | 29.4 | 99% | 0% |
| Commune | 30 | 0% | 55 | 0.1 | 39 | 739 | 91% | 30.0 | 46% | 0% |
| Directorate | 30 | 100% | 114 | 0.1 | 64 | 1104 | 78% | 44.4 | 97% | 0% |
| Knights | 30 | 0% | 182 | 0.0 | 57 | 1065 | 0% | 34.6 | 100% | 0% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
