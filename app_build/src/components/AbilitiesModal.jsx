import React from 'react';
import { useStore, CONQUEST_REWARDS } from '../store/useStore';
import './AbilitiesModal.css';

const AbilitiesModal = ({ onClose }) => {
  const activeAbilities = useStore((state) => state.gameState?.abilities || []);
  const statusEffects = useStore((state) => state.gameState?.activeEffects || []);

  // Stop click from closing modal if clicking inside the modal content
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="abilities-modal-overlay" onClick={onClose}>
      <div className="abilities-modal" onClick={handleContentClick}>
        <div className="abilities-header">
          <h2>Status & Abilities</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="abilities-content">
          <div className="abilities-section">
            <h3>Active Status Effects</h3>
            {statusEffects.length === 0 ? (
              <div className="empty-state">No active status effects.</div>
            ) : (
              statusEffects.map((effect, idx) => (
                <div key={idx} className={`effect-card ${effect.type === 'debuff' ? 'danger' : ''}`}>
                  <div className="card-icon">{effect.icon || '✨'}</div>
                  <div className="card-info">
                    <div className="card-title">
                      {effect.name}
                      <span className="duration-badge">{effect.duration} turns</span>
                    </div>
                    <div className="card-desc">{effect.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="abilities-section">
            <h3>Permanent Abilities</h3>
            {activeAbilities.length === 0 ? (
              <div className="empty-state">No permanent abilities unlocked.</div>
            ) : (
              activeAbilities.map((ability, idx) => (
                <div key={idx} className="ability-card">
                  <div className="card-icon">{ability.icon || '🌟'}</div>
                  <div className="card-info">
                    <div className="card-title">{ability.name}</div>
                    <div className="card-desc">{ability.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="abilities-section">
            <h3>Available Conquests</h3>
            {CONQUEST_REWARDS.length === 0 ? (
              <div className="empty-state">No conquests available.</div>
            ) : (
              CONQUEST_REWARDS.map((conquest, idx) => {
                const isCompleted = activeAbilities.some(a => a.id === conquest.ability.id);
                return (
                  <div key={idx} className={`ability-card ${isCompleted ? 'completed' : ''}`} style={{ opacity: isCompleted ? 0.6 : 1 }}>
                    <div className="card-icon">{isCompleted ? '✅' : '🏆'}</div>
                    <div className="card-info">
                      <div className="card-title">
                        {conquest.name}
                        {isCompleted && <span className="duration-badge" style={{ marginLeft: '8px', background: '#4ade80', color: '#064e3b' }}>Completed</span>}
                      </div>
                      <div className="card-desc">
                        <strong>Reward:</strong> {conquest.ability.name} ({conquest.ability.description})<br/>
                        <strong>Requires:</strong> {conquest.requiredItemNames ? conquest.requiredItemNames.join(', ') : conquest.requiredItems.join(', ')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbilitiesModal;
