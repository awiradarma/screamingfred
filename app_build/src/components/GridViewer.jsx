import React from 'react';
import { isTileVisible } from '../engine/roomEngine';

/**
 * GridViewer — 5×5 tactical grid visualization.
 * Shows tile types with icons/colors and the player's position.
 */

const TILE_CONFIG = {
  // Core tiles
  wall: { icon: '▓', label: 'Wall', className: 'tile-wall' },
  floor: { icon: '·', label: 'Floor', className: 'tile-floor' },
  exit_north: { icon: '△', label: 'Exit N', className: 'tile-exit' },
  exit_south: { icon: '▽', label: 'Exit S', className: 'tile-exit' },
  exit_east: { icon: '▷', label: 'Exit E', className: 'tile-exit' },
  exit_west: { icon: '◁', label: 'Exit W', className: 'tile-exit' },
  npc_sue: { icon: '☺', label: 'NPC', className: 'tile-npc' },
  item_fridge: { icon: '◈', label: 'Item', className: 'tile-item' },
  enemy_snake: { icon: '☠', label: 'Enemy', className: 'tile-enemy' },
  lava: { icon: '≈', label: 'Lava', className: 'tile-lava' },
  ice: { icon: '❄', label: 'Ice', className: 'tile-ice' },
  lake: { icon: '≋', label: 'Lake', className: 'tile-lake' },
  bouncy: { icon: '⊗', label: 'Bouncy', className: 'tile-bouncy' },
  electric_floor: { icon: '⚡', label: 'Electric', className: 'tile-electric' },
  electric_sand: { icon: '⚡', label: 'Electric', className: 'tile-electric' },
  cursed_chair: { icon: '🪑', label: 'Chair', className: 'tile-item' },
  exit: { icon: '△', label: 'Exit', className: 'tile-exit' },
  enemy: { icon: '☠', label: 'Enemy', className: 'tile-enemy' },
  npc: { icon: '☺', label: 'NPC', className: 'tile-npc' },
  item: { icon: '◈', label: 'Item', className: 'tile-item' },
  
  // Custom renamed tiles (sole source of truth for name/icon)
  swamp_wall: { icon: '▓', label: 'Swamp Wall', className: 'tile-wall' },
  swamp_pool: { icon: '~', label: 'Swamp Pool', className: 'tile-lake' },
  banzo_builder: { icon: '🐒', label: 'Banzo the Builder', className: 'tile-npc' },
  banana_bridge: { icon: '█', label: 'Banana Bridge', className: 'tile-item' },
  swamp_hollow: { icon: '🕳️', label: 'Swamp Hollow', className: 'tile-floor' },
  
  chasm_of_chaos: { icon: ' ', label: 'Chasm of Chaos', className: 'tile-wall' },
  brittle_wood: { icon: '=', label: 'Brittle Wood', className: 'tile-floor' },
  barry: { icon: '🔋', label: 'Barry', className: 'tile-npc' },
  locked_gate: { icon: '🚪', label: 'Locked Gate', className: 'tile-exit' },
  
  farm_fence: { icon: '▓', label: 'Farm Fence', className: 'tile-wall' },
  tilled_soil: { icon: '·', label: 'Tilled Soil', className: 'tile-floor' },
  rotten_produce: { icon: '🍄', label: 'Rotten Produce', className: 'tile-item' },
  suitable_potato: { icon: '🥔', label: 'Suitable Potato', className: 'tile-item' },
  
  stone_wall: { icon: '▓', label: 'Stone Wall', className: 'tile-wall' },
  stone_floor: { icon: '·', label: 'Stone Floor', className: 'tile-floor' },
  sewing_machine_sue: { icon: '🧵', label: 'Sue the Sewing Machine', className: 'tile-npc' },
  saw_saul: { icon: '🪚', label: 'Saul the Saw', className: 'tile-npc' },
  spiderweb_cellar: { icon: '🕸️', label: 'Spiderweb Cellar', className: 'tile-floor' },
  exit_up: { icon: '🕳️', label: 'Hole to the Surface', className: 'tile-exit' },
  
  steel_wall: { icon: '▓', label: 'Steel Wall', className: 'tile-wall' },
  metal_floor: { icon: '·', label: 'Metal Floor', className: 'tile-floor' },
  noodle_vats: { icon: '🍜', label: 'Noodle Vats', className: 'tile-item' },
  chef_tortellini: { icon: '👨‍🍳', label: 'Chef Tortellini', className: 'tile-npc' },
  assembly_belt: { icon: '⚙️', label: 'Assembly Line Belt', className: 'tile-item' },
  jammed_valve: { icon: '🔧', label: 'Jammed Valve', className: 'tile-wall' },
  tube_portal: { icon: '▟', label: 'Pneumatic Tube Portal', className: 'tile-exit' },
  
  scrap_wall: { icon: '▓', label: 'Scrap Wall', className: 'tile-wall' },
  scrapyard_floor: { icon: '·', label: 'Scrapyard Floor', className: 'tile-floor' },
  lost_lens: { icon: '🔍', label: 'Lost Lens', className: 'tile-item' },
  metal_heap: { icon: '📦', label: 'Metal Heap', className: 'tile-item' },
  compact_crusher: { icon: '⚙️', label: 'Compact Crusher', className: 'tile-wall' },
  broken_boiler: { icon: '🌋', label: 'Broken Boiler', className: 'tile-item' },
  
  humming_capacitor: { icon: '🔋', label: 'Humming Capacitor', className: 'tile-item' },
  portal_of_misery: { icon: '🌀', label: 'Portal of Misery', className: 'tile-exit' },
  portal_core: { icon: '🔮', label: 'Lexicon Sphere', className: 'tile-item' },

  // Expanded Types
  grass: { icon: '☘', label: 'Grass', className: 'tile-floor' },
  dirt_path: { icon: '░', label: 'Path', className: 'tile-floor' },
  sand_path: { icon: '▒', label: 'Sand', className: 'tile-floor' },
  pancake_path: { icon: '🥞', label: 'Syrup Path', className: 'tile-floor' },
  stairs_up: { icon: '⤊', label: 'Up', className: 'tile-exit' },
  stairs_down: { icon: '⤋', label: 'Down', className: 'tile-exit' },
  dark_corner: { icon: '🌑', label: 'Dark', className: 'tile-unknown' },
  warning_sign: { icon: '⚠', label: 'Sign', className: 'tile-item' },
  creek: { icon: '⌇', label: 'Creek', className: 'tile-lake' },
  syrup_river: { icon: '♒', label: 'Syrup', className: 'tile-lake' },
  trash_can: { icon: '♻', label: 'Trash', className: 'tile-item' },
  ledge_floor: { icon: '┘', label: 'Ledge', className: 'tile-floor' },
  lint_ground: { icon: '◌', label: 'Lint', className: 'tile-floor' },
  velcro_mountain: { icon: '▓', label: 'Mt', className: 'tile-wall' },
  cereal_box_wall: { icon: '▓', label: 'Wall', className: 'tile-wall' },
  whispering_wall: { icon: '▓', label: 'Wall', className: 'tile-wall' },
  item_bed: { icon: '🛏', label: 'Bed', className: 'tile-item' },
  item_chest: { icon: '📦', label: 'Chest', className: 'tile-item' },
  glowcap_mushrooms: { icon: '🍄', label: 'Mush', className: 'tile-item' },
};


