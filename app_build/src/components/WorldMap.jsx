import React from 'react';
import { useStore } from '../store/useStore';

const REGIONS = [
    { id: 1, name: 'Shoeboxlandia', cx: 100, cy: 300 },
    { id: 2, name: 'Breakfastopia', cx: 300, cy: 150 },
    { id: 3, name: 'Electric Desert', cx: 500, cy: 400 },
    { id: 4, name: 'Textlandia', cx: 700, cy: 200 }
];

export default function WorldMap() {
    const { playerLevelProgress, setGameState, setTheme } = useStore();

    const handleNodeClick = (region) => {
        if (region.id <= playerLevelProgress) {
            setTheme(region.name);
            setGameState('playing');
        }
    };

    return (
        <div style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#111', zIndex: 30, backgroundImage: 'radial-gradient(circle at center, #222 0%, #000 100%)'
        }}>
            <div className="glass-panel" style={{
                position: 'relative', width: '100%', maxWidth: '900px', aspectRatio: '16/9',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden',
                background: 'rgba(0,0,0,0.6)'
            }}>
                
                {/* SVG Paths representing the roads */}
                <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} viewBox="0 0 800 450">
                    <defs>
                        {/* Fog masking pattern */}
                        <radialGradient id="fogGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    
                    {/* Draw connecting roads */}
                    {REGIONS.map((region, idx) => {
                        if (idx === 0) return null;
                        const prev = REGIONS[idx - 1];
                        return (
                            <line 
                                key={`path-${region.id}`}
                                x1={prev.cx} y1={prev.cy} 
                                x2={region.cx} y2={region.cy} 
                                stroke={region.id <= playerLevelProgress ? "#00e5ff" : "#333"}
                                strokeWidth="4"
                                strokeDasharray={region.id <= playerLevelProgress ? "0" : "5,5"}
                            />
                        );
                    })}

                    {/* Draw region nodes */}
                    {REGIONS.map(region => {
                        const isUnlocked = region.id <= playerLevelProgress;
                        return (
                            <g 
                                key={region.id} 
                                transform={`translate(${region.cx}, ${region.cy})`}
                                style={{ cursor: isUnlocked ? 'pointer' : 'not-allowed' }}
                                onClick={() => handleNodeClick(region)}
                            >
                                <circle 
                                    r="20" 
                                    fill={isUnlocked ? '#000' : '#222'} 
                                    stroke={isUnlocked ? '#00e5ff' : '#444'} 
                                    strokeWidth="4" 
                                />
                                {isUnlocked && <circle r="8" fill="#00e5ff" />}
                                
                                <text 
                                    y="35" 
                                    textAnchor="middle" 
                                    fill={isUnlocked ? '#fff' : '#666'}
                                    fontSize="14"
                                    fontWeight="bold"
                                    style={{ textShadow: isUnlocked ? '0 0 10px rgba(0,229,255,0.8)' : 'none' }}
                                >
                                    {region.name}
                                </text>

                                {/* Fog of War coverage over future nodes */}
                                {!isUnlocked && (
                                    <circle r="70" fill="url(#fogGlow)" style={{ mixBlendMode: 'screen' }} />
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Overworld Titling Header */}
                <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                    <h1 className="title-glow" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.1em', margin: 0 }}>SENTIENTWORLDIA</h1>
                    <p style={{ color: '#ff8c00', marginTop: '0.25rem', fontWeight: 'bold' }}>Select an unlocked region to begin</p>
                </div>

                {/* Sandbox Open Button */}
                <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem' }}>
                     <button 
                         style={{ padding: '0.5rem 1rem', border: '1px solid #00e5ff', color: '#00e5ff', fontWeight: 'bold', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
                         onClick={() => setGameState('playing')}
                     >
                         Open Sandbox Simulator
                     </button>
                </div>
            </div>
        </div>
    );
}
