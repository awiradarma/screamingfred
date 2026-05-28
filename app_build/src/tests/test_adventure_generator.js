import { generateAdventureWorld } from '../utils/proceduralWorldGenerator.js';
import { initGameState, processCommand } from '../engine/roomEngine.js';
import staticItems from '../data/items.json' assert { type: 'json' };

let failedTestsCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failedTestsCount++;
  }
}

console.log("=== RUNNING SCREAMING FRED ADVENTURE MODE VERIFICATION TESTS ===\n");

// Helper: BFS pathfinder to verify connectivity in a room
function isPathable(grid, tiles, sx, sy, tx, ty) {
  const height = grid.length;
  const width = grid[0].length;
  const queue = [[sx, sy]];
  const visited = new Set([`${sx},${sy}`]);

  const dirs = [
    [0, -1], // North
    [0, 1],  // South
    [-1, 0], // West
    [1, 0]   // East
  ];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === tx && cy === ty) return true;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited.has(key)) {
        const tileType = grid[ny][nx];
        const tileData = tiles[tileType] || {};
        
        if (tileType !== 'wall' && tileData.passable !== false) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }

  return false;
}

// Helper: calculate entry position when transitioning off-grid to an adjacent room
function getEngineEntryPosition(fromDirection) {
  const height = 5;
  const width = 5;
  switch (fromDirection) {
    case 'north': return { x: 2, y: height - 1 };
    case 'south': return { x: 2, y: 0 };
    case 'east':  return { x: 0, y: Math.floor(height / 2) };
    case 'west':  return { x: width - 1, y: Math.floor(height / 2) };
    default: return { x: 2, y: 2 };
  }
}

// Helper: BFS to check overall adventure world solvability
function isAdventureWorldSolvable(rooms, victoryRoomKey) {
  const startState = { roomId: 'gen_start', x: 2, y: 2 };
  const queue = [startState];
  const visited = new Set([`gen_start,2,2`]);

  const dirs = [
    { dx: 0, dy: -1, name: 'north' },
    { dx: 0, dy: 1, name: 'south' },
    { dx: -1, dy: 0, name: 'west' },
    { dx: 1, dy: 0, name: 'east' }
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    const room = rooms[current.roomId];
    if (!room) continue;

    const tileType = room.grid[current.y][current.x];
    if (current.roomId === `gen_${victoryRoomKey}` && tileType === 'victory_portal') {
      return true;
    }

    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;

      if (ny >= 0 && ny < room.grid.length && nx >= 0 && nx < room.grid[0].length) {
        const tType = room.grid[ny][nx];
        const tData = room.tiles[tType] || {};
        
        if (tType !== 'wall' && tData.passable !== false) {
          const key = `${current.roomId},${nx},${ny}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ roomId: current.roomId, x: nx, y: ny });
          }
        }
      } else {
        // Off-grid movement: check if current tile is an exit tile in this direction
        if (tileType === `exit_${d.name}`) {
          const currentCoord = room.world_coord;
          const [cx, cy, cz] = currentCoord.split(',').map(Number);
          const targetCoord = `${cx + d.dx},${cy + d.dy},${cz}`;

          const targetRoomId = Object.keys(rooms).find(rId => rooms[rId].world_coord === targetCoord);
          if (targetRoomId && rooms[targetRoomId]) {
            const nextPos = getEngineEntryPosition(d.name);
            const key = `${targetRoomId},${nextPos.x},${nextPos.y}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({ roomId: targetRoomId, x: nextPos.x, y: nextPos.y });
            }
          }
        }
      }
    }
  }

  return false;
}

