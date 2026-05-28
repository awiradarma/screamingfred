import React from 'react';
import { useStore } from '../store/useStore';
import './RunSummaryOverlay.css';

export default function RunSummaryOverlay() {
  const { lastRunSummary, setView } = useStore();

  if (!lastRunSummary) return null;

  const isVictory = lastRunSummary.outcome === 'victory';
  const headerClass = isVictory ? 'victory-glow' : 'defeat-glow';
  const icon = isVictory ? '🏆' : '💀';

  return (
    <div className="summary-overlay">
      <div className="summary-card terminal-border title-glow-subtle">
        <header className="summary-header">
          <div className={`summary-icon ${headerClass}`}>{icon}</div>
          <h1 className={headerClass}>
            {isVictory ? 'DIAGNOSTIC: RUN SUCCESSFUL' : 'DIAGNOSTIC: SYSTEM COLLAPSE'}
          </h1>
          <p className="summary-subtitle">Adventure Run #{lastRunSummary.runId.replace('run_', '')}</p>
        </header>

        <main className="summary-body">
          {/* Diagnostic Stats */}
          <section className="summary-section">
            <h2 className="summary-section-title">📊 TELEMETRY ANALYSIS</h2>
            <div className="summary-stats-grid">
              <div className="summary-stat-row">
                <span className="stat-label">OUTCOME:</span>
                <span className={`stat-value ${isVictory ? 'text-green' : 'text-red'}`}>
                  {lastRunSummary.outcome.toUpperCase()}
                </span>
              </div>
              <div className="summary-stat-row">
                <span className="stat-label">CHARACTER:</span>
                <span className="stat-value text-white">{lastRunSummary.character.toUpperCase()}</span>
              </div>
              <div className="summary-stat-row">
                <span className="stat-label">TURNS TAKEN:</span>
                <span className="stat-value text-white">{lastRunSummary.turnsTaken} turns</span>
              </div>
              <div className="summary-stat-row">
                <span className="stat-label">ENEMIES VANQUISHED:</span>
                <span className="stat-value text-green">{lastRunSummary.enemiesDefeated} hostiles</span>
              </div>
              <div className="summary-stat-row">
                <span className="stat-label">FINAL CONDITION:</span>
                <span className="stat-value text-white">{lastRunSummary.finalHP} HP</span>
              </div>
              <div className="summary-stat-row">
                <span className="stat-label">MATRIX SEED:</span>
                <span className="stat-value text-white">{lastRunSummary.seed}</span>
              </div>
            </div>
          </section>

          {/* EXP Breakdown */}
          <section className="summary-section xp-breakdown-section">
            <h2 className="summary-section-title">⭐ EXP PAYOUT LEDGER</h2>
            <div className="xp-breakdown-grid">
              <div className="xp-row">
                <span>Base Performance Payout:</span>
                <span className="xp-payout">+{isVictory ? 10 : 3} XP</span>
              </div>
              <div className="xp-row">
                <span>Hostiles Exterminated Bounty:</span>
                <span className="xp-payout">+{lastRunSummary.enemiesDefeated * (isVictory ? 2 : 1)} XP</span>
              </div>
              {isVictory && lastRunSummary.finalInventory.length > 0 && (
                <div className="xp-row">
                  <span>Resource Recovery Payout:</span>
                  <span className="xp-payout">+{lastRunSummary.finalInventory.length * 1} XP</span>
                </div>
              )}
              <div className="xp-total-row">
                <span>TOTAL CREDITED BALANCE:</span>
                <span className="xp-total-value">+{lastRunSummary.expGained} XP</span>
              </div>
            </div>
          </section>

          {/* Recovered Items */}
          <section className="summary-section">
            <h2 className="summary-section-title">📦 RECOVERED RESOURCES</h2>
            {lastRunSummary.finalInventory.length === 0 ? (
              <div className="summary-empty-inventory">No resources recovered in this run.</div>
            ) : (
              <div className="recovered-items-grid">
                {lastRunSummary.finalInventory.map((itemName, index) => (
                  <div key={index} className="recovered-item-pill">
                    💎 {itemName}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="summary-footer">
          <button className="summary-action-btn" onClick={() => setView('adventure_hub')}>
            🏰 Return to Adventure Hub
          </button>
        </footer>
      </div>
    </div>
  );
}
