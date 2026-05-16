import freds_house from './freds_house.json';
import shoeboxlandia_street from './shoeboxlandia_street.json';
import forest_entrance from './forest_entrance.json';
import snake_path from './snake_path.json';
import freddista_shack from './freddista_shack.json';
import path_to_breakfastopia from './path_to_breakfastopia.json';
import breakfastopia_gates from './breakfastopia_gates.json';
import electric_desert_entrance from './electric_desert_entrance.json';
import secret_cave from './secret_cave.json';
import microphone_stage from './microphone_stage.json';
import mountain_base from './mountain_base.json';
import attic_bedroom from './attic_bedroom.json';
import attic_corner from './attic_corner.json';
import forest_clearing from './forest_clearing.json';
import forest_creek from './forest_creek.json';
import forest_deep from './forest_deep.json';
import forest_exit from './forest_exit.json';
import forest_marsh from './forest_marsh.json';
import forest_thicket from './forest_thicket.json';
import garden_path from './garden_path.json';
import neighbors_house from './neighbors_house.json';
import shoe_rack from './shoe_rack.json';
import window_sill from './window_sill.json';
import hidden_hideout from './hidden_hideout.json';
import noodle_factory from './noodle_factory.json';
import scary_scrapyard from './scary_scrapyard.json';
import apple_swamp from './apple_swamp.json';
import great_farm from './great_farm.json';
import bridge_of_blah from './bridge_of_blah.json';

export const WORLD_SIZE = 30;
export const COORD_MIN = 0;
export const COORD_MAX = 29;

/**
 * Registry mapping "x,y,z" strings to room IDs.
 */
export const worldCoordinateRegistry = {
  // Village area
  "15,15,0": "freds_house",
  "15,15,1": "attic_bedroom",
  "15,14,0": "attic_corner",
  "16,14,0": "shoe_rack",
  "17,14,0": "window_sill",
  "16,15,0": "neighbors_house",
  "14,16,0": "garden_path",

  // Main Path
  "15,16,0": "shoeboxlandia_street",
  "16,16,0": "path_to_breakfastopia",
  "17,16,0": "breakfastopia_gates",
  "18,16,0": "electric_desert_entrance",
  "19,16,0": "microphone_stage",
  "20,16,0": "mountain_base",

  // Forest
  "15,17,0": "forest_entrance",
  "15,17,-1": "secret_cave",
  "15,18,0": "forest_thicket",
  "16,18,0": "forest_deep",
  "17,18,0": "forest_clearing",
  "14,18,0": "forest_creek",
  "16,19,0": "forest_exit",
  "17,19,0": "forest_marsh",
  "15,19,0": "snake_path",
  "15,20,0": "freddista_shack",
  "21,16,0": "hidden_hideout",
  "22,16,0": "noodle_factory",
  "23,16,0": "scary_scrapyard",
  "24,16,0": "apple_swamp",
  "25,16,0": "great_farm",
  "26,16,0": "bridge_of_blah",
};

export const worldData = {
  freds_house,
  shoeboxlandia_street,
  forest_entrance,
  snake_path,
  freddista_shack,
  path_to_breakfastopia,
  breakfastopia_gates,
  electric_desert_entrance,
  microphone_stage,
  mountain_base,
  secret_cave,
  attic_bedroom,
  attic_corner,
  forest_clearing,
  forest_creek,
  forest_deep,
  forest_exit,
  forest_marsh,
  forest_thicket,
  garden_path,
  neighbors_house,
  shoe_rack,
  window_sill,
  hidden_hideout,
  noodle_factory,
  scary_scrapyard,
  apple_swamp,
  great_farm,
  bridge_of_blah,
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
    (z === -1 || z === 0 || z === 1) // Support underground, surface, and upstairs
  );
}
