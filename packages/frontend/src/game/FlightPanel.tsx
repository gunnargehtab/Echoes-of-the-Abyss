import { ACTIONS, isFlightAction, type FlightAction } from '../input/bindings.ts';
import type { FlightReading } from './flightCamera.ts';

export function FlightPanel({
  reading,
  onFlight,
  onNav,
  onHome,
  onStep,
}: {
  reading: FlightReading | null;
  onFlight(): void;
  onNav(): void;
  onHome(): void;
  onStep(action: FlightAction): void;
}) {
  return (
    <section className="flight-panel" aria-label="Free-water camera">
      <div>
        <button
          type="button"
          aria-pressed={reading?.flying ?? false}
          onClick={(event) => {
            onFlight();
            event.currentTarget.blur();
          }}
        >
          FLIGHT
        </button>
        <button
          type="button"
          aria-pressed={reading?.navigating ?? false}
          onClick={(event) => {
            onNav();
            event.currentTarget.blur();
          }}
        >
          NAV
        </button>
        <button type="button" onClick={onHome}>
          HOME
        </button>
      </div>
      {reading?.flying && (
        <>
          <div className="flight-attitude">
            <svg width="32" height="32" viewBox="-16 -16 32 32" role="img" aria-label="World up">
              <circle r="14" fill="none" stroke="currentColor" />
              <line
                x1="0"
                y1="0"
                x2={reading.upX * 13}
                y2={reading.upY * 13}
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx={reading.upX * 13} cy={reading.upY * 13} r="2" fill="currentColor" />
            </svg>
            <span>
              EYE {reading.depthM} m ·{' '}
              {reading.bearingDeg === null ? 'VERTICAL' : `${Math.round(reading.bearingDeg)}°`}
              {reading.inverted ? ' · INVERTED' : ''}
            </span>
          </div>
          {reading.blocked && <p role="status">NO CAMERA CLEARANCE</p>}
        </>
      )}
      {reading?.navigating && (
        <>
          <p role="status">CAMERA NAV — FLEET SHORTCUTS SUSPENDED</p>
          <div className="flight-motion">
            {ACTIONS.filter((spec) => spec.group === 'nav').map((spec) => (
              <button
                type="button"
                key={spec.action}
                onClick={() => {
                  if (isFlightAction(spec.action)) onStep(spec.action);
                }}
              >
                {spec.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
