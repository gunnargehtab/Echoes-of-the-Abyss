# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 3 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 4% vs best rival 44%, premium 4.0 vs 4.5 (n=27 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 553 s tracked per match, win 15% (n=27 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.3/min, Drift Health median 20 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 156/min vs field 178 — 88% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1084 (794–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 20 (15–28) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 27 | 15% | 179 | 0.3 | 40 | 553 | 0% | 21.6 | 100% | 0% |
| Commune | 30 | 27 | 4% | 198 | 0.1 | 49 | 666 | 2% | 47.6 | 50% | 0% |
| Directorate | 30 | 27 | 37% | 207 | 0.3 | 56 | 797 | 0% | 47.6 | 100% | 7% |
| Knights | 30 | 27 | 44% | 172 | 0.2 | 59 | 746 | 0% | 20.9 | 100% | 8% |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
