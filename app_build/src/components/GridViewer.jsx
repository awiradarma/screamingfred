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
};

function getTileConfig(tileType, stateFlags) {
  // Check if enemy is defeated
  if (tileType.startsWith('enemy_') && stateFlags[`${tileType.replace(/^enemy_/, '')}_defeated`]) {
    return { icon: '·', label: 'Clear', className: 'tile-floor tile-cleared' };
  }
  // Check if item is opened
  if (tileType.startsWith('item_') && stateFlags[`${tileType}_opened`]) {
    return { icon: '◇', label: 'Opened', className: 'tile-item tile-opened' };
  }
  return TILE_CONFIG[tileType] || { icon: '?', label: tileType, className: 'tile-unknown' };
}

export default function GridViewer({ grid, playerPosition, stateFlags, roomName }) {
  if (!grid) return null;

  return (
    <div className="grid-viewer">
      <div className="grid-header">
        <span className="grid-icon">⊞</span>
        <span className="grid-title">Tactical Map</span>
      </div>
      <div className="grid-container">
        {grid.map((row, y) => (
          <div key={y} className="grid-row">
            {row.map((tileType, x) => {
              const isPlayer = playerPosition.x === x && playerPosition.y === y;
              const config = getTileConfig(tileType, stateFlags);
              return (
                <div
                  key={`${x}-${y}`}
                  className={`grid-cell ${config.className} ${isPlayer ? 'tile-player' : ''}`}
                  title={`(${x},${y}) ${config.label}`}
                >
                  {isPlayer ? (
                    <span className="player-marker">F</span>
                  ) : (
                    <span className="tile-icon">{config.icon}</span>
                  )}
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
    </div>
  );
}