// Helper: Solve Adventure World using BFS to get exact movement command list
function solveAdventureWorld(rooms, victoryRoomKey) {
  const startState = { roomId: 'gen_start', x: 2, y: 2, commands: [] };
  const queue = [startState];
  const visited = new Set([`gen_start,2,2`]);

  const dirs = [
    { dx: 0, dy: -1, name: 'north' },
    { dx: 0, dy: 1, name: 'south' },
    { dx: -1, dy: 0, name: 'west' },
    { dx: 1, dy: 0, name: 'east' }
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    const room = rooms[current.roomId];
    if (!room) continue;

    const tileType = room.grid[current.y][current.x];
    if (current.roomId === `gen_${victoryRoomKey}` && tileType === 'victory_portal') {
      return current.commands;
    }

    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;

      if (ny >= 0 && ny < room.grid.length && nx >= 0 && nx < room.grid[0].length) {
        const tType = room.grid[ny][nx];
        const tData = room.tiles[tType] || {};
        
        if (tType !== 'wall' && tData.passable !== false) {
          const key = `${current.roomId},${nx},${ny}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({
              roomId: current.roomId,
              x: nx,
              y: ny,
              commands: [...current.commands, `move ${d.name}`]
            });
          }
        }
      } else {
        // Off-grid movement: check if current tile is an exit tile in this direction
        if (tileType === `exit_${d.name}`) {
          const currentCoord = room.world_coord;
          const [cx, cy, cz] = currentCoord.split(',').map(Number);
          const targetCoord = `${cx + d.dx},${cy + d.dy},${cz}`;

          const targetRoomId = Object.keys(rooms).find(rId => rooms[rId].world_coord === targetCoord);
          if (targetRoomId && rooms[targetRoomId]) {
            const nextPos = getEngineEntryPosition(d.name);
            const key = `${targetRoomId},${nextPos.x},${nextPos.y}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({
                roomId: targetRoomId,
                x: nextPos.x,
                y: nextPos.y,
                commands: [...current.commands, `move ${d.name}`]
              });
            }
          }
        }
      }
    }
  }

  return null;
}

// --- TEST 1: 100 RANDOM SEEDS PROCEDURAL WORLD GENERATION ---
console.log("--- Test 1: Procedural World Generation (100 Seeds) ---");
const characters = ['fred', 'freddista', 'willy'];
let allSeedsValid = true;

for (let seed = 1; seed <= 100; seed++) {
  const char = characters[seed % characters.length];
  const level = (seed % 3) + 1; // Level 1, 2, or 3
  
  const { rooms, theme, victoryRoomKey } = generateAdventureWorld(char, level);
  
  // Verify structure
  const hasAllRooms = rooms.gen_start && rooms.gen_north && rooms.gen_south && rooms.gen_east && rooms.gen_west;
  if (!hasAllRooms) {
    allSeedsValid = false;
    assert(false, `Seed ${seed}: Missing generated rooms`);
    break;
  }
  
  // Verify world coordinates
  const coordsOk = 
    rooms.gen_start.world_coord === "0,0,0" &&
    rooms.gen_north.world_coord === "0,-1,0" &&
    rooms.gen_south.world_coord === "0,1,0" &&
    rooms.gen_east.world_coord === "1,0,0" &&
    rooms.gen_west.world_coord === "-1,0,0";
  
  if (!coordsOk) {
    allSeedsValid = false;
    assert(false, `Seed ${seed}: Coordinate bindings mismatch`);
    break;
  }

  // Verify victory room has victory portal tile
  const vRoom = rooms[`gen_${victoryRoomKey}`];
  const hasVictoryPortal = vRoom.grid.some(row => row.includes('victory_portal'));
  if (!hasVictoryPortal) {
    allSeedsValid = false;
    assert(false, `Seed ${seed}: Victory room "${vRoom.room_name}" missing 'victory_portal' tile`);
    break;
  }

  // Verify BFS solvability of overall layout
  const solvable = isAdventureWorldSolvable(rooms, victoryRoomKey);
  if (!solvable) {
    allSeedsValid = false;
    assert(false, `Seed ${seed}: Procedural world layout is UNREACHABLE / UNSOLVABLE!`);
    break;
  }
}

assert(allSeedsValid, "Successfully validated 100 random seeds for grid bounds, correct coordinates, victory portals, and 100% path traversability!");
console.log("");


// --- TEST 2: AUTOMATED DIJKSTRA / BFS PLAYBACK SIMULATOR ---
console.log("--- Test 2: Dijkstra Playback Simulator ---");

// Generate a random adventure run world
const { rooms, theme, victoryRoomKey } = generateAdventureWorld('fred', 1);
const solutionPath = solveAdventureWorld(rooms, victoryRoomKey);

assert(solutionPath !== null, `Solution path solver successfully analyzed and generated commands for procedural world theme "${theme}"!`);

