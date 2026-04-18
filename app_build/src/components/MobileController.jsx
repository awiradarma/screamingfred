import React, { useState } from 'react';
import './MobileController.css';

/**
 * MobileController — Floating touch controls for movement and actions.
 * Only visible on small screens.
 */
export default function MobileController({ onSubmit, disabled }) {
  const [showActions, setShowActions] = useState(false);

  const handleMove = (dir) => {
    if (disabled) return;
    onSubmit(dir);
  };

  const handleAction = (action) => {
    if (disabled) return;
    onSubmit(action);
    setShowActions(false);
  };

  const actions = [
    { id: 'interact', label: 'Interact', icon: '✋' },
    { id: 'talk', label: 'Talk', icon: '💬' },
    { id: 'attack', label: 'Attack', icon: '⚔️' },
    { id: 'scream', label: 'Scream', icon: '😱' },
  ];

  return (
    <div className={`mobile-controller ${disabled ? 'is-disabled' : ''}`}>
      {/* Action Menu */}
      <div className={`action-menu ${showActions ? 'is-visible' : ''}`}>
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-btn btn-${action.id}`}
            onClick={() => handleAction(action.id)}
            aria-label={action.label}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>

      {/* D-Pad controls */}
      <div className="dpad-container">
        <button 
          className="dpad-btn dpad-n" 
          onClick={() => handleMove('north')}
          aria-label="Move North"
        >
          <span className="arrow">▲</span>
        </button>
        <button 
          className="dpad-btn dpad-w" 
          onClick={() => handleMove('west')}
          aria-label="Move West"
        >
          <span className="arrow">◀</span>
        </button>
        
        {/* Central Action Toggle */}
        <button 
          className={`dpad-center ${showActions ? 'is-active' : ''}`}
          onClick={() => setShowActions(!showActions)}
          aria-label="Toggle Actions"
        >
          <div className="btn-inner">
             {showActions ? '✕' : 'ACT'}
          </div>
        </button>

        <button 
          className="dpad-btn dpad-e" 
          onClick={() => handleMove('east')}
          aria-label="Move East"
        >
          <span className="arrow">▶</span>
        </button>
        <button 
          className="dpad-btn dpad-s" 
          onClick={() => handleMove('south')}
          aria-label="Move South"
        >
          <span className="arrow">▼</span>
        </button>
      </div>
    </div>
  );
}
