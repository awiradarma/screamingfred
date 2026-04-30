/**
 * roomEngine.js
 * Core game logic for the MUD text adventure.
 * Processes commands against room state and returns new state + messages.
 */

import { parseCommand, getHelpText } from './commandParser.js';
import {
  describeRoom, describeTile, describeMovement, describeBlocked,
  describeScream, getNPCDialogue, getNPCHint,
  describeItemFound, describeAttack, describeEnemyDefeated,
  describeEnemyAttacks, getWelcomeMessage, formatEntityName
} from './textGenerator.js';
import { getRoomData, getRoomAt, isValidCoordinate } from '../data/worldData.js';

// Direction vectors for grid movement
const DIR_VECTORS = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east:  { dx: 1, dy: 0 },
  west:  { dx: -1, dy: 0 },
};

/**
 * Initialize game state from room data.
 * @param {object} roomData - The TacticalRoom JSON
 * @returns {object} Initial game state
 */
export function initGameState(roomData) {
  return {
    room: roomData,
    playerPosition: { ...roomData.player_start },
    playerHP: 10,
    maxHP: 10,
    inventory: [],
    stateFlags: { ...roomData.state_flags },
    npcStages: {},       // track dialogue stages per NPC
    enemyHP: {},         // track enemy HP overrides
    entities: (roomData.entities || []).map(e => ({ ...e })), // cloned live entities
    turnCount: 0,
  };
}

/**
 * Get the tile type at a position in the room grid.
 */
function getTileAt(room, x, y) {
  if (y < 0 || y >= room.grid.length) return null;
  if (x < 0 || x >= room.grid[y].length) return null;
  return room.grid[y][x];
}

/**
 * Get tile data (definition) for a given tile type.
 */
function getTileData(room, tileType) {
  return room.tiles[tileType] || null;
}

/**
 * Get the current tile type the player is standing on.
 */
function getCurrentTile(state) {
  return state.room.grid[state.playerPosition.y][state.playerPosition.x];
}

/**
 * Returns an array of tile info (type, pos) adjacent to the player.
 */
function getAdjacentTiles(state) {
  const { x, y } = state.playerPosition;
  const adjacent = [];
  const dirs = [
    { x: 0, y: -1 }, // North
    { x: 0, y: 1 },  // South
    { x: -1, y: 0 }, // West
    { x: 1, y: 0 }   // East
  ];

  dirs.forEach(d => {
    const nx = x + d.x;
    const ny = y + d.y;
    if (ny >= 0 && ny < state.room.grid.length && nx >= 0 && nx < state.room.grid[0].length) {
      adjacent.push({
        type: state.room.grid[ny][nx],
        pos: { x: nx, y: ny }
      });
    }
  });

  return adjacent;
}

/**
 * Process a raw input string and return updated state + message array.
 * @param {object} state - Current game state
 * @param {string} rawInput - Player's typed input
 * @param {object} itemRegistry - The cloud-backed item registry
 * @returns {{ state: object, messages: Array<{text: string, type: string}> }}
 */
export function processCommand(state, rawInput, itemRegistry = {}) {
  const command = parseCommand(rawInput);
  const messages = [];
  let newState = { ...state, turnCount: state.turnCount + 1 };
  let result;

  const isDead = state.playerHP <= 0;

  // Meta-commands that are allowed even while dead
  const allowedWhileDead = ['look', 'help', 'inventory', 'empty'];
  if (isDead && !allowedWhileDead.includes(command.action)) {
    messages.push({ text: "You are too weak to do that. You have fallen. Use RESTART to try again.", type: 'danger' });
    return { state, messages };
  }

  switch (command.action) {
    case 'empty':
      return { state, messages: [] };

    case 'look':
      result = handleLook(newState, messages);
      break;

    case 'move':
      result = handleMove(newState, command.target, messages);
      break;

    case 'interact':
      result = handleInteract(newState, command.target, messages, itemRegistry);
      break;

    case 'talk':
      result = handleTalk(newState, messages, itemRegistry);
      break;

    case 'scream':
      result = handleScream(newState, messages, itemRegistry);
      break;

    case 'attack':
      result = handleAttack(newState, messages, itemRegistry);
      break;

    case 'inventory':
      result = handleInventory(newState, messages);
      break;

    case 'help':
      result = handleHelp(newState, messages);
      break;

    case 'use':
      result = handleUse(newState, command.target, messages, itemRegistry);
      break;

    case 'unknown':
    default:
      messages.push({ text: `You mumble "${command.raw}" but nothing happens. Type HELP for commands.`, type: 'system' });
      break;
  }

  if (result) {
    newState = result.state;
    if (result.messages && result.messages !== messages) {
      messages.splice(0, messages.length, ...result.messages);
    }
  }

  const turnTakingActions = ['move', 'use', 'attack', 'scream', 'interact', 'talk'];
  if (turnTakingActions.includes(command.action)) {
    const entityResult = processLivingEntities(newState, messages);
    newState = entityResult.state;
  }

  return { state: newState, messages };
}

