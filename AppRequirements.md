AppRequirements.md: Screaming Fred
Build Tool: Antigravity (Agentic AI)
Source Material: Fred’s Adventure by Timothy Wiradarma

1. Project Vision
Screaming Fred is a 2D PWA platformer and no-code level editor. Players control Fred, a white tennis shoe, journeying across Sentientworldia to retrieve stolen pasta and potatoes. The game balances a high-fidelity 8-bit aesthetic with a "zero-install" web experience for desktop and mobile.

2. Technical Stack
Engine: Phaser.js (Standardized 2D game loop, 8-bit audio management, and canvas rendering).

Backend: Firebase (Firestore for JSON level data, Auth for user-generated content).

Storage: IndexedDB for local drafts; localStorage for instant map persistence.

Input: Unified Input Bridge (WASD/Space for Desktop; Virtual Joystick/Action Buttons for Mobile).

3. Core Gameplay & Narrative Mechanics
3.1 Fred’s Abilities
The Sonic Scream: An 8-bit sonic ring (expanding circle) that repels enemies and activates environmental triggers (like the Microphone or Scream Collector).

Transformation (Future Banana): A special power-up where Fred becomes a banana to act as a bridge over hazardous liquids.

Jumping Expectations: In the Land of Endless Jumping, Fred's jump height is locked until the player selects "unexpected" thoughts.

3.2 The Enemy & NPC Roster
Barry the Battery: Zaps Fred with electricity and demands visitors "take a seat".

Shoelace Snakes: Hissing ground enemies in the Shoelace Forest.

Willy the Waffle: A detective guide who evaporates or melts in high heat.

Derf: The Red-Eyed shadow brother; the final boss who requires a "Scream of Hope" for reconciliation.

4. The Continuous World Map
Dynamic Reveal: An SVG map covered in Orange Fog that clears as levels are completed.

Replayability: Completed levels remain clickable for high-score runs or finding missed "Pasta/Potato" collectables.

Path Visuals: The map road shifts from Brick to Pancakes to Text to Obsidian based on the region.

5. No-Code Level Editor (The Hidden Hideout)
The editor allows Timothy’s friends to contribute "Rumored Lands" (Side Quests) without technical knowledge.

5.1 Theme-Locked Toolsets
To maintain plot integrity, creators must select a theme before building. The theme limits the available tiles and logic:

Shoeboxlandia: Brick tiles, "Glaring Eye" neighbors, Noise Complaint meters.

Breakfastopia: Pancake bushes, Waffle platforms, Syrup hazards.

Electric Desert: Sand tiles, Barry the Battery, Microphone triggers.

Textlandia: Objects made of literal text (e.g., platforms made of the word "ROAD").

5.2 UGC Workflow
Drafting: Level is built in-browser and saved to local IndexedDB.

Validation: Creator must successfully "Test Run" the level before the Publish button is enabled.

Deployment: Level is saved to Firestore as status: pending for admin review.

Reward: Completing a community level grants Creativity Gained points to unlock skins (Banana Fred, Detective Willy).

6. Technical Artifacts for Antigravity
6.1 Unified Level Schema (SentientWorldia_Schema.json)
```json
{
  "levelHeader": { "theme": "Textlandia", "author": "Timothy", "status": "draft" },
  "mapData": {
    "grid": [[1,0,1], [1,1,1]], 
    "themeRules": "text_only_collision"
  },
  "entities": [
    { "type": "barry_battery", "pos": [25, 10], "logic": "zap_on_proximity" },
    { "type": "scream_microphone", "pos": [50, 10], "logic": "requires_high_decibel" }
  ],
  "narrative": { "blah_prompt_frequency": 300, "is_bridge": true }
}   
```

6.2 Antigravity Implementation Priorities
Physics Engine: Build Fred's platforming and the Sonic Ring hit-box logic.

Theme Provider: Create a wrapper that filters the Editor Palette based on the selected region.

Bridge Rhythm Engine: Implement the timed "Blah/Lah" button prompt for both Touch and Keyboard.

Fog-of-War Map: Build the SVG scroller that clears as completedLevels updates in Firestore.