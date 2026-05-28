import { create } from 'zustand';
import { initGameState, processCommand, getWelcomeMessages, getEnemyIdleAttacks } from '../engine/roomEngine.js';
import { worldData, getRoomAt } from '../data/worldData.js';
import { fetchWorldRooms } from '../firebase/worldPersistence.js';
import { fetchItemRegistry, loadRegistryFromLocal, migrateStaticItems } from '../firebase/registryPersistence.js';
import { savePlayerSession, loadPlayerSession, clearPlayerSession, verifyAdminSecret } from '../firebase/sessionPersistence.js';
import { getDefaultProfile, loadPlayerProfile, savePlayerProfile } from '../firebase/profilePersistence.js';
import { generateAdventureWorld } from '../utils/proceduralWorldGenerator.js';
import staticItems from '../data/items.json' assert { type: 'json' };
import { 
  playSynthSFX, 
  playRetroBleep, 
  playDialogueBleeps, 
  speakDialogue, 
  setBgmVolume, 
  transitionBGM,
  BGM_THEME_MAPS
} from '../utils/audioManager.js';

// Helper to resolve BGM from room theme name
function getBgmForTheme(theme) {
  if (!theme) return BGM_THEME_MAPS.adventure;
  const lower = theme.toLowerCase();
  if (lower.includes('home') || lower.includes('house') || lower.includes('bedroom')) return BGM_THEME_MAPS.home;
  if (lower.includes('desert') || lower.includes('sand')) return BGM_THEME_MAPS.desert;
  if (lower.includes('mountain') || lower.includes('peak')) return BGM_THEME_MAPS.mountain;
  if (lower.includes('forest') || lower.includes('swamp') || lower.includes('woods')) return BGM_THEME_MAPS.forest;
  if (lower.includes('factory') || lower.includes('industrial') || lower.includes('stage')) return BGM_THEME_MAPS.factory;
  if (lower.includes('shoeboxlandia') || lower.includes('town') || lower.includes('street')) return BGM_THEME_MAPS.home;
  return BGM_THEME_MAPS.adventure;
}

// Play corresponding game sound effects or vocalizations based on game engine messages
function playAudioForMessages(messages, activeAction, storeState) {
  if (!messages || messages.length === 0) return;
  const { audioSettings } = storeState;
  if (!audioSettings) return;

  const master = audioSettings.masterVolume;
  const sfxVol = audioSettings.sfxVolume * master;
  const voiceVol = audioSettings.voiceVolume * master;
  const mode = audioSettings.mode || 'bleeps'; // 'voice', 'bleeps', or 'muted'

  // If the player explicitly chose to scream, play the synthesized scream SFX
  if (activeAction === 'scream') {
    playSynthSFX('scream', sfxVol);
  }

  messages.forEach(msg => {
    if (!msg) return;
    const type = msg.type;
    switch (type) {
      case 'loot':
        playSynthSFX('loot', sfxVol);
        break;
      case 'danger':
      case 'damage':
        playSynthSFX('danger', sfxVol);
        break;
      case 'defeat':
        playSynthSFX('defeat', sfxVol);
        break;
      case 'victory':
        playSynthSFX('victory', sfxVol);
        break;
      case 'dialogue':
        if (mode === 'voice') {
          speakDialogue(msg.speaker || 'unknown', msg.text || '', voiceVol);
        } else if (mode === 'bleeps') {
          playDialogueBleeps(msg.speaker || 'unknown', msg.text || '', voiceVol);
        }
        break;
      default:
        break;
    }
  });
}

export const CONQUEST_REWARDS = [
  {
    id: "detective_intuition",
    name: "Detective's Intuition",
    requiredItems: ["clue_empty_fridge", "flavor_photo", "quest_note"],
    requiredItemNames: ["Empty Fridge Clue", "Old Photo", "Freddista's Note"],
    rewardMessage: "You piece together the clues! The Empty Fridge, the Old Photo, and Freddista's Note all point to one thing... wait, actually it just points to the fact you are a great detective! You learned Detective's Intuition! (Reveals hidden items)",
    ability: { id: "detectives_intuition", name: "Detective's Intuition", description: "Automatically reveals hidden things in dark corners without needing a light.", type: "passive", icon: "🕵️‍♂️" }
  },
  {
    id: "master_tinkerer",
    name: "Master Tinkerer",
    requiredItems: ["flavor_signpost", "quest_strong_shoelace", "item_silver_eyelet"],
    requiredItemNames: ["Signpost Info", "Strong Shoelace", "Silver Eyelet"],
    rewardMessage: "You've gathered a signpost, a shoelace, and an eyelet. You realize you can build almost anything with this junk! You learned Master Tinkerer! (Passive)",
    ability: { id: "master_tinkerer", name: "Master Tinkerer", description: "Expertise in repurposing junk. Allows interacting with complex machinery and stuck hatches.", type: "passive", icon: "🔧" }
  },
  {
    id: "natures_bounty",
    name: "Nature's Bounty",
    requiredItems: ["item_berries", "item_pollen", "item_pillow"],
    requiredItemNames: ["Rubber Berries", "Yellow Pollen", "Soft Pillow"],
    rewardMessage: "Berries, pollen, and a cotton ball pillow. You've spent so much time in the wild you've developed a sixth sense for terrain! You learned Nature's Bounty! (Reveals room layout on map)",
    ability: { id: "natures_bounty_vision", name: "Nature's Bounty", description: "Your naturalist instincts allow you to perceive the full layout of any room at a glance.", type: "passive", icon: "🗺️" }
  },
  {
    id: "bio_synthesizer",
    name: "Bio-Synthesizer",
    requiredItems: ["item_rubber", "item_mushrooms", "item_vine"],
    requiredItemNames: ["Rubber Piece", "Glowing Mushrooms", "Pulsing Vine"],
    rewardMessage: "A rubber piece, glowing mushrooms, and a pulsing vine... You fuse them together into a strange, living patch! You learned Bio-Synthesizer! (Passive)",
    ability: { id: "bio_synthesizer", name: "Bio-Synthesizer", description: "Your deep connection to weird ecology makes you slightly more resilient.", type: "passive", icon: "🌱" }
  },
  {
    id: "culinary_alchemist",
    name: "Culinary Alchemist",
    requiredItems: ["spicy_noodles", "suitable_potato", "item_forest_spud"],
    requiredItemNames: ["Spicy Noodles", "Suitable Potato", "Forest Spud"],
    rewardMessage: "A balanced meal of factory spice, farm starch, and forest goodness! You feel incredibly grounded. You learned Stable Footing! (Prevents unintended launches)",
    ability: { id: "stable_footing", name: "Stable Footing", description: "Your incredible balance allows you to walk safely on jiggly jelly surfaces.", type: "passive", icon: "👞" }
  },
  {
    id: "optical_overload",
    name: "Optical Overload",
    requiredItems: ["item_magnifying_lens", "item_shiny_reflector"],
    requiredItemNames: ["Magnifying Lens", "Shiny Reflector"],
    rewardMessage: "Between the magnifying lens and the shiny reflector, your vision is enhanced beyond normal shoe capabilities! You learned Thermal Sight! (Passive)",
    ability: { id: "thermal_sight", name: "Thermal Sight", description: "Advanced infrared vision. Reveals life forms (NPCs/Enemies) and machinery through darkness and fog.", type: "passive", icon: "👁️" }
  }
];

