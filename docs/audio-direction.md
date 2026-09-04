# Audio Direction — The Mix Is the Fog of War

> [systems-echo.md](systems-echo.md) §9 states it as a requirement: *"Audio mix is the primary channel. A Tier-1 contact should be heard before it is seen."* This document is that requirement, specified.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. Premise

In most games audio is confirmation — the explosion you already saw. Here it is **delivery**. The Echo Layer resolves what each player is allowed to know ([systems-echo.md](systems-echo.md) §4), and the mix is the first place that knowledge arrives. Muting the game does not make it prettier and harder; it makes it a different, worse game, and the design accepts that trade openly by requiring a full visual mirror for accessibility (§11).

Three laws govern everything below.

1. **Audio leads.** Every detection event is audible before it is visible.
2. **Fidelity is honest.** The mix may never sound more certain than the server is. A directionless contact must not be pannable, because panning is a claim about bearing.
3. **Your own noise is audible to you.** Players must *hear* themselves being loud, not read it off a meter and take it on trust.

---

## 2. The Precedence Law

The Echo Layer ticks at **5 Hz** ([tech-stack.md](tech-stack.md)), so a detection can be up to 200 ms old before the client ever learns about it. Within a tick, the ear must beat the eye:

| Event | Timing, relative to snapshot applied |
| --- | --- |
| Contact voice onset | ≤ 30 ms |
| Minimap mark begins to fade in | ≥ 150 ms |
| Minimap mark reaches full opacity | ≥ 400 ms |
| World-space contact mark begins to fade in | ≥ 250 ms |

The fade-in is not decoration; it is the budget that keeps the precedence law true on every machine. A mark that pops instantly races the audio device's own output latency and will sometimes win.

**Failure mode this prevents:** if the eye leads, players stop listening within one match, the mix becomes ambience, and the Echo Layer degrades into a conventional fog-of-war with a nice soundtrack.

---

## 3. Sonifying the Resolution Tiers

Each tier gets a **voice** — a looping or one-shot sound bound to that contact for as long as the contact is tracked, including its 20 s ghost decay ([systems-echo.md](systems-echo.md) §4).

| Tier | Sound | Spatialisation | What it must never do |
| --- | --- | --- | --- |
| **1 — Contact** | A low pressure-thump, 40–90 Hz, irregular period 1.2–2.5 s | **None.** Dead centre, no distance attenuation | Pan. Change pitch with range. Sound like a specific thing |
| **2 — Bearing** | Thump plus a filtered wash | Panned to bearing; low-pass and level track distance | Carry class information in its timbre |
| **3 — Classification** | Drive signature of the unit's family (§8), still lightly veiled | Full azimuth, distance-filtered | Reveal health or exact position |
| **4 — Track** | Full drive loop, cavitation detail, and a single short lock tone on acquisition | Full azimuth and distance, matched to the rendered position | Sustain the lock tone — it fires once |

### Panning is information

This is the rule the whole section exists to protect. Stereo position is the player's ear reporting a bearing, and at Tier 1 the server has not given them one. A Tier-1 voice is therefore **mono, centred, and level-locked**, and it is the only sound in the game with that treatment — which makes it instantly identifiable as *"something is out there and I do not know where."*

### Decay

Ghost markers decay over 20 s. Their voices decay with them: level falls on the same curve as marker alpha, and the loop's period lengthens by up to 40% so a fading contact audibly slows rather than simply thinning. Contacts refreshed by a new detection snap back to full level in 80 ms — the return of a sound that was dying is itself a warning.

---

## 4. Your Own Loudness

The SIG meter ([ui-ux.md](ui-ux.md) §3) is the readout. The **self-noise bed** is the feeling.

| Your peak SIG | Self-noise bed | Effect on the rest of the mix |
| --- | --- | --- |
| 0–15 | Hull creak, distant water movement | World bus open, contacts clearly audible |
| 16–40 | Drive hum enters, low harmonic | Neutral |
| 41–65 | Machinery layer, rhythmic | World bus −3 dB: you are starting to drown yourself out |
| 66–100 | Full plant noise, cavitation, structural rattle | World bus −8 dB, contact band partially masked |

**Being loud makes you deaf.** This is not a simulated hydrophone limitation applied to detection maths — detection is unaffected — it is a mix behaviour that makes the cost of noise felt before it is understood. A player at SIG 80 is, correctly, having trouble hearing.

