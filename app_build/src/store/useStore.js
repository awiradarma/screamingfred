import { create } from 'zustand';
import { initGameState, processCommand, getWelcomeMessages, getEnemyIdleAttacks } from '../engine/roomEngine.js';
import { worldData, getRoomAt } from '../data/worldData.js';
import { fetchWorldRooms } from '../firebase/worldPersistence.js';
import { fetchItemRegistry, loadRegistryFromLocal, migrateStaticItems } from '../firebase/registryPersistence.js';
import { savePlayerSession, loadPlayerSession, clearPlayerSession, verifyAdminSecret } from '../firebase/sessionPersistence.js';
import staticItems from '../data/items.json';

export const CONQUEST_REWARDS = [
  {
    id: "detective_intuition",
    name: "Detective's Intuition",
    requiredItems: ["clue_empty_fridge", "flavor_photo", "quest_note"],
    requiredItemNames: ["Empty Fridge Note", "Old Photo", "Freddista's Note"],
    rewardMessage: "You piece together the clues! The Empty Fridge, the Old Photo, and Freddista's Note all point to one thing... wait, actually it just points to the fact you are a great detective! You learned Detective's Intuition! (Reveals hidden items)",
    ability: { id: "detectives_intuition", name: "Detective's Intuition", description: "Automatically reveals hidden things in dark corners without needing a light.", type: "passive", icon: "🕵️‍♂️" }
  },
  {
    id: "master_tinkerer",
    name: "Master Tinkerer",
    requiredItems: ["flavor_signpost", "tool_lace", "item_silver_eyelet"],
    requiredItemNames: ["Signpost Info", "Long Shoelace", "Silver Eyelet"],
    rewardMessage: "You've gathered a signpost, a shoelace, and an eyelet. You realize you can build almost anything with this junk! You learned Master Tinkerer! (Passive)",
    ability: { id: "master_tinkerer", name: "Master Tinkerer", description: "You have an incredible knack for repurposing ordinary junk into useful tools.", type: "passive", icon: "🔧" }
  },
  {
    id: "natures_bounty",
    name: "Nature's Bounty",
    requiredItems: ["item_berries", "item_pollen", "item_pillow"],
    requiredItemNames: ["Rubber Berries", "Yellow Pollen", "Soft Pillow"],
    rewardMessage: "Berries, pollen, and a cotton ball pillow. Ah, the great outdoors. You learned Allergy Resistance! (Passive)",
    ability: { id: "allergy_resistance", name: "Allergy Resistance", description: "You've inhaled so much pollen and dust you're now completely immune to sneezing.", type: "passive", icon: "🤧" }
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
    if (Object.keys(registry).length === 0) {
      const localRegistry = await loadRegistryFromLocal();
      // Merge static items as base to ensure new items are available
      registry = { ...staticItems, ...localRegistry };
      set({ itemRegistry: registry });
    }

    // 2. Check for existing session
    let session = forceNew ? null : await loadPlayerSession();
    console.log(`Session found: ${!!session}`);
    
    let startRoom;
    let initialState;

    if (session) {
      // Reconstitute room from session coordinates
      const [sx, sy, sz] = session.roomCoordinates.replace(/[()]/g, '').split(',').map(s => parseInt(s.trim()));
      startRoom = get().worldRooms[`${sx},${sy}`] || getRoomAt(sx, sy, sz || 0);

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
      // Start fresh
      startRoom = getRoomAt(15, 15, 0) || worldData.freds_house;
      initialState = initGameState(startRoom);
      initialState.discoveredRooms = [startRoom.world_coord || "15,15,0"];
      initialState.abilities = [];
      initialState.activeEffects = [];
      const welcomeMessages = getWelcomeMessages(startRoom);
      set({ gameLog: welcomeMessages.map(m => ({ ...m, timestamp: Date.now() })) });
    }

    set({
      gameState: initialState,
      isGameStarted: true,
      activeView: 'game',
    });

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

    savePlayerSession(newState);
    get().startIdleTimer();
  },

  /**
   * Teleport to a room by its world coordinates.
   */
  teleportToCoordinate: (x, y, z = 0) => {
    const { worldRooms } = get();
    const coordKey = `${x},${y}`;
    
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
      
      // Check for Conquest Rewards
      // Automatically check after every action if any conquests are complete
      const finalInventory = [...newState.inventory];
      const finalAbilities = [...(newState.abilities || [])];
      
      for (const conquest of CONQUEST_REWARDS) {
        // Only grant if they don't already have the ability
        if (!finalAbilities.some(a => a.id === conquest.ability.id)) {
          const hasAllItems = conquest.requiredItems.every(reqId => finalInventory.some(item => item.itemId === reqId));
          if (hasAllItems) {
            messages.push({ text: `🎉 CONQUEST COMPLETE: ${conquest.name} 🎉`, type: 'system' });
            messages.push({ text: conquest.rewardMessage, type: 'loot' });
            finalAbilities.push(conquest.ability);
            
            // Remove the consumed conquest items
            conquest.requiredItems.forEach(reqId => {
              const idx = finalInventory.findIndex(item => item.itemId === reqId);
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

      return {
        gameState: newState,
        gameLog: [...gameLog, echoMsg, ...timestampedMessages, ...tickMessages],
      };
    });

    // Side effects after state is updated
    const updatedState = get().gameState;
    if (updatedState) {
      savePlayerSession(updatedState);
      get().startIdleTimer();
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
      const timestampedMessages = messages.map(m => ({ ...m, timestamp: Date.now() }));
      set({
        gameState: newState,
        gameLog: [...gameLog, ...timestampedMessages],
      });
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
}));
