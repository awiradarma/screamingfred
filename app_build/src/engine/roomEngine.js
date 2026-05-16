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
 * Check if a tile is currently visible based on its conditions.
 * Supports visibleIf (requires flag) and hiddenIf (flag hides it).
 * Both support "!" prefix for negation.
 */
export function isTileVisible(tileData, state, purpose = 'interaction') {
  if (!tileData) return true;
  const stateFlags = state.stateFlags || {};
  const hasDetectiveIntuition = state.abilities?.some(a => a.id === "detectives_intuition");
  const hasNaturesBounty = state.abilities?.some(a => a.id === "natures_bounty_vision");
  const hasThermalSight = state.abilities?.some(a => a.id === "thermal_sight");

  // Nature's Bounty allows seeing the layout (map/description) but not interacting with hidden details
  // However, we should NOT reveal NPCs or plot-critical hidden objects that aren't ready yet
  if (purpose !== 'interaction' && hasNaturesBounty) {
    if (tileData.npc && (tileData.visibleIf || tileData.hiddenIf)) {
      // Fall through to normal check for narrative-critical NPCs
    } else {
      return true;
    }
  }


  if (tileData.visibleIf) {
    const flag = tileData.visibleIf;
    const isNegated = flag.startsWith('!');
    const actualFlag = isNegated ? flag.substring(1) : flag;
    
    let flagValue = !!stateFlags[actualFlag];
    // Detective's intuition auto-illuminates dark corners
    if (actualFlag === "corner_illuminated" && hasDetectiveIntuition) flagValue = true;
    
    // Thermal sight reveals machinery and life forms
    if (actualFlag === "machinery_detected" && hasThermalSight) flagValue = true;
    if (actualFlag === "life_form_detected" && hasThermalSight) flagValue = true;
    
    if (isNegated ? flagValue : !flagValue) return false;
  }

  if (tileData.hiddenIf) {
    const flag = tileData.hiddenIf;
    const isNegated = flag.startsWith('!');
    const actualFlag = isNegated ? flag.substring(1) : flag;
    
    let flagValue = !!stateFlags[actualFlag];
    if (actualFlag === "corner_illuminated" && hasDetectiveIntuition) flagValue = true;

    if (isNegated ? !flagValue : flagValue) return false;
  }

  return true;
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
 * Modify player HP (damage or heal) and handle death messages.
 * @param {object} state - Current game state (modified in-place)
 * @param {number} amount - Positive for heal, negative for damage
 * @param {Array} messages - Message log to push to
 * @returns {number} The actual change in HP
 */
function modifyPlayerHP(state, amount, messages) {
  const oldHP = state.playerHP;
  state.playerHP = Math.max(0, Math.min(state.maxHP, state.playerHP + amount));
  const diff = state.playerHP - oldHP;

  if (state.playerHP <= 0 && oldHP > 0) {
    messages.push({ 
      text: "⚠️ Everything goes cold... the light of the world flickers and dies. Fred has fallen. The void consumes all. 💀 Fred collapses! The world fades to black...", 
      type: 'danger' 
    });
  }
  
  return diff;
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
      modifyPlayerHP(newState, -damage, messages);
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
  messages.push({ text: describeRoom(state.room, state.stateFlags), type: 'narrative' });


  // Current tile description
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);
  const tileDesc = describeTile(tileType, tileData, state, state.room.tiles, state.room.room_id);
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
  let tileData = targetTile ? getTileData(state.room, targetTile) : null;

  // Resolve visibility fallback for movement
  const isTargetVisible = isTileVisible(tileData, state, 'render');
  if (tileData && !isTargetVisible) {
    const fallbackType = tileData.hiddenTileType || 'floor';
    tileData = getTileData(state.room, fallbackType);
  }

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
  // Also block world-edge transitions if the explicit transition at that location is HIDDEN
  if (!transitionRoom && (!targetTile || !tileData?.passable)) {
    messages.push({ text: describeBlocked(), type: 'warning' });
    return { state, messages };
  }

  // Double check: if targetTile exists but is HIDDEN, we should NOT transition to a world-edge room
  if (transitionRoom && targetTile && !isTargetVisible) {
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
    let hasFlag = requiredFlag ? state.stateFlags[requiredFlag] || finalFlags[requiredFlag] : true;
    // Ability-based flag overrides
    if (requiredFlag === "corner_illuminated" && 
        state.abilities?.some(a => a.id === "detectives_intuition")) {
      hasFlag = true;
    }
    if (requiredFlag === "master_tinkerer_check" && 
        state.abilities?.some(a => a.id === "master_tinkerer")) {
      hasFlag = true;
    }

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
    const tileDesc = describeTile(finalTileType, finalTileData, finalState, finalState.room.tiles, finalState.room.room_id);
    messages.push({ text: tileDesc, type: 'narrative' });
  }

  // Handle Room Transition (Specific trigger or Edge transition)
  if (finalTileData?.targetRoomId) {
    // Explicit transition tile
    transitionRoom = getRoomData(finalTileData.targetRoomId);
    transitionPos = finalTileData.targetPosition;
  }

  if (transitionRoom) {
    const coordKey = transitionRoom.world_coord;
    let newDiscovered = finalState.discoveredRooms || [];
    if (coordKey && !newDiscovered.includes(coordKey)) {
      newDiscovered = [...newDiscovered, coordKey];
    }

    messages.push({ text: `⚡ Transitioning to ${transitionRoom.room_name}...`, type: 'system' });
    
    let updatedInventory = [...finalState.inventory];
    let updatedFlags = { ...finalState.stateFlags };
    
    if (transitionRoom.onEnter) {
      const { action, itemId, message, flagSet } = transitionRoom.onEnter;
      if (action === 'remove_item' && itemId) {
        const itemToRemove = updatedInventory.find(i => i.itemId === itemId || i.name === itemId);
        if (itemToRemove) {
          updatedInventory = updatedInventory.filter(i => i.itemId !== itemId && i.name !== itemId);
          if (message) messages.push({ text: `🚫 ${message}`, type: 'warning' });
        }
      }
      if (action === 'set_flag' && flagSet) {
        updatedFlags[flagSet] = true;
      }
    }

    return {
      state: {
        ...finalState,
        room: transitionRoom,
        playerPosition: transitionPos || { ...transitionRoom.player_start },
        discoveredRooms: newDiscovered,
        inventory: updatedInventory,
        stateFlags: updatedFlags
      },
      messages: [
        ...messages,
        { text: describeRoom(transitionRoom, updatedFlags), type: 'narrative' }
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
    if (tileData.effect === 'damage' || ['lava', 'lake', 'toxic_pit'].includes(tileType) || tileType.includes('lava') || tileType.includes('lake') || tileType.includes('syrup')) {
      let isImmune = false;
      let immuneMsg = '';
      if (newState.abilities?.some(a => a.id === 'zap_immunity' || a.id === 'bio_synthesizer') && (tileType.includes('electric') || tileData.effectMessage?.includes('zap') || tileData.effectMessage?.includes('electric') || tileData.effectMessage?.includes('shock'))) {
        isImmune = true;
        immuneMsg = newState.abilities?.some(a => a.id === 'bio_synthesizer') 
          ? "Your Bio-Synthesizer patch grounds the electricity, protecting you!" 
          : "Your Zap Immunity absorbs the electric shock!";
      } else if (newState.abilities?.some(a => a.id === 'float') && (tileType.includes('water') || tileType.includes('lake') || tileType.includes('syrup'))) {
        isImmune = true;
        immuneMsg = "You effortlessly float over the hazard!";
      }

      if (isImmune) {
        messages.push({ text: `✨ ${immuneMsg}`, type: 'narrative' });
      } else {
        const damage = tileData.damageAmount || 1;
        modifyPlayerHP(newState, -damage, messages);
        const msg = tileData.effectMessage || (tileType.includes('lava') ? "Sizzle! The lava burns!" : "Gurgle! The water is deep and cold.");
        messages.push({ text: `⚠️ ${msg} (-${damage} HP)`, type: 'danger' });
      }
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

    // 4. Jelly Effects (Launch)
    if (tileData.effect === 'launch' || tileType === 'jelly' || tileType.includes('jelly')) {
      const hasStableFooting = newState.stateFlags?.stable_footing || newState.abilities?.some(a => a.id === 'stable_footing');
      if (!hasStableFooting) {
        messages.push({ text: "🍮 AAAAAAH! The jelly surface launches you into the air!", type: 'warning' });
        const { dx, dy } = DIR_VECTORS[direction] || { dx: 0, dy: 0 };
        
        if (dx !== 0 || dy !== 0) {
          let finalX = currentX;
          let finalY = currentY;
          
          for (let i = 1; i <= 3; i++) {
            const tx = currentX + (dx * i);
            const ty = currentY + (dy * i);
            const tType = getTileAt(newState.room, tx, ty);
            const tData = tType ? getTileData(newState.room, tType) : null;
            
            if (!tType || !tData || !tData.passable) break;
            finalX = tx;
            finalY = ty;
          }
          
          if (finalX !== currentX || finalY !== currentY) {
            currentX = finalX;
            currentY = finalY;
            newState.playerPosition = { x: currentX, y: currentY };
            moved = true;
            continue;
          }
        }
      } else {
         // Subtle feedback that ability is working
         if (loopCount === 1) {
           messages.push({ text: "✨ Your footing is stable despite the jiggly ground.", type: 'system' });
         }
      }
    }
  }

  return { state: newState, messages };
}

function handleInteract(state, target, messages, globalItems = {}) {
  const tileType = getCurrentTile(state);
  const tileData = getTileData(state.room, tileType);

  if (!tileData?.item && !tileData?.onInteract) {
    messages.push({ text: 'There\'s nothing to interact with here.', type: 'system' });
    return { state, messages };
  }

  // Visibility Check
  if (!isTileVisible(tileData, state, 'interaction')) {
    messages.push({ text: 'There\'s nothing to interact with here.', type: 'system' });
    return { state, messages };
  }

  const verb = tileData.interactionVerb || 'SEARCH';
  const flagKey = `room_${state.room.room_id}_tile_${tileType}_opened`;
  
  // If it's an item that provides onInteract, we might want to let them interact again,
  // or at least not show "Already searched." if it's not a searchable thing.
  const isCollectable = tileData.item && (tileData.item.itemId || tileData.item.contains || tileData.item.name);
  
  if (state.stateFlags[flagKey] && isCollectable) {
    messages.push({ text: tileData.item?.opened_description || 'Already searched.', type: 'system' });
    return { state, messages };
  }

  if (tileData.revealMessage) {
    messages.push({ text: tileData.revealMessage, type: 'narrative' });
  }

  if (tileData.onInteract) {
    if (typeof tileData.onInteract === 'string') {
      messages.push({ text: tileData.onInteract, type: 'narrative' });
    }
  }

  let newState = { ...state };
  
  if (isCollectable) {
    newState.stateFlags = { ...newState.stateFlags, [flagKey]: true };
  }

  if (tileData.item) {
    if (tileData.item.onInteract) {
      if (tileData.item.onInteract.action === 'set_flag') {
        newState.stateFlags = { ...newState.stateFlags, [tileData.item.onInteract.flagSet]: true };
      }
    }

    let itemToCollect = null;
    
    // Resolve item from Global Registry if itemId provided
    if (tileData.item.itemId && globalItems[tileData.item.itemId]) {
      itemToCollect = { 
        ...globalItems[tileData.item.itemId], 
        ...tileData.item, // Merge per-instance properties (like onUse)
        itemId: tileData.item.itemId 
      };
    } else if (tileData.item.contains) {
      itemToCollect = { ...tileData.item.contains };
    } else if (tileData.item.name) {
      // Fallback: Use the item definition itself if it has a name (inline item)
      itemToCollect = { ...tileData.item };
    }

    if (itemToCollect && itemToCollect.name) {
      // Support comma separated list of items
      const itmNames = String(itemToCollect.name).split(',').map(s => s.trim());
      itmNames.forEach(name => {
        if (name) {
          newState.inventory = [...newState.inventory, { ...itemToCollect, name, type: itemToCollect.type || 'resource' }];
          messages.push({ 
            text: `You found: ${name}!`,
            type: 'loot' 
          });
        }
      });
    }

    if (tileData.item.setFlag) {
      newState.stateFlags = { ...newState.stateFlags, [tileData.item.setFlag]: true };
    }
    
    if (tileData.item.onCollect && isCollectable) {
      messages.push({ text: tileData.item.onCollect, type: 'narrative' });
    } else if (tileData.item.onCollect) {
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

  // Visibility Check
  if (!isTileVisible(tileData, state, 'interaction')) {
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
    const hasRequiresFlag = !stage.requiresFlag || state.stateFlags[stage.requiresFlag];
    const hasCondFlag = !stage.conditions?.requiredFlag || 
                        (stage.conditions.requiredFlag.startsWith('!') ? 
                         !state.stateFlags[stage.conditions.requiredFlag.substring(1)] : 
                         state.stateFlags[stage.conditions.requiredFlag]);
    
    if (hasRequiresFlag && hasCondFlag) {
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
  // UNLESS the current stage requires a scream to progress
  if (!bestStage.requiresScream) {
    finalNpcStages[npcKey] = Math.min(bestStageIdx + 1, dialogueStages.length - 1);
  } else {
    messages.push({ text: '(You feel like you should SCREAM to get a reaction...)', type: 'hint' });
  }

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
    const { action, itemId, flagSet, msg, value, effect } = bestStage.onComplete;
    
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

    if (action === 'damage_player' && value) {
      let finalDamage = value;
      if (state.abilities?.some(a => a.id === 'bio_synthesizer')) {
         finalDamage = Math.max(1, finalDamage - 1);
         messages.push({ text: `✨ Your Bio-Synthesizer absorbed some of the impact!`, type: 'narrative' });
      }
      modifyPlayerHP(state, -finalDamage, messages);
    }

    if (action === 'apply_effect_to_player' && effect) {
      if (!state.activeEffects) state.activeEffects = [];
      // Prevent stacking the same effect type
      const alreadyActive = state.activeEffects.some(e => e.type === effect.type);
      if (!alreadyActive) {
        state.activeEffects = [...(state.activeEffects || []), { ...effect }];
        messages.push({ text: `⚠️ You are afflicted by ${effect.name}! (${effect.duration} turns)`, type: 'danger' });
      }
    }

    if (action === 'remove_item' && itemId) {
      finalInventory = finalInventory.filter(i => i.itemId !== itemId && i.name !== itemId);
      const itemName = globalItems[itemId]?.name || itemId;
      messages.push({ text: `The ${itemName} has been destroyed!`, type: 'warning' });
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
    const dialogueStages = tileData.npc.dialogue || [];
    const currentStageIdx = state.npcStages[npcKey] || 0;
    const currentStage = dialogueStages[currentStageIdx];

    if (currentStage?.requiresScream) {
      const nextStageIdx = Math.min(currentStageIdx + 1, dialogueStages.length - 1);
      newState = {
        ...newState,
        npcStages: { ...newState.npcStages, [npcKey]: nextStageIdx }
      };
      
      // Handle special flags or items from the next stage immediately
      const nextStage = dialogueStages[nextStageIdx];
      if (nextStage.onComplete) {
        const { action, itemId, flagSet, value, effect } = nextStage.onComplete;
        if (action === 'give_item' && itemId && globalItems[itemId]) {
          newState.inventory = [...newState.inventory, { ...globalItems[itemId], itemId }];
          messages.push({ text: `🎁 ${tileData.npc.name} gave you: ${globalItems[itemId].name}!`, type: 'loot' });
        }
        if (action === 'remove_item' && itemId) {
          newState.inventory = newState.inventory.filter(i => i.itemId !== itemId && i.name !== itemId);
          const itemName = globalItems[itemId]?.name || itemId;
          messages.push({ text: `The ${itemName} has been taken!`, type: 'warning' });
        }
        if (action === 'set_flag' && flagSet) {
          newState.stateFlags = { ...newState.stateFlags, [flagSet]: true };
        }
        if (action === 'damage_player' && value) {
          modifyPlayerHP(newState, -value, messages);
        }
        if (action === 'apply_effect_to_player' && effect) {
          if (!newState.activeEffects) newState.activeEffects = [];
          newState.activeEffects = [...newState.activeEffects, { ...effect }];
          messages.push({ text: `⚠️ You are afflicted by ${effect.name}!`, type: 'danger' });
        }
      }

      messages.push({ text: getNPCDialogue(tileData.npc, nextStageIdx), type: 'dialogue' });
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
  
  let playerDamage = 1;
  if (state.activeEffects?.some(e => e.type === 'double_damage')) {
    playerDamage = 2;
  }
  
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
    modifyPlayerHP(state, -target.damage, messages);
    messages.push({ text: describeEnemyAttacks(target), type: 'danger' });
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
      const healAmount = value || 0;
      // Boost maxHP if the heal amount is higher than current maxHP (e.g., Ultra Golden Potato)
      if (healAmount > newState.maxHP) {
        newState.maxHP = healAmount;
      }
      modifyPlayerHP(newState, healAmount, messages);
      messages.push({ text: successMessage || `You use ${formatEntityName(item.name)} and feel revitalized!`, type: 'hint' });
      usedSuccessfully = true;
      break;

    case 'heal_and_cleanse':
      const cleanseHeal = value || 0;
      modifyPlayerHP(newState, cleanseHeal, messages);
      // Clear all active debuffs
      newState.activeEffects = [];
      messages.push({ text: successMessage || `You feel revitalized and all debuffs are cleared!`, type: 'loot' });
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

    case 'grant_ability':
      if (!newState.abilities) newState.abilities = [];
      if (!newState.abilities.includes(item.onUse.abilityId)) {
        newState.abilities.push(item.onUse.abilityId);
        messages.push({ text: successMessage || `✨ You have learned a new ability: ${item.onUse.abilityName || item.onUse.abilityId}!`, type: 'loot' });
        usedSuccessfully = true;
      } else {
        messages.push({ text: `You already know the ${item.onUse.abilityName || item.onUse.abilityId} ability.`, type: 'system' });
      }
      break;

    case 'apply_effect':
      if (!newState.activeEffects) newState.activeEffects = [];
      newState.activeEffects.push({ ...item.onUse.effect });
      messages.push({ text: successMessage || `✨ You are now under the effect of ${item.onUse.effect.name}!`, type: 'loot' });
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
      
      // 1. Look for entities or NPCs matching the target
      let targetEntity = null;
      if (finalTarget) {
        // Look for entities
        targetEntity = state.entities.find(e => 
          e.id === finalTarget || 
          e.name.toLowerCase().includes(finalTarget.toLowerCase())
        );

        // Look for NPCs on current or adjacent tiles
        if (!targetEntity) {
          const checkTiles = [
            { x: state.playerPosition.x, y: state.playerPosition.y, type: getCurrentTile(state) },
            ...getAdjacentTiles(state)
          ];
          
          for (const t of checkTiles) {
            const tData = getTileData(state.room, t.type);
            if (tData?.npc && (t.type === finalTarget || tData.npc.name.toLowerCase().includes(finalTarget.toLowerCase()))) {
              targetEntity = { ...tData.npc, id: t.type, isNpc: true };
              break;
            }
          }
        }
      } else {
        // Auto-target closest enemy if no target specified
        const potentialTargets = [];
        state.room.grid.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile.startsWith('enemy_') && !state.stateFlags[`${tile.replace(/^enemy_/, '')}_defeated`]) {
              potentialTargets.push({ type: tile, x, y });
            }
          });
        });
        
        if (potentialTargets.length > 0) {
          const px = state.playerPosition.x;
          const py = state.playerPosition.y;
          potentialTargets.sort((a,b) => (Math.abs(a.x-px)+Math.abs(a.y-py)) - (Math.abs(b.x-px)+Math.abs(b.y-py)));
          finalTarget = potentialTargets[0].type;
          const tData = getTileData(state.room, finalTarget);
          targetEntity = { ...tData.enemy, id: finalTarget };
        }
      }

      if (targetEntity) {
        // Apply flag if specified (e.g. for boss triggers like Barry)
        if (flagSet) {
          newState.stateFlags = { ...newState.stateFlags, [flagSet]: true };
        }

        // Deal damage if it's a standard enemy with HP
        if (!targetEntity.isNpc && targetEntity.hp !== undefined) {
          const enemyKeyName = targetEntity.id;
          const currentHpVal = state.enemyHP[enemyKeyName] ?? targetEntity.hp;
          const dmgVal = value || 1;
          const nextHpVal = currentHpVal - dmgVal;
          newState.enemyHP = { ...newState.enemyHP, [enemyKeyName]: nextHpVal };
          
          if (nextHpVal <= 0) {
            newState.stateFlags = { ...newState.stateFlags, [`${enemyKeyName.replace(/^enemy_/, '')}_defeated`]: true };
            messages.push({ text: describeEnemyDefeated(targetEntity), type: 'loot' });
          }
        }

        messages.push({ text: successMessage || `You use ${formatEntityName(item.name)} on ${formatEntityName(targetEntity.name)}!`, type: 'loot' });
        usedSuccessfully = true;
        if (consume) {
          newState.inventory = state.inventory.filter((_, i) => i !== itemIndex);
        }
      } else {
        messages.push({ text: failureMessage || `There's no ${finalTarget || 'target'} to use this on here.`, type: 'warning' });
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
    let damage = enemy.damage || 1;
    
    if (newState.abilities?.some(a => a.id === 'bio_synthesizer')) {
      damage = Math.max(1, damage - 1);
      messages.push({ text: `✨ Your Bio-Synthesizer absorbed some of the impact!`, type: 'narrative' });
    }
    
    modifyPlayerHP(newState, -damage, messages);
    
    messages.push({ 
      text: `[IDLE WARNING] ${formatEntityName(enemy.name, true)} bites you while you stand still!`, 
      type: 'danger' 
    });
    messages.push({ 
      text: describeEnemyAttacks(enemy), 
      type: 'danger' 
    });
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
  if (tileData?.item && !state.stateFlags[`room_${state.room.room_id}_tile_${tileType}_opened`]) actions.push('interact');
  if ((tileData?.enemy && !state.stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`]) || entityEnemy) {
    actions.push('attack');
  }
  if (state.inventory && state.inventory.length > 0) {
    actions.push('use');
  }

  return actions;
}

/**
 * Get the initial welcome messages for the game.
 */
export function getWelcomeMessages(roomData) {
  return [
    { text: getWelcomeMessage(), type: 'system' },
    { text: describeRoom(roomData, roomData.state_flags), type: 'narrative' },

    { text: describeTile(
        roomData.grid[roomData.player_start.y][roomData.player_start.x],
        roomData.tiles[roomData.grid[roomData.player_start.y][roomData.player_start.x]],
        { stateFlags: roomData.state_flags },
        roomData.tiles,
        roomData.room_id
      ), type: 'narrative' },
  ];
}
