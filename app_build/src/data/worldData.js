import forest_entrance from './testRoom.json';
import whispering_groove from './whisperingGroove.json';
import hidden_glade from './hiddenGlade.json';
import sunny_meadow from './sunnyMeadow.json';

export const WORLD_SIZE = 30;
export const COORD_MIN = 0;
export const COORD_MAX = 29;

/**
 * Registry mapping "x,y,z" strings to room IDs.
 */
export const worldCoordinateRegistry = {
  "15,15,0": "forest_entrance",
  "15,14,0": "whispering_groove",
  "15,16,0": "hidden_glade",
  "16,15,0": "sunny_meadow",
};

export const worldData = {
  forest_entrance,
  whispering_groove,
  hidden_glade,
  sunny_meadow,
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
