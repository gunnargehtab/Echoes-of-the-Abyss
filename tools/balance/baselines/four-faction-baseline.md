# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out /home/user/Echoes-of-the-Abyss/tools/balance/baselines/four-faction-baseline.md
```

10 matches on `ventfront-divide`, seeds 4000–4009. 9 ended without a winner inside the time budget.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 100% vs best rival 0%, premium 1.6 vs 3.3 (n=1) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 857 s tracked per match, win 0% (n=1) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.1/min, Drift Health median 56 (n=1) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 63 s (n=10) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (1500–1500) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (24–26) |
| First blood, seconds | 63 (60–83) |
| Drift Health at the end | 56 (45–73) |

## Per faction

| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 10 | 0% | 90 | 0.2 | 45 | 857 | 23.5 | 96% | 0% |
| Commune | 10 | 100% | 68 | 0.2 | 42 | 804 | 30.7 | 47% | 0% |
| Directorate | 10 | 0% | 127 | 0.1 | 64 | 1051 | 42.7 | 42% | 0% |
| Knights | 10 | 0% | 163 | 0.1 | 50 | 987 | 33.9 | 98% | 0% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
