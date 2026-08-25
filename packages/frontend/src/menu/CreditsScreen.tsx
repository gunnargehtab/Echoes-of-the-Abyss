/**
 * Credits — docs/ui-ux.md §14: static, and honest. The technology roll is
 * docs/tech-stack.md's; no invented names, no padded roles.
 */

export interface CreditsScreenProps {
  onBack(): void;
}

const TECHNOLOGY: Array<{ name: string; role: string }> = [
  { name: 'TypeScript', role: 'one language, both sides of the wire' },
  { name: 'React', role: 'the shell and every chrome screen' },
  { name: 'PixiJS', role: 'the Echo Layer, drawn' },
  { name: 'Colyseus', role: 'the authoritative match server' },
  { name: 'bitecs', role: 'the simulation’s entity store' },
  { name: 'Web Audio', role: 'every sound, synthesised live — no recordings' },
  { name: 'Vite', role: 'the build' },
];

export function CreditsScreen({ onBack }: CreditsScreenProps) {
  return (
    <div className="menu-screen" role="dialog" aria-label="Credits">
      <div className="menu-panel">
        <header className="menu-head">
          <h2>Credits</h2>
          <p className="menu-subtitle">War reverberates in the deep.</p>
        </header>

        <dl className="menu-credits">
          {TECHNOLOGY.map(({ name, role }) => (
            <div key={name} className="menu-credit-row">
              <dt>{name}</dt>
              <dd>{role}</dd>
            </div>
          ))}
        </dl>

        <p className="menu-note">
          Designed doc-first: everything the game does is written down in its design bible before it
          is code, and the bible wins arguments.
        </p>

        <footer className="menu-foot">
          <button type="button" className="menu-back" onClick={onBack} autoFocus>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