/**
 * Process AI turns for entities (Patrols, Stalkers).
 */
function processLivingEntities(state, messages) {
  let newState = { ...state };
  const player = newState.playerPosition;

  const updatedEntities = newState.entities.map(entity => {
    // If entity is an enemy and is defeated (via flag), don't process
    const isDefeated = newState.stateFlags[`${entity.id}_defeated`];
    if (isDefeated) return entity;

    let nextX = entity.x;
    let nextY = entity.y;

    if (entity.behavior === 'stalk') {
      const dist = Math.abs(player.x - entity.x) + Math.abs(player.y - entity.y);
      const range = entity.detectionRange || 10;

      if (dist <= range && dist > 0) {
        // Simple step-towards-player logic
        const dx = player.x - entity.x;
        const dy = player.y - entity.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          nextX += Math.sign(dx);
        } else {
          nextY += Math.sign(dy);
        }
      }
    } else if (entity.behavior === 'patrol' && entity.patrolPath) {
      // Find current point in path
      const currentPointIdx = entity.patrolPath.findIndex(p => p.x === entity.x && p.y === entity.y);
      const nextPointIdx = (currentPointIdx + 1) % entity.patrolPath.length;
      const target = entity.patrolPath[nextPointIdx];
      
      const dx = target.x - entity.x;
      const dy = target.y - entity.y;
      
      if (dx !== 0) nextX += Math.sign(dx);
      else if (dy !== 0) nextY += Math.sign(dy);
    }

    // Collision Check: Don't move into walls or other non-passable tiles
    const tileAtNext = getTileAt(newState.room, nextX, nextY);
    const tileData = getTileData(newState.room, tileAtNext);
    if (!tileData || (tileData.passable === false)) {
      return entity; // Stay put
    }

    // Trigger Combat if entity moves onto Fred
    if (nextX === player.x && nextY === player.y) {
      const damage = entity.damage || 1;
      newState.playerHP = Math.max(0, newState.playerHP - damage);
      messages.push({ 
        text: `⚠️ ${formatEntityName(entity.name, true)} catches up to you and attacks, dealing ${damage} damage!`, 
        type: 'danger' 
      });
      return { ...entity, x: nextX, y: nextY };
    }

    return { ...entity, x: nextX, y: nextY };
  });

  return { state: { ...newState, entities: updatedEntities }, messages };
}

// ── Command Handlers ──────────────────────────────────

function handleLook(state, messages) {
  // Room description
  messages.push({ text: describeRoom(state.room), type: 'narrative' });

  // Current tile description
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  const tileDesc = describeTile(tileType, tileData, state.stateFlags);
  messages.push({ text: tileDesc, type: 'narrative' });

  // Show available actions hint
  const actions = getAvailableActions(state);
  if (actions.length > 0) {
    messages.push({ text: `Available: ${actions.join(', ')}`, type: 'system' });
  }

  return { state, messages };
}