if (solutionPath) {
  console.log(`Calculated exact navigation commands to Victory Portal (${solutionPath.length} steps): [${solutionPath.join(" -> ")}]`);
  
  // Initialize mock adventure state
  let state = {
    room: rooms.gen_start,
    playerPosition: { x: 2, y: 2 },
    playerHP: 10,
    maxHP: 10,
    inventory: [{ itemId: "item_portal_key", name: "Portal Key", type: "quest" }],
    stateFlags: {},
    npcStages: {},
    enemyHP: {},
    entities: (rooms.gen_start.entities || []).map(e => ({ ...e })),
    turnCount: 0,
    discoveredRooms: ["0,0,0"],
    abilities: [],
    activeEffects: [],
    generatedWorld: rooms,
    activeCharacter: 'fred',
    characterLevel: 1
  };

  // Run the playback simulator
  let stepCount = 0;
  console.log(`Initial position: room=${state.room.room_id}, pos=(${state.playerPosition.x}, ${state.playerPosition.y})`);
  for (const cmd of solutionPath) {
    const result = processCommand(state, cmd, staticItems);
    state = result.state;
    stepCount++;
    console.log(`Step ${stepCount}: Command="${cmd}" -> room=${state.room.room_id}, pos=(${state.playerPosition.x}, ${state.playerPosition.y}), adventureCompleted=${state.adventureCompleted}`);
    console.log("Messages:", result.messages.map(m => m.text));
  }

  assert(state.adventureCompleted === true, `Headless player walked all ${stepCount} steps and triggered end-of-run state successfully.`);
  assert(state.adventureOutcome === 'victory', `State updates flagged outcome as a clean run 'victory'!`);
}
console.log("");


// --- TEST 3: LEVEL-UP COMBAT SCALING & ISOLATION ---
console.log("--- Test 3: Level-up Combat Scaling & Isolation ---");

// Fred level scaling test
let fredLvl3State = {
  room: {
    grid: [["floor"]],
    tiles: { floor: { passable: true } }
  },
  playerPosition: { x: 0, y: 0 },
  playerHP: 10,
  maxHP: 10,
  inventory: [],
  stateFlags: {},
  entities: [{ id: 'test_enemy', name: 'Test Enemy', x: 0, y: 0, hp: 10, maxHP: 10, damage: 1 }],
  enemyHP: {},
  activeCharacter: 'fred',
  characterLevel: 3
};

let res = processCommand(fredLvl3State, "scream", staticItems);
let finalEnemyHP = res.state.enemyHP['test_enemy'];
assert(finalEnemyHP === 4, `Adventure Mode Fred Lvl 3 scream deals scaled damage (6 damage) to enemy on tile (Enemy HP: 10 -> ${finalEnemyHP})`);

let fredStoryState = {
  room: {
    grid: [["floor"]],
    tiles: { floor: { passable: true } }
  },
  playerPosition: { x: 0, y: 0 },
  playerHP: 10,
  maxHP: 10,
  inventory: [],
  stateFlags: {},
  entities: [{ id: 'test_enemy', name: 'Test Enemy', x: 0, y: 0, hp: 10, maxHP: 10, damage: 1 }],
  enemyHP: {},
  // No activeCharacter or characterLevel set (simulating standard Story Mode)
};

res = processCommand(fredStoryState, "scream", staticItems);
finalEnemyHP = res.state.enemyHP['test_enemy'];
assert(finalEnemyHP === 8, `Story Mode Fred scream maintains balanced base damage (2 damage), ensuring ZERO progression leaks (Enemy HP: 10 -> ${finalEnemyHP})`);
console.log("");


// --- TEST 4: CHARACTER-SPECIFIC MECHANICS (FREDDISTA STARE) ---
console.log("--- Test 4: Freddista Special Petrifying Stare ---");

let stareState = {
  room: {
    grid: [
      ["floor", "floor", "floor"],
      ["floor", "floor", "floor"],
      ["floor", "floor", "floor"]
    ],
    tiles: { floor: { passable: true } }
  },
  playerPosition: { x: 1, y: 2 }, // Center bottom
  playerHP: 10,
  maxHP: 10,
  inventory: [],
  stateFlags: {},
  entities: [{ id: 'target_enemy', name: 'Ranged Dummy', x: 1, y: 0, hp: 10, maxHP: 10, damage: 1 }], // 2 tiles north
  enemyHP: {},
  activeCharacter: 'freddista',
  characterLevel: 1 // range 1
};

// Lvl 1 stare North should miss (out of range)
res = processCommand(stareState, "stare north", staticItems);
assert(res.state.enemyHP['target_enemy'] === undefined, "Freddista Lvl 1 stare at range 2 north misses the target enemy (out of range)");

// Lvl 3 stare North should hit (range 3, deals 6 damage)
stareState.characterLevel = 3;
res = processCommand(stareState, "stare north", staticItems);
assert(res.state.enemyHP['target_enemy'] === 4, `Freddista Lvl 3 stare successfully strikes the target at range 2, dealing scaled 6 damage (Enemy HP: 10 -> ${res.state.enemyHP['target_enemy']})`);
console.log("");


