import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import './MobileController.css';

/**
 * MobileController — Floating touch controls for movement and actions.
 * Only visible on small screens.
 */
export default function MobileController({ onSubmit, disabled }) {
  const [showActions, setShowActions] = useState(false);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const { gameState } = useStore();
  const inventory = gameState?.inventory || [];

  const handleMove = (dir) => {
    if (disabled) return;
    onSubmit(dir);
    setShowActions(false);
    setShowItemSelection(false);
  };

  const handleAction = (action) => {
    if (disabled) return;
    
    if (action === 'use') {
      if (inventory.length === 0) {
        // No items, just close menu
        setShowActions(false);
        return;
      }
      setShowItemSelection(true);
      return;
    }

    onSubmit(action);
    setShowActions(false);
    setShowItemSelection(false);
  };

  const handleUseItem = (item) => {
    onSubmit(`use ${item.name}`);
    setShowActions(false);
    setShowItemSelection(false);
  };

  const actions = [
    { id: 'interact', label: 'Interact', icon: '✋' },
    { id: 'talk', label: 'Talk', icon: '💬' },
    { id: 'use', label: 'Use', icon: '🎒' },
    { id: 'attack', label: 'Attack', icon: '⚔️' },
    { id: 'scream', label: 'Scream', icon: '😱' },
  ];

  return (
    <div className={`mobile-controller ${disabled ? 'is-disabled' : ''}`}>
      {/* Action Menu */}
      <div className={`action-menu ${showActions && !showItemSelection ? 'is-visible' : ''}`}>
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-btn btn-${action.id}`}
            onClick={(e) => {
              e.stopPropagation();
              handleAction(action.id);
            }}
            disabled={action.id === 'use' && inventory.length === 0}
            aria-label={action.label}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Item Selection Menu */}
      <div className={`action-menu item-selection-menu ${showItemSelection ? 'is-visible' : ''}`}>
        <div className="menu-header">Use what?</div>
        <div className="item-list">
          {inventory.map((item, idx) => (
            <button
              key={`${item.itemId}-${idx}`}
              className="action-btn item-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleUseItem(item);
              }}
            >
              <span className="action-label">{item.name}</span>
            </button>
          ))}
        </div>
        <button 
          className="action-btn cancel-btn" 
          onClick={(e) => {
            e.stopPropagation();
            setShowItemSelection(false);
          }}
        >
          <span className="action-label">Back</span>
        </button>
      </div>

      {/* D-Pad controls */}
      <div className="dpad-container" onClick={e => e.stopPropagation()}>
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
          className={`dpad-center ${(showActions || showItemSelection) ? 'is-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (showItemSelection) {
              setShowItemSelection(false);
            } else {
              setShowActions(!showActions);
            }
          }}
          aria-label="Toggle Actions"
        >
          <div className="btn-inner">
             {(showActions || showItemSelection) ? '✕' : 'ACT'}
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