export function handleMove(state, direction, messages) {
  if (!direction || !DIR_VECTORS[direction]) {
    messages.push({ text: 'Move where? Try: north, south, east, west (or n/s/e/w)', type: 'system' });
    return { state, messages };
  }

  const { dx, dy } = DIR_VECTORS[direction];
  const newX = state.playerPosition.x + dx;
  const newY = state.playerPosition.y + dy;

  const targetTile = getTileAt(state.room, newX, newY);
  const tileData = targetTile ? getTileData(state.room, targetTile) : null;

  // Check for world edge transition if no tile exists at target
  let transitionRoom = null;
  let transitionPos = null;

  if (!targetTile) {
    const currentCoord = state.room.world_coord;
    if (currentCoord) {
      const parts = currentCoord.split(',').map(Number);
      if (parts.length >= 2) {
        const [cx, cy, cz = 0] = parts;
        const nx = cx + dx;
        const ny = cy + dy;

        // Note: we can't use require here in browser, using the imported functions
        if (isValidCoordinate(nx, ny, cz)) {
          transitionRoom = getRoomAt(nx, ny, cz);
          if (transitionRoom) {
            transitionPos = calculateEntryPosition(transitionRoom, direction);
          }
        }
      }
    }
  }

  // If no transition and no tile (or impassable tile), it's blocked
  if (!transitionRoom && (!targetTile || !tileData?.passable)) {
    messages.push({ text: describeBlocked(), type: 'warning' });
    return { state, messages };
  }

  // Use a mutable working state to avoid 'stale state' bugs where flags overwrite pos
  let finalState = { ...state };
  let finalFlags = { ...state.stateFlags };

  // Check for locked door/gate (New Dynamic Conditions)
  if (tileData.conditions) {
    const { requiredItem, requiredFlag, failMessage, onSuccess } = tileData.conditions;

    // Check if player has the item (check itemId or name)
    const hasItem = requiredItem ? state.inventory.some(i => i.itemId === requiredItem || i.name === requiredItem) : true;
    // Check if player has met the flag
    const hasFlag = requiredFlag ? state.stateFlags[requiredFlag] || finalFlags[requiredFlag] : true;

    if (!hasItem || !hasFlag) {
      messages.push({ 
        text: failMessage || `${formatEntityName(tileData.name || 'path', true)} is locked.`, 
        type: 'warning' 
      });
      return { state, messages };
    }

    // Condition met! Handle onSuccess if it hasn't been handled yet
    if (onSuccess && (!onSuccess.setFlag || !state.stateFlags[onSuccess.setFlag])) {
      if (onSuccess.msg) messages.push({ text: onSuccess.msg, type: 'loot' });
      if (onSuccess.setFlag) {
        finalFlags[onSuccess.setFlag] = true;
      }
    }
  }

  // Move the player and apply all flag changes
  finalState = {
    ...finalState,
    playerPosition: { x: newX, y: newY },
    stateFlags: finalFlags
  };

  messages.push({ text: describeMovement(direction), type: 'narrative' });

  // Apply Tile Effects (Lava, Ice, Bouncy, etc.)
  const effectResult = applyTileEffects(finalState, newX, newY, messages, direction);
  finalState = effectResult.state;
  const currentPos = finalState.playerPosition; 

  // Describe what's on the NEW FINAL tile (after effects like sliding/bouncing)
  const finalTileType = getTileAt(finalState.room, currentPos.x, currentPos.y);
  const finalTileData = getTileData(finalState.room, finalTileType);
  
  if (finalTileData) {
    const tileDesc = describeTile(finalTileType, finalTileData, finalState.stateFlags);
    messages.push({ text: tileDesc, type: 'narrative' });
  }

  // Handle Room Transition (Specific trigger or Edge transition)
  if (finalTileData?.targetRoomId) {
    // Explicit transition tile
    transitionRoom = getRoomData(finalTileData.targetRoomId);
    transitionPos = finalTileData.targetPosition;
  }

  if (transitionRoom) {
    messages.push({ text: `⚡ Transitioning to ${transitionRoom.room_name}...`, type: 'system' });
    return {
      state: {
        ...finalState,
        room: transitionRoom,
        playerPosition: transitionPos || { ...transitionRoom.player_start },
      },
      messages: [
        ...messages,
        { text: describeRoom(transitionRoom), type: 'narrative' }
      ]
    };
  }

  // Enemy proximity warning
  if (finalTileData?.enemy && !finalState.stateFlags[`${finalTileType.replace(/^enemy_/, '')}_defeated`]) {
    messages.push({ text: `⚠ A ${finalTileData.enemy.name} is here! You can ATTACK or SCREAM.`, type: 'danger' });
  }

  return { state: finalState, messages };
}

/**
 * Calculate the starting position when entering a room from an edge.
 */
function calculateEntryPosition(room, fromDirection) {
  const height = room.grid.length;
  const width = room.grid[0].length;
  
  switch (fromDirection) {
    case 'north': return { x: Math.floor(width / 2), y: height - 1 };
    case 'south': return { x: Math.floor(width / 2), y: 0 };
    case 'east':  return { x: 0, y: Math.floor(height / 2) };
    case 'west':  return { x: width - 1, y: Math.floor(height / 2) };
    default: return { ...room.player_start };
  }
}

