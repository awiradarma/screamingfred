import React, { useState } from 'react';
import AbilitiesModal from './AbilitiesModal';
import { useStore } from '../store/useStore';

/**
 * PlayerHUD — Compact status bar showing player info.
 */
export default function PlayerHUD({ playerHP, maxHP, inventory, position, roomName, theme, onCommand }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isAbilitiesOpen, setIsAbilitiesOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);

  const room = useStore((state) => state.gameState?.room);
  const openShop = useStore((state) => state.openShop);

  // Find if current tile has trades
  let hasShop = false;
  let activeNpcName = '';
  let activeTrades = [];

  if (room && position) {
    const tileType = room.grid[position.y]?.[position.x];
    const tileData = room.tiles?.[tileType];
    if (tileData?.npc?.trades) {
      hasShop = true;
      activeNpcName = tileData.npc.name;
      activeTrades = tileData.npc.trades;
    }
  }

  const hpPercent = Math.max(0, (playerHP / maxHP) * 100);
  const hpColor = hpPercent > 60 ? 'var(--color-hp-high)' : hpPercent > 30 ? 'var(--color-hp-mid)' : 'var(--color-hp-low)';

  const pastaCount = inventory.filter(i => 
    i.type === 'pasta' || i.itemId?.includes('pasta') || i.name?.toLowerCase().includes('pasta')
  ).length;
  
  const foodCount = inventory.filter(i => 
    (i.type === 'food' || i.type === 'potato') && !i.name?.toLowerCase().includes('pasta')
  ).length;

  const groupedInventory = [];
  inventory.forEach(item => {
    const existing = groupedInventory.find(g => g.name === item.name);
    if (existing) {
      existing.count += 1;
    } else {
      groupedInventory.push({ ...item, count: 1 });
    }
  });

  const handleItemClick = (item) => {
    if (onCommand) {
      onCommand(`use ${item.name}`);
    }
    setIsSelectorOpen(false);
    setExpandedKey(null);
  };

  const handleItemHeaderClick = (key) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  const toggleSelector = () => {
    setIsSelectorOpen(!isSelectorOpen);
    setExpandedKey(null);
  };

  const getItemIcon = (type, name) => {
    const n = name.toLowerCase();
    if (n.includes('pasta') || type === 'pasta') return '🍝';
    if (n.includes('potato') || type === 'potato') return '🥔';
    if (n.includes('bread') || n.includes('roll') || type === 'food') return '🥪';
    if (n.includes('key')) return '🔑';
    if (n.includes('potion') || n.includes('drink')) return '🧪';
    if (n.includes('map')) return '🗺️';
    if (n.includes('note') || n.includes('letter')) return '📜';
    if (n.includes('sword') || n.includes('weapon')) return '⚔️';
    return '📦';
  };

  const activeCharacter = useStore((state) => state.gameState?.activeCharacter);
  const characterName = activeCharacter === 'banana'
    ? 'Fred the Banana'
    : activeCharacter 
      ? activeCharacter.charAt(0).toUpperCase() + activeCharacter.slice(1) 
      : 'Fred';

  const characterEmoji = activeCharacter === 'willy' ? '🥞' : activeCharacter === 'freddista' ? '🥾' : activeCharacter === 'banana' ? '🍌' : '👟';

  return (
    <div className="player-hud">
      <div className="hud-section hud-identity">
        <span className="hud-name">{characterEmoji} {characterName}</span>
        <span className="hud-location" title={`Theme: ${theme}`}>{roomName}</span>
      </div>

      <div className="hud-section hud-hp">
        <span className="hud-label">HP</span>
        <div className="hp-bar-track">
          <div
            className="hp-bar-fill"
            style={{ width: `${hpPercent}%`, background: hpColor }}
          />
        </div>
        <span className="hp-value">{playerHP}/{maxHP}</span>
      </div>

      <div className="hud-section hud-inventory" onClick={toggleSelector}>
        <span className="inv-item" title="Pasta collected">🍝 {pastaCount}</span>
        <span className="inv-item" title="Food collected">🥪 {foodCount}</span>
        <span className="inv-item inv-total" title="Total items">📦 {inventory.length}</span>
        <span className="inv-arrow">{isSelectorOpen ? '▲' : '▼'}</span>

        {isSelectorOpen && (
          <div className="inventory-selector" onClick={(e) => e.stopPropagation()}>
            <div className="selector-header">
              <span>Inventory</span>
              <span className="selector-close" onClick={() => { setIsSelectorOpen(false); setExpandedKey(null); }}>✕</span>
            </div>
            <div className="selector-list">
              {inventory.length === 0 ? (
                <div className="selector-empty">Empty pockets...</div>
              ) : (
                <>
                  <div className="inventory-category-header">Usables</div>
                  {groupedInventory.filter(i => i.onUse || ['food', 'potion', 'tool', 'pasta', 'potato', 'weapon', 'drink'].includes(i.type)).length === 0 && (
                    <div className="selector-empty">No usable items.</div>
                  )}
                  {groupedInventory
                    .filter(i => i.onUse || ['food', 'potion', 'tool', 'pasta', 'potato', 'weapon', 'drink'].includes(i.type))
                    .map((item, idx) => {
                      const isExpanded = expandedKey === `usable-${idx}`;
                      return (
                        <div 
                          key={`usable-${idx}`} 
                          className={`selector-item ${isExpanded ? 'expanded' : ''}`} 
                          onClick={() => handleItemHeaderClick(`usable-${idx}`)}
                          style={{ flexDirection: 'column', alignItems: 'stretch' }}
                        >
                          <div className="selector-item-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                            <span className="selector-item-icon">{getItemIcon(item.type, item.name)}</span>
                            <div className="selector-item-info">
                              <span className="selector-item-name">
                                {item.name} {item.count > 1 ? `(x${item.count})` : ''}
                              </span>
                              <span className="selector-item-type">{item.type}</span>
                            </div>
                            {item.onUse && <span className="use-hint" title="Can be used">⚡</span>}
                            <span className="expand-indicator" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                          
                          {isExpanded && (
                            <div className="selector-item-details" onClick={(e) => e.stopPropagation()} style={{ padding: '8px 10px 4px 32px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '8px' }}>
                              <p className="selector-item-description" style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                                {item.description || 'No description available.'}
                              </p>
                              {item.onUse && (
                                <button 
                                  className="use-item-btn" 
                                  onClick={() => handleItemClick(item)}
                                >
                                  Use Item ⚡
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  
                  <div className="inventory-category-header" style={{ marginTop: '10px' }}>Conquest & Lore</div>
                  {groupedInventory.filter(i => !i.onUse && !['food', 'potion', 'tool', 'pasta', 'potato', 'weapon', 'drink'].includes(i.type)).length === 0 && (
                    <div className="selector-empty">No conquest items.</div>
                  )}
                  {groupedInventory
                    .filter(i => !i.onUse && !['food', 'potion', 'tool', 'pasta', 'potato', 'weapon', 'drink'].includes(i.type))
                    .map((item, idx) => {
                      const isExpanded = expandedKey === `conquest-${idx}`;
                      return (
                        <div 
                          key={`conquest-${idx}`} 
                          className={`selector-item ${isExpanded ? 'expanded' : ''}`} 
                          style={{ opacity: 0.9, flexDirection: 'column', alignItems: 'stretch' }} 
                          onClick={() => handleItemHeaderClick(`conquest-${idx}`)}
                        >
                          <div className="selector-item-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                            <span className="selector-item-icon">{getItemIcon(item.type, item.name)}</span>
                            <div className="selector-item-info">
                              <span className="selector-item-name">
                                {item.name} {item.count > 1 ? `(x${item.count})` : ''}
                              </span>
                              <span className="selector-item-type">{item.type}</span>
                            </div>
                            <span className="expand-indicator" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                          
                          {isExpanded && (
                            <div className="selector-item-details" onClick={(e) => e.stopPropagation()} style={{ padding: '8px 10px 4px 32px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '8px' }}>
                              <p className="selector-item-description" style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 }}>
                                {item.description || 'No description available.'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hud-section hud-abilities" onClick={() => setIsAbilitiesOpen(true)} title="View Abilities & Status">
        <span className="hud-label">🌟</span>
      </div>

      {hasShop && (
        <div 
          className="hud-section hud-shop glowing-shop-btn" 
          onClick={() => openShop(room.grid[position.y]?.[position.x], activeNpcName, activeTrades)}
          title="Open Shop / Trading Post"
          style={{ cursor: 'pointer', background: 'rgba(74, 222, 128, 0.15)', border: '1px solid #4ade80', borderRadius: '6px', color: '#4ade80', animation: 'shopGlow 1.5s infinite alternate', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="hud-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px', fontSize: '0.9rem', fontWeight: 'bold' }}>🛒 Trade</span>
        </div>
      )}

      <div className="hud-section hud-coords">
        <span className="coord-label">Pos</span>
        <span className="coord-value">({position.x}, {position.y})</span>
      </div>

      {isAbilitiesOpen && <AbilitiesModal onClose={() => setIsAbilitiesOpen(false)} />}
    </div>
  );
}
