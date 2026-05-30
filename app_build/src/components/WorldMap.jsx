import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getRoomData, getRoomAt, worldCoordinateRegistry } from '../data/worldData';
import './WorldMap.css';

const REGIONS = {
  'Shoeboxlandia Town': [
    'freds_house', 'attic_bedroom', 'attic_corner', 'shoe_rack', 
    'window_sill', 'neighbors_house', 'garden_path', 'shoeboxlandia_street',
    'path_to_breakfastopia', 'breakfastopia_gates'
  ],
  'Shoelace Forest & Caves': [
    'forest_entrance', 'secret_cave', 'forest_thicket', 'forest_deep',
    'forest_clearing', 'forest_creek', 'forest_exit', 'forest_marsh',
    'snake_path', 'freddista_shack'
  ],
  'Unknown Lands & Peaks': [
    'electric_desert_entrance', 'microphone_stage', 'mountain_base',
    'mountain_pass', 'mountain_peak', 'textlandia_entrance'
  ],
  'The Underground Roots': [
    'hidden_hideout', 'noodle_factory', 'scary_scrapyard', 'apple_swamp', 'great_farm'
  ],
  'Chapter 2 Wilderness': [
    'land_of_jumping', 'scream_collector', 'forgotten_forest',
    'perception_ocean', 'mountain_of_miserly', 'textlandia_road'
  ],
  'Typewriter Detour Gauntlet ⌨️': [
    'typewriter_keys', 'typewriter_ribbon', 'typewriter_deadend'
  ],
  'Lava Lake & Creativity': [
    'bridge_of_blah', 'lava_chasms', 'land_of_creativity'
  ]
};

const THEME_ICONS = {
  'Forest': '🌲',
  'Shoebox_Forest': '🌲',
  'Meadow': '🌻',
  'Dungeon': '💀',
  'Castle': '🏰',
  'Cave': '🪨',
  'House': '🏠',
  'Village': '🏠',
  'Path': '🛣️',
  'Street': '🛣️',
  'Desert': '🌵',
  'Mountain': '⛰️',
  'Attic': '📦',
  'Swamp': '🐊',
  'Industrial': '🏭',
  'Textlandia': '⌨️',
  'Underground': '🌋',
  'Land_of_Creativity': '🎨',
  'Unknown_Lands': '❓'
};

