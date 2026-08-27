# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 29 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 100% vs best rival 0%, premium 1.8 vs 3.3 (n=1 decided, needs 10) | **no data** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 1039 s tracked per match, win 0% (n=1 decided, needs 10) | **no data** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.1/min, Drift Health median 44 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 51 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (1500–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 51 (50–54) |
| Drift Health at the end | 44 (37–52) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 1 | 0% | 131 | 0.1 | 57 | 1039 | 0% | 28.0 | 100% | 0% |
| Commune | 30 | 1 | 100% | 67 | 0.1 | 38 | 722 | 68% | 31.1 | 49% | 0% |
| Directorate | 30 | 1 | 0% | 125 | 0.1 | 62 | 1108 | 58% | 53.8 | 97% | 0% |
| Knights | 30 | 1 | 0% | 177 | 0.1 | 54 | 1053 | 0% | 33.8 | 100% | 1% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
