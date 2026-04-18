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
  describeEnemyAttacks, getWelcomeMessage,
} from './textGenerator.js';
import { getRoomData } from '../data/worldData.js';
import roomDatas from '../data/testRoom.json';
import globalItems from '../data/items.json';

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
 * @returns {{ state: object, messages: Array<{text: string, type: string}> }}
 */
export function processCommand(state, rawInput) {
  const command = parseCommand(rawInput);
  const messages = [];
  let newState = { ...state, turnCount: state.turnCount + 1 };

  switch (command.action) {
    case 'empty':
      return { state, messages: [] };

    case 'look':
      return handleLook(newState, messages);

    case 'move':
      return handleMove(newState, command.target, messages);

    case 'interact':
      return handleInteract(newState, command.target, messages);

    case 'talk':
      return handleTalk(newState, messages);

    case 'scream':
      return handleScream(newState, messages);

    case 'attack':
      return handleAttack(newState, messages);

    case 'inventory':
      return handleInventory(newState, messages);

    case 'help':
      return handleHelp(newState, messages);

    case 'use':
      return handleUse(newState, command.target, messages);

    case 'unknown':
    default:
      messages.push({ text: `You mumble "${command.raw}" but nothing happens. Type HELP for commands.`, type: 'system' });
      return { state: newState, messages };
  }
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
  if (!targetTile) {
    messages.push({ text: describeBlocked(), type: 'warning' });
    return { state, messages };
  }

  const tileData = getTileData(state.room, targetTile);
  if (!tileData || !tileData.passable) {
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
        text: failMessage || `The ${tileData.name || 'path'} is locked.`, 
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

  // Describe what's on the new tile
  const tileDesc = describeTile(targetTile, tileData, finalState.stateFlags);
  messages.push({ text: tileDesc, type: 'narrative' });

  // Handle Room Transition
  if (tileData.targetRoomId) {
    const nextRoom = getRoomData(tileData.targetRoomId);
    if (nextRoom) {
      messages.push({ text: `⚡ Transitioning to ${nextRoom.room_name}...`, type: 'system' });
      return {
        state: {
          ...finalState,
          room: nextRoom,
          playerPosition: tileData.targetPosition || { ...nextRoom.player_start },
        },
        messages: [
          ...messages,
          { text: describeRoom(nextRoom), type: 'narrative' }
        ]
      };
    }
  }

  // Enemy proximity warning
  if (tileData.enemy && !finalState.stateFlags[`${targetTile.replace(/^enemy_/, '')}_defeated`]) {
    messages.push({ text: `⚠ A ${tileData.enemy.name} is here! You can ATTACK or SCREAM.`, type: 'danger' });
  }

  return { state: finalState, messages };
}

function handleInteract(state, target, messages) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);

  if (!tileData?.item) {
    messages.push({ text: 'There\'s nothing to interact with here.', type: 'system' });
    return { state, messages };
  }

  const flagKey = `${tileType}_opened`;
  if (state.stateFlags[flagKey]) {
    messages.push({ text: tileData.item.opened_description || 'Already searched.', type: 'system' });
    return { state, messages };
  }

  // Process picking up items
  let newState = { ...state, stateFlags: { ...state.stateFlags, [flagKey]: true } };
  
  if (tileData.item) {
    let itemToCollect = null;
    
    // Resolve item from Global Registry if itemId provided
    if (tileData.item.itemId && globalItems[tileData.item.itemId]) {
      itemToCollect = { ...globalItems[tileData.item.itemId], itemId: tileData.item.itemId };
    } else if (tileData.item.contains) {
      // Legacy/Local definition
      itemToCollect = { ...tileData.item.contains };
    }

    if (itemToCollect) {
      newState.inventory = [...state.inventory, itemToCollect];
      messages.push({ 
        text: `You found: ${itemToCollect.name}!`,
        type: 'loot' 
      });
    }
    
    if (tileData.item.onCollect) {
      messages.push({ text: tileData.item.onCollect, type: 'narrative' });
    }
  }
  return { state: newState, messages };
}

function handleTalk(state, messages) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);

  if (!tileData?.npc) {
    messages.push({ text: 'There\'s nobody here to talk to.', type: 'system' });
    return { state, messages };
  }

  const npcKey = tileType;
  const currentStage = state.npcStages[npcKey] || 0;
  const dialogue = getNPCDialogue(tileData.npc, currentStage);
  const hint = getNPCHint(tileData.npc, currentStage);

  messages.push({ text: dialogue, type: 'dialogue' });
  if (hint) {
    messages.push({ text: `💡 ${hint}`, type: 'hint' });
  }

  // Advance dialogue stage (but not beyond max)
  const maxStage = Math.max(...tileData.npc.dialogue.map(d => d.stage));
  const newStage = Math.min(currentStage + 1, maxStage);

  return {
    state: {
      ...state,
      npcStages: { ...state.npcStages, [npcKey]: newStage },
    },
    messages
  };
}

