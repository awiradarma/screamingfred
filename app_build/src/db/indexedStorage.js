import { openDB } from 'idb';

const DB_NAME = 'ScreamingFredStorage';
const DB_VERSION = 2; // Incremented version
const STORE_DRAFTS = 'levelDrafts';
const STORE_REGISTRY = 'itemRegistry';
const STORE_SESSIONS = 'playerSessions';
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
        upgrade(db, oldVersion, newVersion) {
            if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
                db.createObjectStore(STORE_DRAFTS);
            }
            if (!db.objectStoreNames.contains(STORE_REGISTRY)) {
                db.createObjectStore(STORE_REGISTRY);
            }
            if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
                db.createObjectStore(STORE_SESSIONS);
            }
        },
    });
};

export const saveDraft = async (draftJSON) => {
    try {
        const db = await initDB();
        await db.put(STORE_DRAFTS, draftJSON, DRAFT_KEY);
    } catch (e) {
        console.error("Failed to save draft to IndexedDB", e);
    }
};

export const loadDraft = async () => {
    try {
        const db = await initDB();
        const draft = await db.get(STORE_DRAFTS, DRAFT_KEY);
        return draft || emptyDraftTemplate;
    } catch (e) {
        console.error("Failed to load draft from IndexedDB", e);
        return emptyDraftTemplate;
    }
};
