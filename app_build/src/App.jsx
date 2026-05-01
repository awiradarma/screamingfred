import React, { useEffect } from 'react';
import './App.css';
import ChatLog from './components/ChatLog';
import CommandInput from './components/CommandInput';
import GridViewer from './components/GridViewer';
import PlayerHUD from './components/PlayerHUD';
import MobileController from './components/MobileController';
import WorldMap from './components/WorldMap';
import LevelEditor from './components/LevelEditor';
import { useStore } from './store/useStore';
import pkg from '../package.json';

export default function App() {
  const {
    gameState, gameLog, isGameStarted,
    initGame, resetGame, submitCommand,
    activeView, setView, isAdmin
  } = useStore();
  const [showRestartConfirm, setShowRestartConfirm] = React.useState(false);

  useEffect(() => {
    const sequence = async () => {
      if (!isGameStarted) {
        await useStore.getState().loadWorldData();
        await initGame();
      }
    };
    sequence();
  }, [isGameStarted, initGame]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (gameState?.playerHP <= 0) return; // Block all keys if dead
      
      // Ignore if typing in an input, textarea, or contentEditable element
      if (
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable ||
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) return;

      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') submitCommand('north');
      if (key === 'arrowdown' || key === 's') submitCommand('south');
      if (key === 'arrowleft' || key === 'a') submitCommand('west');
      if (key === 'arrowright' || key === 'd') submitCommand('east');
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [submitCommand, gameState?.playerHP]);

  if (!gameState) {
    return (
      <div className="app-loading">
        <div className="loading-text">Initializing Sentientworldia...</div>
      </div>
    );
  }

  if (activeView === 'world_map') {
    return <WorldMap />;
  }

  if (activeView === 'editor') {
    return <LevelEditor />;
  }

  const isDefeated = gameState.playerHP <= 0;

  return (
    <>
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="title-group">
            <h1 className="title-glow">Screaming Fred</h1>
            <span className="app-version">v{pkg.version}</span>
          </div>
        </div>
        
        <div className="header-right">
          <nav className="admin-nav">
            <button 
              className={`nav-btn ${activeView === 'game' ? 'active' : ''}`}
              onClick={() => setView('game')}
              title="Play"
            >
              <span className="nav-icon">🎮</span>
              <span className="nav-text">Play</span>
            </button>
            <button 
              className={`nav-btn ${activeView === 'world_map' ? 'active' : ''}`}
              onClick={() => setView('world_map')}
              title="Map"
            >
              <span className="nav-icon">🗺️</span>
              <span className="nav-text">Map</span>
            </button>
            {isAdmin && (
              <button 
                className={`nav-btn ${activeView === 'editor' ? 'active' : ''}`}
                onClick={() => setView('editor')}
                title="Editor"
              >
                <span className="nav-icon">🛠️</span>
                <span className="nav-text">Editor</span>
              </button>
            )}
          </nav>
          <button className="restart-btn" onClick={() => {
            console.log('Restart button requested');
            setShowRestartConfirm(true);
          }}>Restart</button>
        </div>
      </header>

      {showRestartConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal title-glow-subtle">
            <h2>Restart Game?</h2>
            <p>Are you sure you want to restart? All current progress will be lost forever!</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowRestartConfirm(false)}>
                Stay Here
              </button>
              <button className="modal-btn confirm" onClick={() => {
                console.log('Restart confirmed via custom modal');
                setShowRestartConfirm(false);
                resetGame().catch(err => {
                  console.error('Error during resetGame:', err);
                  alert('Failed to restart. Please refresh.');
                });
              }}>
                Yes, Restart
              </button>
            </div>
          </div>
        </div>
      )}

      <PlayerHUD
        playerHP={gameState.playerHP}
        maxHP={gameState.maxHP}
        inventory={gameState.inventory}
        position={gameState.playerPosition}
        roomName={gameState.room.room_name}
        theme={gameState.room.theme}
        onCommand={submitCommand}
      />

      <main className="game-layout">
        <section className="panel-chat">
          <ChatLog messages={gameLog} />
          <CommandInput onSubmit={submitCommand} disabled={isDefeated} />
        </section>

        <aside className="panel-grid">
          <GridViewer
            grid={gameState.room.grid}
            playerPosition={gameState.playerPosition}
            stateFlags={gameState.stateFlags}
            roomName={gameState.room.room_name}
            entities={gameState.entities}
            tiles={gameState.room.tiles}
          />
          <div className="grid-info-box">
            <div className="info-title">Room Info</div>
            <div className="info-row">
              <span className="info-label">Theme</span>
              <span className="info-value">{gameState.room.theme.replace(/_/g, ' ')}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Coord</span>
              <span className="info-value">{gameState.room.world_coord}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Turn</span>
              <span className="info-value">{gameState.turnCount}</span>
            </div>
          </div>
        </aside>
      </main>

    </div>
    <MobileController onSubmit={submitCommand} disabled={isDefeated} />
    </>
  );
}
