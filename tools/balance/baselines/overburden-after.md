# Overburden variant (yield 1.0)

```bash
node tools/balance/run.mjs --matchup consortium,commune --matches 10 --seed 7000 --max-minutes 25 --set HARVEST_THROTTLE.Overburden.yieldMultiplier=1.0 --title 'Overburden variant (yield 1.0)' --out tools/balance/baselines/overburden-after.md
```

10 matches on `ventfront-divide`, seeds 7000–7009. 2 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 50% vs best rival 50%, premium 3.6 vs 2.3 (n=8) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 765 s tracked per match, win 50% (n=8) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Requires a Directorate seat | no Directorate seat in this matchup | **no data** |
| Knights starve out of every long game | economy.md §9 | Requires a Hadron seat | no Hadron seat in this matchup | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 102 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 800 (376–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 102 (77–118) |
| Drift Health at the end | 67 (61–71) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 50% | 157 | 0.1 | 69 | 765 | 3.6 | 98% |
| Commune | 10 | 50% | 242 | 0.4 | 67 | 769 | 14.6 | 84% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._

**Overrides applied:** `HARVEST_THROTTLE.Overburden.yieldMultiplier: 1.4 -> 1`
