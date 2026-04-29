import { create } from 'zustand';
import { initGameState, processCommand, getWelcomeMessages, getEnemyIdleAttacks } from '../engine/roomEngine.js';
import { worldData, getRoomAt } from '../data/worldData.js';
import { fetchWorldRooms } from '../firebase/worldPersistence.js';
import { fetchItemRegistry, loadRegistryFromLocal, migrateStaticItems } from '../firebase/registryPersistence.js';
import { savePlayerSession, loadPlayerSession, clearPlayerSession } from '../firebase/sessionPersistence.js';
import staticItems from '../data/items.json';

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
  isAdmin: true,         // admin mode as requested

  /**
   * Initialize the game. Checks for existing sessions first.
   */
  initGame: async (forceNew = false) => {
    console.log(`initGame called. forceNew: ${forceNew}`);
    // 1. Ensure Registry is loaded
    let registry = get().itemRegistry;
    if (Object.keys(registry).length === 0) {
      registry = await loadRegistryFromLocal();
      if (Object.keys(registry).length === 0) {
        registry = staticItems; // final fallback
      }
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
      };
      
      get().addMessage('Welcome back, Fred! Your progress has been restored.', 'system');
    } else {
      // Start fresh
      startRoom = getRoomAt(15, 15, 0) || worldData.freds_house;
      initialState = initGameState(startRoom);
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
        itemRegistry: Object.keys(items).length > 0 ? items : get().itemRegistry
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
    };

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
  submitCommand: (rawInput) => {
    const { gameState, gameLog, resetGame, addMessage } = get();
    if (!gameState) return;

    const normalized = rawInput.toLowerCase().trim();
    if (normalized === 'restart') {
      if (window.confirm('Restart the game? All current progress will be lost.')) {
        resetGame();
      }
      return;
    }

    // Guard: Prevent actions if player is dead
    if (gameState.playerHP <= 0) {
      addMessage("You are incapacitated! You must RESTART to continue.", "danger");
      return;
    }

    // Echo the player's command
    const echoMsg = { text: rawInput, type: 'player', timestamp: Date.now() };

    // Process through the engine
    const { state: newState, messages } = processCommand(gameState, rawInput, get().itemRegistry);
    const timestampedMessages = messages.map(m => ({ ...m, timestamp: Date.now() }));

    set({
      gameState: newState,
      gameLog: [...gameLog, echoMsg, ...timestampedMessages],
    });

    // Auto-save to cloud
    savePlayerSession(newState);

    get().startIdleTimer();
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
