import { create } from 'zustand';
import { initGameState, processCommand, getWelcomeMessages } from '../engine/roomEngine.js';
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
