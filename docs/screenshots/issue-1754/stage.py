"""Stage the duel's fleets for the evidence drive; `restore` puts the file back.

Never committed: the served fixture is edited only while the drive runs."""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
P = ROOT / 'packages/backend/src/sim/maps/freeWaterSlice.ts'
KEEP = ROOT / '.dev-loop/freeWaterSlice.ts.orig'
A = "  openingFleet: [...seatFleet(0, 625, EAST), ...seatFleet(1, 3875, WEST)],"
B = """  openingFleet: [
    { seat: 0, kind: UnitKind.LightScout, x: 625, y: 1875, depth: 300, heading: EAST },
    { seat: 0, kind: UnitKind.Corvette, x: 2250, y: 2125, depth: 300, heading: EAST },
    { seat: 0, kind: UnitKind.Cruiser, x: 3250, y: 2250, depth: 550, heading: EAST },
    { seat: 0, kind: UnitKind.AbyssalSubmersible, x: 625, y: 2625, depth: 300, heading: EAST },
    { seat: 1, kind: UnitKind.LightScout, x: 3875, y: 1875, depth: 300, heading: WEST },
    { seat: 1, kind: UnitKind.Corvette, x: 3875, y: 2125, depth: 300, heading: WEST },
    { seat: 1, kind: UnitKind.Cruiser, x: 3875, y: 2375, depth: 300, heading: WEST },
    { seat: 1, kind: UnitKind.AbyssalSubmersible, x: 2250, y: 2375, depth: 2000, heading: WEST },
  ],"""
if sys.argv[1:] == ['restore']:
    P.write_bytes(KEEP.read_bytes())
    print('restored')
else:
    s = P.read_bytes()
    KEEP.write_bytes(s)
    t = s.decode('utf-8')
    assert t.count(A) == 1
    P.write_bytes(t.replace(A, B).encode('utf-8'))
    print('staged')
