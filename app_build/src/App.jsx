import React from 'react';
import Game from './components/Game';
import EditorPalette from './components/EditorPalette';
import WorldMap from './components/WorldMap';
import { useStore } from './store/useStore';
import { Edit3, Map as MapIcon } from 'lucide-react';

export default function App() {
  const { gameState, setGameState, editorMode, toggleEditorMode } = useStore();
  
  return (
    <div className="app-container">
      {/* Route: Overworld Map Menu */}
      {gameState === 'menu' && (
          <WorldMap />
      )}

      {/* Route: Gameplay and Editor Architecture */}
      {gameState !== 'menu' && (
      <header className="glass-panel app-header">
        <h1 className="title-glow">Screaming Fred</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
                onClick={() => setGameState('menu')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.5rem 1rem', fontSize: '0.875rem', pointerEvents: 'auto', fontWeight: 'bold', transition: 'all 0.2s', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
            >
                <MapIcon size={16} />
                World Map
            </button>
            <button 
                onClick={toggleEditorMode}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid', borderRadius: '4px', padding: '0.5rem 1rem', fontSize: '0.875rem', pointerEvents: 'auto', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer',
                  background: editorMode ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: editorMode ? '#00e5ff' : 'white',
                  borderColor: editorMode ? '#00e5ff' : 'rgba(255,255,255,0.1)',
                  boxShadow: editorMode ? '0 0 10px rgba(0,229,255,0.3)' : 'none'
                }}
            >
                <Edit3 size={16} />
                {editorMode ? 'Exit Editor' : 'Level Editor'}
            </button>
            <div className="status-badge">Status: {gameState}</div>
        </div>
      </header>
      )}
      
      {gameState !== 'menu' && (
      <main className="game-wrapper">
        <Game />
        <EditorPalette />
      </main>
      )}

      <footer className="app-footer">
        Sentientworldia v0.1.0 (Core Engine)
      </footer>
    </div>
  );
}
