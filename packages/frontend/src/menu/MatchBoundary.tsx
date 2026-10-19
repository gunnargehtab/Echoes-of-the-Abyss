/**
 * The match screen's failure — docs/world-map.md §7.6, "A load or join
 * failure" (#1462).
 *
 * The match is the one screen fetched on demand (#442), and a fetch that
 * fails, or a screen that fails as it starts, used to leave the page blank:
 * nothing above the lazy screen caught it. This does, says so, and offers
 * **Retry**, focused, and **Back**. Retry is the shell's, and reloads the
 * page (`reloadForRetry`): a browser keeps a failed module fetch for the life
 * of the page. Every launch has it; a board launch catches a load failure
 * earlier, on the travel's bar, before anything is joined.
 */

import { Component, type ReactNode } from 'react';

export interface MatchBoundaryProps {
  onRetry(): void;
  onBack(): void;
  children?: ReactNode;
}

export class MatchBoundary extends Component<MatchBoundaryProps, { failure: string | null }> {
  override state: { failure: string | null } = { failure: null };

  static getDerivedStateFromError(error: unknown): { failure: string } {
    return { failure: error instanceof Error ? error.message : String(error) };
  }

  override render(): ReactNode {
    if (this.state.failure === null) return this.props.children;
    return (
      <div className="game-root">
        <div className="game-overlay">
          <h2>The match stopped</h2>
          <p>Its code did not load, or it failed.</p>
          <p className="game-overlay-detail">{this.state.failure}</p>
          <div className="game-overlay-controls">
            <button
              type="button"
              className="game-overlay-back"
              onClick={this.props.onRetry}
              autoFocus
            >
              Retry
            </button>
            <button type="button" className="game-overlay-back" onClick={this.props.onBack}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }
}