Silent Running inverts it: the self bus drops **−18 dB** over 600 ms and the world bus opens **+6 dB**. The world gets louder because you got quieter, and the first time a player toggles it the map audibly fills with things that were always there. That moment is the sales pitch for the entire system.

### The Lid — sour exposure

The self bus carries one more fact about your own force, and it is not loudness at all. A hull above 150 m is in the sour water the Salinity Collapse left behind: twenty seconds of grace, then unhealable bleed until it dives back under ([systems-depth.md](systems-depth.md) §2). It is here because the self bus is where facts about *your own* force live — the Lid is not the interface talking, and it is not a detection.

It is three sounds because the mechanic is three states, and the split matters more than the timbres do.

| State | What the mix does | Why |
| --- | --- | --- |
| **Souring** — the grace running | A thin, dry, upper-mid texture ramped in over ~1 s, level rising with the grace **spent** | State, not news. Drifting up into the Lid is heard as the mix changing, not as an alert, and the rise *is* the countdown |
| **The bite** — the grace expiring | One short descending figure on the self rung, 1.5 s | News, and the only transient the Lid gets. It is the moment the ledger opens |
| **Bleeding** — the grace gone | The same texture at full level, pulsing at 0.6 Hz | State again. A pulse rather than a tone, because a bleed is being *paid* — but a soft attack, so it never reads as a fresh event |

**The souring texture claims no precedence rung.** It is bed, and a bed that ducked the contact bus would make the Lid deafen you — the bands above already own "being loud makes you deaf", and sour exposure is not loudness. The player in the Lid is bleeding, not deaf. Only the bite ducks, and it ducks on the ordinary `self` rung, below the exposure strike: being lit is still the loudest thing that can happen to you.

**§11 is already half paid, and the bite pays the rest.** The screen has carried the Lid since Phase 4 — the ribbon's threat hatch, the card's grace countdown, the `SOUR — BLEEDING` line — so the *states* have their visual equivalents. What had none was the moment, and a player looking at a different hull's card would never have learned it happened. The bite therefore writes an own-force row into the contact log ([ui-ux.md](ui-ux.md) §10) naming the hull, exactly as a blow on the plating does. The ear gets one sound for a simultaneous crossing and the log gets a row per hull, which is the one place the two are allowed to differ — see the paragraph below for why.

**It keys to the worst hull in the fleet, like the bed keys to fleet SIG.** Twelve stacked textures would be mud, and the question the bed answers is "is my force in the sour", not "how is hull seven". The bite is per hull, because losing a *particular* hull's grace is news about that hull — but several hulls crossing on the same Echo tick sound once. Six copies of one sound at one instant is not six pieces of news; it is one piece of news at six times the amplitude, which would spend the headroom §12 reserves for exposure.

### How it relates to the crush cue

**There is no crush cue.** `Damaged` fires for violence only and excludes attrition explicitly (§12), so the bottom of the column is currently silent — and sour exposure is therefore the first attrition the mix has ever voiced. That makes this section a reservation as much as a decision.

If crush is ever given a voice, it **may not be this one**, and not a variant of it. The two share a ledger and nothing else: they are opposite instructions. Crush says *rise*; sour says *dive*. A cue the player cannot resolve into a direction is worse than silence, because it spends their attention and then declines to say what for — and a hull that answers a crush cue by rising into the Lid has been actively misled by the mix.

So the register is claimed here: **sour descends** — the bite falls, the texture is thin and high and asks to be got away from downward. A crush cue must **rise**, and must live in the low band the hull already occupies, where the sour texture deliberately does not go. Neither may be built from the other's material.

---

## 5. Active Sonar

The ping is the game's signature decision ([systems-echo.md](systems-echo.md) §5) and it needs **three distinct audio events**, none of which may be confused for another.

- **Transmit** — a 1.5 s outgoing sweep, dry, loud, unmistakably *yours*. It is a commitment sound: it must feel like slamming a door.
- **Return** — echoes arriving over the following 3 s, ordered by range so near contacts return first. The player literally hears the sweep resolve the map. In a **Resonance Field** the returns arrive from wrong bearings and one to three of them are false ([environments.md](environments.md)) — audibly wrong, so the terrain teaches its own rule.
- **Exposure** — what an *enemy* ping sounds like when it resolves you: a hard, close, panned strike, followed by a two-second tail. There is no visual equivalent that arrives sooner. **If you have been lit, you know.**

