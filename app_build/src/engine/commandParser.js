/**
 * commandParser.js
 * Pure-function command parser for the MUD text adventure.
 * Accepts raw user input, returns structured { action, target, raw } object.
 */

const DIRECTION_ALIASES = {
  n: 'north', north: 'north', up: 'north',
  s: 'south', south: 'south', down: 'south',
  e: 'east',  east: 'east',  right: 'east',
  w: 'west',  west: 'west',  left: 'west',
};

const ACTION_ALIASES = {
  look:     'look',     l: 'look',     examine: 'look',
  move:     'move',     go: 'move',    walk: 'move',
  interact: 'interact', use: 'interact', open: 'interact', search: 'interact', touch: 'interact',
  scream:   'scream',   yell: 'scream', shout: 'scream',
  inventory:'inventory', i: 'inventory', items: 'inventory',
  help:     'help',     '?': 'help',   commands: 'help',
  talk:     'talk',     speak: 'talk',  chat: 'talk',
  attack:   'attack',   hit: 'attack',  fight: 'attack',
  use:      'use',      apply: 'use',   consume: 'use',
};

/**
 * Parse raw text input into a structured command object.
 * @param {string} rawInput - The player's typed input
 * @returns {{ action: string, target: string|null, raw: string }}
 */
export function parseCommand(rawInput) {
  const raw = rawInput.trim();
  if (!raw) return { action: 'empty', target: null, raw };

  const parts = raw.toLowerCase().split(/\s+/);
  const firstWord = parts[0];
  const rest = parts.slice(1).join(' ') || null;

  // Check if it's a bare direction shortcut (e.g., just "n" or "north")
  if (DIRECTION_ALIASES[firstWord] && parts.length === 1) {
    return { action: 'move', target: DIRECTION_ALIASES[firstWord], raw };
  }

  // Resolve the action
  const action = ACTION_ALIASES[firstWord] || 'unknown';

  // If it's a move command, resolve the direction target
  if (action === 'move' && rest) {
    const dir = DIRECTION_ALIASES[rest];
    return { action: 'move', target: dir || rest, raw };
  }

  return { action, target: rest, raw };
}

/**
 * Returns the list of available commands with descriptions for the help screen.
 */
export function getHelpText() {
  return [
    { cmd: 'look / l',               desc: 'Examine your current surroundings' },
    { cmd: 'move <dir> / n/s/e/w',   desc: 'Move north, south, east, or west' },
    { cmd: 'interact <object>',      desc: 'Interact with an object on your tile' },
    { cmd: 'talk',                   desc: 'Talk to an NPC on your tile' },
    { cmd: 'use <item>',             desc: 'Use an item from your inventory' },
    { cmd: 'scream',                 desc: 'Use Fred\'s Sonic Scream ability' },
    { cmd: 'attack',                 desc: 'Attack an enemy on your tile' },
    { cmd: 'inventory / i',          desc: 'Check your inventory' },
    { cmd: 'help / ?',               desc: 'Show this help message' },
  ];
}
