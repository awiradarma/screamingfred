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
  const [currentZ, setCurrentZ] = useState(0);

  const currentRoom = gameState?.room;
  const currentCoords = currentRoom?.world_coord?.split(',').map(Number) || [15, 15, 0];
  const [currentX, currentY, roomZ] = currentCoords;

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
      teleportToCoordinate(x, y, currentZ);
      setView('game');
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = COORD_MIN; y <= COORD_MAX; y++) {
      for (let x = COORD_MIN; x <= COORD_MAX; x++) {
        const coordKey = `${x},${y},${currentZ}`;
        
        // Priority: Static Registry Data -> Firestore Cache -> Fallback
        const staticRoom = getRoomAt(x, y, currentZ);
        const dynamicRoom = worldRooms[coordKey] || (currentZ === 0 ? worldRooms[`${x},${y}`] : null);
        const room = staticRoom || dynamicRoom;
        
        const roomName = room?.room_name || `(${x}, ${y})`;
        const hasRoom = !!room;
        const isCurrent = x === currentX && y === currentY && currentZ === roomZ;

        cells.push(
          <div 
            key={`${x},${y}`}
            className={`map-cell ${hasRoom ? 'has-room' : 'empty'} ${isCurrent ? 'is-current' : ''}`}
            onClick={() => handleCellClick(x, y)}
            title={hasRoom ? `${roomName} (${x}, ${y}, Z:${currentZ})` : `(${x}, ${y}, Z:${currentZ})`}
          >
            {isCurrent && <div className="player-indicator" />}
            {!hasRoom && <div className="orange-fog" />}
          </div>
        );
      }
    }
    return cells;
  };

  const Z_LEVELS = [
    { id: 1, name: 'Upstairs', icon: '☁️' },
    { id: 0, name: 'Surface', icon: '🌍' },
    { id: -1, name: 'Underground', icon: '🌋' },
  ];

  return (
    <div className="world-map-container">
      <header className="world-map-header">
        <div className="header-left-tools">
          <div className="title-section">
            <h2>World Map (30x30)</h2>
            <div className="z-level-toggle">
              {Z_LEVELS.map(level => (
                <button
                  key={level.id}
                  className={`z-btn ${currentZ === level.id ? 'active' : ''}`}
                  onClick={() => setCurrentZ(level.id)}
                >
                  {level.icon} {level.name}
                </button>
              ))}
            </div>
          </div>
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