Every unit that pings also triples its fauna aggro contribution ([bestiary.md](bestiary.md) §2). The Sounder's answering call is a distinct, extremely low, non-directional sound that plays before any fauna contact resolves — the only sound in the game that means *you have made a mistake that is now coming.*

**That sentence is now load-bearing.** [campaign.md](campaign.md) §10 forbids a mission failing on a timer alone: every failure state must be something the player can hear coming for at least sixty seconds, and this is the sound that pays that debt. It is built to be useless as intelligence and complete as a warning. Non-directional, so it cannot be plotted; below any tier, so it cannot be tracked; arriving before the thing it announces has resolved into a contact, so the screen confirms nothing. The player is told exactly one fact and handed the time to act on it, which is the difference between dread and confusion.

It therefore has to survive §4. A player at full plant noise is having trouble hearing contacts by design, and this is the one voice that must not be a casualty of that: it rides the **world** bus at a level the −8 dB duck cannot bury, because a warning masked by the player's own loudness is a mission lost to the mix. §11 binds it the same way — the call needs its visual equivalent or the sixty seconds are only granted to players who can hear. [mission-sorrowgate.md](mission-sorrowgate.md) §8 is the first failure state built on this, and the lead it gives is longer than the rule asks for.

---

## 6. Echo Marks — The Sound of the Past

Echo Marks are residue, not presence ([systems-echo.md](systems-echo.md) §7), and the mix must say so. Their rule is simple: **no transients.** A mark's sound is reverb-only — the tail of an event with the event removed, band-limited to 120–800 Hz, and always at least 6 dB below the live contact bus.

| Mark | Sound | Duration |
| --- | --- | --- |
| Battle site | Overlapping metallic decay, no strikes | ~90 s |
| Destroyed structure | Slow settling groan, descending | ~3 min |
| Industrial hum | Steady, tonal, unhurried — the sound of someone else's economy | Slow decay |

If a player can mistake a mark for a contact, the mark is mixed wrong. If a player can mistake a mark for *nothing*, it is mixed wrong in the other direction, and the scouting economy dies.

**Implemented as three continuous beds, one per mark kind, rather than a voice per mark.** A voice per mark would have onsets, and an onset is a transient: the moment a scout drifted into range of a ninety-second-old battle site, the mix would announce it like a detection. The past does not announce itself. Each bed's level follows the summed intensity of that kind of residue the player can currently read, saturating rather than adding linearly, on a ramp far too slow to be heard as an attack.

The beds ride the **world** bus, not the contact bus. Residue is the environment remembering, not a detection — which also means §4's own-noise attenuation makes a loud player deaf to the past exactly as it does to the present. They carry no pan: a bed that panned would claim a bearing the mark layer never resolved. Where residue *is* lives on the screen, which is where [ui-ux.md](ui-ux.md) §11 wants it.

---

## 7. Fauna

Fauna share the Tier-1 sound space **on purpose**. A thump at 40–90 Hz may be a Hollow drifting past a trench wall or a Consortium column at the edge of hearing, and at Tier 1 the game will not tell you which. This is where dread comes from: the ambiguity is real, generous, and constant, rather than rare and punishing.

Fauna voices resolve upward like any other contact — at Tier 3 a Rasp swarm is unmistakably not a fleet. Full behaviour, thresholds and per-species tells are in [bestiary.md](bestiary.md).

---

## 8. Faction Timbre Families

A player must identify a faction at Tier 3 by ear alone, with no visual. Each family owns a distinct mechanism of sound production, not just a distinct EQ curve.

| Faction | Sound of | Core material | Signature |
| --- | --- | --- | --- |
| **Bathyarch Consortium** | Machinery under load | Steel, reciprocating, rhythmic | Repeating mechanical period; the only faction with a *beat*. Audible from absurd range and completely unbothered about it |
| **Pelagia Commune** | Breathing | Muscle, fluid, arrhythmic | No periodicity. Pulses that never quite repeat. Nearly gone under 20 SIG |
| **Abyssal Directorate** | Many small things agreeing | Chitin ticks, layered voices | Clicks that phase into unison as cohorts converge — you hear them *organise* |
| **Hadron Knights** | Pure tone | Crystal, sustained, harmonic | Narrow-band pitched drones. Directional in the mix exactly as their SIG is directional: deafening in the cone, nearly silent on the flank |