function getTileConfig(tileType, stateFlags, roomTiles = {}, abilities = []) {
  const roomMeta = roomTiles[tileType];
  const mockState = { stateFlags, abilities };
  
  // Use core engine visibility logic
  const isVisible = isTileVisible(roomMeta, mockState, 'map');

  if (!isVisible) {
    if (roomMeta?.hiddenTileType) {
      // Recursively resolve the hidden representation
      return getTileConfig(roomMeta.hiddenTileType, stateFlags, roomTiles, abilities);
    }
    // Default hidden style if no hiddenTileType is provided
    return { icon: '?', label: 'Unknown', className: 'tile-hidden' };
  }

  // Check if enemy is defeated
  if (tileType.startsWith('enemy_') && stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`]) {
    return { icon: '·', label: 'Clear', className: 'tile-floor tile-cleared' };
  }
  // Check if item is opened
  if (tileType.startsWith('item_') && stateFlags[`${tileType}_opened`]) {
    return { icon: '◇', label: 'Opened', className: 'tile-item tile-opened' };
  }

  // Merge static config with room metadata
  let baseType = tileType;
  if (tileType.startsWith('exit_') && !TILE_CONFIG[tileType]) {
    baseType = 'exit';
  }
  if (tileType.startsWith('enemy_') && !TILE_CONFIG[tileType]) {
    baseType = 'enemy';
  }
  if (tileType.startsWith('npc_') && !TILE_CONFIG[tileType]) {
    baseType = 'npc';
  }
  if (tileType.startsWith('item_') && !TILE_CONFIG[tileType]) {
    baseType = 'item';
  }

  const hasNaturesBounty = abilities.some(a => a.id === "natures_bounty_vision");
  const baseConfig = TILE_CONFIG[baseType] || (hasNaturesBounty
    ? { icon: '✧', label: tileType, className: 'tile-revealed' }
    : { icon: '?', label: tileType, className: 'tile-unknown' });

  if (roomMeta) {
    return {
      ...baseConfig,
      label: roomMeta.name || baseConfig.label,
      description: roomMeta.description || baseConfig.description
    };
  }

  return baseConfig;
}

export default function GridViewer({ grid, playerPosition, stateFlags, entities, tiles: roomTiles, enemyHP, abilities = [] }) {
  const [isExpanded, setIsExpanded] = React.useState(window.innerWidth > 768);

  if (!grid) return null;

  return (
    <div className={`grid-viewer ${!isExpanded ? 'is-collapsed' : ''}`}>
      <div className="grid-header" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <span className="grid-icon">{isExpanded ? '⊟' : '⊞'}</span>
        <span className="grid-title">Tactical Map</span>
        <span className="grid-toggle-hint">{isExpanded ? 'Collapse' : 'Expand'}</span>
      </div>
      {isExpanded && (
        <>
          <div className="grid-container">
            {grid.map((row, y) => (
              <div key={y} className="grid-row">
                {row.map((tileType, x) => {
                  const isPlayer = playerPosition.x === x && playerPosition.y === y;
                  const config = getTileConfig(tileType, stateFlags, roomTiles, abilities);
                  const cellEntities = (entities || []).filter(e => e.x === x && e.y === y && !stateFlags[`${e.id}_defeated`]);

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`grid-cell ${config.className} ${isPlayer ? 'tile-player' : ''}`}
                      title={`(${x},${y}) ${config.label}`}
                    >
                      {isPlayer ? (
                        <span className="player-marker">F</span>
                      ) : cellEntities.length > 0 ? (
                        <span className="entity-marker" title={cellEntities[0].name}>☠</span>
                      ) : (
                        <span className="tile-icon">{config.icon}</span>
                      )}
                      {/* Enemy/NPC HP bar */}
                      {(() => {
                        const tileMeta = roomTiles?.[tileType];
                        const npcHp = tileMeta?.npc?.hp;
                        if (npcHp && !stateFlags[`${tileType.replace(/^npc_/, '')}_defeated`] && !stateFlags['barry_defeated']) {
                          const currentHp = enemyHP?.[tileType] ?? npcHp;
                          if (currentHp > 0) {
                            const pct = Math.max(0, (currentHp / npcHp) * 100);
                            const barColor = pct > 60 ? '#4ade80' : pct > 30 ? '#facc15' : '#ef4444';
                            return (
                              <div className="enemy-hp-bar" title={`${currentHp}/${npcHp} HP`}>
                                <div className="enemy-hp-fill" style={{ width: `${pct}%`, background: barColor }} />
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="grid-legend">
            <span className="legend-item"><span className="legend-swatch swatch-player">F</span> Fred</span>
            <span className="legend-item"><span className="legend-swatch swatch-npc">☺</span> NPC</span>
            <span className="legend-item"><span className="legend-swatch swatch-item">◈</span> Item</span>
            <span className="legend-item"><span className="legend-swatch swatch-enemy">☠</span> Enemy</span>
            <span className="legend-item"><span className="legend-swatch swatch-exit">△</span> Exit</span>
          </div>
        </>
      )}
    </div>
  );
}
