/**
 * The words on the roadmap site, written for a player.
 *
 * `docs/ROADMAP.md` owns the *structure* — which phases exist, which issues
 * sit in each, and GitHub owns whether each is done. But the roadmap is
 * written for the people building the game: it says "Echo pass scaling" and
 * "replace the O(maxEid) scans", and a fan does not care about either. This
 * module carries the player-facing sentence for every row, keyed by issue
 * number, plus the sections a fan actually came for: what the game is, who
 * the four navies are, what you can play today.
 *
 * Every fact here is transcribed from `docs/` — game-identity.md,
 * factions.md, campaign.md, maps.md, systems-echo.md, systems-depth.md. When
 * a number moves in a doc, it moves here.
 *
 * A roadmap row with no entry in `items` falls back to the doc's own wording,
 * and the build prints a warning naming it, so a new row is never silently
 * shown in engineering-speak.
 */

export const hero = {
  eyebrow: 'A real-time strategy game · in development',
  tagline:
    'An RTS where you cannot see — only listen — and every action you take tells the enemy where you are.',
  pitch:
    'Two centuries after the surface ocean was poisoned, humanity lives at the bottom of the Pelagion Rift, and four navies are fighting for the last habitable water on the planet. There is no line of sight down here. Every ship makes noise, every ship listens, and everything that makes you strong makes you loud. This page is where the game stands today, what you can already play, and what is coming next.',
  motto: 'In the abyss, every echo is a warning.',
  primary: { label: 'What you can play', href: '#play' },
  secondary: { label: 'What is next', href: '#next' },
};

export const pillars = [
  {
    title: 'You do not see. You listen.',
    text: 'There is no fog of war to lift. Every hull emits an acoustic signature and listens for everyone else’s. What you know about a contact comes in five grades of certainty, from "something is out there" to a full track — and the enemy is grading you the same way.',
  },
  {
    title: 'The ping is a bargain you will regret.',
    text: 'Active sonar shows you everything within 900 metres. It shows you to everything within 2,400. You learn everything; everyone learns where you are, twice as far away.',
  },
  {
    title: 'Loud is strong. Strong is loud.',
    text: 'Mining is loud. Building is loud. Firing is loud. A working economy hums and a fleet at full speed is a beacon. Silent running buys you invisibility and costs you everything else.',
  },
  {
    title: 'Depth is a commitment.',
    text: 'The ocean is three bands deep. Diving is fast and deafening; rising is slow and silent. Go below what your hull is rated for and the pressure eats it, and nothing repairs that. The best resources are at the bottom. A deep raid succeeds, retreats, or dies.',
  },
  {
    title: 'The water is alive, and it is listening too.',
    text: 'Sea life answers the loudest thing it hears and looks exactly like a warship until you get close. Vents erupt, resonance storms roll through, cold currents push, kelp grabs. And at 4,410 metres sits the Mouth, which answers sonar pings before they are sent.',
  },
];

export const factions = [
  {
    name: 'Bathyarch Consortium',
    accent: '#f2b233',
    line: 'The loudest thing in the Rift, and proud of it.',
    text: 'An industrial megacorporation that became a government by accident. They run the heat, the freight, and — through debt — nearly half the population. They built the hulls. They ran the air. They will bring that up.',
    plays: 'Wins by attrition. Fears insolvency.',
  },
  {
    name: 'Pelagia Commune',
    accent: '#8fe36b',
    line: 'Grown, not built.',
    text: 'Farmers who feed the whole Rift, with ships closer to animals than machines: chitin hulls, muscle-driven propulsion, sensor organisms. The quietest navy in the game, and the most fragile.',
    plays: 'Wins by map control. Fears being made to fight.',
  },
  {
    name: 'Abyssal Directorate',
    accent: '#c2465e',
    line: 'They listen better than anyone.',
    text: 'Eight generations of engineered trench-dwellers who can walk out of an airlock at 3,000 metres. The Rift’s most functional society — no debt, no wage, universal everything — and nobody in it chose any of it.',
    plays: 'Wins by information and numbers. Fears being wrong about what is below.',
  },
  {
    name: 'Hadron Knights',
    accent: '#c9a6ff',
    line: 'Sound as a weapon.',
    text: 'Thirty thousand crystal-workers in a techno-order that recruits by acoustic aptitude at age nine. The only faction that cannot grow, and they know exactly how many years that leaves them.',
    plays: 'Wins by positioning and burst. Fears extinction by arithmetic.',
  },
];

