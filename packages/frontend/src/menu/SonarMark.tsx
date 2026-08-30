/**
 * The sonar-return mark — the game's logo, docs/naming.md "The logo".
 *
 * Inline SVG rather than an image asset so it scales to any lockup and takes
 * its inks from the tokens: the rings are the interface voice (`--neon-cyan`),
 * the contact is the ink that warns (`--neon-red`). The downward fade is the
 * identity's one non-negotiable move — the abyss swallowing the echo — so it
 * is built into the mark itself, not applied by callers.
 */

import { useId } from 'react';

export interface SonarMarkProps {
  /** Rendered size in CSS px. The mark is square. */
  size: number;
}

export function SonarMark({ size }: SonarMarkProps) {
  /* Gradient/mask/filter ids are document-global in SVG; useId keeps two
     marks on one screen (say, a masthead and a footer) from cross-wiring. */
  const uid = useId();
  const fadeId = `${uid}-fade`;
  const maskId = `${uid}-mask`;
  const haloId = `${uid}-halo`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="Echoes of the Abyss"
    >
      <defs>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="200" height="200" fill={`url(#${fadeId})`} />
        </mask>
        <filter id={haloId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* Halo pass: the glow recipe's second layer, blurred and low-alpha. */}
      <g
        mask={`url(#${maskId})`}
        filter={`url(#${haloId})`}
        opacity="0.35"
        stroke="var(--neon-cyan)"
        strokeWidth="2.5"
      >
        <circle cx="100" cy="100" r="28" />
        <circle cx="100" cy="100" r="52" />
        <circle cx="100" cy="100" r="76" />
        <circle cx="100" cy="100" r="96" />
      </g>
      {/* Core rings: each return dimmer than the last — a decaying echo. */}
      <g mask={`url(#${maskId})`} stroke="var(--neon-cyan)" strokeWidth="1.5">
        <circle cx="100" cy="100" r="28" opacity="0.95" />
        <circle cx="100" cy="100" r="52" opacity="0.7" />
        <circle cx="100" cy="100" r="76" opacity="0.5" />
        <circle cx="100" cy="100" r="96" opacity="0.35" />
      </g>
      {/* Survey registration ticks, cardinal N / W / E. No south tick: the
          bottom edge belongs to the fade. */}
      <g stroke="var(--neon-cyan)" strokeWidth="1.5" opacity="0.8">
        <line x1="100" y1="0" x2="100" y2="10" />
        <line x1="0" y1="100" x2="10" y2="100" />
        <line x1="190" y1="100" x2="200" y2="100" />
      </g>
      {/* The emitter — you, at the centre of what you can hear. */}
      <circle cx="100" cy="100" r="3" fill="var(--neon-cyan)" />
      {/* The contact: one return, low in the fade, in the ink that warns. */}
      <line
        x1="103"
        y1="103"
        x2="150"
        y2="150"
        stroke="var(--neon-red)"
        strokeWidth="1"
        opacity="0.35"
      />
      <circle
        cx="153.7"
        cy="153.7"
        r="8"
        fill="var(--neon-red)"
        opacity="0.25"
        filter={`url(#${haloId})`}
      />
      <circle cx="153.7" cy="153.7" r="3.5" fill="var(--neon-red)" />
    </svg>
  );
}
