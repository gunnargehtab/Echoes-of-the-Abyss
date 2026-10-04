# Competitive Play — the Ladder, Accounts, Teams and the Spectator

Rated play, specified: the maps a ladder draws on, the rating it keeps, the accounts that
hold it, the rules a team plays by, what a player may see after a match, and how anybody
watches one. **Designed, and nothing here is built.** Every figure below is design intent
for a prototype to be argued with ([README.md](README.md), editing rule 2), and each
number that becomes a constant arrives TUNABLE unless a section says otherwise.

One rule binds every part of it, and it is the rule the rest of the bible already lives
by. **Nothing a competitive feature shows anybody may exceed what the Echo Layer resolved
for someone entitled to it.** A ladder, a result page and a spectator are three new
clients of the same hidden information, and a client handed what nobody resolved is a
maphack whatever it draws ([tech-stack.md](tech-stack.md), "Echo Layer Implementation
Notes").

This document says **spectator** for a person watching a match. *Observer* already names
something: every slot the Echo pass resolves for, a mission's scripted parties included
(`EchoLayer.run`, #323). One word doing both jobs would let a sentence about a watcher be
read as a sentence about the pass ([glossary.md](glossary.md), *Spectator*).

---

## 1. What exists today

Read off the code at the commit this document landed in, because every section below is
a change to one of these rows.

| Piece | Today |
| --- | --- |
| Finding a match | Quick match (`joinOrCreate`, filtered by map and mission), the room browser, and a room code ([tech-stack.md](tech-stack.md), "Finding a match"). A pug-lobby model: no queue, no rating |
| Seats | A skirmish room seats up to the map's spawn count, four at most. AI seats are added from the ready room (`addAi`) |
| Spawns | Slot *n* takes spawn *n*, and slots are allocated lowest-free. So the first two commanders into a four-spawn room take its first two spawns |
| Victory | Free-for-all: the last slot standing wins (`Match.resolveVictory`). There are no teams; "allied" in the code means *your own* |
| Maps | Three archetypes in the public catalogue — the Ventfront Divide and the Kelp Labyrinth with four spawns, the Abyssal Rift Corridor with two ([maps.md](maps.md), "Scaffold Status") |
| Identity | None. A commander name is typed per match. No auth code, no persistence code; PostgreSQL and Redis are planned and absent ([tech-stack.md](tech-stack.md), "Backend"). The campaign record is `localStorage` ([campaign.md](campaign.md) §11) |
| Result | One fact: who won. The contact log stays on screen behind it ([tech-stack.md](tech-stack.md), "The result, and the rematch") |
| Spectators | None. A started room is locked, so nobody can join one ([tech-stack.md](tech-stack.md), "Spectators") |
| Replay | Map, seed, roster and every command attempt, with checkpoints a re-run is held to (`sim/replay.ts`). Not stored anywhere a match outlives |

Two of those rows bite harder than they look. The spawn rule means a duel on the Ventfront Divide —
every match of the committed duel matrix
([duel-matrix.md](../tools/balance/baselines/duel-matrix.md)) included — seats both
commanders in the north-west and north-east corners, **on the same side of the vent
line** the map exists to put between them. And on the Kelp Labyrinth it seats them
diagonally, every time. Either way, a player who has played the map once knows where the
other Bastion is.

---

## 2. The 1v1 map pool

### What admits a map

A map enters the rated pool when all three hold:

1. **It is built, and it is an archetype.** It is in the public catalogue (`MAPS`), not a
   mission map: a mission map is authored for one seat and answers to its mission
   ([maps.md](maps.md), "Mission maps").
2. **It is symmetric under every pairing it draws.** For each pair of spawns the draw below
   can seat, some symmetry of the map — a mirror or a half turn — swaps the two seats. The
   map tests already hold all three archetypes cell for cell: both mirrors on the Ventfront
   Divide and the Kelp Labyrinth, a half turn on the Corridor. A pairing no symmetry swaps
   is not drawn.
3. **Its drawn pairings are measured, seat-rotated.** The balance harness plays every
   pairing the draw can produce, each way round, before the map is rated. This is a
   measurement and not a target: the freeze in `CLAUDE.md` still decides what may be done
   about a reading. It is a precondition because a rating cannot tell a skilled commander
   from a good chair, and on the Ventfront Divide the chair has already been measured
   outweighing the navy ([economy.md](economy.md) §9).

Three maps is the floor. Below it a ladder is a map, and a player who learns one map's
opening has learned the ladder.

### The pool

| Map | Spawns | Pairings drawn | The argument it makes |
| --- | --- | --- | --- |
| The Abyssal Rift Corridor | 2 | Its one pairing, ends drawn | A PF 1.6 highway with no secrets down its length |
| The Ventfront Divide | 4 | The four across the vent line: straight across, or diagonal | A masked middle at PF 0.45 with loud flanks |
| The Kelp Labyrinth | 4 | All six | Broken sightlines: kelp destroys your sense of distance |

The three span the PropagationFactor range, which is why they were the three built
([maps.md](maps.md), "Scaffold Status"): one map where everything carries, one where the
contested ground is the deaf ground, and one where nothing reads true. A ladder over
fewer arguments would rate a narrower game.

The Kelp Labyrinth's *Ideal Use* reads "four-seat skirmish", and it stays the four-seat
map it was built as. It is in the duel pool because its maze is one quadrant mirrored
into four ([maps.md](maps.md), Map Type 2), so every one of its six pairings is fair by
construction. The Fourfold Frontier is the fourth candidate, once it is built and admitted.

### The spawn draw

**A rated match draws its spawns from the match seed.** On a four-spawn map, the two
commanders are seated on a pairing drawn from the table above, and each knows only their
own spawn.

That is the whole point of a four-spawn duel map, and it is an argument about sound. The
win condition is the oldest in the genre, and "the whole match is a conversation about
where it is and who has heard it" ([game-identity.md](game-identity.md), "Match
Structure"). A spawn the slot rule fixes ends that conversation before it starts. Drawn,
the opponent's Bastion is in one of two places on the Ventfront Divide and one of three
in the Labyrinth, and the first thing a commander does is listen for which.

The Ventfront draws only across the vent line. A same-side pairing never has to cross
PF 0.45 water to reach the other Bastion, and that water is the map. The Corridor's draw
decides only which end a commander starts at; its argument was always that there is
nothing to find.

The draw is deterministic in the seed, so a replay reproduces it without recording it,
and the spawn list stays server-side as it is today: a client holding spawn positions
before a match would hold information it has not earned (`packages/shared/src/maps.ts`).

### Choosing the map

Each player sets **one veto** in their queue settings. The match is drawn, from the seed,
among the maps neither vetoed. With three maps that is one map when the vetoes differ and
a draw between two when they agree. No veto is shown to the other player.

---

## 3. The ladder

### What is rated

**One mode: 1v1.** Team play is specified in §5 and is unrated until its own pool reaches
three built maps — today it has one. Four-seat free-for-all stays unrated: a four-way
result rates a commander partly on what two others did to each other, and §7 shows why a
free-for-all is also the one match a spectator cannot watch safely.

AI seats are refused in a rated room. A rated result is a statement about two people.

### One rating per navy

**An account holds four ratings, one per navy, and no aggregate.** The four navies are
four answers to one problem ([factions.md](factions.md)), and a commander who has mastered
the Commune's patience has not thereby learned the Consortium's way of being found and
surviving it. A single rating would charge a player's Commune record for their first
Consortium matches, and drive anyone serious onto one navy.

The rating is **Glicko-2**, at the algorithm's published starting values. Its deviation is
the reason: four ratings per player means some will be played rarely, and a rating that
knows how sure it is moves a rarely played navy fast and a settled one slowly. Elo has no
such term. Team-oriented systems are built for a mode this ladder does not rate yet; when
team play is rated, this document picks one.

The **leaderboard is per navy**, and the figure it shows is the conservative one — rating
less twice the deviation — so a lucky run of placement matches does not top it. A rating
with deviation above 110 is shown as *provisional*.

### Queueing, and the navy you bring

A player queues **with a navy chosen before the queue**, blind. Nobody picks after seeing
the other's: the lobby listing already refuses to name navies for this reason, because
naming them would let an arrival counter-pick a match before joining it
([tech-stack.md](tech-stack.md), "Finding a match").

**The matchmaker never pairs two commanders of one navy.** The room refuses a duplicate
navy (`canChooseFaction`), and that refusal stays: the four navies are four answers to
noise, and the asymmetry axis is what a duel in this game tests. With four navies,
three in four random pairings are already legal, so the cost is a little queue time.

The search starts at ±100 rating and widens by 50 every 30 seconds. A match found is
offered to both players for 20 seconds. Letting it lapse or declining costs no rating and
a one-minute queue cooldown, doubling with each decline inside an hour.

Once both accept, the navies and names are public to both, as they are in every room
today: `PlayerState.faction` is public on purpose, because everyone knows who they are
playing.

### The rated room

The matchmaker creates the room **private and locked**, with both seats reserved, so it
is in no listing and no arrival can reach it. Everything else is the match lifecycle that
already exists: the 90-second reconnection grace, a resignation for walking out or running
out of grace, scuttling read off the simulation, and the delayed-maphack rule on the
result ([tech-stack.md](tech-stack.md), "Match lifecycle").

**There is no rematch.** Ready doubles as a rematch vote in a skirmish room; in a rated
one it does nothing, and the room closes at the result. Two accounts that could rematch
each other indefinitely could trade rating between them.

### How a rated match ends

A Bastion falls, a commander scuttles, or a commander resigns: the rules
[game-identity.md](game-identity.md) already states, unchanged.

**A rated match still undecided at 60 minutes of match time is a draw.** The committed
duel matrix plays every match on a 25-minute cap and decides most of them inside it, so an
hour is a match that has stopped moving rather than a slow one. It is a draw and not a
tiebreak, because every tiebreak is a score — kills, income, ground held — and every score
of the other side is a post-match report: the delayed maphack the result screen exists to
refuse.

### When the ladder opens

The rated queue exists only once the duel matrix, seat-rotated over every drawn pairing
on every pool map, reads inside the one-navy rail ([economy.md](economy.md) §9: no navy
above twice parity of the decided matches). That is a condition on the ladder and not a
target for anybody to tune toward: a rating measures skill only in a game whose navies
win at comparable rates, and against today's readings it would measure navies. Everything
else in this document can be built before then, and played unrated.

---

## 4. Accounts

**An account is for rated play and nothing else.** Solo games, missions, the campaign and
custom rooms stay exactly as anonymous as they are: no sign-in in front of anything that
works without one today. The campaign record stays in `localStorage`
([campaign.md](campaign.md) §11).

**Sign-in is a passkey** (WebAuthn), and the server stores no password. It is the
browser's own mechanism, which suits a game that is a browser tab, and it needs no email
system and no third party. Recovery is a second passkey registered on another device, or
a one-time recovery code shown once, at sign-up.

| An account holds | It never holds |
| --- | --- |
| An id, and a display name, unique, changeable once a month | A password |
| Four ratings: rating, deviation, volatility and games played, per navy | A position, a track, or a contact from any match |
| A record per rated match: date, map, both navies, both display names, the result, its duration, the rating change | Anything about the other commander's economy or losses |
| Queue settings: the navy, the veto, and the broadcast consent of §7 | The replay itself |

Storage is the stack [tech-stack.md](tech-stack.md) already names: PostgreSQL for the
accounts and records, Redis for the queue.

**A display name is never in a listing.** A listing names the water and the seat count and
nothing else ([tech-stack.md](tech-stack.md), "Finding a match"). A name appears in the
room, on the result, on the leaderboard, and in the player's own record.

**A rated match's replay is kept server-side for 30 days**, for disputes and for the pages
§6 and §7 rebuild from it, and is never sent to a client whole. A replay is the match: every
command both commanders gave, from which the whole world can be rebuilt. Handing one to a
player would be handing them the opponent's game.

---

## 5. Team play

### Who is on a side

**The map decides.** A team map authors its spawns as pairs, and allies take a pair.
On the Ventfront Divide that is the north pair against the south pair, with the vent line
between them — which is what the map's own literal already says its two bloom gardens are
for: each sits in a transit gap "shared by a pair, owned by neither". The Crystal
Convergence and the Fourfold Frontier are the archetypes [maps.md](maps.md) names for 2v2,
and neither is built. The Kelp Labyrinth is not a team map: its walls ring the centre
rather than divide the map, so nothing on it makes two corners a side.

Two against two is the only team shape. Four navies seat four commanders, and the room
already refuses a duplicate, so a team is two navies and the match is all four powers.

### A team listens as one side

**A team learns the best tier any listener on it resolved**, exactly as a commander today
learns the best tier any one of their own hulls resolved. The Echo Layer's unit of
knowledge was never the hull; it is the side, and a team is a side with two commanders.
Each commander's snapshot carries the ally's force as allied — positions and hull kinds,
drawn in the ally's ink, never commanded — because the ally knows it, so sharing it hands
nobody anything unresolved.

It costs the pass nothing and saves some. The pruning that keeps the pass inside 2 ms
rejects every listener on a side that already holds a Track
([tech-stack.md](tech-stack.md), "What keeps the pass inside 2 ms"), and two sides prune
harder than four. The entity count does not move: four navies at forty berths each is 160
hulls, which is what a four-seat match fields today.

The alternative was that each commander hears alone, and allies trade what they heard by
marker. That makes 2v2 two duels on one map, and a commander who cannot see a hull the
ally is tracking a kilometre away is confused rather than afraid. The game aims at dread,
not confusion (`CLAUDE.md`).

**The exposure report stays per commander.** "What the rest of the map holds on you"
([ui-ux.md](ui-ux.md) §10) is a fact about your hulls, and an ally's being heard is not.

### What stays a commander's own

Everything the simulation asks about **violence** asks "is this hostile?", and hostile
means *on another team*: targeting, homing, a mine's trigger, an engagement's alert. In a
free-for-all every other slot is a team of one, so the rules read exactly as they do now.

Everything it asks about **ownership** stays "is this mine?": the bank, the production
lines, the berths, the refits, and the auras, which already grant only to their own
commander ("nothing lends a hull's aura away", `sim/systems/auras.ts`).

So **no resource passes between allies, and nobody commands an ally's hull.** A shared
bank would let the Commune's quiet income pay for the Consortium's loud hulls, and the four
economies are the four doctrines ([economy.md](economy.md) §6). A navy that could spend
another's money would be a fifth navy with no doctrine.

### Winning, and scuttling, in teams

**A team is out when every commander on it is out**, and the last team standing wins.
Resignation, the reconnection grace and the Bastion rule are each a commander's and stay
so: a commander who loses their Bastion is eliminated, their force scuttles as it does
today, and their ally fights on alone.

The scuttling test reads its last clause across teams. "Somebody else has the guns and the
money" ([game-identity.md](game-identity.md), "Scuttling") becomes *a commander on another
team*: an ally with a full bank and a fleet is not the position that makes a broke
commander's attrition one-way, since the ally cannot pay for them.

### Talking

**Allies talk; teams do not.** A team has markers on the scope and the world, and a text
line, and both are server state for the reason [ui-ux.md](ui-ux.md) §5 gives: two clients
watching one slot cannot disagree about what was marked. Neither reaches the other team,
which learns nothing from a marker — it is not an emission. Nothing in a match lets one
side address the other: nobody down here is talking
([game-identity.md](game-identity.md), "Scuttling").

---

## 6. The post-game

The rule stands as written: **what you knew, not what was true**
([tech-stack.md](tech-stack.md), "The result, and the rematch"). A report that reveals the
match is a delayed maphack, because the next game on the same ground would be played with
knowledge the last one refused to give. So the post-game grows, and only in one direction:
inward, into the commander's own match.

What every skirmish result adds, rated or not, all of it the commander's own:

- **Your economy** — income per resource per minute, spend, hulls launched and hulls lost.
- **Your loudness** — your force's mean SIG and its loudest hull across the match, with
  the throttle changes and pings marked on it. Pillar 2 is that every advantage has a noise cost; this is the
  bill, itemised.
- **What they held on you** — the exposure history the server already sent live, as tier
  and count over time ([ui-ux.md](ui-ux.md) §10). No bearing and no hull, because none was
  sent.

What a rated result adds besides: the rating change, and **your listening, replayed** — the
match rebuilt from its stored replay on the server and resolved for your side, so you can
scrub through exactly the snapshots you received. It is the honest replay: the contact log
as a film. It is never the world, and never the other side's.

What no post-game shows, rated or not: anything about the other commander's force,
economy or losses that your listeners did not resolve, and anything side by side with the
other commander's pages. Each commander's pages are their own, and no spectator sees
them either.

---

## 7. Spectators

### Four ways to watch, and the one taken

A spectator is a client, so the question is only ever what the spectator is sent.
[tech-stack.md](tech-stack.md), "Spectators", refused the easy answer and named three
others; there is a fourth.

| Option | What a spectator receives | Why not |
| --- | --- | --- |
| The truth, delayed | The world | A broadcast of the truth is the delayed maphack, handed to everyone who watches it — the two commanders first. "A different product" |
| A commander's pane | One commander's snapshot, delayed, switchable | A snapshot carries its commander's own force in full, so two panes are every hull in the water, positions exact: the truth in two halves |
| A neutral array | What map-authored listening stations resolve, as one more observer in the pass, the way a mission's scripted parties listen (#323) | It spends a pass slot against a budget the pass already crosses at about 160 entities, raises every commander's exposure unless carved out, needs authoring per map — and a replay of it shows each commander the other's hulls wherever the array heard them |
| **The heard view** (taken) | What each side resolved of the other, and nothing else | — |

### The heard view

**A spectator sees the match as it was heard: everything one side resolved of the other
side's force, at the tier and the position that side received, and nothing else.**

- Each side's contacts of the other side's hulls, structures and ordnance, in that side's
  ink, carrying the bearing error and scatter that side was sent.
- The public layers every snapshot already carries — hazards and Drift Health — and the
  room's public roster.
- **No commander's own force**, except as the other side heard it. A hull nobody resolved
  is not on the spectator's screen, however close the fight.

Two things a commander does hear are left out, because each can carry one side's position
to the other. **Residue**: a mark names no owner ([systems-echo.md](systems-echo.md) §7),
so a side reading the hum of its own haulers would show the spectator an economy the other
side never heard. **Fauna**: the Drift is drawn to noise ([bestiary.md](bestiary.md)), so a herd a side
hears gathering round its own base marks that base. A side's contacts of the other side's force carry
neither risk, which is why they are the whole of the view.

It is the match's own subject made into a broadcast. The audience watches two commanders
in the dark and sees exactly where each one's hearing ends, which is where every ambush
in this game lives. A quiet commander is as hidden from the audience as from the
opponent, and that is the game being shown rather than a limit on showing it.

### Why it holds in a duel, and not in a free-for-all

A spectator who relays to a player — a *ghost* — can carry only what the heard view
holds. In a two-sided match that is the other side's contacts of you, which are your own
hulls; and your side's contacts of them, which you already have. So the one thing a ghost
can add is **which of your hulls the other side has heard**: the exposure report in more
detail than the tier and count it carries. The delay below makes even that three minutes
old.

In a match of three sides or more, the third side's hearing of the second is news to the
first, and a ghost who passes it on hands over hulls their listener never resolved. **A
free-for-all broadcast is a maphack for whoever the ghost talks to**, and no delay mends a
Bastion, which never moves. A free-for-all can be broadcast only from a custom room, with
every commander's consent, under that warning.

### Behind the match by three minutes

**The broadcast runs 180 seconds behind the match**: [systems-echo.md](systems-echo.md) §7's
three minutes, the longest any mark outlives the event that made it — the residue of a
destroyed structure. By the time the audience hears a thing, the Rift has forgotten it.
In that time the slowest hulls in the roster, the Bulwark and the Freighter at 30 m/s,
cover 5.4 km.

**The present never leaves the match room.** The room holds each side's resolved contacts
in a ring and releases a frame only once it is 900 Echo ticks old — 180 seconds at 5 Hz —
to one **broadcast room**, which serves every spectator. A spectator is never a client of
the match room; a started room is locked, so that is structural today and stays so. The
broadcast room's messages are declared in `wire.ts` like every other
([wire.ts](../packages/shared/src/wire.ts)), and nothing on them goes back to the match.

### Consent

**A match is broadcast only if every commander in it allowed it.** A rated match reads each
account's setting, which is off until its owner turns it on. A custom room carries a
broadcast mark the host sets, shown in the ready room, and readying under it is consent:
ready already means *I am waiting on nobody*, and it is the one answer every commander in
the room has to give.

Consent is needed because the heard view has a price and it falls on the commanders. Watching
their own match afterwards — a rated or broadcast match's replay is kept 30 days, so the
heard view can be served again — each learns which of their hulls the other side heard,
and when. It does not show where the other commander was. It does show what they knew,
which is knowledge the match refused to give, and so the heard view is a delayed maphack
of a narrow kind that a commander may choose to pay.

### What it costs

No second Echo pass, and no change to the one that runs. The contacts the heard view
carries are already resolved, per side, every Echo tick; the match room keeps three
minutes of them and hands one copy to one broadcast room, so the number of spectators
never reaches the match's budget.

Two properties hold it, and both become rows in [invariants.md](invariants.md) when the
broadcast is built, beside the tests that hold them:

- **Watching changes nothing.** A match broadcast and the same match unbroadcast produce
  the same state hash at every checkpoint.
- **A frame carries only what was heard.** Every entity in a broadcast frame belongs to
  one side and was resolved that tick by a listener on another.

---

## 8. What building it changes

In order, because each step is playable unrated before the next exists:

1. **The spawn draw**, for every skirmish room rather than only a rated one, and the
   balance harness taught to seat a drawn pairing, so §2's admission measurement can be
   run at all. Today the harness binds a navy to `spawns[0]` or `spawns[1]` and nothing else
   ([tools/balance/README.md](../tools/balance/README.md)).
2. **Team play in custom rooms** (§5): the hostile predicate, a team as one side of the
   pass, team victory and the scuttling clause, markers and the team line.
3. **The own-side post-game** (§6) for every skirmish match.
4. **Accounts** (§4) and the storage behind them.
5. **The rated queue** (§3): the matchmaker, the rated room, Glicko-2, the time cap, the
   stored replay and the listening replay.
6. **The broadcast room** (§7).

The ladder opens on §3's condition, whatever order these land in.

---

## 9. Considered and set aside

- **Hiding the opponent's navy until a listener classifies one of their hulls.** A Tier-3
  row already names the hull and its faction ([ui-ux.md](ui-ux.md) §10), and finding out
  who you are fighting by ear is on theme. Set aside because the roster says otherwise on
  purpose: everyone knows who they are playing, and a duel's opening is spent finding the
  Bastion, not the doctrine.
- **Mirror matches.** The room refuses them, and the refusal is the asymmetry pillar
  working: a mirror is a duel the game was not designed to stage.
- **One rating per account.** §3.
- **A free-for-all ladder.** §3 and §7.
- **A score at the time cap.** Every score of the other side is a post-match report.
- **Shared resources or shared control between allies.** §5.
- **Allied listening by acoustic relay** — a data link between allies that is itself an
  emission, so sharing what you heard costs noise. On both pillars at once, and it is a
  mechanic rather than a mode rule: it belongs in [systems-echo.md](systems-echo.md) first,
  and team play can adopt it there.
- **Talking to the other team** in a match. Nobody down here is talking.

---

## Related

[tech-stack.md](tech-stack.md) (the match lifecycle this extends, and the Echo pass budget)
· [maps.md](maps.md) (the archetypes and their symmetry) ·
[game-identity.md](game-identity.md) (the win condition and scuttling) ·
[economy.md](economy.md) §9 (the rail the ladder waits on) ·
[systems-echo.md](systems-echo.md) (tiers and residue) · [ui-ux.md](ui-ux.md) (§5 markers,
§10 the contact log, §14 the shell) · [campaign.md](campaign.md) §11 (the record that
stays local) · [ROADMAP.md](ROADMAP.md) (Later, "Competitive play")
