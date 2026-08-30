/**
 * The Mouth mark — the game's logo, docs/naming.md "The logo".
 *
 * Inline SVG rather than an image asset so it scales to any lockup and takes
 * its inks from the tokens: the concentric banding is `--neon-violet`, the
 * throat is `--mouth-glow`. Violet is the reserved ink of the unresolved
 * (docs/style-neon-noir.md), and the logo is the one chrome context licensed
 * to spend it — the brand is the thing at the bottom of the Rift.
 */

import { useId } from 'react';

export interface MouthMarkProps {
  /** Rendered width in CSS px. Height follows the 240:184 construction grid. */
  width: number;
}

export function MouthMark({ width }: MouthMarkProps) {
  /* Filter ids are document-global in SVG; useId keeps two marks on one
     screen from cross-wiring. */
  const haloId = `${useId()}-halo`;

  return (
    <svg
      width={width}
      height={(width * 184) / 240}
      viewBox="0 0 240 184"
      fill="none"
      role="img"
      aria-label="Echoes of the Abyss"
    >
      <defs>
        <filter id={haloId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* Halo pass: the glow recipe's second layer, blurred and low-alpha. */}
      <g
        stroke="var(--neon-violet)"
        fill="none"
        filter={`url(#${haloId})`}
        opacity="0.35"
        strokeWidth="3"
      >
        <path d="M 20 28 Q 120 74 220 28" />
        <path d="M 42 56 Q 120 96 198 56" />
        <path d="M 62 84 Q 120 118 178 84" />
        <path d="M 80 112 Q 120 138 160 112" />
        <path d="M 96 138 Q 120 154 144 138" />
      </g>
      {/* The banding: each ring narrower, deeper, and brighter — the inversion
          that makes it the Mouth and not a sonar return. Depth is below, and
          the deep end is the lit end. */}
      <g stroke="var(--neon-violet)" fill="none">
        <path d="M 20 28 Q 120 74 220 28" strokeWidth="1.6" opacity="0.45" />
        <path d="M 42 56 Q 120 96 198 56" strokeWidth="1.8" opacity="0.6" />
        <path d="M 62 84 Q 120 118 178 84" strokeWidth="2" opacity="0.75" />
        <path d="M 80 112 Q 120 138 160 112" strokeWidth="2.2" opacity="0.9" />
        <path d="M 96 138 Q 120 154 144 138" strokeWidth="2.4" opacity="1" />
      </g>
      {/* The throat: the one point of light, and it is not yours. */}
      <circle
        cx="120"
        cy="162"
        r="7"
        fill="var(--mouth-glow)"
        opacity="0.3"
        filter={`url(#${haloId})`}
      />
      <circle cx="120" cy="162" r="2.5" fill="var(--mouth-glow)" />
    </svg>
  );
}
