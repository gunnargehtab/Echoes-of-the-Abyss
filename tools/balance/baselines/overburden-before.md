# Overburden baseline (cargo 1.4)

```bash
node tools/balance/run.mjs --matchup consortium,commune --matches 10 --seed 7000 --max-minutes 25 --title 'Overburden baseline (cargo 1.4)' --out tools/balance/baselines/overburden-before.md
```

10 matches on `ventfront-divide`, seeds 7000–7009. 0 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 60% vs best rival 40%, premium 1.6 vs 3.2 (n=10) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 659 s tracked per match, win 40% (n=10) | **breached** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Requires a Directorate seat | no Directorate seat in this matchup | **no data** |
| Knights starve out of every long game | economy.md §9 | Requires a Hadron seat | no Hadron seat in this matchup | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 75 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 564 (364–1434) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 75 (72–96) |
| Drift Health at the end | 63 (62–73) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 40% | 214 | 0.2 | 68 | 659 | 8.1 | 98% |
| Commune | 10 | 60% | 104 | 0.4 | 65 | 641 | 12.6 | 53% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
