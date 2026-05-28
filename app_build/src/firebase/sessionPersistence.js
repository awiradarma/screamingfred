import { db, auth } from './config.js';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const SESSIONS_COLL = 'player_sessions';

/**
 * Ensure player is authenticated (Anonymously) before saving/loading.
 */
async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser.uid;
}

/**
 * Save the player's current game session to Firestore.
 */
export async function savePlayerSession(storeState) {
  try {
    const uid = await ensureAuth();
    const sessionDoc = doc(db, SESSIONS_COLL, uid);

    // If storeState contains gameState, use it. Otherwise, assume storeState IS the gameState (backward compatibility)
    const gameState = storeState.gameState || storeState;
    const activeMode = storeState.activeMode || 'story';
    const storySession = storeState.storySession || null;
    const adventureSession = storeState.adventureSession || null;

    // Filter game state to only include session-relevant data
    const sessionData = {
      activeMode,
      storySession,
      adventureSession,
      playerHP: gameState.playerHP,
      maxHP: gameState.maxHP,
      inventory: gameState.inventory,
      stateFlags: gameState.stateFlags,
      playerPosition: gameState.playerPosition,
      roomCoordinates: gameState.room?.world_coord || "(15, 15, 0)", // backup if missing
      discoveredRooms: gameState.discoveredRooms || [],
      abilities: gameState.abilities || [],
      activeEffects: gameState.activeEffects || [],
      lastUpdated: serverTimestamp()
    };

    await setDoc(sessionDoc, sessionData);
    return true;
  } catch (error) {
    console.error("Failed to save player session:", error);
    return false;
  }
}

/**
 * Load the player's previous session from Firestore.
 */
export async function loadPlayerSession() {
  try {
    const uid = await ensureAuth();
    const sessionDoc = doc(db, SESSIONS_COLL, uid);
    const snap = await getDoc(sessionDoc);

    if (snap.exists()) {
      const data = snap.data();
      // Ensure discoveredRooms exists even for older sessions
      if (!data.discoveredRooms) data.discoveredRooms = [];
      if (!data.activeMode) data.activeMode = 'story';
      return data;
    }
    return null;
  } catch (error) {
    console.error("Failed to load player session:", error);
    return null;
  }
}
/**
 * Clear the player's session from Firestore.
 */
export async function clearPlayerSession() {
  try {
    const uid = await ensureAuth();
    const sessionDoc = doc(db, SESSIONS_COLL, uid);
    await deleteDoc(sessionDoc);
    return true;
  } catch (error) {
    console.error("Failed to clear player session:", error);
    return false;
  }
}

/**
 * Verify an admin secret phrase by attempting to create a document in admin_users.
 */
export async function verifyAdminSecret(secretPhrase) {
  try {
    const uid = await ensureAuth();
    const adminDoc = doc(db, 'admin_users', uid);
    await setDoc(adminDoc, {
      secret: secretPhrase,
      grantedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Failed to verify admin secret:", error);
    return false;
  }
}
