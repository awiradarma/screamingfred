import React from 'react';

const TILES = [
  { id: 'grass', name: 'Grass', description: 'Soft green grass.', passable: true, category: 'Terrain' },
  { id: 'wall', name: 'Stone Wall', description: 'An impassable stone wall.', passable: false, category: 'Terrain' },
  { id: 'lava', name: 'Lava', description: 'Sizzling hot lava!', passable: true, effect: 'damage', category: 'Hazards' },
  { id: 'ice', name: 'Ice', description: 'Slippery frozen surface.', passable: true, effect: 'ice', category: 'Hazards' },
  { id: 'lake', name: 'Lake', description: 'Deep water.', passable: true, effect: 'damage', category: 'Terrain' },
  { id: 'bouncy', name: 'Bouncy Pad', description: 'Boing!', passable: true, effect: 'bouncy', category: 'Special' },
  { id: 'exit', name: 'Exit', description: 'Passage to another location.', passable: true, category: 'Navigation' },
];

const ENTITIES = [
  { id: 'enemy', name: 'Enemy', description: 'A generic enemy. Configure behaviors in the editor.', category: 'Enemies', type: 'enemy' },
  { id: 'npc', name: 'NPC', description: 'A generic character.', category: 'NPCs', type: 'npc' },
  { id: 'item', name: 'Item', description: 'A generic item container.', category: 'Items', type: 'item' },
];

const Palette = ({ selectedTool, onSelect }) => {
  const groups = {
    Terrain: TILES.filter(t => t.category === 'Terrain'),
    Hazards: TILES.filter(t => t.category === 'Hazards'),
    Other: TILES.filter(t => !['Terrain', 'Hazards'].includes(t.category)),
    Entities: ENTITIES
  };

  return (
    <div className="editor-palette">
      <h3>Palette</h3>
      {Object.entries(groups).map(([name, items]) => (
        <div key={name} className="palette-section">
          <h4>{name}</h4>
          <div className="palette-grid">
            {items.map(item => (
              <div 
                key={item.id}
                className={`palette-item ${selectedTool?.id === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item)}
                title={item.name}
              >
                <div className={`palette-preview ${item.id}`}>
                    {item.type === 'enemy' && '👿'}
                    {item.type === 'npc' && '👤'}
                    {item.type === 'item' && '📦'}
                </div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Palette;
