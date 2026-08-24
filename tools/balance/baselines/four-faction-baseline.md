# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 5 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 60% vs best rival 20%, premium 3.0 vs 3.9 (n=5) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 725 s tracked per match, win 20% (n=5) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.2/min, Drift Health median 36 (n=5) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron win rate, bucketed either side of the median match length | short 20%, long 0% (median 1500 s); income 65/min vs field 160 | **breached** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 80 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (915–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (25–26) |
| First blood, seconds | 80 (72–91) |
| Drift Health at the end | 36 (30–45) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 20% | 161 | 0.3 | 42 | 725 | 11.2 | 98% |
| Commune | 10 | 60% | 181 | 0.1 | 60 | 1099 | 21.2 | 61% |
| Directorate | 10 | 0% | 137 | 0.2 | 45 | 874 | 38.7 | 60% |
| Knights | 10 | 20% | 65 | 0.1 | 66 | 1161 | 7.4 | 89% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
