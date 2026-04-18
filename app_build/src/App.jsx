import React, { useEffect } from 'react';
import './App.css';
import ChatLog from './components/ChatLog';
import CommandInput from './components/CommandInput';
import GridViewer from './components/GridViewer';
import PlayerHUD from './components/PlayerHUD';
import MobileController from './components/MobileController';
import { useStore } from './store/useStore';

export default function App() {
  const {
    gameState, gameLog, isGameStarted,
    initGame, submitCommand,
  } = useStore();

  useEffect(() => {
    if (!isGameStarted) {
      initGame();
    }
  }, [isGameStarted, initGame]);

  if (!gameState) {
    return (
      <div className="app-loading">
        <div className="loading-text">Initializing Sentientworldia...</div>
      </div>
    );
  }

  const isDefeated = gameState.playerHP <= 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title-glow">Screaming Fred</h1>
        <span className="title-subtitle">The Tactical Chronicles</span>
      </header>

      <PlayerHUD
        playerHP={gameState.playerHP}
        maxHP={gameState.maxHP}
        inventory={gameState.inventory}
        position={gameState.playerPosition}
        roomName={gameState.room.room_name}
        theme={gameState.room.theme}
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

      <MobileController onSubmit={submitCommand} disabled={isDefeated} />

      <footer className="app-footer">
        <span>Sentientworldia v1.0.0 — Phase 1: Solo Engine</span>
      </footer>
    </div>
  );
}
