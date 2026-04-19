import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { COORD_MIN, COORD_MAX, getRoomAt } from '../data/worldData';
import { setRegionTheme } from '../firebase/worldPersistence';
import './WorldMap.css';

const WorldMap = () => {
  const { gameState, setView, teleportToCoordinate, isAdmin, addMessage } = useStore();
  const worldRooms = useStore(state => state.worldRooms);
  
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [isMapping, setIsMapping] = useState(false);

  const currentRoom = gameState?.room;
  const currentCoords = currentRoom?.world_coord?.split(',').map(Number) || [15, 15, 0];
  const [currentX, currentY] = currentCoords;

  const THEMES = [
    { id: 'Shoebox_Forest', name: 'Forest', icon: '🌲' },
    { id: 'Meadow', name: 'Meadow', icon: '🌻' },
    { id: 'Dungeon', name: 'Dungeon', icon: '💀' },
    { id: 'Castle', name: 'Castle', icon: '🏰' },
  ];

  const handleCellClick = async (x, y) => {
    if (isMapping && selectedTheme) {
      try {
        await setRegionTheme(x, y, selectedTheme);
        addMessage(`Region (${x}, ${y}) assigned to theme: ${selectedTheme}`, 'success');
      } catch (e) {
        addMessage('Theme assignment failed.', 'danger');
      }
    } else {
      teleportToCoordinate(x, y, 0);
      setView('game');
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = COORD_MIN; y <= COORD_MAX; y++) {
      for (let x = COORD_MIN; x <= COORD_MAX; x++) {
        const coordKey = `${x},${y}`;
        const room = worldRooms[coordKey] || getRoomAt(x, y, 0);
        const roomName = room?.room_name || `(${x}, ${y})`;
        const hasRoom = !!room;
        const isCurrent = x === currentX && y === currentY;

        cells.push(
          <div 
            key={`${x},${y}`}
            className={`map-cell ${hasRoom ? 'has-room' : 'empty'} ${isCurrent ? 'is-current' : ''}`}
            onClick={() => handleCellClick(x, y)}
            title={hasRoom ? `${roomName} (${x}, ${y})` : `(${x}, ${y})`}
          >
            {isCurrent && <div className="player-indicator" />}
            {!hasRoom && <div className="orange-fog" />}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="world-map-container">
      <header className="world-map-header">
        <div className="header-left-tools">
          <h2>World Map (30x30)</h2>
          {isAdmin && (
            <div className="admin-toolbar">
              <button 
                className={`admin-tool-btn ${isMapping ? 'active' : ''}`}
                onClick={() => setIsMapping(!isMapping)}
              >
                {isMapping ? 'Stop Mapping' : 'Theme Mapper'}
              </button>
              {isMapping && (
                <div className="theme-palette">
                  {THEMES.map(t => (
                    <button 
                      key={t.id}
                      className={`theme-tool ${selectedTheme === t.id ? 'active' : ''}`}
                      onClick={() => setSelectedTheme(t.id)}
                      title={t.name}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button className="back-btn" onClick={() => setView('game')}>Back to Game</button>
      </header>

      <div className="map-scroll-area">
        <div className="world-map-grid">
          {renderGrid()}
        </div>
      </div>

      <div className="world-map-footer">
        <div className="legend-item"><span className="dot current"></span> Current Position</div>
        <div className="legend-item"><span className="dot room"></span> Discovered Room</div>
        <div className="legend-item"><span className="dot fog"></span> Unknown (Fog)</div>
      </div>
    </div>
  );
};

export default WorldMap;
