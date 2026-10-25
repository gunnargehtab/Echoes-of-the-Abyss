/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Override the game server endpoint, e.g. wss://games.example:3000.
   *
   * Optional, and optional-typed for a reason: unset and empty both mean
   * "derive it from the page" (net/GameClient.ts `defaultEndpoint`), because a
   * Dockerfile's `ENV VAR=$ARG` bakes the empty string when no build argument
   * is passed and `??` would take that for an address (#624).
   */
  readonly VITE_SERVER_URL?: string;
  /**
   * This bundle's build tag, from the image's `ECHOES_BUILD` build argument
   * (packages/frontend/Dockerfile). Unset and empty both read as `dev`
   * (net/reports.ts `clientBuild`), for `VITE_SERVER_URL`'s reason.
   */
  readonly VITE_ECHOES_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
