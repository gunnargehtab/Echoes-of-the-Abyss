"""#1622 staging: a silence breach and a stalled walk, forced by the server inside env windows.

The patch it applies is never committed. `apply` saves runtime.ts to
.dev-loop/runtime.ts.orig and patches it; `restore` puts the original back. Start
`npm run dev` after `apply` with FIT_BREACH and FIT_STALL set to windows in seconds of
mission time, `a-b,c-d`. A breach holds the flight's peak at 72, descent's floor and the
one way over Sorrowgate's ceiling (mission-sorrowgate.md §4); a stall marks the live walk
row stalled, as a hull over 26 or a foreign hull on it does (mission-convocation.md §4.2).
"""
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
TARGET = ROOT / 'packages/backend/src/sim/missions/runtime.ts'
SAVED = ROOT / '.dev-loop/runtime.ts.orig'  # .dev-loop/ is gitignored scratch

HELPER = (
    "const TICK_DT_S = ECHO_TICK_INTERVAL / SIM.TICK_HZ;\n"
    "// FIT-STAGING (#1622), never committed.\n"
    "const fitIn = (name: string, tick: number): boolean =>\n"
    "  (process.env[name] ?? '')\n"
    "    .split(',')\n"
    "    .filter(Boolean)\n"
    "    .some((w) => {\n"
    "      const [a, b] = w.split('-').map(Number);\n"
    "      const s = tick / SIM.TICK_HZ;\n"
    "      return s >= a! && s < b!;\n"
    "    });\n"
)

EDITS = [
    ("const TICK_DT_S = ECHO_TICK_INTERVAL / SIM.TICK_HZ;\n", HELPER),
    (
        "    const peak = this.flightPeakSig(own);\n",
        "    const peak = fitIn('FIT_BREACH', world.tick) ? 72 : this.flightPeakSig(own);\n",
    ),
    (
        "    this.walkStalling = anyStalling;\n",
        "    if (fitIn('FIT_STALL', world.tick)) anyStalling = true;\n"
        "    this.walkStalling = anyStalling;\n",
    ),
]


def apply():
    text = TARGET.read_text(encoding='utf-8')
    for old, new in EDITS:
        if text.count(old) != 1:
            sys.exit(f'anchor not unique: {old!r}')
    shutil.copyfile(TARGET, SAVED)
    for old, new in EDITS:
        text = text.replace(old, new)
    TARGET.write_text(text, encoding='utf-8', newline='\n')
    print('patched')


def restore():
    shutil.copyfile(SAVED, TARGET)
    print('restored')


{'apply': apply, 'restore': restore}[sys.argv[1]]()
