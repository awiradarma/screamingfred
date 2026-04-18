import { create } from 'zustand';
import { initGameState, processCommand, getWelcomeMessages, getEnemyIdleAttacks } from '../engine/roomEngine.js';
import { worldData } from '../data/worldData.js';

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

  /**
   * Initialize the game with the starting room.
   */
  initGame: () => {
    const startRoom = worldData.forest_entrance;
    const initialState = initGameState(startRoom);
    const welcomeMessages = getWelcomeMessages(startRoom);

    set({
      gameState: initialState,
      gameLog: welcomeMessages.map(m => ({ ...m, timestamp: Date.now() })),
      isGameStarted: true,
    });

    get().startIdleTimer();
  },

  /**
   * Process a player command string.
   */
  submitCommand: (rawInput) => {
    const { gameState, gameLog } = get();
    if (!gameState) return;

    // Echo the player's command
    const echoMsg = { text: rawInput, type: 'player', timestamp: Date.now() };

    // Process through the engine
    const { state: newState, messages } = processCommand(gameState, rawInput);
    const timestampedMessages = messages.map(m => ({ ...m, timestamp: Date.now() }));

    set({
      gameState: newState,
      gameLog: [...gameLog, echoMsg, ...timestampedMessages],
    });

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
   * Add a system message to the log.
   */
  addMessage: (text, type = 'system') => {
    set(state => ({
      gameLog: [...state.gameLog, { text, type, timestamp: Date.now() }],
    }));
  },
}));