/**
 * The roster contact sheet — the one picture on the page. The image itself is
 * the newest `rung-roster-sprites.png` an art PR committed under
 * docs/screenshots (see lib/sheet.mjs); these are the words around it. The
 * facts are graphics-standards.md's: baked from the approved models, glow set
 * from the hull's own SIG band, own force only.
 */
export const roster = {
  title: 'The fleet, as it renders today',
  text: 'Every hull in the game, seen from above the way the sonar chart shows your own force: four navies, four hulls each, and the yards that build them. Each is lit from its own 3D model and glows exactly as loud as it is — the brighter the running lights, the further away it can be heard. You only ever see your own ships like this. An enemy is a silhouette at best.',
  alt: 'Contact sheet of every hull and yard in the game, seen from above, one row per navy: Consortium in amber, Commune in green, Directorate in red, Knights in violet, each hull labelled with its class and its length in metres.',
  caption:
    'Re-baked whenever the art changes. This picture is whatever the newest roster looks like, not a mock-up.',
};

/** What exists and runs today. Counts are filled in at build time. */
export const playable = [
  {
    title: 'A {missions}-mission campaign',
    text: 'A prologue that teaches you to listen, then four seven-mission campaigns you can play in any order, each retelling events the others showed you from the other side. Four endings, none of them canon. The game remembers which scenes you have witnessed and changes the briefings to match.',
  },
  {
    title: 'Skirmish against an AI that hears what you hear',
    text: 'Recruit or Veteran. Neither one cheats: the opponent gets the same sonar picture you get and nothing more. Difficulty is how well it thinks, not how much it sees.',
  },
  {
    title: 'Multiplayer on the same water',
    text: 'A lobby, faction pick, reconnecting if your connection drops, a result screen, and a rematch.',
  },
  {
    title: '{maps} maps, {factions} navies',
    text: 'The Ventfront Divide, where the safe middle is the quiet middle. The Kelp Labyrinth, which does not hide an army so much as ruin your sense of how far away it is. The Abyssal Rift Corridor, a trench that carries every sound down its whole length.',
  },
  {
    title: 'A full soundscape',
    text: 'Every contact has its own sound for how well you know it, panned to its bearing and coloured by the water it came through. Your own noise sits under everything, and a cue tells you when you are the one being heard.',
  },
  {
    title: 'A three-layer ocean you can see',
    text: 'A perspective view over a sculpted seabed, ships sailing at their true depth, and a depth ribbon that warns before a dive would crush you.',
  },
  {
    title: 'Runs in a browser',
    text: 'Nothing to install. The whole game — the server included — is small enough to run on a phone.',
  },
];

/**
 * Known rough edges, keyed by the issue that tracks each. These replace the
 * roadmap doc's status table wording; the live open/done state still comes
 * from the issue, and once it closes the card shows `fixed` instead of
 * `text`, so a solved problem is never described as current.
 */
export const roughEdges = {
  440: {
    question: 'Do skirmishes against the AI finish?',
    text: 'Not reliably, not yet. In a four-player test batch, 29 of 30 matches ran to the 25-minute limit without a winner; two-player matches finish fine. The AI knows how to fight and does not yet know how to close out a game.',
    fixed:
      'They do now. The AI used to stall four-player matches to the 25-minute limit — 29 of 30 in one test batch — and has since been taught to close out a game.',
  },
  430: {
    question: 'Does it stay smooth with a big fleet?',
    text: 'Up to about 160 hulls on the water. Past that, the sonar picture starts to lag behind the action.',
    fixed:
      'It does now. Past about 160 hulls the sonar picture used to lag behind the action; the detection pass has since been reworked to keep up.',
  },
  286: {
    question: 'How does it run on a real PC or phone?',
    text: 'Unmeasured. Every frame-rate number so far comes from a software renderer in a test container. The game promises to run in a browser, phone included, and that promise has not been timed on real hardware yet.',
    fixed: 'Measured. The game has now been timed on a real graphics card and on a phone.',
  },
};

/**
 * Player-facing titles and blurbs per phase, and a sentence per roadmap row
 * keyed by issue number. Group labels map Phase 10's engineering headings to
 * fan ones.
 */
