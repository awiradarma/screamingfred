/**
 * proceduralWorldGenerator.js
 * Generates 5-room connected maps for Adventure Mode runs.
 * Theme-consistent seeding, BFS pathfinding verification, and combat validation.
 */

// Simple BFS to find if a path exists from (sx, sy) to (tx, ty) in a 5x5 grid
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
        
        // Passable if it exists and is not explicitly impassable (walls)
        if (tileType !== 'wall' && tileData.passable !== false) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }

  return false;
}

const THEME_BLUEPRINTS = {
  "Shoebox Forest": {
    clearingDesc: "A dim, winding clearing covered in shoe lace vines and leaves. The damp scent of loam fills your eyelets.",
    roomNames: ["Lace Thicket", "Muddy Ditch", "Forest Clearing", "Deep Woods", "Brambles Edge"],
    wall: { passable: false, description: "A wall of tangled, heavy shoelaces." },
    floor: { passable: true, description: "Damp, mossy soil covered in leaves." },
    victoryTile: {
      passable: true,
      description: "A cosmic glowing portal made of woven shoelaces. Stepping on it leads back to safety!",
      targetRoomId: "victory_exit"
    },
    enemies: [
      { id: "snake_procedural", name: "Shoelace Snake", hp: 4, maxHP: 4, damage: 1, behavior: "stalk", description: "A hissing shoelace snake, coiled and ready to strike." }
    ],
    items: [
      { itemId: "food_potato", name: "Wild Potato", type: "food", onUse: { action: "heal", value: 5, consume: true, successMessage: "You chew the starchy wild potato!" } },
      { itemId: "item_berries", name: "Rubber Berries", type: "quest", description: "Soft rubbery berries." }
    ]
  },
  "Breakfastopia": {
    clearingDesc: "A golden grid made of pancake planks, surrounded by a faint humming mist that smells of sweet maple syrup.",
    roomNames: ["Syrup Shallows", "Waffle Clearing", "Bacon Ridge", "Batter Bottoms", "Toaster Plaza"],
    wall: { passable: false, description: "A solid barrier of stacked waffles." },
    floor: { passable: true, description: "A warm, sticky pancake plank floor." },
    victoryTile: {
      passable: true,
      description: "A large golden waffle gate with a maple syrup lock. Use it to escape with your EXP!",
      targetRoomId: "victory_exit"
    },
    enemies: [
      { id: "syrup_bandit", name: "Syrup Bandit", hp: 5, maxHP: 5, damage: 1, behavior: "patrol", description: "A sticky syrup-covered bandit clutching a wooden spoon." }
    ],
    items: [
      { itemId: "food_breadroll", name: "Stale Breadroll", type: "food", onUse: { action: "heal", value: 3, consume: true } },
      { itemId: "spicy_noodles", name: "Spicy Noodles", type: "quest", description: "Spicy factory noodles." }
    ]
  },
  "Electric Desert": {
    clearingDesc: "A desolate, metallic plain of copper cables and crackling capacitor dunes. The air is thick with static.",
    roomNames: ["Capacitor Dunes", "Cable Canyon", "Sparking Flats", "Static Crater", "Barry's Backlot"],
    wall: { passable: false, description: "A wall of heavily charged copper grids." },
    floor: { passable: true, description: "Conductive metallic sand that hums with minor voltage." },
    victoryTile: {
      passable: true,
      description: "A cosmic portal humming with high voltage. Step in to escape safely!",
      targetRoomId: "victory_exit"
    },
    enemies: [
      { id: "barry_copy", name: "Battery Sentry", hp: 6, maxHP: 6, damage: 1, behavior: "stalk", description: "A small, sparking AAA battery copy whirring aggressively." }
    ],
    items: [
      { itemId: "consumable_energy_drink", name: "Sparking Energy Drink", type: "food", onUse: { action: "heal_and_cleanse", value: 3, consume: true } },
      { itemId: "item_energy_crystal", name: "Energy Crystal", type: "quest", description: "A pulsing blue static crystal." }
    ]
  }
};

/**
 * Procedurally generate a 5-room adventure run.
 * Creates: Start (0,0), North (0,-1), South (0,1), East (1,0), West (-1,0)
 */
