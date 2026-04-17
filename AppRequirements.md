AppRequirements.md: Screaming Fred (Tactical Text Adventure)

1. Project Overview
Screaming Fred: The Tactical Chronicles is a multiplayer interactive fiction PWA. Players form parties of up to 3 to explore a 30x30 world matrix. Each world square contains a tactical 5x5 sub-grid for high-detail interactions, combat, and discovery.

2. Technical Stack
Frontend: React 19 / Vanilla CSS (Chat UI + Tactical Grid View).
Real-time Engine: Firebase Firestore using stream-based snapshots to sync party state instantly.
State Management:
- Shared Party State: Tracks discovered items, NPC dialogue progress, and enemy health for the group.
- Individual Player State: Tracks HP, inventory (Pasta/Potatoes), and specialized role perks.

3. Core Gameplay & Narrative Mechanics
3.1 Fred's Abilities
The Sonic Scream: A text-based command that deals 2 damage to scream-vulnerable enemies, activates environmental triggers, and advances NPC dialogue.
Transformation (Future Banana): A special power-up where Fred becomes a banana to act as a bridge over hazardous liquids.
Jumping Expectations: In the Land of Endless Jumping, Fred's progress is locked until the player selects "unexpected" thoughts via dialogue choices.

3.2 The Enemy & NPC Roster
Barry the Battery: Stationary enemy that emits a 360-degree electric zap every 3 seconds. Movement triggered if Fred screams near him.
Shoelace Snakes: Ground-based patrol enemies that hiss and accelerate towards Fred if he enters their line-of-sight.
Willy the Waffle: A detective guide who evaporates or melts in high heat. Party member with "Search" ability.
Derf: The Red-Eyed shadow brother; the final boss who requires a "Scream of Hope" for reconciliation.

3.3 Command System
Players interact through typed text commands:
- look / l: Examine current surroundings
- move <dir> / n/s/e/w: Navigate the 5x5 grid
- interact <object>: Open, search, or use objects on the current tile
- talk: Engage in multi-stage NPC dialogue
- scream: Trigger Fred's Sonic Scream ability
- attack: Engage enemies in turn-based combat
- inventory / i: Check carried items
- help / ?: Display available commands

4. The Level Creator Experience (No-Code Editor)
Creators design "Rumored Lands" within the Hidden Hideout framework using the following tools:

4.1 Admin-Locked Themes
Creators are restricted by the "World Map Scene" assigned to their square's coordinates (e.g., (5, 5) is permanently Breakfastopia):
- Asset Filtering: Only theme-appropriate descriptions, items, and NPCs are visible in the editor palette.
- Environmental Triggers: Creators can set global room effects (e.g., "Melt" logic for Willy in lava rooms).

4.2 Tactical 5x5 Grid Design
Within each world square, creators can define 25 specific interaction points:
- Non-Passable Tiles: Mark specific 5x5 coordinates as walls or obstacles (e.g., a "Shoebox Wall" or "Giant Cereal Box") to shape the path.
- NPC Placement:
   - Dialogue Branching: Assign multiple conversation stages that provide clues based on Fred's "Scream" or Willy's "Search".
Interactive Objects (Item Containers): Place boxes, wardrobes, or "Concrete Bacon" bushes.
- Interaction Sets: Define custom actions (e.g., Look Inside, Scream at Lid, Search Drawer).
- Enemy Logic: Proximity Triggers: Enemies (like Shoelace Snakes) attack if a player enters an adjacent 5x5 tile and stays for a configurable "Linger Timer".

5. Persistent World Logic
To ensure a high-quality multiplayer experience, the game tracks Discovery State in Firestore:
- The "Group Memory" Rule: Once a party member interacts with a "Wardrobe" and finds a "Spicy Noodle," the object's state is updated to opened: true for the entire party. Visual Continuity: When players re-enter a room, the text description updates (e.g., "The wardrobe stands open and empty") instead of showing the original prompt.

6. The Continuous World Map
Dynamic Reveal: A 30x30 grid overview with fog-of-war that clears as rooms are explored.
Replayability: Completed rooms remain accessible for finding missed "Pasta/Potato" collectables.
Theme Visuals: Each region has a distinct color scheme on the world map (Shoeboxlandia, Breakfastopia, Electric Desert, Textlandia).

7. Technical Artifacts
7.1 Tactical Grid Schema (TacticalRoom.json)
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

7.2 Implementation Priorities
Room Synchronizer: Build a Firestore listener that updates the 5x5 grid state for all party members when one player takes an action.
Contextual Action Dropdown: Generate a UI component that filters actions based on Fred's current tile (e.g., if on item_fridge, show [Open, Scream, Search]).
Proximity AI: Implement the turn-based "Linger Timer" for enemies that triggers an attack if players don't move tiles within X seconds.