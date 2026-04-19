import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { saveDraft } from '../db/indexedStorage';
import { publishLevel } from '../firebase/levels';
import { saveRoomToWorld } from '../firebase/worldPersistence';
import { validateRoom, ROOM_TEMPLATE } from '../utils/roomSchema';
import VisualEditor from './VisualEditor';
import Palette from './Palette';
import EntityForm from './EntityForm';
import './LevelEditor.css';

const LevelEditor = () => {
  const currentRoom = useStore(state => state.gameState?.room);
  const setView = useStore(state => state.setView);
  const teleportToRoom = useStore(state => state.teleportToRoom);
  const addMessage = useStore(state => state.addMessage);

  const [editorMode, setEditorMode] = useState('json'); // 'json' | 'visual'
  const [jsonText, setJsonText] = useState('');
  const [roomDraft, setRoomDraft] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null); // { tileType, x, y, data }
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentRoom) {
      setRoomDraft(currentRoom);
      setJsonText(JSON.stringify(currentRoom, null, 2));
    } else {
      setRoomDraft(ROOM_TEMPLATE);
      setJsonText(JSON.stringify(ROOM_TEMPLATE, null, 2));
    }
  }, [currentRoom]);

  // Sync jsonText when roomDraft changes (primarily from Visual mode)
  useEffect(() => {
    if (editorMode === 'visual' && roomDraft) {
      const newJson = JSON.stringify(roomDraft, null, 2);
      if (newJson !== jsonText) {
        setJsonText(newJson);
      }
    }
  }, [roomDraft, editorMode, jsonText]);

  // Handle JSON changes and validation
  const handleJsonChange = (val) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      const { valid, errors } = validateRoom(parsed);
      setValidationErrors(errors);
      if (valid) {
        setRoomDraft(parsed);
      }
    } catch (e) {
      setValidationErrors([`Invalid JSON structure: ${e.message}`]);
    }
  };

  // Entity form handlers
  const openEntityForm = (tileType, x, y) => {
    const tileData = roomDraft.tiles[tileType];
    setEditingEntity({ tileType, x, y, data: tileData });
  };

  const handleEntitySave = (formData) => {
    const { tileType } = editingEntity;
    const newTiles = { 
        ...roomDraft.tiles, 
        [tileType]: { 
            ...roomDraft.tiles[tileType], 
            ...formData,
            // Ensure core properties for engine
            passable: roomDraft.tiles[tileType]?.passable ?? true,
            ...(tileType.startsWith('npc') ? { npc: { name: formData.name, dialogue: formData.dialogue } } : {}),
            ...(tileType.startsWith('enemy') ? { enemy: { name: formData.name, hp: formData.hp, damage: formData.damage, loot: formData.loot } } : {}),
            ...(tileType.startsWith('item') ? { item: { name: formData.name, description: formData.description } } : {})
        } 
    };
    setRoomDraft({ ...roomDraft, tiles: newTiles });
    setEditingEntity(null);
  };

  const handleSaveLocal = async () => {
    try {
      setIsSaving(true);
      const updatedRoom = JSON.parse(jsonText);
      
      // Save to IndexedDB
      await saveDraft(updatedRoom);
      
      // Update live game state
      teleportToRoom(updatedRoom);
      
      addMessage('Draft saved locally to IndexedDB.', 'success');
    } catch (e) {
      addMessage(`Invalid JSON: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsSaving(true);
      const roomData = JSON.parse(jsonText);
      
      // Sync to Firebase
      const levelId = await publishLevel(roomData, 'admin_user');
      
      addMessage(`Level published to Cloud! ID: ${levelId}`, 'success');
    } catch (e) {
      addMessage(`Publishing failed: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToWorld = async () => {
    try {
      setIsSaving(true);
      const roomData = JSON.parse(jsonText);
      const coordStr = roomData.world_coord || "15,15,0";
      const [x, y] = coordStr.split(',').map(n => parseInt(n));

      if (isNaN(x) || isNaN(y)) {
        throw new Error("Invalid world_coord. Must be x,y,z format.");
      }

      await saveRoomToWorld(x, y, roomData);
      
      // Update local store cache
      useStore.getState().loadWorldData();
      
      addMessage(`Room assigned to World at (${x}, ${y})!`, 'success');
    } catch (e) {
      addMessage(`World save failed: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncItems = async () => {
    try {
      setIsSaving(true);
      await useStore.getState().syncRegistryToCloud();
      addMessage('Cloud Item Registry updated successfully!', 'success');
    } catch (e) {
      addMessage(`Registry sync failed: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="level-editor-container">
      <div className="editor-header">
        <div className="header-left">
          <h2>Level Editor</h2>
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${editorMode === 'visual' ? 'active' : ''}`}
              onClick={() => setEditorMode('visual')}
            >
              Visual
            </button>
            <button 
              className={`mode-btn ${editorMode === 'json' ? 'active' : ''}`}
              onClick={() => setEditorMode('json')}
            >
              JSON
            </button>
          </div>
        </div>
        <div className="editor-actions">
          <button className="editor-btn secondary" onClick={() => setView('game')}>Exit</button>
          <button className="editor-btn primary" onClick={handleSaveLocal} disabled={isSaving || validationErrors.length > 0}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="editor-btn warning" onClick={handleSyncItems} disabled={isSaving}>
            Sync Registries
          </button>
          <button className="editor-btn accent" onClick={handlePublish} disabled={isSaving || validationErrors.length > 0}>
            Cloud Sync
          </button>
          <button className="editor-btn success" onClick={handleSaveToWorld} disabled={isSaving || validationErrors.length > 0}>
            Push to World
          </button>
        </div>
      </div>

      <div className="editor-main">
        {editorMode === 'json' ? (
          <div className="json-editor-view">
             <div className="editor-textarea-wrapper">
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                spellCheck="false"
                className="json-editor-textarea"
              />
            </div>
            {validationErrors.length > 0 && (
              <div className="validation-error-panel">
                <h4>Validation Issues ({validationErrors.length})</h4>
                <ul>
                  {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="visual-editor-view">
            <Palette 
              selectedTool={selectedTool} 
              onSelect={setSelectedTool} 
            />
            <VisualEditor 
              room={roomDraft} 
              onUpdate={setRoomDraft} 
              selectedTool={selectedTool}
              onOpenEntity={openEntityForm}
            />
          </div>
        )}

        {editingEntity && (
          <EntityForm 
            tileType={editingEntity.tileType}
            currentData={editingEntity.data}
            onSave={handleEntitySave}
            onCancel={() => setEditingEntity(null)}
          />
        )}
        
        <div className="editor-preview-hint">
            <p><strong>Status:</strong> {validationErrors.length === 0 ? '✅ Ready to save' : '❌ Fix errors before saving'}</p>
        </div>
      </div>
    </div>
  );
};

export default LevelEditor;
