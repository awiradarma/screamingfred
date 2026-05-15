/**
 * textGenerator.js
 * Narrative text templates for the MUD engine.
 * Generates descriptive prose for rooms, items, NPCs, events, and combat.
 */

import { isTileVisible } from './roomEngine.js';

const SCREAM_FLAVOR = [
  'Fred lets out an earth-shattering scream! The lace-vines tremble!',
  'A sonic wave erupts from Fred! Nearby objects rattle!',
  'Fred screams with the fury of a thousand morning alarms!',
  'The air splits with Fred\'s legendary wail! Even the walls flinch!',
  'Fred\'s scream echoes through the chamber — raw, primal, magnificent!',
];

const MOVEMENT_FLAVOR = {
  north: 'You head north, your soles crunching against the dirt.',
  south: 'You trudge southward, deeper into the unknown.',
  east:  'You veer east, laces brushing against your sides.',
  west:  'You shuffle west through the dimly-lit passage.',
};

const BLOCKED_FLAVOR = [
  'You bump face-first into a wall. It doesn\'t budge. Neither does your dignity.',
  'A solid barrier blocks your path. Not even Fred\'s scream could move this.',
  'Nope. That\'s a wall. Walls tend to be non-negotiable.',
];

/**
 * Get a random element from an array.
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper to prepend "the" to a name if it doesn't already have an article.
 */
export function formatEntityName(name, capitalize = false) {
  if (!name) return '';
  let formatted = name;
  const lower = name.toLowerCase();
  if (!lower.startsWith('the ') && !lower.startsWith('a ') && !lower.startsWith('an ')) {
    formatted = `the ${name}`;
  }
  
  if (capitalize) {
    return formatted.replace(/^./, str => str.toUpperCase());
  }
  return formatted;
}

function withArticle(name) {
  return formatEntityName(name);
}

/**
 * Generate the full room description when entering or looking.
 */
export function describeRoom(roomData) {
  return roomData.description || 'You are in an unremarkable place.';
}

/**
 * Generate tile-specific description.
 */
export function describeTile(tileType, tileData, state, roomTiles = {}, roomId = '') {
  if (!tileData) return 'Nothing unremarkable here.';

  const stateFlags = state?.stateFlags || {};

  // Check visibility condition
  if (!isTileVisible(tileData, state, 'render')) {
    // If hidden, describe the fallback tile instead (e.g. floor)
    const fallbackType = tileData.hiddenTileType || 'floor';
    const fallbackData = roomTiles[fallbackType];
    if (fallbackData && fallbackData !== tileData) {
      return describeTile(fallbackType, fallbackData, state, roomTiles, roomId);
    }
    return tileData.hiddenDescription || 'Nothing remarkable here.';
  }

  // Check if item has been opened
  const flagKey = roomId ? `room_${roomId}_tile_${tileType}_opened` : `item_${tileName(tileType)}_opened`;
  if (tileData.item && stateFlags[flagKey]) {
    return tileData.item.opened_description || 'This has already been searched.';
  }

  // Check if enemy is defeated
  if (tileData.enemy && stateFlags[`${tileName(tileType)}_defeated`]) {
    return `A pile of unraveled laces lies where ${withArticle(tileData.enemy.name)} once was.`;
  }

  let text = tileData.description || 'Nothing remarkable here.';
  if (tileData.name && !text.includes(tileData.name)) {
    text = `${tileData.name}: ${text}`;
  }

  if (tileData.npc) {
    text = `${tileData.npc.name} is standing here. ${text}`;
  }

  return text;
}

/**
 * Extract a simple tile name from tile type string (e.g., "item_fridge" -> "fridge")
 */
function tileName(tileType) {
  return tileType.replace(/^(npc_|item_|enemy_)/, '');
}

/**
 * Generate movement text.
 */
export function describeMovement(direction) {
  return MOVEMENT_FLAVOR[direction] || `You move ${direction}.`;
}

/**
 * Generate blocked movement text.
 */
export function describeBlocked() {
  return pick(BLOCKED_FLAVOR);
}

/**
 * Generate scream text.
 */
export function describeScream() {
  return pick(SCREAM_FLAVOR);
}

/**
 * Generate NPC dialogue based on current stage.
 */
export function getNPCDialogue(npcData, stage) {
  if (!npcData?.dialogue) return '"..."';
  const line = npcData.dialogue.find(d => d.stage === stage);
  return line ? line.text : npcData.dialogue[npcData.dialogue.length - 1].text;
}

/**
 * Generate NPC dialogue hint.
 */
export function getNPCHint(npcData, stage) {
  if (!npcData?.dialogue) return null;
  const line = npcData.dialogue.find(d => d.stage === stage);
  return line?.hint || null;
}

/**
 * Generate item interaction text.
 */
export function describeItemFound(itemData) {
  return `You open the ${itemData.name} and find a ${itemData.contains.name}! It's been added to your inventory.`;
}

/**
 * Generate combat text.
 */
export function describeAttack(enemyData, damage) {
  return `You strike ${withArticle(enemyData.name)} for ${damage} damage! (${Math.max(0, enemyData.hp - damage)} HP remaining)`;
}

export function describeEnemyDefeated(enemyData) {
  return enemyData.defeat_message || `${withArticle(enemyData.name).replace(/^./, str => str.toUpperCase())} has been defeated!`;
}

export function describeEnemyAttacks(enemyData) {
  return `${withArticle(enemyData.name).replace(/^./, str => str.toUpperCase())} lashes out, dealing ${enemyData.damage} damage to you!`;
}

/**
 * Generate the welcome message shown on game start.
 */
export function getWelcomeMessage() {
  return [
    '═══════════════════════════════════════════',
    '  SCREAMING FRED: THE TACTICAL CHRONICLES',
    '═══════════════════════════════════════════',
    '',
    'A long time ago, in the great world of',
    'Sentientworldia, there was a white tennis',
    'shoe named Fred.',
    '',
    'Fred was a normal shoe. He lived in',
    'Shoeboxlandia where every shoe had its',
    'place. Every shoe disliked Fred — he',
    'screamed every morning and every evening.',
    '',
    'One day, Fred tried to eat his lunch of',
    'pasta and potatoes, but his fridge was',
    'EMPTY. Someone stole them!',
    '',
    'Type HELP for a list of commands.',
    '',
  ].join('\n');
}
