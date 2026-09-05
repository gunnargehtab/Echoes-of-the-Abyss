/**
 * Plate VII, under the board — docs/ui-ux.md §14, "The chart".
 *
 * A transcription of docs/concept-art/plate-07-rift-chart.svg's anatomy — the
 * Lid hatched across the top, the valley's contours, the thermocline as a
 * dashed contour, the old transit line, the Mouth's rings, the depth rail —
 * with the campaign's twenty-nine slots drawn on it as marks, each on the
 * ground its mission is played on. The paths below are the plate's own, in the
 * plate's coordinate space, so the chart a player sees here is the chart
 * docs/world-map.md calls canonical and not a second map that resembles it.
 *
 * What is not transcribed is the plate's text: at a board's scale the survey's
 * labels would be noise, so the chart carries the region names and the rail
 * and nothing else, and the ground a mark stands on is read in the caption
 * beside it, in DOM text at a reading size.
 *
 * Colour: the plate's chrome is `--text-bright` and the plate's faction
 * accents are `FACTION_PALETTE`'s glow, read at render so the colour-vision
 * palettes apply (docs/ui-ux.md §11). A region is labelled in the ink of the
 * navy whose water it is, as the plate does — "faction accents only where the
 * world itself is that faction's" — and a mark is inked in its campaign's. The
 * two inks disagreeing on one spot is the chart saying whose mission is in
 * whose water, which is the thing this drawing exists to say.
 *
 * Decorative to a screen reader, and deliberately: every fact on it is also in
 * each slot's accessible name (`CampaignScreen`), so hiding the SVG loses
 * nothing and announcing two hundred paths would gain nothing.
 */

import type { CSSProperties } from 'react';
import { Faction } from '@echoes/shared';
import { FACTION_PALETTE } from '../game/palette.ts';
import { DEPTH_RAIL, railY, type ChartMark } from './riftChart.ts';

export interface RiftChartProps {
  marks: readonly ChartMark[];
  /** The slot key the board is on — hovered, or focused when nothing is hovered. */
  spotlight: string | null;
  /** The pointer is over a mark, or has left the chart. */
  onHover(slotKey: string | null): void;
  /** A mark was pressed: move the board's focus to its slot. */
  onPick(slotKey: string): void;
}

const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;
const ink = (faction: Faction | null): string | undefined =>
  faction === null ? undefined : hex(FACTION_PALETTE[faction].glow);

/**
 * The valley's depth contours — Plate VII's five, verbatim: wide in the
 * shallow north, narrowing to the Mouth in the south.
 */
const CONTOURS: ReadonlyArray<readonly [number, string]> = [
  [
    0.28,
    'M300 430 C 520 400, 1480 400, 1700 430 C 1740 700, 1640 1000, 1520 1300 C 1420 1580, 1340 1820, 1250 2020 C 1180 2160, 900 2160, 830 2020 C 740 1820, 640 1560, 570 1300 C 480 1000, 290 700, 300 430 Z',
  ],
  [
    0.2,
    'M420 520 C 620 480, 1380 480, 1580 520 C 1620 760, 1540 1020, 1440 1280 C 1350 1520, 1280 1760, 1200 1960 C 1140 2100, 940 2100, 880 1960 C 800 1760, 720 1520, 650 1280 C 560 1020, 400 760, 420 520 Z',
  ],
  [
    0.14,
    'M560 640 C 740 600, 1280 600, 1440 660 C 1480 880, 1420 1100, 1340 1320 C 1260 1540, 1200 1760, 1140 1930 C 1090 2060, 990 2060, 940 1930 C 880 1760, 810 1540, 740 1320 C 660 1100, 540 880, 560 640 Z',
  ],
  [
    0.1,
    'M700 800 C 860 760, 1200 760, 1320 820 C 1350 1000, 1300 1200, 1240 1380 C 1180 1560, 1130 1760, 1090 1900 C 1060 2000, 1020 2000, 990 1900 C 950 1760, 900 1560, 850 1380 C 790 1200, 690 1000, 700 800 Z',
  ],
  [
    0.07,
    'M880 1560 C 960 1520, 1120 1520, 1190 1580 C 1210 1720, 1170 1860, 1130 1970 C 1100 2050, 1000 2050, 970 1970 C 930 1860, 890 1720, 880 1560 Z',
  ],
];

/** The 1,200 m line — not a place but a divide (docs/world-map.md §2). */
const THERMOCLINE = 'M330 1150 C 620 1210, 1380 1210, 1670 1150';

/** The civic transit line, north–south through the drowned city. */
const TRANSIT = 'M1000 470 C 1010 700, 990 900, 1000 1120 C 1010 1340, 1000 1500, 1010 1700';

/**
 * The regions, labelled where the plate labels them and in whose ink the plate
 * gives them. `null` is chrome: neutral ground, and the Mouth, which is
 * nobody's and takes the violet the shell reserves for the unresolved.
 */
interface RegionLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'end';
  faction: Faction | null;
  mouth?: true;
}

