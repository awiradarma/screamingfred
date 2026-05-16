import React from 'react';

/**
 * GridViewer — 5×5 tactical grid visualization.
 * Shows tile types with icons/colors and the player's position.
 */

const TILE_CONFIG = {
  wall:       { icon: '▓', label: 'Wall',   className: 'tile-wall' },
  floor:      { icon: '·', label: 'Floor',  className: 'tile-floor' },
  exit_north: { icon: '△', label: 'Exit N', className: 'tile-exit' },
  exit_south: { icon: '▽', label: 'Exit S', className: 'tile-exit' },
  exit_east:  { icon: '▷', label: 'Exit E', className: 'tile-exit' },
  exit_west:  { icon: '◁', label: 'Exit W', className: 'tile-exit' },
  npc_sue:    { icon: '☺', label: 'NPC',    className: 'tile-npc' },
  item_fridge: { icon: '◈', label: 'Item',  className: 'tile-item' },
  enemy_snake: { icon: '☠', label: 'Enemy', className: 'tile-enemy' },
  lava:       { icon: '≈', label: 'Lava',   className: 'tile-lava' },
  ice:        { icon: '❄', label: 'Ice',    className: 'tile-ice' },
  lake:       { icon: '≋', label: 'Lake',   className: 'tile-lake' },
  bouncy:     { icon: '⊗', label: 'Bouncy', className: 'tile-bouncy' },
  electric_floor: { icon: '⚡', label: 'Electric', className: 'tile-electric' },
  electric_sand:  { icon: '⚡', label: 'Electric', className: 'tile-electric' },
  cursed_chair: { icon: '🪑', label: 'Chair', className: 'tile-item' },
  exit:       { icon: '△', label: 'Exit',   className: 'tile-exit' },
  enemy:      { icon: '☠', label: 'Enemy',  className: 'tile-enemy' },
  npc:        { icon: '☺', label: 'NPC',    className: 'tile-npc' },
  item:       { icon: '◈', label: 'Item',   className: 'tile-item' },
  // Expanded Types
  grass:      { icon: '☘', label: 'Grass',  className: 'tile-floor' },
  dirt_path:  { icon: '░', label: 'Path',   className: 'tile-floor' },
  sand_path:  { icon: '▒', label: 'Sand',   className: 'tile-floor' },
  pancake_path: { icon: '🥞', label: 'Syrup Path', className: 'tile-floor' },
  stairs_up:   { icon: '⤊', label: 'Up',     className: 'tile-exit' },
  stairs_down: { icon: '⤋', label: 'Down',   className: 'tile-exit' },
  dark_corner: { icon: '🌑', label: 'Dark',   className: 'tile-unknown' },
  warning_sign: { icon: '⚠', label: 'Sign',   className: 'tile-item' },
  creek:       { icon: '⌇', label: 'Creek',  className: 'tile-lake' },
  syrup_river: { icon: '♒', label: 'Syrup',  className: 'tile-lake' },
  trash_can:   { icon: '♻', label: 'Trash',  className: 'tile-item' },
  ledge_floor: { icon: '┘', label: 'Ledge',  className: 'tile-floor' },
  lint_ground: { icon: '◌', label: 'Lint',   className: 'tile-floor' },
  velcro_mountain: { icon: '▓', label: 'Mt', className: 'tile-wall' },
  cereal_box_wall: { icon: '▓', label: 'Wall', className: 'tile-wall' },
  whispering_wall: { icon: '▓', label: 'Wall', className: 'tile-wall' },
  item_bed:    { icon: '🛏', label: 'Bed',    className: 'tile-item' },
  item_chest:  { icon: '📦', label: 'Chest',  className: 'tile-item' },
  glowcap_mushrooms: { icon: '🍄', label: 'Mush', className: 'tile-item' },
};


function getTileConfig(tileType, stateFlags, roomTiles = {}, abilities = []) {
  const hasNaturesBounty = abilities.some(a => a.id === "natures_bounty_vision");
  // Check room-specific metadata first
  const roomMeta = roomTiles[tileType];
  
  // Visibility Check
  if (roomMeta) {
    // If it's an NPC or has specific visibility narrative flags, respect them even with Nature's Bounty
    const isNPC = !!roomMeta.npc;
    const hasVisibilityFlags = roomMeta.visibleIf || roomMeta.hiddenIf;
    
    if (hasVisibilityFlags) {
      const visibleIf = roomMeta.visibleIf;
      const hiddenIf = roomMeta.hiddenIf;
      
      const isVisible = (!visibleIf || stateFlags[visibleIf]) && (!hiddenIf || !stateFlags[hiddenIf]);
      
      if (!isVisible) {
        // Nature's Bounty reveals the *terrain* (hiddenTileType) but not the NPC/hidden detail itself
        if (!hasNaturesBounty || isNPC) {
          const fallbackType = roomMeta.hiddenTileType || 'floor';
          return getTileConfig(fallbackType, stateFlags, roomTiles, abilities);
        }
      }
    }
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

export default function GridViewer({ grid, playerPosition, stateFlags, roomName, entities, tiles: roomTiles, enemyHP, abilities = [] }) {
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
