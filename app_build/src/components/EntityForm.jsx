import React, { useState, useEffect } from 'react';

const EntityForm = ({ tileType, currentData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Merge template defaults with current data
    const defaults = tileType.startsWith('npc') 
      ? { name: 'New NPC', dialogue: [{ stage: 0, text: 'Hello!' }], passable: true }
      : tileType.startsWith('enemy')
      ? { name: 'New Enemy', hp: 5, damage: 1, loot: '', behavior: 'stalk', detectionRange: 5, passable: true }
      : tileType.startsWith('exit')
      ? { name: 'Exit', destinationMode: 'adjacent', targetRoomId: '', targetPosition: { x: 2, y: 2 }, passable: true }
      : { name: 'New Item', description: 'A mysterious object.', passable: true };
      
    setFormData({ ...defaults, ...(currentData || {}) });
  }, [tileType, currentData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDialogueChange = (idx, text) => {
    const newDialogue = [...formData.dialogue];
    newDialogue[idx] = { ...newDialogue[idx], text };
    setFormData(prev => ({ ...prev, dialogue: newDialogue }));
  };

  return (
    <div className="entity-form-overlay">
      <div className="entity-form-card">
        <h3>Configure {tileType}</h3>
        
        <div className="form-scroll-content">
          <div className="form-group">
            <label>Display Name</label>
            <input 
              type="text" 
              value={formData.name || ''} 
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Hidden Trapdoor, Stairs Up"
            />
          </div>

          <div className="form-group">
            <label>Passable</label>
            <input 
              type="checkbox" 
              checked={formData.passable ?? true} 
              onChange={(e) => handleChange('passable', e.target.checked)}
            />
          </div>

          {tileType.startsWith('npc') && (
            <div className="form-group dialogue-list">
              <label>Dialogue Stages</label>
              {(formData.dialogue || []).map((stage, idx) => (
                <div key={idx} className="dialogue-stage-editor">
                  <textarea 
                    value={stage.text || ''}
                    onChange={(e) => {
                      const newDialogue = [...formData.dialogue];
                      newDialogue[idx] = { ...newDialogue[idx], text: e.target.value };
                      handleChange('dialogue', newDialogue);
                    }}
                    placeholder="What they say..."
                    rows={3}
                  />
                  <div className="form-row">
                    <div className="form-group mini">
                      <label>Requires Flag</label>
                      <input 
                        type="text" 
                        value={stage.requiresFlag || ''} 
                        onChange={(e) => {
                          const newDialogue = [...formData.dialogue];
                          newDialogue[idx] = { ...newDialogue[idx], requiresFlag: e.target.value };
                          handleChange('dialogue', newDialogue);
                        }}
                        placeholder="Condition flag"
                      />
                    </div>
                    <div className="form-group mini">
                      <label>Set Flag</label>
                      <input 
                        type="text" 
                        value={stage.setFlag || ''} 
                        onChange={(e) => {
                          const newDialogue = [...formData.dialogue];
                          newDialogue[idx] = { ...newDialogue[idx], setFlag: e.target.value };
                          handleChange('dialogue', newDialogue);
                        }}
                        placeholder="Trigger flag"
                      />
                    </div>
                    <div className="form-group mini">
                      <label>Gives Item</label>
                      <input 
                        type="text" 
                        value={stage.givesItem?.name || ''} 
                        onChange={(e) => {
                          const newDialogue = [...formData.dialogue];
                          newDialogue[idx] = { ...newDialogue[idx], givesItem: { name: e.target.value, type: 'resource' } };
                          handleChange('dialogue', newDialogue);
                        }}
                        placeholder="Item name"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button className="form-btn add" onClick={() => {
                  const newDialogue = [...(formData.dialogue || []), { stage: (formData.dialogue?.length || 0), text: '' }];
                  handleChange('dialogue', newDialogue);
              }}>+ Add Dialogue Stage</button>
            </div>
          )}

          {tileType.startsWith('item') && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Interaction Verb</label>
                  <input 
                    type="text" 
                    value={formData.interactionVerb || 'SEARCH'} 
                    onChange={(e) => handleChange('interactionVerb', e.target.value)}
                    placeholder="e.g. UNWRAP, OPEN"
                  />
                </div>
                <div className="form-group">
                  <label>Reveal Message</label>
                  <input 
                    type="text" 
                    value={formData.revealMessage || ''} 
                    onChange={(e) => handleChange('revealMessage', e.target.value)}
                    placeholder="You found something!"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Items Inside</label>
                  <input 
                    type="text" 
                    value={formData.item?.contains?.name || ''} 
                    onChange={(e) => handleChange('item', { ...formData.item, contains: { name: e.target.value, type: 'resource' } })}
                    placeholder="e.g. Magic Bun, Key"
                  />
                </div>
                <div className="form-group">
                  <label>Trigger Flag</label>
                  <input 
                    type="text" 
                    value={formData.item?.setFlag || ''} 
                    onChange={(e) => handleChange('item', { ...formData.item, setFlag: e.target.value })}
                    placeholder="e.g. found_key"
                  />
                </div>
              </div>
            </>
          )}

          {tileType.startsWith('enemy') && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>HP</label>
                  <input type="number" value={formData.hp || 5} onChange={(e) => handleChange('hp', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Damage</label>
                  <input type="number" value={formData.damage || 1} onChange={(e) => handleChange('damage', Number(e.target.value))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Behavior</label>
                  <select value={formData.behavior || 'stalk'} onChange={(e) => handleChange('behavior', e.target.value)}>
                      <option value="stalk">Stalk</option>
                      <option value="patrol">Patrol</option>
                      <option value="stationary">Stationary</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Detect Range</label>
                  <input type="number" value={formData.detectionRange || 5} onChange={(e) => handleChange('detectionRange', Number(e.target.value))} />
                </div>
              </div>
              <div className="form-group">
                <label>Loot Item ID</label>
                <input type="text" value={formData.loot || ''} onChange={(e) => handleChange('loot', e.target.value)} />
              </div>
            </>
          )}

          {tileType.startsWith('exit') && (
            <>
              <div className="form-group">
                  <label>Destination Mode</label>
                  <select value={formData.destinationMode || 'adjacent'} onChange={(e) => handleChange('destinationMode', e.target.value)}>
                      <option value="adjacent">Adjacent World Coordinate</option>
                      <option value="magic">Magic Door (Manual Target)</option>
                  </select>
              </div>
              {formData.destinationMode === 'magic' && (
                  <>
                      <div className="form-group">
                          <label>Target Room ID</label>
                          <input type="text" value={formData.targetRoomId || ''} onChange={(e) => handleChange('targetRoomId', e.target.value)} />
                      </div>
                      <div className="form-row">
                          <div className="form-group">
                              <label>Target X</label>
                              <input type="number" value={formData.targetPosition?.x || 2} onChange={(e) => handleChange('targetPosition', { ...formData.targetPosition, x: Number(e.target.value) })} />
                          </div>
                          <div className="form-group">
                              <label>Target Y</label>
                              <input type="number" value={formData.targetPosition?.y || 2} onChange={(e) => handleChange('targetPosition', { ...formData.targetPosition, y: Number(e.target.value) })} />
                          </div>
                      </div>
                  </>
              )}
            </>
          )}
        </div>

        <div className="form-actions">
          <button className="form-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="form-btn save" onClick={() => onSave(formData)}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
};

export default EntityForm;
