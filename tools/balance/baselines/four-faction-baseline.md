# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 6 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 75% vs best rival 25%, premium 2.9 vs 3.2 (n=4) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 1003 s tracked per match, win 0% (n=4) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.3/min, Drift Health median 39 (n=4) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron win rate, bucketed either side of the median match length | short 25%, long 0% (median 1500 s); income 81/min vs field 165 | **breached** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 80 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (998–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 80 (72–91) |
| Drift Health at the end | 39 (27–48) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 0% | 171 | 0.4 | 54 | 1003 | 9.3 | 99% |
| Commune | 10 | 75% | 181 | 0.1 | 62 | 1193 | 24.6 | 63% |
| Directorate | 10 | 0% | 142 | 0.3 | 46 | 883 | 34.4 | 55% |
| Knights | 10 | 25% | 81 | 0.1 | 56 | 1043 | 10.0 | 89% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