function handleScream(state, messages) {
  messages.push({ text: describeScream(), type: 'scream' });

  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  let newState = { ...state };

  // Scream effects on enemies
  if (tileData?.enemy && tileData.enemy.scream_vulnerable && !state.stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`]) {
    const enemyKey = tileType;
    const currentHP = state.enemyHP[enemyKey] ?? tileData.enemy.hp;
    const newHP = currentHP - 2; // Scream does 2 damage

    if (newHP <= 0) {
      messages.push({ text: describeEnemyDefeated(tileData.enemy), type: 'loot' });
      newState = {
        ...newState,
        stateFlags: { ...newState.stateFlags, [`${tileType.replace(/^enemy_/, '')}_defeated`]: true },
        enemyHP: { ...newState.enemyHP, [enemyKey]: 0 },
      };
    } else {
      messages.push({ text: `Your scream stuns the ${tileData.enemy.name}! (${newHP} HP remaining)`, type: 'narrative' });
      newState = {
        ...newState,
        enemyHP: { ...newState.enemyHP, [enemyKey]: newHP },
      };
    }
  }

  // Scream effects on NPCs — advance dialogue
  if (tileData?.npc) {
    const npcKey = tileType;
    const currentStage = state.npcStages[npcKey] || 0;
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

function handleAttack(state, messages) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);

  if (!tileData?.enemy) {
    messages.push({ text: 'There\'s nothing to attack here. Save your energy.', type: 'system' });
    return { state, messages };
  }

  const defeatKey = `${tileType.replace(/^enemy_/, '')}_defeated`;
  if (state.stateFlags[defeatKey]) {
    messages.push({ text: 'The enemy is already defeated. Move along.', type: 'system' });
    return { state, messages };
  }

  const enemyKey = tileType;
  const currentHP = state.enemyHP[enemyKey] ?? tileData.enemy.hp;
  const playerDamage = 1;
  const newEnemyHP = currentHP - playerDamage;

  messages.push({ text: describeAttack(tileData.enemy, playerDamage), type: 'narrative' });

  let newState = {
    ...state,
    enemyHP: { ...state.enemyHP, [enemyKey]: newEnemyHP },
  };

  if (newEnemyHP <= 0) {
    messages.push({ text: describeEnemyDefeated(tileData.enemy), type: 'loot' });
    newState = {
      ...newState,
      stateFlags: { ...newState.stateFlags, [defeatKey]: true },
    };
  } else {
    // Enemy counter-attacks
    const newPlayerHP = state.playerHP - tileData.enemy.damage;
    messages.push({ text: describeEnemyAttacks(tileData.enemy), type: 'danger' });
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

function handleUse(state, itemTarget, messages) {
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
    messages.push({ text: `You can't think of a way to use the ${item.name} right now.`, type: 'system' });
    return { state, messages };
  }

  const { action, value, target, flagSet, successMessage, failureMessage, consume } = item.onUse;
  let newState = { ...state };
  let usedSuccessfully = false;

  switch (action) {
    case 'heal':
      newState.playerHP = Math.min(state.maxHP, state.playerHP + (value || 0));
      messages.push({ text: successMessage || `You use the ${item.name} and feel revitalized!`, type: 'hint' });
      usedSuccessfully = true;
      break;

    case 'unlock':
      // Check if player is on OR adjacent to the target tile
      const adjacentTiles = getAdjacentTiles(state);
      const isNearTarget = adjacentTiles.some(tile => tile.type === target) || getCurrentTile(state) === target;
      
      if (isNearTarget) {
        newState.stateFlags = { ...state.stateFlags, [flagSet]: true };
        messages.push({ text: successMessage || `You use the ${item.name} to unlock the way!`, type: 'loot' });
        usedSuccessfully = true;
      } else {
        messages.push({ text: failureMessage || `There's nothing to unlock with the ${item.name} here. Try standing closer to it.`, type: 'warning' });
      }
      break;

    case 'damage_enemy':
      const curTileType = getCurrentTile(state);
      if (curTileType === target && !state.stateFlags[`${target.replace(/^enemy_/, '')}_defeated`]) {
        const enemyKey = target;
        const currentHP = state.enemyHP[enemyKey] ?? getTileData(state.room, target).enemy.hp;
        const newHP = currentHP - (value || 1);
        
        messages.push({ text: successMessage || `You use the ${item.name} against the enemy!`, type: 'narrative' });
        
        if (newHP <= 0) {
          const tileData = getTileData(state.room, target);
          messages.push({ text: describeEnemyDefeated(tileData.enemy), type: 'loot' });
          newState.stateFlags = { ...newState.stateFlags, [`${target.replace(/^enemy_/, '')}_defeated`]: true };
          newState.enemyHP = { ...newState.enemyHP, [enemyKey]: 0 };
        } else {
          messages.push({ text: `The enemy takes ${value} damage! (${newHP} HP remaining)`, type: 'narrative' });
          newState.enemyHP = { ...newState.enemyHP, [enemyKey]: newHP };
        }
        usedSuccessfully = true;
      } else {
        messages.push({ text: failureMessage || `There's no enemy here to use the ${item.name} on.`, type: 'warning' });
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

  if (tileData?.enemy) {
    const defeatKey = `${tileType.replace(/^enemy_/, '')}_defeated`;
    if (!state.stateFlags[defeatKey]) {
      // Player is at risk! Deal damage.
      const damage = tileData.enemy.damage || 1;
      newState.playerHP = Math.max(0, newState.playerHP - damage);
      
      messages.push({ 
        text: `[IDLE WARNING] The ${tileData.enemy.name} bites you while you stand still!`, 
        type: 'danger' 
      });
      messages.push({ 
        text: describeEnemyAttacks(tileData.enemy), 
        type: 'danger' 
      });

      if (newState.playerHP <= 0) {
        messages.push({ text: '💀 Fred collapses! The world fades to black...', type: 'danger' });
      }
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

  if (tileData?.npc) actions.push('talk');
  if (tileData?.item && !state.stateFlags[`${tileType}_opened`]) actions.push('interact');
  if (tileData?.enemy && !state.stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`]) actions.push('attack');

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