function applyTileEffects(state, x, y, messages, direction) {
  let newState = { ...state };
  let currentX = x;
  let currentY = y;
  let loopCount = 0;
  let moved = true;

  while (moved && loopCount < 15) {
    moved = false;
    loopCount++;
    
    const tileType = getTileAt(newState.room, currentX, currentY);
    const tileData = getTileData(newState.room, tileType);
    if (!tileData) break;

    // 1. Damage Effects (Lava, Lake, Toxic)
    if (tileData.effect === 'damage' || ['lava', 'lake', 'toxic_pit'].includes(tileType) || tileType.includes('lava') || tileType.includes('lake')) {
      const damage = tileData.damageAmount || 1;
      newState.playerHP = Math.max(0, newState.playerHP - damage);
      const msg = tileData.effectMessage || (tileType.includes('lava') ? "Sizzle! The lava burns!" : "Gurgle! The water is deep and cold.");
      messages.push({ text: `⚠️ ${msg} (-${damage} HP)`, type: 'danger' });
    }

    // 2. Bouncy Effects (Random non-wall teleport)
    if (tileData.effect === 'bouncy' || tileType === 'bouncy' || tileType.includes('bouncy')) {
      messages.push({ text: "💨 BOING! The bouncy pad flings you across the room!", type: 'warning' });
      
      const validTiles = [];
      newState.room.grid.forEach((row, ty) => {
        row.forEach((tile, tx) => {
          const tData = getTileData(newState.room, tile);
          if (tData && tData.passable !== false && tile !== 'stone_wall' && !tile.includes('wall')) {
            validTiles.push({ x: tx, y: ty });
          }
        });
      });

      if (validTiles.length > 0) {
        const randomTarget = validTiles[Math.floor(Math.random() * validTiles.length)];
        currentX = randomTarget.x;
        currentY = randomTarget.y;
        newState.playerPosition = { x: currentX, y: currentY };
        moved = true;
        continue; // Check the new tile immediately
      }
    }

    // 3. Ice Effects (Slide)
    if (tileData.effect === 'ice' || tileType === 'ice' || tileType.includes('ice')) {
      messages.push({ text: "❄️ Woah! It's slippery!", type: 'narrative' });
      const { dx, dy } = DIR_VECTORS[direction];
      
      let slideX = currentX + dx;
      let slideY = currentY + dy;
      let lastValidX = currentX;
      let lastValidY = currentY;
      
      while (true) {
        const nextTile = getTileAt(newState.room, slideX, slideY);
        const nextTileData = getTileData(newState.room, nextTile);
        
        if (!nextTile || !nextTileData || !nextTileData.passable) {
          break; 
        }
        
        lastValidX = slideX;
        lastValidY = slideY;
        
        if (nextTileData.effect !== 'ice' && nextTile !== 'ice' && !nextTile.includes('ice')) {
          break;
        }
        
        slideX += dx;
        slideY += dy;
      }
      
      if (lastValidX !== currentX || lastValidY !== currentY) {
        currentX = lastValidX;
        currentY = lastValidY;
        newState.playerPosition = { x: currentX, y: currentY };
        messages.push({ text: "You slide across the ice!", type: 'narrative' });
        moved = true; // Check the landing tile for effects (like a bouncy pad at the end of ice)
      }
    }
  }

  return { state: newState, messages };
}

