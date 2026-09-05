# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 22 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 88%, premium 3.9 vs 4.7 (n=8 decided, needs 10) | **no data** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 784 s tracked per match, win 0% (n=8 decided, needs 10) | **no data** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.1/min, Drift Health median 29 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 51 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (1239–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 51 (50–52) |
| Drift Health at the end | 29 (21–35) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 8 | 0% | 202 | 0.2 | 43 | 784 | 0% | 29.3 | 100% | 0% |
| Commune | 30 | 8 | 0% | 113 | 0.2 | 29 | 544 | 69% | 30.7 | 63% | 0% |
| Directorate | 30 | 8 | 13% | 135 | 0.1 | 65 | 1122 | 57% | 53.1 | 100% | 1% |
| Knights | 30 | 8 | 88% | 195 | 0.1 | 65 | 1239 | 0% | 32.6 | 100% | 0% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
