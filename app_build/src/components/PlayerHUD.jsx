import React, { useState } from 'react';

/**
 * PlayerHUD — Compact status bar showing player info.
 */
export default function PlayerHUD({ playerHP, maxHP, inventory, position, roomName, theme, onCommand }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const hpPercent = Math.max(0, (playerHP / maxHP) * 100);
  const hpColor = hpPercent > 60 ? 'var(--color-hp-high)' : hpPercent > 30 ? 'var(--color-hp-mid)' : 'var(--color-hp-low)';

  const pastaCount = inventory.filter(i => 
    i.type === 'pasta' || i.itemId?.includes('pasta') || i.name?.toLowerCase().includes('pasta')
  ).length;
  
  const foodCount = inventory.filter(i => 
    (i.type === 'food' || i.type === 'potato') && !i.name?.toLowerCase().includes('pasta')
  ).length;

  const handleItemClick = (item) => {
    if (onCommand) {
      onCommand(`use ${item.name}`);
    }
    setIsSelectorOpen(false);
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

  return (
    <div className="player-hud">
      <div className="hud-section hud-identity">
        <span className="hud-name">🥾 Fred</span>
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

      <div className="hud-section hud-inventory" onClick={() => setIsSelectorOpen(!isSelectorOpen)}>
        <span className="inv-item" title="Pasta collected">🍝 {pastaCount}</span>
        <span className="inv-item" title="Food collected">🥪 {foodCount}</span>
        <span className="inv-item inv-total" title="Total items">📦 {inventory.length}</span>
        <span className="inv-arrow">{isSelectorOpen ? '▲' : '▼'}</span>

        {isSelectorOpen && (
          <div className="inventory-selector" onClick={(e) => e.stopPropagation()}>
            <div className="selector-header">
              <span>Inventory</span>
              <span className="selector-close" onClick={() => setIsSelectorOpen(false)}>✕</span>
            </div>
            <div className="selector-list">
              {inventory.length === 0 ? (
                <div className="selector-empty">Empty pockets...</div>
              ) : (
                inventory.map((item, idx) => (
                  <div key={idx} className="selector-item" onClick={() => handleItemClick(item)}>
                    <span className="selector-item-icon">{getItemIcon(item.type, item.name)}</span>
                    <div className="selector-item-info">
                      <span className="selector-item-name">{item.name}</span>
                      <span className="selector-item-type">{item.type}</span>
                    </div>
                    {item.onUse && <span className="use-hint" title="Can be used">⚡</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hud-section hud-coords">
        <span className="coord-label">Pos</span>
        <span className="coord-value">({position.x}, {position.y})</span>
      </div>
    </div>
  );
}
