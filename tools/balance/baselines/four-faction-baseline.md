# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 2 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 13% vs best rival 50%, premium 1.6 vs 2.3 (n=8) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 883 s tracked per match, win 38% (n=8) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.3/min, Drift Health median 35 (n=8) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 108/min vs field 94 — 114% (n=4 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 75 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 950 (686–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 75 (70–97) |
| Drift Health at the end | 35 (32–42) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 38% | 147 | 0.2 | 63 | 883 | 8.0 | 99% |
| Commune | 10 | 13% | 84 | 0.3 | 53 | 808 | 17.6 | 60% |
| Directorate | 10 | 0% | 63 | 0.3 | 38 | 526 | 25.1 | 57% |
| Knights | 10 | 50% | 110 | 0.1 | 68 | 951 | 6.7 | 90% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