export const phases = {
  0: {
    title: 'Before there was a game',
    blurb:
      'A glossary, a simulation of sound with nothing around it yet, and the checks that stop the writing and the code from drifting apart.',
  },
  1: {
    title: 'Depth becomes a choice',
    blurb: 'The ocean was always three bands deep on paper. This is where ships learned to dive.',
  },
  2: {
    title: 'The game gets its voice',
    blurb: 'A game about sound that made no sound. Now it does.',
  },
  3: {
    title: 'The map fights back',
    blurb: 'Sea life, hazards, the residue of battle, and three hand-built maps to fight over.',
  },
  4: {
    title: 'Sit down and play',
    blurb: 'An opponent, a lobby, and the controls an RTS needs.',
  },
  5: {
    title: 'Under the hood',
    blurb: 'Replays, determinism, and a balance lab that plays hundreds of matches unattended.',
  },
  6: {
    title: 'What the balance lab found',
    blurb: 'Two things the design promised that the game did not yet do.',
  },
  7: {
    title: 'Currents, kelp and colliding hulls',
    blurb: 'Every force in the design given real teeth, and the movement bugs nobody had caught.',
  },
  8: {
    title: 'The campaign',
    blurb:
      'The engine that runs a scripted mission, proven on the prologue — and then all twenty-eight that followed.',
  },
  9: {
    title: 'The new view of the ocean',
    blurb: 'The 3D presentation landed; these were the promises it made on the way.',
  },
  10: {
    title: 'What is next',
    blurb:
      'A full review of the game in September 2026 produced this list. First on it: matches that end.',
  },
};

export const groups = {
  'The match that does not end': 'Matches that finish',
  'Performance and netcode': 'Smoother and faster',
  Controls: 'Controls',
  Design: 'New things to play with',
  'Shipping and hygiene': 'Getting it out the door',
  'The design bible': 'Writing the game down',
  'The scaffold': 'The first working code',
  'The gates': 'Checks that keep it honest',
  'How the project runs': 'Getting organised',
  'What the first read-through found': 'What the first read-through found',
  'The opponent': 'A better opponent',
  'Filed since the audit': 'Since then',
};

