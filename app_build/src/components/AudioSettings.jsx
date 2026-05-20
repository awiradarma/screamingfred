import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { initAudioContext } from '../utils/audioManager';
import './AudioSettings.css';

export default function AudioSettings() {
  const { audioSettings, updateAudioSettings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleToggle = () => {
    // Unlock AudioContext on first toggle interaction
    initAudioContext();
    setIsOpen(!isOpen);
  };

  const handleSliderChange = (key, value) => {
    updateAudioSettings({ [key]: parseFloat(value) });
  };

  const handleModeChange = (mode) => {
    updateAudioSettings({ mode });
  };

  const isMuted = audioSettings.masterVolume === 0;

  const getVolumeIcon = () => {
    if (isMuted) return '🔇';
    if (audioSettings.masterVolume < 0.3) return '🔈';
    if (audioSettings.masterVolume < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <div className="audio-settings-wrapper" ref={panelRef}>
      <button 
        className={`audio-toggle-btn ${isOpen ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
        onClick={handleToggle}
        title="Audio Settings"
      >
        <span className="audio-icon">{getVolumeIcon()}</span>
        <span className="audio-btn-text">Audio</span>
      </button>

      {isOpen && (
        <div className="audio-dropdown-panel title-glow-subtle">
          <div className="audio-header">
            <h3>Audio Controls</h3>
            <button 
              className={`master-mute-btn ${isMuted ? 'active' : ''}`}
              onClick={() => updateAudioSettings({ masterVolume: isMuted ? 0.7 : 0 })}
            >
              {isMuted ? 'Unmute All' : 'Mute All'}
            </button>
          </div>

          <div className="audio-section">
            <div className="slider-group">
              <div className="slider-label">
                <span>🔊 Master Vol</span>
                <span className="slider-value">{Math.round(audioSettings.masterVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={audioSettings.masterVolume}
                onChange={(e) => handleSliderChange('masterVolume', e.target.value)}
                className="audio-slider"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>🎵 Music (BGM)</span>
                <span className="slider-value">{Math.round(audioSettings.bgmVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={audioSettings.bgmVolume}
                onChange={(e) => handleSliderChange('bgmVolume', e.target.value)}
                className="audio-slider"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>⚡ Sound Effects</span>
                <span className="slider-value">{Math.round(audioSettings.sfxVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={audioSettings.sfxVolume}
                onChange={(e) => handleSliderChange('sfxVolume', e.target.value)}
                className="audio-slider"
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>💬 Dialogue Volume</span>
                <span className="slider-value">{Math.round(audioSettings.voiceVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={audioSettings.voiceVolume}
                onChange={(e) => handleSliderChange('voiceVolume', e.target.value)}
                className="audio-slider"
              />
            </div>
          </div>

          <div className="audio-section-divider" />

          <div className="audio-section">
            <span className="section-title">Vocalization Mode</span>
            <div className="vocal-modes-grid">
              <button 
                className={`vocal-mode-btn ${audioSettings.mode === 'bleeps' ? 'active' : ''}`}
                onClick={() => handleModeChange('bleeps')}
                title="Undertale-style dynamic sound chimes"
              >
                👾 Retro Bleeps
              </button>
              <button 
                className={`vocal-mode-btn ${audioSettings.mode === 'voice' ? 'active' : ''}`}
                onClick={() => handleModeChange('voice')}
                title="Browser synthesised Text-to-Speech vocal voices"
              >
                🗣️ Full Voice
              </button>
              <button 
                className={`vocal-mode-btn ${audioSettings.mode === 'muted' ? 'active' : ''}`}
                onClick={() => handleModeChange('muted')}
                title="Mute dialogue vocalization"
              >
                🔇 Text Only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
