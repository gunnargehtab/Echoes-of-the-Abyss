# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 4 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 50% vs best rival 50%, premium 3.1 vs 3.7 (n=6) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 804 s tracked per match, win 0% (n=6) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.4/min, Drift Health median 28 (n=6) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron win rate, bucketed either side of the median match length | short 50%, long 0% (median 1155 s); income 177/min vs field 165 | **breached** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 80 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1155 (717–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 80 (72–97) |
| Drift Health at the end | 28 (24–46) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 0% | 181 | 0.2 | 49 | 804 | 10.1 | 98% |
| Commune | 10 | 50% | 181 | 0.1 | 59 | 980 | 26.7 | 63% |
| Directorate | 10 | 0% | 132 | 0.4 | 42 | 686 | 31.9 | 58% |
| Knights | 10 | 50% | 177 | 0.1 | 67 | 1077 | 8.6 | 91% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