function handleInteract(state, target, messages, globalItems = {}) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);

  if (!tileData?.item) {
    messages.push({ text: 'There\'s nothing to interact with here.', type: 'system' });
    return { state, messages };
  }

  const verb = tileData.interactionVerb || 'SEARCH';
  const flagKey = `${tileType}_opened`;
  if (state.stateFlags[flagKey]) {
    messages.push({ text: tileData.item.opened_description || 'Already searched.', type: 'system' });
    return { state, messages };
  }

  if (tileData.revealMessage) {
    messages.push({ text: tileData.revealMessage, type: 'narrative' });
  }

  // Process picking up items
  let newState = { ...state, stateFlags: { ...state.stateFlags, [flagKey]: true } };
  
  if (tileData.item) {
    let itemToCollect = null;
    
    // Resolve item from Global Registry if itemId provided
    if (tileData.item.itemId && globalItems[tileData.item.itemId]) {
      itemToCollect = { ...globalItems[tileData.item.itemId], itemId: tileData.item.itemId };
    } else if (tileData.item.contains) {
      itemToCollect = { ...tileData.item.contains };
    }

    if (itemToCollect) {
      // Support comma separated list of items
      const itmNames = itemToCollect.name.split(',').map(s => s.trim());
      itmNames.forEach(name => {
        if (name) {
          newState.inventory = [...newState.inventory, { name, type: 'resource' }];
          messages.push({ 
            text: `You found: ${name}!`,
            type: 'loot' 
          });
        }
      });
    }

    if (tileData.item.setFlag) {
      newState.stateFlags[tileData.item.setFlag] = true;
    }
    
    if (tileData.item.onCollect) {
      messages.push({ text: tileData.item.onCollect, type: 'narrative' });
    }
  }
  return { state: newState, messages };
}

function handleTalk(state, messages, globalItems = {}) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);

  if (!tileData?.npc) {
    messages.push({ text: 'There\'s nobody here to talk to.', type: 'system' });
    return { state, messages };
  }

  const npcData = tileData.npc;
  const npcKey = tileType;
  const dialogueStages = npcData.dialogue || [];
  
  if (dialogueStages.length === 0) {
    messages.push({ text: '"..."', type: 'dialogue' });
    return { state, messages };
  }

  // Track sequential progression using npcStages
  const currentStageLimit = state.npcStages[npcKey] || 0;
  
  // Find the best dialogue stage (scanned in reverse from the current allowed limit)
  let bestStage = dialogueStages[0];
  let bestStageIdx = 0;

  for (let i = Math.min(currentStageLimit, dialogueStages.length - 1); i >= 0; i--) {
    const stage = dialogueStages[i];
    if (!stage.requiresFlag || state.stateFlags[stage.requiresFlag]) {
      bestStage = stage;
      bestStageIdx = i;
      break;
    }
  }

  messages.push({ text: bestStage.text || '...', type: 'dialogue' });
  if (bestStage.hint) {
    messages.push({ text: `💡 ${bestStage.hint}`, type: 'hint' });
  }

  let finalFlags = { ...state.stateFlags };
  let finalInventory = [...state.inventory];
  let finalNpcStages = { ...state.npcStages };
  
  // Increment stage tracker for this NPC to allow progression on next talk
  finalNpcStages[npcKey] = Math.min(bestStageIdx + 1, dialogueStages.length - 1);

  // Helper to handle item rewards with duplicate prevention
  const giveReward = (item, sourceName, uniqueKey) => {
    if (!finalFlags[uniqueKey]) {
      finalInventory.push(item);
      finalFlags[uniqueKey] = true;
      messages.push({ 
        text: `🎁 ${sourceName} gave you: ${item.name}!`, 
        type: 'loot' 
      });
      return true;
    }
    return false;
  };

  // Handle Rewards (New format: givesItem)
  if (bestStage.givesItem) {
    const rewardKey = `reward_${npcKey}_stage${bestStageIdx}_item`;
    giveReward(
      { ...bestStage.givesItem }, 
      tileData.name || npcData.name, 
      rewardKey
    );
  }

  // Handle onComplete actions (Standard format)
  if (bestStage.onComplete) {
    const { action, itemId, flagSet, msg } = bestStage.onComplete;
    
    if (action === 'give_item' && itemId && globalItems[itemId]) {
      const rewardKey = `reward_${npcKey}_stage${bestStageIdx}_${itemId}`;
      giveReward(
        { ...globalItems[itemId], itemId }, 
        tileData.name || npcData.name, 
        rewardKey
      );
    }
    
    if (action === 'set_flag' && flagSet) {
      finalFlags[flagSet] = true;
    }
  }

  // Handle direct setFlag
  if (bestStage.setFlag) {
    finalFlags[bestStage.setFlag] = true;
  }

  return {
    state: {
      ...state,
      inventory: finalInventory,
      stateFlags: finalFlags,
      npcStages: finalNpcStages,
    },
    messages
  };
}