The Knights' entry is the one that must not be softened. Their emissions are a cone ([factions.md](factions.md)), so the mix places them off-axis at up to −20 dB. A player who walks into the beam hears the volume change and that *is* the tell.

**Those decibels are now the model rather than a mix decision**, which is §1's second law working in the direction it was written for. [systems-echo.md](systems-echo.md) §8 spec's the directional term as ×1.00 in the cone, ×0.35 on the flank and ×0.10 in the wake — 0 dB, −9 dB and −20 dB — so the flank has a level of its own and the −20 dB is the wake specifically. The mix is not asked to invent an off-axis curve; it renders three sectors the server already resolved.

---

## 9. Biome Acoustics — PF as Signal Processing

PropagationFactor is a number in the detection maths and a **DSP chain** in the mix. The two must agree; a biome that masks you mechanically but sounds open is a lie.

| Biome | PF | Filter | Space | Special |
| --- | --- | --- | --- | --- |
| Open mid-water | 1.0 | Neutral | Medium tail, ~2.5 s | Reference |
| Thermal Vein | 0.45 | Broadband vent roar raises the noise floor +12 dB | Short, chaotic | Masking is *audible as masking* — you can hear that you cannot hear |
| Kelp Forest | 0.55 | Steep HF absorption above 2 kHz | Very short tail, ~0.8 s | Everything sounds close and dead |
| Abyssal Trench | 1.6 axial | Neutral on-axis, HF loss off-axis | Long delay taps along the axis, 180–400 ms | Contacts arrive *twice*; the second arrival is the trench, not a second unit |
| Resonance Field | 0.7 scattered | Comb filtering, slow phase drift | Diffuse, unlocatable | Returns from wrong bearings; false contacts sound identical to true ones |
| Coral Ruins | 0.8 occluded | Hard occlusion behind geometry | Strong early reflections | Acoustic shadows are sharp — one step sideways restores a contact |
| Thermocline boundary | 0.3 across / 1.2 along | Heavy low-pass across the layer | — | Crossing it is a *whoomp*: the map changes state in the mix |

---

## 10. Music

The score is dread, not action, and it is subordinate to information. Rules:

- Music occupies **above 800 Hz and below 40 Hz**. The 40–160 Hz contact band belongs to contacts, permanently.
- The music bus is side-chained to the contact bus at a 4:1 ratio, 40 ms attack. A new contact ducks the score. The score never ducks a contact.
- No stingers on detection. The contact voice is the stinger.
- Combat does not trigger "combat music." Loudness does — the score follows the player's own SIG, which means the music swells when they are *exposed*, not when they are winning.

### The port

The shell ([ui-ux.md](ui-ux.md) §14) gets a bed of its own, and it is a **different piece**, not a loop of the score. The score above is a function of a match — side-chained to contacts, following the player's own SIG — and there is neither in a menu. Trying to loop it would produce the one thing §10 forbids most: music that swells for no reason.

The port's bed keeps every rule that is not about a match:

| Rule | How the port keeps it |
| --- | --- |
| Above 800 Hz and below 40 Hz | A pedal at ~33 Hz and cold partials from 880 Hz up. Nothing between |
| The 40–160 Hz band belongs to contacts | Even here, where no contact is sounding. The port is where a player learns the vocabulary, and a menu that filled that band would spend itself teaching them to ignore the one the ocean speaks in |
| No stingers | Nothing is triggered by anything. There is no event in a menu worth a sound the game has not already given a meaning |
| Dread, not action | Sparse: one onset every two seconds or so, each lasting several, so the texture drifts rather than pulses. No melody — the port is a room, not a theme tune |
| −18 LUFS / −1 dBTP, headroom for the exposure cue | The bed sits well under the master ceiling before the user's Music slider touches it. A main menu is not where a mix should spend its headroom |

Two things it adds that the score does not. Onsets quantise to the 200 ms Echo grid ([style-neon-noir.md](style-neon-noir.md), "sonar cadence is the heartbeat"), so the game's pulse is set before the player is in the water. And the piece is *composed*, deterministically: the same music every launch, a different phrase every loop, so the loop point never becomes a hook.

It plays on the same `music` bus the score will, which is how the Music slider and the master volume reach it without the bed knowing they exist — and it is the first thing in the game those sliders can be *heard* moving, which is the only way a volume control can honestly be judged.