/**
 * Zustand store for the MUD text adventure.
 * Manages game state, message log, and command processing.
 */
export const useStore = create((set, get) => ({
  // Game state
  gameState: null,       // initialized via initGame()
  gameLog: [],           // array of { text, type, timestamp }
  isGameStarted: false,
  idleTimer: null,
  worldRooms: {},        // Cache for Firestore-backed rooms
  itemRegistry: {},      // Cache for Item templates
  isSyncing: false,      // background sync status
  shopActive: null,      // active shop: { npcId, npcName, trades } or null
  activeMode: 'story',   // 'story' | 'adventure'
  storySession: null,
  adventureSession: null,
  playerProfile: null,
  selectedAdventureCharacter: 'fred',
  adventureEquippedItems: [],
  lastRunSummary: null,

  // Audio Settings State
  audioSettings: (() => {
    try {
      const saved = localStorage.getItem('screamingfred_audio_settings');
      if (saved) {
        return {
          masterVolume: 0.7,
          bgmVolume: 0.5,
          sfxVolume: 0.6,
          voiceVolume: 0.8,
          mode: 'bleeps',
          ...JSON.parse(saved)
        };
      }
    } catch (e) {
      console.warn("Failed to load audio settings from localStorage:", e);
    }
    return {
      masterVolume: 0.7,
      bgmVolume: 0.5,
      sfxVolume: 0.6,
      voiceVolume: 0.8,
      mode: 'bleeps',
    };
  })(),

  // UI / View State
  activeView: 'game',    // 'game' | 'world_map' | 'editor'
  isAdmin: false,        // admin mode toggled via /admin

  /**
   * Initialize the game. Checks for existing sessions first.
   */
  initGame: async (forceNew = false) => {
    console.log(`initGame called. forceNew: ${forceNew}`);
    // 1. Ensure Registry is loaded
    let registry = get().itemRegistry;
    if (Object.keys(registry).length === 0 || !registry.item_potato_battery) {
      const localRegistry = await loadRegistryFromLocal();
      // Merge static items as base to ensure new items are available
      registry = { 
        ...staticItems, 
        ...localRegistry,
        // Register custom Adventure Mode consumable items
        "item_potato_battery": {
          "name": "Potato Battery",
          "description": "A starchy battery that prevents half of an enemy or effect's damage for one turn.",
          "type": "food",
          "onUse": {
            "action": "apply_effect",
            "effect": {
              "name": "Starchy Shield",
              "type": "damage_reduction",
              "duration": 1,
              "value": 0.5
            },
            "consume": true,
            "successMessage": "You consume the Potato Battery! A starchy energy field surrounds you, blocking half of incoming damage for one turn!"
          }
        },
        "item_portal_key": {
          "name": "Portal Key",
          "description": "A glowing, starchy golden key pulsating with cosmic energy. Defeat the Keeper of the Key to loot it and unlock the victory portal!",
          "type": "quest"
        }
      };
      set({ itemRegistry: registry });
    }

    // 2. Load player profile
    let profile = await loadPlayerProfile();
    set({ playerProfile: profile });

    // 3. Check for existing session
    let session = forceNew ? null : await loadPlayerSession();
    console.log(`Session found: ${!!session}`);
    
    let activeMode = 'story';
    let storySession = null;
    let adventureSession = null;
    let startRoom;
    let initialState = null;
    let targetView = 'game';

    if (session) {
      activeMode = session.activeMode || 'story';
      storySession = session.storySession || null;
      adventureSession = session.adventureSession || null;

      if (activeMode === 'story') {
        // Reconstitute room from session coordinates
        const [sx, sy, sz] = session.roomCoordinates.replace(/[()]/g, '').split(',').map(s => parseInt(s.trim()));
        startRoom = get().worldRooms[`${sx},${sy}`] || getRoomAt(sx, sy, sz || 0);

        if (!startRoom) {
          console.warn(`Room at ${sx},${sy},${sz} not found! Resetting to Fred's house.`);
          startRoom = getRoomAt(15, 15, 0) || worldData.freds_house;
        }

        initialState = {
          room: startRoom,
          playerPosition: session.playerPosition,
          playerHP: session.playerHP,
          maxHP: session.maxHP,
          inventory: session.inventory,
          stateFlags: session.stateFlags,
          npcStages: {}, 
          enemyHP: {}, 
          entities: (startRoom.entities || []).map(e => ({ ...e })),
          turnCount: 0,
          discoveredRooms: session.discoveredRooms || [startRoom.world_coord || "15,15,0"],
          abilities: session.abilities || [],
          activeEffects: session.activeEffects || [],
        };
        
        get().addMessage('Welcome back, Fred! Your progress has been restored.', 'system');
      } else {
        // Hydrate active adventure session
        if (adventureSession) {
          initialState = adventureSession;
          targetView = 'game';
          get().addMessage('Adventure run restored!', 'system');
        } else {
          // No active adventure run, send to hub
          initialState = null;
          targetView = 'adventure_hub';
        }
      }
    } else {
      // Start fresh in Story Mode
      startRoom = getRoomAt(15, 15, 0) || worldData.freds_house;
      initialState = initGameState(startRoom);
      initialState.discoveredRooms = [startRoom.world_coord || "15,15,0"];
      initialState.abilities = [];
      initialState.activeEffects = [];
      const welcomeMessages = getWelcomeMessages(startRoom);
      set({ gameLog: welcomeMessages.map(m => ({ ...m, timestamp: Date.now() })) });
    }

    set({
      activeMode,
      storySession,
      adventureSession,
      gameState: initialState,
      isGameStarted: true,
      activeView: targetView,
    });

    if (initialState && initialState.room) {
      get().handleRoomBgmTransition(initialState.room);
    }
    get().startIdleTimer();
  },

  /**
   * Fetch rooms and registry from Firestore.
   */
  loadWorldData: async () => {
    set({ isSyncing: true });
    try {
      const [rooms, items] = await Promise.all([
        fetchWorldRooms(),
        fetchItemRegistry()
      ]);
      set({ 
        worldRooms: rooms,
        itemRegistry: { ...staticItems, ...(Object.keys(items).length > 0 ? items : get().itemRegistry) }
      });
    } catch (e) {
      console.error("Failed to load world data:", e);
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Sync static items to Cloud (Manual trigger for admin)
   */
  syncRegistryToCloud: async () => {
    set({ isSyncing: true });
    try {
      await migrateStaticItems(staticItems);
      const items = await fetchItemRegistry();
      set({ itemRegistry: items });
      get().addMessage('Success: Item Registry synced to Cloud!', 'system');
    } catch (e) {
      get().addMessage('Failed to sync registry.', 'warning');
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Switch between Play, World Map, and Editor.
   */
  setView: (view) => set({ activeView: view }),

  openShop: (npcId, npcName, trades) => {
    set({ shopActive: { npcId, npcName, trades } });
  },

  closeShop: () => {
    set({ shopActive: null });
  },

  executeTrade: (tradeId) => {
    const { addMessage, gameState, itemRegistry } = get();
    if (!gameState || !get().shopActive) return;

    const { trades } = get().shopActive;
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    // Check if player has required items
    const requiredItem = trade.give.itemId;
    const requiredCount = trade.give.count;

    const playerInventory = [...gameState.inventory];
    const matchingItems = playerInventory.filter(item => item.itemId === requiredItem || item.name === trade.give.name);

    if (matchingItems.length < requiredCount) {
      addMessage(`Cannot trade: You do not have enough ${trade.give.name}. Required: ${requiredCount}, Have: ${matchingItems.length}`, 'warning');
      return;
    }

    // Check single purchase limits (if already traded permanent ability/upgrade)
    if (trade.maxTrades === 1) {
      const key = `trade_completed_${tradeId}`;
      if (gameState.stateFlags[key]) {
        addMessage(`Cannot trade: You have already completed this unique trade!`, 'warning');
        return;
      }
    }

    // Process trade: Deduct items
    let deducted = 0;
    const updatedInventory = [];
    for (const item of playerInventory) {
      if (deducted < requiredCount && (item.itemId === requiredItem || item.name === trade.give.name)) {
        deducted++;
      } else {
        updatedInventory.push(item);
      }
    }

    // Build the updated state
    const newState = {
      ...gameState,
      inventory: updatedInventory,
      stateFlags: {
        ...gameState.stateFlags,
      }
    };

    // Track completed flag if limited
    if (trade.maxTrades === 1) {
      const key = `trade_completed_${tradeId}`;
      newState.stateFlags[key] = true;
    }

    // Grant reward
    const reward = trade.receive;
    if (reward.type === 'item') {
      const template = itemRegistry[reward.itemId] || { name: reward.name, type: 'resource' };
      const newItem = { ...template, itemId: reward.itemId, type: template.type || 'resource' };
      newState.inventory.push(newItem);
      addMessage(`🤝 Traded ${requiredCount}x ${trade.give.name} for ${reward.count}x ${reward.name}!`, 'loot');
    } else if (reward.type === 'max_hp') {
      newState.maxHP = (newState.maxHP || 10) + reward.value;
      newState.playerHP = (newState.playerHP || 10) + reward.value; // Heal as well
      addMessage(`🤝 Traded ${requiredCount}x ${trade.give.name}! Your Max HP increased permanently by ${reward.value}! (Max HP is now ${newState.maxHP})`, 'loot');
    } else if (reward.type === 'ability') {
      if (!newState.abilities) newState.abilities = [];
      newState.abilities.push(reward.ability);
      addMessage(`🤝 Traded ${requiredCount}x ${trade.give.name}! You learned a new passive ability: ${reward.ability.icon} ${reward.ability.name}!`, 'loot');
    }

    // Play retro SFX for successful trade
    const { audioSettings } = get();
    const sfxVol = (audioSettings.sfxVolume || 0.6) * (audioSettings.masterVolume || 0.7);
    playSynthSFX('loot', sfxVol);

    set({ gameState: newState });
    savePlayerSession(get());

    // Refresh active shop trades dynamically
    const updatedTrades = trades.map(t => {
      return t;
    });
    set(state => ({
      shopActive: { ...state.shopActive, trades: updatedTrades }
    }));
  },

  /**
   * Update audio settings and persist them.
   */
  updateAudioSettings: (updates) => {
    set(state => {
      const newSettings = { ...state.audioSettings, ...updates };
      try {
        localStorage.setItem('screamingfred_audio_settings', JSON.stringify(newSettings));
      } catch (e) {
        console.warn("Failed to save audio settings to localStorage:", e);
      }
      
      // Update BGM player volume dynamically
      if (updates.masterVolume !== undefined || updates.bgmVolume !== undefined) {
        const effectiveBgmVolume = newSettings.bgmVolume * newSettings.masterVolume;
        setBgmVolume(effectiveBgmVolume);
      }
      
      return { audioSettings: newSettings };
    });
  },

  /**
   * Transitions BGM loop cleanly for a room's theme
   */
  handleRoomBgmTransition: (room) => {
    if (!room) return;
    const { audioSettings } = get();
    const bgmUrl = getBgmForTheme(room.theme);
    const effectiveVolume = audioSettings.bgmVolume * audioSettings.masterVolume;
    transitionBGM(bgmUrl, effectiveVolume);
  },

  /**
   * Directly load a room definition and start playing it.
   */
  teleportToRoom: (roomData) => {
    if (!roomData) return;
    const initialState = initGameState(roomData);
    const welcomeMessages = getWelcomeMessages(roomData);

    const newState = {
      ...initialState,
      // preserve HP/Inventory if we are just moving rooms within a session
      playerHP: get().gameState?.playerHP || initialState.playerHP,
      inventory: get().gameState?.inventory || initialState.inventory,
      stateFlags: get().gameState?.stateFlags || initialState.stateFlags,
      discoveredRooms: get().gameState?.discoveredRooms || [],
      abilities: get().gameState?.abilities || [],
      activeEffects: get().gameState?.activeEffects || [],
    };

    // Add current room to discovered rooms if not already present
    const coordKey = roomData.world_coord || "15,15,0";
    if (!newState.discoveredRooms.includes(coordKey)) {
      newState.discoveredRooms = [...newState.discoveredRooms, coordKey];
    }

    set({
      gameState: newState,
      gameLog: [
        ...get().gameLog,
        { text: `✨ Teleported to ${roomData.room_name}`, type: 'system', timestamp: Date.now() },
        ...welcomeMessages.map(m => ({ ...m, timestamp: Date.now() }))
      ],
      activeView: 'game',
    });

    get().handleRoomBgmTransition(newState.room);
    savePlayerSession(get());
    get().startIdleTimer();
  },

  /**
   * Teleport to a room by its world coordinates.
   */
  teleportToCoordinate: (x, y, z = 0) => {
    const { worldRooms, activeMode, gameState } = get();
    const coordKey = `${x},${y}`;
    
    if (activeMode === 'adventure' && gameState && gameState.generatedWorld) {
      const fullKey = `${x},${y},${z}`;
      const matchingRoomId = Object.keys(gameState.generatedWorld).find(roomId => {
        return gameState.generatedWorld[roomId].world_coord === fullKey;
      });
      const room = matchingRoomId ? gameState.generatedWorld[matchingRoomId] : null;
      if (room) {
        get().teleportToRoom(room);
      } else {
        get().addMessage(`No room found at coordinate (${x}, ${y}, ${z}).`, 'warning');
      }
      return;
    }

    // Check Firestore cache first, then static worldData
    const dynamicRoom = worldRooms[coordKey];
    const room = dynamicRoom || getRoomAt(x, y, z);

    if (room) {
      get().teleportToRoom(room);
    } else {
      get().addMessage(`No room found at coordinate (${x}, ${y}, ${z}).`, 'warning');
    }
  },

  /**
   * Process a player command string.
   */
  submitCommand: async (rawInput) => {
    const { resetGame, addMessage } = get();
    if (!rawInput) return;

    const normalized = rawInput.toLowerCase().trim();
    if (normalized === 'restart') {
      if (window.confirm('Are you sure you want to restart your adventure? All current progress will be lost.')) {
        resetGame();
      }
      return;
    }

    if (normalized === '/admin') {
      const { isAdmin } = get();
      if (!isAdmin) {
        const secret = window.prompt("Enter admin secret phrase:");
        if (secret) {
          const success = await verifyAdminSecret(secret);
          if (success) {
            set(state => ({
              isAdmin: true,
              gameLog: [...state.gameLog, { text: "Admin mode is now ON.", type: "system", timestamp: Date.now() }]
            }));
          } else {
            set(state => ({
              gameLog: [...state.gameLog, { text: "Incorrect secret phrase. Admin mode denied.", type: "danger", timestamp: Date.now() }]
            }));
          }
        }
      } else {
        set(state => ({
          isAdmin: false,
          gameLog: [...state.gameLog, { text: "Admin mode is now OFF.", type: "system", timestamp: Date.now() }]
        }));
      }
      return;
    }

    const oldRoomCoord = get().gameState?.room?.world_coord;
    let allGeneratedMessages = [];
    const action = rawInput.toLowerCase().trim().split(/\s+/)[0];

    // Process game command with functional update to avoid stale state bugs
    set(state => {
      const { gameState, gameLog, itemRegistry } = state;
      if (!gameState) return {};

      // Guard: Prevent actions if player is dead
      if (gameState.playerHP <= 0) {
        const deadMsg = { 
          text: "You are incapacitated! You must RESTART to continue.", 
          type: "danger", 
          timestamp: Date.now() 
        };
        return { gameLog: [...gameLog, deadMsg] };
      }

      // Echo the player's command
      const echoMsg = { text: rawInput, type: 'player', timestamp: Date.now() };

      // Process through the engine
      const { state: newState, messages } = processCommand(gameState, rawInput, itemRegistry);
      
      // Auto-Revive check (Magical Pasta)
      if (newState.playerHP <= 0) {
        const pastaIdx = newState.inventory.findIndex(item => item.itemId === 'magical_pasta' || item.name === 'Magical Pasta');
        if (pastaIdx > -1) {
          newState.inventory.splice(pastaIdx, 1);
          newState.playerHP = newState.maxHP || 10;
          messages.push({
            text: "🔊 Space-time warps! The Magical Pasta in your inventory glows with a warm, starchy light! You are revived from the brink of defeat and your health is fully restored!",
            type: "loot"
          });
        }
      }

      // Check for Conquest Rewards
      // Automatically check after every action if any conquests are complete
      const finalInventory = [...newState.inventory];
      const finalAbilities = [...(newState.abilities || [])];
      
      for (const conquest of CONQUEST_REWARDS) {
        // Only grant if they don't already have the ability
        if (!finalAbilities.some(a => a.id === conquest.ability.id)) {
          const hasAllItems = conquest.requiredItems.every((reqId, index) => {
            const reqName = conquest.requiredItemNames ? conquest.requiredItemNames[index] : null;
            return finalInventory.some(item => item.itemId === reqId || item.name === reqId || (reqName && item.name === reqName) || (reqName && item.name.includes(reqName)));
          });
          if (hasAllItems) {
            messages.push({ text: `🎉 CONQUEST COMPLETE: ${conquest.name} 🎉`, type: 'system' });
            messages.push({ text: conquest.rewardMessage, type: 'loot' });
            finalAbilities.push(conquest.ability);
            
            // Remove the consumed conquest items
            conquest.requiredItems.forEach((reqId, index) => {
              const reqName = conquest.requiredItemNames ? conquest.requiredItemNames[index] : null;
              const idx = finalInventory.findIndex(item => item.itemId === reqId || item.name === reqId || (reqName && item.name === reqName) || (reqName && item.name.includes(reqName)));
              if (idx > -1) finalInventory.splice(idx, 1);
            });
          }
        }
      }
      
      newState.inventory = finalInventory;
      newState.abilities = finalAbilities;

      // Decrement active effects
      const turnTakingActions = ['move', 'use', 'attack', 'scream', 'interact', 'talk', 'north', 'south', 'east', 'west', 'n', 's', 'e', 'w'];
      let finalActiveEffects = newState.activeEffects || [];
      const tickMessages = [];
      const action = rawInput.toLowerCase().trim().split(' ')[0];
      
      if (turnTakingActions.includes(action) && finalActiveEffects.length > 0) {
        const remainingEffects = [];
        for (const effect of finalActiveEffects) {
          // Apply effect per tick
          if (effect.type === 'reduce_max_hp') {
            const reduction = effect.value || 1;
            newState.maxHP = Math.max(1, (newState.maxHP || 10) - reduction);
            newState.playerHP = Math.min(newState.playerHP, newState.maxHP);
            tickMessages.push({ text: `⚡ Energy Drain saps your vitality! Max HP reduced to ${newState.maxHP}!`, type: 'danger', timestamp: Date.now() });
          }

          // Decrement duration
          effect.duration -= 1;
          if (effect.duration > 0) {
            remainingEffects.push(effect);
          } else {
            tickMessages.push({ text: `The effect of ${effect.name} has worn off.`, type: 'system', timestamp: Date.now() });
          }
        }
        finalActiveEffects = remainingEffects;
      }
      newState.activeEffects = finalActiveEffects;

      const timestampedMessages = messages.map(m => ({ ...m, timestamp: Date.now() }));
      
      allGeneratedMessages = [...messages, ...tickMessages];

      return {
        gameState: newState,
        gameLog: [...gameLog, echoMsg, ...timestampedMessages, ...tickMessages],
      };
    });

    // Side effects after state is updated
    const updatedState = get().gameState;
    if (updatedState) {
      const { audioSettings } = get();
      const sfxVol = audioSettings.sfxVolume * audioSettings.masterVolume;

      // 1. Check if coordinate changed -> transition BGM and play footstep SFX
      const newRoomCoord = updatedState.room?.world_coord;
      if (oldRoomCoord && newRoomCoord !== oldRoomCoord) {
        get().handleRoomBgmTransition(updatedState.room);
        playSynthSFX('footstep', sfxVol);
      }

      // 2. Play audio corresponding to generated messages and the user's action
      playAudioForMessages(allGeneratedMessages, action, get());

      savePlayerSession(get());
      get().startIdleTimer();

      // Check for Adventure Mode run completion
      if (updatedState.adventureCompleted) {
        setTimeout(() => {
          get().endAdventureRun(updatedState.adventureOutcome);
        }, 100);
      }
    }
  },

  /**
   * Start or reset the idle timer.
   */
  startIdleTimer: () => {
    const { idleTimer, triggerIdleAttack } = get();
    if (idleTimer) clearTimeout(idleTimer);

    const newTimer = setTimeout(() => {
      triggerIdleAttack();
    }, 5000); // 5 seconds idle threshold

    set({ idleTimer: newTimer });
  },

  /**
   * Trigger the idle attack logic from the engine.
   */
  triggerIdleAttack: () => {
    const { gameState, gameLog, startIdleTimer } = get();
    if (!gameState || gameState.playerHP <= 0) return;

    const { state: newState, messages } = getEnemyIdleAttacks(gameState);
    
    if (messages.length > 0) {
      // Auto-Revive check (Magical Pasta)
      if (newState.playerHP <= 0) {
        const pastaIdx = newState.inventory.findIndex(item => item.itemId === 'magical_pasta' || item.name === 'Magical Pasta');
        if (pastaIdx > -1) {
          newState.inventory.splice(pastaIdx, 1);
          newState.playerHP = newState.maxHP || 10;
          messages.push({
            text: "🔊 Space-time warps! The Magical Pasta in your inventory glows with a warm, starchy light! You are revived from the brink of defeat and your health is fully restored!",
            type: "loot"
          });
        }
      }
      const timestampedMessages = messages.map(m => ({ ...m, timestamp: Date.now() }));
      set({
        gameState: newState,
        gameLog: [...gameLog, ...timestampedMessages],
      });
      playAudioForMessages(messages, 'idle', get());
    }

    // Always restart the timer to allow for repeated attacks if still idle
    startIdleTimer();
  },

  /**
   * Reset the game to its initial state.
   */
  resetGame: async () => {
    console.info("resetGame triggered: clearing session and re-initializing...");
    const { initGame, addMessage } = get();
    
    // 1. Clear the cloud session
    await clearPlayerSession();
    
    // 2. Clear local logs and re-init fresh
    set({ gameLog: [] });
    await initGame(true);
    
    addMessage('--- Game Restarted ---', 'system');
  },

  /**
   * Add a system message to the log.
   */
  addMessage: (text, type = 'system') => {
    set(state => ({
      gameLog: [...state.gameLog, { text, type, timestamp: Date.now() }],
    }));
  },

  /**
   * Toggle between Story Mode and Adventure Mode, suspending state
   */
  toggleGameMode: async () => {
    const { activeMode, gameState, storySession, adventureSession } = get();
    const newMode = activeMode === 'story' ? 'adventure' : 'story';
    console.log(`toggleGameMode called. Swapping from ${activeMode} to ${newMode}`);

    if (activeMode === 'story') {
      // Suspending Story Mode
      const storySnapshot = gameState ? {
        playerHP: gameState.playerHP,
        maxHP: gameState.maxHP,
        playerPosition: gameState.playerPosition,
        roomCoordinates: gameState.room?.world_coord || "(15, 15, 0)",
        inventory: gameState.inventory,
        stateFlags: gameState.stateFlags,
        discoveredRooms: gameState.discoveredRooms || [],
        abilities: gameState.abilities || [],
        activeEffects: gameState.activeEffects || [],
      } : null;

      // Hydrating Adventure Mode
      const adventureActive = adventureSession !== null;
      
      set({
        activeMode: 'adventure',
        storySession: storySnapshot,
        gameState: adventureActive ? adventureSession : null,
        activeView: adventureActive ? 'game' : 'adventure_hub'
      });

      get().addMessage('Switched to Adventure Mode. Grinding EXP in solo side quests!', 'system');
    } else {
      // Suspending Adventure Mode
      const adventureSnapshot = gameState ? {
        ...gameState
      } : null;

      // Hydrating Story Mode
      let restoredStoryState = null;
      if (storySession) {
        const [sx, sy, sz] = storySession.roomCoordinates.replace(/[()]/g, '').split(',').map(s => parseInt(s.trim()));
        const room = get().worldRooms[`${sx},${sy}`] || getRoomAt(sx, sy, sz || 0) || worldData.freds_house;
        restoredStoryState = {
          room,
          playerPosition: storySession.playerPosition,
          playerHP: storySession.playerHP,
          maxHP: storySession.maxHP,
          inventory: storySession.inventory,
          stateFlags: storySession.stateFlags,
          npcStages: {},
          enemyHP: {},
          entities: (room.entities || []).map(e => ({ ...e })),
          turnCount: 0,
          discoveredRooms: storySession.discoveredRooms || [],
          abilities: storySession.abilities || [],
          activeEffects: storySession.activeEffects || [],
        };
      } else {
        // Fallback start room
        const startRoom = getRoomAt(15, 15, 0) || worldData.freds_house;
        restoredStoryState = initGameState(startRoom);
        restoredStoryState.discoveredRooms = [startRoom.world_coord || "15,15,0"];
      }

      set({
        activeMode: 'story',
        adventureSession: adventureSnapshot,
        gameState: restoredStoryState,
        activeView: 'game'
      });

      get().addMessage('Switched back to Story Mode. Fred resumes his starchy quest!', 'system');
      get().handleRoomBgmTransition(restoredStoryState.room);
    }

    // Persist full Zustand state to Firestore
    await savePlayerSession(get());
  },

  /**
   * Character selection for adventure run
   */
  selectAdventureCharacter: (charId) => {
    set({ selectedAdventureCharacter: charId });
  },

  /**
   * Toggle equipping a starting item for the next run
   */
  toggleEquipStartingItem: (itemId) => {
    const { playerProfile, adventureEquippedItems } = get();
    if (!playerProfile) return;

    const poolCount = playerProfile.startingItemsPool[itemId] || 0;
    const currentlyEquippedCount = adventureEquippedItems.filter(id => id === itemId).length;

    if (adventureEquippedItems.includes(itemId)) {
      // Unequip one instance of this item
      const idx = adventureEquippedItems.indexOf(itemId);
      const updated = [...adventureEquippedItems];
      updated.splice(idx, 1);
      set({ adventureEquippedItems: updated });
    } else {
      // Equip one instance of this item
      if (currentlyEquippedCount >= poolCount) {
        get().addMessage(`Cannot equip: No more ${itemId.replace('item_', '').replace(/_/g, ' ')}s available in your pool!`, 'warning');
        return;
      }
      if (adventureEquippedItems.length >= 2) {
        get().addMessage(`Cannot equip: You can only pack a maximum of 2 starting items for a run!`, 'warning');
        return;
      }
      set({ adventureEquippedItems: [...adventureEquippedItems, itemId] });
    }
  },

  /**
   * Spend EXP to buy a starting consumable item in the EXP Shop
   */
  buyStartingItem: async (itemId, price) => {
    const { playerProfile } = get();
    if (!playerProfile) return;

    if (playerProfile.totalEXP < price) {
      get().addMessage(`Not enough EXP! Required: ${price} XP, You have: ${playerProfile.totalEXP} XP`, 'warning');
      return;
    }

    const updatedProfile = {
      ...playerProfile,
      totalEXP: playerProfile.totalEXP - price,
      startingItemsPool: {
        ...playerProfile.startingItemsPool,
        [itemId]: (playerProfile.startingItemsPool[itemId] || 0) + 1
      }
    };

    set({ playerProfile: updatedProfile });
    await savePlayerProfile(updatedProfile);
    get().addMessage(`🛒 Purchased 1x ${itemId.replace('item_', '').replace(/_/g, ' ')}!`, 'loot');
    
    // Play SFX
    const { audioSettings } = get();
    const sfxVol = (audioSettings.sfxVolume || 0.6) * (audioSettings.masterVolume || 0.7);
    playSynthSFX('loot', sfxVol);
  },

  /**
   * Spend EXP to level up an adventure character
   */
  levelUpCharacter: async (charId) => {
    const { playerProfile } = get();
    if (!playerProfile) return;

    const char = playerProfile.characters[charId];
    if (!char) return;

    if (char.level >= 3) {
      get().addMessage(`${charId.toUpperCase()} is already at max level (Level 3)!`, 'warning');
      return;
    }

    const price = char.level === 1 ? 15 : 30;

    if (playerProfile.totalEXP < price) {
      get().addMessage(`Not enough EXP! Required: ${price} XP, You have: ${playerProfile.totalEXP} XP`, 'warning');
      return;
    }

    const updatedProfile = {
      ...playerProfile,
      totalEXP: playerProfile.totalEXP - price,
      characters: {
        ...playerProfile.characters,
        [charId]: {
          ...char,
          level: char.level + 1,
          maxHP: charId === 'freddista' ? (char.level === 1 ? 16 : 20) : (char.level === 1 ? 12 : 15)
        }
      }
    };

    set({ playerProfile: updatedProfile });
    await savePlayerProfile(updatedProfile);
    get().addMessage(`🎉 ${charId.toUpperCase()} leveled up to Level ${char.level + 1}! Max HP increased!`, 'loot');

    // Play SFX
    const { audioSettings } = get();
    const sfxVol = (audioSettings.sfxVolume || 0.6) * (audioSettings.masterVolume || 0.7);
    playSynthSFX('victory', sfxVol);
  },

  /**
   * Generate map and launch procedural Adventure run
   */
  startAdventureRun: async () => {
    const { selectedAdventureCharacter, adventureEquippedItems, playerProfile, itemRegistry } = get();
    if (!playerProfile) return;

    const char = playerProfile.characters[selectedAdventureCharacter];
    
    // Calculate victories to scale procedural difficulty (Roguelike Ascension)
    const victories = playerProfile.runHistory 
      ? playerProfile.runHistory.filter(r => r.outcome === 'victory').length 
      : 0;

    // 1. Generate the procedural world
    const { rooms, theme } = generateAdventureWorld(selectedAdventureCharacter, char.level, victories);
    
    // 2. Build adventure active session state
    const startRoom = rooms.gen_start;
    const initialState = {
      room: startRoom,
      playerPosition: { ...startRoom.player_start },
      playerHP: char.maxHP || 10,
      maxHP: char.maxHP || 10,
      inventory: [],
      stateFlags: {},
      npcStages: {},
      enemyHP: {},
      entities: (startRoom.entities || []).map(e => ({ ...e })),
      turnCount: 0,
      discoveredRooms: ["0,0,0"],
      abilities: [],
      activeEffects: [],
      generatedWorld: rooms // Store so transitions look up correctly!
    };

    // 3. Inject selected equipped items into player's inventory
    adventureEquippedItems.forEach(itemId => {
      const template = itemRegistry[itemId];
      if (template) {
        initialState.inventory.push({
          ...template,
          itemId,
          type: template.type || 'food'
        });
      }
    });

    // 4. Update player profile: deduct equipped items from starting items pool
    const updatedPool = { ...playerProfile.startingItemsPool };
    adventureEquippedItems.forEach(itemId => {
      if (updatedPool[itemId] > 0) {
        updatedPool[itemId] -= 1;
      }
    });

    const updatedProfile = {
      ...playerProfile,
      startingItemsPool: updatedPool
    };

    // Keep a snapshot for refund logic and tracking Exp gained inside adventureSession
    const adventureSessionData = {
      ...initialState,
      activeCharacter: selectedAdventureCharacter,
      startingItemsSelected: [...adventureEquippedItems],
      startingItemsRefundPool: [...adventureEquippedItems],
      accumulatedExp: 0,
      generatedWorld: rooms
    };

    set({
      playerProfile: updatedProfile,
      gameState: adventureSessionData,
      adventureSession: adventureSessionData,
      activeView: 'game'
    });

    const rank = victories === 0 ? "Novice" : victories < 3 ? "Adept" : victories < 7 ? "Veteran" : "Grandmaster";
    get().addMessage(`🌲 Run Launched! Entering the procedural ${theme} as ${selectedAdventureCharacter.toUpperCase()} (Difficulty: ${rank} - ${victories} Wins)...`, 'system');
    get().handleRoomBgmTransition(startRoom);
    get().startIdleTimer();

    // Persist full Zustand state + Profile to Firestore
    await Promise.all([
      savePlayerProfile(updatedProfile),
      savePlayerSession(get())
    ]);
  },

  /**
   * Complete Adventure Mode run, payout XP, execute starting item refunds, and update history log.
   */
  endAdventureRun: async (outcome) => {
    const { gameState, playerProfile } = get();
    if (!gameState || !playerProfile) return;

    console.log(`endAdventureRun called. Outcome: ${outcome}`);

    // 1. Calculate Enemies Defeated
    const enemiesDefeated = Object.keys(gameState.stateFlags).filter(key => {
      return key.endsWith('_defeated') && gameState.stateFlags[key] === true;
    }).length;

    // 2. Refund Unused Packed Items & Count Looted Items
    const refundPool = gameState.startingItemsRefundPool || [];
    const currentInventory = [...gameState.inventory];
    
    const updatedStartingItemsPool = { ...playerProfile.startingItemsPool };
    let refundedCount = 0;

    // Process refunds
    refundPool.forEach(itemId => {
      // Find item in current inventory
      const idx = currentInventory.findIndex(item => item.itemId === itemId);
      if (idx > -1) {
        // Item is unused, refund it!
        updatedStartingItemsPool[itemId] = (updatedStartingItemsPool[itemId] || 0) + 1;
        currentInventory.splice(idx, 1); // remove from temporary list to avoid double refunds
        refundedCount++;
      }
    });

    // All remaining items inside currentInventory are newly looted items!
    const newLootCount = currentInventory.length;
    const finalLootNames = currentInventory.map(item => item.name);

    // 3. Calculate EXP
    const baseXP = outcome === 'victory' ? 10 : 3;
    const enemyXP = enemiesDefeated * (outcome === 'victory' ? 2 : 1);
    const lootXP = outcome === 'victory' ? newLootCount * 1 : 0;
    const totalXPGained = baseXP + enemyXP + lootXP;

    // 4. Create Run Summary History Entry
    const runSummary = {
      runId: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      theme: gameState.room?.theme || "Shoebox Forest",
      character: gameState.activeCharacter || "fred",
      outcome,
      expGained: totalXPGained,
      enemiesDefeated,
      turnsTaken: gameState.turnCount || 0,
      finalHP: `${gameState.playerHP}/${gameState.maxHP}`,
      finalInventory: finalLootNames,
      seed: Math.floor(Math.random() * 1000000)
    };

    // 5. Update Profile
    const updatedHistory = [runSummary, ...(playerProfile.runHistory || [])];
    const updatedProfile = {
      ...playerProfile,
      totalEXP: playerProfile.totalEXP + totalXPGained,
      startingItemsPool: updatedStartingItemsPool,
      runHistory: updatedHistory.slice(0, 50) // Cap history list at 50 runs to prevent bloat
    };

    // 6. Transition View
    set({
      playerProfile: updatedProfile,
      lastRunSummary: runSummary,
      gameState: null,
      adventureSession: null,
      adventureEquippedItems: [], // Reset packing pool for next run
      activeView: 'adventure_summary'
    });

    get().addMessage(`--- Run Ended (${outcome.toUpperCase()}) ---`, 'system');
    get().addMessage(`⭐ Earned: ${totalXPGained} XP! (Base: ${baseXP}, Enemies: ${enemyXP}, Loot: ${lootXP})`, 'loot');
    if (refundedCount > 0) {
      get().addMessage(`📦 Refunded ${refundedCount} unused starting items back to your pool!`, 'system');
    }

    // Persist full state to Cloud Firestore
    await Promise.all([
      savePlayerProfile(updatedProfile),
      savePlayerSession(get())
    ]);
  },
}));
export const createStore = () => useStore;
