import React from 'react';
import './LevelEditor.css';

const VisualEditor = ({ room, onUpdate, selectedTool, onOpenEntity }) => {
  if (!room) return null;

  const handleCellClick = (x, y) => {
    if (!selectedTool) return;

    // Constraint: Exits can only be placed on the edges
    const isEdge = x === 0 || x === 4 || y === 0 || y === 4;
    if (selectedTool.id.startsWith('exit') && !isEdge) {
        alert("Exits can only be placed on the room edges!");
        return;
    }

    // Determine unique ID for generic tools (exit, enemy, npc, item)
    let toolId = selectedTool.id;
    const isGeneric = ['exit', 'enemy', 'npc', 'item'].includes(toolId);
    if (isGeneric) {
        toolId = `${selectedTool.id}_${x}_${y}`;
    }

    const newGrid = room.grid.map((row, ry) => 
      row.map((tile, rx) => {
        if (rx === x && ry === y) {
          return toolId;
        }
        return tile;
      })
    );

    // If it's a new tile type, add it to the tiles definition if missing
    const newTiles = { ...room.tiles };
    if (!newTiles[toolId] || isGeneric) {
      newTiles[toolId] = {
        name: selectedTool.name,
        description: selectedTool.description,
        passable: selectedTool.passable ?? true,
        // Default properties based on type
        ...(toolId.startsWith('exit') ? { targetPosition: { x: 2, y: 2 } } : {}),
        ...(toolId.startsWith('enemy') ? { 
            enemy: { name: 'New Enemy', hp: 5, damage: 1, behavior: 'stalk' } 
        } : {}),
        ...(toolId.startsWith('npc') ? { 
            name: 'New NPC',
            npc: { name: 'Stranger', dialogue: [{ stage: 0, text: 'Hello there.', hint: 'Talk to them.' }] } 
        } : {}),
        ...(toolId.startsWith('item') ? { 
            name: 'New Container',
            item: { name: 'Chest', contains: { name: 'Mystery Item', type: 'resource' }, opened_description: 'An empty box.' } 
        } : {})
      };
    }

    onUpdate({ ...room, grid: newGrid, tiles: newTiles });

    // If it's an entity or exit, open the editor automatically
    if (selectedTool.type === 'enemy' || selectedTool.type === 'npc' || selectedTool.type === 'item' || toolId.startsWith('exit')) {
      onOpenEntity(toolId, x, y);
    }
  };

  return (
    <div className="visual-grid-editor">
      <div className="editor-controls-row">
        <label>Room Description:</label>
        <textarea 
          className="room-desc-input"
          value={room.description || ''}
          onChange={(e) => onUpdate({ ...room, description: e.target.value })}
          placeholder="Enter room description..."
        />
      </div>
      {room.grid.map((row, y) => (
        <div key={y} className="editor-row">
          {row.map((tile, x) => (
            <div 
              key={`${x}-${y}`} 
              className={`editor-cell ${tile}`}
              onClick={() => handleCellClick(x, y)}
              title={tile}
            >
              {/* Optional: icons for enemies/items/exits */}
              {tile.startsWith('enemy') && <div className="cell-overlay enemy-icon">👿</div>}
              {tile.startsWith('npc') && <div className="cell-overlay npc-icon">👤</div>}
              {tile.startsWith('item') && <div className="cell-overlay item-icon">📦</div>}
              {tile.startsWith('exit') && <div className="cell-overlay exit-icon">🚪</div>}
              {room.player_start.x === x && room.player_start.y === y && (
                 <div className="cell-overlay player-icon">⭐</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default VisualEditor;
