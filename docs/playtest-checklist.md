# Playtest Checklist — What the Harness Runs, and What Only a Person Can

This document used to be a thing you read. Most of it is now a thing you run.

The split below is the point of the file. Mixing "measure resource-per-minute over ten
runs" with "does it feel like dread rather than confusion" in one list makes both harder:
the first is arithmetic that a machine should do a hundred times, and the second is a
judgement no amount of telemetry substitutes for. Keeping them apart means a playtest
session spends its scarce human attention on the half that needs it.

## Automated — `tools/balance/run.mjs`

```bash
# Ten matches of a matchup, with the guard-rail table and the distributions.
node tools/balance/run.mjs --matchup consortium,commune --matches 10

# Argue with a TUNABLE constant using before/after numbers.
node tools/balance/run.mjs --matchup consortium,commune --matches 10 \
  --set HARVEST_THROTTLE.Overburden.yieldMultiplier=1.0 \
  --out tools/balance/baselines/my-question.md

node tools/balance/run.mjs --help
```

| Checklist item | Where it lands |
| --- | --- |
| Scenario name and seed; map, biome, PF | Report header — map id and every seed used |
| Participants: faction, difficulty | `--matchup`, echoed per faction in the report |
| N ≥ 10 runs per scenario | `--matches`, defaulting to 10 |
| Detection events aggregated | First contact, first classified enemy, seconds tracked |
| Losses | Per-faction hull losses, and a per-kind ledger in the JSON |
| Resource delta | Nodules, crystal and Biomass per minute, measured as gross income |
| Echo mark usage | Drift Health at the end; residue reads via the JSON series |
| Depth-time distribution | Hull-seconds per depth band, as a share below the Shelf |
| Match length | Median and p10–p90, plus how many hit the time cap |
| The four economy guard-rails (§9) | A verdict row each, with the number that produced it |
| The fauna guard-rails (bestiary §8) | First blood against first classified enemy |

Output is Markdown so a constant change can be justified in a pull request with a diff
rather than an assertion, and a JSON sibling carries the raw series for plotting.

**Two properties to know before trusting a batch.**

The seed reaches exactly one thing in the simulation: where the Drift is placed. Terrain is
authored, hazard timings come from site positions, combat rolls nothing, and the AI draws no
dice. So `--no-fauna` makes the seed inert and ten runs are one match ten times; the harness
warns and marks the report when that happens.

A verdict of "held" means the failure that guard-rail names did not appear in these runs. It
is evidence, not proof, and the sample size is printed beside it.

## A worked example — is Overburden a trap option?

`HARVEST_THROTTLE[Overburden]` pays a 1.4x yield for 68 SIG against Standard's 1.0 at 45.
Whether that trade is worth taking is the kind of question the guard-rail tables raise and
nobody could previously answer. So:

```bash
node tools/balance/run.mjs --matchup consortium,commune --matches 10 --seed 7000   --max-minutes 25 --out tools/balance/baselines/overburden-before.md
node tools/balance/run.mjs --matchup consortium,commune --matches 10 --seed 7000   --max-minutes 25 --set HARVEST_THROTTLE.Overburden.yieldMultiplier=1.0   --out tools/balance/baselines/overburden-after.md
```

The Consortium is the faction whose doctrine harvests on Overburden; the Commune does not.

| | Consortium income | Consortium win rate | Consortium tracked | Match length |
| --- | --- | --- | --- | --- |
| Yield 1.4 | 263 nodules/min | 14% (1 of 7 decided) | 922 s | 1047 s |
| Yield 1.0 | 157 nodules/min | 50% (4 of 8 decided) | 765 s | 800 s |

**What this supports.** The constant reaches the economy exactly where it should and with the
magnitude it should: removing the premium cut the income of the faction that uses it by 40%,
and left the faction that does not alone (220 to 242, inside the noise). That is the causal
chain working end to end, and it is what makes the tool trustworthy for the next question.

