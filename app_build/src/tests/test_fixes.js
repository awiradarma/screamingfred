import { initGameState, processCommand } from '../engine/roomEngine.js';
import mountain_base from '../data/mountain_base.json' assert { type: 'json' };
import scary_scrapyard from '../data/scary_scrapyard.json' assert { type: 'json' };
import great_farm from '../data/great_farm.json' assert { type: 'json' };
import { BGM_THEME_MAPS } from '../utils/audioManager.js';
import { CONQUEST_REWARDS } from '../store/useStore.js';
import staticItems from '../data/items.json' assert { type: 'json' };
import { worldData } from '../data/worldData.js';

let failedTestsCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    failedTestsCount++;
  }
}

console.log("=== RUNNING SCREAMING FRED BUG FIX VERIFICATION TESTS ===\n");

// --- TEST 1: BGM MAPPING ---
console.log("--- Test 1: Choppy BGM Mappings ---");
assert(BGM_THEME_MAPS.home === 'home', "BGM home theme maps to 'home'");
assert(BGM_THEME_MAPS.desert === 'desert', "BGM desert theme maps to 'desert'");
assert(BGM_THEME_MAPS.mountain === 'mountain', "BGM mountain theme maps to 'mountain'");
assert(BGM_THEME_MAPS.forest === 'forest', "BGM forest theme maps to 'forest'");
assert(BGM_THEME_MAPS.factory === 'factory', "BGM factory theme maps to 'factory'");
console.log("");

// --- TEST 2: SCRAPYARD RETREAT LOCK & CUTLERY BALANCE ---
console.log("--- Test 2: Scrapyard retreat and Cutlery Monster balance ---");
assert(scary_scrapyard.tiles.exit_west !== undefined, "Scrapyard has exit_west");
assert(scary_scrapyard.tiles.exit_west.conditions !== undefined, "exit_west has conditions");
assert(scary_scrapyard.tiles.exit_west.conditions.requiredItem === "tool_magnifying_glass", "exit_west gated by magnifying glass");

const cutleryMonster = scary_scrapyard.entities.find(e => e.id === "cutlery_monster");
assert(cutleryMonster !== undefined, "Scrapyard contains cutlery_monster");
if (cutleryMonster) {
  assert(cutleryMonster.hp === 6, `Cutlery Monster HP is rebalanced to 6 (got ${cutleryMonster.hp})`);
  assert(cutleryMonster.damage === 1, `Cutlery Monster damage is rebalanced to 1 (got ${cutleryMonster.damage})`);
}
console.log("");

// --- TEST 3: GREAT FARM ULTRA GOLDEN POTATO ---
console.log("--- Test 3: Great Farm Golden Potato Placement ---");
const farmGrid = great_farm.grid;
let goldenPotatoCount = 0;
for (let r = 0; r < farmGrid.length; r++) {
  for (let c = 0; c < farmGrid[r].length; c++) {
    if (farmGrid[r][c] === 'golden_potato') {
      goldenPotatoCount++;
    }
  }
}
assert(goldenPotatoCount === 1, "There is exactly one 'golden_potato' tile in the Great Farm grid");
assert(great_farm.tiles.golden_potato !== undefined, "golden_potato tile definition exists");
if (great_farm.tiles.golden_potato) {
  assert(great_farm.tiles.golden_potato.item !== undefined, "golden_potato tile contains an item");
  assert(great_farm.tiles.golden_potato.item.itemId === 'food_ultra_potato', "Item key is 'food_ultra_potato'");
}
console.log("");

// --- TEST 4: BARRY CHAIR DIALOGUE SEQUENCE ---
console.log("--- Test 4: Barry Chair Dialogue Sequence (Sit First) ---");
let state = initGameState(mountain_base);

// Simulate sitting first: set player at chair position and interact
state.playerPosition = { x: 1, y: 3 }; // Cursed Chair is at (1,3)
const stepOnChairResult = processCommand(state, "interact");
state = stepOnChairResult.state;
assert(state.stateFlags.sat_in_chair === true, "Player sits in chair");

// Now move onto Barry (2,2) and talk
state.playerPosition = { x: 2, y: 2 };

// Talk 1 -> plays Stage 0 (tracker becomes 1)
let result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry === 1, `Talk 1: Stage advances to 1 (got ${state.npcStages.npc_barry})`);

// Talk 2 -> plays Stage 1 (tracker becomes 2)
result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry === 2, `Talk 2: Stage advances to 2 (got ${state.npcStages.npc_barry})`);

// Talk 3 -> since sat_in_chair is true, Stage 2 skipIfFailed skips it, plays Stage 3 (tracker becomes 4)
result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry === 4, `Talk 3: Stage skips 2, plays 3, advances to 4 (got ${state.npcStages.npc_barry})`);

