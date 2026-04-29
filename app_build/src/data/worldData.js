import freds_house from './fredsHouse.json';
import shoeboxlandia_street from './shoeboxlandiaStreet.json';
import forest_entrance from './forestEntrance.json';
import snake_path from './snakePath.json';
import freddista_shack from './freddistaShack.json';

export const WORLD_SIZE = 30;
export const COORD_MIN = 0;
export const COORD_MAX = 29;

/**
 * Registry mapping "x,y,z" strings to room IDs.
 * Chapter 1: Fred's House → Shoeboxlandia → Forest → Snakes → Freddista
 */
export const worldCoordinateRegistry = {
  "15,15,0": "freds_house",
  "15,16,0": "shoeboxlandia_street",
  "15,17,0": "forest_entrance",
  "15,18,0": "snake_path",
  "15,19,0": "freddista_shack",
};

export const worldData = {
  freds_house,
  shoeboxlandia_street,
  forest_entrance,
  snake_path,
  freddista_shack,
};

/**
 * Get room definition by its ID.
 */
export function getRoomData(roomId) {
  return worldData[roomId] || null;
}

/**
 * Get room definition by its world coordinates.
 */
export function getRoomAt(x, y, z = 0) {
  const coordKey = `${x},${y},${z}`;
  const roomId = worldCoordinateRegistry[coordKey];
  return getRoomData(roomId);
}

/**
 * Check if a coordinate is within the 30x30 world boundaries.
 */
export function isValidCoordinate(x, y, z = 0) {
  return (
    x >= COORD_MIN && x <= COORD_MAX &&
    y >= COORD_MIN && y <= COORD_MAX &&
    z === 0 // for now only support z=0
  );
}
