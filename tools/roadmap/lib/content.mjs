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
 * **Short on purpose.** A visitor decides in a screen or two whether this is
 * a game they want, and the page's own length is the first thing arguing
 * against it. One idea per card, the fewest words that keep the fact intact,
 * and no sentence that only tells the reader what the page is about — the
 * page is right there. The design docs are where the long version lives.
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
    'Two centuries after the surface ocean was poisoned, four navies fight for the last habitable water at the bottom of the Pelagion Rift. There is no line of sight down here. Every ship makes noise, every ship listens, and everything that makes you strong makes you loud.',
  motto: 'In the abyss, every echo is a warning.',
  primary: { label: 'What you can play', href: '#play' },
  secondary: { label: 'What is next', href: '#next' },
};

export const pillars = [
  {
    title: 'You do not see. You listen.',
    text: 'There is no fog of war to lift. Every hull makes noise and listens for everyone else’s, and a contact reaches you in five grades of certainty. The enemy is grading you the same way.',
  },
  {
    title: 'The ping is a bargain you will regret.',
    text: 'Active sonar shows you everything within 900 metres. It shows you to everything within 2,400.',
  },
  {
    title: 'Loud is strong. Strong is loud.',
    text: 'Mining is loud, building is loud, firing is loud. Silent running buys you invisibility and costs you everything else.',
  },
  {
    title: 'Depth is a commitment.',
    text: 'Diving is fast and deafening, rising is slow and silent, and pressure eats a hull below its rating. The best resources are at the bottom, so a deep raid succeeds, retreats, or dies.',
  },
  {
    title: 'The water is alive, and listening.',
    text: 'Sea life answers the loudest thing it hears and looks exactly like a warship until you get close. And at 4,410 metres sits the Mouth, which answers a sonar ping before it is sent.',
  },
];

