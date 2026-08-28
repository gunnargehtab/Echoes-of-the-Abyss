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
  --set HARVEST_THROTTLE.Overburden.cargoMultiplier=1.0 \
  --out tools/balance/baselines/my-question.md

node tools/balance/run.mjs --help
```

| Checklist item | Where it lands |
| --- | --- |
| Scenario name and seed; map, biome, PF | Report header — map id and every seed used |
| Participants: faction, difficulty | `--matchup`, echoed per faction in the report |
| N ≥ 10 runs per scenario | `--matches`, defaulting to 10 |
| N ≥ 10 *decided* matches before a win rate is read | Enforced — the two win-rate guard-rails report "no data" below it, and the per-faction table prints the decided count |
| Detection events aggregated | First contact, first classified enemy, seconds tracked |
| Losses | Per-faction hull losses, and a per-kind ledger in the JSON |
| Resource delta | Nodules, crystal and Biomass per minute, measured as gross income |
| Echo mark usage | Drift Health at the end; residue reads via the JSON series |
| Depth-time distribution | Hull-seconds per depth band, as a share below the Shelf |
| Match length | Median and p10–p90, plus how many hit the time cap |
| How close a draw came | Commanders eliminated per match, against the number a win needs |
| The four economy guard-rails (§9) | A verdict row each, with the number that produced it |
| The fauna guard-rails (bestiary §8) | First blood against first classified enemy |

Output is Markdown so a constant change can be justified in a pull request with a diff
rather than an assertion, and a JSON sibling carries the raw series for plotting.

**Three properties to know before trusting a batch.**

The seed reaches exactly one thing in the simulation: where the Drift is placed. Terrain is
authored, hazard timings come from site positions, combat rolls nothing, and the AI draws no
dice. So `--no-fauna` makes the seed inert and ten runs are one match ten times; the harness
warns and marks the report when that happens.

A verdict of "held" means the failure that guard-rail names did not appear in these runs. It
is evidence, not proof, and the sample size is printed beside it.

A win rate counts *decided* matches, and most batches are short of them. Two of the
guard-rails read win rates, and a win rate is a ratio over matches that ended with a winner
rather than over matches run — so a thirty-match batch in which twenty-nine hit the time cap
carries **one** decided match, and the faction that won it reads 100% while the other three
read 0%. Both rails therefore refuse to rule below ten decided matches and say so in their
reading (`n=1 decided, needs 10`), the per-faction table prints the denominator in a column
of its own, and a win rate over no decided matches at all prints as `—` rather than as `0%`.

**A draw is not one thing, so read the eliminations row beside it.** A win is the last
commander standing, which is one elimination in a duel and *three* in a four-seat
free-for-all — so the same game resolves at very different rates depending only on how many
seats are at the table. That makes a draw rate on its own unreadable: a batch where nobody
was ever seriously hurt and a batch where all but one commander went down and the clock beat
the last kill both print 100% draws. `Commanders eliminated, of N needed` is the column that
separates them, and it is the first thing to look at when a batch reports no winners.

## A worked example — is Overburden a trap option?

`HARVEST_THROTTLE[Overburden]` hauls a 1.4x load for 68 SIG against Standard's 1.0 at 45.
Whether that trade is worth taking is the kind of question the guard-rail tables raise and
nobody could previously answer. So:

```bash
node tools/balance/run.mjs --matchup consortium,commune --matches 10 --seed 7000   --max-minutes 25 --out tools/balance/baselines/overburden-before.md
node tools/balance/run.mjs --matchup consortium,commune --matches 10 --seed 7000   --max-minutes 25 --set HARVEST_THROTTLE.Overburden.cargoMultiplier=1.0   --out tools/balance/baselines/overburden-after.md
```

The Consortium is the faction whose doctrine harvests on Overburden; the Commune does not.

| | Consortium income | Consortium win rate | Consortium tracked | Match length |
| --- | --- | --- | --- | --- |
| Cargo 1.4 | 214 nodules/min | 40% (4 of 10 decided) | 659 s | 564 s |
| Cargo 1.0 | 140 nodules/min | 63% (5 of 8 decided) | 642 s | 507 s |

**What this supports.** The constant reaches the economy exactly where it should and with the
magnitude it should: removing the premium cut the income of the faction that uses it by 35%,
and left the faction that does not alone (104 to 103). That is the causal chain working end
to end, and it is what makes the tool trustworthy for the next question.

**What this does not support.** The win rate moved from 40% to 63%, which is four wins
against five across ten and eight decided matches. That is well inside binomial noise at this
sample size, and reading it as "Overburden is a trap" would be exactly the mistake this
harness exists to prevent. The suggestive part is that a 35% income *cut* did not hurt and
may have helped — but suggestive is the correct word, and settling it needs a larger batch,
more matchups, and ideally a Consortium mirror where the throttle is the only variable.

**Read the guard-rail column, not just the verdict.** "Loud economies are unplayable" read
**breached** at cargo 1.4 and **held** at 1.0 when these two reports were taken. The rule
fires when the Consortium is *both* tracked the most and winning the least, and at 1.4 it
leads the tracked column by eighteen seconds — 659 s against the Commune's 641 s — while
winning 40% against 60%. Eighteen seconds out of six hundred is a tie, and four wins against
six is a coin. So the verdict was resting on both halves of an AND that this sample cannot
separate. The numbers are the reading; the word beside them is a tripwire, and that one was
set finer than the measurement that feeds it.

The harness now enforces that itself. A rail that reads a win rate refuses to rule below ten
decided matches, so the cargo-1.0 run — five wins across eight decided matches — would read
**no data** rather than **held** if it were taken today. Both reports here predate the floor
and are left as they were run; regenerate either with the command in its header to see the
current verdict column.

**A property this experiment found, and the bug it turned into.** The multiplier used to
scale the *fill rate*, and against the fill rate it barely reached the economy at all: a hold
capped at 50 a trip either way and a round trip is dominated by travel, so tripling it in a
three-minute match produced *byte-identical* income. The 40% swing above was real but
second-order, arriving through expansion over a full match rather than through the trip the
lever is attached to — which meant Overburden earned what Standard earned for 23 more SIG.
The multiplier now scales the load itself ([economy.md](economy.md) §3), so it bites on the
first trip and a short match measures it. The harness found that, which is what it is for.

Both reports are committed under `tools/balance/baselines/`, each with the command that
produced it in its header.

## A second worked example — what is the AI's quiet actually buying?

The change above made the throttle a real lever, and immediately made a second question
answerable. `AiCommander` dropped its harvesters to Trickle whenever anything held a bearing
on it, and held them there for as long as that stayed true. While the multiplier scaled the
cut rate that reflex cost a few per cent. Once it scaled the load it cost 54% of an economy,
and nothing in the loop asked whether that was worth it ([tech-stack.md](tech-stack.md), "it
decides for itself whether being heard is worth paying to stop").

The commander now waits for a bearing to be *held* for its doctrine's own number of seconds,
treats a lapse shorter than one ping's reveal as a blink rather than a break, and ends a
spell of quiet after ninety seconds on the grounds that a bearing which survived two harvest
round trips is not being held by the harvesters. Thirty matches each side, same seeds, same
map, same harness — the two trees differ in `ai/commander.ts` and `ai/doctrine.ts` and in
nothing else:

```bash
# Before: run against main with those two files reverted to the reflex.
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30   --seed 4000 --max-minutes 25 --out tools/balance/baselines/exposure-hold-before.md
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30   --seed 4000 --max-minutes 25 --out tools/balance/baselines/four-faction-baseline.md
```

The Commune and the Directorate are the two navies whose doctrine drops. The Consortium and
the Knights never do, and are the control:

| Faction | Throttled down | Nodules/min | Tracked, s |
| --- | --- | --- | --- |
| Commune | 91% → **68%** | 55 → **67** | 739 → 722 |
| Directorate | 78% → **58%** | 114 → **125** | 1104 → 1108 |
| Consortium | 0% → 0% | 130 → 131 | 1110 → 1039 |
| Knights | 0% → 0% | 182 → 177 | 1065 → 1053 |

**What this supports.** The income the reflex was spending comes back — 22% for the Commune,
10% for the Directorate — and the two navies that never throttle down do not move, which is
the causal chain landing where it should. The interesting column is the third one. Tracked
seconds were expected to *rise*: the whole trade is income for exposure, and buying less
quiet should cost more of it. They did not move at all (739 → 722, 1,104 → 1,108). Read
together with the first column, that says the fifth of an economy those commanders were
handing over bought them nothing measurable — which is exactly the claim the ninety-second
cap is built on. Exposure is a fact about the whole force, and a bearing held on a Bastion or
a rallied army is not something a harvest throttle can quiet.

**What this does not support.** Anything about win rates, and the sample size is not why.
Twenty-nine of the thirty after-matches and twenty-seven of the thirty before-matches ended
without a winner inside the cap, so the column rests on one and three decided matches
respectively. **N ≥ 30 is necessary and not sufficient here**: on this matchup and this cap,
running more matches buys more draws. Deciding a win rate for these four wants a shorter cap,
a smaller matchup, or both — and it is worth saying plainly that the four-faction baseline
has never been a win-rate instrument. It is an income and exposure instrument.

It also says nothing about whether Trickle is the right *depth* of drop. The exposed throttle
was deliberately left alone: moving the trigger and the price in one batch would leave
neither of them measured. That is the next question, and it now has a column to be argued in.

**A column that had to be added first.** None of the above was visible before this batch.
Income and tracked seconds are consequences, and two very different policies — never
dropping, and dropping for most of a match at 46% of the income — can land on similar income
if the second also fields fewer haulers. The harness now integrates harvester-time spent
below Standard and reports it as **Throttled down**, which is the lever itself rather than
its effects. The precedent is `hullSecondsByZone`: a baseline that cannot see a mechanic will
report confidently on matches that never exercised it.

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