**What this does not support.** The win rate moved from 14% to 50%, which is one win against
four across seven and eight decided matches. That is well inside binomial noise at this
sample size, and reading it as "Overburden is a trap" would be exactly the mistake this
harness exists to prevent. The suggestive part is that a 40% income cut did not visibly
*hurt* — but suggestive is the correct word, and settling it needs a larger batch, more
matchups, and ideally a Consortium mirror where the throttle is the only variable.

**A property worth knowing before running the same experiment on a shorter match.** The yield
multiplier sets how fast a hold fills, cargo is capped at 50 a trip, and a round trip is
dominated by travel — so tripling the multiplier in a three-minute match produces
*byte-identical* income, because it saves about three seconds out of forty and never buys a
whole extra delivery. The lever only bites over a long game. That is a real property of the
economy, not an artifact.

Both reports are committed under `tools/balance/baselines/`, each with the command that
produced it in its header.

## Human-only — nothing here can be automated, and none of it should be faked

These are the questions the whole design rests on, and a metric that appeared to answer one
would be worse than no metric at all.

1. **Dread, not confusion.** A Tier-1 smudge should feel like a problem you can reason
   about. If it feels like the interface malfunctioning, the rule is too complicated —
   simplify it rather than explaining it. ([game-identity.md](game-identity.md))
2. **Legibility of the tiers.** Can a player tell Bearing from Classification without
   reading a label? ([ui-ux.md](ui-ux.md) §11)
3. **The mix.** Does the exposure cue land as the loudest thing in the game? Can you tell a
   Consortium reciprocating beat from a Commune breather with your eyes shut?
   ([audio-direction.md](audio-direction.md))
4. **Is a ping a decision?** It should feel expensive every single time. If players ping
   reflexively, the cost is not being felt. ([systems-echo.md](systems-echo.md) §5)
5. **Is a descent a commitment?** Depth should read as a timer, not as a third axis.
   ([systems-depth.md](systems-depth.md))
6. **Throttling as a choice, not a chore.** A player who never touches it should still be
   playing a coherent game. ([economy.md](economy.md) §9)
7. **Faction identity.** After one match, can a player say in a sentence what their navy is
   for? ([factions.md](factions.md))
8. **Does the map argue?** Does the vent line read as the quiet road and the trench as the
   fast loud one, without being told? ([maps.md](maps.md))

Record these as prose against a specific build and seed. A seed makes a felt observation
reproducible, which is the most a human report can offer.

## Capture schema for a manual session

Still useful for hand-run scenarios that the harness does not cover — a scripted ambush, a
one-off unit matchup. Keep CSV for spreadsheet work and JSON for nested events.

- `timestamp, run_id, scenario, seed, actor_id, actor_faction, actor_type, event_type, SIG,
  PF, HYD, distance, tier, position_x, position_y, position_z, hp, resource_delta, note`

```json
{
  "timestamp": "2026-08-15T03:00:00Z",
  "run_id": "run-001",
  "scenario": "Scout-Ambush",
  "seed": 42,
  "actor": { "id": "unit-17", "faction": "Pelagia", "type": "Light Scout" },
  "event_type": "detection",
  "SIG": 12,
  "PF": 0.55,
  "HYD": 30,
  "distance": 380,
  "tier": 2,
  "position": { "x": 123.4, "y": -45.1, "z": 12.0 },
  "hp": 40,
  "resource_delta": 0,
  "note": "first passive bearing"
}
```

Use ISO-8601 timestamps and consistent `run_id` naming (`scenario-YYYYMMDD-001`). Record
audio mix levels when evaluating perception.

## Related

- [tech-stack.md](tech-stack.md) — the harness, the AI it drives, and what the seed varies
- [units.md](units.md) — the playtest plan the scenarios come from
- [economy.md](economy.md) — §9, the guard-rails the harness reports on
- [bestiary.md](bestiary.md) — §8, the fauna guard-rails
- [glossary.md](glossary.md) — authoritative terms (SIG, PF, HYD, PR)
