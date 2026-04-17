AppRequirements.md: Screaming Fred (Tactical Text Adventure)

1. Project Overview
Screaming Fred: The Tactical Chronicles is a multiplayer interactive fiction PWA. Players form parties of up to 3 to explore a 30x30 world matrix. Each world square contains a tactical 5x5 sub-grid for high-detail interactions, combat, and discovery.

2. Technical Stack
Frontend: React / Tailwind CSS (Chat UI + Tactical Grid View).Real-time Engine: Firebase Firestore using stream-based snapshots to sync party state instantly.
State Management:
- Shared Party State: Tracks discovered items, NPC dialogue progress, and enemy health for the group.
- Individual Player State: Tracks HP, inventory (Pasta/Potatoes), and specialized role perks.

3. The Level Creator Experience (No-Code Editor)
Creators design "Rumored Lands" within the Hidden Hideout framework using the following tools:

3.1 Admin-Locked Themes
Creators are restricted by the "World Map Scene" assigned to their square’s coordinates (e.g., $(5, 5)$ is permanently Breakfastopia):
- Asset Filtering: Only theme-appropriate descriptions, items, and NPCs are visible in the editor palette.
- Environmental Triggers: Creators can set global room effects (e.g., "Melt" logic for Willy in lava rooms).

3.2 Tactical 5x5 Grid Design
Within each world square, creators can define 25 specific interaction points:
- Non-Passable Tiles: Mark specific 5x5 coordinates as walls or obstacles (e.g., a "Shoebox Wall" or "Giant Cereal Box") to shape the path.
- NPC Placement:
   - Dialogue Branching: Assign multiple conversation stages that provide clues based on Fred’s "Scream" or Willy’s "Search".
Interactive Objects (Item Containers):Place boxes, wardrobes, or "Concrete Bacon" bushes.
- Interaction Sets: Define custom actions (e.g., Look Inside, Scream at Lid, Search Drawer).
- Enemy Logic:Proximity Triggers: Enemies (like Shoelace Snakes) attack if a player enters an adjacent 5x5 tile and stays for a configurable "Linger Timer".

4. Persistent World Logic
To ensure a high-quality multiplayer experience, the game tracks Discovery State in Firestore:
- The "Group Memory" Rule: Once a party member interacts with a "Wardrobe" and finds a "Spicy Noodle," the object’s state is updated to opened: true for the entire party.Visual Continuity: When players re-enter a room, the text description updates (e.g., "The wardrobe stands open and empty") instead of showing the original prompt.

5. Technical Artifacts for Antigravity
5.1 Tactical Grid Schema (TacticalRoom.json)
```json
{
  "world_coord": "15_05",
  "theme": "Shoebox_Forest",
  "grid": [
    ["wall", "wall", "exit", "wall", "wall"],
    ["wall", "npc_sue", "floor", "item_fridge", "wall"],
    ["wall", "floor", "enemy_snake", "floor", "wall"]
  ],
  "state_flags": {
    "item_fridge_found": false,
    "sue_clue_given": false
  }
}
5.2 Antigravity Implementation Priorities
Room Synchronizer: Build a Firestore listener that updates the 5x5 grid state for all party members when one player takes an action.
Contextual Action Dropdown: Generate a UI component that filters actions based on Fred’s current tile (e.g., if on item_fridge, show [Open, Scream, Search]).
Proximity AI: Implement the turn-based "Linger Timer" for enemies that triggers an attack if players don't move tiles within $X$ seconds.