**The shell owns an AudioContext while it is on screen, and never at the same time as the match does.** A context is a device handle and browsers cap how many a page may hold open; the screen union in the shell makes the two mutually exclusive, and the menu's context is faded out and closed on the way into the water. Nothing plays before the first gesture — autoplay policy, and a game whose primary channel is audio cannot afford to look broken on its title screen.

---

## 11. Accessibility — Audio-Only Information Is a Bug

Because audio carries primary information, every audible fact **must** have a visual equivalent, and the game must be fully playable with the mix muted. This is a hard requirement, not a setting to be added later.

- **Contact log** — a running, timestamped text feed of every detection event, at the fidelity the player earned: `T+04:12 · TIER 1 · bearing unknown`. Specified in [ui-ux.md](ui-ux.md) §10.
- **Visual-first preset** — inverts the precedence law: marks appear at ≤ 30 ms and audio follows. One toggle, no other behavioural change.
- **Exposure indicator** — the "you have been pinged" cue also renders as a screen-edge flash on the bearing of the pinging emitter.
- **Mono mode and HRTF off** — spatialisation is a rendering choice, never a source of information the mono mix lacks. Tier-2 bearing must remain readable in mono via the contact log and the minimap.
- **Independent buses** — contacts, self-noise, world, music, UI, each with its own slider. Contacts may be boosted to +12 dB above the reference mix.
- **Speaker profile** — a compressed, small-speaker mix that preserves the 40–160 Hz contact band by adding harmonics rather than relying on fundamentals no laptop can reproduce.

---

## 12. Technical Specification

**Split of responsibilities** ([tech-stack.md](tech-stack.md)): Howler.js owns UI sounds, music playback and one-shots — anything where a simple play/stop API is sufficient. The **contact bus is raw Web Audio**, because it needs per-voice filtering, side-chaining and sample-accurate scheduling that a wrapper cannot give.

```text
AudioContext
├── musicBus ──────────► compressor (sidechain from contactBus) ─┐
├── worldBus  (ambience, biome beds, fauna) ─────────────────────┤
├── contactBus ─────────────────────────────────────────────────┼─► master ─► destination
│    └── per-contact voice: source → biomeFilter → panner → gain │
├── speechBus (the hail and the murmur bed, §13) ───────────────┤
├── selfBus   (own hull, drive, cavitation) ────────────────────┤
└── uiBus     (Howler) ─────────────────────────────────────────┘
```

| Constraint | Value | Reason |
| --- | --- | --- |
| Simultaneous contact voices | 24 | Beyond this the low band turns to mud and nothing is legible |
| Voice stealing order | Lowest tier first, then oldest, then quietest | Never steal a Tier-4 track; it is the only exact information the player has |
| Voice scheduling | Aligned to the 5 Hz Echo tick | Contacts arrive on the tick; anything smoother implies knowledge the server did not send |
| Audio thread budget | 1 ms per Echo tick on the main thread | The Echo Layer already owns 2 ms server-side; the client must not spend it again |
| Format | Opus in WebM, AAC fallback | Browser coverage without shipping two full banks at full size |
| Loudness target | −18 LUFS integrated, −1 dBTP | Headroom for the exposure cue, which is deliberately the loudest event in the game |
| Tab blur | Suspend the context, hold state | An unfocused tab that keeps emitting contact voices is a nuisance, not a feature |

**Determinism note:** audio is presentation only. No audio state may feed back into the simulation, and the mix must never be the reason two clients disagree.

### Scaffold status

The engine exists (`packages/frontend/src/audio/`): the bus graph above, the 24-voice
contact budget with its stealing policy, tick-aligned scheduling, tab-blur suspend, and the
first-gesture unlock.

The **music bus now carries the port's bed** (§10, "The port") — the shell's own engine,
opened on the first gesture in a menu and closed on the way into a match. The in-game score
is still unwritten: the bus ducks and trims correctly and has one piece to play, in the
place where a match is not.

Contacts are sonified (§3): a voice per contact, panned with the authority its tier earned,
filtered by the biome it arrived through (§9), and carrying the faction's drive signature
from Tier 3 up (§8).

The player's own loudness is implemented too — §4's four bands with their world-bus
attenuation, Silent Running's inversion, §5's three active-sonar events, the break-silence
transient, and §2's Precedence Law in both of its halves (the fade-in budget that keeps the
ear ahead of the eye, and the ducking chain that decides what wins when several things
sound at once).

