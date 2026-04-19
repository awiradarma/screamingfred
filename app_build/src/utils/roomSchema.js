/**
 * roomSchema.js
 * Basic structure validation for TacticalRoom JSON.
 */

export const validateRoom = (json) => {
  const errors = [];

  if (!json.room_name) errors.push("Missing 'room_name'");
  
  if (!json.world_coord) {
    errors.push("Missing 'world_coord'");
  } else if (!/^-?\d+,-?\d+,-?\d+$/.test(json.world_coord)) {
    errors.push("'world_coord' must be 'x,y,z' integers (e.g. '0,0,0')");
  }

  if (!json.theme) errors.push("Missing 'theme'");
  
  if (!Array.isArray(json.grid)) {
    errors.push("'grid' must be an array of arrays");
  } else {
    const height = json.grid.length;
    if (height !== 5) errors.push("'grid' height must be 5 rows");
    json.grid.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== 5) {
        errors.push(`Row ${i} must have exactly 5 columns`);
      } else {
        row.forEach((tile, j) => {
          if (!json.tiles || !json.tiles[tile]) {
            errors.push(`Tile '${tile}' at (${j},${i}) is not defined in 'tiles' dictionary`);
          }
        });
      }
    });
  }

  if (!json.player_start || typeof json.player_start.x !== 'number' || typeof json.player_start.y !== 'number') {
    errors.push("Missing or invalid 'player_start' {x, y}");
  }

  if (!json.tiles || typeof json.tiles !== 'object') {
    errors.push("Missing 'tiles' definition object");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Default templates for new rooms or tiles
 */
export const ROOM_TEMPLATE = {
  room_name: "New Room",
  world_coord: "0,0,0",
  theme: "forest",
  grid: Array(5).fill().map(() => Array(5).fill("grass")),
  player_start: { x: 2, y: 2 },
  tiles: {
    "grass": { name: "Grass", description: "Soft green grass.", passable: true },
    "wall": { name: "Stone Wall", description: "An impassable wall.", passable: false }
  },
  entities: [],
  state_flags: {}
};
