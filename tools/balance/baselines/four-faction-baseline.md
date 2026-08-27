# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 10 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 0%, premium 1.7 vs 3.2 (n=0 decided, needs 10) | **no data** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 1009 s tracked per match, win 0% (n=0 decided, needs 10) | **no data** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.1/min, Drift Health median 45 (n=10) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 51 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (1500–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 51 (50–65) |
| Drift Health at the end | 45 (41–56) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 0 | — | 121 | 0.1 | 52 | 1009 | 0% | 26.7 | 100% | 0% |
| Commune | 10 | 0 | — | 61 | 0.1 | 35 | 681 | 69% | 27.2 | 48% | 0% |
| Directorate | 10 | 0 | — | 125 | 0.1 | 64 | 1207 | 60% | 54.2 | 98% | 0% |
| Knights | 10 | 0 | — | 179 | 0.0 | 55 | 1134 | 0% | 34.2 | 99% | 0% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