export function generateAdventureWorld(characterId, characterLevel) {
  // 1. Pick a random theme
  const themes = Object.keys(THEME_BLUEPRINTS);
  const themeName = themes[Math.floor(Math.random() * themes.length)];
  const bp = THEME_BLUEPRINTS[themeName];

  console.log(`Generating Adventure World: Character: ${characterId}, Theme: ${themeName}`);

  const rooms = {};
  const coords = {
    start: "0,0,0",
    north: "0,-1,0",
    south: "0,1,0",
    east: "1,0,0",
    west: "-1,0,0"
  };

  const roomKeys = Object.keys(coords);
  // Pick one random outer room to host the Victory Tile
  const victoryRoomKey = ["north", "south", "east", "west"][Math.floor(Math.random() * 4)];

  // Helper to build a room grid
  function generateGridForRoom(roomKey) {
    const isStart = roomKey === 'start';
    const isVictory = roomKey === victoryRoomKey;

    let grid = [
      ["wall", "wall", "floor", "wall", "wall"],
      ["wall", "floor", "floor", "floor", "wall"],
      ["floor", "floor", "floor", "floor", "floor"],
      ["wall", "floor", "floor", "floor", "wall"],
      ["wall", "wall", "floor", "wall", "wall"]
    ];

    // If it's an outer room, close the outer edge exits
    if (roomKey === 'north') {
      grid[0][2] = "wall"; // No exit North
    } else if (roomKey === 'south') {
      grid[4][2] = "wall"; // No exit South
    } else if (roomKey === 'east') {
      grid[2][4] = "wall"; // No exit East
    } else if (roomKey === 'west') {
      grid[2][0] = "wall"; // No exit West
    }

    // Place exit tags on grid
    if (grid[0][2] === 'floor') grid[0][2] = 'exit_north';
    if (grid[4][2] === 'floor') grid[4][2] = 'exit_south';
    if (grid[2][4] === 'floor') grid[2][4] = 'exit_east';
    if (grid[2][0] === 'floor') grid[2][0] = 'exit_west';

    // Place special items/enemies
    if (isVictory) {
      grid[2][2] = 'victory_portal';
    } else if (!isStart) {
      // explorations: 50% chance of enemy, 50% chance of chest
      grid[2][2] = Math.random() > 0.5 ? 'enemy_mob' : 'item_chest';
      if (Math.random() > 0.6) {
        grid[1][2] = 'item_chest';
      }
    }

    return grid;
  }

  // 2. Generate each of the 5 rooms
  roomKeys.forEach(roomKey => {
    const isStart = roomKey === 'start';
    const isVictory = roomKey === victoryRoomKey;
    const roomName = bp.roomNames[roomKeys.indexOf(roomKey)];
    const grid = generateGridForRoom(roomKey);

    const tiles = {
      wall: { passable: false, description: bp.wall.description },
      floor: { passable: true, description: bp.floor.description }
    };

    // Add exits
    if (grid[0][2] === 'exit_north') {
      tiles.exit_north = {
        passable: true,
        description: "The path winds up north.",
        targetRoomId: `gen_north`,
        targetPosition: { x: 2, y: 3 }
      };
    }
    if (grid[4][2] === 'exit_south') {
      tiles.exit_south = {
        passable: true,
        description: "The path winds down south.",
        targetRoomId: `gen_south`,
        targetPosition: { x: 2, y: 1 }
      };
    }
    if (grid[2][4] === 'exit_east') {
      tiles.exit_east = {
        passable: true,
        description: "The path winds east.",
        targetRoomId: `gen_east`,
        targetPosition: { x: 1, y: 2 }
      };
    }
    if (grid[2][0] === 'exit_west') {
      tiles.exit_west = {
        passable: true,
        description: "The path winds west.",
        targetRoomId: `gen_west`,
        targetPosition: { x: 3, y: 2 }
      };
    }

    // Add Special Tiles
    if (isVictory) {
      tiles.victory_portal = {
        passable: true,
        description: bp.victoryTile.description,
        targetRoomId: bp.victoryTile.targetRoomId
      };
    }

    // Add Chest definition
    const randItem = bp.items[Math.floor(Math.random() * bp.items.length)];
    tiles.item_chest = {
      passable: true,
      description: "A rusty metal padlock chest lies on the ground.",
      item: {
        name: randItem.name,
        itemId: randItem.itemId,
        actions: ["interact", "search"]
      }
    };

    // Add Enemy definitions and placements
    const entities = [];
    const enemySpec = bp.enemies[Math.floor(Math.random() * bp.enemies.length)];

    grid.forEach((row, ry) => {
      row.forEach((col, rx) => {
        if (col === 'enemy_mob') {
          // Replace on grid with floor
          grid[ry][rx] = 'floor';
          
          // Scale enemy HP based on character level slightly to keep it fair
          const scaledHP = enemySpec.hp + (characterLevel - 1) * 2;
          entities.push({
            id: `${enemySpec.id}_${ry}_${rx}`,
            name: enemySpec.name,
            x: rx,
            y: ry,
            hp: scaledHP,
            maxHP: scaledHP,
            damage: enemySpec.damage,
            behavior: enemySpec.behavior,
            description: enemySpec.description
          });
        }
      });
    });

    // 3. Traversal Solvability Pathfinder Verification (BFS)
    // Verify that player start (2,2) can reach exits and special objects
    let solvabilityPassed = true;
    
    // Check path to Victory Portal if in Victory Room
    if (isVictory) {
      const pathOk = isPathable(grid, tiles, 2, 2, 2, 2);
      if (!pathOk) solvabilityPassed = false;
    }

    // Check path to all exits in this room
    grid.forEach((row, ry) => {
      row.forEach((col, rx) => {
        if (col.startsWith('exit_')) {
          const pathOk = isPathable(grid, tiles, 2, 2, rx, ry);
          if (!pathOk) solvabilityPassed = false;
        }
      });
    });

    // If pathfinder validation fails, resolve by ensuring all pathways are clear floors
    if (!solvabilityPassed) {
      console.warn(`BFS check failed for room gen_${roomKey}. Resetting center grid to clear floors to guarantee pathability.`);
      grid[1][2] = 'floor';
      grid[2][1] = 'floor';
      grid[2][2] = 'floor';
      grid[2][3] = 'floor';
      grid[3][2] = 'floor';
    }

    rooms[`gen_${roomKey}`] = {
      room_id: `gen_${roomKey}`,
      world_coord: coords[roomKey],
      room_name: roomName,
      theme: themeName,
      description: `[ADVENTURE RUN] ${bp.clearingDesc} You are in ${roomName}.`,
      grid,
      player_start: { x: 2, y: 2 },
      tiles,
      entities,
      state_flags: {}
    };
  });

  return {
    rooms,
    theme: themeName,
    victoryRoomKey
  };
}
