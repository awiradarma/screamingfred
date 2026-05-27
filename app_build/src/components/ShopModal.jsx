import React from 'react';
import { useStore } from '../store/useStore';
import './ShopModal.css';

export default function ShopModal() {
  const shopActive = useStore((state) => state.shopActive);
  const inventory = useStore((state) => state.gameState?.inventory || []);
  const stateFlags = useStore((state) => state.gameState?.stateFlags || {});
  const executeTrade = useStore((state) => state.executeTrade);
  const closeShop = useStore((state) => state.closeShop);

  if (!shopActive) return null;

  const { npcName, trades } = shopActive;

  // Prevent closing when clicking modal box
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  const getItemIcon = (type, name) => {
    const n = name ? name.toLowerCase() : '';
    if (n.includes('pasta') || type === 'pasta') return '🍝';
    if (n.includes('potato') || type === 'potato') return '🥔';
    if (n.includes('bread') || n.includes('roll') || type === 'food') return '🥪';
    if (n.includes('key')) return '🔑';
    if (n.includes('potion') || n.includes('drink')) return '🧪';
    if (n.includes('map')) return '🗺️';
    if (n.includes('note') || n.includes('letter')) return '📜';
    if (n.includes('sword') || n.includes('weapon')) return '⚔️';
    if (n.includes('berries') || n.includes('berry')) return '🍒';
    if (n.includes('crystal')) return '💎';
    if (n.includes('eyelet')) return '🔘';
    if (n.includes('mushroom')) return '🍄';
    if (n.includes('pollen')) return '✨';
    if (n.includes('vine')) return '🌿';
    if (n.includes('pepper')) return '🌶️';
    return '📦';
  };

  return (
    <div className="shop-modal-overlay" onClick={closeShop}>
      <div className="shop-modal" onClick={handleContentClick}>
        <div className="shop-header">
          <div className="shop-title-group">
            <h2>🛒 {npcName}'s Trading Post</h2>
            <p className="shop-subtitle">Exchange your spare materials for unique items and abilities!</p>
          </div>
          <button className="close-btn" onClick={closeShop}>&times;</button>
        </div>

        <div className="shop-content">
          <div className="trades-list">
            {trades.map((trade) => {
              const isCompleted = stateFlags[`trade_completed_${trade.id}`];
              
              // Count matching items in inventory
              const matchingCount = inventory.filter(
                (item) => item.itemId === trade.give.itemId || item.name === trade.give.name
              ).length;
              const hasEnough = matchingCount >= trade.give.count;

              // Receive details
              const reward = trade.receive;
              let rewardIcon = '📦';
              let rewardLabel = '';
              let rewardDesc = '';

              if (reward.type === 'item') {
                rewardIcon = getItemIcon(reward.type, reward.name);
                rewardLabel = `${reward.count}x ${reward.name}`;
                rewardDesc = `A useful item added to your inventory.`;
              } else if (reward.type === 'max_hp') {
                rewardIcon = '❤️';
                rewardLabel = `+${reward.value} Max HP (Permanent)`;
                rewardDesc = `Boosts your maximum health capacity and fully heals you.`;
              } else if (reward.type === 'ability') {
                rewardIcon = reward.ability.icon || '🌟';
                rewardLabel = `${reward.ability.name} (Passive)`;
                rewardDesc = reward.ability.description;
              }

              return (
                <div 
                  key={trade.id} 
                  className={`trade-card ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="trade-details">
                    <div className="trade-exchange">
                      {/* Give Section */}
                      <div className="trade-give">
                        <span className="exchange-label">Give</span>
                        <div className="exchange-item">
                          <span className="item-icon">{getItemIcon('quest', trade.give.name)}</span>
                          <div className="item-details">
                            <span className="item-name">{trade.give.name}</span>
                            <span className={`requirement-badge ${hasEnough ? 'enough' : 'insufficient'}`}>
                              {matchingCount} / {trade.give.count}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <div className="exchange-arrow">➔</div>

                      {/* Receive Section */}
                      <div className="trade-receive">
                        <span className="exchange-label">Receive</span>
                        <div className="exchange-item">
                          <span className="item-icon">{rewardIcon}</span>
                          <div className="item-details">
                            <span className="item-name reward">{rewardLabel}</span>
                            <span className="item-desc">{rewardDesc || trade.description}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="trade-actions">
                    {isCompleted ? (
                      <button className="trade-btn done" disabled>
                        Traded ✓
                      </button>
                    ) : (
                      <button 
                        className={`trade-btn ${hasEnough ? 'ready' : 'locked'}`}
                        disabled={!hasEnough}
                        onClick={() => executeTrade(trade.id)}
                      >
                        Trade 🤝
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
