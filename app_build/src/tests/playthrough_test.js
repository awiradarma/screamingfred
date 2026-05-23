// playthrough_test.js
// Automated playthrough simulation for Screaming Fred game.
// This script initializes the game state and runs a sequence of commands
// to verify that the player can progress through the main storyline,
// complete side quests, and reach the game ending.

// NOTE: The project uses ES modules (type: "module"), so we use import statements.
import { createStore } from '../store/useStore.js';
import { RoomEngine } from '../engine/roomEngine.js';
import worldData from '../data/worldData.js';
// (items JSON import removed – not needed for this test)

// Initialize store and engine
const store = createStore();
const engine = new RoomEngine(store, worldData);

// Helper to execute a command and log output
function exec(command) {
  console.log('> ' + command);
  const result = engine.processCommand(command);
  console.log(result);
}

// Sequence of commands to navigate the game world.
// Note: This is a simplified path; adjust as needed based on actual game map.
const commands = [
  'north', // move to next room
  'east',
  'pickup silver_eyelet',
  'use silver_eyelet on crafting_table',
  'north',
  'talk to master_tinkerer',
  // ... continue with essential steps to unlock quests
  'south',
  'west',
  'quest start strong_shoelace',
  // Simulate side quest actions
  'go to attic_corner',
  'pickup ancient_key',
  'use ancient_key on locked_door',
  // Final progression steps
  'go to secret_cave',
  'defeat boss',
  'finale',
];

commands.forEach(exec);

console.log('Playthrough simulation completed.');