const WorldMap = () => {
  const { gameState, setView, teleportToCoordinate } = useStore();
  const cardRefs = useRef({});

  const currentRoom = gameState?.room;
  const currentRoomId = currentRoom?.room_id;

  // Resolve discovered room IDs
  const discoveredRoomIds = new Set(
    (gameState?.discoveredRooms || ['15,15,0'])
      .map(coord => worldCoordinateRegistry[coord])
      .filter(Boolean)
  );

  // Auto-scroll to the current room card on mount
  useEffect(() => {
    if (currentRoomId && cardRefs.current[currentRoomId]) {
      setTimeout(() => {
        cardRefs.current[currentRoomId].scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardRefs.current[currentRoomId].classList.add('highlight-pulse');
        setTimeout(() => {
          cardRefs.current[currentRoomId]?.classList.remove('highlight-pulse');
        }, 3000);
      }, 300);
    }
  }, [currentRoomId]);

  // Navigate to and highlight another card
  const handleLinkClick = (targetRoomId) => {
    if (cardRefs.current[targetRoomId]) {
      cardRefs.current[targetRoomId].scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardRefs.current[targetRoomId].classList.add('highlight-pulse');
      setTimeout(() => {
        cardRefs.current[targetRoomId]?.classList.remove('highlight-pulse');
      }, 2000);
    }
  };

  // Helper to resolve exits and boundaries for a room
  const getRoomConnections = (room) => {
    const connections = [];
    const coords = room.world_coord?.split(',').map(Number);
    
    // 1. Scan explicit transition tiles
    if (room.tiles) {
      Object.entries(room.tiles).forEach(([tileType, tile]) => {
        if (tile.targetRoomId) {
          const dir = tileType.replace(/^exit_/, '').toUpperCase().replace(/_/g, ' ');
          connections.push({
            type: 'explicit',
            direction: dir,
            targetRoomId: tile.targetRoomId,
            conditions: tile.conditions,
            tileType
          });
        }
      });
    }
    
    // 2. Scan off-grid boundary adjacent coordinates
    if (coords && coords.length >= 2) {
      const [cx, cy, cz = 0] = coords;
      const DIR_VECTORS = {
        'NORTH': { dx: 0, dy: -1 },
        'SOUTH': { dx: 0, dy: 1 },
        'EAST':  { dx: 1, dy: 0 },
        'WEST':  { dx: -1, dy: 0 },
      };
      Object.entries(DIR_VECTORS).forEach(([dir, { dx, dy }]) => {
        const nx = cx + dx;
        const ny = cy + dy;
        const neighborRoom = getRoomAt(nx, ny, cz);
        if (neighborRoom) {
          // Prevent duplicates if already handled by explicit tiles
          const exists = connections.some(c => c.targetRoomId === neighborRoom.room_id);
          if (!exists) {
            connections.push({
              type: 'boundary',
              direction: dir,
              targetRoomId: neighborRoom.room_id
            });
          }
        }
      });
    }
    
    return connections;
  };

  // Helper to check lock conditions on a tile/exit
  const isExitLocked = (conditions) => {
    if (!conditions) return false;
    const { requiredItem, requiredFlag } = conditions;
    const hasItem = requiredItem ? gameState.inventory.some(i => i.itemId === requiredItem || i.name === requiredItem) : true;
    const hasFlag = requiredFlag ? gameState.stateFlags[requiredFlag] : true;
    return !hasItem || !hasFlag;
  };

  const handleFastTravel = (room) => {
    const coords = room.world_coord?.split(',').map(Number);
    if (coords && coords.length >= 2) {
      const [x, y, z = 0] = coords;
      teleportToCoordinate(x, y, z);
      setView('game');
    }
  };

  const renderRoomCard = (roomId) => {
    const isDiscovered = discoveredRoomIds.has(roomId);
    if (!isDiscovered) {
      return (
        <div key={roomId} className="room-card locked">
          <div className="card-header">
            <h4>??? Undiscovered Region</h4>
          </div>
          <p className="locked-placeholder">Explore more of Sentientworldia to unlock this node.</p>
        </div>
      );
    }

    const room = getRoomData(roomId);
    if (!room) return null;

    const isCurrent = roomId === currentRoomId;
    const connections = getRoomConnections(room);
    const coords = room.world_coord?.split(',').map(Number) || [0, 0, 0];
    const [x, y, z] = coords;

    const zBadge = z === 1 ? '☁️ Upstairs' : z === -1 ? '🌋 Underground' : '🌍 Surface';
    const roomEmoji = THEME_ICONS[room.theme] || '❓';

    return (
      <div 
        key={roomId} 
        ref={el => cardRefs.current[roomId] = el}
        className={`room-card discovered ${isCurrent ? 'current' : ''}`}
      >
        <div className="card-header">
          <div className="title-area">
            <h4>{room.room_name}</h4>
            <span className="coord-badge">({x}, {y})</span>
          </div>
          <div className="badge-area">
            <span className="badge theme">{roomEmoji} {room.theme?.replace(/_/g, ' ')}</span>
            <span className="badge elevation">{zBadge}</span>
          </div>
        </div>

        <p className="room-summary-desc">{room.description}</p>

        <div className="card-connections-section">
          <h5>Exits & Paths</h5>
          <div className="connections-grid">
            {connections.length === 0 ? (
              <span className="no-connections-text">No exits available.</span>
            ) : (
              connections.map((conn, idx) => {
                const isTargetDiscovered = discoveredRoomIds.has(conn.targetRoomId);
                const targetRoom = getRoomData(conn.targetRoomId);
                const isLocked = isExitLocked(conn.conditions);

                return (
                  <div 
                    key={idx} 
                    className={`connection-pill ${isLocked ? 'locked' : isTargetDiscovered ? 'discovered' : 'undiscovered'}`}
                    title={isLocked ? `Locked: ${conn.conditions.failMessage}` : ''}
                  >
                    <span className="direction-arrow">{conn.direction}</span>
                    {isLocked ? (
                      <span className="pill-target locked" title={conn.conditions.failMessage}>
                        🔒 {targetRoom?.room_name || '???'} (Locked)
                      </span>
                    ) : isTargetDiscovered ? (
                      <button 
                        className="pill-target-btn" 
                        onClick={() => handleLinkClick(conn.targetRoomId)}
                      >
                        {targetRoom?.room_name}
                      </button>
                    ) : (
                      <span className="pill-target undiscovered">
                        ❓ ??? (Undiscovered)
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card-actions">
          {isCurrent ? (
            <span className="current-indicator-tag">📍 You Are Here</span>
          ) : (
            <button 
              className="fast-travel-btn title-glow-subtle"
              onClick={() => handleFastTravel(room)}
            >
              ⚡ Fast Travel
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="world-map-container scrollable-dark-theme">
      <header className="world-map-header">
        <div className="title-section">
          <h2>Sentientworldia Room Chronicle</h2>
          <p className="subtitle">Visualizing discovered rooms, exits, and topological connections.</p>
        </div>
        <button className="back-btn title-glow-subtle" onClick={() => setView('game')}>
          🎮 Back to Game
        </button>
      </header>

      <div className="chronicle-scroll-area">
        {Object.entries(REGIONS).map(([regionName, roomIds]) => {
          const discoveredCount = roomIds.filter(id => discoveredRoomIds.has(id)).length;
          const totalCount = roomIds.length;
          if (discoveredCount === 0) return null; // Hide regions completely if no rooms discovered yet

          return (
            <section key={regionName} className="region-section">
              <div className="region-header">
                <h3>{regionName}</h3>
                <span className="region-count">
                  {discoveredCount} / {totalCount} Discovered
                </span>
              </div>
              <div className="region-grid">
                {roomIds.map(roomId => renderRoomCard(roomId))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="chronicle-footer">
        <div className="legend-item"><span className="indicator current"></span> Current Position</div>
        <div className="legend-item"><span className="indicator discovered"></span> Discovered Room</div>
        <div className="legend-item"><span className="indicator locked"></span> Locked Path</div>
      </footer>
    </div>
  );
};

export default WorldMap;