// Give player magnifying glass
state.inventory.push({
  itemId: "tool_magnifying_glass",
  name: "Magnifying Glass",
  type: "tool",
  onUse: {
    action: "damage_enemy",
    target: "npc_barry",
    flagSet: "barry_burned",
    successMessage: "You hold the magnifying glass up to the sun...",
    failureMessage: "You try to focus the light..."
  }
});
result = processCommand(state, "use Magnifying Glass");
state = result.state;
assert(state.stateFlags.barry_burned === true, "Barry gets burned with magnifying glass!");

console.log("");
console.log("--- Test 5: Barry Chair Dialogue Sequence (Talk First) ---");
state = initGameState(mountain_base);
state.playerPosition = { x: 2, y: 2 };

// Talk 1 (Stage 0)
result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry === 1, "Dialogue advances to stage 1");

// Talk 2 (Stage 1)
result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry === 2, "Dialogue advances to stage 2");

// Talk 3 (Stage 2 - blocks because not sat in chair, deals damage)
const preHP = state.playerHP;
result = processCommand(state, "talk");
state = result.state;
assert(state.playerHP < preHP, "Barry zaps player, dealing damage");
assert(state.npcStages.npc_barry === 3, `Dialogue played stage 2 and advanced tracker to 3 (got ${state.npcStages.npc_barry})`);

// Talk 4 (Still not sat in chair, stays at stage 3 because Stage 3 conditions are not met, plays Stage 2 again)
result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry === 3, "Dialogue stays at tracker stage 3 as conditions for Stage 3 are unmet");

// Player moves to chair and sits
state.playerPosition = { x: 1, y: 3 };
result = processCommand(state, "interact");
state = result.state;
assert(state.stateFlags.sat_in_chair === true, "Player sits in chair after talking");

// Player talks to Barry again
state.playerPosition = { x: 2, y: 2 };
result = processCommand(state, "talk");
state = result.state;
assert(state.npcStages.npc_barry > 3, `Dialogue advances past stage 3 now that player has sat (got ${state.npcStages.npc_barry})`);

// --- TEST 6: CONQUEST COMPLETENESS & ITEM PLACEMENTS ---
console.log("--- Test 6: Conquest Completeness & Item Placements ---");
const availableItemIdsOrNames = new Set();

for (const roomId in worldData) {
  const room = worldData[roomId];
  if (!room.tiles) continue;
  
  for (const tileKey in room.tiles) {
    const tile = room.tiles[tileKey];
    
    // 1. Check tile items
    if (tile.item) {
      if (tile.item.itemId) availableItemIdsOrNames.add(tile.item.itemId);
      if (tile.item.name) availableItemIdsOrNames.add(tile.item.name);
      if (tile.item.contains) {
        if (tile.item.contains.itemId) availableItemIdsOrNames.add(tile.item.contains.itemId);
        if (tile.item.contains.name) availableItemIdsOrNames.add(tile.item.contains.name);
      }
    }
    
    // 2. Check NPC dialogue awards
    if (tile.npc && tile.npc.dialogue) {
      tile.npc.dialogue.forEach(stage => {
        if (stage.givesItem) {
          if (stage.givesItem.itemId) availableItemIdsOrNames.add(stage.givesItem.itemId);
          if (stage.givesItem.name) availableItemIdsOrNames.add(stage.givesItem.name);
        }
        if (stage.onComplete && stage.onComplete.action === 'give_item') {
          availableItemIdsOrNames.add(stage.onComplete.itemId);
        }
      });
    }
    
    // 3. Check Enemy drops
    if (tile.enemy && tile.enemy.loot) {
      availableItemIdsOrNames.add(tile.enemy.loot);
    }
  }

  // 4. Check room entities
  if (room.entities) {
    room.entities.forEach(entity => {
      if (entity.loot) {
        availableItemIdsOrNames.add(entity.loot);
      }
    });
  }
}

// Expand the set of available items by matching registered item names
const allAvailableNames = new Set();
availableItemIdsOrNames.forEach(idOrName => {
  allAvailableNames.add(idOrName.toLowerCase());
  if (staticItems[idOrName]) {
    allAvailableNames.add(staticItems[idOrName].name.toLowerCase());
  }
});

let totalConquestItemsVerified = 0;
CONQUEST_REWARDS.forEach(conquest => {
  conquest.requiredItems.forEach((reqId, index) => {
    const reqName = conquest.requiredItemNames ? conquest.requiredItemNames[index] : null;
    
    const hasId = allAvailableNames.has(reqId.toLowerCase());
    const hasName = reqName ? allAvailableNames.has(reqName.toLowerCase()) : false;
    
    assert(hasId || hasName, `Conquest item '${reqId}' (${reqName || 'no name'}) for '${conquest.name}' exists in the game world`);
    totalConquestItemsVerified++;
  });
});
console.log(`Verified ${totalConquestItemsVerified} conquest items across all room definitions!`);

console.log("");
if (failedTestsCount === 0) {
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
  process.exit(0);
} else {
  console.error(`TEST SUITE FAILED with ${failedTestsCount} failure(s)`);
  process.exit(1);
}