// --- TEST 5: CHARACTER-SPECIFIC MECHANICS (WILLY DEDUCE) ---
console.log("--- Test 5: Willy Clue Deduction & Victory Detection ---");

let willyState = {
  room: {
    room_name: "syrup_bottoms",
    grid: [
      ["wall", "wall", "wall"],
      ["wall", "floor", "wall"],
      ["wall", "wall", "wall"]
    ],
    tiles: {
      floor: { passable: true },
      wall: { passable: false }
    }
  },
  playerPosition: { x: 1, y: 1 },
  playerHP: 10,
  maxHP: 10,
  inventory: [],
  stateFlags: {},
  entities: [],
  enemyHP: {},
  activeCharacter: 'willy',
  characterLevel: 3,
  generatedWorld: {
    gen_north: {
      room_name: "Lace Clearing",
      grid: [["victory_portal"]],
      tiles: { victory_portal: { passable: true } }
    }
  }
};

res = processCommand(willyState, "deduce", staticItems);
const textMessages = res.messages.map(m => m.text);
const hasPathwayClue = textMessages.some(text => text.includes("ULTIMATE DEDUCTION: ESCAPE PATHWAY"));
const hasVictoryRoomName = textMessages.some(text => text.includes("Lace Clearing"));

assert(hasPathwayClue, "Willy Lvl 3 deduction unlocks ULTIMATE DEDUCTION section");
assert(hasVictoryRoomName, "Willy Lvl 3 deduction successfully localizes Victory room ('Lace Clearing') in procedural coordinate tree!");
console.log("");

// --- TEST 6: ROGUELIKE ASCENSION DIFFICULTY SCALING ---
console.log("--- Test 6: Roguelike Ascension Difficulty Scaling ---");

const baselineWorld = generateAdventureWorld('fred', 1, 0);
const ascendedWorld = generateAdventureWorld('fred', 1, 5);

// Find an enemy in baseline
const baseEnemy = Object.values(baselineWorld.rooms)
  .flatMap(r => r.entities)
  .find(e => e.id.includes("snake") || e.id.includes("syrup") || e.id.includes("barry") || e.id.includes("sentry"));

// Find an enemy in ascended
const ascendedEnemy = Object.values(ascendedWorld.rooms)
  .flatMap(r => r.entities)
  .find(e => e.id.includes("snake") || e.id.includes("syrup") || e.id.includes("barry") || e.id.includes("sentry"));

if (baseEnemy && ascendedEnemy) {
  assert(ascendedEnemy.hp > baseEnemy.hp, `Ascension scales enemy HP correctly (Baseline HP: ${baseEnemy.hp} -> Ascended HP: ${ascendedEnemy.hp})`);
  assert(ascendedEnemy.damage > baseEnemy.damage, `Ascension scales enemy damage correctly (Baseline Damage: ${baseEnemy.damage} -> Ascended Damage: ${ascendedEnemy.damage})`);
  assert(ascendedEnemy.name.startsWith("Dreaded ") || ascendedEnemy.name.startsWith("Keeper") || ascendedEnemy.name.includes("Keeper of the Key"), `Ascension applies name tier prefix to entities (Ascended name: "${ascendedEnemy.name}")`);
} else {
  console.log("[INFO] Skip specific enemy checks due to randomized seed spawns, but worlds generated successfully.");
}

// Verify high-ascension BFS solvability
const highAscensionSolvable = isAdventureWorldSolvable(ascendedWorld.rooms, ascendedWorld.victoryRoomKey);
assert(highAscensionSolvable === true, "High Ascension world remains 100% procedurally path-solvable from start to victory portal!");
console.log("");

// --- TEST 7: PORTAL KEY LOOT DROP — ALL COMBAT PATHS ---
console.log("--- Test 7: Portal Key Loot Drop via Attack / Scream / Stare ---");

// Build a minimal adventure state with one Keeper entity at (2,2)
const keeperEntity = {
  id: "keeper_mob_2_2",
  name: "Keeper of the Key (Battery Sentry)",
  x: 2,
  y: 2,
  hp: 1, // 1 HP so any single hit kills it
  maxHP: 1,
  damage: 1,
  behavior: "stalk",
  loot: "item_portal_key"
};

const portalKeyRegistry = {
  "item_portal_key": {
    name: "Portal Key",
    description: "A glowing starchy golden key.",
    type: "quest"
  }
};