**Nothing about the player's own force is inferred.** The Echo pass reports exposure
directly: `EchoSnapshot.exposure` says how well the player is currently seen, and
`EchoSnapshot.selfEvents` carries the discrete moments — transmitted, broke silence, was
lit, was hit, ran out of work. All of it is resolved information about the player's own
units, so it leaks nothing, and the alternative was guessing. A SIG jump could be a broken
silence, a discharge or a descent; "am I being pinged" cannot be read off own-SIG at all,
and §5's cue is far too loud to fire on a guess.

**A blow on the hull is audible once per engagement.** The `Damaged` event fires for
violence only — a gun, ordnance, a creature — never for crush attrition or the shallow
bleed, which are costs being paid rather than attacks being made. Its cue is a dull knock
and a rattle of plating, deliberately below the exposure strike, and the mixer collapses a
sustained battering into one blow per ten quiet seconds per hull: the log records the
first blow of an engagement (docs/ui-ux.md §5), and the ear and the record share the
window so they cannot disagree about what one engagement is.

**The Lid has a voice.** "The Lid" above is implemented on the self bus: a second continuous
bed alongside §4's plant bed rather than a mode of it, because a silent hull can be souring
and a screaming one can be in clean water — folding them together would have made whichever
fact was quieter inaudible. The texture is driven from the server's own `OwnUnit.sourS`, so
the sound and the card count the same grace down and the `SOUR — BLEEDING` line and the
pulse change state on the same comparison. The bite is a `SourBleed` self-event raised on
the crossing edge in the pressure system, which is the one place in the simulation that
knows the exact tick a grace ran out — and it is the single exception to `Damaged`'s
exclusion of attrition, granted because sour exposure is the only attrition in the game with
a moment in it.

**The ui bus finally carries something.** The idle-harvester notice — two soft descending
taps — is its first producer, and it sets the bus's register: the interface speaking, not
the water. It claims no precedence rung and ducks nothing, because a chore may not quiet
a contact; that the ui bus sits outside the ducking chain is now load-bearing rather than
incidental.

**Speech has a bus** (§13). A `say` beat is hailed in its speaker's register — five
synthesised signatures, one per voice of docs/culture.md §3, then a murmur bed for the
reading — on a bus of its own with a rung under contacts, a trim that can go to zero, and a
whisper under the silence order. No line is recorded; the log is the caption.

The one thing deliberately withheld is the pinger's **position**. The victim gets a bearing,
which is what §11's screen-edge flash asks for. A ping resolves by hard radius while the
pinger's own self-reveal travels by propagation, so in a masking biome a player can be lit
by something they cannot hear back — sending coordinates would close that gap on their
behalf.

**The self bed follows fleet SIG, not `peakSig`.** The HUD number folds in structures, and a
base six kilometres away would pin the bed at "full plant" for the whole match, making the
entire scale — Silent Running's inversion included — inaudible. So the HUD can read `SIG 35`
while the bed reads `SILENT RUNNING`: the base is loud, the fleet is not, and both
statements are true.

**Being lit is an event, not a state.** A ping reveals for three seconds, which is fifteen
Echo ticks; the first implementation fired the strike on every one of them, measured at 42
strikes for a single ping. The pass now tracks which hulls a given transmission has already
lit, so a hull is told once — and a hull that enters the radius part-way through is still
told, because it was just lit.

**Where fidelity is enforced.** The renderer assembles the contact picture the mix is
allowed to hear and *withholds* bearing and range at Tier 1 rather than blurring them —
there is nothing to blur, because a Tier-1 resolution reports the listener's own position.
The mixer forwards what it is given and never re-derives geometry, and the voice refuses to
pan a tier that has no bearing even if handed one. Three layers, all defaulting to silence
about what was not sent.

**Measured** in the headless client with two clients in a live engagement: **0.1–0.3 ms**
per Echo tick with six contact voices sounding, against the 1 ms budget. A single client
peaks at 0.4 ms; the 2–3 ms outliers seen in the two-client runs are two pages contending
inside one headless browser process, and appear on ticks where no voice is built at all.
The engine reports both the worst case and the most recent tick, because a budget blown
only while *building* voices is a different problem from one blown every tick, and a
worst-case figure alone cannot tell them apart.

Two departures from the diagram above, both deliberate:

**The music sidechain is a measured duck, not a compressor sidechain.** Web Audio's
`DynamicsCompressorNode` has no sidechain input — there is no way to key one node's
compression from another node's level. The music bus therefore passes through a gain node
driven from the contact bus's measured peak, updated on the Echo tick. Same audible result,
different mechanism, and worth knowing before someone tries to "fix" it into a compressor.

**Voices are synthesised rather than sampled.** The repository ships no audio assets, and
sonar is unusually well suited to synthesis — tonal returns and filtered noise beds are what
the material actually is. The buffer path is in place for when banks exist; the Opus/AAC
format requirement in the table above applies to those banks, not to the prototype.

Two rows of §9's table are deliberately **not** voiced. The Abyssal Trench's *axial*
behaviour needs PF as a function of bearing, which the simulation does not model — voicing
it would be the mix claiming to know something the game does not. The thermocline boundary
is a different case: the simulation *does* model it, but as a property of a listening pair's
depths rather than of a place, so there is no biome for the voicing table to key on. That
one is a gap, not an impossibility — the mix would have to read the local hull's own depth
instead, and the *whoomp* of crossing the layer is a real event the player now experiences
without hearing.

---

## 13. Speech — The Voice in the Water

Twenty-eight mission documents carry a §12 of lines, and until #381 every one of them was read and none was heard: the `say` beat carried speaker and text to the mission log beside the orders panel ([ui-ux.md](ui-ux.md) §10), at the times each document's §12 gives, and this document owned no bus for a voice. This section is that bus. It is a **channel**, not a cast.

**A channel, not a cast.** No recorded line ships, and none is specified here. [culture.md](culture.md) §3 has five voices and §6's test is *which faction could not have said it*; a speech channel whose four Sorrowgate voices sounded like one narrator would have failed before the first line played. So what the mix does is narrower than reading the line aloud, and more honest: it says **somebody is speaking on this channel, and it is one of these five**. The words stay the log's.

### The hail

Every line opens with a **hail** — 600 ms of signature in the speaker's register's material. Four of the materials are §8's timbre families, carried into speech so a player who has learned a faction's drive by ear already knows its voice; the fifth is new, because §8 has four rows and §3 has five voices.

| Register | Self-description ([culture.md](culture.md) §3) | Material | The hail |
| --- | --- | --- | --- |
| Bathyarch Consortium | *the concern* | Machinery under load — steel, reciprocating | Three strikes of a 68 Hz square on a fixed period. The only voice with a beat in it |
| Pelagia Commune | *the plateaus* | Breathing — muscle, fluid, arrhythmic | One swell of a 52 Hz sine, its pitch drifting up and back, that does not repeat |
| Abyssal Directorate | *the cohorts* | Many small things agreeing | Six triangle ticks around 140 Hz that start scattered and land together — heard *organising* |
| Hadron Knights | *the Order* | Pure tone — crystal, sustained | One 196 Hz note, clean attack, long release |
| The Sorrowgate court | *the court*, *the record* | A dead room | A single dry tap of high-passed noise, 25 ms, no tail and no tone |

The court's is the fifth because it is the one voice that is not heard through water. Every other hail carries the Rift in it — a beat, a breath, a chorus, a note — and the court speaks from a place that is not the Rift: a room with no water in it to carry anything ([culture.md](culture.md) §3, "the one voice in the Rift that describes a room without joining it"). A tap with no tail is what such a room sounds like.

### The murmur bed

After the hail the channel stays audibly **open** for as long as the line takes to read — band-passed noise gated at a syllable rate, in the register's own band and cadence (the concern's gate is metronomic, the plateaus' never repeats), and never voiced: no formants, no pitch, nothing a listener could take for a word. It reads as *someone is speaking on this channel* and as nothing more specific than that.

The length is the line's: **fifteen characters a second, never under 1.5 s, never over 8 s.** A player with their eyes on the water hears the channel close when the line would have been read, which is the cue to look at the log if they have not.

### Where it sits

Speech has its own bus (`speechBus`), trimmed like the others, and a rung in §2's chain:

> self-exposure › contact › **speech** › self › world › music

Information outranks a voice: a contact arriving mid-sentence dips the speaker and never the reverse, because a line is authored and the log already has it while a contact is news. A voice outranks atmosphere. The table, as `precedence.ts` transcribes it — a rung never ducks itself or anything above it, and the pairs that predate speech keep the values they had:

