import { openDB } from 'idb';

const DB_NAME = 'ScreamingFredStorage';
const DB_VERSION = 1;
const STORE_NAME = 'levelDrafts';
const DRAFT_KEY = 'current_draft';

// Fallback empty draft outline mapping to SentientWorldia_Schema.json
export const emptyDraftTemplate = {
  levelHeader: { theme: 'Shoeboxlandia', author: 'Timothy', status: 'draft' },
  mapData: { grid: {}, themeRules: 'none' }, // Using object dict for easy spatial queries (e.g. "x,y": "tileId")
  entities: [],
  narrative: {}
};

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
};

export const saveDraft = async (draftJSON) => {
    try {
        const db = await initDB();
        await db.put(STORE_NAME, draftJSON, DRAFT_KEY);
    } catch (e) {
        console.error("Failed to save draft to IndexedDB", e);
    }
};

export const loadDraft = async () => {
    try {
        const db = await initDB();
        const draft = await db.get(STORE_NAME, DRAFT_KEY);
        return draft || emptyDraftTemplate;
    } catch (e) {
        console.error("Failed to load draft from IndexedDB", e);
        return emptyDraftTemplate;
    }
};
