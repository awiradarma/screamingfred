import { db, auth } from './config.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

const PROFILES_COLL = 'player_profiles';
const LOCAL_STORAGE_KEY = 'screamingfred_local_profile';

/**
 * Ensure player is authenticated (Anonymously) before saving/loading.
 */
async function ensureAuth() {
  if (!auth) return null;
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser.uid;
}

/**
 * Get default starting profile structure.
 */
export function getDefaultProfile() {
  return {
    totalEXP: 0,
    unlockedConquests: [],
    startingItemsPool: {}, // e.g. { "item_potato_battery": 1 }
    characters: {
      fred: { level: 1, maxHP: 10, abilities: [] },
      freddista: { level: 1, maxHP: 12, abilities: [] },
      willy: { level: 1, maxHP: 10, abilities: [] }
    },
    runHistory: []
  };
}

/**
 * Save player profile to Firestore (or LocalStorage fallback).
 */
export async function savePlayerProfile(profileData) {
  try {
    const cleanData = {
      ...getDefaultProfile(),
      ...profileData,
      lastUpdated: new Date().toISOString()
    };

    // Save to local storage first as backup
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
    } catch (e) {
      console.warn("Failed to backup profile to localStorage:", e);
    }

    if (!db) {
      console.info("Firebase DB missing. Profile successfully saved to LocalStorage only.");
      return true;
    }

    const uid = await ensureAuth();
    if (!uid) return false;

    const profileDoc = doc(db, PROFILES_COLL, uid);
    await setDoc(profileDoc, {
      ...cleanData,
      updatedAt: serverTimestamp()
    });

    console.log("Player profile successfully synced to Firestore.");
    return true;
  } catch (error) {
    console.error("Failed to save player profile:", error);
    return false;
  }
}

/**
 * Load player profile from Firestore (or LocalStorage fallback).
 */
export async function loadPlayerProfile() {
  try {
    // Check local storage first
    let localProfile = null;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        localProfile = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to read profile from localStorage:", e);
    }

    if (!db) {
      console.info("Firebase DB missing. Profile loaded from LocalStorage.");
      return localProfile || getDefaultProfile();
    }

    const uid = await ensureAuth();
    if (!uid) return localProfile || getDefaultProfile();

    const profileDoc = doc(db, PROFILES_COLL, uid);
    const snap = await getDoc(profileDoc);

    if (snap.exists()) {
      const dbProfile = snap.data();
      // Merge with default to guarantee all keys exist
      const merged = {
        ...getDefaultProfile(),
        ...localProfile, // Prefer local backup if newer
        ...dbProfile
      };
      
      // Keep local sync in line
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}

      return merged;
    }

    return localProfile || getDefaultProfile();
  } catch (error) {
    console.error("Failed to load player profile:", error);
    // Safe fallback to default if both fail
    return getDefaultProfile();
  }
}
