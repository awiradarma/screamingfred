# Screaming Fred: The Tactical Chronicles - Requirements

## 1. Project Overview
A tactical PWA (Progressive Web App) based on the "Screaming Fred" IP. The game combines MUD-style text adventure with a 5x5 tactical grid.

## 2. Core Mechanics
- Grid-based movement (5x5 local view).
- Text-based interaction and combat.
- Player scream as a tactical tool.
- Entity AI (Patrol, Stalk).

## 3. Technology Stack
- React 19 (Vite).
- Zustand (State management).
- Firebase (Firestore, Auth).
- Vanilla CSS.

## 4. Game World
- 30x30 global world coordinate system.
- Room-based transitions.
- Persistent state across rooms.

## 5. UI Components
- **GridViewer**: Visual representation of the 5x5 tactical grid.
- **ChatLog**: Narrative log and command feedback.
- **CommandInput**: Text field for processing player actions.
- **PlayerHUD**: Status bar for HP, inventory, and location.
- **MobileController**: D-pad and action shortcuts for touch devices.
- **WorldMap**: Admin tool for visualizing the 30x30 coordinate space.
- **LevelEditor**: Admin tool for real-time room JSON editing.

## 6. Persistence Strategy
- **Local**: IndexedDB (via `idb`) for session caching and offline support.
- **Cloud**: Firestore for world definitions and cross-device session syncing.
- **Auth**: Anonymous Firebase Authentication for user tracking.

## 7. Data Models
### 7.1 Tactical Grid Schema (TacticalRoom.json)
```json
{
  "world_coord": "15_05",
  "room_name": "Shoelace Forest Clearing",
  "theme": "Shoebox_Forest",
  "description": "You stand in a dim clearing...",
  "grid": [
    ["wall", "wall", "exit_north", "wall", "wall"],
    ["wall", "npc_sue", "floor", "item_fridge", "wall"],
    ["wall", "floor", "floor", "floor", "wall"],
    ["wall", "floor", "enemy_snake", "floor", "wall"],
    ["wall", "wall", "exit_south", "wall", "wall"]
  ],
  "player_start": { "x": 2, "y": 2 },
  "tiles": { ... },
  "state_flags": {
    "item_fridge_opened": false,
    "sue_clue_given": false,
    "snake_defeated": false
  }
}
```

### 7.2 Implementation Priorities
- [x] **Restart Functionality**: Integrated a "Restart" button and command that wipes cloud session and resets player state.
- [ ] **Room Synchronizer**: Build a Firestore listener that updates the 5x5 grid state for all party members when one player takes an action.
- [ ] **Contextual Action Dropdown**: Generate a UI component that filters actions based on Fred's current tile (e.g., if on item_fridge, show [Open, Scream, Search]).
- [ ] **Proximity AI**: Implement the turn-based "Linger Timer" for enemies that triggers an attack if players don't move tiles within X seconds.

## 8. Dev Guidelines
- [IMPORTANT] Always bump the `version` field in `package.json` before committing and pushing changes. This ensures cache-busting and easy verification of the latest build.

## 9. Backlog & Future Enhancements
- [ ] **Collectible Abilities**: Implement system for players to unlock and toggle abilities (e.g., Float on Water, Zap Immunity, Increased Agility) via items or NPC interactions.
- [ ] **Temporary Enchantments**: Develop a "Status Effect" system to handle temporary buffs/debuffs (e.g., double damage, increased HP gain from food) with turn-based timers.
- [ ] **Enhanced Movement**: Explore "Dash" mechanics and diagonal movement to improve traversal, ensuring compatibility with the mobile virtual D-pad.