| While this sounds | contact | speech | world | music |
| --- | --- | --- | --- | --- |
| Exposure (§5) | 0.55 | 0.3 | 0.3 | 0.3 |
| A contact | — | 0.55 | 0.3 | 0.3 |
| **A line** | — | — | **1** | 0.5 |
| An own cue — the ping, a broken silence, a blow, the bite | — | — | 0.55 | 0.3 |
| The world | — | — | — | 0.55 |

The world's cell under a line is deliberately **1**. The world bus carries §5's Sounder call "at a level the −8 dB duck cannot bury", and a voice that talked for eight seconds over a world at −10 dB would bury the one warning this document promises never to. The self bus has no column at all, for the same shape of reason: it carries the exposure strike and the ping, which are the top of the chain, and a bus-level duck to make room for anything would cut the loudest event in the game. A line sits *over* the player's own noise and the water. It does not press them down; the one thing it presses down is the score.

### Under a silence order, and under Silent Running

A briefing voice that keeps talking at full level while the player is ordered quiet is not loud. It is **wrong**: the court has told the flight that twenty SIG is the ceiling ([mission-sorrowgate.md](mission-sorrowgate.md) §4), and a mix that hailed the court's own observer at full power would be contradicting the court in the same breath.

So while the mission view carries silence-debt — `debtS > 0`, the one signal the client already holds, and the same number the debt gauge shows — or while any own hull is running silent, the channel is kept open at a **whisper**: the hail drops **−6 dB** and loses its top octave (a low-pass at half the register's own ceiling, so each voice loses *its* top and the court is thinned by the same amount as the concern), and the murmur bed runs **half as long**. A low-power link, kept open. It never mutes, because the log is the caption and the ear is owed the cue that a line landed — a line the player did not hear land is a line they will not look for.

The rule is read as the line arrives and rides the line: a line spoken under the order and one spoken after it lifts are each hailed as they were when spoken.

### Accessibility

§11's rule holds with nothing added. The log stays; **captions are the log**, and a line's text was on screen before this section existed. The speech trim can go to zero and nothing is lost. Under the visual-first preset the hail is neither delayed nor inverted — there is nothing to race, because the line and the log row are the same event, queued from the same message.

### What it is not

**It is not a side channel.** A line is heard when its beat fires and never earlier, and never for a beat the observer did not receive: the hail is queued from the same `missionLine` message that writes the log row, and the register rides the line from the server — resolved there, so a beat with no authored voice arrives already in the player's own and the client infers nothing. An audio rendering of authored mission data the observer already holds discloses nothing new.

**Nothing here feeds back.** §12's determinism note applies unchanged: the simulation never learns a line was heard, whispered or trimmed away.

### Scaffold status

**Built** (#381): the five hails, the murmur bed and its reading rule, the `speech` bus and its trim, the rung and its table, the whisper rule, and the register on the wire — `MissionVoice` in `@echoes/shared`, `voice` on the `say` beat and on `MissionLine`, authored on the minority of lines spoken by somebody other than the player's own faction and defaulted to the player's register otherwise. Sorrowgate's four lines are the first content, and they are four registers by construction — the Order at 06:20, the concern at 09:00, the cohorts at 09:20, the plateaus at 10:40 — and `missionRuntime.test.ts` plays the mission and asserts they arrive as four different voices. The court's hail is built and has no line yet to carry: Halloran speaks in the briefing and the objective readings, which are read before the socket opens and are not beats.

**Not built**, and not this section's to build: recorded lines, or a voice per speaker — the hail is per register, and Vrey and Sull share the Order's note; the Collapse's thirty seconds at SIG 100 as a *sound* is §5's business, not speech; and [mission-first-arrival.md](mission-first-arrival.md) §13's largest item — Korrin's silence, a thing an actor does not say — has no channel here either, because a channel that hails what is said cannot hail what is withheld.

---

## 14. Related

- **[systems-echo.md](systems-echo.md)** — the mechanic this mix carries
- **[ui-ux.md](ui-ux.md)** — the visual half, and the accessibility mirror
- **[bestiary.md](bestiary.md)** — what shares the Tier-1 band with you
- **[environments.md](environments.md)** — biome PF values the DSP chain implements
- **[art-direction.md](art-direction.md)** — the visual language this sits inside
- **[tech-stack.md](tech-stack.md)** — Howler.js, Web Audio, and the performance budget
