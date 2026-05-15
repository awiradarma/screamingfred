import React from 'react';
import { useStore } from '../store/useStore';
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
        </div>
      </div>
    </div>
  );
};

export default AbilitiesModal;
