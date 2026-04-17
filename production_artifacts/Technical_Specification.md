# Technical Specification: Screaming Fred — The Tactical Chronicles

## Executive Summary

Screaming Fred: The Tactical Chronicles is a **multiplayer interactive fiction PWA** (MUD-style text adventure) set in Sentientworldia. Players form parties of up to 3 to explore a 30×30 world matrix using text commands, where each world square contains a tactical 5×5 sub-grid for high-detail interactions, combat, and discovery.

This document reflects the **post-pivot architecture** — the game has transitioned from a 2D Phaser.js platformer to a React-based text adventure backed by Firebase Firestore real-time sync.

## Requirements

### Functional Requirements

- **Text Adventure Engine**: Players interact via typed commands (`look`, `move`, `interact`, `scream`, `talk`, `attack`, `inventory`). All game state is communicated through a scrolling narrative text log.
- **Tactical 5×5 Grid**: Each room in the world is a 5×5 grid. Players navigate tile-by-tile, encountering NPCs, items, enemies, and environmental triggers. A visual grid viewer shows the current room layout.
- **Character Abilities**:
  - **Fred's Sonic Scream**: Deals 2 damage to scream-vulnerable enemies, triggers environmental effects, and advances NPC dialogue.
  - **Willy's Search** *(Phase 2)*: Reveals hidden items and secret passages.
- **NPC Dialogue System**: Multi-stage branching dialogues with hints. Dialogue advances through interaction or scream triggers.
- **Item Interaction**: Containers (fridges, wardrobes, bushes) can be opened to collect items. Item state persists (opened containers remain open).
- **Combat**: Turn-based combat with enemy HP tracking, player damage, counter-attacks, and defeat/victory conditions. Enemies have configurable linger timers and proximity triggers.
- **Multiplayer Co-op** *(Phase 2)*: 3-player parties with shared discovery state and individual inventories, synced via Firestore `onSnapshot` listeners.
- **30×30 World Map** *(Phase 3)*: Connected world with theme-locked regions, fog-of-war, and room transitions.
- **No-Code Level Editor** *(Phase 4)*: Browser-based "Hidden Hideout" editor for community-created rooms with theme-locked palettes and test-run validation.

### Non-Functional Requirements

- **Zero-Install PWA**: Runs in any modern browser, desktop or mobile, with no app store or plugin required.
- **Real-Time Sync**: Firestore stream-based snapshots for instant party state synchronization.
- **Data Integrity**: Firestore Security Rules to protect level publishing and player state.
- **Mobile-First Responsive**: Stacked layout on narrow viewports, touch-friendly command input.

## Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Build** | Vite 8 | Dev server, HMR, production bundling |
| **UI** | React 19 | Component-based UI for chat, grid, HUD |
| **State** | Zustand 5 | Client-side game state management |
| **Backend** | Firebase (Firestore, Auth) | Real-time data sync, authentication |
| **Styling** | Vanilla CSS | Dark terminal aesthetic, no dependencies |
| **Fonts** | JetBrains Mono + Outfit | Monospace terminal + display headings |
| **Deployment** | Vercel | Git-based continuous deployment |

### Key Architecture Decisions

- **Pure-function engine**: The command parser and room engine are stateless pure functions (`processCommand(state, input) → { newState, messages }`). This makes the engine testable and Firestore-sync-ready.
- **No canvas/game engine**: Phaser.js was fully removed. The UI is standard React components — a scrolling `ChatLog`, a `CommandInput` with history, a `GridViewer` for the 5×5 map, and a `PlayerHUD` for status.
- **JSON room schema**: Rooms are defined as `TacticalRoom.json` files containing the 5×5 grid layout, tile definitions, NPC dialogues, item contents, and enemy configurations.

### Source Layout

```
app_build/src/
├── engine/               # Game logic (no React dependency)
│   ├── commandParser.js  # Input parsing & command aliases
│   ├── roomEngine.js     # Core game loop & command handlers
│   └── textGenerator.js  # Narrative text templates
├── data/
│   └── testRoom.json     # Shoelace Forest test room
├── components/           # React UI
│   ├── ChatLog.jsx       # Scrolling text log
│   ├── CommandInput.jsx  # Input with command history
│   ├── GridViewer.jsx    # 5×5 tactical grid
│   └── PlayerHUD.jsx     # HP, inventory, position
├── store/
│   └── useStore.js       # Zustand state management
├── firebase/
│   └── config.js         # Firebase initialization
├── App.jsx               # Main layout shell
├── App.css               # Component & layout styles
└── index.css             # Design system tokens
```

## State Management

The Zustand store manages:
- `gameState`: Current room data, player position, HP, inventory, state flags, NPC stages, enemy HP, turn count
- `gameLog[]`: Array of `{ text, type, timestamp }` messages for the chat log
- `submitCommand(rawInput)`: Processes player input through the engine pipeline
- `initGame()`: Loads room data and generates welcome messages

## Implementation Phases

| Phase | Status | Description |
|---|---|---|
| **Phase 1: Solo Text Engine** | ✅ Complete | Command parser, room engine, text generator, test room, all UI components |
| **Phase 2: Multiplayer Party System** | ⬜ Not Started | Party creation/join, Firestore sync, shared state, action feed |
| **Phase 3: 30×30 World Map** | ⬜ Not Started | World overview, room transitions, theme system, persistent world state |
| **Phase 4: No-Code Level Editor** | ⬜ Not Started | Theme-locked palette, 5×5 grid designer, dialogue editor, publish pipeline |
| **Phase 5: Combat, AI & Polish** | ⬜ Not Started | Turn-based combat, linger timer AI, boss encounters, sound, mobile optimization |

## Verification Plan

### Phase 1 Verification (Completed ✅)
All 10 browser tests passed with zero console errors:
- Help, look, movement (4 directions), wall collision, interact (fridge → Spicy Noodle loot), inventory, scream ability
- HUD real-time updates (HP, inventory counts, position)
- Grid viewer accuracy (tile-type colors, player marker movement)

### Future Phase Verification
- **Phase 2**: Multi-browser testing with 3 simultaneous sessions, Firestore transaction conflict resolution
- **Phase 3**: Room transition edge cases, fog-of-war rendering, theme boundary validation
- **Phase 4**: Editor round-trip (create → test → publish → play), schema validation
- **Phase 5**: Combat balance testing, enemy AI timing, boss encounter scripting

---

Do you approve of this tech stack and specification? You can safely open `Technical_Specification.md` and add comments or modifications if you want me to rework anything!
