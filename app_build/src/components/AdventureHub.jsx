import React from 'react';
import { useStore } from '../store/useStore';
import './AdventureHub.css';

export default function AdventureHub() {
  const {
    playerProfile,
    toggleGameMode,
    activeMode,
    selectedAdventureCharacter,
    selectAdventureCharacter,
    adventureEquippedItems,
    toggleEquipStartingItem,
    buyStartingItem,
    levelUpCharacter,
    startAdventureRun
  } = useStore();

  if (!playerProfile) {
    return (
      <div className="adventure-loading">
        <div className="terminal-cursor">Loading Adventure Profile...</div>
      </div>
    );
  }

  // Shop items specs
  const SHOP_ITEMS = [
    {
      id: "item_berries",
      name: "Rubber Berries",
      description: "A soft forest berry. Heals 4 HP when consumed during a run.",
      price: 5,
      emoji: "🍒"
    },
    {
      id: "item_potato_battery",
      name: "Potato Battery",
      description: "Prevents half of all enemy or environmental damage for one turn.",
      price: 9,
      emoji: "🔋"
    },
    {
      id: "magical_pasta",
      name: "Magical Pasta",
      description: "Auto-revives you with full health if you collapse. Extremely precious.",
      price: 25,
      emoji: "🍜"
    }
  ];

  return (
    <div className="adventure-hub-container">
      <header className="hub-header">
        <div className="hub-title-group">
          <h1 className="cyber-glow-green">🏰 ADVENTURE HUB</h1>
          <p className="terminal-text">Solo Side-Quest Grinding Matrix // Sentientworldia</p>
        </div>
        <button className="hub-exit-btn" onClick={toggleGameMode}>
          📖 Return to Story Mode
        </button>
      </header>

      <main className="hub-layout">
        {/* Left Side: Stats & Level Up */}
        <section className="hub-panel char-select-panel">
          <h2 className="panel-title">👥 SELECT YOUR RUN CHARACTER</h2>
          <div className="char-cards">
            {Object.keys(playerProfile.characters).map(charId => {
              const char = playerProfile.characters[charId];
              const isSelected = selectedAdventureCharacter === charId;
              const emoji = charId === 'fred' ? '👟' : charId === 'freddista' ? '🥾' : '🥞';
              const label = charId === 'fred' ? 'Fred (Screamer)' : charId === 'freddista' ? 'Freddista (Starrer)' : 'Willy (Detective)';
              
              const levelUpCost = char.level === 1 ? 15 : char.level === 2 ? 30 : null;
              const isMaxLevel = char.level >= 3;
              const canAffordLevelUp = levelUpCost && playerProfile.totalEXP >= levelUpCost;

              return (
                <div 
                  key={charId} 
                  className={`char-card ${isSelected ? 'selected-card' : ''}`}
                  onClick={() => selectAdventureCharacter(charId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="char-emoji">{emoji}</div>
                  <h3 className="char-name">{label}</h3>
                  <div className="char-stat">Level: <span className="highlight-green">{char.level} / 3</span></div>
                  <div className="char-stat">Max HP: <span className="highlight-green">{char.maxHP}</span></div>
                  
                  {isMaxLevel ? (
                    <div className="max-level-badge">⭐ MAX LEVEL</div>
                  ) : (
                    <button 
                      className={`upgrade-btn ${canAffordLevelUp ? 'can-afford' : ''}`}
                      disabled={!canAffordLevelUp}
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering selection
                        levelUpCharacter(charId);
                      }}
                    >
                      Upgrade ({levelUpCost} XP)
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Character Abilities Explanation */}
          <div className="abilities-info-block">
            <h3 className="abilities-title">🔮 SPECIAL MECHANICS (ACTIVE IN ADVENTURE RUNS)</h3>
            <div className="abilities-grid">
              <div className="ability-desc">
                <strong>Fred (Scream)</strong>: Splash damage to adjacent tiles. Levels increase damage and stun range.
              </div>
              <div className="ability-desc">
                <strong>Freddista (Stare)</strong>: Line damage/stun in a single direction. Levels increase range and damage.
              </div>
              <div className="ability-desc">
                <strong>Willy (Deduce)</strong>: Reveals secrets, traps, and enemy vulnerabilities without walking on them.
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: EXP & Shop & Packing */}
        <aside className="hub-panel-sidebar">
          {/* EXP Ledger & Packing Panel */}
          <div className="hub-panel xp-panel">
            <h2 className="panel-title">⭐ EXP & PACKED ITEMS</h2>
            <div className="xp-value-group">
              <span className="xp-label">XP BALANCE:</span>
              <span className="xp-value">{playerProfile.totalEXP} XP</span>
            </div>
            
            <div className="starting-items-ledger">
              <div className="ledger-title">📦 CHOOSE STARTING ITEMS (MAX 2)</div>
              
              {/* Render equipped starting items */}
              <div className="equipped-slots">
                {[0, 1].map(index => {
                  const itemId = adventureEquippedItems[index];
                  const itemSpec = itemId ? SHOP_ITEMS.find(i => i.id === itemId) : null;
                  return (
                    <div key={index} className="equip-slot">
                      {itemSpec ? (
                        <div className="packed-item-pill">
                          <span>{itemSpec.emoji} {itemSpec.name}</span>
                          <button 
                            className="remove-packed-btn" 
                            onClick={() => toggleEquipStartingItem(itemId)}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="slot-empty">[ Empty Slot ]</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* List items available in the player's profile pool to equip */}
              <div className="pool-list">
                <div className="pool-subtitle">YOUR INVENTORY POOL:</div>
                {Object.keys(playerProfile.startingItemsPool).length === 0 || 
                 Object.values(playerProfile.startingItemsPool).every(c => c === 0) ? (
                  <div className="ledger-empty">
                    Your pool is empty. Buy starting items in the shop below to equip them!
                  </div>
                ) : (
                  <div className="pool-grid">
                    {Object.keys(playerProfile.startingItemsPool).map(itemId => {
                      const count = playerProfile.startingItemsPool[itemId] || 0;
                      if (count === 0) return null;
                      const itemSpec = SHOP_ITEMS.find(i => i.id === itemId) || { emoji: "📦", name: itemId };
                      const currentlyPacked = adventureEquippedItems.filter(id => id === itemId).length;
                      const availableCount = count - currentlyPacked;

                      return (
                        <div key={itemId} className="pool-item-row">
                          <span className="pool-item-name">
                            {itemSpec.emoji} {itemSpec.name} (x{availableCount} left)
                          </span>
                          {availableCount > 0 && (
                            <button 
                              className="pack-btn"
                              onClick={() => toggleEquipStartingItem(itemId)}
                              disabled={adventureEquippedItems.length >= 2}
                            >
                              Pack
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* EXP Shop Panel */}
          <div className="hub-panel shop-panel">
            <h2 className="panel-title">🛒 EXP SHOP</h2>
            <div className="shop-grid">
              {SHOP_ITEMS.map(item => {
                const canAfford = playerProfile.totalEXP >= item.price;
                return (
                  <div key={item.id} className="shop-card">
                    <div className="shop-card-left">
                      <div className="shop-card-emoji">{item.emoji}</div>
                      <div className="shop-card-text">
                        <span className="shop-card-name">{item.name}</span>
                        <p className="shop-card-desc">{item.description}</p>
                      </div>
                    </div>
                    <button 
                      className={`buy-btn ${canAfford ? 'can-afford' : ''}`}
                      disabled={!canAfford}
                      onClick={() => buyStartingItem(item.id, item.price)}
                    >
                      Buy ({item.price} XP)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Launch Run Panel */}
          <div className="hub-panel start-run-panel">
            <h2 className="panel-title">⚔️ LAUNCH ADVENTURE</h2>
            <p className="run-desc">
              Generate a 5-room procedural maze. Escape back to Shoeboxlandia with your life to secure EXP! If you perish, you earn minimal EXP, and any consumed starting items are lost forever.
            </p>
            <button 
              className="launch-btn title-glow-green"
              onClick={startAdventureRun}
            >
              🚀 Launch Run ({selectedAdventureCharacter.toUpperCase()})
            </button>
          </div>
      </main>

      {/* Hall of Fame - Bottom Row */}
      <section className="hub-panel hall-of-fame-panel" style={{ marginTop: '25px' }}>
        <h2 className="panel-title">🏆 HALL OF FAME: COMPLETED RUNS HISTORY</h2>
        {!playerProfile.runHistory || playerProfile.runHistory.length === 0 ? (
          <div className="ledger-empty" style={{ padding: '30px' }}>
            No runs recorded yet. Exterminate hostiles and step into escape portals to write your logs here!
          </div>
        ) : (
          <div className="fame-table-container">
            <table className="fame-table">
              <thead>
                <tr>
                  <th>DATE / TIMESTAMP</th>
                  <th>OUTCOME</th>
                  <th>CHARACTER</th>
                  <th>REGION THEME</th>
                  <th>TURNS</th>
                  <th>HOSTILES</th>
                  <th>XP GAINED</th>
                  <th>RECOVERED LOOT</th>
                </tr>
              </thead>
              <tbody>
                {playerProfile.runHistory.map((run, index) => {
                  const dateStr = new Date(run.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const isVictory = run.outcome === 'victory';
                  return (
                    <tr key={index} className={isVictory ? 'row-victory' : 'row-defeat'}>
                      <td className="date-cell">{dateStr}</td>
                      <td className="outcome-cell">
                        {isVictory ? '🏆 VICTORY' : '💀 DEFEAT'}
                      </td>
                      <td className="char-cell">{run.character.toUpperCase()}</td>
                      <td>{run.theme}</td>
                      <td>{run.turnsTaken}</td>
                      <td>{run.enemiesDefeated}</td>
                      <td className="xp-cell">+{run.expGained} XP</td>
                      <td className="loot-cell">
                        {run.finalInventory && run.finalInventory.length > 0 ? (
                          run.finalInventory.map((loot, idx) => (
                            <span key={idx} className="loot-badge">💎 {loot}</span>
                          ))
                        ) : (
                          <span className="no-loot">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
