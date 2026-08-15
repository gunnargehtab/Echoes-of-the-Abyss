/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the game server endpoint, e.g. ws://localhost:3000 */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