function handleScream(state, messages, globalItems = {}) {
  messages.push({ text: describeScream(), type: 'scream' });

  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  const entityEnemy = state.entities.find(e => e.x === state.playerPosition.x && e.y === state.playerPosition.y && !state.stateFlags[`${e.id}_defeated`]);

  let newState = { ...state };

  // Scream effects on enemies (Tile or Entity)
  const target = entityEnemy || (tileData?.enemy?.scream_vulnerable ? tileData.enemy : null);
  if (target) {
    const targetId = entityEnemy ? entityEnemy.id : tileType.replace(/^enemy_/, '');
    const defeatKey = `${targetId}_defeated`;
    
    if (!state.stateFlags[defeatKey]) {
      const enemyKey = entityEnemy ? entityEnemy.id : tileType;
      const currentHP = state.enemyHP[enemyKey] ?? target.hp;
      const newHP = currentHP - 2; // Scream does 2 damage

      if (newHP <= 0) {
        messages.push({ text: describeEnemyDefeated(target), type: 'loot' });
        
        // Handle Loot
        if (target.loot && globalItems[target.loot]) {
          const lootItem = { ...globalItems[target.loot], itemId: target.loot };
          newState.inventory = [...newState.inventory, lootItem];
          messages.push({ text: `💎 You looted: ${lootItem.name}!`, type: 'loot' });
        }

        newState = {
          ...newState,
          stateFlags: { ...newState.stateFlags, [defeatKey]: true },
          enemyHP: { ...newState.enemyHP, [enemyKey]: 0 },
        };
      } else {
        messages.push({ text: `Your scream stuns ${formatEntityName(target.name)}! (${newHP} HP remaining)`, type: 'narrative' });
        newState = {
          ...newState,
          enemyHP: { ...newState.enemyHP, [enemyKey]: newHP },
        };
      }
    }
  }

  // Scream effects on NPCs — advance dialogue
  if (tileData?.npc) {
    const npcKey = tileType;
    const currentStage = state.npcStages?.[npcKey] || 0;
    if (currentStage === 0) {
      newState = {
        ...newState,
        npcStages: { ...newState.npcStages, [npcKey]: 1 },
        stateFlags: { ...newState.stateFlags, sue_clue_given: true },
      };
      messages.push({ text: getNPCDialogue(tileData.npc, 1), type: 'dialogue' });
    }
  }

  return { state: newState, messages };
}

function handleAttack(state, messages, globalItems = {}) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  
  // Find local entity at this position if no static enemy
  const entityEnemy = state.entities.find(e => e.x === state.playerPosition.x && e.y === state.playerPosition.y && !state.stateFlags[`${e.id}_defeated`]);

  if (!tileData?.enemy && !entityEnemy) {
    messages.push({ text: 'There\'s nothing to attack here. Save your energy.', type: 'system' });
    return { state, messages };
  }

  const target = entityEnemy || tileData.enemy;
  const targetId = entityEnemy ? entityEnemy.id : tileType.replace(/^enemy_/, '');
  const defeatKey = `${targetId}_defeated`;

  if (state.stateFlags[defeatKey]) {
    messages.push({ text: 'The enemy is already defeated. Move along.', type: 'system' });
    return { state, messages };
  }

  const enemyKey = entityEnemy ? entityEnemy.id : tileType;
  const currentHP = state.enemyHP[enemyKey] ?? target.hp;
  const playerDamage = 1;
  const newEnemyHP = currentHP - playerDamage;

  messages.push({ text: describeAttack(target, playerDamage), type: 'narrative' });

  let newState = {
    ...state,
    enemyHP: { ...state.enemyHP, [enemyKey]: newEnemyHP },
  };

  if (newEnemyHP <= 0) {
    messages.push({ text: describeEnemyDefeated(target), type: 'loot' });
    
    // Handle Loot
    if (target.loot && globalItems[target.loot]) {
      const lootItem = { ...globalItems[target.loot], itemId: target.loot };
      newState.inventory = [...newState.inventory, lootItem];
      messages.push({ text: `💎 You looted: ${lootItem.name}!`, type: 'loot' });
    }

    newState = {
      ...newState,
      stateFlags: { ...newState.stateFlags, [defeatKey]: true },
    };
  } else {
    // Enemy counter-attacks
    const newPlayerHP = state.playerHP - target.damage;
    messages.push({ text: describeEnemyAttacks(target), type: 'danger' });
    newState = { ...newState, playerHP: Math.max(0, newPlayerHP) };

    if (newPlayerHP <= 0) {
      messages.push({ text: '💀 Fred collapses! The world fades to black...', type: 'danger' });
    }
  }

  return { state: newState, messages };
}

