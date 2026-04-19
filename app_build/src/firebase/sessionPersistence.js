import { db, auth } from './config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
export async function savePlayerSession(gameState) {
  try {
    const uid = await ensureAuth();
    const sessionDoc = doc(db, SESSIONS_COLL, uid);

    // Filter game state to only include session-relevant data
    const sessionData = {
      playerHP: gameState.playerHP,
      maxHP: gameState.maxHP,
      inventory: gameState.inventory,
      stateFlags: gameState.stateFlags,
      playerPosition: gameState.playerPosition,
      roomCoordinates: gameState.room.world_coord || "(15, 15, 0)", // backup if missing
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
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Failed to load player session:", error);
    return null;
  }
}