const REGIONS: readonly RegionLabel[] = [
  {
    text: 'THE PLATEAUS · SHELF 200–400 m',
    x: 300,
    y: 470,
    anchor: 'start',
    faction: Faction.Pelagia,
  },
  {
    text: 'THE WEST WALL · THE THERMAL GRID',
    x: 470,
    y: 866,
    anchor: 'start',
    faction: Faction.Bathyarch,
  },
  { text: 'THE DROWNED CITY', x: 940, y: 1230, anchor: 'end', faction: null },
  {
    text: 'RESONANCE FIELDS · 1,400–2,900 m',
    x: 1760,
    y: 1070,
    anchor: 'end',
    faction: Faction.Hadron,
  },
  {
    text: 'THE TRENCH COUNTRY · NINE, COUNTED DOWNWARD',
    x: 300,
    y: 1900,
    anchor: 'start',
    faction: Faction.Directorate,
  },
  { text: 'THE MOUTH · 4,410 m', x: 1130, y: 2352, anchor: 'start', faction: null, mouth: true },
];

/** Rail ticks the plate labels: the band boundaries and the floor. */
const RAIL_LABELS: Record<number, string> = {
  0: '0 m',
  400: '400',
  1200: '1,200',
  1800: '1,800',
  4410: '4,410',
};

export function RiftChart({ marks, spotlight, onHover, onPick }: RiftChartProps) {
  const lit = marks.find((mark) => mark.slotKey === spotlight) ?? null;
  return (
    <svg
      className="rift-chart"
      viewBox="230 280 1770 2180"
      aria-hidden="true"
      focusable="false"
      onMouseLeave={() => onHover(null)}
    >
      <defs>
        {/* The plate's hatch: diagonal hairlines through the sour band. */}
        <pattern id="rift-lid-hatch" width="60" height="120" patternUnits="userSpaceOnUse">
          <path d="M0 120 l60 -120" className="rift-chart-hatch" />
        </pattern>
      </defs>

      {/* The Lid — dead since the Collapse, held at 150 m (docs/world.md). */}
      <rect x="240" y="300" width="1520" height="90" fill="url(#rift-lid-hatch)" />
      <line x1="240" y1="390" x2="1760" y2="390" className="rift-chart-lid-line" />
      <text x="240" y="352" className="rift-chart-label rift-chart-label-lid">
        THE LID · SOUR WATER · 0–150 m
      </text>

      {/* The valley, shallow and wide in the north to the Mouth in the south. */}
      <g className="rift-chart-contour">
        {CONTOURS.map(([opacity, d]) => (
          <path key={d.slice(0, 12)} d={d} style={{ opacity }} />
        ))}
      </g>

      <path d={TRANSIT} className="rift-chart-transit" />

      <path d={THERMOCLINE} className="rift-chart-layer" />
      <text x="1690" y="1140" textAnchor="end" className="rift-chart-label rift-chart-label-dim">
        THE LAYER · 1,200 m
      </text>

      {/* The Mouth: described, measured, not explained. */}
      <g className="rift-chart-mouth">
        {[14, 30, 48, 68, 90].map((r, index) => (
          <circle key={r} cx="1000" cy="2400" r={r} style={{ opacity: 0.9 - index * 0.19 }} />
        ))}
        <circle cx="1000" cy="2400" r="4" className="rift-chart-mouth-core" />
      </g>

      {REGIONS.map((region) => (
        <text
          key={region.text}
          x={region.x}
          y={region.y}
          textAnchor={region.anchor}
          className={`rift-chart-label${region.mouth ? ' rift-chart-label-mouth' : ''}`}
          style={{ color: ink(region.faction) } as CSSProperties}
        >
          {region.text}
        </text>
      ))}

      {/* The depth rail, right margin — the plate's own ticks. */}
      <g className="rift-chart-rail">
        <line x1="1810" y1={DEPTH_RAIL[0][1]} x2="1810" y2={DEPTH_RAIL[DEPTH_RAIL.length - 1][1]} />
        {DEPTH_RAIL.map(([depth, y]) => (
          <g key={depth}>
            <line x1="1802" y1={y} x2="1818" y2={y} />
            <text x="1826" y={y + 14} className="rift-chart-label rift-chart-label-dim">
              {RAIL_LABELS[depth]}
            </text>
          </g>
        ))}
        {lit !== null && (
          // The lit slot's depth, read on the rail: how deep, in the survey's
          // own scale rather than only as a number in the caption.
          <g className="rift-chart-rail-lit" style={{ color: ink(lit.faction) } as CSSProperties}>
            <line x1="1790" y1={railY(lit.ground.depthM)} x2="1830" y2={railY(lit.ground.depthM)} />
          </g>
        )}
      </g>

      {/* The marks — one per slot, on its ground, in its campaign's ink. */}
      <g className="rift-chart-marks">
        {marks.map((mark) => {
          const isLit = mark.slotKey === spotlight;
          return (
            <g
              key={mark.slotKey}
              className={`rift-chart-mark rift-chart-mark-${mark.slot.state}${isLit ? ' rift-chart-mark-lit' : ''}`}
              style={{ color: ink(mark.faction) } as CSSProperties}
              onMouseEnter={() => onHover(mark.slotKey)}
              onClick={() => onPick(mark.slotKey)}
            >
              {isLit && <circle cx={mark.x} cy={mark.y} r="64" className="rift-chart-mark-halo" />}
              {/* A hit area wider than the mark, or a pointer has to find 5 px. */}
              <circle cx={mark.x} cy={mark.y} r="50" className="rift-chart-mark-hit" />
              <circle cx={mark.x} cy={mark.y} r={isLit ? 34 : 26} className="rift-chart-mark-dot" />
              {mark.slot.state === 'played' && (
                // Cyan tells you: the registration tick, as a ring.
                <circle cx={mark.x} cy={mark.y} r="42" className="rift-chart-mark-played" />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