function handleInventory(state, messages) {
  if (state.inventory.length === 0) {
    messages.push({ text: 'Your pockets are empty. Fred\'s pasta and potatoes are still missing.', type: 'system' });
  } else {
    const items = state.inventory.map(i => `  • ${i.name} (${i.type})`).join('\n');
    messages.push({ text: `Inventory:\n${items}`, type: 'system' });
  }
  return { state, messages };
}

function handleUse(state, itemTarget, messages, globalItems = {}) {
  if (!itemTarget) {
    messages.push({ text: 'Use what? Try: use <item>', type: 'system' });
    return { state, messages };
  }

  // Find item in inventory
  const itemIndex = state.inventory.findIndex(i => 
    i.name.toLowerCase().includes(itemTarget.toLowerCase()) ||
    i.type.toLowerCase() === itemTarget.toLowerCase()
  );

  if (itemIndex === -1) {
    messages.push({ text: `You don't have a "${itemTarget}" in your inventory.`, type: 'system' });
    return { state, messages };
  }

  const item = state.inventory[itemIndex];
  if (!item.onUse) {
    messages.push({ text: `You can't think of a way to use ${formatEntityName(item.name)} right now.`, type: 'system' });
    return { state, messages };
  }

  const { action, value, target, flagSet, successMessage, failureMessage, consume } = item.onUse;
  let newState = { ...state };
  let usedSuccessfully = false;

  switch (action) {
    case 'heal':
      newState.playerHP = Math.min(state.maxHP, state.playerHP + (value || 0));
      messages.push({ text: successMessage || `You use ${formatEntityName(item.name)} and feel revitalized!`, type: 'hint' });
      usedSuccessfully = true;
      break;

    case 'unlock':
      // Check if player is on OR adjacent to the target tile
      const adjacentUnlocked = getAdjacentTiles(state);
      const isNearTargetUnlocked = adjacentUnlocked.some(tile => tile.type === target) || getCurrentTile(state) === target;
      
      if (isNearTargetUnlocked) {
        newState.stateFlags = { ...state.stateFlags, [flagSet]: true };
        messages.push({ text: successMessage || `You use ${formatEntityName(item.name)} to unlock the way!`, type: 'loot' });
        usedSuccessfully = true;
      } else {
        messages.push({ text: failureMessage || `There's nothing to unlock with ${formatEntityName(item.name)} here. Try standing closer to it.`, type: 'warning' });
      }
      break;

    case 'set_flag':
      newState.stateFlags = { ...state.stateFlags, [flagSet]: true };
      messages.push({ text: successMessage || `Spirit of investigation! Flag '${flagSet}' set.`, type: 'hint' });
      usedSuccessfully = true;
      break;

    case 'teleport':
      if (item.onUse.targetRoomId) {
        const nextRoomData = getRoomData(item.onUse.targetRoomId);
        if (nextRoomData) {
          newState = {
            ...newState,
            room: nextRoomData,
            playerPosition: item.onUse.targetPosition || { ...nextRoomData.player_start }
          };
          messages.push({ text: successMessage || `🌀 Space-time ripples... you arrive at ${nextRoomData.room_name}!`, type: 'narrative' });
          usedSuccessfully = true;
        } else {
          messages.push({ text: "The magic flickers... destination unknown.", type: 'warning' });
        }
      }
      break;

    case 'damage_enemy':
      // DYNAMIC TARGETING: If no target specified, or if we want to be flexible, find enemies in room
      let finalTarget = target;
      if (!finalTarget) {
        const potentialTargets = [];
        state.room.grid.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile.startsWith('enemy_') && !state.stateFlags[`${tile.replace(/^enemy_/, '')}_defeated`]) {
              potentialTargets.push({ type: tile, x, y });
            }
          });
        });
        
        if (potentialTargets.length > 0) {
          // Auto-target the closest enemy
          const px = state.playerPosition.x;
          const py = state.playerPosition.y;
          potentialTargets.sort((a,b) => (Math.abs(a.x-px)+Math.abs(a.y-py)) - (Math.abs(b.x-px)+Math.abs(b.y-py)));
          finalTarget = potentialTargets[0].type;
        }
      }

      if (finalTarget && !state.stateFlags[`${finalTarget.replace(/^enemy_/, '')}_defeated`]) {
        const enemyKeyName = finalTarget;
        const eData = getTileData(state.room, finalTarget).enemy;
        const currentHpVal = state.enemyHP[enemyKeyName] ?? eData.hp;
        const dmgVal = value || 1;
        const nextHpVal = currentHpVal - dmgVal;
        
        messages.push({ text: successMessage || `You use ${formatEntityName(item.name)} against ${formatEntityName(eData.name)}!`, type: 'narrative' });
        
        if (nextHpVal <= 0) {
          messages.push({ text: describeEnemyDefeated(eData), type: 'loot' });
          newState.stateFlags = { ...newState.stateFlags, [`${finalTarget.replace(/^enemy_/, '')}_defeated`]: true };
          newState.enemyHP = { ...newState.enemyHP, [enemyKeyName]: 0 };
        } else {
          messages.push({ text: `${formatEntityName(eData.name, true)} takes ${dmgVal} damage! (${nextHpVal} HP remaining)`, type: 'narrative' });
          newState.enemyHP = { ...newState.enemyHP, [enemyKeyName]: nextHpVal };
        }
        usedSuccessfully = true;
      } else {
        messages.push({ text: failureMessage || `There is no enemy in sight to use the ${item.name} on.`, type: 'warning' });
      }
      break;

    default:
      messages.push({ text: 'That item doesn\'t seem to do anything useful.', type: 'system' });
      break;
  }

  if (usedSuccessfully && consume) {
    newState.inventory = state.inventory.filter((_, i) => i !== itemIndex);
  }

  return { state: newState, messages };
}