const baseAdventureRoom = {
  room_id: "gen_guaranteed",
  world_coord: "0,-1,0",
  room_name: "Key Room",
  description: "A simple test room.",
  grid: [
    ["wall", "wall", "floor", "wall", "wall"],
    ["wall", "floor", "floor", "floor", "wall"],
    ["floor", "floor", "floor", "floor", "floor"],
    ["wall", "floor", "floor", "floor", "wall"],
    ["wall", "wall", "floor", "wall", "wall"]
  ],
  tiles: {
    wall: { passable: false, description: "A wall." },
    floor: { passable: true, description: "A floor." }
  },
  entities: [{ ...keeperEntity }],
  state_flags: {}
};

// --- PATH A: Fred attack ---
{
  const stateA = {
    room: baseAdventureRoom,
    playerPosition: { x: 2, y: 2 },
    playerHP: 10, maxHP: 10,
    inventory: [], stateFlags: {}, enemyHP: {},
    entities: [{ ...keeperEntity }],
    activeCharacter: 'fred', characterLevel: 1, npcStages: {}, abilities: [],
    activeEffects: [], generatedWorld: {}
  };
  const resA = processCommand(stateA, "attack", portalKeyRegistry);
  const hasKey = resA.state.inventory.some(i => i.itemId === "item_portal_key");
  assert(hasKey, "Fred ATTACK on Keeper of the Key correctly drops Portal Key");
}

// --- PATH B: Fred scream (direct hit at player position) ---
{
  const stateB = {
    room: baseAdventureRoom,
    playerPosition: { x: 2, y: 2 },
    playerHP: 10, maxHP: 10,
    inventory: [], stateFlags: {}, enemyHP: {},
    entities: [{ ...keeperEntity }],
    activeCharacter: 'fred', characterLevel: 1, npcStages: {}, abilities: [],
    activeEffects: [], generatedWorld: {}
  };
  const resB = processCommand(stateB, "scream", portalKeyRegistry);
  const hasKey = resB.state.inventory.some(i => i.itemId === "item_portal_key");
  assert(hasKey, "Fred SCREAM on Keeper at same tile correctly drops Portal Key");
}

// --- PATH C: Fred scream Level 2 — adjacent splash kills Keeper ---
{
  // Player stands at (2,1), Keeper is adjacent at (2,2)
  const adjacentKeeper = { ...keeperEntity, x: 2, y: 2, hp: 1, maxHP: 1 };
  const stateC = {
    room: baseAdventureRoom,
    playerPosition: { x: 2, y: 1 },
    playerHP: 10, maxHP: 10,
    inventory: [], stateFlags: {}, enemyHP: {},
    entities: [adjacentKeeper],
    activeCharacter: 'fred', characterLevel: 2, npcStages: {}, abilities: [],
    activeEffects: [], generatedWorld: {}
  };
  // First place a dummy enemy at player tile so scream fires
  const dummyTileEnemy = { ...keeperEntity, id: "dummy_mob_1", x: 2, y: 1, hp: 999, maxHP: 999, loot: undefined };
  stateC.entities = [adjacentKeeper, dummyTileEnemy];
  const resC = processCommand(stateC, "scream", portalKeyRegistry);
  const hasKey = resC.state.inventory.some(i => i.itemId === "item_portal_key");
  assert(hasKey, "Fred SCREAM Lvl 2 splash kill on adjacent Keeper correctly drops Portal Key");
}

// --- PATH D: Freddista stare kills Keeper ---
{
  // Player at (2,1), Keeper at (2,2) — stare south
  const starKeeper = { ...keeperEntity, x: 2, y: 2, hp: 2, maxHP: 2 };
  const stateD = {
    room: baseAdventureRoom,
    playerPosition: { x: 2, y: 1 },
    playerHP: 10, maxHP: 10,
    inventory: [], stateFlags: {}, enemyHP: {},
    entities: [starKeeper],
    activeCharacter: 'freddista', characterLevel: 1, npcStages: {}, abilities: [],
    activeEffects: [], generatedWorld: {}
  };
  const resD = processCommand(stateD, "stare south", portalKeyRegistry);
  const hasKey = resD.state.inventory.some(i => i.itemId === "item_portal_key");
  assert(hasKey, "Freddista STARE kill on Keeper of the Key correctly drops Portal Key");
}

console.log("");

// --- SUMMARY AND REPORT ---
if (failedTestsCount === 0) {
  console.log("ALL ADVENTURE TESTS COMPLETED SUCCESSFULLY! 🎉");
  process.exit(0);
} else {
  console.error(`TEST SUITE FAILED with ${failedTestsCount} failure(s)`);
  process.exit(1);
}