export const factions = [
  {
    name: 'Bathyarch Consortium',
    accent: '#f2b233',
    line: 'The loudest thing in the Rift, and proud of it.',
    text: 'An industrial megacorporation that became a government by accident. It runs the heat, the freight, and — through debt — half the population.',
    plays: 'Wins by attrition. Fears insolvency.',
  },
  {
    name: 'Pelagia Commune',
    accent: '#8fe36b',
    line: 'Grown, not built.',
    text: 'Farmers who feed the Rift, in ships closer to animals than machines: chitin hulls, muscle-driven propulsion, sensor organisms.',
    plays: 'Wins by map control. Fears being made to fight.',
  },
  {
    name: 'Abyssal Directorate',
    accent: '#c2465e',
    line: 'They listen better than anyone.',
    text: 'Eight generations of engineered trench-dwellers who can walk out of an airlock at 3,000 metres. No debt, no wage, universal everything — and nobody in it chose any of it.',
    plays: 'Wins by information and numbers. Fears being wrong about what is below.',
  },
  {
    name: 'Hadron Knights',
    accent: '#c9a6ff',
    line: 'Sound as a weapon.',
    text: 'Thirty thousand crystal-workers in a techno-order that recruits by acoustic aptitude at age nine. The only faction that cannot grow.',
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
  text: 'Every hull and yard in the game, seen the way the sonar chart draws your own force. Each glows exactly as loud as it is. An enemy is a silhouette at best.',
  alt: 'Contact sheet of every hull and yard in the game, seen from above, one row per navy: Consortium in amber, Commune in green, Directorate in red, Knights in violet, each hull labelled with its class and its length in metres.',
  caption: 'Re-baked whenever the art changes — the current roster, not a mock-up.',
};

/** What exists and runs today. Counts are filled in at build time. */
export const playable = [
  {
    title: 'A {missions}-mission campaign',
    text: 'A prologue that teaches you to listen, then four seven-mission campaigns in any order, each retelling what the others showed you from the other side. Four endings, none of them canon.',
  },
  {
    title: 'Skirmish against an AI that hears what you hear',
    text: 'Recruit or Veteran, and neither cheats: the opponent gets the same sonar picture you do. Difficulty is how well it thinks, not how much it sees.',
  },
  {
    title: 'Multiplayer on the same water',
    text: 'A lobby, faction pick, reconnection after a drop, a result screen and a rematch.',
  },
  {
    title: '{maps} maps, {factions} navies',
    text: 'The Ventfront Divide, where the safe middle is the quiet middle. The Kelp Labyrinth, which ruins your sense of how far away anything is. The Abyssal Rift Corridor, which carries every sound its whole length.',
  },
  {
    title: 'A full soundscape',
    text: 'Every contact has its own sound for how well you know it, panned to its bearing and coloured by the water it came through. Your own noise sits under all of it.',
  },
  {
    title: 'A three-layer ocean you can see',
    text: 'A perspective view over a sculpted seabed, ships sailing at their true depth, and a ribbon that warns before a dive would crush you.',
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
    text: 'Not reliably. In a four-player test batch, 29 of 30 matches ran to the 25-minute limit with no winner.',
    fixed:
      'They do now. Four-player matches used to stall to the 25-minute limit — 29 of 30 in one test batch — and the AI has since been taught to close one out.',
  },
  430: {
    question: 'Does it stay smooth with a big fleet?',
    text: 'Up to about 160 hulls on the water. Past that, the sonar picture starts to lag behind the action.',
    fixed:
      'It does now. Past about 160 hulls the sonar picture used to lag behind the action; the detection pass has since been reworked to keep up.',
  },
  286: {
    question: 'How does it run on a real PC or phone?',
    text: 'Unmeasured. Every frame-rate number so far comes from a software renderer in a test container, never from real hardware.',
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
      'A glossary, a simulation of sound with nothing around it yet, and the checks that stop the writing and the code drifting apart.',
  },
  1: {
    title: 'Depth becomes a choice',
    blurb: 'The ocean was always three bands deep on paper. Here ships learned to dive.',
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
    blurb: 'The engine that runs a scripted mission, and then all twenty-nine of them.',
  },
  9: {
    title: 'The new view of the ocean',
    blurb: 'The 3D presentation landed; these were the promises it made on the way.',
  },
  10: {
    title: 'What is next',
    blurb: 'A full review in September 2026 produced this list. First on it: matches that end.',
  },
  11: {
    title: 'Playing it against other people',
    blurb:
      'Ranked matches, teams, and watching a game you are not in — without handing the audience a map the players cannot see.',
  },
  12: {
    title: 'After the game ships',
    blurb: 'A fifth navy of mercenaries, selling the hulls every side already builds.',
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
  'The roster, wave by wave': 'A fleet of your own',
  'The fleet as buildable source': 'How the ships get made',
  'The Biomass account': 'Kelp, herds, and what they pay',
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
  10: 'The sound model as working code, before there was a game around it',
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
  57: 'The bar art has to clear before it ships, and a check that the game still runs on a phone',
  34: 'The five grades of certainty disagreed with themselves — some documents counted six',
  35: 'Every hull’s listening range was a number the code made up; the design had never chosen one',
  36: 'The test bench and the game were computing detection two different ways',
  37: 'Sound was measured at the source instead of along the path it travels — the model the whole game rests on, wrong where it is worked out',
  38: 'About 270 formatting faults in the design documents, and a check that only reported them',
  39: 'Seven documents were linked from others and had never been written',
  // Phase 1
  98: 'Dive and surface on command — diving fast and loud, rising slow and silent',
  99: 'A depth ribbon, a pressure badge and crush warnings on the HUD',
  100: 'Resonance Crystal at the bottom of the ocean, and the tech it unlocks',
  // Phase 2
  101: 'A real audio engine, mixed per player',
  102: 'Contacts you can hear: a different sound per grade of certainty, panned to its bearing',
  103: 'Your own noise in the mix, a cue when you are heard, active sonar and silent running',
  // Phase 3
  104: 'The Drift: sea life that answers the loudest thing and looks like a warship until you get close',
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
  149: 'Movement fixes: hulls stacking wrongly, and eruptions throwing ships off the map',
  150: 'Terrain that blocks: ridges, roofs and rock you cannot sail through',
  151: 'Cold shock currents that push your fleet',
  152: 'Kelp that entangles',
  153: 'The Sounder wrecks structures by swimming through them',
  154: 'The Directorate pays for lingering in shallow water',
  // Phase 8
  190: 'The mission engine, proven on the prologue: Sorrowgate',
  // Phase 9
  283: 'Contacts you are unsure of drawn as a column of water, not at a depth you never earned',
  284: 'Hulls stay readable when you zoom all the way out',
  285: 'You can hear it when the surface is hurting your hull',
  286: 'Frame-rate testing on a real graphics card and on a phone',
  // Phase 10
  440: 'Skirmishes that end: the AI learns to close out a match instead of stalling to the limit',
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
  495: 'A whole fleet of your own: scouts, line ships, siege, ordnance and transports per navy',
  501: 'Transports: hulls that carry a force in their hold, where nothing can hear it',
  437: 'A population cap, sized to what the water can carry',
  438: 'A tighter map and redesigned superweapons',
  439: 'Competitive play: a map pool, a ladder, accounts and an observer mode',
  535: 'Biomass that never grows back, and is paid to whoever stands nearest',
  543: 'Mercenaries — a fifth navy selling the hulls every side already builds',
  547: 'Kelp you can harvest — and the cover you spend by harvesting it',
  441: 'Hosting: a server you can join from anywhere on the internet',
  442: 'Faster loading: art fetched on demand, smaller downloads',
  443: 'More automated testing so updates do not break things',
  445: 'This roadmap, rewritten to tell the truth',
  458: 'A fair fight between the Consortium and the Directorate',
  467: 'The Commune’s minelayer and its living seeder, in the hands of the computer opponent',
  463: 'Longer fights, and a mine the defender can drop in the face of whatever is chasing it',
  472: 'A chart that goes vague where nothing of yours is listening',
  478: 'Harvesters that would not move in the Prologue',
  480: 'The tetherjelly forests one mission needs before it can grow them',
  491: 'Crystal worth going after: today the deep field is further away than any navy can afford',
  494: 'Automated testing for the menus, so rebinding, UI scale and the colour palettes keep working',
  454: 'A fair fight between all four navies',
  518: 'Teaching the computer opponent to build the shipyard its best hulls come out of',
  520: 'The Directorate able to afford the two hulls its own shipyard exists to build',
  621: 'The computer opponent given every order a player can give, rather than most of them',
  462: 'Upgrades and veteran crews: what a navy can improve mid-match, and how loud that is',
  461: 'The nine hulls of the second tier, built into the game',
  466: 'Models for those nine, so they look like the navy that sails them',
  498: 'The groundwork for a fleet: the measurements every later wave gets judged by',
  506: 'Scouts: hulls that run with the engine off, and ping on a cadence instead of on command',
  507: 'Ordnance: torpedo boats, a screen you lay in the water, and a shot you commit to',
  508: 'Siege: hulls that break bases, and damage that depends on what it hits',
  509: 'A line ship for every navy, and an opening set of hulls that differs by who you are',
  510: 'The three hulls every navy shares: kept, and the balance lab says why',
  529: 'The Knights build their own corvette instead of the generic one',
  531: 'A mid-sized warship for the two navies that lacked one — and the first guns that aim at the loudest ship in range rather than the nearest',
  517: 'A refit the Consortium can buy to take its whole fleet deeper',
  540: 'Every ship built from an editable script, so a navy can be redesigned in one place',
  546: 'The Commune’s seeder and its minelayer, rebuilt that way',
  553: 'The turrets, rebuilt that way, in each navy’s own style',
  640: 'The Clarion’s horn seams straightened back to the symmetry the Order builds to',
  645: 'The flaws the rebuilt models copied faithfully from the originals, listed to fix on purpose',
  650: 'Two hulls that came out mirrored — the Dredge’s claw and the Precentor’s rank, put back',
  652: 'The last twenty buildings rebuilt from scripts: every navy’s yards, and the four landmarks',
  530: 'The Directorate’s own line ship, which today it can afford about once a match',
  549: 'Kelp beds that thin as they are cut — and stop hiding you when they do',
  554: 'Kelp that grows back, and sea life that repopulates, at the rate the water’s health sets',
  557: 'A reactor that harvests a kelp bed — and eats the cover it stands in while it works',
  560: 'Sea life pays the navy that killed it, instead of whoever happened to be nearest',
  487: 'Automated testing for the game shell, the network messages and the audio mix',
  489: 'Every network message declared in one place, so a rename cannot quietly break the game',
  628: 'Every network message checked against that one table as it arrives, rather than by hand',
  515: 'Automated testing for the pause menu, down to where the keyboard goes',
  504: 'This roadmap again: it kept stating things that go out of date on their own',
  469: 'An outside read of the story — whether the world arrives for a player',
  534: 'The campaign read start to finish, in play order, to see what a player learns and when',
  623: 'The signature meter reading your fleet rather than your base, so the prologue teaches a number you can move',
  636: 'A stricter check that every map starts its navies on ground the map actually paints',
  655: 'The sea-life health bands, which read as recovering slightly at their very worst',
  663: 'The mix is still too loud on a phone: finding which layer of it is the loud one',
  654: 'The Directorate wins three decided matches in four — measured and recorded, and left alone until the systems around it stop moving',
};

export const sprints = {
  'Sprint 1':
    'The world on paper: the design bible, the four navies, the rules of sound and depth, and the first playable scaffold.',
  'Sprint 2':
    'Depth became an order, the game got its sound, the map grew sea life and hazards, and an AI opponent made it playable alone.',
  'Sprint 3':
    'Currents and kelp with real teeth, combat built in full, all twenty-nine campaign missions, and the new 3D view of the ocean.',
  'Sprint 4':
    'Every navy got a fleet of its own, the chart learned to go dark where nothing of yours is listening, and kelp became something you harvest and hide in.',
};

export const footer = {
  note: 'Gameplay footage and the stories of the Rift are on their way. Until then, the roadmap is the game.',
  provenance: 'Every state on this page is read from the issue tracker when the page is built.',
};
