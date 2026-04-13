import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  activeTheme: 'Shoeboxlandia',
  editorMode: false,
  gameState: 'menu', // Default boot straight into 'menu' instead of 'playing'
  
  // Phase 3 Progression State
  playerLevelProgress: 1, // Determines which SVG nodes lack the orange fog of war
  
  // Phase 2 Editor State
  selectedEntityTool: null, 
  activeDraftMap: null, 

  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ activeTheme: theme }),
  setGameState: (state) => set({ gameState: state }),
  
  unlockNextLevel: () => set((state) => ({ 
      playerLevelProgress: Math.min(state.playerLevelProgress + 1, 4) 
  })),
  
  toggleEditorMode: () => set((state) => ({ 
      editorMode: !state.editorMode, 
      gameState: !state.editorMode ? 'editing' : 'playing' 
  })),
  setSelectedTool: (toolId) => set({ selectedEntityTool: toolId }),
  setDraftMap: (draft) => set({ activeDraftMap: draft })
}));
