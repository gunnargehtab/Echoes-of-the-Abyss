# Echoes of the Abyss — Development Setup

This is a monorepo with separate frontend and backend packages built with the tech stack defined in [docs/tech-stack.md](docs/tech-stack.md).

## Project Structure

```
packages/
├── frontend/          # Web client (PixiJS + React + TypeScript)
│   ├── src/
│   │   ├── main.tsx   # Entry point
│   │   ├── App.tsx    # Root component
│   │   └── ...
│   ├── index.html     # HTML template
│   ├── vite.config.ts # Vite configuration
│   └── package.json
└── backend/           # Game server (Node.js + Colyseus)
    ├── src/
    │   ├── index.ts   # Server entry point
    │   └── ...
    ├── package.json
    └── tsconfig.json
```

## Installation

Requires Node.js 24+ and npm 11+. Install once at the root:

```bash
npm install
```

This installs dependencies for all workspaces using npm's monorepo support.

## Development

### Frontend
```bash
npm -w packages/frontend run dev
```
Starts Vite dev server on `http://localhost:5173`

### Backend
```bash
npm -w packages/backend run dev
```
Starts the Colyseus server with hot reload on `http://localhost:3000`

### Both together
```bash
npm run dev
```
Runs frontend and backend in parallel (in background shells).

## Build

### Frontend only
```bash
npm -w packages/frontend run build
```
Output: `packages/frontend/dist/`

### Backend only
```bash
npm -w packages/backend run build
```
Output: `packages/backend/dist/index.js`

### All
```bash
npm run build
```

## Type checking

```bash
npm -w packages/frontend run type-check
npm -w packages/backend run type-check
```

## Linting

```bash
npm -w packages/frontend run lint
npm -w packages/backend run lint
```

## Tech Stack Overview

| Layer | Tech | Why |
|---|---|---|
| Frontend rendering | PixiJS | Fast WebGL for isometric RTS rendering |
| Game logic | bitecs (ECS) | High-performance entity-component system |
| Audio | Howler.js + Web Audio | Flexible audio playback for Echo Layer sonar |
| Networking | Colyseus | Real-time state sync, server-authoritative |
| Backend runtime | Node.js + Express | TypeScript, easy deployment |
| Build | Vite + ESBuild | Fast development and production builds |

## Echo Layer Implementation Notes

- **Server-authoritative detection** — acoustic resolution tiers computed server-side per-player (prevents maphack)
- **5 Hz tick rate** — spatial hash evaluation at 5 Hz with **2 ms/tick budget**
- **Per-player state** — only resolved detection result sent to each client, never raw map state

See [docs/systems-echo.md](docs/systems-echo.md) and [docs/tech-stack.md](docs/tech-stack.md) for full details.

## Next Steps

1. **Frontend**: Set up PixiJS canvas renderer and ECS game loop
2. **Backend**: Define game room, unit entities, and Echo Layer spatial hash
3. **Networking**: Sync Echo Layer detection results to clients via Colyseus
4. **Audio**: Integrate Howler.js playback for sonar pings and resolution tiers

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for architecture and design conventions.
