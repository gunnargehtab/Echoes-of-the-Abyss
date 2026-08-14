# Echoes of the Abyss — Tech Stack

For a browser-based RTS (PC-first), the stack needs to give high performance for real-time simulation, smooth rendering for units/particles/UI, easy deployment (no installs), and long-term maintainability.

## Recommended Stack

### Frontend

- TypeScript
- PixiJS (rendering)
- bitecs (ECS)
- Howler.js (audio)
- Optional: React for menus/lobby

### Backend

- Node.js
- Colyseus (multiplayer)
- Redis (real-time caching)
- PostgreSQL (persistent data)

### Build Tools

- Vite
- ESBuild

### Deployment

- Vercel (frontend)
- Hetzner Cloud (game servers, low latency in Germany)

## Rationale & Alternatives Considered

### Core Engine

- **PixiJS** (chosen) — fastest for UI-heavy RTS, great WebGL/2D rendering for isometric maps, fog of war, particle effects
- **Phaser** — easiest to start, great tooling, viable alternative
- **Unity WebGL** — full 3D engine, strong editor, but heavy on memory and slower on older machines; good if pursuing Command & Conquer 3-style 3D visuals
- **Godot Web Export** — lightweight, open source, great 2D engine, improving web export; good for a stylized 2D RTS

### Game Logic & Simulation

- **Language:** TypeScript, for type safety and fewer bugs in complex RTS logic
- **Architecture:** Entity Component System (ECS) for units/buildings/projectiles, fixed-step game loop (e.g. 60 ticks/sec), deterministic simulation for multiplayer
- **ECS libraries considered:** bitecs (fastest JS ECS, chosen), ecsy (Mozilla, very clean API)

### Networking

- **Colyseus** (chosen) — real-time multiplayer framework with built-in state sync, works well with TypeScript, ideal for RTS
- **Custom WebSocket server** (Node.js + ws) — full control, more work
- **WebRTC** — peer-to-peer, harder to make deterministic, not ideal for RTS unless already experienced with it

### Backend & Infrastructure

- **Server runtime:** Node.js (TypeScript)
- **Database:** PostgreSQL for player accounts/saves, Redis for matchmaking and real-time state caching
- **Hosting:** Vercel/Netlify for frontend; AWS/Hetzner for game servers

### Art & Asset Pipeline

- **Rendering style:** 2D isometric (like C&C, Warcraft II), 2.5D with WebGL shaders, or full 3D if using Unity/Godot
- **Tools:** Blender (submarine models, terrain), TexturePacker (spritesheets), Spine or DragonBones (unit animations)

This stack gives high performance, easy development, and long-term stability.
