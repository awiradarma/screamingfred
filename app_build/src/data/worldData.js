import freds_house from './freds_house.json' assert { type: 'json' };
import shoeboxlandia_street from './shoeboxlandia_street.json' assert { type: 'json' };
import forest_entrance from './forest_entrance.json' assert { type: 'json' };
import snake_path from './snake_path.json' assert { type: 'json' };
import freddista_shack from './freddista_shack.json' assert { type: 'json' };
import path_to_breakfastopia from './path_to_breakfastopia.json' assert { type: 'json' };
import breakfastopia_gates from './breakfastopia_gates.json' assert { type: 'json' };
import electric_desert_entrance from './electric_desert_entrance.json' assert { type: 'json' };
import secret_cave from './secret_cave.json' assert { type: 'json' };
import microphone_stage from './microphone_stage.json' assert { type: 'json' };
import mountain_base from './mountain_base.json' assert { type: 'json' };
import attic_bedroom from './attic_bedroom.json' assert { type: 'json' };
import attic_corner from './attic_corner.json' assert { type: 'json' };
import forest_clearing from './forest_clearing.json' assert { type: 'json' };
import forest_creek from './forest_creek.json' assert { type: 'json' };
import forest_deep from './forest_deep.json' assert { type: 'json' };
import forest_exit from './forest_exit.json' assert { type: 'json' };
import forest_marsh from './forest_marsh.json' assert { type: 'json' };
import forest_thicket from './forest_thicket.json' assert { type: 'json' };
import garden_path from './garden_path.json' assert { type: 'json' };
import neighbors_house from './neighbors_house.json' assert { type: 'json' };
import shoe_rack from './shoe_rack.json' assert { type: 'json' };
import window_sill from './window_sill.json' assert { type: 'json' };
import hidden_hideout from './hidden_hideout.json' assert { type: 'json' };
import noodle_factory from './noodle_factory.json' assert { type: 'json' };
import scary_scrapyard from './scary_scrapyard.json' assert { type: 'json' };
import apple_swamp from './apple_swamp.json' assert { type: 'json' };
import great_farm from './great_farm.json' assert { type: 'json' };
import bridge_of_blah from './bridge_of_blah.json' assert { type: 'json' };
import mountain_pass from './mountain_pass.json' assert { type: 'json' };
import mountain_peak from './mountain_peak.json' assert { type: 'json' };
import textlandia_entrance from './textlandia_entrance.json' assert { type: 'json' };
import land_of_jumping from './land_of_jumping.json' assert { type: 'json' };
import scream_collector from './scream_collector.json' assert { type: 'json' };
import forgotten_forest from './forgotten_forest.json' assert { type: 'json' };
import perception_ocean from './perception_ocean.json' assert { type: 'json' };
import mountain_of_miserly from './mountain_of_miserly.json' assert { type: 'json' };
import textlandia_road from './textlandia_road.json' assert { type: 'json' };
import lava_chasms from './lava_chasms.json' assert { type: 'json' };
import land_of_creativity from './land_of_creativity.json' assert { type: 'json' };
import typewriter_keys from './typewriter_keys.json' assert { type: 'json' };
import typewriter_ribbon from './typewriter_ribbon.json' assert { type: 'json' };
import typewriter_deadend from './typewriter_deadend.json' assert { type: 'json' };

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
  "15,14,1": "attic_corner",
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
  "21,16,0": "mountain_pass",
  "22,16,0": "mountain_peak",
  "23,16,0": "textlandia_entrance",

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
  "21,16,-1": "hidden_hideout",
  "22,16,-1": "noodle_factory",
  "23,16,-1": "scary_scrapyard",
  "24,16,-1": "apple_swamp",
  "25,16,-1": "great_farm",
  "26,16,-1": "bridge_of_blah",
  
  // Chapter 2 - Unknown Lands & Textlandia & Creativity
  "26,17,-1": "land_of_jumping",
  "26,18,-1": "scream_collector",
  "25,18,-1": "forgotten_forest",
  "24,18,-1": "perception_ocean",
  "24,17,-1": "mountain_of_miserly",
  "23,16,-1": "textlandia_road",
  "23,15,-1": "lava_chasms",
  "23,15,0": "land_of_creativity",
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
  mountain_pass,
  mountain_peak,
  textlandia_entrance,
  land_of_jumping,
  scream_collector,
  forgotten_forest,
  perception_ocean,
  mountain_of_miserly,
  textlandia_road,
  lava_chasms,
  land_of_creativity,
  typewriter_keys,
  typewriter_ribbon,
  typewriter_deadend,
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
export default worldData;
