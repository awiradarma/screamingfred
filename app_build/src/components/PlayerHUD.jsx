import React from 'react';

/**
 * PlayerHUD — Compact status bar showing player info.
 */
export default function PlayerHUD({ playerHP, maxHP, inventory, position, roomName, theme }) {
  const hpPercent = Math.max(0, (playerHP / maxHP) * 100);
  const hpColor = hpPercent > 60 ? 'var(--color-hp-high)' : hpPercent > 30 ? 'var(--color-hp-mid)' : 'var(--color-hp-low)';

  const pastaCount = inventory.filter(i => i.type === 'pasta').length;
  const potatoCount = inventory.filter(i => i.type === 'potato').length;

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

      <div className="hud-section hud-inventory">
        <span className="inv-item" title="Pasta collected">🍝 {pastaCount}</span>
        <span className="inv-item" title="Potatoes collected">🥔 {potatoCount}</span>
        <span className="inv-item inv-total" title="Total items">📦 {inventory.length}</span>
      </div>

      <div className="hud-section hud-coords">
        <span className="coord-label">Pos</span>
        <span className="coord-value">({position.x}, {position.y})</span>
      </div>
    </div>
  );
}