export const items = {
  // Phase 0 — the first week
  6: 'A glossary, so that every word in the design means one thing',
  20: 'The glossary settled, and made the document the others answer to',
  21: 'Every term linked back to the one place it is defined',
  7: 'The first roster: what each submarine is and what it is for',
  22: 'Stats for every hull, and a plan for testing whether they are the right ones',
  23: 'A checklist for playtesting a unit, and somewhere to write down what happened',
  8: 'This roadmap, in its first form',
  9: 'A game client that builds and runs',
  10: 'The sound model as working code — how far a noise carries, and who hears it — before there was a game around it',
  24: 'A first scene on screen, and controls that move something in it',
  26: 'A test bench for the sound model: fixed scenarios that must always come out the same',
  27: 'That bench written up and made reusable, so the tests can call it',
  11: 'Automated checks on every change, from the first week',
  25: 'The client built on every change, so one that does not build cannot land',
  28: 'One code style, enforced rather than suggested',
  29: 'The design documents checked for broken links and bad formatting',
  12: 'A quickstart for anyone who wants to run it',
  30: 'That quickstart fixed after somebody actually followed it',
  16: 'How to contribute, written down',
  17: 'Labels and templates, so an issue arrives with what it needs',
  18: 'Naming and commit conventions',
  14: 'Who owns what',
  15: 'A board to track it on',
  19: 'A place to talk, and the meeting that started it',
  57: 'The bar a piece of art has to clear before it ships, and a check that the game still runs on a phone',
  34: 'The five grades of certainty disagreed with themselves — some documents counted five, others six',
  35: 'Every hull\u2019s listening range was a number the code made up; the design had never chosen one',
  36: 'The test bench and the game were computing detection two different ways',
  37: 'Sound was being measured at the source instead of along the path it travels — the model the whole game rests on, wrong in the one place it is worked out',
  38: 'About 270 formatting faults in the design documents, and a check that only reported them',
  39: 'Seven documents were linked from others and had never been written',
  // Phase 1
  98: 'Dive and surface on command — diving fast and loud, rising slow and silent',
  99: 'A depth ribbon, a pressure badge and crush warnings on the HUD',
  100: 'Resonance Crystal at the bottom of the ocean, and the tech it unlocks',
  // Phase 2
  101: 'A real audio engine, mixed per player',
  102: 'Contacts you can hear: a different sound for each grade of certainty, panned to its bearing',
  103: 'Your own noise in the mix, a cue when you are being heard, active sonar and silent running',
  // Phase 3
  104: 'The Drift: sea life that listens, answers the loudest thing, and looks like a warship until you get close',
  105: 'Vent eruptions and resonance storms',
  106: 'Echo Marks: the acoustic residue that battles and industry leave in the water',
  107: 'Three hand-built maps: the Ventfront Divide, the Kelp Labyrinth, the Abyssal Rift Corridor',
  108: 'Thermal Draw: power as a rate you tap, not a pile you hoard',
  // Phase 4
  109: 'A skirmish AI that hears exactly what you hear, and nothing more',
  110: 'Lobby, faction pick, reconnecting after a drop, a result screen and a rematch',
  111: 'Box select, control groups and an order queue',
  112: 'A sonar-scope minimap and a contact log',
  113: 'Hulls that no longer pass through each other, through structures, or through rock',
  // Phase 5
  90: 'Detection that keeps up when the water gets crowded',
  114: 'Replays, and matches that play out identically every time',
  115: 'A balance lab that plays whole matches unattended and reports what it finds',
  // Phase 6
  136: 'A working economy can be heard: refineries and depots hum while they run',
  140: 'The Hadron tithe: how the Knights keep an income in a long game',
  // Phase 7
  149: 'Movement fixes: hulls stacking wrongly, and vent eruptions throwing ships off the map',
  150: 'Terrain that blocks: ridges, roofs and rock you cannot sail through',
  151: 'Cold shock currents that push your fleet',
  152: 'Kelp that entangles',
  153: 'The Sounder wrecks structures by swimming through them',
  154: 'The Directorate pays for lingering in shallow water',
  // Phase 8
  190: 'The mission engine, proven on the prologue: Sorrowgate',
  // Phase 9
  283: 'Contacts you are unsure of are drawn as a column of water, not at a depth you never earned',
  284: 'Hulls stay readable when you zoom all the way out',
  285: 'You can hear it when the surface is hurting your hull',
  286: 'Frame-rate testing on a real graphics card and on a phone',
  // Phase 10
  440: 'Skirmishes that end: the AI learns to close out a match instead of stalling to the time limit',
  430: 'Big fleets without slowdown',
  429: 'Your own ships glide between updates instead of stepping',
  432: 'The sonar overlay stops redrawing everything every frame',
  433: 'Less data over the wire with every update',
  434: 'Fewer draw calls, and terrain rebuilt only where it changed',
  444: 'Server hot spots trimmed so long matches stay smooth',
  431: 'Pathfinding: ships steer around rock instead of sliding along it',
  435: 'Attack-move, rally points, stop and hold, edge scrolling, and a production queue',
  294: 'Mouse and keyboard done properly for desktop play',
  436: 'Two hulls unique to each navy, and one more tech tier above crystal',
  437: 'A population cap, sized to what the water can carry',
  438: 'A tighter map and redesigned superweapons',
  439: 'Competitive play: a map pool, a ladder, accounts and an observer mode',
  441: 'Hosting: a server you can join from anywhere on the internet',
  442: 'Faster loading: art fetched on demand, smaller downloads',
  443: 'More automated testing so updates do not break things',
  445: 'This roadmap, rewritten to tell the truth',
  458: 'A fair fight between the Consortium and the Directorate — today the Consortium wins nine duels in ten',
  467: 'The Commune’s minelayer and its living seeder, in the hands of the computer opponent',
  463: 'Longer fights, and a mine the defender can drop in the face of whatever is chasing it',
  472: 'A chart that goes vague where nothing of yours is listening',
  478: 'Harvesters that would not move in the Prologue',
  480: 'The tetherjelly forests one mission needs before it can grow them',
};

export const sprints = {
  'Sprint 1':
    'The world on paper: the design bible, the four navies, the rules of sound and depth, and the first playable scaffold.',
  'Sprint 2':
    'Depth became an order, the game got its sound, the map grew sea life and hazards, and an AI opponent made it something one person can play.',
  'Sprint 3':
    'Currents and kelp with real teeth, the combat design built in full, all twenty-nine campaign missions, and the new 3D view of the ocean.',
};

export const footer = {
  note: 'Gameplay footage and the stories of the Rift are on their way. Until then, the roadmap is the game.',
  provenance:
    'Progress on this page is read live from the project’s issue tracker when the page is built; nothing here is updated by hand.',
};
