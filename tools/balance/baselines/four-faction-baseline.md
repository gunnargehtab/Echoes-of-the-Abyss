# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 5 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 60% vs best rival 20%, premium 3.1 vs 3.8 (n=5) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 739 s tracked per match, win 20% (n=5) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.8/min, Drift Health median 33 (n=5) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron win rate, bucketed either side of the median match length | short 0%, long 0% (median 1500 s); income 45/min vs field 171 | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 93 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (934–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 93 (76–104) |
| Drift Health at the end | 33 (27–41) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 20% | 162 | 0.1 | 43 | 739 | 10.4 | 98% |
| Commune | 10 | 60% | 182 | 0.1 | 58 | 1071 | 15.4 | 89% |
| Directorate | 10 | 20% | 170 | 0.8 | 59 | 1103 | 23.2 | 83% |
| Knights | 10 | 0% | 45 | 0.0 | 63 | 1107 | 2.2 | 86% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
