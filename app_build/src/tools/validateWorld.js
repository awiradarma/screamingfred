/**
 * validateWorld.js
 * A tool to check for room connection consistency in the MUD world.
 * Built for Node.js CLI (uses fs to avoid ESM import assertion issues).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

function loadRooms() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const world = {};
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
    try {
      const data = JSON.parse(content);
      if (data.room_id) {
        world[data.room_id] = data;
      }
    } catch (e) {
      console.error(`❌ ERROR: Could not parse ${file}: ${e.message}`);
    }
  });
  
  return world;
}

function validateWorld() {
  console.log('🔍 Starting World Consistency Check...');
  let errors = 0;
  let warnings = 0;

  const worldData = loadRooms();
  const roomIds = Object.keys(worldData);
  
  if (roomIds.length === 0) {
    console.error('❌ ERROR: No room data found in src/data/');
    process.exit(1);
  }

  console.log(`Found ${roomIds.length} rooms: ${roomIds.join(', ')}`);

  roomIds.forEach(sourceId => {
    const room = worldData[sourceId];
    const tiles = room.tiles || {};

    Object.entries(tiles).forEach(([tileType, tileData]) => {
      if (tileData.targetRoomId) {
        const targetId = tileData.targetRoomId;
        const targetRoom = worldData[targetId];

        // 1. Check if target exists
        if (!targetRoom) {
          console.error(`❌ ERROR in [${sourceId}]: Tile "${tileType}" points to non-existent room "${targetId}"`);
          errors++;
          return;
        }

        // 2. Check for reciprocity
        const targetExits = Object.values(targetRoom.tiles).filter(t => t.targetRoomId === sourceId);
        if (targetExits.length === 0) {
          console.warn(`⚠️ WARNING in [${sourceId}]: Exit "${tileType}" leads to [${targetId}], but [${targetId}] has NO path back to [${sourceId}]. (One-way trip)`);
          warnings++;
        }

        // 3. Check for cardinal entry consistency
        // If exit name contains "north", target Y should ideally be 4 (bottom)
        // If exit name contains "south", target Y should ideally be 0 (top)
        // If exit name contains "east", target X should ideally be 0 (left)
        // If exit name contains "west", target X should ideally be 4 (right)
        if (tileData.targetPosition) {
          const { x, y } = tileData.targetPosition;
          if (tileType.includes('north') && y < 3) {
            console.warn(`📍 HINT in [${sourceId}]: Exit "${tileType}" (North) drops player at y=${y}. For consistency, it should probably be y=3 or 4 (the bottom of room [${targetId}]).`);
            warnings++;
          }
          if (tileType.includes('south') && y > 1) {
            console.warn(`📍 HINT in [${sourceId}]: Exit "${tileType}" (South) drops player at y=${y}. For consistency, it should probably be y=0 or 1 (the top of room [${targetId}]).`);
            warnings++;
          }
          if (tileType.includes('east') && x > 1) {
            console.warn(`📍 HINT in [${sourceId}]: Exit "${tileType}" (East) drops player at x=${x}. For consistency, it should probably be x=0 or 1 (the left of room [${targetId}]).`);
            warnings++;
          }
          if (tileType.includes('west') && x < 3) {
            console.warn(`📍 HINT in [${sourceId}]: Exit "${tileType}" (West) drops player at x=${x}. For consistency, it should probably be x=3 or 4 (the right of room [${targetId}]).`);
            warnings++;
          }
        }
      }
    });
  });

  console.log('\n--- Result ---');
  if (errors === 0 && warnings === 0) {
    console.log('✅ World is consistent! All connections work and are reciprocal.');
  } else if (errors === 0 && warnings > 0) {
    console.log(`🏁 Finished with ${warnings} warnings. (World is functional but has one-way paths)`);
  } else {
    console.log(`🏁 Finished with ${errors} errors and ${warnings} warnings.`);
  }

  if (errors > 0) process.exit(1);
}

validateWorld();