function handleHelp(state, messages) {
  const lines = getHelpText().map(h => `  ${h.cmd.padEnd(24)} ${h.desc}`);
  messages.push({
    text: `Available Commands:\n${lines.join('\n')}`,
    type: 'system'
  });
  return { state, messages };
}

// ── Enemy Combat Logic ────────────────────────────────

/**
 * Check if two positions are in exactly same location.
 */
function isSamePosition(pos1, pos2) {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

/**
 * Process attacks from all enemies on the same tile as the player.
 * Used for idle timers.
 */
export function getEnemyIdleAttacks(state) {
  const messages = [];
  let newState = { ...state };
  const playerPos = state.playerPosition;

  // Check the current tile for an enemy
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  const entityEnemy = state.entities.find(e => e.x === playerPos.x && e.y === playerPos.y && !state.stateFlags[`${e.id}_defeated`]);

  const enemy = entityEnemy || (tileData?.enemy && !state.stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`] ? tileData.enemy : null);

  if (enemy) {
    // Player is at risk! Deal damage.
    const damage = enemy.damage || 1;
    newState.playerHP = Math.max(0, newState.playerHP - damage);
    
    messages.push({ 
      text: `[IDLE WARNING] ${formatEntityName(enemy.name, true)} bites you while you stand still!`, 
      type: 'danger' 
    });
    messages.push({ 
      text: describeEnemyAttacks(enemy), 
      type: 'danger' 
    });

    if (newState.playerHP <= 0) {
      messages.push({ text: '💀 Fred collapses! The world fades to black...', type: 'danger' });
    }
  }

  return { state: newState, messages };
}

// ── Public Utilities ──────────────────────────────────

/**
 * Get available contextual actions for the current tile.
 */
export function getAvailableActions(state) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  const actions = ['look', 'move', 'scream'];

  // Check for entities at current position
  const entityEnemy = state.entities.find(e => e.x === state.playerPosition.x && e.y === state.playerPosition.y && !state.stateFlags[`${e.id}_defeated`]);

  if (tileData?.npc) actions.push('talk');
  if (tileData?.item && !state.stateFlags[`${tileType}_opened`]) actions.push('interact');
  if ((tileData?.enemy && !state.stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`]) || entityEnemy) {
    actions.push('attack');
  }

  return actions;
}

/**
 * Get the initial welcome messages for the game.
 */
export function getWelcomeMessages(roomData) {
  return [
    { text: getWelcomeMessage(), type: 'system' },
    { text: describeRoom(roomData), type: 'narrative' },
    { text: describeTile(
        roomData.grid[roomData.player_start.y][roomData.player_start.x],
        roomData.tiles[roomData.grid[roomData.player_start.y][roomData.player_start.x]],
        roomData.state_flags
      ), type: 'narrative' },
  ];
}
