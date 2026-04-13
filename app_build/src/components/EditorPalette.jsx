import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { loadDraft, saveDraft } from '../db/indexedStorage';
import { Settings, Eraser, Map } from 'lucide-react';

const THEMES = ['Shoeboxlandia', 'Breakfastopia', 'Electric Desert', 'Textlandia'];

const TOOLS = {
  global: [
    { id: 'eraser', icon: <Eraser size={16}/>, name: 'Eraser' }
  ],
  Shoeboxlandia: [
    { id: 'brick_platform', icon: '🧱', name: 'Brick Platform' },
    { id: 'glaring_eye', icon: '👁️', name: 'Glaring Eye' }
  ],
  Breakfastopia: [
    { id: 'pancake_platform', icon: '🥞', name: 'Pancake' },
    { id: 'waffle_bridge', icon: '🧇', name: 'Waffle Bridge' }
  ],
  'Electric Desert': [
    { id: 'electric_sand', icon: '⚡', name: 'Sand' },
    { id: 'barry_battery', icon: '🔋', name: 'Barry Battery' }
  ],
  Textlandia: [
    { id: 'text_floor', icon: 'T', name: 'Text Platform' }
  ]
};

export default function EditorPalette() {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const { 
      editorMode, toggleEditorMode, activeTheme, setTheme, 
      selectedEntityTool, setSelectedTool, activeDraftMap, setDraftMap 
  } = useStore();

  useEffect(() => {
      loadDraft().then((draft) => {
          setDraftMap(draft);
          if(draft.levelHeader.theme) setTheme(draft.levelHeader.theme);
      });
  }, [setDraftMap, setTheme]);

  const handleToolSelect = (toolId) => {
      setSelectedTool(toolId);
  };

  const handleThemeChange = (newTheme) => {
      setTheme(newTheme);
      setSelectedTool(null); 
      
      const updatedDraft = { ...activeDraftMap };
      updatedDraft.levelHeader.theme = newTheme;
      setDraftMap(updatedDraft);
      saveDraft(updatedDraft);
  };
  
  if (!editorMode) return null;

  if (isMinimized) {
      return (
          <div style={{ position: 'absolute', right: '1.5rem', top: '5.5rem', zIndex: 20 }}>
              <button 
                  style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #00e5ff', color: '#00e5ff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setIsMinimized(false)}
              >
                  + Expand Palette
              </button>
          </div>
      );
  }

  const currentTools = [...TOOLS.global, ...(TOOLS[activeTheme] || [])];

  return (
    <div className="glass-panel" style={{
        position: 'absolute', right: '1.5rem', top: '5.5rem', bottom: '2rem', width: '320px', 
        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', 
        overflowY: 'auto', pointerEvents: 'auto', zIndex: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Settings size={20} color="#00e5ff" />
             <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>Theme Config</h2>
        </div>
        <button 
             onClick={() => setIsMinimized(true)}
             style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.2rem' }}
             title="Collapse Palette"
        >
             ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#ccc' }}>Active Theme</label>
        <select 
            value={activeTheme} 
            onChange={(e) => handleThemeChange(e.target.value)}
            style={{ 
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none' 
            }}
        >
            {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Map size={20} color="#00e5ff" />
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Palette</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {currentTools.map(tool => {
            const isActive = selectedEntityTool === tool.id;
            return (
                <button 
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem 0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease',
                        background: isActive ? 'rgba(0,229,255,0.2)' : 'rgba(0,0,0,0.4)',
                        border: isActive ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.05)',
                        color: 'white', ...(isActive ? { boxShadow: '0 0 15px rgba(0,229,255,0.3)' } : {})
                    }}
                >
                    <span style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{tool.icon}</span>
                    <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>{tool.name}</span>
                </button>
            )
        })}
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <button 
               style={{ width: '100%', padding: '0.75rem', background: '#ff4444', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
               onClick={() => {
                   if (window.confirm("Are you sure you want to clear the entire map? This cannot be undone.")) {
                       const freshDraft = { ...activeDraftMap, mapData: { grid: {} } };
                       setDraftMap(freshDraft);
                       saveDraft(freshDraft);
                       window.location.reload();
                   }
               }}
            >
               Clear Full Map
           </button>
           <button 
                style={{ width: '100%', padding: '0.75rem', background: '#00e5ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => {
                    alert("Test Run activated! Validating level...");
                    window.dispatchEvent(new CustomEvent('test-run-level', { detail: { draft: activeDraftMap } }));
                }}
             >
                Test Run Level
           </button>
           <button 
                style={{ width: '100%', padding: '0.75rem', background: '#44ff44', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={async () => {
                    const { user } = useStore.getState();
                    if(!user) {
                        alert("Please sign in to publish levels!");
                        return;
                    }
                    try {
                        const { publishLevel } = await import('../firebase/levels');
                        await publishLevel(activeDraftMap, user.uid);
                        alert("Level published for review!");
                    } catch (e) {
                        alert("Failed to publish level: " + e.message);
                    }
                }}
             >
                Publish Level
           </button>
           <button 
               style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
               onClick={toggleEditorMode}
            >
               Close Editor
           </button>
      </div>
    </div>
  );
}
