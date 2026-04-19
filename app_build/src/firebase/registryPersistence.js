import { db } from './config';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { initDB } from '../db/indexedStorage';

const ITEM_REGISTRY_COLL = 'item_registry';
const IDB_STORE = 'itemRegistry';

/**
 * Fetch the entire item registry from Firestore.
 * Updates local IndexedDB cache on success.
 */
export async function fetchItemRegistry() {
  try {
    const querySnapshot = await getDocs(collection(db, ITEM_REGISTRY_COLL));
    const items = {};
    querySnapshot.forEach((doc) => {
      items[doc.id] = doc.data();
    });

    // Update local cache
    const idb = await initDB();
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    await store.clear();
    for (const [key, val] of Object.entries(items)) {
      await store.put(val, key);
    }
    await tx.done;

    return items;
  } catch (error) {
    console.warn("Failed to fetch Item Registry from Firestore, falling back to local cache:", error);
    return await loadRegistryFromLocal();
  }
}

/**
 * Load registry data from IndexedDB.
 */
export async function loadRegistryFromLocal() {
  try {
    const idb = await initDB();
    const items = {};
    const keys = await idb.getAllKeys(IDB_STORE);
    for (const key of keys) {
      items[key] = await idb.get(IDB_STORE, key);
    }
    return items;
  } catch (error) {
    console.error("Local registry load failed:", error);
    return {};
  }
}

/**
 * Save a single item definition to Firestore and Local Cache.
 */
export async function saveItemToRegistry(itemId, itemData) {
  try {
    // Save to Firestore
    await setDoc(doc(db, ITEM_REGISTRY_COLL, itemId), itemData);
    
    // Update local cache
    const idb = await initDB();
    await idb.put(IDB_STORE, itemData, itemId);
    
    return true;
  } catch (error) {
    console.error("Failed to save item to registry:", error);
    return false;
  }
}

/**
 * Perform a one-time migration of static JSON items to Firestore.
 */
export async function migrateStaticItems(staticItems) {
  for (const [itemId, itemData] of Object.entries(staticItems)) {
    await saveItemToRegistry(itemId, itemData);
  }
  return true;
}
