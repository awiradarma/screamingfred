import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import './MobileController.css';

import { getAvailableActions } from '../engine/roomEngine';

/**
 * MobileController — Floating touch controls for movement and actions.
 * Only visible on small screens.
 */
const checkBlocking = (lastActionTimeRef, update = true) => {
  const now = Date.now();
  if (now - lastActionTimeRef.current < 150) return true;
  if (update) lastActionTimeRef.current = now;
  return false;
};

export default function MobileController({ onSubmit, disabled }) {
  const [showActions, setShowActions] = useState(false);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const { gameState } = useStore();
  const inventory = gameState?.inventory || [];
  
  const groupedInventory = [];
  inventory.forEach(item => {
    const existing = groupedInventory.find(g => g.name === item.name);
    if (existing) {
      existing.count += 1;
    } else {
      groupedInventory.push({ ...item, count: 1 });
    }
  });
  
  // Track last interaction time to prevent ghost clicks/rapid fire
  const lastActionTime = useRef(0);

  const handleMove = (dir) => {
    if (disabled || checkBlocking(lastActionTime, true)) return;
    onSubmit(dir);
    setShowActions(false);
    setShowItemSelection(false);
  };

  const handleAction = (action) => {
    if (disabled || checkBlocking(lastActionTime)) return;
    
    if (action === 'use') {
      if (inventory.length === 0) {
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
    if (disabled || checkBlocking(lastActionTime)) return;
    onSubmit(`use ${item.name}`);
    setShowActions(false);
    setShowItemSelection(false);
  };

  const toggleActions = (e) => {
    e.stopPropagation();
    // Don't update the timer for menu toggles, just check it
    if (disabled || checkBlocking(lastActionTime, false)) return;
    
    if (showItemSelection) {
      setShowItemSelection(false);
    } else {
      setShowActions(!showActions);
    }
  };

  const closeMenus = () => {
    setShowActions(false);
    setShowItemSelection(false);
  };

  const availableActionIds = gameState ? getAvailableActions(gameState) : [];
  const allActions = [
    { id: 'interact', label: 'Interact', icon: '✋' },
    { id: 'talk', label: 'Talk', icon: '💬' },
    { id: 'use', label: 'Use', icon: '🎒' },
    { id: 'attack', label: 'Attack', icon: '⚔️' },
    { id: 'scream', label: 'Scream', icon: '😱' },
  ];
  
  const actions = allActions.filter(a => availableActionIds.includes(a.id));

  return (
    <div className={`mobile-controller ${disabled ? 'is-disabled' : ''}`}>
      {/* Backdrop for catching stray clicks and closing menus */}
      <div 
        className={`controller-backdrop ${(showActions || showItemSelection) ? 'is-visible' : ''}`}
        onClick={closeMenus}
      />

      {/* Action Menu (Main) - Positioned Left */}
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

      {/* Item Selection Menu - Positioned Right (Above D-Pad) */}
      <div className={`action-menu item-selection-menu ${showItemSelection ? 'is-visible' : ''}`}>
        <div className="menu-header">Use what?</div>
        <div className="item-list-scroll">
          {groupedInventory.map((item, idx) => (
            <button
              key={`${item.itemId || item.name}-${idx}`}
              className="action-btn item-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleUseItem(item);
              }}
            >
              <span className="action-label">{item.name}{item.count > 1 ? ` (x${item.count})` : ''}</span>
            </button>
          ))}
        </div>
        <button 
          className="action-btn cancel-btn btn-back" 
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
          onClick={toggleActions}
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
